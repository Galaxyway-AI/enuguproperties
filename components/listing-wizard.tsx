"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Plan } from "@/lib/domain";
import { money } from "@/lib/domain";
import { ActionForm } from "./action-form";
import { UploadForm } from "./upload-form";
import { VideoUpload } from "./video-upload";
import { MediaDeleteButton } from "./media-delete-button";

type Draft = {
  id?: string; title?: string; category?: string; listing_purpose?: string;
  location_id?: string; description?: string; price_minor?: number;
  land_sqm?: number | null; bedrooms?: number; bathrooms?: number;
  property_type?: string; negotiable?: boolean; plan_id?: string;
  toilets?: number; living_rooms?: number; parking_spaces?: number;
  building_sqm?: number; property_condition?: string; furnishing?: string;
  details?: Record<string, string | number | boolean>; title_type?: string;
  features?: string[]; status?: string;
};
type Media = { id: string; alt: string; kind: string };
function formatPrice(value: string, finish = false) {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [whole = "", fraction = ""] = cleaned.split(".");
  const digits = whole.slice(0, 13);
  if (!digits && !fraction) return "";
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return finish ? `${grouped || "0"}.${fraction.slice(0, 2).padEnd(2, "0")}` : cleaned.includes(".") ? `${grouped}.${fraction.slice(0, 2)}` : grouped;
}
const types: Record<string, [string, string][]> = {
  houses: [["detached-house", "Detached house"], ["semi-detached-house", "Semi-detached house"], ["terraced-house", "Terraced house"], ["flat", "Flat / apartment"], ["bungalow", "Bungalow"]],
  land: [["residential-land", "Residential land"], ["commercial-land", "Commercial land"], ["mixed-use-land", "Mixed-use land"], ["agricultural-land", "Agricultural land"]],
  commercial: [["office", "Office"], ["retail", "Shop / retail"], ["warehouse", "Warehouse"], ["hospitality", "Hotel / hospitality"], ["industrial", "Industrial property"]],
  "new-developments": [["residential-development", "Residential development"], ["mixed-use-development", "Mixed-use development"], ["commercial-development", "Commercial development"]],
};

