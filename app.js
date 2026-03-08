/**
 * KALLA RENTPHONE — assets/js/app.js
 * @description UI Controller — semua data via PHP API (XAMPP)
 * @version 2.0.0
 */
const API = (function () {
  'use strict';

  const BASE = 'api'; 

  /**
   * Generic fetch wrapper
   * @param {string} url
   * @param {object} options fetch options
   * @returns {Promise<object>}
   */
  async function request(url, options = {}) {
    try {
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        ...options,
      });
      const json = await res.json();
      return json;
    } catch (e) {
      return { success: false, message: 'Koneksi ke server gagal. Pastikan XAMPP berjalan.' };
    }
  }

  // Auth 
  const Auth = {
    login:  (username, password) => request(`${BASE}/auth.php?action=login`, { method: 'POST', body: JSON.stringify({ username, password }) }),
    logout: ()                   => request(`${BASE}/auth.php?action=logout`, { method: 'POST' }),
    check:  ()                   => request(`${BASE}/auth.php?action=check`),
  };

  //  Dashboard 
  const Dashboard = {
    get: () => request(`${BASE}/dashboard.php`),
  };

  //  Phones 
  const Phones = {
    getAll:       ()       => request(`${BASE}/phones.php`),
    getAvailable: ()       => request(`${BASE}/phones.php?status=Tersedia`),
    getOne:       (id)     => request(`${BASE}/phones.php?id=${id}`),
    create:       (data)   => request(`${BASE}/phones.php`,       { method: 'POST',   body: JSON.stringify(data) }),
    update:       (id, data) => request(`${BASE}/phones.php?id=${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove:       (id)     => request(`${BASE}/phones.php?id=${id}`,   { method: 'DELETE' }),
  };

  //  Customers 
  const Customers = {
    getAll:  (q = '') => request(`${BASE}/customers.php${q ? '?q=' + encodeURIComponent(q) : ''}`),
    getOne:  (id)     => request(`${BASE}/customers.php?id=${id}`),
    create:  (data)   => request(`${BASE}/customers.php`,           { method: 'POST',   body: JSON.stringify(data) }),
    update:  (id, data) => request(`${BASE}/customers.php?id=${id}`, { method: 'PUT',  body: JSON.stringify(data) }),
    remove:  (id)     => request(`${BASE}/customers.php?id=${id}`,  { method: 'DELETE' }),
  };

  //  Transactions 
  const Transactions = {
    getAll:    (status = '') => request(`${BASE}/transactions.php${status ? '?status=' + status : ''}`),
    getOne:    (id)          => request(`${BASE}/transactions.php?id=${id}`),
    create:    (data)        => request(`${BASE}/transactions.php`,                           { method: 'POST',   body: JSON.stringify(data) }),
    returnHP:  (id)          => request(`${BASE}/transactions.php?id=${id}&action=return`,    { method: 'PUT',    body: '{}' }),
    remove:    (id)          => request(`${BASE}/transactions.php?id=${id}`,                  { method: 'DELETE' }),
  };

  return { Auth, Dashboard, Phones, Customers, Transactions };
})();

/* PACKAGE: UI Controller */
const UI = (function () {
  'use strict';

  //  State 
  let currentReturnTxId = null;

  //  Helpers 
  const formatRp = (n) => 'Rp ' + Number(n).toLocaleString('id-ID');
  const formatDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  function showToast(msg, type = 'success') {
    const el = document.getElementById('toast');
    el.className = 'toast ' + type;
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.add('hidden'), 3200);
  }

  function badgeHtml(status) {
    const map = {
      'Tersedia': 'status-tersedia', 'Disewa': 'status-disewa',
      'Perawatan': 'status-perawatan', 'Aktif': 'status-disewa', 'Selesai': 'status-tersedia',
    };
    return `<span class="status-badge ${map[status] || ''}">${status}</span>`;
  }

  function setLoading(sectionId, msg = 'Memuat data...') {
    const el = document.getElementById(sectionId);
    if (el) el.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:32px;color:var(--on-dark-3)">${msg}</td></tr>`;
  }

  //  Clock 
  function startClock() {
    const el = document.getElementById('live-clock');
    const tick = () => el.textContent = new Date().toLocaleTimeString('id-ID');
    tick();
    setInterval(tick, 1000);
  }

  // Navigation 
  function showSection(name) {
    document.querySelectorAll('.section').forEach(s => { s.classList.add('hidden'); s.classList.remove('active'); });
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const sec = document.getElementById('section-' + name);
    if (sec) { sec.classList.remove('hidden'); sec.classList.add('active'); }

    const nav = document.querySelector(`[data-section="${name}"]`);
    if (nav) nav.classList.add('active');

    const titles = { dashboard: 'Dashboard', phones: 'Daftar HP', 'add-phone': 'Kelola HP', rent: 'Sewa HP', transactions: 'Riwayat Transaksi', customers: 'Data Pelanggan', 'add-customer': 'Kelola Pelanggan' };
    document.getElementById('topbar-title').textContent = titles[name] || name;

    if (name === 'dashboard')    renderDashboard();
    if (name === 'phones')       renderPhones();
    if (name === 'rent')         { renderRentPhoneOptions(); populateRentCustomerOptions(); resetRentForm(); }
    if (name === 'transactions') renderTransactions();
    if (name === 'customers')    renderCustomers();
  }

  // Auth 
  async function doLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const errEl    = document.getElementById('login-error');
    errEl.classList.add('hidden');

    if (!username || !password) {
      errEl.textContent = 'Username dan password wajib diisi!';
      errEl.classList.remove('hidden');
      return;
    }

    const btn = document.querySelector('#page-login .btn-primary');
    btn.textContent = 'Memuat...';
    btn.disabled = true;

    const res = await API.Auth.login(username, password);

    btn.textContent = 'Masuk';
    btn.disabled = false;

    if (res.success) {
      document.getElementById('page-login').classList.replace('active', 'hidden');
      const app = document.getElementById('page-app');
      app.classList.remove('hidden');
      app.style.display = 'flex';
      document.getElementById('sidebar-username').textContent = res.user.fullName;
      document.getElementById('sidebar-avatar').textContent   = res.user.fullName[0].toUpperCase();
      startClock();
      showSection('dashboard');
    } else {
      errEl.textContent = res.message;
      errEl.classList.remove('hidden');
    }
  }

  async function doLogout() {
    await API.Auth.logout();
    document.getElementById('page-app').classList.add('hidden');
    document.getElementById('page-app').style.display = 'none';
    document.getElementById('page-login').classList.remove('hidden');
    document.getElementById('page-login').classList.add('active');
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
  }

  //  Dashboard 
  async function renderDashboard() {
    const res = await API.Dashboard.get();
    if (!res.success) { showToast(res.message, 'error'); return; }

    const s = res.stats;
    document.getElementById('stat-total-hp').textContent  = s.total_phones;
    document.getElementById('stat-available').textContent = s.available_phones;
    document.getElementById('stat-rented').textContent    = s.rented_phones;
    document.getElementById('stat-revenue').textContent   = formatRp(s.total_revenue);

    // Recent
    const rcEl = document.getElementById('recent-transactions');
    if (!res.recent.length) {
      rcEl.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>Belum ada transaksi</p></div>';
    } else {
      rcEl.innerHTML = res.recent.map(t => `
        <div class="recent-tx-item">
          <div>
            <div class="tx-customer">${t.customer_name}</div>
            <div class="tx-phone">${t.phone_name}</div>
          </div>
          <div style="text-align:right">
            <div style="font-weight:700;color:var(--amber);font-size:13px">${formatRp(t.total_cost)}</div>
            ${badgeHtml(t.status)}
          </div>
        </div>`).join('');
    }

    // Stock
    const stEl = document.getElementById('stock-summary');
    if (!res.stock.length) {
      stEl.innerHTML = '<div class="empty-state"><div class="empty-icon">📦</div><p>Belum ada HP</p></div>';
    } else {
      stEl.innerHTML = res.stock.map(s => `
        <div class="stock-item">
          <span style="font-weight:600">${s.brand}</span>
          <span style="color:var(--on-dark-3)">${s.available}/${s.total} tersedia</span>
        </div>`).join('');
    }
  }

  //  Phones 
  async function renderPhones() {
    const q     = (document.getElementById('search-phone').value || '').toLowerCase();
    const grid  = document.getElementById('phones-grid');
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--on-dark-3)">Memuat...</div>`;

    const res = await API.Phones.getAll();
    if (!res.success) { showToast(res.message, 'error'); return; }

    const phones = res.data.filter(p => !q || (p.brand + ' ' + p.model + ' ' + p.color).toLowerCase().includes(q));

    if (!phones.length) {
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📱</div><p>Tidak ada HP ditemukan</p></div>';
      return;
    }

    grid.innerHTML = phones.map(p => `
      <div class="phone-card glass-card">
        <div class="phone-card-header">
          <div class="phone-icon">📱</div>
          ${badgeHtml(p.status)}
        </div>
        <div class="phone-brand">${p.brand}</div>
        <div class="phone-model">${p.model}</div>
        <div class="phone-detail">🎨 ${p.color} &nbsp;|&nbsp; 💾 ${p.storage}GB</div>
        <div class="phone-detail">⭐ Kondisi: ${p.condition}</div>
        ${p.imei ? `<div class="phone-detail" style="font-size:11px;color:var(--on-dark-3)">IMEI: ${p.imei}</div>` : ''}
        <div class="phone-price">${formatRp(p.price_day)}<span>/hari</span></div>
        <div class="phone-actions">
          <button class="btn-edit"   onclick="editPhone(${p.id})">✏️ Edit</button>
          <button class="btn-delete" onclick="deletePhone(${p.id})">🗑️ Hapus</button>
        </div>
      </div>`).join('');
  }

  async function editPhone(id) {
    const res = await API.Phones.getOne(id);
    if (!res.success) { showToast(res.message, 'error'); return; }
    const p = res.data;
    document.getElementById('edit-phone-id').value    = p.id;
    document.getElementById('phone-brand').value      = p.brand;
    document.getElementById('phone-model').value      = p.model;
    document.getElementById('phone-color').value      = p.color;
    document.getElementById('phone-storage').value    = p.storage;
    document.getElementById('phone-condition').value  = p.condition;
    document.getElementById('phone-price').value      = p.price_day;
    document.getElementById('phone-imei').value       = p.imei || '';
    document.getElementById('phone-status').value     = p.status;
    document.getElementById('phone-notes').value      = p.notes || '';
    document.getElementById('form-phone-title').textContent = 'Edit HP';
    showSection('add-phone');
  }

  async function deletePhone(id) {
    if (!confirm('Yakin hapus HP ini?')) return;
    const res = await API.Phones.remove(id);
    showToast(res.message, res.success ? 'success' : 'error');
    if (res.success) renderPhones();
  }

  function cancelPhoneForm() { resetPhoneForm(); showSection('phones'); }

  function resetPhoneForm() {
    ['edit-phone-id','phone-brand','phone-model','phone-color','phone-storage','phone-imei','phone-notes','phone-price']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    document.getElementById('phone-condition').value = 'Baru';
    document.getElementById('phone-status').value    = 'Tersedia';
    document.getElementById('form-phone-title').textContent = 'Tambah HP Baru';
    document.getElementById('form-phone-error').classList.add('hidden');
  }

  async function savePhone() {
    const id  = document.getElementById('edit-phone-id').value;
    const errEl = document.getElementById('form-phone-error');
    errEl.classList.add('hidden');

    const data = {
      brand:     document.getElementById('phone-brand').value.trim(),
      model:     document.getElementById('phone-model').value.trim(),
      color:     document.getElementById('phone-color').value.trim(),
      storage:   parseInt(document.getElementById('phone-storage').value) || 0,
      condition: document.getElementById('phone-condition').value,
      price_day: parseInt(document.getElementById('phone-price').value) || 0,
      imei:      document.getElementById('phone-imei').value.trim() || null,
      status:    document.getElementById('phone-status').value,
      notes:     document.getElementById('phone-notes').value.trim(),
    };

    const res = id ? await API.Phones.update(id, data) : await API.Phones.create(data);
    if (res.success) {
      showToast(res.message, 'success');
      resetPhoneForm();
      showSection('phones');
    } else {
      errEl.textContent = res.message;
      errEl.classList.remove('hidden');
    }
  }

  //   Rent  
  async function renderRentPhoneOptions() {
    const sel = document.getElementById('rent-phone-select');
    sel.innerHTML = '<option value="">Memuat...</option>';
    const res = await API.Phones.getAvailable();
    if (!res.success) { sel.innerHTML = '<option value="">Gagal memuat HP</option>'; return; }
    sel.innerHTML = res.data.length
      ? '<option value="">-- Pilih HP --</option>' + res.data.map(p => `<option value="${p.id}" data-price="${p.price_day}">${p.brand} ${p.model} (${formatRp(p.price_day)}/hari)</option>`).join('')
      : '<option value="">Tidak ada HP tersedia</option>';
  }

  async function populateRentCustomerOptions() {
    const sel = document.getElementById('rent-customer-select');
    if (!sel) return;
    sel.innerHTML = '<option value="">Memuat...</option>';
    const res = await API.Customers.getAll();
    if (!res.success) { sel.innerHTML = '<option value="">-- Ketik manual --</option>'; return; }
    sel.innerHTML = '<option value="">-- Pilih dari daftar / ketik manual --</option>'
      + res.data.map(c => `<option value="${c.id}" data-name="${c.name}" data-nik="${c.nik}" data-phone="${c.phone}">${c.name} — ${c.nik}</option>`).join('');
  }

  function fillRentFromCustomer() {
    const sel = document.getElementById('rent-customer-select');
    const opt = sel.options[sel.selectedIndex];
    if (!opt || !opt.value) return;
    document.getElementById('rent-customer-id').value   = opt.value;
    document.getElementById('rent-customer').value      = opt.getAttribute('data-name') || '';
    document.getElementById('rent-nik').value           = opt.getAttribute('data-nik')  || '';
    document.getElementById('rent-phone-customer').value = opt.getAttribute('data-phone') || '';
  }

  function calcRentCost() {
    const sel   = document.getElementById('rent-phone-select');
    const start = document.getElementById('rent-start').value;
    const end   = document.getElementById('rent-end').value;
    const sumEl = document.getElementById('rent-summary');
    if (!sel.value || !start || !end) { sumEl.style.display = 'none'; return; }
    const s = new Date(start), e = new Date(end);
    if (e <= s) { sumEl.style.display = 'none'; return; }
    const days = Math.ceil((e - s) / 86400000);
    const price = parseInt(sel.options[sel.selectedIndex].getAttribute('data-price')) || 0;
    document.getElementById('sum-duration').textContent  = days + ' hari';
    document.getElementById('sum-price-day').textContent = formatRp(price);
    document.getElementById('sum-total').textContent     = formatRp(days * price);
    sumEl.style.display = 'block';
  }

  function resetRentForm() {
    ['rent-customer-id','rent-customer','rent-nik','rent-phone-customer','rent-start','rent-end']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const sel = document.getElementById('rent-customer-select');
    if (sel) sel.value = '';
    document.getElementById('rent-phone-select').value = '';
    document.getElementById('rent-summary').style.display = 'none';
    document.getElementById('form-rent-error').classList.add('hidden');
  }

  async function saveRent() {
    const errEl      = document.getElementById('form-rent-error');
    errEl.classList.add('hidden');

    // Cari atau register customer baru
    let customerId = parseInt(document.getElementById('rent-customer-id').value) || 0;

    if (!customerId) {
      // Belum dipilih dari dropdown → coba cari berdasarkan NIK, atau buat baru
      const nik  = document.getElementById('rent-nik').value.trim();
      const name = document.getElementById('rent-customer').value.trim();
      const phone = document.getElementById('rent-phone-customer').value.trim();

      if (!name || !nik || !phone) {
        errEl.textContent = 'Nama, NIK, dan No. HP pelanggan wajib diisi!';
        errEl.classList.remove('hidden');
        return;
      }

      // Cek apakah sudah ada
      const found = await API.Customers.getAll(nik);
      const existing = found.success && found.data.find(c => c.nik === nik);

      if (existing) {
        customerId = existing.id;
      } else {
        // Buat pelanggan baru otomatis
        const created = await API.Customers.create({ name, nik, phone });
        if (!created.success) {
          errEl.textContent = 'Gagal mendaftarkan pelanggan: ' + created.message;
          errEl.classList.remove('hidden');
          return;
        }
        customerId = created.id;
      }
    }

    const data = {
      customer_id: customerId,
      phone_id:    parseInt(document.getElementById('rent-phone-select').value) || 0,
      start_date:  document.getElementById('rent-start').value,
      end_date:    document.getElementById('rent-end').value,
    };

    const res = await API.Transactions.create(data);
    if (res.success) {
      showToast(res.message, 'success');
      resetRentForm();
      showSection('transactions');
    } else {
      errEl.textContent = res.message;
      errEl.classList.remove('hidden');
    }
  }

  //   Transactions                      
  async function renderTransactions() {
    const status = document.getElementById('filter-status-tx').value;
    setLoading('tx-tbody');
    const res = await API.Transactions.getAll(status);
    const tbody = document.getElementById('tx-tbody');
    if (!res.success) { tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--red)">${res.message}</td></tr>`; return; }
    if (!res.data.length) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--on-dark-3)">Belum ada transaksi</td></tr>`;
      return;
    }
    tbody.innerHTML = res.data.map(t => `
      <tr>
        <td>${t.tx_code}</td>
        <td>
          <div style="font-weight:600;color:var(--on-dark)">${t.customer_name}</div>
          <div style="font-size:11px;color:var(--on-dark-3)">${t.customer_nik}</div>
        </td>
        <td>${t.phone_name}</td>
        <td>${formatDate(t.start_date)}</td>
        <td>${formatDate(t.end_date)}</td>
        <td style="font-weight:700;color:var(--amber)">${formatRp(t.total_cost)}</td>
        <td>${badgeHtml(t.status)}</td>
        <td>
          ${t.status === 'Aktif'
            ? `<button class="btn-return" onclick="openReturnModal(${t.id},'${t.customer_name}','${t.phone_name}')">Kembalikan</button>`
            : '<span style="font-size:12px;color:var(--on-dark-3)">Selesai</span>'}
        </td>
      </tr>`).join('');
  }

  function openReturnModal(id, customer, phone) {
    currentReturnTxId = id;
    document.getElementById('modal-return-text').textContent = `Konfirmasi pengembalian HP "${phone}" dari "${customer}"?`;
    document.getElementById('modal-return').classList.remove('hidden');
  }

  function closeModal() {
    document.getElementById('modal-return').classList.add('hidden');
    currentReturnTxId = null;
  }

  async function confirmReturn() {
    if (!currentReturnTxId) return;
    const res = await API.Transactions.returnHP(currentReturnTxId);
    closeModal();
    showToast(res.message, res.success ? 'success' : 'error');
    if (res.success) { renderTransactions(); renderDashboard(); }
  }

  //   Customers                       ─
  async function renderCustomers() {
    const q     = document.getElementById('search-customer').value || '';
    const tbody = document.getElementById('customers-tbody');
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--on-dark-3)">Memuat...</td></tr>`;

    const res = await API.Customers.getAll(q);
    if (!res.success) { showToast(res.message, 'error'); return; }

    if (!res.data.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--on-dark-3)">Belum ada pelanggan</td></tr>`;
      return;
    }

    tbody.innerHTML = res.data.map(c => `
      <tr>
        <td>
          <div style="font-weight:700;color:var(--on-dark)">${c.name}</div>
          <div style="font-size:11px;color:var(--on-dark-3);margin-top:2px">${c.address || '—'}</div>
        </td>
        <td style="font-size:12px">${c.nik}</td>
        <td>${c.phone}</td>
        <td style="color:var(--on-dark-3)">${c.notes || '—'}</td>
        <td>
          <span style="font-weight:600;color:var(--on-dark)">${c.tx_count}</span>
        </td>
        <td style="font-weight:700;color:var(--amber)">${formatRp(c.tx_total)}</td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn-edit"   onclick="editCustomer(${c.id})">Edit</button>
            <button class="btn-delete" onclick="deleteCustomer(${c.id})">Hapus</button>
          </div>
        </td>
      </tr>`).join('');
  }

  async function editCustomer(id) {
    const res = await API.Customers.getOne(id);
    if (!res.success) { showToast(res.message, 'error'); return; }
    const c = res.data;
    document.getElementById('edit-customer-id').value   = c.id;
    document.getElementById('customer-name').value      = c.name;
    document.getElementById('customer-nik').value       = c.nik;
    document.getElementById('customer-phone').value     = c.phone;
    document.getElementById('customer-address').value   = c.address || '';
    document.getElementById('customer-dob').value       = c.dob    || '';
    document.getElementById('customer-notes').value     = c.notes  || '';
    document.getElementById('form-customer-title').textContent = 'Edit Pelanggan';
    document.getElementById('form-customer-error').classList.add('hidden');
    showSection('add-customer');
  }

  async function deleteCustomer(id) {
    if (!confirm('Yakin hapus pelanggan ini?')) return;
    const res = await API.Customers.remove(id);
    showToast(res.message, res.success ? 'success' : 'error');
    if (res.success) renderCustomers();
  }

  function resetCustomerForm() {
    ['edit-customer-id','customer-name','customer-nik','customer-phone','customer-address','customer-dob','customer-notes']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    document.getElementById('form-customer-title').textContent = 'Tambah Pelanggan';
    document.getElementById('form-customer-error').classList.add('hidden');
  }

  function cancelCustomerForm() { resetCustomerForm(); showSection('customers'); }

  async function saveCustomer() {
    const id    = document.getElementById('edit-customer-id').value;
    const errEl = document.getElementById('form-customer-error');
    errEl.classList.add('hidden');

    const data = {
      name:    document.getElementById('customer-name').value.trim(),
      nik:     document.getElementById('customer-nik').value.trim(),
      phone:   document.getElementById('customer-phone').value.trim(),
      address: document.getElementById('customer-address').value.trim(),
      dob:     document.getElementById('customer-dob').value || null,
      notes:   document.getElementById('customer-notes').value.trim(),
    };

    const res = id ? await API.Customers.update(id, data) : await API.Customers.create(data);
    if (res.success) {
      showToast(res.message, 'success');
      resetCustomerForm();
      showSection('customers');
    } else {
      errEl.textContent = res.message;
      errEl.classList.remove('hidden');
    }
  }

  //   Init  
  async function init() {
    document.getElementById('login-password').addEventListener('keydown', e => {
      if (e.key === 'Enter') doLogin();
    });

    // Cek session yang masih aktif
    const res = await API.Auth.check();
    if (res.success) {
      document.getElementById('page-login').classList.replace('active', 'hidden');
      const app = document.getElementById('page-app');
      app.classList.remove('hidden');
      app.style.display = 'flex';
      document.getElementById('sidebar-username').textContent = res.user.fullName;
      document.getElementById('sidebar-avatar').textContent   = res.user.fullName[0].toUpperCase();
      startClock();
      showSection('dashboard');
    }
  }

  //   Public                         
  return {
    init, showSection,
    doLogin, doLogout,
    renderPhones, editPhone, deletePhone, cancelPhoneForm, savePhone,
    renderRentPhoneOptions, populateRentCustomerOptions, fillRentFromCustomer,
    calcRentCost, resetRentForm, saveRent,
    renderTransactions, openReturnModal, closeModal, confirmReturn,
    renderCustomers, editCustomer, deleteCustomer,
    resetCustomerForm, cancelCustomerForm, saveCustomer,
  };
})();

