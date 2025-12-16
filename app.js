// Безопасный Севастополь - Основное приложение для MAX Bridge
class SafeSevastopol {
    constructor() {
        this.maxBridge = window.WebApp || null;
        this.currentUser = null;
        this.currentSection = 'security';
        this.currentLocation = null;
        this.favoritePoints = new Set();
        this.securityReport = {
            step: 1,
            data: {}
        };
        this.graffitiReport = {
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
        
        // Анимации
        this.animations = {
            enabled: !window.matchMedia('(prefers-reduced-motion: reduce)').matches
        };
        
        // Инициализация
        this.init();
    }

    async init() {
        console.log('🚀 Инициализация Безопасный Севастополь');
        
        // Показываем полосу загрузки
        this.showLoadingBar();
        
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
        
        // Загрузка точек Wi-Fi (только для секции Wi-Fi)
        if (this.currentSection === 'wifi') {
            this.loadWifiPoints();
        }
        
        // Проверка прав админа
        this.checkAdminStatus();
        
        // Настройка форм
        this.setupFormValidation();
        
        // Настройка drag and drop
        this.setupDragAndDrop();
        
        // Инициализация Яндекс Карт
        this.initYandexMaps();
        
        // Инициализация темы
        this.initTheme();
        
        // Скрываем полосу загрузки
        this.hideLoadingBar();
        
        // Показываем приветственное уведомление с анимацией
        setTimeout(() => {
            this.showNotification('Добро пожаловать в Безопасный Севастополь!', 'success');
        }, 500);
        
        console.log('✅ Приложение инициализировано');
    }

    showLoadingBar() {
        const loadingBar = document.getElementById('loadingBar');
        if (loadingBar) {
            loadingBar.style.display = 'block';
            loadingBar.style.animation = 'loading-bar-animation 2s ease-in-out infinite';
        }
    }

    hideLoadingBar() {
        const loadingBar = document.getElementById('loadingBar');
        if (loadingBar) {
            setTimeout(() => {
                loadingBar.style.opacity = '0';
                setTimeout(() => {
                    loadingBar.style.display = 'none';
                    loadingBar.style.opacity = '1';
                }, 300);
            }, 500);
        }
    }

    setupResponsive() {
        document.body.style.overflowX = 'hidden';
        
        function setVh() {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        }
        
        setVh();
        window.addEventListener('resize', setVh);
        window.addEventListener('orientationchange', setVh);
        
        // Предотвращаем горизонтальный скролл на iOS
        document.addEventListener('touchmove', (e) => {
            if (e.touches.length > 1) e.preventDefault();
        }, { passive: false });
        
        // Оптимизация для iOS
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            document.body.style.overscrollBehavior = 'none';
            document.documentElement.style.webkitOverflowScrolling = 'touch';
        }
        
        // Добавляем стили для предотвращения горизонтального скролла
        const style = document.createElement('style');
        style.textContent = `
            * {
                max-width: 100vw;
                box-sizing: border-box;
            }
            .app-container {
                overflow-x: hidden;
                position: relative;
            }
            h1, h2, h3, h4, h5, h6, p, span, div {
                overflow-wrap: break-word;
                word-wrap: break-word;
                hyphens: auto;
            }
            .logo-title, .logo-subtitle, .section-header h2, .section-header p {
                white-space: normal !important;
                overflow: visible !important;
                text-overflow: clip !important;
            }
            @media (max-width: 640px) {
                .container {
                    padding-left: 16px;
                    padding-right: 16px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        this.setTheme(savedTheme);
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const themeColor = theme === 'dark' ? '#000000' : '#ffffff';
        document.querySelector('meta[name="theme-color"]').setAttribute('content', themeColor);
        
        localStorage.setItem('theme', theme);
        
        this.updateThemeIcons(theme);
    }

    updateThemeIcons(theme) {
        const themeToggle = document.getElementById('themeToggleSmall');
        if (!themeToggle) return;
        
        const moonIcon = themeToggle.querySelector('.fa-moon');
        const sunIcon = themeToggle.querySelector('.fa-sun');
        
        if (theme === 'dark') {
            if (moonIcon) moonIcon.style.display = 'none';
            if (sunIcon) sunIcon.style.display = 'inline-block';
        } else {
            if (moonIcon) moonIcon.style.display = 'inline-block';
            if (sunIcon) sunIcon.style.display = 'none';
        }
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        const themeToggle = document.getElementById('themeToggleSmall');
        if (themeToggle && this.animations.enabled) {
            themeToggle.style.transition = 'transform 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55)';
            themeToggle.style.transform = 'rotate(360deg)';
            
            setTimeout(() => {
                themeToggle.style.transform = '';
            }, 500);
        }
        
        this.setTheme(newTheme);
        this.hapticFeedback('light');
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
        
        document.getElementById('searchButton')?.addEventListener('click', () => {
            const query = document.getElementById('wifiSearch')?.value || '';
            if (!query.trim()) {
                this.showNotification('Заполните поле поиска', 'warning');
                return;
            }
            this.searchWifiPoints(query);
        });
        
        document.getElementById('findNearbyWifi')?.addEventListener('click', () => {
            this.findNearbyWifi();
        });

        // Фильтры Wi-Fi
        document.querySelectorAll('.filter-tag').forEach(tag => {
            tag.addEventListener('click', (e) => {
                const filter = e.currentTarget.dataset.filter;
                this.filterWifiPoints(filter);
            });
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

        // Получение имени из MAX для безопасности
        document.getElementById('requestNameFromMax')?.addEventListener('click', () => {
            this.requestNameFromMax();
        });

        // Получение телефона из MAX для безопасности
        document.getElementById('requestPhoneFromMax')?.addEventListener('click', () => {
            this.requestPhoneFromMax();
        });

        // Геолокация для безопасности
        document.getElementById('useCurrentLocation')?.addEventListener('click', () => {
            this.getCurrentLocation();
        });
        
        document.getElementById('useAddressLocation')?.addEventListener('click', () => {
            this.showAddressInput();
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
        document.getElementById('closeLocationModal')?.addEventListener('click', () => {
            this.closeModal();
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

        // Очистка поиска
        document.getElementById('clearSearch')?.addEventListener('click', () => {
            document.getElementById('wifiSearch').value = '';
            this.searchWifiPoints('');
        });
        
        // Переключение темы
        document.getElementById('themeToggleSmall')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleTheme();
        });
        
        // Валидация формы безопасности при вводе
        this.setupFormValidation();
        
        // Обработка клавиши Enter в поиске Wi-Fi
        document.getElementById('wifiSearch')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchWifiPoints(e.target.value);
            }
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
                    language_code: bridgeUser.language_code || 'ru',
                    photo_url: bridgeUser.photo_url || ''
                };
                console.log('✅ Пользователь из MAX Bridge:', userData.id);
                
                // Сохраняем start_param если есть
                if (this.maxBridge.initDataUnsafe.start_param) {
                    this.startParam = this.maxBridge.initDataUnsafe.start_param;
                    this.handleStartParam(this.startParam);
                }
                
                // Заполняем имя в форме безопасности
                const securityNameInput = document.getElementById('securityName');
                if (securityNameInput && userData.first_name) {
                    securityNameInput.value = userData.first_name;
                    this.securityReport.data.name = userData.first_name;
                }
                
                // Показываем имя из MAX
                const maxUserNameSpan = document.getElementById('maxUserName');
                if (maxUserNameSpan) {
                    maxUserNameSpan.textContent = userData.first_name;
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
                
                const maxUserNameSpan = document.getElementById('maxUserName');
                if (maxUserNameSpan) {
                    maxUserNameSpan.textContent = 'Демо';
                }
            }
            
            this.currentUser = userData;
            
            // Обновление UI с анимацией
            const userNameElement = document.getElementById('userName');
            if (userNameElement) {
                this.animateTextChange(userNameElement, this.currentUser.first_name || 'Гость');
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
                this.animateTextChange(userNameElement, 'Гость');
            }
        }
    }

    animateTextChange(element, newText) {
        if (!this.animations.enabled || element.textContent === newText) {
            element.textContent = newText;
            return;
        }
        
        element.style.opacity = '0.5';
        element.style.transform = 'translateY(-5px)';
        
        setTimeout(() => {
            element.textContent = newText;
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, 150);
    }

    async requestNameFromMax() {
        try {
            if (!this.maxBridge?.initDataUnsafe?.user) {
                this.showNotification('Имя из MAX недоступно в демо-режиме', 'warning');
                return;
            }
            
            const user = this.maxBridge.initDataUnsafe.user;
            if (user.first_name) {
                const nameInput = document.getElementById('securityName');
                if (nameInput) {
                    // Анимация изменения
                    nameInput.style.transform = 'scale(0.95)';
                    
                    setTimeout(() => {
                        nameInput.value = user.first_name;
                        nameInput.style.transform = 'scale(1)';
                    }, 150);
                    
                    this.securityReport.data.name = user.first_name;
                    this.securityReport.data.nameVerified = true;
                    
                    this.showNotification('Имя получено из MAX', 'success');
                    this.hapticFeedback('success');
                    
                    // Обновляем отображение имени с анимацией
                    const maxUserNameSpan = document.getElementById('maxUserName');
                    if (maxUserNameSpan) {
                        this.animateTextChange(maxUserNameSpan, user.first_name);
                    }
                }
            } else {
                this.showNotification('Имя не найдено в профиле MAX', 'warning');
            }
        } catch (error) {
            console.error('❌ Ошибка получения имени из MAX:', error);
            this.showNotification('Ошибка получения имени. Введите вручную.', 'error');
        }
    }

    async requestPhoneFromMax() {
        try {
            if (!this.maxBridge?.requestContact) {
                this.showNotification('Функция запроса телефона не доступна в демо-режиме', 'warning');
                return;
            }
            
            this.showNotification('Запрашиваем номер телефона...', 'info');
            
            const phone = await this.maxBridge.requestContact();
            
            if (phone) {
                const phoneInput = document.getElementById('securityPhone');
                if (phoneInput) {
                    // Форматируем номер телефона
                    const formattedPhone = this.formatPhoneNumber(phone);
                    
                    // Анимация изменения
                    phoneInput.style.transform = 'scale(0.95)';
                    
                    setTimeout(() => {
                        phoneInput.value = formattedPhone;
                        phoneInput.style.transform = 'scale(1)';
                    }, 150);
                    
                    this.securityReport.data.phone = phone;
                    this.securityReport.data.phoneVerified = true;
                    
                    this.showNotification('Номер телефона получен из MAX', 'success');
                    this.hapticFeedback('success');
                }
            } else {
                this.showNotification('Не удалось получить номер телефона', 'error');
            }
        } catch (error) {
            console.error('❌ Ошибка запроса телефона:', error);
            this.showNotification('Ошибка запроса телефона. Введите номер вручную.', 'error');
        }
    }

    formatPhoneNumber(phone) {
        // Убираем все нецифровые символы
        const cleaned = phone.replace(/\D/g, '');
        
        // Форматируем российский номер
        if (cleaned.length === 11 && (cleaned.startsWith('7') || cleaned.startsWith('8'))) {
            const match = cleaned.match(/^(\d)(\d{3})(\d{3})(\d{2})(\d{2})$/);
            if (match) {
                return `+${match[1]} (${match[2]}) ${match[3]}-${match[4]}-${match[5]}`;
            }
        }
        
        // Возвращаем исходный номер если не удалось отформатировать
        return phone;
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
            
            if (this.currentSection !== 'security') {
                this.switchSection('security');
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
        
        // Анимация перехода между секциями
        const oldSection = document.getElementById(`${this.currentSection}-section`);
        const newSection = document.getElementById(`${section}-section`);
        
        if (oldSection && newSection && this.animations.enabled) {
            oldSection.style.opacity = '0';
            oldSection.style.transform = 'translateX(-10px)';
        }
        
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
        
        setTimeout(() => {
            document.getElementById(`${section}-section`)?.classList.add('active');
            
            if (newSection && this.animations.enabled) {
                newSection.style.opacity = '0';
                newSection.style.transform = 'translateX(10px)';
                
                setTimeout(() => {
                    newSection.style.opacity = '1';
                    newSection.style.transform = 'translateX(0)';
                }, 10);
            }
        }, 150);
        
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

    async loadWifiPoints() {
        const loadingElement = document.getElementById('wifiLoading');
        const resultsElement = document.getElementById('wifiResults');
        
        if (loadingElement) {
            loadingElement.style.display = 'flex';
            loadingElement.style.opacity = '0';
            
            setTimeout(() => {
                loadingElement.style.opacity = '1';
            }, 10);
        }
        
        if (resultsElement) resultsElement.innerHTML = '';
        
        try {
            // Загрузка точек из data.js
            const points = window.wifiPoints || [];
            
            // Отображение точек с анимацией
            this.displayWifiPoints(points);
            
            // Заполнение выпадающего списка для отчетов
            this.populateWifiSelect();
            
            const wifiCountElement = document.getElementById('wifiCount');
            if (wifiCountElement) {
                this.animateTextChange(wifiCountElement, points.length.toString());
            }
            
            if (loadingElement) {
                loadingElement.style.opacity = '0';
                setTimeout(() => {
                    loadingElement.style.display = 'none';
                }, 300);
            }
            
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
            if (loadingElement) {
                loadingElement.style.opacity = '0';
                setTimeout(() => {
                    loadingElement.style.display = 'none';
                }, 300);
            }
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
        
        // Добавление обработчиков кликов с анимацией
        container.querySelectorAll('.wifi-result-item').forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(10px)';
            
            setTimeout(() => {
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
                item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            }, index * 50);
            
            item.addEventListener('click', () => {
                if (points[index]) {
                    this.showWifiDetails(points[index]);
                }
            });
        });
    }

    createWifiPointCard(point) {
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
            
            // Прямо открываем карту для выбора местоположения
            this.openLocationPicker('wifi_search');
            
        } catch (error) {
            console.error('❌ Ошибка геолокации:', error);
            this.showNotification('Не удалось определить местоположение. Выберите точку на карте вручную.', 'error');
            
            // Предлагаем выбрать на карте
            this.openLocationPicker('wifi_search');
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
            if (query) {
                clearBtn.style.display = 'flex';
                clearBtn.style.opacity = '0';
                
                setTimeout(() => {
                    clearBtn.style.opacity = '1';
                }, 10);
            } else {
                clearBtn.style.opacity = '0';
                setTimeout(() => {
                    clearBtn.style.display = 'none';
                }, 300);
            }
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
        if (wifiCountElement) {
            this.animateTextChange(wifiCountElement, filtered.length.toString());
        }
    }

    filterWifiPoints(filter) {
        const points = window.wifiPoints || [];
        
        // Обновление активного фильтра с анимацией
        document.querySelectorAll('.filter-tag').forEach(tag => {
            if (tag.classList.contains('active')) {
                tag.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    tag.style.transform = '';
                }, 150);
            }
            tag.classList.remove('active');
        });
        
        const activeTag = event?.target?.closest('.filter-tag');
        if (activeTag) {
            activeTag.classList.add('active');
            if (this.animations.enabled) {
                activeTag.style.transform = 'scale(1.05)';
                setTimeout(() => {
                    activeTag.style.transform = '';
                }, 150);
            }
        }
        
        if (filter === 'all') {
            this.displayWifiPoints(points);
            const wifiCountElement = document.getElementById('wifiCount');
            if (wifiCountElement) {
                this.animateTextChange(wifiCountElement, points.length.toString());
            }
            return;
        }
        
        const filtered = points.filter(point => point.type === filter);
        this.displayWifiPoints(filtered);
        
        const wifiCountElement = document.getElementById('wifiCount');
        if (wifiCountElement) {
            this.animateTextChange(wifiCountElement, filtered.length.toString());
        }
    }

    showWifiDetails(point) {
        const container = document.getElementById('wifiDetails');
        if (!container) return;
        
        container.style.opacity = '0';
        container.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
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
            
            container.style.opacity = '1';
            container.style.transform = 'scale(1)';
        }, 150);
        
        // Тактильная обратная связь
        this.hapticFeedback('light');
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

    reportWifiProblem(pointId, event) {
        if (event) event.stopPropagation();
        
        const point = window.wifiPoints?.find(p => p.id === pointId);
        if (!point) return;
        
        const select = document.getElementById('wifiProblemPoint');
        if (select) {
            select.value = pointId;
            this.switchSection('wifi');
            
            // Прокручиваем к форме отчета
            setTimeout(() => {
                const reportCard = document.querySelector('.report-card');
                if (reportCard) {
                    reportCard.scrollIntoView({ behavior: 'smooth' });
                }
                
                const descInput = document.getElementById('wifiProblemDesc');
                if (descInput) {
                    descInput.focus();
                }
            }, 300);
        }
        
        this.hapticFeedback('light');
    }

    openInMaps(pointId) {
        this.showOnMap(pointId);
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
                pointName: point?.name || '',
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
            
            // Анимация успешной отправки
            const submitBtn = document.getElementById('submitWifiProblem');
            if (submitBtn) {
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fas fa-check"></i> Отправлено';
                submitBtn.disabled = true;
                
                setTimeout(() => {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }, 2000);
            }
            
            // Очистка формы
            const descInput = document.getElementById('wifiProblemDesc');
            const pointSelect = document.getElementById('wifiProblemPoint');
            
            if (descInput) {
                descInput.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    descInput.value = '';
                    descInput.style.transform = 'scale(1)';
                }, 150);
            }
            
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
            
            // Анимация успешной отправки
            const submitBtn = document.getElementById('submitNewPoint');
            if (submitBtn) {
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fas fa-check"></i> Отправлено';
                submitBtn.disabled = true;
                
                setTimeout(() => {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }, 2000);
            }
            
            // Очистка формы
            const nameInput = document.getElementById('newPointName');
            const addressInput = document.getElementById('newPointAddress');
            const typeSelect = document.getElementById('newPointType');
            const descInput = document.getElementById('newPointDesc');
            
            const elements = [nameInput, addressInput, descInput];
            elements.forEach(el => {
                if (el) {
                    el.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        el.value = '';
                        el.style.transform = 'scale(1)';
                    }, 150);
                }
            });
            
            if (typeSelect) typeSelect.selectedIndex = 0;
            
            // Тактильная обратная связь
            this.hapticFeedback('success');
            
            this.showNotification('Предложение новой точки отправлено! Спасибо за помощь.', 'success');
            
        } catch (error) {
            console.error('❌ Ошибка отправки предложения:', error);
            this.showNotification('Ошибка отправки. Попробуйте позже.', 'error');
        }
    }

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
        const emailInput = document.getElementById('securityEmail');
        const addressInput = document.getElementById('manualAddress');
        const categorySelect = document.getElementById('securityCategory');
        const descInput = document.getElementById('securityDescription');
        const charCount = document.getElementById('charCount');
        
        // Заполняем имя из MAX если доступно
        if (nameInput && this.currentUser?.first_name) {
            nameInput.value = this.currentUser.first_name;
            this.securityReport.data.name = this.currentUser.first_name;
            this.securityReport.data.nameVerified = true;
        } else {
            nameInput.value = '';
        }
        
        if (phoneInput) {
            phoneInput.value = '';
            this.securityReport.data.phoneVerified = false;
        }
        if (emailInput) emailInput.value = '';
        if (addressInput) addressInput.value = '';
        if (categorySelect) categorySelect.selectedIndex = 0;
        if (descInput) descInput.value = '';
        if (charCount) charCount.textContent = '0';
        
        // Скрыть адресное поле
        const addressGroup = document.getElementById('addressInputGroup');
        if (addressGroup) addressGroup.style.display = 'none';
        
        // Сброс активных кнопок местоположения
        document.querySelectorAll('.location-option').forEach(option => {
            option.classList.remove('active');
        });
        
        // Очистка медиа
        this.updateMediaPreview();
    }

    nextSecurityStep() {
        const currentStep = this.securityReport.step;
        
        if (!this.validateSecurityStep(currentStep)) {
            return;
        }
        
        // Анимация перехода между шагами
        const currentFormStep = document.querySelector(`.form-step[data-step="${currentStep}"]`);
        if (currentFormStep && this.animations.enabled) {
            currentFormStep.style.opacity = '0';
            currentFormStep.style.transform = 'translateX(-20px)';
        }
        
        this.securityReport.step++;
        
        setTimeout(() => {
            this.updateSecurityStepper();
            this.updateSecurityForm();
            
            const newFormStep = document.querySelector(`.form-step[data-step="${this.securityReport.step}"]`);
            if (newFormStep && this.animations.enabled) {
                newFormStep.style.opacity = '0';
                newFormStep.style.transform = 'translateX(20px)';
                
                setTimeout(() => {
                    newFormStep.style.opacity = '1';
                    newFormStep.style.transform = 'translateX(0)';
                }, 10);
            }
        }, 150);
        
        // Тактильная обратная связь
        this.hapticFeedback('light');
    }

    prevSecurityStep() {
        if (this.securityReport.step <= 1) return;
        
        // Анимация перехода между шагами
        const currentFormStep = document.querySelector(`.form-step[data-step="${this.securityReport.step}"]`);
        if (currentFormStep && this.animations.enabled) {
            currentFormStep.style.opacity = '0';
            currentFormStep.style.transform = 'translateX(20px)';
        }
        
        this.securityReport.step--;
        
        setTimeout(() => {
            this.updateSecurityStepper();
            this.updateSecurityForm();
            
            const newFormStep = document.querySelector(`.form-step[data-step="${this.securityReport.step}"]`);
            if (newFormStep && this.animations.enabled) {
                newFormStep.style.opacity = '0';
                newFormStep.style.transform = 'translateX(-20px)';
                
                setTimeout(() => {
                    newFormStep.style.opacity = '1';
                    newFormStep.style.transform = 'translateX(0)';
                }, 10);
            }
        }, 150);
        
        // Тактильная обратная связь
        this.hapticFeedback('light');
    }

    validateSecurityStep(step) {
        switch(step) {
            case 1:
                const name = document.getElementById('securityName')?.value.trim();
                const phone = document.getElementById('securityPhone')?.value.trim();
                const email = document.getElementById('securityEmail')?.value.trim();
                
                // Валидация имени
                if (!name) {
                    this.showNotification('Введите ваше имя', 'error');
                    this.animateInvalidField('securityName');
                    return false;
                }
                
                // Валидация телефона
                if (!phone) {
                    this.showNotification('Введите номер телефона', 'error');
                    this.animateInvalidField('securityPhone');
                    return false;
                }
                
                if (!this.validatePhone(phone)) {
                    this.showNotification('Введите корректный номер телефона', 'error');
                    this.animateInvalidField('securityPhone');
                    return false;
                }
                
                // Валидация email (опционально)
                if (email && !this.validateEmail(email)) {
                    this.showNotification('Введите корректный email', 'error');
                    this.animateInvalidField('securityEmail');
                    return false;
                }
                
                // Сохраняем данные
                this.securityReport.data.name = name;
                this.securityReport.data.phone = phone;
                if (email) this.securityReport.data.email = email;
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
                    this.animateInvalidField('securityCategory');
                    return false;
                }
                
                if (description.length < 10) {
                    this.showNotification('Описание должно содержать минимум 10 символов', 'error');
                    this.animateInvalidField('securityDescription');
                    return false;
                }
                
                if (description.length > 500) {
                    this.showNotification('Описание должно содержать не более 500 символов', 'error');
                    this.animateInvalidField('securityDescription');
                    return false;
                }
                
                this.securityReport.data.category = category;
                this.securityReport.data.description = description;
                break;
                
            case 4:
                // Медиа опционально, можно пропустить
                break;
        }
        
        return true;
    }

    animateInvalidField(fieldId) {
        const field = document.getElementById(fieldId);
        if (!field) return;
        
        if (this.animations.enabled) {
            field.style.transform = 'translateX(-5px)';
            field.style.borderColor = 'var(--system-red)';
            
            setTimeout(() => {
                field.style.transform = 'translateX(5px)';
            }, 100);
            
            setTimeout(() => {
                field.style.transform = 'translateX(-5px)';
            }, 200);
            
            setTimeout(() => {
                field.style.transform = 'translateX(0)';
                field.style.borderColor = '';
            }, 300);
        }
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
            if (this.securityReport.step > 1) {
                prevBtn.style.display = 'flex';
                if (this.animations.enabled) {
                    prevBtn.style.opacity = '0';
                    prevBtn.style.transform = 'scale(0.8)';
                    
                    setTimeout(() => {
                        prevBtn.style.opacity = '1';
                        prevBtn.style.transform = 'scale(1)';
                    }, 10);
                }
            } else {
                prevBtn.style.display = 'none';
            }
        }
        
        if (nextBtn) {
            if (this.securityReport.step < 4) {
                nextBtn.style.display = 'flex';
            } else {
                nextBtn.style.display = 'none';
            }
        }
        
        if (submitBtn) {
            if (this.securityReport.step === 4) {
                submitBtn.style.display = 'flex';
                if (this.animations.enabled) {
                    submitBtn.style.opacity = '0';
                    submitBtn.style.transform = 'scale(0.8)';
                    
                    setTimeout(() => {
                        submitBtn.style.opacity = '1';
                        submitBtn.style.transform = 'scale(1)';
                    }, 10);
                }
            } else {
                submitBtn.style.display = 'none';
            }
        }
    }

    updateSecurityForm() {
        // Обновление данных формы
        const nameInput = document.getElementById('securityName');
        const phoneInput = document.getElementById('securityPhone');
        const emailInput = document.getElementById('securityEmail');
        const addressInput = document.getElementById('manualAddress');
        
        if (nameInput && this.securityReport.data.name) {
            nameInput.value = this.securityReport.data.name;
        }
        
        if (phoneInput && this.securityReport.data.phone) {
            phoneInput.value = this.securityReport.data.phone;
        }
        
        if (emailInput && this.securityReport.data.email) {
            emailInput.value = this.securityReport.data.email;
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
            
            const addressInput = document.getElementById('manualAddress');
            if (addressInput) {
                addressInput.value = `Геолокация: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
            }
            
