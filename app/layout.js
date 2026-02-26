import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter'
});

export const metadata = {
  title: {
    default: 'favorite',
    template: 'favorite/%s',
  },
  description: 'A personal archive for your favorite movies, albums, books, podcasts, blogs, and ideas. Track, review, and curate the most inspiring media in the world.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body suppressHydrationWarning>
        <AuthProvider>
          <Navbar />
          <main style={{ paddingTop: 'var(--nav-height)' }}>
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
