/* max-config.js
   Центральный конфиг мини-приложения MAX
   Используется:
   - app.js
   - email-service.js
   - admin-panel.js
*/

(() => {
  "use strict";

   window.ADMIN_USER_IDS = [
     "13897373",
     "90334880"
   ];
   
   /**
    * (опционально, но рекомендую)
    * Разделение админов по секциям.
    * Если секцию не указать — доступ берется из ADMIN_USER_IDS.
    */
   window.ADMIN_ACCESS = {
     security: ["13897373", "90334880"],
     wifi: ["13897373", "90334880"],
     graffiti: ["13897373", "90334880"]
   };

  /**
   * Основной конфиг приложения
   */
  window.AppConfig = {
    appName: "Городской помощник",

    /**
     * Email / backend
     * endpoint — ваш сервер, который реально отправляет почту
     * (Node, Python, PHP — не важно)
     */
    email: {
      endpoint: "https://YOUR-DOMAIN.RU/api/send-email",

      /**
       * Необязательно.
       * Если сервер ожидает публичный ключ клиента
       */
      apiKey: "",

      /**
       * Email'ы по умолчанию (если админ не переопределил в админке)
       */
      adminEmails: {
        security: "security@your-domain.ru",
        wifi: "wifi@your-domain.ru",
        graffiti: "graffiti@your-domain.ru"
      }
    },

    /**
     * Поведение UI
     */
    ui: {
      /**
       * Максимальная длина текста в формах
       */
      maxDescriptionLength: 1000,

      /**
       * Использовать haptic feedback (если доступно)
       */
      haptics: true,

      /**
       * Использовать подтверждение перед отправкой
       */
      confirmBeforeSend: true
    },

    /**
     * Wi-Fi
     */
    wifi: {
      /**
       * Максимальное расстояние (в метрах) для "НАЙТИ БЛИЖАЙШИЕ"
       */
      nearestRadius: 1500,

      /**
       * Максимум точек в списке
       */
      maxResults: 20
    },

    /**
     * Безопасность
     */
    security: {
      /**
       * Требовать телефон обязательно
       */
      phoneRequired: true,

      /**
       * Email необязателен
       */
      emailOptional: true
    },

    /**
     * Карты (Яндекс)
     * Используется в:
     *  - Безопасности
     *  - Wi-Fi → Найти ближайшие
     */
    maps: {
      provider: "yandex",

      /**
       * API ключ Яндекс.Карт (Web)
       * https://developer.tech.yandex.ru/
       */
      apiKey: "YANDEX_MAPS_API_KEY",

      /**
       * Начальная точка (если геолокация недоступна)
       */
      defaultCenter: {
        lat: 44.61665,
        lon: 33.52536
      },

      zoom: 14
    },

    /**
     * Хранилище
     */
    storage: {
      /**
       * Ключи localStorage
       */
      keys: {
        security: "reports_security",
        wifi: "reports_wifi",
        graffiti: "reports_graffiti"
      }
    }
  };

  /**
   * Обратная совместимость
   * (если где-то используется MaxConfig)
   */
  window.MaxConfig = window.AppConfig;
})();
