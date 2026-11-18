// The demo sends nothing over the internet (no Telegram alerts).
async function postJson() {
  throw new Error('Telegram alerts are sent by the desktop app, not the demo.');
}

module.exports = { postJson };
