'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import MediaCard from '@/components/MediaCard';
import FollowModal from '@/components/FollowModal';
import styles from './profile.module.css';

const CATEGORIES = [
    { key: 'all', label: 'All' },
    { key: 'movie', label: 'Movies/TV' },
    { key: 'video', label: 'Videos' },
    { key: 'book', label: 'Books' },
    { key: 'album', label: 'Albums' },
    { key: 'podcast', label: 'Podcasts' },
    { key: 'blog', label: 'Other' },
];

const CATEGORY_EMOJIS = {
    movie: '🎬', album: '💿', book: '📖', podcast: '🎙️',
    blog: '✍️', idea: '💡', video: '📺',
};

const CATEGORY_LABELS = {
    movie: 'MOVIES/TV', album: 'ALBUM', book: 'BOOK', podcast: 'PODCAST',
    blog: 'BLOG', idea: 'IDEA', video: 'VIDEO',
};

function generateCanvasPositions(count) {
    const positions = [];
    const cols = Math.ceil(Math.sqrt(count * 1.8));
    const cellW = 180;
    const cellH = 220;
    const padding = 60;

    // Golden ratio for natural pseudo-random jitter
    const phi = 1.618033988749;

    for (let i = 0; i < count; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);

        // Honeycomb offset: odd rows shift right by half a cell
        const offsetX = row % 2 === 1 ? cellW * 0.5 : 0;

        // Gentle, organic jitter using golden ratio sequences
        const jitterX = ((((i * phi) % 1) - 0.5) * 2) * 20;
        const jitterY = ((((i * phi * phi) % 1) - 0.5) * 2) * 18;

        // Slight rotation-like variance in spacing
        const breathX = Math.sin(i * 0.8) * 10;
        const breathY = Math.cos(i * 1.1) * 8;

        positions.push({
            x: col * cellW + offsetX + jitterX + breathX + padding,
            y: row * cellH + jitterY + breathY + padding,
        });
    }
    return positions;
}


