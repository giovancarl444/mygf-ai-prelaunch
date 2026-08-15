import { AppHeader } from "@/components/AppHeader";
import { trpc } from "@/lib/trpc";
import { CircleAlert, MailCheck, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

/**
 * Why a link and not a password: there is no password to store here, so there
 * is none to leak, reset, or have reused from somewhere the customer signed up
 * years ago. On an adult product, the account someone least wants breached is
 * usually this one.
 */
const PROBLEMS: Record<string, string> = {
  expired: "That link has already been used or has expired. Ask for a new one — they last fifteen minutes.",
  otherdevice:
    "Open that link in the browser you asked for it from. The link is still good, so try again from the device where you entered your email.",
  missing: "That link was incomplete. Ask for a new one below.",
  unavailable: "Sign-in is briefly unavailable. Please try again in a moment.",
};

export default function SignIn() {
  const [email, setEmail] = useState("");
  const problem = PROBLEMS[new URLSearchParams(window.location.search).get("error") ?? ""];

  const request = trpc.auth.requestLink.useMutation();

  return (
    <div className="app-shell">
      <AppHeader />
      <main className="gate">
        <div className="gate-card">
          {request.isSuccess ? (
            <>
              <MailCheck size={30} />
              <h1>Check your email</h1>
              <p>
                If <strong>{email}</strong> can receive mail, a sign-in link is on its way. It
                works once and expires in fifteen minutes.
              </p>
              <p className="gate-foot">
                Open it in this browser — the link is tied to the one that asked for it.
              </p>
            </>
          ) : (
            <>
              <LockKeyhole size={30} />
              <h1>Sign in</h1>
              <p>
                No password. Enter your email and we will send you a link — your conversations
                come with you.
              </p>

              {problem && (
                <p className="chat-error" role="alert">
                  <CircleAlert size={15} />
                  {problem}
                </p>
              )}

              <form
                className="signin-form"
                onSubmit={event => {
                  event.preventDefault();
                  if (email.trim()) request.mutate({ email: email.trim() });
                }}
              >
                <input
                  type="email"
                  required
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  aria-label="Your email address"
                />
                <button
                  type="submit"
                  className="primary-button large"
                  disabled={!email.trim() || request.isPending}
                >
                  {request.isPending ? "Sending…" : "Email me a link"}
                </button>
              </form>

              {request.error && (
                <p className="chat-error" role="alert">
                  <CircleAlert size={15} />
                  {request.error.message}
                </p>
              )}

              <p className="gate-foot">
                18+ only · Every companion is AI · Not therapy ·{" "}
                <Link href="/companions">Browse first</Link>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
