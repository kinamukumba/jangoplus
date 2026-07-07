document.addEventListener('DOMContentLoaded', async () => {
    // Buscar dados do utilizador autenticado e validar sessão
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
            // REDIRECIONAR SE NÃO TIVER CONCLUÍDO O ONBOARDING OU SE A CONTA PENDENTE DE PAGAMENTO
            const onOnboardingPage = window.location.pathname.includes('onboarding.html');
            const onProbabilidadePage = window.location.pathname.includes('probabilidade.html');
            const isAdmin = data.user.role === 'admin';

            if (!isAdmin) {
                if (!data.user.onboarded_at) {
                    if (!onOnboardingPage) {
                        window.location.href = 'onboarding.html';
                        return;
                    }
                } else if (parseInt(data.user.is_active) === 0) {
                    if (!onProbabilidadePage) {
                        window.location.href = 'probabilidade.html';
                        return;
                    }
                } else {
                    // Se já estiver ativo e onboarded, não pode ficar no onboarding ou probabilidade/pagamento
                    if (onOnboardingPage || onProbabilidadePage) {
                        window.location.href = 'dashboard.html';
                        return;
                    }
                }
            }

            // Populate dashboard if the elements exist
            populateDashboard(data.user);
            populateProfile(data.user);

            // Carregar o roadmap do banco de dados
            loadRoadmap();

            // Carregar estatísticas dinâmicas avançadas
            loadStatsAndGoals();

            // Carregar quiz da missão se estiver na página da missão
            loadMissionQuiz();

            // Configurar e carregar formulários de configurações
            populateSettingsForm();
            setupSettingsForms();

            // Carregar simulado se estiver na página de simulado
            loadSimulado();
        } else {
            console.error('Falha ao carregar dados:', data.error);
        }
    } catch (err) {
        console.error('Erro de rede ao carregar a página', err);
    }

    // Configurar Logout apenas se o botão existir
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await fetch('../backend/api/auth/logout.php', { method: 'POST' });
                window.location.href = '../index.html';
            } catch (err) {
                console.error('Erro ao sair', err);
            }
        });
    }
});

function populateDashboard(user) {
    if (!document.getElementById('stat-streak')) return; // Apenas no dashboard

    document.getElementById('stat-streak').textContent = `${user.current_streak} dias`;

    const delayEl = document.getElementById('stat-delay');
    if (delayEl) {
        delayEl.textContent = `${user.delay_days} dias`;
        if (user.delay_days > 0) {
            delayEl.classList.remove('text-muted-foreground');
            delayEl.classList.add('text-destructive');
        }
    }

    const leagueBadge = document.getElementById('league-badge');
    if (leagueBadge) leagueBadge.textContent = user.league;

    const rankWeekly = document.getElementById('rank-weekly');
    if (rankWeekly) rankWeekly.textContent = `${user.weekly_xp} XP esta semana`;

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

    if (document.getElementById('user-level')) document.getElementById('user-level').textContent = `Lvl ${level}`;
    if (document.getElementById('xp-progress-text')) document.getElementById('xp-progress-text').textContent = `${currentLevelXp} / 1000 XP`;
    if (document.getElementById('xp-progress-bar')) document.getElementById('xp-progress-bar').style.width = `${(currentLevelXp / 1000) * 100}%`;

    // Preencher dias restantes até o exame dinamicamente na home
    const daysLeftEl = document.getElementById('days-left');
    if (daysLeftEl) {
        const examDate = new Date('2026-09-15');
        const today = new Date();
        const diffTime = examDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        daysLeftEl.textContent = diffDays > 0 ? diffDays : 0;
    }

    // Configurar o botão para ir à missão
    const startBtn = document.getElementById('start-mission-btn');
    if (startBtn) {
        startBtn.onclick = () => {
            window.location.href = 'sekulo.html';
        };
    }

    // Carregar a missão dinâmica atual
    const missionList = document.getElementById('mission-list');
    const missionProgText = document.getElementById('mission-progress-text');
    const missionProgressBar = document.getElementById('mission-progress-bar');

    if (missionList) {
        fetch('../backend/api/users/mission.php')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    if (data.completed_all) {
                        missionList.innerHTML = `
                            <li class="flex items-center justify-between bg-success/10 border border-success/20 rounded-md px-4 py-3 text-success text-xs font-semibold">
                                <span>🏆 Todas as missões concluídas com sucesso!</span>
                                <span class="text-sm">🎉</span>
                            </li>
                        `;
                        if (missionProgText) missionProgText.textContent = "100%";
                        if (missionProgressBar) missionProgressBar.style.width = "100%";
                    } else {
                        missionList.innerHTML = `
                            <li class="flex items-center justify-between bg-card border border-border rounded-md px-4 py-3 text-sm hover:border-primary transition-all cursor-pointer" onclick="window.location.href='sekulo.html'">
                                <div>
                                    <span class="text-[9px] uppercase-tight text-primary font-mono tracking-wide">${data.subject}</span>
                                    <h4 class="font-bold text-xs mt-0.5">${data.topic}</h4>
                                    <p class="text-[10px] text-muted-foreground mt-0.5">${data.description}</p>
                                </div>
                                <span class="text-xs font-bold text-primary">Estudar →</span>
                            </li>
                        `;
                        if (missionProgText) missionProgText.textContent = "0/1";
                        if (missionProgressBar) missionProgressBar.style.width = "0%";
                    }
                } else {
                    missionList.innerHTML = `
                        <li class="flex items-center justify-between bg-card border border-border rounded-md px-4 py-3 text-muted-foreground text-xs">
                            Nenhuma missão disponível. Conclua primeiro o onboarding.
                        </li>
                    `;
                }
            })
            .catch(err => {
                console.error(err);
                missionList.innerHTML = `<li class="text-xs text-destructive px-4 py-3">Erro ao carregar missão de hoje.</li>`;
            });
    }
}

