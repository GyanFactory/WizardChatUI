import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, File, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWizardStore } from "@/store/wizardStore";
import { useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import CryptoJS from 'crypto-js';

interface FileWithPath extends File {
  path?: string;
}

export default function DocumentUpload() {
  const [file, setFile] = useState<FileWithPath | null>(null);
  const { toast } = useToast();
  const { setStep, setCurrentDocument } = useWizardStore();
  const [selectedModel, setSelectedModel] = useState("opensource");
  const [apiKey, setApiKey] = useState("");
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [context, setContext] = useState("");
  const [contextError, setContextError] = useState("");

  // Function to encrypt API key
  const encryptApiKey = (key: string) => {
    // Using a static salt for simplicity. In production, this should be a server-side secret
    const salt = "AI_CHATBOT_SALT";
    return CryptoJS.AES.encrypt(key, salt).toString();
  };

  // Function to check OpenAI API key
  const checkAPIKey = async (key: string) => {
    try {
      // Encrypt API key before sending
      const encryptedKey = encryptApiKey(key);

      const response = await fetch('/api/validate-openai-key', {
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

      if (data.quota) {
        const { total, used } = data.quota;
        const remaining = total - used;
        toast({
          title: "API Key Valid",
          description: `Monthly Usage: ${used.toLocaleString()} / ${total.toLocaleString()} tokens`,
        });
      } else {
        toast({
          title: "API Key Valid",
          description: "Unable to fetch quota information, but the key is valid",
        });
      }

      return true;
    } catch (error) {
      toast({
        title: "Invalid API Key",
        description: error.message,
        variant: "destructive"
      });
      return false;
    }
  };

  const handleValidateApiKey = async () => {
    if (await checkAPIKey(apiKey)) {
      setShowApiKeyDialog(false);
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async (file: FileWithPath) => {
      if (!context.trim()) {
        setContextError("Please provide context about what information you want to extract from the document");
        throw new Error("Context is required");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("model", selectedModel);
      formData.append("context", context);
      if (selectedModel !== "opensource") {
        // Encrypt API key before sending
        const encryptedKey = encryptApiKey(apiKey);
        formData.append("apiKey", encryptedKey);
      }

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Upload failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Store the document ID in wizard state
      setCurrentDocument(data.document.id);
      toast({
        title: "Success!",
        description: `Generated ${data.qaItems.length} Q&A pairs from your document.`,
      });
      setStep(2); // Move to Q&A Management step
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleModelSelect = (model: string) => {
    setSelectedModel(model);
    if (model !== "opensource") {
      setShowApiKeyDialog(true);
    } else {
      setApiKey("");
      setShowApiKeyDialog(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    if (selectedModel !== "opensource") {
      if (!apiKey) {
        toast({
          title: "API Key Required",
          description: "Please enter the API key for the selected model",
          variant: "destructive",
        });
        return;
      }
    }
    if (!context.trim()) {
      setContextError("Please provide context about what information you want to extract from the document");
      toast({
        title: "Context Required",
        description: "Please provide context for better Q&A generation",
        variant: "destructive",
      });
      return;
    }
    uploadMutation.mutate(file);
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
    }
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
            <Label>
              Context <span className="text-red-500">*</span>
            </Label>
            <Textarea
              placeholder="Describe what kind of information you want to extract from this document. For example: 'This is a resume, I want to extract information about work experience, skills, and projects.'"
              value={context}
              onChange={(e) => {
                setContext(e.target.value);
                setContextError("");
              }}
              className={`h-24 ${contextError ? "border-red-500" : ""}`}
            />
            {contextError && <p className="text-sm text-red-500">{contextError}</p>}
          </div>

          <div className="flex gap-4 justify-center">
            <Button
              variant={selectedModel === "opensource" ? "default" : "outline"}
              onClick={() => handleModelSelect("opensource")}
            >
              Open Source Model
            </Button>
            <Button
              variant={selectedModel === "openai" ? "default" : "outline"}
              onClick={() => handleModelSelect("openai")}
            >
              OpenAI
            </Button>
          </div>

          {showApiKeyDialog && (
            <div className="space-y-4">
              <Input
                type="password"
                placeholder="Enter API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <Button 
                onClick={handleValidateApiKey}
                disabled={!apiKey.trim()}
              >
                Validate API Key
              </Button>
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
                disabled={uploadMutation.isPending}
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
              <div className="flex items-center gap-2">
                {!uploadMutation.isPending && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  onClick={handleUpload}
                  disabled={uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Upload & Generate Q&A"
                  )}
                </Button>
              </div>
            </div>
          )}

          {uploadMutation.isPending && (
            <div className="text-sm text-gray-600 text-center">
              <p>Analyzing your document and generating Q&A pairs...</p>
              <p>This may take a few minutes depending on the document size.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}