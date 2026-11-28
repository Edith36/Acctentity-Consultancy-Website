import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { readPosts, writePosts, put, del } from '../lib/store.js';
import { published } from '../lib/helpers.js';
import { slugify } from '../assets/js/render.js';

const json = (data, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const hash = (s) => createHash('sha256').update(s).digest();
const CATEGORIES = ['Business Registration', 'KRA Tax', 'Accounting', 'Payroll', 'Advisory'];

async function isAdmin(request) {
  const real = process.env.ADMIN_PASSWORD || '';
  const given = decodeURIComponent(request.headers.get('x-admin-password') || '');
  const ok = real.length >= 12 && timingSafeEqual(hash(given), hash(real));
  if (!ok) await new Promise((r) => setTimeout(r, 1500)); // slows password guessing
  return ok;
}

async function saveImage(data) {
  const m = /^data:image\/(webp|jpeg|png);base64,([A-Za-z0-9+/=]+)$/.exec(data);
  if (!m) return '';
  const name = `${randomUUID()}.${m[1]}`;
  await put(`blog/img/${name}`, Buffer.from(m[2], 'base64'), { access: 'private', contentType: `image/${m[1]}` });
  return name;
}

export async function GET(request) {
  // ?admin=1 (with password) shows drafts and scheduled posts too
  if (new URL(request.url).searchParams.has('admin')) {
    if (!(await isAdmin(request))) return json({ error: 'Wrong password' }, 401);
    return json(await readPosts());
  }
  // Public list: published only, without the full article text
  return json(published(await readPosts()).map((p) => ({
    slug: p.slug, title: p.title, summary: p.summary, category: p.category || '',
    image: p.image, imageAlt: p.imageAlt || p.title, date: p.publishAt || p.date
  })));
}

export async function POST(request) {
  if (!(await isAdmin(request))) return json({ error: 'Wrong password' }, 401);
  const b = await request.json().catch(() => ({}));

  // Photo placed inside the article text
  if (b.upload) {
    const name = await saveImage(b.upload);
    return name ? json({ url: `/api/image?name=${name}` }) : json({ error: 'The photo could not be read' }, 400);
  }

  const str = (v, max = 300) => String(v || '').trim().slice(0, max);
  const posts = await readPosts();
  const old = b.id ? posts.find((p) => p.slug === b.id) : null;
  if (b.id && !old) return json({ error: 'Post not found' }, 404);

  const title = str(b.title, 150), body = str(b.body, 100000);
  const status = ['draft', 'published', 'scheduled'].includes(b.status) ? b.status : 'draft';
  if (!title) return json({ error: 'Title is required' }, 400);
  if (status !== 'draft' && !body) return json({ error: 'Article text is required' }, 400);

  const slug = slugify(b.slug || title) || 'post';
  const taken = posts.some((p) => p !== old && (p.slug === slug || p.aliases?.includes(slug)));
  if (taken) return json({ error: `Another article already uses the URL /blog/${slug}` }, 400);

  const imageAlt = str(b.imageAlt, 200);
  if (status !== 'draft' && (b.image || old?.image) && !imageAlt)
    return json({ error: 'Describe the featured photo in "Alt text"' }, 400);

  let publishAt = old?.publishAt || old?.date || '';
  const wanted = b.publishAt && !Number.isNaN(Date.parse(b.publishAt)) ? new Date(b.publishAt).toISOString() : '';
  if (wanted) publishAt = wanted;
  if (status === 'scheduled' && !(Date.parse(wanted) > Date.now()))
    return json({ error: 'Choose a future date and time to schedule' }, 400);
  if (status === 'published' && !(Date.parse(publishAt) <= Date.now())) publishAt = new Date().toISOString();

  let image = old?.image || '';
  if (b.image) {
    image = await saveImage(b.image);
    if (!image) return json({ error: 'The photo could not be read' }, 400);
  }
  let authorImage = old?.authorImage || posts.find((p) => p.author === str(b.author) && p.authorImage)?.authorImage || '';
  if (b.authorImage) authorImage = (await saveImage(b.authorImage)) || authorImage;

  const canonical = str(b.canonical);
  const changed = old && (old.title !== title || old.body !== body);
  const aliases = [...new Set([...(old?.aliases || []), ...(old && old.slug !== slug ? [old.slug] : [])])]
    .filter((a) => a !== slug);

  const post = {
    slug, aliases, title, body, status, publishAt,
    summary: str(b.summary),
    category: CATEGORIES.includes(b.category) ? b.category : '',
    tags: str(b.tags).split(',').map((t) => t.trim()).filter(Boolean).slice(0, 10),
    image, imageAlt, author: str(b.author, 80), authorImage,
    seoTitle: str(b.seoTitle, 120), metaDescription: str(b.metaDescription),
    keyword: str(b.keyword, 80), canonical: /^https:\/\//.test(canonical) ? canonical : '',
    faqs: (Array.isArray(b.faqs) ? b.faqs : [])
      .map((f) => ({ q: str(f.q, 200), a: str(f.a, 1500) })).filter((f) => f.q && f.a).slice(0, 8),
    date: old?.date || new Date().toISOString(),
    // "Updated" only changes when a post that was already live is edited
    updatedAt: changed && (old.status || 'published') === 'published' ? new Date().toISOString() : old?.updatedAt || ''
  };

  await writePosts(old ? posts.map((p) => (p === old ? post : p)) : [post, ...posts]);
  if (old?.image && old.image !== image) await del(`blog/img/${old.image}`);
  return json(post);
}

export async function DELETE(request) {
  if (!(await isAdmin(request))) return json({ error: 'Wrong password' }, 401);
  const slug = new URL(request.url).searchParams.get('slug');
  const posts = await readPosts();
  const post = posts.find((p) => p.slug === slug);
  if (!post) return json({ error: 'Post not found' }, 404);
  await writePosts(posts.filter((p) => p !== post));
  if (post.image) await del(`blog/img/${post.image}`);
  return json({ ok: true });
}