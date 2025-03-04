import { useWizardStore } from "@/store/wizardStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

export default function CompanyInfo() {
  const { companyName, welcomeMessage, updateConfig } = useWizardStore();
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
        <div className="space-y-6">
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
            <p className="text-sm text-gray-500">
              This name will be displayed in the chat window header
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="welcomeMessage">
              Welcome Message <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="welcomeMessage"
              value={welcomeMessage}
              onChange={(e) => updateConfig({ welcomeMessage: e.target.value })}
              placeholder="Example: Hi there! 👋 How can I assist you today?"
              className="resize-none"
              rows={3}
            />
            <p className="text-sm text-gray-500">
              This message will be shown when users first open the chat. Use emojis to make it friendly!
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}