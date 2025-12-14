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
        optional: ["camera", "contacts"]
    },
    
    // Обработка событий
    events: {
        onReady: function() {
            console.log("✅ MAX Bridge ready");
        },
        onClose: function() {
            console.log("Приложение закрывается");
            return false;
        },
        onBackButton: function() {
            console.log("Нажата кнопка назад");
            return true;
        }
    },
    
    // Deep linking
    deep_links: {
        prefixes: ["sevastopol://", "https://sevastopol-hub.ru/"],
        handlers: {
            "wifi": "switchToWifi",
            "security": "switchToSecurity",
            "graffiti": "switchToGraffiti"
        }
    },
    
    // Настройки производительности
    performance: {
        cache_assets: true,
        lazy_load_images: true,
        compress_images: true,
        max_image_size: 1024
    }
};

// Инициализация конфигурации
document.addEventListener('DOMContentLoaded', function() {
    if (window.MAX_CONFIG && window.app) {
        console.log('✅ MAX Config загружен');
    }
});
