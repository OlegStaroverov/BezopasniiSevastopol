// Данные и конфигурация Sevastopol Hub - Версия 2.0
class AppData {
    constructor() {
        this.ADMIN_USER_IDS = ['13897373', '90334880', '555666777'];
        this.currentTheme = 'dark'; // dark, light, max
        this.userData = null;
        this.init();
    }

    init() {
        this.loadTheme();
        this.loadUserData();
        this.loadWifiPoints();
    }

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
    AppConfig = {
        name: "Безопасный Севастополь",
        version: "2.0.0",
        city: "Севастополь",
        coordinates: { lat: 44.6166, lon: 33.5254 },
        features: {
            wifi: true,
            security: true,
            graffiti: true,
            admin: true,
            contacts: true,
            themes: true
        },
        limits: {
            maxMediaFiles: 5,
            maxFileSize: 10 * 1024 * 1024, // 10MB
            maxGraffitiPhotos: 3,
            descriptionMinLength: 10,
            descriptionMaxLength: 500
        },
        urls: {
            yandexMaps: "https://yandex.ru/maps/",
            cityWebsite: "https://sev.gov.ru",
            feedback: "https://forms.yandex.ru/feedback",
            maxBridge: "https://st.max.ru/js/max-web-app.js"
        },
        categories: {
            wifi: ["здрав", "образование", "транспорт", "отдых", "тц", "спорт", "МФЦ", "АЗС", "гостиница", "пляж", "турбаза", "дома", "кафе", "торговля", "другое"],
            security: ["suspicious_object", "suspicious_activity", "dangerous_situation", "other"],
            graffiti: ["vandalism", "art", "repair_needed", "other"]
        }
    };

    // Кэш данных
    AppCache = {
        userLocation: null,
        settings: {},
        favorites: new Set(),
        reports: {
            security: [],
            wifi: [],
            graffiti: [],
            suggestions: []
        }
    };

