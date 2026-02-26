'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import styles from './Sidebar.module.css';

export default function Sidebar() {
    const { user, profile, signOut, loading } = useAuth();
    const pathname = usePathname();

    // Don't show sidebar on landing, login, signup pages
    const hideSidebar = !user || ['/', '/login', '/signup'].includes(pathname);

    if (loading || hideSidebar) return null;

    return (
        <aside className={styles.sidebar}>
            <div className={styles.top}>
                {/* Logo */}
                <Link href="/feed" className={styles.logo}>
                    <span className={styles.logoIcon}>✦</span>
                    <span className={styles.logoText}>favorite</span>
                </Link>

                {/* Nav Links */}
                <nav className={styles.nav}>
                    <Link
                        href="/feed"
                        className={`${styles.navLink} ${pathname === '/feed' ? styles.active : ''}`}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                        <span>For You</span>
                    </Link>
                    <Link
                        href="/feed/following"
                        className={`${styles.navLink} ${pathname === '/feed/following' ? styles.active : ''}`}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                        <span>Following</span>
                    </Link>
                    {profile && (
                        <Link
                            href={`/${profile.username}`}
                            className={`${styles.navLink} ${pathname === `/${profile.username}` ? styles.active : ''}`}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                            <span>Profile</span>
                        </Link>
                    )}
                    <Link
                        href="/settings"
                        className={`${styles.navLink} ${pathname === '/settings' ? styles.active : ''}`}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                        <span>Settings</span>
                    </Link>
                </nav>
            </div>

            {/* Bottom: Create + User */}
            <div className={styles.bottom}>
                {profile && (
                    <Link href={`/${profile.username}/log`} className={styles.createBtn}>
                        + Create
                    </Link>
                )}
                <div className={styles.userBlock}>
                    {profile && (
                        <Link href={`/${profile.username}`} className={styles.userInfo}>
                            <div className={styles.avatar}>
                                {profile.avatar_url ? (
                                    <img src={profile.avatar_url} alt={profile.display_name} />
                                ) : (
                                    <span>{(profile.display_name || profile.username || '?')[0].toUpperCase()}</span>
                                )}
                            </div>
                            <div className={styles.userName}>
                                <span className={styles.displayName}>{profile.display_name || profile.username}</span>
                                <span className={styles.handle}>@{profile.username}</span>
                            </div>
                        </Link>
                    )}
                    <button className={styles.signOutBtn} onClick={signOut} title="Sign out">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                    </button>
                </div>
            </div>
        </aside>
    );
}
