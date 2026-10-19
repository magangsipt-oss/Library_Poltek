(() => {
  const module = document.getElementById('admin-module');
  const content = document.getElementById('module-content');
  const dashboard = document.querySelector('.dashboard-content');
  const pageTitle = document.getElementById('page-title');
  const sidebar = document.getElementById('admin-sidebar');
  const routes = {
    'cat-entry': { title: 'Entri Katalog', description: 'Buat rekaman bibliografis dan data katalog baru.' },
    'cat-entry-rda': { title: 'Entri Katalog (RDA)', description: 'Buat rekaman katalog dengan elemen deskripsi RDA.' },
    'cat-copy': { title: 'Salin Katalog', description: 'Pilih rekaman katalog untuk membuat salinan bibliografis baru.' },
    'cat-list': { title: 'Daftar Katalog', description: 'Cari, salin, karantina, atau kelola rekaman katalog.' },
    'cat-export': { title: 'Export Data Tag Katalog', description: 'Ekspor data MARC dan metadata katalog dalam format JSON.' },
    'cat-digital': { title: 'Daftar Konten Digital', description: 'Unggah dan kelola berkas konten digital yang terkait dengan katalog.' },
    'cat-basket': { title: 'Keranjang Katalog', description: 'Tinjau dan kelola katalog yang berada di keranjang.' },
    'cat-quarantine': { title: 'Karantina Katalog', description: 'Tinjau rekaman yang dikarantina dan pulihkan bila diperlukan.' },
    'cat-articles': { title: 'Daftar Koleksi Artikel', description: 'Kelola artikel lepas, terbitan berkala, dan konten digital artikel.' }
  };
  let renderVersion = 0;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function safeUrl(value) {
    const url = String(value || '').trim();
    if (url.startsWith('/') && !url.startsWith('//')) return url;
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol) ? url : '';
    } catch {
      return '';
    }
  }

  async function api(path, options = {}) {
    const response = await fetch(`/api/admin/catalog${path}`, {
      credentials: 'same-origin',
      ...options,
      headers: { ...(options.body instanceof Blob ? {} : { 'Content-Type': 'application/json' }), ...(options.headers || {}) }
    });
    if (response.status === 401) {
      window.location.replace('/admin/login.html');
      throw new Error('Sesi admin berakhir. Silakan masuk kembali.');
    }
    if (response.status === 204) return null;
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Permintaan katalog gagal diproses.');
    return result;
  }

  function field(label, name, options = {}) {
    const type = options.type || 'text';
    const max = options.max ? `maxlength="${options.max}"` : '';
    const value = options.value !== undefined ? `value="${escapeHtml(options.value)}"` : '';
    const required = options.required ? 'required' : '';
    const min = options.min !== undefined ? `min="${options.min}"` : '';
    const maxValue = options.maxValue !== undefined ? `max="${options.maxValue}"` : '';
    return `<div class="module-field"><label for="cat-${name}">${escapeHtml(label)}</label>
      <input id="cat-${name}" name="${name}" type="${type}" ${required} ${max} ${min} ${maxValue} ${value}></div>`;
  }

  function panel(title, body) {
    return `<section class="module-panel"><div class="module-panel-heading"><h2>${escapeHtml(title)}</h2></div>${body}</section>`;
  }

  function table(headers, rows, emptyMessage) {
    return `<div class="module-table-wrap"><table class="module-table"><thead><tr>${headers.map(item => `<th>${escapeHtml(item)}</th>`).join('')}</tr></thead>
      <tbody>${rows || `<tr><td class="module-table-empty" colspan="${headers.length}">${escapeHtml(emptyMessage)}</td></tr>`}</tbody></table></div>`;
  }

  function shell(routeKey, body, badge = 'Katalog') {
    const route = routes[routeKey];
    return `<div class="module-heading"><div><p class="module-breadcrumb">Katalog <span>›</span> ${escapeHtml(route.title)}</p>
      <h1>${escapeHtml(route.title)}</h1><p>${escapeHtml(route.description)}</p></div><span class="module-badge">${escapeHtml(badge)}</span></div>
      <div class="module-toast" id="cat-message" role="status" hidden></div>${body}`;
  }

  function showMessage(message, error = false) {
    const notice = document.getElementById('cat-message');
    if (!notice) return;
    notice.classList.toggle('is-error', error);
    notice.setAttribute('role', error ? 'alert' : 'status');
    notice.textContent = message;
    notice.hidden = false;
  }

  async function items(path) {
    return (await api(path)).items;
  }

  function parseJson(value, label, fallback) {
    if (!value.trim()) return fallback;
    try {
      return JSON.parse(value);
    } catch {
      throw new Error(`${label} harus berupa JSON yang valid.`);
    }
  }

  async function renderEntry(isRda) {
    const rdaFields = isRda ? `<div class="module-form-grid">
      ${field('Variasi bentuk judul', 'variant_titles', { max: 2000 })}
      ${field('Judul asli', 'original_title', { max: 500 })}
      ${field('Judul seragam', 'uniform_title', { max: 500 })}
      ${field('Nama kreator', 'creator', { max: 500 })}</div>` : '';
    return panel('Data Bibliografis', `<div class="module-panel-body">
      <form class="module-form" data-form="catalog-record" data-record-type="${isRda ? 'rda' : 'standard'}">
        <div class="module-form-grid">
          ${field('BIBID (kosongkan untuk dibuat otomatis)', 'bibid', { max: 80 })}
          <div class="module-field"><label for="cat-material-type">Jenis bahan</label><select id="cat-material-type" name="material_type">
            <option>Monograf</option><option>Serial</option><option>Peta</option><option>Musik</option><option>Video</option><option>Bahan khusus</option><option>Lainnya</option>
          </select></div>
          ${field('Judul utama', 'title', { max: 500, required: true })}
          ${field('Anak judul', 'subtitle', { max: 500 })}
          ${field('Penanggung jawab', 'responsibility', { max: 500 })}
          ${field('Tajuk pengarang / kreator', 'creator', { max: 500 })}
          ${field('Edisi', 'edition', { max: 255 })}
          ${field('Penerbitan / publikasi', 'publication_statement', { max: 500 })}
          ${field('Penerbit', 'publisher', { max: 255 })}
          ${field('Tahun terbit', 'publication_year', { type: 'number', min: 1000, maxValue: 9999 })}
          ${field('Deskripsi fisik', 'physical_description', { max: 500 })}
          ${field('Subjek', 'subject', { max: 5000 })}
          ${field('Nomor panggil', 'call_number', { max: 120 })}
          ${field('ISBN', 'isbn', { max: 32 })}
          ${field('Tautan konten digital', 'digital_content_url', { max: 2000 })}
        </div>${rdaFields}
        <div class="module-field"><label for="cat-marc-data">Ruas MARC 21 (JSON)</label>
          <textarea id="cat-marc-data" name="marc_data" placeholder='[{"tag":"245","indicator1":"1","indicator2":"0","value":"Judul"}]'>[]</textarea>
          <span class="module-help">Isi daftar ruas MARC berupa tag tiga digit, dua indikator, dan value.</span></div>
        ${isRda ? `<div class="module-field"><label for="cat-rda-data">Metadata RDA tambahan (JSON)</label>
          <textarea id="cat-rda-data" name="rda_data" placeholder='{"variasi_bentuk_judul":[],"judul_asli":""}'>{}</textarea></div>` : ''}
        <div class="module-form-actions"><button class="module-button is-primary" type="submit">Simpan</button>
          <a class="module-button is-neutral" href="#cat-list">Selesai</a><a class="module-button" href="#cat-list">Salin Katalog dari Daftar</a></div>
      </form></div>`);
  }

  async function renderRecords(status = 'all', routeKey = 'cat-list') {
    const query = new URLSearchParams({ status });
    const records = await items(`/records?${query}`);
    const selection = routeKey === 'cat-export';
    const rows = records.map(record => {
      const lifecycleActions = record.is_legacy
        ? `<button class="module-button is-primary" type="button" data-action="catalogize-book" data-book-id="${record.book_id}">Katalogkan</button>`
        : record.lifecycle_status === 'active'
          ? `<button class="module-button" type="button" data-action="catalog-status" data-id="${record.id}" data-status="basket">Keranjang</button>
             <button class="module-button is-warning" type="button" data-action="catalog-status" data-id="${record.id}" data-status="quarantine">Karantina</button>
             <button class="module-button is-danger" type="button" data-action="delete-record" data-id="${record.id}">Hapus</button>`
          : `<button class="module-button is-primary" type="button" data-action="catalog-status" data-id="${record.id}" data-status="active">Pulihkan</button>`;
      return `<tr><td>${selection && !record.is_legacy ? `<input type="checkbox" name="export_ids" value="${record.id}" aria-label="Pilih ${escapeHtml(record.title)}">` : ''}</td>
        <td>${escapeHtml(record.bibid)}</td><td><strong>${escapeHtml(record.title)}</strong>${record.subtitle ? `<br>${escapeHtml(record.subtitle)}` : ''}</td>
        <td>${escapeHtml(record.edition || '—')}</td><td>${escapeHtml(record.publication_statement || '—')}</td>
        <td>${escapeHtml(record.physical_description || '—')}</td><td>${escapeHtml(record.subject || '—')}</td>
        <td>${escapeHtml(record.call_number || '—')}</td><td>${escapeHtml(record.digital_content_id ? record.digital_file_name : record.digital_content_url || '0')}</td>
        <td>${escapeHtml(record.lifecycle_status)}</td><td><div class="module-inline-actions">${lifecycleActions}
          ${!record.is_legacy ? `<button class="module-button is-neutral" type="button" data-action="copy-record" data-id="${record.id}">Salin</button>` : ''}</div></td></tr>`;
    }).join('');
    const title = routeKey === 'cat-basket' ? 'Keranjang Katalog'
      : routeKey === 'cat-quarantine' ? 'Karantina Katalog'
        : routeKey === 'cat-export' ? 'Pilih Rekaman untuk Ekspor'
          : routeKey === 'cat-copy' ? 'Pilih Katalog Sumber'
            : 'Daftar Katalog';
    const toolbar = `<div class="module-toolbar"><div class="module-toolbar-group">
      <input class="module-filter" name="keyword" form="catalog-search" placeholder="Cari judul, kreator, atau BIBID">
      <button class="module-button" type="submit" form="catalog-search">Cari</button>
      <button class="module-button is-neutral" type="reset" form="catalog-search">Ulangi</button>
      <a class="module-button is-primary" href="#cat-entry">＋ Entri Katalog</a></div>
      ${selection ? `<button class="module-button is-primary" type="button" data-action="export-selected">Ekspor yang dipilih</button>
        <button class="module-button" type="button" data-action="export-all">Ekspor semua</button>` : ''}</div>`;
    return `${panel('Pencarian Katalog', `<div class="module-panel-body">${toolbar}<form id="catalog-search" data-form="catalog-search"><input type="hidden" name="status" value="${escapeHtml(status)}"></form></div>`)}
      ${panel(title, table([selection ? 'Pilih' : '', 'BIBID', 'Judul', 'Edisi', 'Penerbitan/Publikasi', 'Deskripsi Fisik', 'Subjek', 'Nomor Panggil', 'Konten Digital', 'Status', 'Aksi'], rows, 'Tidak ada data katalog yang ditemukan.'))}`;
  }

  async function renderDigital() {
    const [records, files] = await Promise.all([items('/records'), items('/digital-content')]);
    const options = records.filter(record => !record.is_legacy)
      .map(record => `<option value="${record.id}">${escapeHtml(record.bibid)} — ${escapeHtml(record.title)}</option>`).join('');
    const rows = files.map(file => `<tr><td>${new Date(file.uploaded_at).toLocaleDateString('id-ID')}</td>
      <td><a href="/api/admin/catalog/digital-content/${file.id}/file">${escapeHtml(file.file_name)}</a></td>
      <td>${escapeHtml(file.mime_type)}</td><td>${(Number(file.file_size) / 1024).toFixed(1)} KB</td>
      <td>${escapeHtml(file.bibid)}</td><td>${escapeHtml(file.title)}</td>
      <td><button class="module-button is-danger" type="button" data-action="delete-digital" data-id="${file.id}">Hapus</button></td></tr>`).join('');
    return `${panel('Unggah Konten Digital', `<div class="module-panel-body"><form class="module-form" data-form="digital-upload">
      <div class="module-form-grid"><div class="module-field"><label for="cat-record-id">Katalog</label><select id="cat-record-id" name="catalog_record_id" required>${options}</select></div>
      <div class="module-field"><label for="cat-digital-file">Pilih berkas</label><input id="cat-digital-file" name="file" type="file" accept=".pdf,.zip,.jpg,.jpeg,.png,.txt,.mp3" required></div></div>
      <span class="module-help">PDF, ZIP, JPG, PNG, TXT, MP3. Maksimal 20 MB per berkas.</span>
      <div class="module-form-actions"><button class="module-button is-primary" type="submit" ${options ? '' : 'disabled'}>Unggah</button></div>
      </form></div>`)}
      ${panel('Daftar Konten Digital', table(['Tanggal Unggah', 'File', 'Jenis File', 'Ukuran File', 'BIB ID', 'Data Bibliografis', 'Aksi'], rows, 'Belum ada konten digital.'))}`;
  }

  async function renderArticles() {
    const records = await items('/articles');
    const rows = records.map(record => `<tr><td>${escapeHtml(record.title)}</td><td>${escapeHtml(record.creator || '—')}</td>
      <td>${escapeHtml(record.subject || '—')}</td><td>${escapeHtml(record.serial_edition || '—')}</td>
      <td>${escapeHtml(record.catalog_title || '—')}</td><td>${safeUrl(record.digital_content_url) ? `<a href="${escapeHtml(safeUrl(record.digital_content_url))}" target="_blank" rel="noopener noreferrer">Buka</a>` : '—'}</td>
      <td><div class="module-inline-actions"><button class="module-button is-neutral" type="button" data-action="edit-article" data-id="${record.id}">Koreksi</button>
      <button class="module-button is-danger" type="button" data-action="delete-article" data-id="${record.id}">Hapus</button></div></td></tr>`).join('');
    return `${panel('Tambah / Koreksi Artikel', `<div class="module-panel-body"><form class="module-form" data-form="article" id="article-form">
      <input type="hidden" name="id"><div class="module-form-grid">
      ${field('Judul', 'title', { max: 500, required: true })}
      ${field('Kreator', 'creator', { max: 500 })}
      ${field('Subjek', 'subject', { max: 5000 })}
      ${field('Edisi serial', 'serial_edition', { max: 255 })}
      ${field('Judul katalog', 'catalog_title', { max: 500 })}
      ${field('Tautan konten digital', 'digital_content_url', { max: 2000 })}</div>
      <div class="module-form-actions"><button class="module-button is-primary" type="submit">Simpan Artikel</button>
      <button class="module-button is-neutral" type="reset">Kosongkan</button></div></form></div>`)}
      ${panel('Data Artikel', table(['Title', 'Kreator', 'Subjek', 'Edisi Serial', 'Judul Katalog', 'Konten Digital', 'Aksi'], rows, 'Tidak ada data artikel.'))}`;
  }

  async function render() {
    const routeKey = window.location.hash.slice(1);
    const route = routes[routeKey];
    if (!route) return;
    const version = ++renderVersion;
    dashboard.hidden = true;
    module.hidden = false;
    pageTitle.textContent = route.title;
    sidebar.querySelectorAll('.nav-module-link').forEach(link => {
      link.classList.toggle('is-current', link.getAttribute('href') === `#${routeKey}`);
    });
    content.innerHTML = '<p class="loading-state">Memuat data…</p>';
    try {
      let body;
      if (routeKey === 'cat-entry') body = await renderEntry(false);
      else if (routeKey === 'cat-entry-rda') body = await renderEntry(true);
      else if (routeKey === 'cat-list') body = await renderRecords('all', routeKey);
      else if (routeKey === 'cat-copy') body = await renderRecords('all', routeKey);
      else if (routeKey === 'cat-export') body = await renderRecords('all', routeKey);
      else if (routeKey === 'cat-basket') body = await renderRecords('basket', routeKey);
      else if (routeKey === 'cat-quarantine') body = await renderRecords('quarantine', routeKey);
      else if (routeKey === 'cat-digital') body = await renderDigital();
      else body = await renderArticles();
      if (version === renderVersion) content.innerHTML = shell(routeKey, body);
    } catch (error) {
      if (version !== renderVersion) return;
      console.error('Tidak dapat memuat modul Katalog:', error);
      content.innerHTML = shell(routeKey, '<p class="module-toast is-error" role="alert">Data katalog gagal dimuat. Jalankan <code>npm run db:init --prefix backend</code> untuk membuat tabel Katalog.</p>');
    }
  }

  function formData(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function downloadJson(items, filename) {
    const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), count: items.length, items }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function submit(form) {
    const data = formData(form);
    if (form.dataset.form === 'catalog-record') {
      data.record_type = form.dataset.recordType;
      data.marc_data = parseJson(data.marc_data, 'Ruas MARC', []);
      data.rda_data = form.dataset.recordType === 'rda' ? parseJson(data.rda_data, 'Metadata RDA', {}) : {};
      await api('/records', { method: 'POST', body: JSON.stringify(data) });
      window.location.hash = '#cat-list';
    } else if (form.dataset.form === 'catalog-search') {
      const search = new URLSearchParams({ status: form.elements.status.value, keyword: form.elements.keyword?.value || content.querySelector('[form="catalog-search"][name="keyword"]')?.value || '' });
      const records = await items(`/records?${search}`);
      const routeKey = window.location.hash.slice(1);
      const rows = records.map(record => `<tr>
        <td>${routeKey === 'cat-export' && !record.is_legacy ? `<input type="checkbox" name="export_ids" value="${record.id}">` : ''}</td>
        <td>${escapeHtml(record.bibid)}</td><td>${escapeHtml(record.title)}</td><td>${escapeHtml(record.edition || '—')}</td>
        <td>${escapeHtml(record.publication_statement || '—')}</td><td>${escapeHtml(record.physical_description || '—')}</td>
        <td>${escapeHtml(record.subject || '—')}</td><td>${escapeHtml(record.call_number || '—')}</td>
        <td>${escapeHtml(record.digital_content_id ? record.digital_file_name : record.digital_content_url || '0')}</td>
        <td>${escapeHtml(record.lifecycle_status)}</td><td>${record.is_legacy
          ? `<button class="module-button is-primary" data-action="catalogize-book" data-book-id="${record.book_id}">Katalogkan</button>`
          : `<button class="module-button" data-action="catalog-status" data-id="${record.id}" data-status="basket">Keranjang</button>
             <button class="module-button is-warning" data-action="catalog-status" data-id="${record.id}" data-status="quarantine">Karantina</button>
             <button class="module-button is-neutral" data-action="copy-record" data-id="${record.id}">Salin</button>`}</td></tr>`).join('');
      content.querySelector('.module-table tbody').innerHTML = rows || '<tr><td class="module-table-empty" colspan="11">Tidak ada data katalog.</td></tr>';
    } else if (form.dataset.form === 'digital-upload') {
      const file = form.elements.file.files[0];
      if (!file) throw new Error('Pilih berkas konten digital.');
      const result = await api(`/records/${encodeURIComponent(data.catalog_record_id)}/digital-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name) },
        body: file
      });
      await render();
      showMessage(`${result.item.file_name} berhasil diunggah.`);
    } else if (form.dataset.form === 'article') {
      const articleId = data.id;
      delete data.id;
      const route = articleId ? `/articles/${encodeURIComponent(articleId)}` : '/articles';
      await api(route, { method: articleId ? 'PUT' : 'POST', body: JSON.stringify(data) });
      await render();
      showMessage('Data artikel berhasil disimpan.');
    }
  }

  content.addEventListener('submit', async event => {
    const form = event.target.closest('form[data-form]');
    if (!form) return;
    event.preventDefault();
    try {
      await submit(form);
    } catch (error) {
      showMessage(error.message, true);
    }
  });

  content.addEventListener('click', async event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    try {
      if (button.dataset.action === 'catalog-status') {
        await api(`/records/${button.dataset.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: button.dataset.status }) });
        await render();
        showMessage('Status katalog berhasil diperbarui.');
      } else if (button.dataset.action === 'delete-record') {
        if (!window.confirm('Hapus rekaman katalog ini?')) return;
        await api(`/records/${button.dataset.id}`, { method: 'DELETE' });
        await render();
        showMessage('Rekaman katalog berhasil dihapus.');
      } else if (button.dataset.action === 'copy-record') {
        const result = await api(`/records/${button.dataset.id}/copy`, { method: 'POST' });
        await render();
        showMessage(`Katalog berhasil disalin sebagai ${result.item.bibid}.`);
      } else if (button.dataset.action === 'catalogize-book') {
        await api(`/records/from-book/${button.dataset.bookId}`, { method: 'POST', body: '{}' });
        await render();
        showMessage('Koleksi berhasil dibuatkan rekaman katalog.');
      } else if (button.dataset.action === 'delete-digital') {
        if (!window.confirm('Hapus berkas konten digital ini?')) return;
        await api(`/digital-content/${button.dataset.id}`, { method: 'DELETE' });
        await render();
        showMessage('Konten digital berhasil dihapus.');
      } else if (button.dataset.action === 'edit-article') {
        const record = (await items('/articles')).find(item => String(item.id) === button.dataset.id);
        if (!record) throw new Error('Data artikel tidak ditemukan.');
        const form = document.getElementById('article-form');
        form.elements.id.value = record.id;
        form.elements.title.value = record.title;
        form.elements.creator.value = record.creator || '';
        form.elements.subject.value = record.subject || '';
        form.elements.serial_edition.value = record.serial_edition || '';
        form.elements.catalog_title.value = record.catalog_title || '';
        form.elements.digital_content_url.value = record.digital_content_url || '';
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (button.dataset.action === 'delete-article') {
        if (!window.confirm('Hapus artikel ini?')) return;
        await api(`/articles/${button.dataset.id}`, { method: 'DELETE' });
        await render();
        showMessage('Artikel berhasil dihapus.');
      } else if (button.dataset.action === 'export-selected' || button.dataset.action === 'export-all') {
        const selected = button.dataset.action === 'export-selected'
          ? [...content.querySelectorAll('[name="export_ids"]:checked')].map(input => input.value)
          : [];
        if (button.dataset.action === 'export-selected' && !selected.length) throw new Error('Pilih minimal satu rekaman katalog.');
        const query = selected.length ? `?ids=${encodeURIComponent(selected.join(','))}` : '';
        const result = await api(`/records/export${query}`);
        downloadJson(result.items, 'data-tag-katalog.json');
        showMessage(`${result.count} rekaman katalog diekspor ke JSON.`);
      }
    } catch (error) {
      showMessage(error.message, true);
    }
  });

  window.addEventListener('hashchange', render);
  render();
})();
