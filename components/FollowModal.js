'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import styles from './FollowModal.module.css';

export default function FollowModal({ isOpen, onClose, initialTab, profileUserId }) {
    const [activeTab, setActiveTab] = useState(initialTab); // 'followers' or 'following'
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab);
            fetchUsers(initialTab);
        }
    }, [isOpen, initialTab, profileUserId]);

    const fetchUsers = async (tab) => {
        setLoading(true);
        setUsers([]);

        if (tab === 'followers') {
            const { data: follows } = await supabase
                .from('follows')
                .select('follower_id')
                .eq('following_id', profileUserId);

            const userIds = (follows || []).map((f) => f.follower_id);
            if (userIds.length > 0) {
                const { data } = await supabase
                    .from('profiles')
                    .select('id, username, display_name, avatar_url')
                    .in('id', userIds);
                setUsers(data || []);
            }
        } else {
            const { data: follows } = await supabase
                .from('follows')
                .select('following_id')
                .eq('follower_id', profileUserId);

            const userIds = (follows || []).map((f) => f.following_id);
            if (userIds.length > 0) {
                const { data } = await supabase
                    .from('profiles')
                    .select('id, username, display_name, avatar_url')
                    .in('id', userIds);
                setUsers(data || []);
            }
        }
        setLoading(false);
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        fetchUsers(tab);
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeBtn} onClick={onClose}>×</button>
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === 'followers' ? styles.activeTab : ''}`}
                        onClick={() => handleTabChange('followers')}
                    >
                        Followers
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'following' ? styles.activeTab : ''}`}
                        onClick={() => handleTabChange('following')}
                    >
                        Following
                    </button>
                </div>
                <div className={styles.userList}>
                    {loading ? (
                        <div className={styles.loading}>Loading...</div>
                    ) : users.length === 0 ? (
                        <div className={styles.empty}>
                            {activeTab === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
                        </div>
                    ) : (
                        users.map((u) => (
                            <Link key={u.id} href={`/${u.username}`} className={styles.userItem} onClick={onClose}>
                                <div className={styles.avatar}>
                                    {u.avatar_url ? (
                                        <Image src={u.avatar_url} alt={u.display_name} width={40} height={40} style={{ objectFit: 'cover' }} />
                                    ) : (
                                        <span>{(u.display_name || u.username || '?')[0].toUpperCase()}</span>
                                    )}
                                </div>
                                <div className={styles.userInfo}>
                                    <span className={styles.displayName}>{u.display_name || u.username}</span>
                                    <span className={styles.username}>@{u.username}</span>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
