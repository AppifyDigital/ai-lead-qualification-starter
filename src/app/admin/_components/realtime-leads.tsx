"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

// Mount inside /admin (list) or /admin/lead/[id] (detail). On the detail page,
// pass `leadId` to scope the subscription — otherwise every change for every
// lead triggers a refresh on every open tab.
export function RealtimeLeads({ leadId }: { leadId?: string } = {}) {
  const router = useRouter();

  useEffect(() => {
    const sb = supabaseBrowser();

    // Coalesce bursts (Vapi can fire several status-updates per second) so the
    // server isn't re-rendering the page back-to-back.
    let pending: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (pending) return;
      pending = setTimeout(() => {
        pending = null;
        router.refresh();
      }, 400);
    };

    const leadScope = leadId ? { filter: `id=eq.${leadId}` } : {};
    const childScope = leadId ? { filter: `lead_id=eq.${leadId}` } : {};

    const channel = sb
      .channel(`crm-stream${leadId ? `:${leadId}` : ""}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "leads", ...leadScope }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "calls", ...childScope }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "routing_decisions", ...childScope }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "documents", ...childScope }, refresh)
      .subscribe();

    return () => {
      if (pending) clearTimeout(pending);
      sb.removeChannel(channel);
    };
  }, [router, leadId]);

  return null;
}
