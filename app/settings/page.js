'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import styles from './settings.module.css';

const BIO_MAX = 160;

export default function SettingsPage() {
    const { user, profile, loading: authLoading, fetchProfile } = useAuth();
    const router = useRouter();
    const avatarInputRef = useRef(null);
    const bannerInputRef = useRef(null);

    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');
    const [website, setWebsite] = useState('');
    const [twitterUrl, setTwitterUrl] = useState('');
    const [instagramUrl, setInstagramUrl] = useState('');
    const [spotifyUrl, setSpotifyUrl] = useState('');
    const [pinterestUrl, setPinterestUrl] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [bannerUrl, setBannerUrl] = useState('');
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState('');

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/login');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (profile) {
            setDisplayName(profile.display_name || '');
            setBio(profile.bio || '');
            setWebsite(profile.website || '');
            setTwitterUrl(profile.twitter_url || '');
            setInstagramUrl(profile.instagram_url || '');
            setSpotifyUrl(profile.spotify_url || '');
            setPinterestUrl(profile.pinterest_url || '');
            setAvatarUrl(profile.avatar_url || '');
            setBannerUrl(profile.banner_url || '');
        }
    }, [profile]);

    const uploadFile = async (file, type) => {
        if (!file || !user) return null;
        setUploading(type);
        setError('');

        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${type}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, file, { upsert: true });

        if (uploadError) {
            setError(`Failed to upload ${type}: ` + uploadError.message);
            setUploading('');
            return null;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);

        const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;
        setUploading('');
        return urlWithCacheBust;
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        const url = await uploadFile(file, 'avatar');
        if (url) {
            setAvatarUrl(url);
            await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
            await fetchProfile(user.id);
            setSuccess('Avatar updated!');
            setTimeout(() => setSuccess(''), 3000);
        }
    };

    const handleBannerUpload = async (e) => {
        const file = e.target.files?.[0];
        const url = await uploadFile(file, 'banner');
        if (url) {
            setBannerUrl(url);
            await supabase.from('profiles').update({ banner_url: url }).eq('id', user.id);
            await fetchProfile(user.id);
            setSuccess('Banner updated!');
            setTimeout(() => setSuccess(''), 3000);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) return;
        setSaving(true);
        setError('');
        setSuccess('');

        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                display_name: displayName,
                bio: bio || null,
                website: website || null,
                twitter_url: twitterUrl || null,
                instagram_url: instagramUrl || null,
                spotify_url: spotifyUrl || null,
                pinterest_url: pinterestUrl || null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);

        if (updateError) {
            setError(updateError.message);
        } else {
            setSuccess('Profile updated!');
            await fetchProfile(user.id);
            setTimeout(() => setSuccess(''), 3000);
        }
        setSaving(false);
    };

    if (authLoading || !profile) {
        return <div className={styles.page}><p className={styles.loading}>Loading...</p></div>;
    }

    return (
        <div className={styles.page}>
            {/* Close button */}
            <Link href={`/${profile.username}`} className={styles.closeBtn}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </Link>

            {/* Left sidebar: Avatar + Nav */}
            <div className={styles.sidebar}>
                {/* Avatar */}
                <div className={styles.avatarBlock} onClick={() => avatarInputRef.current?.click()}>
                    <div className={styles.avatar}>
                        {avatarUrl ? (
                            <Image src={avatarUrl} alt="Avatar" fill style={{ objectFit: 'cover' }} />
                        ) : (
                            <span>{(displayName || profile.username || '?')[0].toUpperCase()}</span>
                        )}
                        <div className={styles.avatarOverlay}>
                            {uploading === 'avatar' ? '⟳' : '✎'}
                        </div>
                    </div>
                    <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handleAvatarUpload}
                        style={{ display: 'none' }}
                    />
                </div>

                {/* Nav */}
                <nav className={styles.settingsNav}>
                    <span className={styles.settingsNavItem + ' ' + styles.settingsNavActive}>Profile</span>
                </nav>
            </div>

            {/* Right content */}
            <div className={styles.content}>
                <h1 className={styles.title}>Profile</h1>

                {error && <div className={styles.error}>{error}</div>}
                {success && <div className={styles.success}>{success}</div>}

                <form onSubmit={handleSubmit} className={styles.form}>
                    {/* Banner */}
                    <div className={styles.bannerField} onClick={() => bannerInputRef.current?.click()}>
                        {bannerUrl ? (
                            <Image src={bannerUrl} alt="Banner" fill className={styles.bannerImg} style={{ objectFit: 'cover' }} />
                        ) : (
                            <div className={styles.bannerPlaceholder}>
                                <span>🖼️ Click to add banner</span>
                            </div>
                        )}
                        <div className={styles.bannerOverlay}>
                            {uploading === 'banner' ? '⟳' : '📷'}
                        </div>
                        <input
                            ref={bannerInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            onChange={handleBannerUpload}
                            style={{ display: 'none' }}
                        />
                    </div>

                    {/* Username (readonly) */}
                    <div className={styles.inputGroup}>
                        <label className={styles.floatingLabel}>Username</label>
                        <input type="text" value={`@${profile.username}`} disabled className={styles.input} />
                    </div>

                    {/* Display Name */}
                    <div className={styles.inputGroup}>
                        <label className={styles.floatingLabel}>Full name</label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Your name"
                            className={styles.input}
                            required
                        />
                    </div>

                    {/* Website */}
                    <div className={styles.inputGroup}>
                        <label className={styles.floatingLabel}>Website</label>
                        <input
                            type="url"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                            placeholder="yoursite.com"
                            className={styles.input}
                        />
                    </div>

                    {/* Bio */}
                    <div className={styles.inputGroup}>
                        <label className={styles.floatingLabel}>Bio</label>
                        <span className={styles.charCount}>{bio.length}/{BIO_MAX}</span>
                        <textarea
                            value={bio}
                            onChange={(e) => {
                                if (e.target.value.length <= BIO_MAX) setBio(e.target.value);
                            }}
                            placeholder="Tell people about yourself..."
                            rows={3}
                            className={styles.input}
                        />
                    </div>

                    {/* Social */}
                    <div className={styles.socialSection}>
                        <div className={styles.socialHeader}>
                            <h2 className={styles.sectionTitle}>Social</h2>
                        </div>

                        <div className={styles.socialField}>
                            <div className={styles.socialIcon}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                            </div>
                            <input
                                type="url"
                                value={instagramUrl}
                                onChange={(e) => setInstagramUrl(e.target.value)}
                                placeholder="https://instagram.com/username"
                                className={styles.socialInput}
                            />
                        </div>

                        <div className={styles.socialField}>
                            <div className={styles.socialIcon}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                            </div>
                            <input
                                type="url"
                                value={twitterUrl}
                                onChange={(e) => setTwitterUrl(e.target.value)}
                                placeholder="https://x.com/username"
                                className={styles.socialInput}
                            />
                        </div>

                        <div className={styles.socialField}>
                            <div className={styles.socialIcon}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" /></svg>
                            </div>
                            <input
                                type="url"
                                value={spotifyUrl}
                                onChange={(e) => setSpotifyUrl(e.target.value)}
                                placeholder="https://open.spotify.com/user/..."
                                className={styles.socialInput}
                            />
                        </div>

                        <div className={styles.socialField}>
                            <div className={styles.socialIcon}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0a12 12 0 0 0-4.373 23.178c-.07-.94-.134-2.397.028-3.428.147-.932.948-3.958.948-3.958s-.242-.484-.242-1.2c0-1.123.652-1.963 1.462-1.963.69 0 1.023.518 1.023 1.138 0 .694-.441 1.73-.669 2.692-.19.804.403 1.46 1.197 1.46 1.436 0 2.54-1.514 2.54-3.698 0-1.934-1.39-3.286-3.375-3.286-2.299 0-3.649 1.724-3.649 3.507 0 .694.267 1.438.601 1.843.066.08.076.15.056.231-.061.256-.198.804-.225.916-.035.148-.116.179-.268.108-1-.465-1.624-1.926-1.624-3.1 0-2.524 1.834-4.84 5.286-4.84 2.775 0 4.932 1.977 4.932 4.62 0 2.757-1.739 4.976-4.151 4.976-.81 0-1.573-.421-1.834-.919l-.498 1.902c-.181.695-.669 1.566-.995 2.097A12 12 0 1 0 12 0z" /></svg>
                            </div>
                            <input
                                type="url"
                                value={pinterestUrl}
                                onChange={(e) => setPinterestUrl(e.target.value)}
                                placeholder="https://pinterest.com/username"
                                className={styles.socialInput}
                            />
                        </div>
                    </div>

                    <button type="submit" className={styles.saveBtn} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>
            </div>
        </div>
    );
}
