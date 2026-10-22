(() => {
  const errorBox = document.getElementById('dashboard-error');
  const sidebar = document.getElementById('admin-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  const shell = document.querySelector('.admin-shell');
  const menuButton = document.getElementById('mobile-menu');
  const refreshButton = document.getElementById('refresh-dashboard');
  const mobileViewport = window.matchMedia('(max-width: 900px)');
  const numberFormat = new Intl.NumberFormat('id-ID');
  const requestDateFormat = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'short', timeZone: 'Asia/Makassar'
  });
  let loading = false;

  document.getElementById('today-date').textContent = new Intl.DateTimeFormat('id-ID', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Makassar'
  }).format(new Date());
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

  function renderPopularBooks(books) {
    const container = document.getElementById('popular-books-list');
    if (!books.length) {
      emptyState(container, 'Koleksi belum tersedia', 'Tambahkan koleksi untuk mulai melihat ringkasan peminjaman.', true);
      return;
    }
    const maximum = Math.max(...books.map(book => count(book.loan_count)));
    const items = books.slice(0, 5).map((book, index) => {
      const item = document.createElement('li');
      item.className = 'popular-item';
      const rank = document.createElement('span');
      rank.className = 'popular-rank';
      rank.textContent = String(index + 1).padStart(2, '0');
      const title = document.createElement('span');
      title.className = 'popular-title';
      title.textContent = book.title;
      title.title = book.title;
      const loans = count(book.loan_count);
      const total = document.createElement('span');
      total.className = 'popular-count';
      total.textContent = numberFormat.format(loans);
      total.setAttribute('aria-label', `${numberFormat.format(loans)} peminjaman`);
      const track = document.createElement('div');
      track.className = 'popular-track';
      track.setAttribute('aria-hidden', 'true');
      const bar = document.createElement('div');
      bar.className = 'popular-bar';
      bar.style.width = `${maximum ? loans / maximum * 100 : 0}%`;
      track.append(bar);
      item.append(rank, title, total, track);
      return item;
    });
    container.replaceChildren(...items);
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

  function renderOverview(result) {
    const { summary } = result;
    const fields = {
      'title-count': 'title_count', 'copy-count': 'copy_count', 'available-count': 'available_count',
      'publication-count': 'publication_count', 'pending-request-count': 'pending_requests',
      'request-nav-count': 'pending_requests'
    };
    Object.entries(fields).forEach(([id, key]) => {
      document.getElementById(id).textContent = numberFormat.format(count(summary[key]));
    });
    const copies = count(summary.copy_count);
    const available = count(summary.available_count);
    const unavailable = Math.max(0, copies - available);
    const percentage = copies ? Math.min(100, Math.round(available / copies * 100)) : 0;
    const ring = document.getElementById('availability-ring');
    ring.style.setProperty('--availability-value', `${percentage}%`);
    ring.setAttribute('aria-label', `${numberFormat.format(available)} dari ${numberFormat.format(copies)} eksemplar tersedia, ${percentage} persen`);
    document.getElementById('availability-percent').textContent = `${percentage}%`;
    document.getElementById('available-legend').textContent = numberFormat.format(available);
    document.getElementById('unavailable-legend').textContent = numberFormat.format(unavailable);
    document.querySelector('.pending-pill').classList.toggle('is-clear', !count(summary.pending_requests));
    renderPopularBooks(result.popularBooks || []);
    renderRequests(result.recentRequests || []);
    const time = new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar'
    }).format(new Date());
    document.getElementById('overview-updated').textContent = `Terakhir diperbarui pukul ${time} WITA`;
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
      document.getElementById('welcome-admin').textContent = session.user.username;
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
    updateNavigation();
    if (['', '#beranda'].includes(window.location.hash)) loadDashboard();
  });
  document.getElementById('logout-button').addEventListener('click', async event => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      const response = await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' });
      if (!response.ok) throw new Error('Tidak dapat keluar dari akun. Silakan coba lagi.');
      window.location.replace('/admin/login.html');
    } catch (error) {
      showError(error instanceof TypeError ? 'Tidak dapat terhubung ke server untuk keluar. Silakan coba lagi.' : error.message);
      button.disabled = false;
    }
  });
  updateNavigation();
  loadDashboard();
})();
