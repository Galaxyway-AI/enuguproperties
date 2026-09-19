export type EditorialSection = { heading: string; paragraphs: string[]; points?: string[] };
export type EditorialArticle = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt: string;
  readMinutes: number;
  sections: EditorialSection[];
  sources: { label: string; url: string }[];
  related: { label: string; href: string }[];
};

const dates = { publishedAt: "2026-09-19", updatedAt: "2026-09-19" };

export const editorialArticles: EditorialArticle[] = [
  {
    ...dates,
    slug: "buying-property-in-enugu-complete-guide",
    title: "Buying Property in Enugu: A Practical Guide",
    description: "A step-by-step guide to finding, inspecting and investigating property in Enugu before you commit money.",
    readMinutes: 9,
    sections: [
      { heading: "Start with your intended use", paragraphs: ["Decide whether you need a home, investment property, land for development or commercial space. Your intended use affects location, access, building requirements, planning questions and the professionals you may need."], points: ["Set a total budget that includes professional work and transaction costs.", "List the areas you can realistically inspect and manage.", "Write down essential access, size, service and timing requirements."] },
      { heading: "Shortlist facts, not advertising language", paragraphs: ["Use online adverts to compare structured facts: price, property type, area, bedrooms, land size, condition and available photographs. Words such as luxury, strategic or urgent do not establish value, ownership or condition."], points: ["Ask for the property reference and exact inspection arrangements.", "Check that photos and videos relate to the property offered.", "Treat an unusually low price or artificial deadline as a reason to investigate further."] },
      { heading: "Inspect the exact property", paragraphs: ["Visit the property and its surroundings, preferably more than once and at useful times of day. Confirm access, drainage, utilities, boundaries, occupancy, visible condition and the relationship between the advert and what is physically present.", "A general viewing is not a structural survey, valuation or title investigation. Commission the appropriate specialist when the risk or transaction warrants it."] },
      { heading: "Identify the seller and authority", paragraphs: ["Establish who owns the interest being offered and who is communicating with you. An agent’s possession of photographs or documents does not by itself prove authority to sell. Company, family, estate and joint ownership can require additional evidence and decision makers."], points: ["Verify identity through appropriate channels.", "Ask how the seller acquired the interest.", "Confirm an agent’s authority directly with the relevant owner where appropriate."] },
      { heading: "Investigate documents and official records", paragraphs: ["A document’s name alone does not prove that it is genuine, current or sufficient for the transaction. A suitable Nigerian property lawyer and, where relevant, survey and valuation professionals should review the particular facts.", "The Land Use Act forms part of Nigeria’s legal framework for land administration. Enugu State also provides official land and housing services. The correct search depends on the property, location and claimed title."], points: ["Compare names, plot details, survey information and the physical site.", "Investigate encumbrances, disputes, acquisition and planning issues.", "Record what was searched, by whom, on what date and with what result."] },
      { heading: "Put the transaction in writing", paragraphs: ["Do not rely on verbal assurances for a major property transaction. Your adviser should prepare or review the appropriate documents, payment milestones and completion requirements. Independently confirm payment instructions before transferring money."], points: ["Keep inspection, search and communication records.", "Do not send purchase money merely because a listing is online.", "Confirm what must happen before each payment becomes due."] },
      { heading: "How Enugu Properties fits in", paragraphs: ["Enugu Properties moderates adverts and can coordinate enquiries and inspections. Where a specific check has been completed, the listing should state its scope and date. Publication is not a guarantee of ownership, title or transaction safety, so independent due diligence remains essential."] },
    ],
    sources: [
      { label: "Land Use Act — Policy and Legal Advocacy Centre", url: "https://lawsofnigeria.placng.org/view2.php?sn=228" },
      { label: "Enugu State Housing Development Corporation land services", url: "https://eshdc.en.gov.ng/" },
      { label: "NIESV professional services", url: "https://www.niesv.org.ng/professional_services.php" },
    ],
    related: [{ label: "Browse property for sale in Enugu", href: "/property-for-sale/enugu" }, { label: "Understand verification", href: "/verification" }, { label: "Buyer safety", href: "/safety" }],
  },
  {
    ...dates,
    slug: "how-to-buy-land-in-enugu-safely",
    title: "How to Buy Land in Enugu More Safely",
    description: "A practical land-buying checklist covering the site, seller, survey, title, official searches and payment controls.",
    readMinutes: 10,
    sections: [
      { heading: "Define the land you need", paragraphs: ["A cheap plot that cannot support your intended use may be expensive in practice. Establish the required location, plot size, access, development purpose, services and time horizon before viewing adverts."], points: ["Residential, commercial, agricultural or mixed use", "Minimum usable dimensions, not only total square metres", "Road access, drainage, power and water needs"] },
      { heading: "Stand on the actual plot", paragraphs: ["Do not buy an unidentified space described only by a layout or estate name. Visit the exact plot. Ask for the beacons or boundary points to be identified and compare the physical location with the survey and transaction documents.", "Check how the plot is reached, whether another person occupies or uses it, and whether neighbours or community representatives identify conflicting claims. Local statements are useful leads, but they do not replace formal investigation."] },
      { heading: "Trace the seller’s authority", paragraphs: ["Confirm the identity and capacity of every person offering the land. Where an agent, family representative, company officer, developer or estate administrator acts, investigate their authority and the underlying owner or allocation."], points: ["Match names across identity, ownership and transaction records.", "Ask for the chain showing how the seller obtained the interest.", "Resolve unexplained differences before payment."] },
      { heading: "Use the right professionals", paragraphs: ["A property lawyer can investigate title and prepare the transaction documents. A registered surveyor can help identify the land and survey information. An estate surveyor and valuer can advise on property and valuation matters within their professional scope.", "Choose professionals independently where possible and understand who instructed and pays each person."] },
      { heading: "Search the appropriate records", paragraphs: ["Official searches should be selected for the specific land and claimed title. Enugu State’s official land services provide routes for land applications, title processes and registry checks. A portal screenshot or seller-provided result should still be verified in the context of the actual transaction."], points: ["Confirm plot, layout, owner and title details.", "Ask about acquisition, encumbrance, revocation and planning risk.", "Preserve the date, scope and result of each search."] },
      { heading: "Control the money and paperwork", paragraphs: ["Agree in writing what is being sold, the price, payment stages, documents to be delivered and the consequences if required checks fail. Independently verify bank details and avoid cash or personal-transfer demands that cannot be reconciled to the seller and agreement."], points: ["Do not let urgency replace due diligence.", "Obtain receipts and transaction records.", "Complete post-purchase documentation and registration steps advised for the transaction."] },
    ],
    sources: [
      { label: "Enugu State land registry services", url: "https://eshdc.en.gov.ng/" },
      { label: "ESHDC official documentation", url: "https://eshdc.en.gov.ng/docs" },
      { label: "Land Use Act", url: "https://lawsofnigeria.placng.org/view2.php?sn=228" },
      { label: "NIESV professional services", url: "https://www.niesv.org.ng/professional_services.php" },
    ],
    related: [{ label: "Land for sale in Enugu", href: "/land-for-sale/enugu" }, { label: "Property documents buyers should check", href: "/market-insights/property-documents-buyers-should-check-enugu" }],
  },
  {
    ...dates,
    slug: "property-documents-buyers-should-check-enugu",
    title: "Property Documents Buyers Should Check in Enugu",
    description: "Understand how title, survey, identity and authority documents fit into property due diligence in Enugu.",
    readMinutes: 8,
    sections: [
      { heading: "Documents are evidence, not a shortcut", paragraphs: ["Property documents must be read together with the seller’s identity, the physical property, the transaction history and official records. A convincing scan can still relate to another plot, contain an error, be incomplete or have been superseded.", "The exact documents needed depend on the property and interest offered. This guide is educational and does not replace advice on a particular transaction."] },
      { heading: "Seller identity and capacity", paragraphs: ["Confirm who is selling and in what capacity. An individual owner, company, family, estate, attorney or developer may require different evidence of authority."], points: ["Identity information for the relevant parties", "Company and signatory authority where a company acts", "Probate, family or representative authority where applicable", "Written agency authority where an agent is involved"] },
      { heading: "Root and chain of title", paragraphs: ["Ask what right or interest the seller says they hold and how it was acquired. Examples may include allocation, conveyance or assignment documents and evidence relating to a right of occupancy. The label is less important than whether the document is genuine, applies to the property and supports the seller’s claimed interest."], points: ["Names and dates should form an explainable chain.", "Plot, survey and layout details should agree.", "Restrictions, consents and outstanding obligations need investigation."] },
      { heading: "Survey and physical identification", paragraphs: ["Survey information helps connect paperwork to land on the ground. A suitable survey professional should assess the survey details and identify the plot when appropriate. Do not assume that a survey document alone proves ownership or freedom from government acquisition."] },
      { heading: "Planning, building and development records", paragraphs: ["For buildings or development projects, ask what approvals, plans, permits and completion records are relevant. Compare approved or described work with the actual building and intended use. A physical or technical inspection may reveal issues that title documents do not address."] },
      { heading: "Search and verify independently", paragraphs: ["Use the official and professional routes appropriate to the claimed title and property. Enugu State publishes land and housing services online, while Nigeria’s Land Use Act sets part of the national legal context. Your lawyer should decide which searches, consents and completion steps apply."], points: ["Do not rely only on copies supplied by the seller.", "Record the source and date of every result.", "Investigate inconsistencies before signing or paying."] },
    ],
    sources: [
      { label: "Enugu State land and housing services", url: "https://eshdc.en.gov.ng/" },
      { label: "Land Use Act", url: "https://lawsofnigeria.placng.org/view2.php?sn=228" },
      { label: "NIESV professional services", url: "https://www.niesv.org.ng/professional_services.php" },
    ],
    related: [{ label: "Understand Enugu Properties verification", href: "/verification" }, { label: "How to buy land in Enugu", href: "/market-insights/how-to-buy-land-in-enugu-safely" }],
  },
  {
    ...dates,
    slug: "best-areas-to-buy-property-in-enugu",
    title: "How to Choose the Best Area to Buy Property in Enugu",
    description: "A decision framework for comparing Enugu neighbourhoods without relying on unsupported rankings or invented market statistics.",
    readMinutes: 8,
    sections: [
      { heading: "The best area depends on your plan", paragraphs: ["There is no single best neighbourhood for every buyer. A family home, rental investment, land purchase, office and short let each create different priorities. Start by ranking what matters to you rather than following a generic list."] },
      { heading: "Compare the journey", paragraphs: ["Test real journeys from the exact property to work, school, services and the places you use. Visit at different times. A familiar area name can cover streets with very different access, traffic, road and drainage conditions."], points: ["Normal and peak travel time", "Alternative access routes", "Public transport or parking needs", "Road condition during poor weather"] },
      { heading: "Compare the property, not the postcode", paragraphs: ["Two properties in the same neighbourhood can differ in title history, plot shape, services, building condition, security arrangements and immediate surroundings. Area reputation does not remove the need to inspect and investigate the exact property."] },
      { heading: "Established areas and growth areas", paragraphs: ["Established locations may offer clearer surrounding development and existing services, while newer corridors may involve more uncertainty about access, infrastructure and delivery. Do not treat future promises as completed infrastructure. Verify what exists and which party is responsible for further work."] },
      { heading: "Five useful starting points", paragraphs: ["Current search behaviour and marketplace inventory make Independence Layout, Trans Ekulu, New Haven, GRA and Abakpa Nike useful starting points for comparison. This is not a price or investment ranking. Availability changes, and the right choice depends on the specific property and intended use."], points: ["Independence Layout: compare precise street, property type and access.", "Trans Ekulu: distinguish established streets from named estates or extensions.", "New Haven: assess the mix of residential and commercial activity nearby.", "GRA: confirm the exact location behind the broad area description.", "Abakpa Nike: establish the specific community, route or estate."] },
      { heading: "Build your own area scorecard", paragraphs: ["Use a written scorecard for each inspected property. Include access, services, surroundings, physical condition, documentation, total cost and unresolved questions. Keep factual observations separate from seller claims and professional conclusions."] },
    ],
    sources: [
      { label: "Explore Enugu areas on Enugu Properties", url: "https://enuguproperties.com/areas" },
      { label: "NIESV professional services", url: "https://www.niesv.org.ng/professional_services.php" },
    ],
    related: [{ label: "Explore Enugu neighbourhoods", href: "/areas" }, { label: "Property for sale in Enugu", href: "/property-for-sale/enugu" }],
  },
  {
    ...dates,
    slug: "buying-property-in-enugu-from-uk-abroad",
    title: "Buying Property in Enugu From the UK or Abroad",
    description: "A practical process for diaspora buyers to inspect, investigate and document an Enugu property purchase remotely.",
    readMinutes: 10,
    sections: [
      { heading: "Remote buying needs stronger records", paragraphs: ["Distance increases dependence on photographs, messages and representatives. Build a process in which important facts can be checked independently and key decisions are recorded. Avoid making one relative, agent or adviser the sole source of every answer."] },
      { heading: "Create a property brief", paragraphs: ["Write down the intended use, budget, acceptable areas, property type, size, timing and non-negotiable requirements. Include professional and transaction costs in the budget and decide who may approve changes."], points: ["Separate essential requirements from preferences.", "Specify who can inspect or instruct professionals.", "Set a maximum commitment before checks are complete."] },
      { heading: "Use a structured remote inspection", paragraphs: ["Ask for a live, property-specific inspection rather than only edited clips. The inspection should show the approach road, exterior, boundaries where relevant, each room, visible defects, utilities and surrounding context. Record the date and limitations."], points: ["Match the property reference and claimed location.", "Ask the camera operator to follow your checklist.", "Commission technical inspection where condition risk warrants it."] },
      { heading: "Choose advisers independently", paragraphs: ["Engage suitable Nigerian legal, survey and valuation professionals for the property and transaction. Confirm credentials and instructions directly. A professional recommended by the seller may be legitimate, but you should understand whom they represent."], points: ["Use direct contact details from a trusted source.", "Agree scope, fees and deliverables in writing.", "Receive reports directly from the instructed professional."] },
      { heading: "Control representatives and powers", paragraphs: ["If someone will act for you, define their authority carefully and obtain advice on the appropriate instrument. Do not give open-ended control merely for convenience. Require written approval for major decisions and keep copies of signed instructions."] },
      { heading: "Verify payments out of band", paragraphs: ["Email and messaging accounts can be compromised. Confirm beneficiary names and bank details through a separately verified channel before every significant transfer. Ensure the recipient and payment purpose match the transaction documents."], points: ["Treat a sudden bank-detail change as high risk.", "Use traceable payments and keep receipts.", "Do not bypass incomplete checks because of an artificial deadline."] },
      { heading: "What Enugu Properties can coordinate", paragraphs: ["Enugu Properties can record enquiries, coordinate local or remote inspections and show the scope of completed platform checks. It does not replace independent legal, survey or other professional advice and does not guarantee a property transaction."] },
    ],
    sources: [
      { label: "Enugu State land and housing services", url: "https://eshdc.en.gov.ng/" },
      { label: "NIESV professional services", url: "https://www.niesv.org.ng/professional_services.php" },
      { label: "Land Use Act", url: "https://lawsofnigeria.placng.org/view2.php?sn=228" },
    ],
    related: [{ label: "Contact the diaspora team", href: "/buying-from-abroad" }, { label: "Browse property for sale", href: "/property-for-sale/enugu" }, { label: "Request an inspection", href: "/verification" }],
  },
];

export const articleBySlug = Object.fromEntries(editorialArticles.map((article) => [article.slug, article]));
