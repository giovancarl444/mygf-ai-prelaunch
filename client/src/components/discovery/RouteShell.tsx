/* Shared chrome for the detail routes (profile, collection) in the discovery
   design language. */
import { BookmarkCheck, ChevronLeft, Compass, House, Image as ImageIcon, Menu, MessageCircle } from "lucide-react";
import { ReactNode, useState } from "react";
import { Link } from "wouter";

type RouteShellProps = {
  active: "profile" | "collection";
  children: ReactNode;
  eyebrow?: string;
};

export default function RouteShell({ active, children, eyebrow }: RouteShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = [
    { label: "Home", icon: House, href: "/" },
    { label: "Discover", icon: Compass, href: "/companions" },
    { label: "Chat", icon: MessageCircle, href: "/chat" },
    { label: "Collection", icon: ImageIcon, href: "/collection" },
  ];

  return (
    <div className="route-shell">
      <header className="route-topbar">
        <button className="route-menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation"><Menu size={23} /></button>
        <Link href="/" className="route-brand"><span className="route-brand-mark">♥</span>mygf<span>.</span>ai</Link>
        <div className="route-crumb">
          <Link href="/companions"><ChevronLeft size={16} />Back to discover</Link>
          {eyebrow && <span>{eyebrow}</span>}
        </div>
        <div className="route-top-actions">
          <Link href="/collection" className="route-collection-link"><BookmarkCheck size={15} />Saved</Link>
          <Link href="/companions" className="route-return-link">Browse</Link>
        </div>
      </header>

      {menuOpen && <button className="route-scrim" onClick={() => setMenuOpen(false)} aria-label="Close navigation" />}
      <aside className={`route-sidebar ${menuOpen ? "is-open" : ""}`}>
        {nav.map(({ label, icon: Icon, href }) => (
          <Link href={href} key={label} onClick={() => setMenuOpen(false)} className={`route-side-item ${active === "collection" && label === "Collection" ? "active" : ""}`}>
            <Icon size={16} />{label}
          </Link>
        ))}
      </aside>

      <main className="route-main">{children}</main>

      <nav className="route-mobile-nav">
        <Link href="/companions"><Compass size={18} />Discover</Link>
        <Link href="/collection" className={active === "collection" ? "active" : ""}><BookmarkCheck size={18} />Saved</Link>
        <Link href="/chat"><MessageCircle size={18} />Chat</Link>
        <button onClick={() => setMenuOpen(true)}><Menu size={19} />Menu</button>
      </nav>
    </div>
  );
}
