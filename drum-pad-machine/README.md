[<< Back](../README.md)

# Drum Pad Machine

A browser-based drum pad / step-sequencer built with plain HTML, CSS and JavaScript (no build tools required). UI styled with [Bootstrap](https://getbootstrap.com/) (loaded via CDN).

## Features (v1)

- 16 drum pads arranged in a 4x4 grid — click or use keyboard shortcuts to play sounds instantly.
- 16-track step sequencer (one row per sound) x 16 steps, visually grouped in 4 blocks of 4 steps.
- Configurable BPM (tempo).
- Play / Stop transport with a moving playhead indicator.
- **Record mode**: while the sequencer is playing, hitting a pad (click or keyboard) writes a hit into the currently playing step for that sound's row.
- Manual editing: click directly on any step cell to toggle it on/off, independent of recording.
- Clear pattern button.
- Everything (pattern, BPM, and sound-to-pad assignment) is automatically persisted to `localStorage`, so your work survives a page reload.

## Project Structure

```
.
├── README.md
└── src
    ├── index.html          # Main page (loads Bootstrap via CDN)
    ├── css
    │   └── style.css       # Custom styles (pads, sequencer grid, playhead, etc.)
    ├── js
    │   └── app.js          # All application logic (audio, sequencer, UI, storage)
    └── resources
        └── sounds
            ├── README.md   # Instructions for adding your own sound files
            ├── sound-01.mp3 ... sound-16.mp3   (you provide these)
```

## Adding Sounds

This project does **not** ship with audio files (to avoid any licensing issues). You need to download 16 royalty-free / public-domain drum/percussion samples (e.g. from [freesound.org](https://freesound.org), [99sounds.com](https://99sounds.com), or similar) and place them in:

```
src/resources/sounds/
```

Name them exactly:

```
sound-01.mp3
sound-02.mp3
...
sound-16.mp3
```

Pad #1 (top-left of the 4x4 grid) maps to `sound-01.mp3`, pad #2 to `sound-02.mp3`, and so on, row by row, up to pad #16 (bottom-right) mapping to `sound-16.mp3`.

If a sound file is missing, the corresponding pad will simply do nothing when triggered (no error dialogs), so you can add sounds incrementally.

## Running the Project

No build step is required. Simply open `src/index.html` directly in a modern browser (Chrome, Edge, Firefox), or serve the `src` folder with any static file server, e.g.:

```
npx serve src
```

## Keyboard Shortcuts

The 16 pads are mapped to the following keys (4x4 layout, left-to-right, top-to-bottom):

```
1  2  3  4
Q  W  E  R
A  S  D  F
Z  X  C  V
```

## Controls

- **Play** — starts the sequencer at the configured BPM.
- **Stop** — stops playback and resets the playhead.
- **Record** — toggles record mode. While active and the sequencer is playing, triggering a pad writes/erases a hit on the current step for that pad's row.
- **BPM** — numeric input, 40–300 BPM, changes take effect immediately.
- **Clear** — clears the entire pattern (asks for confirmation).

## Notes for Future Iterations

This is a first working version. Planned refinements (pending your feedback) may include: per-pad volume, swing/shuffle, multiple saved pattern slots, visual themes, and quantization behavior tuning for live recording.

# Sound Files

Place 16 short drum/percussion sample files here, named exactly:

```
sound-01.mp3
sound-02.mp3
sound-03.mp3
sound-04.mp3
sound-05.mp3
sound-06.mp3
sound-07.mp3
sound-08.mp3
sound-09.mp3
sound-10.mp3
sound-11.mp3
sound-12.mp3
sound-13.mp3
sound-14.mp3
sound-15.mp3
sound-16.mp3
```

## Mapping to Pads

Pads are arranged in a 4x4 grid, numbered left-to-right, top-to-bottom:

```
 1  2  3  4
 5  6  7  8
 9 10 11 12
13 14 15 16
```

`sound-01.mp3` → Pad 1, `sound-02.mp3` → Pad 2, ... `sound-16.mp3` → Pad 16.

## Where to get sounds

Use royalty-free / public-domain drum samples, for example from:

- https://freesound.org (filter by CC0 license)
- https://99sounds.com
- https://sampleswap.org

## Format

MP3 is recommended for best browser compatibility and small file size. Keep samples short (under 2 seconds) for a snappy feel.

If a file is missing, the app will simply do nothing when that pad is triggered — no errors will be shown, so you can add sounds one at a time.


## Source for samples

https://sampleswap.org/filebrowser-new.php?d=DRUMS%20(SINGLE%20HITS)/
