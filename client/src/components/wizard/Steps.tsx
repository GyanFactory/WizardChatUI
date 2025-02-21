import { Button } from "@/components/ui/button";
import { useWizardStore } from "@/store/wizardStore";
import CompanyInfo from "./steps/CompanyInfo";
import DocumentUpload from "./steps/DocumentUpload";
import QAManagement from "./steps/QAManagement";
import Appearance from "./steps/Appearance";
import Embed from "./steps/Embed";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import AuthForm from "../auth/AuthForm";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

export default function Steps() {
  const { currentStep, setStep, companyName } = useWizardStore();
  const { toast } = useToast();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const { user } = useAuth();
  const [projectId, setProjectId] = useState<number | null>(null);

  // Query to fetch or create project
  const { data: project } = useQuery({
    queryKey: ['project', user?.id],
    queryFn: async () => {
      if (!user) return null;
      try {
        const response = await apiRequest('POST', '/api/projects', {
          userId: user.id,
          name: companyName,
          companyName: companyName,
          welcomeMessage: `Welcome to ${companyName} support`,
        });
        const data = await response.json();
        setProjectId(data.id);
        return data;
      } catch (error) {
        console.error('Error creating project:', error);
        return null;
      }
    },
    enabled: !!user && !!companyName,
  });

  const stepComponents = [
    CompanyInfo,
    DocumentUpload,
    QAManagement,
    Appearance,
    Embed
  ];

  const CurrentStepComponent = stepComponents[currentStep];

  const validateStep = () => {
    switch (currentStep) {
      case 0: // CompanyInfo
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
      case 1: // Document Upload
        if (!projectId) {
          toast({
            title: "Project Required",
            description: "Please wait while we create your project",
            variant: "destructive",
          });
          return false;
        }
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep < stepComponents.length - 1) {
      if (validateStep()) {
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
    // Wait for the auth state to be updated
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
        <CurrentStepComponent projectId={projectId} />
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
          disabled={currentStep === stepComponents.length - 1}
        >
          Next
          <ArrowRight className="w-4 h-4 ml-2" />
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