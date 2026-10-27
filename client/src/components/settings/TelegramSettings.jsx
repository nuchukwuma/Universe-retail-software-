import { useEffect, useState } from 'react';
import { api } from '../../api/api';
import { useSettings } from '../../context/SettingsContext';
import { formatDateTime } from '../../utils/dates';

const STATUS_LABELS = {
  sent: { text: 'Sent', className: 'badge badge-green' },
  pending: { text: 'Waiting to retry', className: 'badge badge-orange' },
  sending: { text: 'Sending', className: 'badge badge-orange' },
  failed: { text: 'Failed', className: 'badge badge-red' },
};

// The Telegram part of the Settings page: switch alerts on/off, send a
// test message, find the chat id and see which alerts were sent.
function TelegramSettings() {
  const { settings, setSettings } = useSettings();
  const [status, setStatus] = useState(null);
  const [chats, setChats] = useState(null);
  const [working, setWorking] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Load the status when the page opens.
  useEffect(() => {
    loadStatus();
  }, []);

  // Fetches whether Telegram is set up and how the outbox is doing.
  async function loadStatus() {
    try {
      setStatus(await api.get('/telegram/status'));
    } catch (err) {
      setError(err.message);
    }
  }

  // Runs one of the buttons' actions and shows the result.
  async function run(name, action) {
    setWorking(name);
    setError('');
    setMessage('');
    try {
      await action();
    } catch (err) {
      setError(err.message);
    } finally {
      setWorking('');
      loadStatus();
    }
  }

  // Switches alerts on or off (saved straight away). The tick box changes
  // at once, and changes back if saving fails.
  function toggleAlerts(enabled) {
    setSettings((current) => ({ ...current, telegramAlertsEnabled: enabled }));
    run('toggle', async () => {
      try {
        await api.put('/settings', { telegramAlertsEnabled: enabled });
        setMessage(enabled ? 'Sales alerts switched ON.' : 'Sales alerts switched OFF.');
      } catch (err) {
        setSettings((current) => ({ ...current, telegramAlertsEnabled: !enabled }));
        throw err;
      }
    });
  }

  if (!status) return <div className="card"><p className="muted">Loading Telegram settings...</p></div>;

  return (
    <div className="card telegram-card">
      <h2>📨 Telegram sales alerts</h2>
      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="telegram-setup">
        <div>{status.botTokenSet ? '✅' : '❌'} Bot token {status.botTokenSet ? 'is set' : 'is missing'} (TELEGRAM_BOT_TOKEN)</div>
        <div>
          {status.chatIdSet ? '✅' : '❌'} Chat id {status.chatIdSet ? `is set (${status.chatId})` : 'is missing'} (TELEGRAM_CHAT_ID)
        </div>
        {!status.configured && (
          <p className="muted small">
            Add these to the <code>server/.env</code> file and restart the server. The README explains how to
            create a bot with @BotFather.
          </p>
        )}
      </div>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={settings.telegramAlertsEnabled}
          onChange={(e) => toggleAlerts(e.target.checked)}
          disabled={working === 'toggle'}
        />
        Send a Telegram message after every sale
      </label>

      <div className="form-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={!status.configured || Boolean(working)}
          onClick={() => run('test', async () => setMessage((await api.post('/telegram/test')).message))}
        >
          {working === 'test' ? 'Sending...' : 'Send test message'}
        </button>
        <button
          type="button"
          className="btn"
          disabled={!status.botTokenSet || Boolean(working)}
          onClick={() => run('chats', async () => setChats(await api.get('/telegram/chats')))}
        >
          {working === 'chats' ? 'Looking...' : 'Find my chat ID'}
        </button>
        {status.failed > 0 && (
          <button
            type="button"
            className="btn"
            disabled={Boolean(working)}
            onClick={() => run('retry', async () => setMessage((await api.post('/telegram/retry')).message))}
          >
            Retry failed alerts
          </button>
        )}
      </div>

      {chats && (
        <div className="telegram-chats">
          {chats.length === 0 ? (
            <p className="muted small">
              No chats found yet. Add the bot to your group, send <code>/start</code> in the group, then try again.
            </p>
          ) : (
            <>
              <p className="small">Copy the id of your shop's group into <code>TELEGRAM_CHAT_ID</code> in <code>server/.env</code>:</p>
              <ul>
                {chats.map((chat) => (
                  <li key={chat.id}>
                    <code>{chat.id}</code> · {chat.name || 'No name'} <span className="muted">({chat.type})</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="stat-cards telegram-stats">
        <div className="stat-card">
          <span>Sent today</span>
          <strong>{status.sentToday}</strong>
        </div>
        <div className="stat-card stat-card-orange">
          <span>Waiting to retry</span>
          <strong>{status.pending}</strong>
        </div>
        <div className="stat-card stat-card-red">
          <span>Failed</span>
          <strong>{status.failed}</strong>
        </div>
      </div>

      {status.recent.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Receipt</th>
                <th>Time</th>
                <th>Status</th>
                <th className="number">Tries</th>
                <th>Last problem</th>
              </tr>
            </thead>
            <tbody>
              {status.recent.map((m) => (
                <tr key={m._id}>
                  <td>{m.receiptNumber}</td>
                  <td>{formatDateTime(m.createdAt)}</td>
                  <td><span className={STATUS_LABELS[m.status].className}>{STATUS_LABELS[m.status].text}</span></td>
                  <td className="number">{m.attempts}</td>
                  <td className="muted small wrap">{m.status === 'sent' ? '' : m.lastError}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted small">
        If Telegram or the internet is down, sales still complete. Alerts wait here and are retried automatically
        (after 1, 2, 5, 10 and 30 minutes, then every hour).
      </p>
    </div>
  );
}

export default TelegramSettings;
