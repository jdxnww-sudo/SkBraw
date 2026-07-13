// ============================================================
// LOGO BRAWL — прототип на Phaser 3
// Логотип рисуется координатами (векторно) — ФОРМА НЕ МЕНЯЕТСЯ,
// это тот же набор точек, что был изначально.
// ============================================================

// Силуэт логотипа как массив точек (0,0 — центр). НЕ ТРОГАТЬ.
const LOGO_MASK = [
  0,-46,  3,-15,  10,-18,  5,-4,
  20,-19, 45,2,  24,-1, 33,8,
  17,13,  7,10,  0,14,
  -7,10, -17,13, -33,8, -24,-1,
  -45,2, -20,-19, -5,-4, -10,-18, -3,-15
];
const LOGO_JAW = [
  -15,10, -20,28, -10,25, -8,35, 0,28,
  8,35, 10,25, 20,28, 15,10
];

// Рисует лого заданным цветом в Phaser.Graphics, с масштабом и позицией
function drawLogo(gfx, x, y, scale, color){
  gfx.fillStyle(color, 1);
  const toPts = (arr) => {
    const pts = [];
    for (let i = 0; i < arr.length; i += 2){
      pts.push(new Phaser.Geom.Point(x + arr[i]*scale, y + arr[i+1]*scale));
    }
    return pts;
  };
  gfx.fillPoints(toPts(LOGO_MASK), true);
  gfx.fillPoints(toPts(LOGO_JAW), true);
}

// ============================================================
// КАРТЫ (обстановка, препятствия, зона)
// ============================================================
const ZONE = { x: 400, y: 300, r: 64 };

const MAPS = [
  {
    name: "Пустошь",
    ground: 0x2c1a44,
    obstacles: [
      {x:150,y:420,r:30,type:"bush"}, {x:650,y:420,r:30,type:"bush"},
      {x:150,y:180,r:26,type:"rock"}, {x:650,y:180,r:26,type:"rock"},
      {x:400,y:120,r:22,type:"crate"}, {x:400,y:480,r:22,type:"crate"},
    ]
  },
  {
    name: "Руины",
    ground: 0x241a3a,
    obstacles: [
      {x:120,y:300,r:26,type:"rock"}, {x:680,y:300,r:26,type:"rock"},
      {x:260,y:140,r:22,type:"crate"}, {x:540,y:140,r:22,type:"crate"},
      {x:260,y:460,r:22,type:"crate"}, {x:540,y:460,r:22,type:"crate"},
      {x:400,y:210,r:24,type:"bush"}, {x:400,y:390,r:24,type:"bush"},
    ]
  }
];

// ============================================================
// PLAYER / BOT (стикмен + логотип-голова)
// ============================================================
class Player {
  constructor(scene, x, y, skinId, isBot, color, name){
    this.scene = scene;
    this.x = x; this.y = y;
    this.hp = 100; this.maxHp = 100;
    this.isBot = isBot;
    this.name = name;
    this.skin = getSkinById(skinId);
    this.teamColor = color;
    this.speed = 150;
    this.radius = 15;
    this.aimAngle = 0;
    this.alive = true;
    this.gfx = scene.add.graphics();

    this.atkCooldown = 0;
    this.atkRange = 58;
    this.atkDamage = 12;
    this.atkCone = 1.35; // рад, половина конуса удара

    this.superCharge = 0;
    this.superRadius = 105;
    this.superDamage = 38;

    this.dmgDealt = 0;
    this.dmgTaken = 0;
    this.kills = 0;

    this.hitFlash = 0;
    this.aiState = { wanderTimer: 0, target: null };
  }

  moveBy(dx, dy, delta, obstacles){
    if (!this.alive) return;
    if (dx || dy){
      const len = Math.hypot(dx, dy);
      const nx = dx/len, ny = dy/len;
      let newX = this.x + nx * this.speed * (delta/1000);
      let newY = this.y + ny * this.speed * (delta/1000);
      newX = Phaser.Math.Clamp(newX, 24, 776);
      newY = Phaser.Math.Clamp(newY, 24, 576);

      // столкновение с препятствиями
      obstacles.forEach(o => {
        const ddx = newX - o.x, ddy = newY - o.y;
        const dist = Math.hypot(ddx, ddy);
        const minDist = this.radius + o.r;
        if (dist < minDist && dist > 0.001){
          newX = o.x + (ddx/dist) * minDist;
          newY = o.y + (ddy/dist) * minDist;
        }
      });

      this.x = newX; this.y = newY;
      this.aimAngle = Math.atan2(ny, nx);
    }
  }

