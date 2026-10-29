// Talks to the Telegram Bot API and writes the sale alert messages.
// The bot token and chat id are typed in by the owner on the Settings
// page (saved on this computer). TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID in
// the .env file still work as a fallback for development.

const { formatNaira } = require('./money');
const { postJson } = require('./postJson');
const { getSettings } = require('./settings');

const MAX_ITEMS_IN_MESSAGE = 40; // Telegram messages must stay under 4096 characters

// Returns { botToken, chatId } from Settings (or .env if Settings has none).
async function getTelegramConfig() {
  const settings = await getSettings();
  return {
    botToken: settings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: settings.telegramChatId || process.env.TELEGRAM_CHAT_ID || '',
  };
}

// Returns true when both the bot token and the chat id are set.
async function isTelegramConfigured() {
  const { botToken, chatId } = await getTelegramConfig();
  return Boolean(botToken && chatId);
}

// Builds the address of a Bot API method, e.g. .../bot<token>/sendMessage.
// TELEGRAM_API_URL can point somewhere else for testing; normally it is not set.
function apiUrl(botToken, method) {
  const base = process.env.TELEGRAM_API_URL || 'https://api.telegram.org';
  return `${base}/bot${botToken}/${method}`;
}

// An error from Telegram. "retryAfter" (seconds) is set when Telegram
// says we are sending too fast.
class TelegramError extends Error {
  constructor(message, retryAfter = null) {
    super(message);
    this.retryAfter = retryAfter;
  }
}

// Calls one Bot API method and returns its result.
// Throws a TelegramError with a readable message if anything goes wrong.
async function callTelegram(botToken, method, body) {
  if (!botToken) {
    throw new TelegramError('The Telegram bot token has not been entered yet (Settings, Telegram sales alerts).');
  }

  let reply;
  try {
    reply = await postJson(apiUrl(botToken, method), body, 15000); // give up after 15 seconds
  } catch (error) {
    throw new TelegramError(`Cannot reach Telegram (${error.message}). Check the internet connection.`);
  }

  const { data, status } = reply;
  if (!data.ok) {
    const retryAfter = data.parameters?.retry_after || null;
    throw new TelegramError(`Telegram said: ${data.description || `error ${status}`}`, retryAfter);
  }
  return data.result;
}

// Sends a text message to the shop's chat or group.
async function sendTelegramMessage(text) {
  const { botToken, chatId } = await getTelegramConfig();
  if (!chatId) {
    throw new TelegramError('The Telegram chat id has not been entered yet (Settings, Telegram sales alerts).');
  }
  return callTelegram(botToken, 'sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  });
}

// Lists the chats and groups the bot has recently seen, to help the owner
// find the chat id. (Send /start in the group first.)
async function findRecentChats() {
  const { botToken } = await getTelegramConfig();
  const updates = await callTelegram(botToken, 'getUpdates', { limit: 100 });
  const chats = new Map();
  updates.forEach((update) => {
    const chat = update.message?.chat || update.my_chat_member?.chat || update.channel_post?.chat;
    if (chat) {
      chats.set(chat.id, {
        id: String(chat.id),
        type: chat.type,
        name: chat.title || [chat.first_name, chat.last_name].filter(Boolean).join(' ') || chat.username || '',
      });
    }
  });
  return [...chats.values()];
}

// Makes text safe inside a Telegram HTML message (& < > have special meaning).
function escapeHtml(text) {
  return String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Formats a date/time in Lagos time, e.g. "27 Oct 2026, 2:30 pm".
function lagosTime(date) {
  return new Date(date).toLocaleString('en-NG', {
    timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

// Writes the Telegram message for a completed sale.
function saleAlertText(sale, storeName) {
  const lines = [
    `<b>New sale</b> at ${escapeHtml(storeName)}`,
    `Receipt: <b>${escapeHtml(sale.receiptNumber)}</b>`,
    `Time: ${lagosTime(sale.createdAt || new Date())}`,
    `Cashier: ${escapeHtml(sale.cashierName)}`,
  ];
  lines.push('');

  sale.items.slice(0, MAX_ITEMS_IN_MESSAGE).forEach((item) => {
    const discount = item.discount > 0 ? ` (discount ${formatNaira(item.discount)})` : '';
    lines.push(`${escapeHtml(item.name)}: ${item.quantity} at ${formatNaira(item.unitPrice)} = ${formatNaira(item.lineTotal)}${discount}`);
  });
  if (sale.items.length > MAX_ITEMS_IN_MESSAGE) {
    lines.push(`...and ${sale.items.length - MAX_ITEMS_IN_MESSAGE} more item(s)`);
  }

  lines.push('');
  lines.push(`Subtotal: ${formatNaira(sale.subtotal)}`);
  if (sale.discountTotal > 0) {
    const approved = sale.discountApprovedBy ? ` (approved by ${escapeHtml(sale.discountApprovedBy)})` : '';
    lines.push(`Discount: ${formatNaira(sale.discountTotal)}${approved}`);
  }
  lines.push(`<b>Total: ${formatNaira(sale.total)}</b>`);
  return lines.join('\n');
}

// Writes the message sent by the "Send test message" button.
function testMessageText(storeName, userName) {
  return `<b>Test message</b> from ${escapeHtml(storeName)}\nSent by ${escapeHtml(userName)} at ${lagosTime(new Date())}.\nSales alerts will arrive in this chat.`;
}

module.exports = {
  TelegramError,
  getTelegramConfig,
  isTelegramConfigured,
  sendTelegramMessage,
  findRecentChats,
  saleAlertText,
  testMessageText,
};
