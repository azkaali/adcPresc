import { useMemo, useState } from 'react';
import { Pencil, Pill, Plus, Search, Trash2 } from 'lucide-react';
import type { Medicine, MedicineInput } from '../../shared/types.ts';
import { emptyMedicine, MedicineFormModal } from '../components/MedicineFormModal';
import { SearchModeToggle, useSearchMode } from '../components/MedicineSearch';
import { useToast } from '../components/Toast';
import { VoiceButton } from '../components/VoiceButton';
import { useMedicines } from '../lib/medicines';
import { searchMedicines } from '../lib/search';
import { EmptyState, ErrorState, Loading } from './states';

const MAX_ROWS = 300;

export default function Medicines() {
  const { medicines, index, loading, error, remove } = useMedicines();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useSearchMode();
  const [editing, setEditing] = useState<{ id?: number; initial: MedicineInput } | null>(null);

  const rows = useMemo(() => {
    if (query.trim()) return searchMedicines(index, query, mode, Infinity);
    if (mode === 'brand') return medicines;
    return [...medicines].sort((a, b) => a.generic_name.localeCompare(b.generic_name) || a.brand_name.localeCompare(b.brand_name));
  }, [index, medicines, query, mode]);

  const edit = (m: Medicine) =>
    setEditing({
      id: m.id,
      initial: { brand_name: m.brand_name, generic_name: m.generic_name, strength: m.strength, form: m.form, manufacturer: m.manufacturer },
    });

  const confirmRemove = async (m: Medicine) => {
    if (!window.confirm(`Delete ${m.brand_name} ${m.strength}? Saved diagnoses and prescriptions keep their copy of the name.`)) return;
    try {
      await remove(m.id);
      toast(`${m.brand_name} deleted`);
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Medicines</h1>
          <p className="muted">
            {medicines.length} medicines. Search works by brand or generic name — the same search is used when prescribing.
          </p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-primary" onClick={() => setEditing({ initial: emptyMedicine() })}>
            <Plus size={16} /> Add medicine
          </button>
        </div>
      </header>

      <div className="search-box search-box-lg">
        <Search size={18} aria-hidden />
        <input
          className="search-box-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.altKey && (e.key === 'b' || e.key === 'g')) {
              e.preventDefault();
              setMode(e.key === 'b' ? 'brand' : 'generic');
            }
          }}
          placeholder={mode === 'brand' ? 'Search by brand name…' : 'Search by generic name…'}
          aria-label={`Search medicines by ${mode} name`}
          autoFocus
          spellCheck={false}
        />
        <VoiceButton label="Say the medicine name" onText={setQuery} />
        <SearchModeToggle mode={mode} onChange={setMode} />
      </div>

      {error ? (
        <ErrorState message={error} />
      ) : loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Pill size={28} />} title={query ? `No medicine matches “${query}” by ${mode} name` : 'No medicines yet'}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() =>
              setEditing({
                initial: { ...emptyMedicine(), [mode === 'brand' ? 'brand_name' : 'generic_name']: query.trim() },
              })
            }
          >
            <Plus size={16} /> Add {query.trim() ? `“${query.trim()}”` : 'a medicine'}
          </button>
        </EmptyState>
      ) : (
        <div className="card card-flush">
          <table className="table">
            <thead>
              <tr>
                <th>{mode === 'brand' ? 'Brand name' : 'Generic name'}</th>
                <th>{mode === 'brand' ? 'Generic name' : 'Brand name'}</th>
                <th>Strength</th>
                <th>Form</th>
                <th>Manufacturer</th>
                <th className="num">Prescribed</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, MAX_ROWS).map((m) => (
                <tr key={m.id}>
                  <td>
                    <strong>{mode === 'brand' ? m.brand_name : m.generic_name || '—'}</strong>
                  </td>
                  <td>{(mode === 'brand' ? m.generic_name : m.brand_name) || <span className="muted">—</span>}</td>
                  <td className="nowrap">{m.strength}</td>
                  <td>{m.form}</td>
                  <td className="muted">{m.manufacturer}</td>
                  <td className="num">{m.usage_count}</td>
                  <td className="row-actions">
                    <button type="button" className="icon-btn" onClick={() => edit(m)} aria-label={`Edit ${m.brand_name}`}>
                      <Pencil size={16} />
                    </button>
                    <button type="button" className="icon-btn danger" onClick={() => confirmRemove(m)} aria-label={`Delete ${m.brand_name}`}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > MAX_ROWS && (
            <p className="table-note muted">
              Showing the first {MAX_ROWS} of {rows.length}. Type to narrow the list.
            </p>
          )}
        </div>
      )}

      {editing && (
        <MedicineFormModal
          initial={editing.initial}
          medicineId={editing.id}
          onClose={() => setEditing(null)}
          onSaved={(m) => {
            setEditing(null);
            toast(`${m.brand_name} saved`);
          }}
        />
      )}
    </div>
  );
}
