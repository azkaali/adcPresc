import type {
  DashboardData,
  Diagnosis,
  DiagnosisInput,
  DiagnosisSummary,
  MedicationLine,
  Medicine,
  MedicineInput,
  Prescription,
  PrescriptionInput,
  PrescriptionSummary,
  Settings,
} from '../shared/types.ts';

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${url}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error('Cannot reach the server. Make sure the app is running.');
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
  return data as T;
}

export const api = {
  dashboard: () => request<DashboardData>('GET', '/dashboard'),

  medicines: {
    list: () => request<Medicine[]>('GET', '/medicines'),
    create: (input: MedicineInput) => request<Medicine>('POST', '/medicines', input),
    update: (id: number, input: MedicineInput) => request<Medicine>('PUT', `/medicines/${id}`, input),
    remove: (id: number) => request<null>('DELETE', `/medicines/${id}`),
  },

  diagnoses: {
    list: () => request<DiagnosisSummary[]>('GET', '/diagnoses'),
    get: (id: number) => request<Diagnosis>('GET', `/diagnoses/${id}`),
    create: (input: DiagnosisInput) => request<Diagnosis>('POST', '/diagnoses', input),
    update: (id: number, input: DiagnosisInput) => request<Diagnosis>('PUT', `/diagnoses/${id}`, input),
    remove: (id: number) => request<null>('DELETE', `/diagnoses/${id}`),
  },

  prescriptions: {
    list: (q = '') => request<PrescriptionSummary[]>('GET', `/prescriptions?q=${encodeURIComponent(q)}`),
    get: (id: number) => request<Prescription>('GET', `/prescriptions/${id}`),
    create: (input: PrescriptionInput) => request<Prescription>('POST', '/prescriptions', input),
    update: (id: number, input: PrescriptionInput) => request<Prescription>('PUT', `/prescriptions/${id}`, input),
    remove: (id: number) => request<null>('DELETE', `/prescriptions/${id}`),
  },

  dictation: {
    medications: (transcript: string) =>
      request<{ medications: MedicationLine[] }>('POST', '/dictation/medications', { transcript }),
  },

  settings: {
    get: () => request<Settings>('GET', '/settings'),
    save: (settings: Settings) => request<Settings>('PUT', '/settings', settings),
  },
};
