// Harbor Lights — keyboard input: driving, walking, actions, menus.
export function makeInput() {
  const keys = new Set();
  const pressed = new Set(); // keys pressed since last poll (edge-triggered)
  let anyKey = false;

  function down(e) {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
    if (!keys.has(k)) pressed.add(k);
    keys.add(k);
    anyKey = true;
  }
  function up(e) {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    keys.delete(k);
  }
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', () => keys.clear());

  return {
    // Held keys.
    held(k) { return keys.has(k); },
    // True once per physical press; consumed by endFrame().
    wasPressed(k) { return pressed.has(k); },
    axis() {
      // -1..1 steering (left/right) and throttle (up/down) from WASD or arrows.
      const x = (keys.has('d') || keys.has('ArrowRight') ? 1 : 0)
        - (keys.has('a') || keys.has('ArrowLeft') ? 1 : 0);
      const y = (keys.has('w') || keys.has('ArrowUp') ? 1 : 0)
        - (keys.has('s') || keys.has('ArrowDown') ? 1 : 0);
      return { x, y };
    },
    actionPressed() {
      return pressed.has('e') || pressed.has('Enter');
    },
    pausePressed() {
      return pressed.has('p') || pressed.has('Escape');
    },
    hornPressed() {
      return pressed.has('h');
    },
    endFrame() {
      pressed.clear();
      anyKey = false;
    },
    get anyKey() { return anyKey; },
  };
}
// Harbor Lights — recorded build touch
