const DEFAULT_WEB_PORT = 5173;
const DEFAULT_WORKER_PORT = 8787;

function fail(message) {
  throw new Error(message);
}

function readPort(value, name, fallback) {
  const port = Number(value ?? fallback);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    fail(`${name} must be an integer between 1 and 65535.`);
  }
  return port;
}

function readEnvelopeKey(value) {
  const key = value?.trim();
  if (!key) {
    fail("ENVELOPE_KEK_BASE64 is required. Generate one with: openssl rand -base64 32");
  }
  if (Buffer.from(key, "base64").length !== 32) {
    fail("ENVELOPE_KEK_BASE64 must decode to exactly 32 bytes.");
  }
  return key;
}

function readAppUrl(value, webPort) {
  const appUrl = (value ?? `http://localhost:${webPort}`).trim().replace(/\/$/, "");
  try {
    const parsed = new URL(appUrl);
    if (!/^https?:$/.test(parsed.protocol) || !parsed.hostname) throw new Error();
  } catch {
    fail("APP_URL must be an absolute HTTP or HTTPS URL.");
  }
  return appUrl;
}

export function getLocalRuntimeConfig(environment = process.env) {
  const webPort = readPort(environment.WEB_PORT, "WEB_PORT", DEFAULT_WEB_PORT);
  const workerPort = readPort(environment.WORKER_PORT, "WORKER_PORT", DEFAULT_WORKER_PORT);
  if (webPort === workerPort) fail("WEB_PORT and WORKER_PORT must use different ports.");

  return {
    appUrl: readAppUrl(environment.APP_URL, webPort),
    envelopeKey: readEnvelopeKey(environment.ENVELOPE_KEK_BASE64),
    webPort,
    workerPort,
    workerUrl: (environment.WORKER_URL ?? `http://127.0.0.1:${workerPort}`).trim(),
  };
}
