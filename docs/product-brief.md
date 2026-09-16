# MASTER PRODUCT & DEVELOPMENT BRIEF

## ENUGU PROPERTIES

**Domain:** `https://enuguproperties.com`

**Operating Company:**
MAGENCY ONLINE SOLUTIONS LTD
Nigeria

You are the lead product architect, senior full-stack engineer, UX/UI designer, database architect, security engineer, SEO specialist and technical product manager responsible for designing and building **Enugu Properties**.

You are not being asked to create a simple property-listing template.

You are building a serious, production-quality property marketplace whose core competitive advantage is:

> **TRUST, VERIFICATION AND SAFER PROPERTY TRANSACTIONS IN ENUGU.**

The website will initially concentrate on properties for sale in Enugu, Nigeria, including:

* Houses
* Residential land
* Commercial properties
* Development land
* Selected new developments

The longer-term vision is to become one of the most trusted digital property platforms for Enugu State and eventually expand into additional Nigerian markets.

---

# 1. THE BUSINESS PROBLEM

The Enugu property market is active and growing, but buying and selling property can be extremely fragmented.

Properties are often marketed through:

* informal agents;
* WhatsApp;
* Facebook;
* roadside agents;
* family contacts;
* independent brokers;
* social media;
* personal referrals.

This creates serious problems for buyers.

Potential problems include:

* fake property listings;
* sellers who do not own the property;
* unauthorised agents;
* properties being marketed by several unrelated people;
* duplicate sales;
* misleading photographs;
* forged or questionable documentation;
* unclear title;
* survey problems;
* government acquisition issues;
* conflicting ownership claims;
* agents disappearing after receiving money;
* overseas buyers purchasing properties they have never inspected;
* buyers having no clear transaction history;
* difficulty performing proper due diligence.

Enugu Properties exists to reduce these risks.

The platform is therefore NOT merely:

> “A place where anybody can post property.”

It should ultimately become:

> **A managed property marketplace where listings are reviewed, sellers are identified, properties can be inspected and verified, buyers can request due diligence, and transactions can be tracked from enquiry to completion.**

---

# 2. CORE BRAND PROMISE

Our desired positioning is:

## Find Property in Enugu With Confidence

Supporting message:

> Explore houses, land and commercial properties across Enugu. Listings are reviewed before publication, with property verification, inspections and professional due-diligence services available to help buyers make safer property decisions.

Core trust pillars:

* Reviewed Listings
* Verified Sellers
* Local Property Inspections
* Document Checks
* Official Searches Where Applicable
* Professional Due Diligence
* Transparent Transaction Tracking

Do NOT claim:

* every property is guaranteed genuine;
* Enugu Properties guarantees legal title;
* Enugu Properties is a government registry;
* Enugu Properties replaces a solicitor;
* Enugu Properties replaces a surveyor;
* Enugu Properties itself conducts regulated professional valuations unless this is later legally authorised.

Use responsible terminology throughout.

---

# 3. CRITICAL PRODUCT PRINCIPLE

## ADVERTISING AND VERIFICATION MUST BE COMPLETELY SEPARATE

A seller must never be able to purchase a “Verified Property” badge.

Paid plans purchase:

* more media;
* longer listing duration;
* better visibility;
* homepage positioning;
* analytics;
* promotion.

Paid plans DO NOT purchase:

* title verification;
* legal verification;
* seller verification;
* survey verification;
* official-search results;
* approval.

Verification status must only be earned through actual verification processes recorded by the system.

This distinction is fundamental.

---

# 4. TARGET USERS

Build for these primary users.

## A. Property Owners

Individuals personally selling their house, land or commercial property.

## B. Property Agents

People authorised by owners to market properties.

They must provide evidence of authority to market a property where required.

## C. Property Developers / Companies

Companies marketing developments, estates or multiple units.

## D. Buyers in Nigeria

People looking to purchase property in Enugu.

## E. Nigerian Diaspora Buyers

This is an especially important audience.

Examples:

* Nigerians living in the United Kingdom;
* United States;
* Canada;
* Europe;
* Middle East;
* other countries.

Diaspora buyers often need substantially more reassurance, inspection support and transaction transparency.

## F. Enugu Properties Staff

Including:

* Super Administrator
* Property Moderator
* Verification Officer
* Field Inspector
* Compliance Officer
* Customer Support
* Finance
* Transaction Manager

Design RBAC around these responsibilities.

---

# 5. INITIAL GEOGRAPHICAL SCOPE

Launch should focus primarily on **Enugu metropolis** rather than attempting to dominate the entire state immediately.

Build the location architecture so additional locations can easily be added later.

Seed important Enugu areas such as:

* Independence Layout
* GRA
* Trans Ekulu
* New Haven
* Emene
* Abakpa Nike
* Uwani
* Achara Layout
* Coal Camp
* Ogui
* Ogui Road
* Thinkers Corner
* Nike
* Centenary City
* Maryland
* Ugwuaji
* Awkunanaw
* Enugu-Ezike where appropriate
* other relevant Enugu areas

Do not treat this initial list as authoritative or complete.

Admin must be able to add:

State → LGA → City/Town → Area/Neighbourhood → Estate/Development.

Long term we must be capable of covering:

* Nsukka
* Udi
* Nkanu East
* Nkanu West
* Oji River
* Ezeagu
* other Enugu State areas.

Location architecture must therefore be hierarchical and database-driven.

---

# 6. DESIGN DIRECTION

Create a premium, trustworthy, contemporary African property marketplace.

Avoid a generic ThemeForest real-estate appearance.

The visual language should communicate:

* trust;
* professionalism;
* safety;
* modern technology;
* premium property;
* local expertise;
* accessibility.

Suggested initial colour direction:

* Deep charcoal / near-black for authority
* Rich property green for trust
* Warm restrained gold accent
* Warm white / soft neutral backgrounds

Possible starting palette:

* Charcoal: `#111827`
* Dark Green: `#0F5E4A`
* Primary Green: `#147A5D`
* Gold Accent: `#C7952D`
* Warm Background: `#FAFAF7`
* White: `#FFFFFF`
* Muted Grey: `#667085`

These are starting points and may be refined.

Use:

* generous whitespace;
* large property photography;
* strong typography;
* clear status badges;
* excellent mobile layouts;
* restrained animations;
* clear calls to action.

Avoid:

* excessive gradients;
* excessive glassmorphism;
* tiny text;
* overcrowded cards;
* gimmicky animations;
* unnecessary carousels;
* visually confusing verification icons.

Trust information must be understandable immediately.

---

# 7. MOBILE-FIRST REQUIREMENT

A significant percentage of Nigerian customers will access the platform from mobile devices.

Design **mobile first**.

The website must work particularly well on:

* Android devices;
* lower-cost phones;
* slower mobile connections;
* inconsistent network connections.

Requirements:

* responsive images;
* aggressive image optimisation;
* lazy loading;
* video loading only when requested;
* minimal unnecessary JavaScript;
* efficient page payloads;
* usable forms on small screens;
* large touch targets;
* form autosave;
* resumable listing creation where practical.

A seller uploading a property from their mobile phone should have an excellent experience.

---

# 8. RECOMMENDED TECHNICAL STACK

Unless the existing repository already contains a sensible compatible architecture, use:

## Frontend / Full Stack

* Latest stable Next.js suitable for the environment
* TypeScript
* React
* Tailwind CSS
* high-quality reusable UI components such as shadcn/ui where useful

## Database / Backend

Preferred:

* PostgreSQL
* Supabase

Use Supabase for:

* PostgreSQL
* authentication
* row-level security
* database functions where appropriate
* secure storage where appropriate

Do not tightly couple business logic to Supabase in ways that make future migration impossible.

## Media

Separate:

### Public property media

Photos/video used on public listings.

### Private verification documents

Government IDs, title documents, ownership evidence, seller documents, compliance documents.

NEVER store these two categories using identical public access rules.

Private files must use private buckets/containers and short-lived signed access URLs.

Possible storage:

* Supabase Storage initially;
* Cloudflare R2 may be used if this produces a cleaner and more economical architecture.

Abstract storage sufficiently so that migration remains possible.

## Payment

Use **Kora** as the initial payment provider for:

