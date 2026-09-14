import { AuthForm } from "@/components/auth-form";
export const metadata = {
  title: "Reset your password",
  robots: { index: false, follow: false },
};
export default async function Reset({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; token?: string }>;
}) {
  const params = await searchParams;
  const updating = params.mode === "update" && Boolean(params.token);
  return (
    <section className="auth-wrap">
      <h1>{updating ? "Choose a new password." : "Let’s get you back in."}</h1>
      <p>
        {updating
          ? "Use a strong password that you do not use elsewhere."
          : "We’ll send a recovery link to your account email."}
      </p>
      <AuthForm
        mode={updating ? "update-password" : "reset"}
        resetToken={params.token}
      />
    </section>
  );
}
