'use client';

import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';

export default function MainContent({ children }) {
    const { user } = useAuth();
    const pathname = usePathname();

    const hideSidebar = !user || ['/', '/login', '/signup'].includes(pathname);

    return (
        <main style={{ marginLeft: hideSidebar ? 0 : 'var(--sidebar-width)' }}>
            {children}
        </main>
    );
}
