import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const chatbotConfig = pgTable("chatbot_config", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  welcomeMessage: text("welcome_message").notNull(),
  primaryColor: text("primary_color").notNull(),
  fontFamily: text("font_family").notNull(),
  position: text("position").notNull(),
  avatarUrl: text("avatar_url"),
  bubbleStyle: text("bubble_style").notNull(),
  backgroundColor: text("background_color").notNull(),
  buttonStyle: text("button_style").notNull(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  configId: integer("config_id").references(() => chatbotConfig.id),
  filename: text("filename").notNull(),
  content: text("content").notNull(),
  embeddings: jsonb("embeddings").$type<number[][]>(),
  createdAt: text("created_at").notNull(),
});

export const qaItems = pgTable("qa_items", {
  id: serial("id").primaryKey(),
  configId: integer("config_id").references(() => chatbotConfig.id),
  documentId: integer("document_id").references(() => documents.id),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  isGenerated: boolean("is_generated").default(true),
});

export const insertChatbotConfigSchema = createInsertSchema(chatbotConfig).omit({ 
  id: true 
});

export const insertDocumentSchema = createInsertSchema(documents).omit({ 
  id: true,
  embeddings: true 
});

export const insertQAItemSchema = createInsertSchema(qaItems).omit({ 
  id: true 
});

export type InsertChatbotConfig = z.infer<typeof insertChatbotConfigSchema>;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type InsertQAItem = z.infer<typeof insertQAItemSchema>;
export type ChatbotConfig = typeof chatbotConfig.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type QAItem = typeof qaItems.$inferSelect;