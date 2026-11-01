import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Router, type Request } from 'express';
import type {
  DashboardData,
  Diagnosis,
  DiagnosisInput,
  DiagnosisSummary,
  DosageDetails,
  MedicationLine,
  Medicine,
  MedicineInput,
  Prescription,
  PrescriptionInput,
  PrescriptionSummary,
  Settings,
  TemplateAction,
} from '../shared/types.ts';
import { all, db, get, run, transaction } from './db.ts';

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const api = Router();

// ---------------------------------------------------------------------------
// Input helpers

function text(value: unknown, max = 5000): string {
  if (typeof value === 'number') return String(value);
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function idParam(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(404, 'Not found');
  return id;
}

function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

const today = () => get<{ d: string }>(`SELECT date('now', 'localtime') AS d`)!.d;

// ---------------------------------------------------------------------------
// Medicines

const MEDICINE_SELECT = `
  SELECT m.id, m.brand_name, m.generic_name, m.strength, m.form, m.manufacturer, m.usage_count,
         pm.potency, pm.dosage_en, pm.dosage_ur, pm.duration_en, pm.duration_ur
  FROM medicines m
  LEFT JOIN prescription_medications pm
    ON pm.id = (SELECT MAX(id) FROM prescription_medications WHERE medicine_id = m.id)`;

type MedicineRow = Omit<Medicine, 'last_use'> & { [K in keyof DosageDetails]: string | null };

function toMedicine(row: MedicineRow): Medicine {
  const { potency, dosage_en, dosage_ur, duration_en, duration_ur, ...medicine } = row;
  const lastUse =
    potency === null
      ? null
      : {
          potency,
          dosage_en: dosage_en ?? '',
          dosage_ur: dosage_ur ?? '',
          duration_en: duration_en ?? '',
          duration_ur: duration_ur ?? '',
        };
  return { ...medicine, last_use: lastUse };
}

function readMedicine(id: number): Medicine {
  const row = get<MedicineRow>(`${MEDICINE_SELECT} WHERE m.id = ?`, id);
  if (!row) throw new HttpError(404, 'Medicine not found');
  return toMedicine(row);
}

function medicineInput(body: any): MedicineInput {
  const input: MedicineInput = {
    brand_name: text(body?.brand_name, 200),
    generic_name: text(body?.generic_name, 200),
    strength: text(body?.strength, 100),
    form: text(body?.form, 100),
    manufacturer: text(body?.manufacturer, 200),
  };
  if (!input.brand_name && !input.generic_name) {
    throw new HttpError(400, 'Enter a brand name or a generic name');
  }
  // Products sold under their generic name are stored with the generic name as the brand.
  if (!input.brand_name) input.brand_name = input.generic_name;
  return input;
}

function saveMedicine(input: MedicineInput, id?: number): number {
  const values = [input.brand_name, input.generic_name, input.strength, input.form, input.manufacturer];
  try {
    if (id === undefined) {
      return run(
        `INSERT INTO medicines (brand_name, generic_name, strength, form, manufacturer) VALUES (?, ?, ?, ?, ?)`,
        ...values,
      ).lastInsertRowid;
    }
    const { changes } = run(
      `UPDATE medicines
       SET brand_name = ?, generic_name = ?, strength = ?, form = ?, manufacturer = ?,
           updated_at = datetime('now', 'localtime')
       WHERE id = ?`,
      ...values,
      id,
    );
    if (!changes) throw new HttpError(404, 'Medicine not found');
    return id;
  } catch (err) {
    if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
      const name = [input.brand_name, input.strength, input.form && `(${input.form})`].filter(Boolean).join(' ');
      throw new HttpError(409, `${name} is already in the medicine list`);
    }
    throw err;
  }
}

api.get('/medicines', (_req, res) => {
  const rows = all<MedicineRow>(`${MEDICINE_SELECT} ORDER BY m.brand_name COLLATE NOCASE, m.strength`);
  res.json(rows.map(toMedicine));
});

