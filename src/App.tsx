/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Invoice, Client, InvoiceStatus, UserProfile } from './types';
import { INITIAL_INVOICES, INITIAL_CLIENTS, INITIAL_USER_PROFILE } from './data/dueflowData';
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

  // Persistent User Profile state (INR default)
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_USER_PROFILE);

  // Invoices & Clients data
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // Fetch persisted profile from backend database on mount
  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/user/profile');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.profile && isMounted) {
            setUserProfile((prev) => ({
              ...prev,
              ...data.profile,
            }));
          }
        }
      } catch (err) {
        console.warn('Could not load remote profile:', err);
      }
    };
    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, []);

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
  };

  // Handlers for invoices
  const handleAddInvoice = (newInv: Omit<Invoice, 'id'>) => {
    const created: Invoice = {
      ...newInv,
      id: `inv-${Date.now()}`,
    };
    setInvoices((prev) => [created, ...prev]);
    setActiveTab('invoices');
  };

  const handleUpdateStatus = (id: string, status: InvoiceStatus) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, status } : inv))
    );
  };

  const handleDeleteInvoice = (id: string) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
  };

  // Handlers for clients
  const handleAddClient = (
    newCli: Omit<Client, 'id' | 'totalInvoiced' | 'totalOutstanding' | 'invoicesCount' | 'createdAt'>
  ) => {
    const created: Client = {
      ...newCli,
      id: `cli-${Date.now()}`,
      totalInvoiced: 0,
      totalOutstanding: 0,
      invoicesCount: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setClients((prev) => [created, ...prev]);
  };

  const handleDeleteClient = (id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
  };

  // Screen: Privacy Policy Route (/privacy per Requirement 3)
  if (pageMode === 'privacy') {
    return <PrivacyView onBackToLanding={navigateToLanding} />;
  }

  // Screen: Terms of Service Route (/terms per Requirement 3)
  if (pageMode === 'terms') {
    return <TermsView onBackToLanding={navigateToLanding} />;
  }

  // Screen 1: Public Landing Page
  if (pageMode === 'landing') {
    return (
      <LandingView
        onSignInClick={navigateToSignIn}
        onGetStartedClick={navigateToApp}
      />
    );
  }

  // Screen 2: Sign-in Screen (with canonical Back to landing page in header)
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
      {/* Sidebar Navigation with Back to landing page directly below Settings (Requirement 4 & Screenshot 3) */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onBackToLanding={navigateToLanding}
      />

      {/* Main View Area */}
      <div className="pl-0 lg:pl-64 flex flex-col min-h-screen w-full">
        {/* Top Header with Functional Notification Bell, Help Icon, and Profile Menu (Requirement 7 & Screenshot 5) */}
        <TopHeader
          activeTab={activeTab}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenLandingPage={navigateToLanding}
          onOpenSettings={() => setActiveTab('settings')}
          onSignOut={navigateToSignIn}
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
              onLoadSampleData={() => {
                setInvoices(INITIAL_INVOICES);
                setClients(INITIAL_CLIENTS);
              }}
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
    </div>
  );
}
