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

// The Telegram part of the Settings page: enter the bot token and chat id,
// switch alerts on/off, send a test message, find the chat id and see
// which alerts were sent.
function TelegramSettings() {
  const { settings, setSettings } = useSettings();
  const [status, setStatus] = useState(null);
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [chats, setChats] = useState(null);
  const [working, setWorking] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Load the status when the page opens.
  useEffect(() => {
    loadStatus(true);
  }, []);

  // Fetches whether Telegram is set up and how the outbox is doing.
  // "fillForm" puts the saved chat id into its box (first load only).
  async function loadStatus(fillForm = false) {
    try {
      const data = await api.get('/telegram/status');
      setStatus(data);
      if (fillForm) setChatId(data.chatId || '');
    } catch (err) {
      setError(err.message);
    }
  }

  // Saves the bot token (if typed) and the chat id.
  function saveConfig(event) {
    event.preventDefault();
    run('config', async () => {
      const data = await api.put('/telegram/config', { botToken, chatId });
      setBotToken('');
      setMessage(data.message);
    });
  }

  // Forgets the saved token and chat id.
  function forgetConfig() {
    if (!window.confirm('Remove the saved Telegram bot token and chat id?')) return;
    run('config', async () => {
      setMessage((await api.delete('/telegram/config')).message);
      setChatId('');
    });
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

      <form className="telegram-setup form-grid" onSubmit={saveConfig}>
        <label className="span-2">
          Bot token {status.botTokenSet ? '✅ saved' : '❌ not set'}
          <input
            type="password"
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            placeholder={status.botTokenSet ? 'Saved (hidden). Paste a new token to change it.' : 'Paste the token from @BotFather, e.g. 7123456789:AAH...'}
            autoComplete="off"
          />
        </label>
        <label>
          Chat id {status.chatIdSet ? '✅' : '❌ not set'}
          <input value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="e.g. -1001234567890" />
        </label>
        <div className="form-actions span-full">
          <button type="submit" className="btn btn-primary" disabled={Boolean(working)}>
            {working === 'config' ? 'Saving...' : 'Save Telegram details'}
          </button>
          {(status.botTokenSet || status.chatIdSet) && (
            <button type="button" className="btn btn-danger" disabled={Boolean(working)} onClick={forgetConfig}>
              Remove details
            </button>
          )}
        </div>
        <p className="muted small span-full">
          The token is stored only on this laptop and is never shown again. See the README for how to create a bot with
          @BotFather.
        </p>
      </form>

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
              <p className="small">Click your shop's group to use its chat id, then press "Save Telegram details":</p>
              <ul>
                {chats.map((chat) => (
                  <li key={chat.id}>
                    <button type="button" className="link-button" onClick={() => setChatId(chat.id)}>
                      <code>{chat.id}</code> · {chat.name || 'No name'}
                    </button>{' '}
                    <span className="muted">({chat.type})</span>
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
