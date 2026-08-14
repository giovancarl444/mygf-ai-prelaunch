import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  ImageIcon,
  Info,
  Loader2,
  MessageCircle,
  Mic,
  UserRound,
  Video,
} from "lucide-react";
import { Link, useRoute } from "wouter";

const capabilities = [
  { icon: MessageCircle, title: "Chat", copy: "A private thread that remembers the conversation you are having." },
  { icon: ImageIcon, title: "Photos", copy: "Ask for an image and she generates it in her own likeness." },
  { icon: Mic, title: "Voice", copy: "Turn any line into a voice note from her." },
  { icon: Video, title: "Video", copy: "Describe a short scene and receive a generated clip." },
];

export default function Companion() {
  const [, params] = useRoute("/companion/:slug");
  const slug = params?.slug ?? "";
  const companion = trpc.companions.bySlug.useQuery({ worldSlug: slug }, { enabled: Boolean(slug) });

  if (companion.isLoading) {
    return (
      <div className="app-shell">
        <AppHeader />
        <main className="page-loading"><Loader2 className="animate-spin" size={22} /> Loading her profile…</main>
      </div>
    );
  }

  if (!companion.data) {
    return (
      <div className="app-shell">
        <AppHeader />
        <main className="page">
          <div className="empty-state" style={{ marginTop: 60 }}>
            <UserRound size={26} />
            <h3>She is not available</h3>
            <p>This companion is not published right now. Browse the ones who are.</p>
            <Link href="/companions" className="primary-button">See who is available</Link>
          </div>
        </main>
        <AppFooter />
      </div>
    );
  }

  const her = companion.data;

  return (
    <div className="app-shell">
      <AppHeader />

      <main className="page">
        <Link href="/companions" className="companion-cta" style={{ marginTop: 24 }}>
          <ArrowLeft size={14} /> All companions
        </Link>

        <div className="profile">
          <div className="profile-portrait">
            {her.profileImageUrl
              ? <img src={her.profileImageUrl} alt={`${her.displayName}, an AI companion`} />
              : <div className="companion-portrait-fallback" style={{ aspectRatio: "3 / 4" }}><UserRound size={48} /></div>}
          </div>

          <div>
            <h1>
              {her.displayName}
              {her.age !== null && <span>{her.age}</span>}
            </h1>
            {her.occupation && <p className="profile-occupation">{her.occupation}</p>}
            <p className="profile-tagline">
              {her.tagline ?? `Start a private conversation with ${her.displayName}. She replies in her own voice, and you can ask her for photos, voice notes, and video as you go.`}
            </p>

            <div className="profile-actions">
              <Link href={`/chat/${her.worldSlug}`} className="primary-button large">
                <MessageCircle size={17} /> Chat with {her.displayName.split(" ")[0]}
              </Link>
            </div>

            <div className="capability-grid">
              {capabilities.map(capability => {
                const Icon = capability.icon;
                return (
                  <article key={capability.title} className="capability">
                    <Icon size={19} />
                    <strong>{capability.title}</strong>
                    <p>{capability.copy}</p>
                  </article>
                );
              })}
            </div>

            <p className="disclosure">
              <Info size={16} />
              <span>
                {her.displayName} is an AI companion, not a real person. Conversations and
                generated media are produced by a model. This is an adult experience and is
                not therapy or a substitute for human support.
              </span>
            </p>
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
