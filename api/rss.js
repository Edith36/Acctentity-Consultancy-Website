import { readPosts } from '../lib/store.js';
import { SITE, published } from '../lib/helpers.js';
import { esc } from '../assets/js/render.js';

export async function GET() {
  const items = published(await readPosts()).slice(0, 20).map((p) => `<item>
<title>${esc(p.title)}</title><link>${SITE}/blog/${p.slug}</link><guid>${SITE}/blog/${p.slug}</guid>
<pubDate>${new Date(p.publishAt || p.date).toUTCString()}</pubDate><description>${esc(p.summary)}</description></item>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Acctentity Insights</title><link>${SITE}/insights</link>
<description>Accounting, tax and business guidance in Kenya</description>
${items}
</channel></rss>`, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 's-maxage=300' } });
}