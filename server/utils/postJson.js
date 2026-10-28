const http = require('http');
const https = require('https');

// Sends JSON to a web address and returns the JSON reply.
// (Uses Node's own http/https modules, so it works on the older Node
// version inside the Windows 8 desktop app, which has no fetch().)
// Resolves with { status, data }. Rejects if the address cannot be reached.
function postJson(url, body, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body || {});
    const client = url.startsWith('https:') ? https : http;

    const request = client.request(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
        timeout: timeoutMs,
      },
      (response) => {
        let text = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          text += chunk;
        });
        response.on('end', () => {
          let data = {};
          try {
            data = JSON.parse(text);
          } catch {
            data = {};
          }
          resolve({ status: response.statusCode, data });
        });
      }
    );

    request.on('timeout', () => request.destroy(new Error('timed out')));
    request.on('error', reject);
    request.end(payload);
  });
}

module.exports = { postJson };
