import { NextResponse } from 'next/server';

// Cache the token in memory (server-side only)
let cachedToken = null;
let tokenExpiry = 0;

async function getSpotifyToken() {
    if (cachedToken && Date.now() < tokenExpiry) {
        return cachedToken;
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('Spotify credentials not configured');
    }

    const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: 'grant_type=client_credentials',
    });

    if (!res.ok) {
        throw new Error('Failed to get Spotify token');
    }

    const data = await res.json();
    cachedToken = data.access_token;
    // Expire 5 minutes early to be safe
    tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;
    return cachedToken;
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type') || 'album'; // 'album' or 'episode'

    if (!query || query.length < 2) {
        return NextResponse.json({ results: [] });
    }

    try {
        const token = await getSpotifyToken();

        const res = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${type}&limit=8`,
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );

        if (!res.ok) {
            throw new Error(`Spotify API error: ${res.status}`);
        }

        const data = await res.json();

        let results = [];

        if (type === 'album' && data.albums) {
            results = data.albums.items.map((a) => ({
                id: `spotify-${a.id}`,
                title: a.name,
                year: a.release_date ? new Date(a.release_date).getFullYear() : null,
                cover_image_url: a.images?.[0]?.url || null,
                creator: a.artists?.map((ar) => ar.name).join(', ') || null,
                category: 'album',
                external_url: a.external_urls?.spotify || null,
            }));
        }

        if (type === 'episode' && data.episodes) {
            results = data.episodes.items.map((ep) => ({
                id: `spotify-${ep.id}`,
                title: ep.name,
                year: ep.release_date ? new Date(ep.release_date).getFullYear() : null,
                cover_image_url: ep.images?.[0]?.url || null,
                creator: ep.show?.name || null,
                category: 'podcast',
                external_url: ep.external_urls?.spotify || null,
                description: ep.description?.slice(0, 200) || null,
            }));
        }

        return NextResponse.json({ results });
    } catch (error) {
        console.error('Spotify search error:', error);
        return NextResponse.json({ results: [], error: error.message }, { status: 500 });
    }
}
