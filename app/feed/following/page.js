'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import StarRating from '@/components/StarRating';
import styles from '../feed.module.css';

const CATEGORY_ICONS = {
    movie: '🎬', album: '💿', book: '📖', podcast: '🎙️',
    blog: '✍️', idea: '💡', video: '📺',
};

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function FollowingPage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const [entries, setEntries] = useState([]);
    const [suggested, setSuggested] = useState([]);
    const [loadingFeed, setLoadingFeed] = useState(true);

    useEffect(() => { document.title = 'favorite/following'; }, []);

    useEffect(() => {
        if (!loading && !user) {
            router.replace('/');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            fetchFollowing();
            fetchSuggested();
        }
    }, [user]);

    const fetchFollowing = async () => {
        const { data: follows } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', user.id);

        const followingIds = (follows || []).map((f) => f.following_id);

        if (followingIds.length === 0) {
            setEntries([]);
            setLoadingFeed(false);
            return;
        }

        const { data } = await supabase
            .from('media_entries')
            .select('*, profiles!inner(username, display_name, avatar_url)')
            .in('user_id', followingIds)
            .order('created_at', { ascending: false })
            .limit(50);

        setEntries(data || []);
        setLoadingFeed(false);
    };

    const fetchSuggested = async () => {
        // Get some users with the most entries that the current user is NOT following
        const { data: follows } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', user.id);

        const followingIds = (follows || []).map((f) => f.following_id);
        followingIds.push(user.id);

        const { data: users } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .not('id', 'in', `(${followingIds.join(',')})`)
            .limit(5);

        setSuggested(users || []);
    };

    const handleFollow = async (userId) => {
        await supabase.from('follows').insert({ follower_id: user.id, following_id: userId });
        setSuggested((prev) => prev.filter((u) => u.id !== userId));
    };

    if (loading || !user) return null;

    return (
        <div className={styles.followingLayout}>
            <div className={styles.feedMain}>
                {loadingFeed ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="skeleton" style={{ width: '100%', height: '160px', borderRadius: '12px' }} />
                        ))}
                    </div>
                ) : entries.length === 0 ? (
                    <div className={styles.empty}>
                        <h2>See what others are loving</h2>
                        <p>Follow people to see their latest entries in your feed.</p>
                    </div>
                ) : (
                    <div className={styles.feedList}>
                        {entries.map((entry) => (
                            <FeedItem key={entry.id} entry={entry} />
                        ))}
                    </div>
                )}
            </div>

            {/* Sidebar with suggested users */}
            {suggested.length > 0 && (
                <div className={styles.feedSidebar}>
                    <div className={styles.sidebarCard}>
                        <h3 className={styles.sidebarTitle}>Suggested for you</h3>
                        {suggested.map((u) => (
                            <div key={u.id} className={styles.suggestedUser}>
                                <Link href={`/${u.username}`} className={styles.feedAvatar}>
                                    {u.avatar_url ? (
                                        <Image src={u.avatar_url} alt={u.display_name} width={40} height={40} style={{ objectFit: 'cover' }} />
                                    ) : (
                                        <span>{(u.display_name || u.username || '?')[0].toUpperCase()}</span>
                                    )}
                                </Link>
                                <div className={styles.suggestedInfo}>
                                    <Link href={`/${u.username}`} className={styles.suggestedName}>
                                        {u.display_name || u.username}
                                    </Link>
                                    <span className={styles.suggestedMeta}>@{u.username}</span>
                                </div>
                                <button className={styles.followSmBtn} onClick={() => handleFollow(u.id)}>
                                    Follow
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function FeedItem({ entry }) {
    const p = entry.profiles;

    return (
        <div className={styles.feedItem}>
            <div className={styles.feedHeader}>
                <Link href={`/${p.username}`} className={styles.feedAvatar}>
                    {p.avatar_url ? (
                        <Image src={p.avatar_url} alt={p.display_name} width={40} height={40} style={{ objectFit: 'cover' }} />
                    ) : (
                        <span>{(p.display_name || p.username || '?')[0].toUpperCase()}</span>
                    )}
                </Link>
                <div className={styles.feedUserInfo}>
                    <Link href={`/${p.username}`} className={styles.feedUserName}>
                        {p.display_name || p.username}
                    </Link>
                    <span className={styles.feedTimestamp}>· {timeAgo(entry.created_at)}</span>
                </div>
                <span className={styles.feedAction}>
                    favorited a new {entry.category} {CATEGORY_ICONS[entry.category] || ''}
                </span>
            </div>

            <Link href={`/${p.username}/entry/${entry.id}`} className={styles.feedEntryLink}>
                {entry.cover_image_url && (
                    <div className={styles.feedEntryCover}>
                        <Image
                            src={entry.cover_image_url}
                            alt={entry.title}
                            fill
                            style={{
                                objectFit: 'cover'
                            }}
                            unoptimized
                        />
                    </div>
                )}
                <div className={styles.feedEntryDetails}>
                    <span className={styles.feedEntryTitle}>{entry.title}</span>
                    {entry.creator && <span className={styles.feedEntryCreator}>{entry.creator}</span>}
                    {entry.rating && <StarRating rating={entry.rating} size="sm" />}
                    {entry.notes && <p className={styles.feedEntryNotes}>{entry.notes}</p>}
                </div>
            </Link>
        </div>
    );
}
