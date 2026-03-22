/**
 * State Console V6.9 - FINAL STABILITY REBUILD
 * Reconstruído para corrigir navegação, salvamento de perfil sem reload e acesso ao Club.
 */

const DB_PREFIX = 'state_db_';
const DB = {
    _getAll: (key, defaultVal = []) => {
        try {
            const data = localStorage.getItem(DB_PREFIX + key);
            return data ? JSON.parse(data) : defaultVal;
        } catch(e) { console.error("DB Error", e); return defaultVal; }
    },
    get: (key, defaultVal = []) => {
        const all = DB._getAll(key, defaultVal);
        const currentUser = localStorage.getItem('state_current_user');
        if (!currentUser || currentUser === 'admin') return all;
        
        if (key === 'projects' || key === 'clients') {
            const groups = DB._getAll('groups', []);
            const myGroups = groups.filter(g => g.members && g.members.includes(currentUser) || g.leader === currentUser).map(g => g.id);
            return all.filter(x => x.owner === currentUser || !x.owner || (x.groupId && myGroups.includes(x.groupId)));
        }
        if (['finance', 'gallery', 'providers', 'inventory'].includes(key)) {
            return all.filter(x => x.owner === currentUser || !x.owner);
        }
        return all;
    },
    set: (key, val) => localStorage.setItem(DB_PREFIX + key, JSON.stringify(val)),
    checkSession: () => {
        const session = localStorage.getItem('state_admin_session');
        const user = localStorage.getItem('state_current_user');
        if (session !== 'active' || !user) {
            localStorage.removeItem('state_admin_session');
            localStorage.removeItem('state_current_user');
            sessionStorage.removeItem('clubstate_session');
            window.location.href = 'login.html';
        }
    },
    saveItem: (key, id, data) => {
        const all = DB._getAll(key);
        const currentUser = localStorage.getItem('state_current_user') || 'admin';
        if (!id) {
            data.id = Date.now().toString();
            data.owner = currentUser;
            all.push(data);
        } else {
            const idx = all.findIndex(x => x.id === id);
            if (idx > -1) {
                data.owner = all[idx].owner || currentUser;
                all[idx] = data;
            } else {
                data.owner = currentUser;
                all.push(data);
            }
        }
        DB.set(key, all);
    }
};

// --- Utilities ---
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

function notify(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    if(!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.cssText = `background:#161311; border-left:4px solid ${type === 'success' ? '#EAB308' : '#ff4d4d'}; padding:16px 24px; color:#F0EBE1; margin-bottom:10px; border-radius:4px; box-shadow:0 10px 40px rgba(0,0,0,0.8); font-size:0.9rem; z-index:9999; animation: slideIn 0.3s ease; transition:0.5s;`;
    toast.innerHTML = `<strong>INFO:</strong> ${msg}`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); }, 4000);
}

function previewImage(input, previewId) {
    if (input.files && input.files[0]) {
        toBase64(input.files[0]).then(base64 => {
            const preview = document.getElementById(previewId);
            if (preview) {
                preview.innerHTML = `<img src="${base64}" style="width:100%; height:100%; object-fit:cover;">`;
            }
        });
    }
}
window.previewImage = previewImage;

// --- Navigation ---
let navLinks, sections;
function switchModule(modId) {
    if(!sections || !navLinks) {
        navLinks = document.querySelectorAll('.nav-link[data-mod]');
        sections = document.querySelectorAll('.module-section');
    }
    sections.forEach(s => s.classList.remove('active'));
    navLinks.forEach(l => l.classList.remove('active'));

    const target = document.getElementById('mod-' + modId);
    const nav = document.querySelector(`.nav-link[data-mod="${modId}"]`);
    if(target) target.classList.add('active');
    if(nav) nav.classList.add('active');

    const span = nav?.querySelector('span');
    if(span && document.getElementById('current-mod-name')) {
        document.getElementById('current-mod-name').innerText = span.innerText.toUpperCase();
    }

    if(modId === 'home') renderDashboardHome();
    if(modId === 'clients') renderClients();
    if(modId === 'projects') renderProjects();
    if(modId === 'inventory') renderInventory();
    if(modId === 'finance') renderFinance();
    if(modId === 'providers') renderProviders();
    if(modId === 'gallery') renderGallery();
    if(modId === 'profile') loadProfile();
    if(modId === 'admsettings') renderAdminUsers();

    document.getElementById('sidebar')?.classList.remove('open');
}

