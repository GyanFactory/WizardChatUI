import { 
  type ChatbotConfig, 
  type InsertChatbotConfig,
  type Document,
  type InsertDocument,
  type QAItem,
  type InsertQAItem
} from "@shared/schema";
import { users, type User, type InsertUser } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import createMemoryStore from "memorystore";
import session from "express-session";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser & { verificationToken: string }): Promise<User>;
  verifyUser(userId: number): Promise<User>;

  // ChatbotConfig operations
  getChatbotConfig(id: number): Promise<ChatbotConfig | undefined>;
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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private configs: Map<number, ChatbotConfig>;
  private documents: Map<number, Document>;
  private qaItems: Map<number, QAItem>;
  private currentId: number;
  private currentConfigId: number;
  private currentDocId: number;
  private currentQAId: number;
  readonly sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.configs = new Map();
    this.documents = new Map();
    this.qaItems = new Map();
    this.currentId = 1;
    this.currentConfigId = 1;
    this.currentDocId = 1;
    this.currentQAId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.verificationToken === token,
    );
  }

  async createUser(insertUser: InsertUser & { verificationToken: string }): Promise<User> {
    const id = this.currentId++;
    const user: User = {
      id,
      email: insertUser.email,
      password: insertUser.password,
      verificationToken: insertUser.verificationToken,
      isVerified: false,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async verifyUser(userId: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');

    const verifiedUser = {
      ...user,
      isVerified: true,
      verificationToken: null,
    };
    this.users.set(userId, verifiedUser);
    return verifiedUser;
  }

  async getChatbotConfig(id: number): Promise<ChatbotConfig | undefined> {
    return this.configs.get(id);
  }

  async createChatbotConfig(config: InsertChatbotConfig): Promise<ChatbotConfig> {
    const id = this.currentConfigId++;
    const newConfig = { ...config, id };
    this.configs.set(id, newConfig);
    return newConfig;
  }

  async updateChatbotConfig(id: number, config: Partial<InsertChatbotConfig>): Promise<ChatbotConfig | null> {
    const existingConfig = this.configs.get(id);
    if (!existingConfig) return null;
    const updatedConfig = { ...existingConfig, ...config };
    this.configs.set(id, updatedConfig);
    return updatedConfig;
  }

  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const id = this.currentDocId++;
    const newDoc = { ...doc, id, embeddings: null };
    this.documents.set(id, newDoc);
    return newDoc;
  }

  async updateDocumentEmbeddings(id: number, embeddings: number[][]): Promise<Document> {
    const doc = await this.getDocument(id);
    if (!doc) throw new Error('Document not found');

    const updatedDoc = { ...doc, embeddings };
    this.documents.set(id, updatedDoc);
    return updatedDoc;
  }

  async getQAItems(configId: number): Promise<QAItem[]> {
    return Array.from(this.qaItems.values()).filter(
      (item) => item.configId === configId
    );
  }

  async getQAItemsByDocument(documentId: number): Promise<QAItem[]> {
    return Array.from(this.qaItems.values()).filter(
      (item) => item.documentId === documentId
    );
  }

  async createQAItem(item: InsertQAItem): Promise<QAItem> {
    const id = this.currentQAId++;
    const newItem = { ...item, id };
    this.qaItems.set(id, newItem);
    return newItem;
  }

  async createQAItems(items: InsertQAItem[]): Promise<QAItem[]> {
    return Promise.all(items.map(item => this.createQAItem(item)));
  }

  async updateQAItem(id: number, item: Partial<InsertQAItem>): Promise<QAItem> {
    const existingItem = this.qaItems.get(id);
    if (!existingItem) throw new Error('QA item not found');

    const updatedItem = { ...existingItem, ...item };
    this.qaItems.set(id, updatedItem);
    return updatedItem;
  }

  async deleteQAItem(id: number): Promise<void> {
    this.qaItems.delete(id);
  }
}

export const storage = new MemStorage();