/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Invoice, Client, InvoiceStatus, UserProfile } from './types';
import { INITIAL_USER_PROFILE } from './data/dueflowData';
import { dueflowApi } from './utils/api';
import { getActiveUser, signOutUser } from './utils/auth';
import { supabase } from './utils/supabase';
import { Sidebar, DueflowTab } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { LandingView } from './components/LandingView';
import { SignInView } from './components/SignInView';
import { PrivacyView } from './components/PrivacyView';
import { TermsView } from './components/TermsView';
import { ClientResponseView } from './components/ClientResponseView';
import { OverviewView } from './components/OverviewView';
import { InvoicesView } from './components/InvoicesView';
import { ClientsView } from './components/ClientsView';
import { RemindersView } from './components/RemindersView';
import { SettingsView } from './components/SettingsView';
import { SwitchAccountModal } from './components/SwitchAccountModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PageTransition } from './components/animations/PageTransition';

export default function App() {
  const getInitialTabFromPath = (): DueflowTab => {
    if (typeof window === 'undefined') return 'overview';
    const path = window.location.pathname.toLowerCase();
    if (path === '/invoices' || path.startsWith('/invoices')) return 'invoices';
    if (path === '/clients' || path.startsWith('/clients')) return 'clients';
    if (path === '/reminders' || path.startsWith('/reminders')) return 'reminders';
    if (path === '/settings' || path.startsWith('/settings')) return 'settings';
    return 'overview';
  };

  // Determine initial page from URL path to support direct opens/refreshes of /dashboard, /privacy, /terms, /respond, etc.
  const getInitialPageMode = (): 'landing' | 'signin' | 'app' | 'privacy' | 'terms' | 'respond' => {
    if (typeof window === 'undefined') return 'landing';
    const path = window.location.pathname.toLowerCase();
    if (path === '/respond' || path.startsWith('/respond')) return 'respond';
    const hasAuthCode = window.location.search.includes('code=') || window.location.hash.includes('access_token=');
    if (path === '/privacy') return 'privacy';
    if (path === '/terms') return 'terms';
    if (
      path === '/dashboard' ||
      path === '/app' ||
      path === '/overview' ||
      path === '/invoices' ||
      path === '/clients' ||
      path === '/reminders' ||
      path === '/settings' ||
      hasAuthCode
    ) {
      return 'app';
    }
    if (path === '/signin' || path === '/login') return 'signin';
    return 'landing';
  };

  const [pageMode, setPageMode] = useState<'landing' | 'signin' | 'app' | 'privacy' | 'terms' | 'respond'>(
    getInitialPageMode
  );


  // Authentication session check state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // App navigation tab: 'overview' | 'invoices' | 'clients' | 'reminders' | 'settings'
  const [activeTab, setActiveTab] = useState<DueflowTab>(getInitialTabFromPath);

  // Sidebar mobile drawer state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Switch Account Modal state
  const [isSwitchAccountOpen, setIsSwitchAccountOpen] = useState(false);

  // Loading & error states for remote data synchronization
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);

  // Guided profile onboarding state for first-time or incomplete users
  const [isOnboardingMode, setIsOnboardingMode] = useState(false);

  // Persistent User Profile state (INR default)
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_USER_PROFILE);

  // Invoices & Clients data
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // Deduplication ref for parallel refreshAllUserData calls
  const refreshPromiseRef = useRef<Promise<void> | null>(null);

  // Comprehensive data loader from verified PostgreSQL backend
  const refreshAllUserData = useCallback(async () => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const run = async () => {
      setIsDataLoading(true);
      setDataLoadError(null);
      try {
        const [profileData, invData, clientData, activeUser] = await Promise.allSettled([
          dueflowApi.getProfile(),
          dueflowApi.getInvoices(),
          dueflowApi.getClients(),
          getActiveUser(),
        ]);

        let isComplete = false;
        if (profileData.status === 'fulfilled' && profileData.value) {
          const authUser = activeUser.status === 'fulfilled' ? activeUser.value : null;
          const resolvedName = profileData.value.fullName || authUser?.name || '';
          const resolvedEmail = profileData.value.email || authUser?.email || '';
          isComplete = Boolean(profileData.value.onboardingCompleted);

          setUserProfile((prev) => ({
            ...prev,
            ...profileData.value,
            fullName: resolvedName || prev.fullName,
            email: resolvedEmail || prev.email,
            onboardingCompleted: isComplete,
          }));

          // If profile on backend didn't have name but OAuth provider provides it, sync it to database
          if (!profileData.value.fullName && authUser?.name) {
            dueflowApi.updateProfile({ fullName: authUser.name, email: resolvedEmail }).catch(() => {});
          }
        } else if (activeUser.status === 'fulfilled' && activeUser.value) {
          setUserProfile((prev) => ({
            ...prev,
            fullName: activeUser.value?.name || prev.fullName,
            email: activeUser.value?.email || prev.email,
          }));
        }

        // Requirement 2: Route first-time / incomplete users to Settings -> Profile setup
        if (!isComplete) {
          setIsOnboardingMode(true);
          setActiveTab('settings');
        } else {
          setIsOnboardingMode(false);
        }

        if (invData.status === 'fulfilled' && invData.value) {
          const list = Array.isArray(invData.value)
            ? invData.value
            : Array.isArray((invData.value as any)?.invoices)
            ? (invData.value as any).invoices
            : [];
          setInvoices(list.filter(Boolean));
        } else if (invData.status === 'rejected') {
          console.warn('Backend invoices query rejected:', invData.reason);
          setDataLoadError('Could not load invoices from server. Please check your network.');
        }

        if (clientData.status === 'fulfilled' && clientData.value) {
          const list = Array.isArray(clientData.value)
            ? clientData.value
            : Array.isArray((clientData.value as any)?.clients)
            ? (clientData.value as any).clients
            : [];
          setClients(list.filter(Boolean));
        } else if (clientData.status === 'rejected') {
          console.warn('Backend clients query rejected:', clientData.reason);
        }
      } catch (err: any) {
        console.warn('Could not load remote account data:', err);
        setDataLoadError(err?.message || 'Failed to load workspace data');
      } finally {
        setIsDataLoading(false);
        refreshPromiseRef.current = null;
      }
    };

    refreshPromiseRef.current = run();
    return refreshPromiseRef.current;
  }, []);

  // Check initial session & handle OAuth callback parameters if present
  useEffect(() => {
    let isMounted = true;
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        const authenticated = Boolean(session?.user);
        setIsAuthenticated(authenticated);

        if (authenticated) {
          // If URL contains OAuth callback tokens / code, clean them up safely while preserving route
          if (typeof window !== 'undefined' && (window.location.hash.includes('access_token=') || window.location.search.includes('code='))) {
            const currentPath = window.location.pathname;
            const cleanUrl = (currentPath && currentPath !== '/' && currentPath !== '/signin') ? currentPath : '/overview';
            window.history.replaceState(null, '', cleanUrl);
            setPageMode('app');
          }
          await refreshAllUserData();
        }
      } catch (err) {
        if (isMounted) setIsAuthenticated(false);
      }
    };

    initializeAuth();
    return () => {
      isMounted = false;
    };
  }, [refreshAllUserData]);

  // Supabase Auth listener: handles session changes, account switching, and logout
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const hasUser = Boolean(session?.user);
      setIsAuthenticated(hasUser);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (hasUser) {
          await refreshAllUserData();
          // Clean callback hashes or queries from URL if present while preserving intended route
          if (typeof window !== 'undefined' && (window.location.hash.includes('access_token=') || window.location.search.includes('code='))) {
            const currentPath = window.location.pathname;
            const cleanUrl = (currentPath && currentPath !== '/' && currentPath !== '/signin') ? currentPath : '/overview';
            window.history.replaceState(null, '', cleanUrl);
          }
          // Redirect from signin or landing to dashboard on successful sign in
          setPageMode((prev) => {
            if (prev === 'signin' || prev === 'landing') {
              const currentPath = window.location.pathname;
              if (currentPath === '/' || currentPath === '/signin') {
                window.history.pushState(null, '', '/overview');
              }
              return 'app';
            }
            return prev;
          });
        }
      } else if (event === 'SIGNED_OUT') {
        setInvoices([]);
        setClients([]);
        setUserProfile(INITIAL_USER_PROFILE);
        setPageMode((prev) => {
          if (prev === 'app') {
            if (window.location.pathname !== '/signin') {
              window.history.pushState(null, '', '/signin');
            }
            return 'signin';
          }
          return prev;
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshAllUserData]);

  // Route protection and redirection enforcement
  useEffect(() => {
    if (isAuthenticated === null) return; // Still verifying session

    // If user is already authenticated and opens /signin, redirect them to dashboard/requested tab
    if (pageMode === 'signin' && isAuthenticated) {
      const targetTab = getInitialTabFromPath();
      const targetPath = targetTab === 'overview' ? '/overview' : `/${targetTab}`;
      if (window.location.pathname !== targetPath) {
        window.history.replaceState(null, '', targetPath);
      }
      setActiveTab(targetTab);
      setPageMode('app');
    }

    // Protect dashboard so unauthenticated users are redirected to /signin
    if (pageMode === 'app' && !isAuthenticated) {
      if (window.location.pathname !== '/signin') {
        window.history.replaceState(null, '', '/signin');
      }
      setPageMode('signin');
    }
  }, [pageMode, isAuthenticated]);

  // Listen to browser forward/back buttons
  useEffect(() => {
    const handlePopState = () => {
      const newMode = getInitialPageMode();
      setPageMode(newMode);
      if (newMode === 'app') {
        setActiveTab(getInitialTabFromPath());
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Navigation handlers
  const handleSelectTab = (tab: DueflowTab) => {
    setActiveTab(tab);
    const targetPath = tab === 'overview' ? '/overview' : `/${tab}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  };

  const navigateToLanding = () => {
    if (window.location.pathname !== '/') {
      window.history.pushState(null, '', '/');
    }
    setPageMode('landing');
  };

  const navigateToSignIn = () => {
    if (window.location.pathname !== '/signin') {
      window.history.pushState(null, '', '/signin');
    }
    setPageMode('signin');
  };

  const navigateToApp = () => {
    const targetTab = activeTab || 'overview';
    const targetPath = targetTab === 'overview' ? '/overview' : `/${targetTab}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
    setPageMode('app');
    refreshAllUserData();
  };

  const handleResetWorkspace = async () => {
    await dueflowApi.resetWorkspace();
    setInvoices([]);
    setClients([]);
    await refreshAllUserData();
  };

  const handleSignOut = async () => {
    await signOutUser();
    setUserProfile(INITIAL_USER_PROFILE);
    setInvoices([]);
    setClients([]);
    setIsOnboardingMode(false);
    setIsAuthenticated(false);
    navigateToSignIn();
  };

  const handleAccountSwitched = async () => {
    setInvoices([]);
    setClients([]);
    setUserProfile(INITIAL_USER_PROFILE);
    setIsOnboardingMode(false);
    await refreshAllUserData();
    navigateToApp();
  };

  // Handlers for invoices - strictly calls database and removes false fallbacks
  const handleAddInvoice = async (newInv: Omit<Invoice, 'id'>): Promise<Invoice> => {
    try {
      const created = await dueflowApi.createInvoice(newInv);
      if (created && created.id) {
        setInvoices((prev) => [created, ...(Array.isArray(prev) ? prev : []).filter((i) => i && i.id !== created.id)]);
      }
      try {
        const updatedClients = await dueflowApi.getClients();
        if (Array.isArray(updatedClients)) {
          setClients(updatedClients.filter(Boolean));
        }
      } catch (_) {}
      handleSelectTab('invoices');
      return created;
    } catch (err: any) {
      console.error('Invoice creation failed on backend:', err);
      throw err;
    }
  };

  const handleUpdateStatus = async (id: string, status: InvoiceStatus) => {
    // Optimistic UI with sync
    setInvoices((prev) =>
      (Array.isArray(prev) ? prev : []).map((inv) => (inv.id === id ? { ...inv, status } : inv))
    );
    try {
      if (status === 'paid') {
        await dueflowApi.markInvoicePaid(id);
      } else {
        await dueflowApi.updateInvoice(id, { status });
      }
    } catch (err: any) {
      console.warn('Could not sync status update with backend:', err);
      // Re-fetch to guarantee consistency
      try {
        const fresh = await dueflowApi.getInvoices();
        if (Array.isArray(fresh)) {
          setInvoices(fresh.filter(Boolean));
        }
      } catch (_) {}
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    setInvoices((prev) => (Array.isArray(prev) ? prev : []).filter((inv) => inv && inv.id !== id));
    try {
      await dueflowApi.deleteInvoice(id);
    } catch (err: any) {
      console.warn('Could not sync invoice delete with backend:', err);
      try {
        const fresh = await dueflowApi.getInvoices();
        if (Array.isArray(fresh)) {
          setInvoices(fresh.filter(Boolean));
        }
      } catch (_) {}
    }
  };

  // Handlers for clients - strictly calls database
  const handleAddClient = async (
    newCli: Omit<Client, 'id' | 'totalInvoiced' | 'totalOutstanding' | 'invoicesCount' | 'createdAt'>
  ): Promise<boolean> => {
    try {
      const created = await dueflowApi.createClient(newCli);
      if (created && created.id) {
        setClients((prev) => [created, ...(Array.isArray(prev) ? prev : []).filter((c) => c && c.id !== created.id)]);
      }
      // Re-fetch to guarantee consistency and server-side state
      try {
        const fresh = await dueflowApi.getClients();
        if (Array.isArray(fresh)) {
          setClients(fresh.filter(Boolean));
        }
      } catch (syncErr) {
        console.warn('Could not re-fetch clients after create:', syncErr);
      }
      return true;
    } catch (err: any) {
      console.error('Client creation failed on backend:', err);
      throw err;
    }
  };

  const handleDeleteClient = async (id: string) => {
    setClients((prev) => (Array.isArray(prev) ? prev : []).filter((c) => c && c.id !== id));
    try {
      await dueflowApi.deleteClient(id);
    } catch (err: any) {
      console.warn('Could not sync client delete with backend:', err);
      try {
        const fresh = await dueflowApi.getClients();
        if (Array.isArray(fresh)) {
          setClients(fresh.filter(Boolean));
        }
      } catch (_) {}
    }
  };

  const handleUpdateClient = async (id: string, patch: Partial<Client>): Promise<boolean> => {
    try {
      const updated = await dueflowApi.updateClient(id, patch);
      setClients((prev) =>
        (Array.isArray(prev) ? prev : []).map((c) => (c && c.id === id ? { ...c, ...updated } : c))
      );
      return true;
    } catch (err: any) {
      console.error('Client update failed on backend:', err);
      throw err;
    }
  };

  // Screen: Privacy Policy Route (/privacy)
  if (pageMode === 'privacy') {
    return <PrivacyView onBackToLanding={navigateToLanding} />;
  }

  // Screen: Terms of Service Route (/terms)
  if (pageMode === 'terms') {
    return <TermsView onBackToLanding={navigateToLanding} />;
  }

  // Session verification screen for direct app / OAuth flows to prevent landing flicker
  if (
    isAuthenticated === null &&
    (pageMode === 'app' ||
      (typeof window !== 'undefined' &&
        (window.location.search.includes('code=') || window.location.hash.includes('access_token='))))
  ) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#fbf9f4] dark:bg-[#0c131d] text-[#1b1c19] dark:text-[#f3f6fa]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
          </div>
          <p className="text-sm font-medium text-stone-500 dark:text-stone-400">Restoring workspace session...</p>
        </div>
      </div>
    );
  }

  // Screen 0: Public One-Click Client Response Page (No Account Needed)
  if (pageMode === 'respond') {
    return <ClientResponseView />;
  }

  // Screen 1: Public Landing Page
  if (pageMode === 'landing') {

    return (
      <LandingView
        onSignInClick={navigateToSignIn}
        onGetStartedClick={navigateToApp}
        userProfile={userProfile}
        onOpenSettings={() => {
          handleSelectTab('settings');
          setPageMode('app');
        }}
        onSignOut={handleSignOut}
      />
    );
  }

  // Screen 2: Sign-in Screen
  if (pageMode === 'signin') {
    return (
      <SignInView
        onSignInSuccess={navigateToApp}
        onBackToLanding={navigateToLanding}
      />
    );
  }

  // Screen 3: Core Dueflow Dashboard App
  return (
    <div className="dashboard-root relative min-h-screen w-full bg-[#fbf9f4] dark:bg-[#0c131d] text-[#1b1c19] dark:text-[#f3f6fa] transition-colors duration-200">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onBackToLanding={navigateToLanding}
        userProfile={userProfile}
        onOpenSettings={() => handleSelectTab('settings')}
        onSwitchAccount={() => setIsSwitchAccountOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Main View Area */}
      <div className="pl-0 lg:pl-64 flex flex-col min-h-screen w-full">
        {/* Top Header */}
        <TopHeader
          activeTab={activeTab}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenLandingPage={navigateToLanding}
          onOpenSettings={() => handleSelectTab('settings')}
          onSwitchAccount={() => setIsSwitchAccountOpen(true)}
          onSignOut={handleSignOut}
          onNavigateToTab={handleSelectTab}
          invoices={invoices}
          userProfile={userProfile}
        />

        {/* In-App Route Pages */}
        <main className="w-full pt-16 min-h-screen bg-[#fbf9f4] dark:bg-[#0c131d]">
          <ErrorBoundary fallbackTitle="Workspace Section Error">
            <PageTransition tabKey={activeTab}>
              {activeTab === 'overview' && (
                <OverviewView
                  invoices={invoices}
                  clients={clients}
                  userPreferredCurrency={userProfile.preferredCurrency}
                  isLoading={isDataLoading}
                  loadError={dataLoadError}
                  onRetry={refreshAllUserData}
                  onNewInvoiceClick={() => handleSelectTab('invoices')}
                  onAddClientClick={() => handleSelectTab('clients')}
                  onClearData={() => {
                    setInvoices([]);
                    setClients([]);
                  }}
                  onResetWorkspace={handleResetWorkspace}
                  onNavigateToInvoices={() => handleSelectTab('invoices')}
                  onNavigateToClients={() => handleSelectTab('clients')}
                  onNavigateToReminders={() => handleSelectTab('reminders')}
                />
              )}

              {activeTab === 'invoices' && (
                <InvoicesView
                  invoices={invoices}
                  clients={clients}
                  userPreferredCurrency={userProfile.preferredCurrency}
                  userProfile={userProfile}
                  onAddInvoice={handleAddInvoice}
                  onUpdateStatus={handleUpdateStatus}
                  onDeleteInvoice={handleDeleteInvoice}
                  onInvoiceImported={refreshAllUserData}
                />
              )}

              {activeTab === 'clients' && (
                <ClientsView
                  clients={clients}
                  onAddClient={handleAddClient}
                  onUpdateClient={handleUpdateClient}
                  onDeleteClient={handleDeleteClient}
                />
              )}

              {activeTab === 'reminders' && (
                <RemindersView
                  userPreferredCurrency={userProfile.preferredCurrency}
                  invoices={invoices}
                  userProfile={userProfile}
                  onReminderSent={refreshAllUserData}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsView
                  userProfile={userProfile}
                  onUpdateProfile={(updated) => {
                    setUserProfile(updated);
                    if (updated.onboardingCompleted) {
                      setIsOnboardingMode(false);
                    }
                  }}
                  isOnboardingMode={isOnboardingMode}
                  onOnboardingComplete={() => {
                    setIsOnboardingMode(false);
                    handleSelectTab('overview');
                  }}
                />
              )}
            </PageTransition>
          </ErrorBoundary>
        </main>
      </div>

      {/* Account Switching Dialog Modal */}
      <SwitchAccountModal
        isOpen={isSwitchAccountOpen}
        onClose={() => setIsSwitchAccountOpen(false)}
        currentAccount={{
          name: userProfile.fullName,
          email: userProfile.email,
        }}
        onAccountSwitched={handleAccountSwitched}
      />
    </div>
  );
}