* Plus listings;
* Premium listings;
* featured-property upgrades;
* future paid services.

Architecture must allow Flutterwave or another payment provider later.

Do not tightly couple the application to one payment gateway.

## Bot Protection

Use Cloudflare Turnstile or an equivalent privacy-conscious anti-abuse system for appropriate public forms.

## Email

Use a professional transactional email provider.

Provide a clean adapter abstraction rather than scattering provider-specific calls throughout the application.

## Maps

Use a production-quality mapping/geocoding provider such as:

* Mapbox
* Google Maps

Exact property coordinates must NOT necessarily be publicly exposed.

---

# 9. DO NOT STORE SECRETS IN SOURCE CODE

Use environment variables.

Create:

`.env.example`

Document everything required.

Examples:

* database URL
* Supabase URL
* Supabase anon key
* service role credentials where legitimately required
* Kora public key
* Kora secret key
* Kora webhook signature/configuration
* email API key
* Turnstile key
* map API key
* storage settings
* application base URL

Never commit real production credentials.

---

# 10. PUBLIC WEBSITE ARCHITECTURE

Create a professional public website.

Recommended routes:

```text
/
├── properties
│   ├── houses
│   ├── land
│   ├── commercial
│   ├── new-developments
│   └── featured
│
├── property/[slug]
│
├── areas
│   └── [slug]
│
├── developments
│   └── [slug]
│
├── sell
├── pricing
├── verification
├── buying-from-abroad
├── how-it-works
├── safety
├── market-insights
├── about
├── contact
│
├── login
├── register
│
├── account
│   ├── dashboard
│   ├── listings
│   ├── enquiries
│   ├── saved
│   ├── inspections
│   ├── offers
│   ├── transactions
│   ├── documents
│   ├── billing
│   ├── profile
│   └── organisation
│
└── admin
```

Also prepare the legal route structure:

```text
/legal/terms
/legal/privacy
/legal/cookies
/legal/seller-terms
/legal/buyer-terms
/legal/verification-disclaimer
/legal/complaints
```

Legal copy can initially be professionally structured placeholders clearly marked for final Nigerian legal review.

Do not fabricate legal promises.

---

# 11. HOMEPAGE

Homepage must immediately explain what the service does.

## Hero

Primary headline:

### Find Property in Enugu With Confidence

Supporting copy:

> Discover houses, land and commercial properties across Enugu. Listings are reviewed before publication, with enhanced verification and professional due-diligence services available when you need greater confidence.

Primary CTA:

**Browse Properties**

Secondary CTA:

**Sell Your Property**

Property search should be immediately available.

Suggested fields:

* Buy Land / Buy House / Commercial
* Area
* Minimum Price
* Maximum Price
* Search

Keep hero search easy.

Advanced filters belong on results pages.

---

# 12. HOMEPAGE SECTIONS

Consider:

### Featured Properties

Premium promotional inventory.

Do not imply featured means verified.

Label promotional status transparently.

### Recently Added

### Land for Sale

### Houses for Sale

### Popular Areas

### Why Enugu Properties?

Explain:

* reviewed before publication;
* seller identification;
* local inspections;
* verification options;
* professional due diligence;
* transaction support.

### How It Works

For buyers:

Search → Enquire → Inspect → Verify → Offer → Due Diligence → Complete

For sellers:

Create Account → Add Property → Submit Evidence → Review → Publish → Receive Qualified Enquiries

### Buying From Abroad

Dedicated diaspora section.

CTA:

**Buying Property From Outside Nigeria?**

### Safety Section

Explain why buyers should verify before paying.

### Sell Your Property

Seller CTA.

### Market Insights

SEO/editorial content.

---

# 13. PROPERTY SEARCH EXPERIENCE

Public search must support:

* property category;
* property type;
* area;
* minimum price;
* maximum price;
* bedrooms;
* bathrooms;
* land size;
* verified-status filters;
* video available;
* new listings;
* price reduced;
* featured;
* newest;
* price low to high;
* price high to low.

Do not overload the initial search bar.

Advanced filters can use a filter drawer on mobile.

Support both:

* list view;
* optional map view.

---

# 14. PROPERTY CARD

Each property card should clearly show:

* main image;
* asking price;
* property title;
* location;
* bedrooms where relevant;
* bathrooms where relevant;
* land size where relevant;
* property category;
* verification indicators;
* featured status if applicable;
* recently added or price-reduced label;
* favourite/save button.

Verification badges must use explanatory tooltips or links.

Avoid placing ten badges on every card.

Display only the most meaningful trust indicators.

---

# 15. PROPERTY DETAIL PAGE

This is one of the most important pages.

It must be excellent.

Include:

## Main Media

* responsive gallery;
* full-screen image viewer;
* video where available;
* floor plans later if supported.

## Primary Information

* title
* asking price
* area
* location
* property type
* listing reference
* date listed
* date last updated
* status
* seller category

Example listing reference:

`EP-2026-000142`

Never depend purely on a database UUID for customer-facing references.

## House Information

Possible fields:

* bedrooms
* bathrooms
* toilets
* living rooms
* parking spaces
* property condition
* furnished/unfurnished
* land size
* building size
* number of floors
* year built where known
* water
* electricity
* road access
* security
* estate information
* amenities

## Land Information

Possible fields:

* total land size
* square metres
* plots
* hectares where appropriate
* intended use
* residential/commercial/mixed
* topography
* road access
* fenced/not fenced
* developed/undeveloped
* survey availability
* beacon information where appropriate
* title/document category
* planning/zoning information where known

Do not publicly expose sensitive document numbers unless specifically approved.

## Property Description

Well-formatted description.

## Features

## Location

Show approximate public map position if configured.

Exact coordinates should remain private by default.

## Verification Status

Create a dedicated verification panel.

## Safety Advice

Small visible reminder:

> Never make payment for a property solely on the basis of an online listing. Request appropriate verification and professional legal advice before completing a purchase.

## Enquiry Actions

Primary:

**Request Inspection**

Secondary:

**Ask About This Property**

Also:

**Make an Offer**

And, where configured:

**WhatsApp Enugu Properties**

Do NOT default to publishing the seller's direct personal phone number.

The platform must remain involved in the buyer introduction.

---

# 16. VERIFICATION MODEL

Create a structured verification system.

Potential verification checks:

### Identity Verified

Lister identity confirmed according to current internal procedure.

### Authority to Market Confirmed

Evidence reviewed showing seller/agent has authority to market.

### Site Inspected

Enugu Properties staff or authorised inspector has physically visited the site/property.

### Documents Reviewed

Submitted documents received and reviewed at the applicable preliminary level.

### Official Search Completed

Applicable official property/land search completed.

### Survey Reviewed

Relevant survey information reviewed by or with a qualified professional where required.

### Legal Due Diligence Completed

A qualified legal professional has completed the defined review.

Do not use vague “Verified” without explaining what was verified.

---

# 17. VERIFICATION RECORDS

Each verification check should contain data such as:

* verification type;
* status;
* date requested;
* date started;
* date completed;
* responsible staff member;
* professional/external provider where relevant;
* expiry/recheck date where applicable;
* internal notes;
* public summary;
* private evidence;
* outcome;
* failure reason;
* document snapshot/version associated with the check.

Statuses:

```text
not_requested
requested
in_progress
more_information_required
completed
failed
expired
cancelled
```

Never allow a paid plan to directly change these values.

---

# 18. CRITICAL MATERIAL-CHANGE RULE

After a listing has been approved or verified, changes to material information should trigger renewed moderation.

Examples:

* seller;
* ownership information;
* title type;
* survey information;
* property coordinates;
* asking price beyond configurable tolerance;
* land size;
* property identity;
* uploaded title documents.

System behaviour:

1. preserve the previously approved value;
2. create a revision;
3. mark listing as requiring review;
4. potentially invalidate affected verification badges;
5. create an audit event.

Do not silently modify a verified property.

---

# 19. SELLER ONBOARDING

Registration should be easy.

Initial signup:

* full name
* email
* phone
* password or secure authentication method

Then ask seller type:

* Property Owner
* Agent
* Developer / Company

Do not make initial signup unnecessarily intimidating.

Progressive onboarding is preferred.

