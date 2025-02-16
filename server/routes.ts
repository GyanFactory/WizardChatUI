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

async function generateQAPairs(filePath: string, model: string = "opensource", apiKey?: string): Promise<any[]> {
  // First extract text from PDF
  const pythonProcess = spawn("python", [
    path.join(process.cwd(), "server/services/pdf_processor.py"),
    filePath
  ]);

  const extractedText = await new Promise<string>((resolve, reject) => {
    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data;
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data;
      console.error(`Python Error: ${data}`);
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`PDF processing failed: ${errorOutput}`));
      } else {
        resolve(output);
      }
    });
  });

  console.log("Extracted text from PDF:", extractedText.substring(0, 200) + "...");

  if (model === "opensource") {
    // For opensource model, we'll use the same Python script but with a different mode
    const qaProcess = spawn("python", [
      path.join(process.cwd(), "server/services/qa_generator.py"),
      extractedText
    ]);

    return new Promise((resolve, reject) => {
      let output = '';
      let errorOutput = '';

      qaProcess.stdout.on('data', (data) => {
        output += data;
      });

      qaProcess.stderr.on('data', (data) => {
        errorOutput += data;
        console.error(`QA Generator Error: ${data}`);
      });

      qaProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`QA generation failed: ${errorOutput}`));
        } else {
          try {
            const qaItems = JSON.parse(output);
            resolve(qaItems);
          } catch (error) {
            reject(new Error(`Failed to parse QA items: ${error}`));
          }
        }
      });
    });

  } else if (model === "openai") {
    if (!apiKey) throw new Error("OpenAI API key is required");

    const chunks = extractedText.split('\n\n').filter(chunk => chunk.trim().length > 30);
    console.log(`Processing ${chunks.length} chunks with OpenAI`);
    const qa_pairs = [];

    for (const chunk of chunks) {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit delay

        console.log("Processing chunk:", chunk.substring(0, 100) + "...");

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content: "Generate a relevant question and detailed answer pair from the given text. Format your response exactly as 'Q: [question]\nA: [answer]'"
              },
              {
                role: "user",
                content: chunk
              }
            ],
            temperature: 0.7
          })
        });

        if (!response.ok) {
          console.error("OpenAI API error:", response.status, await response.text());
          if (response.status === 429) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const result = await response.json();
        const content = result.choices[0].message.content;
        console.log("OpenAI response:", content);

        if (content.includes('Q:') && content.includes('A:')) {
          const [question, answer] = content.split('\nA:').map(str => str.replace('Q:', '').trim());
          qa_pairs.push({
            question,
            answer,
            context: chunk
          });
        }
      } catch (error) {
        console.error("Error processing chunk:", error);
        continue;
      }
    }

    return qa_pairs;
  } else {
    throw new Error(`Unsupported model: ${model}`);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Upload PDF and generate Q&A pairs
  app.post("/api/documents/upload", upload.single("file"), async (req, res) => {
    try {
      console.log("Processing upload request", { body: req.body, file: req.file });

      if (!req.file) {
        throw new Error("No file uploaded");
      }

      try {
        // Generate QA pairs directly from the uploaded file
        const model = req.body.model || "opensource";
        const apiKey = req.body.apiKey;

        console.log(`Generating QA pairs using ${model} model`);
        const qaItems = await generateQAPairs(req.file.path, model, apiKey);
        console.log(`Generated ${qaItems.length} QA pairs`);

        // Store document in storage
        const doc = await storage.createDocument({
          configId: 1, // TODO: Get from session
          filename: req.file.originalname,
          content: fs.readFileSync(req.file.path, 'utf-8'),
          createdAt: new Date().toISOString(),
        });

        console.log("Stored document:", doc);

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
        fs.unlinkSync(req.file.path);

        res.json({
          document: doc,
          qaItems: storedItems,
        });
      } catch (err) {
        console.error("Failed to process document:", err);
        res.status(500).json({
          error: "Failed to process document",
          details: err instanceof Error ? err.message : String(err)
        });
      }
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({
        error: "Failed to upload file",
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // Create or update chatbot configuration
  app.post("/api/chatbot-config", async (req, res) => {
    try {
      const config = await storage.createChatbotConfig({
        companyName: req.body.companyName,
        welcomeMessage: req.body.welcomeMessage,
        primaryColor: req.body.primaryColor,
        fontFamily: req.body.fontFamily,
        position: req.body.position,
        avatarUrl: req.body.avatarUrl,
        bubbleStyle: req.body.bubbleStyle,
        backgroundColor: req.body.backgroundColor,
        buttonStyle: req.body.buttonStyle,
      });

      res.json({
        config,
      });
    } catch (err) {
      console.error("Failed to create chatbot config:", err);
      res.status(500).json({ error: "Failed to create chatbot config" });
    }
  });

  // Get chatbot configuration
  app.get("/api/chatbot-config/:id", async (req, res) => {
    try {
      const config = await storage.getChatbotConfig(parseInt(req.params.id));

      if (!config) {
        res.status(404).json({ error: "Configuration not found" });
        return;
      }

      const qaItems = await storage.getQAItems(config.id);

      res.json({
        config,
        qaItems,
      });
    } catch (err) {
      console.error("Failed to fetch chatbot config:", err);
      res.status(500).json({ error: "Failed to fetch chatbot config" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}