// Email Service для отправки уведомлений администраторам
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

    async sendEmail(emailData) {
        try {
            console.log('📧 Отправка email:', {
                to: emailData.to,
                subject: emailData.subject
            });
            
            // Симуляция отправки
            await this.simulateEmailSending(emailData);
            
            // Логирование отправки
            this.logEmailSending(emailData);
            
            return { success: true, message: 'Email отправлен' };
            
        } catch (error) {
            console.error('❌ Ошибка отправки email:', error);
            return { success: false, error: error.message };
        }
    }

    async simulateEmailSending(emailData) {
        // Симуляция задержки сети
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // В реальном приложении здесь будет fetch запрос
        // return fetch(this.config.apiEndpoint, {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json'
        //     },
        //     body: JSON.stringify(emailData)
        // });
        
        return { ok: true };
    }

    logEmailSending(emailData) {
        const log = {
            timestamp: new Date().toISOString(),
            to: emailData.to,
            subject: emailData.subject,
            success: true
        };
        
        const logs = JSON.parse(localStorage.getItem('emailLogs') || '[]');
        logs.unshift(log);
        
        // Храним только последние 100 записей
        if (logs.length > 100) {
            logs.pop();
        }
        
        localStorage.setItem('emailLogs', JSON.stringify(logs));
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
            return true;
        }
        return false;
    }

    getAdminEmails() {
        return { ...this.config.adminEmails };
    }

    testEmailConnection() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    message: 'Подключение к email сервису успешно'
                });
            }, 500);
        });
    }
}

// Экспорт глобального сервиса
window.EmailService = new EmailService();
