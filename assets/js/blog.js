fetch('/api/posts')
  .then((r) => (r.ok ? r.json() : []))
  .then((posts) => {
    const box = document.getElementById('blog');
    for (const p of posts) {
      const card = document.createElement('div');
      card.className = 'tile';
      if (p.image) {
        const img = document.createElement('img');
        img.src = '/api/image?name=' + p.image;
        img.alt = p.imageAlt || p.title;
        img.loading = 'lazy';
        card.append(img);
      }
      const title = document.createElement('b');
      title.textContent = p.title;
      const text = document.createElement('span');
      text.textContent = p.summary;
      const info = document.createElement('small');
      info.style.display = 'block';
      info.textContent = [p.category, new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })].filter(Boolean).join(' · ');
      const link = document.createElement('a');
      link.href = '/blog/' + p.slug;
      link.textContent = 'Read article →';
      card.append(info, title, text, link);
      box.append(card);
    }
    document.getElementById('blog-section').hidden = posts.length === 0;
  })
  .catch(() => {});