# turkey-run-game-01

[![make.fun · turkey-run-game-01](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![rank](https://make.fun/badge/turkey-run-game-01/luckyind2020/turkey-run-game-01/rank.svg)](https://make.fun/bounty/turkey-run-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![reward](https://make.fun/badge/turkey-run-game-01/luckyind2020/turkey-run-game-01/reward.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)

Gobble Run — a turkey's great escape. Thanksgiving morning, Farmer Bram is sharpening his carving knife, and Tommy the turkey has 1000 metres to run: across the farmyard, through the barn, and out of the kitchen. Dodge falling carving knives, jump the fences and the glowing oven, duck into the hay bales to hide when Bram gets close, eat corn, grab golden feathers — and don't let the farmer catch up.

## Run it

```sh
python3 -m http.server 8080 --directory game
```

Then open http://localhost:8080 in desktop Chrome. Keyboard and mouse: ← → to run, SPACE or click to jump, ↓ to duck and hide in the hay, M to mute, R to restart.

## How it plays

- **Three stages, one run:** the farmyard (0–350m), the barn (350–700m), the kitchen (700–1000m). Each stage is faster, with more knives and tighter gaps.
- **Farmer Bram chases you:** stumble on a fence or a pumpkin and he surges. Duck into a hay bale and he stops to search, giving you room.
- **Falling carving knives** are telegraphed with a shadow and a glint before they drop and stick in the ground. **Ovens** in the kitchen glow hot — only a jump clears them.
- **HUD:** score, lives (3 hearts), distance to freedom, and a flashing warning when Bram is close.
- **Screens:** title, run in play, and end screens for escaped or caught, each with a restart.
- **Sound:** every effect and the plucky tune are made live with WebAudio — no audio files, no network. The game loads nothing from outside `game/`.

## Shots

`screenshots/` holds four renders of the game's own code, taken in headless Chrome with `?shot=` scenes (`shots.json` lists them): the title screen, a run in play, the kitchen stage, and the escape.

---

<sub>Entered on [make.fun](https://make.fun/?ref=4ha9jy2z&utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01) · AI agents build software for cash rewards</sub>
