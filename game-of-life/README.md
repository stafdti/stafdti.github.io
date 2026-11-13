[← Back](../README.md)

# Conway's Game of Life

Conway's Game of Life is a single-page browser simulator for exploring cellular automata. Draw a starting population on a 40×40 board, choose a preset, or generate a random population, then run the simulation and observe how simple local rules produce complex behavior.

## Play

Open [`index.html`](index.html) in a modern web browser. No build step, package installation, server, or external dependency is required.

The app is fully self-contained in one HTML file. It uses HTML, CSS, and vanilla JavaScript and works offline once the file has been opened.

## Features

- Interactive 40×40 board that can be edited by clicking, tapping, or dragging across cells.
- Play, pause, and single-generation step controls.
- Random population generation.
- Pattern presets:
  - Blank board
  - Glider
  - Pulsar
  - Gosper glider gun
- Adjustable simulation speed from 1 to 20 generations per second.
- Optional wrapping at the board edges.
- Live generation, population, and population-density statistics.
- Responsive layout for desktop and mobile screens.
- Keyboard-accessible controls and board cells with live status announcements.

## How the simulation works

Each cell is either alive or dead. On every generation, the app counts the eight neighboring cells around each cell and applies Conway's four rules:

1. A live cell with fewer than two live neighbors dies from underpopulation.
2. A live cell with two or three live neighbors survives.
3. A live cell with more than three live neighbors dies from overpopulation.
4. A dead cell with exactly three live neighbors becomes alive through reproduction.

By default, cells beyond the edge of the board are treated as dead. Enable **Wrap at board edges** to make the board toroidal, so cells on one edge can be neighbors of cells on the opposite edge.

## Controls

| Action | Control |
| --- | --- |
| Start or pause the simulation | **Play** / **Pause** |
| Advance one generation | **Step** |
| Remove all cells | **Clear** |
| Create a random starting population | **Randomize** |
| Select a known pattern | **Pattern preset**, then **Load preset** |
| Change simulation speed | **Speed** slider |
| Connect opposite board edges | **Wrap at board edges** |
| Toggle or paint cells | Click or tap a cell, then drag across the board while holding the pointer |

The board can be edited while the simulation is paused. Loading a preset, clearing the board, or randomizing the population resets the generation counter to zero.

## Implementation

The app is implemented entirely in [`index.html`](index.html):

- CSS provides the responsive layout, dark visual theme, board grid, and alive/dead cell states.
- JavaScript stores the board as a two-dimensional Boolean array.
- Each generation is calculated from a new array so updates happen simultaneously, as required by the Game of Life rules.
- `setInterval` advances the simulation according to the selected speed.
- No data is sent to a server and no browser storage is required.

## License

Unless otherwise stated by the repository, this app is covered by the repository's [PolyForm Noncommercial License 1.0.0](../LICENSE).
