// Turns the article text into HTML. Used by the live site and the admin preview.
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
export const slugify = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/, '');

const safeUrl = (u) => /^(https?:\/\/|\/(?!\/)|mailto:|tel:)/i.test(u);
function inline(text) {
  return esc(text)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt, url) =>
      safeUrl(url) ? `<img src="${url}" alt="${alt}" loading="lazy">` : alt)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, url) =>
      safeUrl(url) ? `<a href="${url}">${label}</a>` : label)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

export function render(body) {
  const lines = String(body || '').replace(/\r/g, '').split('\n');
  const out = [], toc = [], ids = new Set();
  const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  const isBullet = (l) => /^\s*([-•]|\*(?!\*))\s+/.test(l);
  const isNumber = (l) => /^\s*\d+[.)]\s+/.test(l);
  const isTable = (l) => /^\s*\|.*\|\s*$/.test(l);
  const isHeading = (l) => /^##{1,2}\s+/.test(l);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (isHeading(line)) {
      const level = line.startsWith('###') ? 3 : 2;
      const text = line.replace(/^#+\s+/, '').trim();
      let id = slugify(text) || 'section';
      for (let n = 2; ids.has(id); n++) id = `${slugify(text) || 'section'}-${n}`;
      ids.add(id);
      if (level === 2) toc.push({ id, text });
      out.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
      i++;
    } else if (isBullet(line) || isNumber(line)) {
      const test = isBullet(line) ? isBullet : isNumber;
      const tag = test === isBullet ? 'ul' : 'ol';
      const items = [];
      while (i < lines.length && test(lines[i]))
        items.push(`<li>${inline(lines[i++].replace(/^\s*([-•*]|\d+[.)])\s+/, ''))}</li>`);
      out.push(`<${tag}>${items.join('')}</${tag}>`);
    } else if (isTable(line)) {
      const rows = [];
      while (i < lines.length && isTable(lines[i])) rows.push(cells(lines[i++]));
      const data = rows.slice(1).filter((r) => !r.every((c) => /^:?-+:?$/.test(c)));
      const row = (r, t) => `<tr>${r.map((c) => `<${t}>${inline(c)}</${t}>`).join('')}</tr>`;
      out.push(`<div class="table"><table><thead>${row(rows[0], 'th')}</thead><tbody>${data.map((r) => row(r, 'td')).join('')}</tbody></table></div>`);
    } else {
      const para = [];
      while (i < lines.length && lines[i].trim() && !isHeading(lines[i]) && !isBullet(lines[i]) &&
             !isNumber(lines[i]) && !isTable(lines[i])) para.push(inline(lines[i++]));
      out.push(`<p>${para.join('<br>')}</p>`);
    }
  }
  return { html: out.join('\n'), toc };
}