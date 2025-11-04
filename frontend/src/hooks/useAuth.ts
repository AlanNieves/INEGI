// src/hooks/useAuth.ts
export function useAuth() {
  // Reemplaza por tu fuente real de auth
  const raw = localStorage.getItem("auth:user");
  const user = raw ? JSON.parse(raw) : null; // { role: "triangulacion" | "especialista" | ... }
  const isTriangulacion = user?.role === "triangulacion";
  return { user, isTriangulacion };
}
