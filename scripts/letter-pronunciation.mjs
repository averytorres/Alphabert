// Kokoro phoneme symbols for US English alphabet NAMES, separate from phonics.
export const LETTER_NAMES={a:'ˈ A',b:'b ˈ i',c:'s ˈ i',d:'d ˈ i',e:'ˈ i',f:'ˈ ɛ f',g:'ʤ ˈ i',h:'ˈ A ʧ',i:'ˈ I',j:'ʤ ˈ A',k:'k ˈ A',l:'ˈ ɛ l',m:'ˈ ɛ m',n:'ˈ ɛ n',o:'ˈ O',p:'p ˈ i',q:'k j ˈ u',r:'ˈ ɑ ɹ',s:'ˈ ɛ s',t:'t ˈ i',u:'j ˈ u',v:'v ˈ i',w:'d ˈ ʌ b ə l j ˌ u',x:'ˈ ɛ k s',y:'w ˈ I',z:'z ˈ i'};
export function letterNameText(text){
 if(/^The answer is [a-z]\.$/.test(text))return text.replace(/([a-z])\.$/,(_,c)=>`bertletter${c}.`);
 if(!/^(?:[A-Z]$|[A-Z], [A-Z],|[A-Z] is\b|This is the letter |What letter comes |The letter |Press [A-Z])/.test(text))return text;
 return text.replace(/\b[A-Z]\b/g,c=>'bertletter'+c.toLowerCase());
}
export const letterNameLexicon=()=>Object.entries(LETTER_NAMES).map(([letter,phones])=>`bertletter${letter} ${phones}`).join('\n');
