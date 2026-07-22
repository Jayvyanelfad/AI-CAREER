/**
 * CareerPath AI - Text Chatbot with Database Integration
 * Conversations saved to database for persistence
 */

class Chatbot {
  constructor() {
    this.isOpen = false;
    this.messages = [];
    this.quickReplies = [
      "Career recommendations",
      "Best courses for me",
      "Resume tips",
      "Interview prep"
    ];
    this.init();
  }

  init() {
    // Create chatbot HTML if not exists
    this.createChatbotHTML();

    // Set up event listeners
    const sendBtn = document.getElementById("send-message");
    const input = document.getElementById("chat-input");

    if (sendBtn) {
      sendBtn.addEventListener("click", () => this.sendMessage());
    }

    if (input) {
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }

    // Show welcome message
    this.addMessage("bot", "👋 Hi! I'm CareerPath AI Assistant. I can help with career advice, courses, resume tips, and interview prep. What would you like to know?");
    this.showQuickReplies();
  }

  createChatbotHTML() {
    // Check if already exists
    if (document.getElementById("chatbot")) return;

    const html = `
      <div id="chatbot">
        <button class="chatbot-button" onclick="window.chatbotInstance?.toggleChat?.()">
          <i class="fas fa-robot"></i> AI Assistant
        </button>
        <div class="chatbox" id="chatbot-window" style="display: none;">
          <div class="chat-header">
            <h3><i class="fas fa-robot"></i> Career Assistant</h3>
            <button onclick="window.chatbotInstance?.toggleChat?.()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="chat-body" id="chatbot-body"></div>
          <div id="quick-replies" class="quick-replies"></div>
          <div class="chat-input-container">
            <input type="text" id="chat-input" placeholder="Ask about careers, courses, resume..." />
            <button id="send-message"><i class="fas fa-paper-plane"></i></button>
          </div>
        </div>
      </div>
    `;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    document.body.appendChild(wrapper);
  }

  toggleChat() {
    const chatWindow = document.getElementById("chatbot-window");
    this.isOpen = !this.isOpen;
    chatWindow.style.display = this.isOpen ? "flex" : "none";
  }

  addMessage(sender, text) {
    const chatBody = document.getElementById("chatbot-body");
    if (!chatBody) {
      console.error("Chat body not found");
      return;
    }

    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${sender}`;
    messageDiv.textContent = text;
    chatBody.appendChild(messageDiv);
    chatBody.scrollTop = chatBody.scrollHeight;

    this.messages.push({ sender, text });
  }

  showQuickReplies() {
    const container = document.getElementById("quick-replies");
    if (!container) return;

    container.innerHTML = "";
    this.quickReplies.forEach((reply) => {
      const btn = document.createElement("button");
      btn.className = "quick-reply-btn";
      btn.textContent = reply;
      btn.onclick = () => {
        document.getElementById("chat-input").value = reply;
        this.sendMessage();
      };
      container.appendChild(btn);
    });
  }

  async sendMessage() {
    const input = document.getElementById("chat-input");
    const message = input.value.trim();

    if (!message) return;

    // Add user message
    this.addMessage("user", message);
    input.value = "";

    // Show typing indicator
    const typingDiv = document.createElement("div");
    typingDiv.className = "message bot typing";
    typingDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Thinking...';
    document.getElementById("chatbot-body").appendChild(typingDiv);

    try {
      const token = localStorage.getItem("token");

      // Call backend API
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();

      // Remove typing indicator
      typingDiv.remove();

      if (data.reply) {
        this.addMessage("bot", data.reply);
      } else {
        this.addMessage("bot", "❌ Sorry, I couldn't understand. Can you rephrase?");
      }
    } catch (error) {
      console.error("Chat error:", error);
      typingDiv.remove();
      this.addMessage("bot", "⚠️ Connection error. Please try again.");
    }

    // Show quick replies again
    this.showQuickReplies();
  }
}

// Initialize chatbot when page loads
document.addEventListener("DOMContentLoaded", () => {
  window.chatbotInstance = new Chatbot();
});
