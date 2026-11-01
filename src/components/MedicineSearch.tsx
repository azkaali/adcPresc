import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { Plus, Search } from 'lucide-react';
import type { Medicine, MedicineInput } from '../../shared/types.ts';
import { useMedicines } from '../lib/medicines';
import { matchRange, searchMedicines, type SearchMode } from '../lib/search';
import { cx } from './fields';
import { emptyMedicine, MedicineFormModal } from './MedicineFormModal';
import { useToast } from './Toast';
import { VoiceButton } from './VoiceButton';

const MODE_KEY = 'medicineSearchMode';

function loadMode(): SearchMode {
  try {
    return localStorage.getItem(MODE_KEY) === 'generic' ? 'generic' : 'brand';
  } catch {
    return 'brand';
  }
}

function saveMode(mode: SearchMode) {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // Remembering the mode is only a convenience.
  }
}

const titleCase = (s: string) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());

function Highlight({ text, query }: { text: string; query: string }) {
  const range = matchRange(text, query);
  if (!range) return <>{text}</>;
  return (
    <>
      {text.slice(0, range[0])}
      <mark>{text.slice(range[0], range[1])}</mark>
      {text.slice(range[1])}
    </>
  );
}

/** Mode toggle shared by the search dropdown and the medicines page. */
export function SearchModeToggle({ mode, onChange }: { mode: SearchMode; onChange: (mode: SearchMode) => void }) {
  return (
    <div className="segmented" role="group" aria-label="Search by">
      {(['brand', 'generic'] as const).map((m) => (
        <button
          key={m}
          type="button"
          className={cx(mode === m && 'active')}
          aria-pressed={mode === m}
          title={m === 'brand' ? 'Search by brand name (Alt+B)' : 'Search by generic name (Alt+G)'}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onChange(m)}
        >
          {m === 'brand' ? 'Brand' : 'Generic'}
        </button>
      ))}
    </div>
  );
}

export function useSearchMode() {
  const [mode, setMode] = useState<SearchMode>(loadMode);
  const change = (m: SearchMode) => {
    setMode(m);
    saveMode(m);
  };
  return [mode, change] as const;
}

interface Props {
  onSelect: (medicine: Medicine) => void;
  autoFocus?: boolean;
}

/**
 * One search bar that finds medicines by brand or by generic name, entirely in memory.
 * Arrow keys + Enter pick a result; the last option adds a new medicine when it is missing.
 */
export function MedicineSearch({ onSelect, autoFocus }: Props) {
  const { index } = useMedicines();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useSearchMode();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [adding, setAdding] = useState<MedicineInput | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const trimmed = query.trim();
  const otherMode: SearchMode = mode === 'brand' ? 'generic' : 'brand';
  const results = useMemo(() => searchMedicines(index, query, mode, 40), [index, query, mode]);
  const otherCount = useMemo(
    () => (trimmed && results.length === 0 ? searchMedicines(index, query, otherMode, 40).length : 0),
    [index, query, trimmed, otherMode, results.length],
  );
  const addIndex = results.length;

  useEffect(() => setActive(0), [query, mode]);
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const changeMode = (m: SearchMode) => {
    setMode(m);
    setOpen(true);
    inputRef.current?.focus();
  };

  const pick = (medicine: Medicine) => {
    onSelect(medicine);
    setQuery('');
    setActive(0);
    inputRef.current?.focus();
  };

  const startAdd = () => {
    setOpen(false);
    setAdding({
      ...emptyMedicine(),
      brand_name: mode === 'brand' ? titleCase(trimmed) : '',
      generic_name: mode === 'generic' ? titleCase(trimmed) : '',
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.altKey && (e.key === 'b' || e.key === 'g')) {
      e.preventDefault();
      changeMode(e.key === 'b' ? 'brand' : 'generic');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      else setActive((a) => Math.min(a + 1, addIndex));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!open) setOpen(true);
      else if (active < results.length) pick(results[active]);
      else startAdd();
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    }
  };

  const optionProps = (i: number, onChoose: () => void) => ({
    id: `${listId}-${i}`,
    role: 'option',
    'aria-selected': i === active,
    'data-active': i === active,
    onMouseDown: (e: MouseEvent) => e.preventDefault(),
    onMouseMove: () => i !== active && setActive(i),
    onClick: onChoose,
  });

  return (
    <div className="med-search">
      <div className={cx('med-search-bar', open && 'open')}>
        <Search size={18} className="med-search-icon" aria-hidden />
        <input
          ref={inputRef}
          className="med-search-input"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open ? `${listId}-${active}` : undefined}
          aria-label={`Search medicine by ${mode} name`}
          placeholder={mode === 'brand' ? 'Search medicine by brand name…' : 'Search medicine by generic name…'}
          value={query}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
        <VoiceButton
          label="Say the medicine name"
          onText={(text) => {
            setQuery(text);
            setOpen(true);
            inputRef.current?.focus();
          }}
        />
        <SearchModeToggle mode={mode} onChange={changeMode} />
      </div>

      {open && (
        <ul className="med-results" id={listId} role="listbox" ref={listRef}>
          {!trimmed && results.length > 0 && (
            <li className="med-results-heading" role="presentation">
              Most prescribed
            </li>
          )}
          {results.map((m, i) => {
            const primary = mode === 'brand' ? m.brand_name : m.generic_name || m.brand_name;
            const secondary = mode === 'brand' ? m.generic_name : m.brand_name;
            return (
              <li key={m.id} className="med-option" {...optionProps(i, () => pick(m))}>
                <div className="med-option-main">
                  <span className="med-option-name">
                    <Highlight text={primary} query={query} />
                  </span>
                  {m.strength && <span className="med-option-strength">{m.strength}</span>}
                  {m.form && <span className="tag">{m.form}</span>}
                </div>
                <div className="med-option-sub">
                  {secondary && secondary !== primary ? secondary : ' '}
                  {m.usage_count > 0 && <span className="med-option-uses">prescribed {m.usage_count}×</span>}
                </div>
              </li>
            );
          })}
          {trimmed && results.length === 0 && (
            <li className="med-results-empty" role="presentation">
              No {mode} name matches “{trimmed}”.
              {otherCount > 0 && (
                <button type="button" className="link-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => changeMode(otherMode)}>
                  {otherCount} found by {otherMode} name →
                </button>
              )}
            </li>
          )}
          <li className="med-option med-option-add" {...optionProps(addIndex, startAdd)}>
            <Plus size={16} />
            {trimmed ? (
              <span>
                Add “<strong>{trimmed}</strong>” as a new medicine
              </span>
            ) : (
              <span>Add a new medicine</span>
            )}
          </li>
        </ul>
      )}

      {adding && (
        <MedicineFormModal
          initial={adding}
          onClose={() => setAdding(null)}
          onSaved={(m) => {
            setAdding(null);
            toast(`${m.brand_name} added to the medicine list`);
            pick(m);
          }}
        />
      )}
    </div>
  );
}
