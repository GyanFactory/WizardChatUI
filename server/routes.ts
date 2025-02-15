import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

// Ensure uploads directory exists
const uploadsDir = "uploads";
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure multer for file upload
const upload = multer({
  dest: uploadsDir,
  fileFilter: (_req, file, cb) => {
    console.log("Received file:", file.originalname, "type:", file.mimetype);
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
      console.log("Processing upload request", { body: req.body, file: req.file });

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

      console.log("Created document:", doc);

      // Process PDF with Python service
      const pythonProcess = spawn("python", [
        path.join(process.cwd(), "server/services/pdf_processor.py"),
        req.file.path,
      ]);

      let qaData = "";
      let errorData = "";

      pythonProcess.stdout.on("data", (data) => {
        qaData += data.toString();
      });

      pythonProcess.stderr.on("data", (data) => {
        errorData += data.toString();
        console.error(`Python Error: ${data}`);
      });

      pythonProcess.on("close", async (code) => {
        if (code !== 0) {
          console.error("PDF processing failed:", errorData);
          res.status(500).json({
            error: "Failed to process PDF",
            details: errorData,
          });
          return;
        }

        try {
          console.log("Raw QA data:", qaData);
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

          console.log(`Generated ${storedItems.length} QA pairs`);

          // Cleanup uploaded file
          fs.unlinkSync(req.file!.path);

          res.json({
            document: doc,
            qaItems: storedItems,
          });
        } catch (err) {
          console.error("Failed to process QA items:", err);
          res.status(500).json({ error: "Failed to process QA items" });
        }
      });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({
        error: "Failed to upload file",
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // Get Q&A items for a chatbot config
  app.get("/api/qa-items", async (req, res) => {
    try {
      const configId = 1; // TODO: Get from session
      const items = await storage.getQAItems(configId);
      res.json(items);
    } catch (err) {
      console.error("Failed to fetch QA items:", err);
      res.status(500).json({ error: "Failed to fetch QA items" });
    }
  });

  // Create new Q&A item
  app.post("/api/qa-items", async (req, res) => {
    try {
      const { question, answer } = req.body;

      if (!question || !answer) {
        res.status(400).json({ error: "Question and answer are required" });
        return;
      }

      const item = await storage.createQAItem({
        configId: 1, // TODO: Get from session
        documentId: null,
        question,
        answer,
        isGenerated: false,
      });

      res.json(item);
    } catch (err) {
      console.error("Failed to create QA item:", err);
      res.status(500).json({ error: "Failed to create QA item" });
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
      console.error("Failed to update QA item:", err);
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
      console.error("Failed to delete QA item:", err);
      res.status(500).json({ error: "Failed to delete QA item" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}