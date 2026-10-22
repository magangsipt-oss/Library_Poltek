(() => {
  const module = document.getElementById('admin-module');
  const content = document.getElementById('module-content');
  const dashboard = document.querySelector('.dashboard-content');
  const pageTitle = document.getElementById('page-title');
  const sidebar = document.getElementById('admin-sidebar');
  const moduleRoutes = {
    'acq-sources': { title: 'Daftar Nama Sumber Perolehan', description: 'Kelola sumber pembelian, hadiah, dan hibah koleksi.' },
    'acq-entry': { title: 'Entri Koleksi', description: 'Catat bibliografi dan data pengadaan koleksi baru.' },
    'acq-entry-rda': { title: 'Entri Koleksi (RDA)', description: 'Entri koleksi dengan tambahan elemen deskripsi RDA.' },
    'acq-list': { title: 'Daftar Koleksi', description: 'Cari koleksi dan kelola status inventaris.' },
    'acq-binding': { title: 'Jilid Koleksi', description: 'Catat jilid dan eksemplar koleksi.' },
    'acq-cardex': { title: 'Kardeks Terbitan Berkala', description: 'Kelola judul terbitan berkala dan penerimaan edisi.' },
    'acq-proposals': { title: 'Daftar Usulan Koleksi', description: 'Tinjau dan perbarui status usulan koleksi.' },
    'acq-import': { title: 'Import Data dari Excel', description: 'Impor data koleksi menggunakan template yang dapat dibuka di Excel.' },
    'acq-basket': { title: 'Keranjang Koleksi', description: 'Tinjau koleksi yang disiapkan untuk pengiriman.' },
    'acq-quarantine': { title: 'Karantina Koleksi', description: 'Tinjau koleksi yang ditahan sebelum dilayankan.' },
    'acq-shipping': { title: 'Pengiriman Koleksi', description: 'Buat pengiriman dari keranjang dan lihat riwayatnya.' }
  };
  const statusLabels = {
    in_stock: 'Tersedia',
    basket: 'Di keranjang',
    quarantine: 'Karantina',
    shipped: 'Dikirim'
  };
  const acquisitionChoices = {
    material_type: [
      { value: 'monograf(Buku, Jurnal, Laporan, dll)', label: 'Monograf(Buku, Jurnal, Laporan, dll)' },
      { value: 'terbitan berkala(surat kabar, majalah, dll)', label: 'Terbitan Berkala(Surat Kabar, Majalah, dll)' },
      { value: 'skripsi(karya akademik mahasiswa S1)', label: 'Skripsi(Karya Akademik Mahasiswa S1)' },
      { value: 'tesis(karya akademik mahasiswa S2)', label: 'Tesis(Karya Akademik Mahasiswa S2)' },
      { value: 'bahan grafis(foto, lukisan, dll)', label: 'Bahan Grafis(Foto, Lukisan, dll)' },
      { value: 'rekaman video', label: 'Rekaman Video' },
      { value: 'musik', label: 'Musik' },
      { value: 'bahan kartografis(peta, dll)', label: 'Bahan Kartografis(Peta, dll)' },
      { value: 'sumber elektronik(cd-rom, floppy disk, vcd, dll)', label: 'Sumber Elektronik(CD-ROM, Floppy Disk, VCD, dll)' },
      { value: 'rekaman suara', label: 'Rekaman Suara' },
      { value: 'film(film, dll)', label: 'Film(Film, dll)' },
      { value: 'bentuk mikro', label: 'Bentuk Mikro' },
      { value: 'manuskrip', label: 'Manuskrip' },
      { value: 'bahan ephemeral', label: 'Bahan Ephemeral' }
    ],
    source_type: ['Pembelian', 'Hadiah/Hibah', 'Penggantian', 'Penggandaan', 'Tukar Menukar', 'Terbitan Sendiri', 'Deposit (UU No4/1990)'],
    physical_form: ['*** Tidak Diketahui ***', 'Buku', 'CD-ROM', 'VCD', 'DVD', 'Permainan', 'Alat Musik', 'Surat Kabar', 'Atlas', 'Blue Ray', 'Buletin', 'CD', 'Foto', 'Gambar', 'Globe', 'Kaset', 'Lukisan', 'Majalah', 'Mikrofilm', 'Mikrofis', 'Mikrolegap', 'Mikropak', 'Naskah', 'Partitur Musik', 'Peta', 'Piringan Hitam', 'Realia (Patung)', 'Spanduk', 'Tabloid'],
    category: ['*** Tidak Diketahui ***', 'Koleksi Umum', 'Koleksi Referensi'],
    access_type: [
      { value: 'Dapat dipinjam', label: 'Dapat dipinjam' },
      { value: 'Baca di tempat', label: 'Baca di tempat' },
      { value: 'Tandon', label: 'Tandon' },
      { value: 'Deposit', label: 'Deposit' }
    ],
    library_location: ['Perpustakaan Pusat', 'Perpustakaan Keliling 01'],
    room_location: ['Ruang Baca Umum', 'Ruang Koleksi Referensi', 'Lobby Utama'],
    availability: ['Tersedia', 'Tidak diketahui', 'Rusak', 'Dalam Perbaikan', 'Dipinjam', 'Dalam Penggandaan', 'Diolah', 'Hilang', 'Tandon', 'Dihibahkan', 'Dibaca'],
    currency: [{ value: 'IDR', label: 'Rupiah' }, { value: 'USD', label: 'Dollar AS' }],
    price_unit: ['Per eksemplar', 'Per jilid']
  };
  let renderVersion = 0;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  }

  function api(path, options = {}) {
    return fetch(`/api/admin/acquisitions${path}`, {
      credentials: 'same-origin',
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    }).then(async response => {
      if (response.status === 401) {
        window.location.replace('/admin/login.html');
        throw new Error('Sesi admin berakhir. Silakan masuk kembali.');
      }
      if (response.status === 204) return null;
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Permintaan gagal diproses.');
      return result;
    });
  }

  function panel(title, body) {
    return `<section class="module-panel">
      <div class="module-panel-heading"><h2>${escapeHtml(title)}</h2></div>
      ${body}
    </section>`;
  }

  function field(label, name, options = {}) {
    const id = `acq-${name}`;
    const required = options.required ? 'required' : '';
    const type = options.type || 'text';
    const max = options.max ? `maxlength="${options.max}"` : '';
    const min = options.min !== undefined ? `min="${options.min}"` : '';
    const maxAttr = options.maxValue !== undefined ? `max="${options.maxValue}"` : '';
    const value = options.value !== undefined ? `value="${escapeHtml(options.value)}"` : '';
    const placeholder = options.placeholder ? `placeholder="${escapeHtml(options.placeholder)}"` : '';
    return `<div class="module-field"><label for="${id}">${escapeHtml(label)}</label>
      <input id="${id}" name="${name}" type="${type}" ${required} ${max} ${min} ${maxAttr} ${value} ${placeholder}></div>`;
  }

  function selectField(label, name, options, required = false) {
    return `<div class="module-field"><label for="acq-${name}">${escapeHtml(label)}</label>
      <select id="acq-${name}" name="${name}" ${required ? 'required' : ''}>${options}</select></div>`;
  }

  function searchableChoiceField(label, name, choices, required = false) {
    const id = `acq-${name}`;
    return `<div class="module-field"><label for="${id}">${escapeHtml(label)}</label>
      <div class="acq-material-picker acq-searchable-picker" data-choice-picker="${name}">
        <input id="${id}" name="${name}" type="text" role="combobox" aria-autocomplete="list"
          aria-expanded="false" aria-controls="${id}-options" maxlength="80"
          placeholder="Ketik atau pilih ${escapeHtml(label.toLocaleLowerCase('id'))}" ${required ? 'required' : ''}>
        <button class="acq-material-toggle" type="button" data-action="toggle-choice-options"
          aria-label="Tampilkan pilihan ${escapeHtml(label.toLocaleLowerCase('id'))}" aria-expanded="false"></button>
        <div class="acq-material-options acq-searchable-options" id="${id}-options" role="listbox" hidden>
          <input class="acq-choice-search" type="search" aria-label="Cari ${escapeHtml(label.toLocaleLowerCase('id'))}"
            placeholder="Ketik untuk mencari...">
          <div class="acq-choice-results">
            ${choices.map((choice, index) => {
              const text = typeof choice === 'string' ? choice : choice.label;
              return `<button class="acq-material-option" type="button" role="option" aria-selected="false"
                data-action="select-choice-option" data-index="${index}">${escapeHtml(text)}</button>`;
            }).join('')}
          </div>
        </div>
      </div></div>`;
  }

  function choiceOptions(name, placeholder = '') {
    const choices = acquisitionChoices[name];
    if (!choices) throw new Error(`Pilihan ${name} tidak ditemukan.`);
    const options = choices.map(choice => {
      const value = typeof choice === 'string' ? choice : choice.value;
      const label = typeof choice === 'string' ? choice : choice.label;
      return `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`;
    }).join('');
    return `${placeholder ? `<option value="">${escapeHtml(placeholder)}</option>` : ''}${options}`;
  }

  function table(headers, rows, emptyMessage) {
    return `<div class="module-table-wrap"><table class="module-table"><thead><tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
      <tbody>${rows || `<tr><td class="module-table-empty" colspan="${headers.length}">${escapeHtml(emptyMessage)}</td></tr>`}</tbody></table></div>`;
  }

  function shell(routeKey, body, badge = 'Terhubung ke database') {
    const route = moduleRoutes[routeKey];
    return `<div class="module-heading"><div>
      <p class="module-breadcrumb">Akuisisi <span>›</span> ${escapeHtml(route.title)}</p>
      <h1>${escapeHtml(route.title)}</h1><p>${escapeHtml(route.description)}</p>
      </div><span class="module-badge">${escapeHtml(badge)}</span></div>
      <div class="module-toast" id="acq-message" role="status" hidden></div>${body}`;
  }

  function showMessage(message, isError = false) {
    const box = document.getElementById('acq-message');
    if (!box) return;
    box.classList.toggle('is-error', isError);
    box.setAttribute('role', isError ? 'alert' : 'status');
    box.textContent = message;
    box.hidden = false;
  }

  async function getItems(path) {
    return (await api(path)).items;
  }

  async function getCatalogTitles() {
    const response = await fetch('/api/admin/catalog/records?status=all', { credentials: 'same-origin' });
    if (response.status === 401) {
      window.location.replace('/admin/login.html');
      throw new Error('Sesi admin berakhir. Silakan masuk kembali.');
    }
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Daftar judul katalog gagal dimuat.');
    return result.items;
  }

  async function renderSources() {
    const items = await getItems('/sources');
    const rows = items.map(item => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.address || '—')}</td>
      <td>${escapeHtml(item.phone || '—')}</td><td>${new Intl.NumberFormat('id-ID').format(item.exemplar_count)}</td>
      <td><div class="module-inline-actions"><button class="module-button is-neutral" type="button" data-action="edit-source" data-id="${item.id}">Koreksi</button>
      <button class="module-button is-danger" type="button" data-action="delete-source" data-id="${item.id}">Hapus</button></div></td></tr>`).join('');
    return `${panel('Tambah / Koreksi Sumber Perolehan', `<div class="module-panel-body">
      <form class="module-form" data-form="source" id="source-form"><input type="hidden" name="id">
        <div class="module-form-grid">${field('Nama', 'name', { required: true, max: 180 })}
          ${field('Alamat', 'address', { max: 5000 })}${field('No. Telepon', 'phone', { max: 40 })}
          ${field('Eksemplar', 'exemplar_count', { type: 'number', min: 0, maxValue: 10000000, value: 0 })}</div>
        <div class="module-form-actions"><button class="module-button is-primary" type="submit">Simpan</button>
          <button class="module-button is-neutral" type="reset">Kosongkan</button></div>
      </form></div>`) }
      ${panel('Daftar Nama Sumber Perolehan', table(['Nama', 'Alamat', 'No. Telepon', 'Eksemplar', 'Aksi'], rows, 'Belum ada sumber perolehan.'))}`;
  }

  async function acquisitionForm(isRda) {
    const sources = await getItems('/sources');
    const sourceOptions = `<option value="">---Belum ditentukan---</option>${sources.map(item =>
      `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join('')}`;
    const rdaFields = isRda ? `<div class="module-form-grid">
      ${field('Pernyataan tanggung jawab', 'responsibility_statement', { max: 500 })}
      ${field('Edisi', 'edition', { max: 120 })}${field('Penerbitan', 'publication_statement', { max: 255 })}
      ${field('Deskripsi fisik', 'physical_description', { max: 255 })}
      ${field('Seri', 'series_statement', { max: 255 })}${field('Identifier lain', 'other_identifier', { max: 120 })}
      </div>` : '';
    const sourceControl = `<div class="module-field"><label for="acq-source-id">Nama Sumber</label>
    <div class="acq-source-control"><select id="acq-source-id" name="source_id">${sourceOptions}</select>
      <a class="module-button is-danger" href="#acq-sources">Tambah</a>
      <a class="module-button is-danger" href="#acq-sources">Koreksi</a></div></div>`;
    const priceControl = `<div class="module-field acq-price-field"><label for="acq-price">Harga</label>
    <div class="acq-price-control"><input id="acq-price" name="price" type="number" min="0" max="999999999999" step="0.01" value="0.00">
      <div class="module-field"><label for="acq-price_unit">Satuan harga</label>
        <select id="acq-price_unit" name="price_unit">${choiceOptions('price_unit')}</select></div></div></div>`;
    return `<form id="acquisition-form" class="module-form acquisition-entry-form" data-form="acquisition" data-record-type="${isRda ? 'rda' : 'standard'}">
      <input type="hidden" name="book_id">
      <input type="hidden" name="title">
      <input type="hidden" name="author">
      <input type="hidden" name="publisher">
      <input type="hidden" name="publication_year">
      <input type="hidden" name="isbn">
      <input type="hidden" name="subject">
      <div class="module-form-actions acquisition-entry-toolbar">
        <button class="module-button is-success" type="submit" form="acquisition-form">Simpan</button>
        <button class="module-button is-info" type="button" data-action="choose-title">Pilih Judul</button>
        <button class="module-button is-info" type="button" data-action="copy-catalog-title">Salin Katalog dari</button>
        <a class="module-button is-complete" href="#acq-list">Selesai</a>
      </div>
      <div class="acquisition-entry-content">
        <p class="acq-selected-title" id="acq-selected-title" hidden></p>
        <div class="module-field acquisition-material-type"><label for="acq-material_type">Jenis Bahan</label>
          <div class="acq-material-picker">
            <input id="acq-material_type" name="material_type" type="text" role="combobox"
              aria-autocomplete="list" aria-expanded="false" aria-controls="acq-material-type-options"
              maxlength="30" placeholder="Ketik atau pilih jenis bahan" required>
            <button class="acq-material-toggle" type="button" data-action="toggle-material-options"
              aria-label="Tampilkan pilihan jenis bahan" aria-expanded="false"></button>
            <div class="acq-material-options" id="acq-material-type-options" role="listbox" hidden>
              ${acquisitionChoices.material_type.map((choice, index) =>
                `<button class="acq-material-option" type="button" role="option" aria-selected="false"
                  data-action="select-material-option" data-index="${index}">${escapeHtml(choice.label)}</button>`).join('')}
            </div>
          </div>
        </div>
        <section class="module-panel acquisition-entry-panel">
          <div class="module-panel-heading"><h2>Data Pengadaan</h2></div>
          <div class="module-panel-body">
            <div class="acq-form-row acq-quantity-row">${field('Jumlah Eksemplar', 'quantity', { type: 'number', min: 1, maxValue: 100000, value: 1, required: true })}</div>
            <div class="acq-identity-row">
              <span aria-hidden="true"></span>
              <div class="acq-identity-grid">
                ${field('No Induk', 'accession_no', { max: 80 })}
                ${field('No Barcode', 'barcode', { max: 80 })}
                ${field('No RFID', 'rfid', { max: 80 })}
              </div>
            </div>
            <div class="acq-form-row">${field('Tanggal Pengadaan', 'acquisition_date', { type: 'date', value: new Date().toISOString().slice(0, 10), required: true })}</div>
            <div class="acq-form-row">${selectField('Jenis Sumber', 'source_type', choiceOptions('source_type', 'Pilih Jenis Sumber'), true)}</div>
            <div class="acq-form-row">${sourceControl}</div>
            <div class="acq-form-row">${searchableChoiceField('Bentuk Fisik', 'physical_form', acquisitionChoices.physical_form, true)}</div>
            <div class="acq-form-row">${selectField('Kategori', 'category', choiceOptions('category'))}</div>
            <div class="acq-form-row">${selectField('Akses', 'access_type', choiceOptions('access_type'), true)}</div>
            <div class="acq-form-row">${selectField('Lokasi Perpustakaan', 'location', choiceOptions('library_location'))}</div>
            <div class="acq-form-row">${selectField('Lokasi Ruang', 'room_location', choiceOptions('room_location'))}</div>
            <div class="acq-form-row">${searchableChoiceField('Ketersediaan', 'availability', acquisitionChoices.availability)}</div>
            <div class="acq-form-row">${selectField('Mata Uang', 'currency', choiceOptions('currency'))}</div>
            <div class="acq-form-row">${priceControl}</div>
            <div class="acq-form-row">${field('Nomor Panggil', 'call_number', { max: 80 })}</div>
          </div>
        </section>
        <label class="acq-opac-toggle"><input type="hidden" name="show_in_opac" value="false">
          <input type="checkbox" name="show_in_opac" value="true" checked><span>Tampil di OPAC</span></label>
        ${rdaFields}
        <div class="module-form-actions acquisition-entry-toolbar">
          <button class="module-button is-success" type="submit">Simpan</button>
          <button class="module-button is-info" type="button" data-action="choose-title">Pilih Judul</button>
          <button class="module-button is-info" type="button" data-action="copy-catalog-title">Salin Katalog dari</button>
          <a class="module-button is-complete" href="#acq-list">Selesai</a>
        </div>
      </div>
      <dialog class="acq-title-dialog" aria-labelledby="acq-title-dialog-heading">
        <div class="acq-title-dialog-heading"><h2 id="acq-title-dialog-heading">Pilih Judul Katalog</h2>
          <button class="module-button is-neutral" type="button" data-action="close-title-dialog">Tutup</button></div>
        <input class="module-filter acq-title-search" type="search" placeholder="Cari judul, pengarang, atau BIBID" aria-label="Cari judul katalog">
        <div class="acq-title-options" aria-live="polite"></div>
      </dialog>
    </form>`;
  }

  async function collectionTable(status) {
    const query = new URLSearchParams({ status });
    const items = await getItems(`/collections?${query}`);
    const rows = items.map(item => {
      let actions = '';
      if (item.is_legacy) {
        actions = '—';
      } else if (item.lifecycle_status === 'in_stock') {
        actions = `<button class="module-button" data-action="collection-status" data-id="${item.id}" data-status="basket">Ke keranjang</button>
          <button class="module-button is-warning" data-action="collection-status" data-id="${item.id}" data-status="quarantine">Karantina</button>
          <button class="module-button is-danger" data-action="delete-acquisition" data-id="${item.id}">Hapus</button>`;
      } else if (item.lifecycle_status === 'basket' || item.lifecycle_status === 'quarantine') {
        actions = `<button class="module-button is-neutral" data-action="collection-status" data-id="${item.id}" data-status="in_stock">Pulihkan</button>`;
      } else {
        actions = '—';
      }
      return `<tr><td>${escapeHtml(item.barcode || '—')}</td><td>${escapeHtml(item.acquisition_date)}</td>
        <td>${escapeHtml(item.accession_no || '—')}</td><td><strong>${escapeHtml(item.title)}</strong><br>${escapeHtml(item.author || '')}</td>
        <td>${escapeHtml(item.physical_form)}</td><td>${escapeHtml(item.source_name || '—')}</td>
        <td>${escapeHtml(item.category || '—')}</td><td>${escapeHtml(statusLabels[item.lifecycle_status] || item.lifecycle_status)}</td>
        <td>${escapeHtml(item.quantity)}</td><td><div class="module-inline-actions">${actions}</div></td></tr>`;
    }).join('');
    return { items, html: table(['No Barcode', 'Tanggal Pengadaan', 'Nomor Induk', 'Data Bibliografis', 'Bentuk Fisik', 'Jenis Sumber', 'Kategori', 'Status', 'Eksemplar', 'Aksi'], rows, 'Tidak ada data yang ditemukan.') };
  }

  async function renderCollections(status = 'all', routeKey = 'acq-list') {
    const result = await collectionTable(status);
    const actions = status === 'basket'
      ? `<button class="module-button is-neutral" type="button" data-action="refresh">Segarkan Kembali</button>`
      : `<a class="module-button is-primary" href="#acq-entry">＋ Entri Koleksi</a>
         <a class="module-button is-neutral" href="#acq-import">Import Data</a>`;
    return `${panel('Cari Koleksi', `<div class="module-panel-body"><form class="module-toolbar" data-form="collection-search">
      <div class="module-toolbar-group"><input class="module-filter" name="keyword" placeholder="Cari judul, pengarang, barcode, atau nomor induk">
        <button class="module-button" type="submit">Cari</button>
        <button class="module-button is-neutral" type="reset">Ulangi</button></div>${actions}
      </form></div>`)}
      ${panel(routeKey === 'acq-basket' ? 'Keranjang Koleksi' : routeKey === 'acq-quarantine' ? 'Karantina Koleksi' : 'Daftar Koleksi', result.html)}`;
  }

  async function renderBindings() {
    const [items, collections] = await Promise.all([getItems('/bindings'), getItems('/collections?status=all')]);
    const options = collections.map(item => `<option value="${item.book_id}">${escapeHtml(item.title)} — ${escapeHtml(item.author)}</option>`).join('');
    const rows = items.map(item => `<tr><td>${item.id}</td><td>${item.binding_year}</td><td>${escapeHtml(item.volume_number || '—')}</td>
      <td>${escapeHtml(item.title)} — ${escapeHtml(item.author)}</td><td>${item.quantity}</td></tr>`).join('');
    return `${panel('Entri Jilid Baru', `<div class="module-panel-body"><form class="module-form" data-form="binding">
      <div class="module-form-grid">${selectField('Data bibliografis', 'book_id', options, true)}
        ${field('Tahun jilid', 'binding_year', { type: 'number', min: 1000, maxValue: 9999, value: new Date().getFullYear(), required: true })}
        ${field('Nomor panggil jilid', 'volume_number', { max: 80 })}
        ${field('Eksemplar', 'quantity', { type: 'number', min: 1, maxValue: 100000, value: 1, required: true })}</div>
      <div class="module-form-actions"><button class="module-button is-primary" type="submit">Simpan Jilid</button></div>
      </form></div>`)}
      ${panel('Daftar Jilid Koleksi', table(['ID Jilid', 'Tahun Jilid', 'Nomor Panggil Jilid', 'Data Bibliografis', 'Eksemplar'], rows, 'Belum ada data jilid.'))}`;
  }

  async function renderCardex() {
    const items = await getItems('/periodicals');
    const rows = items.map(item => `<tr><td>${escapeHtml(item.bibid)}</td><td>${escapeHtml(item.title)}</td>
      <td>${escapeHtml(item.author || '—')}</td><td>${escapeHtml(item.publication_place || '—')}</td>
      <td>${escapeHtml(item.publisher || '—')}</td><td>${escapeHtml(item.publication_year || '—')}</td>
      <td>${item.issue_count}</td><td>${item.copies}</td></tr>`).join('');
    return `${panel('Entri Judul dan Edisi Terbitan Berkala', `<div class="module-panel-body"><form class="module-form" data-form="periodical">
      <div class="module-form-grid">${field('BIBID', 'bibid', { required: true, max: 80 })}
        ${field('Judul', 'title', { required: true, max: 500 })}${field('Pengarang', 'author', { max: 255 })}
        ${field('Tempat terbit', 'publication_place', { max: 180 })}${field('Penerbit', 'publisher', { max: 255 })}
        ${field('Tahun terbit', 'publication_year', { type: 'number', min: 1000, maxValue: 9999 })}
        ${field('Volume', 'volume', { max: 80 })}${field('Nomor edisi', 'issue_number', { max: 80 })}
        ${field('Tanggal terbit', 'publication_date', { type: 'date' })}
        ${field('Tanggal diterima', 'received_date', { type: 'date', value: new Date().toISOString().slice(0, 10) })}
        ${field('Eksemplar', 'copies', { type: 'number', min: 1, maxValue: 100000, value: 1 })}</div>
      <div class="module-form-actions"><button class="module-button is-primary" type="submit">Simpan</button></div>
      </form></div>`)}
      ${panel('Kardeks Terbitan Berkala', table(['BIBID', 'Judul', 'Pengarang', 'Tempat Terbit', 'Penerbit', 'Tahun Terbit', 'Jumlah Edisi Serial', 'Eksemplar'], rows, 'Belum ada terbitan berkala.'))}`;
  }

  async function renderProposals() {
    const items = await getItems('/proposals');
    const rows = items.map(item => `<tr><td>${escapeHtml(item.title)}</td><td>${escapeHtml(item.author || '—')}</td>
      <td>${escapeHtml(item.publisher || '—')}</td><td>${escapeHtml(new Date(item.requested_at).toLocaleDateString('id-ID'))}</td>
      <td>${escapeHtml(item.member_number || item.requester || '—')}</td><td>${escapeHtml(item.status)}</td>
      <td><select class="module-select" data-action="proposal-status" data-id="${item.id}">
        ${['pending', 'approved', 'rejected', 'acquired'].map(status => `<option value="${status}" ${item.status === status ? 'selected' : ''}>${status}</option>`).join('')}
      </select></td></tr>`).join('');
    return `${panel('Tambah Usulan Koleksi', `<div class="module-panel-body"><form class="module-form" data-form="proposal">
      <div class="module-form-grid">${field('Judul', 'title', { max: 255, required: true })}${field('Pengarang', 'author', { max: 255 })}
      ${field('Penerbit', 'publisher', { max: 255 })}${field('Nama pengusul', 'requester', { max: 150 })}
      ${field('Nomor anggota', 'member_number', { max: 80 })}</div>
      <div class="module-form-actions"><button class="module-button is-primary" type="submit">Simpan Usulan</button></div></form></div>`)}
      ${panel('Daftar Usulan Koleksi', table(['Judul', 'Pengarang', 'Penerbit', 'Tanggal Request', 'Nomor Anggota', 'Status', 'Ubah Status'], rows, 'Tidak ada usulan koleksi.'))}`;
  }

  function csvRows(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      const character = text[i];
      if (character === '"' && quoted && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (character === '"') quoted = !quoted;
      else if (character === ',' && !quoted) {
        row.push(cell);
        cell = '';
      } else if ((character === '\n' || character === '\r') && !quoted) {
        if (character === '\r' && text[i + 1] === '\n') i += 1;
        row.push(cell);
        if (row.some(value => value.trim())) rows.push(row);
        row = [];
        cell = '';
      } else cell += character;
    }
    if (quoted) throw new Error('Format CSV tidak valid: ada tanda kutip yang belum ditutup.');
    if (cell || row.length) {
      row.push(cell);
      rows.push(row);
    }
    if (!rows.length) return [];
    const headers = rows.shift().map(value => value.trim().replace(/^\uFEFF/, ''));
    return rows.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
  }

  function renderImport() {
    return panel('Import Koleksi (maksimal 200 data)', `<div class="module-panel-body">
      <div class="module-toolbar"><span>Template: file CSV dapat dibuka dan disimpan melalui Microsoft Excel.</span>
        <button class="module-button" type="button" data-action="download-template">Unduh Template</button></div>
      <form class="module-form" data-form="import">
        <div class="module-field"><label for="acq-import-file">File CSV</label><input id="acq-import-file" type="file" accept=".csv,text/csv" required></div>
        <p class="module-help">Batas 200 baris per impor. Kolom wajib: title. Kolom lain mengikuti header pada template. Seluruh baris disimpan sekaligus; jika ada data tidak valid, tidak ada baris yang diimpor.</p>
        <div class="module-form-actions"><button class="module-button is-primary" type="submit">Import Koleksi</button></div>
      </form></div>`);
  }

  async function renderShipping() {
    const [collections, shipments] = await Promise.all([
      getItems('/collections?status=basket'), getItems('/shipments')
    ]);
    const rows = collections.map(item => `<tr><td><input type="checkbox" name="acquisition_ids" value="${item.id}" aria-label="Pilih ${escapeHtml(item.title)}"></td>
      <td>${escapeHtml(item.barcode || '—')}</td><td>${escapeHtml(item.title)}</td><td>${escapeHtml(item.source_name || '—')}</td>
      <td>${item.quantity}</td></tr>`).join('');
    const shipmentRows = shipments.map(item => `<tr><td>${item.id}</td><td>${escapeHtml(item.destination)}</td>
      <td>${new Date(item.sent_at).toLocaleString('id-ID')}</td><td>${item.item_count}</td><td>${escapeHtml(item.status)}</td></tr>`).join('');
    return `${panel('Input Data Pengiriman', `<div class="module-panel-body">
      <form class="module-form" data-form="shipment">${table(['Pilih', 'No Barcode', 'Data Bibliografis', 'Sumber', 'Eksemplar'], rows, 'Keranjang masih kosong. Tambahkan koleksi dari Daftar Koleksi terlebih dahulu.')}
        <div class="module-form-grid">${field('Tujuan pengiriman', 'destination', { max: 180, required: true })}</div>
        <div class="module-form-actions"><button class="module-button is-primary" type="submit" ${collections.length ? '' : 'disabled'}>Simpan Pengiriman</button>
          <button class="module-button is-neutral" type="button" data-action="print-shipment">Cetak Data Pengiriman</button></div>
      </form></div>`)}
      ${panel('Riwayat Pengiriman', table(['ID', 'Tujuan', 'Tanggal', 'Jumlah Koleksi', 'Status'], shipmentRows, 'Belum ada riwayat pengiriman.'))}`;
  }

  async function render() {
    const routeKey = window.location.hash.slice(1);
    const route = moduleRoutes[routeKey];
    if (!route) return;
    const version = ++renderVersion;
    dashboard.hidden = true;
    module.hidden = false;
    pageTitle.textContent = route.title;
    sidebar.querySelectorAll('.nav-module-link').forEach(link => {
      const selected = link.getAttribute('href') === `#${routeKey}`;
      link.classList.toggle('is-current', selected);
    });
    content.innerHTML = '<p class="loading-state">Memuat data…</p>';
    try {
      let body;
      if (routeKey === 'acq-sources') body = await renderSources();
      else if (routeKey === 'acq-entry') body = await acquisitionForm(false);
      else if (routeKey === 'acq-entry-rda') body = await acquisitionForm(true);
      else if (routeKey === 'acq-list') body = await renderCollections();
      else if (routeKey === 'acq-basket') body = await renderCollections('basket', routeKey);
      else if (routeKey === 'acq-quarantine') body = await renderCollections('quarantine', routeKey);
      else if (routeKey === 'acq-binding') body = await renderBindings();
      else if (routeKey === 'acq-cardex') body = await renderCardex();
      else if (routeKey === 'acq-proposals') body = await renderProposals();
      else if (routeKey === 'acq-import') body = renderImport();
      else body = await renderShipping();
      if (version !== renderVersion) return;
      content.innerHTML = shell(routeKey, body);
    } catch (error) {
      if (version !== renderVersion) return;
      console.error('Tidak dapat memuat modul Akuisisi:', error);
      content.innerHTML = shell(routeKey, '<p class="module-toast is-error" role="alert">Data gagal dimuat. Periksa koneksi database dan jalankan <code>npm run db:init --prefix backend</code> untuk menyiapkan skema terbaru.</p>');
    }
  }

  function formValues(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  async function submitForm(form) {
    const data = formValues(form);
    if (form.dataset.form === 'source') {
      const editing = Boolean(data.id);
      delete data.id;
      data.exemplar_count = Number(data.exemplar_count || 0);
      await api(editing ? `/sources/${form.elements.id.value}` : '/sources', {
        method: editing ? 'PUT' : 'POST', body: JSON.stringify(data)
      });
      await render();
      showMessage('Sumber perolehan berhasil disimpan.');
    } else if (form.dataset.form === 'acquisition') {
      data.record_type = form.dataset.recordType;
      data.rda_metadata = form.dataset.recordType === 'rda' ? {
        responsibility_statement: data.responsibility_statement || '',
        edition: data.edition || '',
        publication_statement: data.publication_statement || '',
        physical_description: data.physical_description || '',
        series_statement: data.series_statement || '',
        other_identifier: data.other_identifier || ''
      } : {};
      await api('/collections', { method: 'POST', body: JSON.stringify(data) });
      window.location.hash = '#acq-list';
    } else if (form.dataset.form === 'collection-search') {
      const query = new URLSearchParams({ status: 'all', keyword: data.keyword || '' });
      const items = await getItems(`/collections?${query}`);
      const rows = items.map(item => `<tr><td>${escapeHtml(item.barcode || '—')}</td><td>${escapeHtml(item.acquisition_date)}</td>
        <td>${escapeHtml(item.accession_no || '—')}</td><td><strong>${escapeHtml(item.title)}</strong><br>${escapeHtml(item.author || '')}</td>
        <td>${escapeHtml(item.physical_form)}</td><td>${escapeHtml(item.source_name || '—')}</td><td>${escapeHtml(item.category || '—')}</td>
        <td>${escapeHtml(statusLabels[item.lifecycle_status] || item.lifecycle_status)}</td><td>${item.quantity}</td>
        <td><div class="module-inline-actions">${item.is_legacy ? '—' : item.lifecycle_status === 'in_stock'
          ? `<button class="module-button" data-action="collection-status" data-id="${item.id}" data-status="basket">Ke keranjang</button>
             <button class="module-button is-warning" data-action="collection-status" data-id="${item.id}" data-status="quarantine">Karantina</button>`
          : '—'}</div></td></tr>`).join('');
      content.querySelector('.module-table tbody').innerHTML = rows || '<tr><td class="module-table-empty" colspan="10">Tidak ada data yang ditemukan.</td></tr>';
    } else if (form.dataset.form === 'binding') {
      await api('/bindings', { method: 'POST', body: JSON.stringify(data) });
      await render();
      showMessage('Jilid koleksi berhasil disimpan.');
    } else if (form.dataset.form === 'periodical') {
      await api('/periodicals', { method: 'POST', body: JSON.stringify(data) });
      await render();
      showMessage('Terbitan berkala berhasil disimpan.');
    } else if (form.dataset.form === 'proposal') {
      await api('/proposals', { method: 'POST', body: JSON.stringify(data) });
      await render();
      showMessage('Usulan koleksi berhasil disimpan.');
    } else if (form.dataset.form === 'shipment') {
      const ids = [...form.querySelectorAll('input[name="acquisition_ids"]:checked')].map(input => input.value);
      await api('/shipments', { method: 'POST', body: JSON.stringify({ destination: data.destination, acquisition_ids: ids }) });
      await render();
      showMessage('Data pengiriman berhasil disimpan.');
    } else if (form.dataset.form === 'import') {
      const file = form.querySelector('input[type="file"]').files[0];
      if (!file) throw new Error('Pilih file CSV terlebih dahulu.');
      const records = csvRows(await file.text());
      if (!records.length || records.length > 200) throw new Error('File harus berisi 1 sampai 200 baris data.');
      const response = await api('/collections/import', { method: 'POST', body: JSON.stringify({ items: records }) });
      showMessage(response.message);
    }
  }

  function downloadTemplate() {
    const headers = ['title', 'author', 'publisher', 'publication_year', 'isbn', 'material_type', 'category', 'subject', 'call_number', 'source_id', 'accession_no', 'barcode', 'rfid', 'acquisition_date', 'quantity', 'physical_form', 'access_type', 'location'];
    const csv = `${headers.join(',')}\r\n`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template-akuisisi.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  content.addEventListener('submit', async event => {
    const form = event.target.closest('form[data-form]');
    if (!form) return;
    event.preventDefault();
    const submit = form.querySelector('[type="submit"]');
    if (submit) submit.disabled = true;
    try {
      await submitForm(form);
    } catch (error) {
      showMessage(error.message, true);
    } finally {
      if (submit && submit.isConnected) submit.disabled = false;
    }
  });

  content.addEventListener('click', async event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    try {
      if (button.dataset.action === 'toggle-material-options') {
        const input = content.querySelector('#acq-material_type');
        const options = content.querySelector('#acq-material-type-options');
        const shouldOpen = options.hidden;
        filterMaterialOptions(input.value);
        setMaterialOptionsOpen(shouldOpen);
        if (shouldOpen) input.focus();
      } else if (button.dataset.action === 'toggle-choice-options') {
        const picker = button.closest('.acq-searchable-picker');
        const shouldOpen = picker.querySelector('.acq-material-options').hidden;
        setChoicePickerOpen(picker, shouldOpen);
        if (shouldOpen) picker.querySelector('.acq-choice-search').focus();
      } else if (button.dataset.action === 'select-material-option') {
        const choice = acquisitionChoices.material_type[Number(button.dataset.index)];
        if (!choice) throw new Error('Pilihan jenis bahan tidak ditemukan.');
        content.querySelector('#acq-material_type').value = choice.label;
        setMaterialOptionsOpen(false);
      } else if (button.dataset.action === 'select-choice-option') {
        const picker = button.closest('.acq-searchable-picker');
        const choices = acquisitionChoices[picker.dataset.choicePicker];
        const choice = choices && choices[Number(button.dataset.index)];
        if (!choice) throw new Error('Pilihan tidak ditemukan.');
        picker.querySelector('input[name]').value = typeof choice === 'string' ? choice : choice.label;
        setChoicePickerOpen(picker, false);
      } else if (button.dataset.action === 'choose-title' || button.dataset.action === 'copy-catalog-title') {
        const dialog = content.querySelector('.acq-title-dialog');
        const options = dialog.querySelector('.acq-title-options');
        const titles = await getCatalogTitles();
        options.innerHTML = titles.length ? titles.map((item, index) => `<button class="acq-title-option" type="button"
          data-action="select-catalog-title" data-index="${index}">
          <strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.creator || item.author || 'Pengarang tidak diketahui')}
          · ${escapeHtml(item.bibid || '')}</span></button>`).join('')
          : '<p class="module-table-empty">Belum ada judul di katalog.</p>';
        dialog.dataset.titles = JSON.stringify(titles);
        dialog.querySelector('.acq-title-search').value = '';
        dialog.showModal();
      } else if (button.dataset.action === 'close-title-dialog') {
        button.closest('dialog').close();
      } else if (button.dataset.action === 'select-catalog-title') {
        const dialog = button.closest('dialog');
        const titles = JSON.parse(dialog.dataset.titles || '[]');
        const title = titles[Number(button.dataset.index)];
        if (!title) throw new Error('Judul katalog tidak ditemukan.');
        const form = document.getElementById('acquisition-form');
        const values = {
          book_id: title.book_id || '',
          title: title.title || '',
          author: title.creator || title.author || '',
          publisher: title.publisher || title.publication_statement || '',
          publication_year: title.publication_year || '',
          isbn: title.isbn || '',
          category: title.category || '*** Tidak Diketahui ***',
          subject: title.subject || '',
          call_number: title.call_number || '',
          material_type: ({
            Monograf: 'buku',
            Serial: 'jurnal',
            'Bahan khusus': 'lainnya'
          })[title.material_type] || (['buku', 'ta', 'jurnal', 'modul', 'lainnya'].includes(title.material_type)
            ? title.material_type : 'lainnya')
        };
        for (const [name, value] of Object.entries(values)) {
          const control = form.elements.namedItem(name);
          if (control) control.value = value;
        }
        const selectedTitle = form.querySelector('#acq-selected-title');
        selectedTitle.textContent = `Judul terpilih: ${title.title}`;
        selectedTitle.hidden = false;
        dialog.close();
        showMessage(`Judul "${title.title}" berhasil dimasukkan ke formulir.`);
      } else if (button.dataset.action === 'edit-source') {
        const sources = await getItems('/sources');
        const source = sources.find(item => String(item.id) === button.dataset.id);
        if (!source) throw new Error('Sumber perolehan tidak ditemukan.');
        const form = document.getElementById('source-form');
        for (const key of ['id', 'name', 'address', 'phone', 'exemplar_count']) form.elements[key].value = source[key] ?? '';
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (button.dataset.action === 'delete-source') {
        if (!window.confirm('Hapus sumber perolehan ini?')) return;
        await api(`/sources/${button.dataset.id}`, { method: 'DELETE' });
        await render();
        showMessage('Sumber perolehan berhasil dihapus.');
      } else if (button.dataset.action === 'collection-status') {
        await api(`/collections/${button.dataset.id}/status`, {
          method: 'PATCH', body: JSON.stringify({ status: button.dataset.status })
        });
        await render();
        showMessage('Status koleksi berhasil diperbarui.');
      } else if (button.dataset.action === 'delete-acquisition') {
        if (!window.confirm('Hapus data pengadaan koleksi ini?')) return;
        await api(`/collections/${button.dataset.id}`, { method: 'DELETE' });
        await render();
        showMessage('Data pengadaan berhasil dihapus.');
      } else if (button.dataset.action === 'download-template') downloadTemplate();
      else if (button.dataset.action === 'refresh') await render();
      else if (button.dataset.action === 'print-shipment') window.print();
    } catch (error) {
      showMessage(error.message, true);
    }
  });

  content.addEventListener('change', async event => {
    const select = event.target.closest('[data-action="proposal-status"]');
    if (!select) return;
    try {
      await api(`/proposals/${select.dataset.id}/status`, {
        method: 'PATCH', body: JSON.stringify({ status: select.value })
      });
      showMessage('Status usulan berhasil diperbarui.');
    } catch (error) {
      showMessage(error.message, true);
    }
  });

  content.addEventListener('input', event => {
    if (event.target.matches('#acquisition-form #acq-material_type')) {
      filterMaterialOptions(event.target.value);
      setMaterialOptionsOpen(true);
      return;
    }
    const picker = event.target.closest('.acq-searchable-picker');
    if (picker && (event.target.matches('input[name]') || event.target.matches('.acq-choice-search'))) {
      filterChoicePicker(picker, event.target.value);
      setChoicePickerOpen(picker, true);
      return;
    }
    const search = event.target.closest('.acq-title-search');
    if (search) {
      const keyword = search.value.trim().toLocaleLowerCase('id');
      content.querySelectorAll('.acq-title-option').forEach(option => {
        option.hidden = keyword !== '' && !option.textContent.toLocaleLowerCase('id').includes(keyword);
      });
      return;
    }
    if (event.target.matches('#acquisition-form [name="title"]')) {
      const bookId = document.querySelector('#acquisition-form [name="book_id"]');
      if (bookId) bookId.value = '';
    }
  });

  content.addEventListener('focusin', event => {
    if (event.target.matches('#acquisition-form #acq-material_type')) {
      filterMaterialOptions(event.target.value);
      setMaterialOptionsOpen(true);
    } else if (event.target.matches('.acq-searchable-picker input[name]')) {
      const picker = event.target.closest('.acq-searchable-picker');
      filterChoicePicker(picker, event.target.value);
      setChoicePickerOpen(picker, true);
    }
  });

  content.addEventListener('keydown', event => {
    const choicePicker = event.target.closest('.acq-searchable-picker');
    const isMaterialPicker = event.target.matches('#acquisition-form #acq-material_type');
    if (!choicePicker && !isMaterialPicker) return;
    if (choicePicker && !event.target.matches('input')) return;
    const options = [...(choicePicker
      ? choicePicker.querySelectorAll('.acq-material-option:not([hidden])')
      : content.querySelectorAll('#acq-material-type-options .acq-material-option:not([hidden])'))];
    const selectedIndex = options.findIndex(option => option.getAttribute('aria-selected') === 'true');
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setMaterialOptionActive(options, selectedIndex + (event.key === 'ArrowDown' ? 1 : -1));
    } else if (event.key === 'Enter' && selectedIndex >= 0) {
      event.preventDefault();
      options[selectedIndex].click();
    } else if (event.key === 'Escape') {
      if (choicePicker) setChoicePickerOpen(choicePicker, false);
      else setMaterialOptionsOpen(false);
    }
  });

  document.addEventListener('pointerdown', event => {
    if (!event.target.closest('.acq-material-picker')) {
      setMaterialOptionsOpen(false);
      content.querySelectorAll('.acq-searchable-picker').forEach(picker => setChoicePickerOpen(picker, false));
    }
  });

  function filterMaterialOptions(value) {
    const keyword = value.trim().toLocaleLowerCase('id');
    content.querySelectorAll('.acq-material-option').forEach(option => {
      option.hidden = keyword !== '' && !option.textContent.trim().toLocaleLowerCase('id').includes(keyword);
      option.setAttribute('aria-selected', 'false');
    });
  }

  function setMaterialOptionsOpen(open) {
    const input = content.querySelector('#acq-material_type');
    const options = content.querySelector('#acq-material-type-options');
    const toggle = content.querySelector('.acq-material-toggle');
    if (!input || !options || !toggle) return;
    options.hidden = !open;
    input.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-expanded', String(open));
  }

  function filterChoicePicker(picker, value) {
    const keyword = value.trim().toLocaleLowerCase('id');
    picker.querySelectorAll('.acq-material-option').forEach(option => {
      option.hidden = keyword !== '' && !option.textContent.trim().toLocaleLowerCase('id').includes(keyword);
      option.setAttribute('aria-selected', 'false');
    });
  }

  function setChoicePickerOpen(picker, open) {
    const input = picker.querySelector('input[name]');
    const options = picker.querySelector('.acq-material-options');
    const search = picker.querySelector('.acq-choice-search');
    const toggle = picker.querySelector('.acq-material-toggle');
    if (!input || !options || !search || !toggle) return;
    if (open && options.hidden) {
      const currentValue = input.value.trim().toLocaleLowerCase('id');
      const isKnownChoice = [...picker.querySelectorAll('.acq-material-option')]
        .some(option => option.textContent.trim().toLocaleLowerCase('id') === currentValue);
      search.value = isKnownChoice ? '' : input.value;
      filterChoicePicker(picker, search.value);
    }
    options.hidden = !open;
    input.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-expanded', String(open));
  }

  function setMaterialOptionActive(options, index) {
    if (!options.length) return;
    const activeIndex = ((index % options.length) + options.length) % options.length;
    options.forEach((option, optionIndex) => {
      option.setAttribute('aria-selected', String(optionIndex === activeIndex));
    });
    options[activeIndex].scrollIntoView({ block: 'nearest' });
  }

  window.addEventListener('hashchange', render);
  render();
})();
