import { GoogleGenerativeAI } from "@google/generative-ai";
import { MongoClient } from "mongodb";


const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || ""
);
const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });

// Helper to fetch company context from MKB collection
async function fetchCompanyContextFromMKB() {
  const mongoUrl = process.env.MONGO_URL;
  const dbName = 'test';
  const mkbCollectionName = 'MKB';
  const client = new MongoClient(mongoUrl!);
  await client.connect();
  const col = client.db(dbName).collection(mkbCollectionName);
  const doc = await col.findOne({});
  await client.close();
  if (!doc) return {};
  const { _id, ...fields } = doc;
  return fields;
}

export async function generateResponse(userMessage: string, sessionId?: string): Promise<string> {
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
    return "I apologize, I m facing some issues, please contact at support@entab.org";
  }
}
