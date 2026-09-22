import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  requireReason?: boolean;
  reasonPlaceholder?: string;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = true,
  requireReason = false,
  reasonPlaceholder = 'Please specify the reason...',
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (requireReason && !reason.trim()) {
      setError('Reason is mandatory for this action.');
      return;
    }
    onConfirm(reason.trim());
    setReason('');
    setError('');
    onClose();
  };

  return (
    <div className="mb-6 bg-white dark:bg-slate-900 border-2 border-rose-500/30 rounded-2xl shadow-lg p-5 text-slate-900 dark:text-white animate-in slide-in-from-top-2 duration-150">
      <div className="flex items-start gap-4">
        <div
          className={`p-3 rounded-xl shrink-0 ${
            isDestructive
              ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
              : 'bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400'
          }`}
        >
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold tracking-tight">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            {description}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          aria-label="Cancel confirmation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {requireReason && (
        <div className="mt-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Moderation Reason *
          </label>
          <textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError('');
            }}
            placeholder={reasonPlaceholder}
            rows={2}
            className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-2.5 focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
          {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
        </div>
      )}

      <div className="mt-4 flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={onClose}
          className="px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          {cancelText}
        </button>
        <button
          onClick={handleConfirm}
          className={`px-4 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition-colors text-white ${
            isDestructive
              ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800'
              : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
          }`}
        >
          {confirmText}
        </button>
      </div>
    </div>
  );
};
