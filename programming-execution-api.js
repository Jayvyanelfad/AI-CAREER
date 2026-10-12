// Programming Studio secure code execution API.
//
// POST /run
//   Authorization: Bearer <supabase access token>   (required)
//   Body: { language: 'python'|'javascript', code: string, stdin?: string, lessonId?: string }
//
// The browser only talks to this endpoint. Provider credentials and the
// provider's own URL never leave the server.

const express = require('express');
const crypto = require('crypto');
const {
  PROGRAMMING_RUN_LIMITS,
  PROGRAMMING_RUN_RATE_LIMIT,
  SUPPORTED_RUN_LANGUAGES
} = require('./programming-execution-config');
const { ExecutionRateLimiter } = require('./programming-execution-limiter');
const { createExecutionProvider } = require('./programming-execution-provider');

const CLIENT_CHOSEN_TARGET_FIELDS = new Set([
  'provider', 'command', 'cmd', 'args', 'image', 'entrypoint',
  'baseurl', 'baseUrl', 'apiKey', 'api_key', 'file', 'files'
]);

function errorResponse(res, status, code, message) {
  return res.status(status).json({ ok: false, error: { code, message } });
}

function byteLength(value) {
  return Buffer.byteLength(value, 'utf8');
}

function validateRunRequest(body, limits) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { status: 400, code: 'INVALID_REQUEST', message: 'Request body must be a JSON object.' };
  }

  for (const key of Object.keys(body)) {
    if (CLIENT_CHOSEN_TARGET_FIELDS.has(key)) {
      return {
        status: 400,
        code: 'CLIENT_PROVIDER_NOT_ALLOWED',
        message: 'The execution provider cannot be chosen by the client.'
      };
    }
  }

  const { language, code, stdin, lessonId } = body;

  if (typeof language !== 'string' || !language) {
    return { status: 400, code: 'INVALID_LANGUAGE', message: 'language must be a string.' };
  }
  if (!SUPPORTED_RUN_LANGUAGES.includes(language)) {
    return {
      status: 400,
      code: 'UNSUPPORTED_LANGUAGE',
      message: 'This language is not available yet.'
    };
  }

  if (typeof code !== 'string' || code.trim().length === 0) {
    return { status: 400, code: 'EMPTY_CODE', message: 'code must be a non-empty string.' };
  }
  if (byteLength(code) > limits.maxCodeBytes) {
    return {
      status: 400,
      code: 'CODE_TOO_LARGE',
      message: `code must be at most ${limits.maxCodeBytes} bytes.`
    };
  }

  if (stdin !== undefined && stdin !== null) {
    if (typeof stdin !== 'string') {
      return { status: 400, code: 'INVALID_STDIN', message: 'stdin must be a string.' };
    }
    if (byteLength(stdin) > limits.maxStdinBytes) {
      return {
        status: 400,
        code: 'STDIN_TOO_LARGE',
        message: `stdin must be at most ${limits.maxStdinBytes} bytes.`
      };
    }
  }

  if (lessonId !== undefined && lessonId !== null) {
    if (typeof lessonId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(lessonId)) {
      return { status: 400, code: 'INVALID_LESSON_ID', message: 'lessonId is invalid.' };
    }
  }

  return null;
}