---

# 20. SELLER PROFILE

Store:

* name
* profile photo/logo
* email
* phone
* WhatsApp
* location
* account type
* verification status
* account status
* organisation where relevant
* date joined
* internal risk score/flags
* public seller profile configuration

Do not expose private KYC information.

---

# 21. AGENT / DEVELOPER ORGANISATIONS

Create an organisations model.

Fields could include:

* organisation name;
* CAC/registration details;
* trading name;
* contact details;
* registered address;
* website;
* logo;
* organisation type;
* verification status;
* associated users;
* authorised users;
* internal notes.

Allow multiple staff members later.

Do not build overly complex enterprise permissions in MVP, but create an extensible data model.

---

# 22. LIST A PROPERTY FLOW

This must be extremely easy on mobile.

Use a multi-step wizard.

Example:

## Step 1 — What Are You Selling?

* House
* Land
* Commercial
* Development

## Step 2 — Location

* State
* LGA
* City
* Area
* Estate/development
* street/address
* exact map location

Make exact address/private coordinates independently controllable from public display.

## Step 3 — Property Details

Dynamic fields based on property category.

## Step 4 — Ownership / Authority

Ask:

* Are you the owner?
* Are you acting for the owner?
* Is the property owned by a company?
* Is this jointly/family owned?

Show appropriate evidence requirements.

## Step 5 — Documentation

Upload relevant available documents.

Do not assume every Nigerian property has identical documentation.

Allow configurable document categories.

Examples might include:

* Certificate of Occupancy;
* Right of Occupancy;
* Deed of Assignment;
* Deed of Conveyance;
* Allocation Letter;
* Power of Attorney;
* Survey Plan;
* Probate documents;
* company ownership evidence;
* authority-to-market document;
* other.

Never imply that upload alone confirms validity.

## Step 6 — Photos & Video

Plan limits apply.

## Step 7 — Description

Allow seller-written description.

Optionally provide AI-assisted description generation later, but never allow AI to invent property facts.

## Step 8 — Asking Price

* price;
* negotiable yes/no;
* optional price per sqm for land;
* optional service charges for developments.

## Step 9 — Select Advertising Plan

Free / Plus / Premium.

## Step 10 — Seller Declaration

Seller must confirm that information is accurate and that they have authority to advertise the property.

## Step 11 — Submit for Review

Nothing goes live automatically.

Autosave drafts throughout.

---

# 23. LISTING WORKFLOW

Use an explicit state machine.

Recommended status options:

```text
draft
submitted
payment_pending
under_review
needs_changes
approved
scheduled
live
paused
under_offer
sold
expired
rejected
withdrawn
archived
```

Define valid status transitions.

Do not allow arbitrary status changes.

---

# 24. MODERATION WORKFLOW

Every submitted property goes to administration.

Moderator screen should show:

* property details;
* seller profile;
* account history;
* uploaded media;
* private documents;
* duplicate warnings;
* location;
* risk flags;
* previous rejected listings;
* verification information;
* payment status;
* moderation checklist.

Actions:

* Approve
* Reject
* Request Changes
* Request Documents
* Assign Inspection
* Flag Seller
* Escalate
* Suspend Account

Require internal reason codes.

Important decisions should be audit logged.

---

# 25. DUPLICATE / FRAUD DETECTION

Implement practical fraud signals.

MVP can flag:

* same coordinates;
* same property address;
* same seller uploading repeated versions;
* same survey identifier where stored;
* same title reference where stored;
* same phone number across suspicious accounts;
* duplicate image hashes where practical;
* suspiciously extreme pricing;
* recently rejected property being resubmitted;
* multiple sellers apparently marketing identical property.

Do NOT automatically accuse someone of fraud.

Use statuses such as:

> Potential Match — Manual Review Required

Future versions can use more advanced risk scoring.

---

# 26. PROPERTY MEDIA

Images should:

* validate MIME type;
* validate actual file content;
* have size limits;
* strip unnecessary metadata where appropriate;
* generate optimised versions;
* preserve a controlled high-resolution original if needed;
* create thumbnails;
* support WebP/AVIF;
* use responsive delivery.

Do not rely solely on filename extensions.

---

# 27. VIDEO

Video is available only for configured plans.

Do not force enormous raw mobile videos through the primary application server if avoidable.

Use direct uploads/presigned uploads where appropriate.

Set:

* duration limits;
* file size limits;
* file type limits;
* processing state;
* poster thumbnails.

Video limits must be admin configurable.

---

# 28. LISTING PLANS

Build a database-driven plan system.

Seed these provisional launch plans:

## FREE

Price: ₦0

Suggested:

* 30-day listing
* maximum 4 photos
* no video
* standard search placement
* basic enquiries
* basic dashboard
* standard moderation

## PLUS

Seed price:

₦5,000 per listing

Suggested:

* 45-day listing
* up to 15 photos
* 1 video
* enhanced placement
* listing analytics
* seller profile enhancement

## PREMIUM

Seed price:

₦15,000 per listing

Suggested:

* 60-day listing
* up to 30 photos
* up to 3 videos
* premium placement
* enhanced analytics
* limited homepage featured exposure where inventory allows
* optional promotional opportunities

These are **seed values only**.

Admin must be able to modify:

* price;
* duration;
* image allowance;
* video allowance;
* video duration;
* visibility weighting;
* included featured days;
* analytics features;
* plan availability.

Do NOT hardcode business rules throughout frontend code.

---

# 29. FEATURED PROPERTY PRODUCT

Featured placement is advertising.

Create configurable promotional products such as:

* Homepage Featured
* Search Boost
* Area Featured
* Urgent Sale
* Price Reduced Highlight

Seed example:

**Featured Property — 7 days**

Do not permanently hardcode pricing.

Featured status must clearly mean promotional positioning, NOT verification.

---

# 30. PAYMENT IMPLEMENTATION

Use Kora Checkout Redirect for server-initiated advertising payments.

Payments are currently for:

* listing upgrades;
* promotions;
* future paid services.

NOT for:

* property purchase price;
* property deposit;
* escrow.

Critical payment requirements:

* create order before checkout;
* generate unique payment reference;
* server-side payment initiation where appropriate;
* validate webhook signatures;
* verify payment server-side;
* use idempotency;
* never trust browser redirect alone;
* store provider transaction ID;
* store amount;
* currency;
* payment purpose;
* status;
* raw provider reference;
* timestamps;
* refund status where applicable.

Statuses:

```text
pending
processing
paid
failed
cancelled
refunded
partially_refunded
```

Use Kora test mode during development.

Never embed live secret keys.

---

# 31. SUCCESS COMMISSION

The business intends to earn a commission when a property sale introduced/managed through Enugu Properties successfully completes.

Seed default:

## 2% of completed sale price

However:

**DO NOT hardcode 2% as an immutable business rule.**

Commission must be configurable:

* global default;
* seller-specific rate;
* property-specific rate;
* negotiated fixed amount;
* percentage;
* waived;
* special developer arrangement.

Create a Commission Agreement / Marketing Mandate record.

Fields should include:

* seller;
* property;
* version;
* commission type;
* commission percentage/fixed amount;
* minimum fee where applicable;
* effective date;
* listing period;
* introduced-buyer clause;
* acceptance timestamp;
* IP/user-agent metadata where lawful;
* terms version;
* signature/acceptance method;
* document snapshot.

Final legal wording will be supplied later.

---

# 32. CLICKWRAP / AGREEMENT VERSIONING

The system must keep evidence of which terms a user accepted.

For important agreements record:

* user ID;
* agreement type;
* agreement version;
* exact document hash/snapshot reference;
* date/time;
* method;
* relevant property;
* relevant order;
* IP where legally appropriate;
* user agent where appropriate.

If Terms change later, historical agreements must remain reconstructable.

Never overwrite previous agreement versions.

---

# 33. DO NOT HOLD PROPERTY PURCHASE MONEY

At MVP launch:

## Enugu Properties must NOT act as escrow.

Do not create functionality that deposits:

* house purchase money;
* land purchase money;
* property deposits;

into MAGENCY's normal application balance.

The application may TRACK:

* offer accepted;
* due diligence;
* contract issued;
* deposit confirmed externally;
* completion;
* commission due.

