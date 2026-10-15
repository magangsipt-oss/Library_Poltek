(() => {
  const numberFormat = new Intl.NumberFormat('id-ID');
  const dateFormat = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const errorBox = document.getElementById('dashboard-error');
  const sidebar = document.getElementById('admin-sidebar');
  const menuButton = document.getElementById('mobile-menu');
  const scrim = document.getElementById('sidebar-scrim');
  const campusSlides = Array.from(document.querySelectorAll('.dashboard-slide'));
  const campusSlideDots = Array.from(document.querySelectorAll('.dashboard-slide-dot'));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let activeCampusSlide = 0;
  let campusSlideTimer;

  document.getElementById('today-date').textContent = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());
  document.getElementById('current-year').textContent = new Date().getFullYear();

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  }

  function closeMenu() {
    sidebar.classList.remove('is-open');
    scrim.classList.remove('is-visible');
    menuButton.setAttribute('aria-expanded', 'false');
  }

  menuButton.addEventListener('click', () => {
    const isOpen = sidebar.classList.toggle('is-open');
    scrim.classList.toggle('is-visible', isOpen);
    menuButton.setAttribute('aria-expanded', String(isOpen));
  });
  scrim.addEventListener('click', closeMenu);
  sidebar.querySelectorAll('.nav-link[href], .nav-feature-link a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  function showCampusSlide(index) {
    activeCampusSlide = index;
    campusSlides.forEach((slide, slideIndex) => {
      const isActive = slideIndex === activeCampusSlide;
      slide.classList.toggle('is-active', isActive);
      slide.setAttribute('aria-hidden', String(!isActive));
      campusSlideDots[slideIndex].classList.toggle('is-active', isActive);
      campusSlideDots[slideIndex].setAttribute('aria-pressed', String(isActive));
    });
  }

  function startCampusSlideshow() {
    window.clearInterval(campusSlideTimer);
    if (!reducedMotion.matches && campusSlides.length > 1) {
      campusSlideTimer = window.setInterval(() => {
        showCampusSlide((activeCampusSlide + 1) % campusSlides.length);
      }, 6500);
    }
  }

  campusSlideDots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      showCampusSlide(index);
      startCampusSlideshow();
    });
  });
  reducedMotion.addEventListener('change', startCampusSlideshow);
  startCampusSlideshow();

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function renderPopularBooks(books) {
    const container = document.getElementById('popular-books');
    const maximum = Math.max(1, ...books.map(book => Number(book.loan_count) || 0));
    if (!books.length) {
      container.innerHTML = '<p class="empty-state">Belum ada data koleksi untuk ditampilkan.</p>';
      return;
    }

    container.innerHTML = books.map(book => {
      const count = Number(book.loan_count) || 0;
      const percentage = Math.max(count > 0 ? 5 : 0, Math.round(count / maximum * 100));
      return `<div class="popular-item">
        <span class="popular-title" title="${escapeHtml(book.title)}">${escapeHtml(book.title)}</span>
        <span class="popular-count">${numberFormat.format(count)} kali</span>
        <div class="popular-track" aria-label="${numberFormat.format(count)} peminjaman">
          <div class="popular-bar" style="width:${percentage}%"></div>
        </div>
      </div>`;
    }).join('');
  }

  function requestStatus(status) {
    const labels = {
      pending: ['Menunggu', ''],
      in_progress: ['Diproses', 'is-progress'],
      completed: ['Selesai', 'is-complete'],
      rejected: ['Ditolak', 'is-rejected']
    };
    return labels[status] || ['Status tidak dikenal', ''];
  }

  function renderRequests(requests) {
    const container = document.getElementById('recent-requests');
    if (!requests.length) {
      container.innerHTML = '<p class="empty-state">Belum ada permohonan layanan masuk.</p>';
      return;
    }

    container.innerHTML = requests.map(request => {
      const [statusLabel, statusClass] = requestStatus(request.status);
      const date = new Date(request.created_at);
      const formattedDate = Number.isNaN(date.getTime()) ? 'Tanggal tidak tersedia' : dateFormat.format(date);
      return `<div class="request-row">
        <div class="request-person">
          <strong>${escapeHtml(request.full_name)}</strong>
          <span>${escapeHtml(request.service_type)}</span>
        </div>
        <div class="request-meta">
          <span class="request-status ${statusClass}">${statusLabel}</span>
          <time class="request-date">${formattedDate}</time>
        </div>
      </div>`;
    }).join('');
  }

  async function loadDashboard() {
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

    const summary = result.summary;
    document.getElementById('title-count').textContent = numberFormat.format(summary.title_count);
    document.getElementById('copy-count').textContent = numberFormat.format(summary.copy_count);
    document.getElementById('available-count').textContent = numberFormat.format(summary.available_count);
    document.getElementById('publication-count').textContent = numberFormat.format(summary.publication_count);
    document.getElementById('pending-count').textContent = numberFormat.format(summary.pending_requests);
    document.getElementById('request-nav-count').textContent = numberFormat.format(summary.pending_requests);
    renderPopularBooks(result.popularBooks);
    renderRequests(result.recentRequests);
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
      showError('Tidak dapat terhubung ke server. Pastikan backend sedang berjalan.');
      return;
    }
    showError(error.message);
  });
})();
