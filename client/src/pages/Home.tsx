import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleArrowDown,
  Eye,
  LockKeyhole,
  Menu,
  MoonStar,
  Orbit,
  Sparkles,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

const companionWorlds = [
  {
    name: "Mira",
    energy: "Quietly direct · for naming the hard thing",
    firstLine: "What is the thought you keep circling back to?",
    tag: "after the noise",
    tone: "mira",
  },
  {
    name: "Elara",
    energy: "Restless curiosity · for a different angle",
    firstLine: "There is a more interesting question hiding in that.",
    tag: "electric hours",
    tone: "elara",
  },
  {
    name: "Junie",
    energy: "Warm mischief · for a little momentum",
    firstLine: "I have a small, unreasonable idea. Want to hear it?",
    tag: "soft chaos",
    tone: "junie",
  },
  {
    name: "Soren",
    energy: "Steady focus · for when the room gets loud",
    firstLine: "We can slow this down without making it smaller.",
    tag: "low light",
    tone: "soren",
  },
  {
    name: "Aveline",
    energy: "Dreamlike precision · for building a scene",
    firstLine: "Start with the doorway. What is on the other side?",
    tag: "blue hour",
    tone: "aveline",
  },
  {
    name: "Nico",
    energy: "Dry humor · for making tonight more interesting",
    firstLine: "Fine. Let us make this a little less predictable.",
    tag: "night shift",
    tone: "nico",
  },
];

const trustPillars = [
  {
    title: "AI, always clearly",
    copy: "Every exchange is presented as AI. No hidden human role, no false claims of feeling, and no blurred line about what this is.",
    icon: Eye,
  },
  {
    title: "Memory you control",
    copy: "Useful details are designed to be reviewable. You decide what becomes a memory, and what does not.",
    icon: Orbit,
  },
  {
    title: "Private by design",
    copy: "A personal space should come with clear boundaries. We are building the controls before we broaden access.",
    icon: LockKeyhole,
  },
];

const howItWorks = [
  {
    number: "01",
    title: "Choose a world",
    copy: "Begin with a point of view, a first line, and a setting that feels right for the moment.",
  },
  {
    number: "02",
    title: "Build your thread",
    copy: "Let a conversation develop in its own rhythm through a character with a considered voice and world.",
  },
  {
    number: "03",
    title: "Your memory, your rules",
    copy: "Review the details that may carry forward, then keep, edit, or remove them on your terms.",
  },
];

type InterestChoice =
  | "story/character continuity"
  | "reflective conversation"
  | "imaginative roleplay"
  | "curious about AI";

