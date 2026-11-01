// Types shared by the API server and the web client.

/** The dosing details of one medication line, in English and Urdu. */
export interface DosageDetails {
  potency: string;
  dosage_en: string;
  dosage_ur: string;
  duration_en: string;
  duration_ur: string;
}

export interface Medicine {
  id: number;
  brand_name: string;
  generic_name: string;
  /** Default potency, e.g. "200 mg". */
  strength: string;
  /** Tablet, Capsule, Injection, ... */
  form: string;
  manufacturer: string;
  usage_count: number;
  /** How this medicine was dosed the last time it was prescribed, used to prefill new lines. */
  last_use: DosageDetails | null;
}

export type MedicineInput = Pick<Medicine, 'brand_name' | 'generic_name' | 'strength' | 'form' | 'manufacturer'>;

/** One medicine on a diagnosis template or a prescription. */
export interface MedicationLine extends DosageDetails {
  medicine_id: number | null;
  brand_name: string;
  generic_name: string;
  form: string;
}

export interface Diagnosis {
  id: number;
  disease_name: string;
  condition: string;
  lab_conclusion: string;
  advice_en: string;
  advice_ur: string;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  medications: MedicationLine[];
}

export type DiagnosisInput = Pick<
  Diagnosis,
  'disease_name' | 'condition' | 'lab_conclusion' | 'advice_en' | 'advice_ur' | 'medications'
>;

export interface DiagnosisSummary {
  id: number;
  disease_name: string;
  condition: string;
  usage_count: number;
  last_used_at: string | null;
  medication_count: number;
}

export interface Prescription {
  id: number;
  patient_name: string;
  patient_age: string;
  patient_gender: string;
  patient_phone: string;
  patient_mr_no: string;
  /** YYYY-MM-DD */
  visit_date: string;
  diagnosis_id: number | null;
  disease_name: string;
  condition: string;
  lab_conclusion: string;
  advice_en: string;
  advice_ur: string;
  follow_up: string;
  created_at: string;
  updated_at: string;
  medications: MedicationLine[];
}

/**
 * What to do with the diagnosis template when saving a prescription:
 * - "update": write this prescription's diagnosis details back to the chosen template
 * - "create": save them as a new template
 */
export type TemplateAction = 'none' | 'update' | 'create';

export type PrescriptionInput = Omit<Prescription, 'id' | 'created_at' | 'updated_at'> & {
  template_action?: TemplateAction;
};

export interface PrescriptionSummary {
  id: number;
  patient_name: string;
  patient_age: string;
  patient_gender: string;
  patient_phone: string;
  patient_mr_no: string;
  visit_date: string;
  disease_name: string;
  medication_count: number;
}

export interface DashboardData {
  counts: {
    prescriptions_today: number;
    prescriptions_month: number;
    prescriptions_total: number;
    diagnoses: number;
    medicines: number;
  };
  frequent_diagnoses: DiagnosisSummary[];
  recent_prescriptions: PrescriptionSummary[];
}

export interface Settings {
  clinic_name: string;
  clinic_address: string;
  clinic_phone: string;
  doctor_name: string;
  doctor_qualifications: string;
  doctor_specialty: string;
  doctor_registration: string;
  print_footer: string;
}
