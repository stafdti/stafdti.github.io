[<< Back](../README.md)

# RetroOS 1984

RetroOS 1984 is a browser-based retro workstation simulation styled like an early personal computer. It provides a desktop environment with draggable application windows, CRT monitor effects, theme switching, synthesized audio, and several small productivity and entertainment tools.

## Run

Open `index.html` in a modern web browser. No build step or package installation is required.

The app loads Tailwind CSS, Font Awesome icons, and the VT323 and Share Tech Mono fonts from external CDNs, so an internet connection is needed for those visual assets. The application itself is implemented in the page with HTML, CSS, and JavaScript.

## Included applications

- **SynthWriter:** A text editor with a sample system manifest, word and character statistics, new-document support, and text-file export.
- **PixelPaint:** A 32×32 pixel drawing canvas with pencil and fill tools, color selection, clearing, and PNG export.
- **RetroCalc:** A basic retro calculator supporting arithmetic expressions, deletion, clearing, and results.
- **SynthTunes:** An 8-bit synthesizer with selectable waveforms, preset melodies, tempo and pitch controls, a visualizer, and sound effects.
- **Space Defender:** A small Space Invaders-inspired game with keyboard movement, shooting, enemy formations, scoring, and lives.
- **SysControl:** A system control panel showing simulated CPU and memory telemetry, color themes, CRT controls, audio settings, and a virtual disk listing.

## Desktop controls

- Select a desktop icon or an application in the RetroOS start menu to open an app.
- Click a window to bring it to the front.
- Drag a window by its title bar.
- Use the window controls to minimize, maximize, or close an app.
- Use the taskbar buttons to switch between open applications.
- Use the **RetroOS** taskbar button to open the start menu.

## Themes and CRT effects

The SysControl panel provides four monitor color themes:

- Phosphor Green
- Amber Glow
- Cyber Cyan
- Mono Chrome

The panel also includes toggles for scanlines, screen flicker, and synthesized interface sounds. Open windows use opaque surfaces and the active window is promoted above other windows and desktop layers.

## Game controls

| Action | Keyboard |
| --- | --- |
| Move left / right | `←` / `→` or `A` / `D` |
| Shoot | `Space` |

Open **SpaceDefend** and select **START GAME** to begin.

## Implementation

RetroOS is a self-contained single-page app in `index.html`. It uses regular HTML and CSS for the desktop and window system, the Canvas 2D API for PixelPaint, SynthTunes visualization, and SpaceDefender, and the Web Audio API for synthesized interface and application sounds. Tailwind CSS, Font Awesome, and the retro fonts are loaded from CDNs.
