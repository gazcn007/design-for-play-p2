import './gameFlow.css';
import { preloadChapter } from './chapterPreloader.js';

export const CINEMATICS = Object.freeze({
  opening: '/cinematics/start.mp4',
  chapter1To2: '/cinematics/1-2.mp4',
  chapter2To3: '/cinematics/2-3.mp4',
  chapter3To4: '/cinematics/3-4.mp4',
  chapter4To5: '/cinematics/4-5.mp4',
  ending: '/cinematics/end.mp4',
});

let activePlayback = null;
let cinematicVideo = null;

function sharedCinematicVideo(label) {
  if (!cinematicVideo) {
    cinematicVideo = document.createElement('video');
    cinematicVideo.playsInline = true;
    cinematicVideo.preload = 'auto';
  }
  cinematicVideo.setAttribute('aria-label', label);
  return cinematicVideo;
}

export function playCinematic({
  id,
  src,
  onComplete,
  preloadChapterId = null,
  label = 'NIGHTFALL CINEMATIC',
}) {
  if (activePlayback) return activePlayback.promise;

  const root = document.createElement('section');
  root.className = 'nf-cinematic';
  root.dataset.cinematic = id;
  root.setAttribute('aria-label', label);
  root.innerHTML = `
    <div class="nf-cinematic-loading" role="status">LOADING FILM</div>
  `;
  const video = sharedCinematicVideo(label);
  video.pause();
  video.currentTime = 0;
  video.src = src;
  video.volume = Math.max(0, Math.min(1, (globalThis.NIGHTFALL_SETTINGS?.masterVolume ?? 80) / 100));
  root.prepend(video);
  document.body.append(root);
  let preloadPromise = null;
  const beginPreload = () => {
    if (!preloadPromise && preloadChapterId) preloadPromise = preloadChapter(preloadChapterId);
    return preloadPromise;
  };

  let settled = false;
  let resolvePlayback;
  const promise = new Promise((resolve) => { resolvePlayback = resolve; });
  const finish = () => {
    if (settled) return;
    settled = true;
    root.classList.add('is-finished');
    window.setTimeout(async () => {
      if (beginPreload()) {
        await Promise.race([
          preloadPromise,
          new Promise((resolve) => window.setTimeout(resolve, 2200)),
        ]);
      }
      root.remove();
      video.removeAttribute('src');
      video.load();
      activePlayback = null;
      await onComplete?.();
      resolvePlayback();
    }, 260);
  };
  video.addEventListener('playing', beginPreload, { once: true });
  video.addEventListener('canplay', () => root.classList.add('is-ready'), { once: true });
  video.addEventListener('ended', finish, { once: true });
  video.addEventListener('error', () => {
    root.querySelector('.nf-cinematic-loading').textContent = 'FILM UNAVAILABLE · CONTINUING';
    window.setTimeout(finish, 900);
  }, { once: true });
  video.play().catch(() => {
    root.classList.add('needs-gesture');
    const resume = document.createElement('button');
    resume.type = 'button';
    resume.className = 'nf-cinematic-resume';
    resume.textContent = 'PLAY FILM';
    resume.addEventListener('click', () => {
      video.play().then(() => {
        resume.remove();
        root.classList.remove('needs-gesture');
      }).catch(() => {
        resume.textContent = 'CLICK TO PLAY FILM';
      });
    });
    root.append(resume);
    resume.focus();
  });

  activePlayback = { id, root, video, promise, finish, beginPreload };
  return promise;
}

export function getActiveCinematic() {
  return activePlayback;
}

export function navigateAfterCinematic(id, src, route, options = {}) {
  return playCinematic({
    id,
    src,
    label: options.label,
    preloadChapterId: options.preloadChapterId,
    onComplete: () => window.location.assign(route),
  });
}
