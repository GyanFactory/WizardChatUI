import { useWizardStore } from "@/store/wizardStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

export default function CompanyInfo() {
  const { companyName, updateConfig, setAppId } = useWizardStore();
  const { mutate: createApp, isPending } = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/chatbot-config", {
        method: "POST",
        body: JSON.stringify({ companyName }),
      });
      return response.config;
    },
    onSuccess: (data) => {
      setAppId(data.id);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create chatbot configuration",
        variant: "destructive",
      });
    },
  });

  const handleNext = () => {
    if (!companyName.trim()) {
      toast({
        title: "Error",
        description: "Company name is required",
        variant: "destructive",
      });
      return;
    }
    createApp();
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