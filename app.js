// Безопасный Севастополь - Основное приложение (MAX Bridge версия)
class SafeSevastopol {
    constructor() {
        // Инициализация полей ДО использования maxBridge
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
        this.hasUnsavedChanges = false; // ДОБАВЬ для подтверждения закрытия
        this.startParam = null; // ДОБАВЬ для deep linking
        this.preventScroll = this.preventScroll.bind(this); 
        this.isModalOpen = false;       

        // Важно: инициализируем maxBridge ПОСЛЕ всех полей
        this.maxBridge = window.WebApp || null;
        
        // Загружаем стартовые параметры ИЗ maxBridge
        if (this.maxBridge?.initDataUnsafe?.start_param) {
            this.startParam = this.maxBridge.initDataUnsafe.start_param;
        }
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadUserData();
        this.loadWifiPoints();
        this.checkAdminStatus();
        this.setupFormValidation();
        this.setupDragAndDrop();
        this.setupScrollPrevention();
        
        this.showNotification('Добро пожаловать в Безопасный Севастополь!', 'success');
    }

    setupEventListeners() {
        // Навигация
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => this.switchSection(e.target.closest('.nav-item').dataset.section));
        });

        // Wi-Fi поиск
        document.getElementById('wifiSearch').addEventListener('input', (e) => this.searchWifiPoints(e.target.value));
        document.getElementById('findNearbyWifi').addEventListener('click', () => this.findNearbyWifi());
        document.getElementById('sortWifi').addEventListener('change', (e) => this.sortWifiPoints(e.target.value));

        // Фильтры Wi-Fi
        document.querySelectorAll('.filter-tag').forEach(tag => {
            tag.addEventListener('click', (e) => this.filterWifiPoints(e.target.closest('.filter-tag').dataset.filter));
        });

        // Избранное
        document.getElementById('toggleFavorite').addEventListener('click', () => this.toggleCurrentFavorite());

        // Форма безопасности
        document.getElementById('nextStep').addEventListener('click', () => this.nextSecurityStep());
        document.getElementById('prevStep').addEventListener('click', () => this.prevSecurityStep());
        document.getElementById('submitSecurityReport').addEventListener('click', () => this.submitSecurityReport());

        // Геолокация для безопасности
        document.getElementById('useCurrentLocation').addEventListener('click', () => this.getCurrentLocation());
        document.querySelectorAll('.location-option[data-type="address"]').forEach(btn => {
            btn.addEventListener('click', () => this.showAddressInput());
        });

        // Счетчик символов
        document.getElementById('securityDescription').addEventListener('input', (e) => {
            document.getElementById('charCount').textContent = e.target.value.length;
        });

        // Загрузка медиа
        document.getElementById('browseMedia').addEventListener('click', () => document.getElementById('mediaInput').click());
        document.getElementById('mediaInput').addEventListener('change', (e) => this.handleMediaUpload(e.target.files));

        // Граффити
        document.querySelectorAll('.urgency-option').forEach(option => {
            option.addEventListener('click', (e) => this.setGraffitiUrgency(e.target.closest('.urgency-option').dataset.urgency));
        });

        document.getElementById('selectGraffitiLocation').addEventListener('click', () => this.openLocationPicker('graffiti'));
        document.getElementById('addGraffitiPhoto').addEventListener('click', () => document.getElementById('graffitiPhotoInput').click());
        document.getElementById('graffitiPhotoInput').addEventListener('change', (e) => this.handleGraffitiPhotos(e.target.files));
        document.getElementById('submitGraffitiReport').addEventListener('click', () => this.submitGraffitiReport());

        // Wi-Fi проблемы и предложения
        document.getElementById('submitWifiProblem').addEventListener('click', () => this.submitWifiProblem());
        document.getElementById('submitNewPoint').addEventListener('click', () => this.submitNewPoint());

        // Экстренные вызовы
        document.querySelectorAll('.btn-call').forEach(btn => {
            btn.addEventListener('click', (e) => this.makeEmergencyCall(e.target.closest('.btn-call').dataset.number));
        });

        // Админ-панель
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchAdminTab(e.target.closest('.admin-tab').dataset.tab));
        });

        // Модальные окна
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });

        document.getElementById('modalOverlay').addEventListener('click', () => this.closeModal());
        document.getElementById('cancelLocation').addEventListener('click', () => this.closeModal());
        document.getElementById('confirmLocation').addEventListener('click', () => this.confirmLocation());
    }

