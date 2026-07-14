import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type SearchableListSelectOption = {
  value: string;
  label: string;
  /** Lowercase text used for filtering (title, amount, etc.). Defaults to label. */
  searchText?: string;
};

export type SearchableListSelectProps = {
  id?: string;
  options: readonly SearchableListSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
  triggerClassName?: string;
};

function measurePanelBox(trigger: HTMLElement) {
  const r = trigger.getBoundingClientRect();
  const gap = 4;
  const spaceBelow = window.innerHeight - r.bottom - gap - 16;
  const maxHeight = Math.max(120, Math.min(320, spaceBelow));
  return {
    top: r.bottom + gap,
    left: r.left,
    width: Math.max(r.width, 240),
    maxHeight,
  };
}

const SearchableListSelect: React.FC<SearchableListSelectProps> = ({
  id,
  options,
  value,
  onChange,
  placeholder = "Select…",
  disabled,
  ariaLabel,
  triggerClassName = "",
}) => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [panelBox, setPanelBox] = useState({ top: 0, left: 0, width: 280, maxHeight: 320 });

  const selectedLabel = useMemo(() => {
    return options.find((o) => o.value === value)?.label ?? "";
  }, [options, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...options];
    return options.filter((o) => {
      const haystack = (o.searchText ?? o.label).toLowerCase();
      return haystack.includes(q);
    });
  }, [options, query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  const updatePanelPosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    setPanelBox(measurePanelBox(el));
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelPosition();
    const onScroll = () => updatePanelPosition();
    const onResize = () => updatePanelPosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => searchInputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    let removeDocListener: (() => void) | undefined;
    const frame = window.requestAnimationFrame(() => {
      const onDocMouseDown = (e: MouseEvent) => {
        const node = e.target as Node;
        if (triggerRef.current?.contains(node)) return;
        if (panelRef.current?.contains(node)) return;
        close();
      };
      document.addEventListener("mousedown", onDocMouseDown, false);
      removeDocListener = () => document.removeEventListener("mousedown", onDocMouseDown, false);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      removeDocListener?.();
    };
  }, [open, close]);

  const pickOption = (optionValue: string) => {
    onChange(optionValue);
    close();
  };

  const triggerClasses = `w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm
    dark:bg-gray-700 dark:border-gray-600 dark:text-white
    ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:border-gray-400 dark:hover:border-gray-500"}
    border-gray-300 bg-white text-gray-900 ${triggerClassName}`;

  const panel =
    open &&
    createPortal(
      <div
        ref={panelRef}
        role="listbox"
        className="flex flex-col rounded-md border border-gray-200 bg-white shadow-xl dark:border-gray-600 dark:bg-gray-800 pointer-events-auto"
        style={{
          position: "fixed",
          top: panelBox.top,
          left: panelBox.left,
          width: panelBox.width,
          maxHeight: panelBox.maxHeight,
          zIndex: 2147483646,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          ref={searchInputRef}
          type="text"
          className="w-full shrink-0 border-b border-gray-200 p-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          placeholder="Search expenses…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              close();
            }
          }}
          onMouseDown={(e) => e.stopPropagation()}
          aria-label="Filter options"
        />
        <ul className="min-h-0 flex-1 overflow-y-auto py-1 text-sm">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-gray-500 dark:text-gray-400">No matches</li>
          ) : (
            filtered.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={opt.value === value}
                  className={`w-full px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white ${
                    opt.value === value ? "bg-primary-50 font-medium dark:bg-primary-900/20" : ""
                  }`}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    pickOption(opt.value);
                  }}
                >
                  {opt.label}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>,
      document.body,
    );

  return (
    <div className="relative w-full">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={triggerClasses}
        onClick={() => {
          if (disabled) return;
          if (open) {
            close();
            return;
          }
          const el = triggerRef.current;
          if (el) {
            setPanelBox(measurePanelBox(el));
          }
          setQuery(selectedLabel);
          setOpen(true);
        }}
      >
        <span
          className={
            selectedLabel ? "truncate text-gray-900 dark:text-white" : "truncate text-gray-400"
          }
        >
          {selectedLabel || placeholder}
        </span>
        <span className="shrink-0 text-gray-400" aria-hidden>
          ▾
        </span>
      </button>
      {panel}
    </div>
  );
};

export default SearchableListSelect;