But property consideration should initially be handled through appropriately structured professional/banking/legal arrangements outside the platform.

Architecture can support a future regulated escrow integration, but do not implement fake escrow now.

---

# 34. BUYER ENQUIRY SYSTEM

Do not simply expose every seller's telephone number.

Create structured leads.

When buyer submits:

**Ask About This Property**

create an enquiry.

Generate reference such as:

`EPQ-2026-000821`

Capture:

* buyer;
* property;
* enquiry message;
* preferred contact;
* source;
* date;
* assigned staff member;
* seller notification;
* status;
* notes.

Statuses:

```text
new
contacted
qualified
inspection_requested
inspection_booked
offer_expected
not_interested
closed
spam
```

---

# 35. REQUEST INSPECTION

Inspection request should capture:

* buyer;
* property;
* preferred date;
* preferred time;
* number attending;
* contact details;
* whether buyer is overseas;
* notes.

Admin can:

* confirm;
* reschedule;
* assign agent/inspector;
* cancel;
* complete.

Seller sees appropriate information without receiving unnecessary buyer private information.

---

# 36. FIELD INSPECTION SYSTEM

Create a mobile-friendly staff inspection page.

Inspector should be able to:

* open assigned inspection;
* confirm arrival;
* record timestamp;
* capture GPS where permission allows;
* upload current photos;
* upload video;
* record representative present;
* record visible address/location information;
* record road/access observations;
* record condition;
* record survey/beacon observations where relevant;
* add notes;
* mark completed.

Do not allow an inspector simply to select “Site Inspected” manually without an inspection record.

Inspection evidence should be private unless specific media is intentionally published.

---

# 37. INSPECTION BADGE

Once properly completed and approved:

> **Site Inspected**

Public information may show:

> Physically inspected by Enugu Properties on [date]

Do not publish:

* inspector personal details;
* exact private GPS;
* private inspection notes.

---

# 38. MAKE AN OFFER

Allow signed-in buyers to submit:

* offer amount;
* financing/cash indicator if desired;
* proposed completion timing;
* message;
* conditions.

Never display offers publicly.

Seller/admin can:

* accept;
* reject;
* counter;
* request discussion.

Create immutable history.

An accepted offer does not equal a completed legal sale.

---

# 39. TRANSACTION CASE

Once parties progress seriously, create a Transaction Case.

Example reference:

`EPT-2026-000095`

Possible stages:

```text
buyer_qualified
offer_submitted
offer_accepted
verification_pending
due_diligence
professional_review
contract_stage
awaiting_completion
completed
withdrawn
failed
disputed
```

Create a timeline.

Example:

> 04 Sep — Offer submitted
> 05 Sep — Seller accepted offer
> 06 Sep — Due diligence requested
> 08 Sep — Documents sent to solicitor
> 11 Sep — Official search requested
> 14 Sep — Search completed
> 17 Sep — Contract review underway

Different users see only information appropriate to their role.

---

# 40. DIASPORA BUYER EXPERIENCE

Create a dedicated page:

## Buying Property in Enugu From Abroad

Explain the service clearly.

Potential future service workflow:

1. select property;
2. contact Enugu Properties;
3. identity verification;
4. live video inspection;
5. property inspection;
6. document review;
7. official searches;
8. solicitor review;
9. survey review;
10. transaction tracking;
11. completion support.

Do not automatically promise every service until operational processes are established.

Build architecture so these services can later become bookable products.

CTA:

**Speak to Our Enugu Property Team**

or:

**Request a Remote Buying Consultation**

---

# 41. OFFICIAL PROPERTY SEARCH / ENGIS

Enugu State has official land-information and verification infrastructure.

Design an internal workflow to RECORD official searches where appropriate.

Do not scrape government systems without permission.

Do not falsely imply an API integration exists.

Create fields such as:

* official search provider;
* reference;
* requested date;
* completed date;
* status;
* result category;
* private report;
* public summary;
* responsible professional/staff member.

Provider values can include configured authorities such as ENGIS where applicable.

Keep this extensible.

---

# 42. PROFESSIONAL SERVICE NETWORK

Future transactions may involve:

* property solicitors;
* registered estate surveyors/valuers;
* licensed surveyors;
* inspection professionals;
* photographers;
* drone operators;
* other specialists.

Create a lightweight service-provider model for future use.

Fields:

* professional name;
* profession;
* organisation;
* registration body;
* registration number;
* verified credentials status;
* contact;
* service areas;
* active/inactive;
* internal notes.

Professional reports must record who prepared them.

Do NOT make Enugu Properties appear to have personally delivered regulated professional advice when a third party actually performed it.

---

# 43. COMPLIANCE / KYC ARCHITECTURE

Because the business may become involved in real-estate sale transactions, design for appropriate KYC/AML processes.

Important:

Do not collect every sensitive field from every casual visitor.

Use progressive compliance.

Possible stages:

## Basic Account

Minimal profile information.

## Seller Verification

Information needed to verify identity/authority to advertise.

## Transaction KYC

Only once a party enters a transaction or when legally required.

Create configurable KYC requirements.

Potential fields may include:

* legal name;
* residential address;
* government ID;
* NIN where legally required;
* occupation;
* account/transaction information where required;
* source-of-funds information where legally required;
* beneficial owner for companies;
* company records;
* enhanced due-diligence notes.

Sensitive requirements should be finalised with Nigerian legal/compliance professionals.

Do not expose these publicly.

---

# 44. DATA CLASSIFICATION

Implement a clear internal classification.

## PUBLIC

Examples:

* property title;
* public description;
* public media;
* approximate location;
* asking price.

## ACCOUNT PRIVATE

Examples:

* email;
* phone;
* account preferences.

## CONFIDENTIAL PROPERTY

Examples:

* exact coordinates;
* internal inspection data;
* authority-to-market evidence.

## HIGHLY SENSITIVE / KYC

Examples:

* ID documents;
* NIN;
* personal address documents;
* source-of-funds information;
* legal documents;
* detailed title files.

Security and access controls should reflect classification.

---

# 45. PRIVACY BY DESIGN

The platform will potentially handle significant personal information.

Build for:

* data minimisation;
* purpose limitation;
* lawful processing;
* explicit notices;
* consent where appropriate;
* retention rules;
* deletion/anonymisation procedures;
* access requests;
* correction requests;
* account closure;
* security;
* auditability.

Do not keep documents forever merely because storage is cheap.

Create configurable retention categories.

Do not log sensitive document contents in application logs.

---

# 46. DATABASE SECURITY

Use Row Level Security and strict server-side authorisation.

Never rely solely on hidden frontend buttons.

Examples:

* seller can modify own draft listings;
* seller cannot approve own listing;
* buyer cannot see seller's private documents;
* inspector sees only assigned inspection information;
* moderator sees moderation information;
* finance sees payment records;
* compliance can access KYC where authorised;
* ordinary admin roles should not automatically have unrestricted KYC access.

Create explicit role permissions.

---

# 47. ADMIN ROLES

Seed:

```text
super_admin
property_moderator
verification_officer
inspector
transaction_manager
compliance_officer
support_agent
finance_admin
```

Use permission mapping rather than scattering `if role ===` throughout the codebase.

Super admin can configure permissions later.

---

# 48. AUDIT LOGGING

Critical actions should produce immutable audit events.

Examples:

* listing submitted;
* property approved;
* property rejected;
* material field changed;
* verification status changed;
* document viewed/downloaded;
* user suspended;
* seller verification completed;
* payment marked paid;
* transaction status changed;
* offer changed;
* commission modified;
* KYC decision;
* admin impersonation if this capability is ever added.

Store:

* actor;
* action;
* entity;
* entity ID;
* timestamp;
* relevant before/after metadata;
* request context where appropriate.

Never put sensitive document contents directly in audit logs.

---

# 49. PROPERTY REPORTING

Every property page should have:

## Report This Property

Reason options:

* Property does not exist
* Seller may not own property
* Duplicate listing
* Incorrect information
* Misleading photographs
* Property already sold
* Suspicious documents
* Fraud/scam concern
* Incorrect price
* Other

Create moderation cases.

Allow anonymous report with anti-spam protection, but encourage account-based reports.

