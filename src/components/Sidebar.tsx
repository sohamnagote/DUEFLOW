import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';
import { ThemeToggle } from './ThemeToggle';

export type DueflowTab = 'overview' | 'invoices' | 'clients' | 'reminders' | 'settings';

interface SidebarProps {
  activeTab: DueflowTab;
  onSelectTab: (tab: DueflowTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onBackToLanding: () => void;
  userProfile?: UserProfile;
  onOpenSettings?: () => void;
  onSwitchAccount?: () => void;
  onSignOut?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  onBackToLanding,
  userProfile,
  onOpenSettings,
  onSwitchAccount,
  onSignOut,
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isProfileMenuOpen]);

  const navItems: { id: DueflowTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: 'grid_view' },
    { id: 'invoices', label: 'Invoices', icon: 'receipt_long' },
    { id: 'clients', label: 'Clients', icon: 'group' },
    { id: 'reminders', label: 'Reminders', icon: 'schedule' },
    { id: 'settings', label: 'Settings', icon: 'tune' },
  ];

  const handleNavClick = (tab: DueflowTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#fbf9f4] dark:bg-[#0c131d] border-r border-[#e4e2dd] dark:border-white/10 flex flex-col justify-between py-6 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="space-y-6">
          {/* Logo & Brand */}
          <div className="px-6 flex items-center justify-between">
            <span
              onClick={onBackToLanding}
              className="text-xl font-bold tracking-tight text-[#001126] dark:text-[#f3f6fa] font-['Plus_Jakarta_Sans'] cursor-pointer hover:opacity-80 transition-opacity"
            >
              dueflow
            </span>
            <div className="flex items-center gap-1 opacity-30">
              <div className="w-1 h-1 rounded-full bg-[#15263c] dark:bg-white" />
              <div className="w-1 h-1 rounded-full bg-[#15263c] dark:bg-white" />
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 space-y-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 text-sm text-left active:scale-[0.98] cursor-pointer ${
                    isActive
                      ? 'bg-[#eae8e3] dark:bg-white/10 text-[#1b1c19] dark:text-[#f3f6fa] font-semibold shadow-2xs'
                      : 'text-[#44474d] dark:text-[#94a3b8] hover:bg-[#f0eee9] dark:hover:bg-white/5 hover:text-[#1b1c19] dark:hover:text-[#f3f6fa]'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[20px] transition-colors ${isActive ? 'text-[#15263c] dark:text-[#60a5fa]' : 'text-[#74777d] dark:text-[#94a3b8]'}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {item.id === 'settings' && userProfile && !userProfile.onboardingCompleted && (
                    <span className="ml-auto text-[9px] font-['Space_Mono'] uppercase px-1.5 py-0.5 rounded-full bg-[#ffdad6] dark:bg-red-950/60 text-[#ba1a1a] dark:text-[#f87171] font-bold">
                      Setup
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Back to landing page link directly below Settings */}
          <div className="pt-4 mt-3 px-3 border-t border-[#e4e2dd]/70 dark:border-white/10">
            <button
              onClick={() => {
                onBackToLanding();
                onCloseMobile();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[#44474d] dark:text-[#94a3b8] hover:bg-[#f0eee9] dark:hover:bg-white/5 hover:text-[#001126] dark:hover:text-[#f3f6fa] transition-colors group text-left cursor-pointer active:scale-[0.98]"
              title="Return to public landing page"
            >
              <span className="material-symbols-outlined text-[18px] text-[#74777d] dark:text-[#94a3b8] group-hover:text-[#001126] dark:group-hover:text-[#f3f6fa] transition-transform group-hover:-translate-x-0.5">
                arrow_back
              </span>
              <span className="font-medium text-xs sm:text-sm">Back to landing page</span>
            </button>
          </div>
        </div>

        {/* User Profile Card & Dropdown Menu */}
        <div className="px-3 relative" ref={profileMenuRef}>
          {isProfileMenuOpen && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-[#ffffff] dark:bg-[#141f2e] rounded-2xl shadow-xl border border-[#001126]/10 dark:border-white/10 p-3 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
              {/* User Identity Info */}
              <div className="p-3 bg-[#fbf9f4] dark:bg-[#0c131d] rounded-xl border border-[#001126]/5 dark:border-white/10 mb-2">
                <p className="text-sm font-bold text-[#001126] dark:text-[#f3f6fa] truncate">
                  {userProfile?.fullName || 'My Account'}
                </p>
                <p className="font-['Space_Mono'] text-[10px] text-[#74777d] dark:text-[#94a3b8] truncate mt-0.5">
                  {userProfile?.email || 'Authenticated User'}
                </p>
              </div>

              {/* Menu Actions */}
              <div className="space-y-1 text-xs">
                {/* Theme Toggle row */}
                <ThemeToggle variant="dropdown-row" />

                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    if (onSwitchAccount) onSwitchAccount();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 font-semibold text-[#1b1c19] dark:text-[#f3f6fa] hover:bg-[#f5f3ee] dark:hover:bg-white/5 rounded-lg transition-colors text-left cursor-pointer active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#44474d] dark:text-[#94a3b8]">
                    switch_account
                  </span>
                  <span>Switch account</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    if (onOpenSettings) {
                      onOpenSettings();
                    } else {
                      handleNavClick('settings');
                    }
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 font-semibold text-[#1b1c19] dark:text-[#f3f6fa] hover:bg-[#f5f3ee] dark:hover:bg-white/5 rounded-lg transition-colors text-left cursor-pointer active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#44474d] dark:text-[#94a3b8]">
                    tune
                  </span>
                  <span>Settings</span>
                </button>

                <div className="border-t border-[#001126]/10 dark:border-white/10 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    if (onSignOut) onSignOut();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 font-semibold text-[#ba1a1a] dark:text-[#f87171] hover:bg-[#ffdad6]/40 dark:hover:bg-red-950/40 rounded-lg transition-colors text-left cursor-pointer active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#ba1a1a] dark:text-[#f87171]">
                    logout
                  </span>
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}

          <div
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="p-2 rounded-lg hover:bg-[#f0eee9] dark:hover:bg-white/5 transition-colors flex items-center justify-between cursor-pointer border border-[#e4e2dd]/60 dark:border-white/10 active:scale-[0.98]"
            role="button"
            aria-expanded={isProfileMenuOpen}
            aria-label="User account menu"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#001126] dark:bg-white/10 text-white flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[18px]">person</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-[#1b1c19] dark:text-[#f3f6fa] truncate">
                  {userProfile?.fullName || 'My Account'}
                </span>
                <span className="font-['Space_Mono'] text-[10px] text-[#44474d] dark:text-[#94a3b8] truncate">
                  {userProfile?.email || 'Account options'}
                </span>
              </div>
            </div>
            <span
              className={`material-symbols-outlined text-[#44474d] dark:text-[#94a3b8] text-[18px] shrink-0 transition-transform duration-200 ${
                isProfileMenuOpen ? 'rotate-180' : ''
              }`}
            >
              expand_more
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
