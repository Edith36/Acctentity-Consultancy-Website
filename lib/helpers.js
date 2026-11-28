export const SITE = 'https://www.acctentity.co.ke';

// Older posts have no status: treat them as published
export const isLive = (p) => (p.status || 'published') === 'published' &&
  new Date(p.publishAt || p.date).getTime() <= Date.now();
export const published = (posts) => posts.filter(isLive)
  .sort((a, b) => new Date(b.publishAt || b.date) - new Date(a.publishAt || a.date));
export const day = (d) => new Date(d).toLocaleDateString('en-GB',
  { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' });