// Media search APIs for auto-fetching cover art and metadata

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';
const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_KEY;

const GOOGLE_BOOKS_BASE = 'https://www.googleapis.com/books/v1';

// Search movies via TMDB
export async function searchMovies(query) {
    if (!query || query.length < 2) return [];
    try {
        const res = await fetch(
            `${TMDB_BASE}/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&page=1`
        );
        const data = await res.json();
        return (data.results || [])
            .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
            .slice(0, 8)
            .map((m) => ({
                id: `tmdb-${m.id}`,
                title: m.title || m.name,
                year: (m.release_date || m.first_air_date) ? new Date(m.release_date || m.first_air_date).getFullYear() : null,
                cover_image_url: m.poster_path ? `${TMDB_IMG}${m.poster_path}` : null,
                creator: null,
                category: 'movie',
            }));
    } catch {
        return [];
    }
}

const OPEN_LIBRARY_BASE = 'https://openlibrary.org';

// Search Google Books
async function searchGoogleBooks(query) {
    try {
        const res = await fetch(
            `${GOOGLE_BOOKS_BASE}/volumes?q=${encodeURIComponent(query)}&maxResults=8&printType=books`
        );
        const data = await res.json();
        return (data.items || []).slice(0, 8).map((b) => {
            const info = b.volumeInfo || {};
            let coverUrl = null;
            if (info.imageLinks) {
                coverUrl = info.imageLinks.extraLarge
                    || info.imageLinks.large
                    || info.imageLinks.medium
                    || info.imageLinks.thumbnail
                    || info.imageLinks.smallThumbnail
                    || null;
                if (coverUrl) {
                    coverUrl = coverUrl.replace('http://', 'https://');
                    coverUrl = coverUrl.replace('zoom=1', 'zoom=3');
                }
            }
            return {
                id: `gbooks-${b.id}`,
                title: info.title,
                year: info.publishedDate ? parseInt(info.publishedDate) : null,
                cover_image_url: coverUrl,
                creator: info.authors ? info.authors[0] : null,
                category: 'book',
                _source: 'google',
            };
        });
    } catch {
        return [];
    }
}

// Search Open Library (fallback)
async function searchOpenLibrary(query) {
    try {
        const res = await fetch(
            `${OPEN_LIBRARY_BASE}/search.json?q=${encodeURIComponent(query)}&limit=8`
        );
        const data = await res.json();
        return (data.docs || []).slice(0, 8).map((b) => ({
            id: `ol-${b.key}`,
            title: b.title,
            year: b.first_publish_year || null,
            cover_image_url: b.cover_i
                ? `https://covers.openlibrary.org/b/id/${b.cover_i}-L.jpg`
                : null,
            creator: b.author_name ? b.author_name[0] : null,
            category: 'book',
            _source: 'openlibrary',
        }));
    } catch {
        return [];
    }
}

// Combined book search: Google Books first, Open Library fallback
export async function searchBooks(query) {
    if (!query || query.length < 2) return [];

    // Always search Google Books first
    const googleResults = await searchGoogleBooks(query);

    // If Google returned enough results, use them
    if (googleResults.length >= 3) {
        return googleResults.map(({ _source, ...rest }) => rest);
    }

    // Otherwise, also search Open Library and merge
    const olResults = await searchOpenLibrary(query);

    // Deduplicate by normalized title — prefer Google Books results
    const seen = new Set();
    const merged = [];

    for (const item of [...googleResults, ...olResults]) {
        const key = item.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!seen.has(key)) {
            seen.add(key);
            const { _source, ...rest } = item;
            merged.push(rest);
        }
    }

    return merged.slice(0, 8);
}

// Search albums via Spotify API (server-side route)
export async function searchAlbums(query) {
    if (!query || query.length < 2) return [];
    try {
        const res = await fetch(
            `/api/spotify-search?q=${encodeURIComponent(query)}&type=album`
        );
        const data = await res.json();
        return data.results || [];
    } catch {
        return [];
    }
}

// Search videos via TMDB (TV shows as proxy)
export async function searchVideos(query) {
    if (!query || query.length < 2) return [];
    try {
        const res = await fetch(
            `${TMDB_BASE}/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&page=1`
        );
        const data = await res.json();
        return (data.results || [])
            .filter((r) => r.media_type === 'tv' || r.media_type === 'movie')
            .slice(0, 8)
            .map((v) => ({
                id: `tmdb-${v.id}`,
                title: v.title || v.name,
                year: (v.release_date || v.first_air_date)
                    ? new Date(v.release_date || v.first_air_date).getFullYear()
                    : null,
                cover_image_url: v.poster_path ? `${TMDB_IMG}${v.poster_path}` : null,
                creator: null,
                category: 'video',
            }));
    } catch {
        return [];
    }
}

// Search podcast episodes via Spotify API (server-side route)
export async function searchPodcasts(query) {
    if (!query || query.length < 2) return [];
    try {
        const res = await fetch(
            `/api/spotify-search?q=${encodeURIComponent(query)}&type=episode`
        );
        const data = await res.json();
        return data.results || [];
    } catch {
        return [];
    }
}

// Unified search based on category
export async function searchMedia(query, category) {
    switch (category) {
        case 'movie':
            return searchMovies(query);
        case 'book':
            return searchBooks(query);
        case 'album':
            return searchAlbums(query);
        case 'video':
            return searchVideos(query);
        case 'podcast':
            return searchPodcasts(query);
        default:
            return [];
    }
}