api.post('/medicines', (req, res) => {
  const id = saveMedicine(medicineInput(req.body));
  res.status(201).json(readMedicine(id));
});

api.put('/medicines/:id', (req, res) => {
  const id = saveMedicine(medicineInput(req.body), idParam(req));
  res.json(readMedicine(id));
});

api.delete('/medicines/:id', (req, res) => {
  // Diagnosis and prescription lines keep their copy of the name (medicine_id is set to NULL).
  if (!run('DELETE FROM medicines WHERE id = ?', idParam(req)).changes) {
    throw new HttpError(404, 'Medicine not found');
  }
  res.status(204).end();
});

// ---------------------------------------------------------------------------
// Medication lines (shared by diagnosis templates and prescriptions)

type LineTable = 'diagnosis_medications' | 'prescription_medications';

const OWNER_COLUMN = {
  diagnosis_medications: 'diagnosis_id',
  prescription_medications: 'prescription_id',
} as const;

function medicationLines(value: unknown): MedicationLine[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((line: any): MedicationLine => {
      const medicineId = Number(line?.medicine_id);
      const exists = Number.isInteger(medicineId) && medicineId > 0 && get('SELECT 1 FROM medicines WHERE id = ?', medicineId);
      return {
        medicine_id: exists ? medicineId : null,
        brand_name: text(line?.brand_name, 200),
        generic_name: text(line?.generic_name, 200),
        form: text(line?.form, 100),
        potency: text(line?.potency, 100),
        dosage_en: text(line?.dosage_en, 500),
        dosage_ur: text(line?.dosage_ur, 500),
        duration_en: text(line?.duration_en, 200),
        duration_ur: text(line?.duration_ur, 200),
      };
    })
    .filter((line) => line.brand_name || line.generic_name);
}

