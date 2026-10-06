import {
  wrapErrorHandler,
  isWatchPageUrl,
  setErrorHandler,
  setWarning,
} from './libs/generic';
import { ErrorEvents } from './libs/errors/events';
import SentryReporter, {
  setVersion,
  setCrashOptions,
} from './libs/errors/sentry-reporter';
import Ambientlight from './libs/ambientlight';
import Settings from './libs/settings';
import { contentScript } from './libs/messaging/content';
import { getVersion } from './libs/utils';
import { defaultCrashOptions, storage } from './libs/storage';

setErrorHandler((ex) => SentryReporter.captureException(ex));

wrapErrorHandler(async function initVersionAndCrashOptions() {
  const version = getVersion();
  setVersion(version);
  const crashOptions =
    (await storage.get('crashOptions')) || defaultCrashOptions;
  setCrashOptions(crashOptions);
  contentScript.addMessageListener('crashOptions', (newCrashOptions) => {
    setCrashOptions(newCrashOptions);
  });

  storage.addListener(function storageListener(changes) {
    if (!changes.crashOptions?.newValue) return;

    const crashOptions = changes.crashOptions.newValue;
    setCrashOptions(crashOptions);
  });
})();

let errorEvents;
wrapErrorHandler(function initErrorEvents() {
  errorEvents = new ErrorEvents();
})();

const detectDetachedVideo = () => {
  const observer = new MutationObserver(
    wrapErrorHandler(function detectDetachedVideo() {
      if (!isWatchPageUrl()) return;

      const videoElem = ambientlight.videoElem;
      const ytdAppElem = ambientlight.ytdAppElem ?? document.body;

      const isDetached =
        !videoElem ||
        !ytdAppElem?.contains(videoElem) ||
        !document.contains(ytdAppElem);
      if (!isDetached) {
        if (errorEvents.list.length) {
          errorEvents.list = [];
        }
        return;
      }

      if (!document.querySelector('video')) return;

      const newVideoElem =
        document.querySelector('.bpx-player-video-wrap video') ||
        document.querySelector('.bpx-player-container video') ||
        document.querySelector('#bilibili-player video') ||
        document.querySelector('.bilibili-player-video video') ||
        document.querySelector('#playerWrap video') ||
        document.querySelector('video');
      if (!newVideoElem) {
        return;
      }

      if (videoElem !== newVideoElem) {
        ambientlight.initVideoElem(newVideoElem);
      }

      ambientlight.start();

      if (errorEvents.list.length) {
        errorEvents.list = [];
      }
    }, true)
  );

  observer.observe(document, {
    attributes: false,
    attributeOldValue: false,
    characterData: false,
    characterDataOldValue: false,
    childList: true,
    subtree: true,
  });
};

const findVideoElem = () => {
  return (
    document.querySelector('.bpx-player-video-wrap video') ||
    document.querySelector('.bpx-player-container video') ||
    document.querySelector('#bilibili-player video') ||
    document.querySelector('.bilibili-player-video video') ||
    document.querySelector('#playerWrap video') ||
    document.querySelector('video')
  );
};

const tryInitAmbientlight = async () => {
  if (window.ambientlight) return true;
  if (!isWatchPageUrl()) return;
  const videoElem = findVideoElem();
  if (!videoElem) return;

  const ytdAppElem =
    document.querySelector('#app') ||
    document.querySelector('.video-container-v1') ||
    document.querySelector('ytd-app') ||
    document.body;

  const ytdWatchElem =
    document.querySelector('.video-container-v1') ||
    document.querySelector('.player-and-aside-area') ||
    document.querySelector('#playerWrap') ||
    document.querySelector('#bilibili-player') ||
    document.querySelector('.bpx-player-container') ||
    document.body;

  const mastheadElem =
    document.querySelector('#biliMainHeader') ||
    document.querySelector('.bili-header') ||
    document.querySelector('ytd-app #masthead-container') ||
    null;

  window.ambientlight = await new Ambientlight(
    videoElem,
    ytdAppElem,
    ytdWatchElem,
    mastheadElem
  );

  errorEvents.list = [];
  detectDetachedVideo();
  detectPageTransitions(ytdAppElem);
  if (!window.ambientlight.isOnVideoPage) {
    detectWatchPageVideo(ytdAppElem);
  }

  return true;
};

