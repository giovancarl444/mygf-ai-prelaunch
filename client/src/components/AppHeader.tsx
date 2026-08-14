import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Menu, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

const navLinks = [
  { href: "/companions", label: "Companions" },
  { href: "/chat", label: "Chats" },
];

export function AppHeader() {
  const [location] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="app-header">
      <Link href="/" className="brand" aria-label="MyGF.ai home">
        <span className="brand-mark" aria-hidden="true"><span /></span>
        mygf<em>.ai</em>
      </Link>

      <nav className="app-nav" aria-label="Primary">
        {navLinks.map(link => (
          <Link key={link.href} href={link.href} className={location.startsWith(link.href) ? "active" : undefined}>
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="header-actions">
        {isAuthenticated ? (
          <>
            {user?.role === "admin" && <Link href="/ops/ohapi" className="ghost-button">Studio</Link>}
            <button type="button" className="ghost-button" onClick={() => void logout()}>Sign out</button>
          </>
        ) : (
          <button type="button" className="ghost-button" onClick={() => startLogin()}>Sign in</button>
        )}
        <Link href="/companions" className="primary-button">
          <Sparkles size={15} />
          Explore
        </Link>
        <button
          type="button"
          className="menu-button"
          aria-label="Open navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(open => !open)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {menuOpen && (
        <div className="mobile-nav">
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>{link.label}</Link>
          ))}
          {isAuthenticated
            ? <button type="button" className="ghost-button" onClick={() => void logout()}>Sign out</button>
            : <button type="button" className="ghost-button" onClick={() => startLogin()}>Sign in</button>}
        </div>
      )}
    </header>
  );
}
