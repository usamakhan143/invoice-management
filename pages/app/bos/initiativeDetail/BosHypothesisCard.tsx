import React from "react";

interface BosHypothesisCardProps {
  hypothesis?: string;
  successCriteria?: string;
}

const BosHypothesisCard: React.FC<BosHypothesisCardProps> = ({ hypothesis, successCriteria }) => {
  if (!hypothesis && !successCriteria) return null;

  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white p-6 dark:border-gray-800 dark:bg-gray-900/40">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
        Success hypothesis
      </p>
      {hypothesis ? (
        <p className="mt-3 text-sm leading-relaxed text-gray-800 dark:text-gray-100">{hypothesis}</p>
      ) : (
        <p className="mt-3 text-sm text-gray-400">No hypothesis recorded.</p>
      )}
      {successCriteria ? (
        <div className="mt-5 border-t border-gray-100 pt-4 dark:border-gray-800">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
            Success criteria
          </p>
          <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{successCriteria}</p>
        </div>
      ) : null}
    </div>
  );
};

export default BosHypothesisCard;
