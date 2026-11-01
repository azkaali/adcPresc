import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Copy, Pencil, Printer, Trash2 } from 'lucide-react';
import type { Prescription, Settings } from '../../shared/types.ts';
import { api } from '../api';
import { PrescriptionDocument } from '../components/PrescriptionDocument';
import { useToast } from '../components/Toast';
import { rxNumber } from '../lib/format';
import { ErrorState, Loading } from './states';

export default function PrescriptionView() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const toast = useToast();
  const [rx, setRx] = useState<Prescription | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.prescriptions.get(id), api.settings.get()])
      .then(([prescription, s]) => {
        setRx(prescription);
        setSettings(s);
      })
      .catch((err: Error) => setError(err.message));
  }, [id]);

  if (error) return <ErrorState message={error} />;
  if (!rx || !settings) return <Loading />;

  const remove = async () => {
    if (!window.confirm(`Delete prescription ${rxNumber(rx.id)} for ${rx.patient_name}? This cannot be undone.`)) return;
    try {
      await api.prescriptions.remove(rx.id);
      toast('Prescription deleted');
      navigate('/prescriptions', { replace: true });
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  return (
    <div className="page">
      <header className="page-header no-print">
        <div>
          <Link to="/prescriptions" className="back-link">
            <ArrowLeft size={14} /> All prescriptions
          </Link>
          <h1>
            {rx.patient_name} <span className="muted">· {rxNumber(rx.id)}</span>
          </h1>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-danger-ghost" onClick={remove}>
            <Trash2 size={16} /> Delete
          </button>
          <Link className="btn" to={`/prescriptions/new?from=${rx.id}`} title="Start a new prescription for this patient with the same medicines">
            <Copy size={16} /> Repeat for follow-up
          </Link>
          <Link className="btn" to={`/prescriptions/${rx.id}/edit`}>
            <Pencil size={16} /> Edit
          </Link>
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>
            <Printer size={16} /> Print
          </button>
        </div>
      </header>
      <PrescriptionDocument rx={rx} settings={settings} />
    </div>
  );
}
