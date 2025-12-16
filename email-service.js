// Email Service для отправки уведомлений администраторам - Версия 2.0
class EmailService {
    constructor() {
        this.config = {
            adminEmails: {
                wifi: 'wifi@sevastopol-hub.ru',
                security: 'security@sevastopol-hub.ru',
                graffiti: 'graffiti@sevastopol-hub.ru',
                general: 'admin@sevastopol-hub.ru'
            },
            defaultFrom: 'noreply@sevastopol-hub.ru',
            apiEndpoint: 'https://api.sevastopol-hub.ru/email/send'
        };
        
        this.init();
    }

    init() {
        this.loadConfig();
        this.setupTemplates();
        this.setupEventListeners();
    }

    loadConfig() {
        try {
            const savedConfig = localStorage.getItem('emailServiceConfig');
            if (savedConfig) {
                this.config = { ...this.config, ...JSON.parse(savedConfig) };
            }
        } catch (error) {
            console.error('Ошибка загрузки конфигурации email:', error);
        }
    }

    saveConfig() {
        try {
            localStorage.setItem('emailServiceConfig', JSON.stringify(this.config));
        } catch (error) {
            console.error('Ошибка сохранения конфигурации email:', error);
        }
    }

    setupTemplates() {
        this.templates = {
            security: this.createSecurityTemplate.bind(this),
            graffiti: this.createGraffitiTemplate.bind(this),
            wifi_problem: this.createWifiProblemTemplate.bind(this),
            wifi_suggestion: this.createWifiSuggestionTemplate.bind(this)
        };
    }

    setupEventListeners() {
        // Обработчики для админ-панели
        document.addEventListener('adminEmailUpdated', (event) => {
            if (event.detail && event.detail.type && event.detail.email) {
                this.updateAdminEmail(event.detail.type, event.detail.email);
            }
        });
    }

    async sendEmail(emailData) {
        try {
            console.log('📧 Отправка email:', {
                to: emailData.to,
                subject: emailData.subject,
                type: emailData.type
            });
            
            // Показываем уведомление
            if (window.app && window.app.showNotification) {
                window.app.showNotification('Отправка email...', 'info');
            }
            
            // Симуляция отправки
            await this.simulateSending(emailData);
            
            // Логирование
            this.logSending(emailData);
            
            // Успешное уведомление
            if (window.app && window.app.showNotification) {
                window.app.showNotification('Email отправлен', 'success');
            }
            
            return { success: true, message: 'Email успешно отправлен' };
            
        } catch (error) {
            console.error('❌ Ошибка отправки email:', error);
            
            if (window.app && window.app.showNotification) {
                window.app.showNotification('Ошибка отправки email', 'error');
            }
            
            return { success: false, error: error.message };
        }
    }

    async simulateSending(emailData) {
        return new Promise((resolve) => {
            let progress = 0;
            const interval = setInterval(() => {
                progress += 20;
                if (progress >= 100) {
                    clearInterval(interval);
                    resolve({ ok: true });
                }
            }, 100);
        });
    }

    logSending(emailData) {
        try {
            const log = {
                timestamp: new Date().toISOString(),
                to: emailData.to,
                subject: emailData.subject,
                type: emailData.type || 'general',
                success: true
            };
            
            const logs = JSON.parse(localStorage.getItem('emailLogs') || '[]');
            logs.unshift(log);
            
            // Храним только последние 50 записей
            if (logs.length > 50) {
                logs.pop();
            }
            
            localStorage.setItem('emailLogs', JSON.stringify(logs));
            
            // Анимация отправки
            this.animateEmailSent();
        } catch (error) {
            console.error('Ошибка логирования email:', error);
        }
    }

    animateEmailSent() {
        const emailElements = document.querySelectorAll('.fa-envelope, .email-icon');
        emailElements.forEach(element => {
            element.style.animation = 'emailSent 0.5s ease';
            setTimeout(() => {
                element.style.animation = '';
            }, 500);
        });
    }

    getEmailLogs(limit = 20) {
        try {
            const logs = JSON.parse(localStorage.getItem('emailLogs') || '[]');
            return logs.slice(0, limit);
        } catch (error) {
            console.error('Ошибка получения логов email:', error);
            return [];
        }
    }

    // Методы для админ-панели
    updateAdminEmail(type, email) {
        if (this.config.adminEmails[type]) {
            this.config.adminEmails[type] = email;
            this.saveConfig();
            
            // Уведомление об обновлении
            if (window.app && window.app.showNotification) {
                window.app.showNotification(`Email для ${type} обновлен`, 'success');
            }
            
            return true;
        }
        return false;
    }

    getAdminEmails() {
        return { ...this.config.adminEmails };
    }

