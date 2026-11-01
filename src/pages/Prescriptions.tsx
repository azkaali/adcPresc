import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { FilePlus2, FileText, Search } from 'lucide-react';
import type { PrescriptionSummary } from '../../shared/types.ts';
import { api } from '../api';
import { VoiceButton } from '../components/VoiceButton';
import { ageGender, formatDate, rxNumber } from '../lib/format';
import { useDebouncedEffect } from '../lib/hooks';
import { EmptyState, ErrorState, Loading } from './states';

export default function Prescriptions() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<PrescriptionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useDebouncedEffect(query, 200, (q) => {
    const current = ++requestId.current;
    api.prescriptions
      .list(q.trim())
      .then((result) => current === requestId.current && setRows(result))
      .catch((err: Error) => setError(err.message));
  });

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Prescriptions</h1>
          <p className="muted">Every saved prescription, newest first.</p>
        </div>
        <div className="page-actions">
          <Link className="btn btn-primary" to="/prescriptions/new">
            <FilePlus2 size={16} /> New prescription
          </Link>
        </div>
      </header>

      <div className="search-box search-box-lg">
        <Search size={18} aria-hidden />
        <input
          className="search-box-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by patient name, phone, MR no., diagnosis or Rx number…"
          aria-label="Search prescriptions"
          autoFocus
        />
        <VoiceButton label="Say the patient name" onText={setQuery} />
      </div>

      {error ? (
        <ErrorState message={error} />
      ) : rows === null ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState icon={<FileText size={28} />} title={query ? 'No prescriptions match your search' : 'No prescriptions yet'}>
          {!query && (
            <Link className="btn btn-primary" to="/prescriptions/new">
              Write the first prescription
            </Link>
          )}
        </EmptyState>
      ) : (
        <div className="card card-flush">
          <table className="table table-clickable">
            <thead>
              <tr>
                <th>Date</th>
                <th>Rx #</th>
                <th>Patient</th>
                <th>Age / Sex</th>
                <th>Phone</th>
                <th>Diagnosis</th>
                <th className="num">Medicines</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} onClick={() => navigate(`/prescriptions/${r.id}`)}>
                  <td className="nowrap">{formatDate(r.visit_date)}</td>
                  <td className="nowrap muted">{rxNumber(r.id)}</td>
                  <td>
                    <Link to={`/prescriptions/${r.id}`} onClick={(e) => e.stopPropagation()}>
                      <strong>{r.patient_name}</strong>
                    </Link>
                    {r.patient_mr_no && <div className="muted small">MR {r.patient_mr_no}</div>}
                  </td>
                  <td className="nowrap">{ageGender(r.patient_age, r.patient_gender) || '—'}</td>
                  <td className="nowrap">{r.patient_phone || '—'}</td>
                  <td>{r.disease_name || <span className="muted">—</span>}</td>
                  <td className="num">{r.medication_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
