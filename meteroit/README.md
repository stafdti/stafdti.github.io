[<< Back](../README.md)

# Meteroit

Meteroit is a single-page, original arcade game built with plain HTML, CSS, and JavaScript. Pilot a small scout ship through a neon orbital field, collect energy orbs, destroy debris with pulse shots, and survive as long as the field accelerates.

The name, visual language, gameplay implementation, and code are intentionally distinct from existing asteroid arcade games. The project does not bundle third-party art, music, fonts, libraries, or other copyrighted game assets.

## Run the game

No build step or package installation is required.

Open [`index.html`](index.html) directly in a browser, or serve the repository with any static web server:

```text
meteroit/index.html
```

For example, from the repository root:

```bash
python -m http.server
```

Then visit:

```text
http://localhost:8000/meteroit/
```

A local web server is recommended because browser security policies can differ when opening files directly.

## Gameplay

- Move the scout ship around the playfield.
- Avoid the pink orbital debris.
- Collect cyan energy orbs to restore energy.
- Hold the boost control to move faster, at the cost of energy.
- Fire pulse shots to destroy debris and earn extra points.
- The debris field becomes more active as the score increases.
- The best score is saved in `localStorage` on the current browser.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | `WASD` or arrow keys | Direction buttons |
| Boost | Hold `Shift` | `BOOST` |
| Fire pulse | `Space` | `PULSE CANNON` |
| Pause/resume | `P` or `PAUSE` | `PAUSE` button |
| New game | — | `NEW MISSION` |

## Sound effects

Meteroit uses the browser Web Audio API. Every effect is synthesized at runtime with oscillators and gain envelopes:

- Launch arpeggio
- Pulse cannon
- Energy collection
- Boost
- Collision

No audio files are downloaded or distributed. Browsers generally require audio to begin after a user gesture, so sound is initialized when the player launches the mission or uses a sound-producing control. The `SOUND: ON/OFF` preference is stored locally.

## Technical details

The app is intentionally self-contained in [`index.html`](index.html):

- HTML provides the game shell, HUD, overlay, buttons, and accessible labels.
- CSS provides the responsive neon interface and mobile touch layout.
- JavaScript uses a 900 × 545 canvas as the logical playfield.
- `requestAnimationFrame` drives the update/render loop.
- Collision detection uses circle-distance checks for the ship, debris, orbs, and shots.
- Canvas primitives create the ship, debris, particles, stars, energy orbs, and pulse projectiles.
- `localStorage` stores the best score and sound preference.
- No external network requests or runtime dependencies are required.

## Browser support

Use a current browser with support for:

- HTML5 Canvas
- `requestAnimationFrame`
- `localStorage`
- Web Audio API
- Pointer Events

The game remains playable without sound if Web Audio is unavailable or disabled.

## Licensing and originality

Meteroit is an original project for this repository. It is implemented from scratch and contains no copied game source code, third-party images, third-party audio, trademarked artwork, or external font files. The game is inspired by the general arcade concept of navigating and avoiding space debris, but its presentation, mechanics, visuals, sounds, and code are independently authored.

If this project is redistributed, retain the repository's applicable license and attribution notices. Any future third-party additions should be checked for a compatible license before inclusion.
