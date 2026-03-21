import re

with open('c:/Users/caio/Documents/Antigravity/site-marcenaria/admin/dashboard.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. New Social Data Structures & Helper
social_v2_logic = """
// --- SOCIAL 2.0 ENGINE ---

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

// -- POSTS SYSTEM --
window.previewPostImage = async (input) => {
    if (input.files[0]) {
        const base64 = await toBase64(input.files[0]);
        const preview = document.getElementById('post-preview-img');
        preview.src = base64;
        document.getElementById('post-preview-img-container').style.display = 'block';
    }
};

window.clearPostImage = () => {
    document.getElementById('post-img-input').value = '';
    document.getElementById('post-preview-img-container').style.display = 'none';
};

window.handlePostSubmit = () => {
    const text = document.getElementById('post-text').value.trim();
    const img = document.getElementById('post-preview-img-container').style.display === 'block' ? document.getElementById('post-preview-img').src : null;
    
    if(!text && !img) return notify('Escreva algo ou anexe uma foto!', 'error');

    const currentUser = localStorage.getItem('state_current_user') || 'admin';
    const posts = DB._getAll('social_posts', []);
    const newPost = {
        id: Date.now(),
        user: currentUser,
        text,
        image: img,
        time: new Date().toLocaleString(),
        likes: [],
        comments: []
    };
    posts.unshift(newPost);
    DB.set('social_posts', posts);
    
    document.getElementById('post-text').value = '';
    clearPostImage();
    renderFeed();
    notify('Sua atualização foi compartilhada na Comunidade!');
};

window.renderFeed = () => {
    const container = document.getElementById('social-feed-list');
    if(!container) return;
    
    const posts = DB._getAll('social_posts', []);
    const db = JSON.parse(localStorage.getItem('state_users')) || [];
    const currentUser = localStorage.getItem('state_current_user') || 'admin';

    container.innerHTML = posts.map(p => {
        const u = db.find(x => x.u === p.user) || { name: p.user };
        return `
            <div class="card" style="padding:0; overflow:hidden;">
                <div style="padding:15px; display:flex; align-items:center; gap:12px; border-bottom:1px solid rgba(255,255,255,0.05);">
                    <div class="avatar" style="width:40px; height:40px;">${u.avatar ? `<img src="${u.avatar}" style="width:100%;height:100%;border-radius:50%">` : p.user[0].toUpperCase()}</div>
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-weight:800; color:var(--brand-yellow); font-size:0.9rem;">${(u.name || p.user).toUpperCase()}</span>
                        <span style="font-size:0.7rem; color:var(--text-muted);">${p.time}</span>
                    </div>
                </div>
                ${ p.text ? `<div style="padding:15px; font-size:0.95rem; line-height:1.5;">${p.text}</div>` : '' }
                ${ p.image ? `<img src="${p.image}" style="width:100%; max-height:500px; object-fit:cover;">` : '' }
                <div style="padding:10px 15px; display:flex; gap:20px; border-top:1px solid rgba(255,255,255,0.05);">
                    <button class="btn btn-ghost btn-sm" onclick="likePost(${p.id})"><i class="fa-solid fa-heart" style="color:${p.likes.includes(currentUser) ? '#ef4444' : ''}"></i> ${p.likes.length}</button>
                    <button class="btn btn-ghost btn-sm"><i class="fa-regular fa-comment"></i> ${p.comments.length}</button>
                </div>
            </div>
        `;
    }).join('') || '<p style="text-align:center; padding:40px; color:var(--text-muted);">O mural está vazio. Seja o primeiro a postar!</p>';
};

window.likePost = (id) => {
    const posts = DB._getAll('social_posts');
    const idx = posts.findIndex(p => p.id === id);
    const currentUser = localStorage.getItem('state_current_user') || 'admin';
    if(idx > -1) {
        if(posts[idx].likes.includes(currentUser)) posts[idx].likes = posts[idx].likes.filter(u => u !== currentUser);
        else posts[idx].likes.push(currentUser);
        DB.set('social_posts', posts);
        renderFeed();
    }
};

// -- NOTIFICATIONS ENGINE 2.0 --
function addNotification(targetU, type, data) {
    const allNotifs = DB._getAll('notifications_db', []);
    allNotifs.push({
        id: Date.now(),
        target: targetU,
        type, // 'friend_req', 'group_invite'
        data,
        read: false,
        time: new Date().toLocaleString()
    });
    DB.set('notifications_db', allNotifs);
    renderNotifications();
}

window.renderNotifications = () => {
    const currentUser = localStorage.getItem('state_current_user') || 'admin';
    const all = DB._getAll('notifications_db', []);
    const mine = all.filter(n => n.target === currentUser && !n.read);
    
    const badge = document.getElementById('notif-badge');
    if(badge) {
        badge.innerText = mine.length;
        badge.style.display = mine.length > 0 ? 'flex' : 'none';
    }

    const dropdown = document.getElementById('notif-dropdown');
    if(dropdown) {
        dropdown.innerHTML = mine.map(n => `
            <div class="card" style="margin:5px; padding:10px; font-size:0.8rem; border-left:3px solid var(--brand-yellow);">
                <p>${n.data.msg}</p>
                <div style="display:flex; gap:5px; margin-top:8px;">
                    ${ n.type === 'group_invite' ? `
                        <button class="btn btn-primary btn-sm" onclick="actionNotif(${n.id}, 'accept_group')">ACEITAR</button>
                        <button class="btn btn-ghost btn-sm" onclick="actionNotif(${n.id}, 'decline')">RECUSAR</button>
                    ` : `<button class="btn btn-ghost btn-sm" onclick="actionNotif(${n.id}, 'read')">OK</button>`}
                </div>
            </div>
        `).join('') || '<p style="padding:15px; text-align:center; font-size:0.8rem; color:var(--text-muted);">Sem novas notificações.</p>';
        dropdown.innerHTML += '<button class="btn btn-ghost btn-sm" onclick="clearNotifs()" style="width:100%; border-top:1px solid var(--border);">LIMPAR TUDO</button>';
    }
};

window.actionNotif = (notifId, action) => {
    const all = DB._getAll('notifications_db');
    const idx = all.findIndex(n => n.id === notifId);
    if(idx === -1) return;

    const n = all[idx];
    if(action === 'accept_group') {
        let groups = DB._getAll('groups');
        const gIdx = groups.findIndex(g => g.id === n.data.groupId);
        if(gIdx > -1) {
            if(!groups[gIdx].members.includes(n.target)) groups[gIdx].members.push(n.target);
            DB.set('groups', groups);
            notify('Você entrou no grupo!');
        }
    }
    
    all[idx].read = true;
    DB.set('notifications_db', all);
    renderNotifications();
    renderGroups();
};

// -- CHAT ENGINE --
let chatWith = null;
window.toggleChat = () => {
    const widget = document.getElementById('social-chat-widget');
    widget.style.display = widget.style.display === 'flex' ? 'none' : 'flex';
    if(widget.style.display === 'flex') {
        // Load friend selector
        const currentUser = localStorage.getItem('state_current_user') || 'admin';
        const data = getFriendsData(currentUser);
        const sel = document.getElementById('chat-friend-selector');
        sel.innerHTML = '<option value="">Selecionar Amigo...</option>' + data.friends.map(f => `<option value="${f}">${f.toUpperCase()}</option>`).join('');
    }
};

window.loadChatWith = (user) => {
    chatWith = user;
    document.getElementById('chat-target-name').innerText = user ? `CHAT: ${user.toUpperCase()}` : 'CHAT SOCIAL';
    renderChatMessages();
};

window.renderChatMessages = () => {
    if(!chatWith) return;
    const currentUser = localStorage.getItem('state_current_user') || 'admin';
    const chats = DB._getAll('direct_chats', []);
    const pairId = [currentUser, chatWith].sort().join(':');
    const myChat = chats.find(c => c.id === pairId) || { messages: [] };
    
    document.getElementById('social-chat-messages').innerHTML = myChat.messages.map(m => `
        <div class="chat-bubble ${m.from === currentUser ? 'me' : 'other'}">${m.text}</div>
    `).join('') || '<p style="text-align:center; font-size:0.7rem; opacity:0.3; padding:20px;">Inicie a conversa...</p>';
    
    const body = document.getElementById('social-chat-messages');
    body.scrollTop = body.scrollHeight;
};

window.sendMessage = () => {
    const text = document.getElementById('chat-input').value.trim();
    if(!text || !chatWith) return;
    
    const currentUser = localStorage.getItem('state_current_user') || 'admin';
    const chats = DB._getAll('direct_chats', []);
    const pairId = [currentUser, chatWith].sort().join(':');
    
    let chatIdx = chats.findIndex(c => c.id === pairId);
    if(chatIdx === -1) {
        chats.push({ id: pairId, messages: [] });
        chatIdx = chats.length - 1;
    }
    
    chats[chatIdx].messages.push({ from: currentUser, text, time: Date.now() });
    DB.set('direct_chats', chats);
    document.getElementById('chat-input').value = '';
    renderChatMessages();
};

// -- ADMIN SETTINGS --
window.renderAdminSettings = () => {
    const db = JSON.parse(localStorage.getItem('state_users')) || [];
    document.getElementById('admin-users-list').innerHTML = db.map(u => `
        <tr>
            <td><strong>${u.u.toUpperCase()}</strong></td>
            <td>${u.name || '-'} <br> <small>${u.bio || ''}</small></td>
            <td><span class="badge ${u.isVIP ? 'badge-success' : 'badge-ghost'}">${u.isVIP ? 'VIP' : 'PADRÃO'}</span></td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="toggleUserVIP('${u.u}')">TOGGLE VIP</button>
                <button class="btn btn-danger btn-sm" onclick="deleteUser('${u.u}')">BANIR</button>
            </td>
        </tr>
    `).join('');
};

window.toggleUserVIP = (uname) => {
    let db = JSON.parse(localStorage.getItem('state_users')) || [];
    const idx = db.findIndex(x => x.u === uname);
    if(idx > -1) {
        db[idx].isVIP = !db[idx].isVIP;
        localStorage.setItem('state_users', JSON.stringify(db));
        renderAdminSettings();
        notify(`Status VIP de ${uname} alterado.`);
    }
};

window.handleAvatarUpload = async (input) => {
    if(input.files[0]) {
        const base64 = await toBase64(input.files[0]);
        document.getElementById('profile-avatar').value = base64;
        const preview = document.getElementById('avatar-preview-box');
        preview.innerHTML = `<img src="${base64}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    }
};

// Override inviteToGroup to use Notifications instead of Direct Append
window.inviteToGroup = (targetU) => {
    const currentUser = localStorage.getItem('state_current_user') || 'admin';
    const groups = DB._getAll('groups');
    const g = groups.find(x => x.id === currentGroupId);
    
    addNotification(targetU, 'group_invite', {
        msg: `${currentUser.toUpperCase()} convidou você para o grupo: ${g.name}`,
        groupId: currentGroupId
    });
    
    notify(`Solicitação de entrada enviada para ${targetU}`);
    closeAllModals();
};
"""

# Injection logic
js = js.replace('// --- SOCIAL SYSTEM: FRIENDS ---', social_v2_logic + '\n// --- SOCIAL SYSTEM: FRIENDS ---')

# Replace switchModule logic for RBAC hiding
rbac_update = """
function switchModule(mod) {
    const currentUser = localStorage.getItem('state_current_user') || 'admin';
    
    // Hide all
    sections.forEach(s => s.classList.remove('active'));
    navLinks.forEach(l => l.classList.remove('active'));

    // Select target
    const target = document.getElementById('mod-' + mod);
    const nav = document.querySelector(`.nav-link[data-mod="${mod}"]`);
    
    if(target) target.classList.add('active');
    if(nav) nav.classList.add('active');

    if(mod === 'home') {
        if(currentUser === 'admin') {
            document.getElementById('home-admin-stats').style.display = 'block';
            document.getElementById('home-social-feed').style.display = 'block';
        } else {
            document.getElementById('home-admin-stats').style.display = 'none';
            document.getElementById('home-social-feed').style.display = 'block';
        }
        renderFeed();
        updateStats();
    }
    
    if(mod === 'admsettings') renderAdminSettings();
    if(mod === 'friends') renderFriends();
    if(mod === 'groups') renderGroups();
}
"""
js = re.sub(r'function switchModule\(mod\)\s*\{.*?\}', rbac_update.strip(), js, flags=re.DOTALL)

# Refactor updateHomeGreeting for VIP icon and more
# Handle Topbar Royal Access in DOMContentLoaded
js = js.replace('renderGroups();', 'renderGroups(); renderFeed();')

# Update RBAC visibility for Menu
rbac_menu = """
    // Role-Based Access Control (RBAC) UI Hiding
    const restrictedMods = ['inventory', 'finance', 'gallery', 'providers'];
    const adminOnlyNav = document.getElementById('nav-admin-only');
    if (currentUser !== 'admin') {
        if(adminOnlyNav) adminOnlyNav.style.display = 'none';
    } else {
        if(adminOnlyNav) adminOnlyNav.style.display = 'block';
    }
"""
js = re.sub(r'// Role-Based Access Control \(RBAC\).*?if\s*\(currentUser\s*!==\s*\'admin\'\).*?\}', rbac_menu.strip(), js, flags=re.DOTALL)

with open('c:/Users/caio/Documents/Antigravity/site-marcenaria/admin/dashboard.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Social 2.0 Engine Successfully Mutated.")
