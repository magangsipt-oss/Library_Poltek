(() => {
  const module = document.getElementById('admin-module');
  const content = document.getElementById('module-content');
  const dashboard = document.querySelector('.dashboard-content');
  const pageTitle = document.getElementById('page-title');
  const sidebar = document.getElementById('admin-sidebar');
  const storagePrefix = 'library-admin-circulation:';
  const today = () => new Date().toISOString().slice(0, 10);
  let transactionReturnDate = today();
  const routes = {
    'circulation-loan-entry': { title: 'Entri Peminjaman', kind: 'loan-entry', description: 'Catat peminjaman koleksi untuk anggota perpustakaan.' },
    'circulation-loan-followup': { title: 'Entri Peminjaman Susulan', kind: 'loan-entry', description: 'Catat transaksi peminjaman susulan untuk anggota perpustakaan.' },
    'circulation-reservations': { title: 'Daftar Koleksi Yang Dipesan', kind: 'reservations', description: 'Periksa daftar koleksi yang dipesan oleh anggota.' },
    'circulation-loans': { title: 'Daftar Peminjaman', kind: 'loans', description: 'Cari dan tinjau transaksi peminjaman anggota.' },
    'circulation-renewal-entry': { title: 'Entri Perpanjangan', kind: 'renewal-entry', description: 'Perpanjang masa peminjaman koleksi anggota.' },
    'circulation-renewals': { title: 'Daftar Perpanjangan', kind: 'renewals', description: 'Tinjau riwayat perpanjangan koleksi.' },
    'circulation-return-entry': { title: 'Entri Pengembalian', kind: 'return-entry', description: 'Catat pengembalian koleksi yang dipinjam.' },
    'circulation-return-followup': { title: 'Entri Pengembalian Susulan', kind: 'return-entry', description: 'Catat pengembalian susulan dengan tanggal transaksi.' },
    'circulation-return-combined': { title: 'Entri Pengembalian Gabungan', kind: 'return-entry', description: 'Kembalikan beberapa koleksi dalam satu transaksi.' },
    'circulation-returns': { title: 'Daftar Pengembalian', kind: 'returns', description: 'Tinjau riwayat pengembalian koleksi.' },
    'circulation-stock-opname': { title: 'Stock Opname', kind: 'stock-opname', description: 'Catat kegiatan pemeriksaan dan pencocokan koleksi.' },
    'circulation-violations': { title: 'Data Pelanggaran', kind: 'violations', description: 'Catat dan tinjau pelanggaran peminjaman anggota.' },
    'circulation-ready': { title: 'Verifikasi Koleksi Siap Layan', kind: 'ready', description: 'Verifikasi koleksi sebelum tersedia untuk dilayankan.' }
  };
  let activeMember = null;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function renderRenewalEntry() {
    return panel('Koleksi Yang Akan Diperpanjang', `<div class="module-panel-body"><form class="module-form" data-form="renewal">
      <div class="module-form-grid">${field('No Barcode', 'barcode', { required: true, max: 80 })}
        ${field('Tanggal Transaksi', 'date', { type: 'date', value: today(), required: true })}
        ${field('Jatuh Tempo Baru', 'due_date', { type: 'date', value: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10), required: true })}</div>
      <div class="module-form-actions"><button class="module-button is-primary" type="submit">Simpan</button>
        <button class="module-button is-danger" type="reset">Batal Transaksi</button></div></form>
      ${table(['Member Number', 'Nama Lengkap', 'No Barcode', 'Judul', 'Tgl. Pinjam', 'Jatuh Tempo'], loanRows(read('loans').filter(item => !item.returned_at)))}</div>`);
  }

  function read(key) {
    const raw = localStorage.getItem(`${storagePrefix}${key}`);
    if (raw === null) return [];
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) throw new Error('Data sirkulasi tersimpan tidak valid. Periksa penyimpanan situs.');
    return value;
  }

  function save(key, items) {
    try {
      localStorage.setItem(`${storagePrefix}${key}`, JSON.stringify(items));
      return true;
    } catch {
      message('Data tidak dapat disimpan di browser ini. Periksa ruang penyimpanan dan izin situs.', true);
      return false;
    }
  }

  function message(text, isError = false) {
    let box = content.querySelector('.module-toast');
    if (!box) {
      box = document.createElement('div');
      box.className = 'module-toast';
      content.prepend(box);
    }
    box.classList.toggle('is-error', isError);
    box.setAttribute('role', isError ? 'alert' : 'status');
    box.textContent = text;
    box.hidden = false;
  }

  function field(label, name, options = {}) {
    const type = options.type || 'text';
    const value = options.value === undefined ? '' : ` value="${escapeHtml(options.value)}"`;
    const max = options.max ? ` maxlength="${options.max}"` : '';
    return `<div class="module-field"><label for="circ-${name}">${escapeHtml(label)}</label>
      <input id="circ-${name}" name="${name}" type="${type}"${options.required ? ' required' : ''}${max}${value}></div>`;
  }

  function panel(title, body, toolbar = '') {
    return `<section class="module-panel"><div class="module-panel-heading"><h2>${escapeHtml(title)}</h2>${toolbar}</div>${body}</section>`;
  }

  function table(headers, rows, emptyMessage = 'Tidak ada data yang ditemukan.') {
    return `<div class="module-table-wrap"><table class="module-table"><thead><tr>${headers.map(label => `<th>${escapeHtml(label)}</th>`).join('')}</tr></thead>
      <tbody>${rows || `<tr><td class="module-table-empty" colspan="${headers.length}">${escapeHtml(emptyMessage)}</td></tr>`}</tbody></table></div>`;
  }

  function shell(routeKey, body) {
    const route = routes[routeKey];
    return `<div class="module-heading"><div><p class="module-breadcrumb">Sirkulasi <span>›</span> ${escapeHtml(route.title)}</p>
      <h1>${escapeHtml(route.title)}</h1><p>${escapeHtml(route.description)}</p></div><span class="module-badge">Mode prototipe</span></div>
      <div class="module-notice">Data sirkulasi disimpan di browser ini saja dan belum terhubung ke database atau data koleksi resmi.</div>${body}`;
  }

  function memberLookup() {
    return panel('Cari Anggota', `<div class="module-panel-body"><form class="module-toolbar" data-form="member-lookup">
      <div class="module-toolbar-group">${field('Nomor Anggota', 'member_number', { required: true, max: 80 })}
      <button class="module-button is-warning" type="submit">Cari Anggota</button></div></form>
      <div id="circ-member-result" class="module-recipient-preview" ${activeMember ? '' : 'hidden'}>${activeMember
        ? `<strong>${escapeHtml(activeMember.full_name)}</strong><span>Member Number: ${escapeHtml(activeMember.member_number)}</span>`
        : ''}</div></div>`);
  }

  function loanForm(isFollowup = false) {
    if (!activeMember) return memberLookup();
    const title = isFollowup ? 'Entri Peminjaman Susulan' : 'Koleksi Yang Dipinjam';
    return `${memberLookup()}${panel(title, `<div class="module-panel-body"><form class="module-form" data-form="loan">
      <div class="module-form-grid">${field('No Barcode', 'barcode', { required: true, max: 80 })}
        ${field('Judul', 'title', { required: true, max: 255 })}
        ${field('Penerbit', 'publisher', { max: 255 })}
        ${field('Lokasi Perpustakaan', 'location', { value: 'Perpustakaan Pusat', max: 180 })}
        ${field('Tanggal Pinjam', 'loan_date', { type: 'date', value: today(), required: true })}
        ${field('Jatuh Tempo', 'due_date', { type: 'date', value: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), required: true })}</div>
      <div class="module-form-actions"><button class="module-button is-primary" type="submit">Simpan Peminjaman</button>
        <button class="module-button is-neutral" type="button" data-action="clear-member">Batal Transaksi</button></div></form></div>
      ${table(['No Barcode', 'Judul', 'Penerbit', 'Tanggal Pinjam', 'Jatuh Tempo', 'Lokasi Perpustakaan'], loanRows(read('loans').filter(item => item.member_number === activeMember.member_number && !item.returned_at)), 'Belum ada koleksi dalam transaksi ini.')}`)}`;
  }

  function loanRows(items) {
    return items.map(item => `<tr><td>${escapeHtml(item.barcode)}</td><td>${escapeHtml(item.title)}</td><td>${escapeHtml(item.publisher || '—')}</td>
      <td>${escapeHtml(item.loan_date)}</td><td>${escapeHtml(item.due_date)}</td><td>${escapeHtml(item.location || 'Perpustakaan Pusat')}</td></tr>`).join('');
  }

  function listPage(kind) {
    const data = read(kind);
    const definitions = {
      reservations: { title: 'Daftar Koleksi Yang Dipesan', headers: ['#', 'Tgl. Pesan', 'Member Number', 'Nama Lengkap', 'Judul', 'Penerbit', 'Lokasi Ruang', 'Status'], values: item => [item.date, item.member_number, item.full_name, item.title, item.publisher, item.location, item.status] },
      loans: { title: 'Daftar Peminjaman', headers: ['#', 'Member Number', 'Nama Lengkap', 'No Barcode', 'Judul', 'Penerbit', 'Tgl. Pinjam', 'Jatuh Tempo', 'Hari Terlambat', 'Lokasi Perpustakaan'], values: item => [item.member_number, item.full_name, item.barcode, item.title, item.publisher, item.loan_date, item.due_date, item.returned_at ? '—' : Math.max(0, Math.floor((Date.now() - new Date(`${item.due_date}T00:00:00`)) / 86400000)), item.location] },
      renewals: { title: 'Daftar Perpanjangan', headers: ['#', 'Member Number', 'Nama Lengkap', 'No Barcode', 'Judul', 'Tgl. Pinjam', 'Tgl. Perpanjangan', 'Perpanjangan Ke', 'Jatuh Tempo'], values: item => [item.member_number, item.full_name, item.barcode, item.title, item.loan_date, item.date, item.renewal_count, item.due_date] },
      returns: { title: 'Daftar Pengembalian', headers: ['#', 'Member Number', 'Nama Lengkap', 'No Barcode', 'Judul', 'Tgl. Pinjam', 'Jatuh Tempo', 'Tgl. Kembali', 'Hari Terlambat'], values: item => [item.member_number, item.full_name, item.barcode, item.title, item.loan_date, item.due_date, item.return_date, item.late_days] },
      violations: { title: 'Data Pelanggaran', headers: ['#', 'Member Number', 'Nama Lengkap', 'No. Peminjaman', 'No Barcode', 'Judul', 'Jenis Pelanggaran', 'Jumlah Denda', 'Jumlah Suspend'], values: item => [item.member_number, item.full_name, item.transaction_number, item.barcode, item.title, item.violation_type, item.fine, item.suspension] },
      ready: { title: 'Verifikasi Koleksi Siap Layan', headers: ['#', 'Judul Kiriman', 'Penanggung Jawab', 'NIP Penanggung Jawab', 'Status', 'Aksi'], values: item => [item.title, item.responsible, item.nip, item.status] },
      'stock-opname': { title: 'Stock Opname', headers: ['#', 'Project Name', 'Tgl. Mulai', 'Tahun', 'Koordinator', 'Keterangan'], values: item => [item.project_name, item.start_date, item.year, item.coordinator, item.note] }
    };
    const definition = definitions[kind];
    const rows = data.map((item, index) => {
      const values = definition.values(item);
      if (kind === 'ready') values.push(`<button class="module-button is-primary" type="button" data-action="verify-ready" data-id="${escapeHtml(item.id)}" ${item.status === 'Siap Layan' ? 'disabled' : ''}>${item.status === 'Siap Layan' ? 'Terverifikasi' : 'Verifikasi'}</button>`);
      return `<tr><td>${index + 1}</td>${values.map((value, valueIndex) => `<td>${kind === 'ready' && valueIndex === values.length - 1 ? value : escapeHtml(value === '' || value === null || value === undefined ? '—' : value)}</td>`).join('')}</tr>`;
    }).join('');
    const actions = ['reservations', 'violations', 'ready', 'stock-opname'].includes(kind);
    const toolbar = `<div class="module-toolbar"><div class="module-toolbar-group">
      ${actions ? `<button class="module-button is-primary" type="button" data-action="toggle-form">＋ Tambah</button>` : ''}
      <input class="module-filter" type="search" data-filter="${kind}" placeholder="Cari data..." aria-label="Cari data">
      <button class="module-button is-neutral" type="button" data-action="refresh">Segarkan Kembali</button>
      </div><label class="module-label">Tampilkan <select class="module-select" data-page-size><option>20</option><option>50</option><option>100</option></select> per halaman</label></div>`;
    return `${panel(definition.title, `${toolbar}${table(definition.headers, rows, 'Tidak ada data yang ditemukan.')}`)}
      ${actions ? panel(`Tambah Data ${definition.title}`, formFor(kind), '<span></span>').replace('<section class="module-panel">', '<section class="module-panel circulation-form" hidden>') : ''}`;
  }

  function formFor(kind) {
    if (kind === 'reservations') return `<div class="module-panel-body"><form class="module-form" data-form="reservation"><div class="module-form-grid">
      ${field('Member Number', 'member_number', { required: true, max: 80 })}${field('Nama Lengkap', 'full_name', { required: true, max: 180 })}
      ${field('Judul', 'title', { required: true, max: 255 })}${field('Penerbit', 'publisher', { max: 255 })}
      ${field('Lokasi Ruang', 'location', { max: 180 })}${field('Tanggal Pesan', 'date', { type: 'date', value: today() })}</div>
      <div class="module-form-actions"><button class="module-button is-primary" type="submit">Simpan Pesanan</button></div></form></div>`;
    if (kind === 'stock-opname') return `<div class="module-panel-body"><form class="module-form" data-form="stock-opname"><div class="module-form-grid">
      ${field('Project Name', 'project_name', { required: true, max: 180 })}${field('Tanggal Mulai', 'start_date', { type: 'date', value: today() })}
      ${field('Tahun', 'year', { type: 'number', value: new Date().getFullYear() })}${field('Koordinator', 'coordinator', { max: 180 })}
      ${field('Keterangan', 'note', { max: 500 })}</div><div class="module-form-actions"><button class="module-button is-primary" type="submit">Simpan</button></div></form></div>`;
    if (kind === 'violations') return `<div class="module-panel-body"><form class="module-form" data-form="violation"><div class="module-form-grid">
      ${field('Member Number', 'member_number', { required: true, max: 80 })}${field('Nama Lengkap', 'full_name', { required: true, max: 180 })}
      ${field('No. Peminjaman', 'transaction_number', { max: 80 })}${field('No Barcode', 'barcode', { max: 80 })}
      ${field('Judul', 'title', { max: 255 })}${field('Jenis Pelanggaran', 'violation_type', { required: true, max: 120 })}
      ${field('Jumlah Denda', 'fine', { type: 'number', value: 0 })}${field('Jumlah Suspend (hari)', 'suspension', { type: 'number', value: 0 })}</div>
      <div class="module-form-actions"><button class="module-button is-primary" type="submit">Simpan</button></div></form></div>`;
    return `<div class="module-panel-body"><form class="module-form" data-form="ready"><div class="module-form-grid">
      ${field('Judul Kiriman', 'title', { required: true, max: 255 })}${field('Penanggung Jawab', 'responsible', { max: 180 })}
      ${field('NIP Penanggung Jawab', 'nip', { max: 80 })}</div><div class="module-form-actions"><button class="module-button is-primary" type="submit">Tambah Koleksi</button></div></form></div>`;
  }

  function renderReturnEntry() {
    return panel('Transaksi Pengembalian', `<div class="module-panel-body"><div class="module-form-actions">
      <button class="module-button is-primary" type="button" data-action="save-returns">Simpan</button>
      <button class="module-button is-danger" type="button" data-action="clear-returns">Batal Transaksi</button>
      ${window.location.hash === '#circulation-return-followup' ? `<label class="module-label">Tgl Transaksi <input class="module-select" type="date" id="return-date" value="${transactionReturnDate}"></label>` : ''}</div>
      <form class="module-toolbar" data-form="return-lookup"><div class="module-toolbar-group">${field('No. Barcode', 'barcode', { required: true, max: 80 })}
        <button class="module-button is-warning" type="submit">OK</button></div></form>
      <h3 class="circulation-strip">Koleksi Yang Akan Dikembalikan</h3>
      ${table(['No Barcode', 'Judul', 'Nama Anggota', 'Tgl. Pinjam', 'Jatuh Tempo', 'Tgl. Kembali'], returnRows())}</div>`);
  }

  function returnRows() {
    return read('return-draft').map(item => `<tr><td>${escapeHtml(item.barcode)}</td><td>${escapeHtml(item.title)}</td><td>${escapeHtml(item.full_name)}</td>
      <td>${escapeHtml(item.loan_date)}</td><td>${escapeHtml(item.due_date)}</td><td>${escapeHtml(item.return_date)}</td></tr>`).join('');
  }

  function render(routeKey, preserveMember = false) {
    const route = routes[routeKey];
    if (!route) return;
    if (!preserveMember) activeMember = null;
    dashboard.hidden = true;
    module.hidden = false;
    pageTitle.textContent = route.title;
    sidebar.querySelectorAll('.nav-module-link').forEach(link => {
      const selected = link.getAttribute('href') === `#${routeKey}`;
      link.classList.toggle('is-current', selected);
      if (selected) {
        let group = link.closest('details');
        while (group && sidebar.contains(group)) {
          group.open = true;
          group = group.parentElement.closest('details');
        }
      }
    });
    try {
      let body;
      if (route.kind === 'loan-entry') body = loanForm(routeKey === 'circulation-loan-followup');
      else if (route.kind === 'renewal-entry') body = renderRenewalEntry();
      else if (route.kind === 'return-entry') body = renderReturnEntry();
      else body = listPage(route.kind);
      content.innerHTML = shell(routeKey, body);
    } catch (error) {
      console.error('Tidak dapat memuat modul Sirkulasi:', error);
      content.innerHTML = `${shell(routeKey, '')}<div class="module-toast is-error" role="alert">${escapeHtml(error.message)}</div>`;
    }
  }

  function memberByNumber(number) {
    let members;
    try {
      members = JSON.parse(localStorage.getItem('library-admin-membership:members') || '[]');
    } catch {
      throw new Error('Data anggota di browser ini tidak valid.');
    }
    if (!Array.isArray(members)) throw new Error('Daftar anggota tersimpan tidak valid.');
    return members.find(member => member.member_number === number);
  }

  function persistForm(form, key, extra = {}) {
    const data = Object.fromEntries(new FormData(form).entries());
    const items = read(key);
    items.push({ ...data, ...extra, id: `${key}-${Date.now()}-${Math.random().toString(36).slice(2)}` });
    if (save(key, items)) {
      render(window.location.hash.slice(1), true);
      message('Data berhasil disimpan di browser ini.');
    }
  }

  content.addEventListener('submit', event => {
    const form = event.target.closest('form[data-form]');
    if (!form) return;
    event.preventDefault();
    try {
      const data = Object.fromEntries(new FormData(form).entries());
      if (form.dataset.form === 'member-lookup') {
        const member = memberByNumber(data.member_number.trim());
        if (!member) throw new Error('Anggota tidak ditemukan. Pastikan data sudah ditambahkan di menu Keanggotaan.');
        if (member.status && member.status !== 'Aktif') throw new Error('Status anggota tidak aktif.');
        if (member.expiry_date && member.expiry_date < today()) throw new Error('Masa berlaku keanggotaan telah berakhir.');
        activeMember = member;
        content.innerHTML = shell(window.location.hash.slice(1), loanForm(window.location.hash === '#circulation-loan-followup'));
        const result = content.querySelector('#circ-member-result');
        if (result) {
          result.hidden = false;
          result.innerHTML = `<strong>${escapeHtml(member.full_name)}</strong><span>Member Number: ${escapeHtml(member.member_number)}</span>`;
        }
      } else if (form.dataset.form === 'loan') {
        if (!activeMember) throw new Error('Cari anggota terlebih dahulu.');
        const loans = read('loans');
        if (loans.some(item => item.barcode === data.barcode && !item.returned_at)) throw new Error('Koleksi ini masih tercatat dipinjam.');
        loans.push({
          ...data, id: `loan-${Date.now()}`, member_number: activeMember.member_number,
          full_name: activeMember.full_name, returned_at: null
        });
        if (save('loans', loans)) {
          render(window.location.hash.slice(1), true);
          message('Peminjaman berhasil dicatat di browser ini.');
        }
      } else if (form.dataset.form === 'renewal') {
        const loans = read('loans');
        const loan = loans.find(item => item.barcode === data.barcode && !item.returned_at);
        if (!loan) throw new Error('Koleksi tidak ditemukan pada daftar peminjaman aktif.');
        if (data.due_date <= loan.due_date) throw new Error('Jatuh tempo baru harus setelah tanggal jatuh tempo saat ini.');
        const renewals = read('renewals');
        loan.due_date = data.due_date;
        loan.renewal_count = Number(loan.renewal_count || 0) + 1;
        renewals.push({
          member_number: loan.member_number, full_name: loan.full_name, barcode: loan.barcode,
          title: loan.title, loan_date: loan.loan_date, date: data.date,
          renewal_count: loan.renewal_count, due_date: data.due_date
        });
        if (save('loans', loans) && save('renewals', renewals)) {
          render(window.location.hash.slice(1));
          message('Perpanjangan berhasil disimpan.');
        }
      } else if (form.dataset.form === 'return-lookup') {
        const loan = read('loans').find(item => item.barcode === data.barcode && !item.returned_at);
        if (!loan) throw new Error('Koleksi tidak ditemukan pada daftar peminjaman aktif.');
        const draft = read('return-draft');
        if (draft.some(item => item.barcode === loan.barcode)) throw new Error('Koleksi sudah masuk daftar pengembalian.');
        const returnDate = document.getElementById('return-date')?.value || today();
        if (returnDate < loan.loan_date) throw new Error('Tanggal kembali tidak boleh sebelum tanggal pinjam.');
        draft.push({ ...loan, return_date: returnDate });
        if (save('return-draft', draft)) render(window.location.hash.slice(1));
      } else if (form.dataset.form === 'reservation') persistForm(form, 'reservations', { status: 'Menunggu' });
      else if (form.dataset.form === 'stock-opname') persistForm(form, 'stock-opname');
      else if (form.dataset.form === 'violation') persistForm(form, 'violations');
      else if (form.dataset.form === 'ready') persistForm(form, 'ready', { status: 'Menunggu Verifikasi' });
    } catch (error) {
      message(error.message, true);
    }
  });

  content.addEventListener('input', event => {
    const filter = event.target.closest('[data-filter]');
    if (!filter) return;
    const keyword = filter.value.trim().toLocaleLowerCase('id');
    content.querySelectorAll('.module-table tbody tr').forEach(row => {
      row.hidden = keyword !== '' && !row.textContent.toLocaleLowerCase('id').includes(keyword);
    });
  });

  content.addEventListener('change', event => {
    if (event.target.id === 'return-date') transactionReturnDate = event.target.value || today();
  });

  content.addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    try {
      if (button.dataset.action === 'clear-member') {
        activeMember = null;
        render(window.location.hash.slice(1));
      } else if (button.dataset.action === 'toggle-form') {
        const form = content.querySelector('.circulation-form');
        form.hidden = !form.hidden;
      } else if (button.dataset.action === 'refresh') {
        render(window.location.hash.slice(1));
        message('Daftar berhasil dimuat ulang.');
      } else if (button.dataset.action === 'save-returns') {
        const draft = read('return-draft');
        if (!draft.length) throw new Error('Tambahkan minimal satu koleksi terlebih dahulu.');
        const loans = read('loans');
        const returns = read('returns');
        for (const item of draft) {
          const loan = loans.find(record => record.id === item.id && !record.returned_at);
          if (!loan) throw new Error(`Peminjaman untuk barcode ${item.barcode} sudah berubah. Segarkan daftar dan coba kembali.`);
          loan.returned_at = item.return_date;
          returns.push({ ...item, late_days: Math.max(0, Math.floor((new Date(`${item.return_date}T00:00:00`) - new Date(`${item.due_date}T00:00:00`)) / 86400000)) });
        }
        if (save('loans', loans) && save('returns', returns) && save('return-draft', [])) {
          render(window.location.hash.slice(1));
          message('Pengembalian berhasil disimpan.');
        }
      } else if (button.dataset.action === 'clear-returns') {
        if (save('return-draft', [])) render(window.location.hash.slice(1));
      } else if (button.dataset.action === 'verify-ready') {
        const items = read('ready');
        const item = items.find(record => record.id === button.dataset.id);
        if (!item) throw new Error('Data koleksi tidak ditemukan.');
        item.status = 'Siap Layan';
        if (save('ready', items)) {
          render(window.location.hash.slice(1));
          message('Koleksi berhasil diverifikasi siap layan.');
        }
      }
    } catch (error) {
      message(error.message, true);
    }
  });

  window.addEventListener('hashchange', () => render(window.location.hash.slice(1)));
  sidebar.querySelectorAll('.nav-module-link[href^="#circulation-"]').forEach(link => {
    link.addEventListener('click', () => {
      let group = link.closest('details');
      while (group && sidebar.contains(group)) {
        group.open = true;
        group = group.parentElement.closest('details');
      }
    });
  });
  render(window.location.hash.slice(1));
})();
