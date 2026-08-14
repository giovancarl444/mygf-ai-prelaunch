import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";
import { CompanionCard, CompanionCardSkeleton } from "@/components/CompanionCard";
import { companionAgeFilters, filterCompanions, type CompanionAgeFilter } from "@/lib/companions";
import { trpc } from "@/lib/trpc";
import { Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

export default function Companions() {
  const companions = trpc.companions.list.useQuery();
  const [query, setQuery] = useState("");
  const [age, setAge] = useState<CompanionAgeFilter>("Any age");

  const visible = useMemo(
    () => filterCompanions(companions.data ?? [], { query, age }),
    [companions.data, query, age],
  );

  return (
    <div className="app-shell">
      <AppHeader />

      <main className="page">
        <div className="section-head">
          <div>
            <p className="eyebrow">Companions</p>
            <h2>Find someone to talk to</h2>
            <p>
              {companions.data
                ? `${visible.length} of ${companions.data.length} available`
                : "Loading the companion library"}
            </p>
          </div>
        </div>

        <div className="filter-bar">
          <div className="search-field">
            <Search size={17} />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search by name or what she does"
              aria-label="Search companions"
            />
          </div>
          <div className="chip-row" role="group" aria-label="Filter by age">
            {companionAgeFilters.map(option => (
              <button
                key={option}
                type="button"
                className={age === option ? "chip active" : "chip"}
                onClick={() => setAge(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {companions.isLoading ? (
          <div className="companion-grid">
            {Array.from({ length: 12 }, (_, index) => <CompanionCardSkeleton key={index} />)}
          </div>
        ) : visible.length ? (
          <div className="companion-grid">
            {visible.map((companion, index) => (
              <CompanionCard key={companion.worldSlug} companion={companion} eager={index < 8} />
            ))}
          </div>
        ) : companions.data?.length ? (
          <div className="empty-state">
            <Search size={26} />
            <h3>Nobody matches that</h3>
            <p>Try a different name, or clear the age filter.</p>
            <button type="button" className="ghost-button" onClick={() => { setQuery(""); setAge("Any age"); }}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="empty-state">
            <Sparkles size={26} />
            <h3>No companions are published yet</h3>
            <p>
              The catalog mirrors the provider companion library. Once it is synced,
              everyone in it shows up here.
            </p>
          </div>
        )}
      </main>

      <AppFooter />
    </div>
  );
}
