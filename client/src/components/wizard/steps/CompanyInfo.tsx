import { useWizardStore } from "@/store/wizardStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export default function CompanyInfo() {
  const { companyName, updateConfig } = useWizardStore();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4">Company Information</h2>
        <p className="text-gray-600 mb-6">
          Let's start by setting up your company details for the chatbot.
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name</Label>
          <Input
            id="companyName"
            value={companyName}
            onChange={(e) => updateConfig({ companyName: e.target.value })}
            placeholder="Enter your company name"
          />
          <p className="text-sm text-gray-500 mt-2">
            This name will be displayed in the chat window header
          </p>
        </div>
      </Card>
    </div>
  );
}