function renderDashboardHome() {
    const revenueEl = document.getElementById('stat-revenue');
    const projectsEl = document.getElementById('stat-projects');
    const clientsEl = document.getElementById('stat-clients');
    const inventoryEl = document.getElementById('stat-inventory');
    const pendingEl = document.getElementById('stat-pending');
    const providersEl = document.getElementById('stat-providers');
    
    if(!revenueEl) return;

    const finance = DB.get('finance');
    const totalRev = finance.filter(f => f.type === 'in' && f.status === 'paid').reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);
    const totalPending = finance.filter(f => f.type === 'in' && f.status !== 'paid').reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);
    
    revenueEl.innerText = totalRev.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    pendingEl.innerText = totalPending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    const projects = DB.get('projects');
    projectsEl.innerText = projects.filter(p => parseInt(p.progress) < 100).length;

    const clients = DB.get('clients');
    clientsEl.innerText = clients.length;

    const inventory = DB.get('inventory');
    inventoryEl.innerText = inventory.length;

    const providers = DB.get('providers');
    providersEl.innerText = providers.length;
}

// --- Modals ---
function openModal(id) {
    const el = document.getElementById(id);
    if(el) el.style.display = 'flex';
}
function closeModal(id) {
    const el = document.getElementById(id);
    if(el) el.style.display = 'none';
}

// --- Handlers ---
function renderClients(filter = '') {
    const clients = DB.get('clients');
    const tbody = document.querySelector('#table-clients tbody');
    if(!tbody) return;
    const filtered = clients.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()));
    tbody.innerHTML = filtered.map(c => `
        <tr onclick="window.openClientDetail('${c.id}')" style="cursor:pointer;">
            <td>
                <div style="display:flex; align-items:center; gap:12px">
                    <div class="avatar" style="width:40px; height:40px;">${c.photo ? `<img src="${c.photo}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">` : c.name[0]}</div>
                    <strong style="color:var(--text-primary); text-transform:uppercase;">${c.name}</strong>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderProjects(filter = '') {
    const projects = DB.get('projects');
    const tbody = document.querySelector('#table-projects tbody');
    if(!tbody) return;
    const filtered = projects.filter(p => p.title.toLowerCase().includes(filter.toLowerCase()) || p.client.toLowerCase().includes(filter.toLowerCase()));
    tbody.innerHTML = filtered.map(p => `
        <tr onclick="window.openProjectDetail('${p.id}')" style="cursor:pointer;">
            <td>
                <div style="display:flex; align-items:center; gap:16px">
                    <div style="width:40px; height:40px; background:rgba(255,255,255,0.05); border-radius:50%; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                        ${(p.images && p.images[0]) ? `<img src="${p.images[0]}" style="width:100%;height:100%;object-fit:cover;">` : '<i class="fa-solid fa-drafting-dot" style="opacity:0.2;"></i>'}
                    </div>
                    <div><strong style="color:var(--brand-yellow); text-transform:uppercase;">${p.title}</strong><br><small style="color:var(--text-muted)">${p.client}</small></div>
                </div>
            </td>
        </tr>
    `).join('');
}

function openProjectDetail(id) {
    const projects = DB.get('projects');
    const p = projects.find(x => x.id === id);
    if (!p) return;
    document.getElementById('det-project-id').value = p.id;
    document.getElementById('det-project-title').innerText = p.title.toUpperCase();
    document.getElementById('det-project-client').innerText = p.client;
    document.getElementById('det-project-status').innerText = (p.status || 'Em Aberto').toUpperCase();
    document.getElementById('det-project-obs').innerText = p.obs || 'Nenhuma observação.';
    const container = document.getElementById('det-project-images');
    if(container) container.innerHTML = (p.images || []).map(img => `<div class="project-img-card"><img src="${img}" onclick="window.open('${img}')"></div>`).join('');
    openModal('modal-project-detail');
}
window.openProjectDetail = openProjectDetail;

function openClientDetail(id) {
    const clients = DB.get('clients');
    const c = clients.find(x => x.id === id);
    if (!c) return;
    document.getElementById('det-client-id').value = c.id;
    document.getElementById('det-client-name').innerText = c.name.toUpperCase();
    document.getElementById('det-client-phone').innerText = c.phone || 'Não informado';
    document.getElementById('det-client-insta').innerText = c.insta || 'Não informado';
    const photo = document.getElementById('det-client-photo');
    if(photo) { photo.src = c.photo || ''; photo.style.display = c.photo ? 'block' : 'none'; }
    const wa = document.getElementById('btn-wa-client');
    if(wa && c.phone) wa.onclick = () => window.open(`https://wa.me/55${c.phone.replace(/\D/g, '')}`);
    openModal('modal-client-detail');
}
window.openClientDetail = openClientDetail;

