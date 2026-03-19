/**
 * State Console V4.0 - Cyber-Logic
 * Features: High-Tech Toasts, Grok Integration, Pulse UI
 */

const GROK_KEY = ''; // ENTER_KEY_VIA_UI_CONFIG
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

// --- FUTURISTIC NOTIFICATIONS (TOASTS) ---
function notify(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid fa-microchip" style="margin-right:10px; color:var(--neon-cyan)"></i> ${msg.toUpperCase()}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// --- NAVIGATION ---
const navLinks = document.querySelectorAll('.nav-link[data-mod]');
const sections = document.querySelectorAll('.module-section');

function switchModule(modId) {
    sections.forEach(s => {
        s.classList.remove('active');
        setTimeout(() => { if (!s.classList.contains('active')) s.style.display = 'none'; }, 400);
    });
    navLinks.forEach(l => l.classList.remove('active'));

    const target = document.getElementById('mod-' + modId);
    const link = document.querySelector(`.nav-link[data-mod="${modId}"]`);
    
    if (target && link) {
        target.style.display = 'block';
        setTimeout(() => target.classList.add('active'), 10);
        link.classList.add('active');
        document.getElementById('current-mod-name').innerText = link.querySelector('span').innerText;
    }
}

navLinks.forEach(link => link.onclick = () => switchModule(link.dataset.mod));

// Logout
document.getElementById('logout-trigger').onclick = (e) => {
    e.preventDefault();
    if (confirm('ENCERRAR PROTOCOLO DE ACESSO?')) {
        localStorage.removeItem('state_admin_session');
        window.location.href = 'login.html';
    }
};

// --- UTILS ---
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

function showModal(content) {
    const modal = document.getElementById('generic-modal');
    document.getElementById('modal-content').innerHTML = `
        <div style="border-left: 2px solid var(--neon-cyan); padding-left: 30px; position:relative;">
            <div style="position:absolute; top:-20px; left:0; font-family:var(--font-mono); font-size:0.6rem; color:var(--neon-cyan);">DATA_ENTRY_MODAL</div>
            ${content}
        </div>
    `;
    modal.style.display = 'flex';
}

document.getElementById('modal-close').onclick = () => document.getElementById('generic-modal').style.display = 'none';

// --- CRUDS (Optimized for V4) ---

// 1. CLIENTS
const clientForm = document.getElementById('client-form-el');
document.getElementById('btn-add-client-toggle').onclick = () => {
    document.getElementById('form-client').classList.toggle('active');
    clientForm.reset();
    document.getElementById('client-id').value = '';
};

clientForm.onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('client-id').value;
    const clients = DB.get('clients');
    const photoInput = document.getElementById('client-photo');
    let photo = '';
    
    if (photoInput.files[0]) photo = await toBase64(photoInput.files[0]);
    else if(id) photo = clients.find(c => c.id === id).photo;

    const data = {
        id: id || Date.now().toString(),
        name: document.getElementById('client-name').value,
        email: document.getElementById('client-email').value,
        phone: document.getElementById('client-phone').value,
        address: document.getElementById('client-address').value,
        photo: photo
    };

    if (id) {
        const idx = clients.findIndex(c => c.id === id);
        clients[idx] = data;
        DB.log(`Registro atualizado: ${data.name}`);
    } else {
        clients.push(data);
        DB.log(`Novo perfil biométrico: ${data.name}`);
    }

    DB.set('clients', clients);
    renderClients();
    clientForm.reset();
    document.getElementById('form-client').classList.remove('active');
};

