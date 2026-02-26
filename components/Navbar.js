'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './Navbar.module.css';

export default function Navbar() {
    const { user, profile, signOut, loading } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searching, setSearching] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const menuRef = useRef(null);
    const searchRef = useRef(null);

    const isAuthPage = ['/', '/login', '/signup'].includes(pathname);

    // Close menu on click outside
    useEffect(() => {
        const handleClick = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setSearchOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Debounced search
    const debounceRef = useRef(null);
    const handleSearchChange = useCallback((value) => {
        setSearchQuery(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (!value.trim()) {
            setSearchResults([]);
            setSearchOpen(false);
            setSearching(false);
            return;
        }

        setSearching(true);
        setSearchOpen(true);

        debounceRef.current = setTimeout(async () => {
            const q = value.trim();
            const { data } = await supabase
                .from('profiles')
                .select('id, username, display_name, avatar_url')
                .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
                .neq('id', user?.id || '')
                .limit(8);

            setSearchResults(data || []);
            setSearching(false);
        }, 300);
    }, [user]);

    // Close search on Escape
    const handleSearchKeyDown = (e) => {
        if (e.key === 'Escape') {
            setSearchOpen(false);
            e.target.blur();
        }
    };

    // Navigate to profile on result click
    const handleResultClick = (username) => {
        router.push(`/${username}`);
        setSearchQuery('');
        setSearchResults([]);
        setSearchOpen(false);
    };

    // Don't show navbar on auth pages
    if (isAuthPage) return null;

    return (
        <nav className={styles.nav}>
            <div className={styles.inner}>
                {/* Left: Logo + Nav Links */}
                <div className={styles.left}>
                    <Link href="/feed" className={styles.logo}>
                        <Image src="/favoritestar.svg" alt="Favorite" width={32} height={32} />
                    </Link>

                    {user && profile && (
                        <div className={styles.navLinks}>
                            <Link
                                href="/feed"
                                className={`${styles.navLink} ${pathname === '/feed' ? styles.active : ''}`}
                            >
                                For You
                            </Link>
                            <Link
                                href="/feed/following"
                                className={`${styles.navLink} ${pathname === '/feed/following' ? styles.active : ''}`}
                            >
                                Following
                            </Link>
                        </div>
                    )}
                </div>

                {/* Center: Search */}
                {user && profile && (
                    <div className={styles.center} ref={searchRef}>
                        <div className={styles.searchBar}>
                            <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchQuery}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                onFocus={() => { if (searchQuery.trim()) setSearchOpen(true); }}
                                onKeyDown={handleSearchKeyDown}
                                className={styles.searchInput}
                            />
                        </div>

                        {/* Search Results Dropdown */}
                        {searchOpen && (
                            <div className={styles.searchDropdown}>
                                {searching ? (
                                    <div className={styles.searchStatus}>Searching...</div>
                                ) : searchResults.length === 0 ? (
                                    <div className={styles.searchStatus}>No users found</div>
                                ) : (
                                    searchResults.map((u) => (
                                        <button
                                            key={u.id}
                                            className={styles.searchResult}
                                            onClick={() => handleResultClick(u.username)}
                                        >
                                            <div className={styles.searchAvatar}>
                                                {u.avatar_url ? (
                                                    <img src={u.avatar_url} alt={u.display_name || u.username} />
                                                ) : (
                                                    <span>{(u.display_name || u.username || '?')[0].toUpperCase()}</span>
                                                )}
                                            </div>
                                            <div className={styles.searchInfo}>
                                                <span className={styles.searchName}>{u.display_name || u.username}</span>
                                                <span className={styles.searchUsername}>@{u.username}</span>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Right: Create + Avatar */}
                <div className={styles.right}>
                    {loading ? (
                        <div className={styles.skeleton} />
                    ) : user && profile ? (
                        <>
                            <Link
                                href={`/${profile.username}/log`}
                                className={styles.createBtn}
                                onMouseEnter={(e) => e.currentTarget.textContent = 'favorite!'}
                                onMouseLeave={(e) => e.currentTarget.textContent = 'favorite'}
                            >
                                favorite
                            </Link>
                            <div className={styles.userMenu} ref={menuRef}>
                                <button
                                    className={styles.avatarBtn}
                                    onClick={() => setMenuOpen(!menuOpen)}
                                    aria-label="Menu"
                                >
                                    <div className={styles.avatar}>
                                        {profile.avatar_url ? (
                                            <img src={profile.avatar_url} alt={profile.display_name} />
                                        ) : (
                                            <span>{(profile.display_name || profile.username || '?')[0].toUpperCase()}</span>
                                        )}
                                    </div>
                                </button>
                                {menuOpen && (
                                    <div className={styles.dropdown}>
                                        <Link href={`/${profile.username}`} onClick={() => setMenuOpen(false)}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                            Profile
                                        </Link>
                                        <Link href="/settings" onClick={() => setMenuOpen(false)}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                                            Settings
                                        </Link>
                                        <div className={styles.dropdownDivider} />
                                        <button onClick={() => { signOut(); setMenuOpen(false); }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                                            Sign Out
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className={styles.authLinks}>
                            <Link href="/login" className="btn btn-secondary btn-sm">
                                Sign In
                            </Link>
                            <Link href="/signup" className="btn btn-primary btn-sm">
                                Join
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
