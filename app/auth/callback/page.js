'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
    const router = useRouter();
    const [error, setError] = useState('');

    useEffect(() => {
        const handleAuth = async () => {
            const params = new URLSearchParams(window.location.search);
            const token_hash = params.get('token_hash');
            const type = params.get('type');

            if (token_hash && type) {
                const { error } = await supabase.auth.verifyOtp({ token_hash, type });
                if (!error) {
                    router.replace('/feed');
                    return;
                }
                setError(error.message);
                return;
            }

            // Fallback: check if detectSessionInUrl already picked up hash tokens
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                router.replace('/feed');
            } else {
                router.replace('/login');
            }
        };

        handleAuth();
    }, [router]);

    if (error) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', gap: '16px' }}>
                <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
                <a href="/signup" style={{ color: 'var(--accent)' }}>Try signing up again</a>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
            <p style={{ color: 'var(--text-secondary)' }}>Confirming your email...</p>
        </div>
    );
}
