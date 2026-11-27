import { readPosts } from '../lib/store.js';
import { head, header, footer } from '../lib/layout.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export async function GET(request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug') || url.pathname.split('/').pop();
  const post = (await readPosts()).find((p) => p.slug === slug);

  // Blank line = new paragraph. A block starting with "## " = heading.
  const content = post
    ? post.body.split(/\r?\n\s*\r?\n/).map((t) => t.startsWith('## ')
        ? `<h2>${esc(t.slice(3))}</h2>`
        : `<p>${esc(t).replace(/\r?\n/g, '<br>')}</p>`).join('\n')
    : '<p>This article does not exist or was removed.</p>';
  const title = post ? post.title : 'Article not found';
  const img = post?.image ? `/api/image?name=${post.image}` : '';

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} | Acctentity Consultancy</title>
<meta name="description" content="${esc(post?.summary || '')}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:image" content="${url.origin}${img || '/assets/img/og-image.webp'}">
${head}</head><body>
${header}
<main>
<div class="ph"><div class="w"><div class="loc">${post ? new Date(post.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Nairobi' }) : ''}</div><h1>${esc(title)}</h1></div></div>
<section><div class="w" style="max-width:820px">
${img ? `<img class="photo" src="${img}" alt="${esc(title)}">` : ''}
${content}
<p><a href="/insights.html">&larr; Back to Insights</a></p>
</div></section>
</main>
${footer}
</body></html>`;

  return new Response(html, {
    status: post ? 200 : 404,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}