function populateProfile(user) {
    if (!document.getElementById('profile-name')) return; // Apenas na página de perfil
    document.getElementById('profile-name').textContent = user.display_name;
    document.getElementById('profile-email').textContent = user.email;
    document.getElementById('profile-xp').textContent = user.xp_total;
    document.getElementById('profile-league').textContent = user.league;
}

async function loadRoadmap() {
    const roadmapList = document.getElementById('roadmap-list-container');
    if (!roadmapList) return; // Apenas se estivermos na roadmap.html

    try {
        const response = await fetch('../backend/api/users/roadmap.php');
        const data = await response.json();

        if (data.success && data.roadmap && data.roadmap.length > 0) {
            roadmapList.innerHTML = ''; // Limpar estático

            data.roadmap.forEach((node, index) => {
                const isCompleted = node.status === 'completed';
                const isAvailable = node.status === 'available';
                const isLocked = node.status === 'locked';

                let statusColor = 'bg-muted';
                let borderClass = 'border-border';
                let statusLabel = 'Bloqueado';
                let statusLabelColor = 'text-muted-foreground';
                let animateClass = '';

                if (isCompleted) {
                    statusColor = 'bg-success';
                    borderClass = 'border-success/30';
                    statusLabel = '100% Concluído';
                    statusLabelColor = 'text-success';
                } else if (isAvailable) {
                    statusColor = 'bg-primary';
                    borderClass = 'border-primary/50 shadow-[0_0_15px_rgba(255,255,255,0.05)]';
                    statusLabel = 'Em Progresso';
                    statusLabelColor = 'text-primary';
                    animateClass = 'animate-pulse';
                }

                const itemHtml = `
                    <div class="relative pl-6 ${isLocked ? 'opacity-60' : ''}">
                        <div class="absolute -left-[9px] top-1 h-4 w-4 rounded-full ${statusColor} ring-4 ring-background ${animateClass}"></div>
                        <div class="bg-card border ${borderClass} rounded-lg p-4">
                            <div class="flex items-center justify-between mb-2">
                                <span class="uppercase-tight text-[10px] ${statusLabelColor}">${node.subject}</span>
                                <span class="text-xs font-mono ${statusLabelColor}">${statusLabel}</span>
                            </div>
                            <h3 class="font-bold">${node.topic}</h3>
                            <p class="text-xs text-muted-foreground mt-1">${node.description}</p>
                            ${isAvailable ? `<button onclick="window.location.href='sekulo.html'" class="btn-primary w-full h-8 uppercase-tight text-[10px] mt-4">Continuar Módulo (Fazer Missão)</button>` : ''}
                        </div>
                    </div>
                `;
                roadmapList.innerHTML += itemHtml;
            });
        } else {
            roadmapList.innerHTML = '<p class="text-xs text-muted-foreground text-center">Nenhum roadmap encontrado. Por favor, conclua o onboarding.</p>';
        }
    } catch (err) {
        console.error('Erro ao carregar o roadmap:', err);
        roadmapList.innerHTML = '<p class="text-xs text-destructive text-center">Erro ao carregar o roadmap do servidor.</p>';
    }
}

