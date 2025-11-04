import { Request, Response, NextFunction } from "express";

// Si usas JWT, asegúrate de popular req.user en tu auth middleware.
export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user: any = (req as any).user;
    if (!user || user.role !== role) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}
