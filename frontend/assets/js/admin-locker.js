(() => {
  const module = document.getElementById('admin-module');
  const content = document.getElementById('module-content');
  const dashboard = document.querySelector('.dashboard-content');
  const pageTitle = document.getElementById('page-title');
  const sidebar = document.getElementById('admin-sidebar');
  const prefix = 'library-admin-locker:';
  const routes = {
    'locker-loan': { title: 'Peminjaman', kind: 'loan', description: 'Catat peminjaman loker oleh anggota perpustakaan.' },
    'locker-return': { title: 'Pengembalian', kind: 'return', description: 'Proses pengembalian loker oleh anggota perpustakaan.' },
    'locker-loans': { title: 'Daftar Transaksi Peminjaman Locker', kind: 'loans', description: 'Tinjau dan cari riwayat transaksi peminjaman loker.' },
    'locker-returns': { title: 'Daftar Transaksi Pengembalian Locker', kind: 'returns', description: 'Tinjau dan cari riwayat transaksi pengembalian loker.' }
  };
  let selectedMember = null;
  let selectedLockerLoan = null;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function read(key) {
    const raw = localStorage.getItem(`${prefix}${key}`);
    if (raw === null) return [];
    const items = JSON.parse(raw);
    if (!Array.isArray(items)) throw new Error('Data transaksi loker tersimpan tidak valid.');
    return items;
  }

  function save(key, items) {
    try {
      localStorage.setItem(`${prefix}${key}`, JSON.stringify(items));
      return true;
    } catch {
      showMessage('Data tidak dapat disimpan di browser ini. Periksa ruang penyimpanan dan izin situs.', true);
      return false;
    }
  }

  function showMessage(text, isError = false) {
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
    const value = options.value === undefined ? '' : ` value="${escapeHtml(options.value)}"`;
    return `<div class="module-field"><label for="locker-${name}">${escapeHtml(label)}</label>
      <input id="locker-${name}" name="${name}" type="${options.type || 'text'}"${options.required ? ' required' : ''}${options.max ? ` maxlength="${options.max}"` : ''}${value}></div>`;
  }

  function panel(title, body) {
    return `<section class="module-panel"><div class="module-panel-heading"><h2>${escapeHtml(title)}</h2></div>${body}</section>`;
  }

  function table(headers, rows, emptyMessage = 'Tidak ada data yang ditemukan.') {
    return `<div class="module-table-wrap"><table class="module-table"><thead><tr>${headers.map(item => `<th>${escapeHtml(item)}</th>`).join('')}</tr></thead>
      <tbody>${rows || `<tr><td class="module-table-empty" colspan="${headers.length}">${escapeHtml(emptyMessage)}</td></tr>`}</tbody></table></div>`;
  }

  function shell(routeKey, body) {
    const route = routes[routeKey];
    return `<div class="module-heading"><div><p class="module-breadcrumb">Loker <span>›</span> ${escapeHtml(route.title)}</p>
      <h1>${escapeHtml(route.title)}</h1><p>${escapeHtml(route.description)}</p></div><span class="module-badge">Mode prototipe</span></div>
      <div class="module-notice">Transaksi loker disimpan di browser ini saja dan belum terhubung ke sistem loker resmi.</div>${body}`;
  }

  function lookupMember() {
    return panel('Peminjaman', `<div class="module-panel-body"><form class="module-toolbar" data-form="member-lookup">
      <strong class="module-label">No. Anggota</strong><div class="module-toolbar-group">${field('Masukkan No. Anggota', 'member_number', { required: true, max: 80 })}
      <button class="module-button is-primary" type="submit">OK</button></div></form>
      ${selectedMember ? `<div class="module-recipient-preview"><strong>${escapeHtml(selectedMember.full_name)}</strong>
        <span>Nomor Anggota: ${escapeHtml(selectedMember.member_number)}</span></div>` : ''}</div>`);
  }

  function loanPage() {
    const openLoans = selectedMember
      ? read('loans').filter(loan => loan.member_number === selectedMember.member_number && !loan.returned_at)
      : [];
    const rows = openLoans.map(loan => `<tr><td>${escapeHtml(loan.transaction_number)}</td><td>${escapeHtml(loan.locker_number)}</td>
      <td>${escapeHtml(loan.guarantee_type)}</td><td>${escapeHtml(loan.loan_date)}</td></tr>`).join('');
    return `${lookupMember()}${selectedMember ? panel('Data Peminjaman Loker', `<div class="module-panel-body">
      <form class="module-form" data-form="loan"><div class="module-form-grid">
        ${field('Nomor Loker', 'locker_number', { required: true, max: 80 })}
        <div class="module-field"><label for="locker-guarantee-type">Jenis Jaminan</label><select id="locker-guarantee-type" name="guarantee_type" required>
          <option value="">Pilih jenis jaminan</option><option>Kartu Identitas</option><option>Kartu Anggota</option><option>Lainnya</option></select></div>
        ${field('Keterangan Jaminan', 'guarantee_note', { max: 180 })}
        ${field('Tanggal Pinjam', 'loan_date', { type: 'date', required: true, value: new Date().toISOString().slice(0, 10) })}</div>
        <div class="module-form-actions"><button class="module-button is-primary" type="submit">Simpan Peminjaman</button>
          <button class="module-button is-neutral" type="button" data-action="clear-member">Batal</button></div></form>
        ${table(['Nomor Pinjaman', 'Loker', 'Jenis Jaminan', 'Tanggal Pinjam'], rows, 'Belum ada transaksi aktif untuk anggota ini.')}</div>`) : ''}`;
  }

  function returnPage() {
    return panel('Pengembalian', `<div class="module-panel-body"><form class="module-toolbar" data-form="return-lookup">
      <strong class="module-label">Nomor Kunci atau Nomor Pinjaman</strong><div class="module-toolbar-group">${field('Nomor Loker atau Nomor Peminjaman', 'query', { required: true, max: 80 })}
      <button class="module-button is-primary" type="submit">Cari</button></div></form>
      ${selectedLockerLoan ? `<div class="module-recipient-preview"><strong>${escapeHtml(selectedLockerLoan.full_name)} — ${escapeHtml(selectedLockerLoan.locker_number)}</strong>
        <span>Nomor Peminjaman: ${escapeHtml(selectedLockerLoan.transaction_number)} · Jaminan: ${escapeHtml(selectedLockerLoan.guarantee_type)}</span>
        <button class="module-button is-primary" type="button" data-action="confirm-return">Konfirmasi Pengembalian</button></div>` : ''}</div>`);
  }

  function transactionList(kind) {
    const isReturn = kind === 'returns';
    const items = read(kind);
    const headers = isReturn
      ? ['#', 'Nomor Pinjaman', 'Nomor Anggota', 'Jenis Jaminan', 'Loker', 'Tgl. Pinjam', 'Tgl. Kembali', 'Pelanggaran']
      : ['#', 'Nomor Pinjaman', 'Nomor Anggota', 'Jenis Jaminan', 'Loker', 'Tanggal Pinjam', 'Pelanggaran'];
    const rows = items.map((item, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(item.transaction_number)}</td>
      <td>${escapeHtml(item.member_number)}</td><td>${escapeHtml(item.guarantee_type)}</td><td>${escapeHtml(item.locker_number)}</td>
      <td>${escapeHtml(item.loan_date)}</td>${isReturn ? `<td>${escapeHtml(item.return_date)}</td>` : ''}
      <td>${escapeHtml(item.violation || '—')}</td></tr>`).join('');
    return panel(isReturn ? 'Daftar Transaksi Pengembalian Locker' : 'Daftar Transaksi Peminjaman Locker',
      `<div class="module-toolbar"><div class="module-toolbar-group">
        <input class="module-filter" type="search" data-filter placeholder="Cari nomor pinjaman, anggota, atau loker" aria-label="Cari transaksi">
        <button class="module-button is-neutral" type="button" data-action="refresh">Segarkan Kembali</button></div>
        <label class="module-label">Tampilkan <select class="module-select" data-page-size><option>20</option><option>50</option><option>100</option></select> per halaman</label></div>
        ${table(headers, rows)}`);
  }

  function render(routeKey) {
    const route = routes[routeKey];
    if (!route) return;
    if (route.kind !== 'loan') selectedMember = null;
    if (route.kind !== 'return') selectedLockerLoan = null;
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
      const body = route.kind === 'loan' ? loanPage()
        : route.kind === 'return' ? returnPage()
          : transactionList(route.kind);
      content.innerHTML = shell(routeKey, body);
    } catch (error) {
      console.error('Tidak dapat memuat modul Loker:', error);
      content.innerHTML = `${shell(routeKey, '')}<div class="module-toast is-error" role="alert">${escapeHtml(error.message)}</div>`;
    }
  }

  function findMember(number) {
    let members;
    try {
      members = JSON.parse(localStorage.getItem('library-admin-membership:members') || '[]');
    } catch {
      throw new Error('Data anggota tersimpan tidak valid.');
    }
    if (!Array.isArray(members)) throw new Error('Daftar anggota tersimpan tidak valid.');
    const member = members.find(item => item.member_number === number);
    if (!member) throw new Error('Anggota tidak ditemukan. Tambahkan data anggota terlebih dahulu.');
    if (member.status && member.status !== 'Aktif') throw new Error('Status anggota tidak aktif.');
    if (member.expiry_date && member.expiry_date < new Date().toISOString().slice(0, 10)) throw new Error('Masa berlaku keanggotaan telah berakhir.');
    return member;
  }

  content.addEventListener('submit', event => {
    const form = event.target.closest('form[data-form]');
    if (!form) return;
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      if (form.dataset.form === 'member-lookup') {
        selectedMember = findMember(data.member_number.trim());
        render(window.location.hash.slice(1));
      } else if (form.dataset.form === 'loan') {
        if (!selectedMember) throw new Error('Cari anggota terlebih dahulu.');
        const loans = read('loans');
        if (loans.some(item => item.locker_number === data.locker_number && !item.returned_at)) {
          throw new Error('Loker sedang dipinjam dan belum dikembalikan.');
        }
        loans.push({
          ...data, member_number: selectedMember.member_number, full_name: selectedMember.full_name,
          transaction_number: `LKR-${Date.now()}`, returned_at: null, violation: ''
        });
        if (save('loans', loans)) {
          render(window.location.hash.slice(1));
          showMessage('Transaksi peminjaman loker berhasil disimpan.');
        }
      } else if (form.dataset.form === 'return-lookup') {
        const query = data.query.trim().toLocaleLowerCase('id');
        selectedLockerLoan = read('loans').find(item => !item.returned_at
          && (item.locker_number.toLocaleLowerCase('id') === query
            || item.transaction_number.toLocaleLowerCase('id') === query));
        if (!selectedLockerLoan) throw new Error('Transaksi peminjaman aktif tidak ditemukan.');
        render(window.location.hash.slice(1));
      }
    } catch (error) {
      showMessage(error.message, true);
    }
  });

  content.addEventListener('input', event => {
    if (!event.target.matches('[data-filter]')) return;
    const keyword = event.target.value.trim().toLocaleLowerCase('id');
    content.querySelectorAll('.module-table tbody tr').forEach(row => {
      row.hidden = keyword !== '' && !row.textContent.toLocaleLowerCase('id').includes(keyword);
    });
  });

  content.addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    try {
      if (button.dataset.action === 'clear-member') {
        selectedMember = null;
        render(window.location.hash.slice(1));
      } else if (button.dataset.action === 'confirm-return') {
        if (!selectedLockerLoan) throw new Error('Cari transaksi peminjaman terlebih dahulu.');
        const loans = read('loans');
        const loan = loans.find(item => item.transaction_number === selectedLockerLoan.transaction_number && !item.returned_at);
        if (!loan) throw new Error('Transaksi loker sudah dikembalikan.');
        loan.returned_at = new Date().toISOString().slice(0, 10);
        const returns = read('returns');
        returns.push({ ...loan, return_date: loan.returned_at });
        if (save('loans', loans) && save('returns', returns)) {
          selectedLockerLoan = null;
          render(window.location.hash.slice(1));
          showMessage('Pengembalian loker berhasil disimpan.');
        }
      } else if (button.dataset.action === 'refresh') {
        render(window.location.hash.slice(1));
        showMessage('Daftar transaksi dimuat ulang.');
      }
    } catch (error) {
      showMessage(error.message, true);
    }
  });

  window.addEventListener('hashchange', () => render(window.location.hash.slice(1)));
  sidebar.querySelectorAll('.nav-module-link[href^="#locker-"]').forEach(link => {
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
