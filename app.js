// Безопасный Севастополь - Основное приложение для MAX Bridge
class SafeSevastopol {
    constructor() {
        this.maxBridge = window.WebApp || null;
        this.currentUser = null;
        this.currentSection = 'security';
        this.currentLocation = null;
        this.isAdmin = false;
        this.hasUnsavedChanges = false;
        this.startParam = null;
        this.yandexMap = null;
        this.mapMarker = null;
        this.selectedLocation = null;
        this.locationContext = null;
        
        // Данные форм
        this.securityReport = {
            step: 1,
            data: {
                name: '',
                phone: '',
                email: '',
                category: '',
                description: '',
                address: '',
                location: null,
                mediaFiles: []
            }
        };
        
        this.wifiProblem = {
            pointId: '',
            type: '',
            description: ''
        };
        
        this.wifiSuggestion = {
            name: '',
            address: '',
            type: '',
            description: ''
        };
        
        this.graffitiReport = {
            address: '',
            description: '',
            photos: []
        };
        
        // Инициализация
        this.init();
    }

    async init() {
        console.log('🚀 Инициализация Безопасный Севастополь v2.0');
        
        // Настройка адаптивности
        this.setupResponsive();
        
        // Настройка событий
        this.setupEventListeners();
        
        // Загрузка данных пользователя
        await this.loadUserData();
        
        // Проверка прав админа
        this.checkAdminStatus();
        
        // Инициализация Яндекс Карт
        this.initYandexMaps();
        
        // Инициализация форм
        this.initForms();
        
        // Загрузка данных Wi-Fi
        this.loadWifiData();
        
        // Показываем приветственное уведомление
        setTimeout(() => {
            this.showNotification('Добро пожаловать в Безопасный Севастополь!', 'success');
        }, 500);
        
        console.log('✅ Приложение инициализировано');
    }

