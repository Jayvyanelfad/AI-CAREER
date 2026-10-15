// Chat history API. The chat_history table is snake_case (user_id, message,
// response, created_at); every query here must use those column names.
const express = require('express');

function createChatRouter({ supabase, authenticateToken, generateReply, logger = console }) {
  const router = express.Router();

  // AI Chatbot endpoint (keep same logic)
  router.post('/ai/chat', authenticateToken, async (req, res) => {
    try {
      const { message } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      let text;
      try {
        const assistantMode = req.body?.assistantMode === 'admin' ? 'admin' : 'student';
        const claims = req.user || {};
        const appRole = claims.app_metadata?.role || claims.app_metadata?.user_role;
        const userRole = claims.user_metadata?.role || claims.user_metadata?.user_role;
        const role = String(claims.role || appRole || userRole || '').toLowerCase();
        if (assistantMode === 'admin' && !['admin', 'super_admin', 'superadmin'].includes(role)) {
          return res.status(403).json({ error: 'Administrator access is required for the admin assistant.' });
        }
        text = await generateReply(message, { ...claims, verifiedAssistantRole: assistantMode === 'admin' ? role : 'student' });
      } catch (error) {
        if ((error.error && error.error.code === 429) || error.status === 429) {
          return res.status(503).json({ error: 'AI service temporarily unavailable due to quota exceeded. Please try again later.' });
        }
        throw error;
      }

      // Save chat history using Supabase
      const { error: chatError } = await supabase
        .from('chat_history')
        .insert({
          user_id: req.user.id,
          message: message,
          response: text
        });

      if (chatError) {
        // Report the reply but do not claim it was persisted.
        (logger.warn || logger.error).call(logger, 'Failed to save chat history:', chatError);
        return res.json({ reply: text, persisted: false });
      }

      res.json({ reply: text, persisted: true });
    } catch (error) {
      const status = Number(error?.status);
      // Keep provider details and secrets out of public responses.
      if (status === 400) {
        return res.status(400).json({ error: error.message || 'Invalid chat message' });
      }
      if (status === 429 || status === 503) {
        return res.status(503).json({
          error: status === 429
            ? 'AI service is temporarily busy. Please try again shortly.'
            : 'AI assistant is not configured or is temporarily unavailable.'
        });
      }
      console.error('AI chat error:', status || 'provider error');
      return res.status(502).json({ error: 'The AI assistant could not generate a response. Please try again.' });
    }
  });

  router.get('/chat/history', authenticateToken, async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        history: data.map(chat => ({
          message: chat.message,
          response: chat.response,
          timestamp: chat.created_at
        }))
      });
    } catch (error) {
      console.error('Chat history error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.delete('/chat/clear', authenticateToken, async (req, res) => {
    try {
      const { error } = await supabase
        .from('chat_history')
        .delete()
        .eq('user_id', req.user.id);

      if (error) {
        return res.status(500).json({ error: 'Failed to clear chat history' });
      }

      res.json({ message: 'Chat history cleared' });
    } catch (error) {
      console.error('Clear chat error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

module.exports = { createChatRouter };
