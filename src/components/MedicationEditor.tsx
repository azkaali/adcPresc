import { ArrowDown, ArrowUp, History, Pill, Trash2, Zap } from 'lucide-react';
import type { MedicationLine, Medicine } from '../../shared/types.ts';
import { composeDosage, DURATIONS, FREQUENCIES, QUANTITIES, TIMINGS, type Phrase } from '../lib/dosage';
import { formAbbreviation } from '../lib/format';
import { Field, TextInput } from './fields';
import { MedicineSearch } from './MedicineSearch';

/** A medication line while it is being edited, with the quick-dose picks that built its text. */
export interface EditableLine extends MedicationLine {
  key: string;
  qty?: number;
  freq?: number;
  timing?: number;
  /** Dosage was copied from the last prescription of this medicine. */
  fromLastUse?: boolean;
}

let lastKey = 0;
const newKey = () => `line-${++lastKey}`;

export const toEditable = (lines: MedicationLine[]): EditableLine[] => lines.map((l) => ({ ...l, key: newKey() }));

export const toLines = (lines: EditableLine[]): MedicationLine[] =>
  lines.map((l) => ({
    medicine_id: l.medicine_id,
    brand_name: l.brand_name,
    generic_name: l.generic_name,
    form: l.form,
    potency: l.potency,
    dosage_en: l.dosage_en,
    dosage_ur: l.dosage_ur,
    duration_en: l.duration_en,
    duration_ur: l.duration_ur,
  }));

function lineFromMedicine(m: Medicine): EditableLine {
  const last = m.last_use && (m.last_use.dosage_en || m.last_use.dosage_ur) ? m.last_use : null;
  return {
    key: newKey(),
    medicine_id: m.id,
    brand_name: m.brand_name,
    generic_name: m.generic_name,
    form: m.form,
    potency: m.strength || last?.potency || '',
    dosage_en: last?.dosage_en ?? '',
    dosage_ur: last?.dosage_ur ?? '',
    duration_en: last?.duration_en ?? '',
    duration_ur: last?.duration_ur ?? '',
    fromLastUse: !!last,
  };
}

