import { Card } from "@/components/ui/card";
import Steps from "@/components/wizard/Steps";
import StepIndicator from "@/components/wizard/StepIndicator";
import ChatPreview from "@/components/wizard/ChatPreview";
import { useWizardStore } from "@/store/wizardStore";

export default function WizardPage() {
  const currentStep = useWizardStore((state) => state.currentStep);
  
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
          Chatbot Customization Wizard
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="p-6">
              <StepIndicator currentStep={currentStep} />
              <div className="mt-8">
                <Steps />
              </div>
            </Card>
          </div>
          
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-8">
              <h2 className="text-xl font-semibold mb-4">Live Preview</h2>
              <ChatPreview />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
