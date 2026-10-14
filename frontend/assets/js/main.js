(function () {
  const services = {
    'layanan-sirkulasi': 'Layanan Sirkulasi',
    'layanan-kelas-literasi': 'Kelas Literasi',
    'layanan-tata-bahasa': 'Layanan Tata Bahasa',
    'layanan-cek-similarity': 'Cek Similarity',
    'layanan-bebas-pustaka': 'Bebas Pustaka',
    'layanan-repository': 'Repository',
    'usul-buku': 'Usul Buku',
    'layanan-fotocopy': 'Layanan Fotocopy',
    'layanan-bimbingan-pemustaka': 'Bimbingan Pemustaka'
  };

  function makeRequestDialog() {
    const overlay = document.createElement('div');
    overlay.id = 'service-request-modal';
    overlay.className = 'fixed inset-0 z-[60] hidden items-center justify-center bg-slate-950/60 p-4';
    overlay.innerHTML = `
      <div class="w-full max-w-lg rounded-2xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="service-request-title">
        <div class="flex items-center justify-between border-b border-slate-200 p-5">
          <div>
            <h2 id="service-request-title" class="text-lg font-black text-slate-900">Ajukan Layanan</h2>
            <p class="mt-1 text-xs text-slate-500">Permohonan akan dicatat di sistem perpustakaan.</p>
          </div>
          <button type="button" data-close-request class="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Tutup">&times;</button>
        </div>
        <form id="service-request-form" class="space-y-4 p-5">
          <label class="block text-xs font-bold text-slate-700">Jenis layanan
            <input id="service-request-type" name="service_type" readonly required class="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm">
          </label>
          <label class="block text-xs font-bold text-slate-700">Nama lengkap
            <input name="full_name" autocomplete="name" maxlength="150" required class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-600 focus:outline-none">
          </label>
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="block text-xs font-bold text-slate-700">Email
              <input name="email" type="email" autocomplete="email" maxlength="255" required class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-600 focus:outline-none">
            </label>
            <label class="block text-xs font-bold text-slate-700">Nomor HP
              <input name="phone" type="tel" autocomplete="tel" maxlength="40" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-600 focus:outline-none">
            </label>
          </div>
          <label class="block text-xs font-bold text-slate-700">Keterangan permohonan
            <textarea name="message" rows="4" maxlength="5000" required class="mt-1 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-600 focus:outline-none"></textarea>
          </label>
          <p id="service-request-error" class="hidden text-sm text-red-700" role="alert"></p>
          <div class="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" data-close-request class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Batal</button>
            <button type="submit" class="rounded-lg bg-brand-red px-4 py-2 text-sm font-bold text-white hover:bg-brand-darkred">Kirim permohonan</button>
          </div>
        </form>
      </div>`;
    document.body.append(overlay);
    overlay.addEventListener('click', event => {
      if (event.target === overlay || event.target.closest('[data-close-request]')) closeRequestDialog();
    });
    overlay.querySelector('#service-request-form').addEventListener('submit', submitRequest);
    return overlay;
  }

  let requestDialog;

  function openRequestDialog(serviceName) {
    requestDialog ||= makeRequestDialog();
    requestDialog.querySelector('#service-request-type').value = serviceName;
    requestDialog.querySelector('#service-request-error').classList.add('hidden');
    requestDialog.querySelector('input[name="full_name"]').focus();
    requestDialog.classList.remove('hidden');
    requestDialog.classList.add('flex');
  }

  function closeRequestDialog() {
    if (!requestDialog) return;
    requestDialog.classList.add('hidden');
    requestDialog.classList.remove('flex');
  }

  async function submitRequest(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');
    const errorMessage = form.querySelector('#service-request-error');
    const values = Object.fromEntries(new FormData(form).entries());
    submitButton.disabled = true;
    submitButton.textContent = 'Mengirim...';
    errorMessage.classList.add('hidden');

    try {
      const response = await window.libraryApi.request('/layanan', {
        method: 'POST',
        body: JSON.stringify(values)
      });
      form.reset();
      closeRequestDialog();
      window.showNotification(response.message || 'Permohonan berhasil dikirim.');
    } catch (error) {
      errorMessage.textContent = error.message;
      errorMessage.classList.remove('hidden');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Kirim permohonan';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    Object.entries(services).forEach(([id, serviceName]) => {
      const card = document.getElementById(id);
      if (card) card.onclick = () => openRequestDialog(serviceName);
    });
  });
})();