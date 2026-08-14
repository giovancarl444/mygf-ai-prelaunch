import type { PublicCompanion } from "@/lib/companions";
import { ArrowRight, UserRound } from "lucide-react";
import { Link } from "wouter";

export function CompanionCard({ companion, eager = false }: { companion: PublicCompanion; eager?: boolean }) {
  return (
    <Link
      href={`/companion/${companion.worldSlug}`}
      className="companion-card"
      aria-label={`Open ${companion.displayName}'s profile`}
    >
      <div className="companion-portrait">
        {companion.profileImageUrl ? (
          <img
            src={companion.profileImageUrl}
            alt={`${companion.displayName}, an AI companion`}
            loading={eager ? "eager" : "lazy"}
          />
        ) : (
          <div className="companion-portrait-fallback">
            <UserRound size={40} />
          </div>
        )}
        {companion.providerType === "DIGITAL_TWIN" && <span className="companion-badge">Digital twin</span>}
      </div>

      <div className="companion-meta">
        <h3>
          {companion.displayName}
          {companion.age !== null && <span>{companion.age}</span>}
        </h3>
        <p>{companion.tagline ?? companion.occupation ?? "AI companion"}</p>
        <span className="companion-cta">
          Start chatting <ArrowRight size={13} />
        </span>
      </div>
    </Link>
  );
}

export function CompanionCardSkeleton() {
  return <div className="skeleton-card" />;
}
