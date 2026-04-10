import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const jwtSecret = process.env.JWT_SECRET || "change-me-in-production";

export async function getSession() {
  const store = await cookies();
  const token = store.get("qr_session")?.value;

  if (!token) {
    return null;
  }

  try {
    return jwt.verify(token, jwtSecret);
  } catch {
    return null;
  }
}