async function loadStatsAndGoals() {
    try {
        const response = await fetch('../backend/api/users/stats.php');
        const data = await response.json();
        if (data.success) {
            const stats = data.stats;
            // Preencher estatísticas detalhadas no perfil
            if (document.getElementById('stat-accuracy-rate')) {
                document.getElementById('stat-accuracy-rate').textContent = `${stats.accuracy_rate}%`;
            }
            if (document.getElementById('stat-completed-missions')) {
                document.getElementById('stat-completed-missions').textContent = `${stats.completed_modules} / ${stats.total_modules}`;
            }
            if (document.getElementById('stat-total-quizzes')) {
                document.getElementById('stat-total-quizzes').textContent = stats.total_quizzes;
            }

            // Preencher metas no perfil
            if (document.getElementById('profile-university')) {
                document.getElementById('profile-university').textContent = stats.university;
            }
            if (document.getElementById('profile-course')) {
                document.getElementById('profile-course').textContent = stats.specific_course;
            }
            if (document.getElementById('profile-hours')) {
                document.getElementById('profile-hours').textContent = `${stats.study_hours_day}h / dia`;
            }

            // Calcular dias para o exame dinamicamente
            const daysExamEl = document.getElementById('days-until-exam');
            if (daysExamEl) {
                const examDate = new Date('2026-09-15');
                const today = new Date();
                const diffTime = examDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                daysExamEl.textContent = diffDays > 0 ? diffDays : 0;
            }
        }
    } catch (err) {
        console.error('Erro ao buscar estatísticas:', err);
    }
}

let currentQuizQuestions = [];

async function loadMissionQuiz() {
    const missionContainer = document.getElementById('mission-container');
    if (!missionContainer) return; // Apenas se estivermos na sekulo.html

    try {
        const response = await fetch('../backend/api/users/mission.php');
        const data = await response.json();

        if (data.success) {
            if (data.completed_all) {
                missionContainer.innerHTML = `
                    <div class="text-center py-12 space-y-6">
                        <div class="h-20 w-20 rounded-full bg-success/20 text-success flex items-center justify-center text-4xl mx-auto">🏆</div>
                        <h2 class="font-display text-2xl font-bold">Parabéns!</h2>
                        <p class="text-xs text-muted-foreground max-w-sm mx-auto">${data.message}</p>
                        <a href="dashboard.html" class="btn-primary inline-flex items-center justify-center px-6 h-10 uppercase-tight text-xs mt-4">Voltar ao Painel</a>
                    </div>
                `;
                return;
            }

            currentQuizQuestions = data.questions;

            // Renderizar a missão ativa
            missionContainer.innerHTML = `
                <div class="space-y-6">
                    <div class="border border-primary/20 bg-primary/5 rounded-xl p-4 flex items-center justify-between">
                        <div>
                            <span class="uppercase-tight text-[9px] text-primary tracking-widest">${data.subject}</span>
                            <h2 class="font-display text-lg font-bold">${data.topic}</h2>
                            <p class="text-[10px] text-muted-foreground">${data.description}</p>
                        </div>
                        <span class="text-2xl">🔥</span>
                    </div>

                    <div class="space-y-8" id="quiz-questions-list">
                        <!-- Perguntas injetadas aqui -->
                    </div>

                    <div id="quiz-error" class="hidden text-xs text-destructive font-medium text-center"></div>

                    <button id="btn-submit-quiz" class="btn-primary w-full h-12 uppercase-tight text-xs font-bold mt-4 shadow-lg shadow-primary/10">
                        Submeter Respostas ao Sekulo
                    </button>
                </div>
            `;

            const listContainer = document.getElementById('quiz-questions-list');
            data.questions.forEach((q) => {
                const qHtml = `
                    <div class="space-y-3 bg-card border border-border rounded-xl p-5 relative overflow-hidden" data-qid="${q.id}">
                        <div class="flex items-start gap-3">
                            <span class="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-mono font-bold text-muted-foreground mt-0.5">${q.id}</span>
                            <p class="text-sm font-semibold">${q.text}</p>
                        </div>
                        <div class="grid grid-cols-1 gap-2 pt-2">
                            ${q.options.map((opt) => {
                    const optLetter = opt.trim().charAt(0); // A, B, C, D
                    return `
                                    <button type="button" data-option="${optLetter}" class="option-btn w-full p-3 rounded-lg border border-border bg-muted/10 text-left text-xs font-medium hover:border-primary transition-all select-none flex items-center gap-3">
                                        <span class="option-indicator h-4 w-4 rounded-full border border-muted-foreground/50 flex items-center justify-center font-mono text-[9px]"></span>
                                        <span>${opt}</span>
                                    </button>
                                `;
                }).join('')}
                        </div>
                    </div>
                `;
                listContainer.innerHTML += qHtml;
            });

            // Adicionar evento de clique nas opções
            const questionBlocks = document.querySelectorAll('[data-qid]');
            questionBlocks.forEach(block => {
                const btns = block.querySelectorAll('.option-btn');
                btns.forEach(btn => {
                    btn.addEventListener('click', () => {
                        btns.forEach(b => {
                            b.classList.remove('border-primary', 'bg-primary/5');
                            b.classList.add('border-border', 'bg-muted/10');
                            b.querySelector('.option-indicator').classList.remove('bg-primary', 'border-primary');
                            b.querySelector('.option-indicator').classList.add('border-muted-foreground/50');
                        });
                        btn.classList.remove('border-border', 'bg-muted/10');
                        btn.classList.add('border-primary', 'bg-primary/5');
                        btn.querySelector('.option-indicator').classList.remove('border-muted-foreground/50');
                        btn.querySelector('.option-indicator').classList.add('bg-primary', 'border-primary');
                    });
                });
            });

            // Associar evento ao botão de envio
            document.getElementById('btn-submit-quiz').addEventListener('click', submitQuizAnswers);

        } else {
            missionContainer.innerHTML = `<p class="text-xs text-destructive text-center">${data.error || 'Erro ao carregar missão.'}</p>`;
        }
    } catch (err) {
        console.error('Erro ao carregar o quiz da missão:', err);
        missionContainer.innerHTML = '<p class="text-xs text-destructive text-center">Erro ao ligar ao servidor local.</p>';
    }
}

