/* Catalogue card in the discovery design language. Every field renders only
   when the provider actually returns it — no invented ages, taglines, or
   badges. The whole card links to the companion's own profile page. */
import { Bookmark, BookmarkCheck, Sparkles } from "lucide-react";
import { Link } from "wouter";
import type { PublicCompanion } from "@/lib/companions";

type DiscoveryCardProps = {
  companion: PublicCompanion;
  saved: boolean;
  onToggleSave: (slug: string) => void;
  eager?: boolean;
};

export function providerTypeLabel(providerType: PublicCompanion["providerType"]) {
  if (providerType === "DIGITAL_TWIN") return "Digital twin";
  if (providerType === "ORIGINAL") return "Original";
  return null;
}

export function portraitFallbackLabel(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export default function DiscoveryCard({ companion, saved, onToggleSave, eager = false }: DiscoveryCardProps) {
  const chip = providerTypeLabel(companion.providerType);

  return (
    <article className={`character-card ${saved ? "is-saved" : ""}`}>
      {companion.profileImageUrl
        ? <img src={companion.profileImageUrl} alt={`${companion.displayName} portrait`} loading={eager ? "eager" : "lazy"} />
        : <div className="portrait-fallback" aria-hidden="true">{portraitFallbackLabel(companion.displayName)}</div>}
      <Link href={`/companion/${companion.worldSlug}`} className="card-hitbox" aria-label={`View ${companion.displayName}'s profile`} />
      <button
        className={`save-button ${saved ? "saved" : ""}`}
        onClick={() => onToggleSave(companion.worldSlug)}
        aria-label={saved ? `Remove ${companion.displayName} from saved` : `Save ${companion.displayName}`}
      >
        {saved ? <BookmarkCheck size={16} fill="currentColor" /> : <Bookmark size={16} />}
      </button>
      {chip && <span className="status-chip"><Sparkles size={10} /> {chip}</span>}
      <div className="card-copy">
        <h3 className="card-title">
          <Link href={`/companion/${companion.worldSlug}`}>
            {companion.displayName}
            {companion.age !== null && <span className="card-age"> {companion.age}</span>}
          </Link>
        </h3>
        {companion.tagline && <p className="card-description">{companion.tagline}</p>}
      </div>
    </article>
  );
}

export function DiscoveryCardSkeleton() {
  return <article className="character-card d-card-skeleton" aria-hidden="true"><div className="portrait-fallback"><Sparkles size={26} /></div></article>;
}
