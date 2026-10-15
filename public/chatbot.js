/**
 * CareerPath AI - Text Chatbot with Database Integration
 * Conversations saved to database for persistence
 */

class Chatbot {
  constructor() {
    this.isOpen = false;
    this.messages = [];
    this.quickReplies = ["Login / Sign up", "Explore courses", "Find a course type", "Try a demo", "Practise coding", "I need help"];
    this.isSending = false;
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

    // Dedicated-page controls: the close button hides the window and reveals
    // the floating reopen button; both are guarded so other pages are unaffected.
    const closeBtn = document.getElementById("chatbot-close-btn");
    const floatingBtn = document.getElementById("floating-chatbot");
    const chatWindow = document.getElementById("chatbot-window");
    if (closeBtn && floatingBtn && chatWindow) {
      closeBtn.addEventListener("click", () => {
        chatWindow.style.display = "none";
        floatingBtn.hidden = false;
        floatingBtn.focus();
      });
      floatingBtn.addEventListener("click", () => {
        chatWindow.style.display = "flex";
        floatingBtn.hidden = true;
        if (input) input.focus();
      });
    }

    this.addMessage("bot", "Hi! I’m your CareerPath Guide 👋 I can help you find pages, courses, and demos. Choose a shortcut below or ask me where to go.");
    this.showQuickReplies();
  }

