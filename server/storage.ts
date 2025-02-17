import { 
  type ChatbotConfig, 
  type InsertChatbotConfig,
  type Document,
  type InsertDocument,
  type QAItem,
  type InsertQAItem,
  users,
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

  // Implement other required methods...
  async getChatbotConfig(id: number): Promise<ChatbotConfig | undefined> {
    return undefined;
  }

  async getChatbotConfigsByUser(userId: number): Promise<ChatbotConfig[]> {
    return [];
  }

  async createChatbotConfig(config: InsertChatbotConfig): Promise<ChatbotConfig> {
    throw new Error("Not implemented");
  }

  async updateChatbotConfig(id: number, config: Partial<InsertChatbotConfig>): Promise<ChatbotConfig | null> {
    return null;
  }

  async getDocument(id: number): Promise<Document | undefined> {
    return undefined;
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    throw new Error("Not implemented");
  }

  async updateDocumentEmbeddings(id: number, embeddings: number[][]): Promise<Document> {
    throw new Error("Not implemented");
  }

  async getQAItems(configId: number): Promise<QAItem[]> {
    return [];
  }

  async getQAItemsByDocument(documentId: number): Promise<QAItem[]> {
    return [];
  }

  async createQAItem(item: InsertQAItem): Promise<QAItem> {
    throw new Error("Not implemented");
  }

  async createQAItems(items: InsertQAItem[]): Promise<QAItem[]> {
    throw new Error("Not implemented");
  }

  async updateQAItem(id: number, item: Partial<InsertQAItem>): Promise<QAItem> {
    throw new Error("Not implemented");
  }

  async deleteQAItem(id: number): Promise<void> {
  }
}

export const storage = new DatabaseStorage();