// Конфигурация MAX Bridge для Безопасный Севастополь
window.MAX_CONFIG = {
    app_name: "Безопасный Севастополь",
    version: "2.0.0",
    bridge_version: "1.0",
    
    // Темы: dark, light, max
    themes: {
        dark: "#000000",
        light: "#FFFFFF",
        max: "#007AFF"
    },
    
    // Настройки интерфейса
    ui: {
        theme_color: "#007AFF",
        background_color: "#000000",
        primary_color: "#007AFF",
        accent_color: "#FF9500",
        success_color: "#34C759",
        warning_color: "#FF9500",
        error_color: "#FF3B30"
    },
    
    // Разрешения
    permissions: {
        required: ["storage", "location"],
        optional: ["camera", "contacts", "biometric"]
    },
    
    // Обработка событий
    events: {
        onReady: function() {
            console.log("✅ MAX Bridge готов");
            if (window.app) {
                window.app.initMaxBridge();
            }
        },
        onClose: function() {
            console.log("Приложение закрывается");
            return false;
        },
        onBackButton: function() {
            if (window.app) {
                return window.app.handleBackButton();
            }
            return true;
        },
        onThemeChange: function(theme) {
            if (window.app) {
                window.app.setTheme(theme);
            }
        }
    },
    
    // Deep linking
    deep_links: {
        prefixes: ["sevastopol://", "https://sevastopol-hub.ru/"],
        handlers: {
            "wifi": "switchToWifi",
            "security": "switchToSecurity",
            "graffiti": "switchToGraffiti",
            "contacts": "switchToContacts",
            "admin": "switchToAdmin"
        }
    },
    
    // Настройки производительности
    performance: {
        cache_assets: true,
        lazy_load_images: true,
        compress_images: true,
        max_image_size: 1024,
        use_service_worker: true
    },
    
    // Конфигурация форм
    forms: {
        max_media_files: 5,
        max_file_size: 10 * 1024 * 1024, // 10MB
        max_graffiti_photos: 3,
        description_min_length: 10,
        description_max_length: 500,
        phone_pattern: /^(\+7|7|8)?[489][0-9]{9}$/
    }
};

// Инициализация конфигурации
document.addEventListener('DOMContentLoaded', function() {
    if (window.MAX_CONFIG && window.app) {
        console.log('✅ MAX Config загружен');
    }
});
