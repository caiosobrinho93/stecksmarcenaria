/**
 * State Console - Core Logic (v3.0 Modular)
 * Handles: Nav, CRUD, AI Chat, Gallery Sync, Modals
 */

// --- 1. CONFIG & DB HELPERS ---
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
        DB.set('logs', logs.slice(0, 20));
        renderLogs();
    }
};

// --- 2. NAVIGATION & UI UI STATE ---
const navLinks = document.querySelectorAll('.nav-link[data-mod]');
const sections = document.querySelectorAll('.module-section');
const modNameDisplay = document.getElementById('current-mod-name');

function switchModule(modId) {
    sections.forEach(s => s.classList.remove('active'));
    navLinks.forEach(l => l.classList.remove('active'));

    const target = document.getElementById('mod-' + modId);
    const link = document.querySelector(`.nav-link[data-mod="${modId}"]`);
    
    if (target && link) {
        target.classList.add('active');
        link.classList.add('active');
        modNameDisplay.innerText = link.querySelector('span').innerText;
    }
}

navLinks.forEach(link => {
    link.addEventListener('click', () => switchModule(link.dataset.mod));
});

// Logout
document.getElementById('logout-trigger').addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Encerrar sessão administrativa?')) {
        localStorage.removeItem('state_admin_session');
        window.location.href = 'login.html';
    }
});

// --- 3. COMMON UTILS ---
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

function showModal(content) {
    const modal = document.getElementById('generic-modal');
    document.getElementById('modal-content').innerHTML = content;
    modal.style.display = 'flex';
}

document.getElementById('modal-close').onclick = () => {
    document.getElementById('generic-modal').style.display = 'none';
};

// --- 4. MODULES LOGIC ---

// --- 4.1 CLIENTS ---
const clientForm = document.getElementById('client-form-el');
const clientToggle = document.getElementById('btn-add-client-toggle');
const clientCancel = document.getElementById('btn-client-cancel');

clientToggle.onclick = () => {
    document.getElementById('form-client').classList.toggle('active');
    clientForm.reset();
    document.getElementById('client-id').value = '';
    document.getElementById('client-form-title').innerText = 'Adicionar Novo Cliente';
};

clientCancel.onclick = () => document.getElementById('form-client').classList.remove('active');

clientForm.onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('client-id').value;
    const clients = DB.get('clients');
    const photoInput = document.getElementById('client-photo');
    let photo = '';
    
    if (photoInput.files[0]) {
        photo = await toBase64(photoInput.files[0]);
    }

    const data = {
        id: id || Date.now().toString(),
        name: document.getElementById('client-name').value,
        email: document.getElementById('client-email').value,
        phone: document.getElementById('client-phone').value,
        address: document.getElementById('client-address').value,
        photo: photo || (id ? clients.find(c => c.id === id).photo : '')
    };

    if (id) {
        const index = clients.findIndex(c => c.id === id);
        clients[index] = data;
        DB.log(`Cliente atualizado: ${data.name}`);
    } else {
        clients.push(data);
        DB.log(`Novo cliente cadastrado: ${data.name}`);
    }

    DB.set('clients', clients);
    renderClients();
    clientForm.reset();
    document.getElementById('form-client').classList.remove('active');
};

function renderClients() {
    const clients = DB.get('clients');
    const tbody = document.querySelector('#table-clients tbody');
    tbody.innerHTML = '';
    
    clients.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><div class="avatar-circle" style="width: 30px; height: 30px; font-size: 0.7rem; border-color: rgba(255,255,255,0.1); overflow: hidden;">
                ${c.photo ? `<img src="${c.photo}" style="width:100%;height:100%;object-fit:cover;">` : '<i class="fa-solid fa-user"></i>'}
            </div></td>
            <td><strong style="cursor:pointer; color: var(--dash-accent);" onclick="viewClient('${c.id}')">${c.name}</strong></td>
            <td style="font-size: 0.8rem; color: var(--dash-text-dim);">${c.phone}</td>
            <td>
                <button class="btn btn-ghost btn-sm" onclick="editClient('${c.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-danger btn-sm" onclick="deleteItem('clients', '${c.id}', renderClients)"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    updateStats();
    updateSelectors();
}

