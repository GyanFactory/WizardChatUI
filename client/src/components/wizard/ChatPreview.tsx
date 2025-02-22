import { useWizardStore } from "@/store/wizardStore";
import { MessageCircle, X, Send } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

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

  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    try {
      setIsLoading(true);
      // Add user message immediately
      const userMessage: Message = { role: 'user', content: inputMessage.trim() };
      setMessages(prev => [...prev, userMessage]);
      setInputMessage('');

      // Send request to backend
      const response = await apiRequest('/api/chat/query', {
        method: 'POST',
        body: JSON.stringify({ query: userMessage.content }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      // Add assistant response
      const assistantMessage: Message = { role: 'assistant', content: data.response };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get response from the chatbot",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="relative min-h-[550px] h-full border rounded-lg bg-gray-100 p-3">
      <div className="absolute bottom-3 right-3">
        {!isOpen && (
          <Button
            className="ml-auto flex items-center gap-2 mb-3"
            onClick={() => setIsOpen(true)}
            style={{
              backgroundColor: primaryColor,
              borderRadius: bubbleStyle === 'rounded' ? '9999px' : '0.5rem'
            }}
          >
            <MessageCircle className="w-4 h-4" />
            <span>Chat with us</span>
          </Button>
        )}

        {isOpen && (
          <div
            className="w-[320px] rounded-lg shadow-lg"
            style={{ backgroundColor }}
          >
            <div
              className="p-3 rounded-t-lg flex items-center justify-between"
              style={{ backgroundColor: primaryColor }}
            >
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={companyName} />
                  ) : (
                    <div className="bg-white w-full h-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                      {companyName.charAt(0)}
                    </div>
                  )}
                </Avatar>
                <span className="text-white font-medium text-sm">{companyName || 'Company Name'}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:text-white/80 h-6 w-6"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="h-[400px] p-3 overflow-y-auto bg-white">
              {/* Welcome message */}
              <div className="flex gap-2 mb-3">
                <Avatar className="h-6 w-6 flex-shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={companyName} />
                  ) : (
                    <div className="bg-blue-100 w-full h-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                      {companyName.charAt(0)}
                    </div>
                  )}
                </Avatar>
                <div
                  className="bg-blue-100 p-2 rounded-lg max-w-[80%] text-sm"
                  style={{
                    borderRadius: bubbleStyle === 'rounded' ? '16px' : '0.5rem'
                  }}
                >
                  {welcomeMessage || 'Hello! How can I help you today?'}
                </div>
              </div>

              {/* Chat messages */}
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-2 mb-3 ${
                    message.role === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  {message.role === 'assistant' && (
                    <Avatar className="h-6 w-6 flex-shrink-0">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={companyName} />
                      ) : (
                        <div className="bg-blue-100 w-full h-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                          {companyName.charAt(0)}
                        </div>
                      )}
                    </Avatar>
                  )}
                  <div
                    className={`p-2 rounded-lg max-w-[80%] text-sm ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-blue-100'
                    }`}
                    style={{
                      borderRadius: bubbleStyle === 'rounded' ? '16px' : '0.5rem',
                      backgroundColor: message.role === 'user' ? primaryColor : undefined
                    }}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-2 border-t bg-white rounded-b-lg">
              <div className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  className="flex-1 h-8 text-sm"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                />
                <Button
                  size="icon"
                  className="h-8 w-8"
                  style={{ backgroundColor: primaryColor }}
                  onClick={handleSendMessage}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="animate-spin">⌛</span>
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}