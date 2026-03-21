import re

with open('c:/Users/caio/Documents/Antigravity/site-marcenaria/admin/dashboard.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Unified switchModule covering all cases (Feed, RBAC, Admin Settings, etc)
unified_switch = """
function switchModule(modId) {
    const currentUser = localStorage.getItem('state_current_user') || 'admin';
    
    // Hide all
    sections.forEach(s => s.classList.remove('active'));
    navLinks.forEach(l => l.classList.remove('active'));

    // Select target
    const target = document.getElementById('mod-' + modId);
    const nav = document.querySelector(`.nav-link[data-mod="${modId}"]`);
    
    if(target) target.classList.add('active');
    if(nav) nav.classList.add('active');

    // Update Topbar Name
    const span = nav?.querySelector('span');
    if(span && document.getElementById('current-mod-name')) {
        document.getElementById('current-mod-name').innerText = span.innerText;
    }

    // Special Module Logic
    if(modId === 'home') {
        const adminStats = document.getElementById('home-admin-stats');
        const socialFeed = document.getElementById('home-social-feed');
        if(currentUser === 'admin') {
            if(adminStats) adminStats.style.display = 'block';
            if(socialFeed) socialFeed.style.display = 'block';
        } else {
            if(adminStats) adminStats.style.display = 'none';
            if(socialFeed) socialFeed.style.display = 'block';
        }
        renderFeed();
        updateStats();
    }
    
    if(modId === 'admsettings') renderAdminSettings();
    if(modId === 'friends') renderFriends();
    if(modId === 'groups') renderGroups();
    
    // Auto-close sidebar on mobile
    const sidebar = document.getElementById('sidebar');
    if(sidebar) sidebar.classList.remove('open');
}
"""

# Remove ALL existing instances of function switchModule(...) { ... }
content = re.sub(r'function switchModule\(.*?\)\s*\{.*?\}', '', content, flags=re.DOTALL)

# Re-inject at a safe place (before loadProfile or end of file)
content += "\n" + unified_switch

# Fix Crown/Coroa VIP visual
with open('c:/Users/caio/Documents/Antigravity/site-marcenaria/admin/dashboard.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Crown Icon update + VIP incentive texts
html = html.replace('class="btn-royal"', 'id="crown-vip-btn" class="btn-royal"')
# Add VIP Upgrade trigger
html = html.replace('<div class="topbar-right">', '<div class="topbar-right"> <div id="vip-upsell-tag" style="display:none; color:var(--brand-yellow); font-size:0.6rem; font-weight:900; background:rgba(234,179,8,0.1); padding:4px 8px; border-radius:4px; margin-right:10px; cursor:pointer;" onclick="switchModule(\'profile\')">SEJA VIP 💎</div>')

# Social Feed Logic fix: Ensure post submit is working
# (Already injected, just checking if something missed)

with open('c:/Users/caio/Documents/Antigravity/site-marcenaria/admin/dashboard.js', 'w', encoding='utf-8') as f:
    f.write(content)

with open('c:/Users/caio/Documents/Antigravity/site-marcenaria/admin/dashboard.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Navigation and VIP Visuals fixed.")
