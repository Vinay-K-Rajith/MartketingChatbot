import { users, chatSessions, chatMessages, type User, type InsertUser, type ChatSession, type ChatMessage, type InsertChatSession, type InsertChatMessage } from "@shared/schema";
import databaseService from './services/database';

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(sessionId: string): Promise<ChatMessage[]>;
}

export class MongoStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> { return undefined; }
  async getUserByUsername(username: string): Promise<User | undefined> { return undefined; }
  async createUser(user: InsertUser): Promise<User> { throw new Error('Not implemented'); }

  async createChatSession(session: InsertChatSession): Promise<ChatSession> {
    try {
      const col = await databaseService.getCollection('MChat_History');
      const now = new Date();
      const doc = {
        id: Date.now(),
        sessionId: session.sessionId,
        createdAt: now,
        updatedAt: now,
        type: "session",
        timestamp: now
      };
      await col.insertOne(doc);
      return doc as ChatSession;
    } catch (error) {
      console.error("[MongoStorage] Error creating chat session:", error);
      return {
        id: Date.now(),
        sessionId: session.sessionId,
        createdAt: new Date(),
        updatedAt: new Date(),
        type: "session"
      } as ChatSession;
    }
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    try {
      const col = await databaseService.getCollection('MChat_History');
      const doc = {
        id: Date.now(),
        sessionId: message.sessionId,
        content: message.content,
        isUser: message.isUser,
        timestamp: new Date(),
        type: "message",
        metadata: message.metadata ?? null
      };
      await col.insertOne(doc);
      return doc as ChatMessage;
    } catch (error) {
      console.error("[MongoStorage] Error creating chat message:", error);
      return {
        id: Date.now(),
        sessionId: message.sessionId,
        content: message.content,
        isUser: message.isUser,
        timestamp: new Date(),
        metadata: message.metadata ?? null,
      } as ChatMessage;
    }
  }

  async getChatMessages(sessionId: string): Promise<ChatMessage[]> {
    try {
      const col = await databaseService.getCollection('MChat_History');
      const docs = await col.find({ sessionId, type: "message" }).sort({ timestamp: 1 }).toArray();
      return docs.map(doc => ({
        id: doc.id ?? (doc._id ? doc._id.toString() : undefined),
        sessionId: doc.sessionId,
        content: doc.content,
        isUser: doc.isUser,
        timestamp: doc.timestamp,
        metadata: doc.metadata ?? null,
      }));
    } catch (error) {
      console.error("[MongoStorage] Error fetching chat messages:", error);
      return [];
    }
  }
}

export const storage = new MongoStorage();
