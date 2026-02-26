'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import styles from './landing.module.css';

const ROTATING_WORDS = ['book?', 'movie?', 'podcast?', 'album?', 'video?'];

/* ---- tiny arrow-right icon ---- */
function ArrowRight() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
    </svg>
  );
}

/* ---- scroll-triggered fade-up ---- */
function FadeUp({ children, className = '', delay = 0, ...rest }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${styles.fadeUp} ${visible ? styles.visible : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
      {...rest}
    >
      {children}
    </div>
  );
}

/* ---- Typewriter animation ---- */
function TypingWord() {
  const [wordIndex, setWordIndex] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentWord = ROTATING_WORDS[wordIndex];

    if (!isDeleting && displayed === currentWord) {
      const timeout = setTimeout(() => setIsDeleting(true), 1800);
      return () => clearTimeout(timeout);
    }

    if (isDeleting && displayed === '') {
      setIsDeleting(false);
      setWordIndex(prev => (prev + 1) % ROTATING_WORDS.length);
      return;
    }

    const speed = isDeleting ? 60 : 100;
    const timeout = setTimeout(() => {
      if (isDeleting) {
        setDisplayed(currentWord.substring(0, displayed.length - 1));
      } else {
        setDisplayed(currentWord.substring(0, displayed.length + 1));
      }
    }, speed);

    return () => clearTimeout(timeout);
  }, [displayed, isDeleting, wordIndex]);

  const longestWord = ROTATING_WORDS.reduce((a, b) => a.length > b.length ? a : b, '');

  return (
    <span className={styles.typingWrapper}>
      <span className={styles.typingHidden}>{longestWord}</span>
      <span className={styles.typingText}>
        {displayed}
        <span className={styles.typingCursor} />
      </span>
    </span>
  );
}

