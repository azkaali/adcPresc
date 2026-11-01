export const todayISO = () => new Date().toLocaleDateString('en-CA');

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const rxNumber = (id: number) => `RX-${String(id).padStart(5, '0')}`;

const FORM_ABBREVIATIONS: Record<string, string> = {
  tablet: 'Tab.',
  capsule: 'Cap.',
  injection: 'Inj.',
  syrup: 'Syp.',
  suspension: 'Susp.',
  drops: 'Drops',
  sachet: 'Sachet',
  gel: 'Gel',
  cream: 'Cream',
  ointment: 'Oint.',
  inhaler: 'Inhaler',
};

export const formAbbreviation = (form: string) => FORM_ABBREVIATIONS[form.trim().toLowerCase()] ?? form;

export function ageGender(age: string, gender: string): string {
  const a = age && /^\d+$/.test(age) ? `${age} yrs` : age;
  return [a, gender].filter(Boolean).join(' / ');
}

/** Appends dictated or picked text to an existing value. */
export function appendText(current: string, addition: string, separator = ' '): string {
  const trimmed = current.trim();
  return trimmed ? `${trimmed}${separator}${addition}` : addition;
}