  createChatbotHTML() {
    if (document.getElementById("chatbot")) return;
    // The dedicated chatbot page already ships a complete static window;
    // building the floating widget there would duplicate every control ID
    // (chatbot-window, chatbot-body, chat-input, send-message).
    if (document.getElementById("chatbot-window")) return;

    const html = `
      <div id="chatbot">
        <button class="chatbot-button" onclick="window.bot.toggleChat()" aria-label="Open chat with CareerPath AI">
          <i class="fas fa-robot" aria-hidden="true"></i> AI Assistant
        </button>
        <div class="chatbox" id="chatbot-window" style="display: none;">
          <div class="chat-header">
            <h3><i class="fas fa-robot" aria-hidden="true"></i> Career Assistant</h3>
            <button onclick="window.bot.toggleChat()" aria-label="Close chat">
              <i class="fas fa-times" aria-hidden="true"></i>
            </button>
          </div>
          <div class="chat-body" id="chatbot-body" role="log" aria-live="polite" aria-label="Chat messages"></div>
          <div id="quick-replies" class="quick-replies"></div>
          <div class="chat-input-container">
            <input type="text" id="chat-input" placeholder="Ask about careers, courses, resume..." aria-label="Type your message" />
            <button id="send-message" aria-label="Send message"><i class="fas fa-paper-plane" aria-hidden="true"></i></button>
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
      btn.type = "button";
      btn.onclick = () => {
        const input = document.getElementById("chat-input");
        if (input) input.value = reply;
        this.sendMessage();
      };
      container.appendChild(btn);
    });
  }

  async sendMessage() {
    const input = document.getElementById("chat-input");
    if (this.isSending) return;
    const message = input.value.trim();

    if (!message) return;

    this.addMessage("user", message);
    input.value = "";

    const guide = this.guideReply(message);
    if (guide) {
      this.addMessage("bot", guide.text);
      if (guide.route) this.addActionButton(guide.label || "Open page", guide.route);
      this.showQuickReplies();
      return;
    }

    this.isSending = true;
    const sendButton = document.getElementById("send-message");
    if (sendButton) sendButton.disabled = true;

    const typingDiv = document.createElement("div");
    typingDiv.className = "message bot typing";
    typingDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Thinking...';
    document.getElementById("chatbot-body").appendChild(typingDiv);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        typingDiv.remove();
        this.addMessage("bot", "I couldn't match that to a quick website action. Try one of the shortcuts below, or sign in if you need account-specific help.");
        this.addActionButton("Go to login", "login.html");
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
      } else if (!response.ok) {
        // The AI provider is unavailable or refused the request. Offer
        // deterministic navigation help from a fixed, verified route map
        // instead of pretending the AI answered. Never links admin pages.
        const guide = this.guideReply(message);
        this.addMessage("bot", guide || data.error || t("coverage.chatbotUnknown", "❌ Sorry, I couldn't understand. Can you rephrase?"));
      } else {
        this.addMessage("bot", data.error || t("coverage.chatbotUnknown", "❌ Sorry, I couldn't understand. Can you rephrase?"));
      }
    } catch (error) {
      console.error("Chat error:", error);
      typingDiv.remove();
      // Preserve the submitted message for offline guidance; the input was cleared above.
      const fallback = this.guideReply(message);
      this.addMessage("bot", fallback ? fallback.text : "I can help with navigation, courses, and demos. Choose one of the shortcuts below.");
      if (fallback?.route) this.addActionButton(fallback.label || "Open page", fallback.route);
    }

    this.showQuickReplies();
  }

  addActionButton(label, route) {
    if (!route || /^(https?:|javascript:|\/\/)/i.test(route)) return;
    const body = document.getElementById("chatbot-body");
    if (!body) return;
    const link = document.createElement("a");
    link.className = "guide-action";
    link.href = route;
    link.textContent = label;
    link.setAttribute("aria-label", label);
    body.appendChild(link);
    body.scrollTop = body.scrollHeight;
  }

  // Local-first routing: common tasks never need a Gemini API call.
  guideReply(message) {
    const text = String(message || "").toLowerCase().replace(/[^a-z0-9\\s-]/g, " ").replace(/\\s+/g, " ").trim();
    if (!text) return null;
    const has = (...words) => words.some(word => text.includes(word));
    const go = (reply, label, route) => ({ text: reply, label, route });

    if (has("login", "log in", "sign in", "password", "forgot password", "can't access my account")) {
      return go("You can sign in here. New to CareerPath AI? Use the sign-up page to create an account.", "Go to login", "login.html");
    }
    if (has("register", "sign up", "signup", "create account", "new account", "join")) {
      return go("Let’s get your account set up. Open the registration page to create one.", "Create an account", "register.html");
    }
    if (has("demo", "try it", "try out", "sample", "show me")) {
      if (has("code", "coding", "program", "python", "javascript")) return go("Want to try coding? Open the Programming Studio.", "Open Programming Studio", "programming.html");
      return go("For a quick introduction, start with the guided platform tour. For hands-on coding, use the Programming Studio.", "View platform tour", "tour.html");
    }
    if (has("programming", "coding", "code editor", "python", "javascript", "run code", "practice code", "practise code")) {
      return go("The Programming Studio is where you can practise coding and try code examples.", "Open Programming Studio", "programming.html");
    }
    if (has("course", "courses", "catalog", "catalogue", "learn", "learning", "curriculum", "lesson", "module", "enroll", "enrol")) {
      if (has("ai", "artificial intelligence", "machine learning", "ml")) return go("Browse the course catalogue to explore AI and machine-learning learning options.", "Explore courses", "courses.html");
      if (has("cyber", "security")) return go("Browse the catalogue for cybersecurity-related learning options.", "Browse courses", "courses.html");
      if (has("data", "analytics")) return go("Browse the catalogue for data and analytics learning options.", "Browse courses", "courses.html");
      return go("Start in the course catalogue. Open a course to review its topics and decide whether it fits your level.", "Explore courses", "courses.html");
    }
    if (has("career test", "assessment", "career path", "career direction", "test result")) {
      return go("The Career Test helps you explore possible directions. Open it to get started.", "Open Career Test", "career-test.html");
    }
    if (has("dashboard", "progress", "my learning", "my courses")) {
      return go("Your dashboard is the place to check your learning overview and progress.", "Open dashboard", "dashboard.html");
    }
    if (has("profile", "account settings", "change my name", "change language", "language")) {
      return go("Open your profile to review your account details and available preferences.", "Open profile", "profile.html");
    }
    if (has("contact", "support", "human", "contact us", "need help")) {
      return go("Open the Contact page to find the platform’s support options.", "Contact support", "contactus.html");
    }
    if (has("what is this website", "purpose of this website", "what can i do", "how do i use", "where do i start", "i am lost", "i'm lost", "help me")) {
      return go("CareerPath AI helps you explore courses, take a career test, and practise programming. You can start with courses or take the guided tour.", "Explore courses", "courses.html");
    }
    return null;
  }
}

// Initialize chatbot when page loads.
// IMPORTANT: exposed as window.bot because every page's inline HTML calls
// onclick="bot.toggleChat()" — it must match this exact name.
document.addEventListener("DOMContentLoaded", () => {
  window.bot = new Chatbot();
});
