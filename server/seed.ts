// Starter data written once, on a fresh database. The sample diagnoses are examples to
// edit or delete; they are not re-created afterwards.
import type { DiagnosisInput, MedicationLine } from '../shared/types.ts';
import { writeDiagnosis } from './api.ts';
import { get, run, transaction } from './db.ts';

// [brand, generic, strength, form]
const MEDICINES: [string, string, string, string][] = [
  ['Methotrexate', 'Methotrexate', '2.5 mg', 'Tablet'],
  ['Metoject', 'Methotrexate', '15 mg', 'Injection'],
  ['Plaquenil', 'Hydroxychloroquine', '200 mg', 'Tablet'],
  ['Salazopyrin EN', 'Sulfasalazine', '500 mg', 'Tablet'],
  ['Arava', 'Leflunomide', '10 mg', 'Tablet'],
  ['Arava', 'Leflunomide', '20 mg', 'Tablet'],
  ['Imuran', 'Azathioprine', '50 mg', 'Tablet'],
  ['CellCept', 'Mycophenolate mofetil', '500 mg', 'Tablet'],
  ['Xeljanz', 'Tofacitinib', '5 mg', 'Tablet'],
  ['Endoxan', 'Cyclophosphamide', '500 mg', 'Injection'],
  ['Deltacortril', 'Prednisolone', '5 mg', 'Tablet'],
  ['Medrol', 'Methylprednisolone', '4 mg', 'Tablet'],
  ['Solu-Medrol', 'Methylprednisolone', '500 mg', 'Injection'],
  ['Depo-Medrol', 'Methylprednisolone acetate', '40 mg/ml', 'Injection'],
  ['Kenacort-A', 'Triamcinolone acetonide', '40 mg/ml', 'Injection'],
  ['Folic Acid', 'Folic acid', '5 mg', 'Tablet'],
  ['Colchicine', 'Colchicine', '0.5 mg', 'Tablet'],
  ['Zyloric', 'Allopurinol', '100 mg', 'Tablet'],
  ['Zyloric', 'Allopurinol', '300 mg', 'Tablet'],
  ['Adenuric', 'Febuxostat', '40 mg', 'Tablet'],
  ['Adenuric', 'Febuxostat', '80 mg', 'Tablet'],
  ['Naprosyn', 'Naproxen', '500 mg', 'Tablet'],
  ['Brufen', 'Ibuprofen', '400 mg', 'Tablet'],
  ['Ponstan Forte', 'Mefenamic acid', '500 mg', 'Tablet'],
  ['Voltaren', 'Diclofenac sodium', '50 mg', 'Tablet'],
  ['Voltaren Emulgel', 'Diclofenac diethylamine', '1%', 'Gel'],
  ['Celebrex', 'Celecoxib', '200 mg', 'Capsule'],
  ['Arcoxia', 'Etoricoxib', '60 mg', 'Tablet'],
  ['Arcoxia', 'Etoricoxib', '90 mg', 'Tablet'],
  ['Panadol', 'Paracetamol', '500 mg', 'Tablet'],
  ['Tramal', 'Tramadol', '50 mg', 'Capsule'],
  ['Lyrica', 'Pregabalin', '75 mg', 'Capsule'],
  ['Neurontin', 'Gabapentin', '300 mg', 'Capsule'],
  ['Cymbalta', 'Duloxetine', '30 mg', 'Capsule'],
  ['Tryptanol', 'Amitriptyline', '10 mg', 'Tablet'],
  ['Risek', 'Omeprazole', '20 mg', 'Capsule'],
  ['Nexium', 'Esomeprazole', '40 mg', 'Tablet'],
  ['Fosamax', 'Alendronate', '70 mg', 'Tablet'],
  ['Caltrate 600+D', 'Calcium carbonate + Vitamin D3', '600 mg', 'Tablet'],
  ['Vitamin D3', 'Cholecalciferol', '50,000 IU', 'Capsule'],
  ['Vitamin D3', 'Cholecalciferol', '200,000 IU', 'Injection'],
  ['Neurobion', 'Vitamin B1 + B6 + B12', '', 'Tablet'],
  ['Humira', 'Adalimumab', '40 mg', 'Injection'],
  ['Enbrel', 'Etanercept', '50 mg', 'Injection'],
  ['Actemra', 'Tocilizumab', '162 mg', 'Injection'],
  ['MabThera', 'Rituximab', '500 mg', 'Injection'],
];

