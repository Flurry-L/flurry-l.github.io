declare module "virtual:posts-meta" {
  export const posts: import("./post").PostMeta[];
}

declare module "virtual:post-loaders" {
  export const postLoaders: Record<
    string,
    () => Promise<{ default: import("./post").Post }>
  >;
}

declare module "virtual:post/*" {
  const post: import("./post").Post;
  export default post;
}

declare module "virtual:pages" {
  export interface Page {
    title: string;
    description: string;
    html: string;
  }

  export const pages: Record<string, Page>;
}

declare module "virtual:pages-meta" {
  export const pages: Record<string, { title: string; description: string }>;
}
