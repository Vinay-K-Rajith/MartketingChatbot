var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// server/index.ts
import "dotenv/config";
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import { MongoClient } from "mongodb";
var mongoUrl = process.env.MONGO_URL || "mongodb+srv://vaishakhp11:PiPa7LUEZ5ufQo8z@cluster0.toscmfj.mongodb.net/";
var dbName = "test";
var collectionName = "MChat_History";
var mongoClient = null;
async function getMongoCollection() {
  if (!mongoUrl) throw new Error("MONGO_URL environment variable is not set. Chat history will not be saved.");
  if (!mongoClient) {
    mongoClient = new MongoClient(mongoUrl);
    await mongoClient.connect();
  }
  return mongoClient.db(dbName).collection(collectionName);
}
var MongoStorage = class {
  async getUser(id) {
    return void 0;
  }
  async getUserByUsername(username) {
    return void 0;
  }
  async createUser(user) {
    throw new Error("Not implemented");
  }
  async createChatSession(session) {
    if (!mongoUrl) {
      console.warn("[MongoStorage] MONGO_URL not set. Skipping createChatSession.");
      return {
        id: Date.now(),
        sessionId: session.sessionId,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date(),
        type: "session"
      };
    }
    const col = await getMongoCollection();
    const now = /* @__PURE__ */ new Date();
    const doc = {
      id: Date.now(),
      sessionId: session.sessionId,
      createdAt: now,
      updatedAt: now,
      type: "session",
      timestamp: now
      // Always set timestamp for session
    };
    await col.insertOne(doc);
    return doc;
  }
  async createChatMessage(message) {
    if (!mongoUrl) {
      console.warn("[MongoStorage] MONGO_URL not set. Skipping createChatMessage.");
      return {
        id: Date.now(),
        sessionId: message.sessionId,
        content: message.content,
        isUser: message.isUser,
        timestamp: /* @__PURE__ */ new Date(),
        metadata: message.metadata ?? null
      };
    }
    const col = await getMongoCollection();
    const doc = {
      id: Date.now(),
      sessionId: message.sessionId,
      content: message.content,
      isUser: message.isUser,
      timestamp: /* @__PURE__ */ new Date(),
      type: "message",
      metadata: null
    };
    await col.insertOne(doc);
    return doc;
  }
  async getChatMessages(sessionId) {
    if (!mongoUrl) {
      console.warn("[MongoStorage] MONGO_URL not set. Returning empty chat history.");
      return [];
    }
    const col = await getMongoCollection();
    const docs = await col.find({ sessionId, type: "message" }).sort({ timestamp: 1 }).toArray();
    return docs.map((doc) => ({
      id: doc.id ?? (doc._id ? doc._id.toString() : void 0),
      sessionId: doc.sessionId,
      content: doc.content,
      isUser: doc.isUser,
      timestamp: doc.timestamp,
      metadata: doc.metadata ?? null
    }));
  }
};
var storage = new MongoStorage();

// server/services/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { MongoClient as MongoClient2 } from "mongodb";
var genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || "AIzaSyDeeabQImj4RvQkb1OL82P46pIKW6Q7Bg0"
);
var model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
async function fetchCompanyContextFromMKB() {
  const mongoUrl3 = process.env.MONGO_URL;
  const dbName3 = "test";
  const mkbCollectionName = "MKB";
  const client2 = new MongoClient2(mongoUrl3);
  await client2.connect();
  const col = client2.db(dbName3).collection(mkbCollectionName);
  const doc = await col.findOne({});
  await client2.close();
  if (!doc) return {};
  const { _id, ...fields } = doc;
  return fields;
}
async function generateResponse(userMessage, sessionId) {
  try {
    const companyContext = await fetchCompanyContextFromMKB();
    const systemPrompt = `You are a professional marketing AI assistant for Entab Infotech Pvt Ltd, a leading Indian software development company specializing in school management solutions. Your primary goal is to generate leads and promote Entab's products and services.

IMPORTANT GUIDELINES:
- Always be professional, knowledgeable, and solution-oriented
- Focus on lead generation and converting inquiries into business opportunities
- Highlight Entab's expertise in school management solutions (ERP, mobile apps, digital learning tools)
- Use proper formatting with emojis and bullet points for better readability
- If you don't have specific information, offer to connect them with the sales team
- Always maintain Entab's professional brand image
- Be clear and concise but compelling in your responses

COMPANY CONTEXT:
${JSON.stringify(companyContext, null, 2)}

Please respond to the user's query in a professional, marketing-focused way that generates leads and promotes Entab's solutions.`;
    const result = await model.generateContent([
      { text: systemPrompt },
      { text: `User Query: ${userMessage}` }
    ]);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error generating AI response:", error);
    return "I apologize, but I'm having trouble processing your request right now. Please try again later or contact our sales team directly for immediate assistance.";
  }
}

