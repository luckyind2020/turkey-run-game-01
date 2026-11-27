// Gobble Run — tuning and stage definitions.
// One job: every number the game balances on, in one place.

export const VIEW_W = 1280;
export const VIEW_H = 720;
export const GROUND_Y = 600; // y of the ground line the turkey runs on

export const GRAVITY = 2600; // px / s^2
export const JUMP_VELOCITY = 980; // px / s
export const MOVE_SPEED = 420; // px / s, left/right on the ground
export const TURKEY_MIN_X = 90; // how far left the turkey may run
export const TURKEY_MAX_X = 560; // how far right the turkey may run
export const TURKEY_START_X = 230;

export const ESCAPE_DISTANCE = 1000; // metres to run to escape
export const METRES_PER_PX = 0.02; // world scroll px -> metres
export const MAX_LIVES = 3;
export const CORN_POINTS = 25;
export const FEATHER_POINTS = 100;
export const NEAR_MISS_POINTS = 15;

// The run crosses three places, each harder than the last.
export const STAGES = [
  {
    id: 'farmyard',
    name: 'THE FARMYARD',
    from: 0,
    to: 350,
    skyTop: '#f7b267',
    skyBottom: '#ffe3b3',
    ground: '#b5773a',
    groundDark: '#96602c',
    grass: '#7da05c',
    spawnGap: [520, 900],
    knifeEvery: [5200, 8200],
    oven: false,
  },
  {
    id: 'barn',
    name: 'THE BARN',
    from: 350,
    to: 700,
    skyTop: '#e07840',
    skyBottom: '#f9c784',
    ground: '#8a5a30',
    groundDark: '#6f4522',
    grass: '#8a7a3a',
    spawnGap: [430, 760],
    knifeEvery: [3800, 6200],
    oven: false,
  },
  {
    id: 'kitchen',
    name: 'THE KITCHEN',
    from: 700,
    to: 1000,
    skyTop: '#5c3a54',
    skyBottom: '#c96f4a',
    ground: '#6b4a3a',
    groundDark: '#54382c',
    grass: '#a85848',
    spawnGap: [380, 660],
    knifeEvery: [3000, 5000],
    oven: true,
  },
];

export function stageFor(distance) {
  for (const stage of STAGES) {
    if (distance < stage.to) return stage;
  }
  return STAGES[STAGES.length - 1];
}

// Base scroll speed grows with distance; the farmer keeps pace just under it.
export function scrollSpeed(distance) {
  return Math.min(520, 260 + distance * 0.35);
}
