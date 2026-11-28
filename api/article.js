import { readPosts } from '../lib/store.js';
import { head, header, footer } from '../lib/layout.js';
import { SITE, published, day } from '../lib/helpers.js';
import { render, esc } from '../assets/js/render.js';

const css = `<style>
.post{max-width:820px}.post img{max-width:100%;border-radius:10px}.post a{color:var(--od)}
.table{overflow-x:auto;margin:0 0 1.2em}table{border-collapse:collapse;width:100%}th,td{border:1px solid var(--ln);padding:8px 12px;text-align:left}
.toc{background:var(--soft);padding:18px 24px;border-radius:8px;margin-bottom:28px}.toc ul{margin:6px 0 0;padding-left:1.2em}
.by{display:flex;gap:12px;align-items:center;margin-bottom:24px;color:var(--mu)}.by img{width:48px;height:48px;border-radius:50%;object-fit:cover}
.post h2{font-size:1.7rem;margin-top:1.4em}
</style>`;
const img = (name) => `/api/image?name=${name}`;
const ld = (data) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

export async function GET(request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug') || url.pathname.split('/').pop();
  const live = published(await readPosts());
  const post = live.find((p) => p.slug === slug);

  if (!post) {
    const moved = live.find((p) => p.aliases?.includes(slug));
    if (moved) return new Response(null, { status: 308, headers: { Location: `/blog/${moved.slug}` } });
  }

  const title = post ? post.seoTitle || `${post.title} | Acctentity Consultancy` : 'Article not found | Acctentity Consultancy';
  const description = post ? post.metaDescription || post.summary || '' : '';
  const canonical = post ? post.canonical || `${SITE}/blog/${post.slug}` : '';
  const social = post?.image ? SITE + img(post.image) : `${SITE}/assets/img/og-image.webp`;
  const date = post ? post.publishAt || post.date : '';
  let main = '<div class="ph"><div class="w"><h1>Article not found</h1></div></div><section><div class="w post"><p><a href="/insights">Back to Insights</a></p></div></section>';
  let schema = '';

  if (post) {
    const { html, toc } = render(post.body);
    const score = (p) => (p.category && p.category === post.category ? 2 : 0) +
      (p.tags || []).filter((t) => (post.tags || []).includes(t)).length;
    const related = live.filter((p) => p !== post).sort((a, b) => score(b) - score(a)).slice(0, 3);

    schema = ld({
      '@context': 'https://schema.org', '@type': 'BlogPosting',
      headline: post.title, description, image: [social], mainEntityOfPage: canonical,
      datePublished: date, dateModified: post.updatedAt || date,
      author: post.author ? { '@type': 'Person', name: post.author } : { '@type': 'Organization', name: 'Acctentity Consultancy' },
      publisher: { '@type': 'Organization', name: 'Acctentity Consultancy', logo: { '@type': 'ImageObject', url: `${SITE}/assets/img/logo.png` } }
    });
    if (post.faqs?.length) schema += ld({
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: post.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
    });

    main = `<div class="ph"><div class="w">${post.category ? `<div class="loc">${esc(post.category)}</div>` : ''}<h1>${esc(post.title)}</h1></div></div>
<section><article class="w post">
<div class="by">${post.authorImage ? `<img src="${img(post.authorImage)}" alt="${esc(post.author)}">` : ''}<div>${post.author ? `<b>${esc(post.author)}</b><br>` : ''}Published: ${day(date)}${post.updatedAt ? ` · Updated: ${day(post.updatedAt)}` : ''}</div></div>
${post.image ? `<img class="photo" src="${img(post.image)}" alt="${esc(post.imageAlt || post.title)}">` : ''}
${toc.length > 1 ? `<nav class="toc"><b>In this article</b><ul>${toc.map((h) => `<li><a href="#${h.id}">${esc(h.text)}</a></li>`).join('')}</ul></nav>` : ''}
${html}
${post.faqs?.length ? `<h2>Frequently asked questions</h2>${post.faqs.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}` : ''}
${post.tags?.length ? `<p><small>Tags: ${post.tags.map(esc).join(', ')}</small></p>` : ''}
<p><a href="/insights">&larr; Back to Insights</a></p>
</article></section>
${related.length ? `<section class="soft"><div class="w"><h2>Related articles</h2><div class="grid">${related.map((p) => `<div class="tile">${p.image ? `<img src="${img(p.image)}" alt="${esc(p.imageAlt || p.title)}" loading="lazy">` : ''}<b>${esc(p.title)}</b><span>${esc(p.summary)}</span><a href="/blog/${p.slug}">Read article &rarr;</a></div>`).join('')}</div></div></section>` : ''}`;
  }

  const meta = post ? `<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="article"><meta property="og:title" content="${esc(post.seoTitle || post.title)}">
<meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${social}"><meta name="twitter:card" content="summary_large_image">` : '<meta name="robots" content="noindex">';

  const page = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${meta}
<link rel="alternate" type="application/rss+xml" title="Acctentity Insights" href="/rss.xml">
${head}${css}${schema}</head><body>
${header}
<main>
${main}
</main>
${footer}
</body></html>`;

  return new Response(page, {
    status: post ? 200 : 404,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}