import React, { useState } from 'react';

interface ResetWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReset: () => Promise<void>;
  invoiceCount: number;
  clientCount: number;
}

export const ResetWorkspaceModal: React.FC<ResetWorkspaceModalProps> = ({
  isOpen,
  onClose,
  onConfirmReset,
  invoiceCount,
  clientCount,
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isConfirmed = confirmationInput.trim().toUpperCase() === 'RESET';

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed || isResetting) return;

    setIsResetting(true);
    setErrorMessage(null);
    try {
      await onConfirmReset();
      setConfirmationInput('');
      onClose();
    } catch (err: any) {
      console.error('Workspace reset error:', err);
      setErrorMessage(err?.message || 'Failed to reset workspace. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleCancel = () => {
    if (isResetting) return;
    setConfirmationInput('');
    setErrorMessage(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#001126]/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
      onClick={handleCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-modal-title"
    >
      <div
        className="bg-[#ffffff] dark:bg-[#141f2e] rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-[#ba1a1a]/20 dark:border-[#ba1a1a]/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Icon + Title */}
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-full bg-[#ffdad6] dark:bg-[#ba1a1a]/20 text-[#ba1a1a] dark:text-[#ff897d] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[24px]">warning</span>
          </div>
          <div>
            <h3 id="reset-modal-title" className="text-base font-bold text-[#001126] dark:text-[#f3f6fa]">
              Reset workspace to empty state
            </h3>
            <p className="text-xs text-[#74777d] dark:text-[#94a3b8] mt-0.5">
              This action is permanent and cannot be undone.
            </p>
          </div>
        </div>

        {/* Clear Scope Explanation */}
        <div className="space-y-3 bg-[#fbf9f4] dark:bg-[#0c131d] p-3.5 rounded-xl border border-[#001126]/10 dark:border-white/10 text-xs">
          <p className="font-semibold text-[#001126] dark:text-[#f3f6fa]">
            The following workspace records will be permanently removed:
          </p>
          <ul className="space-y-1.5 list-disc list-inside text-[#44474d] dark:text-[#94a3b8]">
            <li>
              <strong className="text-[#001126] dark:text-[#f3f6fa]">{invoiceCount}</strong> invoice{invoiceCount === 1 ? '' : 's'} and line items
            </li>
            <li>
              <strong className="text-[#001126] dark:text-[#f3f6fa]">{clientCount}</strong> client{clientCount === 1 ? '' : 's'} in your directory
            </li>
            <li>All queued automated reminder dispatches</li>
            <li>Past reminder delivery history and notification logs</li>
          </ul>

          <div className="pt-2 border-t border-[#001126]/10 dark:border-white/10 text-[11px] text-[#3d6562] dark:text-[#68b5ad]">
            ✓ Your user profile, business branding, preferred currency, payment details, and Gmail integration will be preserved.
          </div>
        </div>

        {/* Error notification if deletion fails */}
        {errorMessage && (
          <div className="p-3 rounded-lg bg-[#ffdad6] dark:bg-[#ba1a1a]/20 text-[#ba1a1a] dark:text-[#ff897d] text-xs">
            {errorMessage}
          </div>
        )}

        {/* Deliberate Confirmation Form */}
        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label
              htmlFor="reset-confirm-input"
              className="block text-xs font-semibold text-[#001126] dark:text-[#f3f6fa] mb-1.5"
            >
              Type <span className="font-mono font-bold text-[#ba1a1a] dark:text-[#ff897d]">RESET</span> to confirm:
            </label>
            <input
              id="reset-confirm-input"
              type="text"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder="RESET"
              disabled={isResetting}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-[#192638] text-[#001126] dark:text-[#f3f6fa] rounded-lg border border-[#001126]/20 dark:border-white/20 focus:outline-none focus:border-[#ba1a1a] dark:focus:border-[#ff897d] font-mono"
              autoComplete="off"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isResetting}
              className="btn-action-secondary text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isConfirmed || isResetting}
              className="px-5 py-2 rounded-lg text-xs font-bold bg-[#ba1a1a] hover:bg-[#93000a] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              {isResetting ? (
                <>
                  <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                  <span>Resetting...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[14px]">delete_forever</span>
                  <span>Reset workspace</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
