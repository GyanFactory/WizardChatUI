import { 
  type ChatbotConfig, 
  type InsertChatbotConfig,
  type Document,
  type InsertDocument,
  type QAItem,
  type InsertQAItem,
  users,
  documents,
  qaItems,
  chatbotConfig,
} from "@shared/schema";
import { type User, type InsertUser } from "@shared/schema";
import { eq } from "drizzle-orm";
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Client } = pkg;
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

// Connect with error handling and logging
client.connect().then(() => {
  console.log('Successfully connected to PostgreSQL database');
}).catch(err => {
  console.error('Failed to connect to PostgreSQL database:', err);
  process.exit(1); // Exit if we can't connect to the database
});

const db = drizzle(client);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser & { verificationToken: string }): Promise<User>;
  verifyUser(userId: number): Promise<User>;
  updateUserPassword(userId: number, newPassword: string): Promise<User>;
  clearUsers(): Promise<void>;

  // ChatbotConfig operations
  getChatbotConfig(id: number): Promise<ChatbotConfig | undefined>;
  getChatbotConfigsByUser(userId: number): Promise<ChatbotConfig[]>;
  createChatbotConfig(config: InsertChatbotConfig): Promise<ChatbotConfig>;
  updateChatbotConfig(id: number, config: Partial<InsertChatbotConfig>): Promise<ChatbotConfig | null>;

  // Document operations
  getDocument(id: number): Promise<Document | undefined>;
  createDocument(doc: InsertDocument): Promise<Document>;
  updateDocumentEmbeddings(id: number, embeddings: number[][]): Promise<Document>;

  // QA operations
  getQAItems(configId: number): Promise<QAItem[]>;
  getQAItemsByDocument(documentId: number): Promise<QAItem[]>;
  createQAItem(item: InsertQAItem): Promise<QAItem>;
  createQAItems(items: InsertQAItem[]): Promise<QAItem[]>;
  updateQAItem(id: number, item: Partial<InsertQAItem>): Promise<QAItem>;
  deleteQAItem(id: number): Promise<void>;

  // Session store
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  readonly sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    console.log('Getting user by ID:', id);
    try {
      const results = await db.select().from(users).where(eq(users.id, id));
      const user = results[0];
      console.log('Found user:', user ? 'yes' : 'no');
      return user;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const normalizedEmail = email.toLowerCase().trim();
    console.log('Getting user by email:', normalizedEmail);
    try {
      const results = await db.select().from(users).where(eq(users.email, normalizedEmail));
      const user = results[0];
      console.log('Found user:', user ? 'yes' : 'no');
      return user;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    console.log('Getting user by verification token:', token);
    try {
      const results = await db.select().from(users).where(eq(users.verificationToken, token));
      const user = results[0];
      console.log('Found user:', user ? 'yes' : 'no');
      return user;
    } catch (error) {
      console.error('Error getting user by verification token:', error);
      throw error;
    }
  }

  async createUser(insertUser: InsertUser & { verificationToken: string }): Promise<User> {
    console.log('Creating user with email:', insertUser.email);
    try {
      const results = await db.insert(users).values({
        email: insertUser.email.toLowerCase().trim(),
        password: insertUser.password,
        verificationToken: insertUser.verificationToken,
        isVerified: false,
        createdAt: new Date(),
      }).returning();

      const user = results[0];
      console.log('Created user:', user);
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async verifyUser(userId: number): Promise<User> {
    console.log('Verifying user:', userId);
    try {
      const results = await db
        .update(users)
        .set({ isVerified: true, verificationToken: null })
        .where(eq(users.id, userId))
        .returning();

      const user = results[0];
      console.log('User verified:', user);
      return user;
    } catch (error) {
      console.error('Error verifying user:', error);
      throw error;
    }
  }

  async updateUserPassword(userId: number, newPassword: string): Promise<User> {
    try {
      const results = await db
        .update(users)
        .set({ password: newPassword })
        .where(eq(users.id, userId))
        .returning();
      return results[0];
    } catch (error) {
      console.error('Error updating user password:', error);
      throw error;
    }
  }

  async clearUsers(): Promise<void> {
    console.log('Clearing all users from storage');
    try {
      await db.delete(users);
    } catch (error) {
      console.error('Error clearing users:', error);
      throw error;
    }
  }

  // Document operations
  async getDocument(id: number): Promise<Document | undefined> {
    try {
      const results = await db.select().from(documents).where(eq(documents.id, id));
      return results[0];
    } catch (error) {
      console.error('Error getting document:', error);
      throw error;
    }
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    try {
      console.log('Creating document:', doc);
      const results = await db.insert(documents).values(doc).returning();
      const document = results[0];
      console.log('Created document:', document);
      return document;
    } catch (error) {
      console.error('Error creating document:', error);
      throw error;
    }
  }

  async updateDocumentEmbeddings(id: number, embeddings: number[][]): Promise<Document> {
    try {
      const results = await db
        .update(documents)
        .set({ embeddings })
        .where(eq(documents.id, id))
        .returning();
      return results[0];
    } catch (error) {
      console.error('Error updating document embeddings:', error);
      throw error;
    }
  }

  // QA operations
  async getQAItems(configId: number): Promise<QAItem[]> {
    try {
      return await db.select().from(qaItems).where(eq(qaItems.configId, configId));
    } catch (error) {
      console.error('Error getting QA items:', error);
      throw error;
    }
  }

  async getQAItemsByDocument(documentId: number): Promise<QAItem[]> {
    try {
      return await db.select().from(qaItems).where(eq(qaItems.documentId, documentId));
    } catch (error) {
      console.error('Error getting QA items by document:', error);
      throw error;
    }
  }

  async createQAItem(item: InsertQAItem): Promise<QAItem> {
    try {
      const results = await db.insert(qaItems).values(item).returning();
      return results[0];
    } catch (error) {
      console.error('Error creating QA item:', error);
      throw error;
    }
  }

  async createQAItems(items: InsertQAItem[]): Promise<QAItem[]> {
    try {
      console.log('Creating QA items:', items.length);
      const results = await db.insert(qaItems).values(items).returning();
      console.log('Created QA items:', results.length);
      return results;
    } catch (error) {
      console.error('Error creating QA items:', error);
      throw error;
    }
  }

  async updateQAItem(id: number, item: Partial<InsertQAItem>): Promise<QAItem> {
    try {
      const results = await db
        .update(qaItems)
        .set(item)
        .where(eq(qaItems.id, id))
        .returning();
      return results[0];
    } catch (error) {
      console.error('Error updating QA item:', error);
      throw error;
    }
  }

  async deleteQAItem(id: number): Promise<void> {
    try {
      await db.delete(qaItems).where(eq(qaItems.id, id));
    } catch (error) {
      console.error('Error deleting QA item:', error);
      throw error;
    }
  }

  // Chatbot config operations
  async getChatbotConfig(id: number): Promise<ChatbotConfig | undefined> {
    try {
      const results = await db.select().from(chatbotConfig).where(eq(chatbotConfig.id, id));
      return results[0];
    } catch (error) {
      console.error('Error getting chatbot config:', error);
      throw error;
    }
  }

  async getChatbotConfigsByUser(userId: number): Promise<ChatbotConfig[]> {
    try {
      return await db.select().from(chatbotConfig).where(eq(chatbotConfig.userId, userId));
    } catch (error) {
      console.error('Error getting chatbot configs:', error);
      throw error;
    }
  }

  async createChatbotConfig(config: InsertChatbotConfig): Promise<ChatbotConfig> {
    try {
      const results = await db.insert(chatbotConfig).values(config).returning();
      return results[0];
    } catch (error) {
      console.error('Error creating chatbot config:', error);
      throw error;
    }
  }

  async updateChatbotConfig(id: number, config: Partial<InsertChatbotConfig>): Promise<ChatbotConfig | null> {
    try {
      const results = await db
        .update(chatbotConfig)
        .set(config)
        .where(eq(chatbotConfig.id, id))
        .returning();
      return results[0] || null;
    } catch (error) {
      console.error('Error updating chatbot config:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();