Admin can:

* investigate;
* dismiss;
* pause listing;
* request seller information;
* escalate;
* permanently remove.

---

# 50. USER SAFETY

Create `/safety`.

Include practical advice such as:

* inspect before paying;
* verify seller identity;
* request property documentation;
* perform appropriate official searches;
* use qualified legal professionals;
* use qualified survey professionals where required;
* never rely only on screenshots or WhatsApp messages;
* ensure authority to sell is established;
* beware of pressure to pay immediately;
* verify bank/payment instructions.

Avoid defamatory/generalising language.

---

# 51. SELLER DASHBOARD

Seller dashboard should show:

* active listings;
* drafts;
* listings under review;
* needs changes;
* expired;
* sold;
* views;
* enquiries;
* inspection requests;
* offers;
* plan;
* expiry date;
* verification progress;
* outstanding actions;
* billing;
* transaction progress.

Provide clear action cards.

Examples:

> Upload Authority to Sell

> Listing expires in 8 days

> Buyer requested inspection

> Additional document requested by moderator

---

# 52. BUYER DASHBOARD

Buyer dashboard:

* saved properties;
* enquiries;
* inspection bookings;
* offers;
* transaction cases;
* due-diligence requests;
* notifications;
* documents shared with them;
* messages/updates.

Keep straightforward.

---

# 53. ADMIN DASHBOARD

Admin homepage must be operational, not decorative.

Display:

* listings awaiting review;
* listings requiring changes;
* pending verifications;
* inspections today;
* inspections overdue;
* open enquiries;
* active transactions;
* pending reports;
* flagged accounts;
* payments today;
* commissions due;
* listings expiring;
* recently completed sales.

Create useful filters and queues.

---

# 54. ADMIN PROPERTY PAGE

Admin should see an integrated property record:

* public listing;
* owner/seller;
* agent;
* documents;
* media;
* moderation history;
* verification;
* inspections;
* enquiries;
* offers;
* reports;
* payment history;
* plan history;
* transaction history;
* audit history.

Avoid forcing staff to open many disconnected pages.

---

# 55. NOTIFICATIONS

Build a notification architecture.

Channels:

* in-app
* email

Future:

* SMS
* WhatsApp Business API
* push notification

Notification examples:

* listing submitted;
* listing approved;
* changes requested;
* listing rejected;
* payment received;
* listing expiring;
* enquiry received;
* inspection confirmed;
* inspection rescheduled;
* offer received;
* offer accepted;
* verification completed;
* transaction update.

Create notification preferences.

Security/compliance messages must not always be optional.

---

# 56. WHATSAPP

WhatsApp is important in Nigeria.

However:

Do not expose sellers' WhatsApp by default.

Use an Enugu Properties business contact where configured.

Property page CTA may generate something similar to:

> Hello Enugu Properties, I am interested in property EP-2026-000142.

Use proper URL encoding.

Keep the number in admin/system configuration.

Do not hardcode a personal telephone number.

---

# 57. SEO STRATEGY

SEO must be treated as a core product feature.

Build clean indexable pages for:

* Houses for sale in Enugu
* Land for sale in Enugu
* Commercial property for sale in Enugu
* Property in Independence Layout
* Property in Trans Ekulu
* Land in Emene
* Houses in New Haven
* etc.

Use human-readable slugs.

Example:

`/property/4-bedroom-detached-duplex-independence-layout-ep-142`

Area pages:

`/areas/independence-layout`

Property category page:

`/properties/land`

---

# 58. AREA PAGES

Every major area can eventually become a useful market guide.

Template:

## Property for Sale in [Area], Enugu

Content:

* introduction;
* properties currently available;
* property categories;
* map;
* lifestyle/access overview;
* neighbouring areas;
* market insights where genuine data exists;
* FAQ;
* latest listings.

Never fabricate market statistics.

Create content/data fields so editorial information can be updated through admin/CMS.

---

# 59. MARKET INSIGHTS / CONTENT

Create an SEO/editorial section.

Potential article categories:

* Buying Guides
* Selling Guides
* Area Guides
* Property Verification
* Diaspora Property Buying
* Market Updates

Potential future articles:

* How to Buy Land in Enugu
* How to Verify Property in Enugu
* Understanding Property Documents in Enugu
* Buying Property in Enugu From the UK
* Questions to Ask Before Buying Land
* Property Guide to Independence Layout
* Property Guide to Trans Ekulu

Do not manufacture legal advice.

Articles requiring legal guidance should be reviewed by appropriate professionals.

---

# 60. TECHNICAL SEO

Implement:

* title metadata;
* description metadata;
* canonical URLs;
* Open Graph;
* Twitter cards;
* sitemap.xml;
* robots.txt;
* breadcrumb structured data where appropriate;
* organisation structured data;
* website/search structured data where appropriate;
* semantic HTML;
* excellent Core Web Vitals.

Do not index:

* account pages;
* admin;
* private dashboards;
* arbitrary search-query combinations;
* duplicate filter URLs.

Use canonical strategy for filtered results.

---

# 61. PROPERTY EXPIRY

Listings automatically expire according to plan.

Example:

Free → 30 days
Plus → 45 days
Premium → 60 days

Store actual expiry timestamp.

Before expiry:

* notify seller;
* allow renewal;
* offer upgrade.

Expired property remains visible to seller.

Public URLs should ideally return an appropriate inactive page rather than immediately disappear if the property had SEO value.

Example:

> This property is no longer available.

Then suggest similar properties.

---

# 62. SOLD PROPERTY

When marked sold:

* record sold date;
* preserve transaction record;
* public page states no longer available;
* optionally hide final sale price unless business policy permits;
* suggest similar properties.

Do not automatically delete sold pages.

---

# 63. FEATURED ALGORITHM

Featured placement should not destroy search usefulness.

Use:

1. relevance/filter match;
2. valid listing status;
3. quality/completeness;
4. promotional weighting;
5. freshness.

Do not show irrelevant featured houses above someone's filtered land search.

---

# 64. SAVED PROPERTIES

Buyers can favourite properties.

Allow saved-property alerts later.

If property:

* price changes;
* becomes under offer;
* sells;
* receives updated verification;

future notification support should be possible.

---

# 65. ANALYTICS FOR SELLERS

Plus/Premium may see:

* listing views;
* unique visitors;
* favourites;
* enquiries;
* inspection requests;
* offer activity;
* traffic source where appropriate.

Never expose buyer identities through analytics.

---

# 66. PLATFORM ANALYTICS

Admin needs:

* new listings;
* approval rate;
* rejection reasons;
* average moderation time;
* property categories;
* area inventory;
* listing views;
* enquiry conversion;
* inspection conversion;
* offer conversion;
* completed transactions;
* revenue by product;
* seller type;
* acquisition source.

Build reporting-friendly database structures.

Do not install invasive analytics without privacy consideration.

---

# 67. DATABASE DESIGN

Create migrations and a clean relational schema.

Likely entities include:

```text
users / auth users
profiles
organisations
organisation_members

roles
permissions
role_permissions

locations
areas
developments

properties
property_revisions
property_features
property_media

property_documents
document_types

listing_plans
listings
listing_plan_snapshots
listing_orders
promotions

verification_types
property_verifications
verification_evidence

moderation_reviews
risk_flags

enquiries
saved_properties

inspection_requests
inspections
inspection_media

offers
offer_events

transaction_cases
transaction_participants
transaction_events

agreements
agreement_versions
agreement_acceptances
marketing_mandates

commission_rules
commissions

orders
payments
refunds

property_reports
report_actions

kyc_profiles
kyc_documents
compliance_reviews

professional_providers
professional_assignments

notifications
notification_preferences

audit_logs

content_pages
articles
article_categories

system_settings
```

Do not blindly create every table if a cleaner normalised model exists.

Document your reasoning.

---

# 68. IDENTIFIERS

Use internal UUIDs or equivalent.

Also generate human-readable references.

Examples:

Property:

`EP-2026-000001`

Enquiry:

`EPQ-2026-000001`

Inspection:

`EPI-2026-000001`

Transaction:

`EPT-2026-000001`

Payment:

`EPP-2026-000001`

Generate safely without race conditions.

---

