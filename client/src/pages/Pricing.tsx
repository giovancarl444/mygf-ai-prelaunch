import DiscoveryShell from "@/components/discovery/DiscoveryShell";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { BookmarkCheck, Check, Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import "./discovery.css";

function planFeatures(plan: { id: string; hourlyTextLimit: number; hourlyMediaLimit: number; includedMediaCredits: number; periodDays: number }) {
  if (plan.id === "free") {
    return [
      `${plan.hourlyTextLimit} messages per hour`,
      "Browse every companion",
      "A taste of the conversation before you commit",
    ];
  }
  return [
    `${plan.hourlyTextLimit} messages per hour`,
    `${plan.includedMediaCredits} media credits included per 30 days`,
    `${plan.hourlyMediaLimit} generations per hour on top`,
    "Photos, voice notes, and video in the thread",
  ];
}

export default function Pricing() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const plans = trpc.billing.plans.useQuery();
  const status = trpc.billing.status.useQuery(undefined, { enabled: isAuthenticated });
  const checkout = trpc.billing.checkout.useMutation();
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    setPaid(new URLSearchParams(window.location.search).get("paid") === "1");
  }, []);

  const activePlan = status.data?.subscription?.planId ?? "free";
  const creditBalance = status.data?.creditBalance ?? 0;

  const startCheckout = (planId: "premium" | "premium_annual") => {
    checkout.mutate({ planId }, {
      onSuccess: session => { window.location.href = session.checkoutUrl; },
    });
  };

  return (
    <DiscoveryShell>
      <section className="d-section" aria-label="Pricing">
        <div className="d-section-title-row">
          <h2 className="d-section-heading"><span className="accent">Simple</span> pricing</h2>
        </div>

        {paid && (
          <div className="paid-banner">
            <Check size={17} />
            Payment confirmed — your plan is active. Enjoy her company.
          </div>
        )}

        {isAuthenticated && (
          <p style={{ color: "#a7a5aa", fontSize: 13, margin: "0 0 8px" }}>
            Current plan: <strong style={{ color: "#fff" }}>{activePlan === "free" ? "Free" : activePlan === "premium" ? "Premium" : "Premium, annual"}</strong>
            {" · "}{creditBalance} media credits
          </p>
        )}

        {plans.isLoading ? (
          <div className="d-empty-state"><Loader2 size={24} className="animate-spin" /><h3>Loading plans</h3></div>
        ) : plans.data ? (
          <div className="plan-grid">
            {plans.data.map(plan => {
              const isCurrent = activePlan === plan.id;
              const purchasable = plan.priceCents > 0;
              return (
                <article key={plan.id} className={`plan-card ${plan.id === "premium" ? "featured" : ""}`}>
                  <p className="plan-kicker">{plan.id === "free" ? "START HERE" : plan.id === "premium" ? "MOST POPULAR" : "BEST VALUE"}</p>
                  <h3 className="plan-name">{plan.id === "premium" ? "Premium" : plan.id === "premium_annual" ? "Premium, annual" : "Free"}</h3>
                  <div className="plan-price">
                    ${plan.priceCents === 0 ? "0" : (plan.priceCents / 100).toFixed(2).replace(/\.00$/, "")}
                    {plan.priceCents > 0 && <small> /{plan.periodDays >= 365 ? "year" : "month"}</small>}
                  </div>
                  <ul className="plan-features">
                    {planFeatures(plan).map(feature => (
                      <li key={feature}><Check size={14} />{feature}</li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <span className="plan-current"><BookmarkCheck size={14} />Your current plan</span>
                  ) : !purchasable ? (
                    <span className="plan-cta" style={{ cursor: "default" }}>Included with every account</span>
                  ) : authLoading ? null : isAuthenticated ? (
                    <button className="plan-cta primary" disabled={checkout.isPending} onClick={() => startCheckout(plan.id as "premium" | "premium_annual")}>
                      {checkout.isPending && checkout.variables?.planId === plan.id ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                      {checkout.isPending && checkout.variables?.planId === plan.id ? "Opening checkout…" : `Get ${plan.id === "premium_annual" ? "annual" : "premium"}`}
                    </button>
                  ) : (
                    <Link href="/signin" className="plan-cta primary">Sign in to upgrade</Link>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="d-empty-state">
            <Sparkles size={26} />
            <h3>Plans are unavailable right now</h3>
            <p>Try again in a moment.</p>
          </div>
        )}

        <p style={{ color: "#747277", fontSize: 11, margin: "26px 0 0", maxWidth: 640, lineHeight: 1.6 }}>
          Payments are processed by a third-party checkout. MyGF.ai never sees your card
          details or wallet keys. Adults only (18+). Every companion is AI.
        </p>
      </section>
    </DiscoveryShell>
  );
}
