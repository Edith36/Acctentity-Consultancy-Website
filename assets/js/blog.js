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
        img.alt = p.title;
        img.loading = 'lazy';
        card.append(img);
      }
      const title = document.createElement('b');
      title.textContent = p.title;
      const text = document.createElement('span');
      text.textContent = p.summary;
      const link = document.createElement('a');
      link.href = '/blog/' + p.slug;
      link.textContent = 'Read article →';
      card.append(title, text, link);
      box.append(card);
    }
    document.getElementById('blog-section').hidden = posts.length === 0;
  })
  .catch(() => {});