# 69. SEARCH IMPLEMENTATION

MVP can use PostgreSQL search/filtering.

Design for future external search engine integration if inventory grows.

Search should be able to match:

* property title;
* location;
* estate;
* area;
* property type;
* features.

Do not prematurely introduce Elasticsearch unless required.

---

# 70. PERFORMANCE

Targets:

* fast initial page load;
* strong mobile performance;
* CDN caching where safe;
* optimised database queries;
* pagination;
* no loading thousands of listings into browser;
* server-side filtering;
* responsive image sizes;
* lazy video;
* skeleton states.

Avoid N+1 database queries.

---

# 71. ACCESSIBILITY

Meet strong accessibility practices.

Include:

* keyboard navigation;
* visible focus states;
* proper labels;
* alt text;
* accessible dialogs;
* sufficient contrast;
* semantic headings;
* screen-reader-friendly verification information;
* accessible form errors.

Do not communicate verification status using colour alone.

---

# 72. SECURITY

Treat this as a high-value marketplace.

Implement:

* secure authentication;
* email verification;
* strong password requirements if passwords are used;
* password reset security;
* rate limiting;
* CSRF protection as appropriate;
* XSS protection;
* input validation;
* server-side authorisation;
* secure file validation;
* signed private URLs;
* restrictive CORS;
* safe headers;
* session management;
* abuse detection;
* admin security;
* audit logs.

Strongly consider admin MFA.

Build architecture ready for MFA even if not activated initially.

---

# 73. FILE SECURITY

This deserves specific attention.

NEVER expose sensitive documents through:

`/public/uploads/...`

Private property/KYC documents must require authorisation.

Use:

* private storage;
* short-lived signed URLs;
* access checks;
* download/view audit logs where practical.

Prevent indexing.

Documents must not appear in:

* sitemap;
* public search;
* browser-accessible static folders.

---

# 74. DOCUMENT PREVIEW

Where safe:

* preview PDFs/images inside admin;
* watermark sensitive previews if useful;
* avoid unnecessary downloading.

Consider displaying:

> Confidential — Enugu Properties Verification

on generated preview layers in future.

Do not permanently alter originals.

---

# 75. CONTENT SECURITY

Property descriptions are user-generated content.

Sanitise appropriately.

Do not allow arbitrary:

* HTML;
* scripts;
* iframes;
* tracking pixels.

Validate external links.

---

# 76. ACCOUNT ABUSE

Create account statuses:

```text
pending
active
restricted
suspended
banned
closed
```

Track reasons internally.

Suspending seller should allow staff to pause relevant properties.

Do not permanently destroy evidence when banning accounts.

---

# 77. ADMIN CONFIGURATION

Make important business rules configurable.

Admin settings should eventually cover:

* company name;
* support email;
* support phone;
* WhatsApp;
* default commission;
* listing plans;
* promotion prices;
* media limits;
* listing duration;
* verification types;
* property types;
* locations;
* document categories;
* moderation reasons;
* report reasons;
* inspection settings;
* payment provider;
* site maintenance mode.

Do not expose secrets in normal admin settings.

---

# 78. LEGAL PAGES

Build professionally structured initial pages for:

## Terms of Use

## Privacy Policy

## Cookie Policy

## Seller Terms

## Buyer Terms

## Property Verification Disclaimer

## Complaints Procedure

However:

Mark legal copy in source/project documentation as requiring Nigerian professional legal review before production launch.

Seller terms must eventually address:

* authority to list;
* truthfulness;
* documents;
* commission;
* introductions;
* anti-circumvention;
* listing removal;
* fraud;
* liability;
* transaction responsibility.

Do not make up unenforceable clauses merely to sound protective.

---

# 79. OPERATING COMPANY

Display in footer:

> Enugu Properties is operated by MAGENCY ONLINE SOLUTIONS LTD.

Create configuration fields/placeholders for:

* CAC/company number;
* registered Nigerian address;
* support email;
* telephone;
* complaints contact.

Do not invent information we have not supplied.

---

# 80. DISCLAIMER PRINCIPLE

Clearly distinguish:

### Reviewed Listing

from:

### Verified Identity

from:

### Property Inspected

from:

### Documents Reviewed

from:

### Official Search Completed

from:

### Legal Due Diligence Completed

These are NOT equivalent.

A user should be able to click any trust badge and understand exactly what it means.

---

# 81. DO NOT MISLEAD BUYERS

Avoid phrases such as:

* “100% genuine”
* “guaranteed title”
* “fraud-proof”
* “fully safe”
* “government verified” unless an actual government verification specifically supports that statement.

Use factual statuses.

---

# 82. MVP SCOPE

Build the first release around:

### Public

* homepage;
* property browsing;
* property search/filter;
* property detail;
* area pages;
* featured properties;
* informational pages;
* safety;
* verification explanation;
* diaspora page.

### Authentication

* registration;
* login;
* password/account recovery;
* email verification.

### Seller

* profile;
* seller type;
* property creation wizard;
* draft save;
* media upload;
* private document upload;
* plan selection;
* payment;
* submit for review;
* dashboard.

### Buyer

* account;
* saved properties;
* enquiries;
* inspection requests.

### Admin

* dashboard;
* seller review;
* property moderation;
* document review;
* verification workflow;
* inspection assignment;
* listing management;
* account management;
* payment records;
* reports;
* settings;
* audit logs.

### Basic transaction support

* offers;
* transaction case;
* transaction timeline;
* commission record.

Do NOT delay launch for highly advanced future functionality.

---

# 83. NOT MVP

Do NOT prioritise these until core marketplace works:

* rental marketplace;
* short lets;
* property management;
* mortgages;
* mortgage underwriting;
* crowdfunding;
* fractional property investment;
* cryptocurrency;
* property auctions;
* AI valuation;
* automated land-title conclusions;
* in-platform escrow;
* native mobile apps;
* blockchain;
* overly complex chat;
* complex multi-country rollout.

Architect for future growth without overbuilding.

---

# 84. FUTURE PHASES

Prepare architecture for:

## Phase 2

* professional photography booking;
* drone services;
* paid buyer due diligence;
* advanced diaspora service;
* professional dashboards;
* advanced notifications;
* WhatsApp Business;
* saved-search alerts.

## Phase 3

* developer portals;
* estate projects;
* inventory/unit management;
* advanced market data;
* verified professional directory;
* mortgage referral integrations;
* regulated escrow partner integration if approved.

## Phase 4

Potential geographic expansion beyond Enugu.

---

# 85. QUALITY STANDARDS

Do not deliver:

* fake buttons;
* static dashboards pretending to function;
* hardcoded property cards used as the real database;
* broken mobile layouts;
* placeholder authentication;
* insecure uploads;
* fake payment success;
* fake verification;
* fake admin features.

Every core MVP feature should actually work.

Seed/demo data is fine but must be clearly separated from production data.

---

# 86. TEST DATA

Create realistic fictional Enugu sample listings.

Clearly mark sample/demo seed data.

Example categories:

* Detached duplex — Independence Layout
* Residential land — Emene
* Duplex — Trans Ekulu
* Commercial building — New Haven
* Development land — Ugwuaji

Use plausible but fictional owners.

Never use real people's personal identity documents.

---

# 87. TESTING

Implement automated tests appropriate to the stack.

At minimum test critical flows:

### Authentication

* registration
* login
* authorisation

### Listing

* create draft
* media limit
* plan enforcement
* submit
* admin approve
* reject
* changes requested
* expiry

### Security

* seller cannot access another seller's private listing documents
* buyer cannot access seller KYC
* public cannot access private storage
* moderator cannot perform unauthorised finance action

### Payment

* valid webhook
* invalid signature
* duplicate webhook
* successful payment
* failed payment

### Verification

* paid plan cannot set verification
* material listing change invalidates/reviews applicable verification

### Enquiries

* create enquiry
* seller/admin notification
* privacy controls

### Inspection

* request
* assign
* complete
* publish status

### Commission

* correct configurable calculation
* no commission until qualifying state

---

# 88. END-TO-END TESTING

Use browser/end-to-end testing for primary user journeys.

Test at least:

### Seller Journey

Register → create property → upload images → select plan → pay where applicable → submit → admin review → approved → public listing.

