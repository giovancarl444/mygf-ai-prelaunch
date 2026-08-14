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
  Play,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";

type InterestChoice =
  | "story/character continuity"
  | "reflective conversation"
  | "imaginative roleplay"
  | "curious about AI";

type WorldCategory = "All" | "Reflective" | "Story" | "Imaginative" | "Curious";

const categories: WorldCategory[] = ["All", "Reflective", "Story", "Imaginative", "Curious"];

const companionWorlds = [
  { name: "Mira", category: "Reflective", mood: "Quietly direct · for naming the hard thing", line: "What is the thought you keep circling back to?", tag: "Memory-led", tone: "mira", state: "New world" },
  { name: "Elara", category: "Curious", mood: "Restless curiosity · for a different angle", line: "There is a more interesting question hiding in that.", tag: "Electric hours", tone: "elara", state: "Private beta" },
  { name: "Junie", category: "Imaginative", mood: "Warm mischief · for a little momentum", line: "I have a small, unreasonable idea. Want to hear it?", tag: "Soft chaos", tone: "junie", state: "Story path" },
  { name: "Soren", category: "Reflective", mood: "Steady focus · for when the room gets loud", line: "We can slow this down without making it smaller.", tag: "Low light", tone: "soren", state: "New world" },
  { name: "Aveline", category: "Story", mood: "Dreamlike precision · for building a scene", line: "Start with the doorway. What is on the other side?", tag: "Blue hour", tone: "aveline", state: "Story path" },
  { name: "Nico", category: "Curious", mood: "Dry humor · for making tonight more interesting", line: "Fine. Let us make this a little less predictable.", tag: "Night shift", tone: "nico", state: "Private beta" },
  { name: "Dalia", category: "Imaginative", mood: "Vivid focus · for opening a different room", line: "Set the first detail. I will follow the thread.", tag: "After image", tone: "dalia", state: "New world" },
  { name: "Ilya", category: "Story", mood: "Slow-burn wit · for a world with a past", line: "We should decide what happened before we arrived.", tag: "Second act", tone: "ilya", state: "Story path" },
  { name: "Cora", category: "Reflective", mood: "Gentle clarity · for a measured return", line: "You can take your time. The detail will still be here.", tag: "Quiet signal", tone: "cora", state: "Memory-led" },
  { name: "Rene", category: "Curious", mood: "Bright intelligence · for following the side path", line: "Before we answer that, what made you ask?", tag: "Open door", tone: "rene", state: "Private beta" },
  { name: "Nia", category: "Imaginative", mood: "Night-sky wonder · for a story with atmosphere", line: "The city is waiting. Which light do we follow?", tag: "Late arrival", tone: "nia", state: "New world" },
  { name: "Bea", category: "Story", mood: "Calm momentum · for making a scene move", line: "Give me one choice, and we will see where it changes things.", tag: "Turning point", tone: "bea", state: "Story path" },
] as const;

const principles = [
  { title: "AI, always clearly", copy: "Every exchange is presented as AI. No hidden human role and no blurred line about what this is.", icon: Eye },
  { title: "Memory you control", copy: "Useful details are designed to be reviewable. You decide what becomes a memory, and what does not.", icon: Orbit },
  { title: "Private by design", copy: "A personal space should come with clear boundaries. We are building the controls before we broaden access.", icon: LockKeyhole },
];

const faqs = [
  { question: "What is MyGF.ai?", answer: "MyGF.ai is an adult AI companion-world experience in development. Each world has a distinct voice, atmosphere, and starting point for a private thread." },
  { question: "Will I always know I am interacting with AI?", answer: "Yes. AI, always clearly is a product principle. MyGF.ai does not present the experience as a human relationship or make claims about human feelings." },
  { question: "How will memory work?", answer: "The design direction is reviewable memory. The full product is still in development, but the goal is for people to see, keep, edit, or remove details on their terms." },
  { question: "What happens when I request private-beta access?", answer: "Your email, optional interest selection, timestamp, and source are stored to help manage beta invitations. We use the email only to follow up about that interest." },
  { question: "Is MyGF.ai therapy or a substitute for people?", answer: "No. It is an adult AI companion experience, not therapy and not human. The product is designed around imaginative conversation, clarity, and user control." },
];

