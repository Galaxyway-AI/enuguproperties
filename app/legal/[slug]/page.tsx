import { notFound } from "next/navigation";
import Link from "next/link";
import { legalTitles } from "@/lib/content";
import { business } from "@/lib/business";
import { approvedLegalDocuments } from "@/lib/legal-documents.generated";
import { LegalDocument } from "@/components/legal-document";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const slug = (await params).slug;
  const approved =
    approvedLegalDocuments[slug as keyof typeof approvedLegalDocuments];
  return { title: approved?.title || legalTitles[slug] };
}
export default async function Legal({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const title = legalTitles[slug];
  if (!title) notFound();
  const approved =
    approvedLegalDocuments[slug as keyof typeof approvedLegalDocuments];
  if (approved)
    return (
      <section className="container section prose legal-page">
        <span className="eyebrow">LEGAL &amp; PRIVACY</span>
        <LegalDocument markdown={approved.markdown} />
      </section>
    );
  return (
    <section className="container section prose">
      <span className="eyebrow">LEGAL & PRIVACY</span>
      <h1 style={{ fontSize: 40, letterSpacing: -1 }}>{title}</h1>
      <div className="notice">This document is not currently active.</div>
      <h2>Who operates the platform</h2>
      <p>
        Enugu Properties is operated by {business.legalName}, a{" "}
        {business.companyType.toLowerCase()} registered in Nigeria under RC{" "}
        {business.rcNumber}. Its registered address is{" "}
        {business.registeredAddress.join(", ")}.
      </p>
      <h2>Scope</h2>
      <p>
        {slug === "privacy"
          ? "The service is designed to process account details, property information, enquiries and transaction records for their stated purposes. Identity and ownership evidence are kept separate from public listings. The final notice must specify lawful bases, retention periods, processors, international transfers and applicable rights."
          : slug === "cookies"
            ? "The application uses necessary authentication cookies to maintain a signed-in session. Optional analytics and marketing technologies require a separate assessment and appropriate controls before activation."
            : slug === "complaints"
              ? "Use the contact form and select Complaints to create a recorded support request. The final procedure must confirm the complaints contact, acknowledgement and response times, escalation route and applicable external remedies."
              : "The platform supports advertising, introductions and recorded property workflows. Advertising placement is separate from verification. Property purchase money is not held by the platform. The final terms must define each party’s responsibilities and the scope of the service."}
      </p>
      <h2>Matters requiring final approval</h2>
      <p>
        {slug === "seller-terms"
          ? "Authority to list, truthful descriptions, evidence handling, marketing mandates, introductions, commission, listing removal, liability and dispute handling must be finalised in a versioned seller agreement."
          : "Applicable privacy, consumer, property, professional and compliance requirements must be reviewed by appropriately qualified Nigerian advisers before production use."}
      </p>
      <h2>Verification boundaries</h2>
      <p>
        A reviewed listing, an identity check, a site inspection and
        professional due diligence are different activities. None should be
        interpreted as an unconditional guarantee of legal title.
      </p>
      <Link className="button secondary" href="/contact?category=Complaints">
        Contact the team
      </Link>
    </section>
  );
}
