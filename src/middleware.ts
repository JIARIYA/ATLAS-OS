import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Lightweight, edge-safe auth middleware. Uses only the JWT — no Prisma here.
export default NextAuth(authConfig).auth;

export const config = {
  // Run on everything except API routes, Next internals, and static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