  tryAttack(targets){
    if (!this.alive || this.atkCooldown > 0) return;
    this.atkCooldown = 0.45;
    let hitAny = false;
    targets.forEach(t => {
      if (!t.alive || t === this) return;
      const dx = t.x - this.x, dy = t.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > this.atkRange) return;
      const ang = Math.atan2(dy, dx);
      let diff = Math.abs(Phaser.Math.Angle.Wrap(ang - this.aimAngle));
      if (diff > this.atkCone && dist > 26) return; // близко — попадаем в любом случае
      this.dealDamage(t, this.atkDamage, dx/dist || 0, dy/dist || 0, 14);
      hitAny = true;
    });
    if (hitAny) this.superCharge = Math.min(100, this.superCharge + 20);
    this.scene.swingFx(this);
  }

  tryStrong(targets){
    if (!this.alive || this.superCharge < 100) return;
    this.superCharge = 0;
    targets.forEach(t => {
      if (!t.alive || t === this) return;
      const dx = t.x - this.x, dy = t.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > this.superRadius) return;
      this.dealDamage(t, this.superDamage, dx/(dist||1), dy/(dist||1), 34);
    });
    this.scene.superFx(this);
  }

  dealDamage(target, amount, kx, ky, knock){
    target.hp = Math.max(0, target.hp - amount);
    target.dmgTaken += amount;
    target.hitFlash = 0.15;
    target.x = Phaser.Math.Clamp(target.x + kx*knock, 20, 780);
    target.y = Phaser.Math.Clamp(target.y + ky*knock, 20, 580);
    this.dmgDealt += amount;
    this.superCharge = Math.min(100, this.superCharge + amount*0.6);
    this.scene.floatingText(target.x, target.y - 40, "-" + Math.round(amount), "#ff5050");
    if (target.hp <= 0 && target.alive){
      target.alive = false;
      this.kills += 1;
      this.scene.onDeath(target, this);
    }
  }

  update(delta){
    if (this.atkCooldown > 0) this.atkCooldown -= delta/1000;
    if (this.hitFlash > 0) this.hitFlash -= delta/1000;
  }

  draw(){
    const g = this.gfx;
    g.clear();
    if (!this.alive) return;

    const s = this.skin;
    const flashColor = this.hitFlash > 0 ? 0xffffff : this.teamColor;

    g.lineStyle(4, flashColor, 1);
    g.beginPath();
    g.moveTo(this.x, this.y - 4);
    g.lineTo(this.x, this.y + 22);
    g.moveTo(this.x - 10, this.y + 10);
    g.lineTo(this.x + 10, this.y + 10);
    g.moveTo(this.x, this.y + 22);
    g.lineTo(this.x - 8, this.y + 38);
    g.moveTo(this.x, this.y + 22);
    g.lineTo(this.x + 8, this.y + 38);
    g.strokePath();

    drawLogo(g, this.x, this.y - 14, 0.55, s.logo);
    this.drawAccessory(g, s.accessory);

    // ник
    if (!this.nameText){
      this.nameText = this.scene.add.text(0,0,this.name,{fontFamily:"Nunito, sans-serif", fontSize:"11px", color:"#fff6e0", fontStyle:"700"}).setOrigin(0.5);
    }
    this.nameText.setPosition(this.x, this.y - 50);

    // полоска HP
    g.fillStyle(0x000000, 0.5);
    g.fillRect(this.x - 16, this.y - 44, 32, 5);
    g.fillStyle(this.hp > 30 ? 0x4CAF50 : 0xff4444, 1);
    g.fillRect(this.x - 16, this.y - 44, 32 * (this.hp/100), 5);
  }

  destroyVisuals(){
    this.gfx.clear();
    if (this.nameText) this.nameText.destroy();
  }

  drawAccessory(g, type){
    if (type === "crown"){
      g.fillStyle(0xf6c94a, 1);
      g.fillTriangle(this.x-8,this.y-32, this.x-2,this.y-32, this.x-5,this.y-40);
      g.fillTriangle(this.x-3,this.y-32, this.x+3,this.y-32, this.x,this.y-42);
      g.fillTriangle(this.x+2,this.y-32, this.x+8,this.y-32, this.x+5,this.y-40);
    } else if (type === "tie"){
      g.fillStyle(0xcc2222, 1);
      g.fillTriangle(this.x-3,this.y+6, this.x+3,this.y+6, this.x,this.y+18);
    } else if (type === "hood"){
      g.fillStyle(0x0d0d0d, 0.85);
      g.fillCircle(this.x, this.y-14, 15);
    }
  }

  moveToward(tx, ty, delta, obstacles){
    const dx = tx - this.x, dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) return;
    this.moveBy(dx, dy, delta, obstacles);
  }
}