export default function ProfilePage() {
    const params = useParams();
    const { user, profile: myProfile } = useAuth();
    const [profileUser, setProfileUser] = useState(null);
    const [entries, setEntries] = useState([]);
    const [activeCategory, setActiveCategory] = useState('all');
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [categoryCounts, setCategoryCounts] = useState({});

    useEffect(() => { document.title = `favorite/${params.username}`; }, [params.username]);

    const [viewMode, setViewMode] = useState('canvas');
    const [sortBy, setSortBy] = useState('date-desc');

    const [isFollowModalOpen, setIsFollowModalOpen] = useState(false);
    const [followModalTab, setFollowModalTab] = useState('followers');

    // Cursor bubble state (canvas only)
    const [hoveredEntry, setHoveredEntry] = useState(null);
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

    // Canvas state
    const canvasRef = useRef(null);
    const tabBarRef = useRef(null);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [startOffset, setStartOffset] = useState({ x: 0, y: 0 });
    const [canvasScrollEnabled, setCanvasScrollEnabled] = useState(true);

    // Favorite button hover state
    const [favHover, setFavHover] = useState(false);
    const [favHover2, setFavHover2] = useState(false);

    const isOwnProfile = user && profileUser && user.id === profileUser.id;

    useEffect(() => {
        fetchProfile();
    }, [params.username]);

    useEffect(() => {
        if (profileUser) {
            fetchEntries();
            fetchFollowData();
        }
    }, [profileUser, activeCategory]);

    useEffect(() => {
        if (activeCategory === 'all') {
            setViewMode('canvas');
        } else {
            if (viewMode === 'canvas') setViewMode('gallery');
        }
        setPanOffset({ x: 0, y: 0 });

        // Scroll to tab bar so content is visible when switching categories
        if (tabBarRef.current) {
            setTimeout(() => {
                tabBarRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 50);
        }
    }, [activeCategory]);

    // Trackpad panning — only when toggle is on
    useEffect(() => {
        const el = canvasRef.current;
        if (!el || !canvasScrollEnabled) return;

        const handleWheel = (e) => {
            e.preventDefault();
            setPanOffset((prev) => ({
                x: prev.x - e.deltaX,
                y: prev.y - e.deltaY,
            }));
        };

        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, [viewMode, activeCategory, canvasScrollEnabled]);

    const fetchProfile = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('username', params.username)
            .single();
        setProfileUser(data);
        if (!data) setLoading(false);
    };

    const fetchEntries = async () => {
        setLoading(true);
        let query = supabase
            .from('media_entries')
            .select('*')
            .eq('user_id', profileUser.id)
            .order('created_at', { ascending: false });

        if (activeCategory !== 'all') {
            query = query.eq('category', activeCategory);
        }

        const { data } = await query;
        setEntries(data || []);

        const { data: allEntries } = await supabase
            .from('media_entries')
            .select('category')
            .eq('user_id', profileUser.id);

        const counts = {};
        (allEntries || []).forEach((e) => {
            counts[e.category] = (counts[e.category] || 0) + 1;
        });
        setCategoryCounts(counts);
        setLoading(false);
    };

    const fetchFollowData = async () => {
        const { count: followers } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', profileUser.id);

        const { count: following } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', profileUser.id);

        setFollowerCount(followers || 0);
        setFollowingCount(following || 0);

        if (user && user.id !== profileUser.id) {
            const { data } = await supabase
                .from('follows')
                .select('id')
                .eq('follower_id', user.id)
                .eq('following_id', profileUser.id)
                .single();
            setIsFollowing(!!data);
        }
    };

    const handleFollow = async () => {
        if (!user) return;
        if (isFollowing) {
            await supabase.from('follows').delete()
                .eq('follower_id', user.id)
                .eq('following_id', profileUser.id);
            setIsFollowing(false);
            setFollowerCount((c) => c - 1);
        } else {
            await supabase.from('follows')
                .insert({ follower_id: user.id, following_id: profileUser.id });
            setIsFollowing(true);
            setFollowerCount((c) => c + 1);
        }
    };

    const handleHoverStart = useCallback((entry) => setHoveredEntry(entry), []);
    const handleHoverEnd = useCallback(() => setHoveredEntry(null), []);
    const handleHoverMove = useCallback((x, y) => setCursorPos({ x, y }), []);

    const handleCanvasMouseDown = (e) => {
        if (e.target.closest('a')) return;
        setIsPanning(true);
        setPanStart({ x: e.clientX, y: e.clientY });
        setStartOffset({ ...panOffset });
    };
    const handleCanvasMouseMove = (e) => {
        if (!isPanning) return;
        setPanOffset({
            x: startOffset.x + (e.clientX - panStart.x),
            y: startOffset.y + (e.clientY - panStart.y),
        });
    };
    const handleCanvasMouseUp = () => setIsPanning(false);

    const sortedEntries = [...entries].sort((a, b) => {
        switch (sortBy) {
            case 'date-asc': return new Date(a.created_at) - new Date(b.created_at);
            case 'date-desc': return new Date(b.created_at) - new Date(a.created_at);
            case 'rating-desc': return (b.rating || 0) - (a.rating || 0);
            case 'rating-asc': return (a.rating || 0) - (b.rating || 0);
            default: return 0;
        }
    });

    if (!profileUser && !loading) {
        return (
            <div className={styles.notFound}>
                <h1>User not found</h1>
                <p>The profile you&apos;re looking for doesn&apos;t exist.</p>
            </div>
        );
    }

    if (!profileUser) {
        return <div className={styles.loading}><div className="skeleton" style={{ width: '100%', height: '200px' }} /></div>;
    }

    const totalEntries = Object.values(categoryCounts).reduce((a, b) => a + b, 0);
    const canvasPositions = generateCanvasPositions(sortedEntries.length);
    const canShowCanvas = activeCategory === 'all';

    return (
        <div className={styles.page}>
            {profileUser.banner_url && (
                <div className={styles.banner}>
                    <Image src={profileUser.banner_url} alt="Profile Banner" fill className={styles.bannerImg} style={{ objectFit: 'cover' }} priority />
                </div>
            )}

            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.avatar}>
                        {profileUser.avatar_url ? (
                            <Image src={profileUser.avatar_url} alt={profileUser.display_name} fill style={{ objectFit: 'cover' }} priority />
                        ) : (
                            <span>{(profileUser.display_name || profileUser.username || '?')[0].toUpperCase()}</span>
                        )}
                    </div>
                    <div className={styles.nameBlock}>
                        <h1 className={styles.displayName}>{profileUser.display_name || profileUser.username}</h1>
                        <p className={styles.username}>@{profileUser.username}</p>
                    </div>
                </div>

                <div className={styles.headerRight}>
                    <div className={styles.stat} onClick={() => { setFollowModalTab('followers'); setIsFollowModalOpen(true); }} style={{ cursor: 'pointer' }}>
                        <span className={styles.statNumber}>{String(followerCount).padStart(2, '0')}</span>
                        <span className={styles.statLabel}>Follower{followerCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className={styles.stat} onClick={() => { setFollowModalTab('following'); setIsFollowModalOpen(true); }} style={{ cursor: 'pointer' }}>
                        <span className={styles.statNumber}>{String(followingCount).padStart(2, '0')}</span>
                        <span className={styles.statLabel}>Following</span>
                    </div>

                    {/* Favorite button under stats */}
                    {isOwnProfile && (
                        <Link
                            href={`/${profileUser.username}/log`}
                            className={styles.favBtn}
                            onMouseEnter={() => setFavHover(true)}
                            onMouseLeave={() => setFavHover(false)}
                        >
                            {favHover ? 'favorite!' : 'favorite'}
                        </Link>
                    )}
                </div>
            </header>

            {/* Bio + Actions row */}
            <div className={styles.bioRow}>
                <div className={styles.bioContent}>
                    {profileUser.bio && <p className={styles.bio}>{profileUser.bio}</p>}
                    {profileUser.website && (
                        <a href={profileUser.website.startsWith('http') ? profileUser.website : `https://${profileUser.website}`} target="_blank" rel="noopener noreferrer" className={styles.website}>
                            {profileUser.website.replace(/^https?:\/\//, '')}
                        </a>
                    )}
                    <div className={styles.actions}>
                        {isOwnProfile ? (
                            <Link href="/settings" className={styles.actionBtn}>Edit Profile</Link>
                        ) : user ? (
                            <button
                                className={`${styles.actionBtn} ${isFollowing ? styles.actionBtnActive : ''}`}
                                onClick={handleFollow}
                            >
                                {isFollowing ? 'Following' : 'Follow'}
                            </button>
                        ) : null}
                        {profileUser.instagram_url && (
                            <a href={profileUser.instagram_url} target="_blank" rel="noopener noreferrer" className={styles.socialBtn}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                            </a>
                        )}
                        {profileUser.twitter_url && (
                            <a href={profileUser.twitter_url} target="_blank" rel="noopener noreferrer" className={styles.socialBtn}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                            </a>
                        )}
                        {profileUser.spotify_url && (
                            <a href={profileUser.spotify_url} target="_blank" rel="noopener noreferrer" className={styles.socialBtn}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" /></svg>
                            </a>
                        )}
                        {profileUser.pinterest_url && (
                            <a href={profileUser.pinterest_url} target="_blank" rel="noopener noreferrer" className={styles.socialBtn}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0a12 12 0 0 0-4.373 23.178c-.07-.94-.134-2.397.028-3.428.147-.932.948-3.958.948-3.958s-.242-.484-.242-1.2c0-1.123.652-1.963 1.462-1.963.69 0 1.023.518 1.023 1.138 0 .694-.441 1.73-.669 2.692-.19.804.403 1.46 1.197 1.46 1.436 0 2.54-1.514 2.54-3.698 0-1.934-1.39-3.286-3.375-3.286-2.299 0-3.649 1.724-3.649 3.507 0 .694.267 1.438.601 1.843.066.08.076.15.056.231-.061.256-.198.804-.225.916-.035.148-.116.179-.268.108-1-.465-1.624-1.926-1.624-3.1 0-2.524 1.834-4.84 5.286-4.84 2.775 0 4.932 1.977 4.932 4.62 0 2.757-1.739 4.976-4.151 4.976-.81 0-1.573-.421-1.834-.919l-.498 1.902c-.181.695-.669 1.566-.995 2.097A12 12 0 1 0 12 0z" /></svg>
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs + View/Sort Controls */}
            <div className={styles.tabBar} ref={tabBarRef}>
                <div className={styles.tabCenter}>
                    {(() => {
                        const sortedCategories = [
                            ...CATEGORIES.filter(c => c.key === activeCategory),
                            ...CATEGORIES.filter(c => c.key !== activeCategory)
                        ];

                        return sortedCategories.map((cat) => {
                            const count = cat.key === 'all' ? totalEntries : (categoryCounts[cat.key] || 0);
                            if (cat.key !== 'all' && count === 0) return null;
                            return (
                                <button
                                    key={cat.key}
                                    className={`${styles.tab} ${activeCategory === cat.key ? styles.tabActive : ''}`}
                                    onClick={() => setActiveCategory(cat.key)}
                                >
                                    {cat.label}
                                    <span className={styles.tabCount}>{count}</span>
                                </button>
                            );
                        });
                    })()}
                </div>

                <div className={styles.viewControls}>
                    <select
                        className={styles.sortSelect}
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option value="date-desc">Newest</option>
                        <option value="date-asc">Oldest</option>
                        <option value="rating-desc">Highest Rated</option>
                        <option value="rating-asc">Lowest Rated</option>
                    </select>
                    <div className={styles.viewToggle}>
                        {canShowCanvas && (
                            <button
                                className={`${styles.viewBtn} ${viewMode === 'canvas' ? styles.viewBtnActive : ''}`}
                                onClick={() => setViewMode('canvas')}
                                aria-label="Canvas view"
                                title="Infinite canvas"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="6" r="3" /><circle cx="18" cy="8" r="3" /><circle cx="10" cy="18" r="3" /><circle cx="20" cy="18" r="2" /></svg>
                            </button>
                        )}
                        <button
                            className={`${styles.viewBtn} ${viewMode === 'gallery' ? styles.viewBtnActive : ''}`}
                            onClick={() => setViewMode('gallery')}
                            aria-label="Gallery view"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
                        </button>
                        <button
                            className={`${styles.viewBtn} ${viewMode === 'list' ? styles.viewBtnActive : ''}`}
                            onClick={() => setViewMode('list')}
                            aria-label="List view"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            {viewMode === 'canvas' && canShowCanvas ? (
                <div
                    ref={canvasRef}
                    className={styles.canvasViewport}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                    style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
                >
                    {/* Scroll toggle */}
                    <button
                        className={styles.scrollToggle}
                        onClick={() => setCanvasScrollEnabled(!canvasScrollEnabled)}
                        title={canvasScrollEnabled ? 'Trackpad controls canvas — click to use page scroll' : 'Trackpad scrolls page — click to control canvas'}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            {canvasScrollEnabled ? (
                                <><rect x="6" y="3" width="12" height="18" rx="6" /><line x1="12" y1="7" x2="12" y2="11" /></>
                            ) : (
                                <><rect x="6" y="3" width="12" height="18" rx="6" /><line x1="12" y1="13" x2="12" y2="17" /></>
                            )}
                        </svg>
                        <span>{canvasScrollEnabled ? 'Canvas' : 'Page'}</span>
                    </button>

                    <div
                        className={styles.canvasInner}
                        style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px)` }}
                    >
                        {sortedEntries.map((entry, i) => {
                            const pos = canvasPositions[i];
                            if (!pos) return null;

                            const destinationUrl = `/${profileUser.username}/entry/${entry.id}`;
                            const linkProps = { href: destinationUrl };

                            return (
                                <div
                                    key={entry.id}
                                    className={styles.canvasItem}
                                    style={{
                                        left: pos.x,
                                        top: pos.y,
                                        width: (entry.category === 'movie' || entry.category === 'book') ? '106px' : '128px'
                                    }}
                                    onMouseEnter={() => handleHoverStart(entry)}
                                    onMouseLeave={handleHoverEnd}
                                    onMouseMove={(e) => handleHoverMove(e.clientX, e.clientY)}
                                >
                                    <Link {...linkProps} className={styles.canvasCard} data-category={entry.category}>
                                        {entry.cover_image_url ? (
                                            <Image
                                                src={entry.cover_image_url}
                                                alt={entry.title}
                                                fill
                                                style={{
                                                    objectFit: 'cover',
                                                }}
                                                unoptimized
                                            />
                                        ) : (
                                            <div className={styles.canvasPlaceholder}>
                                                {CATEGORY_EMOJIS[entry.category] || '📺'}
                                            </div>
                                        )}
                                        <div className={styles.canvasLabel}>
                                            <span>{entry.title}</span>
                                        </div>
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className={styles.content}>
                    {sortedEntries.length === 0 && !loading ? (
                        <div className={styles.empty}>
                            <p>{isOwnProfile ? 'Your archive is empty. Start logging your favorites!' : 'No entries yet.'}</p>
                            {isOwnProfile && (
                                <Link href={`/${profileUser.username}/log`} className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }}>
                                    Log Your First Entry
                                </Link>
                            )}
                        </div>
                    ) : viewMode === 'list' ? (
                        <div className={styles.listView}>
                            {sortedEntries.map((entry) => (
                                <MediaCard key={entry.id} entry={entry} username={profileUser.username} viewMode="list" />
                            ))}
                        </div>
                    ) : (
                        <div className={activeCategory === 'all' ? styles.masonry : styles.grid}>
                            {sortedEntries.map((entry) => (
                                <MediaCard key={entry.id} entry={entry} username={profileUser.username} viewMode="gallery" />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Bubble tooltip — canvas only */}
            {hoveredEntry && viewMode === 'canvas' && (
                <div
                    className={styles.cursorBubble}
                    style={{ left: cursorPos.x + 16, top: cursorPos.y + 20 }}
                >
                    <h4 className={styles.bubbleTitle}>{hoveredEntry.title}</h4>
                    {hoveredEntry.notes && (
                        <p className={styles.bubbleThoughts}>{hoveredEntry.notes}</p>
                    )}
                    <span className={styles.bubbleCategory}>
                        {CATEGORY_LABELS[hoveredEntry.category]} {CATEGORY_EMOJIS[hoveredEntry.category]}
                    </span>
                </div>
            )}

            <FollowModal
                isOpen={isFollowModalOpen}
                onClose={() => setIsFollowModalOpen(false)}
                initialTab={followModalTab}
                profileUserId={profileUser?.id}
            />
        </div>
    );
}