type SampleLine = [brand: string, strength: string, dosageEn: string, dosageUr: string, durationEn: string, durationUr: string];

const SAMPLE_DIAGNOSES: (Omit<DiagnosisInput, 'medications'> & { medications: SampleLine[] })[] = [
  {
    disease_name: 'Rheumatoid Arthritis',
    condition: 'Symmetrical inflammatory polyarthritis of the small joints of hands and feet; morning stiffness more than 1 hour.',
    lab_conclusion: 'RA factor positive, anti-CCP positive; ESR and CRP raised.',
    advice_en:
      'Get CBC, LFTs and serum creatinine done every 3 months. Avoid alcohol. Report fever, sore throat or mouth ulcers immediately.',
    advice_ur:
      'ہر تین مہینے بعد خون کے ٹیسٹ (CBC، LFT، کریٹینین) کروائیں۔ الکحل سے پرہیز کریں۔ بخار، گلے کی خرابی یا منہ کے چھالوں کی صورت میں فوراً رابطہ کریں۔',
    medications: [
      ['Methotrexate', '2.5 mg', '4 tablets once weekly after meals', 'چار گولیاں ہفتے میں ایک بار کھانے کے بعد', '3 months', 'تین مہینے'],
      ['Folic Acid', '5 mg', '1 tablet once weekly, the day after methotrexate', 'ایک گولی ہفتے میں ایک بار، میتھوٹریکسیٹ کے اگلے دن', '3 months', 'تین مہینے'],
      ['Plaquenil', '200 mg', '1 tablet once daily after meals', 'ایک گولی دن میں ایک بار کھانے کے بعد', '3 months', 'تین مہینے'],
      ['Deltacortril', '5 mg', '1 tablet once daily after breakfast', 'ایک گولی دن میں ایک بار ناشتے کے بعد', '1 month', 'ایک مہینہ'],
    ],
  },
  {
    disease_name: 'Gout (acute flare)',
    condition: 'Acute monoarthritis of the first MTP joint with redness, swelling and severe pain.',
    lab_conclusion: 'Serum uric acid raised; ESR and CRP raised.',
    advice_en: 'Drink plenty of water. Avoid red meat, organ meat and sugary drinks. Rest and elevate the affected joint.',
    advice_ur: 'پانی زیادہ پئیں۔ بڑا گوشت، کلیجی اور میٹھے مشروبات سے پرہیز کریں۔ متاثرہ جوڑ کو آرام دیں اور اونچا رکھیں۔',
    medications: [
      ['Colchicine', '0.5 mg', '1 tablet twice daily after meals', 'ایک گولی دن میں دو بار کھانے کے بعد', '2 weeks', 'دو ہفتے'],
      ['Naprosyn', '500 mg', '1 tablet twice daily after meals', 'ایک گولی دن میں دو بار کھانے کے بعد', '5 days', 'پانچ دن'],
      ['Risek', '20 mg', '1 capsule once daily before breakfast', 'ایک کیپسول دن میں ایک بار ناشتے سے پہلے', '2 weeks', 'دو ہفتے'],
    ],
  },
  {
    disease_name: 'Osteoarthritis (knee)',
    condition: 'Bilateral knee pain, worse on walking and climbing stairs; crepitus present.',
    lab_conclusion: 'X-ray knees: joint space narrowing with osteophytes. ESR and CRP normal.',
    advice_en: 'Do quadriceps strengthening exercises daily. Reduce weight. Avoid squatting and sitting cross-legged.',
    advice_ur: 'روزانہ ٹانگوں کی ورزش کریں۔ وزن کم کریں۔ اکڑوں بیٹھنے اور چوکڑی مار کر بیٹھنے سے پرہیز کریں۔',
    medications: [
      ['Panadol', '500 mg', '2 tablets three times daily when required', 'دو گولیاں دن میں تین بار ضرورت کے وقت', '1 month', 'ایک مہینہ'],
      ['Voltaren Emulgel', '1%', 'Apply locally three times daily', 'متاثرہ جگہ پر دن میں تین بار لگائیں', '1 month', 'ایک مہینہ'],
      ['Caltrate 600+D', '600 mg', '1 tablet once daily after meals', 'ایک گولی دن میں ایک بار کھانے کے بعد', '3 months', 'تین مہینے'],
    ],
  },
  {
    disease_name: 'Ankylosing Spondylitis',
    condition: 'Inflammatory low back pain with morning stiffness, improving with exercise.',
    lab_conclusion: 'HLA-B27 positive; sacroiliitis on imaging; CRP raised.',
    advice_en: 'Do stretching and posture exercises daily. Sleep on a firm mattress with a thin pillow.',
    advice_ur: 'روزانہ ورزش اور کمر سیدھی رکھنے کی مشقیں کریں۔ سخت گدے پر پتلا تکیہ رکھ کر سوئیں۔',
    medications: [
      ['Arcoxia', '90 mg', '1 tablet once daily after meals', 'ایک گولی دن میں ایک بار کھانے کے بعد', '1 month', 'ایک مہینہ'],
      ['Risek', '20 mg', '1 capsule once daily before breakfast', 'ایک کیپسول دن میں ایک بار ناشتے سے پہلے', '1 month', 'ایک مہینہ'],
    ],
  },
  {
    disease_name: 'Systemic Lupus Erythematosus (SLE)',
    condition: 'Arthralgia, photosensitive malar rash, oral ulcers and fatigue.',
    lab_conclusion: 'ANA positive, anti-dsDNA positive; C3 and C4 low.',
    advice_en: 'Avoid direct sunlight and use sunscreen. Yearly eye examination while on hydroxychloroquine.',
    advice_ur: 'دھوپ سے بچیں اور سن بلاک استعمال کریں۔ ہائیڈروکسی کلوروکوئن کے دوران سال میں ایک بار آنکھوں کا معائنہ کروائیں۔',
    medications: [
      ['Plaquenil', '200 mg', '1 tablet once daily after meals', 'ایک گولی دن میں ایک بار کھانے کے بعد', '3 months', 'تین مہینے'],
      ['Deltacortril', '5 mg', '2 tablets once daily after breakfast', 'دو گولیاں دن میں ایک بار ناشتے کے بعد', '1 month', 'ایک مہینہ'],
      ['Caltrate 600+D', '600 mg', '1 tablet once daily after meals', 'ایک گولی دن میں ایک بار کھانے کے بعد', '3 months', 'تین مہینے'],
    ],
  },
  {
    disease_name: 'Fibromyalgia',
    condition: 'Widespread body pain for more than 3 months with fatigue and poor sleep.',
    lab_conclusion: 'CBC, ESR, CRP, TSH, CK and vitamin D within normal limits.',
    advice_en: 'Walk for 30 minutes daily. Keep a regular sleep routine.',
    advice_ur: 'روزانہ 30 منٹ سیر کریں۔ سونے جاگنے کا وقت مقرر رکھیں۔',
    medications: [
      ['Lyrica', '75 mg', '1 capsule at bedtime', 'ایک کیپسول رات سونے سے پہلے', '1 month', 'ایک مہینہ'],
      ['Cymbalta', '30 mg', '1 capsule once daily after breakfast', 'ایک کیپسول دن میں ایک بار ناشتے کے بعد', '1 month', 'ایک مہینہ'],
    ],
  },
];

