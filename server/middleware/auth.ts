import { Request, Response, NextFunction } from "express";
import { auth } from "../firebase";

export const verifyFirebaseToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = header.replace("Bearer ", "");

  try {
    const decodedToken = await auth.verifyIdToken(token);
    (req as any).user = decodedToken; // uid available
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};