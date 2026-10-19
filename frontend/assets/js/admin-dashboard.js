(() => {
  const errorBox = document.getElementById('dashboard-error');
  const sidebar = document.getElementById('admin-sidebar');
  const shell = document.querySelector('.admin-shell');
  const menuButton = document.getElementById('mobile-menu');
  const mobileViewport = window.matchMedia('(max-width: 760px)');

  document.getElementById('today-date').textContent = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());
  document.getElementById('current-year').textContent = new Date().getFullYear();

  function updateMenuButton(isExpanded) {
    menuButton.setAttribute('aria-expanded', String(isExpanded));
    menuButton.setAttribute('aria-label', isExpanded ? 'Sembunyikan menu' : 'Tampilkan menu');
  }

  updateMenuButton(!mobileViewport.matches);

  function closeMenu() {
    if (!mobileViewport.matches) return;
    sidebar.classList.remove('is-open');
    updateMenuButton(false);
  }

  menuButton.addEventListener('click', () => {
    if (mobileViewport.matches) {
      const isOpen = sidebar.classList.toggle('is-open');
      updateMenuButton(isOpen);
      return;
    }

    const isHidden = shell.classList.toggle('is-nav-hidden');
    updateMenuButton(!isHidden);
  });
  mobileViewport.addEventListener('change', event => {
    sidebar.classList.remove('is-open');
    shell.classList.remove('is-nav-hidden');
    updateMenuButton(!event.matches);
  });
  sidebar.querySelectorAll('.nav-link[href], .nav-feature-link a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  function showError(message) {
    errorBox.classList.remove('is-info');
    errorBox.setAttribute('role', 'alert');
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function showNotice(message) {
    errorBox.classList.add('is-info');
    errorBox.setAttribute('role', 'status');
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  async function loadDashboard() {
    if (window.location.protocol === 'file:') {
      showNotice('Halaman admin dibuka sebagai file lokal. Untuk login, jalankan backend dan buka http://localhost:3000/admin/.');
      return;
    }

    const sessionResponse = await fetch('/api/admin/session', { credentials: 'same-origin' });
    if (sessionResponse.status === 401) {
      window.location.replace('/admin/login.html');
      return;
    }
    if (!sessionResponse.ok) throw new Error('Sesi admin tidak dapat diperiksa. Coba muat ulang halaman.');
    const session = await sessionResponse.json();
    document.getElementById('admin-username').textContent = session.user.username;
    document.querySelector('.profile-avatar').textContent = session.user.username.slice(0, 1).toUpperCase();

    const response = await fetch('/api/admin/overview', { credentials: 'same-origin' });
    if (response.status === 401) {
      window.location.replace('/admin/login.html');
      return;
    }
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Ringkasan dashboard gagal dimuat.');

    document.getElementById('request-nav-count').textContent = new Intl.NumberFormat('id-ID')
      .format(result.summary.pending_requests);
  }

  document.getElementById('logout-button').addEventListener('click', async event => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      const response = await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'same-origin'
      });
      if (!response.ok) throw new Error('Logout gagal. Coba lagi.');
      window.location.replace('/admin/login.html');
    } catch (error) {
      showError(error instanceof TypeError
        ? 'Tidak dapat terhubung ke server untuk keluar. Silakan coba lagi.'
        : error.message);
      button.disabled = false;
    }
  });

  loadDashboard().catch(error => {
    if (error instanceof TypeError) {
      if (window.location.protocol === 'file:') {
        showError('Halaman admin sedang dibuka sebagai file lokal. Jalankan backend lalu akses melalui http://localhost:3000/admin/.');
        return;
      }
      showError('Tidak dapat terhubung ke server. Pastikan backend sedang berjalan.');
      return;
    }
    showError(error.message);
  });
})();
