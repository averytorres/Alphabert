// Small bundled vector pictures, so song choices work offline on every device.
const drawings = {
  alphabet:
    '<rect x="5" y="17" width="25" height="31" rx="5" fill="#f8cc59"/><rect x="33" y="10" width="25" height="31" rx="5" fill="#b7d9ec"/><path d="m11 40 6-16 6 16m-10-5h8m28-17v17h6q8-1 0-9h-6m0 0h5q7-6 0-8Z"/>',
  boat: '<path d="M7 43h50L47 55H17Z" fill="#d7784c"/><path d="M31 8v35M29 11 11 37h18Z" fill="#f8cc59"/><path d="m35 15 18 22H35Z" fill="#c6e3d4"/><path d="M4 59q7-5 14 0t14 0 14 0 14 0" stroke="#4286a4"/>',
  horse:
    '<path d="m18 54 1-21-8-9 14-9 3-10 7 8 10 4 10 17-9 9-12-8-1 19Z" fill="#d9aa78"/><path d="m28 8-8 11 4 10-7 10m13-13 12 11"/><circle cx="38" cy="23" r="2" fill="#183f3a"/>',
  dancer:
    '<circle cx="32" cy="13" r="8" fill="#ffdcaa"/><path d="m27 23-11 20h32L37 23Z" fill="#d77894"/><path d="m25 27-15-9m29 9 15-9M26 44l-6 13m17-13 7 13"/>',
  barn: '<path d="M7 29 32 9l25 20v27H7Z" fill="#d7784c"/><path d="m3 28 29-23 29 23"/><path d="M23 56V32h18v24m-18-24 18 24m0-24L23 56" fill="#f8cc59"/>',
  bell: '<path d="M14 44h36l-6-9V23q0-18-24 0v12Z" fill="#f8cc59"/><path d="M26 48q6 13 12 0M32 7V3M7 18l-4-5m54 5 4-5"/>',
  berries:
    '<path d="M9 51q-12-16 6-23-4-19 15-15 11-17 22 1 18 0 9 19 9 19-13 18Z" fill="#b9d499"/><path d="M32 55V33"/><g fill="#a55b85"><circle cx="20" cy="32" r="5"/><circle cx="40" cy="27" r="5"/><circle cx="46" cy="42" r="5"/><circle cx="25" cy="43" r="5"/></g>',
  clock:
    '<rect x="13" y="5" width="38" height="54" rx="9" fill="#d9aa78"/><circle cx="32" cy="25" r="15" fill="#fff5d7"/><path d="M32 15v11l8 5"/><ellipse cx="35" cy="51" rx="10" ry="6" fill="#b9c7ce"/><circle cx="25" cy="46" r="5" fill="#b9c7ce"/><path d="M45 51q12-9 13 0"/>',
  crown:
    '<path d="m8 18 13 12L32 10l11 20 13-12-5 34H13Z" fill="#f8cc59"/><path d="M14 43h36"/><g fill="#d7784c"><circle cx="21" cy="37" r="3"/><circle cx="43" cy="37" r="3"/></g>',
  rain: '<path d="M15 36C0 35 4 17 18 19 18 2 43 2 46 20c18-4 19 18 3 18H15Z" fill="#b7d9ec"/><path d="m18 45-4 9m18-9-4 9m18-9-4 9" stroke="#4286a4"/>',
  well: '<path d="M9 27 32 7l23 20Z" fill="#d7784c"/><path d="M15 27v25m34-25v25M9 56V40h46v16Z" fill="#d9c9ae"/><path d="M32 27v14m-6 0h12l-2 10h-8Z" fill="#b7d9ec"/>',
  spider:
    '<path d="m20 28-9-9-7 8m16 8L7 34l-4 9m20 0-9 7v9m30-31 9-9 7 8m-16 8 13-1 4 9m-20 0 9 7v9M32 4v15"/><ellipse cx="32" cy="35" rx="13" ry="17" fill="#b49bc9"/><g fill="#fff"><circle cx="27" cy="29" r="4"/><circle cx="37" cy="29" r="4"/></g><path d="M28 41q4 4 8 0"/>',
  bridge:
    '<path d="M4 32h56v17H48q0-22-16-22T16 49H4Z" fill="#d9c9ae"/><path d="M9 30V16h10v14m26 0V16h10v14M3 57q7-6 15 0t15 0 15 0 13 0" stroke="#4286a4"/>',
  lamb: '<path d="M17 44v13m23-13v13"/><path d="M13 22q-5-15 10-13 10-12 17 1 17-3 13 13 12 15-3 22-14 13-22-1-20 5-15-12Z" fill="#fff5d7"/><ellipse cx="15" cy="31" rx="10" ry="13" fill="#d9c9ae"/><path d="m7 24-5-5m21 5 4-6"/><circle cx="12" cy="29" r="2" fill="#183f3a"/>',
  cow: '<path d="m15 17-7-9m40 9 7-9"/><path d="M13 17q19-12 38 0l-3 30H16Z" fill="#fff5d7"/><path d="M15 18q20-5 13 11-7 9-13 0" fill="#71827a"/><ellipse cx="32" cy="46" rx="20" ry="12" fill="#e8ad9a"/><circle cx="38" cy="26" r="2" fill="#183f3a"/><path d="M24 46v2m16-2v2"/>',
  bowl: '<path d="M7 31h50q-2 25-25 25T7 31Z" fill="#d7784c"/><ellipse cx="32" cy="31" rx="25" ry="6" fill="#f3d5a7"/><path d="M22 22q-8-7 0-14m19 14q-8-7 0-14"/>',
  bird: '<path d="M17 39q-6-27 12-30 18-4 22 15L38 32l-2 20-12 7v-18Z" fill="#9bc79b"/><path d="m44 20 13 8-14 7Z" fill="#f8cc59"/><path d="M26 28q-9 14 10 14" fill="#b7d9ec"/><circle cx="35" cy="19" r="2" fill="#183f3a"/>',
  rowing:
    '<path d="M5 38h54L48 52H16Z" fill="#d9aa78"/><path d="m14 19 39 36m-8-9 12 9-6 5-10-11" fill="#f8cc59"/><path d="M3 59q7-5 15 0t15 0 15 0 13 0" stroke="#4286a4"/>',
  river:
    '<path d="m3 28 17-20 17 20m-9 0L44 8l17 20" fill="#b9d499"/><path d="M25 29q27 8 6 14T23 60h24q-24-10-6-17t-4-14Z" fill="#b7d9ec"/>',
  pie: '<path d="M9 31h46l-5 23H14Z" fill="#d9aa78"/><path d="M7 29q2-20 25-20t25 20Z" fill="#f8cc59"/><path d="m19 21 5-5m6 7 5-7m6 7 5-5M10 34l6 6 7-6 8 6 8-6 8 6 7-6"/>',
  shoes:
    '<path d="M11 13h13v17q3 7 13 7v12H9V33Z" fill="#d7784c"/><path d="M37 6h13v17q3 7 10 7v12H35V25Z" fill="#b7d9ec"/><path d="M9 43h28M35 36h25"/>',
  baseball:
    '<circle cx="32" cy="32" r="25" fill="#fff5d7"/><path d="M15 14q21 18 0 36m34-36q-21 18 0 36" stroke="#d7784c"/><path d="m16 22 7-3m-5 13 7-1m-8 11 6 2m25-22-7-3m5 13-7-1m8 11-6 2" stroke="#d7784c"/>',
  bus: '<rect x="7" y="12" width="50" height="39" rx="8" fill="#f8cc59"/><path d="M8 34h48M20 16v17m13-17v17m12-17v17"/><circle cx="18" cy="51" r="7" fill="#71827a"/><circle cx="46" cy="51" r="7" fill="#71827a"/>',
  cat: '<path d="M11 32V9l16 12h10L53 9v23q0 23-21 23T11 32Z" fill="#e1ad75"/><path d="m21 33 1 0m20 0 1 0m-14 8h6l-3 4Zm-4 8-6 2m14-2 6 2M17 42 4 39m13 8L4 49m43-7 13-3m-13 8 13 2"/>',
  weasel:
    '<path d="M19 37q-12 0-12 13 0 8 15 8h23q15-6 10-20L44 22q0-14-12-14-12 0-12 14Z" fill="#d9aa78"/><ellipse cx="33" cy="38" rx="11" ry="16" fill="#fff5d7"/><circle cx="27" cy="20" r="2" fill="#183f3a"/><circle cx="39" cy="20" r="2" fill="#183f3a"/><path d="m30 27 3 3 3-3"/>',
  star: '<path d="m32 5 8 17 19 3-14 13 4 20-17-10-17 10 4-20L5 25l19-3Z" fill="#f8cc59"/><path d="m24 31 1 0m14 0 1 0m-14 9q6 5 12 0"/>',
};
export const SONG_PICTURE_THEMES = {
  alphabet: 'alphabet',
  bonnie: 'boat',
  camptown: 'horse',
  lassie: 'dancer',
  farmer: 'barn',
  frere: 'bell',
  mulberry: 'berries',
  hickory: 'clock',
  'king-cole': 'crown',
  raining: 'rain',
  'jack-jill': 'well',
  muffet: 'spider',
  london: 'bridge',
  mary: 'lamb',
  macdonald: 'cow',
  porridge: 'bowl',
  polly: 'bird',
  row: 'rowing',
  sailing: 'boat',
  shenandoah: 'river',
  sixpence: 'pie',
  skip: 'shoes',
  ballgame: 'baseball',
  bus: 'bus',
  kittens: 'cat',
  weasel: 'weasel',
  twinkle: 'star',
};
export function songPicture(id) {
  const theme = SONG_PICTURE_THEMES[id] || 'bell';
  return `<svg class="song-picture" data-song-picture="${theme}" viewBox="0 0 64 64" aria-hidden="true" focusable="false" fill="none" stroke="#183f3a" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">${drawings[theme]}</svg>`;
}