export function ListingWizard({ areas, initial = {}, privateDetails = {}, plans = [], media = [], firstListing = false, agreement, profileReady = false, paymentReady = false }: {
  areas: { id: string; name: string }[]; initial?: Draft;
  privateDetails?: Record<string, string>; plans?: Plan[]; media?: Media[]; firstListing?: boolean;
  agreement?: { id: string; version: string; content: string } | null;
  profileReady?: boolean; paymentReady?: boolean;
}) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState(initial.category || "houses");
  const [purpose, setPurpose] = useState(initial.listing_purpose || "sale");
  const [price, setPrice] = useState(initial.price_minor ? formatPrice(String(initial.price_minor / 100), true) : "");
  const [promotionCode, setPromotionCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const locked = ["submitted", "under_review"].includes(initial.status || "");
  const approved = ["live", "under_offer", "paused"].includes(initial.status || "");
  const selectedPlan = plans.find((plan) => plan.id === initial.plan_id);
  const imageCount = media.filter((item) => item.kind === "image").length;
  const canSubmit = profileReady && imageCount > 0 && paymentReady && Boolean(agreement);
  const planName = selectedPlan?.name || "selected";

  async function save() {
    if (!form.current || busy) return;
    for (const field of form.current.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("[data-essential]")) {
      if (!field.checkValidity()) {
        setStep(0);
        setError(field.validity.valueMissing ? `${field.closest("label")?.firstChild?.textContent?.trim() || "This field"} is required.` : field.validationMessage);
        field.focus(); return;
      }
    }
    if (!form.current.checkValidity()) {
      const field = form.current.querySelector<HTMLInputElement>(":invalid");
      setStep(field?.hasAttribute("data-essential") ? 0 : 1);
      setError(field?.validationMessage || "Check the optional details you entered.");
      field?.focus(); return;
    }
    setBusy(true); setError("");
    try {
      const data = Object.fromEntries(new FormData(form.current));
      const response = await fetch("/api/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-property", id: initial.id || null, data }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Your advert could not be saved.");
      if (!initial.id) router.replace(`/account/listings/${result.id}/edit`);
      else { setMessage("Your changes have been saved."); router.refresh(); }
    } catch (problem) { setError(problem instanceof Error ? problem.message : "Your advert could not be saved."); }
    finally { setBusy(false); }
  }

  if (locked || approved) return <div className="empty-state"><h1>{locked ? "This listing is locked for review." : "Start a reviewed revision first."}</h1><p>{locked ? "Staff are reviewing this version." : "Choose Edit approved listing from the listing page so changes can be reviewed."}</p><Link className="button" href={`/account/listings/${initial.id}`}>Return to listing</Link></div>;
  return <>
    <h1>{initial.id ? "Edit your advert" : "Post a property advert"}</h1>
    <p>Only Page 1 is required. Add more details on Page 2 if you wish. Save your advert to unlock photos, video and advertising options.</p>
    {initial.status === "needs_changes" && <div className="notice">This is an editable revision. Submit it again when changes are complete; staff must approve the new version before it goes live.</div>}
    <div className="wizard-steps" role="tablist" aria-label="Advert form pages"><button type="button" className={step === 0 ? "active" : ""} onClick={() => setStep(0)}>1. Essentials and advertising</button><button type="button" className={step === 1 ? "active" : ""} onClick={() => setStep(1)}>2. More details (optional)</button></div>
    <form ref={form} noValidate className="panel stack-form" onSubmit={(event) => { event.preventDefault(); save(); }}>
      <div hidden={step !== 0} className="stack-form"><h2>Property essentials</h2><div className="form-grid">
        <label>Property title<input data-essential name="title" defaultValue={initial.title} required minLength={5} maxLength={160} placeholder="e.g. Four-bedroom detached duplex" /></label>
        <label>What are you advertising?<select name="listing_purpose" value={purpose} onChange={(event) => setPurpose(event.target.value)}><option value="sale">For sale</option><option value="rent">For rent</option><option value="short-let">Short let</option></select></label>
        <label>Property category<select data-essential name="category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="houses">House</option><option value="land">Land</option><option value="commercial">Commercial property</option><option value="new-developments">New development</option></select></label>
        <label>Area<select data-essential name="location_id" required defaultValue={initial.location_id || ""}><option value="" disabled>Choose an area</option>{areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select></label>
        <label>Property type<select data-essential name="property_type" required defaultValue={initial.property_type || ""} key={category}><option value="" disabled>Choose a type</option>{types[category].map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label>
        <label>{purpose === "rent" ? "Annual rent (₦)" : purpose === "short-let" ? "Nightly rate (₦)" : "Asking price (₦)"}<input data-essential name="price_display" inputMode="decimal" required value={price} onChange={(event) => setPrice(formatPrice(event.target.value))} onBlur={() => setPrice(formatPrice(price, true))} placeholder="25,000,000.00" /><input type="hidden" name="price" value={price.replaceAll(",", "")} /><span className="form-caption">Commas and .00 are added to help you check the amount.</span></label>
        <label className="checkbox-label"><input name="negotiable" type="checkbox" defaultChecked={initial.negotiable} /> Asking price is negotiable</label>
        <label>What is your relationship to the property?<select name="ownership" defaultValue={privateDetails.ownership || "owner"}><option value="owner">I am the owner</option><option value="agent">I am authorised to market for the owner</option><option value="company">The property is company owned</option><option value="family">The property is jointly or family owned</option></select></label>
      </div><label>Describe the property accurately. Include only facts you can support.<textarea data-essential name="description" required minLength={50} maxLength={15000} defaultValue={initial.description} placeholder="Describe the property, its location and main benefits (at least 50 characters)." /><span className="form-caption">At least 50 characters. You can edit this before submitting.</span></label></div>
      <div hidden={step !== 1} className="stack-form"><h2>More property details (optional)</h2><p>Skip any detail you do not know. Address, coordinates and survey reference stay private.</p><div className="form-grid">
        <label>Land size (m²)<input name="land_sqm" type="number" step="any" min="1" defaultValue={initial.land_sqm ?? ""} /></label>
        <label>Bedrooms<input name="bedrooms" type="number" min="0" max="100" defaultValue={initial.bedrooms} /></label>
        <label>Bathrooms<input name="bathrooms" type="number" min="0" max="100" defaultValue={initial.bathrooms} /></label>
        <label>Intended use<select name="intended_use" defaultValue={String(initial.details?.intended_use || "")}><option value="">Not specified</option><option value="residential">Residential</option><option value="commercial">Commercial</option><option value="mixed-use">Mixed use</option><option value="agricultural">Agricultural</option></select></label>
        <label>Available title/document category<input name="title_type" maxLength={120} defaultValue={initial.title_type} placeholder="e.g. Deed of Assignment" /></label>
        <label>Survey reference (private, if available)<input name="survey_reference" maxLength={120} defaultValue={privateDetails.survey_reference} /></label>
        <label>Boundary<select name="fenced" defaultValue={String(initial.details?.fenced ?? "")}><option value="">Not specified</option><option value="true">Fenced</option><option value="false">Unfenced</option></select></label>
        <label>Development status<select name="development_status" defaultValue={String(initial.details?.development_status || "")}><option value="">Not specified</option><option value="undeveloped">Undeveloped</option><option value="partly-developed">Partly developed</option><option value="serviced">Serviced plot</option></select></label>
        <label>Road access<select name="road_access" defaultValue={String(initial.details?.road_access || "")}><option value="">Not specified</option><option value="paved">Paved road</option><option value="unpaved">Unpaved road</option><option value="limited">Limited access</option></select></label>
        <label>Private street address<input name="address" maxLength={300} defaultValue={privateDetails.address} /></label>
        <label>Exact latitude (private)<input name="latitude" type="number" step="any" min="-90" max="90" defaultValue={privateDetails.latitude} /></label>
        <label>Exact longitude (private)<input name="longitude" type="number" step="any" min="-180" max="180" defaultValue={privateDetails.longitude} /></label>
      </div><label>Features, separated by commas<input name="features" maxLength={1500} defaultValue={initial.features?.join(", ")} placeholder="Parking, balcony, guest room" /></label></div>
      {(["toilets", "living_rooms", "parking_spaces", "building_sqm", "property_condition", "furnishing"] as const).map((name) => <input key={name} type="hidden" name={name} value={initial[name] ?? ""} />)}
      {(["floors", "year_built", "topography"] as const).map((name) => <input key={name} type="hidden" name={name} value={String(initial.details?.[name] ?? "")} />)}
      {error && <div className="notice error" role="alert">{error}</div>}{message && <div className="notice success" role="status">{message}</div>}
      <div className="form-actions"><button type="button" className="button secondary" onClick={() => setStep(step === 0 ? 1 : 0)}>{step === 0 ? "Add optional details" : "Back to essentials"}</button><button className="button" disabled={busy}>{busy ? "Saving…" : initial.id ? "Save changes" : "Save advert and continue"}</button></div>
    </form>
    {step === 0 && <div className="record-list" style={{ marginTop: 24 }}>
      <section className="panel" id="advertising-plan"><h2>Advertising plan and promotion</h2>{firstListing && <div className="notice success" role="status"><strong>New member offer: your first Plus advert is free.</strong><p>{initial.id && initial.plan_id !== "plus" ? `This advert is set to ${planName}. Choose Plus below and save the plan if you want the free offer instead.` : "Plus is selected automatically for a new first listing."} Apply the free offer at checkout before submitting.</p></div>}{!initial.id ? <p>Save the essentials above to choose your plan and add media.</p> : <><label>Promotion code (optional)<input value={promotionCode} onChange={(event) => setPromotionCode(event.target.value.toUpperCase())} maxLength={30} pattern="[A-Za-z0-9_-]*" placeholder="Enter a discount code" /></label><p className="form-caption">Enter your code before choosing a plan. Eligible first-listing offers apply automatically.</p><ActionForm action="plan" extra={{ id: initial.id }} label="Save advertising plan"><label>Advertising plan<select name="plan_id" defaultValue={initial.plan_id || "free"}>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · {money(plan.price_minor)} · {plan.photo_limit} photos · {plan.video_limit} videos</option>)}</select></label></ActionForm>{initial.plan_id !== "free" && (paymentReady ? <div className="notice success" role="status">Your {planName} plan is activated for this advert. You can submit it once the other requirements below are complete.</div> : <ActionForm action="checkout" extra={{ id: initial.id }} label={`Apply offer or pay for ${planName}`}><input type="hidden" name="promotion_code" value={promotionCode} /></ActionForm>)}</>}</section>
      <section className="panel"><h2>Featured homepage placement</h2><p>Feature this advert on the home page for one week for ₦5,000. Plus and Premium plans include one week of featured placement.</p>{initial.id && <ActionForm action="checkout-featured" extra={{ id: initial.id }} label={selectedPlan?.featured_days ? "Book an extra featured week · ₦5,000" : "Add featured placement · ₦5,000"} />}</section>
      <section className="panel"><h2>Photographs and videos</h2><p>Choose up to four photographs together. At least one photograph is needed before submission. You can replace photos before review.</p>{initial.id ? <><div className="upload-list">{media.map((item) => <div className="upload-row" key={item.id}>{item.kind === "image" ? <>
        {/* eslint-disable-next-line @next/next/no-img-element -- Authenticated private media is not passed through a public image optimiser. */}
        <img src={`/api/private-media/${item.id}`} alt={item.alt || "Property photograph"} width={160} height={100} style={{ objectFit: "cover", borderRadius: 5 }} />
      </> : <iframe src={`/api/private-media/${item.id}`} title={item.alt || "Property video"} loading="lazy" allowFullScreen style={{ width: 240, aspectRatio: "16 / 9", border: 0 }} />}<span>{item.alt || (item.kind === "video" ? "Property video" : "Property photograph")}</span>{item.kind === "image" && <MediaDeleteButton id={item.id} name={item.alt || "this photograph"} />}</div>)}</div><UploadForm property={initial.id} kind="image" currentCount={imageCount} limit={selectedPlan?.photo_limit} />{initial.plan_id !== "free" && <VideoUpload property={initial.id} />}</> : <p>Save your advert above to upload media.</p>}</section>
      {initial.id && <section className="panel"><h2>Submit your advert</h2><p>Page 2 is optional. Check your photos before submitting. Staff review every advert, and later edits need fresh approval.</p>{!profileReady && <div className="notice">Add your full name and phone number on your <Link href="/account/profile">Profile page</Link> before submitting.</div>}{imageCount === 0 && <div className="notice">Upload at least one photograph before submitting.</div>}{!paymentReady && <div className="notice">The {planName} plan has not been activated for this advert. <a href="#advertising-plan">Go to advertising plan checkout</a> to apply an eligible offer or complete payment.{firstListing && " The free first-listing offer applies to Plus, not Premium."}</div>}{agreement ? <><details><summary>Read seller agreement · {agreement.version}</summary><p style={{ whiteSpace: "pre-line" }}>{agreement.content}</p></details><ActionForm action="submit" extra={{ id: initial.id }} label="Submit advert for review" disabled={!canSubmit} replaceOnSuccess successTitle="Advert submitted"><input type="hidden" name="agreement_id" value={agreement.id} /><label className="checkbox-label"><input type="checkbox" name="accepted" required /> I confirm this information is accurate, I have authority to advertise this property and I accept the seller agreement above.</label></ActionForm></> : <div className="notice">Submission opens when the approved seller agreement is available.</div>}</section>}
    </div>}
  </>;
}
