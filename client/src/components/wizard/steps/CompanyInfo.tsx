import { useWizardStore } from "@/store/wizardStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useState } from "react";

export default function CompanyInfo() {
  const { companyName, updateConfig } = useWizardStore();
  const [error, setError] = useState("");

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
        </div>
      </Card>
    </div>
  );
}