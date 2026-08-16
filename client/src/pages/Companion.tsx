import { portraitFallbackLabel, providerTypeLabel } from "@/components/discovery/DiscoveryCard";
import RouteShell from "@/components/discovery/RouteShell";
import { useSavedProfiles } from "@/components/discovery/useSavedProfiles";
import { trpc } from "@/lib/trpc";
import { Bookmark, BookmarkCheck, Check, ChevronRight, Info, Loader2, MessageCircle, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link, useRoute } from "wouter";
import "./discovery.css";

export default function Companion() {
  const [, params] = useRoute("/companion/:slug");
  const slug = params?.slug ?? "";
  const companion = trpc.companions.bySlug.useQuery({ worldSlug: slug }, { enabled: Boolean(slug) });
  const others = trpc.companions.list.useQuery();
  const { isSaved, toggle } = useSavedProfiles();
  const [tab, setTab] = useState<"Story" | "Details">("Story");

  if (companion.isLoading) {
    return (
      <RouteShell active="profile" eyebrow="CHARACTER PROFILE">
        <section className="route-unavailable">
          <Loader2 size={28} className="animate-spin" />
          <p>LOADING PROFILE</p>
        </section>
      </RouteShell>
    );
  }

  const profile = companion.data;

  if (!profile) {
    return (
      <RouteShell active="profile" eyebrow="CHARACTER PROFILE">
        <section className="route-unavailable">
          <Sparkles size={28} />
          <p>PROFILE NOT AVAILABLE</p>
          <h1>She is not published right now.</h1>
          <Link href="/companions">Return to discovery</Link>
        </section>
      </RouteShell>
    );
  }

  const saved = isSaved(profile.worldSlug);
  const chip = providerTypeLabel(profile.providerType);
  const details = [
    profile.occupation,
    chip,
    "Text, photos, voice notes, and video in one thread",
    "Adults only — her thread opens after sign-in and adult confirmation",
  ].filter((entry): entry is string => Boolean(entry));

  return (
    <RouteShell active="profile" eyebrow="CHARACTER PROFILE">
      <section className="profile-page">
        <div className="profile-hero-card">
          <div className="profile-hero-visual">
            {profile.profileImageUrl
              ? <img src={profile.profileImageUrl} alt={`${profile.displayName}, an AI companion`} />
              : <div className="portrait-fallback" aria-hidden="true">{portraitFallbackLabel(profile.displayName)}</div>}
            <div className="profile-hero-fade" />
            {chip && <span className="profile-state-chip"><Sparkles size={11} />{chip}</span>}
          </div>
          <div className="profile-hero-copy">
            <p className="profile-kicker">PRIVATE AI COMPANION</p>
            <h1>
              {profile.displayName}
              {profile.age !== null && <span> {profile.age}</span>}
            </h1>
            {profile.tagline && <p>{profile.tagline}</p>}
            <div className="profile-hero-meta">
              <span><Check size={13} /> Available to talk</span>
              <span><MessageCircle size={13} /> Text, photos, voice, video</span>
            </div>
            <div className="profile-actions">
              <button className={`profile-save-action ${saved ? "saved" : ""}`} onClick={() => toggle(profile.worldSlug)}>
                {saved ? <BookmarkCheck size={16} fill="currentColor" /> : <Bookmark size={16} />}
                {saved ? "Saved to collection" : "Save profile"}
              </button>
              <Link href={`/chat/${profile.worldSlug}`} className="profile-chat-action">
                <MessageCircle size={17} />Start a chat
              </Link>
            </div>
            <p className="profile-disclosure">
              <Info size={16} />
              <span>
                {profile.displayName} is an AI companion, not a real person. Conversations and generated media
                are produced by a model. This is an adult experience and is not therapy or a substitute for
                human support.
              </span>
            </p>
          </div>
        </div>

        <div className="profile-content-grid">
          <div className="profile-editorial">
            <div className="profile-tabs" role="tablist">
              {(["Story", "Details"] as const).map(item => (
                <button key={item} role="tab" aria-selected={tab === item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>
                  {item}
                </button>
              ))}
            </div>
            {tab === "Story" ? (
              <article className="profile-prose">
                <p className="profile-dropcap">
                  {profile.occupation
                    ? `${profile.displayName} is ${/^[aeiou]/i.test(profile.occupation) ? "an" : "a"} ${profile.occupation}.`
                    : `This is ${profile.displayName}.`}
                  {" "}Open a thread and let the conversation find its own pace.
                </p>
                <p>
                  There is an easy rhythm to getting to know {profile.displayName}. Start with something small — a
                  place you want to revisit, a question you are turning over — and let the exchange build from
                  there. She keeps her own voice through the thread, and you can ask her for a photo, a voice
                  note, or a short video without leaving the conversation.
                </p>
                <div className="profile-quote">“Good conversations make the familiar feel new again.”</div>
              </article>
            ) : (
              <div className="profile-details-list">
                {details.map(detail => (
                  <div key={detail}><span><Check size={15} /></span><p>{detail}</p></div>
                ))}
              </div>
            )}
          </div>

          <aside className="profile-aside">
            <div className="profile-aside-card">
              <p>CONVERSATION STARTERS</p>
              <Link href={`/chat/${profile.worldSlug}`}>What made today memorable?<ChevronRight size={16} /></Link>
              <Link href={`/chat/${profile.worldSlug}`}>What are you curious about lately?<ChevronRight size={16} /></Link>
              <Link href={`/chat/${profile.worldSlug}`}>Tell me about your day.<ChevronRight size={16} /></Link>
            </div>

            {(others.data?.filter(candidate => candidate.worldSlug !== profile.worldSlug).length ?? 0) > 0 && (
              <div className="profile-aside-card">
                <p>DISCOVER MORE</p>
                <div className="mini-profile-grid">
                  {others.data
                    ?.filter(candidate => candidate.worldSlug !== profile.worldSlug)
                    .slice(0, 3)
                    .map(candidate => (
                      <Link href={`/companion/${candidate.worldSlug}`} key={candidate.worldSlug}>
                        {candidate.profileImageUrl
                          ? <img src={candidate.profileImageUrl} alt={candidate.displayName} />
                          : <div className="mini-fallback">{portraitFallbackLabel(candidate.displayName)}</div>}
                        <span>{candidate.displayName}</span>
                      </Link>
                    ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </section>
    </RouteShell>
  );
}
