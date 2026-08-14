import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  CircleAlert,
  Download,
  Flag,
  ImageIcon,
  Loader2,
  LockKeyhole,
  Mic,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  Video,
  Wand2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";

type MediaTab = "image" | "audio" | "video";
type ActiveJob = { jobId: string; kind: MediaTab; startedAt: number };
type ReportReason = "safety" | "quality" | "other";

const JOB_TIMEOUT_MS = 5 * 60 * 1000;
const JOB_POLL_MS = 2_000;

export default function Chat() {
  const [, params] = useRoute("/chat/:slug");
  const [, navigate] = useLocation();
  const slug = params?.slug ?? "";

  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const utils = trpc.useUtils();

  const session = trpc.chat.session.useQuery(undefined, { enabled: isAuthenticated });
  const adultConfirmed = Boolean(session.data?.adultConfirmed);
  const companion = trpc.companions.bySlug.useQuery({ worldSlug: slug }, { enabled: Boolean(slug) });
  const history = trpc.chat.history.useQuery(
    { worldSlug: slug },
    { enabled: isAuthenticated && Boolean(slug) && adultConfirmed },
  );
  const gallery = trpc.media.gallery.useQuery(
    { worldSlug: slug },
    { enabled: isAuthenticated && Boolean(slug) && adultConfirmed },
  );

  const [draft, setDraft] = useState("");
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [adultChecked, setAdultChecked] = useState(false);
  const [mediaTab, setMediaTab] = useState<MediaTab>("image");
  const [mediaPrompt, setMediaPrompt] = useState("");
  const [mediaOpen, setMediaOpen] = useState(false);
  const [activeJob, setActiveJob] = useState<ActiveJob | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [clearArmed, setClearArmed] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>("quality");
  const [reportDetail, setReportDetail] = useState("");
  const [reportSent, setReportSent] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const confirmAdult = trpc.chat.confirmAdult.useMutation({
    onSuccess: async () => { await utils.chat.session.invalidate(); },
  });

  const send = trpc.chat.send.useMutation({
    onSuccess: async () => {
      setPendingMessage(null);
      await Promise.all([utils.chat.history.invalidate(), utils.chat.session.invalidate()]);
    },
    onError: () => setPendingMessage(null),
  });

  const clearThread = trpc.chat.clearThread.useMutation({
    onSuccess: async () => {
      setClearArmed(false);
      await Promise.all([
        utils.chat.history.invalidate(),
        utils.chat.session.invalidate(),
        utils.media.gallery.invalidate(),
      ]);
    },
  });

  const report = trpc.chat.report.useMutation({
    onSuccess: () => {
      setReportSent(true);
      setReportOpen(false);
      setReportDetail("");
    },
  });

  const jobStatus = trpc.media.jobStatus.useQuery(
    { jobId: activeJob?.jobId ?? "" },
    {
      enabled: Boolean(activeJob),
      refetchInterval: query => (query.state.data?.status === "pending" ? JOB_POLL_MS : false),
    },
  );

  const onMediaSubmitted = async (result: { jobId: string }, kind: MediaTab) => {
    setJobError(null);
    setActiveJob({ jobId: result.jobId, kind, startedAt: Date.now() });
    setMediaPrompt("");
    await utils.chat.session.invalidate();
  };

  const imageJob = trpc.media.image.useMutation({
    onSuccess: result => void onMediaSubmitted(result, "image"),
    onError: error => setJobError(error.message),
  });
  const audioJob = trpc.media.audio.useMutation({
    onSuccess: result => void onMediaSubmitted(result, "audio"),
    onError: error => setJobError(error.message),
  });
  const videoJob = trpc.media.video.useMutation({
    onSuccess: result => void onMediaSubmitted(result, "video"),
    onError: error => setJobError(error.message),
  });

  const messages = useMemo(() => {
    const stored = history.data?.messages ?? [];
    return pendingMessage
      ? [...stored, { id: -1, role: "user" as const, content: pendingMessage }]
      : stored;
  }, [history.data?.messages, pendingMessage]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, send.isPending]);

  // Everything on this screen is scoped to one companion, so switching away must
  // not leave the previous conversation's generation or report state on screen.
  useEffect(() => {
    setActiveJob(null);
    setJobError(null);
    setMediaPrompt("");
    setDraft("");
    setPendingMessage(null);
    setClearArmed(false);
    setReportOpen(false);
    setReportSent(false);
  }, [slug]);

  // Stop polling a job that has outlived the documented five-minute ceiling.
  useEffect(() => {
    if (!activeJob) return;
    const remaining = JOB_TIMEOUT_MS - (Date.now() - activeJob.startedAt);
    const timer = window.setTimeout(() => {
      setJobError("That generation is taking longer than expected. It may still finish — check the gallery shortly.");
      setActiveJob(null);
    }, Math.max(remaining, 0));
    return () => window.clearTimeout(timer);
  }, [activeJob]);

  const completedJobId = jobStatus.data?.status === "completed" ? jobStatus.data.jobId : null;
  useEffect(() => {
    if (completedJobId) void utils.media.gallery.invalidate();
  }, [completedJobId, utils]);

  const mediaBusy = imageJob.isPending || audioJob.isPending || videoJob.isPending
    || (Boolean(activeJob) && jobStatus.data?.status === "pending");

  const handleSend = () => {
    const message = draft.trim();
    if (!message || send.isPending || !slug) return;
    setDraft("");
    setPendingMessage(message);
    send.mutate({ worldSlug: slug, message });
  };

  const submitMedia = () => {
    const prompt = mediaPrompt.trim();
    if (!prompt || !slug || mediaBusy) return;
    if (mediaTab === "image") imageJob.mutate({ worldSlug: slug, prompt });
    else if (mediaTab === "audio") audioJob.mutate({ worldSlug: slug, text: prompt });
    else videoJob.mutate({ worldSlug: slug, prompt });
  };

  /* ---------------------------------------------------------------------- */
  /* Gates                                                                   */
  /* ---------------------------------------------------------------------- */

  if (authLoading) {
    return (
      <div className="app-shell">
        <AppHeader />
        <main className="page-loading"><Loader2 className="animate-spin" size={22} /> Opening your chats…</main>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="app-shell">
        <AppHeader />
        <main className="gate">
          <div className="gate-card">
            <LockKeyhole size={30} />
            <h1>Sign in to start talking</h1>
            <p>
              Your conversation is tied to your account — that is what keeps the thread
              yours, lets you clear it whenever you want, and makes reporting work.
            </p>
            <button type="button" className="primary-button large" onClick={() => startLogin()}>
              Sign in to continue
            </button>
            <p className="gate-foot">18+ only · Every companion is AI · Not therapy</p>
          </div>
        </main>
      </div>
    );
  }

  if (session.data && !adultConfirmed) {
    return (
      <div className="app-shell">
        <AppHeader />
        <main className="gate">
          <div className="gate-card">
            <ShieldCheck size={30} />
            <h1>Confirm you are an adult</h1>
            <p>
              This is an adult experience. We record this confirmation on your account
              once, and it is checked on every request from here on.
            </p>
            <label className="gate-checkbox">
              <input
                type="checkbox"
                checked={adultChecked}
                onChange={event => setAdultChecked(event.target.checked)}
              />
              <span>
                I am 18 or older and I understand that every companion here is AI,
                not a real person.
              </span>
            </label>
            <button
              type="button"
              className="primary-button large"
              disabled={!adultChecked || confirmAdult.isPending}
              onClick={() => confirmAdult.mutate()}
            >
              {confirmAdult.isPending ? "Confirming…" : "Confirm and continue"}
            </button>
            {confirmAdult.error && (
              <p className="gate-foot" style={{ color: "#ffc2d4" }}>{confirmAdult.error.message}</p>
            )}
          </div>
        </main>
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Chat                                                                    */
  /* ---------------------------------------------------------------------- */

  const threads = session.data?.threads ?? [];
  const her = companion.data;
  const firstName = her?.displayName.split(" ")[0] ?? "her";

  return (
    <div className="app-shell">
      <AppHeader />

      <div className="chat-layout">
        <aside className="chat-panel thread-panel">
          <div className="chat-panel-head"><h2>Your chats</h2></div>
          <div className="thread-list">
            {threads.length ? threads.map(thread => (
              <button
                key={thread.id}
                type="button"
                className={thread.worldSlug === slug ? "thread-item active" : "thread-item"}
                onClick={() => navigate(`/chat/${thread.worldSlug}`)}
              >
                <span className="chat-avatar">
                  {thread.profileImageUrl
                    ? <img src={thread.profileImageUrl} alt="" />
                    : <span className="companion-portrait-fallback"><UserRound size={15} /></span>}
                </span>
                <span style={{ minWidth: 0 }}><strong>{thread.displayName}</strong></span>
              </button>
            )) : (
              <p className="thread-empty">No conversations yet. Open a companion to start one.</p>
            )}
            <Link href="/companions" className="thread-item">
              <span className="chat-avatar thread-item-icon"><Sparkles size={15} /></span>
              <strong>Find someone new</strong>
            </Link>
          </div>
        </aside>

        <section className="chat-panel">
          {!slug ? (
            <div className="empty-state chat-empty">
              <Sparkles size={26} />
              <h3>Pick someone to talk to</h3>
              <p>Choose a conversation on the left, or browse the companions.</p>
              <Link href="/companions" className="primary-button">Browse companions</Link>
            </div>
          ) : companion.isLoading ? (
            <div className="page-loading"><Loader2 className="animate-spin" size={20} /> Loading…</div>
          ) : !her ? (
            <div className="empty-state chat-empty">
              <UserRound size={26} />
              <h3>She is not available</h3>
              <p>This companion is not published right now.</p>
              <Link href="/companions" className="primary-button">See who is available</Link>
            </div>
          ) : (
            <>
              <div className="chat-panel-head">
                <Link href={`/companion/${her.worldSlug}`} className="chat-avatar">
                  {her.profileImageUrl
                    ? <img src={her.profileImageUrl} alt="" />
                    : <span className="companion-portrait-fallback"><UserRound size={18} /></span>}
                </Link>
                <div style={{ minWidth: 0 }}>
                  <h2>{her.displayName}</h2>
                  <p className="chat-subtitle">AI companion{her.occupation ? ` · ${her.occupation}` : ""}</p>
                </div>
                <div className="chat-head-actions">
                  <button
                    type="button"
                    className="ghost-button media-toggle"
                    onClick={() => setMediaOpen(true)}
                    aria-label="Open generation panel"
                  >
                    <Wand2 size={15} />
                  </button>
                  {history.data?.room && (
                    <>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => { setReportOpen(open => !open); setReportSent(false); }}
                        aria-label="Report this conversation"
                      >
                        <Flag size={15} />
                      </button>
                      {clearArmed ? (
                        <>
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() => clearThread.mutate({ roomId: history.data!.room!.id })}
                            disabled={clearThread.isPending}
                          >
                            Confirm
                          </button>
                          <button type="button" className="ghost-button" onClick={() => setClearArmed(false)}>Cancel</button>
                        </>
                      ) : (
                        <button type="button" className="ghost-button" onClick={() => setClearArmed(true)} aria-label="Clear conversation">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {clearArmed && (
                <p className="chat-notice">
                  <CircleAlert size={14} />
                  Clearing removes this transcript from MyGF.ai. Provider-side retention is separate.
                </p>
              )}

              {reportSent && (
                <p className="chat-notice">
                  <ShieldCheck size={14} />
                  Report sent. Thank you — it goes to private review.
                </p>
              )}

              {reportOpen && history.data?.room && (
                <form
                  className="chat-report"
                  onSubmit={event => {
                    event.preventDefault();
                    report.mutate({
                      roomId: history.data!.room!.id,
                      reason: reportReason,
                      detail: reportDetail.trim() || undefined,
                    });
                  }}
                >
                  <div className="chat-report-row">
                    <label htmlFor="report-reason">Reason</label>
                    <select
                      id="report-reason"
                      value={reportReason}
                      onChange={event => setReportReason(event.target.value as ReportReason)}
                    >
                      <option value="safety">Safety concern</option>
                      <option value="quality">Quality issue</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <textarea
                    value={reportDetail}
                    maxLength={800}
                    onChange={event => setReportDetail(event.target.value)}
                    placeholder="Optional: what happened?"
                  />
                  <div className="chat-report-row">
                    <button type="submit" className="primary-button" disabled={report.isPending}>
                      {report.isPending ? "Sending…" : "Send report"}
                    </button>
                    <button type="button" className="ghost-button" onClick={() => setReportOpen(false)}>Cancel</button>
                  </div>
                  {report.error && <p className="chat-error"><CircleAlert size={15} />{report.error.message}</p>}
                </form>
              )}

              {session.data && session.data.messagesRemaining <= 5 && (
                <p className="chat-notice">
                  <CircleAlert size={14} />
                  {session.data.messagesRemaining} messages left this hour.
                </p>
              )}

              <div className="message-scroll" ref={scrollRef}>
                <div className="message-list">
                  {messages.length === 0 && !history.isLoading && (
                    <div className="message assistant">Say something to {firstName} to start the conversation.</div>
                  )}
                  {messages.map(message => (
                    <div key={message.id} className={`message ${message.role}`}>{message.content}</div>
                  ))}
                  {send.isPending && (
                    <p className="message-typing">
                      <Loader2 className="animate-spin" size={14} />
                      {firstName} is typing…
                    </p>
                  )}
                </div>
              </div>

              {send.error && (
                <p className="chat-error" role="alert">
                  <CircleAlert size={16} />
                  {send.error.message}
                </p>
              )}

              {/* Temporary owner-only diagnostic. The provider returns a
                  `tool_call` alongside the reply, and a request for a photo
                  produces a reply that ignores it — so the intent is expressed
                  here. Shown raw until its shape is known. */}
              {user?.role === "admin" && send.data?.toolCall != null && (
                <pre className="chat-toolcall">
                  tool_call: {JSON.stringify(send.data.toolCall, null, 2)}
                </pre>
              )}

              <div className="chat-composer">
                <textarea
                  value={draft}
                  onChange={event => setDraft(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={`Message ${firstName}…`}
                  rows={1}
                  aria-label="Your message"
                />
                <button
                  type="button"
                  className="send-button"
                  onClick={handleSend}
                  disabled={!draft.trim() || send.isPending}
                  aria-label="Send message"
                >
                  {send.isPending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                </button>
              </div>
            </>
          )}
        </section>

        <aside className={mediaOpen ? "chat-panel media-panel open" : "chat-panel media-panel"}>
          <div className="media-tabs" role="tablist">
            {([
              { id: "image" as const, label: "Photo", icon: ImageIcon },
              { id: "audio" as const, label: "Voice", icon: Mic },
              { id: "video" as const, label: "Video", icon: Video },
            ]).map(tab => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={mediaTab === tab.id}
                className={mediaTab === tab.id ? "active" : undefined}
                onClick={() => { setMediaTab(tab.id); setJobError(null); }}
              >
                {tab.label}
              </button>
            ))}
            <button
              type="button"
              className="media-close"
              onClick={() => setMediaOpen(false)}
              aria-label="Close generation panel"
            >
              <X size={16} />
            </button>
          </div>

          <div className="media-body">
            {!slug || !her ? (
              <p className="media-hint">Open a conversation to generate photos, voice notes, and video.</p>
            ) : (
              <>
                <label htmlFor="media-prompt">
                  {mediaTab === "image" ? "Describe the photo" : mediaTab === "audio" ? "What should she say" : "Describe the scene"}
                </label>
                <textarea
                  id="media-prompt"
                  value={mediaPrompt}
                  onChange={event => setMediaPrompt(event.target.value)}
                  placeholder={
                    mediaTab === "image"
                      ? "A photo of her in a quiet bar at night…"
                      : mediaTab === "audio"
                        ? "Say something only I would understand."
                        : "She turns toward the camera and smiles…"
                  }
                />
                <button
                  type="button"
                  className="primary-button media-submit"
                  onClick={submitMedia}
                  disabled={!mediaPrompt.trim() || mediaBusy}
                >
                  {mediaBusy ? <Loader2 className="animate-spin" size={15} /> : <Sparkles size={15} />}
                  {mediaBusy ? "Generating…" : `Generate ${mediaTab === "image" ? "photo" : mediaTab === "audio" ? "voice note" : "video"}`}
                </button>
                <p className="media-hint">
                  Generation runs in the background and can take a few minutes.
                  {session.data ? ` ${session.data.messagesRemaining} messages left this hour.` : ""}
                </p>

                {jobError && (
                  <p className="chat-error media-inline-error">
                    <CircleAlert size={15} />
                    {jobError}
                  </p>
                )}

                {activeJob && jobStatus.data?.status === "pending" && (
                  <div className="media-progress">
                    <Loader2 className="animate-spin" size={16} />
                    Working on your {activeJob.kind}…
                  </div>
                )}

                {jobStatus.data?.status === "failed" && (
                  <p className="chat-error media-inline-error">
                    <CircleAlert size={15} />
                    {jobStatus.data.errorMessage ?? "That generation could not be completed."}
                  </p>
                )}

                {jobStatus.data?.status === "completed" && jobStatus.data.resultUrl && (
                  <div className="media-result">
                    {jobStatus.data.kind === "image" && <img src={jobStatus.data.resultUrl} alt="Generated result" />}
                    {jobStatus.data.kind === "video" && <video controls src={jobStatus.data.resultUrl} />}
                    {jobStatus.data.kind === "audio" && <audio controls src={jobStatus.data.resultUrl} />}
                    {jobStatus.data.followupText && (
                      <p className="media-followup">{jobStatus.data.followupText}</p>
                    )}
                    <div className="media-result-foot">
                      <span>Ready</span>
                      <a href={jobStatus.data.resultUrl} target="_blank" rel="noreferrer" className="companion-cta">
                        <Download size={13} /> Open
                      </a>
                    </div>
                  </div>
                )}

                {gallery.data && gallery.data.length > 0 && (
                  <>
                    <p className="media-gallery-title">Recent with {firstName}</p>
                    <div className="media-gallery">
                      {gallery.data.slice(0, 12).map(item => (
                        <a key={item.jobId} href={item.resultUrl ?? "#"} target="_blank" rel="noreferrer" title={item.prompt ?? undefined}>
                          {item.kind === "image" && item.resultUrl
                            ? <img src={item.resultUrl} alt={item.prompt ?? "Earlier generation"} loading="lazy" />
                            : <span className="media-gallery-icon">{item.kind === "video" ? <Video size={18} /> : <Mic size={18} />}</span>}
                        </a>
                      ))}
                    </div>
                    <p className="media-hint">
                      Results are hosted by the provider on short-lived links and are not
                      stored by MyGF.ai. Download anything you want to keep.
                    </p>
                  </>
                )}
              </>
            )}
          </div>
        </aside>

        {mediaOpen && <button type="button" className="media-scrim" onClick={() => setMediaOpen(false)} aria-label="Close generation panel" />}
      </div>
    </div>
  );
}
