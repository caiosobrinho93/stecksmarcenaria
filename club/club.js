const LocalDB = {
    get: (key, def = []) => JSON.parse(localStorage.getItem('state_db_' + key)) || def,
    set: (key, val) => localStorage.setItem('state_db_' + key, JSON.stringify(val))
};

// State
let sessionProject = localStorage.getItem('state_current_user') || sessionStorage.getItem('clubstate_session') || null;

// Routing
const viewLogin = document.getElementById('view-login');
const viewDashboard = document.getElementById('view-dashboard');

function switchView(view) {
    viewLogin.classList.remove('active');
    viewDashboard.classList.remove('active');
    document.getElementById('view-' + view).classList.add('active');
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    if (sessionProject) {
        initDashboard();
    } else {
        switchView('login');
    }
});

// Login Handlers
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const u = document.getElementById('access-user').value.trim();
        const p = document.getElementById('access-pass').value.trim();
        
        const db = JSON.parse(localStorage.getItem('state_users')) || [];
        const validUser = db.find(x => x.u === u && x.p === p);
        
        if (validUser) {
            sessionStorage.setItem('clubstate_session', validUser.u);
            sessionProject = validUser.u;
            toast(`Conectado ao Hub Corporativo!`, 'success');
            setTimeout(() => {
                initDashboard();
            }, 800);
        } else {
            toast('Credenciais corporativas inválidas.', 'error');
        }
    });
}

function logout() {
    sessionStorage.removeItem('clubstate_session');
    sessionProject = null;
    document.getElementById('login-form').reset();
    switchView('login');
    toast('Sessão encerrada com segurança.', 'success');
}
window.logout = logout;

