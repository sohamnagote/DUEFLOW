import React from 'react';

export type DueflowTab = 'overview' | 'invoices' | 'clients' | 'reminders' | 'settings';

interface SidebarProps {
  activeTab: DueflowTab;
  onSelectTab: (tab: DueflowTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onBackToLanding: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  onBackToLanding,
}) => {
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

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-[#f5f3ee] border-r border-[#e4e2dd] z-50 flex flex-col justify-between py-6 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 shadow-xl' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col">
          {/* Logo & Register marks */}
          <div className="px-6 mb-8 flex items-center justify-between">
            <span
              onClick={() => handleNavClick('overview')}
              className="text-[22px] leading-[28px] font-bold tracking-tight lowercase text-[#15263c] cursor-pointer"
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

        {/* User Profile Card */}
        <div className="px-3">
          <div
            onClick={() => handleNavClick('settings')}
            className="p-2 rounded-lg hover:bg-[#f0eee9] transition-colors flex items-center justify-between cursor-pointer border border-[#e4e2dd]/60"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#001126] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#ffffff] text-[18px]">person</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-[#1b1c19] truncate">
                  Alex Mercer
                </span>
                <span className="font-['Space_Mono'] text-[10px] text-[#44474d] truncate">
                  alex@dueflow.io
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-[#44474d] text-[18px] shrink-0">
              expand_more
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
