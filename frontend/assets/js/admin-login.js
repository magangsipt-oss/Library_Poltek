(() => {
  const form = document.getElementById('admin-login-form');
  const notice = document.getElementById('login-notice');
  const password = document.getElementById('password');
  const passwordToggle = document.querySelector('.password-toggle');
  const slides = Array.from(document.querySelectorAll('.campus-slide'));
  const dots = Array.from(document.querySelectorAll('.slide-dot'));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let activeSlide = 0;
  let slideTimer;

  passwordToggle.addEventListener('click', () => {
    const isVisible = password.type === 'text';
    password.type = isVisible ? 'password' : 'text';
    passwordToggle.setAttribute('aria-pressed', String(!isVisible));
    passwordToggle.setAttribute('aria-label', isVisible ? 'Tampilkan kata sandi' : 'Sembunyikan kata sandi');
  });

  function showSlide(index) {
    activeSlide = index;
    slides.forEach((slide, slideIndex) => {
      const isActive = slideIndex === activeSlide;
      slide.classList.toggle('is-active', isActive);
      slide.setAttribute('aria-hidden', String(!isActive));
      dots[slideIndex].classList.toggle('is-active', isActive);
      dots[slideIndex].setAttribute('aria-pressed', String(isActive));
    });
  }

  function startSlideshow() {
    window.clearInterval(slideTimer);
    if (!reducedMotion.matches && slides.length > 1) {
      slideTimer = window.setInterval(() => {
        showSlide((activeSlide + 1) % slides.length);
      }, 6000);
    }
  }

  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      showSlide(index);
      startSlideshow();
    });
  });
  reducedMotion.addEventListener('change', startSlideshow);
  startSlideshow();

  async function checkSession() {
    try {
      const response = await fetch('/api/admin/session', { credentials: 'same-origin' });
      if (response.ok) window.location.replace('/admin/');
    } catch (error) {
      notice.textContent = 'Tidak dapat terhubung ke server. Pastikan backend sedang berjalan.';
      notice.hidden = false;
    }
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    const username = form.elements.username.value;
    const passwordValue = form.elements.password.value;
    submitButton.disabled = true;
    notice.hidden = true;

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: passwordValue })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Login gagal.');
      window.location.replace('/admin/');
    } catch (error) {
      notice.textContent = error instanceof TypeError
        ? 'Tidak dapat terhubung ke server. Pastikan backend sedang berjalan.'
        : error.message;
      notice.hidden = false;
    } finally {
      submitButton.disabled = false;
    }
  });

  checkSession();
})();
