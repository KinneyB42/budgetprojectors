/* BudgetProjectors UST image-height data (hand-maintained; separate from the
   generated js/throw-data.js so it survives database regenerations).
   Researched 2026-10-18 from each manufacturer's own manual, installation
   guide, or spec sheet. Full sourcing notes: ~/workspace/research/ust-offset-data.md

   For each model: t = [[screen diagonal in inches (16:9), image bottom height
   in inches above the surface the projector sits on], ...], taken from the
   maker's published placement table and normalized to that one reference:
   - XGIMI AURA 3: their table's surface-referenced column (via XGIMI's official
     installation table, 100-150 in; rows below 100 are the maker's estimates,
     so sr marks 100-150 as the published range).
   - XGIMI Aura 2 / Aura: manual "H" column (surface to image bottom).
   - Hisense L9Q: spec sheet "B" (stand surface to bottom edge of Hisense
     screen) + 0.8 in, the sheet's own stated screen edge width, to reference
     the image itself. Hisense allows a 5% deviation on these figures.
   - Epson LS800: manual offset (top of projector to image base) + the spec
     height of 5.7 in. LS650: Quick Setup Guide offsets + 6.0 in height; only
     the guide's two published sizes are listed.
   - BenQ V7050i: Installation Guide shelf-surface figures (validated at 100
     and 120 in) extended with the manual's lens-center offsets + 150 mm.
   - Samsung Premiere: the manual/spec "B" column (surface to image bottom).
   - LG HU915: the manual's "D" column (surface to image bottom).
   - AWOL LTV family: the manual's "D" column (image bottom to foot/surface);
     one shared chart covers the 2500/3000 Pro/3500 Pro chassis.
   - NexiGo Aurora Pro: manual "Screen to Desktop" (feet converted to inches).
     MKII: same column, printed in inches.
   - Formovie THEATER / THEATER Premium: manual "Relative Height H" (bottom of
     projector to image bottom edge), cm converted to inches.
   sr = [min, max] diagonal the maker actually publishes; outside it the
   calculator flags the height as estimated. */
