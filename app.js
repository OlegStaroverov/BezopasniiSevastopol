// Безопасный Севастополь - Основное приложение для MAX Bridge
class SafeSevastopol {
    constructor() {
        this.maxBridge = window.WebApp || null;
        this.currentUser = null;
        this.currentSection = 'wifi';
        this.currentLocation = null;
        this.favoritePoints = new Set();
        this.securityReport = {
            step: 1,
            data: {}
        };
        this.graffitiReport = {
            urgency: 'low',
            photos: []
        };
        this.mediaFiles = [];
        this.isAdmin = false;
        this.hasUnsavedChanges = false;
        this.startParam = null;
        this.yandexMap = null;
        this.mapMarker = null;
        this.selectedLocation = null;
        this.locationContext = null;
        this.confirmMap = null;
        this.confirmMarker = null;
        
        // Инициализация
        this.init();
    }

    async init() {
        console.log('🚀 Инициализация Безопасный Севастополь');
        
        // Сначала сообщаем MAX, что приложение готово
        if (this.maxBridge) {
            this.maxBridge.ready();
            console.log('✅ MAX Bridge ready() вызван');
        }
        
        // Настройка адаптивности
        this.setupResponsive();
        
        // Настройка событий
        this.setupEventListeners();
        
        // Загрузка данных пользователя
        await this.loadUserData();
        
        // Загрузка точек Wi-Fi
        this.loadWifiPoints();
        
        // Проверка прав админа
        this.checkAdminStatus();
        
        // Настройка форм
        this.setupFormValidation();
        
        // Настройка drag and drop
        this.setupDragAndDrop();
        
        // Показываем приветственное уведомление
        this.showNotification('Добро пожаловать в Безопасный Севастополь!', 'success');
        
        // Инициализация Яндекс Карт
        this.initYandexMaps();
        
        console.log('✅ Приложение инициализировано');
    }

