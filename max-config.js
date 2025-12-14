// Конфигурация MAX Bridge для Безопасный Севастополь
window.MAX_CONFIG = {
    app_name: "Безопасный Севастополь",
    version: "1.0.0",
    bridge_version: "1.0",
    
    // Настройки интерфейса
    ui: {
        theme_color: "#0066ff",
        background_color: "#0c0c0e",
        primary_color: "#0066ff",
        accent_color: "#ff9500"
    },
    
    // Разрешения
    permissions: {
        required: ["storage", "location"],
        optional: ["camera", "contacts", "biometric"]
    },
    
    // Обработка событий
    events: {
        onReady: function() {
            console.log("MAX Bridge ready");
        },
        onClose: function() {
            console.log("Приложение закрывается");
            return window.app?.hasUnsavedChanges || false;
        },
        onBackButton: function() {
            console.log("Нажата кнопка назад");
            if (window.app?.currentSection !== 'wifi') {
                window.app?.switchSection('wifi');
                return true; // Обработано приложением
            }
            return false; // Закрыть приложение
        }
    },
    
    // Deep linking
    deep_links: {
        prefixes: ["sevastopol://", "https://sevastopol-hub.ru/"],
        handlers: {
            "wifi": "switchToWifi",
            "security": "switchToSecurity",
            "graffiti": "switchToGraffiti",
            "report": "openReport"
        }
    },
    
    // Настройки производительности
    performance: {
        cache_assets: true,
        lazy_load_images: true,
        compress_images: true,
        max_image_size: 1024 // px
    },
    
    // Аналитика (опционально)
    analytics: {
        enabled: false,
        endpoint: "https://analytics.sevastopol-hub.ru/events",
        events_to_track: ["app_launch", "section_switch", "report_submit"]
    }
};

// Инициализация конфигурации
document.addEventListener('DOMContentLoaded', function() {
    if (window.MAX_CONFIG && window.app) {
        console.log('MAX Config загружен');
        
        // Применяем тему
        document.documentElement.style.setProperty('--primary-color', MAX_CONFIG.ui.primary_color);
        document.documentElement.style.setProperty('--accent-color', MAX_CONFIG.ui.accent_color);
    }
});
