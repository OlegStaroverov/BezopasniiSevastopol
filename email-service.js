// Email Service для отправки уведомлений администраторам - Премиум версия
class EmailService {
    constructor() {
        this.config = {
            adminEmails: {
                wifi: 'wifi-admin@sevastopol.ru',
                security: 'security-admin@sevastopol.ru',
                graffiti: 'graffiti-admin@sevastopol.ru'
            },
            defaultFrom: 'noreply@sevastopol-hub.ru',
            apiEndpoint: 'https://api.sevastopol-hub.ru/email/send'
        };
        
        this.loadConfig();
        this.setupEmailTemplates();
    }

    loadConfig() {
        // Загрузка конфигурации из localStorage
        const savedConfig = localStorage.getItem('emailServiceConfig');
        if (savedConfig) {
            this.config = { ...this.config, ...JSON.parse(savedConfig) };
        }
    }

    saveConfig() {
        localStorage.setItem('emailServiceConfig', JSON.stringify(this.config));
    }

    setupEmailTemplates() {
        this.templates = {
            security: this.createSecurityTemplate.bind(this),
            graffiti: this.createGraffitiTemplate.bind(this),
            wifi: this.createWifiTemplate.bind(this),
            wifi_suggestion: this.createWifiSuggestionTemplate.bind(this)
        };
    }

    async sendEmail(emailData) {
        try {
            console.log('📧 Отправка премиум email:', {
                to: emailData.to,
                subject: emailData.subject
            });
            
            // Показываем индикатор отправки
            if (window.app && window.app.showNotification) {
                window.app.showNotification('Отправка email...', 'info');
            }
            
            // Симуляция отправки с улучшенной анимацией
            await this.simulateEmailSending(emailData);
            
            // Логирование отправки
            this.logEmailSending(emailData);
            
            // Успешное уведомление
            if (window.app && window.app.showNotification) {
                window.app.showNotification('Email успешно отправлен', 'success');
            }
            
            return { success: true, message: 'Email отправлен' };
            
        } catch (error) {
            console.error('❌ Ошибка отправки email:', error);
            
            if (window.app && window.app.showNotification) {
                window.app.showNotification('Ошибка отправки email', 'error');
            }
            
            return { success: false, error: error.message };
        }
    }

