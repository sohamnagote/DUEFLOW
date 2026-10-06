import React from 'react';
import { Play, Plus, Menu, MessageSquare, Mail } from 'lucide-react';

interface HeaderProps {
  onRunScheduler: () => void;
  onAddInvoice: () => void;
  isSchedulerRunning?: boolean;
  onToggleMobileSidebar?: () => void;
  onOpenConnectChannels?: () => void;
  whatsappConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onRunScheduler,
  onAddInvoice,
  isSchedulerRunning,
  onToggleMobileSidebar,
  onOpenConnectChannels,
  whatsappConnected = false,
}) => {
  return (
    <header className="fixed top-0 left-0 md:left-64 right-0 h-16 bg-white z-40 flex items-center justify-between px-3 sm:px-6 md:px-12 border-b border-[#e3e1ea] transition-all">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Sidebar Hamburger Toggle (min 44px touch target) */}
        <button
          onClick={onToggleMobileSidebar}
          aria-label="Toggle navigation menu"
          className="md:hidden w-10 h-10 flex items-center justify-center text-[#444748] hover:text-[#1a1b22] hover:bg-[#f4f2fc] rounded-lg transition-colors cursor-pointer shrink-0"
        >
          <Menu size={20} />
        </button>

        {/* Subtle Breadcrumb / Context */}
        <div className="min-w-0">
          <span className="font-label-caps text-[11px] text-[#747878] uppercase tracking-[0.14em] font-semibold truncate">
            DUEFLOW
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 md:gap-4 shrink-0">
        {/* Channels Integration Button */}
        {onOpenConnectChannels && (
          <button
            onClick={onOpenConnectChannels}
            title="Connect & manage Email and WhatsApp channels"
            className="hidden sm:inline-flex items-center gap-2 px-3 h-9 rounded-lg border border-[#e3e1ea] bg-white hover:bg-[#f4f2fc] hover:border-[#cac6ff] text-xs font-semibold text-[#1a1b22] transition-colors cursor-pointer shrink-0 active:scale-[0.98]"
          >
            <div className="flex items-center gap-1.5 shrink-0 text-[#5b598b]">
              <Mail size={13} className="shrink-0" />
              <MessageSquare
                size={13}
                className={`shrink-0 ${whatsappConnected ? 'text-[#059669]' : 'text-[#747878]'}`}
              />
            </div>
            <span className="leading-none select-none">Channels</span>
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                whatsappConnected
                  ? 'bg-[#10b981] ring-2 ring-[#d1fae5]'
                  : 'bg-[#eab308] ring-2 ring-[#fef08a]'
              }`}
            />
          </button>
        )}

        {/* Run Reminder Check Button */}
        <button
          onClick={onRunScheduler}
          disabled={isSchedulerRunning}
          title="Check due dates and send scheduled reminders"
          className="inline-flex items-center justify-center gap-1.5 text-xs text-[#5b598b] hover:text-[#18173a] px-3 h-9 rounded-lg border border-[#cac6ff] hover:bg-[#cac6ff]/30 transition-colors font-semibold disabled:opacity-50 cursor-pointer active:scale-[0.98]"
        >
          <Play size={12} className={isSchedulerRunning ? 'animate-spin' : ''} />
          <span className="hidden sm:inline leading-none">
            {isSchedulerRunning ? 'Checking Reminders...' : 'Run Reminder Check'}
          </span>
          <span className="sm:hidden leading-none">
            {isSchedulerRunning ? 'Checking...' : 'Check'}
          </span>
        </button>

        {/* Quick Add Invoice Button on Mobile & Tablet */}
        <button
          onClick={onAddInvoice}
          className="md:hidden bg-[#1c1b1b] text-white text-xs px-3 py-2 min-h-[38px] rounded-lg flex items-center gap-1 font-semibold hover:bg-black transition-colors cursor-pointer active:scale-[0.98]"
        >
          <Plus size={14} />
          <span>Add</span>
        </button>
      </div>
    </header>
  );
};

