import { NextRequest } from "next/server";
import { z } from "zod";
import { configured } from "@/lib/supabase";
import { neonAuth } from "@/lib/neon-auth";
import {
  sameOrigin,
  rateLimit,
  checkBot,
  errorResponse,
  HttpError,
} from "@/lib/security";
export async function POST(request: NextRequest) {
  try {
    sameOrigin(request);
    if (!configured())
      throw new HttpError(
        503,
        "Account services are awaiting setup. No account has been created.",
      );
    const body = await request.json();
    const action = z
      .enum(["login", "register", "reset", "update-password", "logout"])
      .parse(body.action);
    const client = neonAuth();
    if (action === "logout") {
      await client.signOut();
      return Response.json({ ok: true });
    }
    const email =
      action === "update-password" ? "" : z.email().max(254).parse(body.email);
    await rateLimit(`auth-global:${action}`, 100, 60);
    await rateLimit(`auth:${action}:${email}`, 5, 300);
    await checkBot(body.token);
    const base = process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000";
    if (action === "reset") {
      await client.requestPasswordReset({
        email,
        redirectTo: `${base}/reset-password?mode=update`,
      });
      return Response.json({
        message:
          "If this email has an account, a recovery link will arrive shortly.",
      });
    }
    const password = z
      .string()
      .min(12, "Use at least 12 characters.")
      .max(128)
      .parse(body.password);
    if (action === "register") {
      const name = z.string().min(2).max(120).parse(body.name);
      const { error } = await client.signUp.email({
        email,
        password,
        name,
        callbackURL: `${base}/account`,
      });
      if (error)
        throw new HttpError(
          400,
          "Registration could not be completed. Check your details or try account recovery.",
        );
      return Response.json({
        message: "Check your email for a confirmation link before signing in.",
      });
    }
    if (action === "update-password") {
      const resetToken = z.string().min(10).max(2048).parse(body.resetToken);
      const { error } = await client.resetPassword({
        newPassword: password,
        token: resetToken,
      });
      if (error) throw new HttpError(400, "Password could not be changed.");
      return Response.json({ message: "Your password has been updated." });
    }
    const { error } = await client.signIn.email({ email, password });
    if (error)
      throw new HttpError(
        401,
        "Email or password is incorrect, or your email needs confirmation.",
      );
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError)
      return Response.json({ error: e.issues[0].message }, { status: 400 });
    return errorResponse(e);
  }
}
