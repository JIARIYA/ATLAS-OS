"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { DOMAINS } from "@/lib/domains";

export async function authenticate(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) return "Incorrect email or password.";
    throw error; // re-throw the success redirect
  }
}

const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
});

export async function register(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return parsed.error.errors[0]?.message ?? "Invalid input.";

  const email = parsed.data.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return "An account with that email already exists.";

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const name = parsed.data.name.trim();
  const newUser = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      profile: { create: { name } },
      members: { create: { name, color: "#3b82f6", isSelf: true, order: 0 } },
      domains: { create: DOMAINS.map((d) => ({ key: d.key, name: d.name, color: d.color, order: d.order })) },
    },
  });
  void newUser;

  try {
    await signIn("credentials", { email, password: parsed.data.password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) return "Account created — please log in.";
    throw error;
  }
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
