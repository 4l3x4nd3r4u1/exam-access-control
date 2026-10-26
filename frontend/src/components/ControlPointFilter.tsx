import { useEffect, useId, useRef, useState } from 'react';
import { ControlPointIcon } from './ControlPointIcon';

export interface ControlPointFilterOption {
  value: string;
  label: string;
  status?: string;
}

interface ControlPointFilterProps {
  label: string;
  ariaLabel: string;
  icon: 'type' | 'status' | 'term';
  value: string;
  options: ControlPointFilterOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ControlPointFilter({ label, ariaLabel, icon, value, options, onChange, disabled = false }: ControlPointFilterProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

  const openMenu = (fromEnd = false) => {
    setOpen(true);
    window.requestAnimationFrame(() => {
      const buttons = root.current?.querySelectorAll<HTMLButtonElement>('[role="option"]');
      const index = options.findIndex((option) => option.value === value);
      buttons?.[index >= 0 ? index : fromEnd ? buttons.length - 1 : 0]?.focus();
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!open) {
      if (!disabled && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault();
        openMenu(event.key === 'ArrowUp');
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus();
      return;
    }
    if (event.key === 'Tab') { setOpen(false); return; }
    const buttons = Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []);
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (current >= 0 && ['Enter', ' '].includes(event.key)) {
      event.preventDefault();
      buttons[current].click();
      return;
    }
    let index = current;
    if (event.key === 'ArrowDown') index = (current + 1) % buttons.length;
    else if (event.key === 'ArrowUp') index = (current - 1 + buttons.length) % buttons.length;
    else if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = buttons.length - 1;
    else return;
    event.preventDefault();
    buttons[index]?.focus();
  };

  return (
    <div className="cp-filter" ref={root} onKeyDown={handleKeyDown}>
      <button
        type="button" className="cp-filter-trigger" ref={trigger}
        aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} aria-controls={listId}
        disabled={disabled} title={selected?.label ?? label}
        onClick={() => { if (open) setOpen(false); else openMenu(); }}
      >
        <ControlPointIcon name={icon} />
        <span className="cp-filter-label">{selected?.label ?? label}</span>
        <ControlPointIcon name="down" />
      </button>
      {open && (
        <div className="cp-filter-menu" id={listId} role="listbox" aria-label={label}>
          {options.map((option) => (
            <button
              type="button" role="option" className="cp-filter-option" key={option.value}
              aria-selected={option.value === value} data-value={option.value}
              onClick={() => { onChange(option.value); setOpen(false); trigger.current?.focus(); }}
            >
              {option.status && <span className={`cp-filter-state cp-filter-state-${option.status.replaceAll(' ', '-').toLowerCase()}`}><ControlPointIcon name="status" /></span>}
              <span>{option.label}</span>
              {option.value === value && <ControlPointIcon name="check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