            // Отметить кнопку как активную
            document.getElementById('useCurrentLocation').classList.add('active');
            document.getElementById('useAddressLocation').classList.remove('active');
            document.getElementById('pickLocationFromMap').classList.remove('active');
            
            // Скрыть поле ввода адреса
            const addressGroup = document.getElementById('addressInputGroup');
            if (addressGroup) addressGroup.style.display = 'none';
            
            // Тактильная обратная связь
            this.hapticFeedback('success');
            
            this.showNotification('Местоположение получено', 'success');
            
            // Переход к следующему шагу
            if (this.securityReport.step === 2) {
                setTimeout(() => {
                    this.nextSecurityStep();
                }, 500);
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
        
        if (addressGroup) {
            addressGroup.style.display = 'block';
            if (this.animations.enabled) {
                addressGroup.style.opacity = '0';
                addressGroup.style.height = '0';
                
                setTimeout(() => {
                    addressGroup.style.opacity = '1';
                    addressGroup.style.height = 'auto';
                }, 10);
            }
            
            // Добавляем класс active для визуального выделения
            document.getElementById('useAddressLocation').classList.add('active');
            
            // Убираем active с других кнопок
            document.getElementById('useCurrentLocation').classList.remove('active');
            document.getElementById('pickLocationFromMap').classList.remove('active');
        }
        
        if (addressInput) {
            addressInput.focus();
            
            // Обработка ввода адреса
            addressInput.addEventListener('input', (e) => {
                this.securityReport.data.address = e.target.value;
                this.securityReport.data.location = null;
            });
        }
    }

