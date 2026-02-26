'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import ImageSlideshow from '@/components/ImageSlideshow';
import styles from './auth.module.css';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { user, profile, signIn, loading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => { document.title = 'favorite/login'; }, []);

    // Redirect if already signed in
    useEffect(() => {
        if (!authLoading && user && profile) {
            router.replace('/feed');
        }
    }, [user, profile, authLoading, router]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const { data, error: signInError } = await signIn(email, password);
        if (signInError) {
            setError(signInError.message);
            setLoading(false);
        }
    };

    if (authLoading || (user && profile)) {
        return <div className={styles.page}><div className={styles.formPanel}><div className={styles.card}><p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</p></div></div></div>;
    }

    return (
        <div className={styles.page}>
            {/* Left: Image Slideshow */}
            <ImageSlideshow />

            {/* Right: Form Panel */}
            <div className={styles.formPanel}>
                <div className={styles.card}>
                    <div className={styles.logoMark}>
                        <Image src="/favoritestar.svg" alt="Favorite" width={32} height={32} />
                    </div>
                    <h1 className={styles.title}>Welcome back</h1>
                    <p className={styles.subtitle}>Sign in to your archive</p>

                    {error && <div className={styles.error}>{error}</div>}

                    <form onSubmit={handleSubmit} className={styles.form}>
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
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', height: '48px', fontSize: '15px' }}>
                            {loading ? 'Signing in...' : 'Log in'}
                        </button>
                    </form>

                    <p className={styles.switch}>
                        Don&apos;t have an account? <Link href="/signup">Create one</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
