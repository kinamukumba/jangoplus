document.addEventListener('DOMContentLoaded', async () => {
    // Verificar se estamos no dashboard e buscar dados
    const logoutBtn = document.getElementById('logout-btn');
    if (!logoutBtn) return; // Não estamos no dashboard (ou perfil, etc)

    try {
        // App.js is loaded from /utente/*.html, so the API path is ../backend/...
        const response = await fetch('../backend/api/users/me.php', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401) {
            window.location.href = '../index.html';
            return;
        }

        const data = await response.json();
        
        if (data.success) {
            // Populate dashboard if the elements exist
            populateDashboard(data.user);
            populateProfile(data.user);
        } else {
            console.error('Falha ao carregar dados:', data.error);
        }
    } catch (err) {
        console.error('Erro de rede ao carregar a página', err);
    }

    // Logout
    logoutBtn.addEventListener('click', async () => {
        try {
            await fetch('../backend/api/auth/logout.php', { method: 'POST' });
            window.location.href = '../index.html';
        } catch (err) {
            console.error('Erro ao sair', err);
        }
    });
});

function populateDashboard(user) {
    if (!document.getElementById('stat-streak')) return; // Apenas no dashboard

    document.getElementById('stat-streak').textContent = `${user.current_streak} dias`;
    
    const delayEl = document.getElementById('stat-delay');
    if(delayEl) {
        delayEl.textContent = `${user.delay_days} dias`;
        if (user.delay_days > 0) {
            delayEl.classList.remove('text-muted-foreground');
            delayEl.classList.add('text-destructive');
        }
    }

    const leagueBadge = document.getElementById('league-badge');
    if(leagueBadge) leagueBadge.textContent = user.league;
    
    const rankWeekly = document.getElementById('rank-weekly');
    if(rankWeekly) rankWeekly.textContent = `${user.weekly_xp} XP esta semana`;

    const sekuloMsg = document.getElementById('sekulo-message');
    if (sekuloMsg) {
        if (user.delay_days > 0) {
            sekuloMsg.textContent = `${user.delay_days} dias perdido. Os outros continuam a estudar.`;
        } else {
            sekuloMsg.textContent = "A consistência é o que separa os amadores dos aprovados.";
        }
    }

    const level = Math.floor((user.xp_total || 0) / 1000) + 1;
    const currentLevelXp = (user.xp_total || 0) % 1000;
    
    if(document.getElementById('user-level')) document.getElementById('user-level').textContent = `Lvl ${level}`;
    if(document.getElementById('xp-progress-text')) document.getElementById('xp-progress-text').textContent = `${currentLevelXp} / 1000 XP`;
    if(document.getElementById('xp-progress-bar')) document.getElementById('xp-progress-bar').style.width = `${(currentLevelXp / 1000) * 100}%`;
}

function populateProfile(user) {
    if (!document.getElementById('profile-name')) return; // Apenas na página de perfil
    document.getElementById('profile-name').textContent = user.display_name;
    document.getElementById('profile-email').textContent = user.email;
    document.getElementById('profile-xp').textContent = user.xp_total;
    document.getElementById('profile-league').textContent = user.league;
}
