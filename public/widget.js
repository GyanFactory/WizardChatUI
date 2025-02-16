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
          font-family: ${this.config.fontFamily};
          z-index: 999999;
        }

        .ai-chat-button {
          background-color: ${this.config.primaryColor};
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: ${this.config.bubbleStyle === 'rounded' ? '9999px' : '8px'};
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .ai-chat-window {
          position: fixed;
          ${this.config.position === 'right' ? 'right: 20px' : 'left: 20px'};
          bottom: 80px;
          width: 320px;
          background-color: ${this.config.backgroundColor};
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          display: none;
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
          height: 300px;
          overflow-y: auto;
          padding: 12px;
        }

        .ai-chat-input {
          padding: 12px;
          border-top: 1px solid rgba(0,0,0,0.1);
          display: flex;
          gap: 8px;
        }

        .ai-chat-textbox {
          flex: 1;
          padding: 8px;
          border: 1px solid rgba(0,0,0,0.2);
          border-radius: 4px;
        }

        .ai-chat-send {
          background-color: ${this.config.primaryColor};
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        }

        .ai-chat-message {
          margin-bottom: 8px;
          max-width: 80%;
        }

        .ai-chat-message.bot {
          margin-right: auto;
        }

        .ai-chat-message.user {
          margin-left: auto;
          text-align: right;
        }

        .ai-chat-bubble {
          display: inline-block;
          padding: 8px 12px;
          border-radius: ${this.config.bubbleStyle === 'rounded' ? '16px' : '4px'};
        }

        .ai-chat-message.bot .ai-chat-bubble {
          background-color: #f0f0f0;
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

      // Create toggle button
      const button = document.createElement('button');
      button.className = 'ai-chat-button';
      button.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        Chat with us
      `;

      // Create chat window
      const chatWindow = document.createElement('div');
      chatWindow.className = 'ai-chat-window';
      chatWindow.innerHTML = `
        <div class="ai-chat-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center; color: ${this.config.primaryColor}">
              ${this.config.avatarUrl ? `<img src="${this.config.avatarUrl}" alt="" style="width: 100%; height: 100%; border-radius: 50%;">` : this.config.companyName.charAt(0)}
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
      const messagesContainer = chatWindow.querySelector('.ai-chat-messages');
      this.addMessage(this.config.welcomeMessage, 'bot');
    }

    connectWebSocket() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      this.socket = new WebSocket(wsUrl);
      
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
    }

    initializeEventListeners() {
      const button = this.container.querySelector('.ai-chat-button');
      const closeBtn = this.container.querySelector('.ai-chat-close');
      const chatWindow = this.container.querySelector('.ai-chat-window');
      const input = this.container.querySelector('.ai-chat-textbox');
      const sendBtn = this.container.querySelector('.ai-chat-send');

      // Toggle chat window
      button.addEventListener('click', () => {
        chatWindow.style.display = chatWindow.style.display === 'none' ? 'block' : 'none';
      });

      closeBtn.addEventListener('click', () => {
        chatWindow.style.display = 'none';
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
        if (e.key === 'Enter') sendMessage();
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
      new ChatWidget(configId);
    }
  };
})();
