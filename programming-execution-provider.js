// Secure execution provider abstraction.
//
// The CareerPath web process NEVER executes student code. It only forwards
// the request to an isolated sandbox provider over its API, enforces our own
// limits, and normalizes the result.
//
// Provider contract:
//
//   provider.run({ language, code, stdin, limits }) => {
//     stdout: string,
//     stderr: string,
//     exitCode: number | null,
//     durationMs: number,
//     timedOut: boolean
//   }
//
//   provider.isAvailable() => boolean
//
// Environment configuration:
//
//   PROGRAMMING_EXECUTION_PROVIDER=piston   -> use the Piston API provider
//   PISTON_BASE_URL=https://emkc.org        -> base URL of a Piston server
//   PISTON_API_KEY=...                      -> optional bearer token
//   PISTON_PYTHON_VERSION / PISTON_JAVASCRIPT_VERSION -> optional pinned versions
//
// Any other (or missing) value means no provider is configured. In that case
// the API answers EXECUTION_PROVIDER_UNAVAILABLE and nothing is executed
// locally. There is intentionally NO local fallback.

const { SUPPORTED_RUN_LANGUAGES } = require('./programming-execution-config');

const UNSUPPORTED_LANGUAGE_ERROR = 'UNSUPPORTED_LANGUAGE';

// Provider endpoints are configuration, never client input. Still validate
// them defensively so a typo or hostile deployment setting cannot turn this
// API into a request proxy to localhost, a private IP, or an HTTP endpoint.
function normalizePistonBaseUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return null;
    if (!hostname.includes('.') || hostname === 'localhost' || hostname.endsWith('.local') || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':')) return null;
    return url.toString().replace(/\/+$/, '');
  } catch (_error) {
    return null;
  }
}

function truncateOutput(text, maxBytes) {
  if (typeof text !== 'string' || text.length === 0) return '';
  const buffer = Buffer.from(text, 'utf8');
  if (buffer.length <= maxBytes) return text;
  return `${buffer.subarray(0, maxBytes).toString('utf8')}\n[output truncated]`;
}

// Wrap a raw provider result with our size limits. Never throws.
function normalizeProviderResult(raw, limits, startedAt) {
  const durationMs = Number.isFinite(raw && raw.durationMs)
    ? raw.durationMs
    : Math.max(0, Date.now() - startedAt);
  return {
    stdout: truncateOutput(typeof raw?.stdout === 'string' ? raw.stdout : '', limits.maxOutputBytes),
    stderr: truncateOutput(typeof raw?.stderr === 'string' ? raw.stderr : '', limits.maxOutputBytes),
    exitCode: typeof raw?.exitCode === 'number' ? raw.exitCode : (raw?.exitCode === null ? null : 1),
    durationMs,
    timedOut: Boolean(raw?.timedOut)
  };
}

// --- Piston provider -------------------------------------------------------

const PISTON_LANGUAGE_MAP = {
  python: { language: 'python', versionEnv: 'PISTON_PYTHON_VERSION', fallbackVersion: '*' },
  javascript: { language: 'javascript', versionEnv: 'PISTON_JAVASCRIPT_VERSION', fallbackVersion: '*' }
};

class PistonExecutionProvider {
  constructor({ baseUrl, apiKey, versions = {}, fetchImpl } = {}) {
    this.baseUrl = normalizePistonBaseUrl(baseUrl);
    this.apiKey = apiKey || '';
    this.versions = versions;
    this.fetch = fetchImpl || globalThis.fetch;
  }

  isAvailable() {
    return Boolean(this.baseUrl && typeof this.fetch === 'function');
  }

  async run({ language, code, stdin, limits }) {
    const mapping = PISTON_LANGUAGE_MAP[language];
    if (!mapping) {
      const error = new Error('Unsupported language');
      error.code = UNSUPPORTED_LANGUAGE_ERROR;
      throw error;
    }
    const version = this.versions[mapping.language]
      || process.env[mapping.versionEnv]
      || mapping.fallbackVersion;

    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), limits.timeoutMs + 2000);
    try {
      const response = await this.fetch(`${this.baseUrl}/api/v2/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {})
        },
        body: JSON.stringify({
          language: mapping.language,
          version,
          files: [{ content: code }],
          stdin: typeof stdin === 'string' ? stdin : '',
          run_timeout: limits.timeoutMs,
          compile_timeout: limits.timeoutMs,
          run_memory_limit: limits.maxMemoryBytes || undefined
        }),
        signal: controller.signal
      });
      if (!response.ok) {
        const error = new Error(`Execution provider returned ${response.status}`);
        error.code = 'EXECUTION_PROVIDER_ERROR';
        throw error;
      }
      const data = await response.json();
      const run = data && typeof data === 'object' ? (data.run || {}) : {};
      const timedOut = run.signal === 'SIGKILL' && /time/i.test(String(run.stderr || ''))
        ? true
        : Boolean(run.timedOut);
      return normalizeProviderResult({
        stdout: run.stdout,
        stderr: run.stderr,
        exitCode: typeof run.code === 'number' ? run.code : null,
        durationMs: Date.now() - startedAt,
        timedOut
      }, limits, startedAt);
    } catch (error) {
      if (error && error.name === 'AbortError') {
        return normalizeProviderResult({
          stdout: '',
          stderr: 'Execution timed out.',
          exitCode: null,
          timedOut: true
        }, limits, startedAt);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

// --- Unavailable provider ----------------------------------------------------

class UnavailableExecutionProvider {
  constructor(reason = 'An approved external sandbox provider is not configured.') {
    this.reason = reason;
  }

  isAvailable() {
    return false;
  }

  async run() {
    const error = new Error('Code execution is temporarily unavailable.');
    error.code = 'EXECUTION_PROVIDER_UNAVAILABLE';
    throw error;
  }
}

// Factory: inspect environment and return the configured provider.
function createExecutionProvider(env = process.env) {
  const kind = (env.PROGRAMMING_EXECUTION_PROVIDER || '').trim().toLowerCase();
  const baseUrl = normalizePistonBaseUrl(env.PISTON_BASE_URL);
  if (kind === 'piston' && baseUrl) {
    return new PistonExecutionProvider({
      baseUrl,
      apiKey: env.PISTON_API_KEY || ''
    });
  }
  if (kind === 'piston') return new UnavailableExecutionProvider('PISTON_BASE_URL must be a public HTTPS hostname for the Piston sandbox provider.');
  return new UnavailableExecutionProvider('PROGRAMMING_EXECUTION_PROVIDER=piston and PISTON_BASE_URL must be configured for an approved external sandbox.');
}

module.exports = {
  createExecutionProvider,
  PistonExecutionProvider,
  UnavailableExecutionProvider,
  normalizeProviderResult,
  truncateOutput,
  normalizePistonBaseUrl,
  UNSUPPORTED_LANGUAGE_ERROR
};