    async submitSecurityReport() {
        try {
            // Валидация последнего шага
            if (!this.validateSecurityStep(4)) {
                return;
            }
            
            // Показываем индикатор загрузки
            const submitBtn = document.getElementById('submitSecurityReport');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';
            submitBtn.disabled = true;
            
            // Генерация ID отчета
            const reportId = 'RPT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
            
            // Сбор всех данных
            const reportData = {
                ...this.securityReport.data,
                id: reportId,
                userId: this.currentUser?.id || 'anonymous',
                userName: this.currentUser?.first_name || 'Аноним',
                mediaFiles: this.mediaFiles.length,
                timestamp: new Date().toISOString(),
                type: 'security',
                status: 'new'
            };
            
            // Сохранение в localStorage
            this.saveReportToStorage(reportData, 'security');
            
            // Отправка email админу
            await this.sendEmailNotification(reportData, 'security');
            
            // Анимация успешной отправки
            submitBtn.innerHTML = '<i class="fas fa-check"></i> Отправлено';
            
            setTimeout(() => {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                
                // Сброс формы
                this.resetSecurityForm();
            }, 1500);
            
            // Тактильная обратная связь
            this.hapticFeedback('success');
            
            this.showNotification(`Отчет #${reportId} отправлен! Спасибо за вашу бдительность.`, 'success');
            
        } catch (error) {
            console.error('❌ Ошибка отправки отчета:', error);
            this.showNotification('Ошибка отправки отчета. Попробуйте позже.', 'error');
            
            // Восстановление кнопки
            const submitBtn = document.getElementById('submitSecurityReport');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Отправить отчет';
                submitBtn.disabled = false;
            }
        }
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
        
