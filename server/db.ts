import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync, type SQLInputValue, type StatementSync } from 'node:sqlite';

const DATA_DIR = process.env.DATA_DIR ?? path.join(import.meta.dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

export const DB_PATH = path.join(DATA_DIR, 'clinic.db');
export const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS medicines (
    id            INTEGER PRIMARY KEY,
    brand_name    TEXT NOT NULL,
    generic_name  TEXT NOT NULL DEFAULT '',
    strength      TEXT NOT NULL DEFAULT '',
    form          TEXT NOT NULL DEFAULT '',
    manufacturer  TEXT NOT NULL DEFAULT '',
    usage_count   INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
  CREATE UNIQUE INDEX IF NOT EXISTS medicines_unique
    ON medicines (brand_name COLLATE NOCASE, strength COLLATE NOCASE, form COLLATE NOCASE);

  CREATE TABLE IF NOT EXISTS diagnoses (
    id              INTEGER PRIMARY KEY,
    disease_name    TEXT NOT NULL,
    condition       TEXT NOT NULL DEFAULT '',
    lab_conclusion  TEXT NOT NULL DEFAULT '',
    advice_en       TEXT NOT NULL DEFAULT '',
    advice_ur       TEXT NOT NULL DEFAULT '',
    usage_count     INTEGER NOT NULL DEFAULT 0,
    last_used_at    TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS diagnosis_medications (
    id            INTEGER PRIMARY KEY,
    diagnosis_id  INTEGER NOT NULL REFERENCES diagnoses(id) ON DELETE CASCADE,
    position      INTEGER NOT NULL,
    medicine_id   INTEGER REFERENCES medicines(id) ON DELETE SET NULL,
    brand_name    TEXT NOT NULL DEFAULT '',
    generic_name  TEXT NOT NULL DEFAULT '',
    form          TEXT NOT NULL DEFAULT '',
    potency       TEXT NOT NULL DEFAULT '',
    dosage_en     TEXT NOT NULL DEFAULT '',
    dosage_ur     TEXT NOT NULL DEFAULT '',
    duration_en   TEXT NOT NULL DEFAULT '',
    duration_ur   TEXT NOT NULL DEFAULT ''
  );
  CREATE INDEX IF NOT EXISTS diagnosis_medications_owner ON diagnosis_medications (diagnosis_id);

  CREATE TABLE IF NOT EXISTS prescriptions (
    id              INTEGER PRIMARY KEY,
    patient_name    TEXT NOT NULL,
    patient_age     TEXT NOT NULL DEFAULT '',
    patient_gender  TEXT NOT NULL DEFAULT '',
    patient_phone   TEXT NOT NULL DEFAULT '',
    patient_mr_no   TEXT NOT NULL DEFAULT '',
    visit_date      TEXT NOT NULL,
    diagnosis_id    INTEGER REFERENCES diagnoses(id) ON DELETE SET NULL,
    disease_name    TEXT NOT NULL DEFAULT '',
    condition       TEXT NOT NULL DEFAULT '',
    lab_conclusion  TEXT NOT NULL DEFAULT '',
    advice_en       TEXT NOT NULL DEFAULT '',
    advice_ur       TEXT NOT NULL DEFAULT '',
    follow_up       TEXT NOT NULL DEFAULT '',
    created_at      TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
  CREATE INDEX IF NOT EXISTS prescriptions_visit_date ON prescriptions (visit_date);

  CREATE TABLE IF NOT EXISTS prescription_medications (
    id               INTEGER PRIMARY KEY,
    prescription_id  INTEGER NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    position         INTEGER NOT NULL,
    medicine_id      INTEGER REFERENCES medicines(id) ON DELETE SET NULL,
    brand_name       TEXT NOT NULL DEFAULT '',
    generic_name     TEXT NOT NULL DEFAULT '',
    form             TEXT NOT NULL DEFAULT '',
    potency          TEXT NOT NULL DEFAULT '',
    dosage_en        TEXT NOT NULL DEFAULT '',
    dosage_ur        TEXT NOT NULL DEFAULT '',
    duration_en      TEXT NOT NULL DEFAULT '',
    duration_ur      TEXT NOT NULL DEFAULT ''
  );
  CREATE INDEX IF NOT EXISTS prescription_medications_owner ON prescription_medications (prescription_id);
  CREATE INDEX IF NOT EXISTS prescription_medications_medicine ON prescription_medications (medicine_id);

  CREATE TABLE IF NOT EXISTS settings (
    key    TEXT PRIMARY KEY,
    value  TEXT NOT NULL
  );
`);

const statements = new Map<string, StatementSync>();

function prepare(sql: string): StatementSync {
  let stmt = statements.get(sql);
  if (!stmt) {
    stmt = db.prepare(sql);
    statements.set(sql, stmt);
  }
  return stmt;
}

export function all<T>(sql: string, ...params: SQLInputValue[]): T[] {
  return prepare(sql).all(...params) as unknown as T[];
}

export function get<T>(sql: string, ...params: SQLInputValue[]): T | undefined {
  return prepare(sql).get(...params) as unknown as T | undefined;
}

export function run(sql: string, ...params: SQLInputValue[]) {
  const result = prepare(sql).run(...params);
  return { changes: Number(result.changes), lastInsertRowid: Number(result.lastInsertRowid) };
}

export function transaction<T>(fn: () => T): T {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
