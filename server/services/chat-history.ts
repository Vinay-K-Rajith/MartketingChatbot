import { MongoClient } from 'mongodb';

const MONGO_URL = process.env.MONGO_URL || 'mongodb+srv://vaishakhp11:PiPa7LUEZ5ufQo8z@cluster0.toscmfj.mongodb.net/';
const DB_NAME = process.env.DB_NAME || 'test';
const COLLECTION = process.env.CHAT_COLLECTION || 'MChat';

const client = new MongoClient(MONGO_URL);

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
  await client.connect();
  const db = client.db(DB_NAME);
  const doc: ChatMessage = {
    sessionId,
    content,
    isUser,
    timestamp: timestamp || new Date(),
    nodeKey,
    type,
  };
  await db.collection(COLLECTION).insertOne(doc);
  return doc;
}

/**
 * Fetches all messages for a session, sorted by timestamp.
 */
export async function getChatMessagesBySession(sessionId: string): Promise<ChatMessage[]> {
  await client.connect();
  const db = client.db(DB_NAME);
  const messages = await db.collection(COLLECTION)
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