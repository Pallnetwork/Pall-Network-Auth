// server/middleware/auth.ts

import { Request, Response, NextFunction } from "express";
import { auth } from "../firebase";

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
    const decodedToken = await auth.verifyIdToken(idToken);

    (req as any).user = decodedToken;
    next();
  } catch (error) {
    console.error("Token verify error:", error);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/* 
Firestore Rules (should NOT be in TS code):
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /wallets/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
*/