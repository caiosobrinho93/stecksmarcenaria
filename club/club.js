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
    if(viewLogin) viewLogin.classList.remove('active');
    if(viewDashboard) viewDashboard.classList.remove('active');
    const target = document.getElementById('view-' + view);
    if(target) target.classList.add('active');
}

// Social Navigation
function switchSocialTab(tabId) {
    document.querySelectorAll('.social-tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    const target = document.getElementById('tab-' + tabId);
    if(target) target.style.display = 'block';
    const btn = document.querySelector(`.tab-btn[onclick*="${tabId}"]`);
    if(btn) btn.classList.add('active');

    if(tabId === 'feed') renderFeed();
    if(tabId === 'friends') renderFriendsList();
    if(tabId === 'groups') renderGroups();
}
window.switchSocialTab = switchSocialTab;
window.switchView = switchView;

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
            <div class="glass-panel post-card" style="padding:0; overflow:hidden;">
                <div style="padding:12px; display:flex; align-items:center; gap:10px; border-bottom:1px solid var(--border-glass);">
                    <img src="${u.avatar || '../imgs/logo-state.png'}" style="width:35px; height:35px; border-radius:50%; object-fit:cover;">
                    <div><strong style="color:var(--brand-yellow); font-size:0.9rem;">${(u.name || p.user).toUpperCase()}</strong><br><small style="opacity:0.5; font-size:0.7rem;">${p.time || 'Agora'}</small></div>
                </div>
                ${p.text ? `<div style="padding:12px; font-size:0.85rem; line-height:1.4;">${p.text}</div>` : ''}
                ${p.image ? `<img src="${p.image}" style="width:100%; max-height:400px; object-fit:cover; display:block; border-top:1px solid var(--border-glass);">` : ''}
                <div style="padding:8px 12px; display:flex; gap:15px; background:rgba(255,255,255,0.02);">
                    <button class="btn-icon" onclick="likePost(${p.id})" style="color:${isLiked ? '#ef4444' : 'var(--text-secondary)'}; font-size:0.8rem; background:transparent; border:none; cursor:pointer;">
                        <i class="fa-${isLiked ? 'solid' : 'regular'} fa-heart"></i> ${p.likes?.length || 0}
                    </button>
                    <button class="btn-icon" style="font-size:0.8rem; color:var(--text-secondary); background:transparent; border:none;"><i class="fa-regular fa-comment"></i> ${p.comments?.length || 0}</button>
                </div>
            </div>
        `;
    }).join('') || '<p style="text-align:center; padding:30px; opacity:0.5; font-size:0.8rem;">Nenhuma atividade no feed VIP ainda.</p>';
}

function handlePostSubmit() {
    const text = document.getElementById('post-text').value.trim();
    const previewContainer = document.getElementById('post-preview-img-container');
    const img = (previewContainer.style.display === 'block') ? document.getElementById('post-preview-img').src : null;
    
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
    previewContainer.style.display = 'none';
    document.getElementById('post-img-input').value = '';
    renderFeed();
    toast('Publicado no Feed VIP!');
}
window.handlePostSubmit = handlePostSubmit;

// --- FRIENDS & REQUESTS ENGINE ---
function renderFriendsList(filter = '') {
    const container = document.getElementById('friends-list');
    if(!container) return;
    
    const dbUsers = JSON.parse(localStorage.getItem('state_users')) || [];
    const currentUser = sessionProject;
    const requests = LocalDB.get('friend_requests');
    const userObj = dbUsers.find(x => x.u === currentUser) || {};
    const myFriends = userObj.friends || [];

    // Update Badge
    const receivedCount = requests.filter(r => r.to === currentUser && r.status === 'pending').length;
    const badge = document.getElementById('badge-received');
    if(badge) {
        badge.innerText = receivedCount;
        badge.style.display = receivedCount > 0 ? 'inline-block' : 'none';
    }

    let list = [];
    if(currentFriendsSubTab === 'all') {
        list = dbUsers.filter(u => u.u !== currentUser && u.u !== 'admin' && (u.name || u.u).toLowerCase().includes(filter.toLowerCase()));
    } else if(currentFriendsSubTab === 'received') {
        const receivedReqs = requests.filter(r => r.to === currentUser && r.status === 'pending');
        list = receivedReqs.map(r => ({ ...dbUsers.find(u => u.u === r.from), requestId: r.id }));
    } else if(currentFriendsSubTab === 'sent') {
        const sentReqs = requests.filter(r => r.from === currentUser && r.status === 'pending');
        list = sentReqs.map(r => ({ ...dbUsers.find(u => u.u === r.to), requestId: r.id }));
    }

    container.innerHTML = list.map(u => {
        if(!u.u) return '';
        const isFriend = myFriends.includes(u.u);
        const hasSent = requests.some(r => r.from === currentUser && r.to === u.u && r.status === 'pending');
        const hasReceived = requests.some(r => r.from === u.u && r.to === currentUser && r.status === 'pending');

        let actionBtn = '';
        if(currentFriendsSubTab === 'received') {
            actionBtn = `
                <div style="display:flex; gap:5px;">
                    <button class="btn-royal" onclick="handleFriendRequest(${u.requestId}, 'accept')" style="background:#4ade8022; border-color:#4ade80; color:#4ade80;"><i class="fa-solid fa-check"></i></button>
                    <button class="btn-royal" onclick="handleFriendRequest(${u.requestId}, 'refuse')" style="background:#ef444422; border-color:#ef4444; color:#ef4444;"><i class="fa-solid fa-xmark"></i></button>
                </div>
            `;
        } else if(isFriend) {
            actionBtn = `<span style="color:#4ade80; font-size:0.75rem;"><i class="fa-solid fa-user-check"></i> AMIGO</span>`;
        } else if(hasSent) {
            actionBtn = `<span style="color:var(--text-muted); font-size:0.7rem;">AGUARDANDO...</span>`;
        } else if(hasReceived) {
            actionBtn = `<button class="btn-royal" onclick="switchFriendsSubTab('received')">VER PEDIDO</button>`;
        } else {
            actionBtn = `<button class="btn-royal" onclick="sendFriendRequest('${u.u}')"><i class="fa-solid fa-user-plus"></i></button>`;
        }

        return `
            <div class="friend-item">
                <div style="display:flex; align-items:center; gap:12px;">
                    <img src="${u.avatar || '../imgs/logo-state.png'}" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:1px solid var(--border-glass);">
                    <div>
                        <strong style="font-size:0.9rem; color:#fff;">${(u.name || u.u).toUpperCase()}</strong><br>
                        <small style="color:var(--brand-yellow); font-size:0.65rem;">${u.isVIP ? 'MEMBRO VIP' : 'MEMBRO PADRÃO'}</small>
                    </div>
                </div>
                ${actionBtn}
            </div>
        `;
    }).join('') || `<p style="text-align:center; padding:40px; opacity:0.5; font-size:0.85rem;">Nenhum usuário em "${currentFriendsSubTab.toUpperCase()}".</p>`;
}

function sendFriendRequest(toUser) {
    const requests = LocalDB.get('friend_requests');
    if(requests.some(r => r.from === sessionProject && r.to === toUser && r.status === 'pending')) return;
    
    requests.push({
        id: Date.now(),
        from: sessionProject,
        to: toUser,
        status: 'pending',
        time: new Date().toISOString()
    });
    LocalDB.set('friend_requests', requests);
    toast('Solicitação enviada!');
    renderFriendsList();
}
window.sendFriendRequest = sendFriendRequest;

function handleFriendRequest(reqId, action) {
    const requests = LocalDB.get('friend_requests');
    const idx = requests.findIndex(r => r.id === reqId);
    if(idx === -1) return;

    if(action === 'accept') {
        const req = requests[idx];
        const dbUsers = JSON.parse(localStorage.getItem('state_users')) || [];
        
        // Add to both users friend lists
        dbUsers.forEach(u => {
            if(u.u === req.from) { u.friends = u.friends || []; if(!u.friends.includes(req.to)) u.friends.push(req.to); }
            if(u.u === req.to) { u.friends = u.friends || []; if(!u.friends.includes(req.from)) u.friends.push(req.from); }
        });
        
        localStorage.setItem('state_users', JSON.stringify(dbUsers));
        requests.splice(idx, 1); // Remove request
        toast('Agora vocês são amigos!', 'success');
    } else {
        requests.splice(idx, 1);
        toast('Solicitação recusada.');
    }

    LocalDB.set('friend_requests', requests);
    renderFriendsList();
}
window.handleFriendRequest = handleFriendRequest;

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

// --- GROUPS ENGINE ---
function renderGroups() {
    const container = document.getElementById('groups-list');
    if(!container) return;
    const groups = LocalDB.get('groups');
    const myGroups = groups.filter(g => g.leader === sessionProject || (g.members && g.members.includes(sessionProject)));

    container.innerHTML = myGroups.map(g => `
        <div class="glass-panel" style="padding:15px; border-left:3px solid var(--brand-yellow); margin-bottom:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong style="color:var(--brand-yellow); font-family:var(--font-head);">${g.name.toUpperCase()}</strong>
                <span style="font-size:0.65rem; background:rgba(255,255,255,0.05); padding:2px 8px; border-radius:10px;">${g.members?.length || 1} MEMBROS</span>
            </div>
            <p style="font-size:0.8rem; margin-top:8px; opacity:0.8; line-height:1.4;">${g.desc || 'Sem descrição definida para este grupo estratégico.'}</p>
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
            const previewImg = document.getElementById('post-preview-img');
            const previewContainer = document.getElementById('post-preview-img-container');
            if(previewImg && previewContainer) {
                previewImg.src = reader.result;
                previewContainer.style.display = 'block';
            }
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
    div.style.cssText = `background:#161311; border-left:4px solid ${type === 'success' ? '#4ade80' : '#ef4444'}; padding:12px 20px; color:#fff; margin-bottom:10px; border-radius:4px; box-shadow:0 10px 40px rgba(0,0,0,0.8); font-size:0.8rem; z-index:9999; display:flex; align-items:center; gap:10px; animation: slideInUp 0.3s ease;`;
    div.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-check-circle' : 'fa-circle-xmark'}" style="color:${type === 'success' ? '#4ade80' : '#ef4444'};"></i> ${msg}`;
    container.appendChild(div);
    setTimeout(() => { div.style.opacity = '0'; setTimeout(() => div.remove(), 300); }, 3000);
}

// Friends Sub-Navigation Logic (Re-added)
let currentFriendsSubTab = 'all';
function switchFriendsSubTab(sub) {
    currentFriendsSubTab = sub;
    document.querySelectorAll('.sub-tab-btn').forEach(b => {
        b.classList.toggle('active', b.innerText.toLowerCase().includes(sub.toLowerCase()) || (sub === 'all' && b.innerText === 'TODOS'));
        b.style.background = b.classList.contains('active') ? 'var(--brand-yellow-glow)' : 'transparent';
    });
    
    const searchArea = document.getElementById('friends-search-area');
    if(searchArea) searchArea.style.display = (sub === 'all') ? 'block' : 'none';
    renderFriendsList();
}
window.switchFriendsSubTab = switchFriendsSubTab;
