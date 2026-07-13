// ============================================================
// УПРАВЛЕНИЕ: джойстик (pointer events — работает и на тачах,
// и мышью), кнопки удара/супер-удара, клавиатура как альтернатива.
// Единая точка входа window.Controls, которую читает game.js.
// ============================================================

window.Controls = (function(){
  let moveX = 0, moveY = 0;
  let attackQueued = false;
  let superQueued = false;
  let superReady = false;

  const zone = document.getElementById("joystickZone");
  const base = document.getElementById("joyBase");
  const nub  = document.getElementById("joyNub");
  const attackBtn = document.getElementById("attackBtn");
  const superBtn  = document.getElementById("superBtn");

  const MAX_R = 50;
  let activePointerId = null;
  let baseX = 0, baseY = 0;

  function showBase(x, y){
    base.style.left = x + "px"; base.style.top = y + "px";
    nub.style.left  = x + "px"; nub.style.top  = y + "px";
    base.style.display = "block";
    nub.style.display  = "block";
  }
  function hideBase(){
    base.style.display = "none";
    nub.style.display  = "none";
    moveX = 0; moveY = 0;
  }

  zone.addEventListener("pointerdown", (e) => {
    if (activePointerId !== null) return;
    activePointerId = e.pointerId;
    const r = zone.getBoundingClientRect();
    baseX = e.clientX - r.left; baseY = e.clientY - r.top;
    showBase(baseX, baseY);
    zone.setPointerCapture(e.pointerId);
  });

  zone.addEventListener("pointermove", (e) => {
    if (e.pointerId !== activePointerId) return;
    const r = zone.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    let dx = px - baseX, dy = py - baseY;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, MAX_R);
    const angle = Math.atan2(dy, dx);
    const nx = baseX + Math.cos(angle) * clamped;
    const ny = baseY + Math.sin(angle) * clamped;
    nub.style.left = nx + "px"; nub.style.top = ny + "px";
    moveX = dist > 4 ? Math.cos(angle) * (clamped / MAX_R) : 0;
    moveY = dist > 4 ? Math.sin(angle) * (clamped / MAX_R) : 0;
  });

  function endTouch(e){
    if (e.pointerId !== activePointerId) return;
    activePointerId = null;
    hideBase();
  }
  zone.addEventListener("pointerup", endTouch);
  zone.addEventListener("pointercancel", endTouch);

  attackBtn.addEventListener("pointerdown", (e) => { e.preventDefault(); attackQueued = true; });
  superBtn.addEventListener("pointerdown", (e) => { e.preventDefault(); if (superReady) superQueued = true; });

  // ---------- клавиатура (как альтернатива джойстику) ----------
  const keys = {};
  window.addEventListener("keydown", (e) => {
    keys[e.code] = true;
    if (e.code === "Space") attackQueued = true;
    if (e.code === "KeyQ" && superReady) superQueued = true;
  });
  window.addEventListener("keyup", (e) => { keys[e.code] = false; });

  function keyboardVector(){
    let x = 0, y = 0;
    if (keys["ArrowLeft"]  || keys["KeyA"]) x -= 1;
    if (keys["ArrowRight"] || keys["KeyD"]) x += 1;
    if (keys["ArrowUp"]    || keys["KeyW"]) y -= 1;
    if (keys["ArrowDown"]  || keys["KeyS"]) y += 1;
    if (x || y){
      const len = Math.hypot(x, y);
      return { x: x/len, y: y/len };
    }
    return null;
  }

  return {
    getMove(){
      const kb = keyboardVector();
      if (kb) return kb;
      return { x: moveX, y: moveY };
    },
    consumeAttack(){
      if (attackQueued){ attackQueued = false; return true; }
      return false;
    },
    consumeSuper(){
      if (superQueued){ superQueued = false; return true; }
      return false;
    },
    setSuperCharge(pct){
      const ring = document.getElementById("superRing");
      ring.style.setProperty("--pct", Math.min(100, pct) + "%");
      superReady = pct >= 100;
      superBtn.classList.toggle("ready", superReady);
    },
    reset(){
      attackQueued = false; superQueued = false; superReady = false;
      hideBase(); activePointerId = null;
    }
  };
})();
