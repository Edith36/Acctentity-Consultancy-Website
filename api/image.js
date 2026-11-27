import { get } from '../lib/store.js';

export async function GET(request) {
  const name = new URL(request.url).searchParams.get('name') || '';
  if (!/^[a-f0-9-]{36}\.(webp|jpeg|png)$/.test(name)) return new Response('Not found', { status: 404 });
  const r = await get(`blog/img/${name}`, { access: 'private' });
  if (!r) return new Response('Not found', { status: 404 });
  return new Response(r.stream, {
    headers: {
      'Content-Type': r.blob.contentType,
      'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}