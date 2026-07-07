document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('auth-form');
    if (!form) return;

    const toggleBtn = document.getElementById('toggle-mode-btn');
    const nameField = document.getElementById('name-field');
    const nameInput = document.getElementById('name');
    const phoneField = document.getElementById('phone-field');
    const phoneInput = document.getElementById('phone');
    const emailLabel = document.getElementById('email-label');
    const emailInput = document.getElementById('email');
    const formTitle = document.getElementById('form-title');
    const formSubtitle = document.getElementById('form-subtitle');
    const submitBtn = document.getElementById('submit-btn');
    const errorMsg = document.getElementById('error-message');
    
    let mode = 'signin'; 

    toggleBtn.addEventListener('click', () => {
        if (mode === 'signin') {
            mode = 'signup';
            formTitle.textContent = 'Criar conta';
            formSubtitle.textContent = 'Regista-te para começar a tua preparação.';
            submitBtn.textContent = 'Criar conta';
            toggleBtn.textContent = 'Já tenho conta';
            nameField.classList.remove('hidden');
            nameInput.required = true;
            phoneField.classList.remove('hidden');
            emailLabel.textContent = 'Email';
            emailInput.placeholder = 'email@exemplo.com';
        } else {
            mode = 'signin';
            formTitle.textContent = 'Entrar';
            formSubtitle.textContent = 'Acede à tua conta para continuar o estudo.';
            submitBtn.textContent = 'Entrar';
            toggleBtn.textContent = 'Ainda não tenho conta';
            nameField.classList.add('hidden');
            nameInput.required = false;
            phoneField.classList.add('hidden');
            emailLabel.textContent = 'Email ou Nº de Telefone';
            emailInput.placeholder = 'email@exemplo.com ou 9XXXXXXXX';
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        submitBtn.disabled = true;
        submitBtn.textContent = '...';
        errorMsg.classList.add('hidden');

        const email = emailInput.value;
        const password = document.getElementById('password').value;
        const name = nameInput.value;
        const phone = phoneInput.value;

        // Relative path matches index.html location
        const endpoint = mode === 'signin' 
            ? 'backend/api/auth/login.php' 
            : 'backend/api/auth/register.php';

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, phone, password, name })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                const user = data.user;
                if (user && user.role === 'admin') {
                    window.location.href = 'admin/dashboard.html';
                } else if (!user.onboarded_at) {
                    // Novo utilizador ou sem onboarding feito → vai para onboarding
                    window.location.href = 'utente/onboarding.html';
                } else if (parseInt(user.is_active) === 0) {
                    // Onboarding feito mas conta ainda não activada → ecrã de pagamento
                    window.location.href = 'utente/probabilidade.html';
                } else {
                    // Conta activa e onboarded → dashboard
                    window.location.href = 'utente/dashboard.html';
                }
            } else {
                errorMsg.textContent = data.error || 'Ocorreu um erro.';
                errorMsg.classList.remove('hidden');
            }
        } catch (error) {
            errorMsg.textContent = 'Falha na conexão com o servidor.';
            errorMsg.classList.remove('hidden');
            console.error(error);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = mode === 'signin' ? 'Entrar' : 'Criar conta';
        }
    });
});
