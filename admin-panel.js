// Админ-панель Sevastopol Hub
class AdminPanel {
    constructor(app) {
        this.app = app;
        this.currentTab = 'dashboard';
        this.reports = {
            wifi: [],
            security: [],
            graffiti: []
        };
        this.filters = {
            status: 'all',
            category: 'all',
            dateFrom: null,
            dateTo: null
        };
        this.stats = {};
        
        this.init();
    }

    async init() {
        await this.loadReports();
        await this.loadStats();
        this.setupEventListeners();
        this.renderDashboard();
    }

    async loadReports() {
        try {
            // Загрузка отчетов из localStorage или сервера
            const savedReports = localStorage.getItem('adminReports');
            if (savedReports) {
                this.reports = JSON.parse(savedReports);
            } else {
                // Загрузка с сервера (симуляция)
                await this.fetchReportsFromServer();
            }
        } catch (error) {
            console.error('Ошибка загрузки отчетов:', error);
        }
    }

    async fetchReportsFromServer() {
        // Симуляция загрузки с сервера
        return new Promise(resolve => {
            setTimeout(() => {
                this.reports = {
                    wifi: this.generateMockReports('wifi', 25),
                    security: this.generateMockReports('security', 42),
                    graffiti: this.generateMockReports('graffiti', 18)
                };
                localStorage.setItem('adminReports', JSON.stringify(this.reports));
                resolve();
            }, 1000);
        });
    }

    generateMockReports(type, count) {
        const reports = [];
        const statuses = ['new', 'in_progress', 'resolved', 'rejected'];
        const categories = {
            wifi: ['no_signal', 'slow_speed', 'no_access', 'other'],
            security: ['suspicious_object', 'suspicious_activity', 'dangerous_situation', 'other'],
            graffiti: ['vandalism', 'tag', 'political', 'art', 'other']
        };
        
        for (let i = 1; i <= count; i++) {
            reports.push({
                id: `${type.toUpperCase()}-${1000 + i}`,
                type: type,
                status: statuses[Math.floor(Math.random() * statuses.length)],
                category: categories[type][Math.floor(Math.random() * categories[type].length)],
                title: `Отчет ${type} #${i}`,
                description: `Описание проблемы для отчета ${type} #${i}`,
                userName: `Пользователь ${Math.floor(Math.random() * 100)}`,
                userPhone: `+7${9000000000 + Math.floor(Math.random() * 1000000000)}`,
                location: `Севастополь, ул. Примерная, ${Math.floor(Math.random() * 100)}`,
                coordinates: {
                    lat: 44.5 + Math.random() * 0.3,
                    lon: 33.4 + Math.random() * 0.3
                },
                timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
                assignedTo: Math.random() > 0.7 ? `Админ ${Math.floor(Math.random() * 5)}` : null,
                priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
                hasMedia: Math.random() > 0.5,
                notes: Math.random() > 0.8 ? `Заметки по отчету ${i}` : ''
            });
        }
        
        return reports;
    }

    async loadStats() {
        // Расчет статистики
        this.stats = {
            total: 0,
            byType: {},
            byStatus: {},
            byPriority: {},
            today: 0,
            week: 0,
            month: 0
        };
        
        Object.keys(this.reports).forEach(type => {
            const typeReports = this.reports[type];
            this.stats.total += typeReports.length;
            this.stats.byType[type] = typeReports.length;
            
            typeReports.forEach(report => {
                this.stats.byStatus[report.status] = (this.stats.byStatus[report.status] || 0) + 1;
                this.stats.byPriority[report.priority] = (this.stats.byPriority[report.priority] || 0) + 1;
                
                const reportDate = new Date(report.timestamp);
                const now = new Date();
                const diffDays = Math.floor((now - reportDate) / (1000 * 60 * 60 * 24));
                
                if (diffDays === 0) this.stats.today++;
                if (diffDays < 7) this.stats.week++;
                if (diffDays < 30) this.stats.month++;
            });
        });
    }