    loadTheme() {
        this.currentTheme = localStorage.getItem('app_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        this.updateThemeMeta();
    }

    updateThemeMeta() {
        const themeColors = {
            dark: '#000000',
            light: '#FFFFFF',
            max: '#007AFF'
        };
        const themeColor = themeColors[this.currentTheme] || '#000000';
        document.querySelector('meta[name="theme-color"]').setAttribute('content', themeColor);
    }

    setTheme(theme) {
        if (['dark', 'light', 'max'].includes(theme)) {
            this.currentTheme = theme;
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('app_theme', theme);
            this.updateThemeMeta();
            return true;
        }
        return false;
    }

    toggleTheme() {
        const themes = ['dark', 'light', 'max'];
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        return this.setTheme(themes[nextIndex]);
    }

    loadUserData() {
        try {
            const saved = localStorage.getItem('user_data');
            if (saved) {
                this.userData = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Ошибка загрузки данных пользователя:', error);
        }
    }

    saveUserData(data) {
        try {
            this.userData = data;
            localStorage.setItem('user_data', JSON.stringify(data));
        } catch (error) {
            console.error('Ошибка сохранения данных пользователя:', error);
        }
    }

    loadWifiPoints() {
        try {
            const saved = localStorage.getItem('wifi_points');
            if (saved) {
                const customPoints = JSON.parse(saved);
                this.wifiPoints = [...this.wifiPoints, ...customPoints];
            }
        } catch (error) {
            console.error('Ошибка загрузки точек Wi-Fi:', error);
        }
    }

    saveWifiPoint(point) {
        try {
            point.id = Date.now();
            point.type = point.type || 'другое';
            point.status = 'pending';
            
            const customPoints = JSON.parse(localStorage.getItem('wifi_points') || '[]');
            customPoints.push(point);
            localStorage.setItem('wifi_points', JSON.stringify(customPoints));
            
            this.wifiPoints.push(point);
            return point.id;
        } catch (error) {
            console.error('Ошибка сохранения точки Wi-Fi:', error);
            return null;
        }
    }

    // Утилитарные функции
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Радиус Земли в км
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
                Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    formatDistance(distance) {
        if (distance < 1) {
            return `${(distance * 1000).toFixed(0)} м`;
        }
        return `${distance.toFixed(1)} км`;
    }

    getCurrentTimestamp() {
        return new Date().toISOString();
    }

    validatePhone(phone) {
        if (!phone) return false;
        const cleanPhone = phone.replace(/\s|-|\(|\)/g, '');
        const russianRegex = /^(\+7|7|8)?[489][0-9]{9}$/;
        return russianRegex.test(cleanPhone);
    }

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    generateReportId() {
        return `RPT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    }

    formatPhoneNumber(phone) {
        const cleaned = phone.replace(/\D/g, '');
        
        if (cleaned.length === 11 && (cleaned.startsWith('7') || cleaned.startsWith('8'))) {
            const match = cleaned.match(/^(\d)(\d{3})(\d{3})(\d{2})(\d{2})$/);
            if (match) {
                return `+${match[1]} (${match[2]}) ${match[3]}-${match[4]}-${match[5]}`;
            }
        }
        
        return phone;
    }

    getTypeEmoji(type) {
        const emojis = {
            'здрав': '🏥',
            'образование': '🎓',
            'тц': '🛍️',
            'транспорт': '🚌',
            'отдых': '🌳',
            'спорт': '⚽',
            'МФЦ': '🏢',
            'АЗС': '⛽',
            'гостиница': '🏨',
            'пляж': '🏖️',
            'турбаза': '⛺',
            'дома': '🏘️',
            'кафе': '🍴',
            'торговля': '🛒',
            'другое': '📍'
        };
        return emojis[type] || '📍';
    }

    getTypeName(type) {
        const names = {
            'здрав': 'Медицинские организации',
            'образование': 'Образовательные учреждения',
            'тц': 'Торговые центры',
            'транспорт': 'Транспорт',
            'отдых': 'Места отдыха',
            'спорт': 'Спортивные объекты',
            'МФЦ': 'МФЦ',
            'АЗС': 'АЗС',
            'гостиница': 'Гостиницы',
            'пляж': 'Пляжи',
            'турбаза': 'Турбазы',
            'дома': 'Жилые комплексы',
            'кафе': 'Кафе и рестораны',
            'торговля': 'Магазины',
            'другое': 'Другое'
        };
        return names[type] || 'Другое';
    }

    // Сохранение в MAX SecureStorage или localStorage
    async saveToStorage(key, value) {
        try {
            if (window.WebApp && window.WebApp.SecureStorage) {
                await window.WebApp.SecureStorage.setItem(key, JSON.stringify(value));
            } else {
                localStorage.setItem(key, JSON.stringify(value));
            }
            return true;
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            return false;
        }
    }

    // Загрузка из MAX SecureStorage или localStorage
    async loadFromStorage(key) {
        try {
            let data = null;
            if (window.WebApp && window.WebApp.SecureStorage) {
                const stored = await window.WebApp.SecureStorage.getItem(key);
                data = stored ? JSON.parse(stored) : null;
            } else {
                const stored = localStorage.getItem(key);
                data = stored ? JSON.parse(stored) : null;
            }
            return data;
        } catch (error) {
            console.error('Ошибка загрузки:', error);
            return null;
        }
    }

    // Сохранение отчета
    async saveReport(report, type) {
        try {
            const key = `${type}_reports`;
            let reports = await this.loadFromStorage(key) || [];
            reports.push({
                ...report,
                id: this.generateReportId(),
                timestamp: this.getCurrentTimestamp(),
                status: 'new'
            });
            await this.saveToStorage(key, reports);
            return true;
        } catch (error) {
            console.error('Ошибка сохранения отчета:', error);
            return false;
        }
    }

    // Получение отчетов
    async getReports(type) {
        try {
            const key = `${type}_reports`;
            return await this.loadFromStorage(key) || [];
        } catch (error) {
            console.error('Ошибка получения отчетов:', error);
            return [];
        }
    }

    // Поиск точек Wi-Fi
    searchWifiPoints(query, filter = 'all') {
        let results = [...this.wifiPoints];
        
        // Фильтрация по запросу
        if (query && query.trim()) {
            const searchTerm = query.toLowerCase().trim();
            results = results.filter(point => 
                point.name.toLowerCase().includes(searchTerm) ||
                point.address.toLowerCase().includes(searchTerm) ||
                point.description.toLowerCase().includes(searchTerm)
            );
        }
        
        // Фильтрация по категории
        if (filter !== 'all') {
            results = results.filter(point => point.type === filter);
        }
        
        return results;
    }

    // Получение ближайших точек
    getNearbyPoints(lat, lon, limit = 10) {
        const pointsWithDistance = this.wifiPoints.map(point => ({
            ...point,
            distance: this.calculateDistance(lat, lon, point.coordinates.lat, point.coordinates.lon)
        }));
        
        pointsWithDistance.sort((a, b) => a.distance - b.distance);
        return pointsWithDistance.slice(0, limit);
    }
}

// Инициализация глобального объекта данных
window.AppData = new AppData();

// Экспорт функций для использования в других файлах
window.AppUtils = {
    calculateDistance: AppData.calculateDistance.bind(AppData),
    formatDistance: AppData.formatDistance.bind(AppData),
    getCurrentTimestamp: AppData.getCurrentTimestamp.bind(AppData),
    validatePhone: AppData.validatePhone.bind(AppData),
    validateEmail: AppData.validateEmail.bind(AppData),
    generateReportId: AppData.generateReportId.bind(AppData),
    saveToStorage: AppData.saveToStorage.bind(AppData),
    loadFromStorage: AppData.loadFromStorage.bind(AppData),
    formatPhoneNumber: AppData.formatPhoneNumber.bind(AppData)
};