function writeLines(table: LineTable, ownerId: number, lines: MedicationLine[]) {
  const owner = OWNER_COLUMN[table];
  run(`DELETE FROM ${table} WHERE ${owner} = ?`, ownerId);
  lines.forEach((l, position) =>
    run(
      `INSERT INTO ${table} (${owner}, position, medicine_id, brand_name, generic_name, form,
                             potency, dosage_en, dosage_ur, duration_en, duration_ur)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ownerId, position, l.medicine_id, l.brand_name, l.generic_name, l.form,
      l.potency, l.dosage_en, l.dosage_ur, l.duration_en, l.duration_ur,
    ),
  );
}

function readLines(table: LineTable, ownerId: number): MedicationLine[] {
  // Templates pick up later corrections to a medicine's name; prescriptions keep exactly what was issued.
  const live = table === 'diagnosis_medications';
  const col = (name: string) => (live ? `COALESCE(m.${name}, t.${name}) AS ${name}` : `t.${name}`);
  return all<MedicationLine>(
    `SELECT t.medicine_id, ${col('brand_name')}, ${col('generic_name')}, ${col('form')},
            t.potency, t.dosage_en, t.dosage_ur, t.duration_en, t.duration_ur
     FROM ${table} t
     LEFT JOIN medicines m ON m.id = t.medicine_id
     WHERE t.${OWNER_COLUMN[table]} = ?
     ORDER BY t.position`,
    ownerId,
  );
}

// ---------------------------------------------------------------------------
// Diagnoses

const DIAGNOSIS_SUMMARY = `
  SELECT d.id, d.disease_name, d.condition, d.usage_count, d.last_used_at,
         (SELECT COUNT(*) FROM diagnosis_medications WHERE diagnosis_id = d.id) AS medication_count
  FROM diagnoses d
  ORDER BY d.usage_count DESC, d.last_used_at DESC, d.disease_name COLLATE NOCASE`;

function diagnosisInput(body: any): DiagnosisInput {
  const input: DiagnosisInput = {
    disease_name: text(body?.disease_name, 200),
    condition: text(body?.condition),
    lab_conclusion: text(body?.lab_conclusion),
    advice_en: text(body?.advice_en),
    advice_ur: text(body?.advice_ur),
    medications: medicationLines(body?.medications),
  };
  if (!input.disease_name) throw new HttpError(400, 'Disease name is required');
  return input;
}

/** Inserts or updates a diagnosis. Call inside a transaction. */
export function writeDiagnosis(input: DiagnosisInput, id?: number): number {
  const values = [input.disease_name, input.condition, input.lab_conclusion, input.advice_en, input.advice_ur];
  if (id === undefined) {
    id = run(
      `INSERT INTO diagnoses (disease_name, condition, lab_conclusion, advice_en, advice_ur) VALUES (?, ?, ?, ?, ?)`,
      ...values,
    ).lastInsertRowid;
  } else {
    const { changes } = run(
      `UPDATE diagnoses
       SET disease_name = ?, condition = ?, lab_conclusion = ?, advice_en = ?, advice_ur = ?,
           updated_at = datetime('now', 'localtime')
       WHERE id = ?`,
      ...values,
      id,
    );
    if (!changes) throw new HttpError(404, 'Diagnosis not found');
  }
  writeLines('diagnosis_medications', id, input.medications);
  return id;
}

function readDiagnosis(id: number): Diagnosis {
  const row = get<Omit<Diagnosis, 'medications'>>('SELECT * FROM diagnoses WHERE id = ?', id);
  if (!row) throw new HttpError(404, 'Diagnosis not found');
  return { ...row, medications: readLines('diagnosis_medications', id) };
}

api.get('/diagnoses', (_req, res) => {
  res.json(all<DiagnosisSummary>(DIAGNOSIS_SUMMARY));
});

api.get('/diagnoses/:id', (req, res) => {
  res.json(readDiagnosis(idParam(req)));
});

api.post('/diagnoses', (req, res) => {
  const input = diagnosisInput(req.body);
  const id = transaction(() => writeDiagnosis(input));
  res.status(201).json(readDiagnosis(id));
});

api.put('/diagnoses/:id', (req, res) => {
  const input = diagnosisInput(req.body);
  const id = transaction(() => writeDiagnosis(input, idParam(req)));
  res.json(readDiagnosis(id));
});

api.delete('/diagnoses/:id', (req, res) => {
  // Past prescriptions keep their own copy of the diagnosis details.
  if (!run('DELETE FROM diagnoses WHERE id = ?', idParam(req)).changes) {
    throw new HttpError(404, 'Diagnosis not found');
  }
  res.status(204).end();
});

// ---------------------------------------------------------------------------
// Prescriptions

const PRESCRIPTION_SUMMARY = `
  SELECT p.id, p.patient_name, p.patient_age, p.patient_gender, p.patient_phone, p.patient_mr_no,
         p.visit_date, p.disease_name,
         (SELECT COUNT(*) FROM prescription_medications WHERE prescription_id = p.id) AS medication_count
  FROM prescriptions p`;

type PrescriptionFields = Omit<PrescriptionInput, 'template_action'>;

function prescriptionInput(body: any): PrescriptionFields {
  const visitDate = text(body?.visit_date, 10);
  const diagnosisId = Number(body?.diagnosis_id);
  const input: PrescriptionFields = {
    patient_name: text(body?.patient_name, 200),
    patient_age: text(body?.patient_age, 20),
    patient_gender: text(body?.patient_gender, 20),
    patient_phone: text(body?.patient_phone, 50),
    patient_mr_no: text(body?.patient_mr_no, 50),
    visit_date: /^\d{4}-\d{2}-\d{2}$/.test(visitDate) ? visitDate : today(),
    diagnosis_id:
      Number.isInteger(diagnosisId) && diagnosisId > 0 && get('SELECT 1 FROM diagnoses WHERE id = ?', diagnosisId)
        ? diagnosisId
        : null,
    disease_name: text(body?.disease_name, 200),
    condition: text(body?.condition),
    lab_conclusion: text(body?.lab_conclusion),
    advice_en: text(body?.advice_en),
    advice_ur: text(body?.advice_ur),
    follow_up: text(body?.follow_up, 200),
    medications: medicationLines(body?.medications),
  };
  if (!input.patient_name) throw new HttpError(400, 'Patient name is required');
  return input;
}

function templateAction(body: any): TemplateAction {
  return body?.template_action === 'update' || body?.template_action === 'create' ? body.template_action : 'none';
}

/** Applies the requested template action and returns the diagnosis id the prescription should link to. */
function syncTemplate(input: PrescriptionFields, action: TemplateAction): number | null {
  const template: DiagnosisInput = {
    disease_name: input.disease_name,
    condition: input.condition,
    lab_conclusion: input.lab_conclusion,
    advice_en: input.advice_en,
    advice_ur: input.advice_ur,
    medications: input.medications,
  };
  if (!template.disease_name) return input.diagnosis_id;
  if (action === 'update' && input.diagnosis_id) return writeDiagnosis(template, input.diagnosis_id);
  if (action === 'create') return writeDiagnosis(template);
  return input.diagnosis_id;
}

function writePrescription(input: PrescriptionFields, id?: number): number {
  const values = [
    input.patient_name, input.patient_age, input.patient_gender, input.patient_phone, input.patient_mr_no,
    input.visit_date, input.diagnosis_id, input.disease_name, input.condition, input.lab_conclusion,
    input.advice_en, input.advice_ur, input.follow_up,
  ];
  if (id === undefined) {
    id = run(
      `INSERT INTO prescriptions (patient_name, patient_age, patient_gender, patient_phone, patient_mr_no,
                                  visit_date, diagnosis_id, disease_name, condition, lab_conclusion,
                                  advice_en, advice_ur, follow_up)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ...values,
    ).lastInsertRowid;
  } else {
    const { changes } = run(
      `UPDATE prescriptions
       SET patient_name = ?, patient_age = ?, patient_gender = ?, patient_phone = ?, patient_mr_no = ?,
           visit_date = ?, diagnosis_id = ?, disease_name = ?, condition = ?, lab_conclusion = ?,
           advice_en = ?, advice_ur = ?, follow_up = ?, updated_at = datetime('now', 'localtime')
       WHERE id = ?`,
      ...values,
      id,
    );
    if (!changes) throw new HttpError(404, 'Prescription not found');
  }
  writeLines('prescription_medications', id, input.medications);
  return id;
}

