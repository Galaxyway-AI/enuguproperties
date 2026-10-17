export const registrationSources = [
  { value: "referral", label: "Someone referred me" },
  { value: "search", label: "Search engine" },
  { value: "social", label: "Social media" },
  { value: "whatsapp", label: "WhatsApp group or message" },
  { value: "online_ad", label: "Online advertisement" },
  { value: "property_listing", label: "A property advert or listing link" },
  { value: "offline", label: "Event, flyer or sign" },
  { value: "other", label: "Other" },
] as const;

export const socialPlatforms = [
  "Facebook",
  "Instagram",
  "TikTok",
  "X",
  "LinkedIn",
  "YouTube",
  "Snapchat",
  "Other social platform",
] as const;

export function registrationSourceLabel(source: string) {
  return registrationSources.find((option) => option.value === source)?.label ||
    (source ? source.replaceAll("_", " ") : "Not recorded");
}
