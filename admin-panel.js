// Админ-панель Sevastopol Hub - Версия 2.0
class AdminPanel {
    constructor(app) {
        this.app = app;
        this.currentTab = 'dashboard';
        this.reports = {
            security: [],
            wifi: [],
            graffiti: []
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
            // Загрузка отчетов из хранилища
            this.reports.security = await AppData.getReports('security') || [];
            this.reports.wifi = await AppData.getReports('wifi') || [];
            this.reports.graffiti = await AppData.getReports('graffiti') || [];
            
            console.log('📊 Отчеты загружены:', {
                security: this.reports.security.length,
                wifi: this.reports.wifi.length,
                graffiti: this.reports.graffiti.length
            });
            
        } catch (error) {
            console.error('Ошибка загрузки отчетов:', error);
        }
    }

    async loadStats() {
        this.stats = {
            total: 0,
            byType: {},
            byStatus: {},
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
        document.getElementById('securityFilter')?.addEventListener('change', (e) => {
            this.filterReports('security', e.target.value);
        });
        
        // Экспорт данных
        document.getElementById('exportSecurity')?.addEventListener('click', () => this.exportData('security'));
        document.getElementById('exportWifi')?.addEventListener('click', () => this.exportData('wifi'));
        document.getElementById('exportGraffiti')?.addEventListener('click', () => this.exportData('graffiti'));
        
        // Обновление
        document.getElementById('refreshSecurity')?.addEventListener('click', () => this.refreshTab('security'));
        document.getElementById('refreshWifi')?.addEventListener('click', () => this.refreshTab('wifi'));
        document.getElementById('refreshGraffiti')?.addEventListener('click', () => this.refreshTab('graffiti'));
        
        // Настройки email
        document.getElementById('saveSecurityEmail')?.addEventListener('click', () => this.saveEmail('security'));
        document.getElementById('saveWifiEmail')?.addEventListener('click', () => this.saveEmail('wifi'));
        document.getElementById('saveGraffitiEmail')?.addEventListener('click', () => this.saveEmail('graffiti'));
    }

    renderDashboard() {
        // Обновление статистики
        document.getElementById('totalReports').textContent = this.stats.total || 0;
        document.getElementById('pendingReports').textContent = this.stats.byStatus['new'] || 0;
        document.getElementById('completedReports').textContent = this.stats.byStatus['resolved'] || 0;
        
        // Активные пользователи (заглушка)
        document.getElementById('activeUsers').textContent = '25';
        
        // Обновление графиков
        this.updateCharts();
    }

    updateCharts() {
        if (window.Chart) {
            const ctx = document.getElementById('reportsChart');
            if (ctx) {
                // Удаляем старый график если есть
                const oldChart = Chart.getChart(ctx);
                if (oldChart) {
                    oldChart.destroy();
                }
                
                new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Безопасность', 'Wi-Fi', 'Граффити'],
                        datasets: [{
                            data: [
                                this.stats.byType.security || 0,
                                this.stats.byType.wifi || 0,
                                this.stats.byType.graffiti || 0
                            ],
                            backgroundColor: ['#007AFF', '#34C759', '#FF9500'],
                            borderWidth: 2,
                            borderColor: 'var(--bg-card)'
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    color: 'var(--text-primary)',
                                    padding: 20
                                }
                            }
                        }
                    }
                });
            }
        }
    }

    async filterReports(type, status) {
        try {
            let filteredReports = this.reports[type];
            
            if (status !== 'all') {
                filteredReports = filteredReports.filter(r => r.status === status);
            }
            
            const container = document.getElementById(`${type}ReportsList`);
            if (container) {
                container.innerHTML = filteredReports.map(report => 
                    this.createReportCard(report, type)
                ).join('');
            }
            
        } catch (error) {
            console.error(`Ошибка фильтрации отчетов ${type}:`, error);
        }
    }

    createReportCard(report, type) {
        const typeIcons = {
            security: 'fas fa-shield-alt',
            wifi: 'fas fa-wifi',
            graffiti: 'fas fa-spray-can'
        };
        
        const statusBadges = {
            new: '<span class="status-badge status-new">Новый</span>',
            in_progress: '<span class="status-badge status-in-progress">В работе</span>',
            resolved: '<span class="status-badge status-resolved">Решено</span>',
            rejected: '<span class="status-badge status-rejected">Отклонено</span>'
        };
        
        const formatDate = (dateString) => {
            return new Date(dateString).toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        };
        
        return `
            <div class="report-item">
                <div class="report-header">
                    <div class="report-title">
                        <h4>${report.pointName || report.address || 'Без названия'}</h4>
                        <div class="report-meta">
                            <span>ID: ${report.id}</span>
                            <span>${formatDate(report.timestamp)}</span>
                        </div>
                    </div>
                    <div class="report-status">
                        ${statusBadges[report.status] || ''}
                    </div>
                </div>
                <div class="report-body">
                    <p>${report.description || 'Нет описания'}</p>
                    <div class="report-details">
                        <div class="detail">
                            <i class="fas fa-user"></i>
                            <span>${report.userName || 'Аноним'}</span>
                        </div>
                        ${report.userPhone ? `
                        <div class="detail">
                            <i class="fas fa-phone"></i>
                            <span>${report.userPhone}</span>
                        </div>
                        ` : ''}
                        ${report.address ? `
                        <div class="detail">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${report.address}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                <div class="report-actions">
                    <button class="btn btn-sm" onclick="admin.resolveReport('${report.id}', '${type}')">
                        <i class="fas fa-check"></i> Решено
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="admin.rejectReport('${report.id}', '${type}')">
                        <i class="fas fa-times"></i> Отклонить
                    </button>
                </div>
            </div>
        `;
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
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
            
            if (this.app && this.app.showNotification) {
                this.app.showNotification(`Данные ${type} экспортированы`, 'success');
            }
            
        } catch (error) {
            console.error('Ошибка экспорта данных:', error);
            if (this.app && this.app.showNotification) {
                this.app.showNotification('Ошибка экспорта данных', 'error');
            }
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

    async refreshTab(type) {
        try {
            await this.loadReports();
            await this.loadStats();
            
            if (type === 'dashboard') {
                this.renderDashboard();
            } else {
                this.filterReports(type, 'all');
            }
            
            if (this.app && this.app.showNotification) {
                this.app.showNotification('Данные обновлены', 'success');
            }
            
        } catch (error) {
            console.error('Ошибка обновления данных:', error);
            if (this.app && this.app.showNotification) {
                this.app.showNotification('Ошибка обновления данных', 'error');
            }
        }
    }

    async saveEmail(type) {
        const inputId = `email${type.charAt(0).toUpperCase() + type.slice(1)}`;
        const input = document.getElementById(inputId);
        
        if (!input || !window.EmailService) return;
        
        const email = input.value.trim();
        
        if (email && AppData.validateEmail(email)) {
            window.EmailService.updateAdminEmail(type, email);
            
            if (this.app && this.app.showNotification) {
                this.app.showNotification(`Email для ${type} сохранен`, 'success');
            }
        } else {
            if (this.app && this.app.showNotification) {
                this.app.showNotification('Введите корректный email', 'error');
            }
        }
    }

    // Методы для работы с отчетами
    async resolveReport(reportId, type) {
        // В реальном приложении здесь была бы логика обновления статуса в базе данных
        const report = this.reports[type]?.find(r => r.id === reportId);
        
        if (report) {
            report.status = 'resolved';
            
            if (this.app && this.app.showNotification) {
                this.app.showNotification('Отчет помечен как решенный', 'success');
            }
            
            // Обновление UI
            this.filterReports(type, 'all');
            this.renderDashboard();
        }
    }

    async rejectReport(reportId, type) {
        // В реальном приложении здесь была бы логика обновления статуса в базе данных
        const report = this.reports[type]?.find(r => r.id === reportId);
        
        if (report) {
            report.status = 'rejected';
            
            if (this.app && this.app.showNotification) {
                this.app.showNotification('Отчет отклонен', 'info');
            }
            
            // Обновление UI
            this.filterReports(type, 'all');
            this.renderDashboard();
        }
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
