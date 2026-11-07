import { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import type { MedicationLine } from '../../shared/types.ts';
import { api } from '../api';
import { cx } from './fields';
import { useToast } from './Toast';
import { useSpeechRecognition, voiceSupported } from './VoiceButton';

interface Props {
  onLines: (lines: MedicationLine[]) => void;
}

/**
 * One button for dictating whole medication lines, e.g. "Arcoxia 90، ایک گولی رات کو کھانے کے بعد".
 * The browser transcribes in Urdu, then the server's AI writes the medicine in English and the dosage
 * in Urdu and English.
 */
export function DictateMedicines({ onLines }: Props) {
  const [working, setWorking] = useState(false);
  const toast = useToast();
  // The AI answer arrives after a delay, so hand it to the latest lines rather than the ones from when speech ended.
  const onLinesRef = useRef(onLines);
  useEffect(() => {
    onLinesRef.current = onLines;
  });

  const { listening, toggle } = useSpeechRecognition({
    lang: 'ur-PK',
    continuous: true,
    onText: async (transcript) => {
      setWorking(true);
      try {
        const { medications } = await api.dictation.medications(transcript);
        if (medications.length) onLinesRef.current(medications);
        else toast(`No medicine was recognised in “${transcript}”. Try again, saying the medicine name clearly.`, 'error');
      } catch (err) {
        toast(err instanceof Error ? err.message : String(err), 'error');
      } finally {
        setWorking(false);
      }
    },
  });

  if (!voiceSupported) return null;

  return (
    <div className="dictate">
      <button
        type="button"
        className={cx('btn', listening && 'btn-listening')}
        onClick={toggle}
        disabled={working}
        aria-pressed={listening}
      >
        {working ? <span className="spinner spinner-sm" /> : listening ? <Square size={13} fill="currentColor" /> : <Mic size={16} />}
        {working ? 'Writing medicines…' : listening ? 'Listening… click when done' : 'Dictate medicines'}
      </button>
      <span className="field-hint">
        Say the medicine and its dose, in Urdu or English, e.g. “Arcoxia 90, <span className="urdu-inline">ایک گولی رات کو کھانے کے بعد</span>”.
        You can say several medicines, then click again.
      </span>
    </div>
  );
}
