// Input: mouse + keyboard state for the browser. The simulation never
// reads this directly in tests — game.js exposes plantAt / clickSun /
// chooseDraft etc. as plain methods, and main.js translates DOM events
// into them. This module just tracks raw state.
export class Input {
  constructor() {
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    this.clicked = null; // {x, y} consumed once per tick
    this.keys = new Set();
    this.pressed = new Set(); // keys pressed since last tick
  }
  attach(canvas) {
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouseX = ((e.clientX - r.left) / r.width) * 1280;
      this.mouseY = ((e.clientY - r.top) / r.height) * 720;
    });
    canvas.addEventListener('mousedown', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouseX = ((e.clientX - r.left) / r.width) * 1280;
      this.mouseY = ((e.clientY - r.top) / r.height) * 720;
      this.mouseDown = true;
      this.clicked = { x: this.mouseX, y: this.mouseY };
    });
    window.addEventListener('mouseup', () => { this.mouseDown = false; });
    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => { this.keys.delete(e.code); });
  }
  endTick() {
    this.clicked = null;
    this.pressed.clear();
  }
  wasPressed(code) { return this.pressed.has(code); }
}