    setupEventListeners() {
        // Фильтры
        document.getElementById('securityStatusFilter')?.addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.renderSecurityReports();
        });
        
        document.getElementById('securityCategoryFilter')?.addEventListener('change', (e) => {
            this.filters.category = e.target.value;
            this.renderSecurityReports();
        });
        
        document.getElementById('securityDateFilter')?.addEventListener('change', (e) => {
            this.filters.dateFrom = e.target.value;
            this.renderSecurityReports();
        });
        
        // Экспорт данных
        document.getElementById('exportWifiData')?.addEventListener('click', () => this.exportData('wifi'));
        
        // Обновление
        document.getElementById('refreshWifi')?.addEventListener('click', () => this.refreshReports());
        
        // Настройки
        document.getElementById('saveEmailSettings')?.addEventListener('click', () => this.saveEmailSettings());
        document.getElementById('addAdminBtn')?.addEventListener('click', () => this.showAddAdminModal());
    }

    renderDashboard() {
        // Обновление статистики
        document.getElementById('adminTotalReports').textContent = this.stats.total;
        document.getElementById('adminPendingReports').textContent = this.stats.byStatus['new'] || 0;
        document.getElementById('adminCompletedReports').textContent = this.stats.byStatus['resolved'] || 0;
        
        // Расчет активных пользователей (симуляция)
        const activeUsers = Math.floor(50 + Math.random() * 50);
        document.getElementById('adminActiveUsers').textContent = activeUsers;
        
        // Обновление графиков
        this.updateCharts();
    }

    updateCharts() {
        // График по категориям
        const categoryCtx = document.getElementById('reportsChart');
        if (categoryCtx && window.Chart) {
            const categoryChart = new Chart(categoryCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Wi-Fi', 'Безопасность', 'Граффити'],
                    datasets: [{
                        data: [
                            this.stats.byType.wifi || 0,
                            this.stats.byType.security || 0,
                            this.stats.byType.graffiti || 0
                        ],
                        backgroundColor: ['#0066ff', '#34c759', '#ff9500'],
                        borderWidth: 2,
                        borderColor: '#1c1c1e'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: 'rgba(255, 255, 255, 0.8)',
                                padding: 20
                            }
                        }
                    }
                }
            });
        }
        
        // График по статусам
        const statusCtx = document.getElementById('statusChart');
        if (statusCtx && window.Chart) {
            const statusChart = new Chart(statusCtx, {
                type: 'bar',
                data: {
                    labels: ['Новые', 'В работе', 'Решено', 'Отклонено'],
                    datasets: [{
                        label: 'Количество',
                        data: [
                            this.stats.byStatus['new'] || 0,
                            this.stats.byStatus['in_progress'] || 0,
                            this.stats.byStatus['resolved'] || 0,
                            this.stats.byStatus['rejected'] || 0
                        ],
                        backgroundColor: ['#ff9500', '#0066ff', '#34c759', '#ff3b30'],
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.1)'
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.6)'
                            },
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            }
                        },
                        x: {
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.6)'
                            },
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            labels: {
                                color: 'rgba(255, 255, 255, 0.8)'
                            }
                        }
                    }
                }
            });
        }
    }

    renderSecurityReports() {
        const container = document.getElementById('securityReportsList');
        if (!container) return;
        
        let filteredReports = this.reports.security;
        
        // Применение фильтров
        if (this.filters.status !== 'all') {
            filteredReports = filteredReports.filter(r => r.status === this.filters.status);
        }
        
        if (this.filters.category !== 'all') {
            filteredReports = filteredReports.filter(r => r.category === this.filters.category);
        }
        
        if (this.filters.dateFrom) {
            const filterDate = new Date(this.filters.dateFrom);
            filteredReports = filteredReports.filter(r => new Date(r.timestamp) >= filterDate);
        }
        
        // Рендеринг
        container.innerHTML = filteredReports.map(report => this.createReportCard(report)).join('');
    }

    createReportCard(report) {
        const statusColors = {
            new: '#ff9500',
            in_progress: '#0066ff',
            resolved: '#34c759',
            rejected: '#ff3b30'
        };
        
        const priorityColors = {
            high: '#ff3b30',
            medium: '#ff9500',
            low: '#34c759'
        };
        
        return `
            <div class="report-card" data-id="${report.id}">
                <div class="report-header">
                    <div class="report-title">
                        <h4>${report.title}</h4>
                        <div class="report-meta">
                            <span class="report-id">${report.id}</span>
                            <span class="report-date">${new Date(report.timestamp).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div class="report-status">
                        <span class="status-badge" style="background: ${statusColors[report.status] || '#666'}">
                            ${this.getStatusText(report.status)}
                        </span>
                        <span class="priority-badge" style="background: ${priorityColors[report.priority] || '#666'}">
                            ${this.getPriorityText(report.priority)}
                        </span>
                    </div>
                </div>
                
                <div class="report-body">
                    <p>${report.description}</p>
                    <div class="report-details">
                        <div class="detail">
                            <i class="fas fa-user"></i>
                            <span>${report.userName}</span>
                        </div>
                        <div class="detail">
                            <i class="fas fa-phone"></i>
                            <span>${report.userPhone}</span>
                        </div>
                        <div class="detail">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${report.location}</span>
                        </div>
                    </div>
                </div>
                
                <div class="report-actions">
                    <button class="btn-action" onclick="admin.viewReport('${report.id}')">
                        <i class="fas fa-eye"></i> Просмотр
                    </button>
                    <button class="btn-action" onclick="admin.assignReport('${report.id}')">
                        <i class="fas fa-user-check"></i> Взять в работу
                    </button>
                    <button class="btn-action" onclick="admin.resolveReport('${report.id}')">
                        <i class="fas fa-check"></i> Решено
                    </button>
                </div>
            </div>
        `;
    }

    getStatusText(status) {
        const statuses = {
            'new': '🆕 Новый',
            'in_progress': '🔄 В работе',
            'resolved': '✅ Решено',
            'rejected': '❌ Отклонено'
        };
        return statuses[status] || status;
    }

    getPriorityText(priority) {
        const priorities = {
            'high': '🔥 Высокий',
            'medium': '⚠️ Средний',
            'low': '✅ Низкий'
        };
        return priorities[priority] || priority;
    }

    async exportData(type) {
        try {
            const data = this.reports[type] || [];
            const csv = this.convertToCSV(data);
            
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            
            link.href = url;
            link.download = `sevastopol-${type}-reports-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.app.showNotification(`Данные ${type} экспортированы`, 'success');
            
        } catch (error) {
            console.error('Ошибка экспорта данных:', error);
            this.app.showNotification('Ошибка экспорта данных', 'error');
        }
    }

    convertToCSV(data) {
        if (data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const rows = data.map(item => 
            headers.map(header => {
                const value = item[header];
                if (typeof value === 'object') {
                    return JSON.stringify(value);
                }
                return `"${String(value).replace(/"/g, '""')}"`;
            }).join(',')
        );
        
        return [headers.join(','), ...rows].join('\n');
    }

    async refreshReports() {
        try {
            this.app.showNotification('Обновление данных...', 'info');
            await this.fetchReportsFromServer();
            await this.loadStats();
            this.renderDashboard();
            this.renderSecurityReports();
            this.app.showNotification('Данные обновлены', 'success');
        } catch (error) {
            console.error('Ошибка обновления данных:', error);
            this.app.showNotification('Ошибка обновления данных', 'error');
        }
    }

    saveEmailSettings() {
        const email = document.getElementById('adminEmail')?.value;
        const subject = document.getElementById('emailSubject')?.value;
        
        if (email && window.EmailService) {
            // Сохранение для всех типов отчетов
            Object.keys(window.EmailService.config.adminEmails).forEach(type => {
                window.EmailService.updateAdminEmail(type, email);
            });
            
            this.app.showNotification('Настройки почты сохранены', 'success');
        }
    }

    showAddAdminModal() {
        // Показать модальное окно добавления администратора
        this.app.showNotification('Функция добавления администратора в разработке', 'info');
    }

    // Методы для работы с отчетами
    viewReport(reportId) {
        // Просмотр деталей отчета
        console.log('Просмотр отчета:', reportId);
        this.app.showNotification('Просмотр отчета', 'info');
    }

    assignReport(reportId) {
        // Взять отчет в работу
        const report = this.findReport(reportId);
        if (report && report.status === 'new') {
            report.status = 'in_progress';
            report.assignedTo = this.app.currentUser?.first_name || 'Администратор';
            this.saveReports();
            this.renderSecurityReports();
            this.app.showNotification('Отчет взят в работу', 'success');
        }
    }

    resolveReport(reportId) {
        // Пометить отчет как решенный
        const report = this.findReport(reportId);
        if (report) {
            report.status = 'resolved';
            this.saveReports();
            this.renderSecurityReports();
            this.app.showNotification('Отчет помечен как решенный', 'success');
        }
    }

    findReport(reportId) {
        // Поиск отчета по ID
        for (const type of Object.keys(this.reports)) {
            const report = this.reports[type].find(r => r.id === reportId);
            if (report) return report;
        }
        return null;
    }

    saveReports() {
        localStorage.setItem('adminReports', JSON.stringify(this.reports));
    }
}

// Экспорт глобального объекта админ-панели
let admin;
document.addEventListener('DOMContentLoaded', () => {
    if (window.app) {
        admin = new AdminPanel(window.app);
        window.admin = admin;
    }
});
