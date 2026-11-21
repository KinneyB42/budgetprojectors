/* Quiz recommendation data.
   band: 0 = under $500, 1 = $500-1,000, 2 = $1,000-2,000, 3 = $2,000+
   NOTE (Brandon: verify): price bands assigned from memory 2026-09-29, please correct any that are off.
   Entries added 2026-11-19 (MoGo 4, EF-72, HORIZON 30 Pro, LS6000, HORIZON 30 Ultra Max,
   TITAN Noir, VisionMaster Pro 2) have bands set from prices verified that day.
   Update 2026-11-21: TK700STi replaced by TK705i and TK705STi (CJ brand links added),
   HORIZON 20, 20 Pro and 20 Max removed, HORIZON 30 Max added, VisionMaster Max
   given its Valerion deep link.
   light: room lightings the model suits: dark / ambient / bright
   uses: movies / sports / gaming / everything
*/
window.QUIZ_MODELS = [
  {
    brand: "XGIMI", model: "MoGo 4", band: 0,
    light: ["dark", "ambient"], uses: ["movies", "everything"], portable: true,
    why: ["Compact and portable, move it room to room or take it outside.", "Google TV built in, and the flip stand makes setup easy anywhere."],
    brandUrl: "https://xgimi.sjv.io/5k0nYN"
  },
  {
    brand: "BenQ", model: "TH575", band: 1,
    light: ["ambient", "bright"], uses: ["sports", "gaming", "everything"], portable: false,
    why: ["Very bright 1080p lamp projector, holds up with lights on.", "Low input lag makes it a genuine budget gaming option."],
    brandUrl: null
  },
  {
    brand: "Epson", model: "EF-72", band: 1,
    light: ["dark", "ambient"], uses: ["movies", "everything"], portable: true,
    why: ["Portable 3LCD with pixel shift 4K, Google TV and Sound by Bose built in.", "The tilting stand points it at a wall or the ceiling, no mount needed."],
    brandUrl: null
  },
  {
    brand: "BenQ", model: "TK705i", band: 2,
    light: ["dark", "ambient"], uses: ["gaming", "movies", "everything"], portable: false,
    why: ["4K LED with 3,000 ANSI lumens and a 1.0 to 1.3 zoom for flexible placement.", "5 ms input lag at 4K 60Hz, so it games as well as it shows movies."],
    brandUrl: "https://www.tkqlhce.com/click-101708134-17107164?url=https%3A%2F%2Fwww.benq.com%2Fen-us%2Fprojector%2Fhome-projectors%2Ftk705i.html"
  },
  {
    brand: "BenQ", model: "TK705STi", band: 2,
    light: ["dark", "ambient"], uses: ["gaming", "sports", "everything"], portable: false,
    why: ["Short throw 4K, a big image from just a few feet away.", "3,000 ANSI lumens and 5 ms lag at 4K 60Hz, built for gaming rooms."],
    brandUrl: "https://www.tkqlhce.com/click-101708134-17107164?url=https%3A%2F%2Fwww.benq.com%2Fen-us%2Fprojector%2Fhome-projectors%2Ftk705sti.html"
  },
  {
    brand: "BenQ", model: "X3100i", band: 2,
    light: ["dark", "ambient"], uses: ["gaming", "movies", "everything"], portable: false,
    why: ["4K with some of the lowest input lag in its class.", "Bright enough for a living room, refined enough for a theater."],
    brandUrl: null
  },
  {
    brand: "XGIMI", model: "HORIZON 30 Pro", band: 2,
    light: ["dark", "ambient", "bright"], uses: ["movies", "sports", "everything"], portable: false,
    why: ["4K 120Hz RGB triple laser with real lens shift for flexible placement.", "A serious home theater step up at 4,800 ISO lumens."],
    brandUrl: "https://xgimi.sjv.io/yZ5K4B"
  },
  {
    brand: "Epson", model: "LS6000", band: 2,
    light: ["dark", "ambient"], uses: ["movies", "sports", "everything"], portable: false,
    why: ["3LCD laser, so no rainbow effect, with a wide zoom and lens shift.", "A traditional home theater projector that fits a lot of rooms."],
    brandUrl: null
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
    why: ["Extremely bright triple-laser 4K, handles ambient light like few others.", "Gimbal design makes placement unusually flexible."],
    brandUrl: "https://affiliate.jmgo.com/OYv0dG"
  },
  {
    brand: "JMGO", model: "IRIS Ultra Max", band: 3,
    light: ["dark", "ambient", "bright"], uses: ["movies", "sports", "everything"], portable: false,
    why: ["The brightest of the bunch, built for big screens in real rooms.", "Reference-level triple-laser color."],
    brandUrl: "https://affiliate.jmgo.com/JkvXAN"
  },
  {
    brand: "XGIMI", model: "HORIZON 30 Max", band: 3,
    light: ["dark", "ambient", "bright"], uses: ["movies", "sports", "everything"], portable: false,
    why: ["5,300 ISO lumens of RGB triple laser brightness for big screens.", "Real lens shift and 4K 120Hz, the step up from the 30 Pro."],
    brandUrl: "https://xgimi.sjv.io/MK1qRY"
  },
  {
    brand: "XGIMI", model: "HORIZON 30 Ultra Max", band: 3,
    light: ["dark", "ambient", "bright"], uses: ["movies", "sports", "gaming", "everything"], portable: false,
    why: ["The brightest XGIMI yet at 6,000 ISO lumens, with 10,000:1 native contrast.", "4K 120Hz triple laser that holds up on big screens with the lights on."],
    brandUrl: "https://xgimi.sjv.io/KBA6yv"
  },
  {
    brand: "XGIMI", model: "TITAN Noir", band: 3,
    light: ["dark", "ambient"], uses: ["movies", "everything"], portable: false,
    why: ["XGIMI's dedicated home theater line, with a wide 0.98 to 2.0 zoom range.", "Made for a fixed install in a real theater room."],
    brandUrl: "https://xgimi.sjv.io/gRXG69"
  },
  {
    brand: "Valerion", model: "VisionMaster Pro 2", band: 3,
    light: ["dark", "ambient"], uses: ["movies", "gaming", "everything"], portable: false,
    why: ["RGB triple laser 4K with a 0.9 to 1.5 zoom, flexible in smaller rooms.", "The enthusiast pick under the flagship Max."],
    brandUrl: "https://valerionus.pxf.io/zzd0qM?u=https%3A%2F%2Fwww.valerion.com%2Fproduct%2Fvalerion-visionmaster-pro2-pro-4k-rgb-triple-laser-projector"
  },
  {
    brand: "Valerion", model: "VisionMaster Max", band: 3,
    light: ["dark", "ambient"], uses: ["movies", "gaming", "everything"], portable: false,
    why: ["RGB triple-laser 4K aimed squarely at enthusiasts.", "Deep blacks and low lag in one package."],
    brandUrl: "https://valerionus.pxf.io/zzd0qM?u=https%3A%2F%2Fwww.valerion.com%2Fproduct%2Fvalerion-visionmaster-4k-rgb-triple-laser-projector"
  }
];
