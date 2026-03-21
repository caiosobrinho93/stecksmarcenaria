import re

with open('c:/Users/caio/Documents/Antigravity/site-marcenaria/club/club.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Update session getter
js = js.replace(
    "let sessionProject = sessionStorage.getItem('clubstate_session') || null;",
    "let sessionProject = localStorage.getItem('state_current_user') || sessionStorage.getItem('clubstate_session') || null;"
)

# 2. Update initialization check 
js = js.replace(
    "if (sessionProject === 'admin') {",
    "if (sessionProject) {"
)

# 3. Completely Rewrite initDashboard
new_init = """
function initDashboard() {
    const db = JSON.parse(localStorage.getItem('state_users')) || [];
    const userObj = db.find(x => x.u === sessionProject) || {};
    const isVIP = userObj.isVIP || sessionProject === 'admin';

    const allProjects = LocalDB.get('projects');
    // Filter projects belonging to this user that are 'finalizado'
    const userProjects = (sessionProject === 'admin') 
        ? allProjects.filter(p => p.status === 'finalizado')
        : allProjects.filter(p => p.owner === sessionProject && p.status === 'finalizado');

    const completedProjects = userProjects.length;

    // Common UI Updates
    document.getElementById('dash-client-name').innerText = (userObj.name || sessionProject).toUpperCase();

    const circle = document.getElementById('dash-progress-circle');
    if (circle) circle.style.display = 'none';
    document.querySelector('.progress-ring').style.display = 'none';
    
    // Avatar section styling trick inside the client-name wrapper
    let avatarHTML = '';
    if (userObj.avatar) {
        avatarHTML = `<img src="${userObj.avatar}" style="width:60px; height:60px; border-radius:50%; object-fit:cover; border:2px solid var(--brand-yellow); display:block; margin-bottom:10px;">`;
    }

    if (!isVIP) {
        // NON-VIP RESTRICTED MODE
        document.getElementById('dash-project-title').innerText = "Conta Padrão (Sem Portfólio Oculto)";
        const statusBadge = document.getElementById('dash-status-badge');
        statusBadge.innerHTML = `<i class="fa-solid fa-lock"></i> ACESSO RESTRITO`;
        statusBadge.style.borderColor = '#ef4444';
        statusBadge.style.color = '#ef4444';
        statusBadge.style.background = 'rgba(239, 68, 68, 0.1)';
        
        document.getElementById('dash-progress-text').innerText = "🔒";
        
        document.getElementById('diary-list').innerHTML = `
            <div style="grid-column: 1 / -1; background:rgba(234, 179, 8, 0.1); border:1px solid var(--brand-yellow); padding:30px; text-align:center; border-radius:12px; margin-top:20px;">
                <i class="fa-solid fa-crown" style="font-size:3rem; color:var(--brand-yellow); margin-bottom:15px;"></i>
                <h3 style="color:var(--brand-yellow); font-family:var(--font-head); font-size:1.5rem; margin-bottom:10px;">TORNE-SE VIP</h3>
                <p style="color:#fff; font-size:0.9rem; margin-bottom:20px;">Seus projetos incríveis merecem ser vistos. Ao ativar o ClubSTATE VIP, seus trabalhos finalizados tornam-se um portfólio público incrível na Rede State global para clientes!</p>
                <button class="btn-primary" onclick="alert('Entre em contato com o Admin para habilitar o status VIP!')">ASSINAR AGORA</button>
            </div>
            <div style="grid-column: 1 / -1; text-align:left; margin-top:30px; padding:20px; background:rgba(255,255,255,0.02); border:1px solid var(--border-glass); border-radius:12px;">
                <h4 style="color:var(--brand-yellow); font-family:var(--font-head); margin-bottom:10px;">SUA BIOGRAFIA</h4>
                <p style="color:var(--text-secondary); font-size:0.9rem; white-space:pre-wrap;">${userObj.bio || 'Edite sua biografia no Dashboard...'}</p>
            </div>
        `;
    } else {
        // VIP MODE: PORTFOLIO FEED
        document.getElementById('dash-project-title').innerText = `${completedProjects} Projetos em Exposição`;
        const statusBadge = document.getElementById('dash-status-badge');
        statusBadge.innerHTML = `<i class="fa-solid fa-crown"></i> ASSINANTE VIP`;
        statusBadge.style.borderColor = 'var(--brand-yellow)';
        statusBadge.style.color = 'var(--brand-yellow)';
        statusBadge.style.background = 'rgba(234, 179, 8, 0.1)';
        
        document.getElementById('dash-progress-text').innerText = "⭐";

        // Render Portfolio Galery
        let feedHTML = `
            <div style="grid-column: 1 / -1; text-align:left; padding:20px; background:rgba(255,255,255,0.02); border:1px solid var(--border-glass); border-radius:12px; margin-bottom:20px;">
                <div style="display:flex; align-items:center; gap:15px;">
                    ${avatarHTML}
                    <div>
                        <h4 style="color:var(--brand-yellow); font-family:var(--font-head); margin-bottom:5px;">${(userObj.name || sessionProject).toUpperCase()}</h4>
                        <p style="color:var(--text-secondary); font-size:0.85rem; white-space:pre-wrap; max-width:600px;">${userObj.bio || 'Edite sua biografia no Dashboard...'}</p>
                    </div>
                </div>
            </div>
            <div style="grid-column: 1 / -1;"><h3 style="font-family:var(--font-head); font-size:1.3rem; margin-bottom:10px; color:var(--text-primary);">SUA VITRINE DE OBRAS CONCLUÍDAS</h3></div>
        `;

        if (userProjects.length === 0) {
            feedHTML += `
                <div style="grid-column: 1 / -1; text-align:center; padding:40px; color:var(--text-muted); border:1px dashed var(--border-glass); border-radius:12px;">
                    Nenhum projeto finalizado no seu nome ainda. Finalize um projeto no Dashboard para ele aparecer aqui!
                </div>
            `;
        } else {
            feedHTML += userProjects.map(p => `
                <div style="grid-column: 1 / -1; background:rgba(0,0,0,0.4); border:1px solid var(--border-glass); border-radius:12px; overflow:hidden; margin-bottom:15px; display:flex; flex-direction:column; md:flex-row;">
                    ${p.images && p.images[0] ? `<img src="${p.images[0]}" style="width:100%; height:250px; object-fit:cover; border-bottom:1px solid var(--border-glass);">` : `<div style="width:100%; height:150px; background:rgba(255,255,255,0.05); display:flex; align-items:center; justify-content:center;"><i class="fa-solid fa-camera-retro" style="font-size:3rem; opacity:0.2;"></i></div>`}
                    <div style="padding:20px;">
                        <span style="font-size:0.7rem; color:var(--brand-yellow); text-transform:uppercase; letter-spacing:2px; font-weight:700;">PROJETO FINALIZADO</span>
                        <h4 style="font-family:var(--font-head); font-size:1.3rem; margin:10px 0; color:#fff;">${p.title}</h4>
                        <div style="color:var(--text-muted); font-size:0.85rem;"><i class="fa-regular fa-calendar" style="margin-right:5px;"></i>${p.date} &nbsp;|&nbsp; <i class="fa-regular fa-user" style="margin-right:5px;"></i>Cliente: ${p.client}</div>
                    </div>
                </div>
            `).join('');
        }

        document.getElementById('diary-list').innerHTML = feedHTML;
    }

    switchView('dashboard');
}
"""

# Replace initDashboard function
js = re.sub(r'function initDashboard\(\) \{.*?\n// UI Utilities', new_init + '\n// UI Utilities', js, flags=re.DOTALL)

with open('c:/Users/caio/Documents/Antigravity/site-marcenaria/club/club.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("club.js refactored successfully.")
