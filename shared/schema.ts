import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  content: text("content").notNull(),
  isUser: boolean("is_user").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  metadata: jsonb("metadata"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).pick({
  sessionId: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  sessionId: true,
  content: true,
  isUser: true,
  metadata: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type ChatSession = typeof chatSessions.$inferSelect;
// Extend ChatMessage type to support menu options in metadata
export type ChatMessage = typeof chatMessages.$inferSelect & {
  options?: ChatMenuOption[]; // Menu options, if any (from metadata)
};
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// Menu option type for chat messages
export type ChatMenuOption = {
  label: string;
  next?: string;
  query?: string;
};
