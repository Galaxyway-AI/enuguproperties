import { AuthForm } from "@/components/auth-form";
import Link from "next/link";
import { business, features } from "@/lib/business";
export const metadata = {
  title: "Create an account",
  robots: { index: false, follow: false },
};
export default function Register() {
  if (!features.registration)
    return (
      <section className="auth-wrap">
        <span className="eyebrow">SELLER REGISTRATION</span>
        <h1>Seller registration is opening shortly.</h1>
        <p>
          Contact our property team if you would like to list a property during
          our launch period.
        </p>
        <Link className="button" href="/contact?category=Seller">
          Contact our property team
        </Link>
        <p className="form-caption">
          You can also email {business.supportEmail}.
        </p>
      </section>
    );
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
