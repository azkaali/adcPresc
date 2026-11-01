import { Plus } from 'lucide-react';
import type { DiagnosisInput } from '../../shared/types.ts';
import { ADVICE } from '../lib/dosage';
import { appendText } from '../lib/format';
import { Field, TextArea, TextInput } from './fields';

type Clinical = Pick<DiagnosisInput, 'disease_name' | 'condition' | 'lab_conclusion'>;
type Advice = Pick<DiagnosisInput, 'advice_en' | 'advice_ur'>;

interface Props<T> {
  values: T;
  onChange: (patch: Partial<T>) => void;
}

export function ClinicalFields({ values, onChange, required }: Props<Clinical> & { required?: boolean }) {
  return (
    <div className="form-grid">
      <Field label="Disease name" required={required} className="span-2">
        <TextInput
          value={values.disease_name}
          onValue={(v) => onChange({ disease_name: v })}
          voice="replace"
          placeholder="e.g. Rheumatoid Arthritis"
        />
      </Field>
      <Field label="Condition / clinical findings">
        <TextArea
          rows={3}
          value={values.condition}
          onValue={(v) => onChange({ condition: v })}
          voice="append"
          placeholder="Symptoms, joints involved, examination findings…"
        />
      </Field>
      <Field label="Conclusion after lab">
        <TextArea
          rows={3}
          value={values.lab_conclusion}
          onValue={(v) => onChange({ lab_conclusion: v })}
          voice="append"
          placeholder="e.g. RA factor positive, anti-CCP positive, ESR raised"
        />
      </Field>
    </div>
  );
}

export function AdviceFields({ values, onChange }: Props<Advice>) {
  return (
    <>
      <div className="quick-picks">
        <span className="quick-picks-label">Add common advice</span>
        {ADVICE.map((p) => (
          <button
            key={p.en}
            type="button"
            className="chip"
            disabled={values.advice_en.includes(p.en)}
            title={p.ur}
            onClick={() =>
              onChange({ advice_en: appendText(values.advice_en, p.en), advice_ur: appendText(values.advice_ur, p.ur) })
            }
          >
            <Plus size={12} /> {p.en}
          </button>
        ))}
      </div>
      <div className="form-grid">
        <Field label="Advice (English)">
          <TextArea rows={3} value={values.advice_en} onValue={(v) => onChange({ advice_en: v })} voice="append" />
        </Field>
        <Field label={<>Advice (Urdu) · <span className="urdu-inline">ہدایات</span></>}>
          <TextArea urdu rows={3} value={values.advice_ur} onValue={(v) => onChange({ advice_ur: v })} voice="append" />
        </Field>
      </div>
    </>
  );
}