async loadUserData() {
    try {
        // ===== ВАЖНО: Сначала сообщаем MAX, что приложение готово =====
        if (this.maxBridge) {
            // ✅ Критически важно: ready() ДО любых других действий
            this.maxBridge.ready();
            
            // Настройка кнопки "Назад"
            this.setupBackButton();
            
            // Включаем подтверждение при закрытии
            this.maxBridge.enableClosingConfirmation();
        }
        
        // ===== БЕЗОПАСНАЯ загрузка данных пользователя =====
        let userData = null;
        
        // Пытаемся получить из MAX Bridge
        if (this.maxBridge?.initDataUnsafe?.user) {
            const bridgeUser = this.maxBridge.initDataUnsafe.user;
            
            // ✅ Безопасно копируем только нужные поля
            userData = {
                id: String(bridgeUser.id || 'anonymous'),
                first_name: bridgeUser.first_name || 'Пользователь',
                last_name: bridgeUser.last_name || '',
                username: bridgeUser.username || '',
                language_code: bridgeUser.language_code || 'ru'
            };
            
            console.log('Пользователь из MAX Bridge:', userData.id);
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
            console.log('Используем демо-режим');
        }
        
        this.currentUser = userData;
        
        // ===== Обновление UI =====
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = this.currentUser.first_name || 'Гость';
        }
        
        // ===== Загрузка избранных точек =====
        try {
            if (this.maxBridge?.SecureStorage) {
                const favorites = await this.maxBridge.SecureStorage.getItem('favoriteWifiPoints');
                if (favorites) {
                    this.favoritePoints = new Set(JSON.parse(favorites));
                    console.log('Избранное загружено из SecureStorage:', this.favoritePoints.size);
                }
            } else {
                const favorites = localStorage.getItem('favoriteWifiPoints');
                if (favorites) {
                    this.favoritePoints = new Set(JSON.parse(favorites));
                    console.log('Избранное загружено из localStorage:', this.favoritePoints.size);
                }
            }
        } catch (storageError) {
            console.warn('Ошибка загрузки избранного:', storageError);
        }
        
        // ===== Проверка прав админа =====
        this.checkAdminStatus();
        
        // ===== Обработка deep link параметров =====
        if (this.startParam) {
            this.handleStartParam(this.startParam);
        }
        
    } catch (error) {
        console.error('Критическая ошибка загрузки данных пользователя:', error);
        // Аварийный fallback
        this.currentUser = { 
            id: 'anonymous', 
            first_name: 'Гость',
            language_code: 'ru'
        };
        
        // Все равно обновляем UI
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = 'Гость';
        }
    }
}

    // ===== ОБРАБОТКА DEEP LINK ПАРАМЕТРОВ =====
    handleStartParam(param) {
        if (!param) return;
        
        console.log('Обработка стартового параметра:', param);
        
        // Примеры параметров:
        // startapp=wifi - открыть раздел Wi-Fi
        // startapp=security - открыть раздел Безопасность
        // startapp=report_123 - открыть отчет #123
        
        const sections = ['wifi', 'security', 'graffiti', 'contacts', 'admin'];
        
        if (sections.includes(param)) {
            this.switchSection(param);
            this.showNotification(`Открыт раздел: ${param}`, 'info');
        } else if (param.startsWith('report_')) {
            const reportId = param.replace('report_', '');
            // В будущем можно реализовать открытие конкретного отчета
            this.showNotification(`Отчет #${reportId}`, 'info');
            this.switchSection('admin');
        }
    }

    setupBackButton() {
        if (!this.maxBridge || !this.maxBridge.BackButton) return;
        
        this.maxBridge.BackButton.show();
        this.maxBridge.BackButton.onClick(() => {
            if (this.currentSection !== 'wifi') {
                this.switchSection('wifi');
                this.maxBridge.HapticFeedback?.impactOccurred('light');
            } else {
                this.maxBridge.close();
            }
        });
    }

    switchSection(section) {
        this.currentSection = section;
        
        // Обновление активной навигации
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');
        
        // Показать нужную секцию
        document.querySelectorAll('.content-section').forEach(sec => {
            sec.classList.remove('active');
        });
        document.getElementById(`${section}-section`).classList.add('active');
        
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
    }

    // ===== WI-FI ФУНКЦИОНАЛ =====
    async loadWifiPoints() {
        const loadingElement = document.getElementById('wifiLoading');
        const resultsElement = document.getElementById('wifiResults');
        
        loadingElement.classList.add('visible');
        resultsElement.innerHTML = '';
        
        try {
            // Загрузка точек из data.js
            const points = window.wifiPoints || [];
            
            // Отображение точек
            this.displayWifiPoints(points);
            
            // Заполнение выпадающего списка для отчетов
            this.populateWifiSelect();
            
            document.getElementById('wifiCount').textContent = points.length;
            loadingElement.classList.remove('visible');
            
        } catch (error) {
            console.error('Ошибка загрузки точек Wi-Fi:', error);
            resultsElement.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Не удалось загрузить точки Wi-Fi. Пожалуйста, попробуйте позже.</p>
                </div>
            `;
            loadingElement.classList.remove('visible');
        }
    }

    displayWifiPoints(points) {
        const container = document.getElementById('wifiResults');
        
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
            item.addEventListener('click', () => this.showWifiDetails(points[index]));
        });
    }

    createWifiPointCard(point) {
        const isFavorite = this.favoritePoints.has(point.id);
        const distance = point.distance ? `${point.distance.toFixed(2)} км` : '';
        
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
                    <button class="btn-favorite ${isFavorite ? 'active' : ''}" onclick="app.toggleFavorite(${point.id}, event)">
                        <i class="fas fa-star"></i>
                    </button>
                    <button class="btn-map" onclick="app.showOnMap(${point.id}, event)">
                        <i class="fas fa-map-marked-alt"></i>
                    </button>
                    <button class="btn-report" onclick="app.reportWifiProblem(${point.id}, event)">
                        <i class="fas fa-exclamation-circle"></i>
                    </button>
                </div>
            </div>
        `;
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
            const position = await this.getCurrentPosition();
            this.currentLocation = position;
            
            // Тактильная обратная связь
            this.hapticFeedback('medium');
            
            // Поиск ближайших точек
            const nearestPoints = this.findNearestPoints(position.coords.latitude, position.coords.longitude);
            this.displayWifiPoints(nearestPoints);
            
            this.showNotification(`Найдено ${nearestPoints.length} точек поблизости`, 'success');
            
        } catch (error) {
            console.error('Ошибка геолокации:', error);
            this.showNotification('Не удалось определить местоположение', 'error');
            
            // Показать все точки как fallback
            this.loadWifiPoints();
        }
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
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    toRad(degrees) {
        return degrees * Math.PI / 180;
    }

    searchWifiPoints(query) {
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
        document.getElementById('wifiCount').textContent = filtered.length;
    }

    filterWifiPoints(filter) {
        const points = window.wifiPoints || [];
        
        // Обновление активного фильтра
        document.querySelectorAll('.filter-tag').forEach(tag => {
            tag.classList.remove('active');
        });
        event.target.closest('.filter-tag').classList.add('active');
        
        if (filter === 'all') {
            this.displayWifiPoints(points);
            document.getElementById('wifiCount').textContent = points.length;
            return;
        }
        
        const filtered = points.filter(point => point.type === filter);
        this.displayWifiPoints(filtered);
        document.getElementById('wifiCount').textContent = filtered.length;
    }

    sortWifiPoints(criteria) {
        const container = document.getElementById('wifiResults');
        const items = Array.from(container.querySelectorAll('.wifi-result-item'));
        
        items.sort((a, b) => {
            const aData = a.dataset;
            const bData = b.dataset;
            
            switch(criteria) {
                case 'distance':
                    return parseFloat(aData.distance || 0) - parseFloat(bData.distance || 0);
                case 'name':
                    return a.dataset.name?.localeCompare(b.dataset.name || '');
                case 'type':
                    return a.dataset.type?.localeCompare(b.dataset.type || '');
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
        const isFavorite = this.favoritePoints.has(point.id);
        
        // Обновляем кнопку избранного
        const favoriteBtn = document.getElementById('toggleFavorite');
        favoriteBtn.innerHTML = isFavorite ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';
        favoriteBtn.classList.toggle('active', isFavorite);
        favoriteBtn.dataset.pointId = point.id;
        
        container.innerHTML = `
            <div class="wifi-detail-card">
                <div class="detail-header">
                    <h4>${this.getTypeEmoji(point.type)} ${point.name}</h4>
                </div>
                
                ${point.address ? `
                <div class="detail-item">
                    <div class="detail-label">📍 Адрес:</div>
                    <div>${point.address}</div>
                </div>
                ` : ''}
                
                <div class="detail-item">
                    <div class="detail-label">📝 Описание:</div>
                    <div>${point.description || 'Нет описания'}</div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-label">📌 Координаты:</div>
                    <div>${point.coordinates.lat.toFixed(6)}, ${point.coordinates.lon.toFixed(6)}</div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-label">🏷️ Тип:</div>
                    <div>${this.getTypeName(point.type)}</div>
                </div>
                
                <div class="detail-actions">
                    <button class="btn-action primary" onclick="app.openInMaps(${point.id})">
                        <i class="fas fa-map-marked-alt"></i>
                        <span>На карте</span>
                    </button>
                    <button class="btn-action secondary" onclick="app.buildRoute(${point.id})">
                        <i class="fas fa-route"></i>
                        <span>Маршрут</span>
                    </button>
                    <button class="btn-action accent" onclick="app.reportWifiProblem(${point.id})">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>Проблема</span>
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
        if (this.maxBridge && this.maxBridge.SecureStorage) {
            this.maxBridge.SecureStorage.setItem('favoriteWifiPoints', favoritesData);
        } else {
            localStorage.setItem('favoriteWifiPoints', favoritesData);
        }
        
        // Тактильная обратная связь
        this.hapticFeedback('light');
        
        // Обновление UI
        const favoriteBtn = document.querySelector(`[data-id="${pointId}"] .btn-favorite`);
        if (favoriteBtn) {
            favoriteBtn.classList.toggle('active');
            favoriteBtn.innerHTML = this.favoritePoints.has(pointId) ? 
                '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';
        }
        
        // Обновление кнопки в деталях
        const detailsFavoriteBtn = document.getElementById('toggleFavorite');
        if (detailsFavoriteBtn && detailsFavoriteBtn.dataset.pointId == pointId) {
            detailsFavoriteBtn.innerHTML = this.favoritePoints.has(pointId) ? 
                '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';
            detailsFavoriteBtn.classList.toggle('active', this.favoritePoints.has(pointId));
        }
    }

    toggleCurrentFavorite() {
        const pointId = document.getElementById('toggleFavorite').dataset.pointId;
        if (pointId) {
            this.toggleFavorite(parseInt(pointId));
        }
    }

    openInMaps(pointId) {
        const point = window.wifiPoints?.find(p => p.id === pointId);
        if (!point) return;
        
        const url = `https://yandex.ru/maps/?pt=${point.coordinates.lon},${point.coordinates.lat}&z=17&l=map`;
        
        if (this.maxBridge && this.maxBridge.openLink) {
            this.maxBridge.openLink(url);
        } else {
            window.open(url, '_blank');
        }
    }

    buildRoute(pointId) {
        const point = window.wifiPoints?.find(p => p.id === pointId);
        if (!point) return;
        
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const userLat = position.coords.latitude;
                const userLon = position.coords.longitude;
                const url = `https://yandex.ru/maps/?rtext=${userLat},${userLon}~${point.coordinates.lat},${point.coordinates.lon}&rtt=auto`;
                
                if (this.maxBridge && this.maxBridge.openLink) {
                    this.maxBridge.openLink(url);
                } else {
                    window.open(url, '_blank');
                }
                
            }, () => {
                this.openInMaps(pointId);
            });
        } else {
            this.openInMaps(pointId);
        }
    }

    async submitWifiProblem() {
        try {
            const pointId = document.getElementById('wifiProblemPoint').value;
            const description = document.getElementById('wifiProblemDesc').value.trim();
            
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
            document.getElementById('wifiProblemDesc').value = '';
            document.getElementById('wifiProblemPoint').selectedIndex = 0;
            
            // Тактильная обратная связь
            this.hapticFeedback('success');
            
            this.showNotification('Проблема с Wi-Fi отправлена! Спасибо за сообщение.', 'success');
            
        } catch (error) {
            console.error('Ошибка отправки проблемы Wi-Fi:', error);
            this.showNotification('Ошибка отправки. Попробуйте позже.', 'error');
        }
    }

    async submitNewPoint() {
        try {
            const name = document.getElementById('newPointName').value.trim();
            const address = document.getElementById('newPointAddress').value.trim();
            const type = document.getElementById('newPointType').value;
            const description = document.getElementById('newPointDesc').value.trim();
            
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
            document.getElementById('newPointName').value = '';
            document.getElementById('newPointAddress').value = '';
            document.getElementById('newPointType').selectedIndex = 0;
            document.getElementById('newPointDesc').value = '';
            
            // Тактильная обратная связь
            this.hapticFeedback('success');
            
            this.showNotification('Предложение новой точки отправлено! Спасибо за помощь.', 'success');
            
        } catch (error) {
            console.error('Ошибка отправки предложения:', error);
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
        document.querySelector('[data-step="1"]').classList.add('active');
        
        // Сброс шагов формы
        document.querySelectorAll('.form-step').forEach(step => {
            step.classList.remove('active');
        });
        document.querySelector('[data-step="1"]').classList.add('active');
        
        // Сброс кнопок
        document.getElementById('prevStep').style.display = 'none';
        document.getElementById('nextStep').style.display = 'flex';
        document.getElementById('submitSecurityReport').style.display = 'none';
        
        // Очистка полей
        document.getElementById('securityName').value = '';
        document.getElementById('securityPhone').value = '';
        document.getElementById('manualAddress').value = '';
        document.getElementById('securityCategory').selectedIndex = 0;
        document.getElementById('securityDescription').value = '';
        document.getElementById('charCount').textContent = '0';
        
        // Скрыть адресное поле
        document.getElementById('addressInputGroup').style.display = 'none';
        
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
                const name = document.getElementById('securityName').value.trim();
                const phone = document.getElementById('securityPhone').value.trim();
                
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
                const category = document.getElementById('securityCategory').value;
                const description = document.getElementById('securityDescription').value.trim();
                
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

    updateSecurityStepper() {
        document.querySelectorAll('.step').forEach(step => {
            step.classList.remove('active');
        });
        
        document.querySelectorAll('.form-step').forEach(step => {
            step.classList.remove('active');
        });
        
        document.querySelector(`[data-step="${this.securityReport.step}"]`).classList.add('active');
        document.querySelector(`.form-step[data-step="${this.securityReport.step}"]`).classList.add('active');
        
        // Обновление кнопок навигации
        document.getElementById('prevStep').style.display = this.securityReport.step > 1 ? 'flex' : 'none';
        document.getElementById('nextStep').style.display = this.securityReport.step < 4 ? 'flex' : 'none';
        document.getElementById('submitSecurityReport').style.display = this.securityReport.step === 4 ? 'flex' : 'none';
    }

    updateSecurityForm() {
        // Обновление данных формы
        if (this.securityReport.data.name) {
            document.getElementById('securityName').value = this.securityReport.data.name;
        }
        if (this.securityReport.data.phone) {
            document.getElementById('securityPhone').value = this.securityReport.data.phone;
        }
        if (this.securityReport.data.address) {
            document.getElementById('manualAddress').value = this.securityReport.data.address;
        }
    }

    async getCurrentLocation() {
        try {
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
            console.error('Ошибка геолокации:', error);
            this.showNotification('Не удалось определить местоположение. Укажите адрес вручную.', 'error');
            this.showAddressInput();
        }
    }

    showAddressInput() {
        document.getElementById('addressInputGroup').style.display = 'block';
        document.getElementById('manualAddress').focus();
        
        // Обработка ввода адреса
        document.getElementById('manualAddress').addEventListener('input', (e) => {
            this.securityReport.data.address = e.target.value;
            this.securityReport.data.location = null;
        });
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
                mediaFiles: this.mediaFiles,
                timestamp: new Date().toISOString(),
                type: 'security',
                status: 'new'
            };
            
            // Сохранение в localStorage
            this.saveReportToStorage(reportData, 'security');
            
            // Отправка email админу
            await this.sendEmailNotification(reportData, 'security');
            
            // Сброс формы
            this.resetSecurityForm();
            
            // Тактильная обратная связь
            this.hapticFeedback('success');
            
            this.showNotification('Отчет отправлен! Спасибо за вашу бдительность.', 'success');
            
        } catch (error) {
            console.error('Ошибка отправки отчета:', error);
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
        event.target.closest('.urgency-option').classList.add('active');
        
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
                this.showNotification(`Файл ${file.name} слишком большой`, 'error');
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
            const location = document.getElementById('graffitiLocation').value.trim();
            const description = document.getElementById('graffitiDescription').value.trim();
            
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
                photos: this.graffitiReport.photos,
                userId: this.currentUser?.id || 'anonymous',
                userName: this.currentUser?.first_name || 'Аноним',
                timestamp: new Date().toISOString(),
                type: 'graffiti',
                status: 'new'
            };
            
            // Сохранение в localStorage
            this.saveReportToStorage(reportData, 'graffiti');
            
            // Отправка email админу
            await this.sendEmailNotification(reportData, 'graffiti');
            
            // Сброс формы
            this.resetGraffitiForm();
            
            // Тактильная обратная связь
            this.hapticFeedback('success');
            
            this.showNotification('Отчет о граффити отправлен! Спасибо за помощь.', 'success');
            
        } catch (error) {
            console.error('Ошибка отправки отчета о граффити:', error);
            this.showNotification('Ошибка отправки отчета. Попробуйте позже.', 'error');
        }
    }

    resetGraffitiForm() {
        this.graffitiReport = {
            urgency: 'low',
            photos: []
        };
        
        document.getElementById('graffitiLocation').value = '';
        document.getElementById('graffitiDescription').value = '';
        
        // Сброс UI
        document.querySelectorAll('.urgency-option').forEach(option => {
            option.classList.remove('active');
        });
        document.querySelector('[data-urgency="low"]').classList.add('active');
        
        this.updateGraffitiPhotoPreview();
    }

    // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====
    async getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Геолокация не поддерживается'));
                return;
            }
            
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            });
        });
    }

    validatePhone(phone) {
        const phoneRegex = /^(\+7|7|8)?[489][0-9]{9}$/;
        const cleanPhone = phone.replace(/\s|-|\(|\)/g, '');
        return phoneRegex.test(cleanPhone);
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationsContainer');
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
            'образование': 'Школы, ВУЗы, юношеские клубы',
            'тц': 'Торговые центры, рынки, магазины',
            'отдых': 'Развлечения, достопримечательности',
            'парки и скверы': 'Парки и скверы',
            'транспорт': 'Остановки',
            'спорт': 'Спорт',
            'МФЦ': 'МФЦ',
            'АЗС': 'АЗС',
            'гостиница': 'Гостиницы',
            'пляж': 'Пляжи',
            'турбаза': 'Турбазы',
            'дома': 'Жилые комплексы',
            'кафе': 'Кафе',
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
            data.id = `RPT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
            
            reports.push(data);
            localStorage.setItem(key, JSON.stringify(reports));
            
            return data.id;
        } catch (error) {
            console.error('Ошибка сохранения отчета:', error);
            throw error;
        }
    }

    async sendEmailNotification(data, type) {
        if (window.EmailService) {
            try {
                const emailData = {
                    to: this.getAdminEmail(type),
                    subject: this.getEmailSubject(type, data),
                    html: this.generateEmailHtml(data, type),
                    attachments: []
                };
                
                await window.EmailService.sendEmail(emailData);
                console.log(`Email отправлен для отчета ${type}`);
            } catch (error) {
                console.error('Ошибка отправки email:', error);
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
            security: `СРОЧНО: Сообщение о безопасности #${data.id || 'NEW'}`,
            graffiti: `Граффити для удаления #${data.id || 'NEW'}`,
            wifi: `Проблема с Wi-Fi: ${data.pointName || 'Unknown'}`,
            wifi_suggestion: `Предложение новой точки Wi-Fi: ${data.name || 'Unknown'}`
        };
        return subjects[type] || 'Новое обращение в Безопасный Севастополь';
    }

    generateEmailHtml(data, type) {
        return `
            <h2>Новое обращение в Безопасный Севастополь</h2>
            <p><strong>Тип:</strong> ${type}</p>
            <p><strong>ID:</strong> ${data.id}</p>
            <p><strong>Время:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
            <p><strong>Пользователь:</strong> ${data.userName} (${data.userId})</p>
            ${data.phone ? `<p><strong>Телефон:</strong> ${data.phone}</p>` : ''}
            ${data.location ? `<p><strong>Местоположение:</strong> ${data.location.lat}, ${data.location.lon}</p>` : ''}
            ${data.address ? `<p><strong>Адрес:</strong> ${data.address}</p>` : ''}
            <p><strong>Описание:</strong> ${data.description || 'Нет описания'}</p>
            ${data.category ? `<p><strong>Категория:</strong> ${data.category}</p>` : ''}
            ${data.urgency ? `<p><strong>Срочность:</strong> ${data.urgency}</p>` : ''}
            ${data.pointName ? `<p><strong>Точка Wi-Fi:</strong> ${data.pointName}</p>` : ''}
            ${data.name ? `<p><strong>Название точки:</strong> ${data.name}</p>` : ''}
            ${data.pointType ? `<p><strong>Тип точки:</strong> ${data.pointType}</p>` : ''}
            <hr>
            <p>Для обработки перейдите в админ-панель Безопасный Севастополь</p>
        `;
    }

    // ===== ТАКТИЛЬНАЯ ОБРАТНАЯ СВЯЗЬ =====
    hapticFeedback(type = 'light') {
        // Проверяем доступность
        if (!this.maxBridge?.HapticFeedback) {
            console.warn('HapticFeedback недоступен');
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
                case 'rigid':
                    this.maxBridge.HapticFeedback.impactOccurred('rigid');
                    break;
                case 'soft':
                    this.maxBridge.HapticFeedback.impactOccurred('soft');
                    break;
                default:
                    this.maxBridge.HapticFeedback.impactOccurred('light');
            }
        } catch (error) {
            console.warn('Ошибка тактильной обратной связи:', error);
        }
    }

    // ===== МОДАЛЬНЫЕ ОКНА =====
    openLocationPicker(context) {
        this.locationContext = context;
        this.isModalOpen = true;
        
        // Блокируем скролл
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
        
        document.getElementById('modalOverlay').style.display = 'block';
        document.getElementById('locationModal').style.display = 'block';
        
        // Тактильная обратная связь
        this.hapticFeedback('medium');
        
        // Инициализация карты
        this.initLocationPickerMap();
    }

    initLocationPickerMap() {
        const mapElement = document.getElementById('locationPickerMap');
        if (!mapElement || this.locationMap) return;
        
        this.locationMap = L.map('locationPickerMap').setView([44.6166, 33.5254], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.locationMap);
        
        // Маркер для выбора местоположения
        this.locationMarker = L.marker([44.6166, 33.5254], { draggable: true }).addTo(this.locationMap);
        
        this.locationMarker.on('dragend', () => {
            const position = this.locationMarker.getLatLng();
            this.selectedLocation = {
                lat: position.lat,
                lon: position.lng
            };
        });
        
        this.locationMap.on('click', (e) => {
            this.locationMarker.setLatLng(e.latlng);
            this.selectedLocation = {
                lat: e.latlng.lat,
                lon: e.latlng.lng
            };
            
            // Тактильная обратная связь
            this.hapticFeedback('light');
        });
    }

    confirmLocation() {
        if (this.selectedLocation) {
            if (this.locationContext === 'graffiti') {
                document.getElementById('graffitiLocation').value = 
                    `Геолокация: ${this.selectedLocation.lat.toFixed(6)}, ${this.selectedLocation.lon.toFixed(6)}`;
            }
            this.closeModal();
            
            // Тактильная обратная связь
            this.hapticFeedback('success');
            
            this.showNotification('Местоположение выбрано', 'success');
        }
    }

    closeModal() {
        this.isModalOpen = false;
        
        // Разрешаем скролл
        document.body.classList.remove('modal-open');
        document.body.style.overflow = 'hidden'; // Оставляем hidden
        
        document.getElementById('modalOverlay').style.display = 'none';
        document.querySelectorAll('.modal-container').forEach(modal => {
            modal.style.display = 'none';
        });
        
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
                uploadArea.style.borderColor = '#0066ff';
                uploadArea.style.background = 'rgba(0, 102, 255, 0.05)';
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
                    ? `<img src="${URL.createObjectURL(file)}" alt="Превью">`
                    : `<div class="video-preview"><i class="fas fa-video"></i></div>`
                }
                <div class="media-info">
                    <div class="media-name">${file.name}</div>
                    <div class="media-size">${this.formatFileSize(file.size)}</div>
                </div>
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

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // ===== ВАЛИДАЦИЯ ФОРМ =====
    setupFormValidation() {
        const phoneInput = document.getElementById('securityPhone');
        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                const value = e.target.value;
                const isValid = this.validatePhone(value);
                e.target.style.borderColor = isValid ? '#34c759' : '#ff3b30';
            });
        }
    }

    // ===== АДМИН-ПАНЕЛЬ =====
    checkAdminStatus() {
        const adminIds = window.ADMIN_USER_IDS || ['13897373', '90334880', '555666777'];
        this.isAdmin = adminIds.includes(this.currentUser?.id?.toString());
        
        if (this.isAdmin) {
            document.getElementById('adminNav').style.display = 'block';
        }
    }

    switchAdminTab(tab) {
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
        
        event.target.closest('.admin-tab').classList.add('active');
        document.getElementById(`admin-${tab}`).classList.add('active');
        
        // Тактильная обратная связь
        this.hapticFeedback('light');
    }

    async loadAdminDashboard() {
        try {
            const stats = await this.fetchAdminStats();
            
            document.getElementById('adminTotalReports').textContent = stats.total || 0;
            document.getElementById('adminPendingReports').textContent = stats.pending || 0;
            document.getElementById('adminCompletedReports').textContent = stats.completed || 0;
            document.getElementById('adminActiveUsers').textContent = stats.activeUsers || 0;
            
            this.updateCharts(stats);
            
        } catch (error) {
            console.error('Ошибка загрузки статистики:', error);
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
            activeUsers: 1,
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
                new Chart(categoryCtx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Безопасность', 'Граффити', 'Проблемы Wi-Fi', 'Предложения Wi-Fi'],
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
                                    color: 'rgba(255, 255, 255, 0.8)',
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
        // Форматируем номер для России
        let formattedNumber = number;
        
        // Убираем все нецифровые символы
        formattedNumber = formattedNumber.replace(/\D/g, '');
        
        // Если номер короткий (101, 102, 103, 112)
        if (formattedNumber.length <= 3) {
            formattedNumber = `tel:${formattedNumber}`;
        } 
        // Если номер российский без кода страны
        else if (formattedNumber.length === 10) {
            formattedNumber = `tel:+7${formattedNumber}`;
        }
        // Если номер уже с +7 или 8
        else if (formattedNumber.startsWith('7') || formattedNumber.startsWith('8')) {
            formattedNumber = `tel:+${formattedNumber.startsWith('8') ? '7' + formattedNumber.substring(1) : formattedNumber}`;
        }
        // Если уже с +7
        else if (formattedNumber.startsWith('+7')) {
            formattedNumber = `tel:${formattedNumber}`;
        }
        
        console.log('Вызов номера:', formattedNumber);
        
        if (this.maxBridge?.openLink) {
            try {
                this.maxBridge.openLink(formattedNumber);
            } catch (error) {
                console.error('Ошибка вызова:', error);
                this.showNotification(`Не удалось совершить вызов ${number}`, 'error');
            }
        } else {
            this.showNotification(`Вызов ${number}... В реальном приложении будет осуществлен звонок`, 'info');
        }
        
        // Тактильная обратная связь
        this.hapticFeedback('heavy');
    }

    // ===== ПУБЛИЧНЫЕ МЕТОДЫ ДЛЯ HTML =====
    reportWifiProblem(pointId, event) {
        if (event) event.stopPropagation();
        
        this.switchSection('wifi');
        
        const point = window.wifiPoints?.find(p => p.id === pointId);
        if (point) {
            const select = document.getElementById('wifiProblemPoint');
            select.value = pointId;
            document.getElementById('wifiProblemDesc').focus();
            this.showNotification(`Готово для отчета о проблеме: ${point.name}`, 'info');
        }
        
        // Тактильная обратная связь
        this.hapticFeedback('medium');
    }

    showOnMap(pointId, event) {
        if (event) event.stopPropagation();
        
        const point = window.wifiPoints?.find(p => p.id === pointId);
        if (!point) return;
        
        this.openInMaps(pointId);
        
        // Тактильная обратная связь
        this.hapticFeedback('light');
    }

    // ===== ФИКС СКРОЛЛА - ДОБАВЬ ЭТИ МЕТОДЫ =====
    preventScroll(event) {
        event.preventDefault();
        event.stopPropagation();
        return false;
    }

    setupScrollPrevention() {
        // Отключаем стандартный скролл на body
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        document.body.style.height = '100%';
        
        // Добавляем обработчики для тач-событий
        document.addEventListener('touchmove', this.preventScroll, { passive: false });
        document.addEventListener('touchstart', this.preventScroll, { passive: false });
        
        // Разрешаем скролл только в определенных контейнерах
        const scrollableElements = document.querySelectorAll('.wifi-results, .security-reports-list, .main-content');
        scrollableElements.forEach(el => {
            el.addEventListener('touchstart', (e) => {
                // Позволяем скролл только внутри этих элементов
                e.stopPropagation();
            });
            
            el.addEventListener('touchmove', (e) => {
                // Проверяем, достигли ли мы границы контейнера
                const { scrollTop, scrollHeight, clientHeight } = el;
                const isAtTop = scrollTop === 0;
                const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 1;
                
                if ((isAtTop && e.touches[0].clientY > 0) || 
                    (isAtBottom && e.touches[0].clientY < 0)) {
                    // Если пытаемся скроллить за границы - блокируем
                    e.preventDefault();
                }
            }, { passive: false });
        });
    }
}

// Инициализация приложения
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new SafeSevastopol();
});

// Глобальные методы для вызова из HTML
window.app = {
    toggleFavorite: (pointId, event) => app?.toggleFavorite(pointId, event),
    showOnMap: (pointId, event) => app?.showOnMap(pointId, event),
    reportWifiProblem: (pointId, event) => app?.reportWifiProblem(pointId, event),
    openInMaps: (pointId) => app?.openInMaps(pointId),
    buildRoute: (pointId) => app?.buildRoute(pointId),
    removeGraffitiPhoto: (index) => app?.removeGraffitiPhoto(index),
    removeMediaFile: (index) => app?.removeMediaFile(index)
};