// ============================================================
// PHASER SCENE
// ============================================================
class ArenaScene extends Phaser.Scene {
  constructor(){ super("Arena"); }

  init(data){
    this.mode = (data && data.mode) || "zone";
  }

  create(){
    const map = Phaser.Utils.Array.GetRandom(MAPS);
    this.map = map;
    this.cameras.main.setBackgroundColor("#241436");
    this.drawArena(map);

    const nick = (window.playerName || "Ты");
    this.player = new Player(this, 400, 500, window.selectedSkin || "default", false, 0x55aaff, nick);
    this.bots = [
      new Player(this, 200, 150, "crimson", true, 0xff5555, "Кримсон"),
      new Player(this, 600, 150, "neon", true, 0x55ff88, "Неон"),
    ];
    this.allEntities = [this.player, ...this.bots];

    this.fxLayer = this.add.graphics();

    this.matchState = {
      finished: false,
      timeLeft: 120,
      zoneMeter: 50,
    };

    Controls.reset();
    this.updateTimerDom();
    this.updateZoneDom();
    this.updateKillDom();
  }

  drawArena(map){
    const g = this.add.graphics();
    g.fillStyle(map.ground, 1);
    g.fillRect(0,0,800,600);

    // текстура земли — лёгкие пятна травы
    g.fillStyle(0xffffff, 0.03);
    for (let i=0;i<40;i++){
      const rx = Phaser.Math.Between(20,780), ry = Phaser.Math.Between(20,580);
      g.fillCircle(rx, ry, Phaser.Math.Between(2,5));
    }

    // предупреждающая полосатая рамка арены
    g.lineStyle(10, 0xf6c94a, 0.85);
    g.strokeRect(5,5,790,590);
    g.lineStyle(3, 0x1a1024, 0.6);
    g.strokeRect(5,5,790,590);

    // зона захвата
    this.zoneGfx = this.add.graphics();

    // препятствия
    map.obstacles.forEach(o => {
      if (o.type === "bush"){
        g.fillStyle(0x3a8f4c, 0.85);
        g.fillCircle(o.x, o.y, o.r);
        g.fillStyle(0x2e6e3a, 0.6);
        g.fillCircle(o.x-6, o.y-4, o.r*0.5);
      } else if (o.type === "rock"){
        g.fillStyle(0x6b6478, 1);
        g.fillCircle(o.x, o.y, o.r);
        g.fillStyle(0x8b8498, 1);
        g.fillCircle(o.x-o.r*0.3, o.y-o.r*0.3, o.r*0.45);
      } else if (o.type === "crate"){
        g.fillStyle(0x8a5a2b, 1);
        g.fillRect(o.x-o.r, o.y-o.r, o.r*2, o.r*2);
        g.lineStyle(2, 0x5c3a1a, 1);
        g.strokeRect(o.x-o.r, o.y-o.r, o.r*2, o.r*2);
        g.lineBetween(o.x-o.r, o.y-o.r, o.x+o.r, o.y+o.r);
        g.lineBetween(o.x+o.r, o.y-o.r, o.x-o.r, o.y+o.r);
      }
    });
  }

