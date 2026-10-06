import { setErrorHandler, setStyleProperty } from './libs/generic';
import { contentScript } from './libs/messaging/content';

let reporting = false; // Prevent infinite loops
setErrorHandler((ex) => {
  if (reporting) return;

  try {
    reporting = true;
    contentScript.postMessage('error', {
      name: ex.name,
      message: ex.message,
      stack: ex.stack,
      details: ex.details,
    });
  } catch (reportEx) {
    console.warn('Failed to report error:', ex, 'innerError:', reportEx);
  } finally {
    reporting = false;
  }
});

const getElem = (() => {
  const elems = {};
  return (name) => {
    if (!elems[name]?.isConnected) {
      if (elems[name] && !elems[name].isConnected) {
        elems[name].dataset.ytalElem = name;
      }
      elems[name] = document.querySelector(`[data-ytal-elem="${name}"]`);
      if (elems[name]) {
        delete elems[name].dataset.ytalElem;
      }
    }
    return elems[name];
  };
})();

function updateTheme(toDark) {
  document.documentElement.toggleAttribute('dark', toDark);
}

contentScript.addMessageListener(
  'update-theme',
  function onUpdateTheme(toDark) {
    updateTheme(toDark);
    contentScript.postMessage('update-theme');
  }
);

const updateImmersiveMode = function updateImmersiveMode(
  enable,
  skipVideoPlayerSetSize = false
) {
  const html = document.documentElement;
  const enabled = html.getAttribute('data-ambientlight-immersive') != null;
  if (enabled === enable) return;

  const scroll = {
    x: window.scrollX,
    y: window.scrollY,
  };

  html.toggleAttribute('data-ambientlight-immersive', enable);
  const shift = enable ? 29 : -29;
  if (scroll.y > 50 && scroll.y < 100) {
    window.scrollTo(scroll.x, (scroll.y += shift));
  }

  if (!skipVideoPlayerSetSize && enabled !== enable) videoPlayerSetSize();
};

contentScript.addMessageListener(
  'update-immersive-mode',
  function onUpdateImmersiveMode(enable) {
    updateImmersiveMode(enable);
    contentScript.postMessage('update-immersive-mode');
  }
);

function videoPlayerSetSize() {
  const videoPlayerElem = getElem('video-player');
  if (videoPlayerElem) {
    try {
      if (typeof videoPlayerElem.setSize === 'function') {
        videoPlayerElem.setSize();
      }
      if (typeof videoPlayerElem.setInternalSize === 'function') {
        videoPlayerElem.setInternalSize();
      }
    } catch {
      // Ignore if player doesn't have custom setSize methods
    }
  }
  contentScript.postMessage('sizes-changed');
}

contentScript.addMessageListener(
  'video-player-set-size',
  function onVideoPlayerSetSize() {
    videoPlayerSetSize();
    contentScript.postMessage('video-player-set-size');
  }
);

contentScript.addMessageListener(
  'show',
  function show({
    ytdAppElemBackground,
    toDark,
    hideScrollbar,
    relatedScrollbar,
    immersiveMode,
  }) {
    const mastheadElem = getElem('masthead');
    if (mastheadElem) mastheadElem.classList.add('no-animation');

    const ytdAppElem = getElem('ytd-app');
    if (ytdAppElem)
      setStyleProperty(
        ytdAppElem,
        'background',
        ytdAppElemBackground,
        'important'
      );

    const html = document.documentElement;
    if (hideScrollbar)
      html.toggleAttribute('data-ambientlight-hide-scrollbar', true);
    if (relatedScrollbar)
      html.toggleAttribute('data-ambientlight-related-scrollbar', true);
    if (immersiveMode) updateImmersiveMode(true, true);

    updateTheme(toDark);

    html.toggleAttribute('data-ambientlight-enabled', true);

    videoPlayerSetSize();

    if (ytdAppElem) ytdAppElem.style.background = '';

    if (mastheadElem) mastheadElem.classList.remove('no-animation');
    contentScript.postMessage('show');
  }
);

contentScript.addMessageListener('hide', function hide({ toDark }) {
  const mastheadElem = getElem('masthead');
  if (mastheadElem) mastheadElem.classList.add('no-animation');

  const html = document.documentElement;
  html.toggleAttribute('data-ambientlight-enabled', false);

  html.toggleAttribute('data-ambientlight-hide-scrollbar', false);
  html.toggleAttribute('data-ambientlight-related-scrollbar', false);

  updateImmersiveMode(false, true);

  updateTheme(toDark);

  videoPlayerSetSize();

  if (mastheadElem) mastheadElem.classList.remove('no-animation');
  contentScript.postMessage('hide');
});

let videoObserver;
let videoObserverElem;
contentScript.addMessageListener(
  'apply-chromium-bug-1142112-workaround',
  function applyChromiumBug1142112Workaround() {
    try {
      const videoElem = getElem('video');
      if (videoObserverElem === videoElem) return;

      if (videoObserver) {
        videoObserver.disconnect();
        videoObserver = undefined;
      }
      videoObserverElem = videoElem;
      if (!videoElem || videoElem.ambientlightGetVideoPlaybackQuality) return;

      let videoIsHidden = false; // IntersectionObserver is always executed at least once when the observation starts
      let videoVisibilityChangeTime;
      videoObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (videoObserverElem !== entry.target) continue;
            videoIsHidden = entry.intersectionRatio === 0;
            videoVisibilityChangeTime = performance.now();
          }
        },
        {
          rootMargin: '-70px 0px 0px 0px', // masthead height (56px) + additional pixel to be safe
          threshold: 0.0001, // Because sometimes a pixel in not visible on screen but the intersectionRatio is already 0
        }
      );
      videoObserver.observe(videoElem);

      Object.defineProperty(videoElem, 'ambientlightGetVideoPlaybackQuality', {
        value: videoElem.getVideoPlaybackQuality,
      });

      let previousDroppedVideoFrames = 0;
      let droppedVideoFramesCorrection = 0;
      let previousTime = performance.now();

      videoElem.getVideoPlaybackQuality = function () {
        // Use scoped properties instead of this from here on
        const original = videoElem.ambientlightGetVideoPlaybackQuality();
        let droppedVideoFrames = original.droppedVideoFrames;
        if (droppedVideoFrames < previousDroppedVideoFrames) {
          previousDroppedVideoFrames = 0;
          droppedVideoFramesCorrection = 0;
        }
        // Ignore dropped frames for 2 seconds due to requestVideoFrameCallback dropping frames when the video is offscreen
        if (videoIsHidden || videoVisibilityChangeTime > previousTime - 2000) {
          droppedVideoFramesCorrection +=
            droppedVideoFrames - previousDroppedVideoFrames;
        }
        previousDroppedVideoFrames = droppedVideoFrames;
        droppedVideoFrames = Math.max(
          0,
          droppedVideoFrames - droppedVideoFramesCorrection
        );
        previousTime = performance.now();
        return {
          corruptedVideoFrames: original.corruptedVideoFrames,
          creationTime: original.creationTime,
          droppedVideoFrames,
          totalVideoFrames: original.totalVideoFrames,
        };
      };
    } catch (ex) {
      console.warn(
        'Failed to apply getVideoPlaybackQuality workaround. Continuing ambientlight initialization...'
      );
      throw ex;
    }
  }.bind(this)
);
