const { translator } = require('./translation');

class MultiLanguageUI {
  constructor() {
    this.translations = {};
    this.currentLang = 'zh';
  }

  init(translations) {
    this.translations = translations;
  }

  setLanguage(lang) {
    this.currentLang = lang;
  }

  t(key) {
    const translation = this.translations[this.currentLang]?.[key];
    return translation || key;
  }

  async translateUI(elements) {
    const translated = {};
    
    for (const [key, element] of Object.entries(elements)) {
      if (typeof element === 'string') {
        translated[key] = await translator.translate(element, 'auto', this.currentLang);
      } else if (typeof element === 'object') {
        translated[key] = {};
        for (const [subKey, text] of Object.entries(element)) {
          translated[key][subKey] = await translator.translate(text, 'auto', this.currentLang);
        }
      }
    }
    
    return translated;
  }
}

const defaultTranslations = {
  zh: {
    'app.name': 'AIArmy智能系统',
    'nav.dashboard': '仪表板',
    'nav.employees': '员工管理',
    'nav.finance': '财务管理',
    'nav.orders': '订单管理',
    'nav.customers': '客户管理',
    'nav.products': '产品管理',
    'nav.settings': '设置',
    'button.submit': '提交',
    'button.cancel': '取消',
    'button.confirm': '确认',
    'button.save': '保存',
    'button.delete': '删除',
    'status.online': '在线',
    'status.offline': '离线',
    'status.working': '工作中',
    'status.idle': '空闲',
    'alert.critical': '紧急',
    'alert.warning': '警告',
    'alert.info': '信息'
  },
  en: {
    'app.name': 'AIArmy System',
    'nav.dashboard': 'Dashboard',
    'nav.employees': 'Employees',
    'nav.finance': 'Finance',
    'nav.orders': 'Orders',
    'nav.customers': 'Customers',
    'nav.products': 'Products',
    'nav.settings': 'Settings',
    'button.submit': 'Submit',
    'button.cancel': 'Cancel',
    'button.confirm': 'Confirm',
    'button.save': 'Save',
    'button.delete': 'Delete',
    'status.online': 'Online',
    'status.offline': 'Offline',
    'status.working': 'Working',
    'status.idle': 'Idle',
    'alert.critical': 'Critical',
    'alert.warning': 'Warning',
    'alert.info': 'Info'
  }
};

const multiLang = new MultiLanguageUI();
multiLang.init(defaultTranslations);

module.exports = { MultiLanguageUI, multiLang, defaultTranslations };