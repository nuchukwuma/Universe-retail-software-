import { useEffect, useState } from 'react';
import { api } from '../../api/api';
import { useSettings } from '../../context/SettingsContext';
import { formatDateTime } from '../../utils/dates';

const STATUS_LABELS = {
  sent: { text: 'Sent', className: 'status status-ok' },
  pending: { text: 'Waiting to retry', className: 'status status-low' },
  sending: { text: 'Sending', className: 'status status-low' },
  failed: { text: 'Failed', className: 'status status-bad' },
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

  if (!status) return <section className="panel"><p className="loading">Loading the Telegram settings...</p></section>;

  return (
    <section className="panel stack" aria-labelledby="telegram-heading">
      <div>
        <h2 id="telegram-heading">Telegram sales alerts</h2>
        <p className="muted">A message to your Telegram group after every sale. This is the only thing the app sends over the internet.</p>
      </div>
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {message && <div className="notice notice-success" role="status">{message}</div>}

      <label className="check">
        <input
          type="checkbox"
          checked={settings.telegramAlertsEnabled}
          onChange={(e) => toggleAlerts(e.target.checked)}
          disabled={working === 'toggle'}
        />
        Send a Telegram message after every sale
      </label>

      <form className="form-grid" onSubmit={saveConfig}>
        <div className="field">
          <label className="field-label" htmlFor="telegram-token">Bot token: {status.botTokenSet ? 'saved' : 'not set'}</label>
          <input
            id="telegram-token"
            type="password"
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            placeholder={status.botTokenSet ? 'Saved and hidden. Paste a new one to change it.' : 'From @BotFather, e.g. 7123456789:AAH...'}
            autoComplete="off"
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="telegram-chat">Chat id: {status.chatIdSet ? 'saved' : 'not set'}</label>
          <input id="telegram-chat" value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="e.g. -1001234567890" />
        </div>
        <div className="span-all btn-row">
          <button type="submit" className="btn btn-primary" disabled={Boolean(working)}>
            {working === 'config' ? 'Saving...' : 'Save Telegram details'}
          </button>
          <button
            type="button"
            className="btn"
            disabled={!status.botTokenSet || Boolean(working)}
            onClick={() => run('chats', async () => setChats(await api.get('/telegram/chats')))}
          >
            {working === 'chats' ? 'Looking...' : 'Find my chat id'}
          </button>
          <button
            type="button"
            className="btn"
            disabled={!status.configured || Boolean(working)}
            onClick={() => run('test', async () => setMessage((await api.post('/telegram/test')).message))}
          >
            {working === 'test' ? 'Sending...' : 'Send a test message'}
          </button>
          {(status.botTokenSet || status.chatIdSet) && (
            <button type="button" className="btn btn-danger" disabled={Boolean(working)} onClick={forgetConfig}>
              Remove details
            </button>
          )}
        </div>
      </form>

      {chats && (
        chats.length === 0 ? (
          <p className="notice">No chats found yet. Add the bot to your group, send /start in the group, then press "Find my chat id" again.</p>
        ) : (
          <div className="stack">
            <p>Choose your shop's group, then press "Save Telegram details".</p>
            <table className="table">
              <thead>
                <tr>
                  <th>Chat</th>
                  <th>Kind</th>
                  <th>Chat id</th>
                  <th><span className="visually-hidden">Use</span></th>
                </tr>
              </thead>
              <tbody>
                {chats.map((chat) => (
                  <tr key={chat.id}>
                    <td className="cell-main">{chat.name || 'No name'}</td>
                    <td>{chat.type}</td>
                    <td>{chat.id}</td>
                    <td className="actions">
                      <button type="button" className="btn btn-small" onClick={() => setChatId(chat.id)}>Use this chat</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      <dl className="figures">
        <div className="figure"><dt>Sent today</dt><dd>{status.sentToday}</dd></div>
        <div className="figure"><dt>Waiting to retry</dt><dd>{status.pending}</dd></div>
        <div className="figure"><dt>Failed</dt><dd className={status.failed > 0 ? 'danger-text' : undefined}>{status.failed}</dd></div>
      </dl>
      {status.failed > 0 && (
        <div className="btn-row">
          <button type="button" className="btn" disabled={Boolean(working)} onClick={() => run('retry', async () => setMessage((await api.post('/telegram/retry')).message))}>
            Retry failed alerts
          </button>
        </div>
      )}

      {status.recent.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Receipt</th>
                <th>Time</th>
                <th>Status</th>
                <th className="num">Tries</th>
                <th>Last problem</th>
              </tr>
            </thead>
            <tbody>
              {status.recent.map((m) => (
                <tr key={m._id}>
                  <td className="cell-main">{m.receiptNumber}</td>
                  <td>{formatDateTime(m.createdAt)}</td>
                  <td><span className={STATUS_LABELS[m.status].className}>{STATUS_LABELS[m.status].text}</span></td>
                  <td className="num">{m.attempts}</td>
                  <td className="muted small">{m.status === 'sent' ? '' : m.lastError}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted small">
        If the internet is down, sales still complete. Alerts wait and are sent again by themselves after 1, 2, 5, 10 and 30 minutes, then every hour.
      </p>
    </section>
  );
}

export default TelegramSettings;
