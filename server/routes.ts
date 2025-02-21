import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import CryptoJS from 'crypto-js';
import { WebSocketServer, WebSocket } from 'ws';

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

// Add decryption function
function decryptApiKey(encryptedKey: string): string {
  const salt = "AI_CHATBOT_SALT";
  const bytes = CryptoJS.AES.decrypt(encryptedKey, salt);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// Add after decryptApiKey function
async function getOpenAIQuota(apiKey: string): Promise<{ valid: boolean; quota?: { total: number; used: number } }> {
  try {
    // First verify if the API key is valid
    const modelsResponse = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!modelsResponse.ok) {
      return { valid: false };
    }

    // Get billing information for the current month
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const usageResponse = await fetch(
      `https://api.openai.com/v1/usage?start_date=${firstDay.toISOString().split('T')[0]}&end_date=${lastDay.toISOString().split('T')[0]}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    if (!usageResponse.ok) {
      // Key is valid but couldn't get quota
      return { valid: true };
    }

    const usageData = await usageResponse.json();
    return {
      valid: true,
      quota: {
        total: usageData.total_available || 0,
        used: usageData.total_used || 0
      }
    };
  } catch (error) {
    console.error('Error checking OpenAI quota:', error);
    return { valid: false };
  }
}

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

// Update the generateQAPairs function to properly handle OpenAI
async function generateQAPairs(text: string, model: string = "opensource", apiKey?: string, context?: string): Promise<any[]> {
  if (!context?.trim()) {
    throw new Error("Context is required for both models");
  }

  if (model === "opensource") {
    // Use simple rule-based QA generation with context
    return new Promise((resolve, reject) => {
      const qaProcess = spawn("python", [
        path.join(process.cwd(), "server/services/qa_generator.py"),
        text,
        context // Pass context to Python script
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

    try {
      // Process text in larger chunks for better context
      const chunks = text.split(/\n\s*\n/).filter(chunk => {
        const trimmed = chunk.trim();
        return trimmed.length >= 100 && trimmed.length <= 2000; // Increased chunk size
      });

      console.log(`Processing ${chunks.length} chunks with OpenAI`);
      const qa_pairs = [];
      let retryCount = 0;
      const maxRetries = 3;

      const systemPrompt = context
        ? `You are an expert at creating comprehensive Q&A pairs from documents. Focus on extracting information about: ${context}. For each text chunk, generate 2-3 specific, detailed questions and their complete answers. Each Q&A pair should be informative and self-contained. Format your response exactly as: 'Q: [specific question]\nA: [detailed answer]'`
        : `You are an expert at creating comprehensive Q&A pairs from documents. For each text chunk, generate 2-3 specific, detailed questions and their complete answers. Focus on key information, technical details, and important facts. Each Q&A pair should be informative and self-contained. Format your response exactly as: 'Q: [specific question]\nA: [detailed answer]'`;

      for (const chunk of chunks) {
        try {
          // Rate limiting delay
          await new Promise(resolve => setTimeout(resolve, 2000));

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
                  content: systemPrompt
                },
                {
                  role: "user",
                  content: chunk
                }
              ],
              temperature: 0.7,
              max_tokens: 1000 // Increased token limit for more detailed responses
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error("OpenAI API error:", response.status, errorText);

            if (response.status === 429) {
              if (retryCount < maxRetries) {
                retryCount++;
                await new Promise(resolve => setTimeout(resolve, 5000 * retryCount));
                continue;
              }
              throw new Error("Rate limit exceeded after retries");
            }
            throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
          }

          const result = await response.json();
          const content = result.choices[0].message.content;

          // Split multiple Q&A pairs
          const pairs = content.split(/(?=Q:)/).filter(Boolean);
          for (const pair of pairs) {
            if (pair.includes('Q:') && pair.includes('A:')) {
              const [question, answer] = pair.split('\nA:');
              qa_pairs.push({
                question: question.replace('Q:', '').trim(),
                answer: answer.trim(),
                context: chunk
              });
            }
          }
        } catch (error) {
          console.error("Error processing chunk:", error);
          // Instead of generating basic QA, we'll skip problematic chunks
          continue;
        }
      }

      return qa_pairs;
    } catch (error) {
      console.error("OpenAI API error:", error);
      throw error;
    }
  } else {
    throw new Error(`Unsupported model: ${model}`);
  }
}

export function registerRoutes(app: Express): Server {
  // Upload PDF and generate Q&A pairs
  app.post("/api/documents/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
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
        let apiKey = req.body.apiKey;
        const context = req.body.context;
        const projectId = parseInt(req.body.projectId);

        if (!context?.trim()) {
          throw new Error("Context is required");
        }

        if (apiKey) {
          // Decrypt the API key
          apiKey = decryptApiKey(apiKey);
        }

        console.log(`Generating QA pairs using ${model} model`);
        const qaItems = await generateQAPairs(extractedText, model, apiKey, context);
        console.log(`Generated ${qaItems.length} Q&A pairs`);

        if (!qaItems.length) {
          throw new Error("No QA pairs could be generated");
        }

        // Store document in storage
        const doc = await storage.createDocument({
          projectId,
          filename: req.file.originalname,
          content: extractedText,
        });

        // Store Q&A pairs
        const storedItems = await storage.createQAItems(
          qaItems.map((item: any) => ({
            projectId,
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

  // Add the project creation endpoint
  app.post("/api/projects", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { name, companyName, welcomeMessage } = req.body;
      const userId = req.user!.id;

      const project = await storage.createProject({
        userId,
        name,
        companyName,
        welcomeMessage,
        primaryColor: '#2563eb',
        fontFamily: 'Inter',
        position: 'bottom-right',
        avatarUrl: '/avatars/robot-blue.svg',
        bubbleStyle: 'rounded',
        backgroundColor: '#ffffff',
        buttonStyle: 'solid',
        status: 'active'
      });

      res.json(project);
    } catch (error) {
      console.error("Failed to create project:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to create project"
      });
    }
  });


  // Add validation endpoint for OpenAI API key  (This replaces the original)
  app.post("/api/validate-openai-key", async (req, res) => {
    try {
      const { apiKey } = req.body;
      if (!apiKey) {
        res.status(400).json({ error: "API key is required" });
        return;
      }

      // Decrypt the API key
      const decryptedKey = decryptApiKey(apiKey);
      const quotaInfo = await getOpenAIQuota(decryptedKey);

      if (!quotaInfo.valid) {
        res.status(400).json({ error: "Invalid API key" });
        return;
      }

      res.json({
        valid: true,
        quota: quotaInfo.quota
      });
    } catch (err) {
      console.error("Failed to validate OpenAI key:", err);
      res.status(500).json({ error: "Failed to validate API key" });
    }
  });

  // Add chatbot configurations endpoint
  app.get("/api/chatbot-configs", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const configs = await storage.getProjectsByUser(req.user!.id);
      res.json(configs);
    } catch (error) {
      console.error("Failed to fetch chatbot configs:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to fetch configurations"
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}