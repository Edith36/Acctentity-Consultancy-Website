import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { readPosts, writePosts, put, del } from '../lib/store.js';

const json = (data, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const hash = (s) => createHash('sha256').update(s).digest();

async function isAdmin(request) {
  const real = process.env.ADMIN_PASSWORD || '';
  const given = decodeURIComponent(request.headers.get('x-admin-password') || '');
  const ok = real.length >= 12 && timingSafeEqual(hash(given), hash(real));
  if (!ok) await new Promise((r) => setTimeout(r, 1500)); // slows password guessing
  return ok;
}
const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'post';

export async function GET(request) {
  // The admin page uses ?check=1 to test the password
  if (new URL(request.url).searchParams.has('check') && !(await isAdmin(request)))
    return json({ error: 'Wrong password' }, 401);
  return json(await readPosts());
}

export async function POST(request) {
  if (!(await isAdmin(request))) return json({ error: 'Wrong password' }, 401);
  const b = await request.json().catch(() => ({}));
  const title = String(b.title || '').trim();
  const summary = String(b.summary || '').trim();
  const body = String(b.body || '').trim();
  if (!title || !body) return json({ error: 'Title and article text are required' }, 400);

  const posts = await readPosts();
  const old = b.slug ? posts.find((p) => p.slug === b.slug) : null;
  if (b.slug && !old) return json({ error: 'Post not found' }, 404);

  let slug = old?.slug;
  if (!slug) {
    const base = slugify(title);
    slug = base;
    for (let n = 2; posts.some((p) => p.slug === slug); n++) slug = `${base}-${n}`;
  }

  let image = old?.image || '';
  if (b.image) {
    const m = /^data:image\/(webp|jpeg|png);base64,([A-Za-z0-9+/=]+)$/.exec(b.image);
    if (!m) return json({ error: 'The photo could not be read' }, 400);
    const name = `${randomUUID()}.${m[1]}`;
    await put(`blog/img/${name}`, Buffer.from(m[2], 'base64'), {
      access: 'private', contentType: `image/${m[1]}`
    });
    image = name;
  }

  const post = { slug, title, summary, body, image, date: old?.date || new Date().toISOString() };
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