// Dashboard Hydration// Social Navigation
function switchSocialTab(tabId) {
    document.querySelectorAll('.social-tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById('tab-' + tabId).style.display = 'block';
    const btn = document.querySelector(`.tab-btn[onclick*="${tabId}"]`);
    if(btn) btn.classList.add('active');

    if(tabId === 'feed') renderFeed();
    if(tabId === 'friends') renderFriendsList();
    if(tabId === 'groups') renderGroups();
}
window.switchSocialTab = switchSocialTab;

// --- FEED ENGINE ---
function renderFeed() {
    const container = document.getElementById('social-feed-list');
    if(!container) return;
    const posts = LocalDB.get('social_posts');
    const dbUsers = JSON.parse(localStorage.getItem('state_users')) || [];
    const currentUser = sessionProject;

    container.innerHTML = posts.map(p => {
        const u = dbUsers.find(x => x.u === p.user) || { name: p.user };
        const isLiked = (p.likes || []).includes(currentUser);
        return `
            <div class="glass-panel post-card" style="padding:0; overflow:hidden; border:1px solid var(--border-glass);">
                <div style="padding:12px; display:flex; align-items:center; gap:10px; border-bottom:1px solid var(--border-glass);">
                    <img src="${u.avatar || '../imgs/logo-state.png'}" style="width:35px; height:35px; border-radius:50%; object-fit:cover;">
                    <div><strong style="color:var(--brand-yellow); font-size:0.9rem;">${(u.name || p.user).toUpperCase()}</strong><br><small style="opacity:0.5; font-size:0.7rem;">${p.time || 'Agora'}</small></div>
                </div>
                ${p.text ? `<div style="padding:12px; font-size:0.85rem; line-height:1.4;">${p.text}</div>` : ''}
                ${p.image ? `<img src="${p.image}" style="width:100%; max-height:300px; object-fit:cover;">` : ''}
                <div style="padding:8px 12px; display:flex; gap:15px; background:rgba(255,255,255,0.02);">
                    <button class="btn-icon" onclick="likePost(${p.id})" style="color:${isLiked ? '#ef4444' : 'var(--text-secondary)'}; font-size:0.8rem;">
                        <i class="fa-${isLiked ? 'solid' : 'regular'} fa-heart"></i> ${p.likes?.length || 0}
                    </button>
                    <button class="btn-icon" style="font-size:0.8rem; color:var(--text-secondary);"><i class="fa-regular fa-comment"></i> ${p.comments?.length || 0}</button>
                </div>
            </div>
        `;
    }).join('') || '<p style="text-align:center; padding:30px; opacity:0.5; font-size:0.8rem;">Nenhuma atividade no feed VIP ainda.</p>';
}

function handlePostSubmit() {
    const text = document.getElementById('post-text').value.trim();
    const img = document.getElementById('post-preview-img-container').style.display === 'block' ? document.getElementById('post-preview-img').src : null;
    
    if(!text && !img) return toast('Escreva algo para postar!', 'error');

    const posts = LocalDB.get('social_posts');
    posts.unshift({
        id: Date.now(),
        user: sessionProject,
        text,
        image: img,
        time: new Date().toLocaleString('pt-BR'),
        likes: [],
        comments: []
    });
    LocalDB.set('social_posts', posts);
    
    document.getElementById('post-text').value = '';
    document.getElementById('post-preview-img-container').style.display = 'none';
    renderFeed();
    toast('Publicado no Feed VIP!');
}
window.handlePostSubmit = handlePostSubmit;

function likePost(id) {
    const posts = LocalDB.get('social_posts');
    const idx = posts.findIndex(x => x.id == id);
    if(idx > -1) {
        if(!posts[idx].likes) posts[idx].likes = [];
        const uIdx = posts[idx].likes.indexOf(sessionProject);
        if(uIdx > -1) posts[idx].likes.splice(uIdx, 1);
        else posts[idx].likes.push(sessionProject);
        LocalDB.set('social_posts', posts);
        renderFeed();
    }
}
window.likePost = likePost;

// --- FRIENDS ENGINE ---
function renderFriendsList(filter = '') {
    const container = document.getElementById('friends-list');
    if(!container) return;
    const dbUsers = JSON.parse(localStorage.getItem('state_users')) || [];
    const currentUser = sessionProject;
    
    const others = dbUsers.filter(u => u.u !== currentUser && u.u !== 'admin' && (u.name || u.u).toLowerCase().includes(filter.toLowerCase()));
    
    container.innerHTML = others.map(u => `
        <div class="glass-panel" style="padding:10px; display:flex; align-items:center; justify-content:space-between;">
            <div style="display:flex; align-items:center; gap:10px;">
                <img src="${u.avatar || '../imgs/logo-state.png'}" style="width:35px; height:35px; border-radius:50%; object-fit:cover;">
                <div><strong style="font-size:0.85rem;">${(u.name || u.u).toUpperCase()}</strong><br><small style="color:var(--brand-yellow); font-size:0.65rem;">${u.isVIP ? 'MEMBRO VIP' : 'MEMBRO PADRÃO'}</small></div>
            </div>
            <button class="btn-royal" style="padding:5px 10px; font-size:0.7rem;"><i class="fa-solid fa-user-plus"></i></button>
        </div>
    `).join('') || '<p style="text-align:center; padding:20px; font-size:0.8rem; opacity:0.5;">Nenhum usuário encontrado.</p>';
}

// --- GROUPS ENGINE ---
function renderGroups() {
    const container = document.getElementById('groups-list');
    if(!container) return;
    const groups = LocalDB.get('groups');
    const myGroups = groups.filter(g => g.leader === sessionProject || (g.members && g.members.includes(sessionProject)));

    container.innerHTML = myGroups.map(g => `
        <div class="glass-panel" style="padding:12px; border-left:3px solid var(--brand-yellow);">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong style="color:var(--brand-yellow);">${g.name.toUpperCase()}</strong>
                <span style="font-size:0.6rem; opacity:0.6;">${g.members?.length || 1} MEMBROS</span>
            </div>
            <p style="font-size:0.75rem; margin-top:5px; opacity:0.8;">${g.desc || 'Sem descrição.'}</p>
        </div>
    `).join('') || `
        <div style="text-align:center; padding:30px; background:rgba(255,255,255,0.02); border-radius:12px; border:1px dashed var(--border-glass);">
            <p style="font-size:0.8rem; opacity:0.5; margin-bottom:15px;">Você ainda não participa de nenhum grupo estratégico.</p>
            <button class="btn-primary btn-sm" onclick="alert('Funcionalidade de criação de grupos em liberação gradual...')">INGRESSAR EM GRUPO</button>
        </div>
    `;
}

// --- IMAGE PREVIEW ---
async function previewPostImage(input) {
    if (input.files[0]) {
        const reader = new FileReader();
        reader.readAsDataURL(input.files[0]);
        reader.onload = () => {
            document.getElementById('post-preview-img').src = reader.result;
            document.getElementById('post-preview-img-container').style.display = 'block';
        };
    }
}
window.previewPostImage = previewPostImage;
window.clearPostImage = () => {
    document.getElementById('post-preview-img-container').style.display = 'none';
    document.getElementById('post-img-input').value = '';
};

// --- INITIALIZATION ---
function initDashboard() {
    const db = JSON.parse(localStorage.getItem('state_users')) || [];
    const userObj = db.find(x => x.u === sessionProject) || {};
    document.getElementById('dash-client-name').innerText = (userObj.name || sessionProject).toUpperCase();
    
    // Default Tab
    switchSocialTab('feed');
    switchView('dashboard');
}

// UI Utilities
function toast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    if(!container) return;
    const div = document.createElement('div');
    div.className = 'toast';
    div.style.cssText = `background:#161311; border-left:4px solid ${type === 'success' ? '#4ade80' : '#ef4444'}; padding:12px 20px; color:#fff; margin-bottom:10px; border-radius:4px; box-shadow:0 10px 40px rgba(0,0,0,0.8); font-size:0.8rem; z-index:9999; display:flex; align-items:center; gap:10px;`;
    div.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-check-circle' : 'fa-circle-xmark'}" style="color:${type === 'success' ? '#4ade80' : '#ef4444'};"></i> ${msg}`;
    container.appendChild(div);
    setTimeout(() => { div.style.opacity = '0'; setTimeout(() => div.remove(), 300); }, 3000);
}
