# Police Chase 2000

A browser-based top-down pursuit game inspired by the general arcade idea of urban police chases, including the strategic pursuit feel of games such as *Chicago 90*. This is an original implementation made with plain HTML, CSS, and JavaScript.

## Open the game

[Launch Police Chase 2000](index.html)

The game runs as a static page with no build step, package installation, external framework, image, font, or audio dependency.

## Game concept

You are the driver of a getaway car moving through an abstract city grid. Police units enter from the edges and try to intercept you. Keep moving, collect getaway markers, and use short boosts to escape while avoiding police contact.

The game is intentionally an arcade reinterpretation rather than a remake. It does not reproduce the original game's code, artwork, music, text, maps, characters, branding, or other protected expression.

## Gameplay

- Drive the blue getaway car only along the marked road grid.
- Turn at intersections; buildings cannot be crossed.
- Collect gold getaway markers to increase the score.
- Avoid red police units and their projected pursuit paths.
- Police vehicles use the same road-only movement rules and begin on road centerlines.
- Every 10 collected markers adds a permanent roadblock to the city.
- Roadblocks stop both the getaway car and police vehicles; they cannot be crossed, including with boost.
- Use the limited boost to make a quick evasive move while staying on the road.
- The city becomes more dangerous as the score increases.
- The round ends when a police unit catches the getaway car.
- Your best score is saved locally in the browser.

## Controls

### Keyboard

- `Arrow keys` or `WASD`: drive
- `Space`: use boost
- `P`: pause or resume
- `R`: start a new round after a game over

### Touch and pointer

The on-screen directional pad works with mouse, touch, and keyboard focus. The boost button performs the same action as `Space`.

## Original visual assets

All visuals are drawn at runtime with Canvas and CSS. There are no imported image assets. The following names describe the generated visual components so they can later be replaced with custom artwork:

| Asset name | Purpose | Current implementation |
| --- | --- | --- |
| `Midnight Gridway` | The playable city map and road layout | Dark Manhattan-style street grid with road bands, intersections, lane markings, and building lots that constrain vehicle movement |
| `Manhattan Night Blocks` | The surrounding city architecture | Procedurally varied skyscraper-like buildings with different widths, heights, lit windows, rooftops, shadows, and occasional antennas |
| `Bluebird Runner` | The player getaway car | A blue geometric top-down car with a light roof, headlights, and direction indicator |
| `Redline Interceptor` | Police vehicles | Red geometric top-down cars with white roof markings and flashing light bars |
| `Gold Escape Marker` | Collectible objective | Pulsing gold diamond/star marker placed on the road network |
| `Redline Roadblock` | Escalating hazard | Animated red-and-gold barricade spawned on a road at each 10-marker milestone; collision stops every vehicle |
| `Siren Vector` | Police pursuit warning | Semi-transparent projected line from an interceptor toward the player's current position |
| `Boost Wake` | Player boost feedback | Cyan motion streaks and a temporary glow emitted behind the getaway car |
| `Street Signal HUD` | Interface and status display | Original CSS panels showing score, heat, boost charge, sound state, status, and control hints |
| `Patrol Synth Kit` | Browser-generated sound feedback | Web Audio API tones for round start, boost, marker collection, sound-toggle confirmation, and a two-tone capture siren; no audio files are imported |
| `Dusk Patrol Palette` | Overall color direction | Near-black navy streets, cyan player highlights, red police accents, and warm gold objectives |

These are descriptive internal names, not references to assets from another game. A future art pass can replace each generated component while preserving its role and name.

## Technical design

- Plain semantic HTML for the page structure.
- CSS for the dashboard, responsive layout, visual theme, and touch controls.
- Vanilla JavaScript and the 2D Canvas API for the game loop and rendering.
- `requestAnimationFrame` for animation.
- Browser `localStorage` for the best score.
- No framework, library, CDN, or server-side component.
- Web Audio API generates optional sound effects in the browser; no external audio files are loaded.
- A sound toggle persists the user's preference in `localStorage`.

## Copyright and originality

This project is inspired by the broad concept of a top-down chase game. It is not affiliated with, endorsed by, or a copy of *Chicago 90* or any other commercial game.

The implementation uses:

- Original game logic and source code.
- Original names and interface text.
- Procedurally drawn geometric shapes instead of copied artwork.
- An original abstract city layout rather than a recreation of a protected map.
- No third-party logos, characters, music, sound effects, screenshots, fonts, or branded assets.

The game's broad mechanics are implemented as a new combination and presentation. Do not add extracted assets, decompiled code, copied maps, trademarked branding, or original music from another game when replacing the placeholder visuals.

## Local development

Open `index.html` directly in a modern browser, or serve the repository with any static web server. No build command is required.

## Planned enhancements

- Replace generated placeholder art with a commissioned original art set.
- Add multiple original city layouts.
- Add accessibility options for reduced motion and high contrast.
- Expand the original Web Audio sound palette with additional non-infringing effects.
- Add multiple original city layouts with different road grids.
- Add more original road hazard types and alternate blockade patterns.
- Add mission objectives beyond score collection.
