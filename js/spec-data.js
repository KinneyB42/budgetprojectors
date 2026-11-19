// BudgetProjectors manufacturer spec data — verified against official manufacturer pages 2026-09-29.
// All figures are manufacturer-published; fields the manufacturer does not publish are null.
// Lumens: BenQ publishes true ANSI lumens. JMGO, XGIMI, Valerion, and Epson publish ISO lumens
// (ISO 21118), flagged via lumensNote — do not treat these as ANSI.
// Input lag: where a manufacturer publishes multiple figures per resolution/refresh rate,
// the lowest published (gaming headline) figure is recorded; the source comment notes the condition.
window.SPEC_DATA = [
  // Source: https://global.jmgo.com/pages/iris-ultra
  {brand:"JMGO", model:"IRIS Ultra", resolution:"4K UHD", ansiLumens:4500, lumensNote:"ISO lumens, not ANSI", throwRatio:"0.88-1.7:1", lightSource:"Triple laser", inputLagMs:1, lensShift:"Vertical ±130%, Horizontal ±53%", contrast:"7000:1 (native)"},
  // Source: https://global.jmgo.com/products/jmgo-iris-ultra-max
  {brand:"JMGO", model:"IRIS Ultra Max", resolution:"4K UHD", ansiLumens:6500, lumensNote:"ISO lumens, not ANSI", throwRatio:"0.88-1.7:1", lightSource:"Triple laser", inputLagMs:1, lensShift:"Vertical ±130%, Horizontal ±53%", contrast:"10000:1 (native)"},
  // Source: https://global.jmgo.com/products/jmgo-n3-ultimate
  {brand:"JMGO", model:"N3 Ultimate", resolution:"4K UHD", ansiLumens:5800, lumensNote:"ISO lumens, not ANSI", throwRatio:"0.88-1.7:1", lightSource:"Triple laser (MALC 5.0)", inputLagMs:1, lensShift:"Four-way lens shift (no % published)", contrast:"20000:1"},
  // Source: https://global.xgimi.com/products/horizon-20
  // Input lag: 1ms at 1080p@240Hz (also 2.2ms at 1080p@120Hz, 3ms at 4K@60Hz)
  {brand:"XGIMI", model:"HORIZON 20", resolution:"4K UHD", ansiLumens:3200, lumensNote:"ISO lumens (ISO 21118), not ANSI", throwRatio:"1.2-1.5:1", lightSource:"RGB triple laser", inputLagMs:1, lensShift:"Vertical ±120%, Horizontal ±45%", contrast:"20000:1 (DBLE on)"},
  // Source: https://eu.xgimi.com/pages/horizon-20-pro
  // Input lag: 1ms at 1080p@240Hz (also 2.2ms at 1080p@120Hz, 3ms at 4K@60Hz)
  {brand:"XGIMI", model:"HORIZON 20 Pro", resolution:"4K UHD", ansiLumens:4100, lumensNote:"ISO lumens (ISO 21118), not ANSI", throwRatio:"1.2-1.5:1", lightSource:"RGB triple laser", inputLagMs:1, lensShift:"Vertical ±120%, Horizontal ±45%", contrast:"20000:1 (DBLE on)"},
  // Source: https://eu.xgimi.com/products/horizon-20-max
  // Input lag: 1ms at 1080p@240Hz (also 2.2ms at 1080p@120Hz, 3ms at 4K@60Hz)
  {brand:"XGIMI", model:"HORIZON 20 Max", resolution:"4K UHD", ansiLumens:5700, lumensNote:"ISO lumens (ISO 21118), not ANSI", throwRatio:"1.2-1.5:1", lightSource:"RGB triple laser", inputLagMs:1, lensShift:"Vertical ±120%, Horizontal ±45%", contrast:"20000:1 (DBLE on)"},
  // Source: https://uk.xgimi.com/collections/all/products/horizon-30-pro
  // Input lag: 1ms at 1080p@240Hz (also 2.2ms at 1080p@120Hz, 1.9ms at 4K@120Hz, 3ms at 4K@60Hz)
  {brand:"XGIMI", model:"HORIZON 30 Pro", resolution:"4K UHD", ansiLumens:4800, lumensNote:"ISO lumens (ISO 21118), not ANSI", throwRatio:"1.2-1.5:1", lightSource:"RGB triple laser", inputLagMs:1, lensShift:"Vertical ±130%, Horizontal ±50%", contrast:"8000:1 (native)"},
  // Source: https://us.xgimi.com/products/horizon-30-max
  // Input lag: 1ms at 1080p@240Hz (also 2.2ms at 1080p@120Hz, 1.9ms at 4K@120Hz, 3ms at 4K@60Hz)
  {brand:"XGIMI", model:"HORIZON 30 Max", resolution:"4K UHD", ansiLumens:5300, lumensNote:"ISO lumens (ISO 21118), not ANSI", throwRatio:"1.2-1.5:1", lightSource:"RGB triple laser", inputLagMs:1, lensShift:"Vertical ±130%, Horizontal ±50%", contrast:"9000:1 (native)"},
  // Source: https://us.xgimi.com/products/horizon-30-ultra-max
  // Input lag: 1ms at 1080p@240Hz (also 2.2ms at 1080p@120Hz, 1.9ms at 4K@120Hz, 3ms at 4K@60Hz)
  {brand:"XGIMI", model:"HORIZON 30 Ultra Max", resolution:"4K UHD", ansiLumens:6000, lumensNote:"ISO lumens (ISO 21118), not ANSI", throwRatio:"1.2-1.5:1", lightSource:"RGB triple laser", inputLagMs:1, lensShift:"Vertical ±130%, Horizontal ±50%", contrast:"10000:1 (native)"},
  // Source: https://us.xgimi.com/products/titan-noir
  // Input lag: 1ms at 1080p@240Hz (also 2.2ms at 1080p@120Hz, 3ms at 4K@60Hz)
  {brand:"XGIMI", model:"TITAN Noir", resolution:"4K UHD", ansiLumens:4800, lumensNote:"ISO lumens (ISO 21118), not ANSI", throwRatio:"0.98-2.0:1", lightSource:"RGB triple laser", inputLagMs:1, lensShift:"Vertical ±130%, Horizontal ±50%", contrast:"7000:1 (native)"},
  // Source: https://us.xgimi.com/products/titan-noir-pro
  // Input lag: 1ms at 1080p@240Hz (also 2.2ms at 1080p@120Hz, 3ms at 4K@60Hz)
  {brand:"XGIMI", model:"TITAN Noir Pro", resolution:"4K UHD", ansiLumens:6000, lumensNote:"ISO lumens (ISO 21118), not ANSI", throwRatio:"0.98-2.0:1", lightSource:"RGB triple laser", inputLagMs:1, lensShift:"Vertical ±130%, Horizontal ±50%", contrast:"8000:1 (native)"},
  // Source: https://us.xgimi.com/products/titan-noir-max
  // Input lag: 1ms at 1080p@240Hz (also 2.2ms at 1080p@120Hz, 3ms at 4K@60Hz)
  {brand:"XGIMI", model:"TITAN Noir Max", resolution:"4K UHD", ansiLumens:7000, lumensNote:"ISO lumens (ISO 21118), not ANSI", throwRatio:"0.98-2.0:1", lightSource:"RGB triple laser", inputLagMs:1, lensShift:"Vertical ±130%, Horizontal ±50%", contrast:"10000:1 (native)"},
  // Source: https://www.benq.com/en-us/projector/gaming/x3100i/spec.html
  // Input lag: 4.2ms at 1080p@240Hz (also 16.7ms at 1080p/4K@60Hz, 8.3ms at 1080p@120Hz)
  {brand:"BenQ", model:"X3100i", resolution:"4K UHD", ansiLumens:3300, throwRatio:"1.15-1.5:1", lightSource:"4LED", inputLagMs:4.2, lensShift:"Vertical 40%-60%", contrast:"600000:1 (FOFO)"},
  // Source: https://www.benq.com/en-us/projector/gaming/tk700sti/spec.html
  // Input lag: 4.2ms at 1080p@240Hz (also 16.7ms at 1080p/4K@60Hz, 8.3ms at 1080p@120Hz)
  {brand:"BenQ", model:"TK700STi", resolution:"4K UHD", ansiLumens:3000, throwRatio:"0.9-1.08:1", lightSource:"Lamp", inputLagMs:4.2, lensShift:"None", contrast:"10000:1 (FOFO)"},
  // Source: https://www.benq.com/en-us/projector/home-projectors/tk705i.html
  // Input lag: 5ms at 4K@60Hz
  {brand:"BenQ", model:"TK705i", resolution:"4K UHD", ansiLumens:3000, throwRatio:"1.0-1.3:1", lightSource:"4LED", inputLagMs:5, lensShift:"None", contrast:"600000:1 (FOFO)"},
  // Source: https://www.benq.com/en-us/projector/home-projectors/tk705sti.html
  // Input lag: 5ms at 4K@60Hz
  {brand:"BenQ", model:"TK705STi", resolution:"4K UHD", ansiLumens:3000, throwRatio:"0.8:1", lightSource:"4LED", inputLagMs:5, lensShift:"None", contrast:"600000:1 (FOFO)"},
  // Source: https://us.valerion.com/products/max
  // Input lag: 4ms at 1080p@240Hz (also 8ms at 1080p@120Hz, 15ms at 4K@60Hz)
  {brand:"Valerion", model:"VisionMaster Max", resolution:"4K UHD", ansiLumens:3500, lumensNote:"ISO lumens, not ANSI", throwRatio:"0.9-1.5:1", lightSource:"RGB triple laser", inputLagMs:4, lensShift:"Vertical ±105%", contrast:"50000:1 (viewing)"},
  // Source: https://www.valerion.com/product/valerion-visionmaster-pro2-pro-4k-rgb-triple-laser-projector
  // Input lag: 4ms at 1080p@240Hz (also 8ms at 1080p@120Hz, 15ms at 4K@60Hz)
  {brand:"Valerion", model:"VisionMaster Pro 2", resolution:"4K UHD", ansiLumens:3000, lumensNote:"ISO lumens, not ANSI", throwRatio:"0.9-1.5:1", lightSource:"RGB triple laser", inputLagMs:4, lensShift:"None", contrast:"15000:1 (EBL mode)"},
  // Source: https://epson.com/For-Home/Projectors/Home-Cinema/Home-Cinema-LS6000-4K-HDR-Laser-Projector/p/V11HC38020
  // Input lag: Epson does not publish an input lag figure for this model
  {brand:"Epson", model:"Home Cinema LS6000", resolution:"4K UHD", ansiLumens:3400, lumensNote:"ISO lumens, not ANSI", throwRatio:"1.32-2.15:1", lightSource:"Laser", inputLagMs:null, lensShift:"Vertical ±59%, Horizontal ±21%", contrast:"3000000:1"}
];
