import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';

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
          className="fixed inset-0 bg-[#001126]/30 backdrop-blur-xs z-40 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#fbf9f4] border-r border-[#e4e2dd] flex flex-col justify-between py-6 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="space-y-6">
          {/* Logo & Brand */}
          <div className="px-6 flex items-center justify-between">
            <span
              onClick={onBackToLanding}
              className="text-xl font-bold tracking-tight text-[#001126] font-['Plus_Jakarta_Sans'] cursor-pointer hover:opacity-80 transition-opacity"
            >
              dueflow
            </span>
            <div className="flex items-center gap-1 opacity-30">
              <div className="w-1 h-1 rounded-full bg-[#15263c]" />
              <div className="w-1 h-1 rounded-full bg-[#15263c]" />
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
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm text-left ${
                    isActive
                      ? 'bg-[#eae8e3] text-[#1b1c19] font-semibold'
                      : 'text-[#44474d] hover:bg-[#f0eee9] hover:text-[#1b1c19]'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[20px] ${isActive ? 'text-[#15263c]' : 'text-[#74777d]'}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {item.id === 'settings' && userProfile && !userProfile.onboardingCompleted && (
                    <span className="ml-auto text-[9px] font-['Space_Mono'] uppercase px-1.5 py-0.5 rounded-full bg-[#ffdad6] text-[#ba1a1a] font-bold">
                      Setup
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Back to landing page link directly below Settings per Requirement 4 & Screenshot 3 */}
          <div className="pt-4 mt-3 px-3 border-t border-[#e4e2dd]/70">
            <button
              onClick={() => {
                onBackToLanding();
                onCloseMobile();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[#44474d] hover:bg-[#f0eee9] hover:text-[#001126] transition-colors group text-left"
              title="Return to public landing page"
            >
              <span className="material-symbols-outlined text-[18px] text-[#74777d] group-hover:text-[#001126] transition-transform group-hover:-translate-x-0.5">
                arrow_back
              </span>
              <span className="font-medium text-xs sm:text-sm">Back to landing page</span>
            </button>
          </div>
        </div>

        {/* User Profile Card & Dropdown Menu */}
        <div className="px-3 relative" ref={profileMenuRef}>
          {isProfileMenuOpen && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-[#ffffff] rounded-2xl shadow-xl border border-[#001126]/10 p-3 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
              {/* User Identity Info */}
              <div className="p-3 bg-[#fbf9f4] rounded-xl border border-[#001126]/5 mb-2">
                <p className="text-sm font-bold text-[#001126] truncate">
                  {userProfile?.fullName || 'My Account'}
                </p>
                <p className="font-['Space_Mono'] text-[10px] text-[#74777d] truncate mt-0.5">
                  {userProfile?.email || 'Authenticated User'}
                </p>
              </div>

              {/* Menu Actions */}
              <div className="space-y-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    if (onSwitchAccount) onSwitchAccount();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 font-semibold text-[#1b1c19] hover:bg-[#f5f3ee] rounded-lg transition-colors text-left cursor-pointer active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#44474d]">
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
                  className="w-full flex items-center gap-2.5 px-3 py-2 font-semibold text-[#1b1c19] hover:bg-[#f5f3ee] rounded-lg transition-colors text-left cursor-pointer active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#44474d]">
                    tune
                  </span>
                  <span>Settings</span>
                </button>

                <div className="border-t border-[#001126]/10 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    if (onSignOut) onSignOut();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 font-semibold text-[#ba1a1a] hover:bg-[#ffdad6]/40 rounded-lg transition-colors text-left cursor-pointer active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#ba1a1a]">
                    logout
                  </span>
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}

          <div
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="p-2 rounded-lg hover:bg-[#f0eee9] transition-colors flex items-center justify-between cursor-pointer border border-[#e4e2dd]/60"
            role="button"
            aria-expanded={isProfileMenuOpen}
            aria-label="User account menu"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#001126] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#ffffff] text-[18px]">person</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-[#1b1c19] truncate">
                  {userProfile?.fullName || 'My Account'}
                </span>
                <span className="font-['Space_Mono'] text-[10px] text-[#44474d] truncate">
                  {userProfile?.email || 'Account options'}
                </span>
              </div>
            </div>
            <span
              className={`material-symbols-outlined text-[#44474d] text-[18px] shrink-0 transition-transform duration-200 ${
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
