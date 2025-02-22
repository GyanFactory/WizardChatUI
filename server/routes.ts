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
    const modelsResponse = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!modelsResponse.ok) {
      return { valid: false };
    }

    const usageResponse = await fetch(
      `https://api.openai.com/v1/usage?start_date=${new Date().toISOString().split('T')[0]}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    if (!usageResponse.ok) {
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

// Add Hugging Face API validation
async function validateHuggingFaceKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://api-inference.huggingface.co/models/facebook/bart-large-cnn', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    return response.ok;
  } catch (error) {
    console.error('Error validating Hugging Face API key:', error);
    return false;
  }
}

// Add DeepSeek API validation
async function validateDeepSeekKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.deepseek.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    return response.ok;
  } catch (error) {
    console.error('Error validating DeepSeek API key:', error);
    return false;
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

// Update the generateQAPairs function to handle multiple models
async function generateQAPairs(text: string, model: string = "opensource", apiKey?: string, context?: string): Promise<any[]> {
  if (!context?.trim()) {
    throw new Error("Context is required for all models");
  }

  if (model === "opensource") {
    return new Promise((resolve, reject) => {
      const qaProcess = spawn("python", [
        path.join(process.cwd(), "server/services/qa_generator.py"),
        text,
        context
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
  } else {
    if (!apiKey) {
      throw new Error(`${model.charAt(0).toUpperCase() + model.slice(1)} API key is required`);
    }

    const decryptedKey = decryptApiKey(apiKey);

    // Validate key before proceeding
    let isValid = false;
    try {
      switch (model) {
        case "openai":
          const openAiQuota = await getOpenAIQuota(decryptedKey);
          isValid = openAiQuota.valid;
          break;
        case "huggingface":
          isValid = await validateHuggingFaceKey(decryptedKey);
          break;
        case "deepseek":
          isValid = await validateDeepSeekKey(decryptedKey);
          break;
      }
    } catch (error) {
      console.error(`Failed to validate ${model} API key:`, error);
      throw new Error(`Invalid ${model} API key. Please check your credentials and try again.`);
    }

    if (!isValid) {
      throw new Error(`Invalid ${model} API key. Please check your credentials and try again.`);
    }

    const systemPrompt = `You are a knowledgeable expert helping users understand a document. Based on the provided context: "${context}", analyze the document and create natural, conversational Q&A pairs.

Generate questions that a real person would ask when trying to understand this document. Focus on:

1. Essential Information:
   - Key concepts that everyone should know
   - Critical processes or procedures
   - Important relationships and dependencies
   - Real-world applications and implications

2. Make questions sound natural and conversational:
   - Instead of "What is X?", use "Could you explain how X works?"
   - Instead of "How is Y relevant?", use "Why is Y important for this process?"
   - Ask questions that build on previous knowledge
   - Include follow-up questions when relevant

3. Make answers:
   - Clear and easy to understand
   - Comprehensive but concise
   - Include specific examples from the text
   - Connect different parts of the document when relevant

4. Mix different types of questions:
   - Straightforward clarification questions
   - Deep-dive questions about specific topics
   - Questions about practical applications
   - Questions that explore relationships between concepts

Format each Q&A pair as:
Q: [Natural, conversational question]
A: [Clear, comprehensive answer]`;

    try {
      let response;
      switch (model) {
        case "openai":
          response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${decryptedKey}`
            },
            body: JSON.stringify({
              model: "gpt-3.5-turbo-16k",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: text }
              ],
              temperature: 0.8,
              max_tokens: 4000,
              presence_penalty: 0.2,
              frequency_penalty: 0.2
            })
          });
          break;

        case "huggingface":
          response = await fetch('https://api-inference.huggingface.co/models/facebook/bart-large-cnn', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${decryptedKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              inputs: [systemPrompt, text],
              parameters: {
                max_length: 4000,
                temperature: 0.8,
                num_return_sequences: 1
              }
            })
          });
          break;

        case "deepseek":
          response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${decryptedKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: "deepseek-chat",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: text }
              ],
              temperature: 0.8,
              max_tokens: 4000
            })
          });
          break;

        default:
          throw new Error(`Unsupported model: ${model}`);
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`${model} API error:`, response.status, errorText);
        throw new Error(`${model} API error: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      let content = '';

      switch (model) {
        case "openai":
          content = result.choices[0].message.content;
          break;
        case "huggingface":
          content = result[0].generated_text;
          break;
        case "deepseek":
          content = result.choices[0].message.content;
          break;
      }

      // Split multiple Q&A pairs
      const pairs = content.split(/(?=Q:)/).filter(Boolean);
      const qa_pairs = [];

      for (const pair of pairs) {
        if (pair.includes('Q:') && pair.includes('A:')) {
          const [question, answer] = pair.split('\nA:');
          qa_pairs.push({
            question: question.replace('Q:', '').trim(),
            answer: answer.trim(),
            context: context
          });
        }
      }

      return qa_pairs;
    } catch (error) {
      console.error(`${model} API error:`, error);
      throw error;
    }
  }
}

export function registerRoutes(app: Express): Server {
  // Add validation endpoints for new APIs
  app.post("/api/validate-huggingface-key", async (req, res) => {
    try {
      const { apiKey } = req.body;
      if (!apiKey) {
        res.status(400).json({ error: "API key is required" });
        return;
      }

      const decryptedKey = decryptApiKey(apiKey);
      const isValid = await validateHuggingFaceKey(decryptedKey);

      if (!isValid) {
        res.status(400).json({ error: "Invalid API key" });
        return;
      }

      res.json({ valid: true });
    } catch (err) {
      console.error("Failed to validate Hugging Face key:", err);
      res.status(500).json({ error: "Failed to validate API key" });
    }
  });

  app.post("/api/validate-deepseek-key", async (req, res) => {
    try {
      const { apiKey } = req.body;
      if (!apiKey) {
        res.status(400).json({ error: "API key is required" });
        return;
      }

      const decryptedKey = decryptApiKey(apiKey);
      const isValid = await validateDeepSeekKey(decryptedKey);

      if (!isValid) {
        res.status(400).json({ error: "Invalid API key" });
        return;
      }

      res.json({ valid: true });
    } catch (err) {
      console.error("Failed to validate DeepSeek key:", err);
      res.status(500).json({ error: "Failed to validate API key" });
    }
  });

  // Existing routes remain the same
  app.post("/api/documents/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      try {
        const extractedText = await extractTextFromPDF(req.file.path);
        console.log("Extracted text length:", extractedText.length);

        if (!extractedText.trim()) {
          throw new Error("No text could be extracted from the PDF");
        }

        const model = req.body.model || "opensource";
        let apiKey = req.body.apiKey;
        const context = req.body.context;
        const projectId = parseInt(req.body.projectId);

        if (!context?.trim()) {
          throw new Error("Context is required");
        }

        if (apiKey) {
          apiKey = decryptApiKey(apiKey);
        }

        console.log(`Generating QA pairs using ${model} model`);
        const qaItems = await generateQAPairs(extractedText, model, apiKey, context);
        console.log(`Generated ${qaItems.length} Q&A pairs`);

        if (!qaItems.length) {
          throw new Error("No QA pairs could be generated");
        }

        const doc = await storage.createDocument({
          projectId,
          filename: req.file.originalname,
          content: extractedText,
        });

        const storedItems = await storage.createQAItems(
          qaItems.map((item: any) => ({
            projectId,
            documentId: doc.id,
            question: item.question,
            answer: item.answer,
            isGenerated: true,
          }))
        );

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

  // Add POST endpoint for creating/updating chatbot configuration
  app.post("/api/chatbot-configs", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const {
        companyName,
        welcomeMessage,
        primaryColor,
        fontFamily,
        position,
        avatarUrl,
        bubbleStyle,
        backgroundColor,
        buttonStyle,
      } = req.body;

      const userId = req.user!.id;

      const project = await storage.updateProject({
        userId,
        companyName,
        welcomeMessage,
        primaryColor,
        fontFamily,
        position,
        avatarUrl,
        bubbleStyle,
        backgroundColor,
        buttonStyle,
      });

      res.json(project);
    } catch (error) {
      console.error("Failed to save chatbot configuration:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to save configuration"
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}