function renderClients() {
    const clients = DB.get('clients');
    const tbody = document.querySelector('#table-clients tbody');
    const container = document.getElementById('mod-clients');
    
    if (clients.length === 0) {
        tbody.innerHTML = '';
        if (!container.querySelector('.empty-state')) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.innerHTML = '<i class="fa-solid fa-person-rays"></i><span>SCANNING_RECORDS... NO_BIOMETRIC_DATA_FOUND</span>';
            container.appendChild(empty);
        }
    } else {
        const existingEmpty = container.querySelector('.empty-state');
        if (existingEmpty) existingEmpty.remove();
        tbody.innerHTML = clients.map(c => `
            <tr>
                <td><div class="avatar-circle" style="width:35px;height:35px">
                    ${c.photo ? `<img src="${c.photo}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : '<i class="fa-solid fa-user"></i>'}
                </div></td>
                <td><strong style="color:var(--neon-cyan);cursor:pointer" onclick="viewClient('${c.id}')">${c.name}</strong></td>
                <td>${c.phone}</td>
                <td>
                    <button class="btn btn-ghost btn-sm" onclick="editClient('${c.id}')"><i class="fa-solid fa-terminal"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="deleteItem('clients', '${c.id}', renderClients)"><i class="fa-solid fa-trash-can"></i></button>
                </td>
            </tr>
        `).join('');
    }
    updateStats();
    updateSelectors();
}

window.editClient = (id) => {
    const c = DB.get('clients').find(x => x.id === id);
    document.getElementById('form-client').classList.add('active');
    document.getElementById('client-id').value = c.id;
    document.getElementById('client-name').value = c.name;
    document.getElementById('client-email').value = c.email;
    document.getElementById('client-phone').value = c.phone;
    document.getElementById('client-address').value = c.address;
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ... (Other CRUDs follow similar pattern, optimized logic)

// 2. PROJECTS
const projectForm = document.getElementById('project-form-el');
document.getElementById('btn-add-project-toggle').onclick = () => {
    document.getElementById('form-project').classList.toggle('active');
    projectForm.reset();
}

projectForm.onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('project-id').value;
    const projects = DB.get('projects');
    const imgFiles = document.getElementById('project-imgs').files;
    let images = [];
    
    if (imgFiles.length > 0) {
        for (let file of imgFiles) images.push(await toBase64(file));
    } else if (id) images = projects.find(p => p.id === id).images;

    const data = {
        id: id || Date.now().toString(),
        title: document.getElementById('project-title').value,
        client: document.getElementById('project-client-select').value,
        provider: document.getElementById('project-provider-select').value,
        status: document.getElementById('project-status').value,
        images: images
    };

    if (id) {
        const idx = projects.findIndex(p => p.id === id);
        projects[idx] = data;
        DB.log(`Matriz de projeto reconfigurada: ${data.title}`);
    } else {
        projects.push(data);
        DB.log(`Novo projeto inicializado: ${data.title}`);
    }

    DB.set('projects', projects);
    renderProjects();
    projectForm.reset();
    document.getElementById('form-project').classList.remove('active');
};

function renderProjects() {
    const projects = DB.get('projects');
    const tbody = document.querySelector('#table-projects tbody');
    const container = document.getElementById('mod-projects');
    
    if (projects.length === 0) {
        tbody.innerHTML = '';
        if (!container.querySelector('.empty-state')) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.innerHTML = '<i class="fa-solid fa-diagram-project"></i><span>SCANNING_MATRIX... NO_ACTIVE_PROJECTS</span>';
            container.appendChild(empty);
        }
    } else {
        const existingEmpty = container.querySelector('.empty-state');
        if (existingEmpty) existingEmpty.remove();
        tbody.innerHTML = projects.map(p => {
            let sc = p.status === 'done' ? 'badge-done' : (p.status === 'paused' ? 'badge-paused' : 'badge-working');
            return `
            <tr>
                <td><strong style="color:var(--neon-cyan);cursor:pointer" onclick="viewProject('${p.id}')">${p.title}</strong></td>
                <td>${p.client}</td>
                <td><span class="badge ${sc}" style="font-family:var(--font-mono)">${p.status.toUpperCase()}</span></td>
                <td>
                    <button class="btn btn-ghost btn-sm" onclick="editProject('${p.id}')"><i class="fa-solid fa-terminal"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="deleteItem('projects', '${p.id}', renderProjects)"><i class="fa-solid fa-trash-can"></i></button>
                </td>
            </tr>
        `}).join('');
    }
    updateStats();
}

// 3. INVENTORY
const invForm = document.getElementById('inventory-form-el');
document.getElementById('btn-add-item-toggle').onclick = () => {
    document.getElementById('form-inventory').classList.toggle('active');
    invForm.reset();
}

invForm.onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('item-id').value;
    const inv = DB.get('inventory');
    const pInput = document.getElementById('item-photo');
    let photo = '';
    if(pInput.files[0]) photo = await toBase64(pInput.files[0]);
    else if(id) photo = inv.find(i => i.id === id).photo;

    const data = {
        id: id || Date.now().toString(),
        name: document.getElementById('item-name').value,
        qty: parseInt(document.getElementById('item-qty').value),
        min: parseInt(document.getElementById('item-min').value),
        photo: photo
    };

    if (id) {
        const idx = inv.findIndex(i => i.id === id);
        inv[idx] = data;
        DB.log(`Nível de recurso atualizado: ${data.name}`);
    } else {
        inv.push(data);
        DB.log(`Novo recurso catalogado: ${data.name}`);
    }

    DB.set('inventory', inv);
    renderInventory();
    invForm.reset();
    document.getElementById('form-inventory').classList.remove('active');
};

function renderInventory() {
    const inv = DB.get('inventory');
    const tbody = document.querySelector('#table-inventory tbody');
    const container = document.getElementById('mod-inventory');
    let alerts = 0;
    
    if (inv.length === 0) {
        tbody.innerHTML = '';
        if (!container.querySelector('.empty-state')) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.innerHTML = '<i class="fa-solid fa-boxes-stacked"></i><span>SCANNING_RESOURCES... NO_ASSETS_CATALOGED</span>';
            container.appendChild(empty);
        }
    } else {
        const existingEmpty = container.querySelector('.empty-state');
        if (existingEmpty) existingEmpty.remove();
        tbody.innerHTML = inv.map(i => {
            const isLow = i.qty <= i.min;
            if(isLow) alerts++;
            return `
            <tr>
                <td><strong onclick="viewItem('${i.id}')" style="cursor:pointer">${i.name}</strong></td>
                <td>${i.qty}</td>
                <td><span class="badge ${isLow ? 'badge-paused' : 'badge-done'}" style="font-family:var(--font-mono)">${isLow ? 'ALERT_LOW' : 'STABLE'}</span></td>
                <td>
                    <button class="btn btn-ghost btn-sm" onclick="editItem('${i.id}')"><i class="fa-solid fa-terminal"></i></button>
                </td>
            </tr>
        `}).join('');
    }
    DB.set('low_stock_count', alerts);
    updateStats();
}

// 4. FINANCE
document.getElementById('btn-set-today').onclick = () => {
    document.getElementById('trans-date')._flatpickr.setDate(new Date());
};

document.getElementById('finance-form-el').onsubmit = (e) => {
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
    DB.log(`Movimentação financeira registrada: ${data.desc}`);
    renderFinance();
    document.getElementById('form-finance').classList.remove('active');
}

function renderFinance() {
    const fin = DB.get('finance');
    const tbody = document.querySelector('#table-finance tbody');
    const container = document.getElementById('mod-finance');
    let total = 0;
    
    if (fin.length === 0) {
        tbody.innerHTML = '';
        if (!container.querySelector('.empty-state')) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.innerHTML = '<i class="fa-solid fa-chart-line"></i><span>SCANNING_LEDGER... NO_TRANSACTIONS_LOGGED</span>';
            container.appendChild(empty);
        }
    } else {
        const existingEmpty = container.querySelector('.empty-state');
        if (existingEmpty) existingEmpty.remove();
        tbody.innerHTML = fin.map(f => {
            if(f.type === 'income') total += f.val;
            return `
            <tr>
                <td style="font-family:var(--font-mono)">${f.date}</td>
                <td>${f.desc}</td>
                <td style="color:${f.type === 'income' ? 'var(--neon-cyan)' : 'var(--neon-pink)'}; font-weight:bold; font-family:var(--font-mono)">
                    ${f.type === 'income' ? '+' : '-'} R$ ${f.val.toLocaleString('pt-BR')}
                </td>
                <td><button class="btn btn-ghost btn-sm" onclick="editTrans('${f.id}')"><i class="fa-solid fa-terminal"></i></button></td>
            </tr>
        `}).join('');
    }
    document.getElementById('st-income').innerText = `R$ ${total.toLocaleString('pt-BR')}`;
}

// 5. PROVIDERS
document.getElementById('prov-type-person').onchange = (e) => {
    document.getElementById('label-doc').innerText = e.target.value === 'pf' ? 'CPF' : 'CNPJ';
};

document.getElementById('provider-form-el').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('prov-id').value;
    const providers = DB.get('providers');
    const pInput = document.getElementById('prov-photo');
    let photo = '';
    if(pInput.files[0]) photo = await toBase64(pInput.files[0]);
    else if(id) photo = providers.find(p => p.id === id).photo;

    const data = {
        id: id || Date.now().toString(),
        typePerson: document.getElementById('prov-type-person').value,
        doc: document.getElementById('prov-doc').value,
        name: document.getElementById('prov-name').value,
        skill: document.getElementById('prov-skill').value,
        email: document.getElementById('prov-email').value,
        address: document.getElementById('prov-address').value,
        responsible: document.getElementById('prov-resp').value,
        photo: photo
    };
    if(id) providers[providers.findIndex(p => p.id === id)] = data;
    else providers.push(data);
    DB.set('providers', providers);
    DB.log(`Parceria estabelecida/atualizada: ${data.name}`);
    renderProviders();
    document.getElementById('form-provider').classList.remove('active');
}

function renderProviders() {
    const p = DB.get('providers');
    const grid = document.getElementById('providers-grid');
    const container = document.getElementById('mod-providers');
    
    if (p.length === 0) {
        grid.innerHTML = '';
        if (!container.querySelector('.empty-state')) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.innerHTML = '<i class="fa-solid fa-handshake"></i><span>SCANNING_NETWORK... NO_PARTNERS_MAPPED</span>';
            container.appendChild(empty);
        }
    } else {
        const existingEmpty = container.querySelector('.empty-state');
        if (existingEmpty) existingEmpty.remove();
        grid.innerHTML = p.map(p => `
            <div class="stat-card">
                <div style="display:flex;gap:15px;align-items:center">
                    <img src="${p.photo || '../imgs/logo-state.png'}" style="width:50px;height:50px;border-radius:4px;border:1px solid var(--neon-cyan)">
                    <div>
                        <h4 style="margin:0">${p.name}</h4>
                        <span style="font-size:0.6rem;color:var(--neon-cyan);font-family:var(--font-mono)">[${p.skill}]</span>
                    </div>
                </div>
                <div style="margin-top:20px">
                    <button class="btn btn-ghost btn-sm" style="width:100%" onclick="viewProvider('${p.id}')">INTERFACE_DATA</button>
                </div>
            </div>
        `).join('');
    }
    updateSelectors();
}

// 6. GALLERY
document.getElementById('gallery-form-el').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('gal-id').value;
    const gallery = DB.get('gallery');
    const pInput = document.getElementById('gal-file');
    let photo = '';
    if(pInput.files[0]) photo = await toBase64(pInput.files[0]);
    else if(id) photo = gallery.find(x => x.id === id).photo;

    const providerId = document.getElementById('gal-prov-select').value;
    const provider = DB.get('providers').find(p => p.id === providerId);

    const data = {
        id: id || Date.now().toString(),
        title: document.getElementById('gal-title').value,
        sub: document.getElementById('gal-sub').value,
        photo: photo,
        providerAvatar: provider ? provider.photo : ''
    };
    if(id) gallery[gallery.findIndex(x => x.id === id)] = data;
    else gallery.push(data);
    DB.set('gallery', gallery);
    DB.log(`Mídia publicada: ${data.title}`);
    renderGallery();
}

function renderGallery() {
    const gallery = DB.get('gallery');
    const list = document.getElementById('gallery-list');
    const container = document.getElementById('mod-gallery');
    
    if (gallery.length === 0) {
        list.innerHTML = '';
        if (!container.querySelector('.empty-state')) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.innerHTML = '<i class="fa-solid fa-images"></i><span>SCANNING_MEDIA... NO_PUBLICATIONS_SYNCED</span>';
            container.appendChild(empty);
        }
    } else {
        const existingEmpty = container.querySelector('.empty-state');
        if (existingEmpty) existingEmpty.remove();
        list.innerHTML = gallery.map(g => `
            <div class="photo-card" style="border:1px solid var(--cyber-border)">
                <img src="${g.photo}" class="photo-img">
                <div style="padding:15px">
                    <div style="display:flex;justify-content:space-between">
                        <div>
                            <h4 style="margin:0">${g.title}</h4>
                            <p style="font-size:0.7rem;color:var(--dash-text-dim)">${g.sub}</p>
                        </div>
                    </div>
                    <div style="margin-top:15px;display:flex;gap:5px">
                        <button class="btn btn-ghost btn-sm" onclick="editGallery('${g.id}')"><i class="fa-solid fa-terminal"></i></button>
                        <button class="btn btn-danger btn-sm" onclick="deleteItem('gallery', '${g.id}', renderGallery)"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

// --- STATS & LOGS ---
function renderLogs() {
    const logs = DB.get('logs');
    document.getElementById('recent-logs').innerHTML = logs.map(l => `
        <div style="margin-bottom:10px; font-family:var(--font-mono); border-left:1px solid var(--cyber-border); padding-left:10px">
            <span style="color:var(--neon-cyan)">[${l.time}]</span> ${l.msg}
        </div>
    `).join('');
}

function updateStats() {
    document.getElementById('st-projects').innerText = DB.get('projects').length;
    document.getElementById('st-clients').innerText = DB.get('clients').length;
    document.getElementById('st-alerts').innerText = DB.get('low_stock_count', 0);
}

function updateSelectors() {
    const cs = DB.get('clients');
    const ps = DB.get('providers');
    
    document.getElementById('project-client-select').innerHTML = '<option value="">CLIENT_SELECTION</option>' + cs.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    document.getElementById('project-provider-select').innerHTML = '<option value="">PARTNER_SELECTION</option>' + ps.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    document.getElementById('gal-prov-select').innerHTML = '<option value="">PARTNER_SYNC</option>' + ps.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
}

window.deleteItem = (key, id, callback) => {
    if (confirm('CONFIRMAR EXCLUSÃO DE DADOS?')) {
        let items = DB.get(key);
        items = items.filter(x => x.id !== id);
        DB.set(key, items);
        DB.log(`Registro removido permanentemente.`);
        callback();
    }
};

// --- AI ASYNC LOGIC (Grok V4 Integration) ---
const aiToggle = document.getElementById('ai-toggle-btn');
const aiPanel = document.getElementById('ai-panel');
const aiMsgs = document.getElementById('ai-msgs');
const aiInput = document.getElementById('ai-input');

aiToggle.onclick = () => aiPanel.classList.toggle('active');

async function askAI() {
    const msg = aiInput.value.trim();
    if(!msg) return;

    appendMsg('user', msg);
    aiInput.value = '';

    const botMsg = appendMsg('bot', 'SCANNING_DATA...');
    
    try {
        const res = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROK_KEY}`
            },
            body: JSON.stringify({
                model: 'grok-beta',
                messages: [
                    { role: 'system', content: 'Você é a STATE_OS CORE, a inteligência central da MARCERARIA STATE. Responda em tom técnico, eficiente e futurista.' },
                    { role: 'user', content: msg }
                ]
            })
        });
        const data = await res.json();
        const fullText = data.choices[0].message.content;
        botMsg.innerText = '';
        botMsg.classList.add('typing-cursor');
        
        let i = 0;
        const speed = 20;
        function type() {
            if (i < fullText.length) {
                botMsg.innerText += fullText.charAt(i);
                i++;
                aiMsgs.scrollTop = aiMsgs.scrollHeight;
                setTimeout(type, speed);
            } else {
                botMsg.classList.remove('typing-cursor');
            }
        }
        type();
        
    } catch(e) {
        botMsg.innerText = 'ERRO NA MATRIZ DE CONEXÃO. VERIFIQUE STATUS DO SERVIDOR.';
    }
}

function appendMsg(role, text) {
    const div = document.createElement('div');
    div.className = `msg msg-${role}`;
    div.innerText = text;
    aiMsgs.appendChild(div);
    aiMsgs.scrollTop = aiMsgs.scrollHeight;
    return div;
}

document.getElementById('ai-send').onclick = askAI;

// --- INITIALIZATION ---
window.onload = () => {
    if (localStorage.getItem('state_admin_session') !== 'active') {
        window.location.href = 'login.html';
        return;
    }

    flatpickr(".datepicker", { locale: "pt", dateFormat: "Y-m-d", theme: "dark" });
    document.getElementById('grok-key').value = GROK_KEY;

    renderClients();
    renderProjects();
    renderInventory();
    renderFinance();
    renderProviders();
    renderGallery();
    renderLogs();
    
    DB.log('INITIALIZING_STATE_OS_V4.0... SYSTEM_READY.');
};
