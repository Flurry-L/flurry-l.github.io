import siteConfig from "../site.config.json";

export const SITE = siteConfig.site;
export const POSTS = siteConfig.posts;
export const SOCIALS = siteConfig.socials;
export const SHARE_LINKS = siteConfig.shareLinks;

const env = import.meta.env;

// Defaults come from the repository's public giscus app config; the
// PUBLIC_GISCUS_* environment variables override them (see .env.example).
export const GISCUS = {
  repo: env.PUBLIC_GISCUS_REPO || "Flurry-L/flurry-l.github.io",
  repoId: env.PUBLIC_GISCUS_REPO_ID || "R_kgDOM37R5A",
  category: env.PUBLIC_GISCUS_CATEGORY || "Announcements",
  categoryId: env.PUBLIC_GISCUS_CATEGORY_ID || "DIC_kwDOM37R5M4DA9uq",
} as const;

export const GISCUS_ENABLED = Boolean(
  GISCUS.repo && GISCUS.repoId && GISCUS.category && GISCUS.categoryId
);