function createProgrammingExecutionRouter({
  authenticateToken,
  provider = createExecutionProvider(),
  limits = PROGRAMMING_RUN_LIMITS,
  rateLimiter = new ExecutionRateLimiter({
    maxRunsPerWindow: PROGRAMMING_RUN_RATE_LIMIT.maxRunsPerWindow,
    windowMs: PROGRAMMING_RUN_RATE_LIMIT.windowMs,
    maxConcurrentRuns: PROGRAMMING_RUN_LIMITS.maxConcurrentRuns
  }),
  logger = console
} = {}) {
  const router = express.Router();

  router.get('/status', authenticateToken, (_req, res) => {
    const available = Boolean(provider && typeof provider.isAvailable === 'function' && provider.isAvailable());
    return res.json({
      available,
      supportedLanguages: available ? SUPPORTED_RUN_LANGUAGES : [],
      blocker: available ? null : (typeof provider.reason === 'string' ? provider.reason : 'An approved external sandbox provider is not configured.')
    });
  });

  router.post('/run', authenticateToken, async (req, res) => {
    const requestId = crypto.randomUUID();
    const userId = req.user && typeof req.user.id === 'string' ? req.user.id : 'unknown';
    const logMeta = (outcome, extra = {}) => {
      // Never log source code, stdin, stdout, stderr, tokens, or credentials.
      logger.log(JSON.stringify({
        event: 'programming_run',
        requestId,
        userId,
        language: typeof req.body?.language === 'string' ? req.body.language : undefined,
        outcome,
        ...extra
      }));
    };

    const validationError = validateRunRequest(req.body, limits);
    if (validationError) {
      logMeta('rejected', { reason: validationError.code });
      return errorResponse(res, validationError.status, validationError.code, validationError.message);
    }

    const rate = rateLimiter.check(userId);
    if (!rate.allowed) {
      logMeta('rate_limited', { retryAfterMs: rate.retryAfterMs });
      res.setHeader('Retry-After', Math.ceil(rate.retryAfterMs / 1000));
      return errorResponse(
        res,
        429,
        'RATE_LIMITED',
        'Too many code executions. Please wait a moment and try again.'
      );
    }

    if (!provider || typeof provider.isAvailable !== 'function' || !provider.isAvailable()) {
      logMeta('provider_unavailable');
      return errorResponse(
        res,
        503,
        'EXECUTION_PROVIDER_UNAVAILABLE',
        'Code execution is temporarily unavailable.'
      );
    }

    const release = rateLimiter.tryAcquire();
    if (release === false) {
      logMeta('concurrency_limited');
      return errorResponse(
        res,
        429,
        'RATE_LIMITED',
        'Too many code executions. Please wait a moment and try again.'
      );
    }

    const startedAt = Date.now();
    try {
      const result = await provider.run({
        language: req.body.language,
        code: req.body.code,
        stdin: typeof req.body.stdin === 'string' ? req.body.stdin : '',
        limits
      });
      const durationMs = Number.isFinite(result.durationMs) ? result.durationMs : Date.now() - startedAt;
      logMeta(result.timedOut ? 'timed_out' : (result.exitCode === 0 ? 'succeeded' : 'finished_with_error'), {
        durationMs,
        exitCode: result.exitCode
      });
      return res.json({
        ok: true,
        result: {
          stdout: typeof result.stdout === 'string' ? result.stdout : '',
          stderr: result.timedOut
            ? 'Execution timed out.'
            : (typeof result.stderr === 'string' ? result.stderr : ''),
          exitCode: result.timedOut ? null : result.exitCode,
          durationMs,
          timedOut: Boolean(result.timedOut)
        }
      });
    } catch (error) {
      if (error && error.code === 'EXECUTION_PROVIDER_UNAVAILABLE') {
        logMeta('provider_unavailable');
        return errorResponse(res, 503, 'EXECUTION_PROVIDER_UNAVAILABLE', 'Code execution is temporarily unavailable.');
      }
      if (error && (error.code === 'EXECUTION_PROVIDER_ERROR' || error.code === 'UNSUPPORTED_LANGUAGE')) {
        logMeta('provider_error', { reason: error.code });
        return errorResponse(res, 502, 'EXECUTION_PROVIDER_ERROR', 'Code execution failed. Please try again later.');
      }
      logMeta('service_error');
      return errorResponse(res, 500, 'EXECUTION_SERVICE_ERROR', 'Code execution failed. Please try again later.');
    } finally {
      release();
    }
  });

  return router;
}

module.exports = { createProgrammingExecutionRouter, validateRunRequest };
