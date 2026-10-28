// The Telegram "outbox": every alert is saved first, then sent.
// If sending fails it is tried again later, so a sale never waits for
// (or fails because of) Telegram.

const TelegramMessage = require('../models/TelegramMessage');
const { getSettings } = require('./settings');
const { isTelegramConfigured, sendTelegramMessage, saleAlertText } = require('./telegram');

// How long to wait before trying again: 1 min, then 2, 5, 10, 30, then every hour.
const RETRY_DELAYS_MINUTES = [1, 2, 5, 10, 30, 60];
const MAX_ATTEMPTS = 25; // about a day of tries, then it is marked "failed"
const CHECK_EVERY_MS = 30 * 1000; // look for messages to retry every 30 seconds

// Returns how many seconds to wait after the given number of failed tries.
function retryDelaySeconds(attempts) {
  const index = Math.min(attempts - 1, RETRY_DELAYS_MINUTES.length - 1);
  return RETRY_DELAYS_MINUTES[index] * 60;
}

// Tries to send one message from the outbox, once.
// It is "claimed" first (pending -> sending) so the same message is never
// sent twice by the background worker and a new sale at the same moment.
async function deliver(messageId) {
  const message = await TelegramMessage.findOneAndUpdate(
    { _id: messageId, status: 'pending' },
    { status: 'sending', $inc: { attempts: 1 } },
    { new: true }
  );
  if (!message) return null;

  try {
    await sendTelegramMessage(message.text);
    message.status = 'sent';
    message.sentAt = new Date();
    message.lastError = '';
  } catch (error) {
    message.lastError = error.message;
    if (message.attempts >= MAX_ATTEMPTS) {
      message.status = 'failed';
    } else {
      message.status = 'pending';
      const waitSeconds = error.retryAfter || retryDelaySeconds(message.attempts);
      message.nextAttemptAt = new Date(Date.now() + waitSeconds * 1000);
    }
    console.error(`Telegram alert for receipt ${message.receiptNumber} failed (try ${message.attempts}): ${error.message}`);
  }

  await message.save();
  return message;
}

// Saves a sale alert in the outbox and tries to send it straight away.
// Does nothing if alerts are switched off or Telegram is not set up.
async function queueSaleAlert(sale) {
  const settings = await getSettings();
  if (!settings.telegramAlertsEnabled || !(await isTelegramConfigured())) return null;

  const message = await TelegramMessage.create({
    kind: 'sale',
    sale: sale._id,
    receiptNumber: sale.receiptNumber,
    text: saleAlertText(sale, settings.storeName),
  });
  return deliver(message._id);
}

// Sends every outbox message that is due for another try.
async function processQueue() {
  if (!(await isTelegramConfigured())) return;

  // A message stuck in "sending" (e.g. the server stopped mid-send) goes back to the queue.
  await TelegramMessage.updateMany(
    { status: 'sending', updatedAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) } },
    { status: 'pending' }
  );

  const due = await TelegramMessage.find({ status: 'pending', nextAttemptAt: { $lte: new Date() } })
    .sort({ createdAt: 1 })
    .limit(20);

  for (const message of due) {
    await deliver(message._id);
  }
}

// Starts the background job that retries unsent alerts every 30 seconds.
function startTelegramWorker() {
  let busy = false;

  setInterval(async () => {
    if (busy) return; // the last round is still running
    busy = true;
    try {
      await processQueue();
    } catch (error) {
      console.error('Telegram retry job error:', error.message);
    } finally {
      busy = false;
    }
  }, CHECK_EVERY_MS);

  isTelegramConfigured()
    .then((ready) => console.log(ready ? 'Telegram sales alerts: ready' : 'Telegram sales alerts: not set up yet (Settings → Telegram)'))
    .catch(() => {});
}

module.exports = { queueSaleAlert, processQueue, startTelegramWorker, MAX_ATTEMPTS };
