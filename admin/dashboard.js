let GROK_KEY = localStorage.getItem('state_grok_key') || '';
const DB_PREFIX = 'state_db_';

const DB = {
    get: (key, defaultVal = []) => {
        try { const d = localStorage.getItem(DB_PREFIX + key); return d ? JSON.parse(d) : defaultVal; } catch { return defaultVal; }
    },
    set: (key, val) => localStorage.setItem(DB_PREFIX + key, JSON.stringify(val)),
    log: (msg) => {
        const logs = DB.get('logs', []);
        logs.unshift({ time: new Date().toLocaleTimeString(), msg });
        DB.set('logs', logs.slice(0, 50));
        renderLogs();
        notify(msg);
    }
};

// ─── TOASTS ──────────────────────────────────────────────
function notify(msg) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color:var(--accent);margin-right:8px"></i>${msg}`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(20px)'; setTimeout(() => toast.remove(), 400); }, 4000);
}

// ─── NAVIGATION ──────────────────────────────────────────
const navLinks = document.querySelectorAll('.nav-link[data-mod]');
const sections = document.querySelectorAll('.module-section');

function switchModule(modId) {
    const incoming = document.getElementById('mod-' + modId);
    if (!incoming) return;
    sections.forEach(s => { s.classList.remove('active'); setTimeout(() => { if (!s.classList.contains('active')) s.style.display = 'none'; }, 300); });
    navLinks.forEach(l => l.classList.remove('active'));
    const link = document.querySelector(`.nav-link[data-mod="${modId}"]`);
    if (link) { link.classList.add('active'); document.getElementById('current-mod-name').innerText = link.querySelector('span').innerText; }
    incoming.style.display = 'block';
    setTimeout(() => incoming.classList.add('active'), 20);
    // Close all open forms
    document.querySelectorAll('.form-card:not(.always-visible)').forEach(f => f.style.display = 'none');
    document.querySelectorAll('.data-box, #providers-grid, #gallery-list').forEach(b => b.style.display = '');
}

navLinks.forEach(link => link.onclick = () => switchModule(link.dataset.mod));

// ─── USER MENU ───────────────────────────────────────────
const userTrigger = document.getElementById('user-menu-trigger');
const userDropdown = document.getElementById('user-dropdown');
if (userTrigger) {
    userTrigger.onclick = e => { e.stopPropagation(); userDropdown.style.display = userDropdown.style.display === 'block' ? 'none' : 'block'; };
    document.addEventListener('click', () => { if (userDropdown) userDropdown.style.display = 'none'; });
}

// Logout
const logoutEls = [document.getElementById('logout-link'), document.getElementById('logout-trigger')];
logoutEls.forEach(el => { if (el) el.onclick = e => { e.preventDefault(); if (confirm('Sair do painel?')) { localStorage.removeItem('state_admin_session'); window.location.href = 'login.html'; } }; });

// ─── UTILS ───────────────────────────────────────────────
const toBase64 = file => new Promise((resolve, reject) => { const r = new FileReader(); r.readAsDataURL(file); r.onload = () => resolve(r.result); r.onerror = reject; });

function showModal(html) {
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('generic-modal').style.display = 'flex';
}

document.getElementById('modal-close').onclick = () => document.getElementById('generic-modal').style.display = 'none';

