(() => {
  const errorBox = document.getElementById('dashboard-error');
  const sidebar = document.getElementById('admin-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  const shell = document.querySelector('.admin-shell');
  const menuButton = document.getElementById('mobile-menu');
  const refreshButton = document.getElementById('refresh-dashboard');
  const profileMenu = document.getElementById('profile-menu');
  const profileTrigger = document.getElementById('profile-trigger');
  const profileError = document.getElementById('profile-menu-error');
  const mobileViewport = window.matchMedia('(max-width: 900px)');
  const numberFormat = new Intl.NumberFormat('id-ID');
  const requestDateFormat = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'short', timeZone: 'Asia/Makassar'
  });
  let loading = false;

  const currentDate = new Date();
  const dateElement = document.getElementById('today-date');
  dateElement.textContent = new Intl.DateTimeFormat('id-ID', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Makassar'
  }).format(currentDate);
  dateElement.title = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Makassar'
  }).format(currentDate);
  document.getElementById('current-year').textContent = new Date().getFullYear();

  function updateMenuButton(isExpanded) {
    menuButton.setAttribute('aria-expanded', String(isExpanded));
    menuButton.setAttribute('aria-label', isExpanded ? 'Sembunyikan menu' : 'Tampilkan menu');
  }

  function setMobileMenu(open, returnFocus = false) {
    sidebar.classList.toggle('is-open', open);
    backdrop.hidden = !open;
    sidebar.inert = mobileViewport.matches && !open;
    document.body.classList.toggle('is-menu-open', open);
    updateMenuButton(open);
    if (returnFocus) menuButton.focus();
  }

  function closeMenu(returnFocus = false) {
    if (mobileViewport.matches) setMobileMenu(false, returnFocus);
  }

  function closeProfileMenu(returnFocus = false) {
    if (!profileMenu.open) return;
    profileMenu.open = false;
    if (returnFocus) profileTrigger.focus();
  }

  document.addEventListener('pointerdown', event => {
    if (!profileMenu.contains(event.target)) closeProfileMenu();
  });
  document.addEventListener('focusin', event => {
    if (!profileMenu.contains(event.target)) closeProfileMenu();
  });

  sidebar.inert = mobileViewport.matches;
  updateMenuButton(!mobileViewport.matches);
  menuButton.addEventListener('click', () => {
    if (mobileViewport.matches) {
      const open = !sidebar.classList.contains('is-open');
      setMobileMenu(open);
      if (open) sidebar.querySelector('.nav-link[href]').focus();
      return;
    }
    const hidden = shell.classList.toggle('is-nav-hidden');
    updateMenuButton(!hidden);
  });
  backdrop.addEventListener('click', () => closeMenu(true));
  mobileViewport.addEventListener('change', event => {
    setMobileMenu(false);
    shell.classList.remove('is-nav-hidden');
    updateMenuButton(!event.matches);
  });
  sidebar.addEventListener('click', event => {
    if (event.target.closest('a[href]')) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && profileMenu.open) {
      event.preventDefault();
      closeProfileMenu(true);
      return;
    }
    if (!mobileViewport.matches || !sidebar.classList.contains('is-open')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu(true);
    }
    if (event.key !== 'Tab') return;
    const controls = [...sidebar.querySelectorAll('a[href], button, summary')]
      .filter(element => element.getClientRects().length);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  function updateNavigation() {
    const route = window.location.hash || '#beranda';
    const isHome = ['#beranda', '#permohonan'].includes(route);
    document.getElementById('permohonan').hidden = route !== '#permohonan';
    const homeLink = sidebar.querySelector('.nav-link[href="#beranda"]');
    homeLink.classList.toggle('is-active', isHome);
    if (isHome) homeLink.setAttribute('aria-current', 'page');
    else homeLink.removeAttribute('aria-current');
    sidebar.querySelectorAll('.nav-group').forEach(group => group.classList.remove('has-current'));
    sidebar.querySelectorAll('.nav-module-link').forEach(link => {
      const current = link.getAttribute('href') === route;
      link.classList.toggle('is-current', current);
      if (current) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
      if (!current) return;
      let group = link.closest('details');
      while (group && sidebar.contains(group)) {
        group.open = true;
        group.classList.add('has-current');
        group = group.parentElement.closest('details');
      }
    });
  }

  function showError(message) {
    errorBox.classList.remove('is-info');
    errorBox.setAttribute('role', 'alert');
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function setDataStatus(state, label) {
    document.getElementById('dashboard-live-status').dataset.state = state;
    document.getElementById('dashboard-status-label').textContent = label;
  }

  function count(value) {
    return Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
  }

  function emptyState(container, title, description, list = false) {
    const state = document.createElement(list ? 'li' : 'div');
    state.className = 'empty-state';
    const icon = document.createElement('span');
    icon.className = 'empty-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><path d="M4 5h16v14H4zM8 9h8M8 13h5"></path><path d="m9 19 3 3 3-3"></path></svg>';
    const heading = document.createElement('strong');
    heading.textContent = title;
    const copy = document.createElement('p');
    copy.textContent = description;
    state.append(icon, heading, copy);
    container.replaceChildren(state);
  }

  function renderRequests(requests) {
    const container = document.getElementById('recent-requests-list');
    if (!requests.length) {
      emptyState(container, 'Belum ada permohonan', 'Permohonan layanan terbaru dari pemustaka akan tampil di sini.');
      return;
    }
    const statuses = {
      pending: ['Menunggu', ''], in_progress: ['Diproses', 'is-progress'],
      completed: ['Selesai', 'is-complete'], rejected: ['Ditolak', 'is-rejected']
    };
    const items = requests.slice(0, 5).map(request => {
      const item = document.createElement('article');
      item.className = 'request-row';
      const name = String(request.full_name || 'Pemustaka');
      const avatar = document.createElement('span');
      avatar.className = 'request-avatar';
      avatar.setAttribute('aria-hidden', 'true');
      avatar.textContent = name.trim().split(/\s+/).slice(0, 2).map(part => part.slice(0, 1)).join('').toUpperCase();
      const person = document.createElement('div');
      person.className = 'request-person';
      const heading = document.createElement('strong');
      heading.textContent = name;
      heading.title = name;
      const service = document.createElement('span');
      service.textContent = request.service_type;
      person.append(heading, service);
      const meta = document.createElement('div');
      meta.className = 'request-meta';
      const [statusLabel, statusClass] = statuses[request.status] || ['Belum diperbarui', ''];
      const status = document.createElement('span');
      status.className = `request-status ${statusClass}`.trim();
      status.textContent = statusLabel;
      const date = document.createElement('span');
      date.className = 'request-date';
      const createdAt = new Date(request.created_at);
      date.textContent = Number.isNaN(createdAt.getTime()) ? '—' : requestDateFormat.format(createdAt);
      meta.append(status, date);
      item.append(avatar, person, meta);
      return item;
    });
    container.replaceChildren(...items);
  }

  function metricValue(id, value) {
    document.getElementById(id).textContent = value === null || value === undefined
      ? '—' : numberFormat.format(count(value));
  }

  function renderVisits(visits) {
    const available = Boolean(visits?.available);
    const members = available ? count(visits.member_count) : null;
    const guests = available ? count(visits.non_member_count) : null;
    const total = available ? members + guests : null;
    metricValue('visits-total', total);
    metricValue('visits-member-count', members);
    metricValue('visits-non-member-count', guests);
    const ring = document.getElementById('visits-ring');
    document.querySelector('.visits-panel').classList.toggle('is-unavailable', !available);
    ring.classList.toggle('has-data', available && total > 0);
    ring.style.setProperty('--member-share', `${total ? members / total * 100 : 0}%`);
    ring.setAttribute('aria-label', available
      ? `${numberFormat.format(members)} kunjungan anggota dan ${numberFormat.format(guests)} kunjungan nonanggota`
      : 'Data kunjungan belum tersedia');
    document.getElementById('visits-note').textContent = available
      ? (total ? `${numberFormat.format(total)} kunjungan tercatat di perpustakaan.` : 'Belum ada kunjungan yang tercatat.')
      : 'Pencatatan kunjungan belum tersedia.';
  }

  function renderOnsite(reading) {
    const available = Boolean(reading?.available);
    const fields = {
      'reading-title-count': 'title_count', 'reading-copy-count': 'copy_count',
      'reading-member-count': 'member_count', 'reading-non-member-count': 'non_member_count'
    };
    Object.entries(fields).forEach(([id, key]) => metricValue(id, available ? reading[key] : null));
    document.querySelector('.onsite-panel').classList.toggle('is-unavailable', !available);
    document.getElementById('reading-status').textContent = available ? 'Seluruh pencatatan' : 'Belum ada pencatatan';
    document.getElementById('reading-note').textContent = available
      ? 'Seluruh pencatatan penggunaan koleksi di ruang perpustakaan.' : 'Pencatatan baca di tempat belum tersedia.';
  }

  function renderOverview(result) {
    const { summary } = result;
    const fields = {
      'title-count': 'title_count', 'digital-content-count': 'digital_content_count',
      'copy-count': 'copy_count', 'member-count': 'member_count',
      'pending-request-count': 'pending_requests', 'request-nav-count': 'pending_requests'
    };
    Object.entries(fields).forEach(([id, key]) => metricValue(id, summary[key]));
    for (const type of ['borrowed', 'returned']) {
      for (const field of ['title', 'copy', 'member']) {
        metricValue(`${type}-${field}-count`, result.circulation?.[type]?.[`${field}_count`]);
      }
    }
    renderVisits(result.visits);
    renderOnsite(result.onsiteReading);
    document.querySelector('.pending-pill').classList.toggle('is-clear', !count(summary.pending_requests));
    renderRequests(result.recentRequests || []);
    const time = new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar'
    }).format(new Date());
    document.getElementById('overview-updated').textContent = `Total data tercatat · Diperbarui ${time} WITA`;
    setDataStatus('ready', 'Data terkini');
  }

  async function loadDashboard() {
    if (loading) return;
    if (window.location.protocol === 'file:') {
      showError('Buka halaman admin melalui http://localhost:3000/admin/ agar dapat memuat data perpustakaan.');
      setDataStatus('error', 'Data belum tersedia');
      return;
    }
    loading = true;
    refreshButton.disabled = true;
    refreshButton.classList.add('is-loading');
    refreshButton.setAttribute('aria-busy', 'true');
    try {
      const sessionResponse = await fetch('/api/admin/session', { credentials: 'same-origin' });
      if (sessionResponse.status === 401) {
        window.location.replace('/admin/login.html');
        return;
      }
      if (!sessionResponse.ok) throw new Error('Sesi admin tidak dapat diperiksa. Silakan coba lagi.');
      const session = await sessionResponse.json();
      document.getElementById('admin-username').textContent = session.user.username;
      document.querySelector('.profile-avatar').textContent = session.user.username.slice(0, 1).toUpperCase();
      const response = await fetch('/api/admin/overview', { credentials: 'same-origin' });
      if (response.status === 401) {
        window.location.replace('/admin/login.html');
        return;
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Ringkasan perpustakaan gagal dimuat. Silakan coba lagi.');
      renderOverview(result);
      errorBox.hidden = true;
    } catch (error) {
      setDataStatus('error', 'Gagal memperbarui');
      showError(error instanceof TypeError ? 'Tidak dapat terhubung ke server. Coba perbarui data beberapa saat lagi.' : error.message);
    } finally {
      loading = false;
      refreshButton.disabled = false;
      refreshButton.classList.remove('is-loading');
      refreshButton.setAttribute('aria-busy', 'false');
    }
  }

  refreshButton.addEventListener('click', loadDashboard);
  window.addEventListener('hashchange', () => {
    closeProfileMenu();
    updateNavigation();
    if (['', '#beranda', '#permohonan'].includes(window.location.hash)) loadDashboard();
    if (window.location.hash === '#permohonan') {
      requestAnimationFrame(() => document.getElementById('permohonan').scrollIntoView({ block: 'start' }));
    }
  });
  document.getElementById('logout-button').addEventListener('click', async event => {
    const button = event.currentTarget;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    profileError.hidden = true;
    try {
      const response = await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' });
      if (!response.ok) throw new Error('Tidak dapat keluar dari akun. Silakan coba lagi.');
      window.location.replace('/admin/login.html');
    } catch (error) {
      profileError.textContent = error instanceof TypeError ? 'Tidak dapat terhubung ke server untuk keluar. Silakan coba lagi.' : error.message;
      profileError.hidden = false;
      profileMenu.open = true;
      button.disabled = false;
      button.setAttribute('aria-busy', 'false');
    }
  });
  updateNavigation();
  loadDashboard();
})();