function deleteProjectFromDetail() {
    if(confirm('Tem certeza que deseja excluir o projeto?')) {
        const id = document.getElementById('det-project-id').value;
        const all = DB._getAll('projects');
        DB.set('projects', all.filter(x => x.id !== id));
        closeModal('modal-project-detail');
        renderProjects();
        notify('Projeto excluído com sucesso.', 'success');
    }
}
window.deleteProjectFromDetail = deleteProjectFromDetail;

function editProjectFromDetail() {
    const id = document.getElementById('det-project-id').value;
    closeModal('modal-project-detail');
    const projects = DB.get('projects');
    const p = projects.find(x => x.id === id);
    if(p) {
        document.getElementById('project-id').value = p.id;
        document.getElementById('project-title').value = p.title;
        document.getElementById('project-status').value = p.status || 'planejamento';
        document.getElementById('project-progress').value = p.progress || 0;
        document.getElementById('project-deadline').value = p.deadline || '';
        switchModule('form-project');
    }
}
window.editProjectFromDetail = editProjectFromDetail;

function deleteClientFromDetail() {
    if(confirm('Tem certeza que deseja excluir o cliente?')) {
        const id = document.getElementById('det-client-id').value;
        const all = DB._getAll('clients');
        DB.set('clients', all.filter(x => x.id !== id));
        closeModal('modal-client-detail');
        renderClients();
        notify('Cliente excluído com sucesso.', 'success');
    }
}
window.deleteClientFromDetail = deleteClientFromDetail;

function editClientFromDetail() {
    const id = document.getElementById('det-client-id').value;
    closeModal('modal-client-detail');
    const clients = DB.get('clients');
    const c = clients.find(x => x.id === id);
    if(c) {
        document.getElementById('client-id').value = c.id;
        document.getElementById('client-name').value = c.name;
        document.getElementById('client-phone').value = c.phone || '';
        document.getElementById('client-instagram').value = c.insta || '';
        document.getElementById('client-address').value = c.address || '';
        const preview = document.getElementById('photo-preview');
        if(preview && c.photo) preview.innerHTML = `<img src="${c.photo}" style="width:100%; height:100%; object-fit:cover;">`;
        switchModule('form-client');
    }
}
window.editClientFromDetail = editClientFromDetail;
window.editClientFromDetail = editClientFromDetail;