  floatingText(x, y, text, color){
    const t = this.add.text(x, y, text, {fontFamily:"Nunito, sans-serif", fontSize:"16px", color, fontStyle:"800"}).setOrigin(0.5);
    this.tweens.add({ targets: t, y: y-30, alpha:0, duration:600, ease:"Cubic.easeOut", onComplete:()=>t.destroy() });
  }

  swingFx(entity){
    const fx = this.add.circle(
      entity.x + Math.cos(entity.aimAngle)*30,
      entity.y + Math.sin(entity.aimAngle)*30,
      16, 0xffffff, 0.5
    );
    this.tweens.add({ targets: fx, alpha:0, scale:1.6, duration:180, onComplete:()=>fx.destroy() });
  }

  superFx(entity){
    const ring = this.add.circle(entity.x, entity.y, 10, 0xf6c94a, 0.35).setStrokeStyle(3, 0xf6c94a);
    this.tweens.add({ targets: ring, radius: entity.superRadius, alpha:0, duration:320, onComplete:()=>ring.destroy() });
    this.cameras.main.shake(120, 0.006);
  }

  onDeath(target, killer){
    this.floatingText(target.x, target.y - 20, "☠", "#ffffff");
  }

  updateTimerDom(){
    const t = Math.max(0, Math.ceil(this.matchState.timeLeft));
    const m = Math.floor(t/60), s = t%60;
    document.getElementById("timerBox").textContent = m + ":" + String(s).padStart(2,"0");
  }

  updateZoneDom(){
    const wrap = document.getElementById("zoneBarWrap");
    const fill = document.getElementById("zoneBarFill");
    const label = document.getElementById("zoneBarLabel");
    if (this.mode !== "zone"){
      wrap.style.display = "none";
      return;
    }
    wrap.style.display = "block";
    const m = this.matchState.zoneMeter;
    fill.style.width = m + "%";
    label.textContent = m >= 50 ? ("Захват: " + Math.round(m) + "%") : ("Боты теснят: " + Math.round(100-m) + "%");
  }

  updateKillDom(){
    const el = document.getElementById("killCounter");
    if (this.mode === "deathmatch"){
      const botsAlive = this.bots.filter(b=>b.alive).length;
      el.textContent = "💀 Ботов осталось: " + botsAlive;
    } else {
      el.textContent = "💀 " + this.player.kills;
    }
  }

  endMatch(result, reasonText){
    if (this.matchState.finished) return;
    this.matchState.finished = true;
    const stats = [this.player, ...this.bots].map(e => ({
      name: e.name, dealt: Math.round(e.dmgDealt), kills: e.kills, isPlayer: !e.isBot
    }));
    window.showMatchResults({ result, reasonText, stats });
  }