async function submitQuizAnswers() {
    const questionBlocks = document.querySelectorAll('[data-qid]');
    const answers = {};
    let allAnswered = true;

    questionBlocks.forEach(block => {
        const qid = block.getAttribute('data-qid');
        const selectedBtn = block.querySelector('.option-btn.border-primary');
        if (selectedBtn) {
            answers[qid] = selectedBtn.getAttribute('data-option');
        } else {
            allAnswered = false;
        }
    });

    const errEl = document.getElementById('quiz-error');
    if (!allAnswered) {
        errEl.textContent = 'Responde a todas as perguntas antes de submeter ao Sekulo.';
        errEl.classList.remove('hidden');
        return;
    }
    errEl.classList.add('hidden');

    const btnSubmit = document.getElementById('btn-submit-quiz');
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Sekulo está a corrigir...';

    try {
        const response = await fetch('../backend/api/users/submit_mission.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answers })
        });
        const data = await response.json();

        if (data.success) {
            const missionContainer = document.getElementById('mission-container');

            let resultStatusColor = 'text-destructive';
            let bgStatusColor = 'bg-destructive/10 border-destructive/20';
            let resultTitle = 'Reprovado pelo Sekulo!';
            let resultIcon = '💀';

            if (data.passed) {
                resultStatusColor = 'text-success';
                bgStatusColor = 'bg-success/10 border-success/20';
                resultTitle = 'Aprovado pelo Sekulo!';
                resultIcon = '⚡';
            }

            missionContainer.innerHTML = `
                <div class="space-y-6 text-center py-6">
                    <div class="h-20 w-20 rounded-full ${data.passed ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'} flex items-center justify-center text-4xl mx-auto animate-bounce">${resultIcon}</div>
                    
                    <div class="space-y-2">
                        <h2 class="font-display text-2xl font-bold ${resultStatusColor}">${resultTitle}</h2>
                        <p class="text-xs text-muted-foreground">Acertaste <strong>${data.correct_count} de ${data.total_questions}</strong> perguntas (${data.score_percentage}%).</p>
                    </div>

                    <div class="border ${bgStatusColor} rounded-xl p-5 max-w-sm mx-auto text-left space-y-3">
                        <div class="flex gap-3">
                            <span class="text-xl">👴</span>
                            <div>
                                <span class="uppercase-tight text-[9px] text-muted-foreground">SEKULO DIZ:</span>
                                <p class="text-xs font-semibold italic mt-0.5">${data.sekulo_message}</p>
                            </div>
                        </div>
                    </div>

                    ${data.passed ? `
                        <div class="space-y-2 max-w-sm mx-auto">
                            <div class="flex items-center justify-between text-xs border-b border-border py-2">
                                <span>XP Ganho:</span>
                                <span class="font-bold text-primary font-mono">+${data.xp_earned} XP</span>
                            </div>
                            ${data.unlocked_next ? `
                                <div class="flex items-center justify-between text-xs py-2 text-primary">
                                    <span>Próximo Módulo Desbloqueado:</span>
                                    <span class="font-bold">${data.next_topic}</span>
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}

                    <div class="flex items-center gap-3 justify-center pt-4">
                        <a href="dashboard.html" class="btn-primary w-32 h-10 uppercase-tight text-xs inline-flex items-center justify-center">Painel</a>
                        ${data.passed ? `
                            <a href="roadmap.html" class="btn-primary w-32 h-10 uppercase-tight text-xs inline-flex items-center justify-center bg-success hover:bg-success-hover">Ver Roadmap</a>
                        ` : `
                            <button onclick="window.location.reload()" class="btn-primary w-32 h-10 uppercase-tight text-xs">Tentar de Novo</button>
                        `}
                    </div>
                </div>
            `;

        } else {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Submeter Respostas ao Sekulo';
            errEl.textContent = data.error || 'Erro ao submeter quiz.';
            errEl.classList.remove('hidden');
        }
    } catch (err) {
        console.error('Erro ao submeter quiz:', err);
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Submeter Respostas ao Sekulo';
        errEl.textContent = 'Erro de ligação ao servidor.';
        errEl.classList.remove('hidden');
    }
}

