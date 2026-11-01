import { useEffect, useId, useMemo, useState, type KeyboardEvent } from 'react';
import { Search, Star } from 'lucide-react';
import type { DiagnosisSummary } from '../../shared/types.ts';
import { cx } from './fields';
import { VoiceButton } from './VoiceButton';

interface Props {
  /** Sorted most-used first (as the API returns them). */
  diagnoses: DiagnosisSummary[];
  selectedId: number | null;
  onPick: (diagnosis: DiagnosisSummary) => void;
}

/** Frequently used diagnoses as one-click chips, plus a search over all of them. */
export function DiagnosisPicker({ diagnoses, selectedId, onPick }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();

  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () => (q ? diagnoses.filter((d) => d.disease_name.toLowerCase().includes(q) || d.condition.toLowerCase().includes(q)) : diagnoses),
    [diagnoses, q],
  );
  useEffect(() => setActive(0), [q]);

  const frequent = diagnoses.filter((d) => d.usage_count > 0).slice(0, 8);
  const quickPicks = frequent.length ? frequent : diagnoses.slice(0, 8);

  const choose = (d: DiagnosisSummary) => {
    onPick(d);
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && matches[active]) choose(matches[active]);
    } else if (e.key === 'Escape' && open) {
      e.stopPropagation();
      setOpen(false);
    }
  };

  return (
    <div className="diagnosis-picker">
      {quickPicks.length > 0 && (
        <div className="quick-picks">
          <span className="quick-picks-label">
            {frequent.length ? (
              <>
                <Star size={13} /> Frequently used
              </>
            ) : (
              'Diagnoses'
            )}
          </span>
          {quickPicks.map((d) => (
            <button key={d.id} type="button" className={cx('chip', d.id === selectedId && 'chip-active')} onClick={() => onPick(d)}>
              {d.disease_name}
              {d.usage_count > 0 && <span className="chip-count">{d.usage_count}</span>}
            </button>
          ))}
        </div>
      )}

      <div className="combo">
        <div className="search-box">
          <Search size={16} aria-hidden />
          <input
            className="search-box-input"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={open && matches[active] ? `${listId}-${active}` : undefined}
            aria-label="Search all diagnoses"
            placeholder={`Search all ${diagnoses.length} diagnoses…`}
            value={query}
            autoComplete="off"
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={onKeyDown}
          />
          <VoiceButton
            label="Say the diagnosis"
            onText={(text) => {
              setQuery(text);
              setOpen(true);
            }}
          />
        </div>
        {open && (
          <ul className="combo-list" id={listId} role="listbox">
            {matches.map((d, i) => (
              <li
                key={d.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className={cx('combo-option', i === active && 'active')}
                onMouseDown={(e) => e.preventDefault()}
                onMouseMove={() => i !== active && setActive(i)}
                onClick={() => choose(d)}
              >
                <div>
                  <strong>{d.disease_name}</strong>
                  {d.condition && <div className="muted ellipsis">{d.condition}</div>}
                </div>
                <span className="muted nowrap">
                  {d.medication_count} med{d.medication_count === 1 ? '' : 's'}
                  {d.usage_count > 0 && ` · used ${d.usage_count}×`}
                </span>
              </li>
            ))}
            {matches.length === 0 && (
              <li className="combo-empty" role="presentation">
                No saved diagnosis matches. Type the details below — you can save them as a new diagnosis when saving.
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
