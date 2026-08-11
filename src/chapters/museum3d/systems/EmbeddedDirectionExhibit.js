import { directionDefinition, isDirectionPlayable } from '../directions/directionRegistry.js';
import { isArtifactDirection } from '../state/chapter05DirectionProgress.js';

export class EmbeddedDirectionExhibit {
  constructor({ root, iframe, closeButton, titleEl, statusEl, progress, onOpen, onClose }) {
    this.root = root;
    this.iframe = iframe;
    this.closeButton = closeButton;
    this.titleEl = titleEl;
    this.statusEl = statusEl;
    this.progress = progress;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.opened = false;
    this.directionId = null;
    this._loaded = new Set();

    this.closeButton.addEventListener('click', () => this.close());
    this._onMessage = (event) => {
      if (!this.opened || event.origin !== window.location.origin || event.source !== this.iframe.contentWindow) return;
      const definition = directionDefinition(this.directionId);
      if (event.data?.type === definition.exitMessage) this.close();
      if (event.data?.type === definition.completeMessage) {
        if (isArtifactDirection(this.directionId)) {
          this.progress.dispatch({ type: 'artifact.take', id: this.directionId });
          this.statusEl.textContent = '◦';
        } else {
          this.progress.dispatch({ type: 'direction.complete', id: this.directionId });
          this.statusEl.textContent = '·';
          this.root.classList.add('complete');
        }
        this.close();
      }
    };
    window.addEventListener('message', this._onMessage);
  }

  open(directionId) {
    if (this.opened) return false;
    if (!isDirectionPlayable(directionId)) return false;
    const definition = directionDefinition(directionId);
    if (!definition.src) return false;
    const result = this.progress.dispatch({ type: 'direction.open', id: directionId });
    if (result.state.activeDirection !== directionId) return false;

    this.opened = true;
    this.directionId = directionId;
    this.titleEl.textContent = definition.title;
    this.statusEl.textContent = this.progress.getSnapshot().completed[directionId] ? '·' : 'ESC';
    this.root.classList.toggle('complete', this.progress.getSnapshot().completed[directionId]);
    if (!this._loaded.has(directionId) || this.iframe.dataset.direction !== directionId) {
      this.iframe.src = definition.src;
      this.iframe.dataset.direction = directionId;
      this._loaded.add(directionId);
    }
    this.root.classList.add('open');
    this.root.setAttribute('aria-hidden', 'false');
    this.onOpen?.({ directionId });
    this.iframe.focus();
    return true;
  }

  close() {
    if (!this.opened) return false;
    const directionId = this.directionId;
    this.opened = false;
    this.directionId = null;
    this.root.classList.remove('open');
    this.root.setAttribute('aria-hidden', 'true');
    // Hand keyboard focus back to the museum: while the framed game is open
    // it owns key events, and leaving focus inside the now-hidden iframe
    // would strand the player standing at the door with dead controls.
    this.iframe.blur?.();
    window.focus?.();
    this.progress.dispatch({ type: 'direction.close' });
    const snapshot = this.progress.getSnapshot();
    this.onClose?.({
      directionId,
      completed: snapshot.completed[directionId],
      artifactCarried: snapshot.carriedArtifact === directionId,
    });
    return true;
  }

  get completed() {
    return this.progress.getSnapshot().completed.labyrinth;
  }

  dispose() {
    window.removeEventListener('message', this._onMessage);
  }
}
