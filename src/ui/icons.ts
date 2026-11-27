/** Ícones de traço (24×24) usados nos menus e no HUD. Sem emoji e sem setas de texto. */
const PATHS = {
  play: '<path d="M7 4.5v15l12-7.5z"/>',
  garage: '<path d="M3 14l1.6-4.6A2 2 0 0 1 6.5 8h11a2 2 0 0 1 1.9 1.4L21 14"/><rect x="3" y="14" width="18" height="4.5" rx="1.5"/><circle cx="7.5" cy="16.2" r=".6"/><circle cx="16.5" cy="16.2" r=".6"/><path d="M5.5 18.5v1.5M18.5 18.5v1.5"/>',
  bolt: '<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z"/>',
  pad: '<rect x="2.5" y="7" width="19" height="10.5" rx="5"/><path d="M8 10.5v4M6 12.5h4"/><circle cx="15.5" cy="11.5" r=".7"/><circle cx="17.5" cy="13.5" r=".7"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5a3 3 0 0 0 3 4M16 6h3.5a3 3 0 0 1-3 4M12 13v4M8.5 20.5h7M10 17h4"/>',
  pin: '<path d="M12 21s6.5-5.7 6.5-11A6.5 6.5 0 0 0 5.5 10C5.5 15.3 12 21 12 21z"/><circle cx="12" cy="10" r="2.3"/>',
  volOn: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  volOff: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  back: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
  lock: '<rect x="5.5" y="10.5" width="13" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  arrow: '<path d="M6 12h12M13 6.5 18.5 12 13 17.5"/>',
  left: '<path d="M15 5.5 8.5 12l6.5 6.5"/>',
  right: '<path d="M9 5.5 15.5 12 9 18.5"/>',
  jump: '<path d="M12 19V6M6.5 11.5 12 6l5.5 5.5"/>',
  flame: '<path d="M12 3c.5 3.5 4.5 5.5 4.5 10a4.5 4.5 0 0 1-9 0c0-2 1-3 2-4 .2 1.2.8 1.8 1.5 2 .5-2.5.3-5.5 1-8z"/>',
  star: '<path d="m12 3.5 2.5 5.3 5.8.8-4.2 4.1 1 5.8L12 16.7 6.9 19.5l1-5.8L3.7 9.6l5.8-.8z"/>',
} as const

export type IconName = keyof typeof PATHS

export function icon(name: IconName, size = 18): string {
  return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name]}</svg>`
}
