import { storage } from './libs/storage';

const DEFAULT_SETTINGS = {
  enabled: true,
  spread: 17,
  blur2: 30,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  vibrance: 100,
  webGL: true,
  framerateLimit: 60,
  resolution: 100,
  detectHorizontalBarSizeEnabled: true,
  detectVerticalBarSizeEnabled: true,
};

const settingKeys = Object.keys(DEFAULT_SETTINGS);

const isValidSettingValue = (key, val) => {
  if (val === undefined || val === null || val === '') return false;
  if (typeof DEFAULT_SETTINGS[key] === 'boolean') {
    return typeof val === 'boolean' || val === 'true' || val === 'false';
  }
  if (typeof DEFAULT_SETTINGS[key] === 'number') {
    const num = Number(val);
    return !Number.isNaN(num) && Number.isFinite(num);
  }
  return true;
};

const getSettingOrDefault = (key, val) => {
  if (!isValidSettingValue(key, val)) {
    return DEFAULT_SETTINGS[key];
  }
  if (typeof DEFAULT_SETTINGS[key] === 'boolean') {
    return val === true || val === 'true';
  }
  if (typeof DEFAULT_SETTINGS[key] === 'number') {
    return Number(val);
  }
  return val;
};

const showToast = (message) => {
  const toast = document.querySelector('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
};

const updateSliderFill = (slider) => {
  if (!slider || slider.type !== 'range') return;
  const min = Number(slider.min) || 0;
  const max = Number(slider.max) || 100;
  const rawVal = Number(slider.value);
  const val = Number.isNaN(rawVal) ? min : rawVal;
  const percent = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
  slider.style.setProperty('--fill-percent', `${percent}%`);
};

const updateBadge = (key, value) => {
  const badge = document.querySelector(`#val-${key}`);
  if (!badge) return;
  const safeVal = getSettingOrDefault(key, value);
  if (key === 'framerateLimit') {
    badge.textContent = safeVal === 0 ? '无限制' : `${safeVal} FPS`;
  } else {
    badge.textContent = `${safeVal}%`;
  }
};

const applyValuesToUI = (settings) => {
  for (const key of settingKeys) {
    const rawVal = settings ? settings[key] : undefined;
    const val = getSettingOrDefault(key, rawVal);
    const elem = document.querySelector(`#setting-${key}`);
    if (!elem) continue;

    if (elem.type === 'checkbox') {
      elem.checked = Boolean(val);
    } else {
      elem.value = val;
      updateBadge(key, val);
      if (elem.type === 'range') {
        updateSliderFill(elem);
      }
    }
  }
};

const saveSetting = async (key, val) => {
  const safeVal = getSettingOrDefault(key, val);
  await storage.set(`setting-${key}`, safeVal);
};

const initTabs = () => {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      tabBtns.forEach((b) => b.classList.toggle('active', b === btn));
      tabPanels.forEach((panel) => {
        panel.classList.toggle('active', panel.id === `tab-${targetTab}`);
      });
    });
  });
};

const initEventListeners = () => {
  for (const key of settingKeys) {
    const elem = document.querySelector(`#setting-${key}`);
    if (!elem) continue;

    if (elem.type === 'checkbox') {
      elem.addEventListener('change', () => {
        saveSetting(key, elem.checked);
      });
    } else if (elem.tagName === 'SELECT') {
      elem.addEventListener('change', () => {
        const val = Number(elem.value);
        updateBadge(key, val);
        saveSetting(key, val);
      });
    } else if (elem.type === 'range') {
      elem.addEventListener('input', () => {
        const val = Number(elem.value);
        updateBadge(key, val);
        updateSliderFill(elem);
        saveSetting(key, val);
      });
    }
  }

  // Reset defaults
  const resetBtn = document.querySelector('#resetDefaultsBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      applyValuesToUI(DEFAULT_SETTINGS);
      for (const [key, val] of Object.entries(DEFAULT_SETTINGS)) {
        await storage.set(`setting-${key}`, val);
      }
      showToast('已恢复默认预设设置');
    });
  }

  // Export settings
  const exportBtn = document.querySelector('#exportSettingsBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      const exportData = {};
      for (const key of settingKeys) {
        const rawVal = await storage.get(`setting-${key}`);
        exportData[key] = getSettingOrDefault(key, rawVal);
      }
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bilibili-ambilight-settings.json';
      a.click();
      URL.revokeObjectURL(url);
      showToast('配置导出成功');
    });
  }

  // Import settings
  const importBtn = document.querySelector('#importSettingsBtn');
  const importInput = document.querySelector('#importFileInput');
  if (importBtn && importInput) {
    importBtn.addEventListener('click', () => {
      importInput.click();
    });

    importInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const imported = JSON.parse(reader.result);
          const sanitized = {};
          for (const key of settingKeys) {
            const val = getSettingOrDefault(key, imported[key]);
            sanitized[key] = val;
            await storage.set(`setting-${key}`, val);
          }
          applyValuesToUI(sanitized);
          showToast('配置导入成功');
        } catch {
          alert('导入配置文件格式错误！');
        }
      };
      reader.readAsText(file);
    });
  }
};

(async function initOptions() {
  initTabs();

  // 1. Immediately apply hardcoded defaults so UI has zero blank/null fields
  applyValuesToUI(DEFAULT_SETTINGS);

  // 2. Load stored settings and validate every field against defaults
  const currentSettings = {};
  for (const key of settingKeys) {
    const rawVal = await storage.get(`setting-${key}`);
    const val = getSettingOrDefault(key, rawVal);
    currentSettings[key] = val;

    // Persist default if missing or null in storage
    if (rawVal == null) {
      await storage.set(`setting-${key}`, val);
    }
  }

  applyValuesToUI(currentSettings);
  initEventListeners();
})();