const getWatchPageViewObserver = (function initGetWatchPageViewObserver() {
  let observer;
  return function getWatchPageViewObserver() {
    if (!observer) {
      observer = new MutationObserver(
        wrapErrorHandler(function watchPageViewObserved() {
          startIfWatchPageHasVideo();
        }, true)
      );
    }
    return observer;
  };
})();
const detectWatchPageVideo = (ytdAppElem) => {
  getWatchPageViewObserver().observe(ytdAppElem, {
    childList: true,
    subtree: true,
  });
};
const startIfWatchPageHasVideo = () => {
  if (!isWatchPageUrl() || window.ambientlight?.isOnVideoPage) {
    getWatchPageViewObserver().disconnect();
    return;
  }

  const videoElem = findVideoElem();
  if (!videoElem) return;

  getWatchPageViewObserver().disconnect();
  window.ambientlight.isOnVideoPage = true;
  window.ambientlight.start();
};

const detectPageTransitions = (ytdAppElem) => {
  const onPageTransition = async () => {
    getWatchPageViewObserver().disconnect();
    if (isWatchPageUrl()) {
      startIfWatchPageHasVideo();
      if (!window.ambientlight?.isOnVideoPage) {
        detectWatchPageVideo(ytdAppElem);
      }
    } else {
      if (window.ambientlight?.isOnVideoPage) {
        window.ambientlight.isOnVideoPage = false;
        await window.ambientlight.hide();
      }
    }
  };

  // Bilibili SPA page transitions
  window.addEventListener('popstate', onPageTransition);
  let lastHref = location.href;
  const hrefObserver = new MutationObserver(() => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      onPageTransition();
    }
  });
  hrefObserver.observe(document, { subtree: true, childList: true });
};

const loadAmbientlight = async () => {
  // Mobile player
  if (document.querySelector('#player-control-container')) return;

  let observerTarget =
    document.querySelector('#app') ||
    document.querySelector('ytd-app') ||
    document.body ||
    document.documentElement;

  if (await tryInitAmbientlight()) return;
  // Not on the watch page yet

  try {
    await Settings.getStoredSettingsCached();
  } catch (ex) {
    setWarning(
      `Your previous settings cannot be loaded. Refresh the webpage to try it again. ${'\n'}This can happen after you have updated the extension. ${'\n\n'}${ex?.toString()}`
    );

    if (
      !(
        ex.message === 'uninstalled' ||
        ex.message?.includes('QuotaExceededError')
      )
    ) {
      console.error(ex);
    }
  }

  // Listen to DOM changes
  let initializing = false;
  let tryAgain = true;
  const observer = new MutationObserver(
    wrapErrorHandler(async function ytdAppObserved(mutationsList, observer) {
      if (initializing) {
        tryAgain = true;
        return;
      }

      if (window.ambientlight) {
        observer.disconnect();
        return;
      }

      initializing = true;
      try {
        if (await tryInitAmbientlight()) {
          // Initialized
          observer.disconnect();
        } else {
          while (tryAgain && !window.ambientlight) {
            tryAgain = false;
            if (await tryInitAmbientlight()) {
              // Initialized
              observer.disconnect();
              tryAgain = false;
            }
          }
          initializing = false;
        }
      } catch (ex) {
        // Disconnect to prevent infinite loops
        observer.disconnect();
        throw ex;
      }
    }, true)
  );
  observer.observe(observerTarget, {
    childList: true,
    subtree: true,
  });
};

const onLoad = wrapErrorHandler(async function onLoadCallback() {
  if (window.ambientlight !== undefined) return;

  window.ambientlight = false;
  await loadAmbientlight();
});

(function setup() {
  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', onLoad, { once: true });
    } else {
      onLoad();
    }
  } catch (ex) {
    SentryReporter.captureException(ex);
  }
})();
