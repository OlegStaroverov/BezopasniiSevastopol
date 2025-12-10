// Данные и конфигурация Sevastopol Hub
window.ADMIN_USER_IDS = ['13897373', '90334880', '555666777'];

// Данные точек Wi-Fi (упрощенная версия)
window.wifiPoints = [
    {
        id: 1,
        name: "1-я Городская Больница 🏥",
        address: "ул. Адмирала Октябрьского, 19",
        coordinates: { lat: 44.601878, lon: 33.517227 },
        description: "65 точек доступа. Бесплатный Wi-Fi для пациентов и посетителей",
        type: "здрав"
    },
    {
        id: 2,
        name: "5-я Городская Больница",
        address: "просп. Генерала Острякова, 211Б",
        coordinates: { lat: 44.554841, lon: 33.533712 },
        description: "53 точки доступа. Wi-Fi в родильном доме и детской поликлинике",
        type: "здрав"
    },
    // ... остальные точки из предыдущего файла
];

// Конфигурация приложения
window.AppConfig = {
    name: "Sevastopol Hub",
    version: "1.0.0",
    city: "Севастополь",
    coordinates: { lat: 44.6166, lon: 33.5254 },
    features: {
        wifi: true,
        security: true,
        graffiti: true,
        admin: true
    },
    limits: {
        maxMediaFiles: 5,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxGraffitiPhotos: 3,
        descriptionMinLength: 30
    },
    urls: {
        yandexMaps: "https://yandex.ru/maps/",
        cityWebsite: "https://sev.gov.ru",
        feedback: "https://forms.yandex.ru/feedback"
    }
};

// Кэш данных
window.AppCache = {
    userLocation: null,
    favoritePoints: new Set(),
    lastReports: [],
    settings: {}
};

// Инициализация кэша
function initCache() {
    try {
        const savedFavorites = localStorage.getItem('favoriteWifiPoints');
        if (savedFavorites) {
            window.AppCache.favoritePoints = new Set(JSON.parse(savedFavorites));
        }
        
        const savedSettings = localStorage.getItem('appSettings');
        if (savedSettings) {
            window.AppCache.settings = JSON.parse(savedSettings);
        }
    } catch (error) {
        console.error('Ошибка инициализации кэша:', error);
    }
}

// Утилитарные функции
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Радиус Земли в км
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function formatDistance(distance) {
    if (distance < 1) {
        return `${(distance * 1000).toFixed(0)} м`;
    }
    return `${distance.toFixed(2)} км`;
}

function getCurrentTimestamp() {
    return new Date().toISOString();
}

function generateReportId() {
    return `RPT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', initCache);
