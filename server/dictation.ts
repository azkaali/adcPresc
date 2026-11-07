// Turns a dictated sentence such as "Arcoxia 90، ایک گولی رات کو کھانے کے بعد" into medication lines.
// The browser transcribes the speech in Urdu; Gemini matches each medicine to the clinic's list and
// writes the dosage in Urdu and English. Only the dictated text and the medicine list are sent.
import { GoogleGenAI } from '@google/genai';
import type { MedicationLine, Medicine } from '../shared/types.ts';

export type ListedMedicine = Pick<Medicine, 'id' | 'brand_name' | 'generic_name' | 'strength' | 'form'>;

/** gemini-3.5-flash-lite is on the free tier; set GEMINI_MODEL to try another model. */
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

export class DictationError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const INSTRUCTIONS = `You turn a doctor's dictated prescription into medication lines for a rheumatology clinic in Pakistan.

The dictation was transcribed by speech recognition set to Urdu, so English medicine names usually appear in Urdu script (for example آرکوکسیا is Arcoxia, پلاکوینل is Plaquenil) and may be misheard. Doctors mix Urdu and English freely.

Return one entry for each medicine the doctor mentions, in the order spoken:
- medicine_id: the id of the matching medicine in the medicine list. Match by sound, brand or generic name, and strength. Use 0 when no medicine in the list is a confident match. Never pick a medicine just because it is similar.
- name: the medicine name in English (Latin letters), as the doctor said it.
- potency: the strength if the doctor said one, e.g. "90 mg"; otherwise "".
- dosage_ur: the dosage instructions in Urdu script, keeping the doctor's own words. Fix only obvious speech-recognition mistakes. Write amounts as Urdu words where natural, e.g. ایک گولی، آدھی گولی.
- dosage_en: the same instructions in short English, e.g. "1 tablet at night after meals".
- duration_ur and duration_en: how long to take it, if the doctor said so, e.g. ایک مہینہ / "1 month"; otherwise "".

Never add a dose, frequency, timing or duration that the doctor did not say. If no medicine is mentioned, return an empty list.`;

const SCHEMA = {
  type: 'object',
  properties: {
    medications: {
      type: 'array',
      maxItems: 20,
      items: {
        type: 'object',
        properties: {
          medicine_id: { type: 'integer' },
          name: { type: 'string' },
          potency: { type: 'string' },
          dosage_ur: { type: 'string' },
          dosage_en: { type: 'string' },
          duration_ur: { type: 'string' },
          duration_en: { type: 'string' },
        },
        required: ['medicine_id', 'name', 'potency', 'dosage_ur', 'dosage_en', 'duration_ur', 'duration_en'],
      },
    },
  },
  required: ['medications'],
};

let client: GoogleGenAI | undefined;

function gemini(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new DictationError(503, 'AI dictation is not set up: add GEMINI_API_KEY to the .env file next to start.bat, then restart the app.');
  }
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

/** Turns the error the SDK raised into a message the doctor can act on. */
function explain(err: unknown): DictationError {
  const status = typeof (err as { status?: unknown })?.status === 'number' ? (err as { status: number }).status : 0;
  if (status === 429) return new DictationError(429, 'The Gemini free-tier limit was reached. Wait a minute and try again.');
  if (status === 400 || status === 401 || status === 403) {
    console.error('Gemini rejected the request:', err);
    return new DictationError(502, 'Gemini rejected the request. Check GEMINI_API_KEY in the .env file (the server window shows details).');
  }
  console.error('Gemini request failed:', err);
  return new DictationError(502, 'The AI service could not be reached. Check the internet connection and try again.');
}

const field = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

/** Builds medication lines from the model's JSON, trusting only medicine ids that are on the list. */
export function toLines(output: unknown, medicines: ListedMedicine[]): MedicationLine[] {
  const entries = (output as { medications?: unknown })?.medications;
  if (!Array.isArray(entries)) return [];
  const byId = new Map(medicines.map((m) => [m.id, m]));
  return entries.slice(0, 20).flatMap((entry: any): MedicationLine[] => {
    const medicine = byId.get(Number(entry?.medicine_id));
    const name = field(entry?.name, 200);
    if (!medicine && !name) return [];
    return [
      {
        medicine_id: medicine?.id ?? null,
        brand_name: medicine?.brand_name ?? name,
        generic_name: medicine?.generic_name ?? '',
        form: medicine?.form ?? '',
        potency: field(entry?.potency, 100) || medicine?.strength || '',
        dosage_en: field(entry?.dosage_en, 500),
        dosage_ur: field(entry?.dosage_ur, 500),
        duration_en: field(entry?.duration_en, 200),
        duration_ur: field(entry?.duration_ur, 200),
      },
    ];
  });
}

export async function dictateMedications(transcript: string, medicines: ListedMedicine[]): Promise<MedicationLine[]> {
  const ai = gemini();
  const list = medicines.map((m) => [m.id, m.brand_name, m.generic_name, m.strength, m.form].join(' | ')).join('\n');
  let text: string | undefined;
  try {
    const interaction = await ai.interactions.create(
      {
        model: MODEL,
        system_instruction: INSTRUCTIONS,
        // The list comes first so repeated requests share a prefix the API can cache.
        input: `Medicine list (id | brand | generic | strength | form):\n${list}\n\nDictation:\n${transcript}`,
        response_format: { type: 'text', mime_type: 'application/json', schema: SCHEMA },
        generation_config: { thinking_level: 'low' },
        store: false,
      },
      { timeout: 30_000 },
    );
    text = interaction.output_text;
  } catch (err) {
    throw explain(err);
  }
  try {
    return toLines(JSON.parse(text ?? ''), medicines);
  } catch {
    console.error('Gemini returned a response that is not JSON:', text);
    throw new DictationError(502, 'The AI returned an unreadable answer. Please try again.');
  }
}
