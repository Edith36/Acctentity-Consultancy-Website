import { readPosts } from '../lib/store.js';

const site = 'https://www.acctentity.co.ke';
const pages = ['/', '/about', '/services', '/accounting', '/tax', '/advisory', '/audit',
  '/company-registration', '/erp-solutions', '/insights', '/contact'];

export async function GET() {
  // If storage fails, still list the main pages
  const posts = await readPosts().catch(() => []);
  const urls = [...pages, ...posts.map((p) => `/blog/${p.slug}`)]
    .map((path) => `  <url><loc>${site}${path}</loc></url>`).join('\n');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 's-maxage=300' } }
  );
}