'use client';

import Link from 'next/link';
import StarRating from './StarRating';
import styles from './MediaCard.module.css';

const CATEGORY_LABELS = {
    movie: 'Movies/TV',
    album: 'Album',
    book: 'Book',
    podcast: 'Podcast',
    blog: 'Other',
    idea: 'Idea',
    video: 'Video',
};

const CATEGORY_EMOJIS = {
    movie: '🎬',
    album: '💿',
    book: '📖',
    podcast: '🎙️',
    blog: '✍️',
    idea: '💡',
    video: '📺',
};

export default function MediaCard({ entry, username, viewMode = 'gallery', onHoverStart, onHoverEnd, onHoverMove }) {
    const placeholderBg = {
        movie: 'var(--cat-movie)',
        album: 'var(--cat-album)',
        book: 'var(--cat-book)',
        podcast: 'var(--cat-podcast)',
        blog: 'var(--cat-blog)',
        idea: 'var(--cat-idea)',
        video: 'var(--cat-video)',
    };

    const handleMouseEnter = () => {
        if (onHoverStart) onHoverStart(entry);
    };

    const handleMouseLeave = () => {
        if (onHoverEnd) onHoverEnd();
    };

    const handleMouseMove = (e) => {
        if (onHoverMove) onHoverMove(e.clientX, e.clientY);
    };

    const destinationUrl = `/${username}/entry/${entry.id}`;
    const linkProps = { href: destinationUrl };

    if (viewMode === 'list') {
        return (
            <Link
                {...linkProps}
                className={styles.listCard}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onMouseMove={handleMouseMove}
            >
                <div className={styles.listCover}>
                    {entry.cover_image_url ? (
                        <img src={entry.cover_image_url} alt={entry.title} loading="lazy" />
                    ) : (
                        <div className={styles.listPlaceholder}>
                            {CATEGORY_EMOJIS[entry.category] || '📺'}
                        </div>
                    )}
                </div>
                <div className={styles.listInfo}>
                    <h3 className={styles.listTitle}>{entry.title}</h3>
                    {entry.creator && <p className={styles.listCreator}>{entry.creator}</p>}
                </div>
                <div className={styles.listMeta}>
                    {entry.rating && <StarRating rating={entry.rating} size="sm" />}
                    <span className={styles.listCategory}>
                        {CATEGORY_EMOJIS[entry.category]} {CATEGORY_LABELS[entry.category]}
                    </span>
                </div>
            </Link>
        );
    }

    return (
        <Link
            {...linkProps}
            className={styles.card}
            data-category={entry.category}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseMove={handleMouseMove}
        >
            <div className={styles.cover}>
                {entry.cover_image_url ? (
                    <img
                        src={entry.cover_image_url}
                        alt={entry.title}
                        loading="lazy"
                    />
                ) : (
                    <div
                        className={styles.placeholder}
                        style={{ background: `linear-gradient(135deg, ${placeholderBg[entry.category]}, transparent)` }}
                    >
                        <span className={styles.placeholderIcon}>
                            {CATEGORY_EMOJIS[entry.category] || '📺'}
                        </span>
                    </div>
                )}
            </div>
            <div className={styles.info}>
                <h3 className={styles.title}>{entry.title}</h3>
                {entry.creator && (
                    <p className={styles.creator}>{entry.creator}</p>
                )}
                <div className={styles.meta}>
                    {entry.rating && <StarRating rating={entry.rating} size="sm" />}
                    {entry.year && <span className={styles.year}>{entry.year}</span>}
                </div>
            </div>
        </Link>
    );
}
