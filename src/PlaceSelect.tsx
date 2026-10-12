import React, { useEffect, useRef, useState } from 'react';
import { Place, BirthGeo, COMUNI, STATI, ITALY_CODE, findPlace, placeLabel, searchPlaces } from './places';

interface PlaceSelectProps {
  /** Pool to search in: COMUNI, STATI or LUOGHI. */
  options: Place[];
  /** Currently selected official code ('' if none). */
  value: string;
  /** Called with the selected place, or null when the user clears/edits the text. */
  onChange: (place: Place | null) => void;
  placeholder?: string;
  noResultsText?: string;
  pickFromListText?: string;
  className?: string;
  required?: boolean;
}

/** Search-as-you-type picker over the official Alloggiati Web code tables. Stores the code, shows the name. */
export const PlaceSelect: React.FC<PlaceSelectProps> = ({
  options,
  value,
  onChange,
  placeholder,
  noResultsText = 'Nessun risultato',
  pickFromListText = "Seleziona un valore dall'elenco",
  className = '',
  required,
}) => {
  const selected = findPlace(value);
  const [text, setText] = useState(selected ? placeLabel(selected) : '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Typed text alone is not valid: when required, a code must have been picked from the list.
  useEffect(() => {
    inputRef.current?.setCustomValidity(required && !value ? pickFromListText : '');
  }, [required, value, pickFromListText]);

  // Keep the text in sync when the code is changed from outside (OCR, reset, loading an existing customer).
  // When the code is cleared because the user is typing a new search, the typed text must be kept: only
  // wipe it if it still shows the previously selected label (i.e. an external reset).
  const prevValueRef = useRef(value);
  useEffect(() => {
    const p = findPlace(value);
    const prev = findPlace(prevValueRef.current);
    prevValueRef.current = value;
    if (p) setText(placeLabel(p));
    else setText(t => (prev && t === placeLabel(prev) ? '' : t));
  }, [value]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const results = open ? searchPlaces(options, text) : [];

  // Keep the highlighted suggestion inside the visible part of the list.
  useEffect(() => {
    (listRef.current?.children[active] as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest' });
  }, [active, results.length]);

  const choose = (p: Place) => {
    setText(placeLabel(p));
    setOpen(false);
    onChange(p);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(i => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(i => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      // Enter must pick the suggestion instead of submitting the surrounding form.
      if (e.key === 'Enter') e.preventDefault();
      choose(results[Math.min(active, results.length - 1)]);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={text}
        required={required}
        onChange={e => {
          setText(e.target.value);
          setOpen(true);
          setActive(0);
          if (value) onChange(null);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-autocomplete="list"
        placeholder={placeholder}
        autoComplete="off"
        className={className}
      />
      {open && text.trim().length >= 2 && (
        <ul ref={listRef} role="listbox" className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg text-sm text-slate-800">
          {results.length === 0 ? (
            <li className="px-3 py-2 text-slate-400">{noResultsText}</li>
          ) : (
            results.map((p, i) => (
              <li
                key={p.code}
                role="option"
                aria-selected={i === active}
                onMouseDown={e => {
                  e.preventDefault();
                  choose(p);
                }}
                onMouseEnter={() => setActive(i)}
                className={`px-3 py-2 cursor-pointer ${i === active ? 'bg-slate-100' : ''}`}
              >
                {placeLabel(p)}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

interface BirthPlaceInputProps {
  value: BirthGeo;
  onChange: (next: BirthGeo) => void;
  className: string;
}

/** Reception-form birth place (Italian labels): Italia -> comune (+province), Estero -> state only. */
export const BirthPlaceInput: React.FC<BirthPlaceInputProps> = ({ value, onChange, className }) => (
  <div className="grid grid-cols-2 gap-2">
    <select
      value={value.abroad ? 'ESTERO' : 'ITALIA'}
      onChange={e => {
        const abroad = e.target.value === 'ESTERO';
        onChange({ abroad, comune: '', provincia: '', stato: abroad ? '' : ITALY_CODE });
      }}
      className={`${className} bg-white`}
    >
      <option value="ITALIA">Nato in Italia</option>
      <option value="ESTERO">Nato all'estero</option>
    </select>
    {value.abroad ? (
      <PlaceSelect
        key="stato"
        options={STATI.filter(s => s.code !== ITALY_CODE)}
        value={value.stato}
        onChange={p => onChange({ ...value, stato: p ? p.code : '' })}
        placeholder="Stato di nascita"
        className={className}
      />
    ) : (
      <PlaceSelect
        key="comune"
        options={COMUNI}
        value={value.comune}
        onChange={p => onChange({ ...value, comune: p ? p.code : '', provincia: p?.province ?? '', stato: ITALY_CODE })}
        placeholder="Comune di nascita"
        className={className}
      />
    )}
  </div>
);
