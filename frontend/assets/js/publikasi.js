(function () {
  let currentProgram = 'all';
  let searchTimer;

  function element(tagName, className, text) {
    const node = document.createElement(tagName);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderPublication(publication) {
    const card = element('article', 'pub-card bg-white p-6 rounded-2xl border border-slate-200 hover:border-brand-red hover:shadow-md transition space-y-3');
    card.dataset.prodi = publication.prodi;
    const programLabels = { TRL: 'D-IV TRL', PM: 'D-III PM', SVM: 'D-III SVM' };

    const heading = element('div', 'flex flex-wrap items-center justify-between gap-2');
    const badges = element('div', 'flex items-center gap-2');
    badges.append(
      element('span', 'px-2.5 py-0.5 rounded-md bg-red-100 text-brand-red font-mono text-[10px] font-bold', programLabels[publication.prodi] || publication.prodi),
      element('span', 'px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold', publication.ranking || 'Publikasi'),
      element('span', 'text-xs text-slate-400 font-mono', `Tahun ${publication.publication_year || '-'}`)
    );
    heading.append(badges);
    if (publication.doi) heading.append(element('span', 'text-[11px] font-mono text-slate-400', `DOI: ${publication.doi}`));

    const body = element('div');
    body.append(element('h3', 'text-base sm:text-lg font-bold text-slate-900', publication.title));
    body.append(element('p', 'text-xs text-slate-600 mt-1', `Penulis: ${publication.authors}`));
    if (publication.journal) body.append(element('p', 'text-xs text-slate-500 italic mt-0.5', publication.journal));
    if (publication.volume_info) body.append(element('p', 'text-xs text-slate-500 mt-0.5', publication.volume_info));

    const footer = element('div', 'pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs');
    if (publication.keywords) footer.append(element('span', 'text-[11px] text-slate-500', `Kata Kunci: ${publication.keywords}`));
    const actions = element('div', 'flex items-center gap-2');
    const citationButton = element('button', 'px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition', 'Salin sitasi');
    citationButton.type = 'button';
    citationButton.addEventListener('click', async () => {
      const citation = `${publication.authors} (${publication.publication_year || 't.t.'}). ${publication.title}. ${publication.journal || ''}${publication.doi ? `. https://doi.org/${publication.doi}` : ''}`;
      try {
        await navigator.clipboard.writeText(citation);
        window.showNotification('Sitasi disalin ke clipboard.');
      } catch {
        window.showNotification(citation);
      }
    });
    actions.append(citationButton);

    if (publication.file_url && /^https?:\/\//i.test(publication.file_url)) {
      const download = element('a', 'px-3.5 py-1.5 rounded-lg bg-brand-red text-white font-bold hover:bg-brand-darkred transition shadow-sm', 'Unduh Fulltext');
      download.href = publication.file_url;
      download.target = '_blank';
      download.rel = 'noopener noreferrer';
      actions.append(download);
    }
    footer.append(actions);
    card.append(heading, body, footer);
    return card;
  }

  async function loadPublications() {
    const container = document.getElementById('publication-list-container');
    const count = document.getElementById('pub-count');
    const params = new URLSearchParams({ prodi: currentProgram });
    const keyword = document.getElementById('pub-search-input').value.trim();
    if (keyword) params.set('keyword', keyword);

    try {
      const response = await window.libraryApi.request(`/publikasi?${params}`);
      container.replaceChildren(...response.items.map(renderPublication));
      count.textContent = `${response.total} Publikasi`;
      if (!response.items.length) {
        container.append(element('p', 'p-6 rounded-2xl bg-white border border-slate-200 text-center text-sm text-slate-500', 'Belum ada publikasi yang cocok dengan pencarian ini.'));
      }
    } catch (error) {
      count.textContent = 'Database tidak terhubung';
      container.replaceChildren(element('p', 'p-6 rounded-2xl bg-white border border-slate-200 text-center text-sm text-slate-500', 'Publikasi belum dapat dimuat. Periksa koneksi server dan PostgreSQL.'));
      console.error('Gagal memuat publikasi:', error.message);
    }
  }

  window.filterPublications = function (program) {
    currentProgram = program;
    ['all', 'TRL', 'PM', 'SVM'].forEach(filter => {
      const button = document.getElementById(`filter-btn-${filter}`);
      if (!button) return;
      button.className = filter === program
        ? 'px-3.5 py-2 rounded-xl bg-brand-red text-white shadow-sm transition'
        : 'px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:text-brand-red transition';
    });
    loadPublications();
  };

  window.searchPublications = function () {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(loadPublications, 250);
  };

  document.addEventListener('DOMContentLoaded', loadPublications);
})();