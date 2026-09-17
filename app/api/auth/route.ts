import { after, NextRequest } from "next/server";
import { z } from "zod";
import { configured } from "@/lib/supabase";
import { neonAuth } from "@/lib/neon-auth";
import {
  sameOrigin,
  rateLimit,
  checkBot,
  errorResponse,
  HttpError,
  validationErrorMessage,
} from "@/lib/security";
import { appUrl, features } from "@/lib/business";
import { serverQuery } from "@/lib/server-db";
import { safelySendOperationsAlert } from "@/lib/email";
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
    await checkBot(body.token, action, request.url);
    if (action === "reset") {
      await client.requestPasswordReset({
        email,
        redirectTo: appUrl("/reset-password?mode=update"),
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
      if (!features.registration)
        throw new HttpError(
          503,
          "Seller registration is opening shortly. Contact our property team during the launch period.",
        );
      if (body.acceptTerms !== "on")
        throw new HttpError(400, "You must accept the Terms of Use.");
      if (body.acknowledgePrivacy !== "on")
        throw new HttpError(400, "You must acknowledge the Privacy Policy.");
      const firstName = z.string().trim().min(1).max(60).parse(body.firstName);
      const lastName = z.string().trim().min(1).max(60).parse(body.lastName);
      const name = `${firstName} ${lastName}`;
      const phone = z.string().trim().min(6).max(30).parse(body.phone);
      const sellerType = z
        .enum(["owner", "agent", "developer", "buyer"])
        .parse(body.sellerType);
      const { data, error } = await client.signUp.email({
        email,
        password,
        name,
        callbackURL: appUrl("/account"),
      });
      if (error)
        throw new HttpError(
          400,
          friendlyRegistrationError(error.message || ""),
        );
      const userId = data?.user?.id;
      if (!userId)
        throw new HttpError(
          503,
          "Your account could not be prepared. Please contact support before trying again.",
        );
      await serverQuery(
        "select app_private.complete_registration($1,$2,$3,$4)",
        [userId, name, phone, sellerType],
      );
      after(() =>
        safelySendOperationsAlert({
          id: `registration-${userId}`,
          subject: "New Enugu Properties registration",
          text: `A new user has registered.\n\nName: ${name}\nEmail: ${email}\nAccount type: ${sellerType.replaceAll("-", " ")}`,
          adminPath: "/admin/accounts",
        }),
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
      return Response.json(
        { error: validationErrorMessage(e) },
        { status: 400 },
      );
    return errorResponse(e);
  }
}

function friendlyRegistrationError(message: string) {
  const value = message.toLowerCase();
  if (value.includes("already") || value.includes("exist"))
    return "An account already uses this email address. Sign in or use account recovery.";
  if (value.includes("email"))
    return "Enter a valid email address that you can open to confirm your account.";
  if (value.includes("password"))
    return "Choose a password containing at least 12 characters.";
  return "We could not create the account. Check each field, or use account recovery if you have registered before.";
}
