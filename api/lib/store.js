import { get, put, del } from '@vercel/blob';

export async function readPosts() {
  const r = await get('blog/posts.json', { access: 'private', useCache: false });
  if (!r) return [];
  return JSON.parse(await new Response(r.stream).text());
}
export const writePosts = (posts) =>
  put('blog/posts.json', JSON.stringify(posts), {
    access: 'private', allowOverwrite: true, contentType: 'application/json'
  });
export { get, put, del };