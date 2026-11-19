import { Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLicence } from '../context/LicenceContext';
import LicencePanel, { licenceSummary } from './LicencePanel';

// Shown instead of the till and the stock pages when the licence (or the
// free trial) has run out. Reports, backups and Settings stay open.
function LicenceLock() {
  const { user } = useAuth();
  const { licence } = useLicence();
  return (
    <div className="page licence-lock">
      <section className="panel stack">
        <div className="licence-lock-head">
          <Lock size={28} aria-hidden="true" />
          <div>
            <h1>Selling is paused</h1>
            <p className="muted">{licenceSummary(licence)}</p>
          </div>
        </div>
        {user.role === 'owner' ? <LicencePanel compact /> : <p>Ask the owner to renew the HordeDesk licence.</p>}
      </section>
    </div>
  );
}

export default LicenceLock;
