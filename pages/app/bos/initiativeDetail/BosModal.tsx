import React, { useEffect } from "react";

interface BosModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}

const BosModal: React.FC<BosModalProps> = ({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  wide,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-gray-950/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bos-modal-title"
        className={`relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl border border-gray-200/80 bg-white shadow-2xl dark:border-gray-700/80 dark:bg-gray-900 sm:rounded-2xl ${
          wide ? "max-w-2xl" : "max-w-lg"
        }`}
      >
        <div className="border-b border-gray-100 px-6 py-5 dark:border-gray-800">
          <h2 id="bos-modal-title" className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{description}</p>
          ) : null}
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer ? (
          <div className="border-t border-gray-100 px-6 py-4 dark:border-gray-800">{footer}</div>
        ) : null}
      </div>
    </div>
  );
};

export default BosModal;
