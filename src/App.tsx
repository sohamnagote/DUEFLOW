/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import { OverviewView } from './components/OverviewView';
import { InvoicesView } from './components/InvoicesView';
import { ClientsView } from './components/ClientsView';
import { RemindersView } from './components/RemindersView';
import { SettingsView } from './components/SettingsView';
import { SwitchAccountModal } from './components/SwitchAccountModal';

export default function App() {
  // Determine initial page from URL path to support direct opens/refreshes of /privacy, /terms, etc.
  const getInitialPageMode = (): 'landing' | 'signin' | 'app' | 'privacy' | 'terms' => {
    if (typeof window === 'undefined') return 'landing';
    const path = window.location.pathname.toLowerCase();
    if (path === '/privacy') return 'privacy';
    if (path === '/terms') return 'terms';
    if (path === '/signin' || path === '/login') return 'signin';
    return 'landing';
  };

  const [pageMode, setPageMode] = useState<'landing' | 'signin' | 'app' | 'privacy' | 'terms'>(
    getInitialPageMode
  );

  // App navigation tab: 'overview' | 'invoices' | 'clients' | 'reminders' | 'settings'
  const [activeTab, setActiveTab] = useState<DueflowTab>('overview');

  // Sidebar mobile drawer state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Switch Account Modal state
  const [isSwitchAccountOpen, setIsSwitchAccountOpen] = useState(false);

  // Persistent User Profile state (INR default)
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_USER_PROFILE);

  // Invoices & Clients data
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // Comprehensive data loader from verified PostgreSQL backend
  const refreshAllUserData = useCallback(async () => {
    try {
      const [profileData, invData, clientData, activeUser] = await Promise.allSettled([
        dueflowApi.getProfile(),
        dueflowApi.getInvoices(),
        dueflowApi.getClients(),
        getActiveUser(),
      ]);

      if (profileData.status === 'fulfilled' && profileData.value) {
        const authUser = activeUser.status === 'fulfilled' ? activeUser.value : null;
        setUserProfile((prev) => ({
          ...prev,
          ...profileData.value,
          fullName: profileData.value.fullName || authUser?.name || prev.fullName,
          email: profileData.value.email || authUser?.email || prev.email,
        }));
      } else if (activeUser.status === 'fulfilled' && activeUser.value) {
        setUserProfile((prev) => ({
          ...prev,
          fullName: activeUser.value?.name || prev.fullName,
          email: activeUser.value?.email || prev.email,
        }));
      }

      if (invData.status === 'fulfilled') {
        setInvoices(invData.value || []);
      } else {
        console.warn('Backend invoices query rejected:', invData.reason);
      }

      if (clientData.status === 'fulfilled') {
        setClients(clientData.value || []);
      } else {
        console.warn('Backend clients query rejected:', clientData.reason);
      }
    } catch (err) {
      console.warn('Could not load remote account data:', err);
    }
  }, []);

  // Fetch persisted profile, invoices and clients on mount
  useEffect(() => {
    refreshAllUserData();
  }, [refreshAllUserData]);

  // Supabase Auth listener: handles session changes, account switching, and logout
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.user) {
          await refreshAllUserData();
        }
      } else if (event === 'SIGNED_OUT') {
        setInvoices([]);
        setClients([]);
        setUserProfile(INITIAL_USER_PROFILE);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshAllUserData]);

  // Listen to browser forward/back buttons
  useEffect(() => {
    const handlePopState = () => {
      setPageMode(getInitialPageMode());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Navigation handlers
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
    setPageMode('app');
    refreshAllUserData();
  };

  const handleSignOut = async () => {
    await signOutUser();
    setUserProfile(INITIAL_USER_PROFILE);
    setInvoices([]);
    setClients([]);
    navigateToSignIn();
  };

  const handleAccountSwitched = async () => {
    setInvoices([]);
    setClients([]);
    setUserProfile(INITIAL_USER_PROFILE);
    await refreshAllUserData();
    setPageMode('app');
  };

  // Handlers for invoices - strictly calls database and removes false fallbacks
  const handleAddInvoice = async (newInv: Omit<Invoice, 'id'>) => {
    try {
      const created = await dueflowApi.createInvoice(newInv);
      setInvoices((prev) => [created, ...prev]);
      try {
        const updatedClients = await dueflowApi.getClients();
        setClients(updatedClients);
      } catch (_) {}
      setActiveTab('invoices');
    } catch (err: any) {
      console.error('Invoice creation failed on backend:', err);
      alert(err?.message || 'Could not save invoice to database. Please check required fields.');
    }
  };

  const handleUpdateStatus = async (id: string, status: InvoiceStatus) => {
    // Optimistic UI with sync
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, status } : inv))
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
        setInvoices(fresh);
      } catch (_) {}
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
    try {
      await dueflowApi.deleteInvoice(id);
    } catch (err: any) {
      console.warn('Could not sync invoice delete with backend:', err);
      try {
        const fresh = await dueflowApi.getInvoices();
        setInvoices(fresh);
      } catch (_) {}
    }
  };

  // Handlers for clients - strictly calls database
  const handleAddClient = async (
    newCli: Omit<Client, 'id' | 'totalInvoiced' | 'totalOutstanding' | 'invoicesCount' | 'createdAt'>
  ) => {
    try {
      const created = await dueflowApi.createClient(newCli);
      setClients((prev) => [created, ...prev]);
    } catch (err: any) {
      console.error('Client creation failed on backend:', err);
      alert(err?.message || 'Could not save client to database. Please check required fields.');
    }
  };

  const handleDeleteClient = async (id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
    try {
      await dueflowApi.deleteClient(id);
    } catch (err: any) {
      console.warn('Could not sync client delete with backend:', err);
      try {
        const fresh = await dueflowApi.getClients();
        setClients(fresh);
      } catch (_) {}
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

  // Screen 1: Public Landing Page
  if (pageMode === 'landing') {
    return (
      <LandingView
        onSignInClick={navigateToSignIn}
        onGetStartedClick={navigateToApp}
        userProfile={userProfile}
        onOpenSettings={() => {
          setActiveTab('settings');
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
    <div className="relative min-h-screen w-full bg-[#fbf9f4] font-['Hanken_Grotesk'] text-[#1b1c19]">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onBackToLanding={navigateToLanding}
        userProfile={userProfile}
        onOpenSettings={() => setActiveTab('settings')}
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
          onOpenSettings={() => setActiveTab('settings')}
          onSwitchAccount={() => setIsSwitchAccountOpen(true)}
          onSignOut={handleSignOut}
          onNavigateToTab={(tab) => setActiveTab(tab)}
          invoices={invoices}
          userProfile={userProfile}
        />

        {/* In-App Route Pages */}
        <main className="w-full pt-16 min-h-screen bg-[#fbf9f4]">
          {activeTab === 'overview' && (
            <OverviewView
              invoices={invoices}
              clients={clients}
              userPreferredCurrency={userProfile.preferredCurrency}
              onNewInvoiceClick={() => setActiveTab('invoices')}
              onAddClientClick={() => setActiveTab('clients')}
              onClearData={() => {
                setInvoices([]);
                setClients([]);
              }}
              onNavigateToInvoices={() => setActiveTab('invoices')}
              onNavigateToClients={() => setActiveTab('clients')}
              onNavigateToReminders={() => setActiveTab('reminders')}
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
            />
          )}

          {activeTab === 'clients' && (
            <ClientsView
              clients={clients}
              onAddClient={handleAddClient}
              onDeleteClient={handleDeleteClient}
            />
          )}

          {activeTab === 'reminders' && (
            <RemindersView
              userPreferredCurrency={userProfile.preferredCurrency}
              invoices={invoices}
              userProfile={userProfile}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              userProfile={userProfile}
              onUpdateProfile={(updated) => setUserProfile(updated)}
            />
          )}
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
