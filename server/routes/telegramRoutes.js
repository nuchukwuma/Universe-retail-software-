const express = require('express');
const TelegramMessage = require('../models/TelegramMessage');
const { requireLogin, requireRole } = require('../middleware/auth');
const handleError = require('../utils/handleError');
const { getSettings } = require('../utils/settings');
const { todayInLagos, lagosDayRange } = require('../utils/dates');
const { isTelegramConfigured, sendTelegramMessage, findRecentChats, testMessageText } = require('../utils/telegram');
const { processQueue } = require('../utils/telegramQueue');

const router = express.Router();

// Only the owner can see or change Telegram alerts.
router.use(requireLogin, requireRole('owner'));

// Hides most of the chat id, e.g. "-1001234567890" -> "-100*******890".
function maskChatId(chatId) {
  const text = String(chatId || '');
  if (text.length <= 7) return text;
  return text.slice(0, 4) + '*'.repeat(text.length - 7) + text.slice(-3);
}

// GET /api/telegram/status
// Shows whether Telegram is set up, and how the outbox is doing.
router.get('/status', async (req, res) => {
  try {
    const settings = await getSettings();
    const today = lagosDayRange(todayInLagos());

    const [pending, failed, sentToday, recent] = await Promise.all([
      TelegramMessage.countDocuments({ status: { $in: ['pending', 'sending'] } }),
      TelegramMessage.countDocuments({ status: 'failed' }),
      TelegramMessage.countDocuments({ status: 'sent', sentAt: { $gte: today.start, $lt: today.end } }),
      TelegramMessage.find().sort({ createdAt: -1 }).limit(15).select('-text'),
    ]);

    res.json({
      enabled: settings.telegramAlertsEnabled,
      botTokenSet: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      chatIdSet: Boolean(process.env.TELEGRAM_CHAT_ID),
      configured: isTelegramConfigured(),
      chatId: maskChatId(process.env.TELEGRAM_CHAT_ID),
      pending,
      failed,
      sentToday,
      recent,
    });
  } catch (error) {
    handleError(res, error, 'Could not load Telegram status.');
  }
});

// POST /api/telegram/test
// Sends a test message straight away and reports exactly what happened.
router.post('/test', async (req, res) => {
  try {
    const settings = await getSettings();
    await sendTelegramMessage(testMessageText(settings.storeName, req.user.name));
    res.json({ message: 'Test message sent! Check your Telegram chat.' });
  } catch (error) {
    // Telegram problems are shown to the owner as a normal message (not a crash).
    res.status(400).json({ message: error.message });
  }
});

// GET /api/telegram/chats
// Lists chats/groups the bot has seen, to help find TELEGRAM_CHAT_ID.
router.get('/chats', async (req, res) => {
  try {
    res.json(await findRecentChats());
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST /api/telegram/retry
// Puts every failed alert back in the queue and tries the whole queue now.
router.post('/retry', async (req, res) => {
  try {
    const result = await TelegramMessage.updateMany(
      { status: 'failed' },
      { status: 'pending', attempts: 0, nextAttemptAt: new Date() }
    );
    await TelegramMessage.updateMany({ status: 'pending' }, { nextAttemptAt: new Date() });
    await processQueue();
    res.json({ message: `Trying again now (${result.modifiedCount} failed alert(s) re-queued).` });
  } catch (error) {
    handleError(res, error, 'Could not retry Telegram alerts.');
  }
});

module.exports = router;