window.viewClient = (id) => {
    const c = DB.get('clients').find(x => x.id === id);
    showModal(`
        <div style="display: flex; gap: 30px; align-items: center;">
            <div style="width: 150px; height: 150px; border-radius: 50%; border: 2px solid var(--dash-accent); overflow: hidden; background: #000;">
                <img src="${c.photo || '../imgs/logo-state.png'}" style="width:100%; height:100%; object-fit: cover;">
            </div>
            <div>
                <h2 class="font-head" style="color: var(--dash-accent); margin-bottom: 5px;">${c.name}</h2>
                <p style="color: var(--dash-text-dim); font-size: 0.9rem;"><i class="fa-solid fa-envelope"></i> ${c.email || 'N/A'}</p>
                <p style="color: var(--dash-text-dim); font-size: 0.9rem;"><i class="fa-solid fa-phone"></i> ${c.phone}</p>
                <p style="color: var(--dash-text-dim); font-size: 0.9rem; margin-top: 10px;"><i class="fa-solid fa-location-dot"></i> ${c.address || 'N/A'}</p>
            </div>
        </div>
    `);
};

window.editClient = (id) => {
    const c = DB.get('clients').find(x => x.id === id);
    document.getElementById('form-client').classList.add('active');
    document.getElementById('client-id').value = c.id;
    document.getElementById('client-name').value = c.name;
    document.getElementById('client-email').value = c.email;
    document.getElementById('client-phone').value = c.phone;
    document.getElementById('client-address').value = c.address;
    document.getElementById('client-form-title').innerText = 'Editar Cliente';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// --- 4.2 PROJECTS ---
const projectForm = document.getElementById('project-form-el');
const projectToggle = document.getElementById('btn-add-project-toggle');
const projectCancel = document.getElementById('btn-project-cancel');

projectToggle.onclick = () => {
    document.getElementById('form-project').classList.toggle('active');
    projectForm.reset();
    document.getElementById('project-id').value = '';
    document.getElementById('project-form-title').innerText = 'Configurar Novo Projeto';
};

projectCancel.onclick = () => document.getElementById('form-project').classList.remove('active');

projectForm.onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('project-id').value;
    const projects = DB.get('projects');
    const imgFiles = document.getElementById('project-imgs').files;
    let images = [];
    
    if (imgFiles.length > 0) {
        for (let file of imgFiles) {
            images.push(await toBase64(file));
        }
    }

    const data = {
        id: id || Date.now().toString(),
        title: document.getElementById('project-title').value,
        client: document.getElementById('project-client-select').value,
        provider: document.getElementById('project-provider-select').value,
        status: document.getElementById('project-status').value,
        images: images.length > 0 ? images : (id ? projects.find(p => p.id === id).images : [])
    };

    if (id) {
        const index = projects.findIndex(p => p.id === id);
        projects[index] = data;
        DB.log(`Projeto atualizado: ${data.title}`);
    } else {
        projects.push(data);
        DB.log(`Novo projeto iniciado: ${data.title}`);
    }

    DB.set('projects', projects);
    renderProjects();
    projectForm.reset();
    document.getElementById('form-project').classList.remove('active');
};