function renderInventory() {
    const items = DB.get('inventory');
    const container = document.getElementById('inventory-list');
    if(!container) return;
    container.innerHTML = items.map(i => `
        <div class="card" onclick="editInventoryItem('${i.id}')" style="cursor:pointer; border:1px solid rgba(255,255,255,0.05); transition:0.3s; padding:15px;">
            <div style="height:120px; background:rgba(255,255,255,0.03); overflow:hidden; border-radius:8px; margin-bottom:12px; display:flex; align-items:center; justify-content:center;">
                ${i.photo ? `<img src="${i.photo}" style="width:100%;height:100%;object-fit:cover">` : '<i class="fa-solid fa-box-open" style="font-size:2.5rem; opacity:0.1"></i>'}
            </div>
            <strong style="color:var(--brand-yellow); text-transform:uppercase; font-size:0.85rem; display:block; margin-bottom:5px;">${(i.name || 'Sem Especificação').toUpperCase()}</strong>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.75rem; opacity:0.5;">DISPONÍVEL:</span>
                <b style="color:#fff; font-size:1rem;">${i.qty || 0}</b>
            </div>
            <div style="margin-top:10px; border-top:1px solid rgba(255,255,255,0.05); padding-top:10px; text-align:right;">
                <button onclick="editInventoryItem('${i.id}')" style="background:transparent; border:none; color:var(--brand-yellow); font-size:0.75rem; cursor:pointer;"><i class="fa-solid fa-pen-to-square"></i> EDITAR</button>
            </div>
        </div>
    `).join('') || '<p style="text-align:center; padding:40px; opacity:0.5; grid-column:1/-1;">Nenhum material cadastrado.</p>';
}

function editInventoryItem(id) {
    const items = DB.get('inventory');
    const i = items.find(x => x.id === id);
    if(i) {
        document.getElementById('inventory-form-title').innerText = 'EDITAR MATERIAL';
        document.getElementById('item-id').value = i.id;
        document.getElementById('item-name').value = i.name || '';
        document.getElementById('item-qty').value = i.qty || 0;
        const preview = document.getElementById('item-photo-preview');
        if(preview && i.photo) preview.innerHTML = `<img src="${i.photo}" style="width:100%; height:100%; object-fit:cover;">`;
        switchModule('form-inventory');
    }
}
window.editInventoryItem = editInventoryItem;

function renderFinance() {
    const data = DB.get('finance');
    const tbody = document.querySelector('#table-finance tbody');
    if(!tbody) return;
    tbody.innerHTML = data.map(f => {
        const isPaid = f.status === 'paid';
        const typeStr = f.type === 'income' ? 'RECEBER' : 'PAGAR';
        const color = f.type === 'income' ? '#4ade80' : '#ef4444';
        const statusBtn = isPaid 
            ? `<span style="color:#10b981; font-size:0.75rem;"><i class="fa-solid fa-check-circle"></i> PAGO</span>`
            : `<button onclick="toggleFinanceStatus('${f.id}')" class="btn btn-primary" style="padding:4px 8px; font-size:0.7rem;">MARCAR PAGO</button>`;
            
        return `<tr>
            <td><strong style="color:${color}">${typeStr.toUpperCase()}</strong></td>
            <td>${f.desc}</td>
            <td><strong>R$ ${f.amount || '0,00'}</strong></td>
            <td><small>${f.date || '---'}</small></td>
            <td>${statusBtn}</td>
        </tr>`;
    }).join('') || '<tr><td colspan="5" style="text-align:center; opacity:0.5; padding:20px;">Nenhum lançamento.</td></tr>';
}

function toggleFinanceStatus(id) {
    const data = DB._getAll('finance');
    const idx = data.findIndex(f => f.id === id);
    if(idx > -1) {
        data[idx].status = 'paid';
        DB.set('finance', data);
        renderFinance();
        renderDashboardHome(); // refresh overall numbers
        notify('Status alterado para Pago!', 'success');
    }
}
window.toggleFinanceStatus = toggleFinanceStatus;

