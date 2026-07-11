export const SITE = {
  title: "Flurry's Blog",
  shortTitle: 'Flurry',
  description: '记录技术和生活。',
  author: 'Flurry',
  locale: 'zh-CN',
  url: 'https://blog.flurry.top',
  avatar: 'https://q2.qlogo.cn/headimg_dl?dst_uin=1748087899&spec=100',
  email: 'mailto:flurry.liao@gmail.com',
  github: 'https://github.com/Flurry-L',
} as const;

export const NAV_ITEMS = [
  { label: '文章', href: '/' },
  { label: '归档', href: '/archives/' },
  { label: '标签', href: '/tags/' },
  { label: '关于', href: '/about/' },
  { label: '友链', href: '/links/' },
] as const;
