import Link from "next/link";
import { Check, ArrowUpRight } from "lucide-react";
import { getPlans } from "@/lib/catalogue";
import { configured } from "@/lib/supabase";
import { money } from "@/lib/domain";
import { features } from "@/lib/business";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Advertising plans",
  description:
    "Choose an advertising plan for your Enugu property. Advertising and verification remain separate.",
};
export default async function Pricing() {
  const plans = await getPlans();
  return (
    <>
      <div className="page-heading">
        <div className="container">
          <span className="eyebrow">
            GIVE YOUR PROPERTY THE RIGHT INTRODUCTION
          </span>
          <h1>More visibility. The same review standards.</h1>
          <p>
            Choose the reach and media allowance that work for your listing.
            Verification is based on evidence, never on your advertising plan.
          </p>
        </div>
      </div>
      <section className="container section">
        {!configured() && (
          <div className="notice">
            Provisional launch pricing. Final plan availability is confirmed
            before checkout.
          </div>
        )}
        {!features.paidListings && (
          <div className="notice">
            Paid plans are launching shortly. Contact us for early access. Free
            listing onboarding is available through our property team during
            the launch period.
          </div>
        )}
        <div className="price-grid">
          {plans.map((plan) => (
            <article
              className={`plan-card ${plan.id === "plus" ? "highlight" : ""}`}
              key={plan.id}
            >
              <span className="eyebrow">{plan.name.toUpperCase()}</span>
              <div className="plan-price">{money(plan.price_minor)}</div>
              <p>per listing · {plan.duration_days} days</p>
              <ul>
                <li>
                  <Check size={17} />
                  {plan.photo_limit} property photographs
                </li>
                <li>
                  <Check size={17} />
                  {plan.video_limit
                    ? `${plan.video_limit} video${plan.video_limit > 1 ? "s" : ""}`
                    : "Photo-only listing"}
                </li>
                <li>
                  <Check size={17} />
                  Managed buyer enquiries
                </li>
                <li>
                  <Check size={17} />
                  Review before publication
                </li>
                {plan.featured_days > 0 && (
                  <li>
                    <Check size={17} />
                    Featured exposure, subject to capacity
                  </li>
                )}
              </ul>
              <Link
                className="button"
                href={
                  plan.id === "free"
                    ? "/sell"
                    : features.paidListings
                      ? `/account/listings/new?plan=${plan.id}`
                      : "/contact?category=Seller"
                }
              >
                {plan.id === "free"
                  ? "Start a free listing"
                  : features.paidListings
                    ? `Choose ${plan.name}`
                    : "Contact us for early access"}
                <ArrowUpRight size={17} />
              </Link>
            </article>
          ))}
        </div>
        <div className="prose">
          <h2>Advertising and verification are separate.</h2>
          <p>
            Paid plans purchase media allowances, duration and promotional
            opportunities. They do not purchase approval, identity checks, title
            verification or a favourable official-search result.
          </p>
          <h2>What about a success commission?</h2>
          <p>
            A separate success fee may apply when a sale introduced or managed
            through the platform completes. Your marketing mandate records the
            agreed basis and terms before submission. Listing checkout never
            collects the property purchase price.
          </p>
        </div>
      </section>
    </>
  );
}
