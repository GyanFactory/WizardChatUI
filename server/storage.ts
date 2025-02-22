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

// Create a connection pool instead of a single client
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait before timing out when connecting a new client
});

// Add error handling for the pool
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  // Don't exit the process on connection errors
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
      pool: pool, // Use the pool for session store
      createTableIfMissing: true,
    });
  }

  // Add private helper method for error handling
  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      if (error.code === '57P01') { // Termination error code
        console.warn('Database connection terminated, retrying operation...');
        // Small delay before retry
        await new Promise(resolve => setTimeout(resolve, 100));
        return await operation();
      }
      throw error;
    }
  }

  // Update all methods to use executeWithRetry
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

  // Project operations with retry logic
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

  // Document operations with retry logic
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

  // QA operations with retry logic
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