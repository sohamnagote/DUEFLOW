import React, { useEffect, useRef, useState } from 'react';
import { AmbientShaderCanvas } from './AmbientShaderCanvas';
import { UserProfile } from '../types';

interface LandingViewProps {
  onSignInClick: () => void;
  onGetStartedClick: () => void;
  userProfile?: UserProfile;
  onOpenSettings?: () => void;
  onSignOut?: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onSignInClick,
  onGetStartedClick,
  userProfile,
  onOpenSettings,
  onSignOut,
}) => {
  // Line 1: "GET PAID."
  // Line 2: "WITHOUT THE CHASING."
  const line1 = 'GET PAID.';
  const line2 = 'WITHOUT THE CHASING.';
  const totalChars = line1.length + line2.length; // 30 characters

  // Hero Staged entrance phases:
  // Phase B: Eyebrow text
  // Phase C: Subtitle text
  // Phase D: Main headline letter by letter
  // Phase E: CTA buttons
  const [eyebrowVisible, setEyebrowVisible] = useState(false);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [visibleCount, setVisibleCount] = useState<number>(0);
  const [ctaVisible, setCtaVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

  // Profile dropdown menu state (Upper right person icon)
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleProfileMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsProfileOpen(true);
  };

  const handleProfileMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setIsProfileOpen(false);
    }, 180);
  };

  // Scroll-triggered reveal states:
  // Section A: Three feature cards
  const [cardsVisible, setCardsVisible] = useState<boolean>(false);
  const cardsRef = useRef<HTMLDivElement | null>(null);

  // Section B: Feature details section ("Less chasing...")
  const [featuresVisible, setFeaturesVisible] = useState<boolean>(false);
  const featuresRef = useRef<HTMLDivElement | null>(null);

  // Section C: Final CTA section ("Get back to the work...")
  const [ctaSectionVisible, setCtaSectionVisible] = useState<boolean>(false);
  const ctaSectionRef = useRef<HTMLDivElement | null>(null);

  // Outside click and Escape key listeners for profile popup
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionQuery.matches) {
      setPrefersReducedMotion(true);
      setEyebrowVisible(true);
      setSubtitleVisible(true);
      setVisibleCount(totalChars);
      setCtaVisible(true);
      setCardsVisible(true);
      setFeaturesVisible(true);
      setCtaSectionVisible(true);
      return;
    }

    const handleMotionChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setPrefersReducedMotion(true);
        setEyebrowVisible(true);
        setSubtitleVisible(true);
        setVisibleCount(totalChars);
        setCtaVisible(true);
        setCardsVisible(true);
        setFeaturesVisible(true);
        setCtaSectionVisible(true);
      }
    };
    motionQuery.addEventListener('change', handleMotionChange);

    // Staged hero sequence timelines:
    // 1. Eyebrow (Phase B): starts at 80ms, duration 500ms
    const tEyebrow = setTimeout(() => {
      setEyebrowVisible(true);
    }, 80);

    // 2. Subtitle (Phase C): starts at 220ms, duration 550ms
    const tSubtitle = setTimeout(() => {
      setSubtitleVisible(true);
    }, 220);

    // 3. Headline (Phase D): letter by letter starting at 360ms
    let charTimer: ReturnType<typeof setInterval> | null = null;
    let current = 0;
    const tHeadline = setTimeout(() => {
      charTimer = setInterval(() => {
        current += 1;
        setVisibleCount(current);
        if (current >= totalChars) {
          if (charTimer) clearInterval(charTimer);
        }
      }, 38);
    }, 360);

    // 4. CTA Buttons (Phase E): reveals after headline has substantially appeared (~1250ms)
    const tCta = setTimeout(() => {
      setCtaVisible(true);
    }, 1250);

    // IntersectionObserver for scroll-triggered sections (15-25% threshold)
    if (typeof IntersectionObserver !== 'undefined') {
      const observerCallback: IntersectionObserverCallback = (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (entry.target === cardsRef.current) {
              setCardsVisible(true);
              observer.unobserve(entry.target);
            } else if (entry.target === featuresRef.current) {
              setFeaturesVisible(true);
              observer.unobserve(entry.target);
            } else if (entry.target === ctaSectionRef.current) {
              setCtaSectionVisible(true);
              observer.unobserve(entry.target);
            }
          }
        });
      };

      const observer = new IntersectionObserver(observerCallback, {
        threshold: 0.2,
        rootMargin: '0px 0px -40px 0px',
      });

      if (cardsRef.current) observer.observe(cardsRef.current);
      if (featuresRef.current) observer.observe(featuresRef.current);
      if (ctaSectionRef.current) observer.observe(ctaSectionRef.current);

      return () => {
        clearTimeout(tEyebrow);
        clearTimeout(tSubtitle);
        clearTimeout(tHeadline);
        clearTimeout(tCta);
        if (charTimer) clearInterval(charTimer);
        observer.disconnect();
        motionQuery.removeEventListener('change', handleMotionChange);
      };
    } else {
      setCardsVisible(true);
      setFeaturesVisible(true);
      setCtaSectionVisible(true);
    }

    return () => {
      clearTimeout(tEyebrow);
      clearTimeout(tSubtitle);
      clearTimeout(tHeadline);
      clearTimeout(tCta);
      if (charTimer) clearInterval(charTimer);
      motionQuery.removeEventListener('change', handleMotionChange);
    };
  }, [totalChars]);

  return (
    <div className="relative w-full min-h-screen bg-transparent font-['Hanken_Grotesk'] text-[#1b1c19] antialiased selection:bg-[#bfebe6] selection:text-[#00201e]">
      {/* Living WebGL Ambient Aura Shader (continuous full-page animated background) */}
      <AmbientShaderCanvas opacity={0.88} fadeOnScroll={false} />

      {/* Header - No horizontal bottom border */}
      <header className="fixed top-0 left-0 w-full z-50 bg-[#fbf9f4]/25 backdrop-blur-md transition-colors">
        <div className="h-20 w-full px-6 md:px-14 flex items-center justify-between">
          <a
            className="text-[22px] leading-[28px] font-semibold tracking-tight lowercase text-[#001126] hover:opacity-80 transition-opacity"
            href="#"
            onClick={(e) => {
              e.preventDefault();
            }}
          >
            dueflow
          </a>
          <div className="flex items-center gap-4 sm:gap-5">
            <button
              onClick={onSignInClick}
              className="text-sm font-medium text-[#44474d] hover:text-[#001126] px-3.5 py-1.5 rounded-full hover:bg-black/5 transition-all duration-200 active:scale-[0.98] cursor-pointer"
            >
              Sign in
            </button>

            {/* Profile Dropdown Menu Trigger on upper-right person icon */}
            <div
              className="relative"
              ref={profileMenuRef}
              onMouseEnter={handleProfileMouseEnter}
              onMouseLeave={handleProfileMouseLeave}
            >
              <button
                onClick={() => setIsProfileOpen((prev) => !prev)}
                className="w-8 h-8 rounded-full bg-[#001126] hover:bg-[#15263c] flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#001126]/20 border border-transparent hover:border-[#001126]/20"
                aria-label="Account menu"
                aria-expanded={isProfileOpen}
                aria-haspopup="true"
                type="button"
              >
                <span className="material-symbols-outlined text-[#ffffff] text-[18px]">person</span>
              </button>

              {/* Profile Dropdown Popup (No gap, smooth fade & slight downward slide) */}
              {isProfileOpen && (
                <div
                  className="absolute right-0 top-full pt-2 z-50 animate-in fade-in slide-in-from-top-1 duration-200"
                  role="menu"
                >
                  <div className="w-60 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-[#001126]/10 p-3">
                    {userProfile && userProfile.email ? (
                      <>
                        {/* Signed-in User State */}
                        <div className="p-3 bg-[#fbf9f4] rounded-xl border border-[#001126]/5 mb-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#001126] text-[#ffffff] flex items-center justify-center font-bold text-xs shrink-0">
                              {userProfile.fullName ? userProfile.fullName.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-[#001126] truncate">
                                {userProfile.fullName || 'User'}
                              </p>
                              <p className="font-['Space_Mono'] text-[10px] text-[#74777d] truncate">
                                {userProfile.email}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {onOpenSettings && (
                            <button
                              onClick={() => {
                                setIsProfileOpen(false);
                                onOpenSettings();
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#1b1c19] hover:bg-[#f5f3ee] rounded-lg transition-colors text-left cursor-pointer"
                              role="menuitem"
                            >
                              <span className="material-symbols-outlined text-[18px] text-[#44474d]">tune</span>
                              <span>Settings</span>
                            </button>
                          )}
                          <div className="border-t border-[#001126]/10 my-1" />
                          <button
                            onClick={() => {
                              setIsProfileOpen(false);
                              if (onSignOut) onSignOut();
                              else onSignInClick();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#ba1a1a] hover:bg-[#ffdad6]/40 rounded-lg transition-colors text-left cursor-pointer"
                            role="menuitem"
                          >
                            <span className="material-symbols-outlined text-[18px] text-[#ba1a1a]">logout</span>
                            <span>Sign out</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Signed-out Visitor State */}
                        <div className="px-3 py-2 text-xs text-[#74777d] font-medium border-b border-[#001126]/8 mb-1.5">
                          Welcome to DueFlow
                        </div>
                        <div className="space-y-1">
                          <button
                            onClick={() => {
                              setIsProfileOpen(false);
                              onSignInClick();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#001126] hover:bg-[#f5f3ee] rounded-lg transition-colors text-left cursor-pointer"
                            role="menuitem"
                          >
                            <span className="material-symbols-outlined text-[18px] text-[#44474d]">login</span>
                            <span>Sign In</span>
                          </button>
                          <button
                            onClick={() => {
                              setIsProfileOpen(false);
                              onGetStartedClick();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#ffffff] bg-[#071426] hover:bg-[#15263c] rounded-lg transition-colors text-left cursor-pointer"
                            role="menuitem"
                          >
                            <span className="material-symbols-outlined text-[18px] text-[#ffffff]">arrow_forward</span>
                            <span>Get Started</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full pt-20 bg-transparent min-h-screen relative z-10">
        {/* Hero Section */}
        <div className="flex flex-col w-full relative min-h-[calc(100vh-5rem)] justify-between overflow-hidden select-none">
          <div className="relative z-10 w-full max-w-4xl mx-auto px-6 md:px-14 py-16 md:py-28 flex flex-col items-center text-center my-auto">
            {/* Phase B: Eyebrow - Fades in 0->100% with subtle upward 8px movement */}
            <span
              className="font-['Space_Mono'] text-[10px] uppercase tracking-[0.28em] text-[#44474d]/75 mb-6 md:mb-8 inline-block transition-all duration-500 ease-out"
              style={{
                opacity: prefersReducedMotion || eyebrowVisible ? 1 : 0,
                transform: prefersReducedMotion || eyebrowVisible ? 'translateY(0px)' : 'translateY(8px)',
              }}
            >
              Invoice follow-ups, simplified
            </span>

            {/* Phase D: Hero Headline (Letter-by-letter sequential reveal, accessible to screen readers, responsive 62px desktop) */}
            <h1
              className="text-[39px] sm:text-[53px] md:text-[62px] leading-[43px] sm:leading-[57px] md:leading-[66px] font-extrabold text-[#001126] tracking-tight uppercase max-w-3xl sm:max-w-4xl text-center select-none"
              aria-label="GET PAID. WITHOUT THE CHASING."
            >
              <span className="inline-block" aria-hidden="true">
                {line1.split('').map((char, index) => {
                  const isVisible = prefersReducedMotion || index < visibleCount;
                  return (
                    <span
                      key={`l1-${index}`}
                      className="inline-block transition-all duration-300 ease-out"
                      style={{
                        opacity: isVisible ? 1 : 0,
                        transform: isVisible ? 'translateY(0px)' : 'translateY(8px)',
                      }}
                    >
                      {char === ' ' ? '\u00A0' : char}
                    </span>
                  );
                })}
              </span>
              <br className="hidden sm:inline" />{' '}
              <span className="inline-block" aria-hidden="true">
                {line2.split('').map((char, index) => {
                  const globalIndex = line1.length + index;
                  const isVisible = prefersReducedMotion || globalIndex < visibleCount;
                  return (
                    <span
                      key={`l2-${index}`}
                      className="inline-block transition-all duration-300 ease-out"
                      style={{
                        opacity: isVisible ? 1 : 0,
                        transform: isVisible ? 'translateY(0px)' : 'translateY(8px)',
                      }}
                    >
                      {char === ' ' ? '\u00A0' : char}
                    </span>
                  );
                })}
              </span>
            </h1>

            {/* Phase C: Supporting Subtitle - Fades in with subtle upward movement before headline finishes */}
            <p
              className="text-sm sm:text-base leading-[22px] text-[#44474d] max-w-md mx-auto mt-6 leading-relaxed transition-all duration-550 ease-out"
              style={{
                opacity: prefersReducedMotion || subtitleVisible ? 1 : 0,
                transform: prefersReducedMotion || subtitleVisible ? 'translateY(0px)' : 'translateY(8px)',
              }}
            >
              Create invoices, schedule reminders, and send professional follow-up emails through Gmail.
            </p>

            {/* Phase E: CTA Actions with subtle staggered reveal */}
            <div
              className="flex items-center justify-center gap-4 sm:gap-5 mt-8 md:mt-10 transition-all duration-500 ease-out"
              style={{
                opacity: prefersReducedMotion || ctaVisible ? 1 : 0,
                transform: prefersReducedMotion || ctaVisible ? 'translateY(0px)' : 'translateY(8px)',
              }}
            >
              {/* Primary Get Started button with tactile pop (no neon glow) */}
              <button
                onClick={onGetStartedClick}
                className="btn-primary-pop px-7 py-3 rounded-full text-[11px] font-semibold uppercase tracking-[0.16em] inline-flex items-center justify-center cursor-pointer select-none"
              >
                Get started
              </button>

              {/* Secondary Sign In button beside Get Started (identifiable secondary button, matched height) */}
              <button
                onClick={onSignInClick}
                className="btn-secondary-pop px-7 py-3 rounded-full text-[11px] font-semibold uppercase tracking-[0.16em] inline-flex items-center justify-center cursor-pointer select-none"
              >
                Sign in
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Three-Step Workflow - Scroll-triggered deliberate reveal (800ms duration, 160ms stagger) */}
        <section className="w-full bg-transparent" ref={cardsRef}>
          <div className="max-w-6xl mx-auto px-6 md:px-14 py-20 md:py-28">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {/* Step 01 Box - Card 1 (stagger: 0ms delay, duration 800ms, upward 20px) */}
              <div
                className="flex flex-col p-8 md:p-10 rounded-2xl backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-md cursor-default"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  opacity: prefersReducedMotion || cardsVisible ? 1 : 0,
                  transform: prefersReducedMotion || cardsVisible ? 'translateY(0px)' : 'translateY(20px)',
                  transitionDuration: '800ms',
                  transitionDelay: '0ms',
                  transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
                }}
              >
                <span className="font-['Space_Mono'] text-[10px] text-[#44474d]/75 tracking-[0.2em] mb-4">
                  01
                </span>
                <h3 className="text-[22px] leading-[28px] font-semibold text-[#001126] tracking-tight mb-3">
                  Create invoices
                </h3>
                <p className="text-sm text-[#44474d] leading-relaxed">
                  Keep client details, invoice amounts, and due dates organized in one place.
                </p>
              </div>

              {/* Step 02 Box - Card 2 (stagger: 160ms delay, duration 800ms, upward 20px) */}
              <div
                className="flex flex-col p-8 md:p-10 rounded-2xl backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-md cursor-default"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  opacity: prefersReducedMotion || cardsVisible ? 1 : 0,
                  transform: prefersReducedMotion || cardsVisible ? 'translateY(0px)' : 'translateY(20px)',
                  transitionDuration: '800ms',
                  transitionDelay: prefersReducedMotion ? '0ms' : '160ms',
                  transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
                }}
              >
                <span className="font-['Space_Mono'] text-[10px] text-[#44474d]/75 tracking-[0.2em] mb-4">
                  02
                </span>
                <h3 className="text-[22px] leading-[28px] font-semibold text-[#001126] tracking-tight mb-3">
                  Set your schedule
                </h3>
                <p className="text-sm text-[#44474d] leading-relaxed">
                  Choose when payment reminders should be sent before, on, or after the due date.
                </p>
              </div>

              {/* Step 03 Box - Card 3 (stagger: 320ms delay, duration 800ms, upward 20px) */}
              <div
                className="flex flex-col p-8 md:p-10 rounded-2xl backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-md cursor-default"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  opacity: prefersReducedMotion || cardsVisible ? 1 : 0,
                  transform: prefersReducedMotion || cardsVisible ? 'translateY(0px)' : 'translateY(20px)',
                  transitionDuration: '800ms',
                  transitionDelay: prefersReducedMotion ? '0ms' : '320ms',
                  transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
                }}
              >
                <span className="font-['Space_Mono'] text-[10px] text-[#44474d]/75 tracking-[0.2em] mb-4">
                  03
                </span>
                <h3 className="text-[22px] leading-[28px] font-semibold text-[#001126] tracking-tight mb-3">
                  Follow up automatically
                </h3>
                <p className="text-sm text-[#44474d] leading-relaxed">
                  DueFlow sends professional reminder emails through your connected Gmail account, with the invoice PDF attached.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Compact Feature Section - Deliberate reveal (800ms panel, 150ms row stagger) */}
        <section className="w-full bg-transparent" ref={featuresRef}>
          <div className="max-w-6xl mx-auto px-6 md:px-14 py-20 md:py-28">
            <div
              className="w-full p-8 sm:p-12 md:p-16 rounded-3xl backdrop-blur-sm transition-all"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                opacity: prefersReducedMotion || featuresVisible ? 1 : 0,
                transform: prefersReducedMotion || featuresVisible ? 'translateY(0px)' : 'translateY(20px)',
                transitionDuration: '800ms',
                transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}
            >
              {/* Heading revealed first (delay 80ms) */}
              <div
                className="mb-10 md:mb-14 transition-all"
                style={{
                  opacity: prefersReducedMotion || featuresVisible ? 1 : 0,
                  transform: prefersReducedMotion || featuresVisible ? 'translateY(0px)' : 'translateY(14px)',
                  transitionDuration: '650ms',
                  transitionDelay: prefersReducedMotion ? '0ms' : '80ms',
                  transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
                }}
              >
                <h2 className="text-[28px] sm:text-[38px] leading-[34px] sm:leading-[44px] font-bold text-[#001126] tracking-tight">
                  Less chasing. More time for your work.
                </h2>
              </div>

              {/* Rows revealed sequentially with ~150ms stagger */}
              <div className="flex flex-col gap-8 md:gap-9">
                {/* Feature 1 - Invoice tracking (stagger delay 230ms) */}
                <div
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-8 items-baseline transition-all"
                  style={{
                    opacity: prefersReducedMotion || featuresVisible ? 1 : 0,
                    transform: prefersReducedMotion || featuresVisible ? 'translateY(0px)' : 'translateY(14px)',
                    transitionDuration: '650ms',
                    transitionDelay: prefersReducedMotion ? '0ms' : '230ms',
                    transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
                  }}
                >
                  <div className="md:col-span-4">
                    <h3 className="text-[18px] md:text-[20px] font-semibold text-[#001126] tracking-tight">
                      Invoice tracking
                    </h3>
                  </div>
                  <div className="md:col-span-8">
                    <p className="text-sm sm:text-base text-[#44474d] leading-relaxed">
                      See which invoices are paid, outstanding, or overdue.
                    </p>
                  </div>
                </div>

                {/* Feature 2 - Personalized reminders (stagger delay 380ms) */}
                <div
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-8 items-baseline transition-all"
                  style={{
                    opacity: prefersReducedMotion || featuresVisible ? 1 : 0,
                    transform: prefersReducedMotion || featuresVisible ? 'translateY(0px)' : 'translateY(14px)',
                    transitionDuration: '650ms',
                    transitionDelay: prefersReducedMotion ? '0ms' : '380ms',
                    transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
                  }}
                >
                  <div className="md:col-span-4">
                    <h3 className="text-[18px] md:text-[20px] font-semibold text-[#001126] tracking-tight">
                      Personalized reminders
                    </h3>
                  </div>
                  <div className="md:col-span-8">
                    <p className="text-sm sm:text-base text-[#44474d] leading-relaxed">
                      Customize reminder timing and email wording to suit your clients.
                    </p>
                  </div>
                </div>

                {/* Feature 3 - Payment details, included (stagger delay 530ms) */}
                <div
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-8 items-baseline transition-all"
                  style={{
                    opacity: prefersReducedMotion || featuresVisible ? 1 : 0,
                    transform: prefersReducedMotion || featuresVisible ? 'translateY(0px)' : 'translateY(14px)',
                    transitionDuration: '650ms',
                    transitionDelay: prefersReducedMotion ? '0ms' : '530ms',
                    transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
                  }}
                >
                  <div className="md:col-span-4">
                    <h3 className="text-[18px] md:text-[20px] font-semibold text-[#001126] tracking-tight">
                      Payment details, included
                    </h3>
                  </div>
                  <div className="md:col-span-8">
                    <p className="text-sm sm:text-base text-[#44474d] leading-relaxed">
                      Add your payment instructions and QR code to help clients understand how to pay.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Final Call to Action - Scroll-triggered entrance */}
        <section className="w-full bg-transparent" ref={ctaSectionRef}>
          <div className="max-w-4xl mx-auto px-6 md:px-14 py-24 md:py-32 flex flex-col items-center text-center">
            {/* CTA Eyebrow text fades in */}
            <span
              className="font-['Space_Mono'] text-[10px] uppercase tracking-[0.28em] text-[#44474d]/75 mb-5 transition-all"
              style={{
                opacity: prefersReducedMotion || ctaSectionVisible ? 1 : 0,
                transform: prefersReducedMotion || ctaSectionVisible ? 'translateY(0px)' : 'translateY(10px)',
                transitionDuration: '500ms',
                transitionDelay: prefersReducedMotion ? '0ms' : '60ms',
                transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}
            >
              YOUR WORK. YOUR TERMS.
            </span>

            {/* Main Heading reveals with subtle upward fade */}
            <h2
              className="text-[28px] sm:text-[38px] leading-tight font-bold text-[#001126] tracking-tight uppercase mb-4 transition-all"
              style={{
                opacity: prefersReducedMotion || ctaSectionVisible ? 1 : 0,
                transform: prefersReducedMotion || ctaSectionVisible ? 'translateY(0px)' : 'translateY(14px)',
                transitionDuration: '600ms',
                transitionDelay: prefersReducedMotion ? '0ms' : '160ms',
                transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}
            >
              Get back to the work that matters.
            </h2>

            {/* Get Started button revealed after heading */}
            <div
              className="flex items-center justify-center gap-4 mt-4 transition-all"
              style={{
                opacity: prefersReducedMotion || ctaSectionVisible ? 1 : 0,
                transform: prefersReducedMotion || ctaSectionVisible ? 'translateY(0px)' : 'translateY(12px)',
                transitionDuration: '550ms',
                transitionDelay: prefersReducedMotion ? '0ms' : '280ms',
                transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}
            >
              <button
                onClick={onGetStartedClick}
                className="btn-primary-pop px-7 py-3 rounded-full text-[11px] font-semibold uppercase tracking-[0.16em] inline-flex items-center justify-center cursor-pointer select-none"
              >
                GET STARTED
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer - No horizontal divider line, 20% opacity white background */}
      <footer
        className="w-full relative z-10 py-12 transition-all"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          opacity: prefersReducedMotion || ctaSectionVisible ? 1 : 0,
          transform: prefersReducedMotion || ctaSectionVisible ? 'translateY(0px)' : 'translateY(8px)',
          transitionDuration: '600ms',
          transitionDelay: prefersReducedMotion ? '0ms' : '360ms',
          transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        <div className="w-full px-6 md:px-14 flex flex-col sm:flex-row items-center justify-end gap-4">
          <div className="flex items-center gap-6">
            <a
              className="font-['Space_Mono'] text-[10px] uppercase text-[#44474d]/75 hover:text-[#001126] transition-colors duration-200 hover:underline underline-offset-4 tracking-[0.14em]"
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy
            </a>
            <a
              className="font-['Space_Mono'] text-[10px] uppercase text-[#44474d]/75 hover:text-[#001126] transition-colors duration-200 hover:underline underline-offset-4 tracking-[0.14em]"
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
            >
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
