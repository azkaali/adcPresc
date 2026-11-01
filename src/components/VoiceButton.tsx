import { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { useToast } from './Toast';

// Minimal typing for the Web Speech API (Chrome and Edge; not Firefox).
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

const RecognitionImpl: (new () => Recognition) | undefined =
  (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;

export const voiceSupported = RecognitionImpl !== undefined;

interface Props {
  /** BCP-47 language, e.g. "en-US" or "ur-PK". */
  lang?: string;
  onText: (text: string) => void;
  label?: string;
}

export function VoiceButton({ lang = 'en-US', onText, label = 'Dictate' }: Props) {
  const [listening, setListening] = useState(false);
  const recognition = useRef<Recognition | null>(null);
  const onTextRef = useRef(onText);
  const toast = useToast();

  useEffect(() => {
    onTextRef.current = onText;
  });
  useEffect(() => () => recognition.current?.abort(), []);

  if (!RecognitionImpl) return null;

  const toggle = () => {
    if (recognition.current) {
      recognition.current.stop();
      return;
    }
    const rec = new RecognitionImpl();
    rec.lang = lang;
    rec.interimResults = false;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    rec.onresult = (event) => {
      const transcript = Array.from(event.results, (r) => r[0].transcript).join(' ').trim();
      if (transcript) onTextRef.current(transcript);
    };
    rec.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        toast('Microphone access is blocked. Allow it from the icon in the browser address bar.', 'error');
      } else if (event.error === 'network') {
        toast('Voice input needs an internet connection.', 'error');
      } else if (event.error === 'language-not-supported') {
        toast('This browser does not support voice input in this language.', 'error');
      } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
        toast(`Voice input stopped: ${event.error}`, 'error');
      }
    };
    rec.onend = () => {
      recognition.current = null;
      setListening(false);
    };
    recognition.current = rec;
    rec.start();
    setListening(true);
  };

  const language = lang.startsWith('ur') ? 'Urdu' : 'English';
  const title = listening ? 'Listening… click to stop' : `${label} (${language})`;
  return (
    <button
      type="button"
      className={`voice-btn${listening ? ' listening' : ''}`}
      onClick={toggle}
      title={title}
      aria-label={title}
      aria-pressed={listening}
    >
      {listening ? <Square size={13} fill="currentColor" /> : <Mic size={16} />}
    </button>
  );
}
