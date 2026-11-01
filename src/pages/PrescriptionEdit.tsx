import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { ClipboardList, Link2Off, Pill, Save, Stethoscope, User } from 'lucide-react';
import type { Diagnosis, DiagnosisSummary, Prescription, PrescriptionInput, TemplateAction } from '../../shared/types.ts';
import { api } from '../api';
import { AdviceFields, ClinicalFields } from '../components/ClinicalFields';
import { DiagnosisPicker } from '../components/DiagnosisPicker';
import { cx, Field, TextInput } from '../components/fields';
import { MedicationEditor, toEditable, toLines, type EditableLine } from '../components/MedicationEditor';
import { useToast } from '../components/Toast';
import { FOLLOW_UPS } from '../lib/dosage';
import { rxNumber, todayISO } from '../lib/format';
import { useSaveShortcut, useUnsavedChanges } from '../lib/hooks';
import { useMedicines } from '../lib/medicines';
import { ErrorState, Loading } from './states';

type Details = Omit<PrescriptionInput, 'medications' | 'template_action'>;

const GENDERS = ['Male', 'Female', 'Other'];

const emptyDetails = (): Details => ({
  patient_name: '',
  patient_age: '',
  patient_gender: '',
  patient_phone: '',
  patient_mr_no: '',
  visit_date: todayISO(),
  diagnosis_id: null,
  disease_name: '',
  condition: '',
  lab_conclusion: '',
  advice_en: '',
  advice_ur: '',
  follow_up: '',
});

const detailsOf = (rx: Prescription): Details => ({
  patient_name: rx.patient_name,
  patient_age: rx.patient_age,
  patient_gender: rx.patient_gender,
  patient_phone: rx.patient_phone,
  patient_mr_no: rx.patient_mr_no,
  visit_date: rx.visit_date,
  diagnosis_id: rx.diagnosis_id,
  disease_name: rx.disease_name,
  condition: rx.condition,
  lab_conclusion: rx.lab_conclusion,
  advice_en: rx.advice_en,
  advice_ur: rx.advice_ur,
  follow_up: rx.follow_up,
});

/**
 * New prescription, edit (/prescriptions/:id/edit), start from a diagnosis (?diagnosis=ID)
 * or repeat an earlier prescription for a follow-up visit (?from=ID).
 */
