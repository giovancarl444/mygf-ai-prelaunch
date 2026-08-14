import { AIChatBox, type Message } from "@/components/AIChatBox";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, CircleAlert, Flag, Loader2, LockKeyhole, Pencil, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import "./Pilot.css";
import "./PilotBeta.css";

type ProviderRoomGender = "male" | "female";
type TextingStyle = "default" | "short-form" | "long-form";

export default function Pilot() {
  const { user, loading, isAuthenticated } = useAuth();
  const [selectedWorld, setSelectedWorld] = useState("");
  const [userGender, setUserGender] = useState<ProviderRoomGender | "">("");
  const [textingStyle, setTextingStyle] = useState<TextingStyle>("default");
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const [mapWorldSlug, setMapWorldSlug] = useState("camille-rowan");
  const [mapDisplayName, setMapDisplayName] = useState("Camille Rowan");
  const [mapProviderId, setMapProviderId] = useState("");
  const [draftGuid, setDraftGuid] = useState("");
  const [awaitingSaveConfirmation, setAwaitingSaveConfirmation] = useState(false);
  const [draftNationality, setDraftNationality] = useState("American");
  const [draftEthnicity, setDraftEthnicity] = useState("Caucasian");
  const [draftFirstName, setDraftFirstName] = useState("Camille");
  const [draftLastName, setDraftLastName] = useState("Rowan");
  const [draftBiography, setDraftBiography] = useState("Camille Rowan is a clearly adult fictional AI companion world: composed, candid, and quietly funny, designed for imaginative private text threads with clear AI boundaries.");
  const [draftGender, setDraftGender] = useState<"Female" | "Male">("Female");
  const [draftDateOfBirth, setDraftDateOfBirth] = useState("1993-10-14");
  const [draftJob, setDraftJob] = useState("Independent book editor");
  const [draftWhereYouLive, setDraftWhereYouLive] = useState("Chicago, Illinois, USA");
  const [threadTitle, setThreadTitle] = useState("");
  const [clearArmed, setClearArmed] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<"safety" | "quality" | "other">("quality");
  const [reportDetail, setReportDetail] = useState("");
  const [rateRemaining, setRateRemaining] = useState<number | null>(null);

  const published = trpc.ohapiPilot.published.useQuery(undefined, { enabled: isAuthenticated });
  const history = trpc.ohapiPilot.history.useQuery(
    { worldSlug: selectedWorld || "unselected" },
    { enabled: isAuthenticated && Boolean(selectedWorld) },
  );
  const send = trpc.ohapiPilot.send.useMutation();
  const renameThread = trpc.ohapiPilot.renameThread.useMutation({
    onSuccess: async () => { await history.refetch(); },
  });
  const clearThread = trpc.ohapiPilot.clearThread.useMutation({
    onSuccess: async () => {
      setOptimisticMessages([]);
      setClearArmed(false);
      setThreadTitle("");
      await history.refetch();
    },
  });
  const reportThread = trpc.ohapiPilot.report.useMutation({
    onSuccess: () => {
      setReportOpen(false);
      setReportDetail("");
    },
  });
  const mapCharacter = trpc.ohapiPilot.admin.mapApprovedCharacter.useMutation({
    onSuccess: async mapped => {
      setMapProviderId("");
      await published.refetch();
      if (mapped?.worldSlug) setSelectedWorld(mapped.worldSlug);
    },
  });
  const generateDraft = trpc.ohapiPilot.admin.generateDraft.useMutation({
    onSuccess: draft => {
      if (draft.characterGuid) {
        setAwaitingSaveConfirmation(false);
        setDraftGuid(draft.characterGuid);
      }
    },
  });
  const draftStatus = trpc.ohapiPilot.admin.draftStatus.useQuery(
    { characterGuid: draftGuid || "00000000-0000-0000-0000-000000000000" },
    {
      enabled: Boolean(draftGuid),
      retry: false,
      refetchInterval: query => {
        const status = query.state.data?.status;
        if (status === "saved" || status === "failed" || (status === "ready" && !awaitingSaveConfirmation)) return false;
        return 2_500;
      },
    },
  );
  const saveDraft = trpc.ohapiPilot.admin.saveDraft.useMutation({
    onSuccess: async () => {
      setAwaitingSaveConfirmation(true);
      await draftStatus.refetch();
    },
  });
  const selectedCharacter = published.data?.find(character => character.worldSlug === selectedWorld);

  useEffect(() => {
    if (!selectedWorld && published.data?.[0]?.worldSlug) setSelectedWorld(published.data[0].worldSlug);
  }, [published.data, selectedWorld]);

  useEffect(() => {
    if (typeof draftStatus.data?.characterId === "string") setMapProviderId(draftStatus.data.characterId);
  }, [draftStatus.data?.characterId]);

  useEffect(() => {
    const savedTitle = history.data?.room?.title;
    if (savedTitle) setThreadTitle(savedTitle);
    else if (history.data?.room && selectedCharacter) setThreadTitle(`${selectedCharacter.displayName} thread`);
  }, [history.data?.room?.id, history.data?.room?.title, selectedCharacter?.displayName]);

  const messages = useMemo<Message[]>(() => [
    ...(history.data?.messages.map(message => ({ role: message.role, content: message.content })) ?? []),
    ...optimisticMessages,
  ], [history.data?.messages, optimisticMessages]);

  const canSend = Boolean(selectedWorld && userGender && adultConfirmed && !send.isPending);

  const handleSend = (prompt: string) => {
    if (!selectedWorld || !userGender || !adultConfirmed) return;
    setOptimisticMessages(previous => [...previous, { role: "user", content: prompt }]);
    send.mutate({
      worldSlug: selectedWorld,
      userGender,
      textingStyle,
      prompt,
    }, {
      onSuccess: async result => {
        setRateRemaining(result.remaining);
        setOptimisticMessages([]);
        await history.refetch();
      },
      onError: () => setOptimisticMessages([]),
    });
  };

  if (loading) {
    return <main className="pilot-loading"><Loader2 className="animate-spin" size={24} /><span>Opening your private pilot…</span></main>;
  }

  if (!isAuthenticated) {
    return <main className="pilot-shell pilot-access-shell"><header className="pilot-header"><Link href="/" className="pilot-brand"><span className="brand-mark" aria-hidden="true"><span /></span><span>mygf<span>.ai</span></span></Link><Link href="/" className="pilot-exit"><ArrowLeft size={15} />Back to worlds</Link></header><section className="pilot-access-gate" aria-labelledby="private-access-title"><p className="map-kicker"><span />Private access</p><h1 id="private-access-title">Your private thread<br /><em>starts with your account.</em></h1><p>Sign in before a conversation begins so your thread, reporting controls, transcript clear action, and hourly limit remain attached to you—not a shared browser session.</p><button type="button" className="rose-button" onClick={() => startLogin()}>Sign in to continue <Sparkles size={17} /></button><small><LockKeyhole size={13} />Adult AI companion experience · Not therapy · Not human</small></section></main>;
  }

  return (
    <main className="pilot-shell">
      <header className="pilot-header">
        <Link href="/" className="pilot-brand"><span className="brand-mark" aria-hidden="true"><span /></span><span>mygf<span>.ai</span></span></Link>
        <div><span className="pilot-kicker"><span />Live pilot · Text only</span>{user?.role === "admin" && <Link href="/ops/ohapi" className="pilot-exit">Owner Studio</Link>}<Link href="/" className="pilot-exit"><ArrowLeft size={15} />Back to worlds</Link></div>
      </header>

      <section className="pilot-intro" aria-labelledby="pilot-title">
        <div><p className="map-kicker"><span />Private connection test</p><h1 id="pilot-title">One world.<br /><em>One private thread.</em></h1><p>This early pilot connects an approved fictional adult AI world to a private text thread. It is AI, not human, and not therapy.</p></div>
        <div className="pilot-boundary"><LockKeyhole size={18} /><div><strong>Your thread stays account-bound</strong><p>Rooms are created and stored per signed-in account and approved companion. The external credential never reaches your browser.</p></div></div>
      </section>

      <section className="pilot-workspace" aria-label="Private companion pilot">
        <aside className="pilot-controls">
          <div className="pilot-user"><span>Signed in as</span><strong>{user?.name ?? user?.email ?? "Private pilot member"}</strong></div>
          <div className="pilot-control-group"><Label htmlFor="pilot-world">Approved companion</Label><Select value={selectedWorld} onValueChange={setSelectedWorld} disabled={published.isLoading || !published.data?.length}><SelectTrigger id="pilot-world"><SelectValue placeholder={published.isLoading ? "Loading approved worlds…" : "No approved world yet"} /></SelectTrigger><SelectContent>{published.data?.map(character => <SelectItem key={character.worldSlug} value={character.worldSlug}>{character.displayName}</SelectItem>)}</SelectContent></Select>{selectedCharacter && <p className="pilot-control-note"><Sparkles size={13} />{selectedCharacter.displayName} is an owner-approved fictional adult AI world.</p>}</div>
          <div className="pilot-control-group"><Label htmlFor="pilot-style">Reply style</Label><Select value={textingStyle} onValueChange={value => setTextingStyle(value as TextingStyle)}><SelectTrigger id="pilot-style"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="default">Default</SelectItem><SelectItem value="short-form">Short form</SelectItem><SelectItem value="long-form">Long form</SelectItem></SelectContent></Select></div>
          <div className="pilot-control-group"><Label htmlFor="pilot-gender">Provider room context</Label><Select value={userGender} onValueChange={value => setUserGender(value as ProviderRoomGender)}><SelectTrigger id="pilot-gender"><SelectValue placeholder="Choose a value" /></SelectTrigger><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem></SelectContent></Select><p className="pilot-control-note">The connected provider currently requires this value when creating a room. It is not displayed in the conversation.</p></div>
          <label className="pilot-confirm"><Checkbox checked={adultConfirmed} onCheckedChange={checked => setAdultConfirmed(checked === true)} /><span>I confirm that I am an adult and understand this is an AI experience.</span></label>
          {send.error && <p className="pilot-error" role="alert"><CircleAlert size={15} />{send.error.message}</p>}
        </aside>

        <div className="pilot-chat-panel">
          {!published.isLoading && !published.data?.length ? <div className="pilot-unavailable"><Sparkles size={24} /><h2>Awaiting one approved world</h2><p>The connected OhAPI account is ready, but it does not yet contain an owner-approved character. Once an approved provider character is mapped below, this page is ready to open a private text room and store its thread.</p></div> : <>
            {history.data?.room && <div className="pilot-thread-tools">
              <div className="pilot-thread-title"><Pencil size={14} /><input aria-label="Private thread title" value={threadTitle} onChange={event => setThreadTitle(event.target.value)} /><Button type="button" variant="outline" size="sm" onClick={() => renameThread.mutate({ roomId: history.data!.room!.id, title: threadTitle.trim() })} disabled={!threadTitle.trim() || renameThread.isPending}>Save</Button></div>
              <div className="pilot-thread-actions"><Button type="button" variant="ghost" size="sm" onClick={() => setReportOpen(open => !open)}><Flag size={14} />Report</Button>{!clearArmed ? <Button type="button" variant="ghost" size="sm" onClick={() => setClearArmed(true)}><Trash2 size={14} />Clear</Button> : <span className="pilot-clear-confirm">Clear MyGF.ai’s local transcript? <Button type="button" variant="destructive" size="sm" onClick={() => clearThread.mutate({ roomId: history.data!.room!.id })} disabled={clearThread.isPending}>Confirm</Button><Button type="button" variant="ghost" size="sm" onClick={() => setClearArmed(false)}>Cancel</Button></span>}</div>
            </div>}
            {history.data?.room && reportOpen && <form className="pilot-report" onSubmit={event => { event.preventDefault(); reportThread.mutate({ roomId: history.data!.room!.id, reason: reportReason, detail: reportDetail.trim() || undefined }); }}><div><Label htmlFor="report-reason">Report type</Label><Select value={reportReason} onValueChange={value => setReportReason(value as "safety" | "quality" | "other")}><SelectTrigger id="report-reason"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="safety">Safety concern</SelectItem><SelectItem value="quality">Quality issue</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div><label>Optional note<textarea maxLength={800} value={reportDetail} onChange={event => setReportDetail(event.target.value)} placeholder="Share enough detail for private review." /></label><Button type="submit" size="sm" disabled={reportThread.isPending}>{reportThread.isPending ? "Sending…" : "Send private report"}</Button>{reportThread.error && <p className="pilot-error" role="alert"><CircleAlert size={15} />{reportThread.error.message}</p>}</form>}
            <p className="pilot-limit-note">Text pilot limit: eight messages per account each UTC hour{rateRemaining !== null ? ` · ${rateRemaining} remaining this hour` : ""}. Clearing removes MyGF.ai’s stored transcript; provider retention is separate.</p>
            <AIChatBox messages={messages} onSendMessage={handleSend} isLoading={send.isPending} className="pilot-chatbox" height="650px" placeholder={canSend ? "Write a first line…" : "Choose a world, room context, and confirm adult status first"} emptyStateMessage={selectedCharacter ? `Begin a private thread with ${selectedCharacter.displayName}.` : "Choose an approved world to begin."} suggestedPrompts={canSend ? ["Set the scene in one detail.", "What is the first thing you notice?", "Give this thread a starting direction."] : undefined} />
          </>}
        </div>
      </section>

      {user?.role === "admin" && <section className="pilot-admin" aria-labelledby="pilot-admin-title"><div><p className="map-kicker"><span />Owner setup</p><h2 id="pilot-admin-title">Prepare the next world privately.</h2><p>Generation remains private until you inspect the returned candidate and explicitly save it. The provider status is checked until it confirms `saved`; only its matching durable `characterId` can be mapped to a MyGF.ai world.</p></div><div className="pilot-owner-stack"><form className="pilot-draft-form" onSubmit={event => { event.preventDefault(); generateDraft.mutate({ nationality: draftNationality.trim(), ethnicity: draftEthnicity.trim(), firstName: draftFirstName.trim(), lastName: draftLastName.trim(), biography: draftBiography.trim(), gender: draftGender, dateOfBirth: draftDateOfBirth, job: draftJob.trim() || undefined, whereYouLive: draftWhereYouLive.trim() || undefined }); }}><label>First name<input value={draftFirstName} onChange={event => setDraftFirstName(event.target.value)} required /></label><label>Last name<input value={draftLastName} onChange={event => setDraftLastName(event.target.value)} required /></label><label>Nationality<input value={draftNationality} onChange={event => setDraftNationality(event.target.value)} required /></label><label>Ethnicity<input value={draftEthnicity} onChange={event => setDraftEthnicity(event.target.value)} required /></label><label>Adult date of birth<input type="date" value={draftDateOfBirth} onChange={event => setDraftDateOfBirth(event.target.value)} required /></label><label>Gender<Select value={draftGender} onValueChange={value => setDraftGender(value as "Female" | "Male")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Female">Female</SelectItem><SelectItem value="Male">Male</SelectItem></SelectContent></Select></label><label>Career<input value={draftJob} onChange={event => setDraftJob(event.target.value)} /></label><label>Lives in<input value={draftWhereYouLive} onChange={event => setDraftWhereYouLive(event.target.value)} /></label><label className="pilot-wide-input">Biography<textarea value={draftBiography} onChange={event => setDraftBiography(event.target.value)} required /></label><Button type="submit" disabled={generateDraft.isPending}>{generateDraft.isPending ? "Generating private draft…" : "Generate private candidate"}</Button></form>{generateDraft.error && <p className="pilot-error" role="alert"><CircleAlert size={15} />{generateDraft.error.message}</p>}{draftGuid && <div className="pilot-draft-status"><strong>Draft identifier</strong><code>{draftGuid}</code><div><Button type="button" variant="outline" onClick={() => draftStatus.refetch()} disabled={draftStatus.isFetching}>Check draft status</Button>{draftStatus.data?.status === "ready" && <Button type="button" onClick={() => saveDraft.mutate({ characterGuid: draftGuid })} disabled={saveDraft.isPending}>{saveDraft.isPending ? "Saving…" : "Save reviewed candidate"}</Button>}</div>{draftStatus.data && <p>Status: <strong>{String(draftStatus.data.status ?? "unknown")}</strong>{draftStatus.data?.status === "saved" && typeof draftStatus.data.characterId === "string" ? " · durable character ID is confirmed and ready for mapping below." : awaitingSaveConfirmation ? " · waiting for the provider to confirm the saved character." : ""}</p>}{draftStatus.error && <p className="pilot-error" role="alert"><CircleAlert size={15} />{draftStatus.error.message}</p>}{saveDraft.error && <p className="pilot-error" role="alert"><CircleAlert size={15} />{saveDraft.error.message}</p>}</div>}</div><form className="pilot-map-form" onSubmit={event => { event.preventDefault(); mapCharacter.mutate({ worldSlug: mapWorldSlug.trim(), displayName: mapDisplayName.trim(), characterGuid: draftGuid.trim(), providerCharacterId: mapProviderId.trim() }); }}><label>MyGF.ai world slug<input value={mapWorldSlug} onChange={event => setMapWorldSlug(event.target.value)} required /></label><label>Display name<input value={mapDisplayName} onChange={event => setMapDisplayName(event.target.value)} required /></label><label>Reviewed OhAPI draft identifier<input value={draftGuid} onChange={event => setDraftGuid(event.target.value)} required /></label><label>Confirmed OhAPI character ID<input value={mapProviderId} onChange={event => setMapProviderId(event.target.value)} required /></label><Button type="submit" disabled={mapCharacter.isPending || draftStatus.data?.status !== "saved" || draftStatus.data?.characterId !== mapProviderId.trim()}>{mapCharacter.isPending ? "Mapping…" : "Approve saved mapping"}</Button>{mapCharacter.error && <p className="pilot-error" role="alert"><CircleAlert size={15} />{mapCharacter.error.message}</p>}</form></section>}
    </main>
  );
}
