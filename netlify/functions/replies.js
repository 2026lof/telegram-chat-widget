import { getConversation } from "./store.js";

export async function handler(event) {
  const visitorId = event.queryStringParameters?.visitorId;

  if (!visitorId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "visitorId is required" })
    };
  }

  const conversation = getConversation(visitorId);

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      messages: conversation.messages
    })
  };
}
