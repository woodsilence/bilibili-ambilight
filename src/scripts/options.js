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

const updateBadge = (key, value) => {
  const badge = document.querySelector(`#val-${key}`);
  if (!badge) return;
  if (key === 'framerateLimit') {
    badge.textContent = value === 0 ? '无限制' : `${value} FPS`;
  } else {
    badge.textContent = `${value}%`;
  }
};

const applyValuesToUI = (settings) => {
  for (const key of settingKeys) {
    const val = settings[key] !== undefined ? settings[key] : DEFAULT_SETTINGS[key];
    const elem = document.querySelector(`#setting-${key}`);
    if (!elem) continue;

    if (elem.type === 'checkbox') {
      elem.checked = Boolean(val);
    } else {
      elem.value = val;
      updateBadge(key, val);
    }
  }
};

const saveSetting = async (key, val) => {
  await storage.set(`setting-${key}`, val);
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
    });
  }

  // Export settings
  const exportBtn = document.querySelector('#exportSettingsBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      const exportData = {};
      for (const key of settingKeys) {
        const val = await storage.get(`setting-${key}`);
        exportData[key] = val !== undefined ? val : DEFAULT_SETTINGS[key];
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
          applyValuesToUI(imported);
          for (const key of settingKeys) {
            if (imported[key] !== undefined) {
              await storage.set(`setting-${key}`, imported[key]);
            }
          }
        } catch {
          alert('导入配置文件格式错误！');
        }
      };
      reader.readAsText(file);
    });
  }
};

(async function initOptions() {
  const currentSettings = {};
  for (const key of settingKeys) {
    const val = await storage.get(`setting-${key}`);
    currentSettings[key] = val !== undefined ? val : DEFAULT_SETTINGS[key];
  }
  applyValuesToUI(currentSettings);
  initEventListeners();
})();
