import {clubKey} from './clubs.js';
export const normalize = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[øØ]/g,'o').toLowerCase();
export function compare(guess,target){
 const sameClub=(guess.clubKey||clubKey(guess.club))===(target.clubKey||clubKey(target.club));
 const careerMatch=target.retired && (target.careerClubKeys?.length ? target.careerClubKeys.includes(guess.clubKey||clubKey(guess.club)) : (target.careerClubs||[]).some(club=>clubKey(typeof club==='string'?club:club.name)===clubKey(guess.club)));

 return {
 name:guess.id===target.id?'exact':'miss',
 nationality:guess.nationality===target.nationality?'exact':'miss',
 club:sameClub||careerMatch?'exact':guess.league===target.league?'close':'miss',
 position:guess.position===target.position?'exact':guess.group===target.group?'close':'miss',
 number:guess.number===target.number?'exact':'miss',
 age:guess.age===target.age?'exact':Math.abs(guess.age-target.age)<=2?'close':'miss'
 };
}
export function searchPlayers(pool,query,guessedIds=[],limit=10){
 const term=normalize(query.trim());
 if(!term)return [];
 const used=new Set(guessedIds);
 return pool.filter(p=>!used.has(p.id)&&normalize([p.name,p.nameZh,...(p.aliases||[])].filter(Boolean).join(' ')).includes(term)).slice(0,limit);
}

export const difficultySizes=Object.freeze({easy:300,medium:700,hard:1000});
export function difficultyPool(pool,difficulty){
 const size=difficultySizes[difficulty];
 if(!size)throw new Error('Unknown difficulty');
 return pool.filter(p=>p.popularityRank<=size);
}
