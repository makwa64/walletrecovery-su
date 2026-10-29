# Wallet Support — Netlify-ready project

This package keeps the existing Wallet Support page and adds Netlify Functions plus Netlify Blobs storage for support requests.

## Included
- `public/index.html` — existing Wallet Support website, with its form pointed to the same site's `/api/requests` endpoint.
- `admin.html` — private dashboard UI at `/admin.html`.
- `netlify/functions/api.mjs` — request API and token-protected admin API.
- `netlify.toml` — Netlify publish, function and API routing configuration.

## Deploy on Netlify
1. Upload the contents of this folder to your GitHub repository (keep the `public` and `netlify` folders and `netlify.toml` in the repository root).
2. In Netlify, choose **Add new project / Import an existing project** and connect that GitHub repository.
3. Build command can be left blank; publish directory should be `public`. The included `netlify.toml` sets these values too.
4. In the Netlify site's **Environment variables**, add `ADMIN_TOKEN` with a long random secret (at least 32 characters). Generate one privately and do not share it or put it in GitHub. Save, then redeploy the site.
5. Open the deployed site and submit a test using a wallet name, your contact email, and optionally a **public** wallet address.
6. Open `https://YOUR-SITE.netlify.app/admin.html`, enter the same `ADMIN_TOKEN`, and tap **Load requests**.

Netlify Blobs stores requests persistently for this project. The site must be deployed on Netlify for the managed store to work as expected. If Netlify asks to enable Blobs or storage, follow its dashboard prompt.

## Safety
This form only accepts wallet name, optional public wallet address, and contact email. Never request or store seed phrases, private keys, wallet passwords, one-time codes, or recovery codes. The admin dashboard is protected by `ADMIN_TOKEN`; keep it private. Submissions are stored, but this starter does not send email automatically. The success popup appears only after the API confirms that the request was saved.

## Local note
The managed Netlify Blobs store requires Netlify's runtime/context. For local development, use `npm install` then `npx netlify dev` and configure the `ADMIN_TOKEN` environment variable.
