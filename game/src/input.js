// Beaconkeeper — keyboard and mouse input. The game reads this object
// once per tick; the browser main wires DOM events into it, and the
// headless tests drive it directly.
export class Input {
  constructor() {
    this.keys = new Set();
    this.mouseX = 640;
    this.mouseY = 300;
    this.mouseDown = false;
    this.pressed = new Set(); // keys pressed since last tick (edge triggers)
  }
  keyDown(code) { this.keys.add(code); this.pressed.add(code); }
  keyUp(code) { this.keys.delete(code); }
  consume(code) {
    if (this.pressed.has(code)) { this.pressed.delete(code); return true; }
    return false;
  }
  endTick() { this.pressed.clear(); }
  get up() { return this.keys.has('KeyW') || this.keys.has('ArrowUp'); }
  get down() { return this.keys.has('KeyS') || this.keys.has('ArrowDown'); }
  get left() { return this.keys.has('KeyA') || this.keys.has('ArrowLeft'); }
  get right() { return this.keys.has('KeyD') || this.keys.has('ArrowRight'); }
  get dash() { return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'); }
  get beam() { return this.mouseDown || this.keys.has('Space'); }
  attach(canvas) {
    const onKey = (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.keyDown(e.code);
    };
    const onKeyUp = (e) => this.keyUp(e.code);
    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouseX = ((e.clientX - r.left) / r.width) * 1280;
      this.mouseY = ((e.clientY - r.top) / r.height) * 720;
    };
    const onDown = (e) => { onMove(e); this.mouseDown = true; };
    const onUp = () => { this.mouseDown = false; };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }
}
