'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import styles from './feed.module.css';

export default function FeedLayout({ children }) {
    const { user, profile, loading } = useAuth();
    const pathname = usePathname();

    if (loading) {
        return (
            <div className={styles.page}>
                <div className={styles.container}>
                    <div className="skeleton" style={{ width: '100%', height: '400px' }} />
                </div>
            </div>
        );
    }

    if (!user || !profile) {
        return null;
    }

    return (
        <div className={styles.page}>
            {children}
        </div>
    );
}