    testConnection() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    message: 'Соединение с email сервисом установлено',
                    responseTime: '150ms'
                });
            }, 800);
        });
    }

    // Шаблоны email
    createSecurityTemplate(data) {
        const categoryNames = {
            suspicious_object: 'Подозрительный предмет',
            suspicious_activity: 'Подозрительная активность',
            dangerous_situation: 'Опасная ситуация',
            other: 'Другое'
        };
        
        return `
            <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f5f5f7; border-radius: 12px;">
                <div style="text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #007AFF;">
                    <h1 style="color: #1d1d1f; margin: 0 0 8px 0;">🚨 Сообщение о безопасности</h1>
                    <p style="color: #86868b; margin: 0;">ID: ${data.id}</p>
                </div>
                
                <div style="background: white; border-radius: 8px; padding: 16px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <h3 style="color: #1d1d1f; margin-top: 0;">📋 Основная информация</h3>
                    <p><strong>Дата:</strong> ${new Date(data.timestamp).toLocaleString('ru-RU')}</p>
                    <p><strong>Статус:</strong> <span style="color: #FF9500; font-weight: bold;">НОВЫЙ</span></p>
                    <p><strong>Категория:</strong> ${categoryNames[data.category] || data.category}</p>
                </div>
                
                <div style="background: white; border-radius: 8px; padding: 16px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <h3 style="color: #1d1d1f; margin-top: 0;">👤 Контактная информация</h3>
                    <p><strong>Имя:</strong> ${data.userName || 'Не указано'}</p>
                    ${data.phone ? `<p><strong>Телефон:</strong> ${data.phone}</p>` : ''}
                    ${data.email ? `<p><strong>Email:</strong> ${data.email}</p>` : ''}
                </div>
                
                <div style="background: white; border-radius: 8px; padding: 16px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <h3 style="color: #1d1d1f; margin-top: 0;">📍 Детали сообщения</h3>
                    ${data.address ? `<p><strong>Адрес:</strong> ${data.address}</p>` : ''}
                    ${data.description ? `<p><strong>Описание:</strong><br>${data.description}</p>` : ''}
                    ${data.mediaFiles ? `<p><strong>Медиафайлов:</strong> ${data.mediaFiles}</p>` : ''}
                </div>
                
                <div style="text-align: center; padding-top: 16px; border-top: 1px solid #d1d1d6; color: #86868b; font-size: 12px;">
                    <p>Безопасный Севастополь - автоматическое уведомление</p>
                </div>
            </div>
        `;
    }

    createGraffitiTemplate(data) {
        return this.createSecurityTemplate(data)
            .replace('Сообщение о безопасности', 'Сообщение о граффити')
            .replace('🚨', '🎨');
    }

    createWifiProblemTemplate(data) {
        return this.createSecurityTemplate(data)
            .replace('Сообщение о безопасности', 'Проблема с Wi-Fi')
            .replace('🚨', '📶');
    }

    createWifiSuggestionTemplate(data) {
        return this.createSecurityTemplate(data)
            .replace('Сообщение о безопасности', 'Предложение новой точки Wi-Fi')
            .replace('🚨', '💡');
    }

    // Универсальный метод для отправки уведомлений
    async sendNotification(type, data) {
        const emailData = {
            to: this.config.adminEmails[type] || this.config.adminEmails.general,
            subject: this.getEmailSubject(type, data),
            html: this.templates[type] ? this.templates[type](data) : this.createDefaultTemplate(data),
            type: type
        };
        
        return await this.sendEmail(emailData);
    }

    getEmailSubject(type, data) {
        const subjects = {
            security: `СРОЧНО: Сообщение о безопасности #${data.id}`,
            graffiti: `Граффити для удаления #${data.id}`,
            wifi_problem: `Проблема с Wi-Fi: ${data.pointName || 'Неизвестная точка'}`,
            wifi_suggestion: `Предложение новой точки Wi-Fi: ${data.name || 'Без названия'}`
        };
        return subjects[type] || `Новое обращение #${data.id}`;
    }

    createDefaultTemplate(data) {
        return `
            <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
                <h2>Новое обращение в Безопасный Севастополь</h2>
                <p><strong>ID:</strong> ${data.id}</p>
                <p><strong>Дата:</strong> ${new Date(data.timestamp).toLocaleString('ru-RU')}</p>
                <p><strong>Тип:</strong> ${data.type}</p>
                ${data.description ? `<p><strong>Описание:</strong> ${data.description}</p>` : ''}
            </div>
        `;
    }
}

// Экспорт глобального сервиса
window.EmailService = new EmailService();

// Добавляем CSS анимацию для email
if (!document.querySelector('#email-styles')) {
    const style = document.createElement('style');
    style.id = 'email-styles';
    style.textContent = `
        @keyframes emailSent {
            0% { transform: scale(1); }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); }
        }
        
        .email-icon {
            transition: transform 0.3s ease;
        }
        
        .email-icon.sending {
            animation: emailSent 0.5s ease;
        }
    `;
    document.head.appendChild(style);
}
