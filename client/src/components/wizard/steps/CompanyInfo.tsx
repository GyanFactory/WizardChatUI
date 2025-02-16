import { useWizardStore } from "@/store/wizardStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function CompanyInfo() {
  const { companyName, updateConfig, setStep } = useWizardStore();
  const { toast } = useToast();
  const [error, setError] = useState("");

  const handleNext = () => {
    if (!companyName.trim()) {
      setError("Company name is required");
      toast({
        title: "Required Field",
        description: "Please enter your company name before proceeding",
        variant: "destructive",
      });
      return;
    }
    setError("");
    setStep(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4">Company Information</h2>
        <p className="text-gray-600 mb-6">
          Let's start by setting up your company details for the chatbot.
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">
              Company Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => {
                updateConfig({ companyName: e.target.value });
                setError("");
              }}
              placeholder="Enter your company name"
              className={error ? "border-red-500" : ""}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <p className="text-sm text-gray-500 mt-2">
              This name will be displayed in the chat window header
            </p>
          </div>

          <div className="flex justify-end mt-6">
            <Button onClick={handleNext}>
              Next Step
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}