import { Button } from "@/components/ui/button";
import { useWizardStore } from "@/store/wizardStore";
import CompanyInfo from "./steps/CompanyInfo";
import DocumentUpload from "./steps/DocumentUpload";
import QAManagement from "./steps/QAManagement";
import Appearance from "./steps/Appearance";
import Embed from "./steps/Embed";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import AuthForm from "../auth/AuthForm";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import CryptoJS from 'crypto-js';

interface FileWithPath extends File {
  path?: string;
}

export default function Steps() {
  const { currentStep, setStep, companyName, welcomeMessage } = useWizardStore();
  const { toast } = useToast();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const { user } = useAuth();
  const [projectId, setProjectId] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileWithPath | null>(null);
  const [selectedModel, setSelectedModel] = useState("opensource");
  const [apiKey, setApiKey] = useState<string>();
  const [context, setContext] = useState("");

  // Query to fetch or create project
  const { data: project } = useQuery({
    queryKey: ['project', user?.id],
    queryFn: async () => {
      if (!user) return null;
      try {
        const response = await apiRequest('/api/projects', {
          method: 'POST',
          body: JSON.stringify({
            name: companyName,
            companyName: companyName,
            welcomeMessage: welcomeMessage || `Welcome to ${companyName} support`,
            status: 'active'
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to create project');
        }

        const data = await response.json();
        setProjectId(data.id);
        return data;
      } catch (error) {
        console.error('Error creating project:', error);
        toast({
          title: "Project Creation Failed",
          description: error instanceof Error ? error.message : "Failed to create project",
          variant: "destructive"
        });
        return null;
      }
    },
    enabled: !!user && !!companyName,
  });

  // Function to encrypt API key
  const encryptApiKey = (key: string) => {
    const salt = "AI_CHATBOT_SALT";
    return CryptoJS.AES.encrypt(key, salt).toString();
  };

  const uploadDocument = async () => {
    if (!selectedFile || !projectId) return false;

    try {
      setIsUploading(true);

      if (!context.trim()) {
        toast({
          title: "Context Required",
          description: "Please provide context about what information you want to extract from the document",
          variant: "destructive",
        });
        return false;
      }

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("model", selectedModel); 
      formData.append("context", context);
      formData.append("projectId", projectId.toString());

      // Only append API key if model is OpenAI
      if (selectedModel === "openai" && apiKey) {
        const encryptedKey = encryptApiKey(apiKey);
        formData.append("apiKey", encryptedKey);
      }

      console.log("Uploading document with model:", selectedModel); 

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Upload failed');
      }

      const data = await response.json();
      toast({
        title: "Success!",
        description: `Generated ${data.qaItems.length} Q&A pairs from your document.`,
      });
      return true;
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload document",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  const stepComponents = [
    CompanyInfo,
    DocumentUpload,
    QAManagement,
    Appearance,
    Embed
  ];

  const CurrentStepComponent = stepComponents[currentStep];

  const validateStep = async () => {
    switch (currentStep) {
      case 0: 
        const companyInfoComponent = document.querySelector('#companyName');
        if (!companyName.trim()) {
          toast({
            title: "Required Field",
            description: "Please enter your company name before proceeding",
            variant: "destructive",
          });
          if (companyInfoComponent) {
            companyInfoComponent.classList.add('border-red-500');
          }
          return false;
        }
        if (!user) {
          setShowAuthDialog(true);
          return false;
        }
        break;
      case 1: 
        if (!projectId) {
          toast({
            title: "Project Required",
            description: "Please wait while we create your project",
            variant: "destructive",
          });
          return false;
        }
        if (!selectedFile) {
          toast({
            title: "File Required",
            description: "Please select a PDF file to upload",
            variant: "destructive",
          });
          return false;
        }
        if (selectedModel === "openai" && !apiKey) {
          toast({
            title: "API Key Required",
            description: "Please enter and validate your OpenAI API key",
            variant: "destructive",
          });
          return false;
        }
        
        return await uploadDocument();
    }
    return true;
  };

  const handleNext = async () => {
    if (currentStep < stepComponents.length - 1) {
      const isValid = await validateStep();
      if (isValid) {
        setStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setStep(currentStep - 1);
    }
  };

  const handleLoginSuccess = () => {
    setShowAuthDialog(false);
    setTimeout(() => {
      if (user) {
        handleNext();
        toast({
          title: "Success",
          description: "You're now logged in and we're setting up your project",
        });
      }
    }, 100);
  };

  return (
    <div>
      <div className="min-h-[400px]">
        <CurrentStepComponent 
          projectId={projectId}
          onFileSelect={setSelectedFile}
          onContextChange={setContext}
          onModelSelect={(model: string, key?: string) => {
            console.log("Model selected:", model); 
            setSelectedModel(model);
            setApiKey(key);
          }}
        />
      </div>

      <div className="flex justify-between mt-8 pt-4 border-t">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Button
          onClick={handleNext}
          disabled={currentStep === stepComponents.length - 1 || isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>

      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Login or Create Account</DialogTitle>
          </DialogHeader>
          <AuthForm onSuccess={handleLoginSuccess} />
        </DialogContent>
      </Dialog>
    </div>
  );
}