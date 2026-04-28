export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { name, email, message } = JSON.parse(event.body || "{}");

  const text = `
New website chat message:

Name: ${name || "Guest"}
Email: ${email || "Not provided"}

Message:
${message}
`;

  const telegramUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;

  const response = await fetch(telegramUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text
    })
  });

  const data = await response.json();

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      reply: "Thanks! We received your message.",
      telegram: data
    })
  };
}