async function populateSettingsForm() {
    if (!document.getElementById('settings-display-name')) return; // Apenas se estivermos na configuracoes.html

    try {
        const response = await fetch('../backend/api/users/stats.php');
        const data = await response.json();
        if (data.success) {
            const stats = data.stats;
            document.getElementById('settings-university').value = stats.university;
            document.getElementById('settings-category').value = stats.course_category;
            document.getElementById('settings-course').value = stats.specific_course;
            document.getElementById('settings-hours').value = stats.study_hours_day;
            document.getElementById('settings-motivation').value = stats.motivation;
        }

        // Carregar display_name do endpoint me.php
        const responseMe = await fetch('../backend/api/users/me.php');
        const dataMe = await responseMe.json();
        if (dataMe.success) {
            document.getElementById('settings-display-name').value = dataMe.user.display_name;
        }
    } catch (err) {
        console.error('Erro ao preencher formulário de configurações:', err);
    }
}

function setupSettingsForms() {
    // Formulário de perfil/senha
    const profileForm = document.getElementById('settings-profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const displayName = document.getElementById('settings-display-name').value.trim();
            const password = document.getElementById('settings-password').value;
            const errorEl = document.getElementById('settings-profile-error');
            const successEl = document.getElementById('settings-profile-success');

            errorEl.classList.add('hidden');
            successEl.classList.add('hidden');

            try {
                const response = await fetch('../backend/api/users/update_settings.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'profile', display_name: displayName, password })
                });
                const data = await response.json();
                if (data.success) {
                    successEl.textContent = data.message;
                    successEl.classList.remove('hidden');
                    document.getElementById('settings-password').value = '';
                } else {
                    errorEl.textContent = data.error;
                    errorEl.classList.remove('hidden');
                }
            } catch (err) {
                errorEl.textContent = 'Erro ao conectar ao servidor.';
                errorEl.classList.remove('hidden');
            }
        });
    }

    // Formulário de Metas Académicas
    const goalsForm = document.getElementById('settings-goals-form');
    if (goalsForm) {
        goalsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const university = document.getElementById('settings-university').value;
            const courseCategory = document.getElementById('settings-category').value;
            const specificCourse = document.getElementById('settings-course').value.trim();
            const studyHours = parseFloat(document.getElementById('settings-hours').value);
            const motivation = document.getElementById('settings-motivation').value.trim();
            const regenerateRoadmap = document.getElementById('settings-regenerate').checked;

            const errorEl = document.getElementById('settings-goals-error');
            const successEl = document.getElementById('settings-goals-success');

            errorEl.classList.add('hidden');
            successEl.classList.add('hidden');

            try {
                const response = await fetch('../backend/api/users/update_settings.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'goals',
                        university,
                        course_category: courseCategory,
                        specific_course: specificCourse,
                        study_hours_day: studyHours,
                        motivation,
                        regenerate_roadmap: regenerateRoadmap
                    })
                });
                const data = await response.json();
                if (data.success) {
                    successEl.textContent = data.message;
                    successEl.classList.remove('hidden');
                } else {
                    errorEl.textContent = data.error;
                    errorEl.classList.remove('hidden');
                }
            } catch (err) {
                errorEl.textContent = 'Erro ao conectar ao servidor.';
                errorEl.classList.remove('hidden');
            }
        });
    }
}


