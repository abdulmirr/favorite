import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        // Use a custom lock implementation that avoids the Navigator LockManager
        // timeout issues common in Next.js dev mode with HMR
        lock: (name, acquireTimeout, fn) => {
            return fn();
        },
    },
});
