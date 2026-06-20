export async function readJson(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (!chunks.length) return {};

  const rawBody = Buffer.concat(chunks).toString("utf8");

  if (!rawBody.trim()) return {};

  try {
    return JSON.parse(rawBody);
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.statusCode = 400;
    throw error;
  }
}

export function parseJsonText(rawBody) {
  if (!rawBody || !String(rawBody).trim()) return {};

  try {
    return JSON.parse(rawBody);
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.statusCode = 400;
    throw error;
  }
}

export function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    ...corsHeaders(),
  });
  response.end(JSON.stringify(body));
}

export function sendEmpty(response, statusCode = 204) {
  response.writeHead(statusCode, corsHeaders());
  response.end();
}

export function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "authorization,content-type,x-user-id",
  };
}

export function getRequestUserId(request) {
  const devUserId = request.headers["x-user-id"];

  if (devUserId) return String(devUserId);

  const authorization = request.headers.authorization ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";

  return token || "dev-user";
}

export function getHeaderUserId(headers = {}) {
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );
  const devUserId = normalizedHeaders["x-user-id"];

  if (devUserId) return String(devUserId);

  const authorization = normalizedHeaders.authorization ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";

  return token || "dev-user";
}

export function requireFields(payload, fields) {
  const missingFields = fields.filter((field) => payload[field] === undefined || payload[field] === null || payload[field] === "");

  if (missingFields.length) {
    const error = new Error(`Missing required field${missingFields.length === 1 ? "" : "s"}: ${missingFields.join(", ")}.`);
    error.statusCode = 400;
    throw error;
  }
}
