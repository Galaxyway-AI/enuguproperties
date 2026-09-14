import { AuthForm } from "@/components/auth-form";
export const metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return (
    <section className="auth-wrap">
      <span className="eyebrow">WELCOME BACK</span>
      <h1>Your property journey, in one place.</h1>
      <p>Sign in to manage your listings, enquiries and next steps.</p>
      {error && <div className="notice error">{error}</div>}
      <AuthForm mode="login" next={next} />
    </section>
  );
}
