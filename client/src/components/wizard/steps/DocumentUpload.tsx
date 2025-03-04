import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Upload, File, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import CryptoJS from 'crypto-js';

interface FileWithPath extends File {
  path?: string;
}

interface DocumentUploadProps {
  projectId: number | null;
  onFileSelect: (file: FileWithPath | null) => void;
  onContextChange: (context: string) => void;
  onModelSelect: (model: string, apiKey?: string) => void;
  documentProcessed?: boolean;
}

export default function DocumentUpload({ 
  projectId, 
  onFileSelect,
  onContextChange,
  onModelSelect,
}: DocumentUploadProps) {
  const [file, setFile] = useState<FileWithPath | null>(null);
  const { toast } = useToast();
  const [selectedModel, setSelectedModel] = useState("opensource");
  const [apiKey, setApiKey] = useState("");
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [context, setContext] = useState("");
  const [contextError, setContextError] = useState("");

  // Function to encrypt API key
  const encryptApiKey = (key: string) => {
    const salt = "AI_CHATBOT_SALT";
    return CryptoJS.AES.encrypt(key, salt).toString();
  };

  // Function to check API keys
  const checkAPIKey = async (key: string, model: string) => {
    try {
      const encryptedKey = encryptApiKey(key);
      const endpoint = `/api/validate-${model}-key`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ apiKey: encryptedKey })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid API key');
      }

      toast({
        title: "API Key Valid",
        description: data.quota ? 
          `Monthly Usage: ${data.quota.used.toLocaleString()} / ${data.quota.total.toLocaleString()} tokens` :
          "API key validated successfully",
      });

      return true;
    } catch (error: any) {
      toast({
        title: "Invalid API Key",
        description: error.message || "Failed to validate API key",
        variant: "destructive"
      });
      return false;
    }
  };

  // Update the handleModelSelect function
  const handleModelSelect = async (model: string) => {
    setSelectedModel(model);
    if (model !== "opensource") {
      setShowApiKeyDialog(true);
      setApiKey("");
    } else {
      setApiKey("");
      setShowApiKeyDialog(false);
      onModelSelect("opensource");
    }
  };

  // Update the handleValidateApiKey function
  const handleValidateApiKey = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: `Please enter your ${selectedModel.charAt(0).toUpperCase() + selectedModel.slice(1)} API key`,
        variant: "destructive"
      });
      return;
    }

    const isValid = await checkAPIKey(apiKey, selectedModel);
    if (isValid) {
      setShowApiKeyDialog(false);
      onModelSelect(selectedModel, apiKey);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== "application/pdf") {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF file",
          variant: "destructive",
        });
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
      onFileSelect(selectedFile);
    }
  };

  const handleContextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContext = e.target.value;
    setContext(newContext);
    setContextError("");
    onContextChange(newContext);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4">Upload Training Document</h2>
        <p className="text-gray-600 mb-6">
          Upload a PDF document containing your knowledge base. We'll use this to generate Q&A pairs.
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          <div className="space-y-4">
            <Label htmlFor="context">
              Context <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="context"
              placeholder="Describe what kind of information you want to extract from this document. For example: 'This is a technical manual, I want to extract information about installation procedures and troubleshooting steps.'"
              value={context}
              onChange={handleContextChange}
              className={`min-h-[100px] ${contextError ? "border-red-500" : ""}`}
            />
            {contextError && <p className="text-sm text-red-500">{contextError}</p>}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              className={`px-4 py-2 rounded-md transition-colors ${
                selectedModel === "opensource" 
                  ? "bg-primary text-white" 
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
              onClick={() => handleModelSelect("opensource")}
            >
              Open Source
            </button>
            <button
              className={`px-4 py-2 rounded-md transition-colors ${
                selectedModel === "openai" 
                  ? "bg-primary text-white" 
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
              onClick={() => handleModelSelect("openai")}
            >
              OpenAI
            </button>
            <button
              className={`px-4 py-2 rounded-md transition-colors ${
                selectedModel === "huggingface" 
                  ? "bg-primary text-white" 
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
              onClick={() => handleModelSelect("huggingface")}
            >
              Hugging Face
            </button>
            <button
              className={`px-4 py-2 rounded-md transition-colors ${
                selectedModel === "deepseek" 
                  ? "bg-primary text-white" 
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
              onClick={() => handleModelSelect("deepseek")}
            >
              DeepSeek
            </button>
          </div>

          {showApiKeyDialog && (
            <div className="space-y-4">
              <Label>
                {selectedModel.charAt(0).toUpperCase() + selectedModel.slice(1)} API Key
                <span className="text-red-500">*</span>
              </Label>
              <Input
                type="password"
                placeholder={`Enter ${selectedModel.charAt(0).toUpperCase() + selectedModel.slice(1)} API Key`}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="font-mono"
              />
              <div className="text-sm text-gray-500">
                {selectedModel === "huggingface" && (
                  <p>Enter your Hugging Face API key to use their models for Q&A generation.</p>
                )}
              </div>
              <button 
                className={`w-full px-4 py-2 rounded-md ${
                  !apiKey.trim() 
                    ? "bg-gray-200 cursor-not-allowed" 
                    : "bg-primary text-white hover:bg-primary/90"
                }`}
                onClick={handleValidateApiKey}
                disabled={!apiKey.trim()}
              >
                Validate API Key
              </button>
            </div>
          )}

          <div 
            className="border-2 border-dashed border-gray-200 rounded-lg p-8"
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const droppedFile = e.dataTransfer.files[0];
              if (droppedFile.type === "application/pdf") {
                if (droppedFile.size <= 5 * 1024 * 1024) {
                  setFile(droppedFile);
                  onFileSelect(droppedFile);
                } else {
                  toast({
                    title: "File too large",
                    description: "Please upload a file smaller than 5MB",
                    variant: "destructive",
                  });
                }
              } else {
                toast({
                  title: "Invalid file type",
                  description: "Please upload a PDF file",
                  variant: "destructive",
                });
              }
            }}
          >
            <div className="flex flex-col items-center justify-center">
              <Upload className="h-12 w-12 text-gray-400 mb-4" />
              <Label
                htmlFor="file-upload"
                className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Choose PDF File
              </Label>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                accept=".pdf"
                onChange={handleFileChange}
              />
              <p className="mt-2 text-sm text-gray-500">
                or drag and drop your file here
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Maximum file size: 5MB
              </p>
            </div>
          </div>

          {file && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <File className="h-6 w-6 text-blue-600" />
                <span className="text-sm font-medium">{file.name}</span>
              </div>
              <button
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                onClick={() => {
                  setFile(null);
                  onFileSelect(null);
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}