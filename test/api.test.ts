import assert from 'node:assert/strict';
import { once } from 'node:events';
import fs from 'node:fs';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';

// The database location is read when the server modules load, so set it before importing them.
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adcpresc-test-'));
process.env.DATA_DIR = dataDir;
const { createApp } = await import('../server/app.ts');
const { db } = await import('../server/db.ts');

let server: Server;
let base = '';

before(async () => {
  server = createApp().listen(0);
  await once(server, 'listening');
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});

after(() => {
  server.close();
  db.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

async function call(method: string, url: string, body?: unknown): Promise<{ status: number; body: any }> {
  const res = await fetch(base + url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: res.status === 204 ? null : await res.json() };
}

const URDU_DOSE = 'ایک گولی دن میں ایک بار';

test('a fresh database starts with medicines and sample diagnoses', async () => {
  const medicines = await call('GET', '/medicines');
  const diagnoses = await call('GET', '/diagnoses');
  assert.ok(medicines.body.length > 30);
  assert.ok(diagnoses.body.some((d: { disease_name: string }) => d.disease_name === 'Rheumatoid Arthritis'));
});

test('a medicine that already exists cannot be added twice', async () => {
  const res = await call('POST', '/medicines', { brand_name: 'plaquenil', strength: '200 MG', form: 'tablet' });
  assert.equal(res.status, 409);
  assert.match(res.body.error, /already in the medicine list/);
});

test('a medicine can be added with only a generic name', async () => {
  const res = await call('POST', '/medicines', { generic_name: 'Apremilast', strength: '30 mg', form: 'Tablet' });
  assert.equal(res.status, 201);
  assert.equal(res.body.brand_name, 'Apremilast');
});

test('saving a prescription counts usage, remembers the dose and can save a new diagnosis', async () => {
  const medicine = (await call('POST', '/medicines', { brand_name: 'Testrex', generic_name: 'Testine', strength: '10 mg', form: 'Tablet' })).body;
  const line = {
    medicine_id: medicine.id,
    brand_name: 'Testrex',
    generic_name: 'Testine',
    form: 'Tablet',
    potency: '10 mg',
    dosage_en: '1 tablet once daily',
    dosage_ur: URDU_DOSE,
    duration_en: '1 month',
    duration_ur: 'ایک مہینہ',
  };
  const rx = await call('POST', '/prescriptions', {
    patient_name: 'Patient A',
    patient_age: '52',
    disease_name: 'Test Disease',
    condition: 'Joint pain',
    template_action: 'create',
    medications: [line],
  });
  assert.equal(rx.status, 201);
  assert.ok(rx.body.diagnosis_id, 'prescription is linked to the new diagnosis');
  assert.deepEqual(rx.body.medications, [line]);

  const diagnosis = (await call('GET', `/diagnoses/${rx.body.diagnosis_id}`)).body;
  assert.equal(diagnosis.usage_count, 1);
  assert.equal(diagnosis.medications[0].dosage_ur, URDU_DOSE);

  const diagnoses = (await call('GET', '/diagnoses')).body;
  assert.equal(diagnoses[0].id, rx.body.diagnosis_id, 'the used diagnosis is listed first');

  const saved = (await call('GET', '/medicines')).body.find((m: { id: number }) => m.id === medicine.id);
  assert.equal(saved.usage_count, 1);
  assert.equal(saved.last_use.dosage_ur, URDU_DOSE);

  const byRxNumber = (await call('GET', `/prescriptions?q=RX-${String(rx.body.id).padStart(5, '0')}`)).body;
  assert.deepEqual(byRxNumber.map((r: { id: number }) => r.id), [rx.body.id]);
  const byName = (await call('GET', '/prescriptions?q=patient%20a')).body;
  assert.equal(byName.length, 1);

  const dashboard = (await call('GET', '/dashboard')).body;
  assert.equal(dashboard.counts.prescriptions_today, 1);
  assert.equal(dashboard.frequent_diagnoses[0].id, rx.body.diagnosis_id);
});

test('editing a prescription can update its diagnosis without counting another use', async () => {
  const created = (await call('POST', '/prescriptions', { patient_name: 'Patient B', diagnosis_id: 1, disease_name: 'Rheumatoid Arthritis' })).body;
  const before = (await call('GET', '/diagnoses/1')).body;
  const updated = await call('PUT', `/prescriptions/${created.id}`, {
    ...created,
    lab_conclusion: 'Anti-CCP strongly positive',
    template_action: 'update',
  });
  assert.equal(updated.status, 200);
  const after = (await call('GET', '/diagnoses/1')).body;
  assert.equal(after.lab_conclusion, 'Anti-CCP strongly positive');
  assert.equal(after.usage_count, before.usage_count);
});

test('deleting a medicine keeps its name on saved prescriptions', async () => {
  const medicine = (await call('POST', '/medicines', { brand_name: 'Gonex', strength: '5 mg', form: 'Tablet' })).body;
  const rx = (await call('POST', '/prescriptions', {
    patient_name: 'Patient C',
    medications: [{ medicine_id: medicine.id, brand_name: 'Gonex', potency: '5 mg' }],
  })).body;
  assert.equal((await call('DELETE', `/medicines/${medicine.id}`)).status, 204);
  const reloaded = (await call('GET', `/prescriptions/${rx.id}`)).body;
  assert.equal(reloaded.medications[0].brand_name, 'Gonex');
  assert.equal(reloaded.medications[0].medicine_id, null);
});

test('invalid requests get clear errors', async () => {
  assert.equal((await call('POST', '/prescriptions', { patient_name: '  ' })).status, 400);
  assert.equal((await call('POST', '/diagnoses', {})).status, 400);
  assert.equal((await call('GET', '/prescriptions/999999')).status, 404);
  assert.equal((await call('GET', '/diagnoses/abc')).status, 404);
  assert.equal((await call('GET', '/nothing-here')).status, 404);
});

test('dictation explains when the AI key is missing', async () => {
  const key = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    assert.equal((await call('POST', '/dictation/medications', { transcript: '  ' })).status, 400);
    const res = await call('POST', '/dictation/medications', { transcript: 'آرکوکسیا 90 ایک گولی رات کو' });
    assert.equal(res.status, 503);
    assert.match(res.body.error, /GEMINI_API_KEY/);
  } finally {
    if (key !== undefined) process.env.GEMINI_API_KEY = key;
  }
});

test('dictated lines only trust medicine ids that are on the list', async () => {
  const { toLines } = await import('../server/dictation.ts');
  const medicines = [{ id: 7, brand_name: 'Arcoxia', generic_name: 'Etoricoxib', strength: '90 mg', form: 'Tablet' }];
  const entry = { potency: '', dosage_ur: 'ایک گولی رات کو', dosage_en: '1 tablet at night', duration_ur: '', duration_en: '' };
  const lines = toLines(
    {
      medications: [
        { ...entry, medicine_id: 7, name: 'Arcoxia' },
        { ...entry, medicine_id: 999, name: 'Madeupine' },
        { ...entry, medicine_id: 0, name: '' },
      ],
    },
    medicines,
  );
  assert.deepEqual(lines, [
    {
      medicine_id: 7,
      brand_name: 'Arcoxia',
      generic_name: 'Etoricoxib',
      form: 'Tablet',
      potency: '90 mg',
      dosage_en: '1 tablet at night',
      dosage_ur: 'ایک گولی رات کو',
      duration_en: '',
      duration_ur: '',
    },
    {
      medicine_id: null,
      brand_name: 'Madeupine',
      generic_name: '',
      form: '',
      potency: '',
      dosage_en: '1 tablet at night',
      dosage_ur: 'ایک گولی رات کو',
      duration_en: '',
      duration_ur: '',
    },
  ]);
  assert.deepEqual(toLines({ nonsense: true }, medicines), []);
});

test('settings save only known keys', async () => {
  const res = await call('PUT', '/settings', { doctor_name: 'Dr. Test', unknown_key: 'x' });
  assert.equal(res.body.doctor_name, 'Dr. Test');
  assert.equal('unknown_key' in res.body, false);
});
