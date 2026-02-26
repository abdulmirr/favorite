'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { searchMedia } from '@/lib/mediaSearch';
import StarRating from '@/components/StarRating';
import styles from './log.module.css';

const CATEGORIES = [
    { key: 'movie', label: 'Movies/TV', icon: '🎬' },
    { key: 'video', label: 'Video', icon: '📺' },
    { key: 'book', label: 'Book', icon: '📖' },
    { key: 'album', label: 'Album', icon: '💿' },
    { key: 'podcast', label: 'Podcast', icon: '🎙️' },
    { key: 'blog', label: 'Other', icon: '✍️' },
];

const SEARCH_CATEGORIES = ['movie', 'album', 'book', 'podcast'];
const URL_CATEGORIES = ['blog', 'video'];

export default function LogEntryPage() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useParams();

    const [category, setCategory] = useState('movie');
    const [title, setTitle] = useState('');
    const [creator, setCreator] = useState('');
    const [year, setYear] = useState('');
    const [coverUrl, setCoverUrl] = useState('');
    const [rating, setRating] = useState(0);
    const [notes, setNotes] = useState('');
    const [externalId, setExternalId] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [submitHover, setSubmitHover] = useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);

    // URL state (for blog/video)
    const [urlInput, setUrlInput] = useState('');
    const [fetchingUrl, setFetchingUrl] = useState(false);
    const [urlFetched, setUrlFetched] = useState(false);
    const skipNextSearch = useRef(false);

    const isSearchCategory = SEARCH_CATEGORIES.includes(category);
    const isUrlCategory = URL_CATEGORIES.includes(category);

    // Debounced search for search categories
    useEffect(() => {
        if (skipNextSearch.current) {
            skipNextSearch.current = false;
            return;
        }
        if (!searchQuery || searchQuery.length < 2 || !isSearchCategory) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setSearching(true);
            const results = await searchMedia(searchQuery, category);
            setSearchResults(results);
            setSearching(false);
            setShowResults(true);
        }, 400);

        return () => clearTimeout(timer);
    }, [searchQuery, category]);

    const selectResult = (result) => {
        skipNextSearch.current = true;
        setTitle(result.title);
        setCreator(result.creator || '');
        setYear(result.year ? String(result.year) : '');
        setCoverUrl(result.cover_image_url || '');
        setExternalId(result.id || '');
        setSearchQuery(result.title);
        setShowResults(false);
        setSearchResults([]);
    };

    const fetchUrlMetadata = async () => {
        if (!urlInput) return;
        setFetchingUrl(true);
        setError('');

        try {
            const res = await fetch('/api/url-metadata', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: urlInput }),
            });

            if (res.ok) {
                const data = await res.json();
                setTitle(data.title || urlInput);
                setCreator(data.creator || '');
                setCoverUrl(data.cover_image_url || '');
                setExternalId(data.external_id || urlInput);
                setUrlFetched(true);
            } else {
                setError('Could not fetch metadata from that URL. You can enter the title manually.');
                setTitle(urlInput);
                setExternalId(urlInput);
            }
        } catch {
            setError('Could not fetch metadata. You can enter the title manually.');
            setTitle(urlInput);
            setExternalId(urlInput);
        }

        setFetchingUrl(false);
    };

    const resetForm = () => {
        setTitle('');
        setCreator('');
        setYear('');
        setCoverUrl('');
        setExternalId('');
        setSearchQuery('');
        setSearchResults([]);
        setUrlInput('');
        setUrlFetched(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) return;
        if (!title) {
            setError('Please provide a title before saving.');
            return;
        }
        setError('');
        setSaving(true);

        try {
            // Get the current session to make sure we have a valid token
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setError('Session expired. Please sign in again.');
                return;
            }

            const finalExternalId = (isUrlCategory && urlInput && !externalId) ? urlInput : externalId;

            const { error: insertError } = await supabase.from('media_entries').insert({
                user_id: user.id,
                title,
                category,
                cover_image_url: coverUrl || null,
                creator: creator || null,
                year: year ? parseInt(year) : null,
                rating: rating || null,
                notes: notes || null,
                external_id: finalExternalId || null,
            });

            if (insertError) {
                setError(insertError.message);
            } else {
                router.push(`/${params.username}`);
                return; // Don't reset saving — we're navigating away
            }
        } catch (err) {
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (!user) {
        return (
            <div className={styles.page}>
                <div className={styles.card}>
                    <p>Please sign in to log entries.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <h1 className={styles.title}>Log a new favorite...</h1>

                {error && <div className={styles.error}>{error}</div>}

                <form onSubmit={handleSubmit} className={styles.form}>
                    {/* Category */}
                    <div>
                        <div className={styles.categoryGrid}>
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat.key}
                                    type="button"
                                    className={`${styles.categoryBtn} ${category === cat.key ? styles.categoryActive : ''}`}
                                    onClick={() => {
                                        setCategory(cat.key);
                                        resetForm();
                                        setRating(0);
                                        setNotes('');
                                    }}
                                >
                                    <span>{cat.icon}</span>
                                    <span>{cat.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Search & Select (for movie/album/book/podcast) */}
                    {isSearchCategory && (
                        <div className={styles.field}>
                            <label htmlFor="search">Search & Select</label>
                            <div className={styles.searchWrapper}>
                                <input
                                    id="search"
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setTitle(e.target.value);
                                    }}
                                    placeholder={`Search for a ${category}...`}
                                    autoComplete="off"
                                />
                                {searching && <div className={styles.searchSpinner}>⟳</div>}
                                {showResults && searchResults.length > 0 && (
                                    <div className={styles.searchResults}>
                                        {searchResults.map((result) => (
                                            <button
                                                key={result.id}
                                                type="button"
                                                className={styles.searchItem}
                                                onClick={() => selectResult(result)}
                                            >
                                                {result.cover_image_url && (
                                                    <Image
                                                        src={result.cover_image_url}
                                                        alt=""
                                                        width={32}
                                                        height={48}
                                                        className={styles.searchThumb}
                                                        style={{ objectFit: 'cover' }}
                                                        unoptimized
                                                    />
                                                )}
                                                <div className={styles.searchInfo}>
                                                    <span className={styles.searchTitle}>{result.title}</span>
                                                    <span className={styles.searchMeta}>
                                                        {[result.creator, result.year].filter(Boolean).join(' · ')}
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* URL input (for other/video) */}
                    {isUrlCategory && (
                        <div className={styles.field}>
                            <label htmlFor="url">{category === 'video' ? 'YouTube URL' : 'Other URL'}</label>
                            <div className={styles.urlWrapper}>
                                <input
                                    id="url"
                                    type="url"
                                    value={urlInput}
                                    onChange={(e) => {
                                        setUrlInput(e.target.value);
                                        setUrlFetched(false);
                                    }}
                                    placeholder={category === 'video' ? 'https://youtube.com/watch?v=...' : 'https://example.com/article'}
                                />
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={fetchUrlMetadata}
                                    disabled={fetchingUrl || !urlInput}
                                >
                                    {fetchingUrl ? 'Fetching...' : 'Fetch'}
                                </button>
                            </div>
                            {/* Manual title fallback */}
                            {!urlFetched && urlInput && !fetchingUrl && (
                                <div className={styles.field} style={{ marginTop: 'var(--space-3)' }}>
                                    <label htmlFor="manualTitle">Title (if auto-fetch fails)</label>
                                    <input
                                        id="manualTitle"
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Enter the title manually"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Preview */}
                    {(coverUrl || (title && (isSearchCategory ? searchQuery : urlFetched))) && (
                        <div className={styles.preview}>
                            {coverUrl && (
                                <Image
                                    src={coverUrl}
                                    alt={title}
                                    width={64}
                                    height={96}
                                    className={styles.previewImg}
                                    style={{ objectFit: 'cover' }}
                                    unoptimized
                                />
                            )}
                            <div className={styles.previewInfo}>
                                <h3>{title}</h3>
                                {creator && <p>{creator}</p>}
                                {year && <p>{year}</p>}
                            </div>
                        </div>
                    )}

                    {/* Rating */}
                    <div>
                        <StarRating rating={rating} onChange={setRating} size="xl" interactive />
                        {rating > 0 && (
                            <span className={styles.ratingLabel}>{rating} / 5</span>
                        )}
                    </div>

                    {/* Notes */}
                    <div className={styles.field}>
                        <label htmlFor="notes">Your Thoughts</label>
                        <textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="What did you think? Why is it a favorite?"
                            rows={4}
                        />
                    </div>

                    <button
                        type="submit"
                        className={`btn btn-primary ${styles.submitBtn}`}
                        disabled={saving}
                        onMouseEnter={() => setSubmitHover(true)}
                        onMouseLeave={() => setSubmitHover(false)}
                    >
                        {saving ? 'Saving...' : submitHover ? 'favorite!' : 'favorite'}
                    </button>
                </form>
            </div>
        </div>
    );
}
