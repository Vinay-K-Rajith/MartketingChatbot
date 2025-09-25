import databaseService from './database';

export type ChatMessage = {
  sessionId: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  nodeKey?: string; // Added for workflow/menu tracking
  type?: string;    // 'menu' | 'freeform' etc.
};

/**
 * Stores a chat message (user, menu-driven, or AI) in the flat schema:
 * { sessionId, content, isUser, timestamp, type: 'message' }
 */
export async function saveChatMessage({ sessionId, content, isUser, timestamp, nodeKey, type }: Omit<ChatMessage, 'timestamp'> & { timestamp?: Date }): Promise<ChatMessage> {
  const collection = await databaseService.getChatCollection();
  const doc: ChatMessage = {
    sessionId,
    content,
    isUser,
    timestamp: timestamp || new Date(),
    nodeKey,
    type,
  };
  await collection.insertOne(doc);
  return doc;
}

/**
 * Fetches all messages for a session, sorted by timestamp.
 */
export async function getChatMessagesBySession(sessionId: string): Promise<ChatMessage[]> {
  const collection = await databaseService.getChatCollection();
  const messages = await collection
    .find({ sessionId })
    .sort({ timestamp: 1 })
    .toArray();
  // Map to ChatMessage type
  return messages.map((m: any) => ({
    sessionId: m.sessionId,
    content: m.content,
    isUser: m.isUser,
    timestamp: m.timestamp,
    nodeKey: m.nodeKey,
    type: m.type,
  }));
} 