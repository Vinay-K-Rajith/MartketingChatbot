import { users, chatSessions, chatMessages, type User, type InsertUser, type ChatSession, type ChatMessage, type InsertChatSession, type InsertChatMessage } from "@shared/schema";
import { MongoClient } from "mongodb";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(sessionId: string): Promise<ChatMessage[]>;
}

const mongoUrl = process.env.MONGO_URL || "mongodb+srv://vaishakhp11:PiPa7LUEZ5ufQo8z@cluster0.toscmfj.mongodb.net/";
const dbName = "test";
const collectionName = "MChat_History";

let mongoClient: MongoClient | null = null;
async function getMongoCollection() {
  if (!mongoUrl) throw new Error("MONGO_URL environment variable is not set. Chat history will not be saved.");
  if (!mongoClient) {
    mongoClient = new MongoClient(mongoUrl);
    await mongoClient.connect();
  }
  return mongoClient.db(dbName).collection(collectionName);
}

export class MongoStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> { return undefined; }
  async getUserByUsername(username: string): Promise<User | undefined> { return undefined; }
  async createUser(user: InsertUser): Promise<User> { throw new Error('Not implemented'); }

  async createChatSession(session: InsertChatSession): Promise<ChatSession> {
    if (!mongoUrl) {
      console.warn("[MongoStorage] MONGO_URL not set. Skipping createChatSession.");
      return {
        id: Date.now(),
        sessionId: session.sessionId,
        createdAt: new Date(),
        updatedAt: new Date(),
        type: "session"
      } as ChatSession;
    }
    const col = await getMongoCollection();
    const now = new Date();
    const doc = {
      id: Date.now(),
      sessionId: session.sessionId,
      createdAt: now,
      updatedAt: now,
      type: "session",
      timestamp: now // Always set timestamp for session
    };
    await col.insertOne(doc);
    return doc as ChatSession;
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    if (!mongoUrl) {
      console.warn("[MongoStorage] MONGO_URL not set. Skipping createChatMessage.");
      return {
        id: Date.now(),
        sessionId: message.sessionId,
        content: message.content,
        isUser: message.isUser,
        timestamp: new Date(),
        metadata: message.metadata ?? null,
      } as ChatMessage;
    }
    const col = await getMongoCollection();
    const doc = {
      id: Date.now(),
      sessionId: message.sessionId,
      content: message.content,
      isUser: message.isUser,
      timestamp: new Date(),
      type: "message",
      metadata: null
    };
    await col.insertOne(doc);
    return doc as ChatMessage;
  }

  async getChatMessages(sessionId: string): Promise<ChatMessage[]> {
    if (!mongoUrl) {
      console.warn("[MongoStorage] MONGO_URL not set. Returning empty chat history.");
      return [];
    }
    const col = await getMongoCollection();
    const docs = await col.find({ sessionId, type: "message" }).sort({ timestamp: 1 }).toArray();
    return docs.map(doc => ({
      id: doc.id ?? (doc._id ? doc._id.toString() : undefined),
      sessionId: doc.sessionId,
      content: doc.content,
      isUser: doc.isUser,
      timestamp: doc.timestamp,
      metadata: doc.metadata ?? null,
    }));
  }
}

export const storage = new MongoStorage();
