import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

interface NotificationToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 sm:bottom-6 right-3 sm:right-6 left-3 sm:left-auto z-50 flex flex-col space-y-2 max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-white border border-[#e3e1ea] shadow-xl rounded-lg p-3.5 flex items-start gap-3 transition-all animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          {toast.type === 'success' && <CheckCircle2 size={16} className="text-[#5b598b] mt-0.5 shrink-0" />}
          {toast.type === 'error' && <AlertCircle size={16} className="text-[#ba1a1a] mt-0.5 shrink-0" />}
          {toast.type === 'info' && <Info size={16} className="text-[#1a1b22] mt-0.5 shrink-0" />}

          <div className="flex-1 text-xs min-w-0">
            <span className="font-semibold text-[#1a1b22] block truncate">{toast.title}</span>
            <span className="text-[#444748] leading-tight break-words">{toast.message}</span>
          </div>

          <button
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
            className="text-[#747878] hover:text-[#1a1b22] w-7 h-7 flex items-center justify-center -mr-1.5 -mt-1 cursor-pointer rounded hover:bg-[#f4f2fc] transition-colors shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