function renderProviders() {
    const providers = DB.get('providers');
    const container = document.getElementById('providers-grid');
    if(!container) return;
    container.innerHTML = providers.map(p => `
        <div class="card" onclick="window.openProviderDetail('${p.id}')" style="display:flex; gap:15px; align-items:center; cursor:pointer;">
            <div style="width:50px; height:50px; background:rgba(255,255,255,0.05); border-radius:50%; overflow:hidden; flex-shrink:0;">
                ${p.photo ? `<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover">` : '<i class="fa-solid fa-users" style="display:flex; justify-content:center; align-items:center; width:100%; height:100%; opacity:0.3; font-size:1.5rem;"></i>'}
            </div>
            <div>
                <strong style="color:var(--brand-yellow); text-transform:uppercase;">${p.name}</strong><br>
                <small style="color:var(--text-muted);">${p.service || 'Parceiro Geral'}</small>
            </div>
        </div>
    `).join('') || '<p style="text-align:center; padding:40px; opacity:0.5; grid-column:1/-1;">Nenhum parceiro cadastrado.</p>';
}

function openProviderDetail(id) {
    const providers = DB.get('providers');
    const p = providers.find(x => x.id === id);
    if (!p) return;
    document.getElementById('det-prov-id').value = p.id;
    document.getElementById('det-prov-name').innerText = p.name.toUpperCase();
    document.getElementById('det-prov-skill').innerText = (p.service || 'Parceiro').toUpperCase();
    document.getElementById('det-prov-phone').innerText = p.phone || 'Não informado';
    
    const photo = document.getElementById('det-prov-photo');
    const ph = document.getElementById('det-prov-photo-placeholder');
    if(p.photo) {
        if(photo) { photo.src = p.photo; photo.style.display = 'block'; }
        if(ph) ph.style.display = 'none';
    } else {
        if(photo) photo.style.display = 'none';
        if(ph) { ph.style.display = 'flex'; ph.innerText = p.name[0]; }
    }
    
    const wa = document.getElementById('btn-wa-prov');
    if(wa && p.phone) wa.onclick = () => window.open(`https://wa.me/55${p.phone.replace(/\D/g, '')}`);
    openModal('modal-provider-detail');
}
window.openProviderDetail = openProviderDetail;

function deleteProviderFromDetail() {
    if(confirm('Remover parceiro da sua rede?')) {
        const id = document.getElementById('det-prov-id').value;
        const all = DB._getAll('providers');
        DB.set('providers', all.filter(x => x.id !== id));
        closeModal('modal-provider-detail');
        renderProviders();
        notify('Parceiro removido.');
    }
}
window.deleteProviderFromDetail = deleteProviderFromDetail;

function editProviderFromDetail() {
    const id = document.getElementById('det-prov-id').value;
    closeModal('modal-provider-detail');
    const providers = DB.get('providers');
    const p = providers.find(x => x.id === id);
    if(p) {
        document.getElementById('prov-id').value = p.id;
        document.getElementById('prov-name').value = p.name;
        document.getElementById('prov-skill').value = p.service || '';
        document.getElementById('prov-phone').value = p.phone || '';
        const preview = document.getElementById('prov-photo-preview');
        if(preview && p.photo) preview.innerHTML = `<img src="${p.photo}" style="width:100%; height:100%; object-fit:cover;">`;
        switchModule('form-provider');
    }
}
window.editProviderFromDetail = editProviderFromDetail;

function renderGallery() {
    const data = DB.get('gallery');
    const container = document.getElementById('gallery-list');
    if(!container) return;
    container.innerHTML = data.map(g => `
        <div class="card" style="padding:0; overflow:hidden; position:relative;">
            <button onclick="deleteGalleryItem('${g.id}')" style="position:absolute; top:10px; right:10px; background:rgba(239,68,68,0.8); color:#fff; border:none; border-radius:50%; width:25px; height:25px; cursor:pointer; z-index:10; font-size:0.7rem;"><i class="fa-solid fa-trash"></i></button>
            <img src="${g.photo}" style="width:100%; height:200px; object-fit:cover;">
            <div style="padding:15px;"><strong style="color:var(--brand-yellow);">${g.title.toUpperCase()}</strong></div>
        </div>
    `).join('') || '<p style="text-align:center; padding:40px; opacity:0.5; grid-column:1/-1;">Galeria vazia.</p>';
}

function deleteGalleryItem(id) {
    if(confirm('Excluir esta imagem permanentemente?')) {
        const data = DB._getAll('gallery');
        DB.set('gallery', data.filter(x => x.id !== id));
        renderGallery();
        notify('Imagem removida.');
    }
}
window.deleteGalleryItem = deleteGalleryItem;

function updateTopbarProfile() {
    const user = localStorage.getItem('state_current_user') || 'admin';
    const users = JSON.parse(localStorage.getItem('state_users')) || [];
    const u = users.find(x => x.u === user);
    
    const greeting = document.getElementById('topbar-greeting');
    if(greeting) greeting.innerHTML = `OPERADOR: <strong>${user.toUpperCase()}</strong>`;
    
    const avatar = document.querySelector('.topbar-right .avatar');
    if(avatar) {
        if(u && u.avatar) {
            avatar.innerHTML = `<img src="${u.avatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            avatar.style.background = 'transparent';
        } else {
            avatar.innerText = user[0].toUpperCase();
            avatar.style.background = 'var(--brand-yellow)';
        }
    }
}

function renderAdminUsers() {
    const users = JSON.parse(localStorage.getItem('state_users')) || [];
    const tbody = document.getElementById('admin-users-list');
    if(!tbody) return;
    
    tbody.innerHTML = users.map(u => `
        <tr>
            <td>
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${u.avatar || '../imgs/logo-state.png'}" style="width:30px; height:30px; border-radius:50%; object-fit:cover;">
                    <strong style="color:var(--brand-yellow)">${u.u}</strong>
                </div>
            </td>
            <td><small>${u.name || '---'}</small></td>
            <td>${u.isVIP ? '<span style="color:#10b981; font-weight:bold;">VIP <i class="fa-solid fa-gem"></i></span>' : '<span style="color:var(--text-muted);">Padrão</span>'}</td>
            <td>
                ${u.u !== 'admin' ? `
                    <button onclick="toggleUserVIP('${u.u}')" class="btn btn-ghost" style="padding:4px 8px; font-size:0.7rem; border:1px solid var(--border-glass);">Alternar VIP</button>
                    <button onclick="deleteUser('${u.u}')" class="btn btn-danger" style="padding:4px 8px; font-size:0.7rem;"><i class="fa-solid fa-trash"></i></button>
                ` : '<span style="opacity:0.5; font-size:0.7rem;">MASTER</span>'}
            </td>
        </tr>
    `).join('') || '<tr><td colspan="4" style="text-align:center; opacity:0.5; padding:20px;">Nenhum usuário cadastrado.</td></tr>';
}

function toggleUserVIP(username) {
    let users = JSON.parse(localStorage.getItem('state_users')) || [];
    const idx = users.findIndex(x => x.u === username);
    if(idx > -1) {
        users[idx].isVIP = !users[idx].isVIP;
        localStorage.setItem('state_users', JSON.stringify(users));
        renderAdminUsers();
        notify(`Status VIP de ${username} alterado!`);
    }
}
window.toggleUserVIP = toggleUserVIP;

function deleteUser(username) {
    if(username === 'admin') return alert('Não é possível excluir o root.');
    if(!confirm(`Deseja EXCLUIR o usuário ${username}?`)) return;
    let users = JSON.parse(localStorage.getItem('state_users')) || [];
    users = users.filter(x => x.u !== username);
    localStorage.setItem('state_users', JSON.stringify(users));
    renderAdminUsers();
    notify('Usuário deletado com sucesso.', 'success');
}
window.deleteUser = deleteUser;

function loadProfile() {
    const user = localStorage.getItem('state_current_user') || 'admin';
    const users = JSON.parse(localStorage.getItem('state_users')) || [];
    const u = users.find(x => x.u === user);
    if(u) {
        document.getElementById('profile-name').value = u.name || '';
        document.getElementById('profile-bio').value = u.bio || '';
        document.getElementById('profile-avatar').value = u.avatar || '';
        const pb = document.getElementById('avatar-preview-box');
        if(u.avatar && pb) pb.innerHTML = `<img src="${u.avatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    }
}

function saveProfile(e) {
    if(e) e.preventDefault();
    const user = localStorage.getItem('state_current_user') || 'admin';
    let users = JSON.parse(localStorage.getItem('state_users')) || [];
    const idx = users.findIndex(x => x.u === user);
    if(idx > -1) {
        users[idx].name = document.getElementById('profile-name').value;
        users[idx].bio = document.getElementById('profile-bio').value;
        users[idx].avatar = document.getElementById('profile-avatar').value;
        localStorage.setItem('state_users', JSON.stringify(users));
        updateTopbarProfile();
        notify('Perfil Atualizado com Sucesso! (Sem reload)');
    }
}
window.saveProfile = saveProfile;

// --- CHAT ENGINE SOCIAL ---
let currentChatPartner = null;
function toggleChat() {
    const w = document.getElementById('social-chat-widget');
    if(!w) return;
    if(w.style.display === 'none' || w.style.display === '') {
        w.style.display = 'flex';
        populateChatSelector();
    } else {
        w.style.display = 'none';
    }
}
window.toggleChat = toggleChat;

function populateChatSelector() {
    const sel = document.getElementById('chat-friend-selector');
    if(!sel) return;
    const dbUsers = JSON.parse(localStorage.getItem('state_users')) || [];
    const currentUser = localStorage.getItem('state_current_user') || 'admin';
    const u = dbUsers.find(x => x.u === currentUser) || {};
    const friends = u.friends || [];
    let options = '<option value="" style="color:#000;">Conversar com...</option>';
    friends.forEach(f => {
        const friendObj = dbUsers.find(x => x.u === f);
        if(friendObj) options += `<option value="${f}" style="color:#000;">${friendObj.name || f}</option>`;
    });
    if(friends.length === 0) options = '<option value="" style="color:#000;">Nenhuma conexão na rede.</option>';
    sel.innerHTML = options;
}

function loadChatWith(partner) {
    currentChatPartner = partner;
    renderChatMessages();
}
window.loadChatWith = loadChatWith;

function renderChatMessages() {
    const container = document.getElementById('social-chat-messages');
    if(!container) return;
    const currentUser = localStorage.getItem('state_current_user') || 'admin';
    if(!currentChatPartner) {
        container.innerHTML = '<div style="text-align:center; opacity:0.5; padding:20px; font-size:0.8rem;">Selecione um parceiro.</div>';
        return;
    }
    const chats = DB._getAll('social_chats') || [];
    const msgs = chats.filter(c => 
        (c.from === currentUser && c.to === currentChatPartner) ||
        (c.from === currentChatPartner && c.to === currentUser)
    ).sort((a,b) => a.timeMs - b.timeMs);
    
    container.innerHTML = msgs.map(m => {
        const isMe = m.from === currentUser;
        return `
            <div style="display:flex; flex-direction:column; align-items:${isMe ? 'flex-end' : 'flex-start'};">
                <div style="background:${isMe ? 'var(--brand-yellow-glow)' : 'rgba(255,255,255,0.05)'}; color:${isMe ? 'var(--brand-yellow)' : '#fff'}; border:1px solid ${isMe ? 'var(--border-glass)' : 'var(--border)'}; padding:8px 12px; border-radius:12px; max-width:85%; font-size:0.85rem; word-wrap:break-word;">
                    ${m.text}
                </div>
                <small style="opacity:0.4; font-size:0.6rem; margin-top:2px;">${new Date(m.timeMs).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</small>
            </div>
        `;
    }).join('') || '<div style="text-align:center; padding:20px; opacity:0.3; font-size:0.75rem;">Inicie uma conversa técnica.</div>';
    container.scrollTop = container.scrollHeight;
}

function sendMessage() {
    const input = document.getElementById('chat-input') || document.getElementById('chat-input-text');
    if(!input || !currentChatPartner) return;
    const text = input.value.trim();
    if(!text) return;
    const currentUser = localStorage.getItem('state_current_user') || 'admin';
    let chats = DB._getAll('social_chats') || [];
    chats.push({
        id: Date.now(),
        from: currentUser,
        to: currentChatPartner,
        text: text,
        timeMs: Date.now()
    });
    DB.set('social_chats', chats);
    input.value = '';
    renderChatMessages();
}
window.sendMessage = sendMessage;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    DB.checkSession();
    updateTopbarProfile();
    
    const currentUser = localStorage.getItem('state_current_user') || 'admin';
    if(currentUser === 'admin') {
        const adOnly = document.getElementById('nav-admin-only');
        if(adOnly) adOnly.style.display = 'block';
    }

    switchModule('home');

    document.getElementById('menu-toggle').onclick = () => document.getElementById('sidebar').classList.toggle('open');
    
    navLinks = document.querySelectorAll('.nav-link[data-mod]');
    navLinks.forEach(l => l.onclick = () => switchModule(l.dataset.mod));

    // Form Event Listeners (Restored)
    const formsToHandle = [
        { id: 'client-form-el', table: 'clients', fields: ['id','name','phone','insta','address','photo'], refresh: 'clients' },
        { id: 'project-form-el', table: 'projects', fields: ['id','title','client','status','deadline','progress'], refresh: 'projects' },
        { id: 'inventory-form-el', table: 'inventory', fields: ['id','name','qty','photo'], refresh: 'inventory' },
        { id: 'finance-form-el', table: 'finance', fields: ['id','desc','amount','type','status','date'], refresh: 'finance' },
        { id: 'provider-form-el', table: 'providers', fields: ['id','name','service','phone','rating','photo'], refresh: 'providers' }
    ];

    formsToHandle.forEach(f => {
        const el = document.getElementById(f.id);
        if(el) {
            el.onsubmit = (e) => {
                e.preventDefault();
                const data = {};
                const formPrefix = f.id.split('-')[0];
                f.fields.forEach(field => {
                    // Try different prefixes to find the input element
                    const inp = document.getElementById(`${formPrefix}-${field}`) || 
                                document.getElementById(`${f.table.replace(/s$/,'')}-${field}`) || 
                                document.getElementById(`item-${field}`) ||
                                document.getElementById(`trans-${field}`) ||
                                document.getElementById(`prov-${field}`);
                    
                    if(inp) data[field] = inp.value;
                });

                // Fallbacks and Overwrites for logic-specific fields
                if(f.id === 'finance-form-el'){
                    data.id = document.getElementById('trans-id')?.value;
                    data.desc = document.getElementById('trans-desc')?.value;
                    data.amount = document.getElementById('trans-val')?.value;
                    data.type = document.getElementById('trans-type')?.value;
                    data.date = document.getElementById('trans-date')?.value;
                    data.status = data.status || 'pending';
                }
                if(f.id === 'provider-form-el'){
                    data.id = document.getElementById('prov-id')?.value;
                    data.name = document.getElementById('prov-name')?.value;
                    data.service = document.getElementById('prov-skill')?.value;
                    data.phone = document.getElementById('prov-phone')?.value;
                    if(!data.rating) data.rating = 5;
                }
                
                // Photo fallbacks from previews (since file inputs don't return Base64)
                if(f.id === 'inventory-form-el') {
                    data.photo = document.getElementById('item-photo-preview')?.querySelector('img')?.src || '';
                }
                if(f.id === 'client-form-el') {
                    data.photo = document.getElementById('photo-preview')?.querySelector('img')?.src || '';
                    data.insta = document.getElementById('client-instagram')?.value || '';
                }
                if(f.id === 'provider-form-el') {
                    data.photo = document.getElementById('prov-photo-preview')?.querySelector('img')?.src || '';
                }
                
                // Fallback ID generation if empty
                if(!data.id) data.id = 'ID_' + Date.now();
                
                DB.saveItem(f.table, data.id, data);
                notify("Registro salvo com sucesso!", "success");
                switchModule(f.refresh);
            };
        }
    });

    const pF = document.getElementById('profile-form');
    if(pF) pF.onsubmit = (e) => saveProfile(e);
});

// Exports
window.switchModule = switchModule;
window.openModal = openModal;
window.closeModal = closeModal;
window.logout = () => { 
    localStorage.removeItem('state_admin_session'); 
    localStorage.removeItem('state_current_user');
    sessionStorage.removeItem('clubstate_session');
    window.location.href='login.html'; 
};
window.goToClub = () => {
    const user = localStorage.getItem('state_current_user');
    if(user) {
        sessionStorage.setItem('clubstate_session', 'active');
        localStorage.setItem('clubstate_bridge_user', user);
        window.location.href='../club/index.html';
    }
};
