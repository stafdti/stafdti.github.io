[<< Back](../README.md)

# Block Cascade

Block Cascade is a browser-based arcade puzzle where you arrange falling polyomino pieces to complete and clear horizontal rows. It features a retro CRT-inspired interface, synthesized sound effects, multiple grid color themes, and keyboard and touch controls.

## Play

Open `index.html` in a modern web browser and select **START GAME**. No build step or package installation is required.

The page loads Tailwind CSS and the Press Start 2P font from external CDNs, so an internet connection is needed for those visual assets. The game itself is implemented in the page with HTML, CSS, and JavaScript.

## How to play

Move, rotate, and drop each falling piece to fill the grid. Complete a horizontal row to clear it and earn points. The game ends when a new piece cannot enter the playfield.

- **Pieces:** A shuffled bag supplies eight different shapes, including corners, lines, squares, and other polyominoes.
- **Ghost preview:** An outline shows where the active piece will land if dropped.
- **Stash:** Store the current piece and swap it with the stored piece. Stashing is available once per falling piece.
- **Scoring:** Clearing rows awards points; clearing multiple rows at once earns more. Hard drops also award points.
- **Phases:** Every eight cleared rows advances the phase and increases the falling speed.
- **Best record:** The high score is saved in the browser.

## Controls

| Action | Keyboard | Touch controls |
| --- | --- | --- |
| Move left / right | `←` / `→` or `A` / `D` | `◄` / `►` |
| Rotate | `↑` or `W` | `↻` |
| Soft drop | `↓` or `S` | `▼` |
| Hard drop | `Space` | `⤓` |
| Stash / swap piece | `C` or either `Shift` key | **STASH PIECE** |
| Pause / resume | `P` | **PAUSE** / **RESUME** |

Touch controls are shown on smaller screens.

## Preferences and saved data

Select **SETTINGS** to configure:

- **Synth sounds:** Enable or mute synthesized game sound effects.
- **Grid theme:** Choose Cosmic Grid, Midnight Synth, or Cyber Neon.

The selected preferences and best record are saved in the browser’s `localStorage`. **CLEAR BEST** resets the saved high score.

## Implementation

Block Cascade is a self-contained single-page app in `index.html`. It uses the Canvas 2D API to draw the playfield and piece previews, the Web Audio API to synthesize sound effects, and `localStorage` to retain preferences and the best record. Tailwind CSS and the Press Start 2P font are loaded from CDNs.
