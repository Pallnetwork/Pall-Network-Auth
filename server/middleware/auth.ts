// server/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import { auth } from "../firebase"; // ✅ Named import

export async function verifyFirebaseToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing Authorization token" });
    }

    const idToken = authHeader.split("Bearer ")[1];

    // 🔹 Use named auth export instead of admin
    const decodedToken = await auth.verifyIdToken(idToken);

    // 🔥 attach UID to request
    (req as any).user = decodedToken;

    next();
  } catch (error) {
    console.error("Token verify error:", error);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