        // Анимация добавления фото
        const newPhotos = container.querySelectorAll('.photo-preview');
        if (this.animations.enabled && newPhotos.length > 0) {
            const lastPhoto = newPhotos[newPhotos.length - 1];
            lastPhoto.style.opacity = '0';
            lastPhoto.style.transform = 'scale(0.8)';
            
            setTimeout(() => {
                lastPhoto.style.opacity = '1';
                lastPhoto.style.transform = 'scale(1)';
            }, 10);
        }
    }

    removeGraffitiPhoto(index) {
        const container = document.getElementById('graffitiUploadGrid');
        if (container && this.animations.enabled) {
            const photoToRemove = container.querySelectorAll('.photo-preview')[index];
            if (photoToRemove) {
                photoToRemove.style.opacity = '0';
                photoToRemove.style.transform = 'scale(0.8)';
                
                setTimeout(() => {
                    this.graffitiReport.photos.splice(index, 1);
                    this.updateGraffitiPhotoPreview();
                }, 300);
            } else {
                this.graffitiReport.photos.splice(index, 1);
                this.updateGraffitiPhotoPreview();
            }
        } else {
            this.graffitiReport.photos.splice(index, 1);
            this.updateGraffitiPhotoPreview();
        }
        
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
                this.animateInvalidField('graffitiLocation');
                return;
            }
            
            if (!description) {
                this.showNotification('Добавьте описание проблемы', 'error');
                this.animateInvalidField('graffitiDescription');
                return;
            }
            
            if (this.graffitiReport.photos.length === 0) {
                this.showNotification('Добавьте хотя бы одну фотографию', 'error');
                return;
            }
            
            // Показываем индикатор загрузки
            const submitBtn = document.getElementById('submitGraffitiReport');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';
            submitBtn.disabled = true;
            
            // Генерация ID отчета
            const reportId = 'RPT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
            
            // Сбор данных
            const reportData = {
                id: reportId,
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
            this.saveReportToStorage(reportData, 'graffiti');
            
            // Отправка email админу
            await this.sendEmailNotification(reportData, 'graffiti');
            
            // Анимация успешной отправки
            submitBtn.innerHTML = '<i class="fas fa-check"></i> Отправлено';
            
            setTimeout(() => {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                
                // Сброс формы
                this.resetGraffitiForm();
            }, 1500);
            
            // Тактильная обратная связь
            this.hapticFeedback('success');
            
            this.showNotification(`Отчет #${reportId} о граффити отправлен! Спасибо за помощь.`, 'success');
            
        } catch (error) {
            console.error('❌ Ошибка отправки отчета о граффити:', error);
            this.showNotification('Ошибка отправки отчета. Попробуйте позже.', 'error');
            
            // Восстановление кнопки
            const submitBtn = document.getElementById('submitGraffitiReport');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-paint-roller"></i> Отправить на обработку';
                submitBtn.disabled = false;
            }
        }
    }

    resetGraffitiForm() {
        this.graffitiReport = {
            photos: []
        };
        
        const locationInput = document.getElementById('graffitiLocation');
        const descInput = document.getElementById('graffitiDescription');
        
        if (locationInput) locationInput.value = '';
        if (descInput) descInput.value = '';
        
        this.updateGraffitiPhotoPreview();
    }

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
            if (notif) {
                notif.style.opacity = '0';
                notif.style.transform = 'translateX(100%)';
                
                setTimeout(() => {
                    if (notif.parentNode) {
                        notif.parentNode.removeChild(notif);
                    }
                }, 300);
            }
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
            
            reports.push(data);
            localStorage.setItem(key, JSON.stringify(reports));
            
            console.log(`📁 Отчет сохранен: ${type} #${data.id}`);
            return data.id;
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
        // Разные админы для разных направлений
        const adminEmails = {
            'security': 'security-admin@sevastopol.ru',
            'wifi': 'wifi-admin@sevastopol.ru',
            'graffiti': 'graffiti-admin@sevastopol.ru',
            'wifi_suggestion': 'wifi-admin@sevastopol.ru'
        };
        
        return adminEmails[type] || 'admin@sevastopol.ru';
    }

    getEmailSubject(type, data) {
        const subjects = {
            security: `СРОЧНО: Сообщение о безопасности #${data.id}`,
            graffiti: `Граффити для удаления #${data.id}`,
            wifi: `Проблема с Wi-Fi: ${data.pointName || ''}`,
            wifi_suggestion: `Предложение новой точки Wi-Fi: ${data.name || ''}`
        };
        return subjects[type] || 'Новое обращение в Безопасный Севастополь';
    }

    generateEmailHtml(data, type) {
        return `
            <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #f5f5f7; border-radius: 16px;">
                <h2 style="color: #007AFF; border-bottom: 2px solid #007AFF; padding-bottom: 12px;">
                    Безопасный Севастополь - Новое обращение
                </h2>
                
                <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <p><strong>Тип обращения:</strong> ${type.toUpperCase()}</p>
                    <p><strong>ID обращения:</strong> ${data.id}</p>
                    <p><strong>Дата и время:</strong> ${new Date(data.timestamp).toLocaleString('ru-RU')}</p>
                </div>
                
                <div style="margin: 24px 0;">
                    <h3 style="color: #1d1d1f;">Информация о пользователе</h3>
                    <p><strong>Пользователь:</strong> ${data.userName} (${data.userId})</p>
                    ${data.phone ? `<p><strong>Телефон:</strong> ${data.phone}</p>` : ''}
                    ${data.email ? `<p><strong>Email:</strong> ${data.email}</p>` : ''}
                </div>
                
                <div style="margin: 24px 0;">
                    <h3 style="color: #1d1d1f;">Детали обращения</h3>
                    ${data.pointName ? `<p><strong>Точка Wi-Fi:</strong> ${data.pointName}</p>` : ''}
                    ${data.name ? `<p><strong>Название точки:</strong> ${data.name}</p>` : ''}
                    ${data.address ? `<p><strong>Адрес:</strong> ${data.address}</p>` : ''}
                    ${data.location ? `<p><strong>Местоположение:</strong> ${data.location.lat}, ${data.location.lon}</p>` : ''}
                    ${data.category ? `<p><strong>Категория:</strong> ${data.category}</p>` : ''}
                    ${data.description ? `<p><strong>Описание:</strong> ${data.description}</p>` : ''}
                    ${data.mediaFiles ? `<p><strong>Медиафайлов:</strong> ${data.mediaFiles}</p>` : ''}
                    ${data.photos ? `<p><strong>Фотографий:</strong> ${data.photos}</p>` : ''}
                </div>
                
                <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #d1d1d6; font-size: 13px; color: #86868b;">
                    <p>Для обработки перейдите в админ-панель "Безопасный Севастополь"</p>
                    <p>Это автоматическое уведомление, пожалуйста, не отвечайте на него.</p>
                </div>
            </div>
        `;
    }

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

    initYandexMaps() {
        if (typeof ymaps === 'undefined') {
            console.warn('⚠️ Яндекс Карты не загружены');
            return;
        }
        
        ymaps.ready(() => {
            console.log('✅ Яндекс Карты готовы');
        });
    }

    openLocationPicker(context) {
        this.locationContext = context;
        this.selectedLocation = null;
        
        const modalOverlay = document.getElementById('modalOverlay');
        const modal = document.getElementById('locationModal');
        
        if (modalOverlay) {
            modalOverlay.style.display = 'block';
            if (this.animations.enabled) {
                modalOverlay.style.opacity = '0';
                setTimeout(() => {
                    modalOverlay.style.opacity = '1';
                }, 10);
            }
        }
        
        if (modal) {
            modal.style.display = 'block';
            if (this.animations.enabled) {
                modal.style.opacity = '0';
                modal.style.transform = 'translate(-50%, -50%) scale(0.9)';
                
                setTimeout(() => {
                    modal.style.opacity = '1';
                    modal.style.transform = 'translate(-50%, -50%) scale(1)';
                }, 10);
            }
        }
        
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
                
                // Отметить кнопку карты как активную
                document.getElementById('pickLocationFromMap').classList.add('active');
                document.getElementById('useCurrentLocation').classList.remove('active');
                document.getElementById('useAddressLocation').classList.remove('active');
                
                // Скрыть поле ввода адреса
                const addressGroup = document.getElementById('addressInputGroup');
                if (addressGroup) addressGroup.style.display = 'none';
                
                // Переход к следующему шагу если мы на шаге 2
                if (this.securityReport.step === 2) {
                    setTimeout(() => {
                        this.nextSecurityStep();
                    }, 300);
                }
            } else if (this.locationContext === 'wifi_search') {
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
        const modal = document.getElementById('locationModal');
        
        if (modal && this.animations.enabled) {
            modal.style.opacity = '0';
            modal.style.transform = 'translate(-50%, -50%) scale(0.9)';
        }
        
        if (modalOverlay && this.animations.enabled) {
            modalOverlay.style.opacity = '0';
        }
        
        setTimeout(() => {
            if (modalOverlay) modalOverlay.style.display = 'none';
            if (modal) modal.style.display = 'none';
            
            // Сброс анимации
            if (modal) {
                modal.style.opacity = '';
                modal.style.transform = '';
            }
            if (modalOverlay) modalOverlay.style.opacity = '';
        }, 300);
        
        // Очищаем карту
        this.yandexMap = null;
        this.mapMarker = null;
        this.selectedLocation = null;
        
        // Тактильная обратная связь
        this.hapticFeedback('light');
    }

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
                uploadArea.style.borderColor = 'var(--system-blue)';
                uploadArea.style.background = 'var(--system-background-secondary)';
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
        
        // Анимация добавления
        const newItems = container.querySelectorAll('.media-preview-item');
        if (this.animations.enabled && newItems.length > 0) {
            const lastItem = newItems[newItems.length - 1];
            lastItem.style.opacity = '0';
            lastItem.style.transform = 'scale(0.8)';
            
            setTimeout(() => {
                lastItem.style.opacity = '1';
                lastItem.style.transform = 'scale(1)';
            }, 10);
        }
    }

    removeMediaFile(index) {
        const container = document.getElementById('mediaPreview');
        if (container && this.animations.enabled) {
            const itemToRemove = container.querySelectorAll('.media-preview-item')[index];
            if (itemToRemove) {
                itemToRemove.style.opacity = '0';
                itemToRemove.style.transform = 'scale(0.8)';
                
                setTimeout(() => {
                    this.mediaFiles.splice(index, 1);
                    this.updateMediaPreview();
                }, 300);
            } else {
                this.mediaFiles.splice(index, 1);
                this.updateMediaPreview();
            }
        } else {
            this.mediaFiles.splice(index, 1);
            this.updateMediaPreview();
        }
        
        // Тактильная обратная связь
        this.hapticFeedback('light');
    }

    setupFormValidation() {
        const phoneInput = document.getElementById('securityPhone');
        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                const value = e.target.value;
                const isValid = this.validatePhone(value);
                e.target.style.borderColor = isValid ? 'var(--system-green)' : 'var(--system-red)';
            });
        }
        
        const emailInput = document.getElementById('securityEmail');
        if (emailInput) {
            emailInput.addEventListener('input', (e) => {
                const value = e.target.value;
                if (value) {
                    const isValid = this.validateEmail(value);
                    e.target.style.borderColor = isValid ? 'var(--system-green)' : 'var(--system-red)';
                } else {
                    e.target.style.borderColor = '';
                }
            });
        }
    }

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
        // Анимация перехода между вкладками
        const oldTab = document.querySelector('.admin-tab-content.active');
        if (oldTab && this.animations.enabled) {
            oldTab.style.opacity = '0';
            oldTab.style.transform = 'translateX(-10px)';
        }
        
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
        
        setTimeout(() => {
            if (activeContent) {
                activeContent.classList.add('active');
                if (this.animations.enabled) {
                    activeContent.style.opacity = '0';
                    activeContent.style.transform = 'translateX(10px)';
                    
                    setTimeout(() => {
                        activeContent.style.opacity = '1';
                        activeContent.style.transform = 'translateX(0)';
                    }, 10);
                }
            }
        }, 150);
        
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
            
            // Обновление статистики с анимацией
            const totalEl = document.getElementById('adminTotalReports');
            const pendingEl = document.getElementById('adminPendingReports');
            const completedEl = document.getElementById('adminCompletedReports');
            const usersEl = document.getElementById('adminActiveUsers');
            
            if (totalEl) this.animateNumberChange(totalEl, stats.total || 0);
            if (pendingEl) this.animateNumberChange(pendingEl, stats.pending || 0);
            if (completedEl) this.animateNumberChange(completedEl, stats.completed || 0);
            if (usersEl) this.animateNumberChange(usersEl, stats.activeUsers || 0);
            
            // Обновление графиков
            this.updateCharts(stats);
            
        } catch (error) {
            console.error('❌ Ошибка загрузки статистики:', error);
        }
    }

    animateNumberChange(element, newValue) {
        const currentValue = parseInt(element.textContent) || 0;
        if (currentValue === newValue) return;
        
        if (!this.animations.enabled) {
            element.textContent = newValue;
            return;
        }
        
        element.style.transform = 'scale(1.1)';
        
        setTimeout(() => {
            element.textContent = newValue;
            element.style.transform = 'scale(1)';
        }, 150);
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
            activeUsers: Math.floor(Math.random() * 50) + 10,
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
                            backgroundColor: ['#007AFF', '#FF9500', '#34C759', '#5856D6']
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    color: 'var(--system-label-secondary)',
                                    padding: 20
                                }
                            }
                        },
                        animation: {
                            animateScale: true,
                            animateRotate: true
                        }
                    }
                });
            }
        }
    }

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
        
        // Анимация нажатия на кнопку вызова
        const callButton = event?.target?.closest('.btn-call');
        if (callButton && this.animations.enabled) {
            callButton.style.transform = 'scale(0.9)';
            setTimeout(() => {
                callButton.style.transform = 'scale(1)';
            }, 150);
        }
        
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
    showOnMap: (pointId, event) => window.app?.showOnMap(pointId, event),
    reportWifiProblem: (pointId, event) => window.app?.reportWifiProblem(pointId, event),
    openInMaps: (pointId) => window.app?.openInMaps(pointId),
    buildRoute: (pointId) => window.app?.buildRoute(pointId),
    removeGraffitiPhoto: (index) => window.app?.removeGraffitiPhoto(index),
    removeMediaFile: (index) => window.app?.removeMediaFile(index)
};