let simuladoTimerInterval = null;
let simuladoSecondsLeft = 1200; // 20 minutos por padrão

async function loadSimulado() {
    const container = document.getElementById('simulado-container');
    if (!container) return; // Apenas na simulado.html

    try {
        const response = await fetch('../backend/api/users/simulado.php');
        const data = await response.json();

        if (data.success) {
            // Renderizar cabeçalho da universidade/curso e as 10 perguntas
            container.innerHTML = `
                <div class="space-y-6">
                    <div class="border border-primary/20 bg-primary/5 rounded-xl p-4 flex items-center justify-between">
                        <div>
                            <span class="uppercase-tight text-[9px] text-primary tracking-widest">${data.course_category}</span>
                            <h2 class="font-display text-lg font-bold">Simulado de Admissão - ${data.university}</h2>
                            <p class="text-[10px] text-muted-foreground">Curso Alvo: <strong>${data.specific_course}</strong> • 10 Perguntas Complexas</p>
                        </div>
                        <span class="text-3xl">🎓</span>
                    </div>

                    <div class="space-y-8" id="simulado-questions-list">
                        <!-- Perguntas injetadas aqui -->
                    </div>

                    <div id="simulado-error" class="hidden text-xs text-destructive font-medium text-center bg-destructive/10 border border-destructive/20 rounded-lg p-3"></div>

                    <button id="btn-submit-simulado" class="btn-primary w-full h-12 uppercase-tight text-xs font-bold mt-4 shadow-lg shadow-primary/10">
                        Submeter Exame para o Sekulo
                    </button>
                </div>
            `;

            const listContainer = document.getElementById('simulado-questions-list');
            data.questions.forEach((q) => {
                const qHtml = `
                    <div class="space-y-3 bg-card border border-border rounded-xl p-5 relative overflow-hidden" data-sqid="${q.id}">
                        <div class="flex items-start gap-3">
                            <span class="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-mono font-bold text-muted-foreground mt-0.5">${q.id}</span>
                            <div>
                                <span class="uppercase-tight text-[9px] text-primary font-mono">${q.subject}</span>
                                <p class="text-sm font-semibold mt-1">${q.text}</p>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 gap-2 pt-2">
                            ${q.options.map((opt) => {
                    const optLetter = opt.trim().charAt(0); // A, B, C, D
                    return `
                                    <button type="button" data-option="${optLetter}" class="simulado-option-btn w-full p-3 rounded-lg border border-border bg-muted/10 text-left text-xs font-medium hover:border-primary transition-all select-none flex items-center gap-3">
                                        <span class="option-indicator h-4 w-4 rounded-full border border-muted-foreground/50 flex items-center justify-center font-mono text-[9px]"></span>
                                        <span>${opt}</span>
                                    </button>
                                `;
                }).join('')}
                        </div>
                    </div>
                `;
                listContainer.innerHTML += qHtml;
            });

            // Configurar comportamento de clique nas opções do simulado
            const questionBlocks = document.querySelectorAll('[data-sqid]');
            questionBlocks.forEach(block => {
                const btns = block.querySelectorAll('.simulado-option-btn');
                btns.forEach(btn => {
                    btn.addEventListener('click', () => {
                        btns.forEach(b => {
                            b.classList.remove('border-primary', 'bg-primary/5');
                            b.classList.add('border-border', 'bg-muted/10');
                            b.querySelector('.option-indicator').classList.remove('bg-primary', 'border-primary');
                            b.querySelector('.option-indicator').classList.add('border-muted-foreground/50');
                        });
                        btn.classList.remove('border-border', 'bg-muted/10');
                        btn.classList.add('border-primary', 'bg-primary/5');
                        btn.querySelector('.option-indicator').classList.remove('border-muted-foreground/50');
                        btn.querySelector('.option-indicator').classList.add('bg-primary', 'border-primary');
                    });
                });
            });

            // Configurar Timer regressivo de 20 minutos
            startSimuladoCountdown();

            // Configurar botões de submissão e modal
            const submitBtn = document.getElementById('btn-submit-simulado');
            const confirmModal = document.getElementById('confirm-modal');
            const modalCancel = document.getElementById('modal-cancel-btn');
            const modalConfirm = document.getElementById('modal-confirm-btn');

            submitBtn.addEventListener('click', () => {
                // Verificar se todas as questões estão marcadas
                const unanswered = checkUnansweredQuestions();
                const errEl = document.getElementById('simulado-error');

                if (unanswered > 0) {
                    errEl.textContent = `Ainda te faltam responder a ${unanswered} questões. Responde a todas as perguntas antes de submeter ao Sekulo.`;
                    errEl.classList.remove('hidden');
                    errEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return;
                }

                errEl.classList.add('hidden');
                confirmModal.classList.remove('hidden');
            });

            modalCancel.addEventListener('click', () => {
                confirmModal.classList.add('hidden');
            });

            modalConfirm.addEventListener('click', () => {
                confirmModal.classList.add('hidden');
                submitSimuladoAnswers();
            });

        } else {
            container.innerHTML = `<p class="text-xs text-destructive text-center">${data.error || 'Erro ao gerar simulado.'}</p>`;
        }
    } catch (err) {
        console.error('Erro ao carregar o simulado:', err);
        container.innerHTML = '<p class="text-xs text-destructive text-center">Erro ao ligar ao servidor local do Jango.</p>';
    }
}