export function seed() {
  if (get('SELECT 1 FROM settings WHERE key = ?', 'seeded_at')) return;

  transaction(() => {
    for (const [brand, generic, strength, form] of MEDICINES) {
      run(
        'INSERT OR IGNORE INTO medicines (brand_name, generic_name, strength, form) VALUES (?, ?, ?, ?)',
        brand, generic, strength, form,
      );
    }

    for (const sample of SAMPLE_DIAGNOSES) {
      const medications = sample.medications.map(([brand, strength, dosageEn, dosageUr, durationEn, durationUr]): MedicationLine => {
        const medicine = get<{ id: number; generic_name: string; form: string }>(
          'SELECT id, generic_name, form FROM medicines WHERE brand_name = ? AND strength = ?',
          brand,
          strength,
        );
        return {
          medicine_id: medicine?.id ?? null,
          brand_name: brand,
          generic_name: medicine?.generic_name ?? '',
          form: medicine?.form ?? '',
          potency: strength,
          dosage_en: dosageEn,
          dosage_ur: dosageUr,
          duration_en: durationEn,
          duration_ur: durationUr,
        };
      });
      writeDiagnosis({ ...sample, medications });
    }

    run(`INSERT INTO settings (key, value) VALUES ('seeded_at', datetime('now', 'localtime'))`);
  });
}