    setupResponsive() {
        // Установка правильной высоты для мобильных устройств
        function setAppHeight() {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
            
            const appContainer = document.querySelector('.app-container');
            if (appContainer) {
                appContainer.style.minHeight = 'calc(var(--vh, 1vh) * 100)';
            }
        }
        
        setAppHeight();
        window.addEventListener('resize', setAppHeight);
        window.addEventListener('orientationchange', setAppHeight);
        
        // Предотвращаем горизонтальный скролл
        document.body.style.overflowX = 'hidden';
        document.documentElement.style.overflowX = 'hidden';
        
        // Оптимизация для iOS
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            document.body.style.overscrollBehavior = 'none';
            document.documentElement.style.webkitOverflowScrolling = 'touch';
        }
    }

    setupEventListeners() {
        // Навигация
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                this.switchSection(section);
                this.hapticFeedback('light');
            });
        });

        // Переключение темы
        document.getElementById('themeToggle')?.addEventListener('click', () => {
            AppData.toggleTheme();
            this.hapticFeedback('light');
        });

        // Вкладки Wi-Fi
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.switchWifiTab(tabName);
                this.hapticFeedback('light');
            });
        });

        // Форма безопасности
        this.setupSecurityFormListeners();
        
        // Формы Wi-Fi
        this.setupWifiFormListeners();
        
        // Форма граффити
        this.setupGraffitiFormListeners();
        
        // Админ-панель
        this.setupAdminListeners();
        
        // Контакты
        this.setupContactsListeners();
        
        // Модальные окна
        this.setupModalListeners();
    }

    setupSecurityFormListeners() {
        // Навигация по шагам
        document.getElementById('nextStep')?.addEventListener('click', () => this.nextSecurityStep());
        document.getElementById('prevStep')?.addEventListener('click', () => this.prevSecurityStep());
        document.getElementById('submitReport')?.addEventListener('click', () => this.submitSecurityReport());
        
        // Получение данных из MAX
        document.getElementById('useMaxName')?.addEventListener('click', () => this.useMaxName());
        document.getElementById('useMaxPhone')?.addEventListener('click', () => this.useMaxPhone());
        
        // Местоположение
        document.getElementById('useCurrentLocation')?.addEventListener('click', () => this.useCurrentLocation());
        document.getElementById('useManualLocation')?.addEventListener('click', () => this.useManualLocation());
        document.getElementById('useMapLocation')?.addEventListener('click', () => this.openLocationPicker('security'));
        
        // Валидация
        document.getElementById('securityName')?.addEventListener('input', (e) => {
            this.securityReport.data.name = e.target.value;
            this.validateStep(1);
        });
        
        document.getElementById('securityPhone')?.addEventListener('input', (e) => {
            this.securityReport.data.phone = e.target.value;
            this.validateStep(1);
        });
        
        document.getElementById('securityEmail')?.addEventListener('input', (e) => {
            this.securityReport.data.email = e.target.value;
        });
        
        document.getElementById('securityCategory')?.addEventListener('change', (e) => {
            this.securityReport.data.category = e.target.value;
            this.validateStep(2);
        });
        
        document.getElementById('securityDescription')?.addEventListener('input', (e) => {
            this.securityReport.data.description = e.target.value;
            document.getElementById('charCount').textContent = e.target.value.length;
            this.validateStep(2);
        });
        
        document.getElementById('manualAddress')?.addEventListener('input', (e) => {
            this.securityReport.data.address = e.target.value;
            this.validateStep(3);
        });
        
        // Медиа
        document.getElementById('browseMedia')?.addEventListener('click', () => {
            document.getElementById('mediaInput').click();
        });
        
        document.getElementById('mediaInput')?.addEventListener('change', (e) => {
            this.handleMediaUpload(e.target.files);
        });
        
        // Drag and drop для медиа
        const uploadArea = document.getElementById('mediaUploadArea');
        if (uploadArea) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                });
            });
            
            ['dragenter', 'dragover'].forEach(eventName => {
                uploadArea.addEventListener(eventName, () => {
                    uploadArea.classList.add('drag-over');
                });
            });
            
            ['dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, () => {
                    uploadArea.classList.remove('drag-over');
                });
            });
            
            uploadArea.addEventListener('drop', (e) => {
                const files = e.dataTransfer.files;
                this.handleMediaUpload(files);
            });
        }
    }

    setupWifiFormListeners() {
        // Поиск
        document.getElementById('wifiSearch')?.addEventListener('input', (e) => {
            this.searchWifiPoints(e.target.value);
        });
        
        document.getElementById('clearSearch')?.addEventListener('click', () => {
            document.getElementById('wifiSearch').value = '';
            this.searchWifiPoints('');
        });
        
        document.getElementById('findNearby')?.addEventListener('click', () => {
            this.findNearbyWifi();
        });
        
        // Фильтры
        document.querySelectorAll('.filter-tag').forEach(tag => {
            tag.addEventListener('click', (e) => {
                const filter = e.currentTarget.dataset.filter;
                this.filterWifiPoints(filter);
            });
        });
        
        // Сортировка
        document.getElementById('sortWifi')?.addEventListener('change', (e) => {
            this.sortWifiPoints(e.target.value);
        });
        
        // Отчет о проблеме
        document.getElementById('submitProblem')?.addEventListener('click', () => {
            this.submitWifiProblem();
        });
        
        // Предложение новой точки
        document.getElementById('submitSuggestion')?.addEventListener('click', () => {
            this.submitWifiSuggestion();
        });
    }

    setupGraffitiFormListeners() {
        document.getElementById('selectGraffitiLocation')?.addEventListener('click', () => {
            this.openLocationPicker('graffiti');
        });
        
        document.getElementById('addGraffitiPhoto')?.addEventListener('click', () => {
            document.getElementById('graffitiPhotoInput').click();
        });
        
        document.getElementById('graffitiPhotoInput')?.addEventListener('change', (e) => {
            this.handleGraffitiPhotos(e.target.files);
        });
        
        document.getElementById('submitGraffiti')?.addEventListener('click', () => {
            this.submitGraffitiReport();
        });
    }

    setupAdminListeners() {
        // Вкладки админ-панели
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.switchAdminTab(tabName);
            });
        });
        
        // Действия
        document.getElementById('exportSecurity')?.addEventListener('click', () => this.exportReports('security'));
        document.getElementById('refreshSecurity')?.addEventListener('click', () => this.loadReports('security'));
        
        document.getElementById('exportWifi')?.addEventListener('click', () => this.exportReports('wifi'));
        document.getElementById('refreshWifi')?.addEventListener('click', () => this.loadReports('wifi'));
        
        document.getElementById('exportGraffiti')?.addEventListener('click', () => this.exportReports('graffiti'));
        document.getElementById('refreshGraffiti')?.addEventListener('click', () => this.loadReports('graffiti'));
        
        // Настройки email
        document.getElementById('saveSecurityEmail')?.addEventListener('click', () => this.saveAdminEmail('security'));
        document.getElementById('saveWifiEmail')?.addEventListener('click', () => this.saveAdminEmail('wifi'));
        document.getElementById('saveGraffitiEmail')?.addEventListener('click', () => this.saveAdminEmail('graffiti'));
    }

    setupContactsListeners() {
        // Кнопки вызова
        document.querySelectorAll('.btn-call').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const number = e.currentTarget.dataset.number;
                this.makeEmergencyCall(number);
            });
        });
    }

    setupModalListeners() {
        // Закрытие модалок
        document.getElementById('modalOverlay')?.addEventListener('click', () => this.closeModal());
        document.getElementById('closeLocationModal')?.addEventListener('click', () => this.closeModal());
        document.getElementById('cancelLocation')?.addEventListener('click', () => this.closeModal());
        document.getElementById('closeWifiInfo')?.addEventListener('click', () => this.closeWifiInfoModal());
        
        // Подтверждение местоположения
        document.getElementById('confirmLocation')?.addEventListener('click', () => this.confirmLocation());
        
        // Действия в модалке Wi-Fi
        document.getElementById('reportWifiProblem')?.addEventListener('click', () => this.reportSelectedWifiProblem());
        document.getElementById('showOnMap')?.addEventListener('click', () => this.showSelectedWifiOnMap());
    }

    async loadUserData() {
        try {
            console.log('👤 Загрузка данных пользователя...');
            
            // Пытаемся получить данные из MAX Bridge
            if (this.maxBridge?.initDataUnsafe?.user) {
                const bridgeUser = this.maxBridge.initDataUnsafe.user;
                this.currentUser = {
                    id: String(bridgeUser.id || 'anonymous'),
                    firstName: bridgeUser.first_name || 'Пользователь',
                    lastName: bridgeUser.last_name || '',
                    username: bridgeUser.username || '',
                    languageCode: bridgeUser.language_code || 'ru',
                    photoUrl: bridgeUser.photo_url || ''
                };
                
                console.log('✅ Пользователь из MAX Bridge:', this.currentUser.id);
                
                // Сохраняем start_param если есть
                if (this.maxBridge.initDataUnsafe.start_param) {
                    this.startParam = this.maxBridge.initDataUnsafe.start_param;
                    this.handleStartParam(this.startParam);
                }
                
                // Настройка кнопки "Назад"
                this.setupBackButton();
            } else {
                // Демо-режим
                this.currentUser = {
                    id: 'demo_user',
                    firstName: 'Демо',
                    lastName: 'Пользователь',
                    username: 'demo_user',
                    languageCode: 'ru'
                };
                console.log('⚠️ Используем демо-режим');
            }
            
            // Обновление UI
            this.updateUserUI();
            
        } catch (error) {
            console.error('❌ Ошибка загрузки данных пользователя:', error);
            this.currentUser = { 
                id: 'anonymous', 
                firstName: 'Гость',
                languageCode: 'ru'
            };
            this.updateUserUI();
        }
    }

    updateUserUI() {
        const userNameElement = document.getElementById('userName');
        const maxUserNameElement = document.getElementById('maxUserName');
        
        if (userNameElement) {
            userNameElement.textContent = this.currentUser.firstName;
        }
        
        if (maxUserNameElement) {
            maxUserNameElement.textContent = this.currentUser.firstName;
        }
        
        // Заполняем имя в форме безопасности
        const securityNameInput = document.getElementById('securityName');
        if (securityNameInput && this.currentUser.firstName) {
            securityNameInput.value = this.currentUser.firstName;
            this.securityReport.data.name = this.currentUser.firstName;
        }
    }

    setupBackButton() {
        if (!this.maxBridge?.BackButton) return;
        
        this.maxBridge.BackButton.show();
        this.maxBridge.BackButton.onClick(() => {
            console.log('🔙 Нажата кнопка назад');
            this.handleBackButton();
        });
    }

    handleBackButton() {
        if (this.currentSection !== 'security') {
            this.switchSection('security');
            return true;
        }
        
        // В форме безопасности - возврат на предыдущий шаг
        if (this.currentSection === 'security' && this.securityReport.step > 1) {
            this.prevSecurityStep();
            return true;
        }
        
        // Закрытие модальных окон
        if (document.getElementById('modalOverlay')?.style.display === 'block') {
            this.closeModal();
            return true;
        }
        
        // Закрытие приложения
        if (this.maxBridge?.close) {
            this.maxBridge.close();
        }
        
        return false;
    }

    switchSection(section) {
        if (this.currentSection === section) return;
        
        // Анимация перехода
        const oldSection = document.getElementById(`${this.currentSection}-section`);
        const newSection = document.getElementById(`${section}-section`);
        
        if (oldSection) {
            oldSection.classList.remove('active');
        }
        
        this.currentSection = section;
        
        // Обновление активной навигации
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`)?.classList.add('active');
        
        // Показать новую секцию
        document.querySelectorAll('.content-section').forEach(sec => {
            sec.classList.remove('active');
        });
        
        setTimeout(() => {
            if (newSection) {
                newSection.classList.add('active');
            }
        }, 50);
        
        // Загрузка данных секции
        switch(section) {
            case 'wifi':
                this.loadWifiData();
                break;
            case 'security':
                this.initSecurityForm();
                break;
            case 'graffiti':
                this.initGraffitiForm();
                break;
            case 'admin':
                this.loadAdminDashboard();
                break;
        }
        
        console.log(`📍 Переключен раздел: ${section}`);
        
        // Тактильная обратная связь
        this.hapticFeedback('light');
    }

    switchWifiTab(tab) {
        // Обновление активной вкладки
        document.querySelectorAll('.tab').forEach(t => {
            t.classList.remove('active');
        });
        
        document.querySelectorAll('.tab-content').forEach(c => {
            c.classList.remove('active');
        });
        
        const activeTab = document.querySelector(`[data-tab="${tab}"]`);
        const activeContent = document.getElementById(`tab-${tab}`);
        
        if (activeTab) activeTab.classList.add('active');
        if (activeContent) activeContent.classList.add('active');
        
        // Тактильная обратная связь
        this.hapticFeedback('light');
    }

    // === ФОРМА БЕЗОПАСНОСТИ ===
    initSecurityForm() {
        // Сброс формы
        this.securityReport = {
            step: 1,
            data: {
                name: this.currentUser.firstName || '',
                phone: '',
                email: '',
                category: '',
                description: '',
                address: '',
                location: null,
                mediaFiles: []
            }
        };
        
        // Сброс UI
        document.querySelectorAll('.step').forEach(step => {
            step.classList.remove('active');
        });
        document.querySelector('[data-step="1"]')?.classList.add('active');
        
        document.querySelectorAll('.form-step').forEach(step => {
            step.classList.remove('active');
        });
        document.getElementById('step1')?.classList.add('active');
        
        // Обновление кнопок
        this.updateSecurityNavigation();
        
        // Заполнение полей
        const nameInput = document.getElementById('securityName');
        const phoneInput = document.getElementById('securityPhone');
        const emailInput = document.getElementById('securityEmail');
        const categorySelect = document.getElementById('securityCategory');
        const descInput = document.getElementById('securityDescription');
        const addressInput = document.getElementById('manualAddress');
        
        if (nameInput) nameInput.value = this.securityReport.data.name;
        if (phoneInput) phoneInput.value = '';
        if (emailInput) emailInput.value = '';
        if (categorySelect) categorySelect.selectedIndex = 0;
        if (descInput) descInput.value = '';
        if (addressInput) addressInput.value = '';
        
        // Сброс счетчика символов
        document.getElementById('charCount').textContent = '0';
        
        // Сброс медиа
        this.updateMediaPreview();
    }

    nextSecurityStep() {
        const currentStep = this.securityReport.step;
        
        // Валидация текущего шага
        if (!this.validateStep(currentStep)) {
            return;
        }
        
        // Сохранение данных шага
        this.saveStepData(currentStep);
        
        // Переход к следующему шагу
        this.securityReport.step++;
        
        // Обновление UI
        this.updateSecurityStepper();
        this.updateSecurityForm();
        this.updateSecurityNavigation();
        
        // Тактильная обратная связь
        this.hapticFeedback('light');
    }

    prevSecurityStep() {
        if (this.securityReport.step <= 1) return;
        
        this.securityReport.step--;
        
        // Обновление UI
        this.updateSecurityStepper();
        this.updateSecurityForm();
        this.updateSecurityNavigation();
        
        // Тактильная обратная связь
        this.hapticFeedback('light');
    }

    validateStep(step) {
        switch(step) {
            case 1: // Контакты
                const name = document.getElementById('securityName')?.value.trim();
                const phone = document.getElementById('securityPhone')?.value.trim();
                
                if (!name) {
                    this.showNotification('Введите ваше имя', 'error');
                    this.highlightInvalidField('securityName');
                    return false;
                }
                
                if (!phone) {
                    this.showNotification('Введите номер телефона', 'error');
                    this.highlightInvalidField('securityPhone');
                    return false;
                }
                
                if (!AppData.validatePhone(phone)) {
                    this.showNotification('Введите корректный номер телефона', 'error');
                    this.highlightInvalidField('securityPhone');
                    return false;
                }
                
                return true;
                
            case 2: // Описание
                const category = document.getElementById('securityCategory')?.value;
                const description = document.getElementById('securityDescription')?.value.trim();
                
                if (!category) {
                    this.showNotification('Выберите категорию', 'error');
                    this.highlightInvalidField('securityCategory');
                    return false;
                }
                
                if (!description || description.length < 10) {
                    this.showNotification('Описание должно содержать минимум 10 символов', 'error');
                    this.highlightInvalidField('securityDescription');
                    return false;
                }
                
                return true;
                
            case 3: // Местоположение
                if (!this.securityReport.data.address && !this.securityReport.data.location) {
                    this.showNotification('Укажите местоположение', 'error');
                    return false;
                }
                return true;
                
            case 4: // Медиа (опционально)
                return true;
                
            case 5: // Подтверждение
                const confirmed = document.getElementById('confirmData')?.checked;
                if (!confirmed) {
                    this.showNotification('Подтвердите правильность данных', 'error');
                    return false;
                }
                return true;
        }
        
        return true;
    }

    saveStepData(step) {
        switch(step) {
            case 1:
                this.securityReport.data.name = document.getElementById('securityName')?.value.trim();
                this.securityReport.data.phone = document.getElementById('securityPhone')?.value.trim();
                this.securityReport.data.email = document.getElementById('securityEmail')?.value.trim();
                break;
                
            case 2:
                this.securityReport.data.category = document.getElementById('securityCategory')?.value;
                this.securityReport.data.description = document.getElementById('securityDescription')?.value.trim();
                break;
        }
    }

    updateSecurityStepper() {
        document.querySelectorAll('.step').forEach(step => {
            step.classList.remove('active');
        });
        
        document.querySelectorAll('.form-step').forEach(step => {
            step.classList.remove('active');
        });
        
        const currentStep = document.querySelector(`[data-step="${this.securityReport.step}"]`);
        const currentFormStep = document.getElementById(`step${this.securityReport.step}`);
        
        if (currentStep) currentStep.classList.add('active');
        if (currentFormStep) currentFormStep.classList.add('active');
    }

    updateSecurityForm() {
        // Обновление данных в форме
        const nameInput = document.getElementById('securityName');
        const phoneInput = document.getElementById('securityPhone');
        const emailInput = document.getElementById('securityEmail');
        const categorySelect = document.getElementById('securityCategory');
        const descInput = document.getElementById('securityDescription');
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
        
        if (categorySelect && this.securityReport.data.category) {
            categorySelect.value = this.securityReport.data.category;
        }
        
        if (descInput && this.securityReport.data.description) {
            descInput.value = this.securityReport.data.description;
            document.getElementById('charCount').textContent = this.securityReport.data.description.length;
        }
        
        if (addressInput && this.securityReport.data.address) {
            addressInput.value = this.securityReport.data.address;
        }
        
        // Обновление предварительного просмотра
        if (this.securityReport.step === 5) {
            this.updateReviewPreview();
        }
    }

    updateSecurityNavigation() {
        const prevBtn = document.getElementById('prevStep');
        const nextBtn = document.getElementById('nextStep');
        const submitBtn = document.getElementById('submitReport');
        const stepIndicator = document.getElementById('currentStep');
        
        if (stepIndicator) {
            stepIndicator.textContent = this.securityReport.step;
        }
        
        if (prevBtn) {
            prevBtn.style.display = this.securityReport.step > 1 ? 'flex' : 'none';
        }
        
        if (nextBtn) {
            nextBtn.style.display = this.securityReport.step < 5 ? 'flex' : 'none';
        }
        
        if (submitBtn) {
            submitBtn.style.display = this.securityReport.step === 5 ? 'flex' : 'none';
        }
    }

    updateReviewPreview() {
        // Контакты
        const contactsHTML = `
            <p><strong>Имя:</strong> ${this.securityReport.data.name}</p>
            <p><strong>Телефон:</strong> ${this.securityReport.data.phone}</p>
            ${this.securityReport.data.email ? `<p><strong>Email:</strong> ${this.securityReport.data.email}</p>` : ''}
        `;
        document.getElementById('reviewContacts').innerHTML = contactsHTML;
        
        // Описание
        const categoryNames = {
            suspicious_object: 'Подозрительный предмет',
            suspicious_activity: 'Подозрительная активность',
            dangerous_situation: 'Опасная ситуация',
            other: 'Другое'
        };
        
        const descriptionHTML = `
            <p><strong>Категория:</strong> ${categoryNames[this.securityReport.data.category] || this.securityReport.data.category}</p>
            <p><strong>Описание:</strong> ${this.securityReport.data.description}</p>
        `;
        document.getElementById('reviewDescription').innerHTML = descriptionHTML;
        
        // Местоположение
        const locationHTML = this.securityReport.data.address ? 
            `<p>${this.securityReport.data.address}</p>` :
            `<p>Координаты: ${this.securityReport.data.location?.lat?.toFixed(6)}, ${this.securityReport.data.location?.lon?.toFixed(6)}</p>`;
        document.getElementById('reviewLocation').innerHTML = locationHTML;
        
        // Медиа
        const mediaCount = this.securityReport.data.mediaFiles.length;
        const mediaHTML = mediaCount > 0 ? 
            `<p>Добавлено файлов: ${mediaCount}</p>` :
            '<p>Файлы не добавлены</p>';
        document.getElementById('reviewMedia').innerHTML = mediaHTML;
    }

    async submitSecurityReport() {
        try {
            // Валидация
            if (!this.validateStep(5)) {
                return;
            }
            
            // Показать индикатор загрузки
            const submitBtn = document.getElementById('submitReport');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';
            submitBtn.disabled = true;
            
            // Сбор данных
            const reportData = {
                ...this.securityReport.data,
                userId: this.currentUser.id,
                userName: this.currentUser.firstName,
                userPhone: this.securityReport.data.phone,
                userEmail: this.securityReport.data.email,
                timestamp: new Date().toISOString()
            };
            
            // Сохранение отчета
            const saved = await AppData.saveReport(reportData, 'security');
            
            if (saved) {
                // Отправка email
                if (window.EmailService) {
                    await window.EmailService.sendNotification('security', reportData);
                }
                
                // Успешное уведомление
                this.showNotification('Отчет успешно отправлен! Спасибо за вашу бдительность.', 'success');
                this.hapticFeedback('success');
                
                // Сброс формы
                setTimeout(() => {
                    this.initSecurityForm();
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }, 1500);
            } else {
                throw new Error('Ошибка сохранения отчета');
            }
            
        } catch (error) {
            console.error('❌ Ошибка отправки отчета:', error);
            this.showNotification('Ошибка отправки отчета. Попробуйте позже.', 'error');
            
            // Восстановление кнопки
            const submitBtn = document.getElementById('submitReport');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> <span>Отправить отчет</span>';
                submitBtn.disabled = false;
            }
        }
    }

    // === Wi-Fi ФУНКЦИОНАЛ ===
    loadWifiData() {
        const points = AppData.wifiPoints;
        
        // Отображение точек
        this.displayWifiPoints(points);
        
        // Заполнение выпадающих списков
        this.populateWifiSelects();
    }

    displayWifiPoints(points) {
        const container = document.getElementById('wifiResults');
        const countElement = document.getElementById('wifiCount');
        const emptyState = document.getElementById('wifiEmpty');
        const loadingSpinner = document.getElementById('wifiLoading');
        
        if (loadingSpinner) {
            loadingSpinner.style.display = 'none';
        }
        
        if (!container) return;
        
        if (points.length === 0) {
            container.innerHTML = '';
            if (countElement) countElement.textContent = '0';
            if (emptyState) emptyState.style.display = 'flex';
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        if (countElement) countElement.textContent = points.length;
        
        const pointsHTML = points.map(point => this.createWifiPointHTML(point)).join('');
        container.innerHTML = pointsHTML;
        
        // Добавление обработчиков кликов
        container.querySelectorAll('.wifi-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                this.showWifiInfo(points[index]);
            });
        });
    }

    createWifiPointHTML(point) {
        const distance = point.distance ? AppData.formatDistance(point.distance) : '';
        const typeEmoji = AppData.getTypeEmoji(point.type);
        const typeName = AppData.getTypeName(point.type);
        
        return `
            <div class="wifi-item" data-id="${point.id}">
                <div class="wifi-header">
                    <div class="wifi-name">${typeEmoji} ${point.name}</div>
                    ${distance ? `<div class="wifi-distance">${distance}</div>` : ''}
                </div>
                <div class="wifi-address">${point.address}</div>
                <div class="wifi-description">${point.description}</div>
                <div class="wifi-type">${typeName}</div>
            </div>
        `;
    }

    populateWifiSelects() {
        const problemSelect = document.getElementById('problemPoint');
        if (problemSelect) {
            // Сохраняем первый option
            const firstOption = problemSelect.options[0];
            problemSelect.innerHTML = '';
            problemSelect.appendChild(firstOption);
            
            // Добавляем точки
            AppData.wifiPoints.forEach(point => {
                const option = document.createElement('option');
                option.value = point.id;
                option.textContent = `${point.name} - ${point.address}`;
                problemSelect.appendChild(option);
            });
        }
    }

    searchWifiPoints(query) {
        const clearBtn = document.getElementById('clearSearch');
        const activeFilter = document.querySelector('.filter-tag.active')?.dataset.filter || 'all';
        
        if (clearBtn) {
            clearBtn.style.display = query ? 'flex' : 'none';
        }
        
        const results = AppData.searchWifiPoints(query, activeFilter);
        this.displayWifiPoints(results);
    }

    filterWifiPoints(filter) {
        // Обновление активного фильтра
        document.querySelectorAll('.filter-tag').forEach(tag => {
            tag.classList.remove('active');
        });
        
        const activeTag = document.querySelector(`[data-filter="${filter}"]`);
        if (activeTag) {
            activeTag.classList.add('active');
        }
        
        // Применение фильтра
        const query = document.getElementById('wifiSearch')?.value || '';
        const results = AppData.searchWifiPoints(query, filter);
        this.displayWifiPoints(results);
    }

    sortWifiPoints(criteria) {
        // Реализация сортировки
        // В этой версии используем базовую сортировку
    }

    async findNearbyWifi() {
        try {
            this.showNotification('Определяем ваше местоположение...', 'info');
            
            const position = await this.getCurrentPosition();
            const nearbyPoints = AppData.getNearbyPoints(
                position.coords.latitude,
                position.coords.longitude,
                10
            );
            
            this.displayWifiPoints(nearbyPoints);
            this.showNotification(`Найдено ${nearbyPoints.length} точек поблизости`, 'success');
            
        } catch (error) {
            console.error('❌ Ошибка геолокации:', error);
            this.showNotification('Не удалось определить местоположение', 'error');
        }
    }

    showWifiInfo(point) {
        if (!point) return;
        
        const modal = document.getElementById('wifiInfoModal');
        const overlay = document.getElementById('modalOverlay');
        const content = document.getElementById('wifiInfoContent');
        
        if (!modal || !content) return;
        
        // Заполнение информации
        const typeEmoji = AppData.getTypeEmoji(point.type);
        const typeName = AppData.getTypeName(point.type);
        const distance = point.distance ? AppData.formatDistance(point.distance) : '';
        
        content.innerHTML = `
            <div class="wifi-info-header">
                <div class="wifi-info-icon">
                    <i class="fas fa-wifi"></i>
                </div>
                <div class="wifi-info-title">
                    <h4>${typeEmoji} ${point.name}</h4>
                    <div class="wifi-info-type">${typeName}</div>
                </div>
            </div>
            
            <div class="wifi-info-details">
                <div class="info-item">
                    <div class="info-label">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>Адрес</span>
                    </div>
                    <div class="info-value">${point.address}</div>
                </div>
                
                <div class="info-item">
                    <div class="info-label">
                        <i class="fas fa-info-circle"></i>
                        <span>Описание</span>
                    </div>
                    <div class="info-value">${point.description}</div>
                </div>
                
                ${distance ? `
                <div class="info-item">
                    <div class="info-label">
                        <i class="fas fa-ruler"></i>
                        <span>Расстояние</span>
                    </div>
                    <div class="info-value">${distance}</div>
                </div>
                ` : ''}
                
                <div class="info-item">
                    <div class="info-label">
                        <i class="fas fa-map-pin"></i>
                        <span>Координаты</span>
                    </div>
                    <div class="info-value">
                        ${point.coordinates.lat.toFixed(6)}, ${point.coordinates.lon.toFixed(6)}
                    </div>
                </div>
            </div>
        `;
        
        // Сохраняем выбранную точку
        this.selectedWifiPoint = point;
        
        // Показываем модалку
        modal.style.display = 'block';
        overlay.style.display = 'block';
        
        // Блокируем скролл на заднем плане
        document.body.style.overflow = 'hidden';
        
        // Тактильная обратная связь
        this.hapticFeedback('light');
    }

    closeWifiInfoModal() {
        const modal = document.getElementById('wifiInfoModal');
        const overlay = document.getElementById('modalOverlay');
        
        if (modal) {
            modal.style.display = 'none';
        }
        
        if (overlay) {
            overlay.style.display = 'none';
        }
        
        // Разблокируем скролл
        document.body.style.overflow = '';
        
        this.selectedWifiPoint = null;
    }

    reportSelectedWifiProblem() {
        if (!this.selectedWifiPoint) return;
        
        // Переключаемся на вкладку "Проблема"
        this.switchWifiTab('problem');
        
        // Устанавливаем выбранную точку
        const problemSelect = document.getElementById('problemPoint');
        if (problemSelect) {
            problemSelect.value = this.selectedWifiPoint.id;
        }
        
        // Закрываем модалку
        this.closeWifiInfoModal();
        
        // Прокручиваем к форме
        setTimeout(() => {
            document.getElementById('tab-problem').scrollIntoView({ behavior: 'smooth' });
        }, 300);
    }

    showSelectedWifiOnMap() {
        if (!this.selectedWifiPoint) return;
        
        const url = `https://yandex.ru/maps/?pt=${this.selectedWifiPoint.coordinates.lon},${this.selectedWifiPoint.coordinates.lat}&z=17&l=map`;
        
        if (this.maxBridge?.openLink) {
            this.maxBridge.openLink(url);
        } else {
            window.open(url, '_blank');
        }
        
        this.closeWifiInfoModal();
        this.hapticFeedback('light');
    }

    async submitWifiProblem() {
        try {
            const pointId = document.getElementById('problemPoint')?.value;
            const problemType = document.getElementById('problemType')?.value;
            const description = document.getElementById('problemDescription')?.value.trim();
            
            if (!pointId) {
                this.showNotification('Выберите точку Wi-Fi', 'error');
                return;
            }
            
            if (!problemType) {
                this.showNotification('Выберите тип проблемы', 'error');
                return;
            }
            
            if (!description) {
                this.showNotification('Введите описание проблемы', 'error');
                return;
            }
            
            const point = AppData.wifiPoints.find(p => p.id == pointId);
            
            const reportData = {
                pointId: pointId,
                pointName: point?.name || 'Неизвестная точка',
                problemType: problemType,
                description: description,
                userId: this.currentUser.id,
                userName: this.currentUser.firstName,
                timestamp: new Date().toISOString()
            };
            
            // Сохранение отчета
            const saved = await AppData.saveReport(reportData, 'wifi');
            
            if (saved) {
                // Отправка email
                if (window.EmailService) {
                    await window.EmailService.sendNotification('wifi_problem', reportData);
                }
                
                // Успешное уведомление
                this.showNotification('Проблема с Wi-Fi отправлена! Спасибо за сообщение.', 'success');
                this.hapticFeedback('success');
                
                // Очистка формы
                document.getElementById('problemPoint').selectedIndex = 0;
                document.getElementById('problemType').selectedIndex = 0;
                document.getElementById('problemDescription').value = '';
            }
            
        } catch (error) {
            console.error('❌ Ошибка отправки проблемы Wi-Fi:', error);
            this.showNotification('Ошибка отправки. Попробуйте позже.', 'error');
        }
    }

    async submitWifiSuggestion() {
        try {
            const name = document.getElementById('newPointName')?.value.trim();
            const address = document.getElementById('newPointAddress')?.value.trim();
            const type = document.getElementById('newPointType')?.value;
            const description = document.getElementById('newPointDescription')?.value.trim();
            
            if (!name) {
                this.showNotification('Введите название точки', 'error');
                return;
            }
            
            if (!address) {
                this.showNotification('Введите адрес', 'error');
                return;
            }
            
            if (!type) {
                this.showNotification('Выберите тип точки', 'error');
                return;
            }
            
            const suggestionData = {
                name: name,
                address: address,
                type: type,
                description: description || '',
                userId: this.currentUser.id,
                userName: this.currentUser.firstName,
                timestamp: new Date().toISOString()
            };
            
            // Сохранение предложения
            const saved = await AppData.saveReport(suggestionData, 'wifi_suggestion');
            
            if (saved) {
                // Отправка email
                if (window.EmailService) {
                    await window.EmailService.sendNotification('wifi_suggestion', suggestionData);
                }
                
                // Успешное уведомление
                this.showNotification('Предложение новой точки отправлено! Спасибо за помощь.', 'success');
                this.hapticFeedback('success');
                
                // Очистка формы
                document.getElementById('newPointName').value = '';
                document.getElementById('newPointAddress').value = '';
                document.getElementById('newPointType').selectedIndex = 0;
                document.getElementById('newPointDescription').value = '';
            }
            
        } catch (error) {
            console.error('❌ Ошибка отправки предложения:', error);
            this.showNotification('Ошибка отправки. Попробуйте позже.', 'error');
        }
    }

    // === ГРАФФИТИ ===
    initGraffitiForm() {
        this.graffitiReport = {
            address: '',
            description: '',
            photos: []
        };
        
        const addressInput = document.getElementById('graffitiAddress');
        const descInput = document.getElementById('graffitiDescription');
        
        if (addressInput) addressInput.value = '';
        if (descInput) descInput.value = '';
        
        this.updateGraffitiPhotoPreview();
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
        this.hapticFeedback('light');
    }

    updateGraffitiPhotoPreview() {
        const container = document.getElementById('graffitiUploadGrid');
        if (!container) return;
        
        const photosHTML = this.graffitiReport.photos.map((file, index) => `
            <div class="upload-cell photo-preview">
                <img src="${URL.createObjectURL(file)}" alt="Граффити фото ${index + 1}">
                <button type="button" class="btn-remove-media" onclick="app.removeGraffitiPhoto(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
        
        const addButton = this.graffitiReport.photos.length < 3 ? `
            <div class="upload-cell add-cell" id="addGraffitiPhoto">
                <i class="fas fa-plus"></i>
                <span>Добавить фото</span>
            </div>
        ` : '';
        
        container.innerHTML = photosHTML + addButton;
        
        // Добавляем обработчик для кнопки добавления
        const addBtn = document.getElementById('addGraffitiPhoto');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                document.getElementById('graffitiPhotoInput').click();
            });
        }
    }

    removeGraffitiPhoto(index) {
        this.graffitiReport.photos.splice(index, 1);
        this.updateGraffitiPhotoPreview();
        this.hapticFeedback('light');
    }

    async submitGraffitiReport() {
        try {
            const address = document.getElementById('graffitiAddress')?.value.trim();
            const description = document.getElementById('graffitiDescription')?.value.trim();
            
            if (!address) {
                this.showNotification('Укажите местоположение граффити', 'error');
                return;
            }
            
            if (!description) {
                this.showNotification('Добавьте описание проблемы', 'error');
                return;
            }
            
            if (this.graffitiReport.photos.length === 0) {
                this.showNotification('Добавьте хотя бы одну фотографию', 'error');
                return;
            }
            
            const reportData = {
                address: address,
                description: description,
                photosCount: this.graffitiReport.photos.length,
                userId: this.currentUser.id,
                userName: this.currentUser.firstName,
                timestamp: new Date().toISOString()
            };
            
            // Сохранение отчета
            const saved = await AppData.saveReport(reportData, 'graffiti');
            
            if (saved) {
                // Отправка email
                if (window.EmailService) {
                    await window.EmailService.sendNotification('graffiti', reportData);
                }
                
                // Успешное уведомление
                this.showNotification('Отчет о граффити отправлен! Спасибо за помощь.', 'success');
                this.hapticFeedback('success');
                
                // Сброс формы
                this.initGraffitiForm();
            }
            
        } catch (error) {
            console.error('❌ Ошибка отправки отчета о граффити:', error);
            this.showNotification('Ошибка отправки. Попробуйте позже.', 'error');
        }
    }

    // === АДМИН-ПАНЕЛЬ ===
    checkAdminStatus() {
        const adminIds = AppData.ADMIN_USER_IDS;
        this.isAdmin = adminIds.includes(this.currentUser?.id?.toString());
        
        const adminNav = document.getElementById('navAdmin');
        if (adminNav && this.isAdmin) {
            adminNav.style.display = 'flex';
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
        
        // Загрузка данных вкладки
        switch(tab) {
            case 'dashboard':
                this.loadAdminDashboard();
                break;
            case 'security':
                this.loadReports('security');
                break;
            case 'wifi':
                this.loadReports('wifi');
                break;
            case 'graffiti':
                this.loadReports('graffiti');
                break;
            case 'settings':
                this.loadAdminSettings();
                break;
        }
        
        this.hapticFeedback('light');
    }

    async loadAdminDashboard() {
        try {
            // Загрузка статистики
            const securityReports = await AppData.getReports('security');
            const wifiReports = await AppData.getReports('wifi');
            const graffitiReports = await AppData.getReports('graffiti');
            
            const total = securityReports.length + wifiReports.length + graffitiReports.length;
            const pending = [...securityReports, ...wifiReports, ...graffitiReports]
                .filter(r => r.status === 'new').length;
            const completed = [...securityReports, ...wifiReports, ...graffitiReports]
                .filter(r => r.status === 'resolved').length;
            
            // Обновление статистики
            document.getElementById('totalReports').textContent = total;
            document.getElementById('pendingReports').textContent = pending;
            document.getElementById('completedReports').textContent = completed;
            document.getElementById('activeUsers').textContent = '25'; // Заглушка
            
            // Обновление графиков
            this.updateCharts(securityReports, wifiReports, graffitiReports);
            
        } catch (error) {
            console.error('❌ Ошибка загрузки статистики:', error);
        }
    }

    updateCharts(securityReports, wifiReports, graffitiReports) {
        if (window.Chart) {
            const ctx = document.getElementById('reportsChart');
            if (ctx) {
                new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Безопасность', 'Wi-Fi', 'Граффити'],
                        datasets: [{
                            data: [securityReports.length, wifiReports.length, graffitiReports.length],
                            backgroundColor: ['#007AFF', '#34C759', '#FF9500'],
                            borderWidth: 2,
                            borderColor: 'var(--bg-card)'
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    color: 'var(--text-primary)',
                                    padding: 20
                                }
                            }
                        }
                    }
                });
            }
        }
    }

    async loadReports(type) {
        try {
            const reports = await AppData.getReports(type);
            const container = document.getElementById(`${type}ReportsList`);
            
            if (container) {
                container.innerHTML = reports.map(report => this.createReportCard(report, type)).join('');
            }
            
        } catch (error) {
            console.error(`❌ Ошибка загрузки отчетов ${type}:`, error);
        }
    }

    createReportCard(report, type) {
        const typeIcons = {
            security: 'fas fa-shield-alt',
            wifi: 'fas fa-wifi',
            graffiti: 'fas fa-spray-can'
        };
        
        const typeColors = {
            security: '#007AFF',
            wifi: '#34C759',
            graffiti: '#FF9500'
        };
        
        const statusBadges = {
            new: '<span class="status-badge status-new">Новый</span>',
            in_progress: '<span class="status-badge status-in-progress">В работе</span>',
            resolved: '<span class="status-badge status-resolved">Решено</span>',
            rejected: '<span class="status-badge status-rejected">Отклонено</span>'
        };
        
        return `
            <div class="report-item">
                <div class="report-header">
                    <div class="report-title">
                        <h4>${report.pointName || report.address || 'Без названия'}</h4>
                        <div class="report-meta">
                            <span>ID: ${report.id}</span>
                            <span>${new Date(report.timestamp).toLocaleString('ru-RU')}</span>
                        </div>
                    </div>
                    <div class="report-status">
                        ${statusBadges[report.status] || ''}
                    </div>
                </div>
                <div class="report-body">
                    <p>${report.description || 'Нет описания'}</p>
                    <div class="report-details">
                        <div class="detail">
                            <i class="fas fa-user"></i>
                            <span>${report.userName || 'Аноним'}</span>
                        </div>
                        ${report.userPhone ? `
                        <div class="detail">
                            <i class="fas fa-phone"></i>
                            <span>${report.userPhone}</span>
                        </div>
                        ` : ''}
                        ${report.address ? `
                        <div class="detail">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${report.address}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                <div class="report-actions">
                    <button class="btn btn-sm" onclick="app.resolveReport('${report.id}', '${type}')">
                        <i class="fas fa-check"></i> Решено
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="app.rejectReport('${report.id}', '${type}')">
                        <i class="fas fa-times"></i> Отклонить
                    </button>
                </div>
            </div>
        `;
    }

    async resolveReport(reportId, type) {
        // В реальном приложении здесь была бы логика обновления статуса
        this.showNotification('Отчет помечен как решенный', 'success');
        this.hapticFeedback('success');
        
        // Перезагрузка отчетов
        setTimeout(() => {
            this.loadReports(type);
        }, 500);
    }

    async rejectReport(reportId, type) {
        // В реальном приложении здесь была бы логика отклонения отчета
        this.showNotification('Отчет отклонен', 'info');
        this.hapticFeedback('light');
        
        // Перезагрузка отчетов
        setTimeout(() => {
            this.loadReports(type);
        }, 500);
    }

    async exportReports(type) {
        try {
            const reports = await AppData.getReports(type);
            const csv = this.convertToCSV(reports);
            
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            
            link.href = url;
            link.download = `sevastopol-${type}-reports-${new Date().toISOString().split('T')[0]}.csv`;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
            
            this.showNotification('Данные экспортированы', 'success');
            this.hapticFeedback('success');
            
        } catch (error) {
            console.error('❌ Ошибка экспорта данных:', error);
            this.showNotification('Ошибка экспорта данных', 'error');
        }
    }

    convertToCSV(data) {
        if (data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const rows = data.map(item => 
            headers.map(header => {
                const value = item[header];
                if (typeof value === 'object') {
                    return JSON.stringify(value);
                }
                return `"${String(value).replace(/"/g, '""')}"`;
            }).join(',')
        );
        
        return [headers.join(','), ...rows].join('\n');
    }

    loadAdminSettings() {
        const emails = window.EmailService?.getAdminEmails() || {};
        
        const securityEmail = document.getElementById('emailSecurity');
        const wifiEmail = document.getElementById('emailWifi');
        const graffitiEmail = document.getElementById('emailGraffiti');
        
        if (securityEmail) securityEmail.value = emails.security || '';
        if (wifiEmail) wifiEmail.value = emails.wifi || '';
        if (graffitiEmail) graffitiEmail.value = emails.graffiti || '';
    }

    saveAdminEmail(type) {
        const inputId = `email${type.charAt(0).toUpperCase() + type.slice(1)}`;
        const input = document.getElementById(inputId);
        
        if (!input || !window.EmailService) return;
        
        const email = input.value.trim();
        
        if (email && AppData.validateEmail(email)) {
            window.EmailService.updateAdminEmail(type, email);
            this.showNotification(`Email для ${type} сохранен`, 'success');
            this.hapticFeedback('success');
        } else {
            this.showNotification('Введите корректный email', 'error');
        }
    }

    // === УТИЛИТЫ ===
    async useMaxName() {
        if (!this.maxBridge?.initDataUnsafe?.user?.first_name) {
            this.showNotification('Имя из MAX недоступно', 'warning');
            return;
        }
        
        const name = this.maxBridge.initDataUnsafe.user.first_name;
        const nameInput = document.getElementById('securityName');
        
        if (nameInput) {
            nameInput.value = name;
            this.securityReport.data.name = name;
            this.showNotification('Имя получено из MAX', 'success');
            this.hapticFeedback('success');
        }
    }

    async useMaxPhone() {
        if (!this.maxBridge?.requestContact) {
            this.showNotification('Функция запроса телефона не доступна', 'warning');
            return;
        }
        
        try {
            this.showNotification('Запрашиваем номер телефона...', 'info');
            
            const phone = await this.maxBridge.requestContact();
            
            if (phone) {
                const formattedPhone = AppData.formatPhoneNumber(phone);
                const phoneInput = document.getElementById('securityPhone');
                
                if (phoneInput) {
                    phoneInput.value = formattedPhone;
                    this.securityReport.data.phone = phone;
                    this.showNotification('Номер телефона получен из MAX', 'success');
                    this.hapticFeedback('success');
                }
            }
            
        } catch (error) {
            console.error('❌ Ошибка запроса телефона:', error);
            this.showNotification('Ошибка запроса телефона', 'error');
        }
    }

    async useCurrentLocation() {
        try {
            this.showNotification('Определяем ваше местоположение...', 'info');
            
            const position = await this.getCurrentPosition();
            this.securityReport.data.location = {
                lat: position.coords.latitude,
                lon: position.coords.longitude
            };
            this.securityReport.data.address = `Геолокация: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
            
            this.showLocationPreview(this.securityReport.data.address);
            this.showNotification('Местоположение получено', 'success');
            this.hapticFeedback('success');
            
        } catch (error) {
            console.error('❌ Ошибка геолокации:', error);
            this.showNotification('Не удалось определить местоположение', 'error');
        }
    }

    useManualLocation() {
        const addressGroup = document.getElementById('addressInputGroup');
        if (addressGroup) {
            addressGroup.style.display = 'block';
        }
        
        // Активируем кнопку
        document.querySelectorAll('.location-option').forEach(option => {
            option.classList.remove('active');
        });
        document.getElementById('useManualLocation').classList.add('active');
        
        // Фокусируемся на поле ввода
        setTimeout(() => {
            document.getElementById('manualAddress').focus();
        }, 100);
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

    showLocationPreview(address) {
        const preview = document.getElementById('locationPreview');
        const previewContent = document.getElementById('locationPreviewContent');
        
        if (preview && previewContent) {
            previewContent.textContent = address;
            preview.style.display = 'block';
        }
    }

    handleMediaUpload(files) {
        if (!files || files.length === 0) return;
        
        const maxFiles = 5;
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        Array.from(files).slice(0, maxFiles - this.securityReport.data.mediaFiles.length).forEach(file => {
            if (file.size > maxSize) {
                this.showNotification(`Файл ${file.name} слишком большой (>10MB)`, 'warning');
                return;
            }
            
            this.securityReport.data.mediaFiles.push(file);
        });
        
        this.updateMediaPreview();
        this.hapticFeedback('light');
    }

    updateMediaPreview() {
        const container = document.getElementById('mediaPreview');
        if (!container) return;
        
        container.innerHTML = this.securityReport.data.mediaFiles.map((file, index) => `
            <div class="media-preview-item">
                ${file.type.startsWith('image/') 
                    ? `<img src="${URL.createObjectURL(file)}" alt="Превью ${index + 1}">`
                    : `<div style="position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--bg-tertiary);color:var(--text-primary);">
                        <i class="fas fa-video fa-2x"></i>
                       </div>`
                }
                <button type="button" class="btn-remove-media" onclick="app.removeMediaFile(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }

    removeMediaFile(index) {
        this.securityReport.data.mediaFiles.splice(index, 1);
        this.updateMediaPreview();
        this.hapticFeedback('light');
    }

    highlightInvalidField(fieldId) {
        const field = document.getElementById(fieldId);
        if (!field) return;
        
        field.style.borderColor = 'var(--danger)';
        field.style.animation = 'shake 0.5s ease';
        
        setTimeout(() => {
            field.style.borderColor = '';
            field.style.animation = '';
        }, 500);
    }

    // === ЯНДЕКС КАРТЫ ===
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
        
        const modal = document.getElementById('locationModal');
        const overlay = document.getElementById('modalOverlay');
        
        if (modal && overlay) {
            modal.style.display = 'block';
            overlay.style.display = 'block';
            
            // Инициализация карты
            this.initLocationMap();
            
            // Блокируем скролл
            document.body.style.overflow = 'hidden';
        }
        
        this.hapticFeedback('medium');
    }

    initLocationMap() {
        if (typeof ymaps === 'undefined') return;
        
        ymaps.ready(() => {
            const mapContainer = document.getElementById('yandexMap');
            if (!mapContainer) return;
            
            // Очищаем контейнер
            mapContainer.innerHTML = '';
            
            // Центр по умолчанию - Севастополь
            const center = [44.6166, 33.5254];
            
            // Создаем карту
            this.yandexMap = new ymaps.Map('yandexMap', {
                center: center,
                zoom: 12,
                controls: ['zoomControl', 'fullscreenControl']
            });
            
            // Создаем маркер
            this.mapMarker = new ymaps.Placemark(center, {
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
                this.hapticFeedback('light');
            });
        });
    }

    confirmLocation() {
        if (this.selectedLocation) {
            const locationText = `${this.selectedLocation.lat.toFixed(6)}, ${this.selectedLocation.lon.toFixed(6)}`;
            
            if (this.locationContext === 'security') {
                this.securityReport.data.location = this.selectedLocation;
                this.securityReport.data.address = `Геолокация: ${locationText}`;
                this.showLocationPreview(this.securityReport.data.address);
                
                // Активируем кнопку карты
                document.querySelectorAll('.location-option').forEach(option => {
                    option.classList.remove('active');
                });
                document.getElementById('useMapLocation').classList.add('active');
                
            } else if (this.locationContext === 'graffiti') {
                const addressInput = document.getElementById('graffitiAddress');
                if (addressInput) {
                    addressInput.value = locationText;
                }
            }
            
            this.closeModal();
            this.showNotification('Местоположение выбрано', 'success');
            this.hapticFeedback('success');
        } else {
            this.showNotification('Выберите местоположение на карте', 'warning');
        }
    }

    closeModal() {
        const modal = document.getElementById('locationModal');
        const overlay = document.getElementById('modalOverlay');
        
        if (modal) {
            modal.style.display = 'none';
        }
        
        if (overlay) {
            overlay.style.display = 'none';
        }
        
        // Разблокируем скролл
        document.body.style.overflow = '';
        
        // Очищаем карту
        this.yandexMap = null;
        this.mapMarker = null;
        this.selectedLocation = null;
        
        this.hapticFeedback('light');
    }

    // === УВЕДОМЛЕНИЯ И ОБРАТНАЯ СВЯЗЬ ===
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
        
        // Автоматическое удаление
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

    makeEmergencyCall(number) {
        // Форматирование номера
        let formattedNumber = number.replace(/\D/g, '');
        
        if (formattedNumber.length <= 3) {
            // Короткие номера
            formattedNumber = formattedNumber;
        } else if (formattedNumber.length === 10) {
            formattedNumber = `+7${formattedNumber}`;
        } else if (formattedNumber.startsWith('7')) {
            formattedNumber = `+${formattedNumber}`;
        } else if (formattedNumber.startsWith('8')) {
            formattedNumber = `+7${formattedNumber.substring(1)}`;
        }
        
        const telUrl = `tel:${formattedNumber}`;
        
        // Используем MAX Bridge если доступно
        if (this.maxBridge?.openLink) {
            try {
                this.maxBridge.openLink(telUrl);
            } catch (error) {
                console.error('❌ Ошибка вызова:', error);
                this.showNotification(`Не удалось совершить вызов ${number}`, 'error');
            }
        } else {
            // Стандартный способ
            const link = document.createElement('a');
            link.href = telUrl;
            link.style.display = 'none';
            document.body.appendChild(link);
            
            try {
                link.click();
            } catch (error) {
                console.error('❌ Ошибка вызова:', error);
                this.showNotification(`Не удалось совершить вызов ${number}`, 'error');
            }
            
            setTimeout(() => {
                document.body.removeChild(link);
            }, 100);
        }
        
        this.hapticFeedback('heavy');
    }

    handleStartParam(param) {
        if (!param) return;
        
        console.log('🔗 Обработка стартового параметра:', param);
        
        const sections = ['wifi', 'security', 'graffiti', 'contacts', 'admin'];
        
        if (sections.includes(param)) {
            this.switchSection(param);
            this.showNotification(`Открыт раздел: ${this.getSectionName(param)}`, 'info');
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

    initForms() {
        // Инициализация всех форм
        this.initSecurityForm();
        this.initGraffitiForm();
    }
}

// Инициализация приложения
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new SafeSevastopol();
    window.app = app;
    
    // Скрытие прелоадера
    setTimeout(() => {
        const preloader = document.getElementById('preloader');
        if (preloader) {
            preloader.classList.add('fade-out');
            setTimeout(() => {
                preloader.style.display = 'none';
            }, 300);
        }
    }, 1000);
});

// Глобальные методы для вызова из HTML
window.appMethods = {
    removeGraffitiPhoto: (index) => window.app?.removeGraffitiPhoto(index),
    removeMediaFile: (index) => window.app?.removeMediaFile(index),
    resolveReport: (reportId, type) => window.app?.resolveReport(reportId, type),
    rejectReport: (reportId, type) => window.app?.rejectReport(reportId, type)
};
