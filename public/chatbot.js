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
      "Interview prep",
      "Interview questions",
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

    this.addMessage("bot", t("coverage.chatbotWelcome", "👋 Hi! I'm CareerPath AI Assistant. I can help with career advice, courses, resume tips, and interview prep. What would you like to know?"));
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
        this.addMessage("bot", t("coverage.chatbotNeedsLogin", "Please log in first — the AI assistant needs your account to save your conversation and give personalized advice."));
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
      const guide = this.guideReply((document.getElementById("chat-input") || {}).value || '');
      this.addMessage("bot", guide || t("coverage.chatbotConnectionError", "⚠️ Connection error. Please try again."));
    }

    this.showQuickReplies();
  }

  // Deterministic website guide used only when the AI provider cannot answer.
  // Returns a short navigation hint or null when nothing matches. Routes are
  // hard-coded to real pages; admin and private records are never referenced.
  guideReply(message) {
    const text = String(message || '').toLowerCase();
    if (!text.trim()) return null;
    const prefix = t('coverage.chatbotGuidePrefix', 'The AI assistant is unavailable right now, but I can still point you the right way.');
    const topics = [
      { keys: ['quiz', 'quizzes', 'exam', 'exams', 'final', 'grade', 'score', 'pass', 'attempt'], label: t('nav.courses', 'Courses'), route: 'courses.html' },
      { keys: ['assessment', 'result', 'results', 'career direction', 'career path', 'career test', 'take the test'], label: t('nav.careerTest', 'Career Test'), route: 'career-test.html' },
      { keys: ['recommend', 'which course', 'choose a course', 'selection'], label: t('nav.courses', 'Courses'), route: 'courses.html' },
      { keys: ['course', 'courses', 'catalog', 'learn'], label: t('nav.courses', 'Courses'), route: 'courses.html' },
      { keys: ['enrol', 'enroll', 'access', 'premium', 'locked'], label: t('nav.courses', 'Courses'), route: 'courses.html' },
      { keys: ['lesson', 'lessons', 'module', 'modules', 'curriculum'], label: t('nav.courses', 'Courses'), route: 'courses.html' },
      { keys: ['certificate', 'certificates', 'verify'], label: 'Certificate verification', route: 'certificate.html' },
      { keys: ['dashboard', 'progress', 'journey'], label: t('nav.dashboard', 'Dashboard'), route: 'dashboard.html' },
      { keys: ['profile', 'avatar', 'photo', 'account'], label: t('nav.profile', 'Profile'), route: 'profile.html' },
      { keys: ['language', 'french', 'arabic', 'rtl', 'translate', 'swahili', 'hinglish', 'hausa', 'pidgin', 'wolof'], label: t('nav.profile', 'Profile'), route: 'profile.html' },
      { keys: ['programming', 'code', 'python', 'javascript', 'run', 'sandbox', 'execution', 'error in code', 'piston'], label: t('nav.programming', 'Programming'), route: 'programming.html' },
      { keys: ['password', 'reset', 'forgot'], label: t('nav.login', 'Login'), route: 'login.html' },
      { keys: ['register', 'sign up', 'create account'], label: t('nav.register', 'Register'), route: 'register.html' },
      { keys: ['login', 'sign in'], label: t('nav.login', 'Login'), route: 'login.html' },
      { keys: ['contact', 'human', 'support', 'help'], label: 'Contact', route: 'contactus.html' }
    ];
    const hit = topics.find(topic => topic.keys.some(keyword => keyword.includes(' ')
      ? text.includes(keyword)
      : new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text)));
    if (!hit) return null;
    return `${prefix} ${hit.label}: ${hit.route}`;
  }
}

// Initialize chatbot when page loads.
// IMPORTANT: exposed as window.bot because every page's inline HTML calls
// onclick="bot.toggleChat()" — it must match this exact name.
document.addEventListener("DOMContentLoaded", () => {
  window.bot = new Chatbot();
});
