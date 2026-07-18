import React from "react";
import { IconSpinner } from "../icons/Icons";
import { Dialog } from "./Dialog";
import { dialogButtonClass } from "./dialogStyles";

export interface ConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  isPending?: boolean;
  errorMessage?: React.ReactNode;
  preventCloseOnOverlay?: boolean;
}

export function ConfirmationDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  isPending = false,
  errorMessage,
  preventCloseOnOverlay,
}: ConfirmationDialogProps): React.ReactElement {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      preventCloseOnOverlay={preventCloseOnOverlay || isPending}
      preventCloseOnEscape={isPending}
      size="sm"
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
            onClick={onConfirm}
            disabled={isPending}
            className={dialogButtonClass("primary")}
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
      {errorMessage != null && (
        <p
          role="alert"
          className="text-[length:var(--font-size-caption)] text-[var(--color-text-danger)]"
        >
          {errorMessage}
        </p>
      )}
    </Dialog>
  );
}