/* ---- Animated mock app demo (enhanced) ---- */
function MockAppDemo() {
  const [step, setStep] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [noteText, setNoteText] = useState('');

  const targetSearch = "The Social Network";
  const targetNote = "Mark Zuckerberg is such a cutie pie in this movie.";

  useEffect(() => {
    let timer;
    if (step === 0) {
      setSearchText('');
      setNoteText('');
      timer = setTimeout(() => setStep(1), 1500);
    } else if (step === 1) {
      if (searchText.length < targetSearch.length) {
        timer = setTimeout(() => setSearchText(targetSearch.slice(0, searchText.length + 1)), 60);
      } else {
        timer = setTimeout(() => setStep(2), 800);
      }
    } else if (step === 2) {
      timer = setTimeout(() => setStep(3), 1500);
    } else if (step === 3) {
      timer = setTimeout(() => setStep(4), 1800);
    } else if (step === 4) {
      if (noteText.length < targetNote.length) {
        timer = setTimeout(() => setNoteText(targetNote.slice(0, noteText.length + 1)), 40);
      } else {
        timer = setTimeout(() => setStep(5), 1000);
      }
    } else if (step === 5) {
      timer = setTimeout(() => setStep(6), 2000);
    } else if (step === 6) {
      timer = setTimeout(() => setStep(0), 500);
    }
    return () => clearTimeout(timer);
  }, [step, searchText, noteText]);

  return (
    <div className={styles.mockApp} style={{ position: 'relative' }}>
      {/* Animated Cursor */}
      <svg
        className={styles.mockCursor}
        style={{
          transform: step === 0 ? 'translate(250px, 450px)' :
            step === 1 ? 'translate(180px, 50px)' :
              step === 2 ? 'translate(220px, 120px)' :
                step === 3 ? 'translate(210px, 180px)' :
                  step === 4 ? 'translate(140px, 240px)' :
                    step === 5 ? 'translate(415px, 320px)' :
                      'translate(250px, 450px)',
          opacity: step === 6 ? 0 : 1
        }}
        width="24" height="24" viewBox="0 0 24 24"
      >
        <path fill="#fff" stroke="#000" strokeWidth="1.5" strokeLinejoin="round" d="M4 2l6.83 18.06 2.68-7.9 7.9-2.68L4 2z" />
      </svg>

      {/* Search bar */}
      <div className={`${styles.mockSearchBar} ${step >= 1 && step < 5 ? styles.mockSearchBarActive : ''} ${step >= 5 ? styles.mockSearchBarDone : ''}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
        <span className={styles.mockSearchText}>
          {step === 0 && <span className={styles.mockPlaceholder}>Search for a favorite...</span>}
          {step >= 1 && (
            <span className={styles.mockTyping}>
              {searchText}
              {step === 1 && <span className={styles.typingCursor} />}
            </span>
          )}
        </span>
      </div>

      {/* Result card */}
      <div className={`${styles.mockResult} ${step >= 2 ? styles.mockResultVisible : ''}`}>
        <div className={`${styles.mockPoster} ${step >= 2 ? styles.mockPosterPop : ''}`} style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
          <Image src="/thesocialnetwork.jpg" alt="The Social Network" fill style={{ objectFit: 'cover' }} sizes="(max-width: 768px) 100vw, 50vw" priority />
        </div>
        <div className={styles.mockResultInfo}>
          <span className={styles.mockResultTitle}>The Social Network</span>
          <span className={styles.mockResultMeta}>2010 · Movie</span>
        </div>
        {step >= 2 && step < 5 && (
          <span className={styles.mockSelectBadge}>Selected</span>
        )}
        {step >= 5 && (
          <span className={styles.mockSavedBadge}>✓ Saved</span>
        )}
      </div>

      {/* Rating */}
      <div className={`${styles.mockRating} ${step >= 3 ? styles.mockRatingVisible : ''}`}>
        <span className={styles.mockRatingLabel}>Your rating</span>
        <div className={styles.mockStars}>
          {[1, 2, 3, 4, 5].map(i => (
            <span key={i} className={`${styles.mockStar} ${step >= 3 && i <= 5 ? styles.mockStarFilled : ''}`}
              style={{ transitionDelay: step >= 3 ? `${i * 120}ms` : '0ms' }}>
              ★
            </span>
          ))}
        </div>
      </div>

      {/* Note */}
      <div className={`${styles.mockNote} ${step >= 4 ? styles.mockNoteVisible : ''}`}>
        <span className={styles.mockNoteLabel}>Your thoughts</span>
        <div className={styles.mockNoteField}>
          {step >= 4 && (
            <span className={styles.mockNoteText}>
              {noteText}
              {step === 4 && <span className={styles.typingCursor} />}
            </span>
          )}
        </div>
      </div>

      {/* Save Button (Moved to bottom) */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', opacity: step >= 4 ? 1 : 0, transform: step >= 4 ? 'translateY(0)' : 'translateY(12px)', transition: 'all 0.5s ease' }}>
        <span className={styles.windowBtnAccent} style={{
          transform: step >= 5 ? 'scale(0.96)' : 'scale(1)',
          opacity: step >= 5 ? 0.8 : 1,
          transition: 'all 0.15s ease'
        }}>Save</span>
      </div>

      {/* Success overlay flash */}
      <div className={`${styles.mockSuccessFlash} ${step >= 5 ? styles.mockSuccessFlashVisible : ''}`} />
    </div>
  );
}

export default function Home() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && profile) {
      router.replace('/feed');
    }
  }, [user, profile, loading, router]);

  if (loading) {
    return (
      <div className={styles.landingPage} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
      </div>
    );
  }

  if (user && profile) return null;

  return (
    <div className={styles.landingPage}>

      {/* ===== Floating pill nav ===== */}
      <nav className={styles.pillNav}>
        <div className={styles.pillNavInner}>
          <Link href="/" className={styles.pillLogo}>
            <Image src="/favoritestar.svg" alt="Favorite" width={24} height={24} className={styles.logoImg} />
          </Link>

          <ul className={styles.pillLinks}>
            <li><Link href="/feed" className={styles.pillLink}>Explore</Link></li>
          </ul>

          <Link href="/signup" className={styles.pillCta}>
            Sign up <ArrowRight />
          </Link>
        </div>
      </nav>

      {/* ===== Hero ===== */}
      <section>
        <header className={styles.hero}>
          <h2 className={styles.heroLabel}>
            <span className={styles.heroLine1}>What&apos;s your</span>
            <span className={styles.heroLine2}>favorite <TypingWord /></span>
          </h2>
          <p className={styles.heroSub}>
            Favorite is your personal library of your media.<br />
            Rate movies. Archive albums. Follow friends.<br />
            Get weekly recommendations.
          </p>
          <div className={styles.heroCtas}>
            <Link href="/signup" className={styles.ctaPrimary}>
              Create account <ArrowRight />
            </Link>
            <Link href="/login" className={styles.ctaSecondary}>
              Sign in
            </Link>
          </div>
        </header>

        {/* Hero mock window with animated demo */}
        <div className={styles.heroWindow}>
          <div className={styles.window} style={{ minHeight: 420, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <MockAppDemo />
          </div>
        </div>
      </section>

      {/* ===== Feature: Personal + Categories ===== */}
      <section className={styles.featureSection}>
        <div className={styles.featureInner}>
          <FadeUp>
            <div className={styles.featureText} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

              <Image src="/favoritestar.svg" alt="Favorite" width={64} height={64} className={styles.footerLogo} />
              <h2 className={styles.footerHeading} style={{ margin: '24px 0', fontSize: 'clamp(2rem, 5vw, 3rem)', lineHeight: 1.1 }}>
                <span>Your taste,</span>{' '}
                <span>beautifully archived.</span>
              </h2>
              <Link href="/signup" className={styles.featureCta}>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" /><path d="M12 5v14" />
                </svg>
                Start logging
              </Link>
            </div>
          </FadeUp>


        </div>
      </section>

      {/* ===== Footer CTA ===== */}
      <section>
        <FadeUp>
          <footer className={styles.footerCta} style={{ paddingTop: '64px', paddingBottom: '64px' }}>
            <div className={styles.footerLinks}>
              <a href="https://abdulmir.com/" target="_blank" rel="noreferrer">Made by Abdul Mir</a>
              <span className={styles.footerDot}>•</span>
              <a href="mailto:builtbyabdul@gmail.com">Contact</a>
            </div>
          </footer>
        </FadeUp>
      </section>
    </div>
  );
}