function readPrescription(id: number): Prescription {
  const row = get<Omit<Prescription, 'medications'>>('SELECT * FROM prescriptions WHERE id = ?', id);
  if (!row) throw new HttpError(404, 'Prescription not found');
  return { ...row, medications: readLines('prescription_medications', id) };
}

api.get('/prescriptions', (req, res) => {
  const q = text(req.query.q, 100);
  const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 1000);
  if (!q) {
    res.json(all<PrescriptionSummary>(`${PRESCRIPTION_SUMMARY} ORDER BY p.visit_date DESC, p.id DESC LIMIT ?`, limit));
    return;
  }
  const like = likePattern(q);
  const rxNumber = /^(?:rx-?)?0*(\d+)$/i.exec(q)?.[1];
  res.json(
    all<PrescriptionSummary>(
      `${PRESCRIPTION_SUMMARY}
       WHERE p.patient_name LIKE ?1 ESCAPE '\\' OR p.patient_phone LIKE ?1 ESCAPE '\\'
          OR p.patient_mr_no LIKE ?1 ESCAPE '\\' OR p.disease_name LIKE ?1 ESCAPE '\\' OR p.id = ?2
       ORDER BY p.visit_date DESC, p.id DESC LIMIT ?3`,
      like,
      rxNumber ? Number(rxNumber) : -1,
      limit,
    ),
  );
});

api.get('/prescriptions/:id', (req, res) => {
  res.json(readPrescription(idParam(req)));
});