function renderProjects() {
    const projects = DB.get('projects');
    const tbody = document.querySelector('#table-projects tbody');
    tbody.innerHTML = '';
    
    projects.forEach(p => {
        let statusClass = 'badge-working';
        let statusText = 'Em Obra';
        if (p.status === 'done') { statusClass = 'badge-done'; statusText = 'Concluído'; }
        else if (p.status === 'paused') { statusClass = 'badge-paused'; statusText = 'Pausado'; }
        else if (p.status === 'planning') { statusText = 'Planejamento'; }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong style="cursor:pointer; color: var(--dash-accent);" onclick="viewProject('${p.id}')">${p.title}</strong></td>
            <td style="font-size: 0.8rem;">${p.client}</td>
            <td><span class="badge ${statusClass}">${statusText}</span></td>
            <td>
                <button class="btn btn-ghost btn-sm" onclick="editProject('${p.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-danger btn-sm" onclick="deleteItem('projects', '${p.id}', renderProjects)"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    updateStats();
}

window.viewProject = (id) => {
    const p = DB.get('projects').find(x => x.id === id);
    const imgGrid = p.images.map(img => `<img src="${img}" style="width:100%; border-radius:8px; border: 1px solid var(--dash-border);">`).join('');
    showModal(`
        <h2 class="font-head" style="margin-bottom: 20px; color: var(--dash-accent);">${p.title}</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
            <div>
                <p style="color: var(--dash-text-dim);"><strong>Cliente:</strong> ${p.client}</p>
                <p style="color: var(--dash-text-dim);"><strong>Parceiro:</strong> ${p.provider || 'Não definido'}</p>
                <p style="color: var(--dash-text-dim);"><strong>Status:</strong> ${p.status.toUpperCase()}</p>
            </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
            ${imgGrid || '<p style="grid-column: span 3; color: var(--dash-text-dim);">Nenhuma imagem anexada.</p>'}
        </div>
    `);
};

window.editProject = (id) => {
    const p = DB.get('projects').find(x => x.id === id);
    document.getElementById('form-project').classList.add('active');
    document.getElementById('project-id').value = p.id;
    document.getElementById('project-title').value = p.title;
    document.getElementById('project-client-select').value = p.client;
    document.getElementById('project-provider-select').value = p.provider;
    document.getElementById('project-status').value = p.status;
    document.getElementById('project-form-title').innerText = 'Editar Projeto';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// --- 4.3 INVENTORY ---
const inventoryForm = document.getElementById('inventory-form-el');
const invToggle = document.getElementById('btn-add-item-toggle');
const invCancel = document.getElementById('btn-item-cancel');

invToggle.onclick = () => {
    document.getElementById('form-inventory').classList.toggle('active');
    inventoryForm.reset();
    document.getElementById('item-id').value = '';
    document.getElementById('inventory-form-title').innerText = 'Cadastrar Material';
};

invCancel.onclick = () => document.getElementById('form-inventory').classList.remove('active');

inventoryForm.onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('item-id').value;
    const inventory = DB.get('inventory');
    const photoInput = document.getElementById('item-photo');
    let photo = '';
    
    if (photoInput.files[0]) {
        photo = await toBase64(photoInput.files[0]);
    }

    const data = {
        id: id || Date.now().toString(),
        name: document.getElementById('item-name').value,
        qty: parseInt(document.getElementById('item-qty').value),
        min: parseInt(document.getElementById('item-min').value),
        photo: photo || (id ? inventory.find(i => i.id === id).photo : '')
    };

    if (id) {
        const index = inventory.findIndex(i => i.id === id);
        inventory[index] = data;
        DB.log(`Estoque atualizado: ${data.name}`);
    } else {
        inventory.push(data);
        DB.log(`Novo item no estoque: ${data.name}`);
    }

    DB.set('inventory', inventory);
    renderInventory();
    inventoryForm.reset();
    document.getElementById('form-inventory').classList.remove('active');
};

function renderInventory() {
    const inventory = DB.get('inventory');
    const tbody = document.querySelector('#table-inventory tbody');
    tbody.innerHTML = '';
    
    let alerts = 0;
    inventory.forEach(i => {
        const isLow = i.qty <= i.min;
        if (isLow) alerts++;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong style="cursor:pointer; color: ${isLow ? '#ef4444' : 'var(--dash-text-main)'}" onclick="viewItem('${i.id}')">${i.name}</strong></td>
            <td>${i.qty}</td>
            <td><span class="badge ${isLow ? 'badge-paused' : 'badge-done'}">${isLow ? 'ALERTA_MÍNIMO' : 'ESTOQUE_OK'}</span></td>
            <td>
                <button class="btn btn-ghost btn-sm" onclick="editItem('${i.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-danger btn-sm" onclick="deleteItem('inventory', '${i.id}', renderInventory)"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    DB.set('low_stock_count', alerts);
    updateStats();
}

window.viewItem = (id) => {
    const i = DB.get('inventory').find(x => x.id === id);
    showModal(`
        <div style="display: flex; gap: 30px; align-items: flex-start;">
            <div style="width: 200px; height: 200px; border-radius: 8px; border: 1px solid var(--dash-border); overflow: hidden; background: #000;">
                <img src="${i.photo || '../imgs/wood_texture.png'}" style="width:100%; height:100%; object-fit: cover;">
            </div>
            <div>
                <h2 class="font-head" style="color: var(--dash-accent); margin-bottom: 15px;">${i.name}</h2>
                <div class="stat-val" style="font-size: 1.5rem;">Qtd: ${i.qty}</div>
                <p style="color: var(--dash-text-dim);">Nível de alerta: ${i.min}</p>
                <div style="margin-top: 20px; padding: 10px; border-radius: 4px; background: rgba(255,255,255,0.05);">
                    ${i.qty <= i.min ? '<span style="color: #ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> ABAIXO DO MÍNIMO ESTIPULADO</span>' : '<span style="color: #22c55e;"><i class="fa-solid fa-check-circle"></i> ESTOQUE SAUDÁVEL</span>'}
                </div>
            </div>
        </div>
    `);
};

window.editItem = (id) => {
    const i = DB.get('inventory').find(x => x.id === id);
    document.getElementById('form-inventory').classList.add('active');
    document.getElementById('item-id').value = i.id;
    document.getElementById('item-name').value = i.name;
    document.getElementById('item-qty').value = i.qty;
    document.getElementById('item-min').value = i.min;
    document.getElementById('inventory-form-title').innerText = 'Editar Material';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// --- 4.4 FINANCE ---
const financeForm = document.getElementById('finance-form-el');
const finToggle = document.getElementById('btn-add-trans-toggle');
const finCancel = document.getElementById('btn-trans-cancel');

// Set today button
document.getElementById('btn-set-today').onclick = () => {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('trans-date')._flatpickr.setDate(today);
};

finToggle.onclick = () => {
    document.getElementById('form-finance').classList.toggle('active');
    financeForm.reset();
    document.getElementById('trans-id').value = '';
    document.getElementById('finance-form-title').innerText = 'Lançar Movimentação';
};

finCancel.onclick = () => document.getElementById('form-finance').classList.remove('active');

financeForm.onsubmit = (e) => {
    e.preventDefault();
    const id = document.getElementById('trans-id').value;
    const finance = DB.get('finance');

    const data = {
        id: id || Date.now().toString(),
        type: document.getElementById('trans-type').value,
        val: parseFloat(document.getElementById('trans-val').value),
        desc: document.getElementById('trans-desc').value,
        date: document.getElementById('trans-date').value
    };

    if (id) {
        const index = finance.findIndex(f => f.id === id);
        finance[index] = data;
        DB.log(`Finança atualizada: ${data.desc}`);
    } else {
        finance.push(data);
        DB.log(`Novo lançamento financeiro: ${data.desc}`);
    }

    DB.set('finance', finance);
    renderFinance();
    financeForm.reset();
    document.getElementById('form-finance').classList.remove('active');
};

function renderFinance() {
    const finance = DB.get('finance');
    const tbody = document.querySelector('#table-finance tbody');
    tbody.innerHTML = '';
    
    let totalIncome = 0;
    finance.forEach(f => {
        if (f.type === 'income') totalIncome += f.val;
        else totalIncome -= 0; // for income stat purposes we might just want to show sum of income in stats

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-family: monospace;">${f.date}</td>
            <td style="cursor:pointer;" onclick="viewTrans('${f.id}')">${f.desc}</td>
            <td style="color: ${f.type === 'income' ? '#22c55e' : '#ef4444'}; font-weight: 700;">
                ${f.type === 'income' ? '+' : '-'} R$ ${f.val.toLocaleString('pt-BR')}
            </td>
            <td>
                <button class="btn btn-ghost btn-sm" onclick="editTrans('${f.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-danger btn-sm" onclick="deleteItem('finance', '${f.id}', renderFinance)"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    // Update income stat based on current month (demo logic)
    document.getElementById('st-income').innerText = `R$ ${totalIncome.toLocaleString('pt-BR')}`;
    updateStats();
}

window.viewTrans = (id) => {
    const f = DB.get('finance').find(x => x.id === id);
    showModal(`
        <h3 class="font-head" style="margin-bottom: 20px;">Detalhes do Lançamento</h3>
        <div style="background: rgba(0,0,0,0.2); padding: 20px; border-radius: 8px; border: 1px solid var(--dash-border);">
            <p><strong>Descrição:</strong> ${f.desc}</p>
            <p><strong>Tipo:</strong> ${f.type === 'income' ? 'Entrada (Recebimento)' : 'Saída (Pagamento)'}</p>
            <p><strong>Data:</strong> ${f.date}</p>
            <h2 style="color: ${f.type === 'income' ? '#22c55e' : '#ef4444'}; margin-top: 15px;">R$ ${f.val.toLocaleString('pt-BR')}</h2>
        </div>
    `);
};

window.editTrans = (id) => {
    const f = DB.get('finance').find(x => x.id === id);
    document.getElementById('form-finance').classList.add('active');
    document.getElementById('trans-id').value = f.id;
    document.getElementById('trans-type').value = f.type;
    document.getElementById('trans-val').value = f.val;
    document.getElementById('trans-desc').value = f.desc;
    document.getElementById('trans-date')._flatpickr.setDate(f.date);
    document.getElementById('finance-form-title').innerText = 'Editar Movimentação';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// --- 4.5 PROVIDERS ---
const providerForm = document.getElementById('provider-form-el');
const provToggle = document.getElementById('btn-add-prov-toggle');
const provCancel = document.getElementById('btn-prov-cancel');

provToggle.onclick = () => {
    document.getElementById('form-provider').classList.toggle('active');
    providerForm.reset();
    document.getElementById('prov-id').value = '';
    document.getElementById('provider-form-title').innerText = 'Cadastrar Parceiro';
};

provCancel.onclick = () => document.getElementById('form-provider').classList.remove('active');

document.getElementById('prov-type-person').onchange = (e) => {
    document.getElementById('label-doc').innerText = e.target.value === 'pf' ? 'CPF' : 'CNPJ';
    document.getElementById('prov-doc').placeholder = e.target.value === 'pf' ? '000.000.000-00' : '00.000.000/0000-00';
};

providerForm.onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('prov-id').value;
    const providers = DB.get('providers');
    const photoInput = document.getElementById('prov-photo');
    let photo = '';
    
    if (photoInput.files[0]) {
        photo = await toBase64(photoInput.files[0]);
    }

    const data = {
        id: id || Date.now().toString(),
        typePerson: document.getElementById('prov-type-person').value,
        doc: document.getElementById('prov-doc').value,
        name: document.getElementById('prov-name').value,
        skill: document.getElementById('prov-skill').value,
        email: document.getElementById('prov-email').value,
        address: document.getElementById('prov-address').value,
        responsible: document.getElementById('prov-resp').value,
        photo: photo || (id ? providers.find(p => p.id === id).photo : '')
    };

    if (id) {
        const index = providers.findIndex(p => p.id === id);
        providers[index] = data;
        DB.log(`Parceiro atualizado: ${data.name}`);
    } else {
        providers.push(data);
        DB.log(`Novo parceiro adicionado: ${data.name}`);
    }

    DB.set('providers', providers);
    renderProviders();
    providerForm.reset();
    document.getElementById('form-provider').classList.remove('active');
};

function renderProviders() {
    const providers = DB.get('providers');
    const grid = document.getElementById('providers-grid');
    grid.innerHTML = '';
    
    providers.forEach(p => {
        const card = document.createElement('div');
        card.className = 'stat-card';
        card.innerHTML = `
            <div style="display: flex; gap: 15px; align-items: center; margin-bottom: 15px;">
                <div class="avatar-circle" style="width: 50px; height: 50px; overflow: hidden; border-color: rgba(255,255,255,0.05);">
                    <img src="${p.photo || '../imgs/logo-state.png'}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div>
                    <h4 style="margin:0;">${p.name}</h4>
                    <span style="font-size: 0.7rem; color: var(--dash-accent); text-transform: uppercase;">${p.skill}</span>
                </div>
            </div>
            <div style="font-size: 0.8rem; color: var(--dash-text-dim);">
                <p><i class="fa-solid fa-id-card"></i> ${p.doc}</p>
                <p><i class="fa-solid fa-envelope"></i> ${p.email || 'N/A'}</p>
            </div>
            <div style="margin-top: 15px; display: flex; gap: 10px;">
                <button class="btn btn-ghost btn-sm" style="flex:1" onclick="viewProvider('${p.id}')">Ver Ficha</button>
                <button class="btn btn-danger btn-sm" onclick="deleteItem('providers', '${p.id}', renderProviders)"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        grid.appendChild(card);
    });
    updateSelectors();
}

window.viewProvider = (id) => {
    const p = DB.get('providers').find(x => x.id === id);
    showModal(`
        <div style="text-align: center; margin-bottom: 20px;">
            <img src="${p.photo || '../imgs/logo-state.png'}" style="width: 120px; height: 120px; border-radius: 50%; border: 2px solid var(--dash-accent); padding: 5px;">
            <h2 class="font-head" style="margin-top: 10px;">${p.name}</h2>
            <span class="badge badge-working">${p.skill}</span>
        </div>
        <div style="background: var(--dash-surface-light); padding: 20px; border-radius: 8px; font-size: 0.95rem;">
            <p><strong>Tipo:</strong> ${p.typePerson.toUpperCase()}</p>
            <p><strong>Documento:</strong> ${p.doc}</p>
            <p><strong>Responsável:</strong> ${p.responsible || 'N/A'}</p>
            <p><strong>Email:</strong> ${p.email || 'N/A'}</p>
            <p><strong>Endereço:</strong> ${p.address || 'Não informado'}</p>
        </div>
        <div style="margin-top: 20px; text-align: center;">
            <button class="btn btn-ghost" onclick="editProvider('${p.id}')"><i class="fa-solid fa-pen"></i> Editar Dados</button>
        </div>
    `);
};

window.editProvider = (id) => {
    const p = DB.get('providers').find(x => x.id === id);
    document.getElementById('form-provider').classList.add('active');
    document.getElementById('prov-id').value = p.id;
    document.getElementById('prov-type-person').value = p.typePerson;
    document.getElementById('prov-doc').value = p.doc;
    document.getElementById('prov-name').value = p.name;
    document.getElementById('prov-skill').value = p.skill;
    document.getElementById('prov-email').value = p.email;
    document.getElementById('prov-address').value = p.address;
    document.getElementById('prov-resp').value = p.responsible;
    document.getElementById('provider-form-title').innerText = 'Editar Parceiro';
    document.getElementById('generic-modal').style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// --- 4.6 GALLERY ---
const galleryForm = document.getElementById('gallery-form-el');

galleryForm.onsubmit = async (e) => {
    e.preventDefault();
    const gallery = DB.get('gallery');
    const fileInput = document.getElementById('gal-file');
    const id = document.getElementById('gal-id').value;
    
    let photo = '';
    if (fileInput.files[0]) {
        photo = await toBase64(fileInput.files[0]);
    } else if (id) {
        photo = gallery.find(x => x.id === id).photo;
    }

    const providerId = document.getElementById('gal-prov-select').value;
    const provider = DB.get('providers').find(p => p.id === providerId);

    const data = {
        id: id || Date.now().toString(),
        title: document.getElementById('gal-title').value,
        sub: document.getElementById('gal-sub').value,
        photo: photo,
        providerAvatar: provider ? provider.photo : ''
    };

    if (id) {
        const index = gallery.findIndex(x => x.id === id);
        gallery[index] = data;
        DB.log(`Imagem atualizada na galeria: ${data.title}`);
    } else {
        gallery.push(data);
        DB.log(`Nova imagem publicada: ${data.title}`);
    }

    DB.set('gallery', gallery);
    renderGallery();
    galleryForm.reset();
};

async function renderGallery() {
    const gallery = DB.get('gallery');
    const list = document.getElementById('gallery-list');
    list.innerHTML = '';
    
    // Sync with static index.html if first load (Bonus logic)
    if (gallery.length === 0) {
        // Here we could fetch index.html, but for this local demo let's assume we maintain our own DB
        // If we want real sync, we fetch and parse, but localStorage is safer for "managing" it.
    }

    gallery.forEach((g, index) => {
        const card = document.createElement('div');
        card.className = 'photo-card';
        card.innerHTML = `
            <img src="${g.photo}" class="photo-img">
            <div style="padding: 10px;">
                <div style="display:flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h4 style="font-size: 0.9rem; margin:0;">${g.title}</h4>
                        <p style="font-size: 0.7rem; color: var(--dash-text-dim);">${g.sub}</p>
                    </div>
                    ${g.providerAvatar ? `<img src="${g.providerAvatar}" style="width: 25px; height: 25px; border-radius: 50%; border: 1px solid var(--dash-accent);">` : ''}
                </div>
                <div style="margin-top: 10px; display: flex; gap: 5px;">
                    <button class="btn btn-ghost btn-sm" onclick="editGallery('${g.id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="deleteItem('gallery', '${g.id}', renderGallery)"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
        list.appendChild(card);
    });
}

window.editGallery = (id) => {
    const g = DB.get('gallery').find(x => x.id === id);
    document.getElementById('gal-id').value = g.id;
    document.getElementById('gal-title').value = g.title;
    document.getElementById('gal-sub').value = g.sub;
    document.getElementById('gal-file').required = false;
    document.getElementById('btn-gal-submit').innerText = 'Atualizar publicação';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// --- 5. LOGS & STATS & SELECTORS ---
function renderLogs() {
    const logs = DB.get('logs', []);
    const container = document.getElementById('recent-logs');
    container.innerHTML = logs.map(l => `<div style="margin-bottom: 8px;">[${l.time}] ${l.msg}</div>`).join('');
}

function updateStats() {
    document.getElementById('st-projects').innerText = DB.get('projects').filter(p => p.status !== 'done').length;
    document.getElementById('st-clients').innerText = DB.get('clients').length;
    document.getElementById('st-alerts').innerText = DB.get('low_stock_count', 0);
}

function updateSelectors() {
    const clients = DB.get('clients');
    const providers = DB.get('providers');
    
    const clientSelects = ['project-client-select'];
    clientSelects.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = '<option value="">Selecione o Cliente</option>' + 
                clients.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        }
    });

    const provSelects = ['project-provider-select', 'gal-prov-select'];
    provSelects.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = '<option value="">Selecione o Parceiro</option>' + 
                providers.map(p => `<option value="${p.id}">${p.name} (${p.skill})</option>`).join('');
        }
    });
}

window.deleteItem = (key, id, callback) => {
    if (confirm('Confirmar exclusão definitiva do registro?')) {
        let items = DB.get(key);
        items = items.filter(x => x.id !== id);
        DB.set(key, items);
        DB.log(`Registro removido de ${key}`);
        callback();
    }
};

// --- 6. AI ASSISTANT (GROK) ---
const aiToggle = document.getElementById('ai-toggle-btn');
const aiPanel = document.getElementById('ai-panel');
const aiClose = document.getElementById('ai-close');
const aiSend = document.getElementById('ai-send');
const aiInput = document.getElementById('ai-input');
const aiMsgs = document.getElementById('ai-msgs');

aiToggle.onclick = () => aiPanel.classList.toggle('active');
aiClose.onclick = () => aiPanel.classList.remove('active');

aiSend.onclick = async () => {
    const msg = aiInput.value.trim();
    if (!msg) return;

    // Add user message
    const userDiv = document.createElement('div');
    userDiv.className = 'msg msg-user';
    userDiv.innerText = msg;
    aiMsgs.appendChild(userDiv);
    aiInput.value = '';
    aiMsgs.scrollTop = aiMsgs.scrollHeight;

    // AI Response placeholder/logic
    const botDiv = document.createElement('div');
    botDiv.className = 'msg msg-bot';
    botDiv.innerText = 'Processando análise estratégica...';
    aiMsgs.appendChild(botDiv);

    const apiKey = document.getElementById('grok-key').value;
    if (!apiKey) {
        setTimeout(() => botDiv.innerText = 'Por favor, insira uma chave API do Grok nas configurações do Dashboard para ativar minha inteligência real.', 1000);
        return;
    }

    try {
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'grok-beta',
                messages: [
                    { role: 'system', content: 'Você é um assistente de gestão para uma marcenaria de alto luxo chamada STATE MARCENARIA. Ajude o usuário com dúvidas sobre projetos, materiais e gestão.' },
                    { role: 'user', content: msg }
                ]
            })
        });
        const data = await response.json();
        botDiv.innerText = data.choices[0].message.content;
    } catch (err) {
        botDiv.innerText = 'Erro na conexão com o Grok. Verifique sua chave e internet.';
    }
    aiMsgs.scrollTop = aiMsgs.scrollHeight;
};

// --- 7. INITIALIZATION ---
window.onload = () => {
    // Auth Check
    if (localStorage.getItem('state_admin_session') !== 'active') {
        window.location.href = 'login.html';
        return;
    }

    // Init Datepicker
    flatpickr(".datepicker", {
        locale: "pt",
        dateFormat: "Y-m-d",
        theme: "dark"
    });

    // Save Grok Key on change
    document.getElementById('grok-key').value = localStorage.getItem('state_grok_key') || '';
    document.getElementById('grok-key').onchange = (e) => localStorage.setItem('state_grok_key', e.target.value);

    // Render All
    renderClients();
    renderProjects();
    renderInventory();
    renderFinance();
    renderProviders();
    renderGallery();
    renderLogs();
    
    DB.log('Sistema operacionalizado com sucesso.');
};
