'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import ImageSlideshow from '@/components/ImageSlideshow';
import styles from '../login/auth.module.css';

export default function SignUpPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const { user, profile, signUp, loading: authLoading } = useAuth();
    const router = useRouter();

    // Redirect if already signed in
    useEffect(() => {
        if (!authLoading && user && profile) {
            router.replace('/feed');
        }
    }, [user, profile, authLoading, router]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (username.length < 3) {
            setError('Username must be at least 3 characters');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        const { error: signUpError } = await signUp(email, password, username.toLowerCase(), displayName);
        if (signUpError) {
            setError(signUpError.message);
            setLoading(false);
        } else {
            setEmailSent(true);
            setLoading(false);
        }
    };

    if (authLoading || (user && profile)) {
        return <div className={styles.page}><div className={styles.formPanel}><div className={styles.card}><p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</p></div></div></div>;
    }

    // Email confirmation screen
    if (emailSent) {
        return (
            <div className={styles.page}>
                <ImageSlideshow />
                <div className={styles.formPanel}>
                    <div className={styles.card}>
                        <div className={styles.logoMark}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="4" width="20" height="16" rx="2" />
                                <path d="M22 4L12 13L2 4" />
                            </svg>
                        </div>
                        <h1 className={styles.title}>Check your email</h1>
                        <p className={styles.subtitle} style={{ lineHeight: 1.6 }}>
                            We sent a confirmation link to<br />
                            <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>
                        </p>
                        <p className={styles.subtitle} style={{ marginTop: '12px', fontSize: '13px' }}>
                            Click the link in the email to activate your account, then come back and sign in.
                        </p>
                        <Link
                            href="/login"
                            className="btn btn-primary"
                            style={{ width: '100%', height: '48px', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '24px' }}
                        >
                            Go to Sign In
                        </Link>
                        <p className={styles.switch} style={{ marginTop: '16px' }}>
                            Didn&apos;t get it? Check your spam folder.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            {/* Left: Rotating Images */}
            <ImageSlideshow />

            {/* Right: Form Panel */}
            <div className={styles.formPanel}>
                <div className={styles.card}>
                    <div className={styles.logoMark}>
                        <Image src="/favoritestar.svg" alt="Favorite" width={32} height={32} />
                    </div>
                    <h1 className={styles.title}>Create your archive</h1>
                    <p className={styles.subtitle}>Start curating your favorite art</p>

                    {error && <div className={styles.error}>{error}</div>}

                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.field}>
                            <label htmlFor="displayName">Full name</label>
                            <input
                                id="displayName"
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="John Doe"
                                required
                            />
                        </div>
                        <div className={styles.field}>
                            <label htmlFor="username">Username</label>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                placeholder="johndoe"
                                required
                            />
                        </div>
                        <div className={styles.field}>
                            <label htmlFor="email">Email</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                            />
                        </div>
                        <div className={styles.field}>
                            <label htmlFor="password">Password</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                minLength={6}
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', height: '48px', fontSize: '15px' }}>
                            {loading ? 'Creating account...' : 'Create Account'}
                        </button>
                    </form>

                    <p className={styles.switch}>
                        Already have an account? <Link href="/login">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
