import { getBrowser } from './libs/utils';

chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason !== 'install' && details.reason !== 'update') return;

  if (details.reason === 'install' && getBrowser() === 'Firefox') {
    chrome.runtime.openOptionsPage();
  }
});

chrome.action.onClicked.addListener(function () {
  chrome.runtime.openOptionsPage();
});
