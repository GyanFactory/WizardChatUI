import { useWizardStore } from "@/store/wizardStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Copy, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

export default function Embed() {
  const config = useWizardStore();
  const [copied, setCopied] = useState(false);

  // Generate the configuration object for the chatbot
  const chatbotConfig = {
    companyName: config.companyName,
    welcomeMessage: config.welcomeMessage,
    primaryColor: config.primaryColor,
    fontFamily: config.fontFamily,
    position: config.position,
    avatarUrl: config.avatarUrl,
    bubbleStyle: config.bubbleStyle,
    backgroundColor: config.backgroundColor,
    buttonStyle: config.buttonStyle,
    qaItems: config.qaItems,
  };

  // Generate the embed code
  const embedCode = `
<!-- Chatbot Widget -->
<script>
  window.CHATBOT_CONFIG = ${JSON.stringify(chatbotConfig, null, 2)};
</script>
<script 
  src="https://your-chatbot-url.com/widget.js" 
  defer
></script>
`.trim();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Embed code copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4">Get Embed Code</h2>
        <p className="text-gray-600 mb-6">
          Copy the code below and paste it into your website's HTML before the
          closing {'</body>'} tag.
        </p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="relative">
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono">
            {embedCode}
          </pre>
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-2 right-2"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-4 w-4 mr-2" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            {copied ? "Copied!" : "Copy Code"}
          </Button>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Implementation Instructions</h3>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              1. Copy the code above and paste it into your website's HTML.
            </p>
            <p className="text-sm text-gray-600">
              2. Place it before the closing {'</body>'} tag for optimal loading.
            </p>
            <p className="text-sm text-gray-600">
              3. The chatbot will automatically initialize with your configurations.
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-800 mb-2">
              <ShieldAlert className="h-5 w-5" />
              <h4 className="font-medium">Important Notes</h4>
            </div>
            <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1">
              <li>Ensure your website uses HTTPS for secure communication</li>
              <li>The chatbot requires JavaScript to be enabled in the browser</li>
              <li>
                Test the integration on a staging environment before deploying to
                production
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
