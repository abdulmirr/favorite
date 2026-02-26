'use client';

import { useState } from 'react';
import styles from './StarRating.module.css';

/**
 * Half-star rating component (Letterboxd-style).
 * Click left half of star = half star (0.5), right half = full star (1.0).
 * Values: 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0
 *
 * Props:
 * - rating: number (0.5 increments)
 * - onChange: (rating) => void
 * - size: 'sm' | 'md' | 'lg' | 'xl'
 * - interactive: boolean
 */
export default function StarRating({ rating = 0, onChange, size = 'md', interactive = false }) {
    const [hoverRating, setHoverRating] = useState(0);

    const displayRating = hoverRating || rating;

    const handleClick = (starIndex, isLeftHalf) => {
        if (!interactive || !onChange) return;
        const newRating = isLeftHalf ? starIndex + 0.5 : starIndex + 1;
        // If clicking the same value, clear it
        onChange(newRating === rating ? 0 : newRating);
    };

    const handleMouseMove = (starIndex, e) => {
        if (!interactive) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const isLeftHalf = (e.clientX - rect.left) < rect.width / 2;
        setHoverRating(isLeftHalf ? starIndex + 0.5 : starIndex + 1);
    };

    const handleMouseLeave = () => {
        if (!interactive) return;
        setHoverRating(0);
    };

    return (
        <div
            className={`${styles.stars} ${styles[size]}`}
            onMouseLeave={handleMouseLeave}
            role={interactive ? 'slider' : 'img'}
            aria-label={`Rating: ${rating} out of 5`}
            aria-valuemin={0}
            aria-valuemax={5}
            aria-valuenow={rating}
        >
            {[0, 1, 2, 3, 4].map((starIndex) => {
                const filled = displayRating >= starIndex + 1;
                const halfFilled = !filled && displayRating >= starIndex + 0.5;

                return (
                    <span
                        key={starIndex}
                        className={`${styles.star} ${interactive ? styles.interactive : ''}`}
                        onMouseMove={(e) => handleMouseMove(starIndex, e)}
                        onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const isLeftHalf = (e.clientX - rect.left) < rect.width / 2;
                            handleClick(starIndex, isLeftHalf);
                        }}
                    >
                        {/* Empty star background */}
                        <svg viewBox="0 0 24 24" className={styles.starSvg}>
                            <path
                                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                                fill="var(--star-empty)"
                            />
                        </svg>
                        {/* Half fill */}
                        {halfFilled && (
                            <svg viewBox="0 0 24 24" className={`${styles.starSvg} ${styles.starOverlay}`}>
                                <defs>
                                    <clipPath id={`half-${starIndex}`}>
                                        <rect x="0" y="0" width="12" height="24" />
                                    </clipPath>
                                </defs>
                                <path
                                    d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                                    fill="var(--star)"
                                    clipPath={`url(#half-${starIndex})`}
                                />
                            </svg>
                        )}
                        {/* Full fill */}
                        {filled && (
                            <svg viewBox="0 0 24 24" className={`${styles.starSvg} ${styles.starOverlay}`}>
                                <path
                                    d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                                    fill="var(--star)"
                                />
                            </svg>
                        )}
                    </span>
                );
            })}

        </div>
    );
}
