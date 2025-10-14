import { MongoClient, Db, Collection } from 'mongodb';

const mongoUrl = process.env.MONGO_URL;
const dbName = 'test';

class DatabaseService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private isConnecting = false;

  async getDb(): Promise<Db> {
    await this.connect();
    if (!this.db) {
      throw new Error('Database connection not established');
    }
    return this.db;
  }

  async connect(): Promise<void> {
    if (this.client && this.db) return;
    
    if (this.isConnecting) {
      // Wait for existing connection attempt
      while (this.isConnecting) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    try {
      this.isConnecting = true;
      if (!mongoUrl) {
        throw new Error('MONGO_URL environment variable is not set');
      }
      
      this.client = new MongoClient(mongoUrl);
      await this.client.connect();
      this.db = this.client.db(dbName);
      
      console.log(`Connected to MongoDB database: ${dbName}`);
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      console.log('Disconnected from MongoDB');
    }
  }

  async getDatabase(): Promise<Db> {
    if (!this.db) {
      await this.connect();
    }
    return this.db!;
  }

  async getCollection(collectionName: string): Promise<Collection> {
    const db = await this.getDatabase();
    return db.collection(collectionName);
  }

  // Convenience methods for common collections
  async getChatCollection(): Promise<Collection> {
    return this.getCollection('MChat');
  }

  async getKnowledgeBaseCollection(): Promise<Collection> {
    return this.getCollection('MKB');
  }

  async getWorkflowCollection(): Promise<Collection> {
    return this.getCollection('Workflows');
  }

  async getUserCollection(): Promise<Collection> {
    return this.getCollection('Users');
  }

  async getSessionCollection(): Promise<Collection> {
    return this.getCollection('Sessions');
  }

  // Health check method
  async isHealthy(): Promise<boolean> {
    try {
      const db = await this.getDatabase();
      await db.admin().ping();
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
}

// Create singleton instance
const databaseService = new DatabaseService();

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('Received SIGINT, closing database connection...');
  await databaseService.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, closing database connection...');
  await databaseService.disconnect();
  process.exit(0);
});

export default databaseService;
