import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  verificationToken: text("verification_token"),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  status: text("status").notNull().default('pending'),
  name: text("name").notNull(),
  companyName: text("company_name").notNull(),
  welcomeMessage: text("welcome_message").notNull(),
  primaryColor: text("primary_color").notNull().default('#000000'),
  fontFamily: text("font_family").notNull().default('Arial'),
  position: text("position").notNull().default('bottom-right'),
  avatarUrl: text("avatar_url"),
  bubbleStyle: text("bubble_style").notNull().default('modern'),
  backgroundColor: text("background_color").notNull().default('#ffffff'),
  buttonStyle: text("button_style").notNull().default('rounded'),
  createdAt: timestamp("created_at").defaultNow(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  filename: text("filename").notNull(),
  content: text("content").notNull(),
  embeddings: jsonb("embeddings").$type<number[][]>(),
  processingStatus: text("processing_status").notNull().default('pending'),
  createdAt: timestamp("created_at").defaultNow(),
});

export const qaItems = pgTable("qa_items", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  isGenerated: boolean("is_generated").default(true),
  embeddings: jsonb("embeddings").$type<number[]>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  documents: many(documents),
  qaItems: many(qaItems),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  project: one(projects, {
    fields: [documents.projectId],
    references: [projects.id],
  }),
  qaItems: many(qaItems),
}));

export const qaItemsRelations = relations(qaItems, ({ one }) => ({
  project: one(projects, {
    fields: [qaItems.projectId],
    references: [projects.id],
  }),
  document: one(documents, {
    fields: [qaItems.documentId],
    references: [documents.id],
  }),
}));

// Schemas for inserting data
export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true,
  isVerified: true,
  verificationToken: true,
  createdAt: true,
}).extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Invalid email address"),
});

export const insertProjectSchema = createInsertSchema(projects).omit({ 
  id: true,
  createdAt: true,
  status: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({ 
  id: true,
  embeddings: true,
  processingStatus: true,
  createdAt: true,
});

export const insertQAItemSchema = createInsertSchema(qaItems).omit({ 
  id: true,
  embeddings: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type InsertQAItem = z.infer<typeof insertQAItemSchema>;
export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type QAItem = typeof qaItems.$inferSelect;