import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Activity, ArrowLeft, CheckCircle2, CircleAlert, Database, RefreshCw, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import "./OhapiStudio.css";

export default function OhapiStudio() {
  const { user, loading, isAuthenticated } = useAuth({ redirectOnUnauthenticated: true });
  const [draftGuid, setDraftGuid] = useState("");
  const [librarySections, setLibrarySections] = useState<{ section: string; count: number }[]>([]);
  const [draftResult, setDraftResult] = useState<{ status: string; characterId: string | null } | null>(null);
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const health = trpc.ohapiStudio.health.useQuery(undefined, { enabled: Boolean(isAdmin) });
  const activity = trpc.ohapiStudio.recentActivity.useQuery(undefined, { enabled: Boolean(isAdmin) });
  const refreshLibrary = trpc.ohapiStudio.refreshLibrary.useMutation({
    onSuccess: async result => {
      setLibrarySections(result.sections);
      await utils.ohapiStudio.recentActivity.invalidate();
    },
  });
  const inspectDraft = trpc.ohapiStudio.inspectDraft.useMutation({
    onSuccess: async result => {
      setDraftResult(result);
      await utils.ohapiStudio.recentActivity.invalidate();
    },
  });

  if (loading || !isAuthenticated) return <main className="studio-loading">Opening owner studio…</main>;
  if (!isAdmin) return <main className="studio-loading">This private operational surface is restricted to the account owner.</main>;

  return (
    <main className="studio-shell">
      <header className="studio-header">
        <Link href="/" className="studio-brand"><span className="brand-mark" aria-hidden="true"><span /></span><span>mygf<span>.ai</span></span></Link>
        <div className="studio-header-actions"><span className="studio-kicker"><ShieldCheck size={14} /> Owner-only · server mediated</span><Link href="/pilot" className="studio-back"><ArrowLeft size={15} /> Pilot setup</Link></div>
      </header>

      <section className="studio-hero">
        <div><p className="map-kicker"><span /> Operational Studio</p><h1>Private control.<br /><em>Server-side only.</em></h1><p>This is the production-safe counterpart to the isolated development playground. It never accepts or displays a browser API key, and it exposes only reviewed provider operations.</p></div>
        <aside className="studio-boundary"><ShieldCheck size={19} /><div><strong>Not a generic provider console</strong><p>Media, Cam, digital twins, raw diagnostics, and arbitrary request composition remain disabled in this product surface.</p></div></aside>
      </section>

      <section className="studio-grid" aria-label="OhAPI Studio overview">
        <article className="studio-panel studio-health"><div className="studio-panel-heading"><div><p className="studio-label">Integration health</p><h2>Production boundary</h2></div><Activity size={19} /></div><div className="studio-health-row"><span className={health.data?.configured ? "studio-status studio-status-good" : "studio-status studio-status-muted"}>{health.data?.configured ? <CheckCircle2 size={15} /> : <CircleAlert size={15} />}{health.data?.configured ? "Server credential configured" : "Credential not configured"}</span><p>The key stays in managed server configuration and is not returned to this page.</p></div><div className="studio-metrics"><div><strong>{health.data?.local.approvedCharacters ?? "—"}</strong><span>approved worlds</span></div><div><strong>{health.data?.local.activeRooms ?? "—"}</strong><span>active local rooms</span></div><div><strong>{health.data?.local.openReports ?? "—"}</strong><span>open reports</span></div></div></article>

        <article className="studio-panel studio-sienna"><div className="studio-panel-heading"><div><p className="studio-label">Companion readiness</p><h2>Sienna Vale</h2></div><CircleAlert size={19} /></div><span className="studio-status studio-status-muted">Identity review required</span><p className="studio-copy">The provider mapping is technically present{health.data?.local.sienna?.providerCharacterId ? <> as <code>{health.data.local.sienna.providerCharacterId}</code></> : ""}, but the public Sienna concept has not yet been approved as the same provider identity. Do not position this as a finished live companion.</p><p className="studio-verified-note">Verified: saved mapping and one-character provider library. Still required: one final identity brief, visual truthfulness review, and representative thread approval.</p></article>

        <article className="studio-panel"><div className="studio-panel-heading"><div><p className="studio-label">Read-only provider view</p><h2>Customer library</h2></div><Database size={19} /></div><p className="studio-copy">Refreshes only the documented customer-library endpoint. Response bodies and provider diagnostics are intentionally not displayed or stored.</p><Button type="button" onClick={() => refreshLibrary.mutate()} disabled={refreshLibrary.isPending} className="studio-action">{refreshLibrary.isPending ? <RefreshCw size={15} className="animate-spin" /> : <RefreshCw size={15} />}{refreshLibrary.isPending ? "Refreshing…" : "Refresh provider library"}</Button>{refreshLibrary.error && <p className="studio-error"><CircleAlert size={14} />{refreshLibrary.error.message}</p>}{librarySections.length > 0 && <div className="studio-sections">{librarySections.map(section => <span key={section.section}><strong>{section.count}</strong> {section.section}</span>)}</div>}</article>

        <article className="studio-panel"><div className="studio-panel-heading"><div><p className="studio-label">Reviewed candidate check</p><h2>Draft status</h2></div><ShieldCheck size={19} /></div><p className="studio-copy">Use a private draft identifier to verify whether the provider has completed the candidate lifecycle. Mapping remains available only after a confirmed matching <code>saved</code> status in the pilot setup.</p><div className="studio-inline-form"><Input value={draftGuid} onChange={event => setDraftGuid(event.target.value)} placeholder="Draft UUID" aria-label="OhAPI draft identifier" /><Button type="button" onClick={() => inspectDraft.mutate({ characterGuid: draftGuid.trim() })} disabled={!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(draftGuid.trim()) || inspectDraft.isPending} className="studio-action">{inspectDraft.isPending ? "Checking…" : "Inspect"}</Button></div>{inspectDraft.error && <p className="studio-error"><CircleAlert size={14} />{inspectDraft.error.message}</p>}{draftResult && <p className="studio-result">Provider status: <strong>{draftResult.status}</strong>{draftResult.characterId ? <> · durable ID: <code>{draftResult.characterId}</code></> : " · no durable ID returned yet"}</p>}<Link href="/pilot" className="studio-link">Continue reviewed save and mapping in Pilot setup <ArrowLeft size={14} /></Link></article>
      </section>

      <section className="studio-panel studio-ledger"><div className="studio-panel-heading"><div><p className="studio-label">Sanitized action ledger</p><h2>Owner operation history</h2></div><Button type="button" variant="outline" size="sm" onClick={() => activity.refetch()} disabled={activity.isFetching}>Refresh</Button></div><p className="studio-copy">This ledger stores action metadata and a sanitized outcome only. It never stores credentials, headers, raw provider errors, or private message content.</p><div className="studio-ledger-list">{activity.data?.length ? activity.data.map(item => <div key={item.id} className="studio-ledger-item"><span className={item.outcome === "succeeded" ? "studio-outcome studio-outcome-good" : "studio-outcome studio-outcome-failed"}>{item.outcome}</span><div><strong>{item.action.replaceAll("_", " ")}</strong><p>{item.detail ?? "No retained detail."}{item.providerIdentifier ? ` · ${item.providerIdentifier}` : ""}</p></div><time>{new Date(item.createdAt).toLocaleString()}</time></div>) : <div className="studio-empty">No Studio operation has been recorded yet.</div>}</div></section>
    </main>
  );
}
