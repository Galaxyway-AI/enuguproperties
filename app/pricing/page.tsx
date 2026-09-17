import Link from "next/link";
import { Check, ArrowUpRight, Gift, Building2 } from "lucide-react";
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
            listing onboarding is available through our property team during the
            launch period.
          </div>
        )}
        <div className="pricing-offer">
          <span className="offer-icon" aria-hidden="true">
            <Gift size={29} />
          </span>
          <div>
            <span className="eyebrow">NEW MEMBER OFFER</span>
            <h2>Get your first Plus advert FREE.</h2>
            <p>
              New members can advertise their first property on the Plus plan at
              no charge. Register, create your first listing and choose Plus;
              the discount is applied automatically.
            </p>
          </div>
          <Link className="button" href="/register">
            Register for the offer <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="price-grid">
          {plans.map((plan) => (
            <article
              className={`plan-card ${plan.id === "plus" ? "highlight" : ""}`}
              key={plan.id}
            >
              {plan.id === "plus" && (
                <span className="plan-offer-badge">FIRST ADVERT FREE</span>
              )}
              <span className="eyebrow">{plan.name.toUpperCase()}</span>
              <div className="plan-price">{money(plan.price_minor)}</div>
              <p>per listing · {plan.duration_days} days</p>
              {plan.id === "plus" && (
                <p className="plan-offer-copy">
                  New members pay ₦0 for their first Plus listing.
                </p>
              )}
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
        <div className="volume-discount">
          <span className="offer-icon" aria-hidden="true">
            <Building2 size={28} />
          </span>
          <div>
            <span className="eyebrow">MULTIPLE PROPERTY ADVERTS</span>
            <h2>Discounts for estate agents and developers.</h2>
            <p>
              We offer advertising discounts to estate agents and developers
              listing multiple properties. Contact us with the number and type
              of adverts you plan to publish for details.
            </p>
          </div>
          <Link className="button secondary" href="/contact?category=Seller">
            Contact us for details <ArrowUpRight size={17} />
          </Link>
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
