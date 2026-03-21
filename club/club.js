const LocalDB = {
    get: (key, def = []) => JSON.parse(localStorage.getItem('state_db_' + key)) || def,
    set: (key, val) => localStorage.setItem('state_db_' + key, JSON.stringify(val))
};

// State
let sessionProjectId = sessionStorage.getItem('clubstate_session') || null;

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
    if (sessionProjectId) {
        initDashboard(sessionProjectId);
    } else {
        switchView('login');
    }
});

// Login Handlers
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const code = document.getElementById('access-code').value.trim();
        if (!code) return;
        
        const projects = LocalDB.get('projects');
        const project = projects.find(p => p.id === code);

        if (project) {
            sessionStorage.setItem('clubstate_session', project.id);
            sessionProjectId = project.id;
            toast('Acesso autorizado! Carregando painel...', 'success');
            setTimeout(() => {
                initDashboard(project.id);
            }, 800);
        } else {
            toast('Código de Acesso inválido. Verifique com seu arquiteto.', 'error');
        }
    });
}

function logout() {
    sessionStorage.removeItem('clubstate_session');
    sessionProjectId = null;
    document.getElementById('login-form').reset();
    switchView('login');
    toast('Sessão encerrada com segurança.', 'success');
}
window.logout = logout;

// Dashboard Hydration
function initDashboard(projectId) {
    const project = LocalDB.get('projects').find(p => p.id === projectId);
    if (!project) {
        logout();
        return;
    }

    const client = LocalDB.get('clients').find(c => c.id === project.client);
    const clientName = client ? client.name : 'Visitante';

    // Populate Data
    document.getElementById('dash-client-name').innerText = clientName;
    document.getElementById('dash-project-title').innerText = project.title;
    
    // Status Badge
    const statusMap = {
        'planejamento': { text: 'EM PLANEJAMENTO', icon: 'fa-compass-drafting', color: 'var(--brand-yellow)' },
        'producao': { text: 'EM PRODUÇÃO', icon: 'fa-hammer', color: 'var(--brand-yellow)' },
        'montagem': { text: 'MONTAGEM NO LOCAL', icon: 'fa-truck-fast', color: 'var(--brand-yellow)' },
        'finalizado': { text: 'OBRA CONCLUÍDA', icon: 'fa-check-circle', color: '#4ade80' }
    };
    const stConfig = statusMap[project.status] || { text: project.status.toUpperCase(), icon: 'fa-circle-info', color: 'var(--brand-yellow)' };
    
    document.getElementById('dash-status-badge').innerHTML = `<i class="fa-solid ${stConfig.icon}"></i> ${stConfig.text}`;
    if (project.status === 'finalizado') {
        document.getElementById('dash-status-badge').style.borderColor = '#4ade80';
        document.getElementById('dash-status-badge').style.color = '#4ade80';
        document.getElementById('dash-status-badge').style.background = 'rgba(74, 222, 128, 0.1)';
    }

    // Deadline
    document.getElementById('dash-deadline').innerHTML = `<i class="fa-regular fa-calendar"></i> Previsão: ${project.deadline || 'A definir'}`;

    // Progress
    const progress = parseInt(project.progress || 0);
    document.getElementById('dash-progress-text').innerText = progress + '%';
    const circle = document.getElementById('dash-progress-circle');
    const radius = circle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;
    circle.style.strokeDashoffset = offset;
    
    if (progress === 100) circle.style.stroke = '#4ade80';

    // Diário da Obra (Comments as Timeline)
    renderDiary(project.comments || []);

    // Switch View
    switchView('dashboard');
}

function renderDiary(comments) {
    const list = document.getElementById('diary-list');
    if (!list) return;

    if (comments.length === 0) {
        list.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.85rem;"><i class="fa-solid fa-cloud-moon" style="font-size:2rem; margin-bottom:10px; opacity:0.5; display:block;"></i> Nenhum evento registrado ainda.</div>`;
        return;
    }

    // Reverse to show newest on top
    const sorted = [...comments].reverse();

    list.innerHTML = sorted.map(c => `
        <div style="display:flex; gap:15px; margin-bottom:20px; position:relative;">
            <div style="position:relative; z-index:2; flex-shrink:0; width:35px; height:35px; border-radius:50%; background:var(--brand-yellow); color:#000; display:flex; align-items:center; justify-content:center; font-size:0.8rem;"><i class="fa-solid fa-clipboard-check"></i></div>
            <div style="flex-grow:1; background:rgba(255,255,255,0.02); padding:15px; border-radius:12px; border:1px solid var(--border-glass);">
                <div style="font-size:0.75rem; color:var(--brand-yellow); font-family:var(--font-mono); margin-bottom:8px;">${c.date}</div>
                <div style="font-size:0.9rem; color:#fff; line-height:1.5;">${c.text}</div>
            </div>
        </div>
    `).join('');
}

// UI Utilities
function toast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    if(!container) return;
    const div = document.createElement('div');
    div.className = 'toast';
    if(type === 'error') div.style.borderLeft = '4px solid #ef4444';
    else div.style.borderLeft = '4px solid #4ade80';
    
    div.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-check-circle' : 'fa-circle-xmark'}" style="color:${type === 'success' ? '#4ade80' : '#ef4444'}; margin-right:8px;"></i> ${msg}`;
    container.appendChild(div);
    setTimeout(() => { div.style.opacity = '0'; setTimeout(() => div.remove(), 300); }, 3000);
}
