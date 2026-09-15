# Environment matrix

| Setting         | Local                                  | Staging                            | Production                                |
| --------------- | -------------------------------------- | ---------------------------------- | ----------------------------------------- |
| Application URL | `http://127.0.0.1:3000`                | Worker staging URL                 | `https://enuguproperties.com`             |
| Database        | PGlite/local tests or Neon development | Dedicated Neon staging branch      | Protected Neon production branch          |
| Public R2       | Test binding                           | `enugu-properties-media-dev`       | `enugu-properties-media`                  |
| Private R2      | Test binding                           | `enugu-properties-private-dev`     | `enugu-properties-private`                |
| Paystack        | Test only                              | TEST                               | LIVE only after explicit release approval |
| Email           | Disabled or provider test              | Verified-domain real/test delivery | Verified production sender                |
| Turnstile       | Provider test keys                     | Staging-host keys                  | Production-host keys                      |
| Indexing        | Noindex                                | Noindex header and robots block    | Enabled at approved launch                |
| Beta mode       | Optional                               | `true`                             | Launch decision                           |
| Demo inventory  | Explicit local preview only            | Clearly labelled if enabled        | Disabled                                  |
| Registration    | Development decision                   | QA only when dependencies work     | Disabled until Auth, email and Turnstile pass |
| Paid listings   | Paystack test only                     | Paystack test only                 | Disabled pending a separate live-payment release |

Secrets belong in local ignored files or Cloudflare secret bindings. Public identifiers and feature flags may be ordinary environment variables. Staging and production must not share database branches, storage buckets, auth secrets or Paystack keys.