export default function PrescriptionEdit() {
  const { id } = useParams();
  const editingId = id ? Number(id) : null;
  const [search] = useSearchParams();
  const copyFrom = search.get('from');
  const diagnosisParam = search.get('diagnosis');
  const navigate = useNavigate();
  const toast = useToast();
  const { reload: reloadMedicines } = useMedicines();

  const [details, setDetails] = useState<Details>(emptyDetails);
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [diagnoses, setDiagnoses] = useState<DiagnosisSummary[]>([]);
  const [templateAction, setTemplateAction] = useState<TemplateAction>('none');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const allowLeave = useUnsavedChanges(dirty);

  const update = (patch: Partial<Details>) => {
    setDetails((d) => ({ ...d, ...patch }));
    setDirty(true);
  };

  const updateLines = (next: EditableLine[]) => {
    setLines(next);
    setDirty(true);
  };

  const applyDiagnosis = (d: Diagnosis) => {
    setDetails((current) => ({
      ...current,
      diagnosis_id: d.id,
      disease_name: d.disease_name,
      condition: d.condition,
      lab_conclusion: d.lab_conclusion,
      advice_en: d.advice_en,
      advice_ur: d.advice_ur,
    }));
    setLines(toEditable(d.medications));
    setTemplateAction('none');
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setDiagnoses(await api.diagnoses.list());
        if (editingId) {
          const rx = await api.prescriptions.get(editingId);
          if (cancelled) return;
          setDetails(detailsOf(rx));
          setLines(toEditable(rx.medications));
        } else if (copyFrom) {
          const rx = await api.prescriptions.get(Number(copyFrom));
          if (cancelled) return;
          setDetails({ ...detailsOf(rx), visit_date: todayISO(), follow_up: '' });
          setLines(toEditable(rx.medications));
        } else if (diagnosisParam) {
          const d = await api.diagnoses.get(Number(diagnosisParam));
          if (!cancelled) applyDiagnosis(d);
        }
      } catch (err) {
        if (!cancelled) setLoadError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editingId, copyFrom, diagnosisParam]);

  const chooseDiagnosis = async (summary: DiagnosisSummary) => {
    const hasContent = lines.length > 0 || details.condition.trim() || details.lab_conclusion.trim();
    if (hasContent && !window.confirm(`Replace the current diagnosis details and medicines with “${summary.disease_name}”?`)) {
      return;
    }
    try {
      applyDiagnosis(await api.diagnoses.get(summary.id));
      setDirty(true);
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  const save = async () => {
    if (saving) return;
    if (!details.patient_name.trim()) {
      toast('Enter the patient name before saving', 'error');
      document.getElementById('patient_name')?.focus();
      return;
    }
    const missingDose = lines.filter((l) => !l.dosage_en.trim() && !l.dosage_ur.trim());
    if (missingDose.length && !window.confirm(`No dosage entered for ${missingDose.map((l) => l.brand_name).join(', ')}. Save anyway?`)) {
      return;
    }
    setSaving(true);
    try {
      const input: PrescriptionInput = { ...details, medications: toLines(lines), template_action: templateAction };
      const saved = editingId ? await api.prescriptions.update(editingId, input) : await api.prescriptions.create(input);
      void reloadMedicines(); // usage counts and "last used dose" changed
      allowLeave();
      toast(editingId ? 'Prescription updated' : 'Prescription saved');
      navigate(`/prescriptions/${saved.id}`, { replace: true });
    } catch (err) {
      toast((err as Error).message, 'error');
      setSaving(false);
    }
  };
  useSaveShortcut(() => void save());

  if (loading) return <Loading />;
  if (loadError) return <ErrorState message={loadError} />;

  const linkedName = diagnoses.find((d) => d.id === details.diagnosis_id)?.disease_name;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>{editingId ? `Edit prescription ${rxNumber(editingId)}` : 'New prescription'}</h1>
          <p className="muted">
            {copyFrom ? 'Repeating an earlier prescription — review and save as a new visit.' : 'Pick a diagnosis to fill everything in, then adjust for this patient.'}
          </p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn" onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
            <Save size={16} /> Save
          </button>
        </div>
      </header>

      <section className="card">
        <h2 className="card-title">
          <User size={18} /> Patient
        </h2>
        <div className="form-grid cols-6">
          <Field label="Patient name" required className="span-3">
            <TextInput
              id="patient_name"
              autoFocus={!editingId}
              value={details.patient_name}
              onValue={(v) => update({ patient_name: v })}
              voice="replace"
              placeholder="Full name"
            />
          </Field>
          <Field label="Age" className="span-1">
            <TextInput value={details.patient_age} onValue={(v) => update({ patient_age: v })} placeholder="Years" inputMode="numeric" />
          </Field>
          <div className="field span-2">
            <span className="field-label">Gender</span>
            <div className="segmented segmented-fill" role="group" aria-label="Gender">
              {GENDERS.map((g) => (
                <button
                  key={g}
                  type="button"
                  className={cx(details.patient_gender === g && 'active')}
                  aria-pressed={details.patient_gender === g}
                  onClick={() => update({ patient_gender: details.patient_gender === g ? '' : g })}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          <Field label="Phone" className="span-2">
            <TextInput value={details.patient_phone} onValue={(v) => update({ patient_phone: v })} placeholder="03xx-xxxxxxx" inputMode="tel" />
          </Field>
          <Field label="MR / file no." className="span-2">
            <TextInput value={details.patient_mr_no} onValue={(v) => update({ patient_mr_no: v })} />
          </Field>
          <Field label="Visit date" className="span-2">
            <input
              type="date"
              className="input"
              value={details.visit_date}
              onChange={(e) => update({ visit_date: e.target.value })}
              required
            />
          </Field>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">
          <Stethoscope size={18} /> Diagnosis
        </h2>
        <DiagnosisPicker diagnoses={diagnoses} selectedId={details.diagnosis_id} onPick={chooseDiagnosis} />
        {details.diagnosis_id && linkedName && (
          <div className="linked-template">
            Filled from the <strong>{linkedName}</strong> diagnosis. Changes here only affect this prescription
            unless you tick the box at the bottom.
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                update({ diagnosis_id: null });
                setTemplateAction('none');
              }}
            >
              <Link2Off size={14} /> Unlink
            </button>
          </div>
        )}
        <ClinicalFields values={details} onChange={update} />
      </section>

      <section className="card">
        <h2 className="card-title">
          <Pill size={18} /> Medicines
          {lines.length > 0 && <span className="count-pill">{lines.length}</span>}
        </h2>
        <MedicationEditor lines={lines} onChange={updateLines} />
      </section>

      <section className="card">
        <h2 className="card-title">
          <ClipboardList size={18} /> Advice & follow-up
        </h2>
        <AdviceFields values={details} onChange={update} />
        <div className="form-grid">
          <Field label="Follow-up">
            <TextInput value={details.follow_up} onValue={(v) => update({ follow_up: v })} placeholder="e.g. After 1 month with CBC, LFTs" />
          </Field>
          <div className="field">
            <span className="field-label">Quick pick</span>
            <div className="chips-row">
              {FOLLOW_UPS.map((f) => (
                <button key={f} type="button" className={cx('chip', details.follow_up === f && 'chip-active')} onClick={() => update({ follow_up: f })}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="save-bar">
        <div className="save-bar-option">
          {details.diagnosis_id && linkedName ? (
            <label className="checkbox">
              <input
                type="checkbox"
                checked={templateAction === 'update'}
                onChange={(e) => setTemplateAction(e.target.checked ? 'update' : 'none')}
              />
              <span>
                Also update the <strong>{linkedName}</strong> diagnosis with these details and medicines
              </span>
            </label>
          ) : details.disease_name.trim() ? (
            <label className="checkbox">
              <input
                type="checkbox"
                checked={templateAction === 'create'}
                onChange={(e) => setTemplateAction(e.target.checked ? 'create' : 'none')}
              />
              <span>
                Save <strong>{details.disease_name.trim()}</strong> as a new diagnosis for future prescriptions
              </span>
            </label>
          ) : null}
        </div>
        <div className="save-bar-actions">
          <span className="muted kbd-hint">
            <kbd>Ctrl</kbd> + <kbd>S</kbd>
          </span>
          <button type="button" className="btn btn-primary btn-lg" onClick={save} disabled={saving}>
            <Save size={18} /> {saving ? 'Saving…' : editingId ? 'Save changes' : 'Save prescription'}
          </button>
        </div>
      </div>
    </div>
  );
}