window.UST_DATA = {
  'XGIMI AURA 3 Pro': { sr: [100, 150], t: [[80, 11.7], [90, 12.7], [100, 13.8], [110, 14.8], [120, 15.9], [130, 16.9], [140, 18.0], [150, 19.1]] },
  'XGIMI AURA 3 Max': { sr: [100, 150], t: [[80, 11.7], [90, 12.7], [100, 13.8], [110, 14.8], [120, 15.9], [130, 16.9], [140, 18.0], [150, 19.1]] },
  'XGIMI Aura 2': { t: [[90, 13.4], [100, 14.5], [110, 15.5], [120, 16.6], [130, 17.6], [150, 19.6]] },
  'XGIMI Aura': { t: [[80, 13.0], [90, 13.4], [100, 15.3], [110, 15.6], [120, 16.5], [130, 17.4], [150, 19.4]] },
  'Hisense L9Q': { t: [[80, 12.5], [100, 14.7], [110, 15.8], [120, 16.9], [139, 19.0], [150, 20.2], [200, 25.8]] },
  'Epson EpiqVision LS800': { t: [[80, 10.0], [90, 10.8], [100, 11.6], [110, 12.4], [120, 13.2], [130, 14.0], [150, 15.6]] },
  'Epson EpiqVision Ultra LS800': { t: [[80, 10.0], [90, 10.8], [100, 11.6], [110, 12.4], [120, 13.2], [130, 14.0], [150, 15.6]] },
  'Epson EpiqVision Ultra LS800B': { t: [[80, 10.0], [90, 10.8], [100, 11.6], [110, 12.4], [120, 13.2], [130, 14.0], [150, 15.6]] },
  'Epson EpiqVision Ultra LS800W': { t: [[80, 10.0], [90, 10.8], [100, 11.6], [110, 12.4], [120, 13.2], [130, 14.0], [150, 15.6]] },
  'Epson EH-LS800B': { t: [[80, 10.0], [90, 10.8], [100, 11.6], [110, 12.4], [120, 13.2], [130, 14.0], [150, 15.6]] },
  'Epson EH-LS800W': { t: [[80, 10.0], [90, 10.8], [100, 11.6], [110, 12.4], [120, 13.2], [130, 14.0], [150, 15.6]] },
  'Epson EpiqVision Ultra LS650': { sr: [100, 120], t: [[100, 15.3], [120, 17.6]] },
  'Epson EpiqVision Ultra LS650-B': { sr: [100, 120], t: [[100, 15.3], [120, 17.6]] },
  'Epson EpiqVision Ultra LS650-W': { sr: [100, 120], t: [[100, 15.3], [120, 17.6]] },
  'Epson EH-LS650B': { sr: [100, 120], t: [[100, 15.3], [120, 17.6]] },
  'Epson EH-LS650W': { sr: [100, 120], t: [[100, 15.3], [120, 17.6]] },
  'BenQ V7050i': { t: [[70, 12.2], [80, 13.4], [90, 14.6], [95, 15.2], [100, 15.8], [120, 18.2]] },
  'Samsung The Premiere 9 LPU9D': { t: [[100, 13.8], [105, 14.3], [110, 14.8], [115, 15.3], [120, 15.8], [125, 16.3], [130, 16.8]] },
  'Samsung The Premiere LSP9T (SP-LSP9T)': { t: [[100, 13.8], [105, 14.3], [110, 14.8], [115, 15.3], [120, 15.8], [125, 16.3], [130, 16.8]] },
  'Samsung Premiere LSP9T': { t: [[100, 13.8], [105, 14.3], [110, 14.8], [115, 15.3], [120, 15.8], [125, 16.3], [130, 16.8]] },
  'LG HU915QE': { t: [[90, 12.6], [95, 13.1], [100, 13.6], [105, 14.0], [110, 14.6], [115, 15.0], [120, 15.5]] },
  'LG HU915QB': { t: [[90, 12.6], [95, 13.1], [100, 13.6], [105, 14.0], [110, 14.6], [115, 15.0], [120, 15.5]] },
  'LG CineBeam HU915QE': { t: [[90, 12.6], [95, 13.1], [100, 13.6], [105, 14.0], [110, 14.6], [115, 15.0], [120, 15.5]] },
  'LG CineBeam HU915QB': { t: [[90, 12.6], [95, 13.1], [100, 13.6], [105, 14.0], [110, 14.6], [115, 15.0], [120, 15.5]] },
  'AWOL Vision LTV-3500 Pro': { t: [[80, 12.9], [100, 15.1], [120, 17.0], [150, 19.0]] },
  'AWOL Vision LTV-3500': { t: [[80, 12.9], [100, 15.1], [120, 17.0], [150, 19.0]] },
  'AWOL Vision LTV-3000 Pro': { t: [[80, 12.9], [100, 15.1], [120, 17.0], [150, 19.0]] },
  'NexiGo Aurora Pro': { t: [[80, 11.8], [90, 12.7], [100, 13.7], [110, 14.6], [120, 15.7], [135, 17.2], [150, 18.6]] },
  'NexiGo Aurora Pro MKII': { t: [[80, 11.3], [90, 12.3], [100, 13.3], [110, 14.2], [120, 15.2], [135, 16.7], [150, 18.2]] },
  'Formovie THEATER Premium': { t: [[80, 12.2], [90, 12.4], [100, 13.6], [120, 15.9], [150, 19.1]] },
  'Formovie THEATER': { t: [[80, 11.8], [90, 13.4], [100, 14.6], [120, 16.9], [150, 19.7]] }
};

/* Interpolated image-bottom height (inches above the surface the projector
   sits on) for a model + 16:9 diagonal. Returns { bot, est } or null.
   est is true when the diagonal falls outside the maker's published range. */
window.ustOffsetAt = function (name, diag) {
  var e = window.UST_DATA[name];
  if (!e || !diag || diag <= 0) return null;
  var t = e.t, sr = e.sr || [t[0][0], t[t.length - 1][0]];
  var est = diag < sr[0] || diag > sr[1];
  var i, bot;
  if (diag <= t[0][0]) {
    bot = t[0][1] + (diag - t[0][0]) * (t[1][1] - t[0][1]) / (t[1][0] - t[0][0]);
  } else if (diag >= t[t.length - 1][0]) {
    var n = t.length - 1;
    bot = t[n][1] + (diag - t[n][0]) * (t[n][1] - t[n - 1][1]) / (t[n][0] - t[n - 1][0]);
  } else {
    for (i = 0; i < t.length - 1; i++) {
      if (diag >= t[i][0] && diag <= t[i + 1][0]) {
        bot = t[i][1] + (diag - t[i][0]) * (t[i + 1][1] - t[i][1]) / (t[i + 1][0] - t[i][0]);
        break;
      }
    }
  }
  return { bot: bot, est: est };
};
