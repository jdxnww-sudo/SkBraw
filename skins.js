// ============================================================
// СИСТЕМА СКИНОВ — полностью кодом, без картинок.
// Каждый скин = палитра цветов + (опционально) аксессуар.
// Хочешь добавить новый скин — просто допиши объект в массив.
// ============================================================

const SKINS = [
  {
    id: "default",
    name: "Классик",
    price: 0,
    body: 0x2b2b2b,      // цвет стикмена (палочки)
    logo: 0xf6c94a,      // цвет логотипа-головы (золото)
    outline: 0x1a1a1a,
    accessory: null
  },
  {
    id: "neon",
    name: "Неон",
    price: 300,
    body: 0x111111,
    logo: 0x39ff88,
    outline: 0x00ffcc,
    accessory: null
  },
  {
    id: "crimson",
    name: "Багровый",
    price: 500,
    body: 0x2b2b2b,
    logo: 0xff3b3b,
    outline: 0x8a0000,
    accessory: null
  },
  {
    id: "business",
    name: "Бизнесмен",
    price: 800,
    body: 0x1c1c3a,
    logo: 0xf6c94a,
    outline: 0x0d0d1f,
    accessory: "tie"      // рисуется отдельной функцией-примитивом
  },
  {
    id: "hacker",
    name: "Хакер",
    price: 800,
    body: 0x0d0d0d,
    logo: 0x00ff41,
    outline: 0x003b00,
    accessory: "hood"
  },
  {
    id: "royal",
    name: "Королевский",
    price: 1500,
    body: 0x2b2b2b,
    logo: 0xffffff,
    outline: 0xf6c94a,
    accessory: "crown"
  }
];

function getSkinById(id){
  return SKINS.find(s => s.id === id) || SKINS[0];
}
