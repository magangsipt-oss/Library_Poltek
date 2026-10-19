(() => {
  const module = document.getElementById('admin-module');
  const content = document.getElementById('module-content');
  const dashboard = document.querySelector('.dashboard-content');
  const pageTitle = document.getElementById('page-title');
  const sidebar = document.getElementById('admin-sidebar');
  const menuButton = document.getElementById('mobile-menu');
  const moduleYear = document.getElementById('module-year');
  const storagePrefix = 'library-admin-demo:';
  const samplePurposes = [
    { id: 'membaca', code: 'MEMBACA', name: 'Kunjungan Biasa/Membaca', member: true, nonMember: true, group: true },
    { id: 'penelitian', code: 'PENELITIAN', name: 'Penelitian', member: true, nonMember: true, group: true },
    { id: 'study-tour', code: 'STUDYTOUR', name: 'Study Tour', member: true, nonMember: true, group: true },
    { id: 'refreshing', code: 'REFRESHING', name: 'Refreshing', member: true, nonMember: true, group: true },
    { id: 'tugas-kuliah', code: 'TUGASKULIAH', name: 'Tugas Kuliah', member: true, nonMember: true, group: true },
    { id: 'literatur', code: 'LITERATUR', name: 'Pencarian Literatur', member: true, nonMember: true, group: true }
  ];
  const routes = {
    'pengaturan-audio': { title: 'Pengaturan Audio Buku Tamu', section: 'Pengaturan Audio' },
    'tujuan-kunjungan': { title: 'Tujuan Kunjungan', section: 'Pengaturan Buku Tamu' },
    'setting-buku-tamu': { title: 'Pengaturan Setting Buku Tamu', section: 'Pengaturan Buku Tamu' },
    'sms-belum-jatuh-tempo': { title: 'SMS Belum Jatuh Tempo', section: 'Pengaturan SMS Gateway' },
    'sms-jatuh-tempo': { title: 'SMS Jatuh Tempo', section: 'Pengaturan SMS Gateway' },
    'sms-manual': { title: 'Kirim SMS', section: 'Pengaturan SMS Gateway' },
    'riwayat-sms': { title: 'Riwayat Pengiriman SMS', section: 'Pengaturan SMS Gateway' }
  };
  const sampleMembers = [
    { number: '2401001', name: 'Andi Saputra', phone: '081234567801' },
    { number: '2401002', name: 'Siti Rahma', phone: '081234567802' },
    { number: '2401003', name: 'Budi Santoso', phone: '081234567803' }
  ];
  let editingPurposeId = null;
  let audioPreviewUrl = null;

  moduleYear.textContent = new Date().getFullYear();

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  }

  function readSetting(key, fallback) {
    const value = localStorage.getItem(`${storagePrefix}${key}`);
    return value === null ? fallback : JSON.parse(value);
  }

  function saveSetting(key, value) {
    try {
      localStorage.setItem(`${storagePrefix}${key}`, JSON.stringify(value));
      return true;
    } catch {
      showToast('Pengaturan tidak dapat disimpan di browser ini. Periksa ruang penyimpanan dan izin situs.', true);
      return false;
    }
  }

  function showToast(message, isError = false) {
    let toast = module.querySelector('.module-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'module-toast';
      toast.setAttribute('role', isError ? 'alert' : 'status');
      content.prepend(toast);
    }
    toast.classList.toggle('is-error', isError);
    toast.setAttribute('role', isError ? 'alert' : 'status');
    toast.textContent = message;
    toast.hidden = false;
  }

  function panel(title, body, headingTools = '') {
    return `<section class="module-panel">
      <div class="module-panel-heading"><h2>${escapeHtml(title)}</h2>${headingTools}</div>
      ${body}
    </section>`;
  }

  function pageShell(route, body) {
    return `<div class="module-heading">
      <div><p class="module-breadcrumb">Administrasi <span>›</span> ${escapeHtml(route.section)} <span>›</span> ${escapeHtml(route.title)}</p>
      <h1>${escapeHtml(route.title)}</h1><p>Kelola pengaturan layanan perpustakaan.</p></div>
      <span class="module-badge">Mode prototipe</span>
    </div>
    <div class="module-notice">Perubahan pada halaman ini masih berupa prototipe dan disimpan di browser ini saja. Data belum masuk ke database, dan pengaturan SMS tidak mengirim pesan.</div>
    ${body}`;
  }

  function renderGuestbookSettings() {
    const enabled = readSetting('guestbook-enabled', true);
    return panel('Pengaturan Buku Tamu', `<div class="module-panel-body">
      <form class="module-form" data-form="guestbook-settings">
        <label class="module-switch-row">
          <input type="checkbox" name="enabled" ${enabled ? 'checked' : ''}>
          <span class="module-switch-copy"><strong>Kunjungan Ulang Buku Tamu</strong><span>Izinkan pengunjung yang sama mencatat kunjungan kembali.</span></span>
        </label>
        <div class="module-form-actions"><button class="module-button" type="submit">Simpan Pengaturan</button></div>
      </form>
    </div>`);
  }

  function getPurposes() {
    return readSetting('visit-purposes', samplePurposes);
  }

  function purposeModal(purpose = null) {
    const item = purpose || { code: '', name: '', member: false, nonMember: false, group: false };
    return `<div class="module-modal" id="purpose-modal" role="dialog" aria-modal="true" aria-labelledby="purpose-modal-title">
      <div class="module-modal-card"><h2 id="purpose-modal-title">${purpose ? 'Koreksi Tujuan Kunjungan' : 'Tambah Tujuan Kunjungan'}</h2>
        <form class="module-form" data-form="purpose">
          <input type="hidden" name="id" value="${escapeHtml(item.id || '')}">
          <div class="module-field"><label for="purpose-code">Kode</label><input id="purpose-code" name="code" maxlength="40" required value="${escapeHtml(item.code)}" placeholder="Masukkan kode"></div>
          <div class="module-field"><label for="purpose-name">Tujuan Kunjungan</label><input id="purpose-name" name="name" maxlength="100" required value="${escapeHtml(item.name)}" placeholder="Masukkan tujuan kunjungan"></div>
          <div class="module-switch-row"><input id="purpose-member" type="checkbox" name="member" ${item.member ? 'checked' : ''}><label class="module-label" for="purpose-member">Aktifkan untuk anggota</label></div>
          <div class="module-switch-row"><input id="purpose-non-member" type="checkbox" name="nonMember" ${item.nonMember ? 'checked' : ''}><label class="module-label" for="purpose-non-member">Aktifkan untuk non anggota</label></div>
          <div class="module-switch-row"><input id="purpose-group" type="checkbox" name="group" ${item.group ? 'checked' : ''}><label class="module-label" for="purpose-group">Aktifkan untuk rombongan</label></div>
          <div class="module-form-actions"><button class="module-button is-primary" type="submit">Simpan</button><button class="module-button is-neutral" type="button" data-action="close-purpose">Kembali</button></div>
        </form>
      </div>
    </div>`;
  }

  function renderPurposeRows() {
    const purposes = getPurposes();
    if (!purposes.length) return '<tr><td class="module-table-empty" colspan="6">Belum ada tujuan kunjungan. Gunakan tombol Tambah untuk membuat data.</td></tr>';
    return purposes.map((item, index) => `<tr>
      <td>${index + 1}</td><td>${escapeHtml(item.code)}</td><td>${escapeHtml(item.name)}</td>
      <td>${item.member ? '✓' : '—'}</td><td>${item.nonMember ? '✓' : '—'}</td><td>${item.group ? '✓' : '—'}</td>
      <td><div class="module-inline-actions"><button class="module-button" type="button" data-action="edit-purpose" data-id="${escapeHtml(item.id)}">Koreksi</button><button class="module-button is-danger" type="button" data-action="delete-purpose" data-id="${escapeHtml(item.id)}">Hapus</button></div></td>
    </tr>`).join('');
  }

  function renderPurposes() {
    return `${panel('Tujuan Kunjungan', `<div class="module-toolbar"><button class="module-button is-primary" type="button" data-action="add-purpose">＋ Tambah Tujuan</button><span class="module-tag">${getPurposes().length} jenis kunjungan</span></div>
      <div class="module-table-wrap"><table class="module-table"><thead><tr><th>#</th><th>Kode</th><th>Tujuan Kunjungan</th><th>Keanggotaan</th><th>Non Member</th><th>Rombongan</th><th>Aksi</th></tr></thead><tbody id="purpose-rows">${renderPurposeRows()}</tbody></table></div>
      <div class="module-toolbar"><button class="module-button is-neutral" type="button" data-action="refresh-purposes">↻ Segarkan Kembali</button></div>`)}
      <div id="purpose-modal-container">${editingPurposeId === 'new' ? purposeModal() : editingPurposeId ? purposeModal(getPurposes().find(item => item.id === editingPurposeId)) : ''}</div>`;
  }

  function renderAudioSettings() {
    const savedAudio = readSetting('guestbook-audio-name', '');
    return panel('Pengaturan Audio Buku Tamu', `<div class="module-panel-body">
      <p class="module-help">Audio digunakan sebagai suara pendamping pada layanan buku tamu. Pilih berkas audio untuk melihat pratinjau di perangkat ini.</p>
      <div class="module-upload">
        <label class="module-label" for="guestbook-audio">Berkas audio</label>
        <input id="guestbook-audio" type="file" accept="audio/*">
        <span class="module-help" id="audio-name">${savedAudio ? `Berkas terakhir dipilih: ${escapeHtml(savedAudio)} (file tidak tersimpan di server).` : 'Belum ada berkas audio dipilih.'}</span>
        <audio class="module-audio-preview" id="audio-preview" controls hidden></audio>
      </div>
      <div class="module-form-actions"><button class="module-button is-primary" type="button" data-action="save-audio">Simpan Pilihan</button><button class="module-button is-danger" type="button" data-action="remove-audio">Hapus Pilihan</button></div>
    </div>`);
  }

  function smsDefaults(overdue) {
    return {
      enabled: true,
      days: overdue ? 3 : 1,
      time: '11:30',
      message: overdue
        ? 'Yth. Anggota {nomor_anggota}, pinjaman koleksi {judul_koleksi} telah jatuh tempo pada {tanggal_jatuh_tempo}. Harap segera mengembalikan koleksi.'
        : 'Yth. Anggota {nomor_anggota}, pinjaman koleksi {judul_koleksi} akan jatuh tempo pada {tanggal_jatuh_tempo}. Harap mengembalikan koleksi tepat waktu.'
    };
  }

  function renderSmsTemplate(overdue) {
    const key = overdue ? 'sms-overdue' : 'sms-upcoming';
    const config = readSetting(key, smsDefaults(overdue));
    const title = overdue ? 'Pengaturan SMS Jatuh Tempo' : 'Pengaturan SMS Belum Jatuh Tempo';
    return panel(title, `<div class="module-panel-body">
      <form class="module-form" data-form="sms-template" data-key="${key}">
        <label class="module-switch-row"><input type="checkbox" name="enabled" ${config.enabled ? 'checked' : ''}><span class="module-switch-copy"><strong>Aktifkan Pengiriman SMS</strong><span>Pengiriman otomatis belum terhubung; pengaturan ini hanya prototipe.</span></span></label>
        <div class="module-form-grid">
          <div class="module-field"><label for="sms-days">Jeda Hari</label><input id="sms-days" name="days" type="number" min="1" max="365" required value="${escapeHtml(config.days)}"><span class="module-help">Jarak hari sebelum atau sesudah tanggal jatuh tempo.</span></div>
          <div class="module-field"><label for="sms-time">Waktu Pengiriman SMS</label><input id="sms-time" name="time" type="time" required value="${escapeHtml(config.time)}"></div>
        </div>
        <div class="module-field"><label for="sms-message">Contoh Isi Pesan</label><textarea id="sms-message" name="message" maxlength="500" required>${escapeHtml(config.message)}</textarea><span class="module-help">Token yang dapat dipakai: {nama}, {nomor_anggota}, {judul_koleksi}, {tanggal_jatuh_tempo}.</span></div>
        <div class="module-form-actions"><button class="module-button" type="submit">Simpan Pengaturan</button></div>
      </form>
    </div>`);
  }

  function renderManualSms() {
    return panel('Kirim SMS', `<div class="module-panel-body">
      <form class="module-form" data-form="manual-sms">
        <div class="module-form-grid">
          <div class="module-field"><label for="manual-name">Fullname</label><input id="manual-name" name="name" maxlength="100" placeholder="Nama lengkap penerima"></div>
          <div class="module-field"><label for="manual-phone">No Tujuan</label><input id="manual-phone" name="phone" type="tel" maxlength="20" required placeholder="Contoh: 081234567890"></div>
        </div>
        <div class="module-field"><label for="manual-message">Pesan</label><textarea id="manual-message" name="message" maxlength="500" required placeholder="Tulis pesan SMS"></textarea><span class="module-help"><span id="sms-character-count">0</span>/500 karakter</span></div>
        <div class="module-recipient-preview" id="selected-member" hidden></div>
        <div class="module-field"><label for="sample-member">Pilih Anggota (contoh)</label><select id="sample-member" class="module-select"><option value="">Pilih anggota contoh</option>${sampleMembers.map((member, index) => `<option value="${index}">${escapeHtml(member.name)} · ${escapeHtml(member.number)}</option>`).join('')}</select></div>
        <div class="module-form-actions"><button class="module-button is-primary" type="submit">Kirim SMS</button><button class="module-button is-danger" type="button" data-action="send-all-preview">Kirim SMS Semua Anggota</button><button class="module-button" type="button" data-action="select-member">＋ Pilih Anggota</button><button class="module-button is-warning" type="reset">Batal</button></div>
      </form>
    </div>`);
  }

  function renderSmsHistory() {
    const headers = ['Receiver ID', 'Phone Number', 'Text', 'Create By', 'Create Date', 'Create Terminal', 'Update By', 'Update Date', 'Update Terminal'];
    return panel('Riwayat Pengiriman SMS', `<div class="module-toolbar">
      <div class="module-toolbar-group"><label class="module-label" for="sms-history-size">Tampilkan:</label><select id="sms-history-size" class="module-select"><option>10</option><option selected>20</option><option>50</option><option>100</option><option>200</option></select><button class="module-button is-neutral" type="button" data-action="show-all-history">↗ Semua</button><button class="module-button is-neutral" type="button" data-action="export-history">⇩ Ekspor CSV</button></div>
    </div>
    <div class="module-table-wrap"><table class="module-table"><thead><tr>${headers.map(header => `<th>${header}</th>`).join('')}</tr>
      <tr>${headers.map((header, index) => `<th><input class="module-filter" type="search" aria-label="Filter ${header}" data-history-filter="${index}" placeholder="Cari"></th>`).join('')}</tr></thead>
      <tbody><tr><td class="module-table-empty" colspan="9">Tidak ada data yang ditemukan.</td></tr></tbody></table></div>
      <div class="module-toolbar"><button class="module-button" type="button" data-action="refresh-history">↻ Segarkan Kembali</button></div>`);
  }

  function render() {
    const routeKey = window.location.hash.slice(1);
    if (routeKey.startsWith('acq-') || routeKey.startsWith('cat-')) return;
    const route = routes[routeKey];
    const isDashboard = !route;
    dashboard.hidden = !isDashboard;
    module.hidden = isDashboard;
    pageTitle.textContent = route ? route.title : 'Beranda';
    sidebar.querySelectorAll('.nav-module-link').forEach(link => {
      const isCurrent = route && link.getAttribute('href') === `#${routeKey}`;
      link.classList.toggle('is-current', Boolean(isCurrent));
      if (!isCurrent) return;
      let group = link.closest('details');
      while (group && sidebar.contains(group)) {
        group.open = true;
        group = group.parentElement.closest('details');
      }
    });
    if (isDashboard) return;

    try {
      let body;
      switch (routeKey) {
        case 'pengaturan-audio': body = renderAudioSettings(); break;
        case 'tujuan-kunjungan': body = renderPurposes(); break;
        case 'setting-buku-tamu': body = renderGuestbookSettings(); break;
        case 'sms-belum-jatuh-tempo': body = renderSmsTemplate(false); break;
        case 'sms-jatuh-tempo': body = renderSmsTemplate(true); break;
        case 'sms-manual': body = renderManualSms(); break;
        case 'riwayat-sms': body = renderSmsHistory(); break;
        default: body = '';
      }
      content.innerHTML = pageShell(route, body);
      if (routeKey === 'pengaturan-audio' && audioPreviewUrl) {
        const preview = document.getElementById('audio-preview');
        preview.src = audioPreviewUrl;
        preview.hidden = false;
      }
    } catch (error) {
      console.error('Tidak dapat memuat halaman pengaturan:', error);
      content.innerHTML = `<div class="module-toast is-error" role="alert">Data pengaturan gagal dibaca. ${escapeHtml(error.message)}</div>`;
    }
  }

  function closeMobileMenu() {
    if (!window.matchMedia('(max-width: 760px)').matches) return;
    sidebar.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Tampilkan menu');
  }

  sidebar.querySelectorAll('.nav-module-link').forEach(link => {
    link.addEventListener('click', () => {
      let group = link.closest('details');
      while (group && sidebar.contains(group)) {
        group.open = true;
        group = group.parentElement.closest('details');
      }
      closeMobileMenu();
    });
  });

  function savePurpose(form) {
    const purposes = getPurposes();
    const id = form.elements.id.value || `visit-${Date.now()}`;
    const item = {
      id,
      code: form.elements.code.value.trim().toUpperCase(),
      name: form.elements.name.value.trim(),
      member: form.elements.member.checked,
      nonMember: form.elements.nonMember.checked,
      group: form.elements.group.checked
    };
    const existingIndex = purposes.findIndex(purpose => purpose.id === id);
    if (existingIndex === -1) purposes.push(item);
    else purposes[existingIndex] = item;
    if (saveSetting('visit-purposes', purposes)) {
      editingPurposeId = null;
      render();
      showToast('Tujuan kunjungan berhasil disimpan di browser ini.');
    }
  }

  content.addEventListener('submit', event => {
    const form = event.target.closest('form[data-form]');
    if (!form) return;
    event.preventDefault();

    if (form.dataset.form === 'guestbook-settings') {
      if (saveSetting('guestbook-enabled', form.elements.enabled.checked)) showToast('Pengaturan Buku Tamu disimpan di browser ini.');
    } else if (form.dataset.form === 'sms-template') {
      const config = {
        enabled: form.elements.enabled.checked,
        days: Number(form.elements.days.value),
        time: form.elements.time.value,
        message: form.elements.message.value.trim()
      };
      if (!Number.isInteger(config.days) || config.days < 1 || config.days > 365) {
        showToast('Jeda hari harus berupa bilangan antara 1 sampai 365.', true);
        return;
      }
      if (saveSetting(form.dataset.key, config)) showToast('Template SMS disimpan di browser ini. SMS tidak dikirim otomatis.');
    } else if (form.dataset.form === 'purpose') {
      savePurpose(form);
    } else if (form.dataset.form === 'manual-sms') {
      showToast('Pratinjau SMS siap. Pengiriman aktual belum aktif, jadi tidak ada pesan yang dikirim.');
    }
  });

  content.addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;

    if (action === 'add-purpose') {
      editingPurposeId = 'new';
      document.getElementById('purpose-modal-container').innerHTML = purposeModal();
      document.getElementById('purpose-code').focus();
    } else if (action === 'edit-purpose') {
      editingPurposeId = button.dataset.id;
      const purpose = getPurposes().find(item => item.id === editingPurposeId);
      if (!purpose) {
        showToast('Tujuan kunjungan tidak ditemukan.', true);
        return;
      }
      document.getElementById('purpose-modal-container').innerHTML = purposeModal(purpose);
      document.getElementById('purpose-code').focus();
    } else if (action === 'close-purpose') {
      editingPurposeId = null;
      document.getElementById('purpose-modal-container').innerHTML = '';
    } else if (action === 'delete-purpose') {
      const purpose = getPurposes().find(item => item.id === button.dataset.id);
      if (!purpose || !window.confirm(`Hapus tujuan kunjungan "${purpose.name}" dari prototipe ini?`)) return;
      if (saveSetting('visit-purposes', getPurposes().filter(item => item.id !== purpose.id))) {
        render();
        showToast('Tujuan kunjungan dihapus dari browser ini.');
      }
    } else if (action === 'refresh-purposes') {
      render();
      showToast('Daftar tujuan kunjungan dimuat ulang.');
    } else if (action === 'save-audio') {
      const file = document.getElementById('guestbook-audio').files[0];
      if (!file) {
        showToast('Pilih berkas audio terlebih dahulu untuk melihat pratinjau.', true);
        return;
      }
      if (saveSetting('guestbook-audio-name', file.name)) showToast('Pilihan audio dicatat. Berkas hanya dapat diputar selama sesi browser ini.');
    } else if (action === 'remove-audio') {
      const input = document.getElementById('guestbook-audio');
      input.value = '';
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
      audioPreviewUrl = null;
      document.getElementById('audio-preview').hidden = true;
      document.getElementById('audio-name').textContent = 'Belum ada berkas audio dipilih.';
      try {
        localStorage.removeItem(`${storagePrefix}guestbook-audio-name`);
      } catch {
        showToast('Pilihan audio tidak dapat dihapus dari penyimpanan browser.', true);
        return;
      }
      showToast('Pilihan audio dihapus dari prototipe ini.');
    } else if (action === 'select-member') {
      const select = document.getElementById('sample-member');
      const member = sampleMembers[Number(select.value)];
      if (!member) {
        showToast('Pilih salah satu anggota contoh terlebih dahulu.', true);
        return;
      }
      document.getElementById('manual-name').value = member.name;
      document.getElementById('manual-phone').value = member.phone;
      document.getElementById('selected-member').hidden = false;
      document.getElementById('selected-member').textContent = `Anggota contoh dipilih: ${member.name} (${member.number})`;
    } else if (action === 'send-all-preview') {
      showToast('Mode prototipe: pesan massal tidak dikirim. Fitur ini perlu backend SMS Gateway dan persetujuan sebelum diaktifkan.');
    } else if (action === 'refresh-history') {
      content.querySelectorAll('[data-history-filter]').forEach(input => { input.value = ''; });
      showToast('Riwayat prototipe dimuat ulang. Belum ada data SMS.');
    } else if (action === 'show-all-history') {
      content.querySelector('#sms-history-size').value = '200';
    } else if (action === 'export-history') {
      const headers = ['Receiver ID', 'Phone Number', 'Text', 'Create By', 'Create Date', 'Create Terminal', 'Update By', 'Update Date', 'Update Terminal'];
      const csv = `${headers.map(value => `"${value}"`).join(',')}\r\n`;
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'riwayat-sms.csv';
      link.click();
      URL.revokeObjectURL(url);
    }
  });

  content.addEventListener('change', event => {
    if (event.target.id === 'guestbook-audio') {
      const file = event.target.files[0];
      if (!file) return;
      if (!file.type.startsWith('audio/')) {
        showToast('Pilih berkas audio yang didukung browser.', true);
        event.target.value = '';
        return;
      }
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
      audioPreviewUrl = URL.createObjectURL(file);
      const preview = document.getElementById('audio-preview');
      preview.src = audioPreviewUrl;
      preview.hidden = false;
      document.getElementById('audio-name').textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`;
    }
  });

  content.addEventListener('input', event => {
    if (event.target.id === 'manual-message') {
      document.getElementById('sms-character-count').textContent = event.target.value.length;
    }
  });

  window.addEventListener('hashchange', render);
  render();
})();
