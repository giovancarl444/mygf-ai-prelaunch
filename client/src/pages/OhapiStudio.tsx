import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import "./OhapiStudio.css";

const emptyDraft = {
  firstName: "",
  lastName: "",
  nationality: "American",
  ethnicity: "Caucasian",
  dateOfBirth: "1998-01-01",
  gender: "Female" as "Female" | "Male",
  job: "",
  whereYouLive: "",
  biography: "",
};

export default function OhapiStudio() {
  const { user, loading, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const isAdmin = user?.role === "admin";

  const [draft, setDraft] = useState(emptyDraft);
  const [draftGuid, setDraftGuid] = useState("");
  const [librarySections, setLibrarySections] = useState<{ section: string; count: number }[]>([]);

  const health = trpc.ohapiStudio.health.useQuery(undefined, { enabled: isAdmin });
  const companions = trpc.ohapiStudio.companions.useQuery(undefined, { enabled: isAdmin });
  const activity = trpc.ohapiStudio.recentActivity.useQuery(undefined, { enabled: isAdmin });

  const syncCompanions = trpc.ohapiStudio.syncCompanions.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.ohapiStudio.companions.invalidate(),
        utils.ohapiStudio.health.invalidate(),
        utils.ohapiStudio.recentActivity.invalidate(),
      ]);
    },
  });

  const setVisibility = trpc.ohapiStudio.setVisibility.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.ohapiStudio.companions.invalidate(),
        utils.ohapiStudio.health.invalidate(),
      ]);
    },
  });

  const refreshLibrary = trpc.ohapiStudio.refreshLibrary.useMutation({
    onSuccess: async result => {
      setLibrarySections(result.sections);
      await utils.ohapiStudio.recentActivity.invalidate();
    },
  });

  const generateDraft = trpc.ohapiStudio.generateDraft.useMutation({
    onSuccess: async result => {
      if (result.characterGuid) setDraftGuid(result.characterGuid);
      await utils.ohapiStudio.recentActivity.invalidate();
    },
  });

  const draftStatus = trpc.ohapiStudio.draftStatus.useQuery(
    { characterGuid: draftGuid || "00000000-0000-0000-0000-000000000000" },
    {
      enabled: Boolean(draftGuid),
      retry: false,
      refetchInterval: query => {
        const status = query.state.data?.status;
        return status === "saved" || status === "failed" ? false : 2_500;
      },
    },
  );

  const saveDraft = trpc.ohapiStudio.saveDraft.useMutation({
    onSuccess: async () => {
      await Promise.all([draftStatus.refetch(), utils.ohapiStudio.recentActivity.invalidate()]);
    },
  });

  if (loading) {
    return <main className="studio-loading"><Loader2 className="animate-spin" size={20} /> Opening owner studio…</main>;
  }

  if (!isAuthenticated) {
    return (
      <main className="gate">
        <div className="gate-card">
          <LockKeyhole size={30} />
          <h1>Owner sign-in required</h1>
          <p>This is the private operational studio for MyGF.ai. Sign in with the owner account to continue.</p>
          <button type="button" className="primary-button large" onClick={() => startLogin()}>Sign in</button>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="gate">
        <div className="gate-card">
          <ShieldCheck size={30} />
          <h1>Restricted</h1>
          <p>This operational surface is limited to the account owner.</p>
          <Link href="/" className="primary-button large">Back to MyGF.ai</Link>
        </div>
      </main>
    );
  }

  const draftReady = draftStatus.data?.status === "ready";
  const draftSaved = draftStatus.data?.status === "saved";

  return (
    <main className="studio-shell">
      <header className="studio-header">
        <Link href="/" className="studio-brand">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span>mygf<span>.ai</span></span>
        </Link>
        <div className="studio-header-actions">
          <span className="studio-kicker"><ShieldCheck size={14} /> Owner only · server mediated</span>
          <Link href="/" className="studio-back"><ArrowLeft size={15} /> Back to site</Link>
        </div>
      </header>

      <section className="studio-hero">
        <div>
          <p className="map-kicker"><span /> Operational Studio</p>
          <h1>Run the catalog.<br /><em>Server-side only.</em></h1>
          <p>
            The public catalog mirrors the provider companion library. Sync it here, choose
            who is visible, and create new companions. Nothing on this page is reachable
            from the customer product.
          </p>
        </div>
        <aside className="studio-boundary">
          <ShieldCheck size={19} />
          <div>
            <strong>The API key never leaves the server</strong>
            <p>This page never accepts or displays a key, and exposes only reviewed, typed operations.</p>
          </div>
        </aside>
      </section>

      <section className="studio-grid">
        <article className="studio-panel studio-health">
          <div className="studio-panel-heading">
            <div><p className="studio-label">Integration health</p><h2>Production boundary</h2></div>
            <Activity size={19} />
          </div>
          <div className="studio-health-row">
            <span className={health.data?.configured ? "studio-status studio-status-good" : "studio-status studio-status-muted"}>
              {health.data?.configured ? <CheckCircle2 size={15} /> : <CircleAlert size={15} />}
              {health.data?.configured ? "Server credential configured" : "Credential not configured"}
            </span>
          </div>
          <div className="studio-metrics">
            <div><strong>{health.data?.local.publishedCompanions ?? "—"}</strong><span>published</span></div>
            <div><strong>{health.data?.local.syncedCompanions ?? "—"}</strong><span>synced</span></div>
            <div><strong>{health.data?.local.activeRooms ?? "—"}</strong><span>active chats</span></div>
            <div><strong>{health.data?.local.mediaJobs ?? "—"}</strong><span>media jobs</span></div>
            <div><strong>{health.data?.local.openReports ?? "—"}</strong><span>open reports</span></div>
          </div>
        </article>

        <article className="studio-panel">
          <div className="studio-panel-heading">
            <div><p className="studio-label">Read-only provider view</p><h2>Customer library</h2></div>
            <RefreshCw size={19} />
          </div>
          <p className="studio-copy">Confirms the credential reaches the provider. Response bodies are never displayed or stored.</p>
          <button type="button" className="ghost-button" onClick={() => refreshLibrary.mutate()} disabled={refreshLibrary.isPending}>
            {refreshLibrary.isPending ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            {refreshLibrary.isPending ? "Refreshing…" : "Refresh provider library"}
          </button>
          {refreshLibrary.error && <p className="studio-error"><CircleAlert size={14} />{refreshLibrary.error.message}</p>}
          {librarySections.length > 0 && (
            <div className="studio-sections">
              {librarySections.map(section => <span key={section.section}><strong>{section.count}</strong> {section.section}</span>)}
            </div>
          )}
        </article>
      </section>

      <section className="studio-panel studio-ledger">
        <div className="studio-panel-heading">
          <div>
            <p className="studio-label">Public catalog</p>
            <h2>Companions</h2>
          </div>
          <button type="button" className="primary-button" onClick={() => syncCompanions.mutate()} disabled={syncCompanions.isPending}>
            {syncCompanions.isPending ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            {syncCompanions.isPending ? "Syncing…" : "Sync from provider"}
          </button>
        </div>
        <p className="studio-copy">
          Pulls <code>GET /api/v1/characters</code> into the local registry. Published
          companions appear on the public site and can be opened straight into a chat.
        </p>
        {syncCompanions.error && <p className="studio-error"><CircleAlert size={14} />{syncCompanions.error.message}</p>}
        {syncCompanions.data && (
          <p className="studio-result">
            Synced {syncCompanions.data.total} · {syncCompanions.data.created} new · {syncCompanions.data.updated} updated · {syncCompanions.data.retired} retired
          </p>
        )}

        <div className="studio-companion-list">
          {companions.isLoading && <div className="studio-empty"><Loader2 className="animate-spin" size={18} /></div>}
          {companions.data?.length ? companions.data.map(companion => (
            <div key={companion.worldSlug} className="studio-companion">
              <span className="studio-companion-avatar">
                {companion.profileImageUrl
                  ? <img src={companion.profileImageUrl} alt="" />
                  : <UserRound size={18} />}
              </span>
              <div className="studio-companion-copy">
                <strong>
                  {companion.displayName}
                  {companion.age !== null && <span> · {companion.age}</span>}
                </strong>
                <p>
                  {companion.occupation ?? "No occupation on record"}
                  {companion.providerType ? ` · ${companion.providerType.replace("_", " ").toLowerCase()}` : ""}
                  {companion.status !== "approved" ? ` · ${companion.status}` : ""}
                </p>
              </div>
              <button
                type="button"
                className="ghost-button"
                disabled={setVisibility.isPending}
                onClick={() => setVisibility.mutate({
                  worldSlug: companion.worldSlug,
                  visibility: companion.visibility === "published" ? "hidden" : "published",
                })}
              >
                {companion.visibility === "published" ? <><Eye size={14} /> Published</> : <><EyeOff size={14} /> Hidden</>}
              </button>
            </div>
          )) : !companions.isLoading && (
            <div className="studio-empty">Nothing synced yet. Run a sync to pull the provider library.</div>
          )}
        </div>
        {setVisibility.error && <p className="studio-error"><CircleAlert size={14} />{setVisibility.error.message}</p>}
      </section>

      <section className="studio-panel studio-ledger">
        <div className="studio-panel-heading">
          <div><p className="studio-label">Create</p><h2>New companion</h2></div>
          <Sparkles size={19} />
        </div>
        <p className="studio-copy">
          Generation stays private until you review the candidate and explicitly save it.
          Only a provider-confirmed <code>saved</code> character becomes real, and a new
          sync brings her into the catalog.
        </p>

        <form
          className="studio-draft-form"
          onSubmit={event => {
            event.preventDefault();
            generateDraft.mutate({
              firstName: draft.firstName.trim(),
              lastName: draft.lastName.trim(),
              nationality: draft.nationality.trim(),
              ethnicity: draft.ethnicity.trim(),
              biography: draft.biography.trim(),
              gender: draft.gender,
              dateOfBirth: draft.dateOfBirth,
              job: draft.job.trim() || undefined,
              whereYouLive: draft.whereYouLive.trim() || undefined,
            });
          }}
        >
          <label>First name<input value={draft.firstName} onChange={e => setDraft({ ...draft, firstName: e.target.value })} required /></label>
          <label>Last name<input value={draft.lastName} onChange={e => setDraft({ ...draft, lastName: e.target.value })} required /></label>
          <label>Nationality<input value={draft.nationality} onChange={e => setDraft({ ...draft, nationality: e.target.value })} required /></label>
          <label>Ethnicity<input value={draft.ethnicity} onChange={e => setDraft({ ...draft, ethnicity: e.target.value })} required /></label>
          <label>Date of birth (21+)<input type="date" value={draft.dateOfBirth} onChange={e => setDraft({ ...draft, dateOfBirth: e.target.value })} required /></label>
          <label>
            Gender
            <select value={draft.gender} onChange={e => setDraft({ ...draft, gender: e.target.value as "Female" | "Male" })}>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
            </select>
          </label>
          <label>Career<input value={draft.job} onChange={e => setDraft({ ...draft, job: e.target.value })} /></label>
          <label>Lives in<input value={draft.whereYouLive} onChange={e => setDraft({ ...draft, whereYouLive: e.target.value })} /></label>
          <label className="studio-wide">
            Biography
            <textarea value={draft.biography} onChange={e => setDraft({ ...draft, biography: e.target.value })} required minLength={20} />
          </label>
          <button type="submit" className="primary-button" disabled={generateDraft.isPending}>
            {generateDraft.isPending ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {generateDraft.isPending ? "Generating…" : "Generate candidate"}
          </button>
        </form>
        {generateDraft.error && <p className="studio-error"><CircleAlert size={14} />{generateDraft.error.message}</p>}

        {draftGuid && (
          <div className="studio-draft-status">
            <strong>Candidate</strong>
            <code>{draftGuid}</code>
            <p>
              Status: <strong>{String(draftStatus.data?.status ?? "checking…")}</strong>
              {draftSaved && typeof draftStatus.data?.characterId === "string" && (
                <> · durable ID <code>{draftStatus.data.characterId}</code> — run a sync to publish her.</>
              )}
            </p>
            {draftReady && (
              <button type="button" className="primary-button" onClick={() => saveDraft.mutate({ characterGuid: draftGuid })} disabled={saveDraft.isPending}>
                {saveDraft.isPending ? "Saving…" : "Save reviewed candidate"}
              </button>
            )}
            {draftSaved && (
              <button type="button" className="primary-button" onClick={() => syncCompanions.mutate()} disabled={syncCompanions.isPending}>
                <RefreshCw size={15} /> Sync her into the catalog
              </button>
            )}
            {draftStatus.error && <p className="studio-error"><CircleAlert size={14} />{draftStatus.error.message}</p>}
            {saveDraft.error && <p className="studio-error"><CircleAlert size={14} />{saveDraft.error.message}</p>}
          </div>
        )}
      </section>

      <section className="studio-panel studio-ledger">
        <div className="studio-panel-heading">
          <div><p className="studio-label">Sanitized action ledger</p><h2>Owner operation history</h2></div>
          <button type="button" className="ghost-button" onClick={() => activity.refetch()} disabled={activity.isFetching}>Refresh</button>
        </div>
        <p className="studio-copy">Action metadata and a sanitized outcome only — never credentials, headers, raw provider errors, or message content.</p>
        <div className="studio-ledger-list">
          {activity.data?.length ? activity.data.map(item => (
            <div key={item.id} className="studio-ledger-item">
              <span className={item.outcome === "succeeded" ? "studio-outcome studio-outcome-good" : "studio-outcome studio-outcome-failed"}>
                {item.outcome}
              </span>
              <div>
                <strong>{item.action.replaceAll("_", " ")}</strong>
                <p>{item.detail ?? "No retained detail."}{item.providerIdentifier ? ` · ${item.providerIdentifier}` : ""}</p>
              </div>
              <time>{new Date(item.createdAt).toLocaleString()}</time>
            </div>
          )) : <div className="studio-empty">No Studio operation has been recorded yet.</div>}
        </div>
      </section>
    </main>
  );
}
