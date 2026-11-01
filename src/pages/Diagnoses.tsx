import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { FilePlus2, Pencil, Plus, Search, Star, Stethoscope } from 'lucide-react';
import type { DiagnosisSummary } from '../../shared/types.ts';
import { api } from '../api';
import { VoiceButton } from '../components/VoiceButton';
import { formatDate } from '../lib/format';
import { EmptyState, ErrorState, Loading } from './states';

const FREQUENT_COUNT = 5;

export default function Diagnoses() {
  const [list, setList] = useState<DiagnosisSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    api.diagnoses
      .list()
      .then(setList)
      .catch((err: Error) => setError(err.message));
  }, []);

  // The API returns diagnoses most-used first, so frequent ones are always at the top.
  const frequentIds = useMemo(
    () => new Set((list ?? []).filter((d) => d.usage_count > 0).slice(0, FREQUENT_COUNT).map((d) => d.id)),
    [list],
  );
  const q = query.trim().toLowerCase();
  const shown = (list ?? []).filter((d) => !q || d.disease_name.toLowerCase().includes(q) || d.condition.toLowerCase().includes(q));

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Diagnoses</h1>
          <p className="muted">Saved diagnoses with their usual medicines. The ones you use most stay at the top.</p>
        </div>
        <div className="page-actions">
          <Link className="btn btn-primary" to="/diagnoses/new">
            <Plus size={16} /> New diagnosis
          </Link>
        </div>
      </header>

      <div className="search-box search-box-lg">
        <Search size={18} aria-hidden />
        <input
          className="search-box-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search diagnoses…"
          aria-label="Search diagnoses"
        />
        <VoiceButton label="Say the diagnosis" onText={setQuery} />
      </div>

      {error ? (
        <ErrorState message={error} />
      ) : list === null ? (
        <Loading />
      ) : shown.length === 0 ? (
        <EmptyState icon={<Stethoscope size={28} />} title={q ? 'No diagnosis matches your search' : 'No diagnoses yet'}>
          <Link className="btn btn-primary" to="/diagnoses/new">
            <Plus size={16} /> Add a diagnosis
          </Link>
        </EmptyState>
      ) : (
        <div className="diagnosis-grid">
          {shown.map((d) => (
            <div key={d.id} className="diagnosis-card">
              <div className="diagnosis-card-head">
                <h3>
                  <Link to={`/diagnoses/${d.id}`}>{d.disease_name}</Link>
                </h3>
                {frequentIds.has(d.id) && (
                  <span className="badge badge-star">
                    <Star size={12} /> Frequent
                  </span>
                )}
              </div>
              <p className="muted clamp-2">{d.condition || 'No condition notes'}</p>
              <div className="diagnosis-card-meta">
                {d.medication_count} medicine{d.medication_count === 1 ? '' : 's'} · used {d.usage_count}×
                {d.last_used_at && <> · last {formatDate(d.last_used_at)}</>}
              </div>
              <div className="diagnosis-card-actions">
                <Link className="btn btn-primary btn-sm" to={`/prescriptions/new?diagnosis=${d.id}`}>
                  <FilePlus2 size={14} /> Prescribe
                </Link>
                <Link className="btn btn-sm" to={`/diagnoses/${d.id}`}>
                  <Pencil size={14} /> Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
