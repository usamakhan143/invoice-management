import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const GAP_PX = 6;
const VIEW_MARGIN = 8;
const MAX_WIDTH_PX = 320;

type Variant = "info" | "warning";

const variantClasses: Record<Variant, { panel: string }> = {
  info: {
    panel:
      "rounded-md bg-gray-900 px-2.5 py-2 text-left text-[11px] font-normal leading-snug text-white shadow-lg dark:bg-gray-100 dark:text-gray-900",
  },
  warning: {
    panel:
      "rounded-md bg-amber-950 px-2.5 py-2 text-left text-[11px] font-normal leading-snug text-amber-50 shadow-lg dark:bg-amber-100 dark:text-amber-950",
  },
};

function clampTooltipLeft(centerX: number, tooltipWidth: number, vw: number): number {
  const w = Math.min(tooltipWidth, Math.min(MAX_WIDTH_PX, vw - 2 * VIEW_MARGIN));
  let left = centerX - w / 2;
  return Math.max(VIEW_MARGIN, Math.min(left, vw - w - VIEW_MARGIN));
}

/**
 * Tooltip anchored to a field hint control, portaled to document.body so modal
 * overflow does not clip it. Horizontal position is clamped to the viewport.
 */
export const FloatingFieldTooltip: React.FC<{
  text: string;
  variant: Variant;
  children: React.ReactElement;
}> = ({ text, variant, children }) => {
  const tipId = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{
    left: number;
    top: number;
    maxWidth: number;
  } | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current != null) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => setOpen(false), 120);
  }, [clearHideTimer]);

  const show = useCallback(() => {
    clearHideTimer();
    setOpen(true);
  }, [clearHideTimer]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setCoords(null);
      return;
    }

    const run = () => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const maxW = Math.min(MAX_WIDTH_PX, vw - 2 * VIEW_MARGIN);
      const centerX = rect.left + rect.width / 2;

      let wForClamp = maxW;
      if (tooltipRef.current) {
        wForClamp = Math.min(maxW, Math.max(tooltipRef.current.offsetWidth, 1));
      }

      setCoords({
        left: clampTooltipLeft(centerX, wForClamp, vw),
        top: rect.top - GAP_PX,
        maxWidth: maxW,
      });
    };

    run();
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(run);
    });
    return () => cancelAnimationFrame(id);
  }, [open, text]);

  useEffect(() => {
    if (!open) return;
    const onResizeOrScroll = () => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const maxW = Math.min(MAX_WIDTH_PX, vw - 2 * VIEW_MARGIN);
      const centerX = rect.left + rect.width / 2;
      let wForClamp = maxW;
      if (tooltipRef.current) {
        wForClamp = Math.min(maxW, Math.max(tooltipRef.current.offsetWidth, 1));
      }
      setCoords({
        left: clampTooltipLeft(centerX, wForClamp, vw),
        top: rect.top - GAP_PX,
        maxWidth: maxW,
      });
    };
    window.addEventListener("scroll", onResizeOrScroll, true);
    window.addEventListener("resize", onResizeOrScroll);
    return () => {
      window.removeEventListener("scroll", onResizeOrScroll, true);
      window.removeEventListener("resize", onResizeOrScroll);
    };
  }, [open, text]);

  useEffect(
    () => () => {
      if (hideTimerRef.current != null) clearTimeout(hideTimerRef.current);
    },
    [],
  );

  const panelClass = variantClasses[variant].panel;

  const trigger = React.cloneElement(children, {
    "aria-describedby": open ? tipId : undefined,
  });

  const tooltipNode =
    open && coords ? (
      <div
        ref={tooltipRef}
        id={tipId}
        role="tooltip"
        className={`pointer-events-auto fixed z-[200] ${panelClass}`}
        style={{
          left: coords.left,
          top: coords.top,
          maxWidth: coords.maxWidth,
          width: "max-content",
          transform: "translateY(-100%)",
        }}
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
      >
        {text}
      </div>
    ) : null;

  return (
    <>
      <span
        ref={triggerRef}
        className="inline-flex align-middle"
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
        onFocusCapture={show}
        onBlurCapture={scheduleHide}
      >
        {trigger}
      </span>
      {typeof document !== "undefined" && tooltipNode
        ? createPortal(tooltipNode, document.body)
        : null}
    </>
  );
};
