import { useEffect, useState, type FormEvent } from 'react';
import { Building2, Download, Save, UserRound } from 'lucide-react';
import type { Settings as SettingsData } from '../../shared/types.ts';
import { api } from '../api';
import { Field, TextInput } from '../components/fields';
import { useToast } from '../components/Toast';
import { ErrorState, Loading } from './states';

export default function Settings() {
  const toast = useToast();
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.settings
      .get()
      .then(setSettings)
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!settings) return <Loading />;

  const field = (key: keyof SettingsData) => ({
    value: settings[key],
    onValue: (value: string) => setSettings({ ...settings, [key]: value }),
  });

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      setSettings(await api.settings.save(settings));
      toast('Settings saved');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="page" onSubmit={save}>
      <header className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="muted">These details print at the top of every prescription.</p>
        </div>
        <div className="page-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Save size={16} /> {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </header>

      <section className="card">
        <h2 className="card-title">
          <UserRound size={18} /> Doctor
        </h2>
        <div className="form-grid">
          <Field label="Doctor name">
            <TextInput {...field('doctor_name')} placeholder="e.g. Dr. Ayesha Khan" />
          </Field>
          <Field label="Qualifications">
            <TextInput {...field('doctor_qualifications')} placeholder="e.g. MBBS, FCPS (Medicine), FCPS (Rheumatology)" />
          </Field>
          <Field label="Specialty / title">
            <TextInput {...field('doctor_specialty')} />
          </Field>
          <Field label="PMDC registration no.">
            <TextInput {...field('doctor_registration')} />
          </Field>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">
          <Building2 size={18} /> Clinic
        </h2>
        <div className="form-grid">
          <Field label="Clinic name">
            <TextInput {...field('clinic_name')} />
          </Field>
          <Field label="Phone">
            <TextInput {...field('clinic_phone')} />
          </Field>
          <Field label="Address" className="span-2">
            <TextInput {...field('clinic_address')} />
          </Field>
          <Field label="Footer note on prescriptions" className="span-2" hint="Optional, e.g. clinic timings">
            <TextInput {...field('print_footer')} />
          </Field>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">
          <Download size={18} /> Backup
        </h2>
        <p className="muted card-intro">
          Download a copy of all patients, prescriptions, diagnoses and medicines. Keep it on a USB drive or cloud storage.
        </p>
        <a className="btn" href="/api/backup" download>
          <Download size={16} /> Download backup
        </a>
      </section>
    </form>
  );
}
