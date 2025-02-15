import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

// Configure multer for file upload
const upload = multer({
  dest: "uploads/",
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      cb(new Error("Only PDF files are allowed"));
      return;
    }
    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Upload PDF and generate Q&A pairs
  app.post("/api/documents/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        throw new Error("No file uploaded");
      }

      // Store document in storage
      const doc = await storage.createDocument({
        configId: 1, // TODO: Get from session
        filename: req.file.originalname,
        content: "", // Will be updated after processing
        createdAt: new Date().toISOString(),
      });

      // Process PDF with Python service
      const pythonProcess = spawn("python", [
        "server/services/pdf_processor.py",
        req.file.path,
        doc.id.toString(),
      ]);

      let qaData = "";
      pythonProcess.stdout.on("data", (data) => {
        qaData += data.toString();
      });

      pythonProcess.stderr.on("data", (data) => {
        console.error(`Python Error: ${data}`);
      });

      pythonProcess.on("close", async (code) => {
        if (code !== 0) {
          res.status(500).json({ error: "Failed to process PDF" });
          return;
        }

        try {
          const qaItems = JSON.parse(qaData);

          // Store Q&A pairs
          const storedItems = await storage.createQAItems(
            qaItems.map((item: any) => ({
              configId: 1, // TODO: Get from session
              documentId: doc.id,
              question: item.question,
              answer: item.answer,
              isGenerated: true,
            }))
          );

          // Cleanup uploaded file
          fs.unlinkSync(req.file!.path);

          res.json({ 
            document: doc,
            qaItems: storedItems 
          });
        } catch (err) {
          console.error("Failed to process QA items:", err);
          res.status(500).json({ error: "Failed to process QA items" });
        }
      });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // Get Q&A items for a chatbot config
  app.get("/api/qa-items", async (req, res) => {
    try {
      const configId = 1; // TODO: Get from session
      const items = await storage.getQAItems(configId);
      res.json(items);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch QA items" });
    }
  });

  // Update a Q&A item
  app.patch("/api/qa-items/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { question, answer } = req.body;

      const updated = await storage.updateQAItem(parseInt(id), {
        question,
        answer,
      });

      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: "Failed to update QA item" });
    }
  });

  // Delete a Q&A item
  app.delete("/api/qa-items/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteQAItem(parseInt(id));
      res.status(204).end();
    } catch (err) {
      res.status(500).json({ error: "Failed to delete QA item" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}