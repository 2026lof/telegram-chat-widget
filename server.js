import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Temporary in-memory storage
// For production, use MongoDB/Postgres/Redis
const conversations = {};

function getVisitorConversation(visitorId) {
  if (!conversations[visitorId]) {
    conversations[visitorId] = {
      messages: [],
      humanTakeover: false
    };
  }

  return conversations[visitorId];
}

async function sendToTelegram(text) {
  const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;

  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text
    })
  });
}

// Website sends message here
app.post("/api/chat", async (req, res) => {
  try {
    const { visitorId, name, email, message } = req.body;

    if (!visitorId || !message) {
      return res.status(400).json({ error: "visitorId and message are required" });
    }

    const conversation = getVisitorConversation(visitorId);

    conversation.messages.push({
      from: "user",
      text: message,
      time: new Date().toISOString()
    });

    await sendToTelegram(`
📩 New website chat

Visitor ID: ${visitorId}
Name: ${name || "Guest"}
Email: ${email || "Not provided"}

Message:
${message}

To take over, reply in Telegram like:
${visitorId}: your reply here
`);

    let aiReply = null;

    if (!conversation.humanTakeover) {
      const aiResponse = await openai.responses.create({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: "You are a helpful website chatbot. Keep replies short, friendly, and ask one useful follow-up question."
          },
          {
            role: "user",
            content: message
          }
        ]
      });

      aiReply = aiResponse.output_text;

      conversation.messages.push({
        from: "ai",
        text: aiReply,
        time: new Date().toISOString()
      });

      await sendToTelegram(`
🤖 AI replied to ${visitorId}:

${aiReply}

Human takeover format:
${visitorId}: your reply here
`);
    }

    res.json({
      success: true,
      reply: aiReply || "Thanks, a team member will reply shortly."
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Browser fetches replies here
app.get("/api/replies/:visitorId", (req, res) => {
  const { visitorId } = req.params;
  const conversation = getVisitorConversation(visitorId);

  res.json({
    success: true,
    messages: conversation.messages
  });
});

// Telegram webhook receives human replies here
app.post("/api/telegram-webhook", async (req, res) => {
  try {
    const text = req.body?.message?.text;

    if (!text) {
      return res.sendStatus(200);
    }

    const match = text.match(/^([a-zA-Z0-9_-]+):\s*(.+)$/s);

    if (!match) {
      return res.sendStatus(200);
    }

    const visitorId = match[1];
    const humanReply = match[2];

    const conversation = getVisitorConversation(visitorId);

    conversation.humanTakeover = true;

    conversation.messages.push({
      from: "human",
      text: humanReply,
      time: new Date().toISOString()
    });

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(200);
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});
