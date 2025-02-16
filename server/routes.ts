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

// Placeholder for the actual implementation.  This needs to be fleshed out based on how
// open-source, OpenAI, and DeepSeek APIs are used.  Error handling and API key validation
// are crucial here.
async function generateQAPairs(text: string, model: string = "opensource", apiKey?: string): Promise<any[]> {
  if (model === "opensource") {
    const pythonProcess = spawn("python", [
      path.join(process.cwd(), "server/services/pdf_processor.py"),
      text
    ]);
    
    return new Promise((resolve, reject) => {
      let output = '';
      pythonProcess.stdout.on('data', (data) => {
        output += data;
      });
      
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error("Failed to process with opensource model"));
          return;
        }
        resolve(JSON.parse(output));
      });
    });

  } else if (model === "openai") {
    if (!apiKey) throw new Error("OpenAI API key is required");
    
    const chunks = text.split('\n\n').filter(chunk => chunk.length > 30);
    const qa_pairs = [];
    
    for (const chunk of chunks) {
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
              content: "Generate a relevant question and detailed answer pair from the given text."
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
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const result = await response.json();
      const content = result.choices[0].message.content;
      const parts = content.split('\nA: ');
      qa_pairs.push({
        question: parts[0].replace('Q: ', '').trim(),
        answer: parts[1] ? parts[1].trim() : chunk,
        context: ""
      });
    }
    
    return qa_pairs;

  } else if (model === "deepseek") {
    if (!apiKey) throw new Error("DeepSeek API key is required");
    
    const chunks = text.split('\n\n').filter(chunk => chunk.length > 30);
    const qa_pairs = [];
    
    for (const chunk of chunks) {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: "Generate a relevant question and detailed answer pair from the given text."
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
        throw new Error(`DeepSeek API error: ${response.statusText}`);
      }

      const result = await response.json();
      const content = result.choices[0].message.content;
      const parts = content.split('\nA: ');
      qa_pairs.push({
        question: parts[0].replace('Q: ', '').trim(),
        answer: parts[1] ? parts[1].trim() : chunk,
        context: ""
      });
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

      // Store document in storage
      const doc = await storage.createDocument({
        configId: 1, // TODO: Get from session
        filename: req.file.originalname,
        content: "", // Will be updated after processing
        createdAt: new Date().toISOString(),
      });

      console.log("Created document:", doc);

      // Process PDF with Python service (this part remains unchanged)
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
          const text = qaData; // Assuming qaData contains the extracted text from the PDF
          const model = req.body.model || "opensource";
          const apiKey = req.body.apiKey;
          const qaItems = await generateQAPairs(text, model, apiKey);


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

  // Generate embed code for chatbot
  app.get("/api/embed/:configId", async (req, res) => {
    try {
      const configId = parseInt(req.params.configId);
      const config = await storage.getChatbotConfig(configId);

      if (!config) {
        res.status(404).json({ error: "Configuration not found" });
        return;
      }

      const embedCode = `
<!-- AI Chatbot Widget -->
<script>
  (function(w,d,s,o,f,js,fjs){
    w['AIChatWidget']=o;
    w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s),fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','aiChat','/widget.js'));
  aiChat('init', '${configId}');
</script>`;

      res.json({ embedCode });
    } catch (err) {
      console.error("Failed to generate embed code:", err);
      res.status(500).json({ error: "Failed to generate embed code" });
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

      // Get associated QA items
      const qaItems = await storage.getQAItems(config.id);

      res.json({
        config,
        qaItems,
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