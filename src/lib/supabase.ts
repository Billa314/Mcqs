import { createClient } from "@supabase/supabase-js";

// Provide fallback values to prevent Next.js build-time crashes if Vercel starts building
// before the environment variables are fully injected.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

export const supabase = createClient(supabaseUrl, supabaseKey);