    setupResponsive() {
        // Предотвращаем горизонтальное расползание
        document.body.style.overflowX = 'hidden';
        
        // Фиксируем высоту для мобильных устройств
        function setVh() {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        }
        
        setVh();
        window.addEventListener('resize', setVh);
        window.addEventListener('orientationchange', setVh);
        
        // Блокируем горизонтальный скролл
        document.addEventListener('wheel', (e) => {
            if (e.deltaX !== 0) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // Для iOS
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            document.body.style.overscrollBehavior = 'none';
        }
    }

    setupEventListeners() {
        // Навигация
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                this.switchSection(section);
            });
        });

        // Wi-Fi поиск
        document.getElementById('wifiSearch')?.addEventListener('input', (e) => {
            this.searchWifiPoints(e.target.value);
        });
        
        document.getElementById('findNearbyWifi')?.addEventListener('click', () => {
            this.findNearbyWifi();
        });
        
        document.getElementById('sortWifi')?.addEventListener('change', (e) => {
            this.sortWifiPoints(e.target.value);
        });

        // Фильтры Wi-Fi
        document.querySelectorAll('.filter-tag').forEach(tag => {
            tag.addEventListener('click', (e) => {
                const filter = e.currentTarget.dataset.filter;
                this.filterWifiPoints(filter);
            });
        });

        // Избранное
        document.getElementById('toggleFavorite')?.addEventListener('click', () => {
            this.toggleCurrentFavorite();
        });

        // Форма безопасности
        document.getElementById('nextStep')?.addEventListener('click', () => {
            this.nextSecurityStep();
        });
        
        document.getElementById('prevStep')?.addEventListener('click', () => {
            this.prevSecurityStep();
        });
        
        document.getElementById('submitSecurityReport')?.addEventListener('click', () => {
            this.submitSecurityReport();
        });

        // Геолокация для безопасности
        document.getElementById('useCurrentLocation')?.addEventListener('click', () => {
            this.getCurrentLocation();
        });
        
        document.querySelectorAll('.location-option[data-type="address"]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.showAddressInput();
            });
        });

        // Выбор на карте для безопасности
        document.getElementById('pickLocationFromMap')?.addEventListener('click', () => {
            this.openLocationPicker('security');
        });

        // Счетчик символов
        const descInput = document.getElementById('securityDescription');
        if (descInput) {
            descInput.addEventListener('input', (e) => {
                document.getElementById('charCount').textContent = e.target.value.length;
            });
        }

        // Загрузка медиа
        document.getElementById('browseMedia')?.addEventListener('click', () => {
            document.getElementById('mediaInput').click();
        });
        
        document.getElementById('mediaInput')?.addEventListener('change', (e) => {
            this.handleMediaUpload(e.target.files);
        });

        // Граффити
        document.querySelectorAll('.urgency-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const urgency = e.currentTarget.dataset.urgency;
                this.setGraffitiUrgency(urgency);
            });
        });

        document.getElementById('selectGraffitiLocation')?.addEventListener('click', () => {
            this.openLocationPicker('graffiti');
        });
        
        document.getElementById('addGraffitiPhoto')?.addEventListener('click', () => {
            document.getElementById('graffitiPhotoInput').click();
        });
        
        document.getElementById('graffitiPhotoInput')?.addEventListener('change', (e) => {
            this.handleGraffitiPhotos(e.target.files);
        });
        
        document.getElementById('submitGraffitiReport')?.addEventListener('click', () => {
            this.submitGraffitiReport();
        });

        // Wi-Fi проблемы и предложения
        document.getElementById('submitWifiProblem')?.addEventListener('click', () => {
            this.submitWifiProblem();
        });
        
        document.getElementById('submitNewPoint')?.addEventListener('click', () => {
            this.submitNewPoint();
        });

        // Экстренные вызовы
        document.querySelectorAll('.btn-call').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const number = e.currentTarget.dataset.number;
                this.makeEmergencyCall(number);
            });
        });

        // Админ-панель
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.switchAdminTab(tabName);
            });
        });

        // Модальные окна
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeModal();
            });
        });

        document.getElementById('modalOverlay')?.addEventListener('click', () => {
            this.closeModal();
        });
        
        document.getElementById('cancelLocation')?.addEventListener('click', () => {
            this.closeModal();
        });
        
        document.getElementById('confirmLocation')?.addEventListener('click', () => {
            this.confirmLocation();
        });
        
        document.getElementById('closeConfirmModal')?.addEventListener('click', () => {
            this.closeConfirmModal();
        });
        
        document.getElementById('cancelConfirmLocation')?.addEventListener('click', () => {
            this.closeConfirmModal();
            this.openLocationPicker(this.locationContext);
        });
        
        document.getElementById('acceptLocation')?.addEventListener('click', () => {
            this.acceptLocation();
        });

        // Очистка поиска
        document.getElementById('clearSearch')?.addEventListener('click', () => {
            document.getElementById('wifiSearch').value = '';
            this.searchWifiPoints('');
        });
    }

    async loadUserData() {
        try {
            console.log('👤 Загрузка данных пользователя...');
            
            let userData = null;
            
            // Пытаемся получить данные из MAX Bridge
            if (this.maxBridge?.initDataUnsafe?.user) {
                const bridgeUser = this.maxBridge.initDataUnsafe.user;
                userData = {
                    id: String(bridgeUser.id || 'anonymous'),
                    first_name: bridgeUser.first_name || 'Пользователь',
                    last_name: bridgeUser.last_name || '',
                    username: bridgeUser.username || '',
                    language_code: bridgeUser.language_code || 'ru'
                };
                console.log('✅ Пользователь из MAX Bridge:', userData.id);
                
                // Сохраняем start_param если есть
                if (this.maxBridge.initDataUnsafe.start_param) {
                    this.startParam = this.maxBridge.initDataUnsafe.start_param;
                    this.handleStartParam(this.startParam);
                }
            }
            
            // Если нет данных из Bridge - используем демо-режим
            if (!userData) {
                userData = {
                    id: 'demo_user',
                    first_name: 'Демо',
                    last_name: 'Пользователь',
                    username: 'demo_user',
                    language_code: 'ru'
                };
                console.log('⚠️ Используем демо-режим');
            }
            
            this.currentUser = userData;
            
            // Обновление UI
            const userNameElement = document.getElementById('userName');
            if (userNameElement) {
                userNameElement.textContent = this.currentUser.first_name || 'Гость';
            }
            
            // Загрузка избранных точек
            try {
                if (this.maxBridge?.SecureStorage) {
                    const favorites = await this.maxBridge.SecureStorage.getItem('favoriteWifiPoints');
                    if (favorites) {
                        this.favoritePoints = new Set(JSON.parse(favorites));
                        console.log('⭐ Избранное загружено из SecureStorage:', this.favoritePoints.size);
                    }
                } else {
                    const favorites = localStorage.getItem('favoriteWifiPoints');
                    if (favorites) {
                        this.favoritePoints = new Set(JSON.parse(favorites));
                        console.log('⭐ Избранное загружено из localStorage:', this.favoritePoints.size);
                    }
                }
            } catch (storageError) {
                console.warn('Ошибка загрузки избранного:', storageError);
            }
            
            // Настройка кнопки "Назад" для MAX
            this.setupBackButton();
            
            // Включаем подтверждение при закрытии
            if (this.maxBridge?.enableClosingConfirmation) {
                this.maxBridge.enableClosingConfirmation();
            }
            
        } catch (error) {
            console.error('❌ Ошибка загрузки данных пользователя:', error);
            // Аварийный fallback
            this.currentUser = { 
                id: 'anonymous', 
                first_name: 'Гость',
                language_code: 'ru'
            };
            
            const userNameElement = document.getElementById('userName');
            if (userNameElement) {
                userNameElement.textContent = 'Гость';
            }
        }
    }

    handleStartParam(param) {
        if (!param) return;
        
        console.log('🔗 Обработка стартового параметра:', param);
        
        const sections = ['wifi', 'security', 'graffiti', 'contacts', 'admin'];
        
        if (sections.includes(param)) {
            this.switchSection(param);
            this.showNotification(`Открыт раздел: ${this.getSectionName(param)}`, 'info');
        } else if (param.startsWith('report_')) {
            const reportId = param.replace('report_', '');
            this.showNotification(`Отчет #${reportId}`, 'info');
            this.switchSection('admin');
        }
    }

    getSectionName(section) {
        const names = {
            'wifi': 'Wi-Fi',
            'security': 'Безопасность',
            'graffiti': 'Граффити',
            'contacts': 'Контакты',
            'admin': 'Админ-панель'
        };
        return names[section] || section;
    }

    setupBackButton() {
        if (!this.maxBridge?.BackButton) return;
        
        this.maxBridge.BackButton.show();
        this.maxBridge.BackButton.onClick(() => {
            console.log('🔙 Нажата кнопка назад');
            
            if (this.currentSection !== 'wifi') {
                this.switchSection('wifi');
                // Тактильная обратная связь
                this.hapticFeedback('light');
            } else {
                if (this.maxBridge.close) {
                    this.maxBridge.close();
                }
            }
        });
    }

    switchSection(section) {
        if (this.currentSection === section) return;
        
        this.currentSection = section;
        
        // Обновление активной навигации
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`)?.classList.add('active');
        
        // Показать нужную секцию
        document.querySelectorAll('.content-section').forEach(sec => {
            sec.classList.remove('active');
        });
        document.getElementById(`${section}-section`)?.classList.add('active');
        
        // Прокрутка вверх
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Тактильная обратная связь
        this.hapticFeedback('light');
        
        // Загрузка данных секции
        switch(section) {
            case 'wifi':
                this.loadWifiPoints();
                break;
            case 'security':
                this.resetSecurityForm();
                break;
            case 'graffiti':
                this.resetGraffitiForm();
                break;
            case 'admin':
                this.loadAdminDashboard();
                break;
        }
        
        console.log(`📍 Переключен раздел: ${section}`);
    }

    // ===== WI-FI ФУНКЦИОНАЛ =====
    async loadWifiPoints() {
        const loadingElement = document.getElementById('wifiLoading');
        const resultsElement = document.getElementById('wifiResults');
        
        if (loadingElement) loadingElement.classList.add('visible');
        if (resultsElement) resultsElement.innerHTML = '';
        
        try {
            // Загрузка точек из data.js
            const points = window.wifiPoints || [];
            
            // Отображение точек
            this.displayWifiPoints(points);
            
            // Заполнение выпадающего списка для отчетов
            this.populateWifiSelect();
            
            const wifiCountElement = document.getElementById('wifiCount');
            if (wifiCountElement) wifiCountElement.textContent = points.length;
            
            if (loadingElement) loadingElement.classList.remove('visible');
            
        } catch (error) {
            console.error('❌ Ошибка загрузки точек Wi-Fi:', error);
            if (resultsElement) {
                resultsElement.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-circle"></i>
                        <h4>Ошибка загрузки</h4>
                        <p>Не удалось загрузить точки Wi-Fi. Пожалуйста, попробуйте позже.</p>
                    </div>
                `;
            }
            if (loadingElement) loadingElement.classList.remove('visible');
        }
    }

    displayWifiPoints(points) {
        const container = document.getElementById('wifiResults');
        if (!container) return;
        
        if (points.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-wifi-slash"></i>
                    <h4>Точки Wi-Fi не найдены</h4>
                    <p>Попробуйте изменить параметры поиска</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = points.map(point => this.createWifiPointCard(point)).join('');
        
        // Добавление обработчиков кликов
        container.querySelectorAll('.wifi-result-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                if (points[index]) {
                    this.showWifiDetails(points[index]);
                }
            });
        });
    }

    createWifiPointCard(point) {
        const isFavorite = this.favoritePoints.has(point.id);
        const distance = point.distance ? this.formatDistance(point.distance) : '';
        
        return `
            <div class="wifi-result-item" data-id="${point.id}">
                <div class="wifi-result-header">
                    <div class="wifi-result-name">
                        ${this.getTypeEmoji(point.type)} ${point.name}
                    </div>
                    ${distance ? `<div class="wifi-result-distance">${distance}</div>` : ''}
                </div>
                ${point.address ? `<div class="wifi-result-address">${point.address}</div>` : ''}
                ${point.description ? `<div class="wifi-result-description">${point.description}</div>` : ''}
                <div class="wifi-result-actions">
                    <button class="btn" onclick="app.toggleFavorite(${point.id}, event)">
                        <i class="${isFavorite ? 'fas' : 'far'} fa-star"></i>
                        <span>${isFavorite ? 'В избранном' : 'В избранное'}</span>
                    </button>
                    <button class="btn btn-primary" onclick="app.showOnMap(${point.id}, event)">
                        <i class="fas fa-map-marked-alt"></i>
                        <span>На карте</span>
                    </button>
                    <button class="btn btn-secondary" onclick="app.buildRoute(${point.id}, event)">
                        <i class="fas fa-route"></i>
                        <span>Маршрут</span>
                    </button>
                </div>
            </div>
        `;
    }

    formatDistance(km) {
        if (km < 1) {
            return `${(km * 1000).toFixed(0)} м`;
        }
        return `${km.toFixed(1)} км`;
    }

    populateWifiSelect() {
        const select = document.getElementById('wifiProblemPoint');
        if (!select) return;
        
        // Сохраняем первый пустой option
        const firstOption = select.options[0];
        select.innerHTML = '';
        select.appendChild(firstOption);
        
        // Добавляем все точки
        window.wifiPoints?.forEach(point => {
            const option = document.createElement('option');
            option.value = point.id;
            option.textContent = `${point.name} - ${point.address}`;
            select.appendChild(option);
        });
    }

    async findNearbyWifi() {
        try {
            this.showNotification('Определяем ваше местоположение...', 'info');
            
            const position = await this.getCurrentPosition();
            this.currentLocation = position;
            
            // Показываем модалку подтверждения с картой
            this.showLocationConfirmation(position);
            
        } catch (error) {
            console.error('❌ Ошибка геолокации:', error);
            this.showNotification('Не удалось определить местоположение. Выберите точку на карте вручную.', 'error');
            
            // Предлагаем выбрать на карте
            this.openLocationPicker('wifi_search');
        }
    }

    showLocationConfirmation(position) {
        const modal = document.getElementById('confirmLocationModal');
        const overlay = document.getElementById('modalOverlay');
        
        if (!modal || !overlay) return;
        
        // Показываем модалку
        overlay.style.display = 'block';
        modal.style.display = 'block';
        
        // Инициализируем карту подтверждения
        this.initConfirmMap(position.coords.latitude, position.coords.longitude);
        
        // Обновляем информацию о местоположении
        document.getElementById('selectedCoordinates').textContent = 
            `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
        
        document.getElementById('locationAccuracy').textContent = 
            `Точность: ${position.coords.accuracy ? `${Math.round(position.coords.accuracy)} м` : 'неизвестно'}`;
    }

    initConfirmMap(lat, lon) {
        if (typeof ymaps === 'undefined') {
            console.warn('⚠️ Яндекс Карты не загружены');
            return;
        }
        
        ymaps.ready(() => {
            const mapContainer = document.getElementById('confirmMap');
            if (!mapContainer) return;
            
            // Очищаем контейнер
            mapContainer.innerHTML = '';
            
            // Создаем карту
            this.confirmMap = new ymaps.Map('confirmMap', {
                center: [lat, lon],
                zoom: 16,
                controls: ['zoomControl', 'fullscreenControl']
            }, {
                searchControlProvider: 'yandex#search'
            });
            
            // Создаем маркер
            this.confirmMarker = new ymaps.Placemark([lat, lon], {
                hintContent: 'Ваше местоположение',
                balloonContent: 'Ваше текущее местоположение'
            }, {
                preset: 'islands#blueCircleDotIcon',
                draggable: false
            });
            
            this.confirmMap.geoObjects.add(this.confirmMarker);
            
            // Добавляем круг точности если есть
            if (navigator.geolocation) {
                const accuracy = 50; // Примерная точность в метрах
                const accuracyCircle = new ymaps.Circle([
                    [lat, lon],
                    accuracy
                ], {}, {
                    fillColor: '#0066ff33',
                    strokeColor: '#0066ff',
                    strokeWidth: 2,
                    strokeOpacity: 0.5
                });
                
                this.confirmMap.geoObjects.add(accuracyCircle);
            }
        });
    }

    acceptLocation() {
        if (!this.currentLocation) return;
        
        // Закрываем модалку подтверждения
        this.closeConfirmModal();
        
        // Тактильная обратная связь
        this.hapticFeedback('success');
        
        // Поиск ближайших точек
        const nearestPoints = this.findNearestPoints(
            this.currentLocation.coords.latitude, 
            this.currentLocation.coords.longitude
        );
        
        this.displayWifiPoints(nearestPoints);
        
        this.showNotification(`Найдено ${nearestPoints.length} точек поблизости`, 'success');
    }

    closeConfirmModal() {
        const modal = document.getElementById('confirmLocationModal');
        const overlay = document.getElementById('modalOverlay');
        
        if (modal) modal.style.display = 'none';
        if (overlay) overlay.style.display = 'none';
        
        // Очищаем карту
        this.confirmMap = null;
        this.confirmMarker = null;
    }

    findNearestPoints(userLat, userLon, limit = 20) {
        const points = window.wifiPoints || [];
        
        // Добавляем расстояние до каждой точки
        const pointsWithDistance = points.map(point => {
            const distance = this.calculateDistance(
                userLat, userLon,
                point.coordinates.lat, point.coordinates.lon
            );
            return { ...point, distance };
        });
        
        // Сортируем по расстоянию
        pointsWithDistance.sort((a, b) => a.distance - b.distance);
        
        // Возвращаем ближайшие точки
        return pointsWithDistance.slice(0, limit);
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Радиус Земли в км
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    deg2rad(deg) {
        return deg * (Math.PI/180);
    }

    searchWifiPoints(query) {
        const clearBtn = document.getElementById('clearSearch');
        if (clearBtn) {
            clearBtn.style.display = query ? 'flex' : 'none';
        }
        
        const points = window.wifiPoints || [];
        
        if (!query.trim()) {
            this.displayWifiPoints(points);
            return;
        }
        
        const searchTerm = query.toLowerCase();
        const filtered = points.filter(point => 
            point.name.toLowerCase().includes(searchTerm) ||
            point.address?.toLowerCase().includes(searchTerm) ||
            point.description?.toLowerCase().includes(searchTerm)
        );
        
        this.displayWifiPoints(filtered);
        
        const wifiCountElement = document.getElementById('wifiCount');
        if (wifiCountElement) wifiCountElement.textContent = filtered.length;
    }

    filterWifiPoints(filter) {
        const points = window.wifiPoints || [];
        
        // Обновление активного фильтра
        document.querySelectorAll('.filter-tag').forEach(tag => {
            tag.classList.remove('active');
        });
        event?.target?.closest('.filter-tag')?.classList.add('active');
        
        if (filter === 'all') {
            this.displayWifiPoints(points);
            const wifiCountElement = document.getElementById('wifiCount');
            if (wifiCountElement) wifiCountElement.textContent = points.length;
            return;
        }
        
        const filtered = points.filter(point => point.type === filter);
        this.displayWifiPoints(filtered);
        
        const wifiCountElement = document.getElementById('wifiCount');
        if (wifiCountElement) wifiCountElement.textContent = filtered.length;
    }

    sortWifiPoints(criteria) {
        const container = document.getElementById('wifiResults');
        if (!container) return;
        
        const items = Array.from(container.querySelectorAll('.wifi-result-item'));
        
        items.sort((a, b) => {
            const aId = parseInt(a.dataset.id);
            const bId = parseInt(b.dataset.id);
            const aPoint = window.wifiPoints?.find(p => p.id === aId);
            const bPoint = window.wifiPoints?.find(p => p.id === bId);
            
            if (!aPoint || !bPoint) return 0;
            
            switch(criteria) {
                case 'distance':
                    return (aPoint.distance || 0) - (bPoint.distance || 0);
                case 'name':
                    return aPoint.name.localeCompare(bPoint.name);
                case 'type':
                    return aPoint.type.localeCompare(bPoint.type);
                default:
                    return 0;
            }
        });
        
        // Перестановка элементов
        container.innerHTML = '';
        items.forEach(item => container.appendChild(item));
    }

    showWifiDetails(point) {
        const container = document.getElementById('wifiDetails');
        if (!container) return;
        
        const isFavorite = this.favoritePoints.has(point.id);
        
        // Обновляем кнопку избранного
        const favoriteBtn = document.getElementById('toggleFavorite');
        if (favoriteBtn) {
            favoriteBtn.innerHTML = `<i class="${isFavorite ? 'fas' : 'far'} fa-star"></i>`;
            favoriteBtn.dataset.pointId = point.id;
        }
        
        container.innerHTML = `
            <div class="wifi-details-content">
                <div class="detail-item">
                    <div class="detail-label">
                        <i class="fas fa-wifi"></i>
                        <span>Название:</span>
                    </div>
                    <div class="detail-value">${point.name}</div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-label">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>Адрес:</span>
                    </div>
                    <div class="detail-value">${point.address || 'Не указан'}</div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-label">
                        <i class="fas fa-info-circle"></i>
                        <span>Описание:</span>
                    </div>
                    <div class="detail-value">${point.description || 'Нет описания'}</div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-label">
                        <i class="fas fa-map-pin"></i>
                        <span>Координаты:</span>
                    </div>
                    <div class="detail-value">
                        ${point.coordinates.lat.toFixed(6)}, ${point.coordinates.lon.toFixed(6)}
                    </div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-label">
                        <i class="fas fa-tag"></i>
                        <span>Тип:</span>
                    </div>
                    <div class="detail-value">${this.getTypeName(point.type)}</div>
                </div>
                
                <div class="detail-actions">
                    <button class="btn btn-primary btn-large" onclick="app.showOnMap(${point.id})">
                        <i class="fas fa-map-marked-alt"></i>
                        <span>Показать на карте</span>
                    </button>
                    <button class="btn btn-secondary btn-large" onclick="app.buildRoute(${point.id})">
                        <i class="fas fa-route"></i>
                        <span>Построить маршрут</span>
                    </button>
                </div>
            </div>
        `;
        
        // Тактильная обратная связь
        this.hapticFeedback('light');
    }

    toggleFavorite(pointId, event) {
        if (event) event.stopPropagation();
        
        if (this.favoritePoints.has(pointId)) {
            this.favoritePoints.delete(pointId);
            this.showNotification('Удалено из избранного', 'info');
        } else {
            this.favoritePoints.add(pointId);
            this.showNotification('Добавлено в избранное', 'success');
        }
        
        // Сохранение в SecureStorage если доступно, иначе в localStorage
        const favoritesData = JSON.stringify([...this.favoritePoints]);
        if (this.maxBridge?.SecureStorage) {
            this.maxBridge.SecureStorage.setItem('favoriteWifiPoints', favoritesData);
        } else {
            localStorage.setItem('favoriteWifiPoints', favoritesData);
        }
        
        // Тактильная обратная связь
        this.hapticFeedback('light');
        
        // Обновление UI
        const favoriteBtn = document.querySelector(`[data-id="${pointId}"] .btn`);
        if (favoriteBtn) {
            const icon = favoriteBtn.querySelector('i');
            if (icon) {
                icon.className = this.favoritePoints.has(pointId) ? 'fas fa-star' : 'far fa-star';
                const span = favoriteBtn.querySelector('span');
                if (span) {
                    span.textContent = this.favoritePoints.has(pointId) ? 'В избранном' : 'В избранное';
                }
            }
        }
        
        // Обновление кнопки в деталях
        const detailsFavoriteBtn = document.getElementById('toggleFavorite');
        if (detailsFavoriteBtn && detailsFavoriteBtn.dataset.pointId == pointId) {
            const icon = detailsFavoriteBtn.querySelector('i');
            if (icon) {
                icon.className = this.favoritePoints.has(pointId) ? 'fas fa-star' : 'far fa-star';
            }
        }
    }

    toggleCurrentFavorite() {
        const favoriteBtn = document.getElementById('toggleFavorite');
        if (favoriteBtn && favoriteBtn.dataset.pointId) {
            const pointId = parseInt(favoriteBtn.dataset.pointId);
            this.toggleFavorite(pointId);
        }
    }

    showOnMap(pointId, event) {
        if (event) event.stopPropagation();
        
        const point = window.wifiPoints?.find(p => p.id === pointId);
        if (!point) return;
        
        const url = `https://yandex.ru/maps/?pt=${point.coordinates.lon},${point.coordinates.lat}&z=17&l=map`;
        
        if (this.maxBridge?.openLink) {
            this.maxBridge.openLink(url);
        } else {
            window.open(url, '_blank');
        }
        
        // Тактильная обратная связь
        this.hapticFeedback('light');
    }

    buildRoute(pointId, event) {
        if (event) event.stopPropagation();
        
        const point = window.wifiPoints?.find(p => p.id === pointId);
        if (!point) return;
        
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const userLat = position.coords.latitude;
                const userLon = position.coords.longitude;
                const url = `https://yandex.ru/maps/?rtext=${userLat},${userLon}~${point.coordinates.lat},${point.coordinates.lon}&rtt=auto`;
                
                if (this.maxBridge?.openLink) {
                    this.maxBridge.openLink(url);
                } else {
                    window.open(url, '_blank');
                }
                
            }, () => {
                this.showOnMap(pointId);
            });
        } else {
            this.showOnMap(pointId);
        }
        
        // Тактильная обратная связь
        this.hapticFeedback('light');
    }

    async submitWifiProblem() {
        try {
            const pointId = document.getElementById('wifiProblemPoint')?.value;
            const description = document.getElementById('wifiProblemDesc')?.value.trim();
            
            if (!pointId) {
                this.showNotification('Выберите точку Wi-Fi', 'error');
                return;
            }
            
            if (!description) {
                this.showNotification('Введите описание проблемы', 'error');
                return;
            }
            
            const point = window.wifiPoints?.find(p => p.id == pointId);
            
            const reportData = {
                type: 'wifi_problem',
                pointId: pointId,
                pointName: point?.name || 'Неизвестная точка',
                description: description,
                userId: this.currentUser?.id || 'anonymous',
                userName: this.currentUser?.first_name || 'Аноним',
                timestamp: new Date().toISOString(),
                status: 'new'
            };
            
            // Сохранение в localStorage
            this.saveReportToStorage(reportData, 'wifi_problems');
            
            // Отправка email админу
            await this.sendEmailNotification(reportData, 'wifi');
            
            // Очистка формы
            const descInput = document.getElementById('wifiProblemDesc');
            const pointSelect = document.getElementById('wifiProblemPoint');
            if (descInput) descInput.value = '';
            if (pointSelect) pointSelect.selectedIndex = 0;
            
            // Тактильная обратная связь
            this.hapticFeedback('success');
            
            this.showNotification('Проблема с Wi-Fi отправлена! Спасибо за сообщение.', 'success');
            
        } catch (error) {
            console.error('❌ Ошибка отправки проблемы Wi-Fi:', error);
            this.showNotification('Ошибка отправки. Попробуйте позже.', 'error');
        }
    }

    async submitNewPoint() {
        try {
            const name = document.getElementById('newPointName')?.value.trim();
            const address = document.getElementById('newPointAddress')?.value.trim();
            const type = document.getElementById('newPointType')?.value;
            const description = document.getElementById('newPointDesc')?.value.trim();
            
            if (!name) {
                this.showNotification('Введите название точки', 'error');
                return;
            }
            
            if (!address) {
                this.showNotification('Введите адрес', 'error');
                return;
            }
            
            const suggestionData = {
                type: 'wifi_suggestion',
                name: name,
                address: address,
                pointType: type,
                description: description,
                userId: this.currentUser?.id || 'anonymous',
                userName: this.currentUser?.first_name || 'Аноним',
                timestamp: new Date().toISOString(),
                status: 'new'
            };
            
            // Сохранение в localStorage
            this.saveReportToStorage(suggestionData, 'wifi_suggestions');
            
            // Отправка email админу
            await this.sendEmailNotification(suggestionData, 'wifi_suggestion');
            
            // Очистка формы
            const nameInput = document.getElementById('newPointName');
            const addressInput = document.getElementById('newPointAddress');
            const typeSelect = document.getElementById('newPointType');
            const descInput = document.getElementById('newPointDesc');
            
            if (nameInput) nameInput.value = '';
            if (addressInput) addressInput.value = '';
            if (typeSelect) typeSelect.selectedIndex = 0;
            if (descInput) descInput.value = '';
            
            // Тактильная обратная связь
            this.hapticFeedback('success');
            
            this.showNotification('Предложение новой точки отправлено! Спасибо за помощь.', 'success');
            
        } catch (error) {
            console.error('❌ Ошибка отправки предложения:', error);
            this.showNotification('Ошибка отправки. Попробуйте позже.', 'error');
        }
    }

    // ===== БЕЗОПАСНОСТЬ ФУНКЦИОНАЛ =====
    resetSecurityForm() {
        this.securityReport = {
            step: 1,
            data: {}
        };
        this.mediaFiles = [];
        
        // Сброс степпера
        document.querySelectorAll('.step').forEach(step => {
            step.classList.remove('active');
        });
        document.querySelector('[data-step="1"]')?.classList.add('active');
        
        // Сброс шагов формы
        document.querySelectorAll('.form-step').forEach(step => {
            step.classList.remove('active');
        });
        document.querySelector('[data-step="1"]')?.classList.add('active');
        
        // Сброс кнопок
        const prevBtn = document.getElementById('prevStep');
        const nextBtn = document.getElementById('nextStep');
        const submitBtn = document.getElementById('submitSecurityReport');
        
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'flex';
        if (submitBtn) submitBtn.style.display = 'none';
        
        // Очистка полей
        const nameInput = document.getElementById('securityName');
        const phoneInput = document.getElementById('securityPhone');
        const addressInput = document.getElementById('manualAddress');
        const categorySelect = document.getElementById('securityCategory');
        const descInput = document.getElementById('securityDescription');
        const charCount = document.getElementById('charCount');
        
        if (nameInput) nameInput.value = '';
        if (phoneInput) phoneInput.value = '';
        if (addressInput) addressInput.value = '';
        if (categorySelect) categorySelect.selectedIndex = 0;
        if (descInput) descInput.value = '';
        if (charCount) charCount.textContent = '0';
        
        // Скрыть адресное поле
        const addressGroup = document.getElementById('addressInputGroup');
        if (addressGroup) addressGroup.style.display = 'none';
        
        // Очистка медиа
        this.updateMediaPreview();
    }

    nextSecurityStep() {
        const currentStep = this.securityReport.step;
        
        if (!this.validateSecurityStep(currentStep)) {
            return;
        }
        
        this.securityReport.step++;
        this.updateSecurityStepper();
        this.updateSecurityForm();
        
        // Тактильная обратная связь
        this.hapticFeedback('light');
    }

    prevSecurityStep() {
        if (this.securityReport.step > 1) {
            this.securityReport.step--;
            this.updateSecurityStepper();
            this.updateSecurityForm();
            
            // Тактильная обратная связь
            this.hapticFeedback('light');
        }
    }

    validateSecurityStep(step) {
        switch(step) {
            case 1:
                const name = document.getElementById('securityName')?.value.trim();
                const phone = document.getElementById('securityPhone')?.value.trim();
                
                if (!name) {
                    this.showNotification('Введите ваше имя', 'error');
                    return false;
                }
                
                if (!this.validatePhone(phone)) {
                    this.showNotification('Введите корректный номер телефона', 'error');
                    return false;
                }
                
                this.securityReport.data.name = name;
                this.securityReport.data.phone = phone;
                break;
                
            case 2:
                if (!this.securityReport.data.location && !this.securityReport.data.address) {
                    this.showNotification('Укажите местоположение', 'error');
                    return false;
                }
                break;
                
            case 3:
                const category = document.getElementById('securityCategory')?.value;
                const description = document.getElementById('securityDescription')?.value.trim();
                
                if (!category) {
                    this.showNotification('Выберите категорию', 'error');
                    return false;
                }
                
                if (description.length < 30) {
                    this.showNotification('Описание должно содержать минимум 30 символов', 'error');
                    return false;
                }
                
                this.securityReport.data.category = category;
                this.securityReport.data.description = description;
                break;
        }
        
        return true;
    }

    validatePhone(phone) {
        if (!phone) return false;
        const cleanPhone = phone.replace(/\s|-|\(|\)/g, '');
        const russianRegex = /^(\+7|7|8)?[489][0-9]{9}$/;
        return russianRegex.test(cleanPhone);
    }

    updateSecurityStepper() {
        document.querySelectorAll('.step').forEach(step => {
            step.classList.remove('active');
        });
        
        document.querySelectorAll('.form-step').forEach(step => {
            step.classList.remove('active');
        });
        
        const currentStep = document.querySelector(`[data-step="${this.securityReport.step}"]`);
        const currentFormStep = document.querySelector(`.form-step[data-step="${this.securityReport.step}"]`);
        
        if (currentStep) currentStep.classList.add('active');
        if (currentFormStep) currentFormStep.classList.add('active');
        
        // Обновление кнопок навигации
        const prevBtn = document.getElementById('prevStep');
        const nextBtn = document.getElementById('nextStep');
        const submitBtn = document.getElementById('submitSecurityReport');
        
        if (prevBtn) {
            prevBtn.style.display = this.securityReport.step > 1 ? 'flex' : 'none';
        }
        
        if (nextBtn) {
            nextBtn.style.display = this.securityReport.step < 4 ? 'flex' : 'none';
        }
        
        if (submitBtn) {
            submitBtn.style.display = this.securityReport.step === 4 ? 'flex' : 'none';
        }
    }

    updateSecurityForm() {
        // Обновление данных формы
        const nameInput = document.getElementById('securityName');
        const phoneInput = document.getElementById('securityPhone');
        const addressInput = document.getElementById('manualAddress');
        
        if (nameInput && this.securityReport.data.name) {
            nameInput.value = this.securityReport.data.name;
        }
        
        if (phoneInput && this.securityReport.data.phone) {
            phoneInput.value = this.securityReport.data.phone;
        }
        
        if (addressInput && this.securityReport.data.address) {
            addressInput.value = this.securityReport.data.address;
        }
    }

    async getCurrentLocation() {
        try {
            this.showNotification('Определяем ваше местоположение...', 'info');
            
            const position = await this.getCurrentPosition();
            this.securityReport.data.location = {
                lat: position.coords.latitude,
                lon: position.coords.longitude
            };
            this.securityReport.data.address = `Геолокация: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
            
            // Тактильная обратная связь
            this.hapticFeedback('success');
            
            this.showNotification('Местоположение получено', 'success');
            
            // Переход к следующему шагу
            if (this.securityReport.step === 2) {
                this.nextSecurityStep();
            }
        } catch (error) {
            console.error('❌ Ошибка геолокации:', error);
            this.showNotification('Не удалось определить местоположение. Укажите адрес вручную или выберите на карте.', 'error');
        }
    }

    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Геолокация не поддерживается'));
                return;
            }
            
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });
        });
    }

    showAddressInput() {
        const addressGroup = document.getElementById('addressInputGroup');
        const addressInput = document.getElementById('manualAddress');
        
        if (addressGroup) addressGroup.style.display = 'block';
        if (addressInput) {
            addressInput.focus();
            
            // Обработка ввода адреса
            const inputHandler = (e) => {
                this.securityReport.data.address = e.target.value;
                this.securityReport.data.location = null;
            };
            
            // Удаляем старые обработчики
            addressInput.removeEventListener('input', inputHandler);
            // Добавляем новый
            addressInput.addEventListener('input', inputHandler);
        }
    }

    async submitSecurityReport() {
        try {
            // Валидация последнего шага
            if (!this.validateSecurityStep(4)) {
                return;
            }
            
            // Сбор всех данных
            const reportData = {
                ...this.securityReport.data,
                userId: this.currentUser?.id || 'anonymous',
                userName: this.currentUser?.first_name || 'Аноним',
                mediaFiles: this.mediaFiles.length,
                timestamp: new Date().toISOString(),
                type: 'security',
                status: 'new'
            };
            
            // Сохранение в localStorage
            const reportId = this.saveReportToStorage(reportData, 'security');
            
            // Отправка email админу
            await this.sendEmailNotification(reportData, 'security');
            
            // Сброс формы
            this.resetSecurityForm();
            
            // Тактильная обратная связь
            this.hapticFeedback('success');
            
            this.showNotification(`Отчет #${reportId} отправлен! Спасибо за вашу бдительность.`, 'success');
            
        } catch (error) {
            console.error('❌ Ошибка отправки отчета:', error);
            this.showNotification('Ошибка отправки отчета. Попробуйте позже.', 'error');
        }
    }

    // ===== ГРАФФИТИ ФУНКЦИОНАЛ =====
    setGraffitiUrgency(urgency) {
        this.graffitiReport.urgency = urgency;
        
        // Обновление UI
        document.querySelectorAll('.urgency-option').forEach(option => {
            option.classList.remove('active');
        });
        
        const activeOption = document.querySelector(`[data-urgency="${urgency}"]`);
        if (activeOption) {
            activeOption.classList.add('active');
        }
        
        // Тактильная обратная связь
        this.hapticFeedback('selection');
    }

    handleGraffitiPhotos(files) {
        if (!files || files.length === 0) return;
        
        const maxFiles = 3;
        const remainingSlots = maxFiles - this.graffitiReport.photos.length;
        
        if (remainingSlots <= 0) {
            this.showNotification(`Максимум ${maxFiles} фотографии`, 'warning');
            return;
        }
        
        const filesToAdd = Array.from(files).slice(0, remainingSlots);
        
        filesToAdd.forEach(file => {
            if (file.size > 10 * 1024 * 1024) {
                this.showNotification(`Файл ${file.name} слишком большой (макс. 10 МБ)`, 'error');
                return;
            }
            
            if (!file.type.startsWith('image/')) {
                this.showNotification(`Файл ${file.name} не является изображением`, 'error');
                return;
            }
            
            this.graffitiReport.photos.push(file);
        });
        
        this.updateGraffitiPhotoPreview();
        
        // Тактильная обратная связь
        this.hapticFeedback('light');
    }

    updateGraffitiPhotoPreview() {
        const container = document.getElementById('graffitiUploadGrid');
        if (!container) return;
        
        const photosHTML = this.graffitiReport.photos.map((file, index) => `
            <div class="upload-cell photo-preview">
                <img src="${URL.createObjectURL(file)}" alt="Граффити фото ${index + 1}">
                <button class="btn-remove-media" onclick="app.removeGraffitiPhoto(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
        
        const addButton = this.graffitiReport.photos.length < 3 ? 
            `<div class="upload-cell add-photo" onclick="document.getElementById('graffitiPhotoInput').click()">
                <i class="fas fa-plus"></i>
                <span>Добавить фото</span>
            </div>` : '';
        
        container.innerHTML = photosHTML + addButton;
    }

    removeGraffitiPhoto(index) {
        this.graffitiReport.photos.splice(index, 1);
        this.updateGraffitiPhotoPreview();
        
        // Тактильная обратная связь
        this.hapticFeedback('light');
    }

    async submitGraffitiReport() {
        try {
            // Валидация
            const location = document.getElementById('graffitiLocation')?.value.trim();
            const description = document.getElementById('graffitiDescription')?.value.trim();
            
            if (!location) {
                this.showNotification('Укажите местоположение граффити', 'error');
                return;
            }
            
            if (!description) {
                this.showNotification('Добавьте описание граффити', 'error');
                return;
            }
            
            if (this.graffitiReport.photos.length === 0) {
                this.showNotification('Добавьте хотя бы одну фотографию', 'error');
                return;
            }
            
            // Сбор данных
            const reportData = {
                urgency: this.graffitiReport.urgency,
                location: location,
                description: description,
                photos: this.graffitiReport.photos.length,
                userId: this.currentUser?.id || 'anonymous',
                userName: this.currentUser?.first_name || 'Аноним',
                timestamp: new Date().toISOString(),
                type: 'graffiti',
                status: 'new'
            };
            
            // Сохранение в localStorage
            const reportId = this.saveReportToStorage(reportData, 'graffiti');
            
            // Отправка email админу
            await this.sendEmailNotification(reportData, 'graffiti');
            
            // Сброс формы
            this.resetGraffitiForm();
            
            // Тактильная обратная связь
            this.hapticFeedback('success');
            
            this.showNotification(`Отчет #${reportId} о граффити отправлен! Спасибо за помощь.`, 'success');
            
        } catch (error) {
            console.error('❌ Ошибка отправки отчета о граффити:', error);
            this.showNotification('Ошибка отправки отчета. Попробуйте позже.', 'error');
        }
    }

    resetGraffitiForm() {
        this.graffitiReport = {
            urgency: 'low',
            photos: []
        };
        
        const locationInput = document.getElementById('graffitiLocation');
        const descInput = document.getElementById('graffitiDescription');
        
        if (locationInput) locationInput.value = '';
        if (descInput) descInput.value = '';
        
        // Сброс UI
        document.querySelectorAll('.urgency-option').forEach(option => {
            option.classList.remove('active');
        });
        
        const lowOption = document.querySelector('[data-urgency="low"]');
        if (lowOption) lowOption.classList.add('active');
        
        this.updateGraffitiPhotoPreview();
    }

    // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====
    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationsContainer');
        if (!container) return;
        
        const id = Date.now();
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.id = `notification-${id}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <div class="notification-content">
                <div class="notification-title">${this.getNotificationTitle(type)}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close" onclick="document.getElementById('notification-${id}').remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(notification);
        
        // Автоматическое удаление через 5 секунд
        setTimeout(() => {
            const notif = document.getElementById(`notification-${id}`);
            if (notif) notif.remove();
        }, 5000);
    }

    getNotificationIcon(type) {
        switch(type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            default: return 'info-circle';
        }
    }

    getNotificationTitle(type) {
        switch(type) {
            case 'success': return 'Успешно!';
            case 'error': return 'Ошибка!';
            case 'warning': return 'Внимание!';
            default: return 'Информация';
        }
    }

    getTypeEmoji(type) {
        const emojis = {
            'здрав': '🏥',
            'образование': '🎓',
            'тц': '🛍️',
            'отдых': '🌳',
            'парки и скверы': '🌳',
            'транспорт': '🚌',
            'спорт': '⚽',
            'МФЦ': '🏢',
            'АЗС': '⛽',
            'гостиница': '🏨',
            'пляж': '🏖️',
            'турбаза': '⛺',
            'дома': '🏘️',
            'кафе': '🍴',
            'торговля': '🛒',
            '': '📍'
        };
        return emojis[type] || '📍';
    }

    getTypeName(type) {
        const names = {
            'здрав': 'Медицинские организации',
            'образование': 'Образовательные учреждения',
            'тц': 'Торговые центры и магазины',
            'отдых': 'Парки и места отдыха',
            'парки и скверы': 'Парки и скверы',
            'транспорт': 'Транспортные узлы',
            'спорт': 'Спортивные объекты',
            'МФЦ': 'Многофункциональные центры',
            'АЗС': 'Автозаправочные станции',
            'гостиница': 'Гостиницы',
            'пляж': 'Пляжи',
            'турбаза': 'Турбазы',
            'дома': 'Жилые комплексы',
            'кафе': 'Кафе и рестораны',
            'торговля': 'Магазины',
            '': 'Другое'
        };
        return names[type] || 'Другое';
    }

    saveReportToStorage(data, type) {
        try {
            const key = `${type}_reports`;
            let reports = JSON.parse(localStorage.getItem(key) || '[]');
            
            // Генерация ID
            const reportId = `RPT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
            data.id = reportId;
            
            reports.push(data);
            localStorage.setItem(key, JSON.stringify(reports));
            
            console.log(`📁 Отчет сохранен: ${type} #${reportId}`);
            return reportId;
        } catch (error) {
            console.error('❌ Ошибка сохранения отчета:', error);
            throw error;
        }
    }

    async sendEmailNotification(data, type) {
        if (window.EmailService) {
            try {
                const emailData = {
                    to: this.getAdminEmail(type),
                    subject: this.getEmailSubject(type, data),
                    html: this.generateEmailHtml(data, type)
                };
                
                await window.EmailService.sendEmail(emailData);
                console.log(`📧 Email отправлен для отчета ${type}`);
            } catch (error) {
                console.error('❌ Ошибка отправки email:', error);
            }
        }
    }

    getAdminEmail(type) {
        const defaultEmail = 'admin@sevastopol.ru';
        const storedEmail = localStorage.getItem(`${type}_admin_email`);
        return storedEmail || defaultEmail;
    }

    getEmailSubject(type, data) {
        const subjects = {
            security: `СРОЧНО: Сообщение о безопасности #${data.id}`,
            graffiti: `Граффити для удаления #${data.id}`,
            wifi: `Проблема с Wi-Fi: ${data.pointName || 'Unknown'}`,
            wifi_suggestion: `Предложение новой точки Wi-Fi: ${data.name || 'Unknown'}`
        };
        return subjects[type] || 'Новое обращение в Безопасный Севастополь';
    }

    generateEmailHtml(data, type) {
        const urgencyText = {
            'low': 'Низкая',
            'medium': 'Средняя',
            'high': 'Высокая'
        };
        
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #0066ff; border-bottom: 2px solid #0066ff; padding-bottom: 10px;">
                    Безопасный Севастополь - Новое обращение
                </h2>
                
                <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <p><strong>Тип обращения:</strong> ${type.toUpperCase()}</p>
                    <p><strong>ID обращения:</strong> ${data.id}</p>
                    <p><strong>Дата и время:</strong> ${new Date(data.timestamp).toLocaleString('ru-RU')}</p>
                </div>
                
                <div style="margin: 20px 0;">
                    <h3 style="color: #333;">Информация о пользователе</h3>
                    <p><strong>Пользователь:</strong> ${data.userName} (${data.userId})</p>
                    ${data.phone ? `<p><strong>Телефон:</strong> ${data.phone}</p>` : ''}
                </div>
                
                <div style="margin: 20px 0;">
                    <h3 style="color: #333;">Детали обращения</h3>
                    ${data.pointName ? `<p><strong>Точка Wi-Fi:</strong> ${data.pointName}</p>` : ''}
                    ${data.name ? `<p><strong>Название точки:</strong> ${data.name}</p>` : ''}
                    ${data.address ? `<p><strong>Адрес:</strong> ${data.address}</p>` : ''}
                    ${data.location ? `<p><strong>Местоположение:</strong> ${data.location.lat}, ${data.location.lon}</p>` : ''}
                    ${data.category ? `<p><strong>Категория:</strong> ${data.category}</p>` : ''}
                    ${data.urgency ? `<p><strong>Срочность:</strong> ${urgencyText[data.urgency] || data.urgency}</p>` : ''}
                    ${data.description ? `<p><strong>Описание:</strong> ${data.description}</p>` : ''}
                    ${data.mediaFiles ? `<p><strong>Медиафайлов:</strong> ${data.mediaFiles}</p>` : ''}
                    ${data.photos ? `<p><strong>Фотографий:</strong> ${data.photos}</p>` : ''}
                </div>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
                    <p>Для обработки перейдите в админ-панель "Безопасный Севастополь"</p>
                    <p>Это автоматическое уведомление, пожалуйста, не отвечайте на него.</p>
                </div>
            </div>
        `;
    }

    // ===== ТАКТИЛЬНАЯ ОБРАТНАЯ СВЯЗЬ =====
    hapticFeedback(type = 'light') {
        if (!this.maxBridge?.HapticFeedback) {
            console.log('📳 Вибрация:', type);
            return;
        }
        
        try {
            switch(type) {
                case 'success':
                    this.maxBridge.HapticFeedback.notificationOccurred('success');
                    break;
                case 'error':
                    this.maxBridge.HapticFeedback.notificationOccurred('error');
                    break;
                case 'warning':
                    this.maxBridge.HapticFeedback.notificationOccurred('warning');
                    break;
                case 'selection':
                    this.maxBridge.HapticFeedback.selectionChanged();
                    break;
                case 'light':
                    this.maxBridge.HapticFeedback.impactOccurred('light');
                    break;
                case 'medium':
                    this.maxBridge.HapticFeedback.impactOccurred('medium');
                    break;
                case 'heavy':
                    this.maxBridge.HapticFeedback.impactOccurred('heavy');
                    break;
                default:
                    this.maxBridge.HapticFeedback.impactOccurred('light');
            }
        } catch (error) {
            console.warn('⚠️ Ошибка тактильной обратной связи:', error);
        }
    }

    // ===== ЯНДЕКС КАРТЫ =====
    initYandexMaps() {
        if (typeof ymaps === 'undefined') {
            console.warn('⚠️ Яндекс Карты не загружены');
            return;
        }
        
        ymaps.ready(() => {
            console.log('✅ Яндекс Карты готовы');
        });
    }

    // ===== МОДАЛЬНЫЕ ОКНА =====
    openLocationPicker(context) {
        this.locationContext = context;
        this.selectedLocation = null;
        
        const modalOverlay = document.getElementById('modalOverlay');
        const modal = document.getElementById('locationModal');
        
        if (modalOverlay) modalOverlay.style.display = 'block';
        if (modal) modal.style.display = 'block';
        
        // Тактильная обратная связь
        this.hapticFeedback('medium');
        
        // Инициализация карты
        this.initLocationMap();
    }

    initLocationMap() {
        if (typeof ymaps === 'undefined') {
            console.warn('⚠️ Яндекс Карты не загружены');
            return;
        }
        
        ymaps.ready(() => {
            const mapContainer = document.getElementById('yandexMap');
            if (!mapContainer) return;
            
            // Очищаем контейнер
            mapContainer.innerHTML = '';
            
            // Создаем карту
            this.yandexMap = new ymaps.Map('yandexMap', {
                center: [44.6166, 33.5254], // Севастополь
                zoom: 12,
                controls: ['zoomControl', 'fullscreenControl']
            }, {
                searchControlProvider: 'yandex#search'
            });
            
            // Создаем маркер
            this.mapMarker = new ymaps.Placemark([44.6166, 33.5254], {
                hintContent: 'Выберите местоположение'
            }, {
                preset: 'islands#blueDotIcon',
                draggable: true
            });
            
            this.yandexMap.geoObjects.add(this.mapMarker);
            
            // Обработка перетаскивания маркера
            this.mapMarker.events.add('dragend', (e) => {
                const coords = this.mapMarker.geometry.getCoordinates();
                this.selectedLocation = {
                    lat: coords[0],
                    lon: coords[1]
                };
            });
            
            // Обработка клика по карте
            this.yandexMap.events.add('click', (e) => {
                const coords = e.get('coords');
                this.mapMarker.geometry.setCoordinates(coords);
                this.selectedLocation = {
                    lat: coords[0],
                    lon: coords[1]
                };
                
                // Тактильная обратная связь
                this.hapticFeedback('light');
            });
        });
    }

    confirmLocation() {
        if (this.selectedLocation) {
            let locationText = `${this.selectedLocation.lat.toFixed(6)}, ${this.selectedLocation.lon.toFixed(6)}`;
            
            if (this.locationContext === 'graffiti') {
                const graffitiLocation = document.getElementById('graffitiLocation');
                if (graffitiLocation) {
                    graffitiLocation.value = locationText;
                }
            } else if (this.locationContext === 'security') {
                this.securityReport.data.location = this.selectedLocation;
                this.securityReport.data.address = `Геолокация: ${locationText}`;
                
                const addressInput = document.getElementById('manualAddress');
                if (addressInput) {
                    addressInput.value = `Геолокация: ${locationText}`;
                }
                
                // Переход к следующему шагу если мы на шаге 2
                if (this.securityReport.step === 2) {
                    this.nextSecurityStep();
                }
            } else if (this.locationContext === 'wifi_search') {
                this.currentLocation = {
                    coords: {
                        latitude: this.selectedLocation.lat,
                        longitude: this.selectedLocation.lon,
                        accuracy: 50
                    }
                };
                
                // Поиск ближайших точек
                const nearestPoints = this.findNearestPoints(
                    this.selectedLocation.lat, 
                    this.selectedLocation.lon
                );
                
                this.displayWifiPoints(nearestPoints);
                
                this.showNotification(`Найдено ${nearestPoints.length} точек поблизости`, 'success');
            }
            
            this.closeModal();
            
            // Тактильная обратная связь
            this.hapticFeedback('success');
            
            this.showNotification('Местоположение выбрано', 'success');
        } else {
            this.showNotification('Выберите местоположение на карте', 'warning');
        }
    }

    closeModal() {
        const modalOverlay = document.getElementById('modalOverlay');
        const modals = document.querySelectorAll('.modal');
        
        if (modalOverlay) modalOverlay.style.display = 'none';
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
        
        // Очищаем карту
        this.yandexMap = null;
        this.mapMarker = null;
        this.selectedLocation = null;
        
        // Тактильная обратная связь
        this.hapticFeedback('light');
    }

    // ===== ДРАГ-ЭНД-ДРОП =====
    setupDragAndDrop() {
        const uploadArea = document.getElementById('mediaUploadArea');
        if (!uploadArea) return;
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.style.borderColor = 'var(--primary-color)';
                uploadArea.style.background = 'var(--bg-card-hover)';
            });
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.style.borderColor = '';
                uploadArea.style.background = '';
            });
        });
        
        uploadArea.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            this.handleMediaUpload(files);
            
            // Тактильная обратная связь
            this.hapticFeedback('success');
        });
    }

    handleMediaUpload(files) {
        if (!files || files.length === 0) return;
        
        const maxFiles = 5;
        const maxSize = 10 * 1024 * 1024;
        
        Array.from(files).slice(0, maxFiles - this.mediaFiles.length).forEach(file => {
            if (file.size > maxSize) {
                this.showNotification(`Файл ${file.name} слишком большой (>10MB)`, 'warning');
                return;
            }
            
            this.mediaFiles.push(file);
        });
        
        this.updateMediaPreview();
        
        // Тактильная обратная связь
        this.hapticFeedback('light');
    }

    updateMediaPreview() {
        const container = document.getElementById('mediaPreview');
        if (!container) return;
        
        container.innerHTML = this.mediaFiles.map((file, index) => `
            <div class="media-preview-item">
                ${file.type.startsWith('image/') 
                    ? `<img src="${URL.createObjectURL(file)}" alt="Превью ${index + 1}">`
                    : `<div class="video-preview"><i class="fas fa-video"></i></div>`
                }
                <button class="btn-remove-media" onclick="app.removeMediaFile(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }

    removeMediaFile(index) {
        this.mediaFiles.splice(index, 1);
        this.updateMediaPreview();
        
        // Тактильная обратная связь
        this.hapticFeedback('light');
    }

    // ===== ВАЛИДАЦИЯ ФОРМ =====
    setupFormValidation() {
        const phoneInput = document.getElementById('securityPhone');
        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                const value = e.target.value;
                const isValid = this.validatePhone(value);
                e.target.style.borderColor = isValid ? 'var(--success-color)' : 'var(--danger-color)';
            });
        }
    }

    // ===== АДМИН-ПАНЕЛЬ =====
    checkAdminStatus() {
        const adminIds = window.ADMIN_USER_IDS || ['13897373', '90334880', '555666777'];
        this.isAdmin = adminIds.includes(this.currentUser?.id?.toString());
        
        const adminNav = document.getElementById('adminNav');
        if (adminNav && this.isAdmin) {
            adminNav.style.display = 'block';
            console.log('👑 Пользователь является администратором');
        }
    }

    switchAdminTab(tab) {
        // Обновление активной вкладки
        document.querySelectorAll('.admin-tab').forEach(t => {
            t.classList.remove('active');
        });
        
        document.querySelectorAll('.admin-tab-content').forEach(c => {
            c.classList.remove('active');
        });
        
        const activeTab = document.querySelector(`[data-tab="${tab}"]`);
        const activeContent = document.getElementById(`admin-${tab}`);
        
        if (activeTab) activeTab.classList.add('active');
        if (activeContent) activeContent.classList.add('active');
        
        // Тактильная обратная связь
        this.hapticFeedback('light');
        
        // Загрузка данных для вкладки
        if (tab === 'dashboard') {
            this.loadAdminDashboard();
        }
    }

    async loadAdminDashboard() {
        try {
            const stats = await this.fetchAdminStats();
            
            // Обновление статистики
            const totalEl = document.getElementById('adminTotalReports');
            const pendingEl = document.getElementById('adminPendingReports');
            const completedEl = document.getElementById('adminCompletedReports');
            const usersEl = document.getElementById('adminActiveUsers');
            
            if (totalEl) totalEl.textContent = stats.total || 0;
            if (pendingEl) pendingEl.textContent = stats.pending || 0;
            if (completedEl) completedEl.textContent = stats.completed || 0;
            if (usersEl) usersEl.textContent = stats.activeUsers || 0;
            
            // Обновление графиков
            this.updateCharts(stats);
            
        } catch (error) {
            console.error('❌ Ошибка загрузки статистики:', error);
        }
    }

    async fetchAdminStats() {
        // Загрузка из localStorage
        const securityReports = JSON.parse(localStorage.getItem('security_reports') || '[]');
        const graffitiReports = JSON.parse(localStorage.getItem('graffiti_reports') || '[]');
        const wifiProblems = JSON.parse(localStorage.getItem('wifi_problems_reports') || '[]');
        const wifiSuggestions = JSON.parse(localStorage.getItem('wifi_suggestions_reports') || '[]');
        
        const total = securityReports.length + graffitiReports.length + wifiProblems.length + wifiSuggestions.length;
        const pending = [...securityReports, ...graffitiReports, ...wifiProblems, ...wifiSuggestions]
            .filter(r => r.status === 'new').length;
        const completed = [...securityReports, ...graffitiReports, ...wifiProblems, ...wifiSuggestions]
            .filter(r => r.status === 'resolved').length;
        
        return {
            total: total,
            pending: pending,
            completed: completed,
            activeUsers: 1, // В реальном приложении здесь будет запрос к API
            byCategory: {
                security: securityReports.length,
                graffiti: graffitiReports.length,
                wifi_problems: wifiProblems.length,
                wifi_suggestions: wifiSuggestions.length
            }
        };
    }

    updateCharts(stats) {
        if (window.Chart && stats) {
            const categoryCtx = document.getElementById('reportsChart');
            if (categoryCtx) {
                // Удаляем старый график если есть
                const oldChart = Chart.getChart(categoryCtx);
                if (oldChart) {
                    oldChart.destroy();
                }
                
                new Chart(categoryCtx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Безопасность', 'Граффити', 'Wi-Fi проблемы', 'Wi-Fi предложения'],
                        datasets: [{
                            data: [
                                stats.byCategory?.security || 0,
                                stats.byCategory?.graffiti || 0,
                                stats.byCategory?.wifi_problems || 0,
                                stats.byCategory?.wifi_suggestions || 0
                            ],
                            backgroundColor: ['#0066ff', '#ff9500', '#34c759', '#5856d6']
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    color: 'var(--text-secondary)',
                                    padding: 20
                                }
                            }
                        }
                    }
                });
            }
        }
    }

    // ===== ЭКСТРЕННЫЕ ВЫЗОВЫ =====
    makeEmergencyCall(number) {
        // Форматируем номер для телефона
        let formattedNumber = number;
        
        // Убираем все нецифровые символы
        formattedNumber = formattedNumber.replace(/\D/g, '');
        
        // Для коротких номеров (101, 102, 103, 112)
        if (formattedNumber.length <= 3) {
            formattedNumber = formattedNumber;
        } 
        // Для российских номеров без кода страны
        else if (formattedNumber.length === 10) {
            formattedNumber = `+7${formattedNumber}`;
        }
        // Для номеров начинающихся с 7 или 8
        else if (formattedNumber.startsWith('7')) {
            formattedNumber = `+${formattedNumber}`;
        } else if (formattedNumber.startsWith('8')) {
            formattedNumber = `+7${formattedNumber.substring(1)}`;
        }
        // Если уже начинается с +7
        else if (formattedNumber.startsWith('+7')) {
            // Оставляем как есть
        }
        
        const telUrl = `tel:${formattedNumber}`;
        console.log(`📞 Вызов номера: ${formattedNumber}`);
        
        // Используем MAX Bridge если доступно
        if (this.maxBridge?.openLink) {
            try {
                this.maxBridge.openLink(telUrl);
            } catch (error) {
                console.error('❌ Ошибка вызова:', error);
                this.showNotification(`Не удалось совершить вызов ${number}`, 'error');
            }
        } 
        // Иначе используем стандартный способ
        else {
            // Прямой вызов через tel: протокол
            const link = document.createElement('a');
            link.href = telUrl;
            link.style.display = 'none';
            document.body.appendChild(link);
            
            // Пытаемся сделать вызов
            try {
                link.click();
            } catch (error) {
                console.error('❌ Ошибка вызова:', error);
                this.showNotification(`Не удалось совершить вызов ${number}. Проверьте возможность совершения звонков.`, 'error');
            }
            
            setTimeout(() => {
                document.body.removeChild(link);
            }, 100);
        }
        
        // Тактильная обратная связь
        this.hapticFeedback('heavy');
        
        this.showNotification(`Вызов ${number}...`, 'info');
    }

    // ===== ПУБЛИЧНЫЕ МЕТОДЫ ДЛЯ HTML =====
    reportWifiProblem(pointId, event) {
        if (event) event.stopPropagation();
        
        this.switchSection('wifi');
        
        const point = window.wifiPoints?.find(p => p.id === pointId);
        if (point) {
            const select = document.getElementById('wifiProblemPoint');
            const descInput = document.getElementById('wifiProblemDesc');
            
            if (select) select.value = pointId;
            if (descInput) {
                descInput.focus();
                descInput.value = `Проблема с точкой Wi-Fi "${point.name}": `;
            }
            
            this.showNotification(`Готово для отчета о проблеме: ${point.name}`, 'info');
        }
        
        // Тактильная обратная связь
        this.hapticFeedback('medium');
    }
}

// Инициализация приложения
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new SafeSevastopol();
    window.app = app;
});

// Глобальные методы для вызова из HTML
window.appMethods = {
    toggleFavorite: (pointId, event) => window.app?.toggleFavorite(pointId, event),
    showOnMap: (pointId, event) => window.app?.showOnMap(pointId, event),
    reportWifiProblem: (pointId, event) => window.app?.reportWifiProblem(pointId, event),
    openInMaps: (pointId) => window.app?.openInMaps(pointId),
    buildRoute: (pointId) => window.app?.buildRoute(pointId),
    removeGraffitiPhoto: (index) => window.app?.removeGraffitiPhoto(index),
    removeMediaFile: (index) => window.app?.removeMediaFile(index)
};
