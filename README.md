# Flurry's Blog

Personal blog built with Astro, Vue, and Markdown.

## Development

```bash
npm install
npm run dev
```

Run `npm run build` before publishing.

## Content

Published posts live in `src/content/posts`, with local article images stored
beside their Markdown files. Standalone Markdown pages live in
`src/content/pages`.

## Deployment

Pushing `main` deploys the site through `.github/workflows/deploy.yml`. In the
repository's **Settings > Pages**, set **Build and deployment > Source** to
**GitHub Actions**. The custom domain is tracked in `public/CNAME`.

## Comments

Article comments use [Giscus](https://giscus.app/) and default to this
repository's `Announcements` discussion category. The public repository and
category IDs live in `src/site.ts`, so comments work without deployment
secrets. Before publishing, keep the repository public, enable GitHub
Discussions, install the Giscus app for the repository, and keep the configured
discussion category available.

These optional GitHub Actions repository variables can override the defaults.
Set all four together:

```text
PUBLIC_GISCUS_REPO
PUBLIC_GISCUS_REPO_ID
PUBLIC_GISCUS_CATEGORY
PUBLIC_GISCUS_CATEGORY_ID
```

When testing an alternative Giscus repository locally, copy `.env.example` to
`.env` and fill in all four values.

## Analytics

The recommended analytics provider is
[Cloudflare Web Analytics](https://developers.cloudflare.com/web-analytics/get-started/).
Because `blog.flurry.top` is already proxied by Cloudflare, enable Web Analytics
for the domain in the Cloudflare dashboard and use automatic setup. Cloudflare
will inject the beacon at the edge, so no analytics token or script is stored in
this repository.
