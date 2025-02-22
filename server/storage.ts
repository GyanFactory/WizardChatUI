import { 
  type User, type InsertUser,
  type Project, type InsertProject,
  type Document, type InsertDocument,
  type QAItem, type InsertQAItem,
  users, projects, documents, qaItems,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

// Create a connection pool with optimized settings
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // Reduced from 20 to prevent too many connections
  idleTimeoutMillis: 60000, // Increased idle timeout
  connectionTimeoutMillis: 5000, // Increased connection timeout
  allowExitOnIdle: true
});

// Add error handling for the pool
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  if (err.message.includes('Connection terminated')) {
    console.log('Attempting to reconnect...');
    client.release(true); // Force release with error
  }
});

// Initialize drizzle with the pool
const db = drizzle(pool);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser & { verificationToken: string }): Promise<User>;
  verifyUser(userId: number): Promise<User>;
  updateUserPassword(userId: number, newPassword: string): Promise<User>;
  clearUsers(): Promise<void>;

  // Project operations
  getProject(id: number): Promise<Project | undefined>;
  getProjectsByUser(userId: number): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project>;
  updateProjectStatus(id: number, status: string): Promise<Project>;

  // Document operations
  getDocument(id: number): Promise<Document | undefined>;
  getDocumentsByProject(projectId: number): Promise<Document[]>;
  createDocument(doc: InsertDocument): Promise<Document>;
  updateDocumentEmbeddings(id: number, embeddings: number[][]): Promise<Document>;
  updateDocumentStatus(id: number, status: string): Promise<Document>;

  // QA operations
  getQAItems(projectId: number): Promise<QAItem[]>;
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
      pool,
      createTableIfMissing: true,
      pruneSessionInterval: 60, // Prune invalid sessions every minute
      errorLog: (err) => console.error('Session store error:', err),
      // Add retry options
      retries: 3,
      minTimeout: 100,
      maxTimeout: 1000
    });

    // Monitor session store errors
    this.sessionStore.on('error', (error) => {
      console.error('Session store error:', error);
    });
  }

  // Add private helper method for error handling with improved retry logic
  private async executeWithRetry<T>(operation: () => Promise<T>, retries = 3): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        console.error(`Database operation attempt ${attempt} failed:`, error.message);

        // Check if it's a connection error that we should retry
        if (
          (error.code === '57P01' || // Termination error code
           error.code === '08006' || // Connection failure
           error.code === '08001' || // Unable to establish connection
           error.message.includes('Connection terminated')) &&
          attempt < retries
        ) {
          const delay = Math.min(100 * Math.pow(2, attempt), 1000); // Exponential backoff
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
    throw new Error('Max retries reached');
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.executeWithRetry(async () => {
      const results = await db.select().from(users).where(eq(users.id, id));
      return results[0];
    });
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const normalizedEmail = email.toLowerCase().trim();
    return this.executeWithRetry(async () => {
      const results = await db.select().from(users).where(eq(users.email, normalizedEmail));
      return results[0];
    });
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    return this.executeWithRetry(async () => {
      const results = await db.select().from(users).where(eq(users.verificationToken, token));
      return results[0];
    });
  }

  async createUser(insertUser: InsertUser & { verificationToken: string }): Promise<User> {
    return this.executeWithRetry(async () => {
      const results = await db.insert(users).values({
        email: insertUser.email.toLowerCase().trim(),
        password: insertUser.password,
        verificationToken: insertUser.verificationToken,
        isVerified: false,
        createdAt: new Date(),
      }).returning();
      return results[0];
    });
  }

  async verifyUser(userId: number): Promise<User> {
    return this.executeWithRetry(async () => {
      const results = await db
        .update(users)
        .set({ isVerified: true, verificationToken: null })
        .where(eq(users.id, userId))
        .returning();
      return results[0];
    });
  }

  async updateUserPassword(userId: number, newPassword: string): Promise<User> {
    return this.executeWithRetry(async () => {
      const results = await db
        .update(users)
        .set({ password: newPassword })
        .where(eq(users.id, userId))
        .returning();
      return results[0];
    });
  }

  async clearUsers(): Promise<void> {
    return this.executeWithRetry(async () => {
      await db.delete(users);
    });
  }

  async getProject(id: number): Promise<Project | undefined> {
    return this.executeWithRetry(async () => {
      const results = await db.select().from(projects).where(eq(projects.id, id));
      return results[0];
    });
  }

  async getProjectsByUser(userId: number): Promise<Project[]> {
    return this.executeWithRetry(async () => {
      return await db.select().from(projects).where(eq(projects.userId, userId));
    });
  }

  async createProject(project: InsertProject): Promise<Project> {
    return this.executeWithRetry(async () => {
      const results = await db.insert(projects).values({
        ...project,
        status: 'pending',
        createdAt: new Date(),
      }).returning();
      return results[0];
    });
  }

  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project> {
    return this.executeWithRetry(async () => {
      const results = await db
        .update(projects)
        .set(project)
        .where(eq(projects.id, id))
        .returning();
      return results[0];
    });
  }

  async updateProjectStatus(id: number, status: string): Promise<Project> {
    return this.executeWithRetry(async () => {
      const results = await db
        .update(projects)
        .set({ status })
        .where(eq(projects.id, id))
        .returning();
      return results[0];
    });
  }

  async getDocument(id: number): Promise<Document | undefined> {
    return this.executeWithRetry(async () => {
      const results = await db.select().from(documents).where(eq(documents.id, id));
      return results[0];
    });
  }

  async getDocumentsByProject(projectId: number): Promise<Document[]> {
    return this.executeWithRetry(async () => {
      return await db.select().from(documents).where(eq(documents.projectId, projectId));
    });
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    return this.executeWithRetry(async () => {
      const results = await db.insert(documents).values({
        ...doc,
        processingStatus: 'pending',
        createdAt: new Date(),
      }).returning();
      return results[0];
    });
  }

  async updateDocumentEmbeddings(id: number, embeddings: number[][]): Promise<Document> {
    return this.executeWithRetry(async () => {
      const results = await db
        .update(documents)
        .set({ 
          embeddings,
          processingStatus: 'completed'
        })
        .where(eq(documents.id, id))
        .returning();
      return results[0];
    });
  }

  async updateDocumentStatus(id: number, status: string): Promise<Document> {
    return this.executeWithRetry(async () => {
      const results = await db
        .update(documents)
        .set({ processingStatus: status })
        .where(eq(documents.id, id))
        .returning();
      return results[0];
    });
  }

  async getQAItems(projectId: number): Promise<QAItem[]> {
    return this.executeWithRetry(async () => {
      return await db.select().from(qaItems).where(eq(qaItems.projectId, projectId));
    });
  }

  async getQAItemsByDocument(documentId: number): Promise<QAItem[]> {
    return this.executeWithRetry(async () => {
      return await db.select().from(qaItems).where(eq(qaItems.documentId, documentId));
    });
  }

  async createQAItem(item: InsertQAItem): Promise<QAItem> {
    return this.executeWithRetry(async () => {
      const results = await db.insert(qaItems).values(item).returning();
      return results[0];
    });
  }

  async createQAItems(items: InsertQAItem[]): Promise<QAItem[]> {
    return this.executeWithRetry(async () => {
      const results = await db.insert(qaItems).values(items).returning();
      return results;
    });
  }

  async updateQAItem(id: number, item: Partial<InsertQAItem>): Promise<QAItem> {
    return this.executeWithRetry(async () => {
      const results = await db
        .update(qaItems)
        .set(item)
        .where(eq(qaItems.id, id))
        .returning();
      return results[0];
    });
  }

  async deleteQAItem(id: number): Promise<void> {
    return this.executeWithRetry(async () => {
      await db.delete(qaItems).where(eq(qaItems.id, id));
    });
  }
}

export const storage = new DatabaseStorage();