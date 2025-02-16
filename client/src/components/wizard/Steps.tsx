import { Button } from "@/components/ui/button";
import { useWizardStore } from "@/store/wizardStore";
import CompanyInfo from "./steps/CompanyInfo";
import DocumentUpload from "./steps/DocumentUpload";
import QAManagement from "./steps/QAManagement";
import Appearance from "./steps/Appearance";
import Embed from "./steps/Embed";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Steps() {
  const { currentStep, setStep, companyName } = useWizardStore();
  const { toast } = useToast();

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

  return (
    <div>
      <div className="min-h-[400px]">
        <CurrentStepComponent />
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
    </div>
  );
}