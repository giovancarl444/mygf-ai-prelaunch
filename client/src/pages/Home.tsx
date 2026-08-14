import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";
import { CompanionCard, CompanionCardSkeleton } from "@/components/CompanionCard";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  Eye,
  ImageIcon,
  LockKeyhole,
  MessageCircle,
  Mic,
  ShieldCheck,
  Sparkles,
  Video,
} from "lucide-react";
import { Link } from "wouter";

const capabilities = [
  { icon: MessageCircle, title: "Real conversation", copy: "Threads that keep their context, in her own voice." },
  { icon: ImageIcon, title: "Photos on request", copy: "Ask for a moment and she generates it for you." },
  { icon: Mic, title: "Voice notes", copy: "Hear her say it instead of reading it." },
  { icon: Video, title: "Video", copy: "Short clips generated from a scene you describe." },
];

const principles = [
  { icon: Eye, title: "AI, always disclosed", copy: "Every companion is AI and the product never pretends otherwise. No hidden human, no claims about real feelings." },
  { icon: LockKeyhole, title: "Yours, privately", copy: "Threads are tied to your account. You can rename them, clear them, and report anything that crosses a line." },
  { icon: ShieldCheck, title: "Adults only", copy: "Access requires an account and an adult confirmation that is enforced on the server, not just in the browser." },
];

const steps = [
  { title: "Pick someone", copy: "Browse the companions and open the one you want. No forms, no waitlist." },
  { title: "Start talking", copy: "Sign in, confirm you are an adult, and your private thread opens with her." },
  { title: "Ask for more", copy: "Request a photo, a voice note, or a short video right inside the conversation." },
];

export default function Home() {
  const companions = trpc.companions.list.useQuery();
  const featured = companions.data?.slice(0, 8) ?? [];

  return (
    <div className="app-shell">
      <AppHeader />

      <main className="page">
        <section className="hero">
          <div>
            <p className="eyebrow">Private AI companions</p>
            <h1>
              She is ready when
              <em>you are.</em>
            </h1>
            <p className="hero-lede">
              Pick a companion, open a private thread, and talk. Ask for photos, voice
              notes, and video without leaving the conversation.
            </p>
            <div className="hero-actions">
              <Link href="/companions" className="primary-button large">
                Meet the companions <ArrowRight size={17} />
              </Link>
            </div>
            <p className="hero-note">
              <LockKeyhole size={13} />
              18+. Sign in before a private thread begins.
            </p>
          </div>

          <div className="hero-collage" aria-hidden="true">
            {companions.isLoading
              ? Array.from({ length: 4 }, (_, index) => <CompanionCardSkeleton key={index} />)
              : featured.slice(0, 4).map(companion => (
                  <div key={companion.worldSlug} className="companion-portrait" style={{ borderRadius: "inherit" }}>
                    {companion.profileImageUrl
                      ? <img src={companion.profileImageUrl} alt="" loading="eager" />
                      : <div className="companion-portrait-fallback"><Sparkles size={26} /></div>}
                  </div>
                ))}
          </div>
        </section>

        <section id="companions">
          <div className="section-head">
            <div>
              <h2>Available now</h2>
              <p>Everyone here is live — open a card and you are talking to her.</p>
            </div>
            {featured.length > 0 && (
              <Link href="/companions" className="ghost-button">See all</Link>
            )}
          </div>

          {companions.isLoading ? (
            <div className="companion-grid">
              {Array.from({ length: 8 }, (_, index) => <CompanionCardSkeleton key={index} />)}
            </div>
          ) : featured.length ? (
            <div className="companion-grid">
              {featured.map((companion, index) => (
                <CompanionCard key={companion.worldSlug} companion={companion} eager={index < 4} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Sparkles size={26} />
              <h3>No companions are published yet</h3>
              <p>
                Once the companion library is synced from the provider, everyone in it
                appears here and can be opened straight into a conversation.
              </p>
            </div>
          )}
        </section>

        <section id="how">
          <div className="section-head">
            <div>
              <h2>How it works</h2>
              <p>Three steps, no waiting list.</p>
            </div>
          </div>
          <div className="capability-grid">
            {steps.map((step, index) => (
              <article key={step.title} className="capability">
                <strong>{`0${index + 1} · ${step.title}`}</strong>
                <p>{step.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section>
          <div className="section-head">
            <div>
              <h2>What you can do together</h2>
              <p>Text is the start, not the limit.</p>
            </div>
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
        </section>

        <section id="principles">
          <div className="section-head">
            <div>
              <h2>Where the lines are</h2>
              <p>Stated plainly, because an adult product should be clear about this.</p>
            </div>
          </div>
          <div className="capability-grid">
            {principles.map(principle => {
              const Icon = principle.icon;
              return (
                <article key={principle.title} className="capability">
                  <Icon size={19} />
                  <strong>{principle.title}</strong>
                  <p>{principle.copy}</p>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