api.post('/prescriptions', (req, res) => {
  const input = prescriptionInput(req.body);
  const action = templateAction(req.body);
  const id = transaction(() => {
    input.diagnosis_id = syncTemplate(input, action);
    const id = writePrescription(input);
    if (input.diagnosis_id) {
      run(
        `UPDATE diagnoses SET usage_count = usage_count + 1, last_used_at = datetime('now', 'localtime') WHERE id = ?`,
        input.diagnosis_id,
      );
    }
    for (const line of input.medications) {
      if (line.medicine_id) run('UPDATE medicines SET usage_count = usage_count + 1 WHERE id = ?', line.medicine_id);
    }
    return id;
  });
  res.status(201).json(readPrescription(id));
});

api.put('/prescriptions/:id', (req, res) => {
  const input = prescriptionInput(req.body);
  const action = templateAction(req.body);
  const id = transaction(() => {
    input.diagnosis_id = syncTemplate(input, action);
    return writePrescription(input, idParam(req));
  });
  res.json(readPrescription(id));
});

api.delete('/prescriptions/:id', (req, res) => {
  if (!run('DELETE FROM prescriptions WHERE id = ?', idParam(req)).changes) {
    throw new HttpError(404, 'Prescription not found');
  }
  res.status(204).end();
});

// ---------------------------------------------------------------------------
// Dashboard

api.get('/dashboard', (_req, res) => {
  const count = (sql: string) => get<{ n: number }>(sql)!.n;
  const data: DashboardData = {
    counts: {
      prescriptions_today: count(`SELECT COUNT(*) AS n FROM prescriptions WHERE visit_date = date('now', 'localtime')`),
      prescriptions_month: count(
        `SELECT COUNT(*) AS n FROM prescriptions WHERE substr(visit_date, 1, 7) = strftime('%Y-%m', 'now', 'localtime')`,
      ),
      prescriptions_total: count('SELECT COUNT(*) AS n FROM prescriptions'),
      diagnoses: count('SELECT COUNT(*) AS n FROM diagnoses'),
      medicines: count('SELECT COUNT(*) AS n FROM medicines'),
    },
    frequent_diagnoses: all<DiagnosisSummary>(`${DIAGNOSIS_SUMMARY} LIMIT 8`),
    recent_prescriptions: all<PrescriptionSummary>(`${PRESCRIPTION_SUMMARY} ORDER BY p.id DESC LIMIT 8`),
  };
  res.json(data);
});

// ---------------------------------------------------------------------------
// Settings (letterhead details printed on prescriptions)

export const DEFAULT_SETTINGS: Settings = {
  clinic_name: 'Rheumatology Clinic',
  clinic_address: '',
  clinic_phone: '',
  doctor_name: '',
  doctor_qualifications: '',
  doctor_specialty: 'Consultant Rheumatologist',
  doctor_registration: '',
  print_footer: '',
};

function readSettings(): Settings {
  const stored = new Map(all<{ key: string; value: string }>('SELECT key, value FROM settings').map((r) => [r.key, r.value]));
  const settings = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(settings) as (keyof Settings)[]) {
    settings[key] = stored.get(key) ?? settings[key];
  }
  return settings;
}

api.get('/settings', (_req, res) => {
  res.json(readSettings());
});

api.put('/settings', (req, res) => {
  transaction(() => {
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      if (req.body && key in req.body) {
        run(
          'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
          key,
          text(req.body[key], 500),
        );
      }
    }
  });
  res.json(readSettings());
});

// ---------------------------------------------------------------------------
// Backup: a consistent copy of the whole database as a download

api.get('/backup', (_req, res) => {
  const file = path.join(os.tmpdir(), `clinic-backup-${process.pid}-${Date.now()}.db`);
  db.exec(`VACUUM INTO '${file.replaceAll("'", "''")}'`);
  res.download(file, `clinic-backup-${today()}.db`, () => fs.rm(file, { force: true }, () => {}));
});
