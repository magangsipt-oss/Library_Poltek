(function () {
  const materialLabels = {
    buku: 'Buku',
    ta: 'Tugas Akhir',
    jurnal: 'Jurnal',
    modul: 'Modul'
  };

  function makeElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function showEmptyState(container, message) {
    container.replaceChildren(makeElement(
      'div',
      'p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500',
      message
    ));
  }

  function renderBookCard(book) {
    const card = makeElement(
      'article',
      'p-4 rounded-2xl bg-slate-50 hover:bg-white border border-slate-200 hover:border-brand-red transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs'
    );
    const details = makeElement('div');
    const metadata = makeElement('div', 'flex items-center gap-2 mb-1');
    metadata.append(
      makeElement('span', 'px-2 py-0.5 rounded bg-red-100 text-brand-red font-mono text-[10px] font-bold uppercase', materialLabels[book.material_type] || book.material_type),
      makeElement('span', 'font-mono text-slate-400 text-[11px]', book.call_number || 'Nomor panggil belum tersedia')
    );
    details.append(metadata);
    details.append(makeElement('h3', 'font-bold text-slate-900 text-sm', book.title));
    details.append(makeElement(
      'p',
      'text-slate-600 mt-0.5',
      `${book.author || 'Penulis belum dicatat'}${book.publication_year ? ` • Tahun ${book.publication_year}` : ''}`
    ));
    details.append(makeElement(
      'p',
      'text-[11px] text-slate-500 mt-0.5',
      `Lokasi: ${book.shelf_location || 'Belum ditentukan'}`
    ));

    const actions = makeElement('div', 'shrink-0 text-left sm:text-right flex sm:flex-col items-center sm:items-end justify-between gap-2');
    const availability = book.available_copies > 0
      ? `Tersedia (${book.available_copies} eks)`
      : 'Tidak tersedia';
    actions.append(makeElement(
      'span',
      `inline-flex items-center gap-1 font-bold text-[11px] ${book.available_copies > 0 ? 'text-emerald-600' : 'text-amber-700'}`,
      availability
    ));

    const copyButton = makeElement('button', 'px-3 py-1.5 bg-brand-red text-white font-bold rounded-lg hover:bg-brand-darkred transition shadow-sm', 'Salin No. Panggil');
    copyButton.type = 'button';
    copyButton.disabled = !book.call_number;
    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(book.call_number);
        window.showNotification(`Nomor panggil ${book.call_number} disalin.`);
      } catch {
        window.showNotification(`Nomor panggil: ${book.call_number}`);
      }
    });
    actions.append(copyButton);
    card.append(details, actions);
    return card;
  }

  async function loadFeaturedBooks() {
    const popularContainer = document.getElementById('opac-popular-list');
    const latestContainer = document.getElementById('opac-latest-list');
    const totalElement = document.getElementById('opac-total-count');

    try {
      const [popular, latest, total] = await Promise.all([
        window.libraryApi.request('/opac/popular?limit=3'),
        window.libraryApi.request('/opac/latest?limit=3'),
        window.libraryApi.request('/opac?limit=1')
      ]);
      popularContainer.replaceChildren(...popular.items.map(renderBookCard));
      latestContainer.replaceChildren(...latest.items.map(renderBookCard));
      totalElement.textContent = new Intl.NumberFormat('id-ID').format(total.total);
      if (!popular.items.length) showEmptyState(popularContainer, 'Belum ada koleksi buku di database.');
      if (!latest.items.length) showEmptyState(latestContainer, 'Belum ada koleksi terbaru di database.');
    } catch (error) {
      showEmptyState(popularContainer, 'Katalog belum dapat dimuat. Periksa koneksi PostgreSQL.');
      showEmptyState(latestContainer, 'Katalog belum dapat dimuat. Periksa koneksi PostgreSQL.');
      totalElement.textContent = '0';
      console.error('Gagal memuat katalog OPAC:', error.message);
    }
  }

  window.handleOpacSearch = async function (event) {
    event.preventDefault();
    const keyword = document.getElementById('opac-keyword').value.trim();
    const field = document.getElementById('opac-field').value;
    const material = document.getElementById('opac-material').value;
    const results = document.getElementById('opac-search-results');
    const count = document.getElementById('opac-results-count');
    const container = document.getElementById('opac-results-container');

    results.classList.remove('hidden');
    count.textContent = 'Sedang mencari...';
    container.replaceChildren();

    try {
      const params = new URLSearchParams({ keyword, field, material });
      const response = await window.libraryApi.request(`/opac?${params}`);
      count.textContent = `Hasil Pencarian (${response.total} judul ditemukan):`;
      if (response.items.length) {
        container.replaceChildren(...response.items.map(renderBookCard));
      } else {
        showEmptyState(container, 'Tidak ditemukan koleksi yang cocok. Coba kata kunci atau jenis bahan lain.');
      }
    } catch (error) {
      count.textContent = 'Pencarian tidak berhasil';
      showEmptyState(container, 'Katalog belum dapat diakses. Pastikan server dan koneksi PostgreSQL berjalan.');
      console.error('Pencarian OPAC gagal:', error.message);
    }
  };

  window.resetOpacSearch = function () {
    document.getElementById('opac-keyword').value = '';
    document.getElementById('opac-field').value = 'judul';
    document.getElementById('opac-material').value = 'all';
    document.getElementById('opac-search-results').classList.add('hidden');
  };

  document.addEventListener('DOMContentLoaded', loadFeaturedBooks);
})();