    async simulateEmailSending(emailData) {
        // Симуляция задержки сети с прогрессом
        return new Promise((resolve, reject) => {
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                console.log(`📤 Отправка email... ${progress}%`);
                
                if (progress >= 100) {
                    clearInterval(interval);
                    resolve({ ok: true });
                }
            }, 50);
        });
    }

    logEmailSending(emailData) {
        const log = {
            timestamp: new Date().toISOString(),
            to: emailData.to,
            subject: emailData.subject,
            success: true,
            type: emailData.type || 'general'
        };
        
        const logs = JSON.parse(localStorage.getItem('emailLogs') || '[]');
        logs.unshift(log);
        
        // Храним только последние 100 записей
        if (logs.length > 100) {
            logs.pop();
        }
        
        localStorage.setItem('emailLogs', JSON.stringify(logs));
        
        // Анимация в UI если есть
        this.animateEmailSent();
    }

    animateEmailSent() {
        const emailIcon = document.querySelector('.fa-envelope');
        if (emailIcon) {
            emailIcon.style.animation = 'emailSent 1s ease';
            setTimeout(() => {
                emailIcon.style.animation = '';
            }, 1000);
        }
    }

    getEmailLogs(limit = 20) {
        const logs = JSON.parse(localStorage.getItem('emailLogs') || '[]');
        return logs.slice(0, limit);
    }

    // Методы для админ-панели
    updateAdminEmail(type, email) {
        if (this.config.adminEmails[type]) {
            this.config.adminEmails[type] = email;
            this.saveConfig();
            
            // Анимация обновления
            this.showEmailUpdateAnimation(type);
            
            return true;
        }
        return false;
    }

    showEmailUpdateAnimation(type) {
        const input = document.getElementById(`${type}AdminEmail`);
        if (input) {
            input.style.borderColor = '#34c759';
            input.style.boxShadow = '0 0 0 2px rgba(52, 199, 89, 0.2)';
            
            setTimeout(() => {
                input.style.borderColor = '';
                input.style.boxShadow = '';
            }, 2000);
        }
    }

    getAdminEmails() {
        return { ...this.config.adminEmails };
    }

    testEmailConnection() {
        return new Promise((resolve) => {
            // Анимация тестирования
            if (window.app) {
                window.app.showNotification('Тестирование соединения...', 'info');
            }
            
            setTimeout(() => {
                resolve({
                    success: true,
                    message: 'Подключение к email сервису успешно',
                    responseTime: Math.floor(Math.random() * 300) + 100 + 'ms'
                });
                
                if (window.app) {
                    window.app.showNotification('Соединение установлено ✓', 'success');
                }
            }, 800);
        });
    }

    // Премиум шаблоны email
    createSecurityTemplate(data) {
        return `
            <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: linear-gradient(135deg, #0c0c0e 0%, #1c1c1e 100%); border-radius: 24px; border: 1px solid rgba(255, 255, 255, 0.1);">
                <div style="text-align: center; margin-bottom: 32px;">
                    <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #0066ff, #5856d6); border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                        <i style="color: white; font-size: 28px;">🛡️</i>
                    </div>
                    <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">СРОЧНО: Сообщение о безопасности</h1>
                    <p style="color: rgba(255, 255, 255, 0.7); margin-top: 8px;">ID: ${data.id}</p>
                </div>
                
                <div style="background: rgba(255, 255, 255, 0.05); border-radius: 16px; padding: 24px; margin-bottom: 24px; backdrop-filter: blur(10px);">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 20px;">
                        <div>
                            <p style="color: rgba(255, 255, 255, 0.5); margin: 0; font-size: 12px; font-weight: 500; text-transform: uppercase;">Дата и время</p>
                            <p style="color: white; margin: 4px 0 0 0; font-size: 14px;">${new Date(data.timestamp).toLocaleString('ru-RU')}</p>
                        </div>
                        <div>
                            <p style="color: rgba(255, 255, 255, 0.5); margin: 0; font-size: 12px; font-weight: 500; text-transform: uppercase;">Статус</p>
                            <p style="color: #34c759; margin: 4px 0 0 0; font-size: 14px; font-weight: 600;">🆕 НОВЫЙ</p>
                        </div>
                    </div>
                </div>
                
                <div style="margin-bottom: 32px;">
                    <h2 style="color: white; font-size: 18px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                        <i>👤</i> Информация о пользователе
                    </h2>
                    <div style="background: rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 20px;">
                        <p style="color: white; margin: 0 0 8px 0;"><strong>Пользователь:</strong> ${data.userName}</p>
                        ${data.phone ? `<p style="color: white; margin: 0 0 8px 0;"><strong>Телефон:</strong> ${data.phone}</p>` : ''}
                        ${data.email ? `<p style="color: white; margin: 0;"><strong>Email:</strong> ${data.email}</p>` : ''}
                    </div>
                </div>
                
                <div style="margin-bottom: 32px;">
                    <h2 style="color: white; font-size: 18px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                        <i>📍</i> Детали обращения
                    </h2>
                    <div style="background: rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 20px;">
                        ${data.category ? `<p style="color: white; margin: 0 0 8px 0;"><strong>Категория:</strong> ${data.category}</p>` : ''}
                        ${data.address ? `<p style="color: white; margin: 0 0 8px 0;"><strong>Адрес:</strong> ${data.address}</p>` : ''}
                        ${data.description ? `<p style="color: white; margin: 0 0 8px 0;"><strong>Описание:</strong><br>${data.description}</p>` : ''}
                        ${data.mediaFiles ? `<p style="color: white; margin: 0;"><strong>Медиафайлов:</strong> ${data.mediaFiles}</p>` : ''}
                    </div>
                </div>
                
                <div style="text-align: center; padding-top: 24px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                    <p style="color: rgba(255, 255, 255, 0.5); margin: 0; font-size: 12px;">
                        Для обработки перейдите в админ-панель "Безопасный Севастополь"
                    </p>
                    <p style="color: rgba(255, 255, 255, 0.3); margin: 8px 0 0 0; font-size: 11px;">
                        Это автоматическое уведомление, пожалуйста, не отвечайте на него.
                    </p>
                </div>
            </div>
        `;
    }

    createGraffitiTemplate(data) {
        // Аналогичный премиум шаблон для граффити
        return this.createSecurityTemplate(data).replace('СРОЧНО: Сообщение о безопасности', 'Сообщение о граффити');
    }

    createWifiTemplate(data) {
        // Аналогичный премиум шаблон для Wi-Fi
        return this.createSecurityTemplate(data).replace('СРОЧНО: Сообщение о безопасности', 'Проблема с Wi-Fi');
    }

    createWifiSuggestionTemplate(data) {
        // Аналогичный премиум шаблон для предложений Wi-Fi
        return this.createSecurityTemplate(data).replace('СРОЧНО: Сообщение о безопасности', 'Предложение новой точки Wi-Fi');
    }
}

// Экспорт глобального сервиса
window.EmailService = new EmailService();

// Добавляем CSS анимацию для email
const style = document.createElement('style');
style.textContent = `
    @keyframes emailSent {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(style);