### Buyer Journey

Browse → filter → property → save → enquire → request inspection.

### Admin Journey

Login → moderation queue → review seller/property → request changes → approve → verify → manage inspection.

### Transaction Journey

Enquiry → offer → accepted → transaction case → status updates → completed → commission calculation.

---

# 89. BROWSER TESTING

Test:

* desktop Chrome;
* mobile Chrome viewport;
* Safari-like mobile behaviour where available;
* tablet widths.

Pay particular attention to:

* upload forms;
* filter drawer;
* property gallery;
* admin tables;
* modal/dialog accessibility.

---

# 90. EMPTY STATES

Do not neglect empty states.

Examples:

Seller with no listings:

> You haven't listed a property yet.

CTA:

**List Your First Property**

Buyer with no favourites:

> Save properties you like and compare them here.

Admin queue empty:

> No properties currently waiting for review.

Professional and helpful.

---

# 91. ERROR HANDLING

Never show cryptic database errors to users.

Create:

* helpful form messages;
* failed upload recovery;
* payment recovery;
* retry states;
* offline/network errors;
* 404;
* 500;
* maintenance page.

Log technical detail server-side without exposing secrets.

---

# 92. COPY STYLE

Use professional Nigerian/British English.

Tone:

* trustworthy;
* calm;
* clear;
* knowledgeable;
* not overly corporate;
* not sensational.

Avoid excessive exclamation marks.

Avoid hype such as:

> “THE NUMBER ONE REVOLUTIONARY PROPERTY SUPER APP!!!”

Trust is more important than hype.

---

# 93. CURRENCY

Primary currency:

**Nigerian Naira (₦ / NGN)**

Create currency helper functions.

Store money safely using integer minor units or another robust representation.

Do not use JavaScript floating point directly for financial calculation.

Architecture should permit other currencies in future.

---

# 94. DATE / TIME

Store timestamps in UTC.

Display local Nigerian transaction/admin times appropriately where relevant.

Be explicit where deadlines matter.

---

# 95. COMMISSION ACCOUNTING

Commission record should support:

```text
not_applicable
estimated
due
invoiced
partially_paid
paid
waived
disputed
written_off
```

Track:

* sale price;
* calculation basis;
* percentage;
* amount;
* adjustments;
* invoice/reference;
* payment date.

Do not automatically charge a seller's card for a multi-million-naira commission without explicit agreement.

---

# 96. PROPERTY PRICE HISTORY

Maintain price history.

When seller changes price:

* record previous price;
* new price;
* timestamp.

Allow public display:

**Price Reduced**

when appropriate.

Do not expose sensitive negotiation history.

---

# 97. PROPERTY REVISION HISTORY

Every material property edit should be reconstructable.

Especially after moderation.

Admin should be able to compare:

Previous value → New value.

---

# 98. VERIFICATION EXPIRY

Certain checks may become stale.

Build optional expiry/recheck dates.

Example:

A physical inspection from two years ago should not necessarily imply current condition.

Do not hardcode expiry rules yet.

Make configurable.

---

# 99. PUBLIC SELLER INFORMATION

Do not expose sensitive identity information.

Possible public seller card:

* Owner / Agent / Developer
* account age
* identity verification status
* organisation name where applicable
* number of active properties

Do not show:

* ID number
* NIN
* home address
* private documents.

---

# 100. ADMIN IMPERSONATION

If admin impersonation is ever implemented:

* require strong permission;
* display clear banner;
* audit every session;
* never allow silent impersonation.

It is not essential for MVP.

---

# 101. DATABASE MIGRATIONS

Everything must be reproducible.

Use migrations.

Do not manually modify production database without corresponding migration.

Seed scripts should be idempotent where possible.

---

# 102. DOCUMENTATION

Create:

`README.md`

Include:

* project overview;
* architecture;
* local setup;
* environment variables;
* database setup;
* migrations;
* seeding;
* storage;
* payment testing;
* email testing;
* running tests;
* deployment.

Also create:

`docs/architecture.md`

`docs/business-rules.md`

`docs/security.md`

`docs/verification-model.md`

`docs/admin-workflows.md`

`docs/deployment.md`

---

# 103. BUSINESS RULES DOCUMENT

Document explicitly:

* what featured means;
* what verified means;
* plan limits;
* moderation requirements;
* verification invalidation;
* property expiry;
* success commission;
* enquiry ownership;
* transaction lifecycle.

Avoid leaving critical business behaviour hidden in source code.

---

# 104. DEPLOYMENT

Prepare for secure production deployment.

Do not deploy automatically to production unless environment is clearly configured and permission exists.

Set up:

* production build;
* linting;
* type checking;
* tests;
* migration procedure;
* secret configuration;
* database backup strategy;
* error monitoring;
* uptime monitoring.

The app should be deployable to an appropriate modern hosting platform.

---

# 105. OBSERVABILITY

Add proper error monitoring hooks.

Log:

* server errors;
* payment webhook failures;
* upload failures;
* failed background jobs;
* unusual admin/security events.

Never log:

* passwords;
* full NIN;
* secret keys;
* full private documents;
* payment credentials.

---

# 106. BACKGROUND JOBS

Use a robust scheduled/background mechanism for:

* expiring listings;
* expiry reminders;
* pending-payment cleanup;
* notification sending;
* media processing if needed;
* stale verification reminders.

Jobs must be idempotent.

---

# 107. EMAIL TEMPLATES

Create polished transactional templates for:

* Welcome
* Verify Email
* Password Reset
* Listing Submitted
* Changes Required
* Listing Approved
* Listing Rejected
* Listing Expiring
* Payment Receipt
* Enquiry Received
* Inspection Requested
* Inspection Confirmed
* Offer Received
* Offer Updated
* Verification Update

Keep branding consistent.

---

# 108. NO FAKE AI

Do not add an AI chatbot simply because the site concerns property.

AI features should only be added where they solve a real problem.

Possible future use:

* description assistance;
* moderation assistance;
* duplicate-image detection;
* document classification;
* fraud risk triage.

Any AI-generated property description must be grounded exclusively in seller-supplied facts.

Never allow AI to infer title validity.

---

# 109. HOME PAGE FEATURED INVENTORY

Create admin controls to:

* feature property;
* schedule feature period;
* remove feature;
* see promotion source;
* distinguish paid from editorial/admin feature.

Do not allow a seller to manually set `featured=true`.

---

# 110. CONTENT MANAGEMENT

Basic informational pages should be editable without redeploying code where practical.

Possible CMS fields:

* page title
* slug
* content
* SEO title
* SEO description
* publication state
* last updated
* author/editor

A simple database-backed editorial system is sufficient.

Do not introduce a heavyweight third-party CMS unless justified.

---

# 111. CONTACT

Create Contact page.

Categories:

* General Enquiry
* Buying Property
* Selling Property
* Verification
* Diaspora Buyer
* Report a Property
* Partnership
* Complaints

Send to appropriate internal queue/email.

Use spam protection.

---

# 112. CUSTOMER SUPPORT RECORD

Where practical, customer messages should create support records rather than disappearing into email only.

Store:

* reference;
* category;
* customer;
* message;
* assigned agent;
* status;
* resolution.

MVP can remain lightweight.

---

# 113. PROPERTY SLUGS

Do not rely on mutable title alone.

Example:

`/property/4-bedroom-duplex-independence-layout-ep-000142`

If title changes, preserve redirects where feasible.

---

# 114. PUBLIC LOCATION PRIVACY

Store exact coordinates privately.

Public display options:

```text
exact
approximate
area_only
hidden
```

Default ordinary listings to approximate/area as appropriate.

Do not leak private coordinates through page source/API responses when hidden.

This is important.

---

# 115. API SECURITY

Do not return sensitive fields and merely hide them with CSS.

Design separate safe API projections/DTOs for:

* public;
* authenticated buyer;
* seller;
* moderator;
* compliance.

Assume browser users can inspect network responses.

---

# 116. PAGINATION

Use proper pagination or cursor pagination.

Do not expose `/properties` returning every record.

---

# 117. RATE LIMITING

Protect:

* login;
* registration;
* password reset;
* enquiry;
* report property;
* contact form;
* uploads;
* verification code endpoints;
* payment initialisation.

