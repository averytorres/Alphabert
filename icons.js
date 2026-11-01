// Bundled vector pictures render consistently without an emoji font or network.
const paths={
 help:'<circle cx="32" cy="33" r="24" fill="#ffe294"/><path d="m18 24 9-3m11 2 8 4M23 43q8-6 17 0"/><circle cx="24" cy="31" r="2" fill="currentColor"/><circle cx="41" cy="32" r="2" fill="currentColor"/><path d="M47 8q10-7 12 1 1 4-5 7v3"/><circle cx="54" cy="24" r="1.5" fill="currentColor"/>',
 home:'<path d="M5 29 32 7l27 22M13 26v30h38V26" fill="#c6e3d4"/><path d="M26 56V37h13v19" fill="#ffdc83"/>',
 hear:'<path d="M38 47q-2 12-10 10-7-2-6-10 0-6-6-13-6-8-1-18 5-11 17-9 14 2 15 15" fill="#ffdcaa"/><path d="M23 25q-2-10 7-10 9 0 8 10-1 5-8 7v7m19-24q9 9 0 19m8-25q13 14 0 30"/>',
 next:'<circle cx="32" cy="32" r="27" fill="#c6e3d4"/><path d="M15 32h33M35 18l14 14-14 14"/>',
 previous:'<circle cx="32" cy="32" r="27" fill="#c6e3d4"/><path d="M49 32H16m13-14L15 32l14 14"/>',
 play:'<circle cx="32" cy="32" r="27" fill="#c6e3d4"/><path d="m25 17 23 15-23 15Z" fill="#236451"/>',
 stop:'<circle cx="32" cy="32" r="27" fill="#ffd4c8"/><rect x="21" y="21" width="22" height="22" rx="3" fill="#b34e3c"/>',
 sound:'<path d="M8 25h12L35 12v40L20 39H8Z" fill="#c6e3d4"/><path d="M43 22q10 10 0 20m8-28q18 18 0 36"/>',
 muted:'<path d="M8 25h12L35 12v40L20 39H8Z" fill="#d9ddd5"/><path d="m44 23 14 18m0-18L44 41" stroke="#b34e3c"/>',
 grownups:'<circle cx="25" cy="17" r="9" fill="#ffdcaa"/><path d="M8 54V40q0-13 17-13 12 0 15 8" fill="#c6e3d4"/><circle cx="46" cy="33" r="7" fill="#ffdcaa"/><path d="M34 56V49q0-10 12-10t12 10v7" fill="#ffdc83"/>',
 robot:'<path d="M32 12V5m-3 0h6M9 37v14m46-14v14M23 51v9m18-9v9"/><rect x="13" y="12" width="38" height="25" rx="8" fill="#c6e3d4"/><rect x="18" y="38" width="28" height="15" rx="4" fill="#ffdc83"/><circle cx="24" cy="23" r="2" fill="currentColor"/><circle cx="40" cy="23" r="2" fill="currentColor"/><path d="M25 30q7 4 14 0"/>',
 search:'<circle cx="27" cy="26" r="19" fill="#e4f0e8"/><path d="m41 41 16 17" stroke-width="8"/>',
 music:'<path d="M24 45V14l29-7v31M24 22l29-7"/><ellipse cx="16" cy="47" rx="9" ry="7" fill="#e5b75a"/><ellipse cx="45" cy="40" rx="9" ry="7" fill="#e5b75a"/>',
 rhymes:'<path d="M5 32V10l12 9 12-9v22q0 13-12 13T5 32Z" fill="#ffdc83"/><circle cx="12" cy="28" r="1" fill="currentColor"/><circle cx="22" cy="28" r="1" fill="currentColor"/><path d="m15 35 3 0M36 36h24m-21 0 3-20h12l3 20" fill="#c6e3d4"/><path d="M8 54h16m17 0h16"/>',
 count:'<circle cx="16" cy="17" r="8" fill="#ffdc83"/><circle cx="44" cy="17" r="8" fill="#c6e3d4"/><circle cx="16" cy="45" r="8" fill="#c6e3d4"/><circle cx="44" cy="45" r="8" fill="#ffdc83"/>',
 memory:'<rect x="6" y="12" width="27" height="38" rx="5" fill="#c6e3d4"/><rect x="31" y="17" width="27" height="38" rx="5" fill="#ffdc83"/><path d="m13 30 6 7 8-13m11 13 6 7 8-13"/>',
 groups:'<circle cx="15" cy="19" r="10" fill="#c6e3d4"/><circle cx="46" cy="19" r="10" fill="#c6e3d4"/><path d="m32 34 14 23H18Z" fill="#ffdc83"/>',
 catch:'<path d="m32 20 0 14m-7-7 7 8 7-8M9 44l5 15h36l5-15Z" fill="#ffdc83"/>',
 puzzle:'<path d="M8 14h18q-5-12 6-12t6 12h18v18q-12-5-12 6t12 6v14H38q5-12-6-12t-6 12H8V44q12 5 12-6T8 32Z" fill="#c6e3d4"/>'
};
const letters=(s,x=32,y=40)=>`<text x="${x}" y="${y}" text-anchor="middle" fill="#ffffff" stroke="#172b28" stroke-width="2.5" paint-order="stroke fill" font-family="sans-serif" font-size="24" font-weight="900">${s}</text>`;
export function icon(name){return `<svg class="picture-icon" data-icon="${name}" viewBox="0 0 64 64" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${paths[name]||paths.puzzle}</svg>`;}
export function activityIcon(id){
 const names={letters:'puzzle',order:'next',sounds:'hear',words:'hear',missing:'puzzle',vowels:'puzzle',rhymes:'rhymes',blends:'puzzle',groups:'groups',scramble:'puzzle',search:'search',catch:'catch',hangman:'robot',memory:'memory',count:'count',songs:'music'};
 let extra={letters:letters('Aa'),order:letters('ABC',32,20),words:letters('cat',32,59),missing:letters('a_c'),vowels:letters('a_e'),blends:letters('sh'),scramble:letters('b a'),search:letters('a',27,35),catch:letters('A',32,20)}[id]||'';
 if(id==='rhymes')extra='';
 return icon(names[id]).replace('</svg>',extra+'</svg>');
}