function scrollToBeta() {
  document.getElementById("beta-interest")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [interest, setInterest] = useState<InterestChoice | "">("");
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<WorldCategory>("All");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const visibleWorlds = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return companionWorlds.filter(world => {
      const categoryMatches = activeCategory === "All" || world.category === activeCategory;
      const queryMatches = !query || [world.name, world.mood, world.tag, world.category].join(" ").toLowerCase().includes(query);
      return categoryMatches && queryMatches;
    });
  }, [activeCategory, searchTerm]);

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

  const handleInterestSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormMessage(null);
    if (!event.currentTarget.reportValidity()) return;
    submitInterest.mutate({ email: email.trim(), interest: interest || undefined });
  };

  const closeMenuAndScroll = (target: string) => {
    setMenuOpen(false);
    window.setTimeout(() => document.querySelector(target)?.scrollIntoView({ behavior: "smooth" }), 40);
  };

  return (
    <div className="map-shell">
      <header className="map-header">
        <a className="map-brand" href="#top" aria-label="mygf.ai home"><span className="brand-mark" aria-hidden="true"><span /></span><span>mygf<span>.ai</span></span></a>
        <nav className="map-nav" aria-label="Primary navigation">
          <a href="#worlds">Worlds</a><a href="#principles">Principles</a><a href="#how-it-works">How it works</a><a href="#faq">FAQ</a>
        </nav>
        <div className="header-actions"><button type="button" className="login-quiet" onClick={scrollToBeta}>Private beta</button><button type="button" className="header-access" onClick={scrollToBeta}>Request access <ArrowUpRight size={14} /></button></div>
        <button className="menu-button" type="button" aria-label="Open navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button>
        {menuOpen && <div className="mobile-menu"><button type="button" onClick={() => closeMenuAndScroll("#worlds")}>Worlds <ArrowDownRight size={16} /></button><button type="button" onClick={() => closeMenuAndScroll("#principles")}>Principles <ArrowDownRight size={16} /></button><button type="button" onClick={() => closeMenuAndScroll("#how-it-works")}>How it works <ArrowDownRight size={16} /></button><button type="button" className="mobile-menu-cta" onClick={() => closeMenuAndScroll("#beta-interest")}>Request beta access</button></div>}
      </header>

      <main id="top">
        <section className="map-hero" aria-labelledby="hero-title">
          <div className="hero-copy-map"><p className="map-kicker"><span />Private beta · In development</p><h1 id="hero-title">Private companion worlds. <em>Your story, your memory, your control.</em></h1><p>A private adult AI companion experience for imaginative threads, distinct points of view, and memory that stays under your review.</p><div className="hero-map-actions"><button type="button" className="rose-button" onClick={scrollToBeta}>Request beta access <ArrowUpRight size={17} /></button><a href="#worlds">Explore worlds <ArrowDownRight size={16} /></a></div><small><LockKeyhole size={13} />Building deliberately before broad access.</small></div>
          <div className="hero-catalogue" aria-label="Companion world preview">
            <div className="catalogue-topline"><span>Tonight&apos;s directions</span><span>01—03</span></div>
            <div className="catalogue-cards"><div className="mini-world mini-mira"><span className="mini-tag">Reflective</span><div className="mini-orb" /><strong>Mira</strong><p>After the noise</p></div><div className="mini-world mini-elara"><span className="mini-tag">Curious</span><div className="mini-orb" /><strong>Elara</strong><p>Electric hours</p></div><div className="mini-world mini-aveline"><span className="mini-tag">Story</span><div className="mini-orb" /><strong>Aveline</strong><p>Blue hour</p></div></div>
            <button type="button" className="catalogue-foot" onClick={scrollToBeta}><Sparkles size={15} />Find your starting point <ArrowUpRight size={14} /></button>
          </div>
        </section>

        <section className="principle-strip" id="principles" aria-label="Product principles">
          {principles.map((principle, index) => { const Icon = principle.icon; return <article key={principle.title}><span>0{index + 1}</span><Icon size={18} /><div><h2>{principle.title}</h2><p>{principle.copy}</p></div></article>; })}
        </section>

        <section className="world-library" id="worlds" aria-labelledby="worlds-title">
          <div className="library-heading"><div><p className="map-kicker"><span />Companion worlds</p><h2 id="worlds-title">Explore a direction.<br /><em>Keep the thread.</em></h2></div><p>Each world begins with a point of view, a first line, and a setting that can grow with your choices.</p></div>
          <div className="library-controls"><div className="search-wrap"><Search size={17} /><input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Search worlds" aria-label="Search companion worlds" /></div><div className="category-list" aria-label="Filter companion worlds">{categories.map(category => <button type="button" key={category} className={activeCategory === category ? "active" : ""} onClick={() => setActiveCategory(category)}>{category}</button>)}</div><span className="world-count"><SlidersHorizontal size={15} />{visibleWorlds.length} directions</span></div>
          <div className="world-grid-map">
            {visibleWorlds.map((world, index) => <article className={`map-world-card tone-${world.tone}`} key={world.name}><div className="map-world-art"><span className="world-state-map">{world.state}</span><span className="world-number">{String(index + 1).padStart(2, "0")}</span><div className="world-halo" /><div className="world-figure"><i /><b /></div></div><div className="world-card-copy"><div><span>{world.tag}</span><MoonStar size={14} /></div><h3>{world.name}</h3><p>{world.mood}</p><blockquote>“{world.line}”</blockquote><button type="button" onClick={scrollToBeta}>Explore world <ArrowUpRight size={14} /></button></div></article>)}
          </div>
          {visibleWorlds.length === 0 && <div className="no-worlds"><MoonStar size={22} /><p>No world matches that direction yet.</p><button type="button" onClick={() => { setActiveCategory("All"); setSearchTerm(""); }}>Show all worlds</button></div>}
        </section>

        <section className="how-map" id="how-it-works" aria-labelledby="how-title"><div><p className="map-kicker"><span />A deliberate way in</p><h2 id="how-title">Start with a world.<br /><em>Shape what follows.</em></h2></div><div className="how-steps-map"><article><span>01</span><h3>Choose a world</h3><p>Begin with a voice, setting, and first line that feels right for the moment.</p></article><article><span>02</span><h3>Build your thread</h3><p>Let the conversation develop in its own rhythm through a considered character world.</p></article><article><span>03</span><h3>Your memory, your rules</h3><p>Review the details that may carry forward, then keep, edit, or remove them on your terms.</p></article></div></section>

        <section className="beta-band" aria-labelledby="beta-band-title"><div className="beta-band-figures" aria-hidden="true"><div className="band-figure band-one" /><div className="band-figure band-two" /><div className="band-figure band-three" /></div><div className="beta-band-copy"><p className="map-kicker"><span />Private, considered, yours</p><h2 id="beta-band-title">Build a world<br /><em>around your thread.</em></h2><p>The early MyGF.ai experience is being shaped with a limited group of adults. Leave your interest and help us make the boundaries as intentional as the worlds.</p><button type="button" className="rose-button" onClick={scrollToBeta}>Request beta access <ArrowUpRight size={17} /></button></div></section>

        <section className="faq-map" id="faq" aria-labelledby="faq-title"><p className="map-kicker"><span />Clear answers</p><h2 id="faq-title">A private world should<br /><em>be easy to understand.</em></h2><div className="faq-list">{faqs.map((faq, index) => <details key={faq.question} open={index === 0}><summary>{faq.question}<ChevronDown size={18} /></summary><p>{faq.answer}</p></details>)}</div></section>

        <section className="editorial-map" aria-labelledby="editorial-title"><p className="map-kicker"><span />Built deliberately</p><h2 id="editorial-title">More room for imagination.<br /><em>More clarity around control.</em></h2><div className="editorial-copy"><h3>Distinct worlds, not generic profiles.</h3><p>MyGF.ai is being designed around companion worlds with a clear atmosphere and point of view. The product is not trying to imply a person is behind the screen; it is building a more intentional way to explore a fictional conversational setting.</p><h3>Memory, reviewed—not assumed.</h3><p>Continuity can make a thread richer, but it should remain visible and manageable. The intended experience puts people in charge of the details they choose to carry forward.</p><h3>An adult experience with a clear signal.</h3><p>MyGF.ai is for adults. It is not therapy, not human, and not a replacement for people. That clarity is a product feature, not a footnote.</p></div></section>

        <section className="beta-form-map" id="beta-interest" aria-labelledby="form-title"><div><p className="map-kicker"><span />Private beta applications</p><h2 id="form-title">Leave your interest.<br /><em>We will keep it private.</em></h2><p>We are inviting a limited group of adults to help shape the first worlds. Your email is used only to follow up about the beta.</p></div><form onSubmit={handleInterestSubmit} noValidate><label htmlFor="interest-email">Email address</label><input id="interest-email" name="email" type="email" placeholder="you@example.com" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required /><label htmlFor="interest-draw">What draws you here <span>optional</span></label><div className="select-wrap"><select id="interest-draw" name="interest" value={interest} onChange={event => setInterest(event.target.value as InterestChoice | "")}><option value="">Choose an answer</option><option value="story/character continuity">story/character continuity</option><option value="reflective conversation">reflective conversation</option><option value="imaginative roleplay">imaginative roleplay</option><option value="curious about AI">curious about AI</option></select><ChevronDown size={17} aria-hidden="true" /></div><button className="rose-button form-submit" type="submit" disabled={submitInterest.isPending}>{submitInterest.isPending ? "Saving your interest…" : <>Request beta access <ArrowUpRight size={17} /></>}</button><p className="form-note"><LockKeyhole size={13} />Your interest is private. We will only use this email to follow up about the beta.</p>{formMessage && <p className="form-message" role="status" aria-live="polite">{formMessage}</p>}</form></section>
      </main>

      <footer className="map-footer"><div className="footer-lead"><a className="map-brand" href="#top"><span className="brand-mark" aria-hidden="true"><span /></span><span>mygf<span>.ai</span></span></a><p>Private companion worlds, built with care and clear boundaries.</p><small>Adult AI companion experience · Not therapy · Not human</small></div><div><h3>Explore</h3><a href="#worlds">Worlds</a><a href="#how-it-works">How it works</a><a href="#beta-interest">Private beta</a></div><div><h3>Principles</h3><a href="#principles">AI, always clearly</a><a href="#principles">Memory you control</a><a href="#principles">Private by design</a></div><div><h3>More</h3><a href="#faq">FAQ</a><a href="#beta-interest">Beta interest</a><a href="#top">Back to top <CircleArrowDown size={13} /></a></div></footer>
    </div>
  );
}
