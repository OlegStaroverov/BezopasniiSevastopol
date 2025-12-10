// Sevastopol Hub - Основное приложение
class SevastopolHub {
    constructor() {
        this.currentUser = null;
        this.currentSection = 'dashboard';
        this.currentLocation = null;
        this.favoritePoints = new Set();
        this.mediaFiles = [];
        this.securityReport = {
            step: 1,
            data: {}
        };
        this.graffitiReport = {
            type: 'vandalism',
            urgency: 'medium',
            photos: []
        };
        this.isAdmin = false;
        
        this.init();
    }

    async init() {
        // Инициализация приложения
        this.setupEventListeners();
        await this.loadUserData();
        this.initMaps();
        this.loadWifiPoints();
        this.checkAdminStatus();
        this.setupFormValidation();
        this.setupDragAndDrop();
        
        // Анимация загрузки
        this.showNotification('Добро пожаловать в Sevastopol Hub!', 'success');
    }

    setupEventListeners() {
        // Навигация
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => this.switchSection(e.target.dataset.section));
        });

        // Быстрые действия
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleQuickAction(e.target.dataset.action));
        });

        // Wi-Fi поиск
        document.getElementById('wifiSearch').addEventListener('input', (e) => this.searchWifiPoints(e.target.value));
        document.getElementById('findNearbyWifi').addEventListener('click', () => this.findNearbyWifi());
        document.getElementById('sortWifi').addEventListener('change', (e) => this.sortWifiPoints(e.target.value));

        // Фильтры Wi-Fi
        document.querySelectorAll('.filter-tag').forEach(tag => {
            tag.addEventListener('click', (e) => this.filterWifiPoints(e.target.dataset.filter));
        });

        // Форма безопасности
        document.getElementById('nextStep').addEventListener('click', () => this.nextSecurityStep());
        document.getElementById('prevStep').addEventListener('click', () => this.prevSecurityStep());
        document.getElementById('submitSecurityReport').addEventListener('click', () => this.submitSecurityReport());

        // Опции местоположения
        document.querySelectorAll('.location-option').forEach(option => {
            option.addEventListener('click', (e) => this.handleLocationOption(e.target.dataset.type));
        });

        // Счетчик символов
        document.getElementById('securityDescription').addEventListener('input', (e) => {
            document.getElementById('charCount').textContent = e.target.value.length;
        });

        // Загрузка медиа
        document.getElementById('browseMedia').addEventListener('click', () => document.getElementById('mediaInput').click());
        document.getElementById('mediaInput').addEventListener('change', (e) => this.handleMediaUpload(e.target.files));

        // Граффити
        document.querySelectorAll('.type-option').forEach(option => {
            option.addEventListener('click', (e) => this.setGraffitiType(e.target.dataset.type));
        });

        document.querySelectorAll('.urgency-option').forEach(option => {
            option.addEventListener('click', (e) => this.setGraffitiUrgency(e.target.dataset.urgency));
        });

        document.getElementById('selectGraffitiLocation').addEventListener('click', () => this.openLocationPicker('graffiti'));
        document.getElementById('addGraffitiPhoto').addEventListener('click', () => document.getElementById('graffitiPhotoInput').click());
        document.getElementById('graffitiPhotoInput').addEventListener('change', (e) => this.handleGraffitiPhotos(e.target.files));
        document.getElementById('submitGraffitiReport').addEventListener('click', () => this.submitGraffitiReport());

        // Экстренные вызовы
        document.querySelectorAll('.btn-call').forEach(btn => {
            btn.addEventListener('click', (e) => this.makeEmergencyCall(e.target.dataset.number));
        });

        // Админ-панель
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchAdminTab(e.target.dataset.tab));
        });

        // Модальные окна
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });

        document.getElementById('modalOverlay').addEventListener('click', () => this.closeModal());
    }

    async loadUserData() {
        try {
            // Загрузка данных пользователя из MAX Web App
            if (window.Telegram && window.Telegram.WebApp) {
                this.currentUser = window.Telegram.WebApp.initDataUnsafe.user;
            } else if (window.WebApp && window.WebApp.initDataUnsafe) {
                this.currentUser = window.WebApp.initDataUnsafe.user;
            } else {
                // Демо режим
                this.currentUser = {
                    id: 'demo_user',
                    first_name: 'Демо',
                    last_name: 'Пользователь',
                    username: 'demo_user'
                };
            }

            // Обновление UI
            document.getElementById('userName').textContent = 
                this.currentUser.first_name || this.currentUser.username || 'Пользователь';
            
            // Загрузка избранных точек
            const favorites = localStorage.getItem('favoriteWifiPoints');
            if (favorites) {
                this.favoritePoints = new Set(JSON.parse(favorites));
            }

        } catch (error) {
            console.error('Ошибка загрузки данных пользователя:', error);
            this.currentUser = { id: 'anonymous', first_name: 'Гость' };
        }
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
        
        // Загрузка данных секции
        switch(section) {
            case 'wifi':
                this.loadWifiPoints();
                break;
            case 'security':
                this.resetSecurityForm();
                break;
            case 'graffiti':
                this.loadGraffitiMap();
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
            // Симуляция загрузки
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Загрузка точек из data.js
            const points = window.wifiPoints || [];
            
            // Отображение точек
            this.displayWifiPoints(points);
            
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

    async findNearbyWifi() {
        try {
            const position = await this.getCurrentPosition();
            this.currentLocation = position;
            
            // Обновление прогресс-бара
            this.updateProgressBar(100);
            
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

    findNearestPoints(userLat, userLon, limit = 10) {
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
        event.target.classList.add('active');
        
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
                    return aData.name.localeCompare(bData.name);
                default:
                    return 0;
            }
        });
        
        // Перестановка элементов
        items.forEach(item => container.appendChild(item));
    }

    showWifiDetails(point) {
        const container = document.getElementById('wifiDetails');
        const isFavorite = this.favoritePoints.has(point.id);
        
        container.innerHTML = `
            <div class="wifi-detail-card">
                <div class="detail-header">
                    <h4>${this.getTypeEmoji(point.type)} ${point.name}</h4>
                    <button class="btn-favorite ${isFavorite ? 'active' : ''}" onclick="app.toggleFavorite(${point.id})">
                        <i class="fas fa-star"></i>
                    </button>
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
        
        // Сохранение в localStorage
        localStorage.setItem('favoriteWifiPoints', JSON.stringify([...this.favoritePoints]));
        
        // Обновление UI
        const favoriteBtn = document.querySelector(`[data-id="${pointId}"] .btn-favorite`);
        if (favoriteBtn) {
            favoriteBtn.classList.toggle('active');
        }
    }

    // ===== БЕЗОПАСНОСТЬ ФУНКЦИОНАЛ =====
    resetSecurityForm() {
        this.securityReport = {
            step: 1,
            data: {}
        };
        
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
        
        // Очистка медиа
        this.mediaFiles = [];
        this.updateMediaPreview();
    }

    nextSecurityStep() {
        const currentStep = this.securityReport.step;
        
        // Валидация текущего шага
        if (!this.validateSecurityStep(currentStep)) {
            return;
        }
        
        // Переход к следующему шагу
        this.securityReport.step++;
        
        // Обновление UI
        this.updateSecurityStepper();
        this.updateSecurityForm();
    }

    prevSecurityStep() {
        if (this.securityReport.step > 1) {
            this.securityReport.step--;
            this.updateSecurityStepper();
            this.updateSecurityForm();
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
                this.securityReport.data.email = document.getElementById('securityEmail').value.trim();
                break;
                
            case 2:
                if (!this.securityReport.data.location) {
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
        if (this.securityReport.data.email) {
            document.getElementById('securityEmail').value = this.securityReport.data.email;
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
                mediaFiles: this.mediaFiles,
                timestamp: new Date().toISOString(),
                type: 'security'
            };
            
            // Отправка на сервер
            await this.sendReportToServer(reportData);
            
            // Отправка email админу
            await this.sendEmailNotification(reportData, 'security');
            
            // Сброс формы
            this.resetSecurityForm();
            
            this.showNotification('Отчет отправлен! Спасибо за вашу бдительность.', 'success');
            
        } catch (error) {
            console.error('Ошибка отправки отчета:', error);
            this.showNotification('Ошибка отправки отчета. Попробуйте позже.', 'error');
        }
    }

    // ===== ГРАФФИТИ ФУНКЦИОНАЛ =====
    setGraffitiType(type) {
        this.graffitiReport.type = type;
        
        // Обновление UI
        document.querySelectorAll('.type-option').forEach(option => {
            option.classList.remove('active');
        });
        event.target.classList.add('active');
    }

    setGraffitiUrgency(urgency) {
        this.graffitiReport.urgency = urgency;
        
        // Обновление UI
        document.querySelectorAll('.urgency-option').forEach(option => {
            option.classList.remove('active');
        });
        event.target.classList.add('active');
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
            if (file.size > 10 * 1024 * 1024) { // 10MB
                this.showNotification(`Файл ${file.name} слишком большой`, 'error');
                return;
            }
            
            this.graffitiReport.photos.push(file);
        });
        
        this.updateGraffitiPhotoPreview();
    }

    updateGraffitiPhotoPreview() {
        const container = document.getElementById('graffitiUploadGrid');
        const photosHTML = this.graffitiReport.photos.map((file, index) => `
            <div class="upload-cell photo-preview">
                <img src="${URL.createObjectURL(file)}" alt="Граффити фото ${index + 1}">
                <button class="btn-remove-photo" onclick="app.removeGraffitiPhoto(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
        
        const addButton = `<div class="upload-cell add-photo" onclick="document.getElementById('graffitiPhotoInput').click()">
            <i class="fas fa-plus"></i>
            <span>Добавить фото</span>
        </div>`;
        
        container.innerHTML = photosHTML + addButton;
    }

    removeGraffitiPhoto(index) {
        this.graffitiReport.photos.splice(index, 1);
        this.updateGraffitiPhotoPreview();
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
                type: this.graffitiReport.type,
                urgency: this.graffitiReport.urgency,
                location: location,
                description: description,
                photos: this.graffitiReport.photos,
                userId: this.currentUser?.id || 'anonymous',
                userName: this.currentUser?.first_name || 'Аноним',
                timestamp: new Date().toISOString(),
                status: 'new'
            };
            
            // Отправка на сервер
            await this.sendReportToServer(reportData, 'graffiti');
            
            // Отправка email админу
            await this.sendEmailNotification(reportData, 'graffiti');
            
            // Сброс формы
            this.resetGraffitiForm();
            
            this.showNotification('Отчет о граффити отправлен! Спасибо за помощь.', 'success');
            
        } catch (error) {
            console.error('Ошибка отправки отчета о граффити:', error);
            this.showNotification('Ошибка отправки отчета. Попробуйте позже.', 'error');
        }
    }

    resetGraffitiForm() {
        this.graffitiReport = {
            type: 'vandalism',
            urgency: 'medium',
            photos: []
        };
        
        document.getElementById('graffitiLocation').value = '';
        document.getElementById('graffitiDescription').value = '';
        
        // Сброс UI
        document.querySelectorAll('.type-option').forEach(option => {
            option.classList.remove('active');
        });
        document.querySelector('[data-type="vandalism"]').classList.add('active');
        
        document.querySelectorAll('.urgency-option').forEach(option => {
            option.classList.remove('active');
        });
        document.querySelector('[data-urgency="medium"]').classList.add('active');
        
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

    updateProgressBar(percent) {
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            progressFill.style.width = `${percent}%`;
        }
    }

    // ===== ИНИЦИАЛИЗАЦИЯ КАРТ =====
    initMaps() {
        // Инициализация основной карты города
        if (document.getElementById('cityMap')) {
            this.cityMap = L.map('cityMap').setView([44.6166, 33.5254], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(this.cityMap);
        }
        
        // Инициализация карты граффити
        if (document.getElementById('graffitiMap')) {
            this.graffitiMap = L.map('graffitiMap').setView([44.6166, 33.5254], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(this.graffitiMap);
        }
    }

    loadGraffitiMap() {
        // Загрузка данных о граффити и отображение на карте
        // В реальном приложении здесь будет запрос к серверу
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
        
        event.target.classList.add('active');
        document.getElementById(`admin-${tab}`).classList.add('active');
        
        // Загрузка данных вкладки
        switch(tab) {
            case 'dashboard':
                this.loadAdminDashboard();
                break;
            case 'wifi-admin':
                this.loadWifiAdmin();
                break;
            case 'security-admin':
                this.loadSecurityAdmin();
                break;
            case 'graffiti-admin':
                this.loadGraffitiAdmin();
                break;
        }
    }

    async loadAdminDashboard() {
        // Загрузка статистики для админ-панели
        try {
            const stats = await this.fetchAdminStats();
            
            // Обновление UI
            document.getElementById('adminTotalReports').textContent = stats.total || 0;
            document.getElementById('adminPendingReports').textContent = stats.pending || 0;
            document.getElementById('adminCompletedReports').textContent = stats.completed || 0;
            document.getElementById('adminActiveUsers').textContent = stats.activeUsers || 0;
            
            // Обновление графиков
            this.updateCharts(stats);
            
        } catch (error) {
            console.error('Ошибка загрузки статистики:', error);
        }
    }

    async fetchAdminStats() {
        // В реальном приложении здесь будет запрос к серверу
        return {
            total: 156,
            pending: 23,
            completed: 133,
            activeUsers: 428,
            byCategory: {
                wifi: 45,
                security: 67,
                graffiti: 44
            },
            byStatus: {
                new: 23,
                inProgress: 34,
                resolved: 99
            }
        };
    }

    updateCharts(stats) {
        // Обновление графиков Chart.js
        if (window.Chart && stats) {
            // График по категориям
            const categoryCtx = document.getElementById('reportsChart');
            if (categoryCtx) {
                new Chart(categoryCtx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Wi-Fi', 'Безопасность', 'Граффити'],
                        datasets: [{
                            data: [stats.byCategory?.wifi || 0, stats.byCategory?.security || 0, stats.byCategory?.graffiti || 0],
                            backgroundColor: ['#0066ff', '#34c759', '#ff9500']
                        }]
                    }
                });
            }
            
            // График по статусам
            const statusCtx = document.getElementById('statusChart');
            if (statusCtx) {
                new Chart(statusCtx, {
                    type: 'bar',
                    data: {
                        labels: ['Новые', 'В работе', 'Решено'],
                        datasets: [{
                            label: 'Количество',
                            data: [stats.byStatus?.new || 0, stats.byStatus?.inProgress || 0, stats.byStatus?.resolved || 0],
                            backgroundColor: ['#ff9500', '#0066ff', '#34c759']
                        }]
                    }
                });
            }
        }
    }

    // ===== ОТПРАВКА НА СЕРВЕР И ПОЧТУ =====
    async sendReportToServer(data, type) {
        // В реальном приложении здесь будет отправка на сервер
        console.log(`Отправка отчета ${type}:`, data);
        
        // Симуляция отправки
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return { success: true, id: Date.now() };
    }

    async sendEmailNotification(data, type) {
        // Используем email-service.js для отправки
        if (window.EmailService) {
            try {
                const emailData = {
                    to: this.getAdminEmail(type),
                    subject: this.getEmailSubject(type, data),
                    html: this.generateEmailHtml(data, type),
                    attachments: data.photos || []
                };
                
                await window.EmailService.sendEmail(emailData);
                console.log(`Email отправлен для отчета ${type}`);
            } catch (error) {
                console.error('Ошибка отправки email:', error);
            }
        }
    }

    getAdminEmail(type) {
        // Получение email админа из настроек
        const defaultEmail = 'admin@sevastopol.ru';
        const storedEmail = localStorage.getItem(`${type}_admin_email`);
        return storedEmail || defaultEmail;
    }

    getEmailSubject(type, data) {
        const subjects = {
            security: `СРОЧНО: Сообщение о безопасности #${data.id || 'NEW'}`,
            graffiti: `Граффити для удаления: ${data.type || 'unknown'}`,
            wifi: `Проблема с Wi-Fi: ${data.pointName || 'Unknown'}`
        };
        return subjects[type] || 'Новое обращение в Sevastopol Hub';
    }

    generateEmailHtml(data, type) {
        // Генерация HTML для email
        return `
            <h2>Новое обращение в Sevastopol Hub</h2>
            <p><strong>Тип:</strong> ${type}</p>
            <p><strong>Время:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
            <p><strong>Пользователь:</strong> ${data.userName} (${data.userId})</p>
            <p><strong>Описание:</strong> ${data.description || 'Нет описания'}</p>
            ${data.location ? `<p><strong>Местоположение:</strong> ${data.location}</p>` : ''}
            ${data.phone ? `<p><strong>Телефон:</strong> ${data.phone}</p>` : ''}
            <hr>
            <p>Для обработки перейдите в админ-панель Sevastopol Hub</p>
        `;
    }

    // ===== ОБРАБОТЧИКИ БЫСТРЫХ ДЕЙСТВИЙ =====
    handleQuickAction(action) {
        switch(action) {
            case 'report-problem':
                this.switchSection('security');
                break;
            case 'find-wifi':
                this.switchSection('wifi');
                this.findNearbyWifi();
                break;
            case 'emergency':
                this.showEmergencyContacts();
                break;
            case 'suggest':
                this.openSuggestionModal();
                break;
        }
    }

    showEmergencyContacts() {
        // Показать список экстренных служб
        this.showNotification('Используйте раздел "Безопасность" для вызова экстренных служб', 'info');
        this.switchSection('security');
    }

    makeEmergencyCall(number) {
        // В реальном приложении здесь будет звонок
        this.showNotification(`Вызов ${number}... В реальном приложении будет осуществлен звонок`, 'info');
    }

    // ===== МОДАЛЬНЫЕ ОКНА =====
    openLocationPicker(context) {
        this.locationContext = context;
        
        document.getElementById('modalOverlay').style.display = 'block';
        document.getElementById('locationModal').style.display = 'block';
        
        // Инициализация карты для выбора местоположения
        this.initLocationPickerMap();
    }

    initLocationPickerMap() {
        const mapElement = document.getElementById('locationPickerMap');
        if (!mapElement || this.locationMap) return;
        
        this.locationMap = L.map('locationPickerMap').setView([44.6166, 33.5254], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.locationMap);
        
        // Маркер для выбора местоположения
        this.locationMarker = L.marker([44.6166, 33.5254], { draggable: true }).addTo(this.locationMap);
        
        // Обработчик перемещения маркера
        this.locationMarker.on('dragend', () => {
            const position = this.locationMarker.getLatLng();
            this.selectedLocation = {
                lat: position.lat,
                lng: position.lng
            };
        });
        
        // Обработчик клика по карте
        this.locationMap.on('click', (e) => {
            this.locationMarker.setLatLng(e.latlng);
            this.selectedLocation = {
                lat: e.latlng.lat,
                lng: e.latlng.lng
            };
        });
    }

    closeModal() {
        document.getElementById('modalOverlay').style.display = 'none';
        document.querySelectorAll('.modal-container').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    // ===== ДРАГ-ЭНД-ДРОП =====
    setupDragAndDrop() {
        const uploadArea = document.getElementById('mediaUploadArea');
        if (!uploadArea) return;
        
        // Предотвращаем стандартное поведение браузера
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        
        // Подсветка при перетаскивании
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
        
        // Обработка загрузки файлов
        uploadArea.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            this.handleMediaUpload(files);
        });
    }

    handleMediaUpload(files) {
        if (!files || files.length === 0) return;
        
        const maxFiles = 5;
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        Array.from(files).slice(0, maxFiles - this.mediaFiles.length).forEach(file => {
            if (file.size > maxSize) {
                this.showNotification(`Файл ${file.name} слишком большой (>10MB)`, 'warning');
                return;
            }
            
            this.mediaFiles.push(file);
        });
        
        this.updateMediaPreview();
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
        // Валидация телефона в реальном времени
        const phoneInput = document.getElementById('securityPhone');
        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                const value = e.target.value;
                const isValid = this.validatePhone(value);
                e.target.style.borderColor = isValid ? '#34c759' : '#ff3b30';
            });
        }
    }

    // ===== ПУБЛИЧНЫЕ МЕТОДЫ ДЛЯ HTML =====
    openInMaps(pointId) {
        const point = window.wifiPoints?.find(p => p.id === pointId);
        if (!point) return;
        
        const url = `https://yandex.ru/maps/?pt=${point.coordinates.lon},${point.coordinates.lat}&z=17&l=map`;
        window.open(url, '_blank');
    }

    buildRoute(pointId) {
        const point = window.wifiPoints?.find(p => p.id === pointId);
        if (!point) return;
        
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const userLat = position.coords.latitude;
                const userLon = position.coords.longitude;
                const url = `https://yandex.ru/maps/?rtext=${userLat},${userLon}~${point.coordinates.lat},${point.coordinates.lon}&rtt=auto`;
                window.open(url, '_blank');
            });
        } else {
            this.openInMaps(pointId);
        }
    }

    reportWifiProblem(pointId, event) {
        if (event) event.stopPropagation();
        
        this.switchSection('wifi');
        
        const point = window.wifiPoints?.find(p => p.id === pointId);
        if (point) {
            document.getElementById('wifiProblemPoint').value = pointId;
            document.getElementById('wifiProblemDesc').focus();
            this.showNotification(`Готово для отчета о проблеме: ${point.name}`, 'info');
        }
    }

    showOnMap(pointId, event) {
        if (event) event.stopPropagation();
        
        const point = window.wifiPoints?.find(p => p.id === pointId);
        if (!point || !this.cityMap) return;
        
        this.cityMap.setView([point.coordinates.lat, point.coordinates.lon], 17);
        
        // Удаляем старые маркеры
        if (this.wifiMarker) this.cityMap.removeLayer(this.wifiMarker);
        
        // Добавляем новый маркер
        this.wifiMarker = L.marker([point.coordinates.lat, point.coordinates.lon])
            .addTo(this.cityMap)
            .bindPopup(`<b>${point.name}</b><br>${point.address || ''}`)
            .openPopup();
        
        this.showNotification(`Точка показана на карте`, 'success');
    }
}

// Инициализация приложения
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new SevastopolHub();
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
