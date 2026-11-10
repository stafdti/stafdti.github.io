/* ==========================================================================
   Drum Pad Machine - Application Logic
   ==========================================================================
   Data model:
     - 16 pads, arranged 4x4, each mapped to a keyboard key and a sound file.
     - pattern[padIndex][stepIndex] -> boolean (16 pads x 16 steps)
     - Everything persisted to localStorage under STORAGE_KEY.
   ========================================================================== */

(function () {
  'use strict';

  // ------------------------------------------------------------------
  // Configuration
  // ------------------------------------------------------------------

  const NUM_PADS = 16;
  const NUM_STEPS = 16;
  const STORAGE_KEY = 'drumPadMachine.state.v1';

  // Keyboard mapping, 4x4, left-to-right / top-to-bottom.
  const PAD_KEYS = [
    '1', '2', '3', '4',
    'Q', 'W', 'E', 'R',
    'A', 'S', 'D', 'F',
    'Z', 'X', 'C', 'V'
  ];

  // ------------------------------------------------------------------
  // State
  // ------------------------------------------------------------------

  let pattern = createEmptyPattern();
  let bpm = 120;
  let isPlaying = false;
  let isRecording = false;
  let currentStep = 0;
  let intervalId = null;

  // Pool of pre-loaded <audio> elements per pad. Using a pool (instead of
  // cloning a single element on every trigger, and instead of fetch() +
  // Web Audio API, which is blocked by CORS when the page is opened via
  // file://) gives near-zero trigger latency, works when the app is opened
  // directly as a local file, and allows overlapping/parallel playback by
  // round-robining between several ready-to-play elements per pad.
  const POOL_SIZE = 4;
  const padAudioPools = [];
  const padAudioPoolIndex = [];

  // ------------------------------------------------------------------
  // Initialization
  // ------------------------------------------------------------------

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    loadState();
    buildPadAudioElements();
    renderPads();
    renderSequencer();
    bindTransportControls();
    bindKeyboardShortcuts();
    document.getElementById('bpm-input').value = bpm;
  }

  function createEmptyPattern() {
    const p = [];
    for (let pad = 0; pad < NUM_PADS; pad++) {
      p.push(new Array(NUM_STEPS).fill(false));
    }
    return p;
  }

  function buildPadAudioElements() {
    for (let i = 0; i < NUM_PADS; i++) {
      const fileName = 'sound-' + String(i + 1).padStart(2, '0') + '.mp3';
      const src = 'resources/sounds/' + fileName;

      const pool = [];
      for (let j = 0; j < POOL_SIZE; j++) {
        const audio = new Audio(src);
        audio.preload = 'auto';
        // Swallow load errors silently (missing sound files are allowed).
        audio.addEventListener('error', function () {
          /* no-op: pad will simply be silent if file is missing */
        });
        // Kick off loading immediately so the very first trigger is instant.
        audio.load();
        pool.push(audio);
      }

      padAudioPools[i] = pool;
      padAudioPoolIndex[i] = 0;
    }
  }

  // ------------------------------------------------------------------
  // Rendering: Pads
  // ------------------------------------------------------------------

  function renderPads() {
    const grid = document.getElementById('pad-grid');
    grid.innerHTML = '';

    for (let i = 0; i < NUM_PADS; i++) {
      const pad = document.createElement('button');
      pad.type = 'button';
      pad.className = 'pad';
      pad.dataset.padIndex = String(i);

      const label = document.createElement('div');
      label.className = 'pad-label';
      label.textContent = 'Pad ' + (i + 1);

      const key = document.createElement('div');
      key.className = 'pad-key';
      key.textContent = i === 12 ? 'Y / Z' : PAD_KEYS[i];

      pad.appendChild(label);
      pad.appendChild(key);

      pad.addEventListener('click', function () {
        triggerPad(i);
      });

      grid.appendChild(pad);
    }
  }

  // ------------------------------------------------------------------
  // Rendering: Sequencer
  // ------------------------------------------------------------------

  function renderSequencer() {
    const grid = document.getElementById('sequencer-grid');
    grid.innerHTML = '';

    for (let padIndex = 0; padIndex < NUM_PADS; padIndex++) {
      const row = document.createElement('div');
      row.className = 'sequencer-row';
      row.dataset.padIndex = String(padIndex);

      const label = document.createElement('div');
      label.className = 'sequencer-row-label';
      label.textContent = 'Pad ' + (padIndex + 1);
      row.appendChild(label);

      for (let stepIndex = 0; stepIndex < NUM_STEPS; stepIndex++) {
        const step = document.createElement('div');
        step.className = 'step';
        if (stepIndex % 4 === 0) {
          step.classList.add('group-start');
        }
        step.dataset.padIndex = String(padIndex);
        step.dataset.stepIndex = String(stepIndex);

        if (pattern[padIndex][stepIndex]) {
          step.classList.add('step-on');
        }

        step.addEventListener('click', function () {
          toggleStep(padIndex, stepIndex);
        });

        row.appendChild(step);
      }

      grid.appendChild(row);
    }
  }

  function toggleStep(padIndex, stepIndex) {
    pattern[padIndex][stepIndex] = !pattern[padIndex][stepIndex];
    updateStepElement(padIndex, stepIndex);
    saveState();
  }

  function updateStepElement(padIndex, stepIndex) {
    const selector =
      '.step[data-pad-index="' + padIndex + '"][data-step-index="' + stepIndex + '"]';
    const el = document.querySelector(selector);
    if (!el) return;
    el.classList.toggle('step-on', pattern[padIndex][stepIndex]);
  }

  function updatePlayheadUI(step) {
    const cells = document.querySelectorAll('.step');
    cells.forEach(function (cell) {
      cell.classList.remove('step-current');
    });
    const activeCells = document.querySelectorAll(
      '.step[data-step-index="' + step + '"]'
    );
    activeCells.forEach(function (cell) {
      cell.classList.add('step-current');
    });
  }

  // ------------------------------------------------------------------
  // Pad Triggering
  // ------------------------------------------------------------------

  function triggerPad(padIndex) {
    playSound(padIndex);
    flashPad(padIndex);

    if (isRecording && isPlaying) {
      pattern[padIndex][currentStep] = true;
      updateStepElement(padIndex, currentStep);
      saveState();
    }
  }

  function playSound(padIndex) {
    const pool = padAudioPools[padIndex];
    if (!pool) return;

    // Round-robin through the pool of pre-loaded elements for this pad.
    // Each element is already loaded, so playback starts immediately
    // (no delay), and because different elements are used in rotation,
    // rapid repeated hits on the same pad -- as well as hits on other
    // pads -- can all play back fully in parallel/overlapping.
    const index = padAudioPoolIndex[padIndex];
    const audio = pool[index];
    padAudioPoolIndex[padIndex] = (index + 1) % pool.length;

    try {
      audio.currentTime = 0;
    } catch (e) {
      /* no-op: element may not be seekable yet if still loading */
    }

    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(function () {
        /* no-op: ignore playback errors (e.g. missing/unsupported file) */
      });
    }
  }

  function flashPad(padIndex) {
    const padEl = document.querySelector('.pad[data-pad-index="' + padIndex + '"]');
    if (!padEl) return;
    padEl.classList.add('pad-active');
    setTimeout(function () {
      padEl.classList.remove('pad-active');
    }, 120);
  }

  // ------------------------------------------------------------------
  // Transport: Play / Stop / Record / Clear / BPM
  // ------------------------------------------------------------------

  function bindTransportControls() {
    document.getElementById('btn-play').addEventListener('click', startPlayback);
    document.getElementById('btn-stop').addEventListener('click', stopPlayback);
    document.getElementById('btn-record').addEventListener('click', toggleRecording);
    document.getElementById('btn-clear').addEventListener('click', clearPattern);

    const bpmInput = document.getElementById('bpm-input');
    bpmInput.addEventListener('change', function () {
      let value = parseInt(bpmInput.value, 10);
      if (isNaN(value)) value = 120;
      value = Math.max(40, Math.min(300, value));
      bpmInput.value = value;
      bpm = value;
      saveState();
      if (isPlaying) {
        // Restart the scheduling loop with the new tempo.
        stopInterval();
        startInterval();
      }
    });
  }

  function startPlayback() {
    if (isPlaying) return;
    isPlaying = true;
    currentStep = 0;
    startInterval();
    setPlayButtonState(true);
  }

  function stopPlayback() {
    isPlaying = false;
    stopInterval();
    currentStep = 0;
    updatePlayheadUI(-1);
    setPlayButtonState(false);
  }

  function setPlayButtonState(playing) {
    const playBtn = document.getElementById('btn-play');
    if (playing) {
      playBtn.classList.remove('btn-success');
      playBtn.classList.add('btn-warning');
      playBtn.innerHTML = '&#10074;&#10074; Playing';
    } else {
      playBtn.classList.remove('btn-warning');
      playBtn.classList.add('btn-success');
      playBtn.innerHTML = '&#9654; Play';
    }
  }

  function startInterval() {
    const stepDurationMs = (60000 / bpm) / 4; // 16th notes
    intervalId = setInterval(tick, stepDurationMs);
  }

  function stopInterval() {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function tick() {
    // Play any sounds scheduled on the current step.
    for (let padIndex = 0; padIndex < NUM_PADS; padIndex++) {
      if (pattern[padIndex][currentStep]) {
        playSound(padIndex);
        flashPad(padIndex);
      }
    }

    updatePlayheadUI(currentStep);

    currentStep = (currentStep + 1) % NUM_STEPS;
  }

  function toggleRecording() {
    isRecording = !isRecording;
    const btn = document.getElementById('btn-record');
    btn.classList.toggle('recording', isRecording);
  }

  function clearPattern() {
    const confirmed = window.confirm('Clear the entire pattern? This cannot be undone.');
    if (!confirmed) return;
    pattern = createEmptyPattern();
    renderSequencer();
    saveState();
  }

  // ------------------------------------------------------------------
  // Keyboard Shortcuts
  // ------------------------------------------------------------------

  function bindKeyboardShortcuts() {
    document.addEventListener('keydown', function (event) {
      // Ignore key presses while user is typing in an input field.
      const target = event.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      const key = event.key.toUpperCase();
      let padIndex = PAD_KEYS.indexOf(key);

      // Pad 13 uses the same physical key as Z on English layouts and Y
      // on German layouts, where the keyboard positions are swapped.
      if (padIndex === -1 && (key === 'Y' || key === 'Z')) {
        padIndex = 12;
      }

      if (padIndex === -1) return;

      // Avoid retriggering repeatedly while key is held down.
      if (event.repeat) return;

      triggerPad(padIndex);
    });
  }

  // ------------------------------------------------------------------
  // Persistence (localStorage)
  // ------------------------------------------------------------------

  function saveState() {
    const state = {
      pattern: pattern,
      bpm: bpm
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* no-op: storage may be unavailable (e.g. private mode / quota) */
    }
  }

  function loadState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const state = JSON.parse(raw);

      if (Array.isArray(state.pattern) && state.pattern.length === NUM_PADS) {
        pattern = state.pattern.map(function (row) {
          const safeRow = Array.isArray(row) ? row.slice(0, NUM_STEPS) : [];
          while (safeRow.length < NUM_STEPS) safeRow.push(false);
          return safeRow.map(Boolean);
        });
      }

      if (typeof state.bpm === 'number' && !isNaN(state.bpm)) {
        bpm = Math.max(40, Math.min(300, state.bpm));
      }
    } catch (e) {
      /* no-op: ignore corrupt/unavailable storage, fall back to defaults */
    }
  }

})();
