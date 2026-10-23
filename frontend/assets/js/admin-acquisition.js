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
      { value: 'buku', label: 'Monograf(Buku, Jurnal, Laporan, dll)' },
      { value: 'jurnal', label: 'Terbitan Berkala(Surat Kabar, Majalah, dll)' },
      { value: 'ta', label: 'Skripsi(Karya Akademik Mahasiswa S1)' },
      { value: 'ta', label: 'Tesis(Karya Akademik Mahasiswa S2)' },
      { value: 'bahan grafis', label: 'Bahan Grafis(Foto, Lukisan, dll)' },
      { value: 'rekaman video', label: 'Rekaman Video' },
      { value: 'musik', label: 'Musik' },
      { value: 'peta', label: 'Bahan Kartografis(Peta, dll)' },
      { value: 'sumber elektronik', label: 'Sumber Elektronik(CD-ROM, Floppy Disk, VCD, dll)' },
      { value: 'rekaman suara', label: 'Rekaman Suara' },
      { value: 'film', label: 'Film(Film, dll)' },
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
  const creatorTypes = {
    person: { label: 'Nama Orang', mainTag: '100', additionalTag: '700' },
    corporate: { label: 'Nama Badan', mainTag: '110', additionalTag: '710' },
    meeting: { label: 'Nama Pertemuan', mainTag: '111', additionalTag: '711' }
  };
  const authorEditorIcon = '<svg aria-hidden="true" viewBox="0 0 16 16"><path d="M2 3h2v2H2zm4 0h8v2H6zM2 7h2v2H2zm4 0h8v2H6zm-4 4h2v2H2zm4 0h8v2H6z"></path></svg>';
  const creatorFields = {
    person: {
      main: [
        ['a', 'Nama Orang'], ['b', 'Penomoran'], ['c', 'Tambahan pada nama (mis.Gelar Kebangsawanan)'],
        ['d', 'Tahun yang berhubungan dengan nama orang'], ['e', 'Istilah penghubung'],
        ['g', 'Keterangan lainnya'], ['j', 'Keterangan penjelas'], ['k', 'Subtajuk bentuk'],
        ['l', 'Bahasa'], ['n', 'Nomor bagian/seksi pertemuan'], ['p', 'Nama bagian karya'],
        ['q', 'Nama dalam bentuk lengkap'], ['t', 'Judul karya']
      ],
      additional: [
        ['a', 'Nama orang'], ['b', 'Penomoran'], ['c', 'Gelar dan kata lainnya yang berhubungan dengan nama'],
        ['d', 'Tahun yang berhubungan dengan nama'], ['f', 'Tahun penerbitan karya'],
        ['g', 'Keterangan lainnya'], ['h', 'Medium'], ['j', 'Keterangan penjelas'],
        ['k', 'Subtajuk bentuk'], ['l', 'Bahasa'], ['m', 'Media pertunjukan musik'],
        ['n', 'Nomor bagian/seksi dari karya'], ['o', 'Pernyataan aransemen musik'],
        ['p', 'Nama bagian/seksi dari karya'], ['q', 'Nama dalam bentuk lengkap'],
        ['r', 'Kunci/nada dasar musik'], ['s', 'Versi'], ['t', 'Judul karya']
      ]
    },
    corporate: {
      main: [
        ['a', 'Nama badan atau yurisdiksi'], ['b', 'Unit bawahan'], ['c', 'Tempat pertemuan'],
        ['d', 'Tanggal pertemuan atau penandatanganan perjanjian'], ['e', 'Istilah penghubung'],
        ['f', 'Tahun penerbitan karya'], ['g', 'Keterangan lainnya'], ['k', 'Subtajuk bentuk'],
        ['l', 'Bahasa'], ['n', 'Nomor bagian/seksi pertemuan'], ['p', 'Nama bagian karya'],
        ['t', 'Judul karya'], ['u', 'Afiliasi'], ['0', 'Nomor kendali otoritas'],
        ['1', 'URI sumber daya terkait'], ['4', 'Kode relasi']
      ],
      additional: [
        ['a', 'Nama badan atau yurisdiksi'], ['b', 'Unit bawahan'], ['c', 'Tempat pertemuan'],
        ['d', 'Tanggal pertemuan atau penandatanganan perjanjian'], ['e', 'Istilah penghubung'],
        ['f', 'Tahun penerbitan karya'], ['g', 'Keterangan lainnya'], ['k', 'Subtajuk bentuk'],
        ['l', 'Bahasa'], ['n', 'Nomor bagian/seksi pertemuan'], ['p', 'Nama bagian karya'],
        ['t', 'Judul karya'], ['u', 'Afiliasi'], ['0', 'Nomor kendali otoritas'],
        ['1', 'URI sumber daya terkait'], ['4', 'Kode relasi']
      ]
    },
    meeting: {
      main: [
        ['a', 'Nama pertemuan atau yurisdiksi'], ['c', 'Tempat pertemuan'],
        ['d', 'Tanggal pertemuan'], ['e', 'Unit bawahan'], ['f', 'Tahun penerbitan karya'],
        ['g', 'Keterangan lainnya'], ['j', 'Istilah penghubung'], ['k', 'Subtajuk bentuk'],
        ['l', 'Bahasa'], ['n', 'Nomor pertemuan/seksi'], ['p', 'Nama bagian karya'],
        ['q', 'Nama pertemuan setelah nama yurisdiksi'], ['t', 'Judul karya'],
        ['0', 'Nomor kendali otoritas'], ['1', 'URI sumber daya terkait'], ['4', 'Kode relasi']
      ],
      additional: [
        ['a', 'Nama pertemuan atau yurisdiksi'], ['c', 'Tempat pertemuan'],
        ['d', 'Tanggal pertemuan'], ['e', 'Unit bawahan'], ['f', 'Tahun penerbitan karya'],
        ['g', 'Keterangan lainnya'], ['j', 'Istilah penghubung'], ['k', 'Subtajuk bentuk'],
        ['l', 'Bahasa'], ['n', 'Nomor pertemuan/seksi'], ['p', 'Nama bagian karya'],
        ['q', 'Nama pertemuan setelah nama yurisdiksi'], ['t', 'Judul karya'],
        ['0', 'Nomor kendali otoritas'], ['1', 'URI sumber daya terkait'], ['4', 'Kode relasi']
      ]
    }
  };
  const physicalDescriptionFields = [
    ['a', 'Jumlah halaman / deskripsi fisik'], ['b', 'Ket. ilustrasi'], ['c', 'Dimensi'],
    ['e', 'Bahan sertaan'], ['f', 'Jenis unit'], ['g', 'Ukuran unit'], ['3', 'Bahan yang ditentukan'],
    ['6', 'Tautan data'], ['8', 'Nomor urut dan lembaga']
  ];
  const subjectFields = [
    ['3', 'Spesifikasi bahan'], ['a', 'Nama orang'], ['b', 'Penomoran'],
    ['c', 'Tambahan pada nama selain tahun'], ['d', 'Tahun'], ['f', 'Tahun penerbitan karya'],
    ['g', 'Keterangan lainnya'], ['h', 'Medium'], ['j', 'Keterangan penjelas'],
    ['k', 'Subtajuk bentuk'], ['l', 'Bahasa'], ['m', 'Media pertunjukan musik'],
    ['n', 'Nomor bagian dari karya'], ['o', 'Pernyataan aransemen musik'],
    ['p', 'Nama bagian/seksi dari karya'], ['q', 'Nama dalam bentuk lengkap'],
    ['r', 'Kunci/nada dasar musik'], ['s', 'Versi'], ['t', 'Judul karya'],
    ['v', 'Subdivisi bentuk'], ['x', 'Subdivisi umum'], ['y', 'Subdivisi kronologis'],
    ['z', 'Subdivisi wilayah']
  ];
  const noteTypes = ['Abstrak / Anotasi', 'Catatan Disertasi', 'Catatan Bibliografi', 'Rincian Isi', 'Catatan Umum'];
  const removeEntryIcon = '<svg aria-hidden="true" viewBox="0 0 16 16"><path d="M5 1h6l1 2h3v2H1V3h3zm-2 5h10l-.7 9H3.7zm2 2v5h1V8zm3 0v5h1V8z"></path></svg>';
  let renderVersion = 0;
  let additionalAuthorIndex = 1;
  let activeAuthorRow = null;
  let activeMetadataDialog = null;

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
      ${field('Pernyataan penerbitan', 'publication_statement', { max: 255 })}
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
      <input type="hidden" name="material_type">
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
            <input id="acq-material_type" name="material_type_label" type="text" role="combobox"
              aria-autocomplete="list" aria-expanded="false" aria-controls="acq-material-type-options"
              maxlength="80" placeholder="Ketik atau pilih jenis bahan" required>
            <button class="acq-material-toggle" type="button" data-action="toggle-material-options"
              aria-label="Tampilkan pilihan jenis bahan" aria-expanded="false"></button>
            <div class="acq-material-options" id="acq-material-type-options" role="listbox" hidden>
              ${acquisitionChoices.material_type.map((choice, index) =>
                `<button class="acq-material-option" type="button" role="option" aria-selected="false"
                  data-action="select-material-option" data-index="${index}">${escapeHtml(choice.label)}</button>`).join('')}
            </div>
          </div>
        </div>
        <div class="acquisition-entry-details" hidden>
          <fieldset class="acq-bibliographic-fields" disabled>
            <section class="module-panel acquisition-entry-panel">
              <div class="module-panel-heading">
                <h2>Data Bibliografis</h2>
                <button class="module-button is-primary" type="button" data-action="toggle-acq-marc">Tampilkan Form MARC</button>
              </div>
              <div class="module-panel-body acq-bibliographic-body">
                <section class="acq-bibliographic-group">
                  <h3>Judul</h3>
                  <div class="acq-bibliographic-fields-grid">
                    ${field('Judul Utama', 'title', { required: true, max: 255, placeholder: 'Masukan Judul Utama...' })}
                    ${field('Anak Judul', 'subtitle', { max: 500, placeholder: 'Masukan Anak Judul...' })}
                    ${field('Penanggung Jawab', 'responsibility', { max: 500, placeholder: 'Masukan Penanggung Jawab...' })}
                  </div>
                </section>
                <section class="acq-bibliographic-group">
                  <h3>Tajuk Pengarang</h3>
                  <div class="acq-bibliographic-fields-grid">
                    <div class="acq-bibliographic-row">
                      <label for="acq-creator-type">Tajuk Pengarang Utama</label>
                      <div class="acq-author-control" data-author-entry="main">
                        <select id="acq-creator-type" name="creator_type" data-author-type>
                          ${Object.entries(creatorTypes).map(([key, type]) => `<option value="${key}">${type.label}</option>`).join('')}
                        </select>
                        <div class="acq-author-input-control">
                          <input id="acq-author" name="author" type="text" maxlength="255"
                            placeholder="Masukan Tajuk Pengarang Utama..." data-author-value>
                          <button class="module-button is-warning acq-author-editor-button" type="button"
                            data-action="open-author-fields" data-author-kind="main" aria-label="Buka subruas tajuk pengarang utama">${authorEditorIcon}</button>
                        </div>
                      </div>
                    </div>
                    <div class="acq-bibliographic-row">
                      <span class="module-label">Urutan Nama</span>
                      <div class="acq-name-order">
                        <label><input type="radio" name="creator_name_order" value="Nama Depan" checked> Nama Depan</label>
                        <label><input type="radio" name="creator_name_order" value="Nama Belakang"> Nama Belakang</label>
                        <label><input type="radio" name="creator_name_order" value="Nama Keluarga"> Nama Keluarga</label>
                      </div>
                    </div>
                    <div class="acq-bibliographic-row">
                      <label>Tajuk Pengarang Tambahan</label>
                      <div class="acq-additional-authors">
                        <div class="acq-author-control acq-additional-author" data-author-entry="additional">
                          <select name="additional_author_type" data-author-type aria-label="Jenis tajuk pengarang tambahan">
                            ${Object.entries(creatorTypes).map(([key, type]) => `<option value="${key}">${key === 'corporate' ? 'Badan Korporasi' : type.label}</option>`).join('')}
                          </select>
                          <div class="acq-author-input-control">
                            <input name="additional_author" type="text" maxlength="500"
                              placeholder="Masukan Tajuk Pengarang Tambahan..." data-author-value>
                            <button class="module-button is-warning acq-author-editor-button" type="button"
                              data-action="open-author-fields" data-author-kind="additional" aria-label="Buka subruas tajuk pengarang tambahan">${authorEditorIcon}</button>
                            <button class="module-button is-success acq-additional-author-add" type="button"
                              data-action="add-additional-author" aria-label="Tambah tajuk pengarang tambahan">+</button>
                          </div>
                          <div class="acq-name-order">
                            <label><input type="radio" name="additional_creator_name_order_1" value="Nama Depan" checked> Nama Depan</label>
                            <label><input type="radio" name="additional_creator_name_order_1" value="Nama Belakang"> Nama Belakang</label>
                            <label><input type="radio" name="additional_creator_name_order_1" value="Nama Keluarga"> Nama Keluarga</label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
                <section class="acq-bibliographic-group">
                  <h3>Penerbitan</h3>
                  <div class="acq-bibliographic-fields-grid">
                    ${field('Tempat Terbit', 'publication_place', { max: 180, placeholder: 'Masukan Tempat terbit...' })}
                    ${field('Penerbit', 'publisher', { max: 255, placeholder: 'Masukan Penerbit...' })}
                    ${field('Tahun Terbit', 'publication_year', { type: 'number', min: 1000, maxValue: 9999, placeholder: 'Masukan Tahun terbit...' })}
                  </div>
                </section>
                <section class="acq-bibliographic-group">
                  <h3>Deskripsi Fisik</h3>
                  <div class="acq-bibliographic-fields-grid">
                    ${field('Jumlah Halaman', 'physical_pages', { max: 120, placeholder: 'Masukan Jumlah Halaman...' })}
                    ${field('Ket. Ilustrasi', 'physical_illustrations', { max: 255, placeholder: 'Masukan Ket. Ilustrasi...' })}
                    ${field('Dimensi', 'physical_dimensions', { max: 120, placeholder: 'Masukan Dimensi...' })}
                    ${field('Bahan Sertaan', 'physical_accompanying_material', { max: 255, placeholder: 'Masukan Bahan Sertaan...' })}
                    ${field('Edisi', 'edition', { max: 120, placeholder: 'Masukan Edisi...' })}
                    <div class="acq-bibliographic-row">
                      <label for="acq-physical-description">Deskripsi Fisik</label>
                      <div class="acq-author-input-control" data-metadata-entry="physical">
                        <input id="acq-physical-description" name="physical_description" type="text" maxlength="255"
                          placeholder="Masukan Deskripsi Fisik..." data-metadata-value>
                        <button class="module-button is-warning acq-author-editor-button" type="button"
                          data-action="open-metadata-fields" data-metadata-kind="physical" aria-label="Buka rincian objek deskripsi fisik">${authorEditorIcon}</button>
                      </div>
                    </div>
                    <div class="acq-bibliographic-row">
                      <label>Subjek</label>
                      <div class="acq-subject-entries">
                      <div class="acq-author-control acq-subject-entry" data-metadata-entry="subject">
                        <select id="acq-subject-type" name="subject_type" data-subject-type>
                          <option value="person">Nama Orang</option><option value="corporate">Nama Badan</option>
                          <option value="meeting">Nama Pertemuan</option>
                        </select>
                        <div class="acq-author-input-control">
                          <input id="acq-subject" name="subject" type="text" maxlength="5000"
                            placeholder="Masukan Subjek..." data-metadata-value>
                          <button class="module-button is-warning acq-author-editor-button" type="button"
                            data-action="open-metadata-fields" data-metadata-kind="subject" aria-label="Buka subruas subjek">${authorEditorIcon}</button>
                          <button class="module-button is-success acq-additional-author-add" type="button"
                            data-action="add-metadata-entry" data-metadata-kind="subject" aria-label="Tambah subjek">+</button>
                        </div>
                        <div class="acq-name-order">
                          <label><input type="radio" name="subject_name_order_1" value="Tidak Ada Info Tambahan" checked> Tdk Ada Info Tambahan</label>
                          <label><input type="radio" name="subject_name_order_1" value="Nama Depan"> Nama Depan</label>
                          <label><input type="radio" name="subject_name_order_1" value="Nama Belakang"> Nama Belakang</label>
                          <label><input type="radio" name="subject_name_order_1" value="Nama Keluarga"> Nama Keluarga</label>
                        </div>
                      </div>
                      </div>
                    </div>
                    ${field('No. Klas DDC', 'ddc_class', { max: 120, placeholder: 'Masukan No. Klas DDC...' })}
                    <div class="acq-bibliographic-repeat-row">
                      ${field('No. Panggil', 'call_number', { max: 80, placeholder: 'Masukan No. Panggil...' })}
                      <button class="module-button is-success" type="button" data-action="add-bibliographic-input"
                        data-input-name="call_number" aria-label="Tambah nomor panggil">+</button>
                    </div>
                    <div class="acq-bibliographic-repeat-row">
                      ${field('ISBN', 'isbn', { max: 32, placeholder: 'Masukan ISBN...' })}
                      <button class="module-button is-success" type="button" data-action="add-bibliographic-input"
                        data-input-name="isbn" aria-label="Tambah ISBN">+</button>
                    </div>
                  </div>
                </section>
                <section class="acq-bibliographic-group">
                  <h3>Catatan</h3>
                  <div class="acq-bibliographic-fields-grid acq-notes-list">
                    <div class="acq-note-entry" data-note-entry>
                      <label for="acq-note-1">Catatan</label>
                      <div class="acq-note-control">
                        <div class="acq-note-input-row">
                          <textarea id="acq-note-1" name="note_text" maxlength="5000"
                            placeholder="Masukan Catatan..." data-note-text></textarea>
                          <button class="module-button is-success" type="button" data-action="add-note"
                            aria-label="Tambah catatan">+</button>
                        </div>
                        <div class="acq-name-order">
                          ${noteTypes.map((type, index) => `<label><input type="radio" name="note_type_1" value="${escapeHtml(type)}" ${index === 0 ? 'checked' : ''}> ${escapeHtml(type)}</label>`).join('')}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
                <section class="acq-bibliographic-group">
                  <h3>Lokasi Koleksi Daring</h3>
                  <div class="acq-bibliographic-fields-grid acq-online-locations">
                    <div class="acq-bibliographic-repeat-row" data-online-location>
                      ${field('Lokasi Koleksi Daring', 'online_location', { max: 2000, placeholder: 'Masukan Lokasi Koleksi Daring...' })}
                      <button class="module-button is-success" type="button" data-action="add-online-location"
                        aria-label="Tambah lokasi koleksi daring">+</button>
                    </div>
                  </div>
                </section>
                  <div class="acq-marc-fields" hidden>
                    <div class="module-field">
                      <label for="acq-marc-data">Ruas Data MARC (JSON)</label>
                      <textarea id="acq-marc-data" name="marc_data" placeholder='[{"tag":"245","indicator1":"1","indicator2":"0","value":"Judul"}]'>[]</textarea>
                    </div>
                  </div>
              </div>
            </section>
          </fieldset>
        <label class="acq-opac-toggle"><input type="hidden" name="show_in_opac" value="false">
          <input type="checkbox" name="show_in_opac" value="true" checked><span>Tampil di OPAC</span></label>
        ${rdaFields}
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
          </div>
        </section>
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
      <dialog class="acq-author-dialog" aria-labelledby="acq-author-dialog-heading">
        <button class="acq-author-dialog-close" type="button" data-action="close-author-dialog" aria-label="Tutup">×</button>
        <h2 id="acq-author-dialog-heading"></h2>
        <div class="acq-author-dialog-table-wrap"></div>
        <div class="acq-author-dialog-actions">
          <button class="module-button is-success" type="button" data-action="save-author-fields">OK</button>
          <button class="module-button is-warning" type="button" data-action="close-author-dialog">Batal</button>
        </div>
      </dialog>
      <dialog class="acq-author-dialog acq-metadata-dialog" aria-labelledby="acq-metadata-dialog-heading">
        <button class="acq-author-dialog-close" type="button" data-action="close-metadata-dialog" aria-label="Tutup">×</button>
        <h2 id="acq-metadata-dialog-heading"></h2>
        <div class="acq-author-dialog-table-wrap"></div>
        <div class="acq-author-dialog-actions">
          <button class="module-button is-success" type="button" data-action="save-metadata-fields">OK</button>
          <button class="module-button is-warning" type="button" data-action="close-metadata-dialog">Batal</button>
        </div>
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

  function readCreatorEntry(row) {
    const input = row.querySelector('[data-author-value]');
    const type = row.querySelector('[data-author-type]').value;
    const saved = row.dataset.marcEntry ? JSON.parse(row.dataset.marcEntry) : {};
    const nameOrder = row.querySelector('input[type="radio"]:checked')?.value || '';
    return {
      type,
      tag: saved.tag || creatorTypes[type][row.dataset.authorEntry === 'main' ? 'mainTag' : 'additionalTag'],
      name: input.value.trim(),
      name_order: nameOrder,
      indicators: saved.indicators || ['1', ' '],
      subfields: saved.type === type ? saved.subfields || {} : {}
    };
  }

  function openAuthorFields(button) {
    const row = button.closest('[data-author-entry]');
    const isMain = button.dataset.authorKind === 'main';
    const type = row.querySelector('[data-author-type]').value;
    const creatorType = creatorTypes[type];
    const fields = creatorFields[type][isMain ? 'main' : 'additional'];
    const tag = creatorType[isMain ? 'mainTag' : 'additionalTag'];
    const saved = row.dataset.marcEntry ? JSON.parse(row.dataset.marcEntry) : {};
    const values = saved.type === type ? saved.subfields || {}
      : (row.querySelector('[data-author-value]').value.trim()
        ? { a: row.querySelector('[data-author-value]').value.trim() } : {});
    const dialog = content.querySelector('.acq-author-dialog');
    activeAuthorRow = row;
    dialog.dataset.authorKind = isMain ? 'main' : 'additional';
    dialog.querySelector('#acq-author-dialog-heading').textContent =
      `Tag ${tag} - Entri ${isMain ? 'Utama' : 'Tambahan'} -- ${creatorType.label}`;
    dialog.querySelector('.acq-author-dialog-table-wrap').innerHTML = `<table class="acq-author-fields-table">
      <thead><tr><th>Kode</th><th>Nama</th><th>Isi</th></tr></thead><tbody>
      ${fields.map(([code, label]) => `<tr><td>${escapeHtml(code)}</td><td>${escapeHtml(label)}</td>
        <td><input type="text" data-subfield-code="${escapeHtml(code)}" aria-label="${escapeHtml(`${code} ${label}`)}"
          value="${escapeHtml(values[code] || '')}"></td></tr>`).join('')}
      </tbody></table>`;
    dialog.showModal();
    dialog.querySelector('[data-subfield-code="a"]')?.focus();
  }

  function saveAuthorFields(dialog) {
    if (!activeAuthorRow || !activeAuthorRow.isConnected) {
      throw new Error('Baris tajuk pengarang sudah tidak tersedia.');
    }
    const isMain = dialog.dataset.authorKind === 'main';
    const type = activeAuthorRow.querySelector('[data-author-type]').value;
    const creatorType = creatorTypes[type];
    const subfields = Object.fromEntries([...dialog.querySelectorAll('[data-subfield-code]')]
      .map(input => [input.dataset.subfieldCode, input.value.trim()]).filter(([, value]) => value));
    const tag = creatorType[isMain ? 'mainTag' : 'additionalTag'];
    const name = Object.values(subfields).join(', ');
    activeAuthorRow.dataset.marcEntry = JSON.stringify({
      type, tag, indicators: ['1', ' '], subfields
    });
    const authorInput = activeAuthorRow.querySelector('[data-author-value]');
    authorInput.value = name.slice(0, authorInput.maxLength);
    dialog.close();
    activeAuthorRow = null;
  }

  function addAdditionalAuthorRow(container) {
    const index = ++additionalAuthorIndex;
    const row = document.createElement('div');
    row.className = 'acq-author-control acq-additional-author';
    row.dataset.authorEntry = 'additional';
    row.innerHTML = `<select name="additional_author_type" data-author-type aria-label="Jenis tajuk pengarang tambahan">
      ${Object.entries(creatorTypes).map(([key, type]) => `<option value="${key}">${key === 'corporate' ? 'Badan Korporasi' : type.label}</option>`).join('')}
      </select><div class="acq-author-input-control">
        <input name="additional_author" type="text" maxlength="500"
          placeholder="Masukan Tajuk Pengarang Tambahan..." data-author-value>
        <button class="module-button is-warning acq-author-editor-button" type="button"
          data-action="open-author-fields" data-author-kind="additional" aria-label="Buka subruas tajuk pengarang tambahan">${authorEditorIcon}</button>
        <button class="module-button is-success acq-additional-author-add" type="button"
          data-action="add-additional-author" aria-label="Tambah tajuk pengarang tambahan">+</button>
      </div><div class="acq-name-order">
        <label><input type="radio" name="additional_creator_name_order_${index}" value="Nama Depan" checked> Nama Depan</label>
        <label><input type="radio" name="additional_creator_name_order_${index}" value="Nama Belakang"> Nama Belakang</label>
        <label><input type="radio" name="additional_creator_name_order_${index}" value="Nama Keluarga"> Nama Keluarga</label>
      </div>`;
    markRepeatEntry(row);
    container.append(row);
  }

  function markRepeatEntry(row) {
    row.dataset.repeatEntry = 'true';
    const addButton = row.querySelector('[data-action^="add-"]');
    if (!addButton) return;
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'module-button is-danger acq-remove-entry';
    removeButton.dataset.action = 'remove-repeat-entry';
    removeButton.setAttribute('aria-label', 'Hapus baris tambahan');
    removeButton.innerHTML = removeEntryIcon;
    addButton.replaceWith(removeButton);
  }

  function readMetadataEntry(row) {
    const saved = row.dataset.marcEntry ? JSON.parse(row.dataset.marcEntry) : {};
    return {
      type: row.dataset.metadataEntry,
      tag: saved.tag || '',
      value: row.querySelector('[data-metadata-value]')?.value.trim() || '',
      name_order: row.querySelector('input[type="radio"]:checked')?.value || '',
      indicators: saved.indicators || [' ', ' '],
      subfields: saved.subfields || {}
    };
  }

  function openMetadataFields(button) {
    const row = button.closest('[data-metadata-entry]');
    const kind = button.dataset.metadataKind;
    const subjectType = row.querySelector('[data-subject-type]')?.value || 'person';
    const saved = row.dataset.marcEntry ? JSON.parse(row.dataset.marcEntry) : {};
    const fields = kind === 'physical' ? physicalDescriptionFields : subjectFields;
    const tag = kind === 'physical'
      ? '300'
      : ({ person: '600', corporate: '610', meeting: '611' })[subjectType];
    const heading = kind === 'physical' ? 'Deskripsi Fisik' : `Subjek - ${creatorTypes[subjectType].label}`;
    const initialValues = saved.type === kind && saved.subject_type === subjectType
      ? saved.subfields || {}
      : (row.querySelector('[data-metadata-value]').value.trim() ? { a: row.querySelector('[data-metadata-value]').value.trim() } : {});
    const dialog = content.querySelector('.acq-metadata-dialog');
    activeMetadataDialog = { row, kind, subjectType, tag };
    dialog.querySelector('#acq-metadata-dialog-heading').textContent = `Tag ${tag} - ${heading}`;
    dialog.querySelector('.acq-author-dialog-table-wrap').innerHTML = `<table class="acq-author-fields-table">
      <thead><tr><th>Kode</th><th>Nama</th><th>Isi</th></tr></thead><tbody>
      ${fields.map(([code, label]) => `<tr><td>${escapeHtml(code)}</td><td>${escapeHtml(label)}</td>
        <td><input type="text" data-subfield-code="${escapeHtml(code)}" aria-label="${escapeHtml(`${code} ${label}`)}"
          value="${escapeHtml(initialValues[code] || '')}"></td></tr>`).join('')}
      </tbody></table>`;
    dialog.showModal();
    dialog.querySelector('[data-subfield-code="a"]')?.focus();
  }

  function saveMetadataFields(dialog) {
    if (!activeMetadataDialog || !activeMetadataDialog.row.isConnected) {
      throw new Error('Bagian bibliografis sudah tidak tersedia.');
    }
    const { row, kind, subjectType, tag } = activeMetadataDialog;
    const subfields = Object.fromEntries([...dialog.querySelectorAll('[data-subfield-code]')]
      .map(input => [input.dataset.subfieldCode, input.value.trim()]).filter(([, value]) => value));
    const value = Object.values(subfields).join(', ');
    row.dataset.marcEntry = JSON.stringify({
      type: kind, subject_type: subjectType, tag,
      indicators: kind === 'subject' ? ['1', '0'] : [' ', ' '],
      subfields
    });
    const input = row.querySelector('[data-metadata-value]');
    input.value = value.slice(0, input.maxLength);
    dialog.close();
    activeMetadataDialog = null;
  }

  function addMetadataEntry(kind, container) {
    const index = container.querySelectorAll('[data-metadata-entry="subject"]').length + 1;
    if (kind === 'subject') {
      const row = document.createElement('div');
      row.className = 'acq-author-control acq-subject-entry';
      row.dataset.metadataEntry = 'subject';
      row.innerHTML = `<select name="subject_type" data-subject-type aria-label="Jenis subjek">
        <option value="person">Nama Orang</option><option value="corporate">Nama Badan</option>
        <option value="meeting">Nama Pertemuan</option></select>
        <div class="acq-author-input-control">
          <input name="subject" type="text" maxlength="5000" placeholder="Masukan Subjek..." data-metadata-value>
          <button class="module-button is-warning acq-author-editor-button" type="button"
            data-action="open-metadata-fields" data-metadata-kind="subject" aria-label="Buka subruas subjek">${authorEditorIcon}</button>
          <button class="module-button is-success acq-additional-author-add" type="button"
            data-action="add-metadata-entry" data-metadata-kind="subject" aria-label="Tambah subjek">+</button>
        </div><div class="acq-name-order">
          <label><input type="radio" name="subject_name_order_${index}" value="Tidak Ada Info Tambahan" checked> Tdk Ada Info Tambahan</label>
          <label><input type="radio" name="subject_name_order_${index}" value="Nama Depan"> Nama Depan</label>
          <label><input type="radio" name="subject_name_order_${index}" value="Nama Belakang"> Nama Belakang</label>
          <label><input type="radio" name="subject_name_order_${index}" value="Nama Keluarga"> Nama Keluarga</label>
        </div>`;
      markRepeatEntry(row);
      container.append(row);
      return;
    }
    if (kind === 'online') {
      const source = container.querySelector('[data-online-location]');
      const row = source.cloneNode(true);
      const input = row.querySelector('input');
      input.value = '';
      input.removeAttribute('id');
      row.querySelector('label')?.removeAttribute('for');
      markRepeatEntry(row);
      container.append(row);
    }
  }

  function addNote(container) {
    const source = container.querySelector('[data-note-entry]');
    const row = source.cloneNode(true);
    const index = container.querySelectorAll('[data-note-entry]').length + 1;
    row.querySelector('textarea').value = '';
    row.querySelector('textarea').id = `acq-note-${index}`;
    row.querySelector('textarea').name = 'note_text';
    row.querySelector('label').htmlFor = `acq-note-${index}`;
    row.querySelectorAll('input[type="radio"]').forEach((radio, radioIndex) => {
      radio.name = `note_type_${index}`;
      radio.checked = radioIndex === 0;
    });
    markRepeatEntry(row);
    container.append(row);
  }

  function addBibliographicInput(button) {
    const sourceRow = button.closest('.acq-bibliographic-repeat-row');
    const row = sourceRow.cloneNode(true);
    const input = row.querySelector('input');
    input.value = '';
    input.removeAttribute('id');
    input.removeAttribute('required');
    row.querySelector('label')?.removeAttribute('for');
    markRepeatEntry(row);
    sourceRow.after(row);
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
      if (!data.material_type) throw new Error('Pilih salah satu jenis bahan dari daftar.');
      data.record_type = form.dataset.recordType;
      let marcData;
      try {
        marcData = JSON.parse(data.marc_data || '[]');
      } catch {
        throw new Error('Ruas Data MARC harus berupa JSON yang valid.');
      }
      const bibliographicMetadata = {
        subtitle: data.subtitle || '',
        responsibility: data.responsibility || '',
        creator_type: data.creator_type || '',
        creator_name_order: data.creator_name_order || '',
        main_creator: readCreatorEntry(form.querySelector('[data-author-entry="main"]')),
        additional_authors: [...form.querySelectorAll('[data-author-entry="additional"]')]
          .map(readCreatorEntry).filter(entry => entry.name),
        publication_place: data.publication_place || '',
        edition: data.edition || '',
        physical_description: readMetadataEntry(form.querySelector('[data-metadata-entry="physical"]')),
        physical_details: {
          pages: data.physical_pages || '',
          illustrations: data.physical_illustrations || '',
          dimensions: data.physical_dimensions || '',
          accompanying_material: data.physical_accompanying_material || ''
        },
        subjects: [...form.querySelectorAll('[data-metadata-entry="subject"]')]
          .map(readMetadataEntry).filter(entry => entry.value),
        ddc_class: data.ddc_class || '',
        call_numbers: [...form.querySelectorAll('[name="call_number"]')].map(input => input.value.trim()).filter(Boolean),
        isbns: [...form.querySelectorAll('[name="isbn"]')].map(input => input.value.trim()).filter(Boolean),
        notes: [...form.querySelectorAll('[data-note-entry]')].map(row => ({
          type: row.querySelector('input[type="radio"]:checked')?.value || noteTypes[0],
          text: row.querySelector('[data-note-text]').value.trim()
        })).filter(note => note.text),
        online_locations: [...form.querySelectorAll('[name="online_location"]')]
          .map(input => input.value.trim()).filter(Boolean),
        marc_data: marcData
      };
      data.subject = bibliographicMetadata.subjects.map(entry => entry.value).join('; ').slice(0, 5000);
      data.call_number = bibliographicMetadata.call_numbers[0] || '';
      data.physical_description = [
        data.physical_pages, data.physical_illustrations, data.physical_dimensions,
        data.physical_accompanying_material, data.physical_description
      ].filter(Boolean).join(' : ').slice(0, 255);
      data.rda_metadata = {
        ...(form.dataset.recordType === 'rda' ? {
          responsibility_statement: data.responsibility || '',
          edition: data.edition || '',
          publication_statement: data.publication_statement || '',
          physical_description: data.physical_description || '',
          series_statement: data.series_statement || '',
          other_identifier: data.other_identifier || ''
        } : {}),
        bibliographic_metadata: bibliographicMetadata
      };
      delete data.material_type_label;
      delete data.subtitle;
      delete data.responsibility;
      delete data.creator_type;
      delete data.creator_name_order;
      delete data.additional_author_type;
      delete data.additional_author;
      Object.keys(data).filter(key => key.startsWith('additional_creator_name_order_'))
        .forEach(key => delete data[key]);
      delete data.publication_place;
      delete data.edition;
      delete data.physical_description;
      delete data.physical_pages;
      delete data.physical_illustrations;
      delete data.physical_dimensions;
      delete data.physical_accompanying_material;
      delete data.ddc_class;
      delete data.subject_type;
      delete data.note_text;
      delete data.online_location;
      Object.keys(data).filter(key => key.startsWith('subject_name_order_'))
        .forEach(key => delete data[key]);
      delete data.marc_data;
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
        selectMaterial(choice);
      } else if (button.dataset.action === 'toggle-acq-marc') {
        const marcFields = content.querySelector('.acq-marc-fields');
        marcFields.hidden = !marcFields.hidden;
        button.textContent = marcFields.hidden ? 'Tampilkan Form MARC' : 'Sembunyikan Form MARC';
      } else if (button.dataset.action === 'open-author-fields') {
        openAuthorFields(button);
      } else if (button.dataset.action === 'save-author-fields') {
        saveAuthorFields(button.closest('dialog'));
      } else if (button.dataset.action === 'close-author-dialog') {
        button.closest('dialog').close();
        activeAuthorRow = null;
      } else if (button.dataset.action === 'add-additional-author') {
        addAdditionalAuthorRow(button.closest('.acq-additional-authors'));
      } else if (button.dataset.action === 'open-metadata-fields') {
        openMetadataFields(button);
      } else if (button.dataset.action === 'save-metadata-fields') {
        saveMetadataFields(button.closest('.acq-metadata-dialog'));
      } else if (button.dataset.action === 'close-metadata-dialog') {
        button.closest('.acq-metadata-dialog').close();
        activeMetadataDialog = null;
      } else if (button.dataset.action === 'add-metadata-entry') {
        const container = button.closest('.acq-subject-entries');
        addMetadataEntry(button.dataset.metadataKind, container);
      } else if (button.dataset.action === 'add-note') {
        addNote(button.closest('.acq-notes-list'));
      } else if (button.dataset.action === 'add-online-location') {
        addMetadataEntry('online', button.closest('.acq-online-locations'));
      } else if (button.dataset.action === 'add-bibliographic-input') {
        addBibliographicInput(button);
      } else if (button.dataset.action === 'remove-repeat-entry') {
        const row = button.closest('[data-repeat-entry="true"]');
        if (!row) throw new Error('Baris tambahan tidak ditemukan.');
        row.remove();
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
          call_number: title.call_number || ''
        };
        for (const [name, value] of Object.entries(values)) {
          const control = form.elements.namedItem(name);
          if (control) control.value = value;
        }
        const titleMaterialType = ({
          Monograf: 'buku',
          Serial: 'jurnal',
          Peta: 'peta',
          Musik: 'musik',
          Video: 'rekaman video',
          'Bahan khusus': 'bahan ephemeral',
          Lainnya: 'bahan ephemeral',
          lainnya: 'bahan ephemeral'
        })[title.material_type] || title.material_type;
        const materialChoice = acquisitionChoices.material_type.find(choice => choice.value === titleMaterialType)
          || acquisitionChoices.material_type[0];
        selectMaterial(materialChoice);
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
    const authorType = event.target.closest('[data-author-type]');
    if (authorType) {
      const row = authorType.closest('[data-author-entry]');
      row.dataset.marcEntry = '';
      row.querySelector('[data-author-value]').value = '';
      return;
    }
    const subjectType = event.target.closest('[data-subject-type]');
    if (subjectType) {
      const row = subjectType.closest('[data-metadata-entry]');
      row.dataset.marcEntry = '';
      row.querySelector('[data-metadata-value]').value = '';
      return;
    }
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
    if (event.target.matches('[data-author-value]')) {
      event.target.closest('[data-author-entry]').dataset.marcEntry = '';
    }
    if (event.target.matches('[data-metadata-value]')) {
      event.target.closest('[data-metadata-entry]').dataset.marcEntry = '';
    }
    if (event.target.matches('#acquisition-form #acq-material_type')) {
      filterMaterialOptions(event.target.value);
      setMaterialOptionsOpen(true);
      const selectedChoice = acquisitionChoices.material_type.find(choice =>
        choice.label.toLocaleLowerCase('id') === event.target.value.trim().toLocaleLowerCase('id'));
      const materialType = content.querySelector('#acquisition-form [name="material_type"]');
      const details = content.querySelector('.acquisition-entry-details');
      const bibliographicFields = content.querySelector('.acq-bibliographic-fields');
      materialType.value = selectedChoice ? selectedChoice.value : '';
      details.hidden = !selectedChoice;
      bibliographicFields.disabled = !selectedChoice;
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
    const normalized = value.trim().toLocaleLowerCase('id');
    const isSelectedChoice = acquisitionChoices.material_type.some(choice =>
      choice.label.toLocaleLowerCase('id') === normalized);
    const keyword = isSelectedChoice ? '' : normalized;
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

  function selectMaterial(choice) {
    const input = content.querySelector('#acq-material_type');
    const materialType = content.querySelector('#acquisition-form [name="material_type"]');
    const details = content.querySelector('.acquisition-entry-details');
    const bibliographicFields = content.querySelector('.acq-bibliographic-fields');
    if (!input || !materialType || !details || !bibliographicFields) return;
    input.value = choice.label;
    materialType.value = choice.value;
    details.hidden = false;
    bibliographicFields.disabled = false;
    setMaterialOptionsOpen(false);
    const title = content.querySelector('#acq-title');
    title.focus();
    title.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
