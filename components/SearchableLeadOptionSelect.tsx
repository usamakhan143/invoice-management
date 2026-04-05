import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type SearchableLeadOptionSelectProps = {
  id?: string;
  options: readonly string[];
  selectValue: string;
  customValue: string;
  onSelectChange: (value: string) => void;
  onCustomChange: (value: string) => void;
  customSentinel: string;
  placeholder: string;
  otherLabel?: string;
  customPlaceholder?: string;
  disabled?: boolean;
  error?: boolean;
  /** Screen reader label for the combobox trigger */
  ariaLabel?: string;
};

function measurePanelBox(trigger: HTMLElement) {
  const r = trigger.getBoundingClientRect();
  const gap = 4;
  const spaceBelow = window.innerHeight - r.bottom - gap - 16;
  const maxHeight = Math.max(120, Math.min(280, spaceBelow));
  return {
    top: r.bottom + gap,
    left: r.left,
    width: Math.max(r.width, 200),
    maxHeight,
  };
}

export const SearchableLeadOptionSelect: React.FC<SearchableLeadOptionSelectProps> = ({
  id,
  options,
  selectValue,
  customValue,
  onSelectChange,
  onCustomChange,
  customSentinel,
  placeholder,
  otherLabel = "Other (type your own)",
  customPlaceholder = "Type your own",
  disabled,
  error,
  ariaLabel,
}) => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [panelBox, setPanelBox] = useState({ top: 0, left: 0, width: 280, maxHeight: 280 });

  const isCustom = selectValue === customSentinel;

  const displaySummary = useMemo(() => {
    if (isCustom && customValue.trim()) return customValue.trim();
    if (isCustom) return otherLabel;
    if (selectValue) return selectValue;
    return "";
  }, [isCustom, customValue, otherLabel, selectValue]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...options];
    return options.filter((o) => o.toLowerCase().includes(q));
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

  /**
   * Outside-close on mousedown in **bubble** phase (not capture).
   * Capture-phase listeners run before the option button’s handler and could call
   * `close()` first, unmounting the portal so `pickPreset` never runs.
   */
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

  const pickPreset = (value: string) => {
    onSelectChange(value);
    onCustomChange("");
    close();
  };

  const pickOther = () => {
    onSelectChange(customSentinel);
    onCustomChange("");
    close();
    window.setTimeout(() => customInputRef.current?.focus(), 0);
  };

  const triggerClasses = `w-full flex items-center justify-between gap-2 p-2 border rounded-md text-left text-sm
    dark:bg-gray-700 dark:border-gray-600 dark:text-white
    ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:border-gray-400 dark:hover:border-gray-500"}
    ${error ? "border-red-500 ring-1 ring-red-500" : "border-gray-300"}`;

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
          placeholder="Search…"
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
              <li key={opt}>
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    pickPreset(opt);
                  }}
                >
                  {opt}
                </button>
              </li>
            ))
          )}
          <li className="mt-1 border-t border-gray-100 pt-1 dark:border-gray-600">
            <button
              type="button"
              className="w-full px-3 py-1.5 text-left font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-gray-700"
              onMouseDown={(e) => {
                e.stopPropagation();
                pickOther();
              }}
            >
              {otherLabel}
            </button>
          </li>
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
          setQuery(
            isCustom && customValue.trim()
              ? customValue.trim()
              : selectValue && !isCustom
                ? selectValue
                : "",
          );
          setOpen(true);
        }}
      >
        <span className={displaySummary ? "text-gray-900 dark:text-white truncate" : "text-gray-400 truncate"}>
          {displaySummary || placeholder}
        </span>
        <span className="text-gray-400 shrink-0" aria-hidden>
          ▾
        </span>
      </button>

      {panel}

      {isCustom && (
        <input
          ref={customInputRef}
          type="text"
          className={`mt-2 w-full p-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
            disabled ? "opacity-60" : ""
          } ${error ? "border-red-500 ring-1 ring-red-500" : "border-gray-300"}`}
          placeholder={customPlaceholder}
          value={customValue}
          onChange={(e) => onCustomChange(e.target.value)}
          disabled={disabled}
        />
      )}
    </div>
  );
};
