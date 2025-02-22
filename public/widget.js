(function() {
  class ChatWidget {
    constructor(configId) {
      this.configId = configId;
      this.config = null;
      this.socket = null;
      this.container = null;
      this.init();
    }

    async init() {
      try {
        console.log('Initializing chat widget...');
        // Fetch chatbot configuration
        const response = await fetch(`/api/chatbot-config/${this.configId}`);
        if (!response.ok) throw new Error('Failed to load chatbot configuration');
        const data = await response.json();
        this.config = data.config;

        // Create and inject styles
        this.injectStyles();

        // Create widget DOM
        this.createWidgetDOM();

        // Initialize event listeners
        this.initializeEventListeners();

        // Open chat window by default
        this.toggleChatWindow(true);

        // Add welcome message
        this.addMessage(this.config.welcomeMessage || "Hi! How can I help you today?", 'bot');
      } catch (error) {
        console.error('Failed to initialize chat widget:', error);
      }
    }

    injectStyles() {
      const styles = `
        .ai-chat-widget {
          position: fixed;
          ${this.config.position === 'right' ? 'right: 20px' : 'left: 20px'};
          bottom: 20px;
          font-family: ${this.config.fontFamily}, system-ui, sans-serif;
          z-index: 999999;
          display: flex;
          flex-direction: column;
          align-items: ${this.config.position === 'right' ? 'flex-end' : 'flex-start'};
        }

        .ai-chat-button {
          background-color: ${this.config.primaryColor};
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: ${this.config.bubbleStyle === 'rounded' ? '9999px' : '8px'};
          cursor: pointer;
          display: none; /* Hidden by default */
          align-items: center;
          gap: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          transition: transform 0.2s;
        }

        .ai-chat-button:hover {
          transform: translateY(-2px);
        }

        .ai-chat-window {
          position: absolute;
          bottom: 80px;
          ${this.config.position === 'right' ? 'right: 0' : 'left: 0'};
          width: 280px;
          background-color: ${this.config.backgroundColor};
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          display: block; /* Visible by default */
          max-height: 360px;
          min-height: 360px;
          font-size: 14px;
        }

        .ai-chat-header {
          background-color: ${this.config.primaryColor};
          color: white;
          padding: 10px 12px;
          border-radius: 8px 8px 0 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 14px;
        }

        .ai-chat-messages {
          height: 240px;
          overflow-y: auto;
          padding: 12px;
          background: white;
        }

        .ai-chat-input {
          padding: 8px;
          border-top: 1px solid rgba(0,0,0,0.1);
          display: flex;
          gap: 8px;
          background: white;
          border-radius: 0 0 8px 8px;
        }

        .ai-chat-textbox {
          flex: 1;
          padding: 6px 10px;
          border: 1px solid rgba(0,0,0,0.2);
          border-radius: 4px;
          font-family: inherit;
          font-size: 14px;
          resize: none;
          outline: none;
          height: 32px;
        }

        .ai-chat-send {
          background-color: ${this.config.primaryColor};
          color: white;
          border: none;
          width: 32px;
          height: 32px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          cursor: pointer;
          font-family: inherit;
        }

        .ai-chat-message {
          margin-bottom: 10px;
          max-width: 85%;
          display: flex;
          flex-direction: column;
          font-size: 14px;
        }

        .ai-chat-message.bot {
          align-items: flex-start;
        }

        .ai-chat-message.user {
          align-items: flex-end;
          margin-left: auto;
        }

        .ai-chat-bubble {
          padding: 10px 14px;
          border-radius: ${this.config.bubbleStyle === 'rounded' ? '16px' : '4px'};
          position: relative;
          word-wrap: break-word;
        }

        .ai-chat-message.bot .ai-chat-bubble {
          background-color: #f0f0f0;
          color: #333;
        }

        .ai-chat-message.user .ai-chat-bubble {
          background-color: ${this.config.primaryColor};
          color: white;
        }

        .typing-indicator {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .typing-indicator span {
          display: inline-block;
          width: 8px;
          height: 8px;
          background-color: #ccc;
          border-radius: 50%;
          animation: typing-blink 1s ease-in-out infinite;
        }

        @keyframes typing-blink {
          0% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }
      `;

      const styleSheet = document.createElement('style');
      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);
    }

    createWidgetDOM() {
      // Create main container
      this.container = document.createElement('div');
      this.container.className = 'ai-chat-widget';

      // Create toggle button (initially hidden)
      const button = document.createElement('button');
      button.className = 'ai-chat-button';
      button.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        Chat with us
      `;

      // Create chat window (initially visible)
      const chatWindow = document.createElement('div');
      chatWindow.className = 'ai-chat-window';
      chatWindow.innerHTML = `
        <div class="ai-chat-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center; color: ${this.config.primaryColor}">
              ${this.config.avatarUrl ? `<img src="${this.config.avatarUrl}" alt="" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` : this.config.companyName.charAt(0)}
            </div>
            <span>${this.config.companyName}</span>
          </div>
          <button class="ai-chat-close" style="background: none; border: none; color: white; cursor: pointer;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="ai-chat-messages"></div>
        <div class="ai-chat-input">
          <input type="text" class="ai-chat-textbox" placeholder="Type your message...">
          <button class="ai-chat-send">Send</button>
        </div>
      `;

      // Append elements
      this.container.appendChild(chatWindow);
      this.container.appendChild(button);
      document.body.appendChild(this.container);
    }

    toggleChatWindow(show) {
      const chatWindow = this.container.querySelector('.ai-chat-window');
      const chatButton = this.container.querySelector('.ai-chat-button');

      chatWindow.style.display = show ? 'block' : 'none';
      chatButton.style.display = show ? 'none' : 'flex';

      if (show) {
        const input = this.container.querySelector('.ai-chat-textbox');
        input?.focus();
      }
    }


    async sendMessageToAPI(message) {
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            configId: this.configId,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get response from chat API');
        }

        const data = await response.json();
        return data.response;
      } catch (error) {
        console.error('Error sending message:', error);
        return 'Sorry, I encountered an error processing your request.';
      }
    }

    initializeEventListeners() {
      const button = this.container.querySelector('.ai-chat-button');
      const closeBtn = this.container.querySelector('.ai-chat-close');
      const input = this.container.querySelector('.ai-chat-textbox');
      const sendBtn = this.container.querySelector('.ai-chat-send');

      // Toggle chat window
      button.addEventListener('click', () => {
        this.toggleChatWindow(true);
      });

      closeBtn.addEventListener('click', () => {
        this.toggleChatWindow(false);
      });

      // Send message
      const sendMessage = async () => {
        const message = input.value.trim();
        if (message) {
          this.addMessage(message, 'user');
          input.value = '';

          // Show typing indicator
          const typingIndicator = this.addTypingIndicator();

          // Get response from API
          const response = await this.sendMessageToAPI(message);

          // Remove typing indicator
          typingIndicator.remove();

          // Add response
          this.addMessage(response, 'bot');
        }
      };

      sendBtn.addEventListener('click', sendMessage);
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });
    }

    addTypingIndicator() {
      const messagesContainer = this.container.querySelector('.ai-chat-messages');
      const indicatorDiv = document.createElement('div');
      indicatorDiv.className = 'ai-chat-message bot';
      indicatorDiv.innerHTML = `
        <div class="ai-chat-bubble typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      `;
      messagesContainer.appendChild(indicatorDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      return indicatorDiv;
    }

    addMessage(content, type) {
      const messagesContainer = this.container.querySelector('.ai-chat-messages');
      const messageDiv = document.createElement('div');
      messageDiv.className = `ai-chat-message ${type}`;
      messageDiv.innerHTML = `<div class="ai-chat-bubble">${content}</div>`;
      messagesContainer.appendChild(messageDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  // Expose global function
  window.aiChat = function(action, configId) {
    if (action === 'init') {
      console.log('Initializing chat widget with config ID:', configId);
      new ChatWidget(configId);
    }
  };
})();