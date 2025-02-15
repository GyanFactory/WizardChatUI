import { 
  type ChatbotConfig, 
  type InsertChatbotConfig,
  type Document,
  type InsertDocument,
  type QAItem,
  type InsertQAItem
} from "@shared/schema";
import { users, type User, type InsertUser } from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // ChatbotConfig operations
  getChatbotConfig(id: number): Promise<ChatbotConfig | undefined>;
  createChatbotConfig(config: InsertChatbotConfig): Promise<ChatbotConfig>;

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

  constructor() {
    this.users = new Map();
    this.configs = new Map();
    this.documents = new Map();
    this.qaItems = new Map();
    this.currentId = 1;
    this.currentConfigId = 1;
    this.currentDocId = 1;
    this.currentQAId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
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