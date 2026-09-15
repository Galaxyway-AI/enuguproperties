"use client";
import { useRef, useState } from "react";
import Link from "next/link";
type Draft = {
  id?: string;
  title?: string;
  category?: string;
  location_id?: string;
  description?: string;
  price_minor?: number;
  land_sqm?: number;
  bedrooms?: number;
  bathrooms?: number;
  property_type?: string;
  negotiable?: boolean;
  toilets?: number;
  living_rooms?: number;
  parking_spaces?: number;
  building_sqm?: number;
  property_condition?: string;
  furnishing?: string;
  details?: Record<string, string | number | boolean>;
  title_type?: string;
  features?: string[];
  status?: string;
};
export function ListingWizard({
  areas,
  initial = {},
  privateDetails = {},
}: {
  areas: { id: string; name: string }[];
  initial?: Draft;
  privateDetails?: Record<string, string>;
}) {
  const [id, setId] = useState(initial.id || "");
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState(initial.category || "houses");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const form = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saving = useRef(false);
  async function save() {
    if (!form.current || saving.current) return;
    if (!form.current.checkValidity()) {
      const invalid = form.current.querySelector<HTMLInputElement>(":invalid");
      setStep(
        ["title", "category", "location_id"].includes(invalid?.name || "")
          ? 0
          : 1,
      );
      setError(
        "Complete the required property title, area, asking price and land size before saving.",
      );
      return;
    }
    setBusy(true);
    saving.current = true;
    setError("");
    try {
      const data = Object.fromEntries(new FormData(form.current));
      const r = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save-property", id: id || null, data }),
      });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error);
      setId(result.id);
      setMessage(
        `Draft saved at ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Draft could not be saved.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <h1>
        {initial.id ? "Edit your property" : "Let’s introduce your property."}
      </h1>
      <p>
        Start with the essentials. Save your draft, then add media, evidence and
        your advertising plan.
      </p>
      {initial.status &&
        ["live", "under_offer", "paused"].includes(initial.status) && (
          <div className="notice">
            Saving an edit returns this listing to moderation and expires
            previous verification checks.
          </div>
        )}
      <div className="wizard-steps">
        {["Property & location", "Details & price", "Ownership"].map((s, i) => (
          <button
            key={s}
            className={step === i ? "active" : ""}
            onClick={() => setStep(i)}
          >
            {i + 1}. {s}
          </button>
        ))}
      </div>
      <form
        ref={form}
        noValidate
        className="panel stack-form"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        onChange={() => {
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            if (id) save();
          }, 1800);
        }}
      >
        <div style={{ display: step === 0 ? "block" : "none" }}>
          <div className="form-grid">
            <label>
              Property title
              <input
                name="title"
                defaultValue={initial.title}
                required
                minLength={5}
                maxLength={160}
                placeholder="e.g. Four-bedroom detached duplex"
              />
            </label>
            <label>
              Property category
              <select
                name="category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="houses">House</option>
                <option value="land">Land</option>
                <option value="commercial">Commercial property</option>
                <option value="new-developments">New development</option>
              </select>
            </label>
            <label>
              Area
              <select
                name="location_id"
                required
                defaultValue={initial.location_id || ""}
              >
                <option value="" disabled>
                  Choose an area
                </option>
                {areas.map((a) => (
                  <option value={a.id} key={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Private street address
              <input
                name="address"
                defaultValue={privateDetails.address}
                maxLength={300}
              />
            </label>
            <label>
              Exact latitude (private)
              <input
                name="latitude"
                type="number"
                step="any"
                min="-90"
                max="90"
                defaultValue={privateDetails.latitude}
              />
            </label>
            <label>
              Exact longitude (private)
              <input
                name="longitude"
                type="number"
                step="any"
                min="-180"
                max="180"
                defaultValue={privateDetails.longitude}
              />
            </label>
          </div>
          <p className="form-caption" style={{ marginTop: 15 }}>
            Only the area is shown publicly. The street address and coordinates
            remain private.
          </p>
        </div>
        <div
          style={{ display: step === 1 ? "block" : "none" }}
          className="stack-form"
        >
          <div className="form-grid">
            <label>
              Property type
              <select
                name="property_type"
                defaultValue={initial.property_type || ""}
                required
              >
                <option value="" disabled>
                  Choose a type
                </option>
                {category === "houses" && (
                  <>
                    <option value="detached-house">Detached house</option>
                    <option value="semi-detached-house">
                      Semi-detached house
                    </option>
                    <option value="terraced-house">Terraced house</option>
                    <option value="flat">Flat / apartment</option>
                    <option value="bungalow">Bungalow</option>
                  </>
                )}
                {category === "land" && (
                  <>
                    <option value="residential-land">Residential land</option>
                    <option value="commercial-land">Commercial land</option>
                    <option value="mixed-use-land">Mixed-use land</option>
                    <option value="agricultural-land">Agricultural land</option>
                  </>
                )}
                {category === "commercial" && (
                  <>
                    <option value="office">Office</option>
                    <option value="retail">Shop / retail</option>
                    <option value="warehouse">Warehouse</option>
                    <option value="hospitality">Hotel / hospitality</option>
                    <option value="industrial">Industrial property</option>
                  </>
                )}
                {category === "new-developments" && (
                  <>
                    <option value="residential-development">
                      Residential development
                    </option>
                    <option value="mixed-use-development">
                      Mixed-use development
                    </option>
                    <option value="commercial-development">
                      Commercial development
                    </option>
                  </>
                )}
              </select>
            </label>
            <label>
              Asking price (₦)
              <input
                name="price"
                inputMode="decimal"
                required
                pattern="[0-9]+([.][0-9]{1,2})?"
                defaultValue={
                  initial.price_minor ? String(initial.price_minor / 100) : ""
                }
              />
            </label>
            <label>
              Land size (m²)
              <input
                name="land_sqm"
                type="number"
                step="any"
                min="1"
                required
                defaultValue={initial.land_sqm}
              />
            </label>
            <label>
              Bedrooms
              <input
                name="bedrooms"
                type="number"
                min="0"
                max="100"
                defaultValue={initial.bedrooms}
              />
            </label>
            <label>
              Bathrooms
              <input
                name="bathrooms"
                type="number"
                min="0"
                max="100"
                defaultValue={initial.bathrooms}
              />
            </label>
            {category !== "land" && (
              <>
                <label>
                  Toilets
                  <input
                    name="toilets"
                    type="number"
                    min="0"
                    max="100"
                    defaultValue={initial.toilets}
                  />
                </label>
                <label>
                  Living rooms
                  <input
                    name="living_rooms"
                    type="number"
                    min="0"
                    max="50"
                    defaultValue={initial.living_rooms}
                  />
                </label>
                <label>
                  Parking spaces
                  <input
                    name="parking_spaces"
                    type="number"
                    min="0"
                    max="200"
                    defaultValue={initial.parking_spaces}
                  />
                </label>
                <label>
                  Building size (m²)
                  <input
                    name="building_sqm"
                    type="number"
                    step="any"
                    min="1"
                    defaultValue={initial.building_sqm}
                  />
                </label>
                <label>
                  Property condition
                  <select
                    name="property_condition"
                    defaultValue={initial.property_condition || ""}
                  >
                    <option value="">Not specified</option>
                    <option value="new">New</option>
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="renovation-required">
                      Renovation required
                    </option>
                    <option value="under-construction">
                      Under construction
                    </option>
                  </select>
                </label>
                <label>
                  Furnishing
                  <select
                    name="furnishing"
                    defaultValue={initial.furnishing || ""}
                  >
                    <option value="">Not specified</option>
                    <option value="unfurnished">Unfurnished</option>
                    <option value="part-furnished">Part furnished</option>
                    <option value="furnished">Furnished</option>
                  </select>
                </label>
                <label>
                  Floors
                  <input
                    name="floors"
                    type="number"
                    min="1"
                    max="100"
                    defaultValue={initial.details?.floors as number | undefined}
                  />
                </label>
                <label>
                  Year built (if known)
                  <input
                    name="year_built"
                    type="number"
                    min="1900"
                    max={new Date().getFullYear() + 10}
                    defaultValue={
                      initial.details?.year_built as number | undefined
                    }
                  />
                </label>
              </>
            )}
            {category === "land" && (
              <>
                <label>
                  Intended use
                  <select
                    name="intended_use"
                    defaultValue={String(initial.details?.intended_use || "")}
                  >
                    <option value="">Not specified</option>
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                    <option value="mixed-use">Mixed use</option>
                    <option value="agricultural">Agricultural</option>
                  </select>
                </label>
                <label>
                  Topography
                  <select
                    name="topography"
                    defaultValue={String(initial.details?.topography || "")}
                  >
                    <option value="">Not specified</option>
                    <option value="level">Level</option>
                    <option value="sloping">Sloping</option>
                    <option value="undulating">Undulating</option>
                  </select>
                </label>
                <label>
                  Boundary
                  <select
                    name="fenced"
                    defaultValue={String(initial.details?.fenced ?? "")}
                  >
                    <option value="">Not specified</option>
                    <option value="true">Fenced</option>
                    <option value="false">Unfenced</option>
                  </select>
                </label>
                <label>
                  Development status
                  <select
                    name="development_status"
                    defaultValue={String(
                      initial.details?.development_status || "",
                    )}
                  >
                    <option value="">Not specified</option>
                    <option value="undeveloped">Undeveloped</option>
                    <option value="partly-developed">Partly developed</option>
                    <option value="serviced">Serviced plot</option>
                  </select>
                </label>
              </>
            )}
            <label>
              Road access
              <select
                name="road_access"
                defaultValue={String(initial.details?.road_access || "")}
              >
                <option value="">Not specified</option>
                <option value="paved">Paved road</option>
                <option value="unpaved">Unpaved road</option>
                <option value="limited">Limited access</option>
              </select>
            </label>
            <label className="checkbox-label">
              <input
                name="negotiable"
                type="checkbox"
                defaultChecked={initial.negotiable}
              />
              Asking price is negotiable
            </label>
          </div>
          <label>
            Description
            <textarea
              name="description"
              defaultValue={initial.description}
              maxLength={15000}
              placeholder="Describe the property accurately. Include only facts you can support."
            />
          </label>
          <label>
            Features, separated by commas
            <input
              name="features"
              defaultValue={initial.features?.join(", ")}
              maxLength={1500}
              placeholder="Parking, balcony, guest room"
            />
          </label>
        </div>
        <div
          style={{ display: step === 2 ? "block" : "none" }}
          className="stack-form"
        >
          <label>
            What is your relationship to the property?
            <select
              name="ownership"
              defaultValue={privateDetails.ownership || "owner"}
            >
              <option value="owner">I am the owner</option>
              <option value="agent">
                I am authorised to market for the owner
              </option>
              <option value="company">The property is company owned</option>
              <option value="family">
                The property is jointly or family owned
              </option>
            </select>
          </label>
          <label>
            Available title/document category
            <input
              name="title_type"
              defaultValue={initial.title_type}
              maxLength={120}
              placeholder="e.g. Deed of Assignment"
            />
          </label>
          <label>
            Survey reference (private, if available)
            <input
              name="survey_reference"
              defaultValue={privateDetails.survey_reference}
              maxLength={120}
            />
          </label>
          <div className="notice">
            Document availability does not establish validity. Upload the
            relevant evidence on the next screen for review.
          </div>
        </div>
        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}
        <p className="form-caption" role="status">
          {message ||
            "Complete the required property, area, price and size fields to save your first draft."}
        </p>
        <div className="form-actions">
          {step > 0 ? (
            <button
              type="button"
              className="button secondary"
              onClick={() => setStep(step - 1)}
            >
              Back
            </button>
          ) : (
            <span />
          )}
          {step < 2 ? (
            <button
              type="button"
              className="button"
              onClick={() => setStep(step + 1)}
            >
              Continue
            </button>
          ) : (
            <button className="button" disabled={busy}>
              {busy ? "Saving…" : "Save property draft"}
            </button>
          )}
        </div>
      </form>
      {id && (
        <Link
          className="button"
          style={{ marginTop: 20 }}
          href={`/account/listings/${id}`}
        >
          Continue to photos, evidence and submission
        </Link>
      )}
    </>
  );
}