function checkUnansweredQuestions() {
    const questionBlocks = document.querySelectorAll('[data-sqid]');
    let unansweredCount = 0;
    questionBlocks.forEach(block => {
        const selected = block.querySelector('.simulado-option-btn.border-primary');
        if (!selected) unansweredCount++;
    });
    return unansweredCount;
}

function startSimuladoCountdown() {
    if (simuladoTimerInterval) clearInterval(simuladoTimerInterval);

    simuladoSecondsLeft = 1200; // 20 minutos
    const timerText = document.getElementById('simulado-timer');
    const timerDot = document.getElementById('timer-dot');

    simuladoTimerInterval = setInterval(() => {
        simuladoSecondsLeft--;

        if (simuladoSecondsLeft <= 0) {
            clearInterval(simuladoTimerInterval);
            timerText.textContent = "00:00";
            alert("O tempo esgotou! O Sekulo recolheu a tua prova automaticamente para avaliação.");
            submitSimuladoAnswers(true); // Forçar submissão automática por tempo esgotado
            return;
        }

        const mins = Math.floor(simuladoSecondsLeft / 60);
        const secs = simuladoSecondsLeft % 60;
        const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        timerText.textContent = formatted;

        // Efeito de perigo nos últimos 2 minutos (120 segundos)
        if (simuladoSecondsLeft <= 120) {
            timerText.classList.remove('text-primary');
            timerText.classList.add('text-destructive', 'animate-pulse');
            timerDot.classList.remove('bg-primary');
            timerDot.classList.add('bg-destructive');
        }
    }, 1000);
}

