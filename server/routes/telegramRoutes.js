const express = require('express');
const TelegramMessage = require('../models/TelegramMessage');
const { requireLogin, requireRole } = require('../middleware/auth');
const handleError = require('../utils/handleError');
const { getSettings } = require('../utils/settings');
const { todayInLagos, lagosDayRange } = require('../utils/dates');
const { getTelegramConfig, sendTelegramMessage, findRecentChats, testMessageText } = require('../utils/telegram');
const { processQueue } = require('../utils/telegramQueue');

const router = express.Router();

// Only the owner can see or change Telegram alerts.
router.use(requireLogin, requireRole('owner'));

// PUT /api/telegram/config
// Saves the bot token and/or chat id typed on the Settings page.
// Body: { botToken?, chatId? }  (leave botToken out to keep the saved one)
router.put('/config', async (req, res) => {
  try {
    const settings = await getSettings();
    const { botToken, chatId } = req.body;

    if (typeof botToken === 'string' && botToken.trim()) {
      if (!/^\d+:[\w-]{20,}$/.test(botToken.trim())) {
        return res.status(400).json({ message: 'That does not look like a bot token. It looks like 7123456789:AAH... (copy it from @BotFather).' });
      }
      settings.telegramBotToken = botToken.trim();
    }
    if (typeof chatId === 'string') {
      if (chatId.trim() && !/^-?\d+$/.test(chatId.trim())) {
        return res.status(400).json({ message: 'The chat id must be a number, e.g. -1001234567890.' });
      }
      settings.telegramChatId = chatId.trim();
    }

    await settings.save();
    res.json({ message: 'Telegram details saved.' });
  } catch (error) {
    handleError(res, error, 'Could not save the Telegram details.');
  }
});

// DELETE /api/telegram/config
// Forgets the saved bot token and chat id.
router.delete('/config', async (req, res) => {
  try {
    const settings = await getSettings();
    settings.telegramBotToken = '';
    settings.telegramChatId = '';
    await settings.save();
    res.json({ message: 'Telegram details removed.' });
  } catch (error) {
    handleError(res, error, 'Could not remove the Telegram details.');
  }
});

// GET /api/telegram/status
// Shows whether Telegram is set up, and how the outbox is doing.
// The bot token itself is never sent back - only whether it is set.
router.get('/status', async (req, res) => {
  try {
    const settings = await getSettings();
    const { botToken, chatId } = await getTelegramConfig();
    const today = lagosDayRange(todayInLagos());

    const [pending, failed, sentToday, recent] = await Promise.all([
      TelegramMessage.countDocuments({ status: { $in: ['pending', 'sending'] } }),
      TelegramMessage.countDocuments({ status: 'failed' }),
      TelegramMessage.countDocuments({ status: 'sent', sentAt: { $gte: today.start, $lt: today.end } }),
      TelegramMessage.find().sort({ createdAt: -1 }).limit(15).select('-text'),
    ]);

    res.json({
      enabled: settings.telegramAlertsEnabled,
      botTokenSet: Boolean(botToken),
      chatIdSet: Boolean(chatId),
      configured: Boolean(botToken && chatId),
      chatId,
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
