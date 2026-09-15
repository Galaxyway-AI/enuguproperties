export const business = {
  brandName: "Enugu Properties",
  legalName: "MAGENCY ONLINE SOLUTIONS LTD.",
  rcNumber: "8229228",
  companyType: "PRIVATE COMPANY LIMITED BY SHARES",
  registeredAddress: [
    "House 10",
    "34V Terraces Estate",
    "Road No. 2",
    "Off Orchid Road",
    "Lekki 106104",
    "Lagos",
    "Nigeria",
  ],
  supportEmail: "support@enuguproperties.com",
  diasporaEmail: "diaspora@enuguproperties.com",
  whatsappE164: "+2349033660763",
  whatsappDisplay: "+234 903 366 0763",
} as const;

export function whatsappUrl(message: string) {
  const number = business.whatsappE164.replace(/\D/g, "");
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function appUrl(path = "") {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  const base =
    configured &&
    !configured.includes("localhost") &&
    !configured.includes("127.0.0.1")
      ? configured
      : process.env.NODE_ENV === "production"
        ? "https://enuguproperties.com"
        : configured || "http://127.0.0.1:3000";
  return new URL(path, base).toString();
}

export const features = {
  betaMode: process.env.BETA_MODE === "true",
  registration: process.env.FEATURE_REGISTRATION !== "false",
  freeListings: process.env.FEATURE_FREE_LISTINGS !== "false",
  enquiries: process.env.FEATURE_ENQUIRIES !== "false",
  inspections: process.env.FEATURE_INSPECTIONS !== "false",
  paidListings: process.env.FEATURE_PAID_LISTINGS === "true",
  propertyPurchasePayments:
    process.env.FEATURE_PROPERTY_PURCHASE_PAYMENTS === "true",
  escrow: process.env.FEATURE_ESCROW === "true",
  offers: process.env.FEATURE_OFFERS !== "false",
  transactionCases: process.env.FEATURE_TRANSACTION_CASES !== "false",
  transactionDocuments: process.env.FEATURE_TRANSACTION_DOCUMENTS === "true",
  legalDueDiligence: process.env.FEATURE_LEGAL_DUE_DILIGENCE === "true",
  surveyReview: process.env.FEATURE_SURVEY_REVIEW === "true",
  maps: process.env.FEATURE_MAPS === "true",
  video: process.env.FEATURE_VIDEO === "true",
  ukDiasporaContact:
    process.env.UK_DIASPORA_CONTACT_ENABLED === "true" &&
    Boolean(process.env.UK_DIASPORA_PHONE || process.env.UK_DIASPORA_ADDRESS),
} as const;
