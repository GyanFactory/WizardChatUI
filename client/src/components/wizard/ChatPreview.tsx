import { useWizardStore } from "@/store/wizardStore";
import { MessageCircle, X, Send } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function ChatPreview() {
  const {
    companyName,
    welcomeMessage,
    primaryColor,
    fontFamily,
    position,
    avatarUrl,
    bubbleStyle,
    backgroundColor,
    buttonStyle,
  } = useWizardStore();

  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative w-full h-[600px] border rounded-lg bg-gray-100 p-4">
      <div className="absolute bottom-4 right-4">
        {/* Chat Widget Button */}
        <Button
          className="ml-auto flex items-center gap-2 mb-4"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            backgroundColor: primaryColor,
            borderRadius: bubbleStyle === 'rounded' ? '9999px' : '0.5rem'
          }}
        >
          <MessageCircle className="w-4 h-4" />
          <span>Chat with us</span>
        </Button>

        {/* Chat Window */}
        {isOpen && (
          <div
            className="w-[300px] rounded-lg shadow-lg"
            style={{ backgroundColor }}
          >
            {/* Header */}
            <div
              className="p-4 rounded-t-lg flex items-center justify-between"
              style={{ backgroundColor: primaryColor }}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={companyName} />
                  ) : (
                    <div className="bg-white w-full h-full flex items-center justify-center text-blue-600 font-semibold">
                      {companyName.charAt(0)}
                    </div>
                  )}
                </Avatar>
                <span className="text-white font-medium">{companyName || 'Company Name'}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:text-white/80"
                onClick={() => setIsOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Chat Content */}
            <div className="h-[300px] p-4 overflow-y-auto bg-white">
              <div className="flex gap-3 mb-4">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={companyName} />
                  ) : (
                    <div className="bg-blue-100 w-full h-full flex items-center justify-center text-blue-600 font-semibold">
                      {companyName.charAt(0)}
                    </div>
                  )}
                </Avatar>
                <div
                  className="bg-blue-100 p-3 rounded-lg max-w-[80%]"
                  style={{
                    borderRadius: bubbleStyle === 'rounded' ? '20px' : '0.5rem'
                  }}
                >
                  {welcomeMessage || 'Hello! How can I help you today?'}
                </div>
              </div>
            </div>

            {/* Input Area */}
            <div className="p-4 border-t bg-white rounded-b-lg">
              <div className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  className="flex-1"
                />
                <Button
                  size="icon"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}