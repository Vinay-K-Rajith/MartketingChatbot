



import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertChatMessageSchema, insertChatSessionSchema } from "@shared/schema";
import { generateResponse } from "./services/gemini";
import { nanoid } from "nanoid";
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { MongoClient } from 'mongodb';
import databaseService from './services/database';
import { saveChatMessage, getChatMessagesBySession } from './services/chat-history';
import {
  createWorkflow,
  getWorkflowById,
  getWorkflowByName,
  getAllWorkflows,
  updateWorkflow,
  deleteWorkflow,
  duplicateWorkflow,
  getWorkflowTemplates,
  validateWorkflow,
  testWorkflow
} from './services/workflow';

const mongoUrl = process.env.MONGO_URL;
const dbName = 'test';
const collectionName = 'MChat';

// Using centralized database service

export async function registerRoutes(app: Express): Promise<Server> {

  // Using centralized database service for MKB

  // --- Knowledge Base API (MKB) ---
  app.get('/api/kb/articles', async (req: import('express').Request, res: import('express').Response) => {
    try {
      const col = await databaseService.getKnowledgeBaseCollection();
      const articles = await col.find({}).sort({ lastUpdated: -1 }).toArray();
      res.json({ articles });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch articles', details: err instanceof Error ? err.message : String(err) });
    }
  });

  app.post('/api/kb/articles', async (req: import('express').Request, res: import('express').Response) => {
    try {
      const { title, category, content, status } = req.body;
      if (!title || !category || !content) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      const now = new Date();
      const article = {
        title,
        category,
        content,
        status: status || 'draft',
        lastUpdated: now,
        wordCount: content.trim().split(/\s+/).length
      };
      const col = await databaseService.getKnowledgeBaseCollection();
      const result = await col.insertOne(article);
      res.json({ article: { ...article, _id: result.insertedId } });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create article', details: err instanceof Error ? err.message : String(err) });
    }
  });

  app.put('/api/kb/articles/:id', async (req: import('express').Request, res: import('express').Response) => {
    try {
      const { id } = req.params;
      const { title, category, content, status } = req.body;
      if (!title || !category || !content) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      const now = new Date();
      const col = await databaseService.getKnowledgeBaseCollection();
      const result = await col.updateOne(
        { _id: new (require('mongodb').ObjectId)(id) },
        { $set: {
            title,
            category,
            content,
            status: status || 'draft',
            lastUpdated: now,
            wordCount: content.trim().split(/\s+/).length
          }
        }
      );
      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Article not found' });
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update article', details: err instanceof Error ? err.message : String(err) });
    }
  });

  app.delete('/api/kb/articles/:id', async (req: import('express').Request, res: import('express').Response) => {
    try {
      const { id } = req.params;
      const col = await databaseService.getKnowledgeBaseCollection();
      const result = await col.deleteOne({ _id: new (require('mongodb').ObjectId)(id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Article not found' });
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete article', details: err instanceof Error ? err.message : String(err) });
    }
  });

  // --- New: Knowledge Base RAW API (single MKB doc, each field is an article) ---
  // GET: fetch all fields from the single MKB document (excluding _id)
  app.get('/api/kb/raw', async (req, res) => {
    try {
      const col = await databaseService.getKnowledgeBaseCollection();
      // Assume only one document in MKB collection
      const doc = await col.findOne({});
      if (!doc) return res.json({});
      const { _id, ...fields } = doc;
      res.json(fields);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch MKB raw', details: err instanceof Error ? err.message : String(err) });
    }
  });

  // PATCH: update/add/remove fields in the single MKB document
  // Body: { field: string, value: string | null }
  app.patch('/api/kb/raw', async (req, res) => {
    try {
      // Accepts: { [field]: value } (e.g., { "ArticleTitle": "Content" } or { "ArticleTitle": null })
      const keys = Object.keys(req.body);
      if (keys.length !== 1) return res.status(400).json({ error: 'Request body must have exactly one field' });
      const field = keys[0];
      const value = req.body[field];
      const col = await databaseService.getKnowledgeBaseCollection();
      // Find the single MKB doc
      let doc = await col.findOne({});
      if (!doc) {
        // If not found, create it as an empty doc
        await col.insertOne({});
        doc = await col.findOne({});
      }
      if (value === null) {
        // Remove the field
        await col.updateOne({}, { $unset: { [field]: "" } });
      } else {
        // Set or update the field
        await col.updateOne({}, { $set: { [field]: value } });
      }
      // Return updated doc (excluding _id)
      const updated = await col.findOne({});
      const { _id, ...fields } = updated || {};
      res.json(fields);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update MKB raw', details: err instanceof Error ? err.message : String(err) });
    }
  });
  // Fetch all chat messages, sorted by sessionId and timestamp
  app.get('/api/chat/all', async (req, res) => {
    try {
      const col = await databaseService.getChatCollection();
      // Fetch all messages, sort by sessionId and timestamp
      const messages = await col.find({}).sort({ sessionId: 1, timestamp: 1 }).toArray();
      res.json({ messages });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch all messages', details: err instanceof Error ? err.message : String(err) });
    }
  });
  // Create a new chat session
  app.post("/api/chat/session", async (req, res) => {
    try {
      const sessionId = nanoid();
      const session = await storage.createChatSession({ sessionId });
      res.json({ sessionId: session.sessionId });
    } catch (error) {
      console.error("Error creating chat session:", error);
      res.status(500).json({ error: "Failed to create chat session" });
    }
  });

  // Send a message and get AI response
  app.post("/api/chat/message", async (req, res) => {
    try {
      const { sessionId, content } = req.body;
      if (!sessionId || !content) {
        return res.status(400).json({ error: "Session ID and content are required" });
      }
      // Save user/menu message
      const userMessage = await saveChatMessage({
        sessionId,
        content,
        isUser: true,
      });
      // Generate AI response
      const aiResponse = await generateResponse(content, sessionId);
      // Save AI message
      const aiMessage = await saveChatMessage({
        sessionId,
        content: aiResponse,
        isUser: false,
      });
      res.json({ userMessage, aiMessage });
    } catch (error) {
      console.error("Error processing message:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  // Get chat history for a session
  app.get("/api/chat/history/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const messages = await getChatMessagesBySession(sessionId);
      res.json({ messages });
    } catch (error) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ error: "Failed to fetch chat history" });
    }
  });

  app.post('/api/register-user', async (req, res) => {
    console.log('Received registration:', req.body); // Debug log
    const { name, phone, schoolName, studentCount } = req.body;
    if (!name || !phone || !schoolName || !studentCount) return res.status(400).json({ error: 'Missing fields' });

    try {
      const response = await fetch('https://script.google.com/macros/s/AKfycbx4majGs1lrc9dsON_f7vhniSAuothoNh7DLclnqI3XjuRSuffW4zyEkqItIt0EpIqGuw/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, schoolName, studentCount }),
      });

      const text = await response.text();
      if (response.ok) {
        return res.json({ success: true });
      } else {
        return res.status(500).json({ error: 'Failed to register' });
      }
    } catch (err) {
      console.error('Registration error:', err);
      return res.status(500).json({ error: 'Failed to register' });
    }
  });

  // Dashboard: Get all chat sessions (from MChat) with pagination and backend filtering
  app.get('/api/chat/sessions', async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 15;
      const skip = (page - 1) * limit;
      
      // Extract filter parameters
      const fromDate = req.query.fromDate as string;
      const toDate = req.query.toDate as string;
      const sortBy = req.query.sortBy as string || 'Newest First';
      const searchId = req.query.searchId as string;

      const col = await databaseService.getChatCollection();

      // Build match conditions for filtering
      const matchConditions: any = {};
      
      // Date range filtering
      if (fromDate || toDate) {
        matchConditions.timestamp = {};
        if (fromDate) {
          matchConditions.timestamp.$gte = new Date(fromDate + 'T00:00:00.000Z');
        }
        if (toDate) {
          matchConditions.timestamp.$lte = new Date(toDate + 'T23:59:59.999Z');
        }
      }
      
      // Session ID search filtering
      if (searchId) {
        matchConditions.sessionId = { $regex: searchId, $options: 'i' };
      }

      // Build aggregation pipeline
      const pipeline: any[] = [];
      
      // Apply filters first if any exist
      if (Object.keys(matchConditions).length > 0) {
        pipeline.push({ $match: matchConditions });
      }
      
      // Group by sessionId and calculate aggregates
      pipeline.push({
        $group: {
          _id: "$sessionId",
          lastMessageAt: { $max: "$timestamp" },
          messageCount: { $sum: 1 },
          firstMessage: { $first: "$content" }
        }
      });
      
      // Sort based on parameter
      const sortDirection = sortBy === 'Oldest First' ? 1 : -1;
      pipeline.push({ $sort: { lastMessageAt: sortDirection } });
      
      // Get total count for pagination (without skip/limit)
      const totalPipeline = [...pipeline];
      const totalResult = await col.aggregate(totalPipeline).toArray();
      const total = totalResult.length;
      
      // Apply pagination
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: limit });
      
      // Execute final aggregation
      const sessions = await col.aggregate(pipeline).toArray();

      res.json({
        sessions: sessions.map(s => ({
          sessionId: s._id,
          lastMessageAt: s.lastMessageAt,
          messageCount: s.messageCount,
          firstMessage: s.firstMessage
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch sessions', details: err instanceof Error ? err.message : String(err) });
    }
  });

  // Dashboard: Get dashboard statistics (total messages, registrations, etc.)
  app.get('/api/dashboard/stats', async (req, res) => {
    try {
      const col = await databaseService.getChatCollection();
      
      // Get total messages count
      const totalMessages = await col.countDocuments({});
      
      // Get registrations count (messages containing "Register for the Demo")
      const registrations = await col.countDocuments({
        content: { $regex: /Register for the Demo/i }
      });
      
      // Get unique sessions count
      const uniqueSessions = await col.distinct('sessionId');
      const totalSessions = uniqueSessions.length;
      
      // Get active users (sessions with messages in last 24 hours)
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const activeUsers = await col.distinct('sessionId', {
        timestamp: { $gte: last24Hours }
      });
      const activeUsersCount = activeUsers.length;
      
      // Calculate conversion rate (registrations / total sessions)
      const conversionRate = totalSessions > 0 ? (registrations / totalSessions * 100).toFixed(1) : '0.0';
      
      // Calculate percentage changes (comparing last 7 days vs previous 7 days)
      const now = new Date();
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const previous7Days = new Date(last7Days.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      // Debug logging for date ranges
      console.log('Dashboard Stats - Date Ranges:', {
        now: now.toISOString(),
        last7Days: last7Days.toISOString(),
        previous7Days: previous7Days.toISOString(),
        last7DaysDuration: now.getTime() - last7Days.getTime(),
        previous7DaysDuration: last7Days.getTime() - previous7Days.getTime()
      });
      
      // Messages in last 7 days (exclusive end date to avoid overlap)
      const messagesLast7Days = await col.countDocuments({
        timestamp: { $gte: last7Days, $lt: now }
      });
      
      // Messages in previous 7 days (exclusive end date to avoid overlap)
      const messagesPrevious7Days = await col.countDocuments({
        timestamp: { $gte: previous7Days, $lt: last7Days }
      });
      
      // Debug logging for message counts
      console.log('Dashboard Stats - Message Counts:', {
        messagesLast7Days,
        messagesPrevious7Days,
        totalMessages
      });
      
      // Additional validation logging
      console.log('Dashboard Stats - Validation:', {
        last7DaysRange: `${last7Days.toISOString()} to ${now.toISOString()}`,
        previous7DaysRange: `${previous7Days.toISOString()} to ${last7Days.toISOString()}`,
        noOverlap: last7Days.getTime() === previous7Days.getTime() + (7 * 24 * 60 * 60 * 1000)
      });
      
      // Calculate message change percentage
      let messageChange = '0%';
      let messageChangeType: 'up' | 'down' = 'up';
      if (messagesPrevious7Days > 0) {
        const change = ((messagesLast7Days - messagesPrevious7Days) / messagesPrevious7Days * 100);
        messageChange = `${Math.abs(change).toFixed(1)}%`;
        messageChangeType = change >= 0 ? 'up' : 'down';
      } else if (messagesLast7Days > 0) {
        // If no previous messages but current period has messages, show 100% increase
        messageChange = '100%';
        messageChangeType = 'up';
      }
      
      // Registrations in last 7 days (exclusive end date to avoid overlap)
      const registrationsLast7Days = await col.countDocuments({
        content: { $regex: /Register for the Demo/i },
        timestamp: { $gte: last7Days, $lt: now }
      });
      
      // Registrations in previous 7 days
      const registrationsPrevious7Days = await col.countDocuments({
        content: { $regex: /Register for the Demo/i },
        timestamp: { $gte: previous7Days, $lt: last7Days }
      });
      
      // Calculate registration change percentage
      let registrationChange = '0%';
      let registrationChangeType: 'up' | 'down' = 'up';
      if (registrationsPrevious7Days > 0) {
        const change = ((registrationsLast7Days - registrationsPrevious7Days) / registrationsPrevious7Days * 100);
        registrationChange = `${Math.abs(change).toFixed(1)}%`;
        registrationChangeType = change >= 0 ? 'up' : 'down';
      } else if (registrationsLast7Days > 0) {
        // If no previous registrations but current period has registrations, show 100% increase
        registrationChange = '100%';
        registrationChangeType = 'up';
      }
      
      // Total Sessions change (last 7 days vs previous 7 days)
      // Count unique sessions that started within each period
      const sessionsLast7Days = await col.distinct('sessionId', {
        timestamp: { $gte: last7Days, $lt: now }
      });
      
      const sessionsPrevious7Days = await col.distinct('sessionId', {
        timestamp: { $gte: previous7Days, $lt: last7Days }
      });
      
      let totalSessionsChange = '0%';
      let totalSessionsChangeType: 'up' | 'down' = 'up';
      if (sessionsPrevious7Days.length > 0) {
        const change = ((sessionsLast7Days.length - sessionsPrevious7Days.length) / sessionsPrevious7Days.length * 100);
        totalSessionsChange = `${Math.abs(change).toFixed(1)}%`;
        totalSessionsChangeType = change >= 0 ? 'up' : 'down';
      } else if (sessionsLast7Days.length > 0) {
        // If no previous sessions but current period has sessions, show 100% increase
        totalSessionsChange = '100%';
        totalSessionsChangeType = 'up';
      }
      
      // Conversion Rate change (last 7 days vs previous 7 days)
      // Calculate conversion rate for each period separately
      const conversionLast7Days = sessionsLast7Days.length > 0 ? 
        (registrationsLast7Days / sessionsLast7Days.length * 100) : 0;
      
      const conversionPrevious7Days = sessionsPrevious7Days.length > 0 ? 
        (await col.countDocuments({
          content: { $regex: /Register for the Demo/i },
          timestamp: { $gte: previous7Days, $lt: last7Days }
        }) / sessionsPrevious7Days.length * 100) : 0;
      
      let conversionRateChange = '0%';
      let conversionRateChangeType: 'up' | 'down' = 'up';
      if (conversionPrevious7Days > 0) {
        const change = ((conversionLast7Days - conversionPrevious7Days) / conversionPrevious7Days * 100);
        conversionRateChange = `${Math.abs(change).toFixed(1)}%`;
        conversionRateChangeType = change >= 0 ? 'up' : 'down';
      } else if (conversionLast7Days > 0) {
        // If no previous conversion rate but current period has conversion, show 100% increase
        conversionRateChange = '100%';
        conversionRateChangeType = 'up';
      }
      
      res.json({
        totalMessages,
        totalMessagesChange: messageChange,
        totalMessagesChangeType: messageChangeType,
        registrations,
        registrationsChange: registrationChange,
        registrationsChangeType: registrationChangeType,
        activeUsers: activeUsersCount,
        activeUsersChange: '0%', // Keeping for backward compatibility
        activeUsersChangeType: 'up', // Keeping for backward compatibility
        conversionRate,
        conversionRateChange,
        conversionRateChangeType: conversionRateChangeType,
        totalSessions,
        totalSessionsChange,
        totalSessionsChangeType: totalSessionsChangeType
      });
      
      // Log final calculated values for verification
      console.log('Dashboard Stats - Final Values:', {
        totalMessages,
        totalMessagesChange: messageChange,
        registrations,
        registrationsChange: registrationChange,
        totalSessions,
        totalSessionsChange,
        conversionRate,
        conversionRateChange
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch dashboard stats', details: err instanceof Error ? err.message : String(err) });
    }
  });

  // Dashboard: Get registration analytics over time
  app.get('/api/dashboard/registrations', async (req, res) => {
    try {
      const col = await databaseService.getChatCollection();
      const type = req.query.type || 'daily';
      
      let groupId: any;
      if (type === 'monthly') {
        groupId = { $dateToString: { format: '%Y-%m', date: '$timestamp' } };
      } else if (type === 'weekly') {
        groupId = { $isoWeek: '$timestamp' };
      } else if (type === 'hourly') {
        groupId = { $dateToString: { format: '%Y-%m-%d %H:00', date: '$timestamp' } };
      } else {
        groupId = { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } };
      }
      
      const registrations = await col.aggregate([
        { $match: { content: { $regex: /Register for the Demo/i } } },
        { $group: { _id: groupId, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { period: '$_id', registrations: '$count', _id: 0 } }
      ]).toArray();
      
      res.json({ registrations });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch registration analytics', details: err instanceof Error ? err.message : String(err) });
    }
  });

  // Dashboard: Usage analytics (daily/weekly/monthly)
  app.get('/api/chat/usage', async (req, res) => {
    try {
      const col = await databaseService.getChatCollection();
      const type = req.query.type || 'daily';
      let groupId: any;
      if (type === 'monthly') groupId = { $dateToString: { format: '%Y-%m', date: '$timestamp' } };
      else if (type === 'weekly') groupId = { $isoWeek: '$timestamp' };
      else groupId = { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } };
      const usage = await col.aggregate([
        { $group: { _id: groupId, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { period: '$_id', count: 1, _id: 0 } }
      ]).toArray();
      res.json({ usage });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch usage', details: err instanceof Error ? err.message : String(err) });
    }
  });

  // Dashboard: Hourly usage for a given date
  app.get('/api/chat/usage/hourly', async (req, res) => {
    try {
      const col = await databaseService.getChatCollection();
      const date = req.query.date as string;
      if (!date) return res.status(400).json({ error: 'Missing date param' });
      const start = new Date(date + 'T00:00:00.000Z');
      const end = new Date(date + 'T23:59:59.999Z');
      const usage = await col.aggregate([
        { $match: { timestamp: { $gte: start, $lte: end } } },
        { $group: { _id: { $hour: '$timestamp' }, count: { $sum: 1 } } },
        { $project: { hour: '$_id', count: 1, _id: 0 } },
        { $sort: { hour: 1 } }
      ]).toArray();
      // Fill missing hours
      const full = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
      usage.forEach((u: any) => { full[u.hour] = u; });
      res.json({ usage: full });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch hourly usage', details: err instanceof Error ? err.message : String(err) });
    }
  });

  app.post("/api/chat/log", async (req, res) => {
    try {
      const { sessionId, content, isUser, nodeKey, type } = req.body;
      if (!sessionId || !content) {
        return res.status(400).json({ error: "Session ID and content are required" });
      }
      // Save message to MongoDB
      const saved = await saveChatMessage({
        sessionId,
        content,
        isUser,
        nodeKey,
        type: type || "menu", // "menu" or "freeform"
      });
      res.json({ success: true, message: saved });
    } catch (error) {
      console.error("Error logging chat message:", error);
      res.status(500).json({ error: "Failed to log chat message" });
    }
  });

  // Inject.js route for chatbot widget
  app.get('/inject.js', (req, res) => {
    res.type('application/javascript').send(`(function() {
      if (window.chatbotInjected) return;
      window.chatbotInjected = true;
      const config = {
        chatbotUrl: 'https://marketingchat.entab.net/',
        chatbotTitle: 'Campus Buddy',
        // Use an <img> for the button icon, make it circular, max fit, and add a black border
        buttonIcon: '<img src="https://media.istockphoto.com/id/2074604864/vector/chatbot-smiley-robot-face-icon-with-microphone-and-speech-bubble-vector-thin-line.jpg?s=612x612&w=0&k=20&c=MrqadmP-Eq3o7bXHN4WPbv1v8jrwOyS72O6fNcuNqZw=" alt="Chatbot" class="chatbot-btn-icon" />',
        position: 'bottom-right'
      };
      const styles = \`
        /* --- Chatbot Widget CSS: Always 70% of Viewport Height --- */
        .chatbot-container,
        .chatbot-widget,
        .chatbot-iframe {
          background: #fff !important;
          border: none !important;
          box-shadow: none !important;
        }
        .chatbot-container {
          position: fixed;
          z-index: 999999;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          bottom: 32px;
          right: 32px;
        }
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
        .chatbot-button {
          width: 70px;
          height: 70px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 30px;
          position: fixed;
          bottom: 32px;
          right: 32px;
          z-index: 1000000;
          transition: all 0.3s ease;
          padding: 0;
          overflow: hidden;
        }
        .chatbot-btn-icon {
          width: 90%;
          height: 90%;
          max-width: 60px;
          max-height: 60px;
          min-width: 0;
          min-height: 0;
          border-radius: 50%;
          border: 2px solid #000;
          object-fit: cover;
          background: #fff;
          display: block;
        }
        .chatbot-button:hover {
          transform: scale(1.1);
        }
        .chatbot-button.pulse {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { box-shadow: 0 4px 24px rgba(102, 126, 234, 0.4); }
          50% { box-shadow: 0 4px 24px rgba(102, 126, 234, 0.8); }
          100% { box-shadow: 0 4px 24px rgba(102, 126, 234, 0.4); }
        }
        .chatbot-widget {
          position: absolute;
          bottom: 0px;
          right: 0;
          width: 410px;
          height: 70vh;
          background: #fff !important;
          border-radius: 24px;
          display: none;
          flex-direction: column;
          overflow: hidden;
          animation: slideUp 0.3s ease;
          min-width: 320px;
          min-height: 280px;
          max-width: 98vw;
          max-height: 70vh;
        }
        .chatbot-widget.active {
          display: flex;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .chatbot-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 1rem 1.2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
        }
        .chatbot-title {
          font-weight: bold;
          font-size: 1.05rem;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .chatbot-header .chatbot-logo {
          width: 22px;
          height: 22px;
          margin-right: 0.3rem;
          border-radius: 50%;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
        }
        .chatbot-header .chatbot-logo img {
          width: 18px;
          height: 18px;
        }
        .chatbot-header .ai-badge {
          background: white;
          border: 1px solid #ccc;
          border-radius: 7px;
          color: #333;
          font-size: 10px;
          font-weight: bold;
          padding: 2px 6px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
          letter-spacing: 0.5px;
          margin-left: 0.3rem;
        }
        .chatbot-close {
          background: none;
          border: none;
          color: white;
          font-size: 1.2rem;
          cursor: pointer;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.3s ease;
        }
        .chatbot-close:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        .chatbot-iframe {
          flex: 1;
          border: none !important;
          width: 100%;
          background: #fff !important;
          margin: 0 !important;
          padding: 0 !important;
          min-height: 0;
          min-width: 0;
          max-width: 100vw;
          max-height: 70vh;
          height: 100%;
          display: block;
        }
        /* Responsive adjustments for tablets and laptops */
        @media (max-width: 1200px) {
          .chatbot-widget {
            width: 90vw;
            height: 70vh;
            right: 2vw;
            left: auto;
            max-height: 70vh;
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
            height: 70vh;
            right: 1vw;
            left: auto;
            max-height: 70vh;
          }
          .chatbot-container.bottom-left .chatbot-widget,
          .chatbot-container.top-left .chatbot-widget {
            left: 1vw;
            right: auto;
          }
        }
        /* Mobile: full width, 70% height, icon always bottom right */
        @media (max-width: 600px) {
          .chatbot-widget {
            width: 100vw;
            height: 70vh;
            right: 0;
            left: 0;
            border-radius: 0;
            min-width: 0;
            min-height: 0;
            max-width: 100vw;
            max-height: 70vh;
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
          }
          .chatbot-btn-icon {
            width: 88%;
            height: 88%;
            max-width: 48px;
            max-height: 48px;
          }
        }
      \`;
      const styleSheet = document.createElement('style');
      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);
      // Remove AI badge from button, add it to header
      const chatbotHTML = '<div class="chatbot-container ' + config.position + '"><button class="chatbot-button" id="chatbotToggle">' + config.buttonIcon + '</button><div class="chatbot-widget" id="chatbotWidget"><div class="chatbot-header"><div class="chatbot-title">' + config.chatbotTitle + '<span class="ai-badge">AI</span></div><button class="chatbot-close" id="chatbotClose">×</button></div><iframe class="chatbot-iframe" src="' + config.chatbotUrl + '" title="AI Chatbot" seamless></iframe></div></div>';
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

  // --- Workflow Builder API Routes ---
  // Get all workflows
  app.get('/api/workflows', async (req, res) => {
    try {
      const options: any = {};
      if (req.query.active === 'true') options.isActive = true;
      if (req.query.active === 'false') options.isActive = false;
      if (req.query.tags) options.tags = (req.query.tags as string).split(',');
      if (req.query.category) options.category = req.query.category as string;
      
      const workflows = await getAllWorkflows(options);
      res.json({ workflows });
    } catch (err) {
      res.status(500).json({
        error: 'Failed to fetch workflows',
        details: err instanceof Error ? err.message : String(err)
      });
    }
  });

  // Get a workflow by ID
  app.get('/api/workflows/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const workflow = await getWorkflowById(id);
      
      if (!workflow) {
        return res.status(404).json({ error: 'Workflow not found' });
      }
      
      res.json({ workflow });
    } catch (err) {
      res.status(500).json({
        error: 'Failed to fetch workflow',
        details: err instanceof Error ? err.message : String(err)
      });
    }
  });

  // Create a new workflow
  app.post('/api/workflows', async (req, res) => {
    try {
      const workflowData = req.body;
      if (!workflowData.name || !workflowData.nodes || !workflowData.startNode) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      const workflow = await createWorkflow(workflowData);
      res.status(201).json({ workflow });
    } catch (err) {
      res.status(500).json({
        error: 'Failed to create workflow',
        details: err instanceof Error ? err.message : String(err)
      });
    }
  });

  // Update a workflow
  app.put('/api/workflows/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const success = await updateWorkflow(id, updates);
      if (!success) {
        return res.status(404).json({ error: 'Workflow not found' });
      }
      
      const updatedWorkflow = await getWorkflowById(id);
      res.json({ workflow: updatedWorkflow });
    } catch (err) {
      res.status(500).json({
        error: 'Failed to update workflow',
        details: err instanceof Error ? err.message : String(err)
      });
    }
  });

  // Delete a workflow
  app.delete('/api/workflows/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const success = await deleteWorkflow(id);
      
      if (!success) {
        return res.status(404).json({ error: 'Workflow not found' });
      }
      
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({
        error: 'Failed to delete workflow',
        details: err instanceof Error ? err.message : String(err)
      });
    }
  });

  // Duplicate a workflow
  app.post('/api/workflows/:id/duplicate', async (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: 'New workflow name is required' });
      }
      
      const duplicatedWorkflow = await duplicateWorkflow(id, name);
      if (!duplicatedWorkflow) {
        return res.status(404).json({ error: 'Workflow not found' });
      }
      
      res.status(201).json({ workflow: duplicatedWorkflow });
    } catch (err) {
      res.status(500).json({
        error: 'Failed to duplicate workflow',
        details: err instanceof Error ? err.message : String(err)
      });
    }
  });

  // Get workflow templates
  app.get('/api/workflow-templates', async (req, res) => {
    try {
      const templates = await getWorkflowTemplates();
      res.json({ templates });
    } catch (err) {
      res.status(500).json({
        error: 'Failed to fetch workflow templates',
        details: err instanceof Error ? err.message : String(err)
      });
    }
  });

  // Validate a workflow
  app.post('/api/workflows/validate', async (req, res) => {
    try {
      const workflowData = req.body;
      if (!workflowData.nodes || !workflowData.startNode) {
        return res.status(400).json({ error: 'Invalid workflow data' });
      }
      
      const validation = await validateWorkflow(workflowData);
      res.json(validation);
    } catch (err) {
      res.status(500).json({
        error: 'Failed to validate workflow',
        details: err instanceof Error ? err.message : String(err)
      });
    }
  });

  // Test a workflow
  app.post('/api/workflows/:id/test', async (req, res) => {
    try {
      const { id } = req.params;
      const testInput = req.body;
      
      const testResult = await testWorkflow(id, testInput);
      res.json(testResult);
    } catch (err) {
      res.status(500).json({
        error: 'Failed to test workflow',
        details: err instanceof Error ? err.message : String(err)
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
