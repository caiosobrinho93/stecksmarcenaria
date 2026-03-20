/**
 * State Console - Core Logic V5.0
 * Optimized for performance and responsiveness.
 */

const DB_PREFIX = 'state_db_';
const DB = {
    get: (key, defaultVal = []) => {
        const data = localStorage.getItem(DB_PREFIX + key);
        return data ? JSON.parse(data) : defaultVal;
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

// --- Notifications ---
function notify(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    toast.innerHTML = `<i class="fa-solid ${icon}" style="color:var(--accent)"></i> <span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- Navigation & Mobile Sidebar ---
const navLinks = document.querySelectorAll('.nav-link[data-mod]');
const sections = document.querySelectorAll('.module-section');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const menuToggle = document.getElementById('menu-toggle');

function switchModule(modId, autoScroll = false) {
    sections.forEach(s => s.classList.remove('active'));
    navLinks.forEach(l => l.classList.remove('active'));
    
    const target = document.getElementById('mod-' + modId);
    const link = document.querySelector(`.nav-link[data-mod="${modId}"]`);
    
    if (target && link) {
        target.classList.add('active');
        link.classList.add('active');
        document.getElementById('current-mod-name').innerText = link.querySelector('span').innerText;
        if(autoScroll) window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Close mobile sidebar if open
    sidebar.classList.remove('open');
    sidebarOverlay.style.display = 'none';
}

navLinks.forEach(link => {
    link.onclick = (e) => {
        e.preventDefault();
        switchModule(link.dataset.mod);
    };
});

if (menuToggle) {
    menuToggle.onclick = () => {
        sidebar.classList.add('open');
        sidebarOverlay.style.display = 'block';
    };
}

sidebarOverlay.onclick = () => {
    sidebar.classList.remove('open');
    sidebarOverlay.style.display = 'none';
};

// Global accessor for switchModule
window.switchModule = switchModule;

// --- User Menu ---
const userTrigger = document.getElementById('user-menu-trigger');
if (userTrigger) {
    userTrigger.onclick = () => notify('Configurações de perfil em breve.');
}

// Logout
document.getElementById('logout-trigger').onclick = () => {
    if (confirm('Deseja encerrar a sessão?')) {
        localStorage.removeItem('state_admin_session');
        window.location.href = 'login.html';
    }
};

// --- Utils ---
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

// --- UI Helpers ---
function toggleForm(formId, show = true) {
    const form = document.getElementById(formId);
    form.style.display = show ? 'block' : 'none';
    if(show) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// --- MODULE: CLIENTS ---
const clientForm = document.getElementById('client-form-el');
const searchClients = document.getElementById('search-clients');

document.getElementById('btn-add-client-toggle').onclick = () => {
    clientForm.reset();
    document.getElementById('client-id').value = '';
    document.getElementById('client-form-title').innerText = 'Adicionar Novo Cliente';
    toggleForm('form-client');
};

document.getElementById('btn-client-cancel').onclick = () => toggleForm('form-client', false);

clientForm.onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('client-id').value;
    const clients = DB.get('clients');
    const photoInput = document.getElementById('client-photo');
    let photo = id ? (clients.find(c => c.id === id)?.photo || '') : '';
    
    if (photoInput.files[0]) photo = await toBase64(photoInput.files[0]);

    const data = {
        id: id || Date.now().toString(),
        name: document.getElementById('client-name').value,
        email: document.getElementById('client-email').value,
        phone: document.getElementById('client-phone').value,
        address: document.getElementById('client-address').value,
        photo
    };

    if (id) {
        const idx = clients.findIndex(c => c.id === id);
        clients[idx] = data;
        DB.log(`Cliente atualizado: ${data.name}`);
    } else {
        clients.push(data);
        DB.log(`Novo cliente cadastrado: ${data.name}`);
    }

    DB.set('clients', clients);
    renderClients();
    toggleForm('form-client', false);
};

function renderClients(filter = '') {
    const clients = DB.get('clients');
    const tbody = document.querySelector('#table-clients tbody');
    const filtered = clients.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()));
    
    tbody.innerHTML = filtered.map(c => `
        <tr>
            <td><div class="avatar" style="width:30px;height:30px;font-size:0.75rem">${c.photo ? `<img src="${c.photo}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : c.name[0]}</div></td>
            <td><strong>${c.name}</strong></td>
            <td><span style="font-size:0.8rem;color:var(--text-secondary)">${c.phone}</span></td>
            <td>
                <div style="display:flex;gap:8px">
                    <button class="btn btn-ghost btn-sm" onclick="editClient('${c.id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="deleteItem('clients', '${c.id}', renderClients)"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
    
    if(filtered.length === 0) tbody.innerHTML = '<tr><td colspan="4" class="empty-state"><i class="fa-solid fa-search"></i><span>Nenhum cliente encontrado</span></td></tr>';
    updateStats();
    updateSelectors();
}

window.editClient = (id) => {
    const c = DB.get('clients').find(x => x.id === id);
    if(!c) return;
    document.getElementById('client-id').value = c.id;
    document.getElementById('client-name').value = c.name;
    document.getElementById('client-email').value = c.email;
    document.getElementById('client-phone').value = c.phone;
    document.getElementById('client-address').value = c.address;
    document.getElementById('client-form-title').innerText = 'Editar Cliente';
    toggleForm('form-client');
};

searchClients.oninput = (e) => renderClients(e.target.value);

// --- MODULE: PROJECTS ---
const projectForm = document.getElementById('project-form-el');
document.getElementById('btn-add-project-toggle').onclick = () => {
    projectForm.reset();
    document.getElementById('project-id').value = '';
    document.getElementById('project-form-title').innerText = 'Configurar Novo Projeto';
    toggleForm('form-project');
};
document.getElementById('btn-project-cancel').onclick = () => toggleForm('form-project', false);

projectForm.onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('project-id').value;
    const projects = DB.get('projects');
    const data = {
        id: id || Date.now().toString(),
        title: document.getElementById('project-title').value,
        client: document.getElementById('project-client-select').value,
        status: document.getElementById('project-status').value,
        progress: parseInt(document.getElementById('project-progress').value || 0)
    };

    if(id) projects[projects.findIndex(p => p.id === id)] = data;
    else projects.push(data);
    
    DB.set('projects', projects);
    DB.log(`Projeto ${id ? 'atualizado' : 'iniciado'}: ${data.title}`);
    renderProjects();
    toggleForm('form-project', false);
};

function renderProjects() {
    const projects = DB.get('projects');
    const tbody = document.querySelector('#table-projects tbody');
    tbody.innerHTML = projects.map(p => `
        <tr>
            <td><strong>${p.title}</strong></td>
            <td>${p.client}</td>
            <td style="min-width:150px">
                <div style="display:flex;justify-content:space-between;font-size:0.7rem;margin-bottom:4px">
                    <span>${p.status}</span>
                    <span>${p.progress}%</span>
                </div>
                <div class="progress-container"><div class="progress-bar" style="width:${p.progress}%"></div></div>
            </td>
            <td>
                <div style="display:flex;gap:8px">
                    <button class="btn btn-ghost btn-sm" onclick="editProject('${p.id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="deleteItem('projects', '${p.id}', renderProjects)"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
    updateStats();
}

window.editProject = (id) => {
    const p = DB.get('projects').find(x => x.id === id);
    document.getElementById('project-id').value = p.id;
    document.getElementById('project-title').value = p.title;
    document.getElementById('project-client-select').value = p.client;
    document.getElementById('project-status').value = p.status;
    document.getElementById('project-progress').value = p.progress;
    toggleForm('form-project');
};

// --- MODULE: INVENTORY ---
const invForm = document.getElementById('inventory-form-el');
document.getElementById('btn-add-item-toggle').onclick = () => { invForm.reset(); document.getElementById('item-id').value = ''; toggleForm('form-inventory'); };
document.getElementById('btn-item-cancel').onclick = () => toggleForm('form-inventory', false);

invForm.onsubmit = (e) => {
    e.preventDefault();
    const id = document.getElementById('item-id').value;
    const inv = DB.get('inventory');
    const data = {
        id: id || Date.now().toString(),
        name: document.getElementById('item-name').value,
        qty: parseInt(document.getElementById('item-qty').value),
        min: parseInt(document.getElementById('item-min').value)
    };
    if(id) inv[inv.findIndex(i => i.id === id)] = data;
    else inv.push(data);
    DB.set('inventory', inv);
    renderInventory();
    toggleForm('form-inventory', false);
};

function renderInventory() {
    const inv = DB.get('inventory');
    const tbody = document.querySelector('#table-inventory tbody');
    tbody.innerHTML = inv.map(i => {
        const isLow = i.qty <= i.min;
        return `
        <tr>
            <td><strong>${i.name}</strong></td>
            <td>${i.qty}</td>
            <td><span style="color:${isLow ? 'var(--danger)' : 'var(--success)'}; font-weight:600; font-size:0.75rem">${isLow ? 'REPOR ESTOQUE' : 'ESTÁVEL'}</span></td>
            <td><button class="btn btn-ghost btn-sm" onclick="editItem('${i.id}')"><i class="fa-solid fa-pen"></i></button></td>
        </tr>
    `}).join('');
}

window.editItem = (id) => {
    const i = DB.get('inventory').find(x => x.id === id);
    document.getElementById('item-id').value = i.id;
    document.getElementById('item-name').value = i.name;
    document.getElementById('item-qty').value = i.qty;
    document.getElementById('item-min').value = i.min;
    toggleForm('form-inventory');
};

// --- MODULE: FINANCE ---
const finForm = document.getElementById('finance-form-el');
document.getElementById('btn-add-trans-toggle').onclick = () => { finForm.reset(); document.getElementById('trans-id').value = ''; toggleForm('form-finance'); };
document.getElementById('btn-trans-cancel').onclick = () => toggleForm('form-finance', false);

finForm.onsubmit = (e) => {
    e.preventDefault();
    const id = document.getElementById('trans-id').value;
    const fin = DB.get('finance');
    const data = {
        id: id || Date.now().toString(),
        type: document.getElementById('trans-type').value,
        val: parseFloat(document.getElementById('trans-val').value),
        desc: document.getElementById('trans-desc').value,
        date: document.getElementById('trans-date').value
    };
    if(id) fin[fin.findIndex(f => f.id === id)] = data;
    else fin.push(data);
    DB.set('finance', fin);
    renderFinance();
    toggleForm('form-finance', false);
    DB.log(`Transação: ${data.desc}`);
};

function renderFinance() {
    const fin = DB.get('finance');
    const tbody = document.querySelector('#table-finance tbody');
    let total = 0;
    tbody.innerHTML = fin.map(f => {
        if(f.type === 'income') total += f.val;
        else total -= f.val;
        return `
        <tr>
            <td style="font-size:0.8rem">${f.date}</td>
            <td>${f.desc}</td>
            <td style="color:${f.type === 'income' ? 'var(--success)' : 'var(--danger)'}; font-weight:bold">
                ${f.type === 'income' ? '+' : '-'} R$ ${f.val.toLocaleString('pt-BR')}
            </td>
            <td><button class="btn btn-ghost btn-sm" onclick="deleteItem('finance', '${f.id}', renderFinance)"><i class="fa-solid fa-trash"></i></button></td>
        </tr>
    `}).join('');
    document.getElementById('st-income').innerText = `R$ ${total.toLocaleString('pt-BR')}`;
}

// --- MODULE: PROVIDERS ---
document.getElementById('btn-add-prov-toggle').onclick = () => { document.getElementById('provider-form-el').reset(); document.getElementById('prov-id').value = ''; toggleForm('form-provider'); };
document.getElementById('btn-prov-cancel').onclick = () => toggleForm('form-provider', false);

document.getElementById('provider-form-el').onsubmit = (e) => {
    e.preventDefault();
    const providers = DB.get('providers');
    const data = {
        id: Date.now().toString(),
        name: document.getElementById('prov-name').value,
        skill: document.getElementById('prov-skill').value,
        email: document.getElementById('prov-email').value
    };
    providers.push(data);
    DB.set('providers', providers);
    renderProviders();
    toggleForm('form-provider', false);
};

function renderProviders() {
    const ps = DB.get('providers');
    const grid = document.getElementById('providers-grid');
    grid.innerHTML = ps.map(p => `
        <div class="card">
            <h4 style="margin-bottom:8px">${p.name}</h4>
            <div style="font-size:0.75rem; color:var(--accent); margin-bottom:12px">${p.skill}</div>
            <div style="font-size:0.8rem; color:var(--text-secondary)">${p.email}</div>
            <button class="btn btn-danger btn-sm" style="margin-top:16px; width:100%" onclick="deleteItem('providers', '${p.id}', renderProviders)">Remover</button>
        </div>
    `).join('');
    updateSelectors();
}

// --- MODULE: GALLERY ---
document.getElementById('btn-add-gallery-toggle').onclick = () => { document.getElementById('gallery-form-el').reset(); document.getElementById('gal-id').value = ''; toggleForm('form-gallery'); };
document.getElementById('btn-gallery-cancel').onclick = () => toggleForm('form-gallery', false);

document.getElementById('gallery-form-el').onsubmit = async (e) => {
    e.preventDefault();
    const gallery = DB.get('gallery');
    const file = document.getElementById('gal-file').files[0];
    let img = '';
    if(file) img = await toBase64(file);
    
    const data = {
        id: Date.now().toString(),
        title: document.getElementById('gal-title').value,
        img
    };
    gallery.push(data);
    DB.set('gallery', gallery);
    renderGallery();
    toggleForm('form-gallery', false);
};

function renderGallery() {
    const gs = DB.get('gallery');
    const grid = document.getElementById('gallery-list');
    grid.innerHTML = gs.map(g => `
        <div class="card" style="padding:0; overflow:hidden">
            <img src="${g.img}" style="width:100%; height:150px; object-fit:cover">
            <div style="padding:16px">
                <h5 style="margin-bottom:8px">${g.title}</h5>
                <button class="btn btn-danger btn-sm" style="width:100%" onclick="deleteItem('gallery', '${g.id}', renderGallery)">Excluir</button>
            </div>
        </div>
    `).join('');
}

// --- GLOBAL DELETE ---
window.deleteItem = (key, id, callback) => {
    if (confirm('Tem certeza que deseja excluir?')) {
        let items = DB.get(key);
        items = items.filter(x => x.id !== id);
        DB.set(key, items);
        notify('Registro removido com sucesso.');
        callback();
    }
};

// --- CALCULATOR ---
window.calculateQuote = () => {
    const base = parseFloat(document.getElementById('calc-type').value);
    const val = parseFloat(document.getElementById('calc-val').value || 0);
    if(val <= 0) return notify('Insira uma medida válida.', 'error');
    const total = base * val;
    document.getElementById('calc-price').innerText = `R$ ${total.toLocaleString('pt-BR')}`;
    document.getElementById('calc-result').style.display = 'block';
};

// --- DATA SYNC ---
function updateStats() {
    document.getElementById('st-projects').innerText = DB.get('projects').length;
    document.getElementById('st-clients').innerText = DB.get('clients').length;
}

function updateSelectors() {
    const cs = DB.get('clients');
    const ps = DB.get('providers');
    const selClient = document.getElementById('project-client-select');
    const selGalProv = document.getElementById('gal-prov-select');
    
    if(selClient) selClient.innerHTML = '<option value="">Selecione um cliente</option>' + cs.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    if(selGalProv) selGalProv.innerHTML = '<option value="">Sem vínculo</option>' + ps.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
}

function renderLogs() {
    const logs = DB.get('logs');
    document.getElementById('recent-logs').innerHTML = logs.map(l => `<div>[${l.time}] ${l.msg}</div>`).join('');
}

// --- INITIALIZE ---
window.onload = () => {
    flatpickr(".datepicker", { locale: "pt", theme: "dark" });
    renderClients(); renderProjects(); renderInventory(); renderFinance(); renderProviders(); renderGallery(); renderLogs();
    notify('Dashboard pronto para uso.');
};