async function submitSimuladoAnswers(isTimeout = false) {
    if (simuladoTimerInterval) clearInterval(simuladoTimerInterval);

    const questionBlocks = document.querySelectorAll('[data-sqid]');
    const answers = {};

    questionBlocks.forEach(block => {
        const qid = block.getAttribute('data-sqid');
        const selected = block.querySelector('.simulado-option-btn.border-primary');
        if (selected) {
            answers[qid] = selected.getAttribute('data-option');
        } else {
            answers[qid] = ''; // Vazio em caso de timeout ou incompleto
        }
    });

    const submitBtn = document.getElementById('btn-submit-simulado');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'O Sekulo está a corrigir o teu exame...';
    }

    try {
        const response = await fetch('../backend/api/users/submit_simulado.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answers })
        });
        const data = await response.json();

        if (data.success) {
            const container = document.getElementById('simulado-container');
            const timerContainer = document.getElementById('simulado-timer-container');
            if (timerContainer) timerContainer.classList.add('hidden');

            let statusColor = 'text-destructive';
            let bgStatusColor = 'bg-destructive/10 border-destructive/20';
            let verdictTitle = 'REPROVADO PELO SEKULO';
            let emojiAvatar = '💀';

            if (data.passed) {
                statusColor = 'text-success';
                bgStatusColor = 'bg-success/10 border-success/20';
                verdictTitle = 'APROVADO PELO SEKULO!';
                emojiAvatar = '⚡';
            }

            container.innerHTML = `
                <div class="space-y-8 py-4">
                    <!-- Radial Score & Title -->
                    <div class="text-center space-y-3">
                        <div class="h-28 w-28 rounded-full ${data.passed ? 'bg-success/20 text-success border border-success/30' : 'bg-destructive/20 text-destructive border border-destructive/30'} flex flex-col items-center justify-center mx-auto shadow-xl">
                            <span class="text-3xl font-display font-bold">${data.correct_count}</span>
                            <span class="text-[10px] uppercase-tight text-muted-foreground font-mono">de 10 acertos</span>
                        </div>
                        <div class="space-y-1">
                            <h2 class="font-display text-2xl font-black tracking-wide ${statusColor} mt-2">${verdictTitle}</h2>
                            <p class="text-xs text-muted-foreground">Exame de admissão preparatório: <strong>${data.specific_course}</strong> na <strong>${data.university}</strong>.</p>
                        </div>
                    </div>

                    <!-- Sekulo Direct Verdict Quote -->
                    <div class="border ${bgStatusColor} rounded-xl p-5 max-w-xl mx-auto space-y-3 shadow-lg relative overflow-hidden">
                        <div class="absolute -right-4 -bottom-4 text-7xl opacity-5 select-none">${emojiAvatar}</div>
                        <div class="flex gap-4">
                            <span class="text-3xl">👴</span>
                            <div>
                                <span class="uppercase-tight text-[9px] text-muted-foreground tracking-wider font-bold">O VEREDICTO DO SEKULO:</span>
                                <p class="text-sm font-semibold italic mt-1 leading-relaxed text-foreground">${data.sekulo_message}</p>
                            </div>
                        </div>
                    </div>

                    <!-- XP Reward Block if passed -->
                    ${data.passed ? `
                        <div class="bg-primary/5 border border-primary/20 rounded-xl p-4 max-w-sm mx-auto text-center space-y-1 shadow-md">
                            <span class="uppercase-tight text-[9px] text-primary tracking-widest font-mono">RECOMPENSA DE DESEMPENHO</span>
                            <h4 class="font-display text-lg font-black text-primary">+${data.xp_earned} XP ADICIONADOS</h4>
                            <p class="text-[10px] text-muted-foreground">Estatísticas atualizadas. A tua sequência foi protegida.</p>
                        </div>
                    ` : ''}

                    <!-- Detailed Correction Grid -->
                    <div class="space-y-4 max-w-xl mx-auto">
                        <h3 class="font-display text-sm font-bold border-b border-border pb-2">Revisão Detalhada da Prova</h3>
                        <div class="grid grid-cols-1 gap-2">
                            ${Object.keys(data.feedback).map(qNum => {
                const f = data.feedback[qNum];
                return `
                                    <div class="flex items-center justify-between bg-card border ${f.is_correct ? 'border-success/20 bg-success/5' : 'border-destructive/20 bg-destructive/5'} rounded-lg p-3 text-xs">
                                        <div class="flex items-center gap-3">
                                            <span class="h-6 w-6 rounded-full ${f.is_correct ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'} flex items-center justify-center font-mono font-bold">${qNum}</span>
                                            <span class="font-medium text-foreground">Questão ${qNum}</span>
                                        </div>
                                        <div class="flex items-center gap-4 font-mono">
                                            <span class="text-muted-foreground">Tua resposta: <strong class="${f.is_correct ? 'text-success' : 'text-destructive'}">${f.user_answer || 'Nenhuma'}</strong></span>
                                            ${!f.is_correct ? `<span class="text-success">Correto: <strong>${f.correct_answer}</strong></span>` : ''}
                                        </div>
                                    </div>
                                `;
            }).join('')}
                        </div>
                    </div>

                    <!-- Action buttons -->
                    <div class="flex items-center gap-3 justify-center pt-4">
                        <a href="dashboard.html" class="btn-primary w-36 h-11 uppercase-tight text-xs inline-flex items-center justify-center shadow-md">Voltar ao Painel</a>
                        <button onclick="window.location.reload()" class="btn-primary w-36 h-11 uppercase-tight text-xs bg-muted border border-border text-foreground hover:bg-accent hover:text-foreground inline-flex items-center justify-center">Tentar de Novo</button>
                    </div>
                </div>
            `;

        } else {
            showSubmitError(data.error || 'Erro ao processar as respostas.');
        }
    } catch (err) {
        console.error('Erro ao submeter simulado:', err);
        showSubmitError('Erro de ligação ao servidor Jango.');
    }
}

function showSubmitError(msg) {
    const submitBtn = document.getElementById('btn-submit-simulado');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submeter Exame para o Sekulo';
    }
    const errEl = document.getElementById('simulado-error');
    if (errEl) {
        errEl.textContent = msg;
        errEl.classList.remove('hidden');
        errEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}


