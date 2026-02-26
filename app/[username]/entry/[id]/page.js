'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import StarRating from '@/components/StarRating';
import styles from './entry.module.css';

const CATEGORY_LABELS = {
    movie: 'Movie',
    album: 'Album',
    book: 'Book',
    podcast: 'Podcast',
    blog: 'Blog',
    idea: 'Idea',
    video: 'Video',
};

export default function EntryDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    useEffect(() => { document.title = `favorite/${params.username}`; }, [params.username]);

    const [entry, setEntry] = useState(null);
    const [profileUser, setProfileUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Edit state
    const [editing, setEditing] = useState(false);
    const [editNotes, setEditNotes] = useState('');
    const [editRating, setEditRating] = useState(0);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    useEffect(() => {
        fetchEntry();
    }, [params.id]);

    const fetchEntry = async () => {
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('username', params.username)
            .single();

        setProfileUser(profile);

        if (profile) {
            const { data } = await supabase
                .from('media_entries')
                .select('*')
                .eq('id', params.id)
                .eq('user_id', profile.id)
                .single();
            setEntry(data);
            if (data) {
                setEditNotes(data.notes || '');
                setEditRating(data.rating || 0);
            }
        }
        setLoading(false);
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            // Check session first
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                alert('Session expired. Please sign in again.');
                return;
            }

            const { error } = await supabase.from('media_entries').delete().eq('id', entry.id);
            if (error) {
                alert('Failed to remove: ' + error.message);
            } else {
                // Use window.location as fallback in case router.push doesn't work
                window.location.href = `/${params.username}`;
                return;
            }
        } catch (err) {
            alert('Something went wrong. Please try again.');
        } finally {
            setDeleting(false);
            setConfirmingDelete(false);
        }
    };

    const handleSaveEdit = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('media_entries')
                .update({
                    notes: editNotes || null,
                    rating: editRating || null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', entry.id);

            if (!error) {
                setEntry({ ...entry, notes: editNotes || null, rating: editRating || null });
                setEditing(false);
            }
        } catch (err) {
        } finally {
            setSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setEditNotes(entry.notes || '');
        setEditRating(entry.rating || 0);
        setEditing(false);
    };

    if (loading) {
        return <div className={styles.page}><div className="skeleton" style={{ width: '100%', maxWidth: '600px', height: '400px', margin: '0 auto' }} /></div>;
    }

    if (!entry) {
        return (
            <div className={styles.page}>
                <div className={styles.notFound}>
                    <h1>Entry not found</h1>
                    <Link href={`/${params.username}`}>← Back to profile</Link>
                </div>
            </div>
        );
    }

    const isOwner = user && profileUser && user.id === profileUser.id;

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <Link href={`/${params.username}`} className={styles.backLink}>
                    ← {profileUser?.display_name || params.username}
                </Link>

                <div className={styles.entry}>
                    <div className={styles.coverSection}>
                        {entry.cover_image_url ? (
                            <img src={entry.cover_image_url} alt={entry.title} className={styles.cover} />
                        ) : (
                            <div className={styles.coverPlaceholder}>
                                <span>
                                    {entry.category === 'movie' ? '🎬' :
                                        entry.category === 'album' ? '💿' :
                                            entry.category === 'book' ? '📖' :
                                                entry.category === 'podcast' ? '🎙️' :
                                                    entry.category === 'blog' ? '✍️' :
                                                        entry.category === 'idea' ? '💡' : '📺'}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className={styles.details}>
                        <p className={styles.categoryLabel}>
                            {CATEGORY_LABELS[entry.category]}
                        </p>

                        {(() => {
                            let linkHref = null;
                            if (entry.external_id) {
                                if (entry.external_id.startsWith('http')) {
                                    linkHref = entry.external_id;
                                } else if (entry.category === 'video' && !entry.external_id.startsWith('tmdb-') && entry.external_id.length > 5) {
                                    // Backward compatibility: old Youtube entries saved just the ID
                                    linkHref = `https://youtube.com/watch?v=${entry.external_id}`;
                                }
                            }

                            if (linkHref) {
                                return (
                                    <a
                                        href={linkHref}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: 'inherit', textDecoration: 'none', transition: 'opacity 0.2s', display: 'inline-block' }}
                                        onMouseOver={(e) => e.currentTarget.style.opacity = 0.7}
                                        onMouseOut={(e) => e.currentTarget.style.opacity = 1}
                                    >
                                        <h1 className={styles.title}>
                                            {entry.title} <span style={{ fontSize: '0.6em', verticalAlign: 'middle', opacity: 0.5, marginLeft: '4px' }}>↗</span>
                                        </h1>
                                    </a>
                                );
                            }
                            return <h1 className={styles.title}>{entry.title}</h1>;
                        })()}

                        {entry.creator && (
                            <p className={styles.creator}>{entry.creator}</p>
                        )}

                        {entry.year && (
                            <p className={styles.year}>{entry.year}</p>
                        )}

                        {/* Rating (editable) */}
                        {editing ? (
                            <div className={styles.rating}>
                                <StarRating rating={editRating} onChange={setEditRating} size="lg" interactive />
                            </div>
                        ) : entry.rating ? (
                            <div className={styles.rating}>
                                <StarRating rating={entry.rating} size="lg" />
                            </div>
                        ) : null}

                        {/* Date Added */}
                        {entry.created_at && (
                            <p className={styles.dateAdded}>
                                {new Date(entry.created_at).toLocaleDateString('en-US', {
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric',
                                })}
                            </p>
                        )}

                        {/* Notes (editable) */}
                        {editing ? (
                            <div className={styles.notes}>
                                <h2>Thoughts</h2>
                                <textarea
                                    value={editNotes}
                                    onChange={(e) => setEditNotes(e.target.value)}
                                    className={styles.editTextarea}
                                    placeholder="What did you think? Why is it a favorite?"
                                    rows={5}
                                />
                                <div className={styles.editActions}>
                                    <button className="btn btn-primary btn-sm" onClick={handleSaveEdit} disabled={saving}>
                                        {saving ? 'Saving...' : 'Save'}
                                    </button>
                                    <button className="btn btn-secondary btn-sm" onClick={handleCancelEdit}>
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {entry.notes && (
                                    <div className={styles.notes}>
                                        <div className={styles.notesHeader}>
                                            <h2>Thoughts</h2>
                                        </div>
                                        <p>{entry.notes}</p>
                                    </div>
                                )}

                                {!entry.notes && isOwner && (
                                    <div className={styles.notes}>
                                        <textarea
                                            value={editNotes}
                                            onChange={(e) => setEditNotes(e.target.value)}
                                            className={styles.editTextarea}
                                            placeholder="What did you think? Why is it a favorite?"
                                            rows={3}
                                            onBlur={async () => {
                                                if (editNotes && editNotes !== (entry.notes || '')) {
                                                    await supabase.from('media_entries').update({ notes: editNotes }).eq('id', entry.id);
                                                    setEntry({ ...entry, notes: editNotes });
                                                }
                                            }}
                                        />
                                    </div>
                                )}
                            </>
                        )}

                        {isOwner && !editing && (
                            <div className={styles.actions}>
                                <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
                                    Edit
                                </button>
                                {confirmingDelete ? (
                                    <>
                                        <button
                                            className={styles.deleteBtn}
                                            onClick={handleDelete}
                                            disabled={deleting}
                                            style={{ fontWeight: 600 }}
                                        >
                                            {deleting ? 'Removing...' : 'Are you sure?'}
                                        </button>
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => setConfirmingDelete(false)}
                                            disabled={deleting}
                                        >
                                            Cancel
                                        </button>
                                    </>
                                ) : (
                                    <button className={styles.deleteBtn} onClick={() => setConfirmingDelete(true)}>
                                        Remove
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
