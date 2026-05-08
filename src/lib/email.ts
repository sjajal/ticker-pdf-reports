type EmailAttachment = {
  filename: string;
  content: string;
};

type SendEmailInput = {
  to: string;
  from: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
};

export async function sendEmail(input: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend request failed: ${response.status} ${body}`);
  }

  return response.json() as Promise<{ id?: string }>;
}
