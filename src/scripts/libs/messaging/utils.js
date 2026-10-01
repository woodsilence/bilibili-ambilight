export const origin = 'https://www.bilibili.com';
export const extensionId = 'bilibili-ambilight-extension';

export const isSameWindowMessage = (event) =>
  event.source === window &&
  (event.origin === origin ||
    event.origin === location.origin ||
    event.origin.includes('bilibili.com'));

