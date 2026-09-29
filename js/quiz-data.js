/* Quiz recommendation data.
   band: 0 = under $500, 1 = $500-1,000, 2 = $1,000-2,000, 3 = $2,000+
   NOTE (Brandon: verify): price bands assigned from memory 2026-09-29 — please correct any that are off.
   light: room lightings the model suits: dark / ambient / bright
   uses: movies / sports / gaming / everything
*/
window.QUIZ_MODELS = [
  {
    brand: "XGIMI", model: "MoGo 3 Pro", band: 0,
    light: ["dark", "ambient"], uses: ["movies", "everything"], portable: true,
    why: ["Compact and portable — move it room to room or take it outside.", "Sharp 1080p image that punches above its size in dimmer rooms."],
    brandUrl: null
  },
  {
    brand: "BenQ", model: "TH575", band: 1,
    light: ["ambient", "bright"], uses: ["sports", "gaming", "everything"], portable: false,
    why: ["Very bright 1080p lamp projector — holds up with lights on.", "Low input lag makes it a genuine budget gaming option."],
    brandUrl: null
  },
  {
    brand: "BenQ", model: "HT2060", band: 1,
    light: ["dark"], uses: ["movies", "everything"], portable: false,
    why: ["Excellent contrast and color for the money — a real theater image.", "Quiet, sharp 1080p; the dark-room value pick."],
    brandUrl: null
  },
  {
    brand: "BenQ", model: "TK700STi", band: 2,
    light: ["dark", "ambient"], uses: ["gaming", "sports", "everything"], portable: false,
    why: ["4K short throw built for gaming — big image from close up.", "Low lag plus high refresh options for fast games."],
    brandUrl: null
  },
  {
    brand: "BenQ", model: "X3100i", band: 2,
    light: ["dark", "ambient"], uses: ["gaming", "movies", "everything"], portable: false,
    why: ["4K with some of the lowest input lag in its class.", "Bright enough for a living room, refined enough for a theater."],
    brandUrl: null
  },
  {
    brand: "XGIMI", model: "HORIZON 20", band: 2,
    light: ["dark", "ambient"], uses: ["movies", "sports", "everything"], portable: false,
    why: ["Smart 4K lifestyle projector with strong built-in audio.", "Bright, sharp, and simple — no receiver required to enjoy it."],
    brandUrl: "https://xgimi.sjv.io/R0dbmb"
  },
  {
    brand: "XGIMI", model: "HORIZON 20 Pro", band: 2,
    light: ["ambient", "bright"], uses: ["movies", "sports", "everything"], portable: false,
    why: ["A meaningful brightness step up for rooms with real ambient light.", "Flagship image quality without flagship complexity."],
    brandUrl: "https://xgimi.sjv.io/MKdbyo"
  },
  {
    brand: "JMGO", model: "N3 Ultimate", band: 3,
    light: ["dark", "ambient"], uses: ["movies", "everything"], portable: false,
    why: ["Triple-laser 4K flagship with superb color and contrast.", "Theater-grade image for dedicated rooms."],
    brandUrl: "https://affiliate.jmgo.com/NGygxq"
  },
  {
    brand: "JMGO", model: "IRIS Ultra", band: 3,
    light: ["dark", "ambient", "bright"], uses: ["movies", "sports", "everything"], portable: false,
    why: ["Extremely bright triple-laser 4K — handles ambient light like few others.", "Gimbal design makes placement unusually flexible."],
    brandUrl: "https://affiliate.jmgo.com/OYv0dG"
  },
  {
    brand: "JMGO", model: "IRIS Ultra Max", band: 3,
    light: ["dark", "ambient", "bright"], uses: ["movies", "sports", "everything"], portable: false,
    why: ["The brightest of the bunch — built for big screens in real rooms.", "Reference-level triple-laser color."],
    brandUrl: "https://affiliate.jmgo.com/JkvXAN"
  },
  {
    brand: "XGIMI", model: "HORIZON 20 Max", band: 3,
    light: ["ambient", "bright"], uses: ["movies", "sports", "everything"], portable: false,
    why: ["XGIMI's brightest 4K — made for large screens with lights on.", "Premium build and sound to match the picture."],
    brandUrl: "https://xgimi.sjv.io/qW6yZL"
  },
  {
    brand: "Valerion", model: "VisionMaster Max", band: 3,
    light: ["dark", "ambient"], uses: ["movies", "gaming", "everything"], portable: false,
    why: ["RGB triple-laser 4K aimed squarely at enthusiasts.", "Deep blacks and low lag in one package."],
    brandUrl: null
  }
];