// server/routes.ts
import { nanoid } from "nanoid";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { MongoClient as MongoClient4 } from "mongodb";

// server/services/chat-history.ts
import { MongoClient as MongoClient3 } from "mongodb";
var MONGO_URL = process.env.MONGO_URL || "mongodb+srv://vaishakhp11:PiPa7LUEZ5ufQo8z@cluster0.toscmfj.mongodb.net/";
var DB_NAME = process.env.DB_NAME || "test";
var COLLECTION = process.env.CHAT_COLLECTION || "MChat";
var client = new MongoClient3(MONGO_URL);
async function saveChatMessage({ sessionId, content, isUser, timestamp, nodeKey, type }) {
  await client.connect();
  const db = client.db(DB_NAME);
  const doc = {
    sessionId,
    content,
    isUser,
    timestamp: timestamp || /* @__PURE__ */ new Date(),
    nodeKey,
    type
  };
  await db.collection(COLLECTION).insertOne(doc);
  return doc;
}
async function getChatMessagesBySession(sessionId) {
  await client.connect();
  const db = client.db(DB_NAME);
  const messages = await db.collection(COLLECTION).find({ sessionId }).sort({ timestamp: 1 }).toArray();
  return messages.map((m) => ({
    sessionId: m.sessionId,
    content: m.content,
    isUser: m.isUser,
    timestamp: m.timestamp,
    nodeKey: m.nodeKey,
    type: m.type
  }));
}

