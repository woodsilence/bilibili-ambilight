const browsersUAList = [
  { ua: 'Firefox', name: 'Firefox' },
  { ua: 'OPR', name: 'Opera' },
  { ua: 'Edg', name: 'Edge' },
  { ua: 'Chrome', name: 'Chrome' },
];

export const getBrowser = () => {
  try {
    const ua = globalThis.navigator.userAgent;
    const browser = browsersUAList.find(
      (browser) => ua.indexOf(browser.ua) >= 0
    );
    return browser ? browser.name : '';
  } catch {
    return null;
  }
};

export const getVersion = () => {
  try {
    return (chrome.runtime.getManifest() || {}).version;
  } catch {
    return null;
  }
};

export const getFeedbackFormLink = () => {
  return 'https://github.com/woodsilence/bilibili-ambilight/issues';
};

export const getPrivacyPolicyLink = () => {
  return 'https://github.com/woodsilence/bilibili-ambilight#privacy--security';
};