// ─── FORM TOGGLE ─────────────────────────────────────────
function openForm(formId, hideQuery) {
    const form = document.getElementById(formId);
    if (!form) return;
    const targets = form.closest('section').querySelectorAll(hideQuery);
    targets.forEach(t => t.style.display = 'none');
    form.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeForm(formId, showQuery) {
    const form = document.getElementById(formId);
    if (!form) return;
    form.style.display = 'none';
    const targets = form.closest('section').querySelectorAll(showQuery);
    targets.forEach(t => t.style.display = '');
}

// ─── 1. CLIENTS ──────────────────────────────────────────
const clientForm = document.getElementById('client-form-el');

document.getElementById('btn-add-client-toggle').onclick = () => {
    clientForm.reset();
    document.getElementById('client-id').value = '';
    document.getElementById('client-form-title').innerText = 'Novo Cliente';
    openForm('form-client', '.data-box');
};

document.getElementById('btn-client-cancel').onclick = () => closeForm('form-client', '.data-box');

clientForm.onsubmit = async e => {
    e.preventDefault();
    const id = document.getElementById('client-id').value;
    const clients = DB.get('clients');
    const photoInput = document.getElementById('client-photo');
    let photo = id ? (clients.find(c => c.id === id) || {}).photo || '' : '';
    if (photoInput.files[0]) photo = await toBase64(photoInput.files[0]);

    const data = { id: id || Date.now().toString(), name: document.getElementById('client-name').value, email: document.getElementById('client-email').value, phone: document.getElementById('client-phone').value, address: document.getElementById('client-address').value, photo };

    if (id) { clients[clients.findIndex(c => c.id === id)] = data; DB.log(`Cliente atualizado: ${data.name}`); }
    else { clients.push(data); DB.log(`Cliente adicionado: ${data.name}`); }

    DB.set('clients', clients);
    renderClients();
    clientForm.reset();
    closeForm('form-client', '.data-box');
};

window.editClient = id => {
    const c = DB.get('clients').find(x => x.id === id);
    if (!c) return;
    document.getElementById('client-id').value = c.id;
    document.getElementById('client-name').value = c.name;
    document.getElementById('client-email').value = c.email;
    document.getElementById('client-phone').value = c.phone;
    document.getElementById('client-address').value = c.address;
    document.getElementById('client-form-title').innerText = 'Editar Cliente';
    openForm('form-client', '.data-box');
};

window.viewClient = id => {
    const c = DB.get('clients').find(x => x.id === id);
    if (!c) return;
    showModal(`<h3 style="margin-bottom:16px">${c.name}</h3>
    <p><strong>Email:</strong> ${c.email || '—'}</p>
    <p><strong>Telefone:</strong> ${c.phone || '—'}</p>
    <p><strong>Endereço:</strong> ${c.address || '—'}</p>`);
};

function renderClients() {
    const clients = DB.get('clients');
    const tbody = document.querySelector('#table-clients tbody');
    const section = document.getElementById('mod-clients');
    let es = section.querySelector('.empty-state');
    if (clients.length === 0) {
        tbody.innerHTML = '';
        if (!es) { es = mkEmpty('fa-users', 'Nenhum cliente cadastrado'); section.appendChild(es); }
    } else {
        if (es) es.remove();
        tbody.innerHTML = clients.map(c => `<tr>
            <td><div class="avatar-circle" style="width:32px;height:32px;font-size:0.75rem">${c.photo ? `<img src="${c.photo}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">` : '<i class="fa-solid fa-user"></i>'}</div></td>
            <td><strong style="cursor:pointer;color:var(--accent)" onclick="viewClient('${c.id}')">${c.name}</strong></td>
            <td>${c.phone || '—'}</td>
            <td style="display:flex;gap:6px">
                <button class="btn btn-ghost btn-sm" onclick="editClient('${c.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-danger btn-sm" onclick="deleteItem('clients','${c.id}',renderClients)"><i class="fa-solid fa-trash"></i></button>
            </td></tr>`).join('');
    }
    updateStats(); updateSelectors();
}

// ─── 2. PROJECTS ─────────────────────────────────────────
const projectForm = document.getElementById('project-form-el');

document.getElementById('btn-add-project-toggle').onclick = () => {
    projectForm.reset();
    document.getElementById('project-id').value = '';
    document.getElementById('project-form-title').innerText = 'Novo Projeto';
    openForm('form-project', '.data-box');
};

document.getElementById('btn-project-cancel').onclick = () => closeForm('form-project', '.data-box');

projectForm.onsubmit = async e => {
    e.preventDefault();
    const id = document.getElementById('project-id').value;
    const projects = DB.get('projects');
    const files = document.getElementById('project-imgs').files;
    let images = id ? (projects.find(p => p.id === id) || {}).images || [] : [];
    if (files.length > 0) { images = []; for (const f of files) images.push(await toBase64(f)); }

    const data = { id: id || Date.now().toString(), title: document.getElementById('project-title').value, client: document.getElementById('project-client-select').value, provider: document.getElementById('project-provider-select').value, status: document.getElementById('project-status').value, images };

    if (id) { projects[projects.findIndex(p => p.id === id)] = data; DB.log(`Projeto atualizado: ${data.title}`); }
    else { projects.push(data); DB.log(`Projeto criado: ${data.title}`); }

    DB.set('projects', projects);
    renderProjects();
    projectForm.reset();
    closeForm('form-project', '.data-box');
};

window.editProject = id => {
    const p = DB.get('projects').find(x => x.id === id);
    if (!p) return;
    document.getElementById('project-id').value = p.id;
    document.getElementById('project-title').value = p.title;
    document.getElementById('project-client-select').value = p.client;
    document.getElementById('project-provider-select').value = p.provider;
    document.getElementById('project-status').value = p.status;
    document.getElementById('project-form-title').innerText = 'Editar Projeto';
    openForm('form-project', '.data-box');
};

window.viewProject = id => {
    const p = DB.get('projects').find(x => x.id === id);
    if (!p) return;
    showModal(`<h3 style="margin-bottom:16px">${p.title}</h3>
    <p><strong>Cliente:</strong> ${p.client || '—'}</p>
    <p><strong>Status:</strong> ${p.status}</p>
    <p><strong>Imagens:</strong> ${(p.images || []).length} arquivo(s)</p>`);
};

function renderProjects() {
    const projects = DB.get('projects');
    const tbody = document.querySelector('#table-projects tbody');
    const section = document.getElementById('mod-projects');
    let es = section.querySelector('.empty-state');
    const statusMap = { planning:'Em Planejamento', production:'Em Produção', installation:'Em Instalação', paused:'Pausado', done:'Concluído' };
    const badgeMap = { done:'badge-done', paused:'badge-paused', planning:'badge-working', production:'badge-working', installation:'badge-working' };
    if (projects.length === 0) {
        tbody.innerHTML = '';
        if (!es) { es = mkEmpty('fa-compass-drafting', 'Nenhum projeto criado'); section.appendChild(es); }
    } else {
        if (es) es.remove();
        tbody.innerHTML = projects.map(p => `<tr>
            <td><strong style="cursor:pointer;color:var(--accent)" onclick="viewProject('${p.id}')">${p.title}</strong></td>
            <td>${p.client || '—'}</td>
            <td><span class="badge ${badgeMap[p.status] || 'badge-working'}">${statusMap[p.status] || p.status}</span></td>
            <td style="display:flex;gap:6px">
                <button class="btn btn-ghost btn-sm" onclick="editProject('${p.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-danger btn-sm" onclick="deleteItem('projects','${p.id}',renderProjects)"><i class="fa-solid fa-trash"></i></button>
            </td></tr>`).join('');
    }
    updateStats();
}

// ─── 3. INVENTORY ────────────────────────────────────────
const invForm = document.getElementById('inventory-form-el');

document.getElementById('btn-add-item-toggle').onclick = () => {
    invForm.reset();
    document.getElementById('item-id').value = '';
    document.getElementById('inventory-form-title').innerText = 'Novo Item';
    openForm('form-inventory', '.data-box');
};

document.getElementById('btn-item-cancel').onclick = () => closeForm('form-inventory', '.data-box');

invForm.onsubmit = async e => {
    e.preventDefault();
    const id = document.getElementById('item-id').value;
    const inv = DB.get('inventory');
    const pInput = document.getElementById('item-photo');
    let photo = id ? (inv.find(i => i.id === id) || {}).photo || '' : '';
    if (pInput.files[0]) photo = await toBase64(pInput.files[0]);

    const data = { id: id || Date.now().toString(), name: document.getElementById('item-name').value, qty: parseInt(document.getElementById('item-qty').value) || 0, min: parseInt(document.getElementById('item-min').value) || 0, photo };

    if (id) { inv[inv.findIndex(i => i.id === id)] = data; DB.log(`Estoque atualizado: ${data.name}`); }
    else { inv.push(data); DB.log(`Item adicionado: ${data.name}`); }

    DB.set('inventory', inv); renderInventory(); invForm.reset(); closeForm('form-inventory', '.data-box');
};

window.editItem = id => {
    const i = DB.get('inventory').find(x => x.id === id);
    if (!i) return;
    document.getElementById('item-id').value = i.id;
    document.getElementById('item-name').value = i.name;
    document.getElementById('item-qty').value = i.qty;
    document.getElementById('item-min').value = i.min;
    document.getElementById('inventory-form-title').innerText = 'Editar Item';
    openForm('form-inventory', '.data-box');
};

function renderInventory() {
    const inv = DB.get('inventory');
    const tbody = document.querySelector('#table-inventory tbody');
    const section = document.getElementById('mod-inventory');
    let es = section.querySelector('.empty-state');
    let alerts = 0;
    if (inv.length === 0) {
        tbody.innerHTML = '';
        if (!es) { es = mkEmpty('fa-boxes-stacked', 'Nenhum material cadastrado'); section.appendChild(es); }
    } else {
        if (es) es.remove();
        tbody.innerHTML = inv.map(i => {
            const low = i.qty <= i.min; if (low) alerts++;
            return `<tr>
                <td><strong>${i.name}</strong></td>
                <td>${i.qty}</td>
                <td><span class="badge ${low ? 'badge-paused' : 'badge-done'}">${low ? 'Baixo' : 'OK'}</span></td>
                <td style="display:flex;gap:6px">
                    <button class="btn btn-ghost btn-sm" onclick="editItem('${i.id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="deleteItem('inventory','${i.id}',renderInventory)"><i class="fa-solid fa-trash"></i></button>
                </td></tr>`;
        }).join('');
    }
    DB.set('low_stock_count', alerts); updateStats();
}

// ─── 4. FINANCE ──────────────────────────────────────────
document.getElementById('btn-add-trans-toggle').onclick = () => {
    document.getElementById('finance-form-el').reset();
    document.getElementById('trans-id').value = '';
    document.getElementById('finance-form-title').innerText = 'Novo Lançamento';
    openForm('form-finance', '.data-box');
};

// FIX: The HTML cancel button has id="btn-trans-cancel" (in finance form), not "btn-finance-cancel"
// We bind both just in case:
const finCancelBtn = document.getElementById('btn-finance-cancel') || document.getElementById('btn-trans-cancel');
if (finCancelBtn) finCancelBtn.onclick = () => closeForm('form-finance', '.data-box');

document.getElementById('btn-set-today').onclick = () => {
    const dp = document.getElementById('trans-date');
    if (dp._flatpickr) dp._flatpickr.setDate(new Date()); else dp.value = new Date().toISOString().split('T')[0];
};

document.getElementById('finance-form-el').onsubmit = e => {
    e.preventDefault();
    const id = document.getElementById('trans-id').value;
    const fin = DB.get('finance');
    const data = { id: id || Date.now().toString(), type: document.getElementById('trans-type').value, val: parseFloat(document.getElementById('trans-val').value) || 0, desc: document.getElementById('trans-desc').value, date: document.getElementById('trans-date').value };
    if (id) { fin[fin.findIndex(f => f.id === id)] = data; DB.log(`Lançamento editado: ${data.desc}`); }
    else { fin.push(data); DB.log(`Lançamento adicionado: ${data.desc}`); }
    DB.set('finance', fin); renderFinance(); document.getElementById('finance-form-el').reset(); closeForm('form-finance', '.data-box');
};

window.editTrans = id => {
    const f = DB.get('finance').find(x => x.id === id);
    if (!f) return;
    document.getElementById('trans-id').value = f.id;
    document.getElementById('trans-type').value = f.type;
    document.getElementById('trans-val').value = f.val;
    document.getElementById('trans-desc').value = f.desc;
    document.getElementById('trans-date').value = f.date;
    document.getElementById('finance-form-title').innerText = 'Editar Lançamento';
    openForm('form-finance', '.data-box');
};

function renderFinance() {
    const fin = DB.get('finance');
    const tbody = document.querySelector('#table-finance tbody');
    const section = document.getElementById('mod-finance');
    let es = section.querySelector('.empty-state');
    let total = 0;
    if (fin.length === 0) {
        tbody.innerHTML = '';
        if (!es) { es = mkEmpty('fa-chart-line', 'Nenhum lançamento registrado'); section.appendChild(es); }
    } else {
        if (es) es.remove();
        tbody.innerHTML = fin.map(f => {
            const inc = f.type === 'income'; if (inc) total += f.val;
            return `<tr>
                <td style="font-family:var(--font-mono);font-size:0.8rem">${f.date}</td>
                <td>${f.desc}</td>
                <td style="color:${inc ? 'var(--success)' : 'var(--danger)'};font-weight:600">${inc ? '+' : '−'} R$ ${Number(f.val).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                <td style="display:flex;gap:6px">
                    <button class="btn btn-ghost btn-sm" onclick="editTrans('${f.id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="deleteItem('finance','${f.id}',renderFinance)"><i class="fa-solid fa-trash"></i></button>
                </td></tr>`;
        }).join('');
    }
    const el = document.getElementById('st-income'); if (el) el.innerText = `R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits:2})}`;
}

// ─── 5. PROVIDERS (PARCEIROS) ─────────────────────────────
// FIX: These listeners were completely missing from the previous version!
document.getElementById('btn-add-prov-toggle').onclick = () => {
    document.getElementById('provider-form-el').reset();
    document.getElementById('prov-id').value = '';
    document.getElementById('provider-form-title').innerText = 'Novo Parceiro';
    openForm('form-provider', '#providers-grid');
};

document.getElementById('btn-prov-cancel').onclick = () => closeForm('form-provider', '#providers-grid');

document.getElementById('prov-type-person').onchange = e => {
    document.getElementById('label-doc').innerText = e.target.value === 'pf' ? 'CPF' : 'CNPJ';
};

document.getElementById('provider-form-el').onsubmit = async e => {
    e.preventDefault();
    const id = document.getElementById('prov-id').value;
    const providers = DB.get('providers');
    const pInput = document.getElementById('prov-photo');
    let photo = id ? (providers.find(p => p.id === id) || {}).photo || '' : '';
    if (pInput.files[0]) photo = await toBase64(pInput.files[0]);

    const data = { id: id || Date.now().toString(), typePerson: document.getElementById('prov-type-person').value, doc: document.getElementById('prov-doc').value, name: document.getElementById('prov-name').value, skill: document.getElementById('prov-skill').value, email: document.getElementById('prov-email').value, address: document.getElementById('prov-address').value, responsible: document.getElementById('prov-resp').value, photo };

    if (id) { providers[providers.findIndex(p => p.id === id)] = data; DB.log(`Parceiro atualizado: ${data.name}`); }
    else { providers.push(data); DB.log(`Parceiro adicionado: ${data.name}`); }

    DB.set('providers', providers); renderProviders(); document.getElementById('provider-form-el').reset(); closeForm('form-provider', '#providers-grid');
};

window.editProvider = id => {
    const p = DB.get('providers').find(x => x.id === id);
    if (!p) return;
    document.getElementById('prov-id').value = p.id;
    document.getElementById('prov-type-person').value = p.typePerson;
    document.getElementById('label-doc').innerText = p.typePerson === 'pf' ? 'CPF' : 'CNPJ';
    document.getElementById('prov-doc').value = p.doc;
    document.getElementById('prov-name').value = p.name;
    document.getElementById('prov-skill').value = p.skill;
    document.getElementById('prov-email').value = p.email;
    document.getElementById('prov-address').value = p.address;
    document.getElementById('prov-resp').value = p.responsible;
    document.getElementById('provider-form-title').innerText = 'Editar Parceiro';
    openForm('form-provider', '#providers-grid');
};

window.viewProvider = id => {
    const p = DB.get('providers').find(x => x.id === id);
    if (!p) return;
    showModal(`<h3 style="margin-bottom:16px">${p.name}</h3>
    <p><strong>Especialidade:</strong> ${p.skill || '—'}</p>
    <p><strong>Email:</strong> ${p.email || '—'}</p>
    <p><strong>Doc:</strong> ${p.doc || '—'}</p>
    <p><strong>Endereço:</strong> ${p.address || '—'}</p>
    <p><strong>Responsável:</strong> ${p.responsible || '—'}</p>`);
};

function renderProviders() {
    const prv = DB.get('providers');
    const grid = document.getElementById('providers-grid');
    const section = document.getElementById('mod-providers');
    let es = section.querySelector('.empty-state');
    if (prv.length === 0) {
        grid.innerHTML = '';
        if (!es) { es = mkEmpty('fa-handshake', 'Nenhum parceiro cadastrado'); section.appendChild(es); }
    } else {
        if (es) es.remove();
        grid.innerHTML = prv.map(p => `<div class="stat-card" style="display:flex;flex-direction:column;gap:16px">
            <div style="display:flex;gap:14px;align-items:center">
                ${p.photo ? `<img src="${p.photo}" style="width:48px;height:48px;border-radius:8px;object-fit:cover;border:1px solid var(--border)">` : `<div class="avatar-circle" style="width:48px;height:48px;border-radius:8px;font-size:1.2rem"><i class="fa-solid fa-handshake"></i></div>`}
                <div>
                    <div style="font-weight:600">${p.name}</div>
                    <div style="font-size:0.75rem;color:var(--accent)">${p.skill}</div>
                </div>
            </div>
            <div style="display:flex;gap:8px">
                <button class="btn btn-ghost btn-sm" style="flex:1" onclick="viewProvider('${p.id}')"><i class="fa-solid fa-eye"></i> Ver</button>
                <button class="btn btn-ghost btn-sm" onclick="editProvider('${p.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-danger btn-sm" onclick="deleteItem('providers','${p.id}',renderProviders)"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>`).join('');
    }
    updateSelectors();
}

// ─── 6. GALLERY (GALERIA) ────────────────────────────────
// FIX: Gallery form was always-visible but had no submit/reset handler; also no gal-prov-select update in updateSelectors
document.getElementById('gallery-form-el').onsubmit = async e => {
    e.preventDefault();
    const id = document.getElementById('gal-id').value;
    const gallery = DB.get('gallery');
    const pInput = document.getElementById('gal-file');
    let photo = id ? (gallery.find(x => x.id === id) || {}).photo || '' : '';
    if (pInput.files[0]) photo = await toBase64(pInput.files[0]);

    const providerId = document.getElementById('gal-prov-select').value;
    const provider = DB.get('providers').find(p => p.id === providerId);

    const data = { id: id || Date.now().toString(), title: document.getElementById('gal-title').value, sub: document.getElementById('gal-sub').value, photo, providerAvatar: provider ? provider.photo : '' };

    if (id) { gallery[gallery.findIndex(x => x.id === id)] = data; DB.log(`Foto atualizada: ${data.title}`); }
    else { gallery.push(data); DB.log(`Foto publicada: ${data.title}`); }

    DB.set('gallery', gallery);
    renderGallery();
    document.getElementById('gallery-form-el').reset();
    document.getElementById('gal-id').value = '';
};

window.editGallery = id => {
    const g = DB.get('gallery').find(x => x.id === id);
    if (!g) return;
    document.getElementById('gal-id').value = g.id;
    document.getElementById('gal-title').value = g.title;
    document.getElementById('gal-sub').value = g.sub;
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

function renderGallery() {
    const gallery = DB.get('gallery');
    const list = document.getElementById('gallery-list');
    const section = document.getElementById('mod-gallery');
    let es = section.querySelector('.empty-state');
    if (gallery.length === 0) {
        list.innerHTML = '';
        if (!es) { es = mkEmpty('fa-images', 'Nenhuma imagem publicada'); section.appendChild(es); }
    } else {
        if (es) es.remove();
        list.innerHTML = gallery.map(g => `<div class="photo-card">
            ${g.photo ? `<img src="${g.photo}" class="photo-img">` : `<div class="photo-img" style="background:var(--surface-2);display:flex;align-items:center;justify-content:center;color:var(--text-dim)"><i class="fa-solid fa-image" style="font-size:2rem"></i></div>`}
            <div style="padding:14px">
                <div style="font-weight:600;margin-bottom:4px">${g.title}</div>
                <div style="font-size:0.78rem;color:var(--text-dim);margin-bottom:12px">${g.sub}</div>
                <div style="display:flex;gap:8px">
                    <button class="btn btn-ghost btn-sm" onclick="editGallery('${g.id}')"><i class="fa-solid fa-pen"></i> Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteItem('gallery','${g.id}',renderGallery)"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div></div>`).join('');
    }
}

// ─── HELPERS ────────────────────────────────────────────
function mkEmpty(icon, msg) {
    const d = document.createElement('div'); d.className = 'empty-state';
    d.innerHTML = `<i class="fa-solid ${icon}"></i><span>${msg}</span>`; return d;
}

function updateStats() {
    const el = id => document.getElementById(id);
    if (el('st-projects')) el('st-projects').innerText = DB.get('projects').length;
    if (el('st-clients')) el('st-clients').innerText = DB.get('clients').length;
    if (el('st-alerts')) el('st-alerts').innerText = DB.get('low_stock_count', 0);
}

function updateSelectors() {
    const cs = DB.get('clients');
    const ps = DB.get('providers');
    const clientSel = document.getElementById('project-client-select');
    const provSel = document.getElementById('project-provider-select');
    const galProvSel = document.getElementById('gal-prov-select'); // FIX: was missing!
    if (clientSel) clientSel.innerHTML = '<option value="">Selecione o cliente</option>' + cs.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    if (provSel) provSel.innerHTML = '<option value="">Selecione o parceiro</option>' + ps.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    if (galProvSel) galProvSel.innerHTML = '<option value="">Vincular parceiro (opcional)</option>' + ps.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
}

window.deleteItem = (key, id, cb) => {
    if (!confirm('Remover este registro?')) return;
    const items = DB.get(key).filter(x => x.id !== id);
    DB.set(key, items);
    DB.log('Registro removido.');
    cb();
};

// ─── LOGS ────────────────────────────────────────────────
function renderLogs() {
    const logs = DB.get('logs');
    const el = document.getElementById('recent-logs');
    if (!el) return;
    el.innerHTML = logs.length ? logs.map(l => `<div style="display:flex;gap:10px;padding:6px 0;border-bottom:1px solid var(--border);font-size:0.78rem">
        <span style="color:var(--text-dim);font-family:var(--font-mono);white-space:nowrap">${l.time}</span>
        <span>${l.msg}</span></div>`).join('') : '<div style="color:var(--text-dim);font-size:0.8rem">Nenhum evento registrado.</div>';
}

// ─── CALCULATOR ──────────────────────────────────────────
window.calculateQuote = () => {
    const base = parseFloat(document.getElementById('calc-type').value);
    const m = parseFloat(document.getElementById('calc-val').value || 0);
    const mat = parseFloat(document.getElementById('calc-material').value);
    if (!m || m <= 0) { notify('Informe uma medida válida'); return; }
    const total = base * m * mat;
    document.getElementById('calc-price').innerText = `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    document.getElementById('calc-result').style.display = 'block';
    DB.log(`Orçamento calculado: R$ ${total.toFixed(2)}`);
};

// ─── CONFIG ──────────────────────────────────────────────
document.getElementById('save-config').onclick = () => {
    const key = document.getElementById('grok-key').value.trim();
    if (key) { localStorage.setItem('state_grok_key', key); GROK_KEY = key; notify('Chave salva com sucesso!'); }
};

// ─── AI ASSISTANT ────────────────────────────────────────
const aiToggle = document.getElementById('ai-toggle-btn');
const aiPanel = document.getElementById('ai-panel');
const aiMsgs = document.getElementById('ai-msgs');
const aiInput = document.getElementById('ai-input');

if (aiToggle) aiToggle.onclick = () => aiPanel.classList.toggle('active');
const aiClose = document.getElementById('ai-close');
if (aiClose) aiClose.onclick = () => aiPanel.classList.remove('active');

function appendMsg(role, text) {
    const d = document.createElement('div'); d.className = `msg msg-${role}`; d.innerText = text;
    aiMsgs.appendChild(d); aiMsgs.scrollTop = aiMsgs.scrollHeight; return d;
}

async function askAI() {
    const msg = aiInput.value.trim();
    if (!msg || !GROK_KEY) { if (!GROK_KEY) notify('Configure a chave do Grok primeiro!'); return; }
    appendMsg('user', msg); aiInput.value = '';
    const bot = appendMsg('bot', 'Processando...');
    try {
        const res = await fetch('https://api.x.ai/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROK_KEY}` }, body: JSON.stringify({ model: 'grok-beta', messages: [{ role: 'system', content: 'Você é um assistente de negócios para uma marcenaria. Seja objetivo e útil.' }, { role: 'user', content: msg }] }) });
        const json = await res.json();
        const full = json.choices?.[0]?.message?.content || 'Sem resposta.';
        bot.innerText = ''; bot.classList.add('typing-cursor');
        let i = 0;
        const type = () => { if (i < full.length) { bot.innerText += full[i++]; aiMsgs.scrollTop = aiMsgs.scrollHeight; setTimeout(type, 15); } else bot.classList.remove('typing-cursor'); };
        type();
    } catch (err) { bot.innerText = 'Erro ao contatar a IA. Verifique sua chave.'; }
}

if (document.getElementById('ai-send')) document.getElementById('ai-send').onclick = askAI;
if (aiInput) aiInput.onkeypress = e => { if (e.key === 'Enter') askAI(); };

// ─── INIT ────────────────────────────────────────────────
window.onload = () => {
    if (localStorage.getItem('state_admin_session') !== 'active') { window.location.href = 'login.html'; return; }
    try { flatpickr('.datepicker', { locale: 'pt', dateFormat: 'Y-m-d', theme: 'dark' }); } catch (e) {}
    const grokEl = document.getElementById('grok-key'); if (grokEl) grokEl.value = GROK_KEY;
    renderClients(); renderProjects(); renderInventory(); renderFinance(); renderProviders(); renderGallery(); renderLogs();
    DB.log('Painel carregado com sucesso.');
};
