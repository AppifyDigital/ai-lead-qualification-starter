import { createBrowserClient } from "@supabase/ssr";

// Browser client — used inside client components for realtime subscriptions.
export const supabaseBrowser = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
