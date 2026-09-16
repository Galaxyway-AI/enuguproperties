# Production domain checklist

- Keep production DNS unchanged until launch is authorised.
- Attach `enuguproperties.com` to the production Worker and provision Cloudflare SSL.
- Choose the canonical apex domain and add a permanent `www` redirect.
- Set `NEXT_PUBLIC_APP_URL=https://enuguproperties.com`; verify canonical tags, sitemap and production robots behavior.
- Add the exact production hostname to Neon Auth trusted domains and callbacks.
- Create production Turnstile keys restricted to the production hostname.
- Enable Kora live checkout only after sandbox reconciliation and legal/commercial approval. Use the per-checkout Enugu Properties notification URL so other merchant integrations remain unaffected.
- Verify CSP, CORS, cookies, signed media access and R2 production-bucket bindings.
- Configure SPF and DKIM from the selected mail provider. Add one DMARC record after inspecting existing DNS; do not create duplicate SPF/DMARC records.
- Apply migrations to the protected production database before application release and run `npm run db:verify`.
- Confirm HSTS after all required subdomains support HTTPS.
- Run public, authenticated, payment, private-document and mobile acceptance tests before enabling indexing.
