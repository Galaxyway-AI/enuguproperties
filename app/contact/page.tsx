import { ActionForm } from "@/components/action-form";
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
        <div className="prose panel">
          <ActionForm action="contact" label="Send your enquiry" bot>
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
      </section>
    </>
  );
}
