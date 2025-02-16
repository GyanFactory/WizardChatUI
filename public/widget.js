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

        // Connect WebSocket
        this.connectWebSocket();

        // Initialize event listeners
        this.initializeEventListeners();

        // Open chat window by default
        this.toggleChatWindow(true);
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
          width: 320px;
          background-color: ${this.config.backgroundColor};
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          display: block; /* Visible by default */
          max-height: calc(100vh - 120px);
          min-height: 400px;
        }

        .ai-chat-header {
          background-color: ${this.config.primaryColor};
          color: white;
          padding: 12px;
          border-radius: 8px 8px 0 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .ai-chat-messages {
          height: calc(100% - 120px);
          overflow-y: auto;
          padding: 12px;
          background: white;
        }

        .ai-chat-input {
          padding: 12px;
          border-top: 1px solid rgba(0,0,0,0.1);
          display: flex;
          gap: 8px;
          background: white;
          border-radius: 0 0 8px 8px;
        }

        .ai-chat-textbox {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid rgba(0,0,0,0.2);
          border-radius: 4px;
          font-family: inherit;
          resize: none;
          outline: none;
        }

        .ai-chat-textbox:focus {
          border-color: ${this.config.primaryColor};
        }

        .ai-chat-send {
          background-color: ${this.config.primaryColor};
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-family: inherit;
        }

        .ai-chat-message {
          margin-bottom: 12px;
          max-width: 85%;
          display: flex;
          flex-direction: column;
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

      // Add welcome message
      this.addMessage(this.config.welcomeMessage, 'bot');
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

    connectWebSocket() {
      try {
        // Get the current host (includes port if any)
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = window.location.host;
        const wsUrl = `${wsProtocol}//${wsHost}/ws`;

        console.log('Connecting to WebSocket:', wsUrl);
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
          console.log('WebSocket connected successfully');
        };

        this.socket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'answer') {
            this.addMessage(data.content, 'bot');
          }
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.addMessage('Sorry, there was an error connecting to the chat service.', 'bot');
        };

        this.socket.onclose = () => {
          console.log('WebSocket connection closed');
          setTimeout(() => this.connectWebSocket(), 5000); // Try to reconnect after 5 seconds
        };
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
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
      const sendMessage = () => {
        const message = input.value.trim();
        if (message && this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.addMessage(message, 'user');
          this.socket.send(JSON.stringify({
            type: 'question',
            content: message,
            configId: this.configId
          }));
          input.value = '';
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