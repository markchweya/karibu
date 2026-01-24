import jwt from "jsonwebtoken";

const COOKIE = "arrivo_session";

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET missing in .env");
  return s;
}

export type SessionPayload = {
  sub: string;
  role: string;
  email: string;
};

export function signSessionToken(payload: SessionPayload) {
  return jwt.sign(payload, secret(), { expiresIn: "8h" });
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, secret()) as SessionPayload;
  } catch {
    return null;
  }
}

export { COOKIE };
