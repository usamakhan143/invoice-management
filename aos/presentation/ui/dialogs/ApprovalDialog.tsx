import React, { useEffect, useId, useState } from "react";
import { IconSpinner } from "../icons/Icons";
import { cn } from "../utils/cn";
import { Dialog } from "./Dialog";
import {
  dialogButtonClass,
  dialogErrorTextClass,
  dialogFieldClass,
  dialogFieldErrorClass,
  dialogHintClass,
  dialogLabelClass,
} from "./dialogStyles";

export interface ApprovalDialogProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (note: string) => void;
  isPending?: boolean;
  noteRequired?: boolean;
  noteLabel?: string;
  notePlaceholder?: string;
  aiAddendum?: boolean;
  preventCloseOnOverlay?: boolean;
}

export function ApprovalDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel = "Approve",
  cancelLabel = "Cancel",
  onConfirm,
  isPending = false,
  noteRequired = false,
  noteLabel = "Note",
  notePlaceholder,
  aiAddendum = false,
  preventCloseOnOverlay,
}: ApprovalDialogProps): React.ReactElement {
  const noteId = useId();
  const [note, setNote] = useState("");
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (!open) {
      setNote("");
      setShowError(false);
    }
  }, [open]);

  const handleConfirm = () => {
    if (noteRequired && note.trim().length === 0) {
      setShowError(true);
      return;
    }
    onConfirm(note.trim());
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
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
            className={dialogButtonClass("approve")}
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
      {aiAddendum && (
        <p className="mb-[var(--space-stack-md)] rounded-[var(--radius-md)] border border-[var(--color-border-ai)] bg-[var(--color-surface-ai-draft)] p-[var(--space-stack-sm)] text-[length:var(--font-size-body)] text-[var(--color-text-ai)]">
          You are approving AI-generated content that has been reviewed.
        </p>
      )}
      <div>
        <label htmlFor={noteId} className={dialogLabelClass}>
          {noteLabel}
          {!noteRequired && (
            <span className="ml-1 font-[var(--font-weight-regular)] text-[var(--color-text-secondary)]">
              (optional)
            </span>
          )}
        </label>
        <textarea
          id={noteId}
          value={note}
          onChange={(event) => {
            setNote(event.target.value);
            if (showError && event.target.value.trim().length > 0) {
              setShowError(false);
            }
          }}
          placeholder={notePlaceholder}
          rows={3}
          aria-invalid={showError}
          aria-describedby={showError ? `${noteId}-error` : undefined}
          disabled={isPending}
          className={cn(dialogFieldClass, "min-h-[5rem] resize-y", showError && dialogFieldErrorClass)}
        />
        {showError ? (
          <p id={`${noteId}-error`} className={dialogErrorTextClass} role="alert">
            A note is required before approving.
          </p>
        ) : (
          <p className={dialogHintClass}>
            This note may be stored for audit purposes.
          </p>
        )}
      </div>
    </Dialog>
  );
}
