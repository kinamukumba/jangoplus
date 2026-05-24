document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('auth-form');
    if (!form) return;

    const toggleBtn = document.getElementById('toggle-mode-btn');
    const nameField = document.getElementById('name-field');
    const nameInput = document.getElementById('name');
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
        } else {
            mode = 'signin';
            formTitle.textContent = 'Entrar';
            formSubtitle.textContent = 'Acede à tua conta para continuar o estudo.';
            submitBtn.textContent = 'Entrar';
            toggleBtn.textContent = 'Ainda não tenho conta';
            nameField.classList.add('hidden');
            nameInput.required = false;
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        submitBtn.disabled = true;
        submitBtn.textContent = '...';
        errorMsg.classList.add('hidden');

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const name = nameInput.value;

        // Note: auth.js is imported in /index.html
        const endpoint = mode === 'signin' 
            ? 'https://api.plucianoadvogados.com/backend/api/auth/login.php' 
            : 'https://api.plucianoadvogados.com/backend/api/auth/register.php';

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password, name })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                window.location.href = 'utente/dashboard.html';
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
