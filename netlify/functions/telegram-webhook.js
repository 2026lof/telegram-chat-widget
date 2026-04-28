import { getConversation } from "./store.js";

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const body = JSON.parse(event.body || "{}");
    const text = body.message?.text;

    if (!text) {
      return { statusCode: 200, body: "OK" };
    }

    const match = text.match(/^(v_[a-zA-Z0-9_-]+):\s*(.+)$/s);

    if (!match) {
      return { statusCode: 200, body: "No visitor reply detected" };
    }

    const visitorId = match[1];
    const reply = match[2];

    const conversation = getConversation(visitorId);

    conversation.humanTakeover = true;

    conversation.messages.push({
      from: "human",
      text: reply,
      time: new Date().toISOString()
    });

    return { statusCode: 200, body: "OK" };
  } catch (err) {
    console.error(err);
    return { statusCode: 200, body: "OK" };
  }
}