function scrollToBeta() {
  document.getElementById("beta-interest")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [interest, setInterest] = useState<InterestChoice | "">("");
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const submitInterest = trpc.betaInterest.submit.useMutation({
    onSuccess: result => {
      if (result.status === "already_registered") {
        setFormMessage("You are already on the private beta interest list.");
        return;
      }
      setEmail("");
      setInterest("");
      setFormMessage("Thank you — your private beta interest has been received.");
    },
    onError: () => setFormMessage("We could not save your interest right now. Please try again shortly."),
  });

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const closeMenuAndScroll = (target: string) => {
    setMenuOpen(false);
    window.setTimeout(() => document.querySelector(target)?.scrollIntoView({ behavior: "smooth" }), 40);
  };

  const handleInterestSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormMessage(null);
    if (!event.currentTarget.reportValidity()) return;
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setFormMessage("Please enter an email address to request beta access.");
      return;
    }
    submitInterest.mutate({ email: normalizedEmail, interest: interest || undefined });
  };

  return (
    <div className="site-shell">
      <div className="grain" aria-hidden="true" />
      <header className="site-header">
        <a className="brand" href="#top" aria-label="mygf.ai home">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span>mygf<span className="brand-dot">.ai</span></span>
        </a>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <a href="#worlds">Worlds</a>
          <a href="#principles">Principles</a>
          <a href="#how-it-works">How it works</a>
        </nav>
        <button className="header-cta" type="button" onClick={scrollToBeta}>
          Request beta access <ArrowUpRight size={15} />
        </button>
        <button className="menu-button" type="button" aria-label="Open navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
        {menuOpen && (
          <div className="mobile-menu">
            <button type="button" onClick={() => closeMenuAndScroll("#worlds")}>Worlds <ArrowDownRight size={16} /></button>
            <button type="button" onClick={() => closeMenuAndScroll("#principles")}>Principles <ArrowDownRight size={16} /></button>
            <button type="button" onClick={() => closeMenuAndScroll("#how-it-works")}>How it works <ArrowDownRight size={16} /></button>
            <button type="button" className="mobile-menu-cta" onClick={() => closeMenuAndScroll("#beta-interest")}>Request beta access</button>
          </div>
        )}
      </header>

      <main id="top">
        <section className="hero section-wrap" aria-labelledby="hero-title">
          <div className="hero-orbit orbit-one" aria-hidden="true" />
          <div className="hero-orbit orbit-two" aria-hidden="true" />
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-dot" />Private beta · In development</p>
            <h1 id="hero-title">Private companion worlds. <em>Your story, your memory, your control.</em></h1>
            <p className="hero-intro">A more considered AI companion experience for adults: distinct points of view, imaginative worlds, and memory that stays under your review.</p>
            <div className="hero-actions">
              <button type="button" className="button button-primary" onClick={scrollToBeta}>Request beta access <ArrowUpRight size={17} /></button>
              <a className="text-link" href="#principles">Read the principles <ArrowDownRight size={16} /></a>
            </div>
            <p className="hero-note"><LockKeyhole size={14} />Building deliberately before broad access.</p>
          </div>
          <div className="hero-stage" aria-label="A preview of a private companion conversation">
            <div className="hero-stage-glow" aria-hidden="true" />
            <div className="stage-topline"><span>Tonight, in Mira&apos;s world</span><span>Private thread</span></div>
            <div className="stage-window">
              <div className="stage-avatar mira" aria-hidden="true"><span /></div>
              <div className="stage-line line-one"><span>Mira</span><p>What is the thought you keep circling back to?</p></div>
              <div className="stage-line line-two"><p>Maybe the one I have not quite said out loud.</p></div>
              <div className="stage-line line-three"><span>Mira</span><p>Then we can give it a little room.</p></div>
              <div className="stage-composer"><span>Begin a private thread</span><button type="button" aria-label="Continue to beta interest"><ArrowUpRight size={15} /></button></div>
            </div>
            <div className="stage-footer"><span><Check size={13} />Memory is always under review</span><span>01 / 06</span></div>
          </div>
        </section>

        <section className="worlds-section section-wrap" id="worlds" aria-labelledby="worlds-title">
          <div className="section-heading split-heading">
            <div>
              <p className="eyebrow"><span className="eyebrow-dot" />A point of view, not a profile</p>
              <h2 id="worlds-title">Six ways into<br /><em>the evening.</em></h2>
            </div>
            <p>Each world begins with its own pace, voice, and angle on a conversation. Meet the one that feels right for tonight.</p>
          </div>
          <div className="worlds-grid">
            {companionWorlds.map((world, index) => (
              <article className={`world-card ${world.tone} ${index === 0 ? "world-card-featured" : ""}`} key={world.name}>
                <div className="world-art" aria-hidden="true">
                  <div className="art-halo" />
                  <div className="art-portrait"><span /><i /></div>
                  <span className="art-index">0{index + 1}</span>
                </div>
                <div className="world-content">
                  <div className="world-meta"><span>{world.tag}</span><MoonStar size={15} /></div>
                  <h3>{world.name}</h3>
                  <p className="world-energy">{world.energy}</p>
                  <blockquote>“{world.firstLine}”</blockquote>
                  <button type="button" className="world-link" onClick={scrollToBeta}>Explore this world <ArrowUpRight size={15} /></button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="principles-section section-wrap" id="principles" aria-labelledby="principles-title">
          <div className="principles-intro">
            <div className="section-heading">
              <p className="eyebrow"><span className="eyebrow-dot" />The foundation matters</p>
              <h2 id="principles-title">The experience should feel<br /><em>clear, not clever.</em></h2>
            </div>
            <p>Companion experiences are personal by nature. That is why the product is being built around explicit boundaries, readable choices, and practical user control.</p>
          </div>
          <div className="trust-grid">
            {trustPillars.map((pillar, index) => {
              const Icon = pillar.icon;
              return (
                <article className="trust-card" key={pillar.title}>
                  <div className="trust-index">0{index + 1}</div>
                  <div className="trust-icon"><Icon size={22} /></div>
                  <h3>{pillar.title}</h3>
                  <p>{pillar.copy}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="how-section section-wrap" id="how-it-works" aria-labelledby="how-title">
          <div className="section-heading centered-heading">
            <p className="eyebrow"><span className="eyebrow-dot" />A deliberate way in</p>
            <h2 id="how-title">A thread that is <em>yours to shape.</em></h2>
          </div>
          <div className="how-grid">
            {howItWorks.map((step, index) => (
              <article className="how-step" key={step.title}>
                <div className="how-number">{step.number}</div>
                {index < howItWorks.length - 1 && <div className="how-connector" aria-hidden="true"><ArrowDownRight size={17} /></div>}
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="beta-section section-wrap" id="beta-interest" aria-labelledby="beta-title">
          <div className="beta-shape beta-shape-one" aria-hidden="true" />
          <div className="beta-shape beta-shape-two" aria-hidden="true" />
          <div className="beta-content">
            <div>
              <p className="eyebrow"><span className="eyebrow-dot" />Small, considered, private</p>
              <h2 id="beta-title">Join the first<br /><em>worlds in progress.</em></h2>
              <p>We are inviting a limited group of adults to help shape the early MyGF.ai experience. Leave your interest, and we will be in touch when the private beta opens.</p>
            </div>
            <form className="interest-form" onSubmit={handleInterestSubmit} noValidate>
              <label htmlFor="interest-email">Email address</label>
              <input id="interest-email" name="email" type="email" placeholder="you@example.com" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              <label htmlFor="interest-draw">What draws you here <span>optional</span></label>
              <div className="select-wrap">
                <select id="interest-draw" name="interest" value={interest} onChange={(event) => setInterest(event.target.value as InterestChoice | "")}>
                  <option value="">Choose an answer</option>
                  <option value="story/character continuity">story/character continuity</option>
                  <option value="reflective conversation">reflective conversation</option>
                  <option value="imaginative roleplay">imaginative roleplay</option>
                  <option value="curious about AI">curious about AI</option>
                </select>
                <ChevronDown size={17} aria-hidden="true" />
              </div>
              <button className="button button-primary form-submit" type="submit" disabled={submitInterest.isPending}>{submitInterest.isPending ? "Saving your interest…" : <>Request beta access <ArrowUpRight size={17} /></>}</button>
              <p className="form-note"><LockKeyhole size={13} />Your interest is private. We will only use this email to follow up about the beta.</p>
              {formMessage && <p className="form-message" role="status" aria-live="polite">{formMessage}</p>}
            </form>
          </div>
        </section>
      </main>

      <footer className="site-footer section-wrap">
        <div className="footer-brand"><a className="brand" href="#top"><span className="brand-mark" aria-hidden="true"><span /></span><span>mygf<span className="brand-dot">.ai</span></span></a><p>Private companion worlds, built with care.</p></div>
        <p className="footer-disclaimer">Adult AI companion experience · Not therapy · Not human</p>
        <a className="footer-link" href="#beta-interest">Private beta <CircleArrowDown size={15} /></a>
      </footer>
    </div>
  );
}
