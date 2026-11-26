// Entry point: CrazyGames SDK init -> asset generation -> straight into gameplay.
import { Platform } from './engine/platform.js';
import { Game } from './game/game.js';

async function boot() {
  const fill = document.getElementById('load-fill');
  const text = document.getElementById('load-text');
  const progress = (p, t) => { fill.style.width = Math.round(p * 100) + '%'; if (t) text.textContent = t; };
  const platform = await new Platform().init();
  platform.loadingStart();
  const game = new Game(platform);
  window.__game = game;
  try {
    await game.init(progress);
  } catch (e) {
    console.error(e);
    text.textContent = 'Something woke us up: ' + (e && e.message ? e.message : e);
    return;
  }
  platform.loadingStop();
  // Keep progress across live page updates when hosted as a Claude artifact.
  try { if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => ({ save: game.save })); } catch (e) { /* optional */ }
  const loading = document.getElementById('loading');
  loading.classList.add('gone');
  setTimeout(() => loading.remove(), 1400);
}

const start = (data) => { window.__hotData = data || {}; boot(); };
const hot = window.claude && window.claude.hot;
if (hot && hot.ready) hot.ready(start); else start((hot && hot.data) || {});
