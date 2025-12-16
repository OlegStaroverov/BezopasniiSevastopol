// Админ-панель Sevastopol Hub - Премиум версия с анимациями
class AdminPanel {
    constructor(app) {
        this.app = app;
        this.currentTab = 'dashboard';
        this.reports = {
            security: [],
            wifi: [],
            graffiti: []
        };
        this.filters = {
            status: 'all',
            category: 'all',
            dateFrom: null,
            dateTo: null
        };
        this.stats = {};
        this.adminEmails = {
            security: 'security-admin@sevastopol.ru',
            wifi: 'wifi-admin@sevastopol.ru',
            graffiti: 'graffiti-admin@sevastopol.ru'
        };
        
        // Анимации
        this.animations = {
            enabled: !window.matchMedia('(prefers-reduced-motion: reduce)').matches
        };
        
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
            // Загружаем отчеты из localStorage
            this.reports.security = JSON.parse(localStorage.getItem('security_reports') || '[]');
            this.reports.wifi = JSON.parse(localStorage.getItem('wifi_problems_reports') || '[]');
            this.reports.graffiti = JSON.parse(localStorage.getItem('graffiti_reports') || '[]');
            
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
        // Фильтры безопасности
        document.getElementById('securityStatusFilter')?.addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.renderSecurityReports();
        });
        
        // Экспорт данных
        document.getElementById('exportSecurityData')?.addEventListener('click', () => this.exportData('security'));
        document.getElementById('exportWifiData')?.addEventListener('click', () => this.exportData('wifi'));
        document.getElementById('exportGraffitiData')?.addEventListener('click', () => this.exportData('graffiti'));
        
        // Обновление
        document.getElementById('refreshSecurity')?.addEventListener('click', () => this.refreshReports('security'));
        document.getElementById('refreshWifi')?.addEventListener('click', () => this.refreshReports('wifi'));
        document.getElementById('refreshGraffiti')?.addEventListener('click', () => this.refreshReports('graffiti'));
        
        // Сохранение email настроек
        document.getElementById('saveSecurityEmail')?.addEventListener('click', () => this.saveAdminEmail('security'));
        document.getElementById('saveWifiEmail')?.addEventListener('click', () => this.saveAdminEmail('wifi'));
        document.getElementById('saveGraffitiEmail')?.addEventListener('click', () => this.saveAdminEmail('graffiti'));
        
        // Загрузка email настроек при открытии вкладки настроек
        document.querySelector('[data-tab="settings-admin"]')?.addEventListener('click', () => {
            this.loadAdminEmailSettings();
        });
    }

    loadAdminEmailSettings() {
        // Загружаем сохраненные email админов
        const savedEmails = JSON.parse(localStorage.getItem('admin_emails') || '{}');
        this.adminEmails = { ...this.adminEmails, ...savedEmails };
        
        // Устанавливаем значения в поля
        document.getElementById('securityAdminEmail')?.value = this.adminEmails.security || '';
        document.getElementById('wifiAdminEmail')?.value = this.adminEmails.wifi || '';
        document.getElementById('graffitiAdminEmail')?.value = this.adminEmails.graffiti || '';
    }

    saveAdminEmail(type) {
        const inputId = `${type}AdminEmail`;
        const input = document.getElementById(inputId);
        
        if (!input) return;
        
        const email = input.value.trim();
        
        if (email && this.validateEmail(email)) {
            this.adminEmails[type] = email;
            localStorage.setItem('admin_emails', JSON.stringify(this.adminEmails));
            
            if (this.app && this.app.showNotification) {
                this.app.showNotification(`Email для ${type} сохранен`, 'success');
            }
            
            // Анимация успешного сохранения
            if (this.animations.enabled) {
                input.style.borderColor = '#34C759';
                input.style.boxShadow = '0 0 0 3px rgba(52, 199, 89, 0.2)';
                
                setTimeout(() => {
                    input.style.borderColor = '';
                    input.style.boxShadow = '';
                }, 2000);
            }
        } else {
            if (this.app && this.app.showNotification) {
                this.app.showNotification('Введите корректный email', 'error');
            }
            
            // Анимация ошибки
            if (this.animations.enabled) {
                input.style.borderColor = '#FF3B30';
                input.style.animation = 'shake 0.5s ease';
                
                setTimeout(() => {
                    input.style.borderColor = '';
                    input.style.animation = '';
                }, 500);
            }
        }
    }

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    renderDashboard() {
        // Обновление статистики с анимацией
        this.animateStat('adminTotalReports', this.stats.total);
        this.animateStat('adminPendingReports', this.stats.byStatus['new'] || 0);
        this.animateStat('adminCompletedReports', this.stats.byStatus['resolved'] || 0);
        
        // Расчет активных пользователей
        const activeUsers = Math.floor(50 + Math.random() * 50);
        this.animateStat('adminActiveUsers', activeUsers);
        
        // Обновление графиков
        this.updateCharts();
    }

    animateStat(elementId, value) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const currentValue = parseInt(element.textContent) || 0;
        
        if (!this.animations.enabled) {
            element.textContent = value;
            return;
        }
        
        // Анимация изменения числа
        let start = currentValue;
        const duration = 500; // ms
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3); // Кубическое замедление
            
            const current = Math.floor(start + (value - start) * easeProgress);
            element.textContent = current;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.textContent = value;
                
                // Микро-анимация при завершении
                element.style.transform = 'scale(1.1)';
                setTimeout(() => {
                    element.style.transform = 'scale(1)';
                }, 150);
            }
        };
        
        requestAnimationFrame(animate);
    }

    updateCharts() {
        // График по категориям
        const categoryCtx = document.getElementById('reportsChart');
        if (categoryCtx && window.Chart) {
            const oldChart = Chart.getChart(categoryCtx);
            if (oldChart) {
                oldChart.destroy();
            }
            
            new Chart(categoryCtx, {
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
                        borderColor: 'var(--system-background)',
                        hoverOffset: 15,
                        hoverBorderWidth: 3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    cutout: '70%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: 'var(--system-label-secondary)',
                                padding: 20,
                                font: {
                                    size: 12
                                }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'var(--system-background-elevated)',
                            titleColor: 'var(--system-label)',
                            bodyColor: 'var(--system-label-secondary)',
                            borderColor: 'var(--system-separator)',
                            borderWidth: 1,
                            cornerRadius: 8,
                            padding: 12
                        }
                    },
                    animation: {
                        animateScale: true,
                        animateRotate: true,
                        duration: 1000,
                        easing: 'easeOutQuart'
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
        
        // Сортируем по дате (новые сверху)
        filteredReports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Анимация исчезновения
        if (this.animations.enabled) {
            container.style.opacity = '0.5';
            container.style.transform = 'scale(0.98)';
            
            setTimeout(() => {
                container.innerHTML = filteredReports.map(report => this.createReportCard(report, 'security')).join('');
                
                // Анимация появления
                container.style.opacity = '0';
                container.style.transform = 'scale(1.02)';
                
                setTimeout(() => {
                    container.style.opacity = '1';
                    container.style.transform = 'scale(1)';
                }, 10);
            }, 200);
        } else {
            container.innerHTML = filteredReports.map(report => this.createReportCard(report, 'security')).join('');
        }
    }

    renderWifiReports() {
        const container = document.getElementById('wifiReportsList');
        if (!container) return;
        
        let filteredReports = this.reports.wifi;
        
        // Сортируем по дате (новые сверху)
        filteredReports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        if (this.animations.enabled) {
            container.style.opacity = '0.5';
            container.style.transform = 'scale(0.98)';
            
            setTimeout(() => {
                container.innerHTML = filteredReports.map(report => this.createReportCard(report, 'wifi')).join('');
                
                container.style.opacity = '0';
                container.style.transform = 'scale(1.02)';
                
                setTimeout(() => {
                    container.style.opacity = '1';
                    container.style.transform = 'scale(1)';
                }, 10);
            }, 200);
        } else {
            container.innerHTML = filteredReports.map(report => this.createReportCard(report, 'wifi')).join('');
        }
    }

    renderGraffitiReports() {
        const container = document.getElementById('graffitiReportsList');
        if (!container) return;
        
        let filteredReports = this.reports.graffiti;
        
        // Сортируем по дате (новые сверху)
        filteredReports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        if (this.animations.enabled) {
            container.style.opacity = '0.5';
            container.style.transform = 'scale(0.98)';
            
            setTimeout(() => {
                container.innerHTML = filteredReports.map(report => this.createReportCard(report, 'graffiti')).join('');
                
                container.style.opacity = '0';
                container.style.transform = 'scale(1.02)';
                
                setTimeout(() => {
                    container.style.opacity = '1';
                    container.style.transform = 'scale(1)';
                }, 10);
            }, 200);
        } else {
            container.innerHTML = filteredReports.map(report => this.createReportCard(report, 'graffiti')).join('');
        }
    }

    createReportCard(report, type) {
        const statusColors = {
            'new': '#FF9500',
            'in_progress': '#007AFF',
            'resolved': '#34C759',
            'rejected': '#FF3B30'
        };
        
        const typeIcons = {
            'security': 'fas fa-shield-alt',
            'wifi': 'fas fa-wifi',
            'graffiti': 'fas fa-spray-can'
        };
        
        const typeColors = {
            'security': '#007AFF',
            'wifi': '#34C759',
            'graffiti': '#FF9500'
        };
        
        const getStatusText = (status) => {
            const statuses = {
                'new': '🆕 Новый',
                'in_progress': '🔄 В работе',
                'resolved': '✅ Решено',
                'rejected': '❌ Отклонено'
            };
            return statuses[status] || status;
        };
        
        const formatDate = (dateString) => {
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        };
        
        return `
            <div class="report-card" data-id="${report.id}" data-type="${type}">
                <div class="report-header">
                    <div class="report-title">
                        <div class="report-type-badge" style="background: ${typeColors[type] || '#8E8E93'}">
                            <i class="${typeIcons[type] || 'fas fa-question'}"></i>
                            <span>${type.toUpperCase()}</span>
                        </div>
                        <h4>${report.title || report.description?.substring(0, 50) + '...' || 'Без названия'}</h4>
                        <div class="report-meta">
                            <span class="report-id">${report.id}</span>
                            <span class="report-date">${formatDate(report.timestamp)}</span>
                        </div>
                    </div>
                    <div class="report-status">
                        <span class="status-badge" style="background: ${statusColors[report.status] || '#8E8E93'}">
                            ${getStatusText(report.status)}
                        </span>
                    </div>
                </div>
                
                <div class="report-body">
                    <p>${report.description || 'Нет описания'}</p>
                    <div class="report-details">
                        <div class="detail">
                            <i class="fas fa-user"></i>
                            <span>${report.userName || 'Аноним'}</span>
                        </div>
                        ${report.phone ? `
                        <div class="detail">
                            <i class="fas fa-phone"></i>
                            <span>${report.phone}</span>
                        </div>
                        ` : ''}
                        ${report.address ? `
                        <div class="detail">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${report.address}</span>
                        </div>
                        ` : ''}
                        ${report.location ? `
                        <div class="detail">
                            <i class="fas fa-globe"></i>
                            <span>${report.location.lat.toFixed(6)}, ${report.location.lon.toFixed(6)}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="report-actions">
                    <button class="btn-secondary" onclick="admin.viewReport('${report.id}', '${type}')">
                        <i class="fas fa-eye"></i> Просмотр
                    </button>
                    <button class="btn-primary" onclick="admin.resolveReport('${report.id}', '${type}')">
                        <i class="fas fa-check"></i> Решено
                    </button>
                    <button class="btn-danger" onclick="admin.rejectReport('${report.id}', '${type}')">
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
            
            // Анимация кнопки
            const button = document.getElementById(`export${this.capitalizeFirstLetter(type)}Data`);
            if (button) {
                const originalText = button.innerHTML;
                button.innerHTML = '<i class="fas fa-check"></i> Экспортировано';
                button.disabled = true;
                
                if (this.animations.enabled) {
                    button.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        button.style.transform = 'scale(1)';
                    }, 150);
                }
                
                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.disabled = false;
                }, 2000);
            }
            
        } catch (error) {
            console.error('Ошибка экспорта данных:', error);
            if (this.app && this.app.showNotification) {
                this.app.showNotification('Ошибка экспорта данных', 'error');
            }
        }
    }

    capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
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

    async refreshReports(type) {
        try {
            if (this.app && this.app.showNotification) {
                this.app.showNotification('Обновление данных...', 'info');
            }
            
            // Анимация кнопки обновления
            const button = document.getElementById(`refresh${this.capitalizeFirstLetter(type)}`);
            if (button) {
                const originalText = button.innerHTML;
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-sync fa-spin"></i> Обновление';
                
                if (this.animations.enabled) {
                    button.style.transform = 'rotate(0deg)';
                    setTimeout(() => {
                        button.style.transform = 'rotate(360deg)';
                    }, 10);
                }
            }
            
            await this.loadReports();
            await this.loadStats();
            this.renderDashboard();
            
            // Рендерим соответствующие отчеты
            if (type === 'security') {
                this.renderSecurityReports();
            } else if (type === 'wifi') {
                this.renderWifiReports();
            } else if (type === 'graffiti') {
                this.renderGraffitiReports();
            }
            
            if (this.app && this.app.showNotification) {
                this.app.showNotification('Данные обновлены', 'success');
            }
            
            // Восстановление кнопки
            if (button) {
                setTimeout(() => {
                    button.disabled = false;
                    button.innerHTML = '<i class="fas fa-sync"></i> Обновить';
                    button.style.transform = '';
                }, 1000);
            }
        } catch (error) {
            console.error('Ошибка обновления данных:', error);
            if (this.app && this.app.showNotification) {
                this.app.showNotification('Ошибка обновления данных', 'error');
            }
            
            // Восстановление кнопки при ошибке
            const button = document.getElementById(`refresh${this.capitalizeFirstLetter(type)}`);
            if (button) {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-sync"></i> Обновить';
                button.style.transform = '';
            }
        }
    }

    // Методы для работы с отчетами
    viewReport(reportId, type) {
        console.log('Просмотр отчета:', reportId, type);
        if (this.app && this.app.showNotification) {
            this.app.showNotification('Просмотр отчета', 'info');
        }
    }

    resolveReport(reportId, type) {
        const report = this.findReport(reportId, type);
        if (report && report.status !== 'resolved') {
            report.status = 'resolved';
            this.saveReports(type);
            
            // Анимация изменения статуса
            const reportCard = document.querySelector(`.report-card[data-id="${reportId}"]`);
            if (reportCard && this.animations.enabled) {
                const statusBadge = reportCard.querySelector('.status-badge');
                if (statusBadge) {
                    statusBadge.style.transform = 'scale(0.8)';
                    setTimeout(() => {
                        statusBadge.textContent = '✅ Решено';
                        statusBadge.style.background = '#34C759';
                        statusBadge.style.transform = 'scale(1.1)';
                        setTimeout(() => {
                            statusBadge.style.transform = 'scale(1)';
                        }, 150);
                    }, 150);
                }
            }
            
            this.refreshReports(type);
            
            if (this.app && this.app.showNotification) {
                this.app.showNotification('Отчет помечен как решенный', 'success');
            }
        }
    }

    rejectReport(reportId, type) {
        const report = this.findReport(reportId, type);
        if (report && report.status !== 'rejected') {
            report.status = 'rejected';
            this.saveReports(type);
            
            // Анимация изменения статуса
            const reportCard = document.querySelector(`.report-card[data-id="${reportId}"]`);
            if (reportCard && this.animations.enabled) {
                const statusBadge = reportCard.querySelector('.status-badge');
                if (statusBadge) {
                    statusBadge.style.transform = 'scale(0.8)';
                    setTimeout(() => {
                        statusBadge.textContent = '❌ Отклонено';
                        statusBadge.style.background = '#FF3B30';
                        statusBadge.style.transform = 'scale(1.1)';
                        setTimeout(() => {
                            statusBadge.style.transform = 'scale(1)';
                        }, 150);
                    }, 150);
                }
            }
            
            this.refreshReports(type);
            
            if (this.app && this.app.showNotification) {
                this.app.showNotification('Отчет отклонен', 'info');
            }
        }
    }

    findReport(reportId, type) {
        return this.reports[type]?.find(r => r.id === reportId) || null;
    }

    saveReports(type) {
        const key = `${type}_reports`;
        localStorage.setItem(key, JSON.stringify(this.reports[type]));
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
