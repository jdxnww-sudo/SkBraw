// ============================================================
// LOGO BRAWL — прототип на Phaser 3
// Логотип рисуется координатами (векторно), поэтому под любой
// скин достаточно передать новый цвет — картинки не нужны.
// ============================================================

// Силуэт логотипа как массив точек (0,0 — центр).
// Взято приближённо по форме загруженного лого: острый шип
// сверху + два "крыла" + зубчатая нижняя часть.
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
// PLAYER (стикмен + логотип-голова)
// ============================================================
class Player {
  constructor(scene, x, y, skinId, isBot = false, color = 0x55aaff){
    this.scene = scene;
    this.x = x; this.y = y;
    this.hp = 100;
    this.isBot = isBot;
    this.skin = getSkinById(skinId);
    this.teamColor = color;
    this.speed = 140;
    this.facing = 1;
    this.gfx = scene.add.graphics();
    this.alive = true;
  }

  draw(){
    const g = this.gfx;
    g.clear();
    if (!this.alive) return;

    const s = this.skin;
    // тело-палочка
    g.lineStyle(4, this.teamColor, 1);
    g.beginPath();
    g.moveTo(this.x, this.y - 4);         // шея
    g.lineTo(this.x, this.y + 22);        // туловище
    g.moveTo(this.x - 10, this.y + 10);   // левая рука
    g.lineTo(this.x + 10, this.y + 10);   // правая рука
    g.moveTo(this.x, this.y + 22);
    g.lineTo(this.x - 8, this.y + 38);    // левая нога
    g.moveTo(this.x, this.y + 22);
    g.lineTo(this.x + 8, this.y + 38);    // правая нога
    g.strokePath();

    // голова = логотип
    drawLogo(g, this.x, this.y - 14, 0.55, s.logo);

    // аксессуары скина (тоже код, не картинки)
    this.drawAccessory(g, s.accessory);

    // полоска HP
    g.fillStyle(0x000000, 0.5);
    g.fillRect(this.x - 16, this.y - 34, 32, 5);
    g.fillStyle(this.hp > 30 ? 0x4CAF50 : 0xff4444, 1);
    g.fillRect(this.x - 16, this.y - 34, 32 * (this.hp/100), 5);
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

  moveToward(tx, ty, delta){
    const dx = tx - this.x, dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) return;
    const nx = dx/dist, ny = dy/dist;
    this.x += nx * this.speed * (delta/1000);
    this.y += ny * this.speed * (delta/1000);
    this.facing = nx >= 0 ? 1 : -1;
  }
}

// ============================================================
// PHASER SCENE
// ============================================================
class ArenaScene extends Phaser.Scene {
  constructor(){ super("Arena"); }

  create(){
    this.cameras.main.setBackgroundColor("#241436");
    this.drawArena();

    this.player = new Player(this, 400, 500, window.selectedSkin || "default", false, 0x55aaff);
    this.bots = [
      new Player(this, 200, 150, "crimson", true, 0xff5555),
      new Player(this, 600, 150, "neon", true, 0x55ff88),
    ];

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys("W,A,S,D");

    // зона захвата (Zone Control режим)
    this.zone = this.add.circle(400, 300, 60, 0xf6c94a, 0.15).setStrokeStyle(3, 0xf6c94a);
    this.zoneControlTime = 0;
  }

  drawArena(){
    const g = this.add.graphics();
    g.fillStyle(0x2c1a44, 1);
    g.fillRect(0,0,800,600);
    // простые препятствия-кусты (код, не картинки)
    g.fillStyle(0x3a8f4c, 0.8);
    [[150,400],[650,400],[150,200],[650,200]].forEach(([x,y]) => {
      g.fillCircle(x, y, 30);
    });
  }

  update(time, delta){
    // управление игроком
    let dx = 0, dy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) dx = -1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) dx = 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) dy = -1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) dy = 1;

    if (dx || dy){
      const len = Math.hypot(dx,dy);
      this.player.x += (dx/len) * this.player.speed * (delta/1000);
      this.player.y += (dy/len) * this.player.speed * (delta/1000);
    }
    this.player.draw();

    // простейший ИИ ботов: идти к ближайшему врагу
    this.bots.forEach(bot => {
      if (!bot.alive) return;
      const distToPlayer = Phaser.Math.Distance.Between(bot.x,bot.y,this.player.x,this.player.y);
      if (distToPlayer < 250){
        bot.moveToward(this.player.x, this.player.y, delta);
      }
      bot.draw();
    });

    // захват зоны
    const inZone = Phaser.Math.Distance.Between(this.player.x,this.player.y,400,300) < 60;
    if (inZone){
      this.zoneControlTime += delta/1000;
      this.zone.setFillStyle(0xf6c94a, 0.35);
    } else {
      this.zone.setFillStyle(0xf6c94a, 0.15);
    }
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: "game-container",
  scene: [ArenaScene],
  physics: { default: "arcade" }
};

// Игра стартует только когда нажали "Играть" (см. ui.js)
window.startGame = function(){
  if (window.__game) return;
  document.getElementById("game-container").style.display = "block";
  window.__game = new Phaser.Game(config);
};
