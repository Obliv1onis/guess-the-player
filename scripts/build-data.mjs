import fs from 'node:fs';
import {Converter} from 'opencc-js';
import {clubKey} from '../clubs.js';
const read=f=>JSON.parse(fs.readFileSync(`data/${f}.json`,'utf8'));
const convert=Converter({from:'tw',to:'cn'});
const translations=read('translations-wiki');
for(const line of fs.readFileSync('data/translations-overrides.txt','utf8').trim().split('\n')){const [en,zh]=line.split('|');if(en&&zh)translations[en]=zh;}
const zh=s=>{if(!translations[s])throw Error(`Missing Chinese translation: ${s}`);return convert(translations[s]);};
const area=p=>p==='GK'?'GK':['CB','LB','RB','LWB','RWB'].includes(p)?'DEF':['ST','CF','LW','RW','LF','RF'].includes(p)?'FWD':'MID';
const badges=read('club-badge-files'),badgeSources=read('club-badges'),portraits=read('player-portraits'),portraitFiles=read('player-portrait-files');
const metadata=read('player-wiki-metadata'),legendTitles=read('legend-wiki-titles'),flags=read('country-flags');
const careerOverrides=fs.existsSync('data/career-overrides.json')?read('career-overrides'):{};
const originalImage=url=>url?.includes('/thumb/')?url.replace('/thumb/','/').split('/').slice(0,-1).join('/').replace('thumb.wikimedia.org','upload.wikimedia.org'):url;
const active=read('active-source');
const popularity=read('popularity-order');
const aliases={'Cristiano Ronaldo':['C罗','C羅','总裁','罗纳尔多','罗哥','CR7','克里斯蒂亚诺'],'Lionel Messi':['梅西','球王'],'Erling Haaland':['哈兰德','魔人'],'Kylian Mbappé':['姆巴佩'],'Martin Ødegaard':['厄德高'],'Declan Rice':['赖斯'],'Harry Kane':['凯恩'],'Kim Min-Jae':['金玟哉','金敏在'],'Neymar':['内马尔'],'Vinícius Júnior':['维尼修斯','小熊'],'Olivier Giroud':['吉鲁','大吉鲁'],'Kyle Walker':['沃克','凯尔沃克'],'Raheem Sterling':['斯特林','快乐男孩'],'Sol Campbell':['坎贝尔','索尔坎贝尔']};
const legendIds=read('legend-ids');
const legends=fs.readFileSync('data/historic-legends.txt','utf8').trim().split('\n').map((line,i)=>{const [name,nameZh,nationality,club,league,position,number,referenceYear,age]=line.split('|');return {id:legendIds[name]||`legend-${String(i+1).padStart(3,'0')}`,name,nameZh,nationality,club,league,position,group:area(position),number:Number(number),age:Number(age),referenceYear:Number(referenceYear),retired:true,aliases:name==='Ronaldo'?['大罗','罗纳尔多','外星人']:name==='Ronaldinho'?['小罗','罗纳尔迪尼奥']:name==='Pelé'?['贝利','球王']:name==='Diego Maradona'?['马拉多纳','老马']:[]};}).concat(read('extra-legends-source'));
const regionNames=new Intl.DisplayNames(['en'],{type:'region'});const iso={};for(let a=65;a<=90;a++)for(let b=65;b<=90;b++){const code=String.fromCharCode(a,b);const name=regionNames.of(code);if(name!==code)iso[name]=code;}
Object.assign(iso,{'England':'GB','Scotland':'GB','Wales':'GB','Northern Ireland':'GB','Republic of Ireland':'IE','Ivory Coast':'CI','DR Congo':'CD','Korea Republic':'KR','South Korea':'KR','North Korea':'KP','Bosnia Herzegovina':'BA','Bosnia and Herzegovina':'BA','FYR Macedonia':'MK','North Macedonia':'MK','Cape Verde':'CV','Trinidad & Tobago':'TT','Trinidad and Tobago':'TT','Russia':'RU','Kosovo':'XK','Turkey':'TR','Türkiye':'TR','Czech Republic':'CZ'});
const regionalFlags={England:'🏴\u{e0067}\u{e0062}\u{e0065}\u{e006e}\u{e0067}\u{e007f}',Scotland:'🏴\u{e0067}\u{e0062}\u{e0073}\u{e0063}\u{e0074}\u{e007f}',Wales:'🏴\u{e0067}\u{e0062}\u{e0077}\u{e006c}\u{e0073}\u{e007f}'};
const flagEmoji=n=>regionalFlags[n]||((iso[n]||'').split('').map(c=>String.fromCodePoint(127397+c.charCodeAt(0))).join(''))||'🌐';
const clubNames=new Map();
for(const m of Object.values(metadata))for(const c of m.clubs||[]){const name=clubKey(c.name);if(!clubNames.has(name))clubNames.set(name,new Set());clubNames.get(name).add(clubKey(c.title));}
const key=name=>{const direct=clubKey(name),matches=clubNames.get(direct);return matches?.size===1?[...matches][0]:direct;};
for(const [filename,pool] of [['players',active],['legends',legends]]){
 if(pool.length!==1000)throw Error(`${filename} must contain exactly 1000 players`);
 const order=popularity[filename==='players'?'active':'legends'];
 if(order.length!==1000||new Set(order).size!==1000||pool.some(p=>!order.includes(p.name)))throw Error(`Invalid popularity order: ${filename}`);
 const ranks=new Map(order.map((name,i)=>[name,i+1]));
 for(const p of pool){
  p.popularityRank=ranks.get(p.name);
  const m=metadata[legendTitles[p.name]||p.wikiTitle||p.name]||metadata[p.name]||{};
  p.nameZh=convert(p.nameZh||translations[p.name]||m.nameZh||zh(p.name));p.nationalityZh=zh(p.nationality);p.clubZh=zh(p.club);
  p.aliases=[...new Set([...(p.aliases||[]),...(aliases[p.name]||[]),...(m.wikiTitle&&m.wikiTitle!==p.name?[m.wikiTitle.replace(/ \(.*\)$/,'')]:[])])];
  p.flag=p.flag||flags[p.nationality]||(iso[p.nationality]?`https://flagcdn.com/w80/${iso[p.nationality].toLowerCase()}.png`:'');p.flagEmoji=flagEmoji(p.nationality);
  p.badge=badges[p.club]||badgeSources[p.club]||p.badge||'';p.badgeFallback=badgeSources[p.club]||'';
  p.portrait=portraitFiles[p.name]||portraits[p.name]||m.portrait||(!p.retired?`https://a.espncdn.com/i/headshots/soccer/players/full/${p.id}.png`:'/media/player-silhouette.svg');p.portraitFallback=originalImage(portraits[p.name]||m.portrait)||'/media/player-silhouette.svg';
  p.clubKey=key(p.club);
  if(p.retired){
   const history=careerOverrides[p.name]||(m.clubs||[]).map(c=>clubNames.get(clubKey(c.name))?.size>1?c.title:c.name);
   p.careerClubs=[...new Set([...history,p.club])];p.careerClubKeys=[...new Set([...(careerOverrides[p.name]?history.map(key):(m.clubs||[]).map(c=>clubKey(c.title))),p.clubKey])];
   p.careerSource=`https://en.wikipedia.org/wiki/${encodeURIComponent(m.wikiTitle||legendTitles[p.name]||p.name).replace(/%20/g,'_')}`;
  }
 }
 fs.writeFileSync(`public/${filename}.json`,JSON.stringify(pool.sort((a,b)=>a.name.localeCompare(b.name))));console.log(`${filename}: ${pool.length} bilingual players`);
}
