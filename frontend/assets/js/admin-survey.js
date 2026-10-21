(() => {
  const module = document.getElementById('admin-module');
  const content = document.getElementById('module-content');
  const dashboard = document.querySelector('.dashboard-content');
  const pageTitle = document.getElementById('page-title');
  const sidebar = document.getElementById('admin-sidebar');
  const storageKey = 'library-admin-survey:surveys';
  const fields = {
    name: 'Nama Survey',
    start_date: 'Tgl. Mulai',
    end_date: 'Tanggal Selesai',
    status: 'Status',
    sequence_number: 'Nomor Urut',
    target: 'Target Survey',
    respondent_count: 'Jumlah Responden'
  };
  let filters = [{ field: '', value: '' }];
  let filterOperator = 'AND';
  let pageSize = 20;
  let currentPage = 1;
  let searchedSurveys = null;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function readSurveys() {
    const raw = localStorage.getItem(storageKey);
    if (raw === null) return [];
    const surveys = JSON.parse(raw);
    if (!Array.isArray(surveys)) throw new Error('Data survey tersimpan tidak valid.');
    return surveys;
  }

  function saveSurveys(surveys) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(surveys));
      return true;
    } catch {
      showMessage('Data tidak dapat disimpan di browser ini. Periksa ruang penyimpanan dan izin situs.', true);
      return false;
    }
  }

  function showMessage(text, isError = false) {
    let notice = content.querySelector('.module-toast');
    if (!notice) {
      notice = document.createElement('div');
      notice.className = 'module-toast';
      content.prepend(notice);
    }
    notice.classList.toggle('is-error', isError);
    notice.setAttribute('role', isError ? 'alert' : 'status');
    notice.textContent = text;
    notice.hidden = false;
  }

  function panel(title, body, toolbar = '') {
    return `<section class="module-panel"><div class="module-panel-heading"><h2>${escapeHtml(title)}</h2>${toolbar}</div>${body}</section>`;
  }

  function table(headers, rows, emptyMessage = 'Tidak ada data yang ditemukan.') {
    return `<div class="module-table-wrap"><table class="module-table"><thead><tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
      <tbody>${rows || `<tr><td class="module-table-empty" colspan="${headers.length}">${escapeHtml(emptyMessage)}</td></tr>`}</tbody></table></div>`;
  }

  function filterMarkup() {
    const criteriaOptions = Object.entries(fields).map(([key, label]) =>
      `<option value="${key}">${escapeHtml(label)}</option>`).join('');
    const rows = filters.map((filter, index) => `<div class="survey-filter-row" data-filter-index="${index}">
      <select class="module-select" data-filter-field aria-label="Kriteria filter">
        <option value="">-Pilih Kriteria-</option>${criteriaOptions.replace(`value="${filter.field}"`, `value="${filter.field}" selected`)}</select>
      <input class="module-filter" data-filter-value aria-label="Nilai filter" value="${escapeHtml(filter.value)}" placeholder="Masukkan nilai">
      ${filters.length > 1 ? `<button class="module-button is-danger" type="button" data-action="remove-filter" data-index="${index}">Hapus</button>` : ''}
    </div>`).join('');
    return `<section class="survey-filter-panel"><div class="survey-filter-heading">
      <div class="module-toolbar-group"><strong>Filter Survey</strong><label class="module-label" for="survey-filter-operator">Dan / Atau</label>
        <select class="module-select" id="survey-filter-operator" data-filter-operator aria-label="Operator filter">
          <option value="AND" ${filterOperator === 'AND' ? 'selected' : ''}>Dan</option>
          <option value="OR" ${filterOperator === 'OR' ? 'selected' : ''}>Atau</option></select></div>
      <button class="module-button is-primary" type="button" data-action="add-filter">＋ Tambah filter</button>
      </div><div class="survey-filter-rows">${rows}</div>
      <div class="module-form-actions"><button class="module-button is-neutral" type="button" data-action="clear-filters">Hapus</button></div></section>
      <div class="module-toolbar survey-search-actions"><span></span><div class="module-toolbar-group">
        <button class="module-button" type="button" data-action="search">Cari</button>
        <button class="module-button is-warning" type="button" data-action="reset">Ulangi</button></div></div>`;
  }

  function renderSurveyForm() {
    return panel('Tambah Survey', `<div class="module-panel-body"><form class="module-form" data-form="survey">
      <div class="module-form-grid">
        <div class="module-field"><label for="survey-name">Nama Survey</label><input id="survey-name" name="name" maxlength="180" required></div>
        <div class="module-field"><label for="survey-start">Tgl. Mulai</label><input id="survey-start" name="start_date" type="date" required></div>
        <div class="module-field"><label for="survey-end">Tanggal Selesai</label><input id="survey-end" name="end_date" type="date" required></div>
        <div class="module-field"><label for="survey-status">Status</label><select id="survey-status" name="status"><option>Aktif</option><option>Draft</option><option>Selesai</option></select></div>
        <div class="module-field"><label for="survey-target">Target Survey</label><input id="survey-target" name="target" type="number" min="1" value="100" required></div>
      </div><div class="module-form-actions"><button class="module-button is-primary" type="submit">Simpan Survey</button>
      <button class="module-button is-neutral" type="button" data-action="survey-toggle-form">Batal</button></div></form></div>`);
  }

  function renderRows(surveys) {
    const start = (currentPage - 1) * pageSize;
    const page = surveys.slice(start, start + pageSize);
    const rows = page.map((survey, index) => `<tr><td><input type="checkbox" aria-label="Pilih ${escapeHtml(survey.name)}"></td>
      <td>${start + index + 1}</td><td>${escapeHtml(survey.name)}</td><td>${escapeHtml(survey.start_date)}</td>
      <td>${escapeHtml(survey.end_date)}</td><td><span class="module-tag">${escapeHtml(survey.status)}</span></td>
      <td>${escapeHtml(survey.sequence_number)}</td><td>${escapeHtml(survey.target)}</td><td>${escapeHtml(survey.respondent_count)}</td></tr>`).join('');
    return `${table(['', '#', 'Nama Survey', 'Tgl. Mulai', 'Tanggal Selesai', 'Status', 'Nomor Urut', 'Target Survey', 'Jumlah Responden'], rows)}
      <div class="module-pagination"><span>Menampilkan ${surveys.length ? start + 1 : 0}-${Math.min(start + pageSize, surveys.length)} dari ${surveys.length} survey.</span>
      <div class="module-toolbar-group"><label for="survey-page-size">Tampilkan:</label><select class="module-select" id="survey-page-size">
      <option value="20" ${pageSize === 20 ? 'selected' : ''}>20 per halaman</option>
      <option value="50" ${pageSize === 50 ? 'selected' : ''}>50 per halaman</option>
      <option value="100" ${pageSize === 100 ? 'selected' : ''}>100 per halaman</option></select>
      <button class="module-button is-warning" type="button" data-action="survey-refresh">Segarkan Kembali</button></div></div>`;
  }

  function applyFilters(surveys) {
    const activeFilters = filters.filter(filter => filter.field && filter.value.trim());
    if (!activeFilters.length) return surveys;
    return surveys.filter(survey => {
      const matches = activeFilters.map(filter =>
        String(survey[filter.field] ?? '').toLocaleLowerCase('id').includes(filter.value.trim().toLocaleLowerCase('id')));
      return filterOperator === 'AND' ? matches.every(Boolean) : matches.some(Boolean);
    });
  }

  function render() {
    const routeKey = window.location.hash.slice(1);
    if (routeKey !== 'survey-data') return;
    dashboard.hidden = true;
    module.hidden = false;
    pageTitle.textContent = 'Survey';
    sidebar.querySelectorAll('.nav-module-link').forEach(link => {
      const selected = link.getAttribute('href') === '#survey-data';
      link.classList.toggle('is-current', selected);
      if (selected) {
        let group = link.closest('details');
        while (group && sidebar.contains(group)) {
          group.open = true;
          group = group.parentElement.closest('details');
        }
      }
    });
    try {
      const surveys = searchedSurveys || readSurveys();
      content.innerHTML = `<div class="module-heading"><div><p class="module-breadcrumb">Dashboard <span>›</span> Survey</p>
        <h1>Survey</h1><p>Kelola daftar survey dan pantau jumlah responden.</p></div></div>
        ${filterMarkup()}<div class="module-form-actions"><button class="module-button is-primary" type="button" data-action="survey-toggle-form">＋ Tambah</button></div>
        <div class="survey-form-container" hidden>${renderSurveyForm()}</div>
        ${panel('Survey', renderRows(surveys))}`;
    } catch (error) {
      console.error('Tidak dapat memuat daftar survey:', error);
      content.innerHTML = `<div class="module-heading"><div><p class="module-breadcrumb">Dashboard <span>›</span> Survey</p><h1>Survey</h1></div></div>
        <div class="module-toast is-error" role="alert">${escapeHtml(error.message)}</div>`;
    }
  }

  function updateFiltersFromPage() {
    content.querySelectorAll('.survey-filter-row').forEach((row, index) => {
      filters[index] = {
        field: row.querySelector('[data-filter-field]').value,
        value: row.querySelector('[data-filter-value]').value
      };
    });
    filterOperator = content.querySelector('[data-filter-operator]').value;
  }

  content.addEventListener('submit', event => {
    const form = event.target.closest('form[data-form="survey"]');
    if (!form) return;
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    if (data.end_date < data.start_date) {
      showMessage('Tanggal selesai tidak boleh sebelum tanggal mulai.', true);
      return;
    }
    const surveys = readSurveys();
    const target = Number(data.target);
    if (!Number.isInteger(target) || target < 1) {
      showMessage('Target survey harus berupa bilangan bulat lebih dari 0.', true);
      return;
    }
    surveys.push({
      ...data,
      id: `survey-${Date.now()}`,
      sequence_number: surveys.length + 1,
      target,
      respondent_count: 0
    });
    if (saveSurveys(surveys)) {
      searchedSurveys = null;
      render();
      showMessage('Survey berhasil disimpan di browser ini.');
    }
  });

  content.addEventListener('change', event => {
    if (event.target.id === 'survey-page-size') {
      pageSize = Number(event.target.value);
      currentPage = 1;
      render();
    }
  });

  content.addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const { action } = button.dataset;
    try {
      if (action === 'add-filter') {
        updateFiltersFromPage();
        filters.push({ field: '', value: '' });
        render();
      } else if (action === 'remove-filter') {
        updateFiltersFromPage();
        filters.splice(Number(button.dataset.index), 1);
        if (!filters.length) filters.push({ field: '', value: '' });
        render();
      } else if (action === 'clear-filters') {
        filters = [{ field: '', value: '' }];
        filterOperator = 'AND';
        searchedSurveys = null;
        render();
      } else if (action === 'search') {
        updateFiltersFromPage();
        searchedSurveys = applyFilters(readSurveys());
        currentPage = 1;
        render();
      } else if (action === 'reset' || action === 'survey-refresh') {
        filters = [{ field: '', value: '' }];
        filterOperator = 'AND';
        searchedSurveys = null;
        currentPage = 1;
        render();
        if (action === 'survey-refresh') showMessage('Daftar survey berhasil dimuat ulang.');
      } else if (action === 'survey-toggle-form') {
        const container = content.querySelector('.survey-form-container');
        container.hidden = !container.hidden;
      }
    } catch (error) {
      showMessage(error.message, true);
    }
  });

  function showMessage(text, isError = false) {
    let box = content.querySelector('.module-toast');
    if (!box) {
      box = document.createElement('div');
      box.className = 'module-toast';
      content.prepend(box);
    }
    box.classList.toggle('is-error', isError);
    box.setAttribute('role', isError ? 'alert' : 'status');
    box.textContent = text;
    box.hidden = false;
  }

  window.addEventListener('hashchange', render);
  sidebar.querySelectorAll('.nav-module-link[href="#survey-data"]').forEach(link => {
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
