/**
 * Sending one kind of message: a sign-in link.
 *
 * No SDK and no dependency — a JSON POST is the whole integration, and one
 * fewer package is one fewer thing that can be abandoned, compromised, or
 * decide it has an opinion about what this product is.
 *
 * With nothing configured it prints the link to the server log instead of
 * failing. That is what makes local development work without an account
 * anywhere, and it is deliberately loud so it cannot be mistaken for a
 * production configuration.
 */

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
};

function config() {
  return {
    provider: (process.env.EMAIL_PROVIDER ?? "log").trim().toLowerCase(),
    apiKey: process.env.EMAIL_API_KEY?.trim() ?? "",
    from: process.env.EMAIL_FROM?.trim() ?? "",
  };
}

/**
 * Delivers a message, or reports that it could not.
 *
 * Never throws. A sign-in flow that 500s because a mail provider is having a
 * bad afternoon tells the customer nothing useful, and the caller has a better
 * answer available: say the link is on its way, and log the failure here.
 */
export async function sendEmail(message: EmailMessage): Promise<{ delivered: boolean }> {
  const { provider, apiKey, from } = config();

  if (provider === "log" || !apiKey || !from) {
    console.warn(
      "[Email] No provider configured — printing instead of sending.\n  to: %s\n  subject: %s\n%s",
      message.to,
      message.subject,
      message.text,
    );
    return { delivered: false };
  }

  try {
    if (provider === "resend") {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ from, to: [message.to], subject: message.subject, text: message.text }),
      });
      if (!response.ok) throw new Error(`Resend answered ${response.status}`);
      return { delivered: true };
    }

    if (provider === "postmark") {
      const response = await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Postmark-Server-Token": apiKey,
        },
        body: JSON.stringify({
          From: from,
          To: message.to,
          Subject: message.subject,
          TextBody: message.text,
          MessageStream: "outbound",
        }),
      });
      if (!response.ok) throw new Error(`Postmark answered ${response.status}`);
      return { delivered: true };
    }

    console.error("[Email] Unknown EMAIL_PROVIDER %j — nothing was sent.", provider);
    return { delivered: false };
  } catch (error) {
    // The address is logged; the link is not. A log file is not a place to
    // leave working credentials.
    console.error("[Email] Delivery to %s failed:", message.to, error);
    return { delivered: false };
  }
}
