/* Landing shell in the discovery design language: fixed topbar, slide-in
   sidebar, mobile dock. Used by / and /companions. */
import { BookmarkCheck, House, Compass, Menu, MessageCircle, Image as ImageIcon, UserRound, X } from "lucide-react";
import { ReactNode, useState } from "react";
import { Link } from "wouter";

type DiscoveryShellProps = {
  active?: "discover" | "collection" | "chat";
  savedCount?: number;
  children: ReactNode;
};

export default function DiscoveryShell({ active = "discover", savedCount = 0, children }: DiscoveryShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const nav = [
    { label: "Home", icon: House, href: "/" },
    { label: "Discover", icon: Compass, href: "/companions", key: "discover" },
    { label: "Chat", icon: MessageCircle, href: "/chat", key: "chat" },
    { label: "Collection", icon: ImageIcon, href: "/collection", key: "collection" },
  ];

  return (
    <div className="d-app-shell">
      <header className="d-topbar">
        <button className="d-icon-button" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle menu">
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <Link href="/" className="d-brand" aria-label="MyGF.ai home">
          mygf<span className="d-brand-accent">.ai</span>
        </Link>
        <nav className="d-top-nav" aria-label="Primary">
          <Link href="/companions" className={active === "discover" ? "active" : ""}>
            <Compass size={15} /> Discover
          </Link>
          <Link href="/collection" className={active === "collection" ? "active" : ""}>
            <UserRound size={15} /> Collection
          </Link>
        </nav>
        <div className="d-top-actions">
          <Link href="/signin" className="d-button d-button-ghost">Log in</Link>
          <Link href="/companions" className="d-button d-button-primary">Meet them</Link>
        </div>
      </header>

      {sidebarOpen && <button className="d-sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />}
      <aside className={`d-sidebar ${sidebarOpen ? "open" : ""}`} aria-label="Main navigation">
        <nav className="d-side-nav">
          {nav.map(({ label, icon: Icon, href, key }) => (
            <Link key={label} href={href} onClick={() => setSidebarOpen(false)} className={`d-side-item ${key && active === key ? "active" : ""}`}>
              <Icon size={16} />{label}
              {label === "Collection" && savedCount > 0 && <span className="d-saved-count">{savedCount}</span>}
            </Link>
          ))}
          <Link href="/signin" onClick={() => setSidebarOpen(false)} className="d-side-item"><UserRound size={16} />Sign in</Link>
        </nav>
        <nav className="d-utility-nav">
          <span className="d-legal">Adults only (18+). Every companion is AI.</span>
        </nav>
      </aside>

      <main className="d-main"><div className="d-content-frame">{children}</div></main>

      <nav className="d-mobile-dock" aria-label="Mobile navigation">
        <Link href="/companions" className={active === "discover" ? "active" : ""}><Compass size={19} /><span>Discover</span></Link>
        <Link href="/collection" className={active === "collection" ? "active" : ""}>
          <BookmarkCheck size={19} /><span>Saved</span>
          {savedCount > 0 && <b>{savedCount}</b>}
        </Link>
        <Link href="/chat" className={active === "chat" ? "active" : ""}><MessageCircle size={19} /><span>Chat</span></Link>
        <button onClick={() => setSidebarOpen(true)}><Menu size={20} /><span>Menu</span></button>
      </nav>
    </div>
  );
}
