import { createBrowserClient } from "@supabase/ssr";

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

const supabaseUrl =
  readEnv("NEXT_PUBLIC_SUPABASE_URL") ??
  readEnv("NEXT_PUBLIC_SUPABASE_PROJECT_URL");

const supabaseKey =
  readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
  readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

export const supabase =
  supabaseUrl && supabaseKey
    ? createBrowserClient(supabaseUrl, supabaseKey)
    : null;
