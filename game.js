import {clubKey} from './clubs.js';
export const normalize = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[øØ]/g,'o').toLowerCase();
const countryAliases=Object.freeze({'united states':'usa','czech republic':'czechia','bosnia and herzegovina':'bosnia herzegovina','fyr macedonia':'north macedonia','dr congo':'congo dr'});
const continents=Object.freeze({
 Europe:'Albania Austria Belarus Belgium Bosnia Herzegovina Bulgaria Croatia Czechia Denmark England Finland France Georgia Germany Greece Hungary Iceland Italy Kosovo Latvia Montenegro Netherlands North Macedonia Northern Ireland Norway Poland Portugal Romania Russia Scotland Serbia Slovakia Slovenia Spain Sweden Switzerland Turkey Ukraine Wales',
 Asia:'Bahrain China Iran Japan Saudi Arabia South Korea',
 Africa:'Algeria Angola Benin Burkina Faso Cameroon Cape Verde Central African Republic Congo DR Egypt Gabon Ghana Guinea Guinea-Bissau Ivory Coast Liberia Mali Mauritania Morocco Nigeria Senegal South Africa Tanzania Togo Tunisia Zambia Zimbabwe',
 'North America':'Barbados Canada Curaçao Dominican Republic Guadeloupe Haiti Jamaica Mexico Panama Trinidad & Tobago USA',
 'South America':'Argentina Brazil Chile Colombia Ecuador Paraguay Peru Suriname Uruguay Venezuela',
 Oceania:'Australia New Zealand'
});
const continentByCountry=new Map(Object.entries(continents).flatMap(([continent,countries])=>countries.split(' ').map(country=>[country.toLowerCase(),continent])));
const countryKey=name=>{const country=name.toLowerCase();return countryAliases[country]||country;};
export function compare(guess,target){
 const sameClub=(guess.clubKey||clubKey(guess.club))===(target.clubKey||clubKey(target.club));
 const careerMatch=target.retired && (target.careerClubKeys?.length ? target.careerClubKeys.includes(guess.clubKey||clubKey(guess.club)) : (target.careerClubs||[]).some(club=>clubKey(typeof club==='string'?club:club.name)===clubKey(guess.club)));

 return {
 name:guess.id===target.id?'exact':'miss',
 nationality:countryKey(guess.nationality)===countryKey(target.nationality)?'exact':continentByCountry.get(countryKey(guess.nationality))===continentByCountry.get(countryKey(target.nationality))?'close':'miss',
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

export const difficultySizes=Object.freeze({easy:200,medium:700,hard:1000});
export function difficultyPool(pool,difficulty){
 const size=difficultySizes[difficulty];
 if(!size)throw new Error('Unknown difficulty');
 return pool.filter(p=>p.popularityRank<=size);
}
