/**
 * max-config.js
 * Конфигурация интеграции MAX Mini App (объект AppData и параметры окружения WebApp).
 */

(() => {
  "use strict";

   window.ADMIN_USER_IDS = [
     "13897373",
     "90334880"
   ];
   
   
   window.ADMIN_ACCESS = {
     security: ["13897373", "90334880"],
     wifi: ["13897373", "90334880"],
     graffiti: ["13897373", "90334880"]
   };

  
  window.AppConfig = {
    appName: "Городской помощник",

    
    email: {
      endpoint: "https://YOUR-DOMAIN.RU/api/send-email",

      
      apiKey: "",

      
      adminEmails: {
        security: "security@your-domain.ru",
        wifi: "wifi@your-domain.ru",
        graffiti: "graffiti@your-domain.ru"
      }
    },

    
    ui: {
      
      maxDescriptionLength: 1000,

      
      haptics: true,

      
      confirmBeforeSend: true
    },

    
    wifi: {
      
      nearestRadius: 1500,

      
      maxResults: 20
    },

    
    security: {
      
      phoneRequired: true,

      
      emailOptional: true
    },

    
    maps: {
      provider: "yandex",

      
      apiKey: "YANDEX_MAPS_API_KEY",

      
      defaultCenter: {
        lat: 44.61665,
        lon: 33.52536
      },

      zoom: 14
    },

    
    storage: {
      
      keys: {
        security: "reports_security",
        wifi: "reports_wifi",
        graffiti: "reports_graffiti"
      }
    }
  };

  
  window.MaxConfig = window.AppConfig;
})();

window.AppConfig = window.AppConfig || {};
window.AppConfig.api = window.AppConfig.api || {};

window.AppConfig.api.baseUrl = "https://YOUR-BOT-DOMAIN-OR-IP:3001";
window.AppConfig.api.appApiKey = "";

window.AppConfig.api.adminToken = "change_me_very_secret";
