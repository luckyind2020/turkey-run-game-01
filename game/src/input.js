// Gobble Run — keyboard, mouse and touch input.
// One job: turn raw events into one tidy control state the game reads.

export function readShotQuery() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const seed = Number.parseInt(params.get('seed') || '7', 10);
  if (!shot) return null;
  return { shot, seed: Number.isFinite(seed) ? seed : 7 };
}

export class Input {
  constructor(canvas) {
    this.left = false;
    this.right = false;
    this.jumpHeld = false;
    this.jumpPressed = false; // consumed by the game each frame
    this.duckHeld = false;
    this.pointerJump = false;
    this.pointerDuck = false;
    this.anyKey = false;
    this.mutePressed = false;
    this.restartPressed = false;
    this._canvas = canvas;
    this._onKeyDown = (event) => this._key(event, true);
    this._onKeyUp = (event) => this._key(event, false);
    this._onPointerDown = (event) => this._pointer(event, true);
    this._onPointerUp = (event) => this._pointer(event, false);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    canvas.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointerup', this._onPointerUp);
  }

  _key(event, down) {
    const code = event.code;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(code)) {
      event.preventDefault();
    }
    if (down) this.anyKey = true;
    if (code === 'ArrowLeft' || code === 'KeyA') this.left = down;
    if (code === 'ArrowRight' || code === 'KeyD') this.right = down;
    if (code === 'ArrowUp' || code === 'KeyW' || code === 'Space') {
      if (down && !this.jumpHeld) this.jumpPressed = true;
      this.jumpHeld = down;
    }
    if (code === 'ArrowDown' || code === 'KeyS') this.duckHeld = down;
    if (code === 'KeyM' && down) this.mutePressed = true;
    if (code === 'KeyR' && down) this.restartPressed = true;
    if (code === 'Enter' && down) this.restartPressed = true;
  }

  _pointer(event, down) {
    const rect = this._canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (this._canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (this._canvas.height / rect.height);
    // Bottom-left corner is the duck zone, everything else jumps.
    if (y > 560 && x < 260) {
      this.pointerDuck = down;
    } else {
      if (down) this.pointerJump = true;
      this.jumpHeld = down || this.jumpHeld;
    }
    if (down) this.anyKey = true;
    event.preventDefault();
  }

  get jump() {
    const pressed = this.jumpPressed || this.pointerJump;
    this.jumpPressed = false;
    this.pointerJump = false;
    return pressed;
  }

  get duck() {
    return this.duckHeld || this.pointerDuck;
  }

  consumeRestart() {
    const value = this.restartPressed;
    this.restartPressed = false;
    return value;
  }

  consumeMute() {
    const value = this.mutePressed;
    this.mutePressed = false;
    return value;
  }

  consumeAnyKey() {
    const value = this.anyKey;
    this.anyKey = false;
    return value;
  }
}
