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
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      createTableIfMissing: true,
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    try {
      const results = await db.select().from(users).where(eq(users.id, id));
      return results[0];
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const normalizedEmail = email.toLowerCase().trim();
    try {
      const results = await db.select().from(users).where(eq(users.email, normalizedEmail));
      return results[0];
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    try {
      const results = await db.select().from(users).where(eq(users.verificationToken, token));
      return results[0];
    } catch (error) {
      console.error('Error getting user by verification token:', error);
      throw error;
    }
  }

  async createUser(insertUser: InsertUser & { verificationToken: string }): Promise<User> {
    try {
      const results = await db.insert(users).values({
        email: insertUser.email.toLowerCase().trim(),
        password: insertUser.password,
        verificationToken: insertUser.verificationToken,
        isVerified: false,
        createdAt: new Date(),
      }).returning();
      return results[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async verifyUser(userId: number): Promise<User> {
    try {
      const results = await db
        .update(users)
        .set({ isVerified: true, verificationToken: null })
        .where(eq(users.id, userId))
        .returning();
      return results[0];
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
    try {
      await db.delete(users);
    } catch (error) {
      console.error('Error clearing users:', error);
      throw error;
    }
  }

  // Project operations
  async getProject(id: number): Promise<Project | undefined> {
    try {
      const results = await db.select().from(projects).where(eq(projects.id, id));
      return results[0];
    } catch (error) {
      console.error('Error getting project:', error);
      throw error;
    }
  }

  async getProjectsByUser(userId: number): Promise<Project[]> {
    try {
      return await db.select().from(projects).where(eq(projects.userId, userId));
    } catch (error) {
      console.error('Error getting projects by user:', error);
      throw error;
    }
  }

  async createProject(project: InsertProject): Promise<Project> {
    try {
      const results = await db.insert(projects).values({
        ...project,
        status: 'pending',
        createdAt: new Date(),
      }).returning();
      return results[0];
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project> {
    try {
      const results = await db
        .update(projects)
        .set(project)
        .where(eq(projects.id, id))
        .returning();
      return results[0];
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  async updateProjectStatus(id: number, status: string): Promise<Project> {
    try {
      const results = await db
        .update(projects)
        .set({ status })
        .where(eq(projects.id, id))
        .returning();
      return results[0];
    } catch (error) {
      console.error('Error updating project status:', error);
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

  async getDocumentsByProject(projectId: number): Promise<Document[]> {
    try {
      return await db.select().from(documents).where(eq(documents.projectId, projectId));
    } catch (error) {
      console.error('Error getting documents by project:', error);
      throw error;
    }
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    try {
      const results = await db.insert(documents).values({
        ...doc,
        processingStatus: 'pending',
        createdAt: new Date(),
      }).returning();
      return results[0];
    } catch (error) {
      console.error('Error creating document:', error);
      throw error;
    }
  }

  async updateDocumentEmbeddings(id: number, embeddings: number[][]): Promise<Document> {
    try {
      const results = await db
        .update(documents)
        .set({ 
          embeddings,
          processingStatus: 'completed'
        })
        .where(eq(documents.id, id))
        .returning();
      return results[0];
    } catch (error) {
      console.error('Error updating document embeddings:', error);
      throw error;
    }
  }

  async updateDocumentStatus(id: number, status: string): Promise<Document> {
    try {
      const results = await db
        .update(documents)
        .set({ processingStatus: status })
        .where(eq(documents.id, id))
        .returning();
      return results[0];
    } catch (error) {
      console.error('Error updating document status:', error);
      throw error;
    }
  }

  // QA operations
  async getQAItems(projectId: number): Promise<QAItem[]> {
    try {
      return await db.select().from(qaItems).where(eq(qaItems.projectId, projectId));
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
      const results = await db.insert(qaItems).values(items).returning();
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
}

export const storage = new DatabaseStorage();