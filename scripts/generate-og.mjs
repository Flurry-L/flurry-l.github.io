// Generates a 1200x630 Open Graph image for every published post into
// public/og/. Runs before `astro dev`/`astro build` (see package.json) so the
// images are plain static assets — no dynamic route involved.
//
// NOTE: getReadingTime/formatDate are intentionally duplicated from
// src/utils/posts.ts (which can't be imported here: it uses Astro's
// extensionless ESM + virtual modules). Keep the logic in sync.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import satori from 'satori';
import sharp from 'sharp';
import { parse } from 'yaml';

const root = process.cwd();
const postsDir = join(root, 'src/content/posts');
const outDir = join(root, 'public/og');
const SITE = {
  title: "Flurry's Blog",
  description: '记录技术和生活。',
  timeZone: 'Asia/Shanghai',
  locale: 'zh-CN',
};

const dateFormatter = new Intl.DateTimeFormat(SITE.locale, {
  timeZone: SITE.timeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function readingTime(body) {
  const chinese = body.match(/[㐀-鿿]/g)?.length ?? 0;
  const latin = body.replace(/[㐀-鿿]/g, ' ').match(/[A-Za-z0-9_]+/g)?.length ?? 0;
  return Math.max(1, Math.ceil((chinese + latin * 2) / 420));
}

function loadPosts() {
  return readdirSync(postsDir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => {
      const raw = readFileSync(join(postsDir, file), 'utf8');
      const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
      if (!match) throw new Error(`No frontmatter in ${file}`);
      const data = parse(match[1]) ?? {};
      const calendar = data.weekendCalendar;
      const calendarText = calendar
        ? `${calendar.summary} ${(calendar.events ?? []).map((event) => `${event.date} ${event.text}`).join(' ')}`
        : '';
      return {
        id: file.replace(/\.md$/, ''),
        title: String(data.title ?? ''),
        date: new Date(data.date),
        tags: (Array.isArray(data.tags) ? data.tags : [data.tags]).filter(Boolean),
        draft: Boolean(data.draft),
        body: `${match[2]} ${calendarText}`,
      };
    })
    .filter((post) => !post.draft)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

const fontData = readFileSync(join(root, 'src/assets/fonts/NotoSansCJKsc-Bold.otf'));

async function renderOg(post) {
  const meta = post.date
    ? [dateFormatter.format(post.date), `${readingTime(post.body)} 分钟阅读`]
        .concat(post.tags.map((tag) => `#${tag}`))
        .join('  ·  ')
    : SITE.description;

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '1200px',
          height: '630px',
          padding: '72px 80px',
          background: '#f4f7fa',
          borderLeft: '16px solid #3572b0',
          fontFamily: 'Noto Sans CJK SC',
          color: '#33414e',
        },
        children: [
          {
            type: 'div',
            props: {
              style: { display: 'flex', alignItems: 'baseline', gap: '16px' },
              children: [
                {
                  type: 'span',
                  props: {
                    style: { fontSize: '30px', color: '#3572b0' },
                    children: SITE.title,
                  },
                },
                {
                  type: 'span',
                  props: {
                    style: { fontSize: '24px', color: '#64707c' },
                    children: SITE.description,
                  },
                },
              ],
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                fontSize: '72px',
                lineHeight: 1.35,
                overflow: 'hidden',
                maxHeight: '300px',
              },
              children: post.title,
            },
          },
          {
            type: 'div',
            props: {
              style: { display: 'flex', fontSize: '26px', color: '#5a6873' },
              children: meta,
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Noto Sans CJK SC', data: fontData, weight: 700, style: 'normal' },
      ],
    },
  );

  return sharp(Buffer.from(svg)).png().toBuffer();
}

mkdirSync(outDir, { recursive: true });
const posts = loadPosts();
for (const post of posts) {
  writeFileSync(join(outDir, `${post.id}.png`), await renderOg(post));
}
// Site-wide default share image (referenced as /og.jpg by BaseLayout).
const sitePng = await renderOg({ title: SITE.title, date: null, tags: [], body: '' });
await sharp(sitePng).jpeg({ quality: 85 }).toFile(join(root, 'public/og.jpg'));
console.log(`[og] generated ${posts.length} images in public/og`);
