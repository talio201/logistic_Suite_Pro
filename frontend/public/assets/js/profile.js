document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/index.html';
        return;
    }

    const profileForm = document.getElementById('profile-form');
    const passwordForm = document.getElementById('password-form');
    const avatarForm = document.getElementById('avatar-form');
    const avatarInput = document.getElementById('avatar-input');
    const avatarPreview = document.getElementById('avatar-preview');
    const uploadBtn = document.getElementById('upload-btn');
    const notificationArea = document.getElementById('notification-area');
    const generateBadgeBtn = document.getElementById('generate-badge-btn');

    let userId = null;

    const showNotification = (message, type = 'success') => {
        const color = type === 'success' ? 'green' : 'red';
        const notif = `<div class="bg-${color}-100 border-l-4 border-${color}-500 text-${color}-700 p-4" role="alert"><p>${message}</p></div>`;
        notificationArea.innerHTML = notif;
        setTimeout(() => notificationArea.innerHTML = '', 4000);
    };

    const loadUserProfile = async () => {
    try {
        const user = await fetch('/api/users/me', { 
            headers: { 'x-access-token': token } 
        }).then(res => {
            if (!res.ok) throw new Error('Falha ao carregar perfil');
            return res.json();
        });

        userId = user.id;

        // Renderização mais robusta do formulário
        profileForm.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Nome Completo*</label>
                    <input type="text" name="full_name" value="${user.full_name || ''}" 
                           class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Email*</label>
                    <input type="email" name="username" value="${user.username || ''}" 
                           class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Telefone</label>
                    <input type="tel" name="phone" value="${user.phone || ''}" 
                           class="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                           pattern="[0-9]{10,11}">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">CPF/CNPJ</label>
                    <input type="text" name="id_document" value="${user.id_document || ''}" 
                           class="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Data de Nascimento</label>
                    <input type="date" name="birth_date" 
                           value="${user.birth_date ? user.birth_date.split('T')[0] : ''}" 
                           class="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Cargo*</label>
                    <input type="text" name="position" value="${user.position || ''}" 
                           class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required>
                </div>
            </div>
            <button type="submit" class="mt-6 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                Salvar Informações
            </button>
        `;
        
        // Carregamento de avatar com tratamento de erro melhorado
        const avatarUrl = `/api/users/avatar/${userId}?t=${new Date().getTime()}`;
        avatarPreview.src = avatarUrl;
        avatarPreview.onerror = () => { 
            avatarPreview.src = 'https://i.pravatar.cc/150';
            avatarPreview.alt = 'Avatar padrão';
        };

    } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        showNotification(error.message || 'Erro ao carregar dados do perfil.', 'error');
    }
};

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(profileForm);
        const data = Object.fromEntries(formData.entries());

        try {
            const res = await fetch('/api/users/me', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-access-token': token },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message);
            showNotification('Perfil atualizado com sucesso!');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    });

    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(passwordForm);
        const data = Object.fromEntries(formData.entries());

        try {
            const res = await fetch('/api/users/me/password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-access-token': token },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message);
            showNotification('Senha alterada com sucesso!');
            passwordForm.reset();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    });

    avatarInput.addEventListener('change', () => {
        const file = avatarInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                avatarPreview.src = e.target.result;
            };
            reader.readAsDataURL(file);
            uploadBtn.classList.remove('hidden');
        }
    });

    avatarForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('avatar', avatarInput.files[0]);

        try {
            const res = await fetch('/api/users/me/avatar', {
                method: 'POST',
                headers: { 'x-access-token': token },
                body: formData
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message);
            showNotification('Foto de perfil atualizada com sucesso!');
            uploadBtn.classList.add('hidden');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    });

    generateBadgeBtn.addEventListener('click', async () => {
        try {
            const user = await fetch('/api/users/me', { headers: { 'x-access-token': token } }).then(res => res.json());
            const badgeWindow = window.open('', 'Crachá', 'width=400,height=600');
            const avatarSrc = `/api/users/avatar/${user.id}`;
            
            badgeWindow.document.write(`
                <html>
                    <head>
                        <title>Crachá - ${user.full_name}</title>
                        <script src="https://cdn.tailwindcss.com"></script>
                        <style>
                            @media print {
                                body { -webkit-print-color-adjust: exact; }
                                .no-print { display: none; }
                            }
                        </style>
                    </head>
                    <body class="bg-gray-200 flex items-center justify-center h-screen">
                        <div class="w-[350px] h-[550px] bg-white rounded-xl shadow-2xl p-6 flex flex-col items-center">
                            <div class="w-full bg-gray-800 text-white text-center py-4 rounded-t-lg">
                                <h1 class="text-2xl font-bold">LogisSuite Pro</h1>
                            </div>
                            <img src="${avatarSrc}" class="w-40 h-40 rounded-full object-cover border-4 border-white -mt-16 shadow-lg" onerror="this.onerror=null;this.src='https://i.pravatar.cc/150';">
                            <h2 class="text-2xl font-semibold mt-4 text-gray-800">${user.full_name}</h2>
                            <p class="text-gray-500 mt-1">${user.position || 'Colaborador'}</p>
                            <div class="mt-8 border-t border-gray-200 w-full pt-4 text-center">
                                 <p class="text-sm text-gray-600">ID do Funcionário</p>
                                 <p class="text-lg font-mono tracking-widest">${user.employee_id || 'N/A'}</p>
                            </div>
                             <div class="mt-auto w-full">
                                <img src="https://www.barcodesinc.com/generator/image.php?code=${user.employee_id || '123456'}&style=197&type=C128B&width=200&height=50&xres=1&font=3" alt="barcode" />
                            </div>
                        </div>
                        <button onclick="window.print()" class="no-print fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow-lg">Imprimir</button>
                    </body>
                </html>
            `);
            badgeWindow.document.close();

        } catch (error) {
            showNotification('Erro ao gerar crachá. Verifique se o perfil está completo.', 'error');
        }
    });

    loadUserProfile();
});