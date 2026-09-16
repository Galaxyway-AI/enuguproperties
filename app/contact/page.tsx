import { ActionForm } from "@/components/action-form";
import { business, diasporaWhatsappUrl, whatsappUrl } from "@/lib/business";
export const metadata = { title: "Contact the property team" };
export default async function Contact({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  return (
    <>
      <div className="page-heading">
        <div className="container">
          <span className="eyebrow">LET’S TALK ABOUT YOUR NEXT STEP</span>
          <h1>Speak to the Enugu property team.</h1>
          <p>
            Tell us what you need. Your message creates a support record so the
            conversation has a clear starting point.
          </p>
        </div>
      </div>
      <section className="container section">
        <div className="contact-options">
          <div className="panel">
            <h2>General support</h2>
            <p>
              Buying, selling, listings, accounts, payments, inspections and
              verification questions.
            </p>
            <a className="text-link" href={`mailto:${business.supportEmail}`}>
              {business.supportEmail}
            </a>
          </div>
          <div className="panel">
            <h2>Buying from abroad</h2>
            <p>
              Property enquiries, overseas buyer support and remote inspection
              coordination.
            </p>
            <a className="text-link" href={`mailto:${business.diasporaEmail}`}>
              {business.diasporaEmail}
            </a>
            <br />
            <a
              className="text-link"
              href={diasporaWhatsappUrl(
                "Hello Enugu Properties, I am buying from abroad and would like assistance.",
              )}
            >
              Phone / WhatsApp {business.diasporaWhatsappDisplay}
            </a>
          </div>
          <div className="panel">
            <h2>Nigeria WhatsApp</h2>
            <p>
              Contact the Nigeria team. Do not send identity documents or
              banking credentials.
            </p>
            <a
              className="text-link"
              href={whatsappUrl(
                "Hello Enugu Properties, I would like assistance with a property enquiry.",
              )}
            >
              {business.whatsappDisplay}
            </a>
          </div>
        </div>
        <div className="prose panel">
          <ActionForm
            action="contact"
            label="Send your enquiry"
            bot
            replaceOnSuccess
            successTitle="Message sent"
          >
            <div className="form-grid">
              <label>
                Email address
                <input type="email" name="email" required />
              </label>
              <label>
                What can we help with?
                <select
                  name="category"
                  defaultValue={category || "General Enquiry"}
                >
                  {[
                    "General Enquiry",
                    "Buying Property",
                    "Selling Property",
                    "Verification",
                    "Diaspora Buyer",
                    "Report a Property",
                    "Partnership",
                    "Complaints",
                  ].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Your message
              <textarea
                name="message"
                required
                minLength={20}
                maxLength={5000}
              />
            </label>
            <p className="form-caption">
              Please do not include identity numbers, banking credentials or
              private property documents in this message.
            </p>
          </ActionForm>
        </div>
        <div className="prose panel registered-address">
          <h2>Registered Address</h2>
          <p>
            <strong>{business.legalName}</strong>
            <br />
            {business.registeredAddress.map((line) => (
              <span key={line}>
                {line}
                <br />
              </span>
            ))}
          </p>
          <p className="form-caption">
            This is the company’s registered address. Property inspections take
            place only through a confirmed appointment at the relevant property.
          </p>
        </div>
      </section>
    </>
  );
}