// server/routes.ts
var mongoUrl2 = process.env.MONGO_URL;
var dbName2 = "test";
var collectionName2 = "MChat";
var mongoClient2 = null;
async function getMongoCollection2() {
  if (!mongoClient2) {
    mongoClient2 = new MongoClient4(mongoUrl2);
    await mongoClient2.connect();
  }
  return mongoClient2.db(dbName2).collection(collectionName2);
}
async function registerRoutes(app2) {
  const mkbCollectionName = "MKB";
  let mkbClient = null;
  async function getMkbCollection() {
    if (!mkbClient) {
      mkbClient = new MongoClient4(mongoUrl2);
      await mkbClient.connect();
    }
    return mkbClient.db(dbName2).collection(mkbCollectionName);
  }
  app2.get("/api/kb/articles", async (req, res) => {
    try {
      const col = await getMkbCollection();
      const articles = await col.find({}).sort({ lastUpdated: -1 }).toArray();
      res.json({ articles });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch articles", details: err instanceof Error ? err.message : String(err) });
    }
  });
  app2.post("/api/kb/articles", async (req, res) => {
    try {
      const { title, category, content, status } = req.body;
      if (!title || !category || !content) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const now = /* @__PURE__ */ new Date();
      const article = {
        title,
        category,
        content,
        status: status || "draft",
        lastUpdated: now,
        wordCount: content.trim().split(/\s+/).length
      };
      const col = await getMkbCollection();
      const result = await col.insertOne(article);
      res.json({ article: { ...article, _id: result.insertedId } });
    } catch (err) {
      res.status(500).json({ error: "Failed to create article", details: err instanceof Error ? err.message : String(err) });
    }
  });
  app2.put("/api/kb/articles/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { title, category, content, status } = req.body;
      if (!title || !category || !content) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const now = /* @__PURE__ */ new Date();
      const col = await getMkbCollection();
      const result = await col.updateOne(
        { _id: new (__require("mongodb")).ObjectId(id) },
        {
          $set: {
            title,
            category,
            content,
            status: status || "draft",
            lastUpdated: now,
            wordCount: content.trim().split(/\s+/).length
          }
        }
      );
      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Article not found" });
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update article", details: err instanceof Error ? err.message : String(err) });
    }
  });
  app2.delete("/api/kb/articles/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const col = await getMkbCollection();
      const result = await col.deleteOne({ _id: new (__require("mongodb")).ObjectId(id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "Article not found" });
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete article", details: err instanceof Error ? err.message : String(err) });
    }
  });
  app2.get("/api/kb/raw", async (req, res) => {
    try {
      const col = await getMkbCollection();
      const doc = await col.findOne({});
      if (!doc) return res.json({});
      const { _id, ...fields } = doc;
      res.json(fields);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch MKB raw", details: err instanceof Error ? err.message : String(err) });
    }
  });
  app2.patch("/api/kb/raw", async (req, res) => {
    try {
      const keys = Object.keys(req.body);
      if (keys.length !== 1) return res.status(400).json({ error: "Request body must have exactly one field" });
      const field = keys[0];
      const value = req.body[field];
      const col = await getMkbCollection();
      let doc = await col.findOne({});
      if (!doc) {
        await col.insertOne({});
        doc = await col.findOne({});
      }
      if (value === null) {
        await col.updateOne({}, { $unset: { [field]: "" } });
      } else {
        await col.updateOne({}, { $set: { [field]: value } });
      }
      const updated = await col.findOne({});
      const { _id, ...fields } = updated || {};
      res.json(fields);
    } catch (err) {
      res.status(500).json({ error: "Failed to update MKB raw", details: err instanceof Error ? err.message : String(err) });
    }
  });
  app2.get("/api/chat/all", async (req, res) => {
    try {
      const col = await getMongoCollection2();
      const messages = await col.find({}).sort({ sessionId: 1, timestamp: 1 }).toArray();
      res.json({ messages });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch all messages", details: err instanceof Error ? err.message : String(err) });
    }
  });
  app2.post("/api/chat/session", async (req, res) => {
    try {
      const sessionId = nanoid();
      const session = await storage.createChatSession({ sessionId });
      res.json({ sessionId: session.sessionId });
    } catch (error) {
      console.error("Error creating chat session:", error);
      res.status(500).json({ error: "Failed to create chat session" });
    }
  });
  app2.post("/api/chat/message", async (req, res) => {
    try {
      const { sessionId, content } = req.body;
      if (!sessionId || !content) {
        return res.status(400).json({ error: "Session ID and content are required" });
      }
      const userMessage = await saveChatMessage({
        sessionId,
        content,
        isUser: true
      });
      const aiResponse = await generateResponse(content, sessionId);
      const aiMessage = await saveChatMessage({
        sessionId,
        content: aiResponse,
        isUser: false
      });
      res.json({ userMessage, aiMessage });
    } catch (error) {
      console.error("Error processing message:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });
  app2.get("/api/chat/history/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const messages = await getChatMessagesBySession(sessionId);
      res.json({ messages });
    } catch (error) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ error: "Failed to fetch chat history" });
    }
  });
  app2.post("/api/register-user", async (req, res) => {
    console.log("Received registration:", req.body);
    const { name, phone } = req.body;
    if (!name || !phone) return res.status(400).json({ error: "Missing fields" });
    try {
      const response = await fetch("https://script.google.com/macros/s/AKfycbyCAUSV1HesBEyrathJGJJoq04QIjKrY2QOIe6GafphZCdZvrnq1JtwihrekHW2RATUCw/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone })
      });
      const text = await response.text();
      if (response.ok) {
        const csvLine = `"${(/* @__PURE__ */ new Date()).toISOString()}","${name.replace(/"/g, '""')}","${phone.replace(/"/g, '""')}"
`;
        const filePath = path.join(__dirname, "..", "registrations.csv");
        fs.appendFile(filePath, csvLine, (err) => {
          if (err) console.error("Failed to save to CSV:", err);
        });
        return res.json({ success: true, text });
      } else {
        return res.status(500).json({ error: "Failed to register to Google Sheets", text });
      }
    } catch (err) {
      return res.status(500).json({
        error: "Proxy error",
        details: err instanceof Error ? err.message : String(err)
      });
    }
  });
  app2.get("/api/chat/sessions", async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 15;
      const skip = (page - 1) * limit;
      const col = await getMongoCollection2();
      const totalSessions = await col.distinct("sessionId");
      const total = totalSessions.length;
      const sessions = await col.aggregate([
        { $group: {
          _id: "$sessionId",
          lastMessageAt: { $max: "$timestamp" },
          messageCount: { $sum: 1 },
          firstMessage: { $first: "$content" }
        } },
        { $sort: { lastMessageAt: -1 } },
        { $skip: skip },
        { $limit: limit }
      ]).toArray();
      res.json({
        sessions: sessions.map((s) => ({
          sessionId: s._id,
          lastMessageAt: s.lastMessageAt,
          messageCount: s.messageCount,
          firstMessage: s.firstMessage
        })),
        total,
        page,
        limit
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch sessions", details: err instanceof Error ? err.message : String(err) });
    }
  });
  app2.get("/api/chat/usage", async (req, res) => {
    try {
      const col = await getMongoCollection2();
      const type = req.query.type || "daily";
      let groupId;
      if (type === "monthly") groupId = { $dateToString: { format: "%Y-%m", date: "$timestamp" } };
      else if (type === "weekly") groupId = { $isoWeek: "$timestamp" };
      else groupId = { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } };
      const usage = await col.aggregate([
        { $group: { _id: groupId, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { period: "$_id", count: 1, _id: 0 } }
      ]).toArray();
      res.json({ usage });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch usage", details: err instanceof Error ? err.message : String(err) });
    }
  });
  app2.get("/api/chat/usage/hourly", async (req, res) => {
    try {
      const col = await getMongoCollection2();
      const date = req.query.date;
      if (!date) return res.status(400).json({ error: "Missing date param" });
      const start = /* @__PURE__ */ new Date(date + "T00:00:00.000Z");
      const end = /* @__PURE__ */ new Date(date + "T23:59:59.999Z");
      const usage = await col.aggregate([
        { $match: { timestamp: { $gte: start, $lte: end } } },
        { $group: { _id: { $hour: "$timestamp" }, count: { $sum: 1 } } },
        { $project: { hour: "$_id", count: 1, _id: 0 } },
        { $sort: { hour: 1 } }
      ]).toArray();
      const full = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
      usage.forEach((u) => {
        full[u.hour] = u;
      });
      res.json({ usage: full });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch hourly usage", details: err instanceof Error ? err.message : String(err) });
    }
  });
  app2.post("/api/chat/log", async (req, res) => {
    try {
      const { sessionId, content, isUser, nodeKey, type } = req.body;
      if (!sessionId || !content) {
        return res.status(400).json({ error: "Session ID and content are required" });
      }
      const saved = await saveChatMessage({
        sessionId,
        content,
        isUser,
        nodeKey,
        type: type || "menu"
        // "menu" or "freeform"
      });
      res.json({ success: true, message: saved });
    } catch (error) {
      console.error("Error logging chat message:", error);
      res.status(500).json({ error: "Failed to log chat message" });
    }
  });
  app2.get("/inject.js", (req, res) => {
    res.type("application/javascript").send(`(function() {
      if (window.chatbotInjected) return;
      window.chatbotInjected = true;
      const config = {
        chatbotUrl: 'https://marketingchat.entab.net/',
        chatbotTitle: 'Campus Buddy',
        buttonIcon: '\u{1F4AC}',
        position: 'bottom-right'
      };
      const styles = \`
        .chatbot-container { position: fixed; bottom: 32px; right: 32px; z-index: 999999; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .chatbot-button { width: 70px; height: 70px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; border-radius: 50%; cursor: pointer; box-shadow: 0 4px 24px rgba(102, 126, 234, 0.4); transition: all 0.3s ease; display: flex; align-items: center; justify-content: center; color: white; font-size: 30px; position: relative; }
        .chatbot-container { position: fixed; bottom: 32px; right: 32px; z-index: 999999; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .chatbot-button { width: 70px; height: 70px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; border-radius: 50%; cursor: pointer; box-shadow: 0 4px 24px rgba(102, 126, 234, 0.4); transition: all 0.3s ease; display: flex; align-items: center; justify-content: center; color: white; font-size: 30px; }
        /* .chatbot-button .ai-badge { ... } -- removed AI badge from button */
        .chatbot-button:hover { transform: scale(1.1); box-shadow: 0 6px 30px rgba(102, 126, 234, 0.6); }
        .chatbot-widget { position: absolute; bottom: 0px; right: 0; width: 480px; height: 720px; background: white; border-radius: 24px; box-shadow: 0 12px 48px rgba(0, 0, 0, 0.22); display: none; flex-direction: column; overflow: hidden; animation: slideUp 0.3s ease; }
        .chatbot-widget.active { display: flex; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .chatbot-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 1.25rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
        }
        .chatbot-title {
          font-weight: bold;
          font-size: 1.25rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .chatbot-header .chatbot-logo {
          width: 32px;
          height: 32px;
          margin-right: 0.5rem;
          border-radius: 50%;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
        }
        .chatbot-header .chatbot-logo img {
          width: 28px;
          height: 28px;
        }
        .chatbot-header .ai-badge {
          background: white;
          border: 1px solid #ccc;
          border-radius: 8px;
          color: #333;
          font-size: 12px;
          font-weight: bold;
          padding: 2px 7px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
          letter-spacing: 0.5px;
          margin-left: 0.5rem;
        }
        .chatbot-close {
          background: none;
          border: none;
          color: white;
          font-size: 2rem;
          cursor: pointer;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.3s ease;
        }
        .chatbot-close:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        .chatbot-iframe {
          flex: 1;
          border: none;
          width: 100%;
        }
        /* Always keep the chatbot icon on the right, even on phones */
        .chatbot-container.bottom-right {
          bottom: 32px;
          right: 32px;
          left: auto;
        }
        .chatbot-container.bottom-left {
          bottom: 32px;
          left: 32px;
          right: auto;
        }
        .chatbot-container.bottom-left .chatbot-widget {
          right: auto;
          left: 0;
        }
        .chatbot-container.top-right {
          top: 32px;
          bottom: auto;
          right: 32px;
        }
        .chatbot-container.top-right .chatbot-widget {
          top: 90px;
          bottom: auto;
        }
        .chatbot-container.top-left {
          top: 32px;
          bottom: auto;
          left: 32px;
          right: auto;
        }
        .chatbot-container.top-left .chatbot-widget {
          top: 90px;
          bottom: auto;
          right: auto;
          left: 0;
        }

        /* Responsive adjustments for tablets and laptops */
        @media (max-width: 1200px) {
          .chatbot-widget {
            width: 90vw;
            height: 80vh;
            right: 2vw;
            left: auto;
          }
          .chatbot-container.bottom-left .chatbot-widget,
          .chatbot-container.top-left .chatbot-widget {
            left: 2vw;
            right: auto;
          }
        }
        @media (max-width: 900px) {
          .chatbot-widget {
            width: 98vw;
            height: 80vh;
            right: 1vw;
            left: auto;
          }
          .chatbot-container.bottom-left .chatbot-widget,
          .chatbot-container.top-left .chatbot-widget {
            left: 1vw;
            right: auto;
          }
        }
        /* Mobile: full width, full height, icon always bottom right */
        @media (max-width: 600px) {
          .chatbot-widget {
            width: 100vw;
            height: 100vh;
            right: 0;
            left: 0;
            border-radius: 0;
            min-width: 0;
            min-height: 0;
            max-width: 100vw;
            max-height: 100vh;
          }
          .chatbot-container {
            bottom: 0 !important;
            right: 0 !important;
            left: auto !important;
            width: 100vw;
            z-index: 999999;
          }
          .chatbot-container.bottom-right,
          .chatbot-container.bottom-left,
          .chatbot-container.top-right,
          .chatbot-container.top-left {
            right: 0 !important;
            left: auto !important;
            bottom: 0 !important;
            top: auto !important;
          }
          .chatbot-button {
            width: 56px;
            height: 56px;
            font-size: 24px;
            bottom: 20px !important;
            right: 20px !important;
            left: auto !important;
            position: fixed !important;
            z-index: 1000000;
            box-shadow: 0 2px 12px rgba(102, 126, 234, 0.4);
          }
        }
        /* Make sure the button is always in the bottom right on all screens */
        .chatbot-button {
          width: 70px;
          height: 70px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 4px 24px rgba(102, 126, 234, 0.4);
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 30px;
          position: fixed;
          bottom: 32px;
          right: 32px;
          z-index: 1000000;
        }
        .chatbot-button:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 30px rgba(102, 126, 234, 0.6);
        }
        .chatbot-widget {
          position: absolute;
          bottom: 0px;
          right: 0;
          width: 480px;
          height: 720px;
          background: white;
          border-radius: 24px;
          box-shadow: 0 12px 48px rgba(0, 0, 0, 0.22);
          display: none;
          flex-direction: column;
          overflow: hidden;
          animation: slideUp 0.3s ease;
          min-width: 320px;
          min-height: 400px;
          max-width: 98vw;
          max-height: 98vh;
        }
        .chatbot-widget.active {
          display: flex;
        }
        @keyframes pulse {
          0% { box-shadow: 0 4px 24px rgba(102, 126, 234, 0.4); }
          50% { box-shadow: 0 4px 24px rgba(102, 126, 234, 0.8); }
          100% { box-shadow: 0 4px 24px rgba(102, 126, 234, 0.4); }
        }
        .chatbot-button.pulse {
          animation: pulse 2s infinite;
        }
      \`;
      const styleSheet = document.createElement('style');
      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);
      // Remove AI badge from button, add it to header
      const chatbotHTML = '<div class="chatbot-container ' + config.position + '"><button class="chatbot-button" id="chatbotToggle">' + config.buttonIcon + '</button><div class="chatbot-widget" id="chatbotWidget"><div class="chatbot-header"><div class="chatbot-title">' + config.chatbotTitle + '<span class="ai-badge">AI</span></div><button class="chatbot-close" id="chatbotClose">\xD7</button></div><iframe class="chatbot-iframe" src="' + config.chatbotUrl + '" title="AI Chatbot"></iframe></div></div>';
      function initializeChatbot() {
        const container = document.createElement('div');
        container.innerHTML = chatbotHTML;
        document.body.appendChild(container.firstElementChild);
        const chatbotToggle = document.getElementById('chatbotToggle');
        const chatbotWidget = document.getElementById('chatbotWidget');
        const chatbotClose = document.getElementById('chatbotClose');
        chatbotToggle.addEventListener('click', () => {
          chatbotWidget.classList.add('active');
          chatbotToggle.style.display = 'none';
        });
        chatbotClose.addEventListener('click', () => {
          chatbotWidget.classList.remove('active');
          chatbotToggle.style.display = 'flex';
        });
        document.addEventListener('click', (e) => {
          if (!e.target.closest('.chatbot-container')) {
            chatbotWidget.classList.remove('active');
            chatbotToggle.style.display = 'flex';
          }
        });
        const hasSeenChatbot = localStorage.getItem('chatbot-seen');
        if (!hasSeenChatbot) {
          chatbotToggle.classList.add('pulse');
          setTimeout(() => {
            chatbotToggle.classList.remove('pulse');
            localStorage.setItem('chatbot-seen', 'true');
          }, 10000);
        }
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeChatbot);
      } else {
        initializeChatbot();
      }
      window.ChatbotConfig = {
        updateUrl: function(newUrl) {
          const iframe = document.querySelector('.chatbot-iframe');
          if (iframe) { iframe.src = newUrl; }
        },
        updateTitle: function(newTitle) {
          const title = document.querySelector('.chatbot-title');
          if (title) { title.textContent = newTitle; }
        },
        updateIcon: function(newIcon) {
          const button = document.querySelector('.chatbot-button');
          if (button) { button.textContent = newIcon; }
        },
        show: function() {
          const widget = document.getElementById('chatbotWidget');
          const toggle = document.getElementById('chatbotToggle');
          if (widget && toggle) {
            widget.classList.add('active');
            toggle.style.display = 'none';
          }
        },
        hide: function() {
          const widget = document.getElementById('chatbotWidget');
          const toggle = document.getElementById('chatbotToggle');
          if (widget && toggle) {
            widget.classList.remove('active');
            toggle.style.display = 'flex';
          }
        }
      };
    })();
    `);
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs2 from "fs";
import path3 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path2 from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname2 = path2.dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path2.resolve(__dirname2, "client", "src"),
      "@shared": path2.resolve(__dirname2, "shared"),
      "@assets": path2.resolve(__dirname2, "attached_assets")
    }
  },
  root: path2.resolve(__dirname2, "client"),
  build: {
    outDir: path2.resolve(__dirname2, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path2.resolve(__dirname2, "client/index.html"),
        widget: path2.resolve(__dirname2, "client/widget.html"),
        embed: path2.resolve(__dirname2, "client/embed.html")
      },
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"]
        }
      }
    },
    assetsDir: "assets",
    copyPublicDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid as nanoid2 } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid2()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path3.resolve(import.meta.dirname, "..");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5001;
  server.listen(5001, "127.0.0.1", () => {
    console.log("Server running on http://127.0.0.1:5001");
  });
})();
