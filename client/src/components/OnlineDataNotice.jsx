import { useSettings } from '../context/SettingsContext';

// Warns the owner when the shop's data is being saved online (the server's
// MONGO_URI points to MongoDB Atlas or another computer) instead of on
// this computer. Shows nothing in the normal, offline set-up.
function OnlineDataNotice() {
  const { settings } = useSettings();
  if (!settings.dataSavedOnline) return null;
  return (
    <div className="notice notice-warning" role="status">
      <span className="notice-title">The shop's data is being saved online, not on this computer</span>
      The server is connected to an online database (for example MongoDB Atlas), so it needs the
      internet. To keep everything offline, install MongoDB on this computer and set
      MONGO_URI=mongodb://127.0.0.1:27017/universe_pos in the file server/.env (see the README).
    </div>
  );
}

export default OnlineDataNotice;
