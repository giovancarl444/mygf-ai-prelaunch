/* Saved collection: a focused extension of the discovery grid. M1 keeps the
   saved list in localStorage (see useSavedProfiles); moving it to the
   database is the next milestone. */
import { portraitFallbackLabel, providerTypeLabel } from "@/components/discovery/DiscoveryCard";
import RouteShell from "@/components/discovery/RouteShell";
import { useSavedProfiles } from "@/components/discovery/useSavedProfiles";
import { trpc } from "@/lib/trpc";
import { BookmarkCheck, ChevronRight, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import "./discovery.css";

export default function Collection() {
  const companions = trpc.companions.list.useQuery();
  const { saved, isSaved } = useSavedProfiles();
  const [query, setQuery] = useState("");

  const savedCompanions = useMemo(
    () => (companions.data ?? []).filter(companion => isSaved(companion.worldSlug)),
    [companions.data, isSaved],
  );
  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized
      ? savedCompanions.filter(companion => companion.displayName.toLowerCase().includes(normalized))
      : savedCompanions;
  }, [savedCompanions, query]);

  return (
    <RouteShell active="collection" eyebrow="PERSONAL COLLECTION">
      <section className="collection-page">
        <header className="collection-intro">
          <div>
            <p className="collection-kicker">YOUR SPACE</p>
            <h1>Saved <span>characters</span></h1>
            <p>
              Keep a private shortlist of the companions you want to revisit. Your collection stays focused,
              quick to scan, and ready when a conversation feels right.
            </p>
          </div>
          <div className="collection-stat">
            <BookmarkCheck size={19} />
            <strong>{savedCompanions.length}</strong>
            <span>saved profiles</span>
          </div>
        </header>

        <div className="collection-controls">
          <label>
            <Search size={16} />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search saved profiles" aria-label="Search saved profiles" />
          </label>
        </div>

        {visible.length ? (
          <div className="collection-grid">
            {visible.map(companion => (
              <Link href={`/companion/${companion.worldSlug}`} key={companion.worldSlug} className="collection-card">
                {companion.profileImageUrl
                  ? <img src={companion.profileImageUrl} alt={`${companion.displayName} portrait`} />
                  : <div className="portrait-fallback" aria-hidden="true">{portraitFallbackLabel(companion.displayName)}</div>}
                <div className="collection-card-gradient" />
                {providerTypeLabel(companion.providerType) && (
                  <span className="collection-status"><Sparkles size={10} />{providerTypeLabel(companion.providerType)}</span>
                )}
                <div className="collection-card-copy">
                  <h2>
                    {companion.displayName}
                    {companion.age !== null && <span> {companion.age}</span>}
                  </h2>
                  {companion.tagline && <p>{companion.tagline}</p>}
                  <b>View profile <ChevronRight size={14} /></b>
                </div>
              </Link>
            ))}
          </div>
        ) : savedCompanions.length ? (
          <div className="collection-empty">
            <BookmarkCheck size={28} />
            <h2>No matches here</h2>
            <p>Try a shorter search or browse the full discovery catalogue.</p>
            <Link href="/companions">Discover characters</Link>
          </div>
        ) : (
          <div className="collection-empty">
            <BookmarkCheck size={28} />
            <h2>Nothing saved yet</h2>
            <p>Tap the bookmark on any companion card to build your collection.</p>
            <Link href="/companions">Discover characters</Link>
          </div>
        )}

        <footer className="collection-footer">
          <div>
            <p>MAKE SPACE FOR WHAT CLICKS</p>
            <h2>Find a profile that fits the moment.</h2>
          </div>
          <Link href="/companions">Return to discovery <ChevronRight size={16} /></Link>
        </footer>
      </section>
    </RouteShell>
  );
}
