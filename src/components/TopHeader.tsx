import React, { useState, useEffect, useRef } from 'react';
import { DueflowTab } from './Sidebar';
import { Invoice, UserProfile } from '../types';
import { formatCurrency } from '../utils/currency';

interface TopHeaderProps {
  activeTab: DueflowTab;
  onOpenMobileSidebar: () => void;
  onOpenLandingPage: () => void;
  onOpenSettings?: () => void;
  onSignOut?: () => void;
  onNavigateToTab?: (tab: DueflowTab) => void;
  invoices?: Invoice[];
  userProfile?: UserProfile;
}

interface AppNotification {
  id: string;
  type: 'overdue' | 'due_soon' | 'reminder';
  title: string;
  message: string;
  timestamp: string;
  invoiceId?: string;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  onOpenMobileSidebar,
  onOpenLandingPage,
  onOpenSettings,
  onSignOut,
  onNavigateToTab,
  invoices = [],
  userProfile,
}) => {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedHelpSection, setSelectedHelpSection] = useState<string>('invoices');

  const notificationsRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setIsNotificationsOpen(false);
      }
      if (helpRef.current && !helpRef.current.contains(target)) {
        setIsHelpOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setIsProfileOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsNotificationsOpen(false);
        setIsHelpOpen(false);
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Compute real notifications from actual invoice and reminder activity (no fabricated items)
  const notifications: AppNotification[] = React.useMemo(() => {
    const list: AppNotification[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const inv of invoices) {
      const due = new Date(inv.dueDate);
      due.setHours(0, 0, 0, 0);
      const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (inv.status === 'overdue' || (inv.status !== 'paid' && diffDays < 0)) {
        list.push({
          id: `notif-overdue-${inv.id}`,
          type: 'overdue',
          title: `Overdue: ${inv.invoiceNumber}`,
          message: `${inv.clientName} has an outstanding balance of ${formatCurrency(inv.amount, inv.currency)} (${Math.abs(diffDays)} days overdue).`,
          timestamp: 'Action required',
          invoiceId: inv.id,
        });
      } else if (inv.status === 'pending' && diffDays >= 0 && diffDays <= 3) {
        list.push({
          id: `notif-due-${inv.id}`,
          type: 'due_soon',
          title: `Due soon: ${inv.invoiceNumber}`,
          message: `${inv.clientName} invoice for ${formatCurrency(inv.amount, inv.currency)} is due in ${diffDays === 0 ? 'today' : `${diffDays} days`}.`,
          timestamp: diffDays === 0 ? 'Due Today' : `Due in ${diffDays}d`,
          invoiceId: inv.id,
        });
      }

      if ((inv.remindersSentCount || 0) > 0) {
        list.push({
          id: `notif-rem-${inv.id}`,
          type: 'reminder',
          title: `Reminder active: ${inv.invoiceNumber}`,
          message: `${inv.remindersSentCount} payment follow-up email(s) recorded for ${inv.clientName}.`,
          timestamp: 'Autopilot log',
          invoiceId: inv.id,
        });
      }
    }

    return list;
  }, [invoices]);

  const userName = userProfile?.fullName || 'Alex Mercer';
  const userEmail = userProfile?.email || 'alex@dueflow.io';
  const userCurrency = userProfile?.preferredCurrency || 'INR';

  const tabLabels: Record<DueflowTab, string> = {
    overview: 'Overview',
    invoices: 'Invoices',
    clients: 'Clients',
    reminders: 'Reminders',
    settings: 'Settings',
  };

  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-[#fbf9f4]/85 backdrop-blur-xl border-b border-[#e4e2dd] z-40 flex items-center justify-between px-4 sm:px-8">
      {/* Left side: Hamburger (mobile) + Clean Breadcrumb (WORKSPACE/Live Stream REMOVED per Screenshot 6 & Req 8) */}
      <div className="flex items-center gap-4 min-w-0">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-1.5 text-[#1b1c19] hover:bg-[#eae8e3] rounded-lg transition-colors"
          aria-label="Open sidebar navigation"
          type="button"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
        </button>

        {activeTab === 'overview' ? (
          /* Search bar on Overview */
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#44474d] text-[20px]">search</span>
            <input
              className="bg-transparent border-none outline-none text-sm text-[#1b1c19] placeholder:text-[#74777d] w-36 sm:w-64"
              placeholder="Search invoices, clients..."
              type="text"
            />
          </div>
        ) : (
          /* Clean Professional Breadcrumb — no internal or debug labels */
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#74777d]">
              DueFlow
            </span>
            <span className="text-[#c4c6cd] font-['Space_Mono'] text-[10px]">/</span>
            <span className="text-xs font-semibold text-[#001126]">
              {tabLabels[activeTab]}
            </span>
          </div>
        )}
      </div>

      {/* Right side: Actions, Notifications, Help, Profile Avatar */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* 1. Functional Notification Bell per Requirement 7 & Screenshot 5 */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => {
              setIsNotificationsOpen(!isNotificationsOpen);
              setIsHelpOpen(false);
              setIsProfileOpen(false);
            }}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors relative cursor-pointer ${
              isNotificationsOpen ? 'bg-[#eae8e3] text-[#001126]' : 'text-[#44474d] hover:bg-[#eae8e3]/70 hover:text-[#1b1c19]'
            }`}
            aria-label="View notifications"
            aria-expanded={isNotificationsOpen}
            aria-haspopup="true"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#ba1a1a] ring-2 ring-[#fbf9f4]" />
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {isNotificationsOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[#ffffff] rounded-2xl shadow-xl border border-[#001126]/10 p-4 z-50 animate-in fade-in slide-in-from-top-1"
              role="dialog"
              aria-label="Notifications panel"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#001126]/10">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#001126]">Notifications</h3>
                  {notifications.length > 0 && (
                    <span className="font-['Space_Mono'] text-[10px] px-2 py-0.5 rounded-full bg-[#ffdad6] text-[#ba1a1a] font-semibold">
                      {notifications.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setIsNotificationsOpen(false)}
                  className="text-xs text-[#74777d] hover:text-[#001126] p-1"
                  aria-label="Close notifications"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>

              <div className="py-2 max-h-80 overflow-y-auto space-y-2">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center px-4">
                    <div className="w-10 h-10 rounded-full bg-[#f5f3ee] mx-auto flex items-center justify-center text-[#74777d] mb-2">
                      <span className="material-symbols-outlined text-[20px]">notifications_off</span>
                    </div>
                    <p className="text-xs font-semibold text-[#001126]">No notifications</p>
                    <p className="text-[11px] text-[#74777d] mt-1">
                      All invoices are up to date and no automated reminder alerts are pending.
                    </p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (onNavigateToTab) onNavigateToTab('invoices');
                        setIsNotificationsOpen(false);
                      }}
                      className="p-3 rounded-xl bg-[#fbf9f4] hover:bg-[#f5f3ee] cursor-pointer transition-colors border border-[#001126]/5 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold flex items-center gap-1.5 ${
                            n.type === 'overdue'
                              ? 'text-[#ba1a1a]'
                              : n.type === 'due_soon'
                              ? 'text-[#15263c]'
                              : 'text-[#3d6562]'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            {n.type === 'overdue' ? 'error' : n.type === 'due_soon' ? 'schedule' : 'mail'}
                          </span>
                          {n.title}
                        </span>
                        <span className="font-['Space_Mono'] text-[9px] uppercase tracking-wider text-[#74777d]">
                          {n.timestamp}
                        </span>
                      </div>
                      <p className="text-xs text-[#44474d] leading-relaxed">{n.message}</p>
                    </div>
                  ))
                )}
              </div>

              {notifications.length > 0 && onNavigateToTab && (
                <div className="pt-2 border-t border-[#001126]/10 text-center">
                  <button
                    onClick={() => {
                      onNavigateToTab('invoices');
                      setIsNotificationsOpen(false);
                    }}
                    className="text-xs font-semibold text-[#001126] hover:underline"
                  >
                    View all invoices →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. Functional Help Icon per Requirement 7 & Screenshot 5 */}
        <div className="relative" ref={helpRef}>
          <button
            onClick={() => {
              setIsHelpOpen(!isHelpOpen);
              setIsNotificationsOpen(false);
              setIsProfileOpen(false);
            }}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              isHelpOpen ? 'bg-[#eae8e3] text-[#001126]' : 'text-[#44474d] hover:bg-[#eae8e3]/70 hover:text-[#1b1c19]'
            }`}
            aria-label="Help and guidance"
            aria-expanded={isHelpOpen}
            aria-haspopup="true"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">help</span>
          </button>

          {/* Help Menu / Flyout */}
          {isHelpOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[#ffffff] rounded-2xl shadow-xl border border-[#001126]/10 p-5 z-50 animate-in fade-in slide-in-from-top-1"
              role="dialog"
              aria-label="DueFlow guide"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#001126]/10">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#001126] text-[18px]">lightbulb</span>
                  <h3 className="text-sm font-bold text-[#001126]">DueFlow Quick Guide</h3>
                </div>
                <button
                  onClick={() => setIsHelpOpen(false)}
                  className="text-xs text-[#74777d] hover:text-[#001126] p-1"
                  aria-label="Close help"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>

              {/* Topic Pills */}
              <div className="flex items-center gap-1.5 py-3 overflow-x-auto no-scrollbar">
                {[
                  { id: 'invoices', label: 'Invoices' },
                  { id: 'clients', label: 'Clients' },
                  { id: 'reminders', label: 'Reminders' },
                  { id: 'gmail', label: 'Gmail' },
                  { id: 'payments', label: 'Payments' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedHelpSection(item.id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                      selectedHelpSection === item.id
                        ? 'bg-[#001126] text-[#ffffff]'
                        : 'bg-[#f5f3ee] text-[#44474d] hover:text-[#001126]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Topic Details */}
              <div className="py-2 text-xs text-[#44474d] leading-relaxed min-h-[140px]">
                {selectedHelpSection === 'invoices' && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-[#001126]">Creating & Tracking Invoices</h4>
                    <p>
                      Click <strong>New invoice</strong> on the dashboard or invoices tab. Select your client, customize the due date, and specify the amount.
                    </p>
                    <p>
                      Invoices retain their created currency ({userCurrency === 'INR' ? 'INR ₹' : 'USD $'}) for authentic historical accounting.
                    </p>
                  </div>
                )}

                {selectedHelpSection === 'clients' && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-[#001126]">Managing Clients</h4>
                    <p>
                      Add client billing emails and company details in the <strong>Clients</strong> tab to organize records and automatically route payment follow-ups.
                    </p>
                  </div>
                )}

                {selectedHelpSection === 'reminders' && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-[#001126]">Configuring Automatic Reminders</h4>
                    <p>
                      Set rules in the <strong>Reminders</strong> tab: 3 days before due date (friendly nudge), on due date (professional), or 5 days overdue (firm request).
                    </p>
                  </div>
                )}

                {selectedHelpSection === 'gmail' && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-[#001126]">Connecting Gmail</h4>
                    <p>
                      Under <strong>Settings → Gmail connection</strong>, toggle connection to dispatch reminder drafts and emails directly from your personal or studio Google Workspace.
                    </p>
                  </div>
                )}

                {selectedHelpSection === 'payments' && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-[#001126]">Setting Up Payment Details</h4>
                    <p>
                      In <strong>Settings</strong>, configure your preferred currency (INR ₹ or USD $), UPI ID, beneficiary bank accounts, and upload a payment QR code to include on invoices.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[#001126]/10 flex items-center justify-between">
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-['Space_Mono'] text-[10px] uppercase text-[#74777d] hover:text-[#001126]"
                >
                  Terms of Service
                </a>
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-['Space_Mono'] text-[10px] uppercase text-[#74777d] hover:text-[#001126]"
                >
                  Privacy Policy
                </a>
              </div>
            </div>
          )}
        </div>

        {/* 3. Functional Profile Menu per Requirement 7 & Screenshot 5 */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => {
              setIsProfileOpen(!isProfileOpen);
              setIsNotificationsOpen(false);
              setIsHelpOpen(false);
            }}
            className="w-8 h-8 rounded-full bg-[#001126] flex items-center justify-center cursor-pointer shadow-xs hover:bg-[#15263c] transition-colors focus:ring-2 focus:ring-[#9ec9c4]"
            aria-label="User account menu"
            aria-expanded={isProfileOpen}
            aria-haspopup="true"
            type="button"
          >
            <span className="material-symbols-outlined text-[#ffffff] text-[18px]">person</span>
          </button>

          {/* Profile Dropdown Menu */}
          {isProfileOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-64 bg-[#ffffff] rounded-2xl shadow-xl border border-[#001126]/10 p-3 z-50 animate-in fade-in slide-in-from-top-1"
              role="menu"
              aria-label="Account options"
            >
              {/* User Identity Info */}
              <div className="p-3 bg-[#fbf9f4] rounded-xl border border-[#001126]/5 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#001126] text-[#ffffff] flex items-center justify-center font-bold text-xs">
                    {userName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#001126] truncate">{userName}</p>
                    <p className="font-['Space_Mono'] text-[10px] text-[#74777d] truncate">{userEmail}</p>
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-[#001126]/5 flex items-center justify-between text-[10px]">
                  <span className="text-[#74777d]">Preferred currency:</span>
                  <span className="font-semibold text-[#001126]">
                    {userCurrency === 'INR' ? 'Indian Rupee (INR ₹)' : 'US Dollar (USD $)'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    if (onOpenSettings) onOpenSettings();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#1b1c19] hover:bg-[#f5f3ee] rounded-lg transition-colors text-left"
                  role="menuitem"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#44474d]">tune</span>
                  <span>Settings</span>
                </button>

                <div className="border-t border-[#001126]/10 my-1" />

                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    if (onSignOut) {
                      onSignOut();
                    } else {
                      onOpenLandingPage();
                    }
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#ba1a1a] hover:bg-[#ffdad6]/40 rounded-lg transition-colors text-left"
                  role="menuitem"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#ba1a1a]">logout</span>
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
