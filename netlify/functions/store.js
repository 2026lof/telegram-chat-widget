const conversations = global.conversations || {};
global.conversations = conversations;

export function getConversation(visitorId) {
  if (!conversations[visitorId]) {
    conversations[visitorId] = {
      messages: [],
      humanTakeover: false
    };
  }

  return conversations[visitorId];
}