  update(time, delta){
    if (this.matchState.finished) return;
    const dt = delta;

    // ---- игрок: движение по джойстику/клавиатуре ----
    const mv = Controls.getMove();
    this.player.moveBy(mv.x, mv.y, dt, this.map.obstacles);

    if (Controls.consumeAttack()) this.player.tryAttack(this.bots);
    if (Controls.consumeSuper()) this.player.tryStrong(this.bots);
    Controls.setSuperCharge(this.player.superCharge);

    // ---- боты: ИИ ----
    this.bots.forEach((bot, i) => {
      if (!bot.alive) return;
      const distToPlayer = this.player.alive ? Phaser.Math.Distance.Between(bot.x,bot.y,this.player.x,this.player.y) : Infinity;

      let targetX, targetY;
      if (this.player.alive && distToPlayer < 210){
        targetX = this.player.x; targetY = this.player.y;
      } else if (this.mode === "zone"){
        const off = (i - 0.5) * 40;
        targetX = ZONE.x + off; targetY = ZONE.y;
      } else {
        bot.aiState.wanderTimer -= dt/1000;
        if (!bot.aiState.target || bot.aiState.wanderTimer <= 0){
          bot.aiState.target = { x: Phaser.Math.Between(60,740), y: Phaser.Math.Between(60,540) };
          bot.aiState.wanderTimer = 2.5;
        }
        targetX = bot.aiState.target.x; targetY = bot.aiState.target.y;
      }
      bot.moveToward(targetX, targetY, dt, this.map.obstacles);

      if (this.player.alive && distToPlayer < bot.atkRange + 6){
        bot.aimAngle = Math.atan2(this.player.y-bot.y, this.player.x-bot.x);
        bot.tryAttack([this.player]);
      }
    });

    // ---- разделение перекрывающихся сущностей ----
    const all = this.allEntities;
    for (let i=0;i<all.length;i++){
      for (let j=i+1;j<all.length;j++){
        const a = all[i], b = all[j];
        if (!a.alive || !b.alive) continue;
        const dx = b.x-a.x, dy = b.y-a.y;
        const dist = Math.hypot(dx,dy) || 0.001;
        const minDist = a.radius + b.radius;
        if (dist < minDist){
          const push = (minDist - dist) / 2;
          const nx = dx/dist, ny = dy/dist;
          a.x -= nx*push; a.y -= ny*push;
          b.x += nx*push; b.y += ny*push;
        }
      }
    }

    this.player.update(dt);
    this.bots.forEach(b=>b.update(dt));

    // ---- зона захвата ----
    this.zoneGfx.clear();
    const meter = this.matchState.zoneMeter;
    this.zoneGfx.fillStyle(0xf6c94a, this.player.alive && Phaser.Math.Distance.Between(this.player.x,this.player.y,ZONE.x,ZONE.y)<ZONE.r ? 0.32 : 0.14);
    this.zoneGfx.fillCircle(ZONE.x, ZONE.y, ZONE.r);
    this.zoneGfx.lineStyle(3, 0xf6c94a, 0.9);
    this.zoneGfx.strokeCircle(ZONE.x, ZONE.y, ZONE.r);

    if (this.mode === "zone" && !this.matchState.finished){
      const playerIn = this.player.alive && Phaser.Math.Distance.Between(this.player.x,this.player.y,ZONE.x,ZONE.y) < ZONE.r;
      const botsIn = this.bots.some(b=>b.alive && Phaser.Math.Distance.Between(b.x,b.y,ZONE.x,ZONE.y) < ZONE.r);
      const rate = 9 * (dt/1000);
      if (playerIn && !botsIn) this.matchState.zoneMeter = Math.min(100, this.matchState.zoneMeter + rate);
      else if (botsIn && !playerIn) this.matchState.zoneMeter = Math.max(0, this.matchState.zoneMeter - rate);
    }

    // ---- проверка условий победы ----
    if (!this.player.alive){
      this.endMatch("lose", "Ты выбыл из боя");
    } else if (this.mode === "deathmatch"){
      if (this.bots.every(b=>!b.alive)) this.endMatch("win", "Все боты повержены");
    } else if (this.mode === "zone"){
      if (this.matchState.zoneMeter >= 100) this.endMatch("win", "Зона захвачена полностью");
      else if (this.matchState.zoneMeter <= 0) this.endMatch("lose", "Боты захватили зону");
    }

    if (!this.matchState.finished){
      this.matchState.timeLeft -= dt/1000;
      if (this.matchState.timeLeft <= 0){
        if (this.mode === "zone"){
          this.endMatch(this.matchState.zoneMeter >= 50 ? "win" : "lose", "Время матча вышло");
        } else {
          const botsAlive = this.bots.filter(b=>b.alive).length;
          this.endMatch(botsAlive === 0 ? "win" : "lose", "Время матча вышло");
        }
      }
    }

    this.updateTimerDom();
    this.updateZoneDom();
    this.updateKillDom();

    // ---- отрисовка ----
    this.player.draw();
    this.bots.forEach(b=>b.draw());
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: "game-container",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [ArenaScene],
  physics: { default: "arcade" }
};

// Игра стартует только когда нажали "Играть" (см. ui.js)
window.startGame = function(mode){
  document.getElementById("game-container").style.display = "block";
  document.getElementById("hud").classList.add("active");
  if (window.__game){
    const scene = window.__game.scene.getScene("Arena");
    scene.scene.restart({ mode });
    window.__game.resume();
    return;
  }
  window.__game = new Phaser.Game(config);
  window.__game.scene.start("Arena", { mode });
};

window.stopGame = function(){
  document.getElementById("game-container").style.display = "none";
  document.getElementById("hud").classList.remove("active");
  if (window.__game) window.__game.pause();
};