function PhraseSelect(props: {
  placeholder: string;
  options: Phrase[];
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <select
      className="input select"
      value={props.value ?? ''}
      aria-label={props.placeholder}
      onChange={(e) => props.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
    >
      <option value="">{props.placeholder}</option>
      {props.options.map((p, i) => (
        <option key={p.en} value={i}>
          {p.en} — {p.ur}
        </option>
      ))}
    </select>
  );
}

interface RowProps {
  line: EditableLine;
  index: number;
  count: number;
  onPatch: (patch: Partial<EditableLine>) => void;
  onRemove: () => void;
  onMove: (delta: -1 | 1) => void;
}

function MedicationRow({ line, index, count, onPatch, onRemove, onMove }: RowProps) {
  const pick = (part: 'qty' | 'freq' | 'timing', value: number | undefined) => {
    const picks = { qty: line.qty, freq: line.freq, timing: line.timing, [part]: value };
    const dose = composeDosage([
      picks.qty === undefined ? undefined : QUANTITIES[picks.qty],
      picks.freq === undefined ? undefined : FREQUENCIES[picks.freq],
      picks.timing === undefined ? undefined : TIMINGS[picks.timing],
    ]);
    onPatch({ ...picks, dosage_en: dose.en, dosage_ur: dose.ur, fromLastUse: false });
  };

  const durationIndex = DURATIONS.findIndex((d) => d.en === line.duration_en);
  const edit = (key: keyof MedicationLine) => (value: string) => onPatch({ [key]: value, fromLastUse: false });

  return (
    <li className="med-line">
      <div className="med-line-head">
        <span className="med-line-number">{index + 1}</span>
        <div className="med-line-title">
          <strong>
            {formAbbreviation(line.form)} {line.brand_name}
          </strong>
          {line.generic_name && line.generic_name !== line.brand_name && (
            <span className="muted"> ({line.generic_name})</span>
          )}
          {line.fromLastUse && (
            <span className="badge badge-soft" title="Dosage copied from the last time you prescribed this medicine">
              <History size={12} /> last used dose
            </span>
          )}
        </div>
        <div className="med-line-actions">
          <button type="button" className="icon-btn" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move up">
            <ArrowUp size={16} />
          </button>
          <button type="button" className="icon-btn" onClick={() => onMove(1)} disabled={index === count - 1} aria-label="Move down">
            <ArrowDown size={16} />
          </button>
          <button type="button" className="icon-btn danger" onClick={onRemove} aria-label={`Remove ${line.brand_name}`}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="med-line-body">
        <Field label="Potency">
          <TextInput value={line.potency} onValue={edit('potency')} placeholder="e.g. 200 mg" />
        </Field>
        <div className="field">
          <span className="field-label">
            <Zap size={12} /> Quick dose (fills English + Urdu)
          </span>
          <div className="dose-builder">
            <PhraseSelect placeholder="Amount" options={QUANTITIES} value={line.qty} onChange={(v) => pick('qty', v)} />
            <PhraseSelect placeholder="How often" options={FREQUENCIES} value={line.freq} onChange={(v) => pick('freq', v)} />
            <PhraseSelect placeholder="When" options={TIMINGS} value={line.timing} onChange={(v) => pick('timing', v)} />
          </div>
        </div>
        <Field label="Duration">
          <select
            className="input select"
            value={durationIndex < 0 ? '' : durationIndex}
            onChange={(e) => {
              const d = e.target.value === '' ? undefined : DURATIONS[Number(e.target.value)];
              onPatch({ duration_en: d?.en ?? '', duration_ur: d?.ur ?? '' });
            }}
          >
            <option value="">{line.duration_en && durationIndex < 0 ? 'Custom' : 'Choose…'}</option>
            {DURATIONS.map((d, i) => (
              <option key={d.en} value={i}>
                {d.en} — {d.ur}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Dosage (English)" className="span-2">
          <TextInput value={line.dosage_en} onValue={edit('dosage_en')} voice="replace" placeholder="e.g. 1 tablet twice daily after meals" />
        </Field>
        <Field label="Duration (English)">
          <TextInput value={line.duration_en} onValue={edit('duration_en')} placeholder="e.g. 1 month" />
        </Field>

        <Field label={<>Dosage (Urdu) · <span className="urdu-inline">خوراک</span></>} className="span-2">
          <TextInput urdu value={line.dosage_ur} onValue={edit('dosage_ur')} voice="replace" placeholder="مثلاً ایک گولی دن میں دو بار" />
        </Field>
        <Field label={<>Duration (Urdu) · <span className="urdu-inline">مدت</span></>}>
          <TextInput urdu value={line.duration_ur} onValue={edit('duration_ur')} placeholder="مثلاً ایک مہینہ" />
        </Field>
      </div>
    </li>
  );
}

interface Props {
  lines: EditableLine[];
  onChange: (lines: EditableLine[]) => void;
}

export function MedicationEditor({ lines, onChange }: Props) {
  const add = (m: Medicine) => {
    const duplicate = lines.some((l) => l.medicine_id === m.id);
    if (duplicate && !window.confirm(`${m.brand_name} ${m.strength} is already on the list. Add it again?`)) return;
    onChange([...lines, lineFromMedicine(m)]);
  };

  const patch = (key: string, changes: Partial<EditableLine>) =>
    onChange(lines.map((l) => (l.key === key ? { ...l, ...changes } : l)));

  const move = (from: number, delta: -1 | 1) => {
    const to = from + delta;
    if (to < 0 || to >= lines.length) return;
    const next = [...lines];
    [next[from], next[to]] = [next[to], next[from]];
    onChange(next);
  };

  return (
    <div className="medications">
      <MedicineSearch onSelect={add} />
      {lines.length === 0 ? (
        <div className="empty-state small">
          <Pill size={22} />
          <p>No medicines yet. Search above by brand or generic name, then press Enter to add.</p>
        </div>
      ) : (
        <ol className="med-lines">
          {lines.map((line, i) => (
            <MedicationRow
              key={line.key}
              line={line}
              index={i}
              count={lines.length}
              onPatch={(changes) => patch(line.key, changes)}
              onRemove={() => onChange(lines.filter((l) => l.key !== line.key))}
              onMove={(delta) => move(i, delta)}
            />
          ))}
        </ol>
      )}
    </div>
  );
}
