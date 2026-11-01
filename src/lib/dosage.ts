// Bilingual phrases for building dosage instructions quickly. Picking a quantity, frequency and
// timing writes matching English and Urdu text; both stay editable afterwards.

export interface Phrase {
  en: string;
  ur: string;
}

export const QUANTITIES: Phrase[] = [
  { en: '½ tablet', ur: 'آدھی گولی' },
  { en: '1 tablet', ur: 'ایک گولی' },
  { en: '1½ tablets', ur: 'ڈیڑھ گولی' },
  { en: '2 tablets', ur: 'دو گولیاں' },
  { en: '3 tablets', ur: 'تین گولیاں' },
  { en: '4 tablets', ur: 'چار گولیاں' },
  { en: '1 capsule', ur: 'ایک کیپسول' },
  { en: '2 capsules', ur: 'دو کیپسول' },
  { en: '1 teaspoon (5 ml)', ur: 'ایک چمچ (5 ملی لیٹر)' },
  { en: '2 teaspoons (10 ml)', ur: 'دو چمچ (10 ملی لیٹر)' },
  { en: '1 injection', ur: 'ایک ٹیکہ' },
  { en: '1 sachet', ur: 'ایک ساشے' },
  { en: 'Apply locally', ur: 'متاثرہ جگہ پر لگائیں' },
];

export const FREQUENCIES: Phrase[] = [
  { en: 'once daily', ur: 'دن میں ایک بار' },
  { en: 'twice daily', ur: 'دن میں دو بار' },
  { en: 'three times daily', ur: 'دن میں تین بار' },
  { en: 'four times daily', ur: 'دن میں چار بار' },
  { en: 'in the morning', ur: 'صبح' },
  { en: 'at bedtime', ur: 'رات سونے سے پہلے' },
  { en: 'on alternate days', ur: 'ایک دن چھوڑ کر' },
  { en: 'once weekly', ur: 'ہفتے میں ایک بار' },
  { en: 'twice weekly', ur: 'ہفتے میں دو بار' },
  { en: 'every 2 weeks', ur: 'ہر دو ہفتے بعد' },
  { en: 'once monthly', ur: 'مہینے میں ایک بار' },
  { en: 'when required', ur: 'ضرورت کے وقت' },
];

export const TIMINGS: Phrase[] = [
  { en: 'after meals', ur: 'کھانے کے بعد' },
  { en: 'before meals', ur: 'کھانے سے پہلے' },
  { en: 'with meals', ur: 'کھانے کے ساتھ' },
  { en: 'after breakfast', ur: 'ناشتے کے بعد' },
  { en: 'before breakfast', ur: 'ناشتے سے پہلے' },
  { en: 'on an empty stomach', ur: 'خالی پیٹ' },
  { en: 'with milk', ur: 'دودھ کے ساتھ' },
  { en: 'for pain', ur: 'درد کی صورت میں' },
];

export const DURATIONS: Phrase[] = [
  { en: '3 days', ur: 'تین دن' },
  { en: '5 days', ur: 'پانچ دن' },
  { en: '1 week', ur: 'ایک ہفتہ' },
  { en: '2 weeks', ur: 'دو ہفتے' },
  { en: '1 month', ur: 'ایک مہینہ' },
  { en: '2 months', ur: 'دو مہینے' },
  { en: '3 months', ur: 'تین مہینے' },
  { en: '6 months', ur: 'چھ مہینے' },
  { en: 'Continue', ur: 'جاری رکھیں' },
  { en: 'Until next visit', ur: 'اگلے معائنے تک' },
];

export const ADVICE: Phrase[] = [
  {
    en: 'Get CBC, LFTs and serum creatinine done every 3 months.',
    ur: 'ہر تین مہینے بعد خون کے ٹیسٹ (CBC، LFT، کریٹینین) کروائیں۔',
  },
  {
    en: 'Report fever, sore throat or mouth ulcers immediately.',
    ur: 'بخار، گلے کی خرابی یا منہ کے چھالوں کی صورت میں فوراً رابطہ کریں۔',
  },
  { en: 'Avoid alcohol.', ur: 'الکحل سے پرہیز کریں۔' },
  { en: 'Do the advised exercises daily.', ur: 'بتائی گئی ورزش روزانہ کریں۔' },
  { en: 'Reduce weight.', ur: 'وزن کم کریں۔' },
  { en: 'Avoid direct sunlight and use sunscreen.', ur: 'دھوپ سے بچیں اور سن بلاک استعمال کریں۔' },
  { en: 'Drink plenty of water.', ur: 'پانی زیادہ پئیں۔' },
  { en: 'Bring your reports on the next visit.', ur: 'اگلی بار اپنی رپورٹس ساتھ لائیں۔' },
];

export const FOLLOW_UPS = ['After 1 week', 'After 2 weeks', 'After 1 month', 'After 6 weeks', 'After 3 months'];

/** Joins the picked parts into English and Urdu dosage text, e.g. "1 tablet twice daily after meals". */
export function composeDosage(parts: (Phrase | undefined)[]): Phrase {
  const picked = parts.filter((p): p is Phrase => !!p);
  return {
    en: picked.map((p) => p.en).join(' '),
    ur: picked.map((p) => p.ur).join(' '),
  };
}
