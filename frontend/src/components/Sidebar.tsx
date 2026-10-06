import React from 'react';
import { User, Layers, Receipt, Users, Clock, Settings, LogOut, ArrowLeft, X } from 'lucide-react';
import { UserProfile } from '../types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  user: UserProfile | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onGoToLanding: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  user,
  onOpenAuth,
  onLogout,
  onGoToLanding,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Layers },
    { id: 'invoices', label: 'Invoices', icon: Receipt },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'reminders', label: 'Reminders', icon: Clock },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-xs transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Navigation Panel */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-white z-50 flex flex-col justify-between py-6 px-5 border-r border-[#e3e1ea] transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col">
          {/* Brand Lockup + Mobile Close Button */}
          <div className="flex items-center justify-between mb-8 px-1">
            <div
              onClick={() => {
                onGoToLanding();
                onCloseMobile?.();
              }}
              className="flex flex-col text-left cursor-pointer group"
              title="Return to Landing Page"
            >
              <span className="text-[#1a1b22] font-extrabold text-[22px] tracking-tight group-hover:text-[#5b598b] transition-colors leading-none">
                DueFlow
              </span>
              <span className="font-label-caps text-[9px] uppercase text-[#747878] tracking-[0.18em] mt-1.5 font-semibold">
                AUTOMATED INVOICE FOLLOW-UP
              </span>
            </div>

            <button
              onClick={onCloseMobile}
              aria-label="Close navigation menu"
              className="md:hidden w-10 h-10 flex items-center justify-center text-[#747878] hover:text-[#1a1b22] hover:bg-[#f4f2fc] rounded-lg transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex flex-col space-y-1.5">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentTab(item.id);
                    onCloseMobile?.();
                  }}
                  className={`w-full text-left px-3.5 py-3 min-h-[44px] rounded-lg transition-all text-sm flex items-center gap-3 cursor-pointer ${
                    isActive
                      ? 'bg-[#cac6ff] text-[#18173a] font-semibold shadow-xs'
                      : 'text-[#444748] hover:text-[#1a1b22] hover:bg-[#f4f2fc] font-medium'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-[#18173a]' : 'text-[#747878]'} />
                  <span>{item.label}</span>
                </button>
              );
            })}

            <div className="pt-3 mt-2 border-t border-[#e3e1ea]">
              <button
                onClick={() => {
                  onGoToLanding();
                  onCloseMobile?.();
                }}
                className="w-full text-left px-3.5 py-3 min-h-[44px] rounded-lg text-xs text-[#747878] hover:text-[#1a1b22] hover:bg-[#f4f2fc] transition-colors flex items-center gap-2.5 font-medium cursor-pointer"
              >
                <ArrowLeft size={15} />
                <span>Return to Landing</span>
              </button>
            </div>
          </nav>
        </div>

        {/* Bottom Profile / Account Status */}
        <div className="pt-4 border-t border-[#e3e1ea]">
          {user ? (
            <div className="flex items-center justify-between group px-1">
              <div
                onClick={() => {
                  setCurrentTab('settings');
                  onCloseMobile?.();
                }}
                className="flex items-center gap-3 cursor-pointer overflow-hidden flex-1 py-1"
              >
                <div className="w-9 h-9 rounded-full bg-[#1c1b1b] flex items-center justify-center shrink-0 text-white font-bold text-xs">
                  {user.full_name ? user.full_name.charAt(0).toUpperCase() : <User size={15} />}
                </div>
                <div className="flex flex-col overflow-hidden text-left min-w-0">
                  <span className="font-semibold text-xs text-[#1a1b22] truncate">
                    {user.full_name || 'Freelancer'}
                  </span>
                  <span className="font-label-caps text-[9px] text-[#747878] uppercase tracking-wider font-semibold truncate">
                    {user.business_name || 'WORKSPACE'}
                  </span>
                </div>
              </div>
              <button
                onClick={onLogout}
                title="Sign Out"
                aria-label="Sign Out"
                className="w-10 h-10 flex items-center justify-center text-[#747878] hover:text-black rounded-lg hover:bg-[#f4f2fc] transition-colors cursor-pointer shrink-0"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                onOpenAuth();
                onCloseMobile?.();
              }}
              className="w-full bg-[#1c1b1b] text-white text-xs font-semibold py-3 px-4 min-h-[44px] rounded-lg hover:bg-black transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.98]"
            >
              <span>Sign In</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
