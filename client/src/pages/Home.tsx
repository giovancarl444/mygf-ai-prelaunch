import { AppFooter } from "@/components/AppFooter";
import DiscoveryCard, { DiscoveryCardSkeleton } from "@/components/discovery/DiscoveryCard";
import DiscoveryShell from "@/components/discovery/DiscoveryShell";
import { useSavedProfiles } from "@/components/discovery/useSavedProfiles";
import { trpc } from "@/lib/trpc";
import { Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, Eye, LockKeyhole, Search, ShieldCheck, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import "./discovery.css";

/**
 * The featured grid is three across on a wide screen, so a count of four or
 * seven leaves a single card stranded on its own row. Round down to a full
 * row instead and let the filters carry the rest.
 */
export function balancedFeaturedCount(total: number) {
  if (total >= 9) return 9;
  if (total >= 7) return 6;
  if (total >= 4) return 3;
  return total;
}

const banners = [
  { kicker: "PRIVATE AI COMPANIONS", title: "She is ready when you are", action: "MEET THEM NOW" },
  { kicker: "LIVE CATALOGUE", title: "Fresh faces", action: "BROWSE NOW" },
  { kicker: "MORE THAN TEXT", title: "Photos, voice & video", action: "SEE HOW" },
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
  const all = companions.data ?? [];
  const { saved, toggle, isSaved } = useSavedProfiles();
  const [activeBanner, setActiveBanner] = useState(0);
  const [query, setQuery] = useState("");
  const [onlySaved, setOnlySaved] = useState(false);

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return all
      .filter(companion => !onlySaved || isSaved(companion.worldSlug))
      .filter(companion => !normalized
        || [companion.displayName, companion.occupation, companion.tagline]
          .filter(Boolean).join(" ").toLowerCase().includes(normalized));
  }, [all, onlySaved, query, isSaved]);

  const banner = banners[activeBanner];
  const moveBanner = (direction: number) => setActiveBanner(current => (current + direction + banners.length) % banners.length);
  const goToCatalogue = () => document.getElementById("catalogue")?.scrollIntoView({ behavior: "smooth", block: "start" });
  const featuredCount = balancedFeaturedCount(all.length);

  return (
    <DiscoveryShell savedCount={saved.length}>
      <section className="season-banner" aria-label="Discover MyGF.ai">
        <div className="season-shade" />
        <div className="banner-copy">
          <p className="banner-kicker">{banner.kicker}</p>
          <h1 className="banner-title">{banner.title}</h1>
          <button className="banner-cta" onClick={goToCatalogue}>{banner.action}</button>
        </div>
        <button className="banner-arrow left" onClick={() => moveBanner(-1)} aria-label="Previous promotion"><ChevronLeft size={30} /></button>
        <button className="banner-arrow right" onClick={() => moveBanner(1)} aria-label="Next promotion"><ChevronRight size={30} /></button>
        <div className="banner-dots" aria-label="Promotion selection">
          {banners.map((item, index) => (
            <button key={item.title} className={index === activeBanner ? "active" : ""} onClick={() => setActiveBanner(index)} aria-label={`Show ${item.title}`} />
          ))}
        </div>
      </section>

      <section id="how" className="d-section" aria-label="How it works">
        <div className="d-section-title-row">
          <h2 className="d-section-heading"><span className="accent">How</span> it works</h2>
        </div>
        <div className="d-principle-grid">
          {steps.map((step, index) => (
            <article key={step.title} className="d-principle">
              <strong>{`0${index + 1} · ${step.title}`}</strong>
              <p>{step.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="catalogue" className="d-section catalogue-heading" aria-label="Companion catalogue">
        <div className="catalogue-title-row">
          <h2 className="d-section-heading"><span className="accent">Discover</span> characters</h2>
          <button className="d-saved-summary" onClick={() => setOnlySaved(current => !current)}>
            {onlySaved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
            {saved.length} saved
          </button>
        </div>
        <div className="filter-row">
          <label className="search-wrap">
            <Search size={16} />
            <input className="search-input" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search profiles" aria-label="Search profiles" />
          </label>
          <button className={`filter-chip ${!onlySaved ? "active" : ""}`} onClick={() => setOnlySaved(false)}>All</button>
          <button className={`filter-chip ${onlySaved ? "active" : ""}`} onClick={() => setOnlySaved(true)}><Bookmark size={13} /> Saved</button>
        </div>

        {companions.isLoading ? (
          <div className="character-grid">
            {Array.from({ length: 6 }, (_, index) => <DiscoveryCardSkeleton key={index} />)}
          </div>
        ) : visible.length ? (
          <div className="character-grid">
            {visible.slice(0, onlySaved ? visible.length : featuredCount).map((companion, index) => (
              <DiscoveryCard key={companion.worldSlug} companion={companion} saved={isSaved(companion.worldSlug)} onToggleSave={toggle} eager={index < 4} />
            ))}
          </div>
        ) : all.length ? (
          <div className="d-empty-state">
            <Bookmark size={26} />
            <h3>Nobody matches that</h3>
            <p>Try a different search, or clear the saved filter.</p>
            <button onClick={() => { setQuery(""); setOnlySaved(false); }}>Browse all characters</button>
          </div>
        ) : (
          <div className="d-empty-state">
            <Sparkles size={26} />
            <h3>No companions are published yet</h3>
            <p>Once the companion library is synced from the provider, everyone in it appears here and opens straight into a conversation.</p>
          </div>
        )}
      </section>

      <section id="principles" className="d-section" aria-label="Product principles">
        <div className="d-section-title-row">
          <h2 className="d-section-heading"><span className="accent">Where</span> the lines are</h2>
        </div>
        <div className="d-principle-grid">
          {principles.map(principle => {
            const Icon = principle.icon;
            return (
              <article key={principle.title} className="d-principle">
                <Icon size={19} />
                <strong>{principle.title}</strong>
                <p>{principle.copy}</p>
              </article>
            );
          })}
        </div>
      </section>

      <AppFooter />
    </DiscoveryShell>
  );
}
