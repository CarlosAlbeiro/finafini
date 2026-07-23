import React from 'react';

interface ProgressBarProps {
  percentage: number;
  showText?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ percentage, showText = true }) => {
  const clamped = Math.min(100, Math.max(0, percentage));
  
  return (
    <div className="w-full">
      {showText && (
        <div className="flex justify-between items-center mb-1 text-xs">
          <span className="font-medium text-slate-600 dark:text-slate-400">Progreso de pago</span>
          <span className="font-bold text-sky-600 dark:text-sky-400">{clamped}%</span>
        </div>
      )}
      <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/50">
        <div
          className="bg-gradient-to-r from-sky-500 to-indigo-600 h-full rounded-full transition-all duration-500 ease-out shadow-sm"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
