import { useState, type FormEvent } from 'react';
import type { Medicine, MedicineInput } from '../../shared/types.ts';
import { useMedicines } from '../lib/medicines';
import { Field, TextInput } from './fields';
import { Modal } from './Modal';

const FORMS = ['Tablet', 'Capsule', 'Injection', 'Syrup', 'Suspension', 'Drops', 'Sachet', 'Gel', 'Cream', 'Ointment', 'Inhaler'];

export const emptyMedicine = (): MedicineInput => ({
  brand_name: '',
  generic_name: '',
  strength: '',
  form: 'Tablet',
  manufacturer: '',
});

interface Props {
  initial: MedicineInput;
  /** Set when editing an existing medicine. */
  medicineId?: number;
  onClose: () => void;
  onSaved: (medicine: Medicine) => void;
}

export function MedicineFormModal({ initial, medicineId, onClose, onSaved }: Props) {
  const { save } = useMedicines();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof MedicineInput) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    // The modal renders in a portal, but React still bubbles events to the parent component tree.
    e.stopPropagation();
    setSaving(true);
    setError(null);
    try {
      onSaved(await save(form, medicineId));
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  // Put the cursor in the first empty name field (search text prefills one of them).
  const focusGeneric = !!initial.brand_name && !initial.generic_name;

  return (
    <Modal title={medicineId ? 'Edit medicine' : 'Add new medicine'} onClose={onClose}>
      <form className="modal-body form-grid" onSubmit={submit}>
        <Field label="Brand name" hint="Leave blank for medicines sold by generic name">
          <TextInput autoFocus={!focusGeneric} value={form.brand_name} onValue={set('brand_name')} placeholder="e.g. Plaquenil" />
        </Field>
        <Field label="Generic name">
          <TextInput autoFocus={focusGeneric} value={form.generic_name} onValue={set('generic_name')} placeholder="e.g. Hydroxychloroquine" />
        </Field>
        <Field label="Potency / strength">
          <TextInput value={form.strength} onValue={set('strength')} placeholder="e.g. 200 mg" />
        </Field>
        <Field label="Form">
          <TextInput value={form.form} onValue={set('form')} list="medicine-forms" placeholder="Tablet, Capsule…" />
          <datalist id="medicine-forms">
            {FORMS.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </Field>
        <Field label="Manufacturer (optional)" className="span-2">
          <TextInput value={form.manufacturer} onValue={set('manufacturer')} />
        </Field>
        {error && <p className="form-error span-2">{error}</p>}
        <div className="modal-actions span-2">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving || (!form.brand_name.trim() && !form.generic_name.trim())}>
            {saving ? 'Saving…' : 'Save medicine'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
