export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';

// One-time nonce cookie that binds an OAuth login to the browser that started
// it. The `__Host-` prefix forces the cookie host-only (Secure, Path=/, no
// Domain), so a sibling *.manus.space site cannot plant a matching value in a
// victim's browser.
export const OAUTH_STATE_COOKIE = "__Host-oauth_state";

// `state` carries the callback redirect URI (used at token exchange) plus the
// CSRF nonce. Defined here so the client encoder and server decoder never drift.
export type OAuthState = { redirectUri: string; nonce?: string };

export const encodeOAuthState = (state: OAuthState): string =>
  btoa(JSON.stringify(state));

export const decodeOAuthState = (state: string): OAuthState => {
  let decoded: string;
  try {
    decoded = atob(state);
  } catch {
    // Malformed base64 (e.g. attacker-supplied garbage). Return no nonce so the
    // callback's CSRF guard rejects it with 403 — never throw, since the caller
    // runs outside the request handler's try/catch.
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
    // Legacy links: `state` was a bare base64(redirectUri) with no nonce.
  }
  return { redirectUri: decoded };
};

/**
 * What marks an identity as belonging to a visitor rather than an account.
 *
 * A guest is a real user row, distinguished only by this prefix — which is what
 * keeps ownership, allowances, and the safety protocol from having to learn
 * about a second kind of account. The consequence is that anything asking "is
 * this person signed in?" gets `true` from the mere existence of a user unless
 * it checks here, and the client did exactly that: a visitor was shown a
 * "Sign out" button, told they had an account, and never offered the sign-up
 * that the entire funnel depends on.
 *
 * Shared rather than duplicated because a second copy of this string on the
 * client is a copy that can drift from the one that mints the identities.
 */
export const GUEST_OPEN_ID_PREFIX = "guest:";

export const isGuestOpenId = (openId: string | null | undefined): boolean =>
  typeof openId === "string" && openId.startsWith(GUEST_OPEN_ID_PREFIX);
