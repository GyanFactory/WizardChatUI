import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

// Configure multer for file upload
const upload = multer({
  dest: "uploads",
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

// Extract text from PDF using the Python service
async function extractTextFromPDF(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn("python", [
      path.join(process.cwd(), "server/services/pdf_processor.py"),
      filePath
    ]);

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data;
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data;
      console.error(`PDF Processor Error: ${data}`);
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`PDF processing failed: ${errorOutput}`));
      } else {
        resolve(output);
      }
    });
  });
}

// Generate QA pairs using either opensource or OpenAI approach
async function generateQAPairs(text: string, model: string = "opensource", apiKey?: string): Promise<any[]> {
  if (model === "opensource") {
    // Use simple rule-based QA generation
    return new Promise((resolve, reject) => {
      const qaProcess = spawn("python", [
        path.join(process.cwd(), "server/services/qa_generator.py"),
        text
      ]);

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
    if (!apiKey) {
      throw new Error("OpenAI API key is required");
    }

    // Process text in smaller chunks
    const chunks = text.split(/\n\s*\n/).filter(chunk => {
      const trimmed = chunk.trim();
      return trimmed.length >= 50 && trimmed.length <= 1500; // Reasonable chunk sizes
    });

    console.log(`Processing ${chunks.length} chunks with OpenAI`);
    const qa_pairs = [];

    for (const chunk of chunks) {
      try {
        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 1000));

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
                content: "Generate a single, focused question and comprehensive answer pair from the given text. Format your response exactly as: 'Q: [question]\nA: [answer]'"
              },
              {
                role: "user",
                content: chunk
              }
            ],
            temperature: 0.7,
            max_tokens: 500
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("OpenAI API error:", response.status, errorText);

          if (response.status === 429) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            continue;
          }
          throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        const content = result.choices[0].message.content;

        if (content.includes('Q:') && content.includes('A:')) {
          const [question, answer] = content.split('\nA:');
          qa_pairs.push({
            question: question.replace('Q:', '').trim(),
            answer: answer.trim(),
            context: chunk
          });
          console.log("Generated QA pair:", qa_pairs[qa_pairs.length - 1]);
        }
      } catch (error) {
        console.error("Error processing chunk:", error);
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
      if (!req.file) {
        throw new Error("No file uploaded");
      }

      try {
        // First extract text from PDF
        const extractedText = await extractTextFromPDF(req.file.path);
        console.log("Extracted text length:", extractedText.length);

        if (!extractedText.trim()) {
          throw new Error("No text could be extracted from the PDF");
        }

        // Generate QA pairs from the extracted text
        const model = req.body.model || "opensource";
        const apiKey = req.body.apiKey;

        console.log(`Generating QA pairs using ${model} model`);
        const qaItems = await generateQAPairs(extractedText, model, apiKey);
        console.log(`Generated ${qaItems.length} QA pairs`);

        if (!qaItems.length) {
          throw new Error("No QA pairs could be generated");
        }

        // Store document in storage
        const doc = await storage.createDocument({
          configId: 1, // TODO: Get from session
          filename: req.file.originalname,
          content: extractedText,
          createdAt: new Date().toISOString(),
        });

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

  // Create chatbot configuration
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