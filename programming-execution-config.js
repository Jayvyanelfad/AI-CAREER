// Central configuration for the Programming Studio code runner.
//
// All limits are overridable via environment variables so the same code can
// run conservatively in production and with test-friendly values in tests.
// Do not scatter these numbers through route or UI code.

function intFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const PROGRAMMING_RUN_LIMITS = {
  // Wall-clock execution budget enforced by the provider contract.
  timeoutMs: intFromEnv('PROGRAMMING_RUN_TIMEOUT_MS', 5000),
  // 16 KB of source is more than enough for a lesson-sized program.
  maxCodeBytes: intFromEnv('PROGRAMMING_RUN_MAX_CODE_BYTES', 16 * 1024),
  maxStdinBytes: intFromEnv('PROGRAMMING_RUN_MAX_STDIN_BYTES', 4 * 1024),
  // stdout + stderr are each truncated to this many bytes.
  maxOutputBytes: intFromEnv('PROGRAMMING_RUN_MAX_OUTPUT_BYTES', 64 * 1024),
  // Maximum simultaneous executions across the whole API process.
  maxConcurrentRuns: intFromEnv('PROGRAMMING_RUN_MAX_CONCURRENT', 4)
};

const PROGRAMMING_RUN_RATE_LIMIT = {
  maxRunsPerWindow: intFromEnv('PROGRAMMING_RUN_RATE_LIMIT_MAX', 15),
  windowMs: intFromEnv('PROGRAMMING_RUN_RATE_LIMIT_WINDOW_MS', 60 * 1000)
};

const SUPPORTED_RUN_LANGUAGES = Object.freeze(['python', 'javascript']);

module.exports = {
  PROGRAMMING_RUN_LIMITS,
  PROGRAMMING_RUN_RATE_LIMIT,
  SUPPORTED_RUN_LANGUAGES
};
