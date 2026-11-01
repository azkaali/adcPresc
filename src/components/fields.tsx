import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import { appendText } from '../lib/format';
import { VoiceButton, voiceSupported } from './VoiceButton';

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');

interface ValueProps {
  value: string;
  onValue: (value: string) => void;
  /** Right-to-left Urdu text with the Nastaliq font. */
  urdu?: boolean;
  /** Adds a microphone button. "replace" swaps the value for what was said; "append" adds to it. */
  voice?: 'replace' | 'append';
}

function withVoice(control: ReactNode, { value, onValue, urdu, voice }: ValueProps) {
  if (!voice || !voiceSupported) return control;
  return (
    <div className={cx('with-voice', urdu && 'rtl')}>
      {control}
      <VoiceButton
        lang={urdu ? 'ur-PK' : 'en-US'}
        onText={(text) => onValue(voice === 'append' ? appendText(value, text) : text)}
      />
    </div>
  );
}

type TextInputProps = ValueProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>;

export function TextInput({ value, onValue, urdu, voice, className, ...rest }: TextInputProps) {
  const input = (
    <input
      {...rest}
      value={value}
      onChange={(e) => onValue(e.target.value)}
      dir={urdu ? 'rtl' : undefined}
      lang={urdu ? 'ur' : undefined}
      className={cx('input', urdu && 'urdu', className)}
    />
  );
  return withVoice(input, { value, onValue, urdu, voice });
}

type TextAreaProps = ValueProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'>;

export function TextArea({ value, onValue, urdu, voice, className, rows = 2, ...rest }: TextAreaProps) {
  const textarea = (
    <textarea
      {...rest}
      rows={rows}
      value={value}
      onChange={(e) => onValue(e.target.value)}
      dir={urdu ? 'rtl' : undefined}
      lang={urdu ? 'ur' : undefined}
      className={cx('input', urdu && 'urdu', className)}
    />
  );
  return withVoice(textarea, { value, onValue, urdu, voice });
}

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export function Field({ label, hint, required, className, children }: FieldProps) {
  return (
    <label className={cx('field', className)}>
      <span className="field-label">
        {label}
        {required && <span className="required"> *</span>}
      </span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}
