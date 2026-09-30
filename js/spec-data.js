// BudgetProjectors manufacturer spec data — verified against official manufacturer pages 2026-09-29.
// All figures are manufacturer-published; fields the manufacturer does not publish are null.
// Lumens: BenQ publishes true ANSI lumens. JMGO, XGIMI, and Valerion publish ISO lumens
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
  // Source: https://www.benq.com/en-us/projector/gaming/x3100i/spec.html
  // Input lag: 4.2ms at 1080p@240Hz (also 16.7ms at 1080p/4K@60Hz, 8.3ms at 1080p@120Hz)
  {brand:"BenQ", model:"X3100i", resolution:"4K UHD", ansiLumens:3300, throwRatio:"1.15-1.5:1", lightSource:"4LED", inputLagMs:4.2, lensShift:"Vertical 40%-60%", contrast:"600000:1 (FOFO)"},
  // Source: https://www.benq.com/en-us/projector/gaming/tk700sti/spec.html
  // Input lag: 4.2ms at 1080p@240Hz (also 16.7ms at 1080p/4K@60Hz, 8.3ms at 1080p@120Hz)
  {brand:"BenQ", model:"TK700STi", resolution:"4K UHD", ansiLumens:3000, throwRatio:"0.9-1.08:1", lightSource:"Lamp", inputLagMs:4.2, lensShift:"None", contrast:"10000:1 (FOFO)"},
  // Source: https://us.valerion.com/products/max
  // Input lag: 4ms at 1080p@240Hz (also 8ms at 1080p@120Hz, 15ms at 4K@60Hz)
  {brand:"Valerion", model:"VisionMaster Max", resolution:"4K UHD", ansiLumens:3500, lumensNote:"ISO lumens, not ANSI", throwRatio:"0.9-1.5:1", lightSource:"RGB triple laser", inputLagMs:4, lensShift:"Vertical ±105%", contrast:"50000:1 (viewing)"}
];
