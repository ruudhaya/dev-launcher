/**
 * Apple's documented .iconset layout for `iconutil -c icns`: one PNG per
 * named size. Pure data — the macOS platform adapter is what actually shells
 * out to sips to produce each file.
 */
export interface IconsetEntry {
  readonly fileName: string;
  readonly pixels: number;
}

export const ICONSET_ENTRIES: readonly IconsetEntry[] = [
  { fileName: 'icon_16x16.png', pixels: 16 },
  { fileName: 'icon_16x16@2x.png', pixels: 32 },
  { fileName: 'icon_32x32.png', pixels: 32 },
  { fileName: 'icon_32x32@2x.png', pixels: 64 },
  { fileName: 'icon_128x128.png', pixels: 128 },
  { fileName: 'icon_128x128@2x.png', pixels: 256 },
  { fileName: 'icon_256x256.png', pixels: 256 },
  { fileName: 'icon_256x256@2x.png', pixels: 512 },
  { fileName: 'icon_512x512.png', pixels: 512 },
  { fileName: 'icon_512x512@2x.png', pixels: 1024 },
];
