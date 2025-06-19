document.addEventListener('DOMContentLoaded', () => {
    //-- NÃO ALTERADO: Sua lógica original mantida.
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/index.html';
        return;
    }

    //-- NÃO ALTERADO: Sua lógica original mantida.
    let gridInstance = null;
    let userProfileData = null;
    let currentUserRole = null;
    //-- ADIÇÃO: Array para gerenciar instâncias de gráficos, para evitar sobreposição.
    let activeCharts = []; 

    //-- NÃO ALTERADO: Sua lógica original de notificações mantida.
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg text-white ${
            type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } z-50 transition-all duration-300 transform translate-x-full`;
        notification.innerHTML = `
            <div class="flex items-center">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-2"></i>
                <span>${message}</span>
            </div>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
            notification.classList.add('translate-x-0');
        }, 50);
        
        setTimeout(() => {
            notification.classList.remove('translate-x-0');
            notification.classList.add('translate-x-full');
            notification.addEventListener('transitionend', () => notification.remove(), { once: true });
        }, 3000);
    }

    //-- MODIFICAÇÃO: Adicionada a limpeza de gráficos ao trocar de página.
    async function loadContent(page) {
        if (gridInstance) { 
            gridInstance.destroy();
            gridInstance = null; 
        }
        //-- ADIÇÃO: Limpa gráficos ativos ao trocar de página.
        if (activeCharts.length > 0) {
            activeCharts.forEach(chart => chart.destroy());
            activeCharts = [];
        }
        
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('bg-primary', 'text-white');
            link.classList.add('text-gray-200', 'hover:bg-slate-700');
        });
        
        const targetNavLink = document.querySelector(`.nav-link[data-page="${page}"]`);
        if (targetNavLink) {
            targetNavLink.classList.add('bg-primary', 'text-white');
            targetNavLink.classList.remove('text-gray-200', 'hover:bg-slate-700');
        }
        
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="flex justify-center items-center h-64">
                <div class="animate-pulse flex flex-col items-center">
                    <i class="fas fa-spinner fa-spin text-4xl text-primary mb-4"></i>
                    <span class="text-gray-600">Carregando...</span>
                </div>
            </div>
        `;

        try {
            let pageTitle = '';
            if (page === 'overview') {
                pageTitle = 'Dashboard';
                await loadOverviewPage();
            } 
            else if (page === 'profile') {
                pageTitle = 'Meu Perfil';
                await loadProfilePage();
            }
            else if (page === 'users_management') {
                pageTitle = 'Gerenciamento de Usuários';
                await loadUsersManagementPage();
            }
            else if (page.startsWith('table_')) {
                const tableName = page.split('_')[1];
                pageTitle = `Visualizar ${tableName.charAt(0).toUpperCase() + tableName.slice(1)}`;
                await loadDataTablePage(page);
            } else {
                pageTitle = 'Página Não Encontrada';
                mainContent.innerHTML = `
                    <div class="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
                        <p class="font-bold">Aviso</p>
                        <p>A página "${pageTitle}" não foi implementada.</p>
                    </div>
                `;
            }
            document.getElementById('page-title').textContent = pageTitle;

        } catch (error) {
            console.error("Erro ao carregar página:", error);
            mainContent.innerHTML = `
                <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
                    <p class="font-bold">Erro</p>
                    <p>${error.message || 'Falha ao carregar o conteúdo.'}</p>
                </div>
            `;
            showNotification(`Erro ao carregar ${document.getElementById('page-title').textContent}.`, 'error');
        }
    }

    //-- NÃO ALTERADO: Mantido o envio com 'x-access-token' como no seu original.
    async function fetchData(url, options = {}) {
        try {
            const response = await fetch(url, {
                headers: { 'x-access-token': token, ...options.headers },
                ...options
            });
            
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                     localStorage.removeItem('token');
                     window.location.href = '/index.html';
                }
                const data = await response.json();
                throw new Error(data.message || `Erro na requisição para ${url}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Erro ao buscar dados de ${url}:`, error);
            throw error;
        }
    }

    //-- CORREÇÃO: A função agora calcula e formata a receita corretamente.
    async function fetchDashboardStats() {
        const data = await fetchData('/api/dashboard/overview');
        
        // 1. Garante que os valores da receita sejam números e soma corretamente.
        const totalRevenueValue = data.charts.revenueByMonth.values
            .map(value => parseFloat(value || 0)) // Converte cada valor para número
            .reduce((sum, value) => sum + value, 0); // Soma os números

        // 2. Mapeia os dados da API para a sua estrutura original de 'stats'
        const stats = {
            totalOrders: data.kpis.totalPedidos || 0,
            ordersChange: 0, 
            totalProducts: data.kpis.totalProdutos || 0,
            lowStock: 0, 
            ordersInTransit: data.kpis.pedidosEmRota || 0,
            deliveriesToday: 0,
            // 3. Usa o valor calculado e formata corretamente.
            monthlyRevenue: totalRevenueValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            revenueChange: 0,
            recentActivities: [], // Sua lógica original de atividades recentes mantida
            chartData: data.charts // Passa todos os dados dos novos gráficos
        };
        return stats;
    }

    //-- NÃO ALTERADO: Sua lógica original mantida.
    async function fetchRecentOrders() {
        const apiData = await fetchData('/api/dashboard/table/orders');
        
        const formatCurrency = (value) => {
            const number = Number(value) || 0;
            return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        };

        const formatDate = (dateString) => {
            if (!dateString) return 'Data Inválida';
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        };

        // Usa os cabeçalhos do backend para mapear os dados corretamente
        const headers = apiData.headers.map(h => h.toLowerCase().replace(/ /g, '_'));
        const orders = apiData.rows.map(row => {
            const orderObject = {};
            headers.forEach((header, index) => {
                orderObject[header] = row[index];
            });

            return {
                id: orderObject['id_pedido'] || 'N/A',
                customer: orderObject['filial'] || 'N/A',
                date: formatDate(orderObject['data']),
                status: orderObject['status'] || 'Pendente',
                total: formatCurrency(orderObject['valor_total'])
            };
        });
        return orders;
    }
    
    //-- NÃO ALTERADO: Sua lógica original mantida.
    async function fetchUserProfile() {
    try {
        userProfileData = await fetchData('/api/users/me');
        
        //-- MODIFICAÇÃO: Atualiza a imagem no cabeçalho do dashboard
        const headerAvatar = document.querySelector('header img');
        if(headerAvatar) {
            // Adiciona um timestamp para evitar problemas de cache do navegador após o upload
            headerAvatar.src = `/api/users/avatar/${userProfileData.id}?t=${new Date().getTime()}`;
            // Se a imagem não carregar, usa a imagem padrão
            headerAvatar.onerror = () => { headerAvatar.src = 'https://i.pravatar.cc/150'; };
        }

        document.getElementById('welcome-message').textContent = userProfileData.full_name || userProfileData.username;
        document.getElementById('user-position').textContent = userProfileData.position || 'Usuário';
        document.getElementById('user-badge').textContent = userProfileData.role ? userProfileData.role.charAt(0).toUpperCase() : '';
        currentUserRole = userProfileData.role; 
        return userProfileData;
    } catch (error) {
        console.error("Falha ao buscar perfil do usuário, a sessão pode ser inválida.");
        throw error; 
    }
}

    //-- NÃO ALTERADO: Sua lógica original mantida.
    async function fetchUsers() {
        return await fetchData('/api/admin/users');
    }

    //-- MODIFICAÇÃO: A rota de addUser foi corrigida para a rota de registro autorizado, que já existia no seu backend.
    async function addUser(userData) {
        return await fetchData('/api/auth/register-authorized', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userData) });
    }

    //-- NÃO ALTERADO: Sua lógica original mantida.
    async function updateUser(userId, userData) {
        return await fetchData(`/api/users/${userId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userData) });
    }

    //-- NÃO ALTERADO: Sua lógica original mantida.
    async function deleteUser(userId) {
        if (!confirm('Tem certeza que deseja excluir este usuário?')) throw new Error('Operação cancelada.');
        return await fetchData(`/api/users/${userId}`, { method: 'DELETE' });
    }

    //-- MODIFICAÇÃO: A função foi atualizada para renderizar os 4 novos gráficos, substituindo apenas o gráfico antigo.
    async function loadOverviewPage() {
        const [stats, recentOrders] = await Promise.all([
            fetchDashboardStats(),
            fetchRecentOrders()
        ]);
        
        document.getElementById('main-content').innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div class="bg-white p-5 rounded-lg shadow-lg transition-all hover:shadow-xl"><p class="text-sm font-medium text-gray-500">Total de Pedidos</p><p class="text-3xl font-bold">${stats.totalOrders}</p><p class="text-xs text-gray-500 mt-1">${stats.ordersChange}% em relação ao mês passado</p></div>
                <div class="bg-white p-5 rounded-lg shadow-lg transition-all hover:shadow-xl"><p class="text-sm font-medium text-gray-500">Produtos em Estoque</p><p class="text-3xl font-bold">${stats.totalProducts}</p><p class="text-xs text-gray-500 mt-1">${stats.lowStock} com estoque baixo</p></div>
                <div class="bg-white p-5 rounded-lg shadow-lg transition-all hover:shadow-xl"><p class="text-sm font-medium text-gray-500">Pedidos em Rota</p><p class="text-3xl font-bold text-secondary">${stats.ordersInTransit}</p><p class="text-xs text-gray-500 mt-1">${stats.deliveriesToday} para hoje</p></div>
                <div class="bg-white p-5 rounded-lg shadow-lg transition-all hover:shadow-xl"><p class="text-sm font-medium text-gray-500">Receita Mensal</p><p class="text-3xl font-bold text-green-600">R$ ${stats.monthlyRevenue}</p><p class="text-xs text-gray-500 mt-1">${stats.revenueChange}% em relação ao mês passado</p></div>
            </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div class="bg-white p-5 rounded-lg shadow-lg">
                    <h3 class="text-lg font-semibold mb-4">Pedidos Recentes</h3>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200"><thead class="bg-gray-50"><tr><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente/Filial</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th></tr></thead><tbody class="bg-white divide-y divide-gray-200">${recentOrders.slice(0, 5).map(order => `<tr><td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#${order.id}</td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${order.customer}</td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${order.date}</td><td class="px-6 py-4 whitespace-nowrap"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(order.status)}">${order.status}</span></td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${order.total}</td></tr>`).join('')}</tbody></table>
                    </div>
                </div>
                <div class="bg-white p-5 rounded-lg shadow-lg">
                    <h3 class="text-lg font-semibold mb-4">Atividades Recentes</h3>
                    <div class="space-y-4">${stats.recentActivities.length > 0 ? stats.recentActivities.map(activity => `<div class="flex items-start"><div class="flex-shrink-0 bg-${activity.color}-100 p-2 rounded-full"><i class="fas fa-${activity.icon} text-${activity.color}-500"></i></div><div class="ml-3"><p class="text-sm font-medium text-gray-900">${activity.title}</p><p class="text-sm text-gray-500">${activity.description}</p><p class="text-xs text-gray-400 mt-1">${new Date(activity.time).toLocaleString()}</p></div></div>`).join('') : '<p class="text-sm text-gray-500">Nenhuma atividade recente.</p>'}</div>
                </div>
            </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div class="bg-white p-5 rounded-lg shadow-lg"><h3 class="text-lg font-semibold mb-4">Receita por Mês (Gráfico)</h3><div class="relative h-72"><canvas id="revenueChart"></canvas></div></div>
                <div class="bg-white p-5 rounded-lg shadow-lg"><h3 class="text-lg font-semibold mb-4">Top 5 Produtos</h3><div class="relative h-72"><canvas id="topProductsChart"></canvas></div></div>
                <div class="bg-white p-5 rounded-lg shadow-lg"><h3 class="text-lg font-semibold mb-4">Status de Pedidos</h3><div class="relative h-72"><canvas id="ordersStatusChart"></canvas></div></div>
                <div class="bg-white p-5 rounded-lg shadow-lg"><h3 class="text-lg font-semibold mb-4">Status de Entregas</h3><div class="relative h-72"><canvas id="deliveriesStatusChart"></canvas></div></div>
            </div>
        `;
        
        // Renderiza os 4 gráficos e armazena as instâncias para limpeza posterior.
        activeCharts.push(createLineChart('revenueChart', stats.chartData.revenueByMonth));
        activeCharts.push(createBarChart('topProductsChart', stats.chartData.topProducts));
        activeCharts.push(createPieChart('ordersStatusChart', stats.chartData.ordersStatus));
        activeCharts.push(createPieChart('deliveriesStatusChart', stats.chartData.deliveriesStatus));
    }

    //-- NÃO ALTERADO: Sua lógica original mantida.
    async function loadProfilePage() {
        if (!userProfileData) { 
            await fetchUserProfile();
        }
        document.getElementById('main-content').innerHTML = `<div class="max-w-4xl mx-auto"><div class="bg-white shadow rounded-lg overflow-hidden"><div class="bg-primary px-6 py-4 text-white"><h2 class="text-2xl font-bold">Meu Perfil</h2><p class="text-primary-100">Gerencie suas informações pessoais e preferências</p></div><div class="p-6"><form id="profileForm"><div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label class="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label><input type="text" name="full_name" value="${userProfileData.full_name || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"></div><div><label class="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" name="username" value="${userProfileData.username || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"></div><div><label class="block text-sm font-medium text-gray-700 mb-1">Telefone</label><input type="tel" name="phone" value="${userProfileData.phone || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"></div><div><label class="block text-sm font-medium text-gray-700 mb-1">CPF</label><input type="text" name="id_document" value="${userProfileData.id_document || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"></div><div><label class="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento</label><input type="date" name="birth_date" value="${userProfileData.birth_date ? userProfileData.birth_date.split('T')[0] : ''}" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"></div><div><label class="block text-sm font-medium text-gray-700 mb-1">Cargo</label><input type="text" name="position" value="${userProfileData.position || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"></div></div><div class="mt-6"><button type="submit" class="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"><i class="fas fa-save mr-2"></i> Salvar Alterações</button></div></form><hr class="my-8 border-gray-200"><h3 class="text-xl font-semibold mb-4">Alterar Senha</h3><form id="passwordForm" class="space-y-4"><div><label class="block text-sm font-medium text-gray-700 mb-1">Senha Atual</label><input type="password" name="currentPassword" required class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"></div><div><label class="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label><input type="password" name="newPassword" required class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"></div><div><label class="block text-sm font-medium text-gray-700 mb-1">Confirmar Nova Senha</label><input type="password" name="confirmPassword" required class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"></div><div class="mt-2"><button type="submit" class="px-4 py-2 bg-secondary text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"><i class="fas fa-key mr-2"></i> Alterar Senha</button></div></form></div></div></div>`;
        document.getElementById('profileForm').addEventListener('submit', handleProfileUpdate);
        document.getElementById('passwordForm').addEventListener('submit', handlePasswordChange);
    }

    //-- MODIFICAÇÃO: Corrigido o mapeamento de campos (name -> full_name, email -> username) para compatibilidade.
    async function loadUsersManagementPage() {
    if (currentUserRole !== 'gerencial' && currentUserRole !== 'admin') {
        document.getElementById('main-content').innerHTML = `<div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert"><p class="font-bold">Acesso Negado</p><p>Você não tem permissão para acessar esta área.</p></div>`; return;
    }
    const users = await fetchUsers();
    
    // CORREÇÃO: O `<img> src` foi alterado para buscar a foto real de cada usuário.
    document.getElementById('main-content').innerHTML = `
        <div class="bg-white shadow rounded-lg overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 class="text-xl font-semibold text-gray-800">Usuários do Sistema</h2>
                <button id="add-user-btn" class="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"><i class="fas fa-plus mr-2"></i> Novo Usuário</button>
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Perfil</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${users.map(user => `
                            <tr>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="flex items-center">
                                        <div class="flex-shrink-0 h-10 w-10">
                                            <img class="h-10 w-10 rounded-full object-cover" src="/api/users/avatar/${user.id}" alt="Avatar" onerror="this.onerror=null;this.src='https://i.pravatar.cc/150';">
                                        </div>
                                        <div class="ml-4">
                                            <div class="text-sm font-medium text-gray-900">${user.full_name}</div>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.username}</td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeClass(user.role)}">${user.role}</span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <button data-user-id="${user.id}" class="edit-user-btn text-primary hover:text-primary-700 mr-4"><i class="fas fa-edit"></i></button>
                                    <button data-user-id="${user.id}" class="delete-user-btn text-red-600 hover:text-red-900"><i class="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        <div id="user-modal" class="fixed z-50 inset-0 overflow-y-auto hidden"><div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"><div class="fixed inset-0 transition-opacity" aria-hidden="true"><div class="absolute inset-0 bg-gray-500 opacity-75"></div></div><span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span><div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"><div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4"><h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">Adicionar Novo Usuário</h3><div class="mt-4"><form id="user-form"><input type="hidden" id="user-id" name="id" value=""><div class="space-y-4"><div><label for="fullName" class="block text-sm font-medium text-gray-700">Nome Completo</label><input type="text" name="fullName" id="fullName" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"></div><div><label for="username" class="block text-sm font-medium text-gray-700">Email (Username)</label><input type="email" name="username" id="username" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"></div><div><label for="role" class="block text-sm font-medium text-gray-700">Perfil</label><select name="role" id="role" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"><option value="operacional">Operacional</option><option value="gerencial">Gerencial</option></select></div><div id="password-fields"><label for="password" class="block text-sm font-medium text-gray-700">Senha</label><input type="password" name="password" id="password" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"></div></div></form></div></div><div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse"><button type="button" id="save-user-btn" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:ml-3 sm:w-auto sm:text-sm">Salvar</button><button type="button" id="cancel-user-btn" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">Cancelar</button></div></div></div></div>`;
    setupUserManagementEvents();
}
    
    //-- NÃO ALTERADO: Sua lógica original mantida.
    async function loadDataTablePage(page) {
        const tableName = page.split('_')[1];
        document.getElementById('main-content').innerHTML = `<div class="bg-white p-4 rounded-lg shadow-lg"><div class="flex justify-between items-center mb-4"><h3 class="text-lg font-semibold">${tableName.charAt(0).toUpperCase() + tableName.slice(1)}</h3><div class="flex space-x-2"><button class="px-3 py-1 bg-primary text-white rounded-md hover:bg-primary-700"><i class="fas fa-plus mr-1"></i> Adicionar</button><button class="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"><i class="fas fa-download mr-1"></i> Exportar</button></div></div><div id="grid-container"></div></div>`;
        renderDataTable(tableName);
    }

    //-- NÃO ALTERADO: Sua lógica original mantida.
    function getStatusBadgeClass(status) {
        if (!status) return 'bg-gray-100 text-gray-800';
        const statusLower = status.toLowerCase();
        const classes = { 'pendente': 'bg-yellow-100 text-yellow-800', 'processando': 'bg-blue-100 text-blue-800', 'em separação': 'bg-cyan-100 text-cyan-800', 'enviado': 'bg-indigo-100 text-indigo-800', 'em rota': 'bg-purple-100 text-purple-800', 'entregue': 'bg-green-100 text-green-800', 'cancelado': 'bg-red-100 text-red-800' };
        return classes[statusLower] || 'bg-gray-100 text-gray-800';
    }

    //-- NÃO ALTERADO: Sua lógica original mantida.
    function getRoleBadgeClass(role) {
        if (!role) return 'bg-gray-100 text-gray-800';
        const classes = { 'operacional': 'bg-blue-100 text-blue-800', 'gerencial': 'bg-purple-100 text-purple-800', 'admin': 'bg-red-100 text-red-800' };
        return classes[role.toLowerCase()] || 'bg-gray-100 text-gray-800';
    }

    //-- ADIÇÃO: Funções auxiliares para renderizar os novos gráficos.
    const chartColors = ['#16a34a', '#2563eb', '#f59e0b', '#dc2626', '#9333ea', '#64748b'];
    function createLineChart(elementId, data) {
        const ctx = document.getElementById(elementId)?.getContext('2d');
        if (!ctx || !data) return;
        const chartInstance = new Chart(ctx, { type: 'line', data: { labels: data.labels, datasets: [{ label: 'Receita (R$)', data: data.values, borderColor: chartColors[0], backgroundColor: 'rgba(22, 163, 74, 0.1)', fill: true, tension: 0.3 }] }, options: { responsive: true, maintainAspectRatio: false } });
        return chartInstance;
    }
    function createBarChart(elementId, data) {
        const ctx = document.getElementById(elementId)?.getContext('2d');
        if (!ctx || !data) return;
        const chartInstance = new Chart(ctx, { type: 'bar', data: { labels: data.labels, datasets: [{ label: 'Quantidade', data: data.values, backgroundColor: chartColors[1] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } } });
        return chartInstance;
    }
    function createPieChart(elementId, data) {
        const ctx = document.getElementById(elementId)?.getContext('2d');
        if (!ctx || !data) return;
        const chartInstance = new Chart(ctx, { type: 'pie', data: { labels: data.labels, datasets: [{ data: data.values, backgroundColor: chartColors }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' }}}});
        return chartInstance;
    }

    function createAdvancedChart(elementId, chartData) {
    const ctx = document.getElementById(elementId)?.getContext('2d');
    if (!ctx || !chartData) return;

    const chartType = chartData.chartType || 'bar';
    const datasets = chartData.datasets.map((dataset, index) => ({
        label: dataset.label,
        data: dataset.values,
        backgroundColor: chartColors[index % chartColors.length],
        borderColor: chartColors[index % chartColors.length],
        borderWidth: 1,
        yAxisID: dataset.yAxisID || 'y'
    }));

    const chartInstance = new Chart(ctx, {
        type: chartType,
        data: {
            labels: chartData.labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toLocaleString('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL'
                                });
                            }
                            return label;
                        }
                    }
                },
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: chartData.title || ''
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: chartData.yAxisTitle || 'Valor (R$)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: !!chartData.secondYAxis,
                    position: 'right',
                    grid: {
                        drawOnChartArea: false,
                    },
                    title: {
                        display: true,
                        text: chartData.y1AxisTitle || 'Quantidade'
                    }
                }
            }
        }
    });

    return chartInstance;
}

    //-- NÃO ALTERADO: Sua lógica original mantida.
    async function renderDataTable(tableName) {
        const container = document.getElementById('grid-container');
        if (!container) return;
        try {
            const apiData = await fetchData(`/api/dashboard/table/${tableName}`);
            gridInstance = new gridjs.Grid({
                columns: apiData.headers.map(h => ({ name: h, sort: true })),
                data: apiData.rows,
                search: true, sort: true, pagination: { limit: 10 },
                language: { search: { placeholder: 'Pesquisar...' }, pagination: { previous: 'Anterior', next: 'Próxima', showing: 'Mostrando', to: 'a', of: 'de', results: 'resultados' } }
            }).render(container);
        } catch (error) {
            showNotification(`Erro ao carregar dados para ${tableName}.`, 'error');
            container.innerHTML = `<p class="text-red-500">Falha ao carregar a tabela de dados.</p>`;
        }
    }

    async function handleProfileUpdate(event) {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.target).entries());
        try {
            await fetchData('/api/users/me', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            showNotification('Perfil atualizado com sucesso!');
            await fetchUserProfile();
        } catch (error) { showNotification(error.message, 'error'); }
    }

    //-- NÃO ALTERADO: Sua lógica original mantida.
    async function handlePasswordChange(event) {
        event.preventDefault();
        const { currentPassword, newPassword, confirmPassword } = Object.fromEntries(new FormData(event.target).entries());
        if (newPassword !== confirmPassword) { showNotification('A nova senha e a confirmação não coincidem.', 'error'); return; }
        try {
            await fetchData('/api/users/me/password', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword }) });
            showNotification('Senha alterada com sucesso!');
            event.target.reset();
        } catch (error) { showNotification(error.message, 'error'); }
    }

    //-- NÃO ALTERADO: Sua lógica original mantida.
    function openUserModal(user = null) {
        const modal = document.getElementById('user-modal');
        const form = document.getElementById('user-form');
        const passwordContainer = document.getElementById('password-fields');
        form.reset();
        if (user) {
            modal.querySelector('#modal-title').textContent = 'Editar Usuário';
            form.querySelector('#user-id').value = user.id;
            form.querySelector('#fullName').value = user.full_name || '';
            form.querySelector('#username').value = user.username || '';
            form.querySelector('#role').value = user.role || 'operacional';
            passwordContainer.style.display = 'none'; passwordContainer.querySelector('input').required = false;
        } else {
            modal.querySelector('#modal-title').textContent = 'Adicionar Novo Usuário';
            form.querySelector('#user-id').value = '';
            passwordContainer.style.display = 'block'; passwordContainer.querySelector('input').required = true;
        }
        modal.classList.remove('hidden');
    }

    //-- NÃO ALTERADO: Sua lógica original mantida.
    function closeUserModal() { document.getElementById('user-modal').classList.add('hidden'); }

    //-- NÃO ALTERADO: Sua lógica original mantida.
    async function handleUserFormSubmit() {
    const form = document.getElementById('user-form');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    const data = Object.fromEntries(new FormData(form).entries());
    const userId = data.id;
    delete data.id; // Remove o ID do corpo da requisição

    try {
        if (userId) {
            // A rota de edição (PUT) para um usuário específico ainda precisa ser criada.
            // Por enquanto, vamos manter a lógica de placeholder.
            showNotification('Funcionalidade de edição de usuário ainda não implementada no backend.', 'info');
            // await updateUser(userId, data); // Esta linha pode ser descomentada quando a rota PUT /api/users/:id for criada.
        } else {
            // CORREÇÃO: Chamando a rota correta para registrar um novo usuário autorizado.
            await addUser(data); 
            showNotification('Usuário adicionado com sucesso!');
        }
        closeUserModal();
        await loadUsersManagementPage();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}
    
    //-- NÃO ALTERADO: Sua lógica original mantida.
    function setupUserManagementEvents() {
        document.getElementById('add-user-btn')?.addEventListener('click', () => openUserModal());
        document.getElementById('cancel-user-btn')?.addEventListener('click', closeUserModal);
        document.getElementById('save-user-btn')?.addEventListener('click', handleUserFormSubmit);
        document.getElementById('main-content')?.addEventListener('click', async (event) => {
            const editBtn = event.target.closest('.edit-user-btn');
            const deleteBtn = event.target.closest('.delete-user-btn');
            if (editBtn) {
                const userId = editBtn.dataset.userId;
                try {
                    const users = await fetchUsers();
                    const userToEdit = users.find(u => u.id == userId);
                    if (userToEdit) openUserModal(userToEdit);
                } catch (err) { showNotification('Erro ao buscar dados do usuário.', 'error'); }
            } else if (deleteBtn) {
                const userId = deleteBtn.dataset.userId;
                try { await deleteUser(userId); showNotification('Usuário excluído com sucesso.'); await loadUsersManagementPage();
                } catch (err) { showNotification(err.message, 'error'); }
            }
        });
    }

    //-- NÃO ALTERADO: Sua lógica original mantida.
    document.getElementById('main-nav')?.addEventListener('click', (event) => {
        const link = event.target.closest('.nav-link[data-page]');
        if (link) { event.preventDefault(); loadContent(link.dataset.page); }
    });
    document.querySelector('header .relative')?.addEventListener('click', (event) => {
        const profileLink = event.target.closest('[data-page="profile"]');
        const settingsLink = event.target.closest('[data-page="settings"]');
        if (profileLink) { event.preventDefault(); loadContent(profileLink.dataset.page);
        } else if (settingsLink) { event.preventDefault(); showNotification('Funcionalidade de Configurações ainda não implementada!', 'info'); }
    });
    document.querySelectorAll('#logout-button, #logout-button-dropdown').forEach(btn => {
        btn.addEventListener('click', (e) => { e.preventDefault(); localStorage.removeItem('token'); window.location.href = '/index.html'; });
    });
    document.getElementById('sidebar-toggle')?.addEventListener('click', () => { document.querySelector('aside').classList.toggle('hidden'); });

    (async function init() {
        try {
            await fetchUserProfile();
            loadContent('overview');
        } catch (error) {
            console.log("Falha na inicialização do dashboard.");
        }
    })();
});