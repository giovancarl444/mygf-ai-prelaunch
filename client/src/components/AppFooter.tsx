import { Link } from "wouter";

export function AppFooter() {
  return (
    <footer className="app-footer">
      <div>
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          mygf<em>.ai</em>
        </Link>
        <p>Private AI companions with conversation, images, voice, and video — account-owned and under your control.</p>
        <small>
          Adults only (18+). Every companion is AI. Not a human, not therapy,
          and not a substitute for professional support.
        </small>
      </div>

      <div>
        <h3>Explore</h3>
        <nav>
          <Link href="/companions">All companions</Link>
          <Link href="/chat">Your chats</Link>
        </nav>
      </div>

      <div>
        <h3>Product</h3>
        <nav>
          <Link href="/#how">How it works</Link>
          <Link href="/#principles">Principles</Link>
        </nav>
      </div>

      <div>
        <h3>Boundaries</h3>
        <nav>
          <span>AI, always disclosed</span>
          <span>Account-owned threads</span>
          <span>You control your data</span>
        </nav>
      </div>
    </footer>
  );
}
