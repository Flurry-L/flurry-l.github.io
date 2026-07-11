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

Article comments use [Giscus](https://giscus.app/). Create a public repository
with GitHub Discussions enabled, install the Giscus app for that repository,
and add these GitHub Actions repository variables:

```text
PUBLIC_GISCUS_REPO
PUBLIC_GISCUS_REPO_ID
PUBLIC_GISCUS_CATEGORY
PUBLIC_GISCUS_CATEGORY_ID
```

Use `.env.example` for local development. The comments section is omitted until
all four values are present.

## Analytics

The recommended analytics provider is
[Cloudflare Web Analytics](https://developers.cloudflare.com/web-analytics/get-started/).
Because `blog.flurry.top` is already proxied by Cloudflare, enable Web Analytics
for the domain in the Cloudflare dashboard and use automatic setup. Cloudflare
will inject the beacon at the edge, so no analytics token or script is stored in
this repository.
