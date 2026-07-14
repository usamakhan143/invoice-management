import React from "react";
import type { MilestoneDraftStep } from "../../../../bos/domain/entities/milestoneTemplate";
import { BOS_FIELD_CLASS } from "../../../../utils/bosFormat";
import BosFormFieldLabel from "../BosFormFieldLabel";

export interface BosMilestoneDraftEditorProps {
  steps: MilestoneDraftStep[];
  onChange: (steps: MilestoneDraftStep[]) => void;
  disabled?: boolean;
}

function newStepId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const BosMilestoneDraftEditor: React.FC<BosMilestoneDraftEditorProps> = ({
  steps,
  onChange,
  disabled,
}) => {
  const sorted = [...steps].sort((a, b) => a.sequence - b.sequence);

  const updateStep = (id: string, patch: Partial<MilestoneDraftStep>) => {
    onChange(
      steps.map((step) => (step.id === id ? { ...step, ...patch } : step)),
    );
  };

  const removeStep = (id: string) => {
    const remaining = steps.filter((s) => s.id !== id);
    onChange(remaining.map((step, index) => ({ ...step, sequence: index })));
  };

  const moveStep = (id: string, direction: -1 | 1) => {
    const index = sorted.findIndex((s) => s.id === id);
    const target = index + direction;
    if (target < 0 || target >= sorted.length) return;
    const reordered = [...sorted];
    const [item] = reordered.splice(index, 1);
    reordered.splice(target, 0, item);
    onChange(reordered.map((step, seq) => ({ ...step, sequence: seq })));
  };

  const addStep = () => {
    onChange([
      ...steps,
      {
        id: newStepId(),
        title: "",
        sequence: steps.length,
      },
    ]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-gray-900 dark:text-white">Milestone plan</p>
        <button
          type="button"
          className="text-xs font-medium text-primary-600 hover:underline disabled:opacity-50"
          onClick={addStep}
          disabled={disabled}
        >
          + Add step
        </button>
      </div>
      {sorted.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No milestones yet. Add steps or choose a template.
        </p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((step, index) => (
            <li
              key={step.id}
              className="flex flex-wrap items-start gap-2 rounded-lg border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-gray-900/50"
            >
              <span className="mt-2 text-xs font-semibold text-gray-400">{index + 1}</span>
              <div className="min-w-0 flex-1 space-y-2">
                <input
                  className={BOS_FIELD_CLASS}
                  placeholder="Milestone title"
                  value={step.title}
                  onChange={(e) => updateStep(step.id, { title: e.target.value })}
                  disabled={disabled}
                  required
                />
                <input
                  className={BOS_FIELD_CLASS}
                  placeholder="Description (optional)"
                  value={step.description ?? ""}
                  onChange={(e) => updateStep(step.id, { description: e.target.value })}
                  disabled={disabled}
                />
              </div>
              <div className="flex gap-1">
                <button type="button" className="px-1 text-xs text-gray-500" disabled={disabled || index === 0} onClick={() => moveStep(step.id, -1)}>↑</button>
                <button type="button" className="px-1 text-xs text-gray-500" disabled={disabled || index === sorted.length - 1} onClick={() => moveStep(step.id, 1)}>↓</button>
                <button type="button" className="px-1 text-xs text-red-500" disabled={disabled} onClick={() => removeStep(step.id)}>×</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-gray-400">
        Reorder with arrows. Drag-and-drop reorder is reserved for a future release.
      </p>
    </div>
  );
};

export default BosMilestoneDraftEditor;
