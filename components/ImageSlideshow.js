'use client';

import { useState, useEffect } from 'react';
import styles from '@/app/login/auth.module.css';

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export default function ImageSlideshow() {
    const [images, setImages] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [phase, setPhase] = useState('showing'); // 'showing' | 'fading' | 'swapping'

    useEffect(() => {
        async function fetchImages() {
            try {
                // Fetch from our new API route that dynamic lists images
                const res = await fetch('/api/loginpics');
                if (res.ok) {
                    const data = await res.json();
                    if (data.length > 0) {
                        setImages(shuffle(data));
                    }
                }
            } catch (err) {
            }
        }
        fetchImages();
    }, []);

    const nextIndex = images.length > 0 ? (currentIndex + 1) % images.length : 0;

    // Trigger fade after showing, or reset from swapping back to showing
    useEffect(() => {
        if (images.length < 2) return;

        let timerId;

        if (phase === 'showing') {
            timerId = setTimeout(() => setPhase('fading'), 3000);
        } else if (phase === 'swapping') {
            // A double requestAnimationFrame ensures the DOM has applied the swap
            // instantly with no CSS transition, before we re-enable transitions
            timerId = requestAnimationFrame(() => {
                timerId = requestAnimationFrame(() => {
                    setPhase('showing');
                });
            });
        }

        return () => {
            if (typeof timerId === 'number') {
                clearTimeout(timerId);
                cancelAnimationFrame(timerId);
            }
        };
    }, [phase, images.length]);

    const handleTransitionEnd = (e) => {
        // Only trigger on the opacity transition of the fade out
        if (e.propertyName === 'opacity' && phase === 'fading') {
            setCurrentIndex(nextIndex);
            setPhase('swapping');
        }
    };

    if (images.length === 0) {
        return <div className={styles.imagePanel} />; // Blank while loading
    }

    return (
        <div className={styles.imagePanel}>
            {/* Next image (underneath, always ready) */}
            <img
                src={images[nextIndex]}
                alt=""
                className={styles.slideshowImgNext}
            />
            {/* Current image (on top, fades out) */}
            <img
                src={images[currentIndex]}
                alt=""
                onTransitionEnd={handleTransitionEnd}
                className={`${styles.slideshowImg} ${phase === 'fading' ? styles.slideshowOut : ''} ${phase === 'swapping' ? styles.noTransition : ''}`.trim()}
            />
            <div className={styles.imagePanelOverlay} />
        </div>
    );
}
