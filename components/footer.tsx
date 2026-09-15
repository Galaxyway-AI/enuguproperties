import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { business, whatsappUrl } from "@/lib/business";
export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <Link href="/" className="brand" aria-label="Enugu Properties home">
            <Image
              className="brand-logo"
              src="/logo_long.png"
              alt=""
              width={2172}
              height={724}
            />
          </Link>
          <p>
            Property is personal.
            <br />
            Confidence should come with it.
          </p>
          <p className="muted">Local knowledge. A clearer way forward.</p>
          <p className="footer-company">
            Enugu Properties is operated by {business.legalName}
            <br />
            RC {business.rcNumber}
            <br />
            {business.registeredAddress.slice(0, 4).join(", ")}
            <br />
            {business.registeredAddress.slice(4).join(", ")}
          </p>
        </div>
        <div>
          <h3>Find your place</h3>
          <Link href="/properties/houses">Houses for sale</Link>
          <Link href="/properties/land">Land for sale</Link>
          <Link href="/properties/commercial">Commercial property</Link>
          <Link href="/areas">Explore Enugu</Link>
        </div>
        <div>
          <h3>A more informed purchase</h3>
          <Link href="/verification">Understand verification</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/buying-from-abroad">Buying from abroad</Link>
          <Link href="/safety">Buyer safety</Link>
        </div>
        <div>
          <h3>Enugu Properties</h3>
          <Link href="/about">About us</Link>
          <Link href="/pricing">Advertising plans</Link>
          <Link href="/contact">
            Contact the team <ArrowUpRight size={14} />
          </Link>
          <Link href="/legal/complaints">Complaints</Link>
          <a href={`mailto:${business.supportEmail}`}>
            {business.supportEmail}
          </a>
          <a href={`mailto:${business.diasporaEmail}`}>
            {business.diasporaEmail}
          </a>
          <a
            href={whatsappUrl(
              "Hello Enugu Properties, I would like assistance with a property enquiry.",
            )}
          >
            WhatsApp {business.whatsappDisplay}
          </a>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>
          © {new Date().getFullYear()} {business.brandName}. Operated by{" "}
          {business.legalName}
        </span>
        <div>
          <Link href="/legal/privacy">Privacy</Link>
          <Link href="/legal/terms">Terms</Link>
          <Link href="/legal/seller-terms">Seller Terms</Link>
          <Link href="/legal/cookies">Cookies</Link>
        </div>
      </div>
    </footer>
  );
}
