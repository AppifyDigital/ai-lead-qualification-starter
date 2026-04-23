"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const sb = supabaseBrowser();
      const { error } = await sb.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send link");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-6 text-ink">
      <div className="w-full max-w-[380px] rounded-[12px] border border-line bg-panel p-8">
        <div className="mb-1 font-mono text-[11px] tracking-[1.2px] text-ink-muted uppercase">
          Northline CRM
        </div>
        <h1 className="mb-1 text-[24px] font-semibold tracking-[-0.4px]">Sign in</h1>
        <p className="mb-6 text-[13px] text-ink-muted">
          We&rsquo;ll email you a one-time link.
        </p>

        {sent ? (
          <div className="rounded-[10px] border border-line bg-bg p-4 text-[13.5px] leading-[1.5]">
            Check <span className="font-medium">{email}</span>. The link signs
            you in for 1 hour.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-3">
            <Label className="grid gap-[6px]">
              <span className="text-[12px] font-medium text-ink-muted">Work email</span>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-auto rounded-[8px] border-line bg-bg px-[14px] py-[11px] text-[14px]"
              />
            </Label>

            <button
              type="submit"
              disabled={submitting}
              className={cn(
                "mt-1 flex h-11 items-center justify-center rounded-[10px] bg-ink text-[14px] font-medium text-bg",
                submitting && "cursor-progress opacity-70"
              )}
            >
              {submitting ? "Sending…" : "Send magic link"}
            </button>

            {error && <p className="text-[12px] text-red-600">{error}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
