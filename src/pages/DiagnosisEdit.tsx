import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, ClipboardList, FilePlus2, Pill, Save, Stethoscope, Trash2 } from 'lucide-react';
import type { DiagnosisInput } from '../../shared/types.ts';
import { api } from '../api';
import { AdviceFields, ClinicalFields } from '../components/ClinicalFields';
import { MedicationEditor, toEditable, toLines, type EditableLine } from '../components/MedicationEditor';
import { useToast } from '../components/Toast';
import { formatDate } from '../lib/format';
import { useSaveShortcut, useUnsavedChanges } from '../lib/hooks';
import { ErrorState, Loading } from './states';

type Details = Omit<DiagnosisInput, 'medications'>;

const emptyDetails = (): Details => ({ disease_name: '', condition: '', lab_conclusion: '', advice_en: '', advice_ur: '' });

export default function DiagnosisEdit() {
  const { id } = useParams();
  const editingId = id ? Number(id) : null;
  const navigate = useNavigate();
  const toast = useToast();

  const [details, setDetails] = useState<Details>(emptyDetails);
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [usage, setUsage] = useState<{ count: number; last: string | null } | null>(null);
  const [loading, setLoading] = useState(editingId !== null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const allowLeave = useUnsavedChanges(dirty);

  useEffect(() => {
    if (!editingId) return;
    api.diagnoses
      .get(editingId)
      .then((d) => {
        setDetails({
          disease_name: d.disease_name,
          condition: d.condition,
          lab_conclusion: d.lab_conclusion,
          advice_en: d.advice_en,
          advice_ur: d.advice_ur,
        });
        setLines(toEditable(d.medications));
        setUsage({ count: d.usage_count, last: d.last_used_at });
      })
      .catch((err: Error) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, [editingId]);

  const update = (patch: Partial<Details>) => {
    setDetails((d) => ({ ...d, ...patch }));
    setDirty(true);
  };

  const save = async () => {
    if (saving) return;
    if (!details.disease_name.trim()) {
      toast('Enter the disease name', 'error');
      return;
    }
    setSaving(true);
    try {
      const input: DiagnosisInput = { ...details, medications: toLines(lines) };
      const saved = editingId ? await api.diagnoses.update(editingId, input) : await api.diagnoses.create(input);
      allowLeave();
      toast(`${saved.disease_name} saved`);
      navigate('/diagnoses', { replace: true });
    } catch (err) {
      toast((err as Error).message, 'error');
      setSaving(false);
    }
  };
  useSaveShortcut(() => void save());

  const remove = async () => {
    if (!editingId) return;
    if (!window.confirm(`Delete the “${details.disease_name}” diagnosis? Past prescriptions are not affected.`)) return;
    try {
      await api.diagnoses.remove(editingId);
      allowLeave();
      toast('Diagnosis deleted');
      navigate('/diagnoses', { replace: true });
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  if (loading) return <Loading />;
  if (loadError) return <ErrorState message={loadError} />;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <Link to="/diagnoses" className="back-link">
            <ArrowLeft size={14} /> All diagnoses
          </Link>
          <h1>{editingId ? details.disease_name || 'Edit diagnosis' : 'New diagnosis'}</h1>
          {usage && (
            <p className="muted">
              Used in {usage.count} prescription{usage.count === 1 ? '' : 's'}
              {usage.last && ` · last on ${formatDate(usage.last)}`}
            </p>
          )}
        </div>
        <div className="page-actions">
          {editingId && (
            <>
              <button type="button" className="btn btn-danger-ghost" onClick={remove}>
                <Trash2 size={16} /> Delete
              </button>
              <Link className="btn" to={`/prescriptions/new?diagnosis=${editingId}`}>
                <FilePlus2 size={16} /> Prescribe
              </Link>
            </>
          )}
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
            <Save size={16} /> Save
          </button>
        </div>
      </header>

      <section className="card">
        <h2 className="card-title">
          <Stethoscope size={18} /> Diagnosis details
        </h2>
        <ClinicalFields values={details} onChange={update} required />
      </section>

      <section className="card">
        <h2 className="card-title">
          <Pill size={18} /> Usual medicines
          {lines.length > 0 && <span className="count-pill">{lines.length}</span>}
        </h2>
        <p className="muted card-intro">These are filled in automatically whenever this diagnosis is picked for a prescription.</p>
        <MedicationEditor
          lines={lines}
          onChange={(next) => {
            setLines(next);
            setDirty(true);
          }}
        />
      </section>

      <section className="card">
        <h2 className="card-title">
          <ClipboardList size={18} /> Advice
        </h2>
        <AdviceFields values={details} onChange={update} />
      </section>

      <div className="save-bar">
        <div className="save-bar-option" />
        <div className="save-bar-actions">
          <span className="muted kbd-hint">
            <kbd>Ctrl</kbd> + <kbd>S</kbd>
          </span>
          <button type="button" className="btn btn-primary btn-lg" onClick={save} disabled={saving}>
            <Save size={18} /> {saving ? 'Saving…' : 'Save diagnosis'}
          </button>
        </div>
      </div>
    </div>
  );
}
