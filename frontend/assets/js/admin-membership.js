(() => {
  const module = document.getElementById('admin-module');
  const content = document.getElementById('module-content');
  const dashboard = document.querySelector('.dashboard-content');
  const pageTitle = document.getElementById('page-title');
  const sidebar = document.getElementById('admin-sidebar');
  const storagePrefix = 'library-admin-membership:';
  const routes = {
    'member-entry': { title: 'Entri Anggota', description: 'Catat data identitas, alamat, dan masa berlaku keanggotaan baru.' },
    'member-list': { title: 'Daftar Anggota', description: 'Cari, periksa, dan kelola data anggota perpustakaan.' },
    'member-import': { title: 'Import Data dari Excel', description: 'Impor data anggota menggunakan file CSV yang dapat dibuka di Excel.' },
    'member-donations': { title: 'Daftar Sumbangan', description: 'Catat dan lihat sumbangan yang diberikan oleh anggota.' },
    'member-renewals': { title: 'Daftar Perpanjangan', description: 'Catat dan lihat riwayat perpanjangan keanggotaan.' },
    'member-basket': { title: 'Keranjang Anggota', description: 'Tinjau dan kelola anggota yang dipilih dari daftar anggota.' }
  };
  let editingMemberId = null;
  let editingMemberType = null;
  const defaultMemberTypes = ['Mahasiswa', 'Dosen', 'Tenaga Kependidikan', 'Umum'];

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function readItems(key) {
    const value = localStorage.getItem(`${storagePrefix}${key}`);
    if (value === null) return [];
    const items = JSON.parse(value);
    if (!Array.isArray(items)) throw new Error('Data keanggotaan tersimpan tidak valid. Hapus data situs untuk mengatur ulang prototipe.');
    return items;
  }

  function saveItems(key, items) {
    try {
      localStorage.setItem(`${storagePrefix}${key}`, JSON.stringify(items));
      return true;
    } catch {
      showMessage('Data tidak dapat disimpan di browser ini. Periksa ruang penyimpanan dan izin situs.', true);
      return false;
    }
  }

  function readMemberTypes() {
    if (localStorage.getItem(`${storagePrefix}member-types`) === null) {
      return defaultMemberTypes.map((name, index) => ({ id: `default-${index}`, name }));
    }
    return readItems('member-types');
  }

  function showMessage(message, isError = false) {
    let notice = content.querySelector('.module-toast');
    if (!notice) {
      notice = document.createElement('div');
      notice.className = 'module-toast';
      content.prepend(notice);
    }
    notice.classList.toggle('is-error', isError);
    notice.setAttribute('role', isError ? 'alert' : 'status');
    notice.textContent = message;
    notice.hidden = false;
  }

  function panel(title, body, tools = '') {
    return `<section class="module-panel"><div class="module-panel-heading"><h2>${escapeHtml(title)}</h2>${tools}</div>${body}</section>`;
  }

  function table(headers, rows, emptyMessage) {
    return `<div class="module-table-wrap"><table class="module-table"><thead><tr>${headers.map(item => `<th>${escapeHtml(item)}</th>`).join('')}</tr></thead>
      <tbody>${rows || `<tr><td class="module-table-empty" colspan="${headers.length}">${escapeHtml(emptyMessage)}</td></tr>`}</tbody></table></div>`;
  }

  function field(label, name, options = {}) {
    const type = options.type || 'text';
    const required = options.required ? 'required' : '';
    const max = options.max ? `maxlength="${options.max}"` : '';
    const value = options.value !== undefined ? `value="${escapeHtml(options.value)}"` : '';
    const placeholder = options.placeholder ? `placeholder="${escapeHtml(options.placeholder)}"` : '';
    return `<div class="module-field"><label for="member-${name}">${escapeHtml(label)}</label>
      <input id="member-${name}" name="${name}" type="${type}" ${required} ${max} ${value} ${placeholder}></div>`;
  }

  function selectField(label, name, options, required = false, selected = '') {
    const optionMarkup = options.replace(/<option([^>]*)>([^<]*)<\/option>/g, (option, attributes, labelText) =>
      labelText.trim() === selected ? `<option${attributes} selected>${labelText}</option>` : option);
    return `<div class="module-field"><label for="member-${name}">${escapeHtml(label)}</label>
      <select id="member-${name}" name="${name}" ${required ? 'required' : ''}>${optionMarkup}</select></div>`;
  }

  function shell(routeKey, body) {
    const route = routes[routeKey];
    return `<div class="module-heading"><div><p class="module-breadcrumb">Keanggotaan <span>›</span> ${escapeHtml(route.title)}</p>
      <h1>${escapeHtml(route.title)}</h1><p>${escapeHtml(route.description)}</p></div><span class="module-badge">Mode prototipe</span></div>
      <div class="module-notice">Data keanggotaan pada halaman ini disimpan di browser ini saja dan belum terhubung ke database.</div>${body}`;
  }

  function memberForm(member = {}) {
    const memberTypes = readMemberTypes();
    const memberTypeOptions = memberTypes.map(type =>
      `<option value="${escapeHtml(type.name)}"${member.member_type === type.name ? ' selected' : ''}>${escapeHtml(type.name)}</option>`).join('');
    const genders = ['Laki-laki', 'Perempuan'].map(item => `<option ${member.gender === item ? 'selected' : ''}>${item}</option>`).join('');
    const statuses = ['Aktif', 'Tidak Aktif', 'Ditangguhkan'].map(item => `<option ${member.status === item ? 'selected' : ''}>${item}</option>`).join('');
    const typeRows = memberTypes.map((type, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(type.name)}</td>
      <td><div class="module-inline-actions"><button class="module-button is-neutral" type="button" data-action="edit-member-type" data-id="${escapeHtml(type.id)}">Ubah</button>
      <button class="module-button is-danger" type="button" data-action="delete-member-type" data-id="${escapeHtml(type.id)}">Hapus</button></div></td></tr>`).join('');
    return `${panel(editingMemberId ? 'Koreksi Data Anggota' : 'Tambah Anggota', `<div class="module-panel-body">
      <form class="module-form" data-form="member">
        <div class="module-form-grid">
          ${field('Member Number', 'member_number', { max: 80, value: member.member_number || '', placeholder: 'Dibuat otomatis jika dikosongkan' })}
          ${selectField('Jenis Anggota', 'member_type', `<option value="">Pilih jenis anggota</option>${memberTypeOptions}`, true, member.member_type || '')}
          ${selectField('Jenis Identitas', 'identity_type', '<option>KTP / NIK</option><option>Kartu Pelajar</option><option>Paspor</option>', true, member.identity_type || 'KTP / NIK')}
          ${field('Nomor Identitas', 'identity_number', { required: true, max: 80, value: member.identity_number || '' })}
          ${field('Nama Lengkap', 'full_name', { required: true, max: 180, value: member.full_name || '' })}
          ${field('Tempat Lahir', 'birth_place', { max: 120, value: member.birth_place || '' })}
          ${field('Tanggal Lahir', 'birth_date', { type: 'date', value: member.birth_date || '' })}
          ${selectField('Jenis Kelamin', 'gender', `<option value="">Pilih jenis kelamin</option>${genders}`, false, member.gender || 'Pilih jenis kelamin')}
          ${field('Nomor Handphone', 'phone', { max: 40, value: member.phone || '' })}
          ${field('Email', 'email', { type: 'email', max: 180, value: member.email || '' })}
          <div class="module-field"><label for="member-address">Alamat</label><textarea id="member-address" name="address" placeholder="Masukkan alamat sesuai KTP">${escapeHtml(member.address || '')}</textarea></div>
          ${field('Provinsi', 'province', { max: 120, value: member.province || '' })}
          ${field('Kabupaten/Kota', 'city', { max: 120, value: member.city || '' })}
          ${field('Kecamatan', 'district', { max: 120, value: member.district || '' })}
          ${field('Kelurahan', 'village', { max: 120, value: member.village || '' })}
          ${field('RT', 'rt', { max: 10, value: member.rt || '' })}
          ${field('RW', 'rw', { max: 10, value: member.rw || '' })}
          <div class="module-field"><label for="member-current-address">Alamat Tempat Tinggal Saat Ini</label><textarea id="member-current-address" name="current_address">${escapeHtml(member.current_address || '')}</textarea></div>
          ${field('Provinsi Tinggal Sekarang', 'current_province', { max: 120, value: member.current_province || '' })}
          ${field('Kabupaten/Kota Tinggal Sekarang', 'current_city', { max: 120, value: member.current_city || '' })}
          ${field('Unit Kerja', 'work_unit', { max: 120, value: member.work_unit || '' })}
          ${field('Fakultas', 'faculty', { max: 120, value: member.faculty || '' })}
          ${field('Jurusan', 'department', { max: 120, value: member.department || '' })}
          ${field('Program Studi', 'study_program', { max: 120, value: member.study_program || '' })}
          ${field('Tanggal Pendaftaran', 'registration_date', { type: 'date', value: member.registration_date || new Date().toISOString().slice(0, 10) })}
          ${field('Masa Berlaku Sampai', 'expiry_date', { type: 'date', value: member.expiry_date || '' })}
          ${selectField('Status Anggota', 'status', statuses)}
          ${field('Biaya Pendaftaran', 'registration_fee', { type: 'number', value: member.registration_fee || '0' })}
        </div>
        <div class="module-form-actions"><button class="module-button is-primary" type="submit">Simpan Anggota</button>
          <button class="module-button is-neutral" type="reset" data-action="reset-member">Kosongkan</button>
          <a class="module-button is-neutral" href="#member-list">Kembali ke Daftar Anggota</a></div>
      </form></div>`)}${panel(editingMemberType ? 'Ubah Jenis Anggota' : 'Kelola Jenis Anggota', `<div class="module-panel-body">
        <form class="module-toolbar" data-form="member-type">
          <div class="module-toolbar-group">${field('Nama Jenis Anggota', 'name', { required: true, max: 80, value: editingMemberType?.name || '' })}
            <button class="module-button is-primary" type="submit">${editingMemberType ? 'Simpan Perubahan' : 'Tambah Jenis Anggota'}</button>
            ${editingMemberType ? '<button class="module-button is-neutral" type="button" data-action="cancel-member-type-edit">Batal</button>' : ''}</div>
        </form>
        ${table(['#', 'Jenis Anggota', 'Aksi'], typeRows, 'Belum ada jenis anggota.')}</div>`)}`;
  }

  function renderMembers() {
    const members = readItems('members');
    const rows = members.map((member, index) => `<tr><td><input type="checkbox" name="basket-members" value="${escapeHtml(member.id)}" aria-label="Pilih ${escapeHtml(member.full_name)}"></td>
      <td>${index + 1}</td><td>${escapeHtml(member.member_number)}</td><td>${escapeHtml(member.full_name)}</td>
      <td>${escapeHtml(member.birth_place || '—')}</td><td>${escapeHtml(member.birth_date || '—')}</td><td>${escapeHtml(member.address || '—')}</td>
      <td>${escapeHtml(member.phone || '—')}</td><td>${escapeHtml(member.study_program || '—')}</td><td>${escapeHtml(member.faculty || '—')}</td>
      <td>${escapeHtml(member.identity_type || '—')}</td><td>${escapeHtml(member.gender || '—')}</td><td>${escapeHtml(member.member_type || '—')}</td>
      <td><span class="module-tag">${escapeHtml(member.status || 'Aktif')}</span></td>
      <td><div class="module-inline-actions"><button class="module-button is-neutral" type="button" data-action="edit-member" data-id="${escapeHtml(member.id)}">Koreksi</button>
      <button class="module-button is-danger" type="button" data-action="delete-member" data-id="${escapeHtml(member.id)}">Hapus</button></div></td></tr>`).join('');
    return `${panel('Daftar Anggota', `<div class="module-toolbar">
      <div class="module-toolbar-group"><input class="module-filter" id="member-search" type="search" placeholder="Cari nomor anggota atau nama" aria-label="Cari anggota">
      <button class="module-button is-neutral" type="button" data-action="refresh">Segarkan Kembali</button></div>
      <div class="module-toolbar-group"><button class="module-button is-primary" type="button" data-action="add-selected-to-basket">Tambahkan pilihan ke keranjang</button>
      <a class="module-button" href="#member-entry">＋ Tambah</a></div></div>
      ${table(['Pilih', '#', 'Member Number', 'Nama Lengkap', 'Tempat Lahir', 'Tanggal Lahir', 'Alamat', 'Nomor Handphone', 'Program Studi', 'Fakultas', 'Jenis Identitas', 'Jenis Kelamin', 'Jenis Anggota', 'Status', 'Aksi'], rows, 'Tidak ada data anggota yang ditemukan.')}`)}`;
  }

  function renderImport() {
    return panel('Import data anggota', `<div class="module-panel-body"><div class="module-toolbar" style="justify-content:flex-start;padding:0 0 16px">
      <span class="module-label">Template:</span><button class="module-button is-neutral" type="button" data-action="download-template">Unduh Template</button></div>
      <form class="module-form" data-form="import"><div class="module-field"><label for="member-file">File CSV</label>
        <input id="member-file" name="file" type="file" accept=".csv,text/csv" required><span class="module-help">Simpan file Excel sebagai CSV UTF-8 sebelum mengunggah.</span></div>
        <div class="module-form-actions"><button class="module-button is-primary" type="submit">Import Data</button></div></form></div>`);
  }

  function renderLedger(key, label, amountLabel, amountName, descriptionLabel, descriptionName) {
    const items = readItems(key);
    const formId = `member-${key}-form`;
    const rows = items.map((item, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(item.member_number)}</td>
      <td>${escapeHtml(item.full_name)}</td><td>${escapeHtml(item[amountName] || '—')}</td><td>${escapeHtml(item[descriptionName] || '—')}</td>
      <td>${escapeHtml(item.date || '—')}</td><td><button class="module-button is-danger" type="button" data-action="delete-ledger" data-key="${key}" data-id="${escapeHtml(item.id)}">Hapus</button></td></tr>`).join('');
    return `${panel(label, `<div class="module-toolbar"><button class="module-button is-primary" type="button" data-action="toggle-form" data-target="${formId}">＋ Tambah</button>
      <button class="module-button is-neutral" type="button" data-action="refresh">Segarkan Kembali</button></div>
      <div class="module-panel-body" id="${formId}" hidden><form class="module-form" data-form="${key}">
        <div class="module-form-grid">${field('Member Number', 'member_number', { required: true, max: 80 })}
          ${field('Nama Lengkap', 'full_name', { required: true, max: 180 })}
          ${field(key === 'donations' ? 'Total Sumbangan' : 'Biaya Perpanjangan', amountName, { type: 'number', required: true })}
          ${field('Tanggal', 'date', { type: 'date', value: new Date().toISOString().slice(0, 10) })}
          ${field(descriptionLabel, descriptionName, { max: 500 })}</div>
        <div class="module-form-actions"><button class="module-button is-primary" type="submit">Simpan</button>
          <button class="module-button is-neutral" type="button" data-action="toggle-form" data-target="${formId}">Batal</button></div></form></div>
      ${table(['#', 'Member Number', 'Nama Lengkap', amountLabel, descriptionLabel, 'Tanggal', 'Aksi'], rows, `Tidak ada data ${label.toLowerCase()}.`)}`)}`;
  }

  function renderBasket() {
    const members = readItems('members');
    const ids = readItems('basket').map(String);
    const selected = members.filter(member => ids.includes(String(member.id)));
    const rows = selected.map((member, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(member.member_number)}</td>
      <td>${escapeHtml(member.full_name)}</td><td>${escapeHtml(member.birth_place || '—')}</td><td>${escapeHtml(member.birth_date || '—')}</td>
      <td>${escapeHtml(member.address || '—')}</td><td>${escapeHtml(member.phone || '—')}</td><td>${escapeHtml(member.identity_type || '—')}</td>
      <td>${escapeHtml(member.gender || '—')}</td><td>${escapeHtml(member.member_type || '—')}</td><td>${escapeHtml(member.status || 'Aktif')}</td>
      <td><button class="module-button is-danger" type="button" data-action="remove-from-basket" data-id="${escapeHtml(member.id)}">Hapus</button></td></tr>`).join('');
    return panel('Daftar Keranjang Anggota', `<div class="module-toolbar"><a class="module-button is-neutral" href="#member-list">Pilih Anggota</a>
      <button class="module-button is-danger" type="button" data-action="clear-basket" ${selected.length ? '' : 'disabled'}>Kosongkan keranjang anggota</button></div>
      ${table(['#', 'Member Number', 'Nama Lengkap', 'Tempat Lahir', 'Tanggal Lahir', 'Alamat', 'Nomor Handphone', 'Jenis Identitas', 'Jenis Kelamin', 'Jenis Anggota', 'Status', 'Aksi'], rows, 'Tidak ada data yang ditemukan.')}`);
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let value = '';
    let quoted = false;
    for (let index = 0; index < text.length; index += 1) {
      const character = text[index];
      if (character === '"' && quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') quoted = !quoted;
      else if (character === ',' && !quoted) {
        row.push(value.trim());
        value = '';
      } else if ((character === '\n' || character === '\r') && !quoted) {
        row.push(value.trim());
        if (row.some(Boolean)) rows.push(row);
        row = [];
        value = '';
        if (character === '\r' && text[index + 1] === '\n') index += 1;
      } else value += character;
    }
    if (quoted) throw new Error('Format CSV tidak valid: tanda kutip tidak berpasangan.');
    row.push(value.trim());
    if (row.some(Boolean)) rows.push(row);
    if (rows.length < 2) throw new Error('File CSV belum berisi data anggota.');
    const headers = rows.shift().map(header => header.replace(/^\uFEFF/, '').toLowerCase());
    return rows.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
  }

  function downloadTemplate() {
    const headers = ['member_number', 'full_name', 'identity_type', 'identity_number', 'member_type', 'gender', 'birth_place', 'birth_date', 'phone', 'email', 'address', 'province', 'city', 'district', 'village', 'rt', 'rw', 'current_address', 'work_unit', 'faculty', 'department', 'study_program', 'registration_date', 'expiry_date', 'status'];
    const blob = new Blob([`${headers.join(',')}\r\n`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template-anggota.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  function render() {
    const routeKey = window.location.hash.slice(1);
    const route = routes[routeKey];
    if (!route) return;
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
    if (routeKey !== 'member-entry') {
      editingMemberId = null;
      editingMemberType = null;
    }
    try {
      let body;
      if (routeKey === 'member-entry') body = memberForm(editingMemberId
        ? readItems('members').find(item => item.id === editingMemberId) || {}
        : {});
      else if (routeKey === 'member-list') body = renderMembers();
      else if (routeKey === 'member-import') body = renderImport();
      else if (routeKey === 'member-donations') body = renderLedger('donations', 'Daftar Sumbangan', 'Total', 'total', 'Keterangan', 'description');
      else if (routeKey === 'member-renewals') body = renderLedger('renewals', 'Daftar Perpanjangan', 'Biaya', 'fee', 'Keterangan', 'note');
      else body = renderBasket();
      content.innerHTML = shell(routeKey, body);
    } catch (error) {
      console.error('Tidak dapat memuat modul Keanggotaan:', error);
      content.innerHTML = `${shell(routeKey, '')}<div class="module-toast is-error" role="alert">${escapeHtml(error.message)}</div>`;
    }
  }

  function saveMember(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    const members = readItems('members');
    const member = {
      ...data,
      id: editingMemberId || `member-${Date.now()}`,
      member_number: data.member_number.trim() || `AGT-${Date.now()}`,
      full_name: data.full_name.trim()
    };
    const duplicate = members.some(item => item.member_number === member.member_number && item.id !== member.id);
    if (duplicate) throw new Error('Member Number sudah digunakan.');
    const next = editingMemberId
      ? members.map(item => item.id === editingMemberId ? member : item)
      : [...members, member];
    if (!saveItems('members', next)) return;
    editingMemberId = null;
    window.location.hash = '#member-list';
    window.setTimeout(() => showMessage('Data anggota berhasil disimpan di browser ini.'), 0);
  }

  content.addEventListener('submit', async event => {
    const form = event.target.closest('form[data-form]');
    if (!form) return;
    event.preventDefault();
    const submit = form.querySelector('[type="submit"]');
    if (submit) submit.disabled = true;
    try {
      if (form.dataset.form === 'member') saveMember(form);
      else if (form.dataset.form === 'member-type') {
        const submittedName = new FormData(form).get('name');
        const name = typeof submittedName === 'string' ? submittedName.trim() : '';
        if (!name) throw new Error('Nama jenis anggota wajib diisi.');
        const types = readMemberTypes();
        if (types.some(type => type.name.toLocaleLowerCase('id') === name.toLocaleLowerCase('id')
          && type.id !== editingMemberType?.id)) {
          throw new Error('Jenis anggota tersebut sudah tersedia.');
        }
        const next = editingMemberType
          ? types.map(type => type.id === editingMemberType.id ? { ...type, name } : type)
          : [...types, { id: `member-type-${Date.now()}`, name }];
        if (saveItems('member-types', next)) {
          editingMemberType = null;
          render();
          showMessage('Jenis anggota berhasil disimpan.');
        }
      }
      else if (form.dataset.form === 'donations' || form.dataset.form === 'renewals') {
        const key = form.dataset.form;
        const data = Object.fromEntries(new FormData(form).entries());
        const list = readItems(key);
        list.push({ ...data, id: `${key}-${Date.now()}`, date: data.date || new Date().toISOString().slice(0, 10) });
        if (saveItems(key, list)) {
          render();
          showMessage('Data berhasil disimpan di browser ini.');
        }
      } else if (form.dataset.form === 'import') {
        const file = form.elements.file.files[0];
        if (!file) throw new Error('Pilih file CSV terlebih dahulu.');
        if (file.size > 2 * 1024 * 1024) throw new Error('Ukuran file tidak boleh melebihi 2 MB.');
        const parsed = parseCsv(await file.text());
        const required = ['member_number', 'full_name'];
        if (required.some(name => !Object.prototype.hasOwnProperty.call(parsed[0], name))) {
          throw new Error('Template harus memiliki kolom member_number dan full_name.');
        }
        const members = readItems('members');
        const knownNumbers = new Set(members.map(item => item.member_number));
          const imported = [];
          for (const item of parsed) {
            if (!item.member_number || !item.full_name || knownNumbers.has(item.member_number)) continue;
            knownNumbers.add(item.member_number);
            imported.push({ ...item, id: `member-${Date.now()}-${Math.random().toString(36).slice(2)}`, status: item.status || 'Aktif' });
          }
        if (!imported.length) throw new Error('Tidak ada baris anggota baru yang valid untuk diimpor.');
        if (saveItems('members', [...members, ...imported])) showMessage(`${imported.length} data anggota diimpor. Baris kosong, tidak valid, atau Member Number duplikat dilewati.`);
      }
    } catch (error) {
      showMessage(error.message || 'Data gagal diproses.', true);
    } finally {
      if (submit && submit.isConnected) submit.disabled = false;
    }
  });

  content.addEventListener('input', event => {
    if (event.target.id !== 'member-search') return;
    const keyword = event.target.value.trim().toLocaleLowerCase('id');
    content.querySelectorAll('.module-table tbody tr').forEach(row => {
      row.hidden = keyword !== '' && !row.textContent.toLocaleLowerCase('id').includes(keyword);
    });
  });

  content.addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const { action, id } = button.dataset;
    try {
      if (action === 'add-selected-to-basket') {
        const selected = [...content.querySelectorAll('[name="basket-members"]:checked')].map(input => input.value);
        if (!selected.length) throw new Error('Pilih minimal satu anggota terlebih dahulu.');
        const basket = readItems('basket').map(String);
        const merged = [...new Set([...basket, ...selected])];
        if (saveItems('basket', merged)) showMessage(`${selected.length} anggota ditambahkan ke keranjang.`);
      } else if (action === 'edit-member') {
        const member = readItems('members').find(item => item.id === id);
        if (!member) throw new Error('Data anggota tidak ditemukan.');
        editingMemberId = member.id;
        window.location.hash = '#member-entry';
      } else if (action === 'delete-member') {
        const members = readItems('members');
        const member = members.find(item => item.id === id);
        if (!member || !window.confirm(`Hapus data anggota ${member.full_name}?`)) return;
        if (saveItems('members', members.filter(item => item.id !== id))) {
          saveItems('basket', readItems('basket').filter(item => String(item) !== String(id)));
          render();
          showMessage('Data anggota berhasil dihapus dari browser ini.');
        }
      } else if (action === 'remove-from-basket') {
        if (saveItems('basket', readItems('basket').filter(item => String(item) !== String(id)))) {
          render();
          showMessage('Anggota dihapus dari keranjang.');
        }
      } else if (action === 'clear-basket') {
        if (!window.confirm('Kosongkan keranjang anggota?')) return;
        if (saveItems('basket', [])) {
          render();
          showMessage('Keranjang anggota berhasil dikosongkan.');
        }
      } else if (action === 'delete-ledger') {
        const items = readItems(button.dataset.key);
        if (!window.confirm('Hapus catatan ini?')) return;
        if (saveItems(button.dataset.key, items.filter(item => item.id !== id))) {
          render();
          showMessage('Catatan berhasil dihapus.');
        }
      } else if (action === 'toggle-form') {
        const target = document.getElementById(button.dataset.target);
        target.hidden = !target.hidden;
      } else if (action === 'download-template') downloadTemplate();
      else if (action === 'refresh') {
        render();
        showMessage('Daftar berhasil dimuat ulang.');
      } else if (action === 'reset-member') editingMemberId = null;
      else if (action === 'edit-member-type') {
        editingMemberType = readMemberTypes().find(type => type.id === id) || null;
        if (!editingMemberType) throw new Error('Jenis anggota tidak ditemukan.');
        render();
      } else if (action === 'delete-member-type') {
        const types = readMemberTypes();
        const type = types.find(item => item.id === id);
        if (!type) throw new Error('Jenis anggota tidak ditemukan.');
        if (readItems('members').some(member => member.member_type === type.name)) {
          throw new Error('Jenis anggota masih digunakan oleh data anggota. Ubah jenis pada anggota terkait terlebih dahulu.');
        }
        if (!window.confirm(`Hapus jenis anggota "${type.name}"?`)) return;
        if (saveItems('member-types', types.filter(item => item.id !== id))) {
          render();
          showMessage('Jenis anggota berhasil dihapus.');
        }
      } else if (action === 'cancel-member-type-edit') {
        editingMemberType = null;
        render();
      }
    } catch (error) {
      showMessage(error.message, true);
    }
  });

  window.addEventListener('hashchange', render);
  sidebar.querySelectorAll('.nav-module-link[href^="#member-"]').forEach(link => {
    link.addEventListener('click', () => {
      let group = link.closest('details');
      while (group && sidebar.contains(group)) {
        group.open = true;
        group = group.parentElement.closest('details');
      }
    });
  });
  render();
})();
