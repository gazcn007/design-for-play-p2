import { EchoCity3DPreview } from './cars/presentCity3d/EchoCity3DPreview.js';

const preview = new EchoCity3DPreview({
  container: document.querySelector('#city-3d'),
  statusElement: document.querySelector('#runtime-status'),
  loadingPanel: document.querySelector('#loading-panel'),
  loadingLabel: document.querySelector('#loading-label'),
  loadingCount: document.querySelector('#loading-count'),
  loadingFill: document.querySelector('#loading-fill'),
});

window.render_game_to_text = () => preview.textState();
window.advanceTime = (ms) => preview.advanceTime(ms);
window.echoCity3D = preview;

preview.initialize()
  .then(() => {
    preview.start();
    return preview.loadModels();
  })
  .catch((error) => {
    console.error('Failed to initialize Echo City 3D preview', error);
    document.querySelector('#runtime-status').textContent = '3D INITIALIZATION FAILED';
  });
