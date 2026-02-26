import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const directoryPath = path.join(process.cwd(), 'public', 'loginpics');

        let files = [];
        try {
            files = fs.readdirSync(directoryPath);
        } catch (error) {
            console.error('Error reading loginpics directory:', error);
            return NextResponse.json({ error: 'Failed to read loginpics directory' }, { status: 500 });
        }

        const images = files
            .filter(file => /\.(jpg|jpeg|png|webp|gif)$/i.test(file))
            .map(file => `/loginpics/${file}`);

        return NextResponse.json(images);
    } catch (error) {
        console.error('Error reading images directory:', error);
        return NextResponse.json({ error: 'Failed to read images directory' }, { status: 500 });
    }
}
