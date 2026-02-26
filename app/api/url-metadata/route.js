import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const { url } = await request.json();
        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // YouTube oEmbed
        const youtubeMatch = url.match(
            /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/
        );

        if (youtubeMatch) {
            const videoId = youtubeMatch[1];
            try {
                const oembedRes = await fetch(
                    `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
                );
                if (oembedRes.ok) {
                    const data = await oembedRes.json();
                    return NextResponse.json({
                        title: data.title,
                        creator: data.author_name,
                        cover_image_url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                        external_id: url,
                        source: 'youtube',
                    });
                }
            } catch (e) {
                // fallback below
            }
        }

        // Generic: fetch page and extract OpenGraph tags
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            }
        });

        if (!res.ok) {
            return NextResponse.json({ error: 'Failed to fetch URL' }, { status: 400 });
        }

        const html = await res.text();

        // Extract meta tags
        const getMetaContent = (property) => {
            const patterns = [
                new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i'),
                new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${property}["']`, 'i'),
                new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i'),
                new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${property}["']`, 'i'),
            ];
            for (const pattern of patterns) {
                const match = html.match(pattern);
                if (match) return match[1];
            }
            return null;
        };

        const title = getMetaContent('og:title') ||
            getMetaContent('twitter:title') ||
            html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ||
            '';

        const image = getMetaContent('og:image') ||
            getMetaContent('twitter:image') ||
            '';

        const author = getMetaContent('author') ||
            getMetaContent('og:site_name') ||
            '';

        return NextResponse.json({
            title: title.trim(),
            creator: author.trim(),
            cover_image_url: image,
            external_id: url,
            source: 'opengraph',
        });
    } catch (error) {
        console.error('URL Metadata Fetch Error:', error);
        return NextResponse.json({ error: 'Failed to extract metadata', details: error.message }, { status: 500 });
    }
}
