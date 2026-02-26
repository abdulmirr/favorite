import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Get the ISO string for the most recent Sunday at 00:00:00 local time
function getLastSundayISO() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return d.toISOString();
}

export async function GET(request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized: Missing Authorization header' }, { status: 401 });
        }

        // 1. Initialize Supabase client
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
                global: {
                    headers: {
                        Authorization: authHeader,
                    },
                },
            }
        );

        // 2. Get the authenticated user
        const token = authHeader.replace('Bearer ', '').trim();
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            console.error("Auth error:", authError);
            return NextResponse.json({ error: `Unauthorized: ${authError?.message || 'Invalid user token'}` }, { status: 401 });
        }

        const forceRefresh = request.nextUrl.searchParams.get('refresh') === 'true';
        const lastSunday = getLastSundayISO();

        // 3. Check persistent Weekly Recommendations Cache in Supabase
        if (!forceRefresh) {
            const { data: cached, error: cacheErr } = await supabase
                .from('weekly_recommendations')
                .select('categories_json, updated_at')
                .eq('user_id', user.id)
                .single();

            if (cached && !cacheErr) {
                const updatedDate = new Date(cached.updated_at);
                const sundayDate = new Date(lastSunday);
                // If it was updated ON or AFTER the most recent Sunday, it's valid for this week
                if (updatedDate >= sundayDate) {
                    return NextResponse.json({ recommendations: cached.categories_json, cached: true });
                }
            }
        }

        // 4. Fetch the user's full library
        const { data: library, error: dbError } = await supabase
            .from('media_entries')
            .select('title, category, creator, rating, year, notes')
            .eq('user_id', user.id)
            .order('rating', { ascending: false });

        if (dbError) throw dbError;

        if (!library || library.length === 0) {
            return NextResponse.json({
                recommendations: [],
                message: 'Start logging your favorites to get personalized recommendations!'
            });
        }

        // 5. Structure the library for the LLM
        const organized = library.reduce((acc, item) => {
            if (!acc[item.category]) acc[item.category] = [];
            acc[item.category].push(`${item.title}${item.creator ? ` by ${item.creator}` : ''} ${item.year ? `(${item.year})` : ''} - Rating: ${item.rating}/5${item.notes ? ` - Note: ${item.notes}` : ''}`);
            return acc;
        }, {});

        const libraryDescription = Object.entries(organized)
            .map(([category, items]) => `### ${category.toUpperCase()}\n${items.join('\n')}`)
            .join('\n\n');

        // 6. Call Google Gemini 2.0 Flash API
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;
        if (!GEMINI_API_KEY) {
            return NextResponse.json({ error: 'GEMINI_API_KEY is not configured in .env.local' }, { status: 500 });
        }

        const prompt = `You are an expert cultural curator and recommendation engine. 
Below is a user's library of media they have consumed and rated (out of 5). 

USER's LIBRARY:
${libraryDescription}

Based on their exact tastes, highly rated items, and specific notes, recommend new media for them to consume.
Only recommend things that are highly correlated with what they already enjoy. Do not recommend items they have already logged.

Return YOUR ENTIRE RESPONSE as a single strict JSON object with this exact structure (do not include markdown codeblocks or any other text):
{
  "categories": [
    {
      "categoryTitle": "Movies you'd love",
      "category": "movie",
      "items": [
        {
          "title": "Title of the item",
          "creator": "Director/Author/Artist name",
          "year": 2023,
          "reason": "One concise sentence explaining why this specific user will like this based on their library",
          "query": "Title + Creator (for fetching images)"
        }
      ]
    }
  ]
}

Provide 3 categories that make sense based on their library (e.g., "movie", "book", "album", "podcast"). 
For each category, provide 3-4 excellent recommendations.`;

        const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.8,
                        responseMimeType: "application/json",
                    }
                })
            }
        );

        if (!geminiRes.ok) {
            const errorText = await geminiRes.text();
            console.error('Gemini API raw error:', errorText);

            let errorMessage = "AI Generation Failed";
            try {
                const parsedError = JSON.parse(errorText);
                if (parsedError.error && parsedError.error.message) {
                    errorMessage = parsedError.error.message;
                }
            } catch (e) {
                errorMessage = errorText || `HTTP ${geminiRes.status}`;
            }

            return NextResponse.json({ error: `Gemini API Error: ${errorMessage}` }, { status: 500 });
        }

        const geminiData = await geminiRes.json();
        const responseText = geminiData.candidates[0].content.parts[0].text;

        let recommendations;
        try {
            const parsed = JSON.parse(responseText);
            recommendations = parsed.categories || [];
        } catch (e) {
            console.error("Failed to parse Gemini JSON:", responseText);
            return NextResponse.json({ error: 'Invalid JSON format received from AI' }, { status: 500 });
        }

        // 7. Persist to Supabase Weekly Cache
        await supabase
            .from('weekly_recommendations')
            .upsert({
                user_id: user.id,
                categories_json: recommendations,
                updated_at: new Date().toISOString()
            });

        return NextResponse.json({ recommendations, cached: false });

    } catch (error) {
        console.error('Recommendations API Catch Error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error while generating recommendations' }, { status: 500 });
    }
}
