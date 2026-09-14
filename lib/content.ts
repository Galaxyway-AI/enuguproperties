export const content: Record<
  string,
  {
    eyebrow: string;
    title: string;
    intro: string;
    sections: { title: string; body: string }[];
    cta?: { label: string; href: string };
  }
> = {
  verification: {
    eyebrow: "CLARITY IS PART OF THE CHECK",
    title: "Know what’s been checked. Understand what it means.",
    intro:
      "Verification is a record of specific work, with a scope, date and outcome. It is never something a seller can buy through an advertising plan.",
    sections: [
      {
        title: "Reviewed listing",
        body: "A listing has passed our publication review. This review considers the submitted information and whether it is suitable to advertise. It does not, by itself, confirm ownership or legal title.",
      },
      {
        title: "Identity verified",
        body: "The lister’s identity has been checked against the evidence required by our current procedure. This confirms the identity reviewed; it does not establish that the person owns the property or has the right to sell it.",
      },
      {
        title: "Authority to market confirmed",
        body: "Evidence of the lister’s authority to advertise the property has been reviewed. Marketing authority is separate from legal ownership and from the authority to complete a sale.",
      },
      {
        title: "Site inspected",
        body: "A recorded physical inspection has taken place and its evidence has been approved. Check the date and summary. An inspection records observations at that time; it is not a structural survey or a title guarantee.",
      },
      {
        title: "Documents reviewed",
        body: "Submitted documents have received the preliminary review described in the listing’s summary. Receipt or review of a document does not prove its authenticity, completeness or legal effect.",
      },
      {
        title: "Official search completed",
        body: "An applicable official search has been recorded with its provider, date and defined result. Its scope and limitations matter. Enugu Properties is not a government registry and does not claim government affiliation.",
      },
      {
        title: "Survey reviewed",
        body: "The relevant survey information has been reviewed with an appropriately qualified professional. The record should identify the work performed and its scope. It does not replace other boundary, planning or legal checks.",
      },
      {
        title: "Legal due diligence completed",
        body: "A qualified legal professional has completed the defined review. Read the public summary and request advice appropriate to your transaction. Professional work is attributed to its provider, not presented as an automatic platform guarantee.",
      },
      {
        title: "Checks can become out of date",
        body: "Look at completion and recheck dates. Material changes to a listing return it to review and invalidate previous completed checks until the new information is assessed. Featured placement never changes these records.",
      },
    ],
    cta: { label: "Explore properties", href: "/properties" },
  },
  safety: {
    eyebrow: "TAKE THE TIME TO CHECK",
    title: "A safer purchase starts before you pay.",
    intro:
      "An online listing is a starting point. Build your decision on an inspection, clear records and advice from the right professionals.",
    sections: [
      {
        title: "See the property and its surroundings",
        body: "Arrange an inspection. Assess the condition, boundaries, access and neighbouring uses. If you are abroad, ask about a local representative and a live video inspection; confirm availability before relying on these services.",
      },
      {
        title: "Understand who is selling",
        body: "Ask who owns the property, who is authorised to market it, and who has authority to complete a sale. Family, joint and company ownership can require additional evidence.",
      },
      {
        title: "Review the documents in context",
        body: "Ask which documents are available. Use appropriate legal and survey professionals to establish which checks and official searches your proposed transaction needs. Screenshots and WhatsApp messages alone are not sufficient evidence.",
      },
      {
        title: "Be careful with payment instructions",
        body: "Do not let pressure to pay quickly replace your checks. Independently confirm the recipient and banking instructions through a trusted channel. Enugu Properties does not hold property purchase money or operate escrow at this stage.",
      },
      {
        title: "Raise a concern early",
        body: "Use the report action on a property or contact the team if information appears incorrect or suspicious. Explain the concern and preserve relevant records without sharing private identity documents in a public message.",
      },
    ],
    cta: { label: "Contact the team", href: "/contact" },
  },
  "buying-from-abroad": {
    eyebrow: "LOCAL SUPPORT, WHEREVER YOU ARE",
    title: "Buying in Enugu from abroad.",
    intro:
      "Distance should not leave you guessing. Start with a clear brief, establish the checks you need and confirm who will carry them out.",
    sections: [
      {
        title: "Tell us what matters to you",
        body: "Share your preferred areas, property type, budget and timing. Let the team know where you are based and how you prefer to communicate. Never send purchase funds on the strength of an online introduction alone.",
      },
      {
        title: "Build an inspection plan",
        body: "Ask about local inspection support, representation and live video visits. Confirm availability, scope and any fees before booking. Photographs are useful, but they cannot answer every question about condition, access or boundaries.",
      },
      {
        title: "Bring the right professionals into the process",
        body: "Agree which document reviews, official searches, legal advice and survey work are appropriate. Ask who will perform each service and how the outcome will be recorded.",
      },
      {
        title: "Keep a clear transaction history",
        body: "As a transaction progresses, recorded milestones help you understand the next step. An accepted offer is not a completed legal sale. Property consideration is handled outside this application through appropriate professional arrangements.",
      },
    ],
    cta: {
      label: "Request a remote buying consultation",
      href: "/contact?category=Diaspora+Buyer",
    },
  },
  "how-it-works": {
    eyebrow: "A CLEARER WAY FORWARD",
    title: "From the first search to the next step.",
    intro:
      "A good property journey has a clear record, the right questions and time to make an informed decision.",
    sections: [
      {
        title: "For buyers · Search and ask",
        body: "Explore properties by type, area and budget. Read the listing and verification summaries. Sign in to save a property or send a question to the team.",
      },
      {
        title: "For buyers · Inspect and verify",
        body: "Request an inspection. Understand what has been checked and ask about further due diligence. Bring independent legal and survey professionals into the process where appropriate.",
      },
      {
        title: "For buyers · Offer and complete",
        body: "Make a private offer with your conditions. If the parties progress, a transaction case records the milestones. Complete only with the appropriate professional advice and payment arrangements.",
      },
      {
        title: "For sellers · Create and submit",
        body: "Create an account, complete your profile and add your property. Upload photographs and private evidence, choose an advertising plan and accept the applicable seller agreement. Submit the listing for review.",
      },
      {
        title: "For sellers · Review and publication",
        body: "Staff review the submission and may request changes or further evidence. Advertising payment does not guarantee approval. A listing only becomes public following moderation.",
      },
      {
        title: "For sellers · Enquiries and completion",
        body: "Track enquiries, inspections and offers through the platform. A success commission may apply under your accepted marketing agreement. Its rate and basis are recorded separately from the advertising plan.",
      },
    ],
    cta: { label: "Find a property", href: "/properties" },
  },
  about: {
    eyebrow: "ROOTED IN ENUGU. BUILT AROUND TRUST.",
    title: "Property is personal. So is our purpose.",
    intro:
      "Enugu Properties is operated by MAGENCY ONLINE SOLUTIONS LTD. We exist to improve transparency, trust and accessibility in the Enugu property market.",
    sections: [
      {
        title: "A managed marketplace",
        body: "We are building a place where property information, seller introductions, inspection requests and verification records belong to one clear process. Our initial focus is property for sale in Enugu metropolis.",
      },
      {
        title: "Trust comes from evidence",
        body: "We separate advertising from verification. Paying for better visibility does not purchase approval, a verified identity or a legal conclusion. Checks should be recorded, explained and kept current.",
      },
      {
        title: "Local knowledge, accessible from anywhere",
        body: "People buying from Nigeria and abroad need understandable information and a reliable way to ask questions. The platform is designed to support that journey while keeping sensitive documents private.",
      },
      {
        title: "Clear professional boundaries",
        body: "Enugu Properties is not a government registry. We do not guarantee title or replace a solicitor, surveyor or other appropriately qualified professional.",
      },
    ],
    cta: { label: "Get in touch", href: "/contact" },
  },
  sell: {
    eyebrow: "FOR OWNERS, AGENTS AND DEVELOPERS",
    title: "Make the right introduction for your property.",
    intro:
      "Present your property clearly, reach interested buyers and keep your next steps in one place.",
    sections: [
      {
        title: "Start with the essentials",
        body: "Tell buyers what you are selling, where it is and what makes it useful. Add an accurate description, asking price and photographs. You can save a draft and return to it.",
      },
      {
        title: "Share evidence privately",
        body: "Provide available ownership or authority-to-market evidence. Private documents are stored separately from listing photographs. Uploading a document does not mean it has been verified.",
      },
      {
        title: "Choose your advertising plan",
        body: "Free, Plus and Premium plans offer different durations and media allowances. Paid plans support visibility. Every listing follows the moderation process, regardless of plan.",
      },
      {
        title: "Know your agreement",
        body: "Review the seller declaration and marketing agreement before submission. Advertising fees and any agreed success commission are separate. The accepted version and commission basis are retained with the listing.",
      },
    ],
    cta: {
      label: "Start your property listing",
      href: "/account/listings/new",
    },
  },
  "market-insights": {
    eyebrow: "MAKE AN INFORMED NEXT MOVE",
    title: "Good questions. Clearer decisions.",
    intro:
      "Practical reading for buyers and sellers. We publish market statistics only when there is a reliable source and a clear method.",
    sections: [
      {
        title: "Before your first inspection",
        body: "Prepare questions about access, condition, boundaries, services, ownership and available documents. Read our safety guide to plan a more useful visit.",
      },
      {
        title: "Understanding verification",
        body: "Different checks answer different questions. Our verification guide explains identity checks, site visits, document reviews and professional due diligence.",
      },
      {
        title: "Area guides",
        body: "Explore neighbourhood pages as a starting point. Assess your own journey, amenities and the specific property rather than assuming that every street has the same conditions.",
      },
    ],
    cta: { label: "Read the buyer safety guide", href: "/safety" },
  },
  developments: {
    eyebrow: "PLANS FOR THE FUTURE",
    title: "New developments in Enugu.",
    intro: "Explore reviewed development listings as they become available.",
    sections: [
      {
        title: "Understand what is being offered",
        body: "For a proposed or ongoing development, ask about the specific unit or plot, delivery stage, approvals, infrastructure, payment terms and the developer’s authority. Obtain appropriate independent advice before committing.",
      },
    ],
    cta: {
      label: "Browse new developments",
      href: "/properties/new-developments",
    },
  },
};
export const legalTitles: Record<string, string> = {
  terms: "Terms of use",
  privacy: "Privacy notice",
  cookies: "Cookie notice",
  "seller-terms": "Seller terms",
  "buyer-terms": "Buyer terms",
  "verification-disclaimer": "Verification disclaimer",
  complaints: "Complaints procedure",
};
