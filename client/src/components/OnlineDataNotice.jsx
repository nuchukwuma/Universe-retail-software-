import { useSettings } from '../context/SettingsContext';

// Warns the owner when the shop's data is still being saved online (MONGO_URI
// points to MongoDB Atlas and MongoDB is not installed on this computer yet).
// Shows nothing in the normal, offline set-up.
function OnlineDataNotice() {
  const { settings } = useSettings();
  if (!settings.dataSavedOnline) return null;
  return (
    <div className="notice notice-warning" role="status">
      <span className="notice-title">The shop's data is still being saved online, not on this computer</span>
      MongoDB is not installed (or not running) on this computer yet, so the app is using the online
      database and needs the internet. Install MongoDB Community Server on this computer (see the
      README), then close and start the app again: the shop's data is copied to this computer
      automatically, one time, and from then on everything is saved here.
    </div>
  );
}

export default OnlineDataNotice;
