// ============================================================
// UI МЕНЮ — магазин скинов, комнаты, превью аватара.
// Превью рисуется тем же набором точек LOGO_MASK/LOGO_JAW,
// что и в игре — единый источник правды для формы лого.
// ============================================================

window.selectedSkin = localStorage.getItem("selectedSkin") || "default";
document.getElementById("game-container").style.display = "none";

function drawLogoCanvas(ctx, x, y, scale, colorHex){
  ctx.fillStyle = "#" + colorHex.toString(16).padStart(6,"0");
  const drawPoly = (arr) => {
    ctx.beginPath();
    ctx.moveTo(x + arr[0]*scale, y + arr[1]*scale);
    for (let i = 2; i < arr.length; i += 2){
      ctx.lineTo(x + arr[i]*scale, y + arr[i+1]*scale);
    }
    ctx.closePath();
    ctx.fill();
  };
  drawPoly(LOGO_MASK);
  drawPoly(LOGO_JAW);
}

function renderAvatarPreview(canvasEl, skin){
  const ctx = canvasEl.getContext("2d");
  ctx.clearRect(0,0,canvasEl.width,canvasEl.height);
  ctx.fillStyle = "#" + skin.body.toString(16).padStart(6,"0");
  ctx.beginPath();
  ctx.arc(canvasEl.width/2, canvasEl.height/2, canvasEl.width/2 - 4, 0, Math.PI*2);
  ctx.fill();
  drawLogoCanvas(ctx, canvasEl.width/2, canvasEl.height/2 + 4, 0.7, skin.logo);
}

// главный аватар в карточке игрока
renderAvatarPreview(document.getElementById("avatarPreview"), getSkinById(window.selectedSkin));

// ---------- МАГАЗИН ----------
function renderShop(){
  const list = document.getElementById("skinList");
  list.innerHTML = "";
  SKINS.forEach(skin => {
    const item = document.createElement("div");
    item.className = "skin-item";
    const cv = document.createElement("canvas");
    cv.width = 60; cv.height = 60;
    item.appendChild(cv);
    const label = document.createElement("div");
    label.textContent = skin.name;
    const price = document.createElement("div");
    price.className = "price";
    price.textContent = skin.price === 0 ? "Открыт" : `🪙 ${skin.price}`;
    item.appendChild(label);
    item.appendChild(price);

    item.onclick = () => {
      window.selectedSkin = skin.id;
      localStorage.setItem("selectedSkin", skin.id);
      renderAvatarPreview(document.getElementById("avatarPreview"), skin);
    };
    list.appendChild(item);
    renderAvatarPreview(cv, skin);
  });
}
renderShop();

document.getElementById("shopBtn").onclick = () => document.getElementById("shopPanel").classList.remove("hidden");
document.getElementById("closeShop").onclick = () => document.getElementById("shopPanel").classList.add("hidden");

// ---------- КОМНАТЫ ----------
function generateRoomCode(){
  return "ROOM-" + Math.floor(100 + Math.random()*900);
}
document.getElementById("roomBtn").onclick = () => {
  document.getElementById("roomCode").textContent = generateRoomCode();
  document.getElementById("roomPanel").classList.remove("hidden");
};
document.getElementById("closeRoom").onclick = () => document.getElementById("roomPanel").classList.add("hidden");
document.getElementById("joinRoomBtn").onclick = () => {
  const code = document.getElementById("joinCode").value.trim();
  if (/^ROOM-\d{3}$/.test(code)){
    alert("Подключение к комнате " + code + " (здесь будет вызов Firebase Realtime DB)");
  } else {
    alert("Неверный формат кода. Пример: ROOM-123");
  }
};

// ---------- ДРУЗЬЯ (заглушка под Firebase Auth) ----------
document.getElementById("friendsBtn").onclick = () => {
  alert("Тут будет список друзей через Firebase Auth (Google/GitHub вход).\nПока не подключено.");
};

// ---------- СТАРТ ИГРЫ ----------
document.getElementById("playBtn").onclick = () => {
  document.getElementById("menu").style.display = "none";
  window.startGame();
};
