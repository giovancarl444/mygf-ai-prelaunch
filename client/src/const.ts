export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Sends someone to sign in.
 *
 * This used to hand off to an identity provider on the hosting platform, which
 * meant losing that account would have meant losing every login. Sign-in is now
 * ours: a link to an email address, issued and verified by this server.
 *
 * Kept as a function with the same name and shape as the redirect it replaced,
 * so every call site continues to read the same way.
 */
export const startLogin = () => {
  window.location.href = "/signin";
};
