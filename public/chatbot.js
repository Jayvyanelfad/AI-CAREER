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
      "Interview questions"
      "What the purpose of this website?",
    ];
    this.init();
  }

  init() {
    // Only build the widget if the page didn't already include its own
    // #chatbot markup (index.html ships one inline).
    this.createChatbotHTML();

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

    this.addMessage("bot", "👋 Hi! I'm CareerPath AI Assistant. I can help with career advice, courses, resume tips, and interview prep. What would you like to know?");
    this.showQuickReplies();
  }

  createChatbotHTML() {
    if (document.getElementById("chatbot")) return;

    const html = `
      <div id="chatbot">
        <button class="chatbot-button" onclick="window.bot.toggleChat()">
          <i class="fas fa-robot"></i> AI Assistant
        </button>
        <div class="chatbox" id="chatbot-window" style="display: none;">
          <div class="chat-header">
            <h3><i class="fas fa-robot"></i> Career Assistant</h3>
            <button onclick="window.bot.toggleChat()">
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
    if (!chatWindow) return;
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

    this.addMessage("user", message);
    input.value = "";

    const typingDiv = document.createElement("div");
    typingDiv.className = "message bot typing";
    typingDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Thinking...';
    document.getElementById("chatbot-body").appendChild(typingDiv);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        typingDiv.remove();
        this.addMessage("bot", "Please log in first — the AI assistant needs your account to save your conversation and give personalized advice.");
        this.showQuickReplies();
        return;
      }

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();
      typingDiv.remove();

      if (response.ok && data.reply) {
        this.addMessage("bot", data.reply);
      } else {
        this.addMessage("bot", data.error || "❌ Sorry, I couldn't understand. Can you rephrase?");
      }
    } catch (error) {
      console.error("Chat error:", error);
      typingDiv.remove();
      this.addMessage("bot", "⚠️ Connection error. Please try again.");
    }

    this.showQuickReplies();
  }
}

// Initialize chatbot when page loads.
// IMPORTANT: exposed as window.bot because every page's inline HTML calls
// onclick="bot.toggleChat()" — it must match this exact name.
document.addEventListener("DOMContentLoaded", () => {
  window.bot = new Chatbot();
});
