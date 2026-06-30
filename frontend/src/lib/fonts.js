let khmerFontsLoaded = false;

/** Load Khmer font files only when UI locale is Khmer (saves ~2 font faces in memory) */
export async function loadKhmerFonts() {
  if (khmerFontsLoaded) return;
  khmerFontsLoaded = true;
  await Promise.all([
    import('@fontsource/google-sans/khmer-400.css'),
    import('@fontsource/google-sans/khmer-700.css'),
  ]);
}
