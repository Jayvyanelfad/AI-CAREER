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
    // Guard against double initialization (e.g. the script being evaluated
    // twice): re-binding would duplicate every handler and welcome message.
    // The flag is global because each `new Chatbot()` gets a fresh instance.
    if (window.__careerpathChatbotBound) return;
    window.__careerpathChatbotBound = true;
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

    this.addMessage("bot", t("coverage.chatbotWelcome", "Hi! I’m your CareerPath Guide 👋 I can help you find pages, courses, and demos. Choose a shortcut below or ask me where to go."));
    this.showQuickReplies();
    // Dictionaries load asynchronously: the welcome above may have rendered
    // in the fallback language. Re-localize widget chrome (and an untouched
    // welcome) whenever the language changes.
    document.addEventListener('careerpath:language-change', () => this.relocalize());
  }

  relocalize() {
    const launcherText = document.querySelector('[data-chatbot-open] span');
    if (launcherText) launcherText.textContent = t('coverage.chatbotLauncherText', 'AI Assistant');
    const openBtn = document.querySelector('[data-chatbot-open]');
    if (openBtn) openBtn.setAttribute('aria-label', t('coverage.chatbotOpenChat', 'Open chat with CareerPath AI'));
    const panel = document.getElementById('chatbot-window');
    if (panel) panel.setAttribute('aria-label', t('coverage.chatbotDialogTitle', 'Career assistant chat'));
    const closer = document.querySelector('[data-chatbot-close]');
    if (closer) closer.setAttribute('aria-label', t('coverage.chatbotCloseChat', 'Close chat'));
    const input = document.getElementById('chat-input');
    if (input) {
      input.setAttribute('placeholder', t('coverage.chatbotInputPlaceholder', 'Ask about careers, courses, resume...'));
      input.setAttribute('aria-label', t('coverage.chatbotInputLabel', 'Type your message'));
    }
    const sendBtn = document.getElementById('send-message');
    if (sendBtn) sendBtn.setAttribute('aria-label', t('coverage.chatbotSendLabel', 'Send message'));
    const log = document.getElementById('chatbot-body');
    if (log) log.setAttribute('aria-label', t('coverage.chatbotLogLabel', 'Chat messages'));
    const header = document.querySelector('#chatbot .chat-header h3');
    // Keep markup (icon) intact while translating the header text.
    if (header) {
      const icon = header.querySelector('i');
      header.textContent = t('coverage.chatbotHeaderText', 'Career Assistant');
      if (icon) header.prepend(icon, document.createTextNode(' '));
    }
    // Only the pristine welcome (no conversation yet) is re-worded; real
    // history is never rewritten.
    if (this.messages.length === 1 && this.messages[0].sender === 'bot' && log) {
      const fresh = t("coverage.chatbotWelcome", "Hi! I’m your CareerPath Guide 👋 I can help you find pages, courses, and demos. Choose a shortcut below or ask me where to go.");
      this.messages[0].text = fresh;
      const first = log.querySelector('.message.bot');
      if (first) first.textContent = fresh;
    }
  }

  createChatbotHTML() {
    if (document.getElementById("chatbot")) return;
    // The dedicated chatbot page already ships a complete static window;
    // building the floating widget there would duplicate every control ID
    // (chatbot-window, chatbot-body, chat-input, send-message).
    if (document.getElementById("chatbot-window")) return;

    // Widget chrome keeps literal English labels (also asserted by the
    // static regression suite); relocalize() translates them once the
    // dictionaries arrive. Only interpolated values are escaped.
    const html = `
      <div id="chatbot">
        <button type="button" class="chatbot-button" data-chatbot-open aria-expanded="false" aria-controls="chatbot-window" aria-label="Open chat with CareerPath AI">
          <i class="fas fa-robot" aria-hidden="true"></i> <span>AI Assistant</span>
        </button>
        <div class="chatbox" id="chatbot-window" role="dialog" aria-modal="false" aria-label="Career assistant chat" style="display: none;">
          <div class="chat-header">
            <h3><i class="fas fa-robot" aria-hidden="true"></i> Career Assistant</h3>
            <button type="button" data-chatbot-close aria-label="Close chat">
              <i class="fas fa-times" aria-hidden="true"></i>
            </button>
          </div>
          <div class="chat-body" id="chatbot-body" role="log" aria-live="polite" aria-label="Chat messages"></div>
          <div id="quick-replies" class="quick-replies"></div>
          <div class="chat-input-container">
            <input type="text" id="chat-input" placeholder="Ask about careers, courses, resume..." aria-label="Type your message" />
            <button type="button" id="send-message" aria-label="Send message"><i class="fas fa-paper-plane" aria-hidden="true"></i></button>
          </div>
        </div>
      </div>
    `;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    document.body.appendChild(wrapper);
    const launcher = wrapper.querySelector('[data-chatbot-open]');
    const panel = wrapper.querySelector('#chatbot-window');
    const closer = wrapper.querySelector('[data-chatbot-close]');
    if (launcher) launcher.addEventListener('click', () => this.toggleChat());
    if (closer) closer.addEventListener('click', () => this.toggleChat());
    if (panel) panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') this.toggleChat(false);
    });
  }

  toggleChat(force) {
    const chatWindow = document.getElementById("chatbot-window");
    if (!chatWindow) return;
    this.isOpen = typeof force === 'boolean' ? force : !this.isOpen;
    chatWindow.style.display = this.isOpen ? "flex" : "none";
    const launcher = document.querySelector('[data-chatbot-open]');
    if (launcher) launcher.setAttribute('aria-expanded', String(this.isOpen));
    const focusTarget = this.isOpen
      ? document.getElementById("chat-input")
      : launcher;
    if (focusTarget && typeof focusTarget.focus === 'function') focusTarget.focus();
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

    const done = () => {
      this.isSending = false;
      if (sendButton) sendButton.disabled = false;
    };

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        typingDiv.remove();
        const notice = t("coverage.chatbotGuideLogin", "I couldn't match that to a quick website action. Try one of the shortcuts below, or sign in if you need account-specific help.");
        // State the signed-out notice once: consecutive unmatched follow-ups
        // must not stack identical messages and action buttons.
        const lastBot = [...this.messages].reverse().find(entry => entry.sender === "bot");
        if (!(lastBot && lastBot.text === notice)) {
          this.addMessage("bot", notice);
          this.addActionButton("Go to login", "login.html");
        }
        done();
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
        this.addMessage("bot", data.error || "The guide is temporarily unavailable. Please try one of the shortcuts below.");
        this.showQuickReplies();
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

    done();
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
    const text = String(message || "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
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
    if (has("certificate", "certificates", "verify", "certification")) {
      return go("Certificates are issued per course after you complete the lessons and pass the final assessment. You can verify an issued certificate at any time.", "Verify a certificate", "certificate.html");
    }
    if (has("exam", "exams", "quiz", "quizzes", "final", "grade", "attempt") || (has("score") && !has("career"))) {
      return go("Exams unlock from inside an enrolled course. Open the course catalogue to find your course and check its final assessment.", "Explore courses", "courses.html");
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
// IMPORTANT: exposed as window.bot because some pages call
// bot.toggleChat() — it must match this exact name.
document.addEventListener("DOMContentLoaded", () => {
  if (window.bot) return;
  window.bot = new Chatbot();
});