---

# 118. ADMIN SEARCH

Admin should be able to search by:

* property reference;
* seller name;
* email;
* telephone;
* transaction reference;
* enquiry reference;
* payment reference;
* location;
* organisation.

Sensitive search capability must be permission-controlled.

---

# 119. PLATFORM CONFIGURATION

Provide development seed configuration.

But no production-specific fake data such as:

* company registration number;
* bank account;
* Nigerian office address;
* WhatsApp number.

Use clear placeholders.

---

# 120. INITIAL CONTENT

Write polished real content for:

* homepage;
* How It Works;
* Verification;
* Safety;
* Buying From Abroad;
* Sell Your Property;
* Pricing;
* About.

Do not use Lorem Ipsum.

Make it credible and specifically relevant to Enugu.

---

# 121. ABOUT PAGE

Explain that Enugu Properties is operated by MAGENCY ONLINE SOLUTIONS LTD and exists to improve transparency, trust and accessibility in the Enugu property market.

Do not attack competitors.

Do not claim official government endorsement.

---

# 122. HOW IT WORKS

Create separate buyer and seller tabs/sections.

### Buyer

1. Search
2. Ask questions
3. Inspect
4. Review verification
5. Request due diligence
6. Make an offer
7. Complete with appropriate professionals

### Seller

1. Create account
2. Add property
3. Upload information
4. Submit for review
5. Listing approved
6. Receive enquiries
7. Inspections/offers
8. Complete sale
9. Success fee where contractually applicable

---

# 123. VERIFICATION PAGE

This page must be excellent.

Explain each verification level.

Example:

## Identity Verified

What it means.

What it does NOT mean.

## Site Inspected

What it means.

What it does NOT mean.

## Documents Reviewed

What it means.

What it does NOT mean.

## Official Search Completed

What it means.

What it does NOT mean.

## Legal Due Diligence

What it means.

Who completed it.

This transparency is central to our brand.

---

# 124. PRIVACY AND LEGAL COMPLIANCE

Architecture must accommodate applicable Nigerian privacy, real-estate and AML requirements.

Do not attempt to make final legal conclusions from this engineering brief.

Before production:

* Nigerian solicitor should review legal terms;
* privacy compliance should be reviewed;
* AML/SCUML obligations should be confirmed;
* regulated property/professional activity boundaries should be confirmed.

Build the platform so compliance requirements can be implemented rather than forcing legal shortcuts later.

---

# 125. IMPORTANT RESTRICTIONS

Do NOT:

1. Auto-publish seller listings.
2. Sell verification badges.
3. Expose KYC documents publicly.
4. Hardcode the 2% success commission throughout the code.
5. Hardcode plan prices throughout the application.
6. Let sellers mark themselves verified.
7. Let sellers set themselves featured.
8. Treat payment redirect as proof of payment.
9. Store secrets in code.
10. Hold property purchase money.
11. Promise guaranteed title.
12. Allow material verified information to change silently.
13. Expose exact private GPS in API payloads.
14. Expose seller NIN or ID numbers.
15. Invent legal/regulatory credentials.
16. Claim Enugu Properties is affiliated with ENGIS or the Enugu State Government unless formally authorised.
17. Build a fake escrow system.
18. Build fake verification.
19. use placeholder functionality for core MVP features.
20. sacrifice security for speed.

---

# 126. WORKING METHOD

Before changing code:

1. inspect the entire repository;
2. identify current architecture;
3. identify reusable components;
4. identify security concerns;
5. identify missing dependencies;
6. document the implementation approach.

If this is an empty repository:

create the project from scratch using the architecture above.

Do not stop after writing an implementation plan.

Once the architecture is understood, begin implementation.

Work systematically.

---

# 127. BUILD PHASES

Use approximately this order.

## PHASE 0 — FOUNDATION

* inspect repository;
* architecture;
* dependencies;
* environment setup;
* database foundation;
* authentication;
* design system;
* base layout.

## PHASE 1 — PUBLIC MARKETPLACE

* homepage;
* property search;
* property cards;
* property detail;
* area pages;
* informational pages;
* responsive navigation/footer.

## PHASE 2 — SELLER SYSTEM

* seller profile;
* create property wizard;
* drafts;
* media;
* private documents;
* plan system;
* payments;
* submission.

## PHASE 3 — MODERATION & ADMIN

* admin auth/RBAC;
* moderation queue;
* property review;
* seller review;
* approval;
* rejection;
* changes requested;
* audit logs.

## PHASE 4 — BUYER SYSTEM

* account;
* saved properties;
* enquiries;
* inspection requests;
* notifications.

## PHASE 5 — VERIFICATION

* verification types;
* evidence;
* inspection system;
* public badges;
* material-change invalidation.

## PHASE 6 — TRANSACTIONS

* offers;
* transaction cases;
* timelines;
* agreements;
* configurable commissions.

## PHASE 7 — SEO / CONTENT / POLISH

* area SEO;
* metadata;
* sitemap;
* schema;
* content system;
* performance;
* accessibility.

## PHASE 8 — SECURITY / TESTING / RELEASE

* RLS audit;
* permissions audit;
* private file tests;
* payment webhook tests;
* E2E;
* mobile tests;
* production build;
* deployment documentation.

---

# 128. PROGRESS REPORTING

After each meaningful phase, provide:

### Completed

What was implemented.

### Database

New migrations/tables.

### Testing

Tests run and results.

### Security

Relevant controls completed.

### Remaining

Next tasks.

### Decisions Needed

Only decisions that genuinely require business input.

Do not ask unnecessary questions when a sensible reversible default can be used.

---

# 129. DESIGN REVIEW REQUIREMENT

After the first public UI is built:

run the website locally and inspect it visually at:

* desktop;
* mobile.

Fix:

* spacing;
* typography;
* hierarchy;
* broken responsiveness;
* poor image crops;
* card consistency;
* accessibility;
* weak empty states.

Do not assume successful compilation equals good design.

---

# 130. ACCEPTANCE CRITERIA FOR MVP

We should consider the initial platform technically successful when:

### Seller

A new seller can:

1. register;
2. complete profile;
3. create property;
4. upload permitted media;
5. securely upload private documents;
6. choose plan;
7. pay if required;
8. accept seller terms;
9. submit listing;
10. track moderation status.

### Admin

Admin can:

1. see submission;
2. inspect seller;
3. inspect property;
4. access authorised private documents;
5. request changes;
6. approve/reject;
7. add verification records;
8. assign inspection;
9. audit history.

### Buyer

Buyer can:

1. browse;
2. search;
3. filter;
4. view property;
5. understand verification;
6. save;
7. enquire;
8. request inspection;
9. make an offer when enabled.

### Transaction

Staff can:

1. convert qualified enquiry/offer into transaction case;
2. update transaction status;
3. record milestones;
4. store appropriate documents;
5. record completed sale;
6. calculate configurable commission.

### Security

Unauthorised users cannot obtain:

* KYC;
* ownership evidence;
* private property documents;
* exact hidden location;
* admin information.

### Commercial

Plans, prices, duration, limits and commissions are configurable.

---

# 131. FINAL PRODUCT PHILOSOPHY

Always remember:

The most valuable thing we are building is not the property grid.

It is not the homepage.

It is not the search bar.

It is **trust infrastructure around Enugu property transactions**.

The long-term value of Enugu Properties will come from buyers eventually thinking:

> “If I am buying property in Enugu, I want to check Enugu Properties first.”

And diaspora buyers thinking:

> “Before I send money to buy property in Enugu, I want Enugu Properties involved.”

Build every important feature with that objective in mind.

---

# 132. BEGIN

Begin by:

1. inspecting the repository;
2. writing a concise technical architecture assessment;
3. creating or validating the project structure;
4. setting up the database schema/migrations;
5. establishing the design system;
6. building the public homepage and property marketplace foundation;
7. then continuing through the phases above.

Do not merely return mockups or a theoretical plan.

Start implementing the actual production-quality application.

Where information such as company number, office address, production email, telephone, payment credentials or legal wording is not yet available:

**use explicit configuration placeholders rather than inventing the information.**

Maintain professional engineering standards throughout.
