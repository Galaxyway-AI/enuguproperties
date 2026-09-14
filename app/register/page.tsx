import { AuthForm } from "@/components/auth-form";
export const metadata = {
  title: "Create an account",
  robots: { index: false, follow: false },
};
export default function Register() {
  return (
    <section className="auth-wrap">
      <span className="eyebrow">START YOUR NEXT CHAPTER</span>
      <h1>A place for your property plans.</h1>
      <p>
        Create an account to save properties, ask questions or start your
        listing.
      </p>
      <AuthForm mode="register" />
    </section>
  );
}
