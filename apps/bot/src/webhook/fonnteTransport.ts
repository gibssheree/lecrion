// apps/bot/src/webhook/fonnteTransport.ts
// Fonnte API transport adapter — the only file that calls the Fonnte endpoint

export async function sendFonnteMessage(
  target: string,
  message: string,
  token: string,
): Promise<void> {
  const form = new URLSearchParams();
  form.append("target", target);
  form.append("message", message);

  const response = await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Fonnte API error ${response.status}: ${text.slice(0, 200)}`,
    );
  }
}
