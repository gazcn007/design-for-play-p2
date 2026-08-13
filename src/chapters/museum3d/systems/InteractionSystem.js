// Center-screen raycast interaction. One focused interactable at a time, one
// prompt region, one activate key family (E / Enter). Space is reserved for jump.

import * as THREE from 'three';
import { PLAYER } from '../config.js';

export class InteractionSystem {
  constructor(camera, promptEl) {
    this.camera = camera;
    this.promptEl = promptEl;
    this._raycaster = new THREE.Raycaster();
    this._raycaster.far = PLAYER.interactRange;
    this._center = new THREE.Vector2(0, 0);
    this._interactables = new Map(); // id -> { mesh, prompt, action, enabled }
    this._focused = null;
    this._fallbackId = null;
    this.enabled = true;
    // Key routing lives in Museum3DApp: E/Enter advances dialogue when
    // one is playing, otherwise activates the focused interactable.
  }

  register(id, { mesh, prompt, action, enabled = () => true }) {
    this._interactables.set(id, { id, mesh, prompt, action, enabled });
    mesh.traverse((child) => {
      child.userData.interactableId = id;
    });
  }

  unregister(id) {
    this._interactables.delete(id);
    if (this._focused?.id === id) this._focused = null;
  }

  clear() {
    this._interactables.clear();
    this._focused = null;
    this._fallbackId = null;
  }

  // A doorway-sized proximity fallback keeps critical entrances usable when
  // the centre reticle lands just beside a thin door proxy. Raycast focus
  // still wins whenever the player is deliberately looking at another item.
  setFallback(id = null) {
    this._fallbackId = id;
  }

  get focused() {
    return this._focused;
  }

  update() {
    if (!this.enabled) {
      this._setFocused(null);
      return;
    }
    this._raycaster.setFromCamera(this._center, this.camera);
    const meshes = [];
    for (const entry of this._interactables.values()) {
      if (entry.enabled()) meshes.push(entry.mesh);
    }
    const hits = this._raycaster.intersectObjects(meshes, true);
    let found = null;
    if (hits.length > 0) {
      let obj = hits[0].object;
      while (obj && !obj.userData.interactableId) obj = obj.parent;
      if (obj) found = this._interactables.get(obj.userData.interactableId) ?? null;
    }
    if (!found && this._fallbackId) {
      const fallback = this._interactables.get(this._fallbackId) ?? null;
      if (fallback?.enabled()) found = fallback;
    }
    this._setFocused(found);
  }

  _setFocused(entry) {
    this._focused = entry;
    if (entry) {
      this.promptEl.textContent = typeof entry.prompt === 'function' ? entry.prompt() : entry.prompt;
      this.promptEl.style.display = 'block';
    } else {
      this.promptEl.style.display = 'none';
    }
  }

  activate() {
    if (this._focused && this._focused.enabled()) {
      this._focused.action();
    }
  }
}
