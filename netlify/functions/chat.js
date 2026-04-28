import { getConversation } from "./store.js";

async function sendTelegram(text) {
  const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text
    })
  });
}

async function getAiReply(message) {
  if (!process.env.OPENAI_API_KEY) {
    return "Thanks! A team member will reply shortly.";
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "You are a helpful website chatbot. Keep replies short, friendly, and professional."
        },
        {
          role: "user",
          content: message
        }
      ]
    })
  });

  const data = await response.json();
  return data.output_text || "Thanks! A team member will reply shortly.";
}

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { visitorId, name, email, message } = JSON.parse(event.body || "{}");

    if (!visitorId || !message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "visitorId and message are required" })
      };
    }

    const conversation = getConversation(visitorId);

    conversation.messages.push({
      from: "user",
      text: message,
      time: new Date().toISOString()
    });

    const aiReply = conversation.humanTakeover
      ? "Thanks! A team member will reply shortly."
      : await getAiReply(message);

    conversation.messages.push({
      from: "ai",
      text: aiReply,
      time: new Date().toISOString()
    });

    await sendTelegram(`
📩 New website chat

Visitor ID: ${visitorId}
Name: ${name || "Guest"}
Email: ${email || "Not provided"}

Message:
${message}

🤖 AI replied:
${aiReply}

To reply from Telegram, send:
${visitorId}: your reply here
`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        reply: aiReply
      })
    };
  } catch (err) {
    console.error(err);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server error" })
    };
  }
}
