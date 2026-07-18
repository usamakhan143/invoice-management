import React, { useEffect, useId, useState } from "react";
import { IconAlertTriangle, IconSpinner } from "../icons/Icons";
import { cn } from "../utils/cn";
import { Dialog } from "./Dialog";
import {
  dialogButtonClass,
  dialogErrorTextClass,
  dialogFieldClass,
  dialogFieldErrorClass,
  dialogLabelClass,
} from "./dialogStyles";

export interface DangerDialogProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: (reason: string) => void;
  isPending?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  preventCloseOnOverlay?: boolean;
}

export function DangerDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  isPending = false,
  reasonLabel = "Reason",
  reasonPlaceholder = "Explain why this action is necessary",
  preventCloseOnOverlay,
}: DangerDialogProps): React.ReactElement {
  const reasonId = useId();
  const [reason, setReason] = useState("");
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (!open) {
      setReason("");
      setShowError(false);
    }
  }, [open]);

  const handleConfirm = () => {
    if (reason.trim().length === 0) {
      setShowError(true);
      return;
    }
    onConfirm(reason.trim());
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        <span className="inline-flex items-center gap-[var(--space-inline-sm)] text-[var(--color-text-danger)]">
          <IconAlertTriangle className="h-[var(--size-icon-md)] w-[var(--size-icon-md)] shrink-0" />
          {title}
        </span>
      }
      description={description}
      preventCloseOnOverlay={preventCloseOnOverlay || isPending}
      preventCloseOnEscape={isPending}
      size="md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className={dialogButtonClass("secondary")}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className={dialogButtonClass("danger")}
          >
            {isPending ? (
              <span className="inline-flex items-center gap-[var(--space-inline-sm)]">
                <IconSpinner className="h-4 w-4 animate-spin" />
                {confirmLabel}
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </>
      }
    >
      <div>
        <label htmlFor={reasonId} className={dialogLabelClass}>
          {reasonLabel}
          <span className="text-[var(--color-text-danger)]"> *</span>
        </label>
        <textarea
          id={reasonId}
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            if (showError && event.target.value.trim().length > 0) {
              setShowError(false);
            }
          }}
          placeholder={reasonPlaceholder}
          rows={3}
          required
          aria-invalid={showError}
          aria-describedby={showError ? `${reasonId}-error` : undefined}
          disabled={isPending}
          className={cn(dialogFieldClass, "min-h-[5rem] resize-y", showError && dialogFieldErrorClass)}
        />
        {showError && (
          <p id={`${reasonId}-error`} className={dialogErrorTextClass} role="alert">
            A reason is required for this action.
          </p>
        )}
      </div>
    </Dialog>
  );
}
