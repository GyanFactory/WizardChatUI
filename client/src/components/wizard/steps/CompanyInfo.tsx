import { useWizardStore } from "@/store/wizardStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

export default function CompanyInfo() {
  const { companyName, welcomeMessage, updateConfig } = useWizardStore();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4">Company Information</h2>
        <p className="text-gray-600 mb-6">
          Let's start by setting up your company details for the chatbot.
        </p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name</Label>
          <Input
            id="companyName"
            value={companyName}
            onChange={(e) => updateConfig({ companyName: e.target.value })}
            placeholder="Enter your company name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="welcomeMessage">Welcome Message</Label>
          <Textarea
            id="welcomeMessage"
            value={welcomeMessage}
            onChange={(e) => updateConfig({ welcomeMessage: e.target.value })}
            placeholder="Enter the welcome message for your chatbot"
            rows={4}
          />
        </div>
      </Card>
    </div>
  );
}
