# ByteWave Synthesizer

ByteWave is a retro-styled, standalone HTML5 browser synthesizer built with HTML, CSS, and JavaScript. It uses the browser's Web Audio API to generate sound locally without a server, framework, build step, or external dependency.

## Features

- Four oscillator waveforms:
  - Sine
  - Triangle
  - Sawtooth
  - Square
- Oscillator octave control from two octaves down to two octaves up.
- Fine oscillator detuning from -100 to +100 cents.
- Master volume control.
- Four filter modes:
  - Low pass
  - High pass
  - Band pass
  - All pass
- Adjustable filter cutoff and resonance.
- Attack, release, and sustain envelope controls.
- On-screen playable piano keyboard.
- Locale-aware computer keyboard control:
  - English/QWERTY: `A W S E D F T G Y H U J K` plays the visible notes.
  - German/QWERTZ: `A W S E D F T G Z H U J K` plays the visible notes.
  - English: `Z` lowers the computer-keyboard octave.
  - German: `Y` lowers the computer-keyboard octave.
  - `X` raises the computer-keyboard octave in both layouts.
  - The mapping is selected from the browser's preferred language (`navigator.languages` / `navigator.language`).
- Polyphonic note playback.
- Output activity meter.
- Panic button to silence all active voices.
- Responsive retro interface for desktop, tablet, and mobile browsers.
- Large touch targets for mobile controls.
- Horizontal piano-key scrolling on narrow phone screens.
- Installable as an offline-capable web app.
- No audio files or network requests are required.

## Persistence

Every synthesizer setting is written immediately to `localStorage` whenever it changes. When the app is opened again in the same browser, the previous patch is restored automatically.

The **Save patch** button explicitly writes the current patch again. **Reset defaults** restores the factory settings and persists those defaults.

The app stores settings under the browser storage key:

```text
bytewave-synthesizer-state-v1
```

Audio state itself is not persisted. Browsers require a user gesture before Web Audio can start, so click or touch a piano key after opening the app.

## Running the app

Open [`index.html`](index.html) directly in a modern browser, or serve the repository through any static web server.

The app is also available from the repository dashboard:

[Open ByteWave Synthesizer](index.html)

For full offline-app functionality, serve the app from `localhost` or HTTPS. Service workers are not enabled for ordinary `file://` pages.

## Mobile and offline app support

The interface switches to a single-column layout on small screens, uses mobile-sized controls and buttons, and keeps the piano keyboard touch-friendly. The keyboard can be horizontally scrolled on narrow phones so every key remains usable without shrinking the keys excessively.

The computer-keyboard layout is selected automatically from the browser language. German-language browsers use the German QWERTZ-friendly mapping, including `Z` for G♯ and `Y/X` for octave down/up. Other languages use the English QWERTY mapping, including `Y` for G♯ and `Z/X` for octave down/up.

ByteWave includes:

- [`manifest.webmanifest`](manifest.webmanifest) for installation metadata.
- [`sw.js`](sw.js) for app-shell caching and offline fallback.
- [`icons/icon.svg`](icons/icon.svg) as the local install icon.

After the first successful load from `localhost` or HTTPS, the service worker caches the app shell. The page can then be reopened without a network connection. Browser support for installing web apps varies by platform; use the browser's **Install app** or **Add to Home Screen** command when available.

## Browser support

The synthesizer requires a browser with support for:

- Web Audio API (`AudioContext`)
- `localStorage`
- Pointer Events for the touch and mouse keyboard

Current versions of Chrome, Edge, Firefox, and Safari provide the required APIs. Some browsers block audio until the first click, touch, or keyboard interaction; this is expected browser behavior.

## Implementation

The application is intentionally self-contained in [`index.html`](index.html):

- CSS defines the CRT-inspired visual design and responsive layout.
- JavaScript creates one oscillator, filter, envelope, and voice for each active note.
- Voice parameters are updated live when controls change.
- `localStorage` handles immediate patch persistence.
- The Web Audio graph is created lazily after the first user interaction.
- The service worker caches the HTML, manifest, and local assets for offline startup.

## License

This mini app is part of the `stafdti.github.io` collection of browser-based experiments.
