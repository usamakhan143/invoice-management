import React from "react";
import FieldInfoTip from "../../../components/FieldInfoTip";

interface BosFormFieldLabelProps {
  htmlFor?: string;
  label: string;
  tip: string;
}

/** Label + “?” tooltip for BOS create forms. */
const BosFormFieldLabel: React.FC<BosFormFieldLabelProps> = ({ htmlFor, label, tip }) => (
  <div className="mb-1 flex items-center gap-1.5">
    {htmlFor ? (
      <label htmlFor={htmlFor} className="text-sm font-medium text-gray-700 dark:text-gray-200">
        {label}
      </label>
    ) : (
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>
    )}
    <FieldInfoTip text={tip} />
  </div>
);

export default BosFormFieldLabel;
