import { Request, Response, NextFunction } from "express";
import admin from "../firebase";

export async function verifyFirebaseToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    console.log("🟡 AUTH HEADER:", authHeader);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing Authorization token" });
    }

    const idToken = authHeader.replace("Bearer ", "").trim();

    const decodedToken = await admin.auth().verifyIdToken(idToken);

    console.log("✅ VERIFIED UID:", decodedToken.uid);

    (req as any).user = decodedToken;
    next();
  } catch (error: any) {
    console.error("❌ TOKEN VERIFY FAILED:", error.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
