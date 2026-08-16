import DiscoveryCard, { DiscoveryCardSkeleton } from "@/components/discovery/DiscoveryCard";
import DiscoveryShell from "@/components/discovery/DiscoveryShell";
import { useSavedProfiles } from "@/components/discovery/useSavedProfiles";
import { companionAgeFilters, filterCompanions, type CompanionAgeFilter } from "@/lib/companions";
import { trpc } from "@/lib/trpc";
import { Bookmark, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import "./discovery.css";

export default function Companions() {
  const companions = trpc.companions.list.useQuery();
  const all = companions.data ?? [];
  const { saved, toggle, isSaved } = useSavedProfiles();
  const [query, setQuery] = useState("");
  const [age, setAge] = useState<CompanionAgeFilter>("Any age");
  const [onlySaved, setOnlySaved] = useState(false);

  const visible = useMemo(
    () => filterCompanions(all, { query, age }).filter(companion => !onlySaved || isSaved(companion.worldSlug)),
    [all, query, age, onlySaved, isSaved],
  );

  return (
    <DiscoveryShell active="discover" savedCount={saved.length}>
      <section className="d-section catalogue-heading" id="catalogue" aria-label="Companion catalogue">
        <div className="catalogue-title-row">
          <h2 className="d-section-heading"><span className="accent">Discover</span> characters</h2>
          <button className="d-saved-summary" onClick={() => setOnlySaved(current => !current)}>
            {onlySaved ? <Bookmark size={15} /> : <Bookmark size={15} />}
            {saved.length} saved
          </button>
        </div>

        <div className="filter-row">
          <label className="search-wrap">
            <Search size={16} />
            <input className="search-input" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by name or what she does" aria-label="Search companions" />
          </label>
          <button className={`filter-chip ${!onlySaved ? "active" : ""}`} onClick={() => setOnlySaved(false)}>All</button>
          <button className={`filter-chip ${onlySaved ? "active" : ""}`} onClick={() => setOnlySaved(true)}><Bookmark size={13} /> Saved</button>
          {companionAgeFilters.map(option => (
            <button key={option} className={`filter-chip ${!onlySaved && age === option ? "active" : ""}`} onClick={() => { setAge(option); setOnlySaved(false); }}>
              {option}
            </button>
          ))}
        </div>

        {companions.isLoading ? (
          <div className="character-grid">
            {Array.from({ length: 9 }, (_, index) => <DiscoveryCardSkeleton key={index} />)}
          </div>
        ) : visible.length ? (
          <div className="character-grid">
            {visible.map((companion, index) => (
              <DiscoveryCard key={companion.worldSlug} companion={companion} saved={isSaved(companion.worldSlug)} onToggleSave={toggle} eager={index < 6} />
            ))}
          </div>
        ) : all.length ? (
          <div className="d-empty-state">
            <Search size={26} />
            <h3>Nobody matches that</h3>
            <p>Try a different name, or clear the filters.</p>
            <button onClick={() => { setQuery(""); setAge("Any age"); setOnlySaved(false); }}>Clear filters</button>
          </div>
        ) : (
          <div className="d-empty-state">
            <Sparkles size={26} />
            <h3>No companions are published yet</h3>
            <p>The catalog mirrors the provider companion library. Once it is synced, everyone in it shows up here.</p>
          </div>
        )}
      </section>
    </DiscoveryShell>
  );
}
