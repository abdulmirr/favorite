'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { searchMedia } from '@/lib/mediaSearch';
import styles from './feed.module.css';

const CATEGORY_ICONS = {
    movie: '🎬', album: '💿', book: '📖', podcast: '🎙️',
    blog: '✍️', idea: '💡', video: '📺',
};

export default function ForYouPage() {
    const { user, profile, loading: authLoading } = useAuth();
    const router = useRouter();

    const [categories, setCategories] = useState([]);
    const [loadingRecs, setLoadingRecs] = useState(true);
    const [error, setError] = useState(null);
    const [emptyMessage, setEmptyMessage] = useState(null);

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (user) fetchRecommendations();
    }, [user]);

    const fetchRecommendations = async (forceRefresh = false) => {
        setLoadingRecs(true);
        setError(null);
        setEmptyMessage(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) throw new Error("No session token");

            const res = await fetch(`/api/recommendations${forceRefresh ? '?refresh=true' : ''}`, {
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                }
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to fetch recommendations');
            }

            if (data.message) {
                setEmptyMessage(data.message);
                setCategories([]);
            } else {
                setCategories(data.recommendations || []);
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setLoadingRecs(false);
        }
    };

    if (authLoading || !user) return null;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.pageTitle}>For you, {profile?.display_name?.split(' ')[0] || profile?.username}</h1>
                <p className={styles.pageSubtitle}>Curated recommendations based on your exact taste.</p>
                {categories.length > 0 && !loadingRecs && (
                    <button
                        onClick={() => fetchRecommendations(true)}
                        className={styles.refreshBtn}
                        aria-label="Refresh recommendations"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                        Refresh Curations
                    </button>
                )}
            </div>

            {loadingRecs ? (
                // Loading Skeleton
                <div className={styles.recsSection}>
                    {[1, 2, 3].map((section) => (
                        <div key={section} className={styles.categoryBlock}>
                            <div className="skeleton" style={{ width: '200px', height: '24px', marginBottom: '16px', borderRadius: '4px' }} />
                            <div className={styles.recsRow}>
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className={styles.recCardSkeleton}>
                                        <div className="skeleton" style={{ width: '100%', height: '100%', borderRadius: '12px' }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : error ? (
                // Error State
                <div className={styles.empty}>
                    <p className={styles.errorText}>Oops! {error}</p>
                    <button onClick={() => fetchRecommendations()} className="btn btn-primary" style={{ marginTop: '16px' }}>Try Again</button>
                </div>
            ) : emptyMessage || categories.length === 0 ? (
                // Empty Library State
                <div className={styles.empty}>
                    <h2>Your taste profile is empty</h2>
                    <p>{emptyMessage || "Log some of your favorite media to help us understand what you love. Then, we can curate personalized recommendations just for you."}</p>
                    <Link href={`/${profile?.username}/log`} className="btn btn-primary" style={{ marginTop: '16px' }}>
                        Log your first favorite
                    </Link>
                </div>
            ) : (
                // Recommendations UI
                <div className={styles.recsSection}>
                    {categories.map((cat, idx) => (
                        <div key={idx} className={styles.categoryBlock}>
                            <h2 className={styles.categoryTitle}>
                                <span className={styles.categoryIcon}>{CATEGORY_ICONS[cat.category] || '✨'}</span>
                                {cat.categoryTitle}
                            </h2>
                            <div className={styles.recsRow}>
                                {cat.items.map((item, itemIdx) => (
                                    <RecommendationCard key={itemIdx} item={item} category={cat.category} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function RecommendationCard({ item, category }) {
    const [coverUrl, setCoverUrl] = useState(null);
    const [loadingCover, setLoadingCover] = useState(true);

    useEffect(() => {
        let mounted = true;
        async function fetchCover() {
            try {
                // TMDB searches fail if the creator/director is appended, so we only use the title for movies
                let searchQ = item.title;
                if (category !== 'movie' && category !== 'video') {
                    searchQ = item.query || `${item.title} ${item.creator || ''}`;
                }
                const results = await searchMedia(searchQ, category);
                if (mounted && results && results.length > 0 && results[0].cover_image_url) {
                    setCoverUrl(results[0].cover_image_url);
                }
            } catch (err) {
            } finally {
                if (mounted) setLoadingCover(false);
            }
        }
        fetchCover();
        return () => { mounted = false; };
    }, [item.query, item.title, item.creator, category]);

    return (
        <div className={styles.recCard}>
            {/* Cover Image Area */}
            <div
                className={styles.recCoverWrapper}
                style={{ aspectRatio: category === 'album' ? '1 / 1' : '2 / 3' }}
            >
                {coverUrl ? (
                    <Image
                        src={coverUrl}
                        alt={item.title}
                        fill
                        className={styles.recCover}
                        style={{
                            objectFit: 'cover'
                        }}
                        unoptimized
                    />
                ) : (
                    <div className={styles.recCoverFallback}>
                        {loadingCover ? (
                            <div className="skeleton" style={{ width: '100%', height: '100%' }} />
                        ) : (
                            <span className={styles.recCoverIcon}>{CATEGORY_ICONS[category] || '✨'}</span>
                        )}
                    </div>
                )}
            </div>

            <div className={styles.recHeader}>
                <h3 className={styles.recTitle}>{item.title}</h3>
                {item.year && <div className={styles.recYear}>{item.year}</div>}
            </div>

            <div className={styles.recContent}>
                {item.creator && <div className={styles.recCreator}>by {item.creator}</div>}
            </div>

            <div className={styles.recReasonBox}>
                <Image src="/favoritestar.svg" alt="Favorite Star" width={24} height={24} className={styles.sparkleIcon} />
                <p className={styles.recReason}>{item.reason}</p>
            </div>
        </div>
    );
}