/*   Global bindings (onclick di HTML)           ─ */
const doLogin              = () => UI.doLogin();
const doLogout             = () => UI.doLogout();
const showSection          = (n) => UI.showSection(n);
const renderPhones         = () => UI.renderPhones();
const editPhone            = (id) => UI.editPhone(id);
const deletePhone          = (id) => UI.deletePhone(id);
const cancelPhoneForm      = () => UI.cancelPhoneForm();
const savePhone            = () => UI.savePhone();
const calcRentCost         = () => UI.calcRentCost();
const fillRentFromCustomer = () => UI.fillRentFromCustomer();
const resetRentForm        = () => UI.resetRentForm();
const saveRent             = () => UI.saveRent();
const renderTransactions   = () => UI.renderTransactions();
const openReturnModal      = (id, c, p) => UI.openReturnModal(id, c, p);
const closeModal           = () => UI.closeModal();
const confirmReturn        = () => UI.confirmReturn();
const renderCustomers      = () => UI.renderCustomers();
const editCustomer         = (id) => UI.editCustomer(id);
const deleteCustomer       = (id) => UI.deleteCustomer(id);
const cancelCustomerForm   = () => UI.cancelCustomerForm();
const saveCustomer         = () => UI.saveCustomer();
const resetCustomerForm    = () => UI.resetCustomerForm();

document.addEventListener('DOMContentLoaded', () => UI.init());
