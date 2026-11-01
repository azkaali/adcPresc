import type { Prescription, Settings } from '../../shared/types.ts';
import { ageGender, formAbbreviation, formatDate, rxNumber } from '../lib/format';

/** The printable prescription: letterhead, patient, diagnosis and bilingual medicine instructions. */
export function PrescriptionDocument({ rx, settings }: { rx: Prescription; settings: Settings }) {
  const hasClinical = rx.disease_name || rx.condition || rx.lab_conclusion;
  return (
    <article className="rx-doc">
      <header className="rx-letterhead">
        <div>
          <div className="rx-doctor-name">{settings.doctor_name || 'Doctor name (set in Settings)'}</div>
          {settings.doctor_qualifications && <div>{settings.doctor_qualifications}</div>}
          {settings.doctor_specialty && <div className="rx-specialty">{settings.doctor_specialty}</div>}
          {settings.doctor_registration && <div className="rx-small">PMDC Reg. No. {settings.doctor_registration}</div>}
        </div>
        <div className="rx-clinic">
          <div className="rx-clinic-name">{settings.clinic_name}</div>
          {settings.clinic_address && <div className="rx-small">{settings.clinic_address}</div>}
          {settings.clinic_phone && <div className="rx-small">{settings.clinic_phone}</div>}
        </div>
      </header>

      <section className="rx-patient">
        <div>
          <span className="rx-label">Patient</span>
          <strong>{rx.patient_name}</strong>
        </div>
        <div>
          <span className="rx-label">Age / Sex</span>
          {ageGender(rx.patient_age, rx.patient_gender) || '—'}
        </div>
        {rx.patient_mr_no && (
          <div>
            <span className="rx-label">MR #</span>
            {rx.patient_mr_no}
          </div>
        )}
        {rx.patient_phone && (
          <div>
            <span className="rx-label">Phone</span>
            {rx.patient_phone}
          </div>
        )}
        <div>
          <span className="rx-label">Date</span>
          {formatDate(rx.visit_date)}
        </div>
        <div>
          <span className="rx-label">Rx #</span>
          {rxNumber(rx.id)}
        </div>
      </section>

      <div className={hasClinical ? 'rx-body' : 'rx-body rx-body-single'}>
        {hasClinical && (
          <aside className="rx-clinical">
            {rx.disease_name && (
              <div className="rx-block">
                <h3>Diagnosis</h3>
                <p className="rx-diagnosis">{rx.disease_name}</p>
              </div>
            )}
            {rx.condition && (
              <div className="rx-block">
                <h3>Clinical findings</h3>
                <p>{rx.condition}</p>
              </div>
            )}
            {rx.lab_conclusion && (
              <div className="rx-block">
                <h3>Lab conclusion</h3>
                <p>{rx.lab_conclusion}</p>
              </div>
            )}
          </aside>
        )}

        <div className="rx-main">
          <div className="rx-symbol" aria-hidden>
            ℞
          </div>
          {rx.medications.length === 0 ? (
            <p className="rx-small">No medicines prescribed.</p>
          ) : (
            <ol className="rx-meds">
              {rx.medications.map((m, i) => (
                <li key={i} className="rx-med">
                  <div className="rx-med-name">
                    <strong>
                      {formAbbreviation(m.form)} {m.brand_name}
                    </strong>{' '}
                    {m.potency}
                    {m.generic_name && m.generic_name !== m.brand_name && <span className="rx-generic"> ({m.generic_name})</span>}
                  </div>
                  {(m.dosage_en || m.duration_en) && (
                    <div className="rx-dose-en">
                      {m.dosage_en}
                      {m.duration_en && <span className="rx-duration"> — {m.duration_en}</span>}
                    </div>
                  )}
                  {(m.dosage_ur || m.duration_ur) && (
                    <div className="rx-dose-ur urdu" dir="rtl" lang="ur">
                      {m.dosage_ur}
                      {m.duration_ur && <span className="rx-duration"> — {m.duration_ur}</span>}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}

          {(rx.advice_en || rx.advice_ur) && (
            <div className="rx-advice">
              {rx.advice_en && (
                <div>
                  <h3>Advice</h3>
                  <p>{rx.advice_en}</p>
                </div>
              )}
              {rx.advice_ur && (
                <div className="urdu" dir="rtl" lang="ur">
                  <h3>ہدایات</h3>
                  <p>{rx.advice_ur}</p>
                </div>
              )}
            </div>
          )}

          {rx.follow_up && (
            <p className="rx-followup">
              <strong>Follow-up:</strong> {rx.follow_up}
            </p>
          )}
        </div>
      </div>

      <footer className="rx-footer">
        <div className="rx-footnote">{settings.print_footer}</div>
        <div className="rx-signature">Signature</div>
      </footer>
    </article>
  );
}
