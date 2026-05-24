type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendEmail({ to, subject, text, html }: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "Ψαλτική Παιδεία <onboarding@resend.dev>";

  if (!apiKey) {
    return { ok: false, skipped: true, reason: "missing_resend_api_key" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text,
      html,
    }),
  });

  if (!res.ok) {
    const error = await res.text().catch(() => "");
    return { ok: false, skipped: false, reason: error || `resend_${res.status}` };
  }

  return { ok: true, skipped: false, reason: null };
}
