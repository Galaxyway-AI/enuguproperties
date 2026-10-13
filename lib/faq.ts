export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  link?: { href: string; label: string };
};

export const faqItems: FaqItem[] = [
  {
    id: "browsing",
    question: "Do I need an account to search for a property?",
    answer:
      "No. You can browse property adverts, photographs, prices and available verification information free of charge. Create an account when you want to save properties, send a property enquiry or request an inspection.",
    link: { href: "/properties", label: "Start your property search" },
  },
  {
    id: "first-plus",
    question: "How do I get my first Plus advert free?",
    answer:
      "Register and create your first property advert. While the new member offer is active, Plus is selected automatically for an eligible first listing. Use the advertising plan checkout to apply the free offer and activate the plan before submitting your advert for review. The offer is for your first advert only and applies to Plus; choosing Premium does not make Premium free.",
    link: { href: "/pricing", label: "See advertising plans and the new member offer" },
  },
  {
    id: "documents",
    question: "Are ownership documents compulsory when I advertise?",
    answer:
      "Private ownership and authority evidence is optional when you first advertise. You must still describe the property accurately and have authority to advertise it. Add documents you already have if you wish; staff may request evidence when needed. Private documents are kept separate from public listing photographs, and uploading a document does not mean it has been verified.",
    link: { href: "/sell", label: "Learn how to advertise a property" },
  },
  {
    id: "listing-review",
    question: "What happens after I submit an advert?",
    answer:
      "Staff review every submitted advert before it becomes public. You will receive the decision in your account and by email. If amendments are needed, follow the instructions, update the advert and submit it again. Only the essentials on Page 1 are required; Page 2 lets you add more information if you wish.",
    link: { href: "/how-it-works", label: "Follow the listing process" },
  },
  {
    id: "verification",
    question: "Does a reviewed listing mean the property is verified?",
    answer:
      "Publication review means the advert has been reviewed for display on the platform. It does not by itself confirm ownership, legal title or property condition. Each verification badge refers to a separate recorded check. Read its scope, date and summary, and obtain appropriate independent professional advice before making a commitment.",
    link: { href: "/verification", label: "Understand each verification badge" },
  },
  {
    id: "media",
    question: "Can I upload or replace photographs and videos?",
    answer:
      "Save your advert first to unlock media uploads. Choose up to four photographs at a time, within the photo allowance shown for your plan. At least one photograph is needed before submission. You can delete and replace photographs while the advert is editable. Video uploads are available on plans that include videos; the upload form shows the supported formats and limits.",
    link: { href: "/pricing", label: "Compare media allowances" },
  },
  {
    id: "edits",
    question: "Can I change an advert after it has been approved?",
    answer:
      "Yes. Open your advert in your account and choose Edit approved listing to start a revision. Changes to its details or media need a fresh review before the revised advert can go live. Submitted adverts are locked while staff review them, so make your changes before submitting. You can switch the SOLD or RENTED badge on or off without waiting for admin approval.",
    link: { href: "/account/listings", label: "Manage your adverts" },
  },
  {
    id: "advertising",
    question: "Does paying for advertising guarantee approval or verification?",
    answer:
      "No. Advertising plans pay for the stated duration, media allowance and promotional placement. Featured placement improves visibility; it does not buy publication approval or a verification result. Check the plan and checkout details before paying. Estate agents and developers listing multiple properties can contact us about advertising discounts.",
    link: { href: "/pricing", label: "Review advertising options" },
  },
  {
    id: "sales-commission",
    question: "How much sales commission does Enugu Properties charge?",
    answer:
      "For a separately agreed sales service, our negotiated commission is 2%–10% of the final agreed property sale price. The exact rate depends on the property's value, the marketing and support required, and our involvement. We set out the rate, services, qualifying sale and payment terms for you to accept before those services begin.",
    link: { href: "/pricing", label: "Understand advertising and commission" },
  },
  {
    id: "commission-automatic",
    question: "Does posting an advert automatically create a commission fee?",
    answer:
      "No. Advertising is separate from a sales commission. Publishing an advert does not automatically make every later sale commissionable. A commission applies only when you separately accept an exact negotiated rate and the qualifying conditions in that agreement are met. The 10% figure is the upper end of the range, not a default charge.",
  },
  {
    id: "commission-payment",
    question: "When is a negotiated commission payable?",
    answer:
      "Payment depends on the qualifying sale and payment terms in your separate written agreement. Advertising plan charges or other agreed service fees are disclosed separately from sales commission.",
  },
  {
    id: "enquiries",
    question: "How do I ask about a property or arrange an inspection?",
    answer:
      "Use Ask about this property or Request an inspection on the property page. Sign in when prompted so your request can be linked to your account. The team can help with the next step. An inspection request is not a confirmed appointment: agree availability, the service scope and any fees before attending or booking.",
    link: { href: "/contact", label: "Contact the property team" },
  },
  {
    id: "rentals",
    question: "How are rental and short-let prices shown?",
    answer:
      "Rental adverts use annual rent, and short-let adverts use a nightly rate. Always confirm the full amount for your tenancy or dates, including any deposit, service charges, utilities, cleaning or other fees. Confirm availability and written terms with the relevant person before making payment.",
    link: { href: "/property-for-rent/enugu", label: "Explore rental properties" },
  },
  {
    id: "diaspora",
    question: "Can you help if I am outside Nigeria?",
    answer:
      "Yes. Contact our diaspora support channel to discuss property enquiries and inspection coordination in Enugu. Tell us your preferred area, property type, budget and location. Confirm the availability, scope and any fees for remote inspection or other services before relying on them.",
    link: { href: "/buying-from-abroad", label: "Explore support for buyers abroad" },
  },
  {
    id: "payments-safety",
    question: "Do I pay the property purchase price through this website?",
    answer:
      "No. Website checkout is for advertising services. Enugu Properties does not hold property purchase money or operate escrow at this stage. Confirm the recipient and payment instructions independently, inspect the property and use appropriate legal and survey professionals before making a property commitment.",
    link: { href: "/safety", label: "Read our property safety guide" },
  },
];

export const homepageFaqItems = faqItems.slice(0, 5);

export function faqStructuredData(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}
