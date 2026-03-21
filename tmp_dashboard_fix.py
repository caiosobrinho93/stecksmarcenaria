import re

with open('c:/Users/caio/Documents/Antigravity/site-marcenaria/admin/dashboard.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Modify DB object
new_db = """
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
        if (['projects', 'clients', 'finance', 'gallery', 'providers', 'inventory'].includes(key)) {
            return all.filter(x => x.owner === currentUser || !x.owner);
        }
        return all;
    },
    set: (key, val) => localStorage.setItem(DB_PREFIX + key, JSON.stringify(val)),
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
    },
    log: (msg) => {
        const logs = DB._getAll('logs', []);
        logs.unshift({ time: new Date().toLocaleTimeString(), msg });
        DB.set('logs', logs.slice(0, 50));
    }
};
"""
js = re.sub(r'const DB = \{.*?\n\};', new_db.strip(), js, flags=re.DOTALL)

# 2. Refactor submit functions to use DB.saveItem
subs = [
    (
        r"if\(id\) clients\[clients.findIndex\(c => c.id === id\)\] = data;\s*else clients.push\(data\);\s*DB.set\('clients', clients\);",
        r"DB.saveItem('clients', id, data);"
    ),
    (
        r"if\(id\) projects\[projects.findIndex\(p => p.id === id\)\] = data;\s*else projects.push\(data\);\s*DB.set\('projects', projects\);",
        r"DB.saveItem('projects', id, data);"
    ),
    (
        r"if\(id\) inv\[inv.findIndex\(i => i.id === id\)\] = data;\s*else inv.push\(data\);\s*DB.set\('inventory', inv\);",
        r"DB.saveItem('inventory', id, data);"
    ),
    (
        r"if\(id\) fin\[fin.findIndex\(f => f.id === id\)\] = data;\s*else fin.push\(data\);\s*DB.set\('finance', fin\);",
        r"DB.saveItem('finance', id, data);"
    ),
    (
        r"if\(id\) ps\[ps.findIndex\(p => p.id === id\)\] = data;\s*else ps.push\(data\);\s*DB.set\('providers', ps\);",
        r"DB.saveItem('providers', id, data);"
    ),
    (
        r"if\(id\) gallery\[gallery.findIndex\(g => g.id === id\)\] = data;\s*else gallery.push\(data\);\s*DB.set\('gallery', gallery\);",
        r"DB.saveItem('gallery', id, data);"
    )
]

for pat, rep in subs:
    js = re.sub(pat, rep, js)

# 3. Add Profile Handlers
profile_code = """
// --- PROFILE SYSTEM ---
function loadProfile() {
    const currentUser = localStorage.getItem('state_current_user') || 'admin';
    document.getElementById('profile-email').value = currentUser;
    
    let db = JSON.parse(localStorage.getItem('state_users')) || [];
    const userObj = db.find(x => x.u === currentUser);
    
    if (userObj) {
        document.getElementById('profile-name').value = userObj.name || currentUser;
        document.getElementById('profile-bio').value = userObj.bio || '';
        document.getElementById('profile-avatar').value = userObj.avatar || '';
        document.getElementById('profile-name-display').innerText = (userObj.name || currentUser).toUpperCase();
        
        const avatarDisplay = document.getElementById('profile-avatar-display');
        const avatarPlaceholder = document.getElementById('profile-avatar-placeholder');
        
        if (userObj.avatar) {
            avatarDisplay.src = userObj.avatar;
            avatarDisplay.style.display = 'block';
            avatarPlaceholder.style.display = 'none';
        } else {
            avatarDisplay.style.display = 'none';
            avatarPlaceholder.style.display = 'block';
            avatarPlaceholder.innerText = (userObj.name || currentUser).charAt(0).toUpperCase();
        }
    } else {
        document.getElementById('profile-name').value = 'ADMIN';
        document.getElementById('profile-name-display').innerText = 'ADMINISTRADOR';
    }
}

window.saveProfile = (e) => {
    e.preventDefault();
    const currentUser = localStorage.getItem('state_current_user') || 'admin';
    let db = JSON.parse(localStorage.getItem('state_users')) || [];
    const idx = db.findIndex(x => x.u === currentUser);
    
    if (idx > -1) {
        db[idx].name = document.getElementById('profile-name').value;
        db[idx].bio = document.getElementById('profile-bio').value;
        db[idx].avatar = document.getElementById('profile-avatar').value;
        localStorage.setItem('state_users', JSON.stringify(db));
        notify('Perfil corporativo atualizado.', 'success');
        loadProfile();
    } else {
        notify('Operador não encontrado no banco de dados local.', 'error');
    }
};

"""
js = js.replace('// --- Initialization ---', profile_code + '\n// --- Initialization ---')
js = js.replace("updateHomeGreeting();", "updateHomeGreeting();\n    loadProfile();\n    updateTopbarProfile();")

topbar_prof = """
function updateTopbarProfile() {
    const currentUser = localStorage.getItem('state_current_user') || 'admin';
    let db = JSON.parse(localStorage.getItem('state_users')) || [];
    const userObj = db.find(x => x.u === currentUser);
    
    document.getElementById('topbar-greeting').innerHTML = `OPERADOR: <strong>${(userObj?.name || currentUser).toUpperCase()}</strong>`;
    const av = document.querySelector('.topbar-right .avatar');
    if(av) {
        av.innerHTML = (userObj?.name || currentUser).charAt(0).toUpperCase();
        if(userObj?.avatar) av.innerHTML = `<img src="${userObj.avatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    }
}
"""
js = js + '\n' + topbar_prof

# Fix missing existing DB.get in delete functions: they should use DB._getAll to avoid deleting only localized items if something goes wrong, or wait, deleteItem should definitely use DB._getAll and update via DB.set
js = js.replace("let items = DB.get(key);", "let items = DB._getAll(key);")
js = js.replace("const projects = DB.get('projects');", "const projects = DB._getAll('projects');", 2) # for addProjectMedia / addProjectComment
js = js.replace("const projects = DB.get('projects');", "const projects = DB._getAll('projects');") # for finishProject

# Write file
with open('c:/Users/caio/Documents/Antigravity/site-marcenaria/admin/dashboard.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Dashboard JS Mutated successfully.")
