import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compare,normalize,searchPlayers} from './game.js';
const pool=JSON.parse(readFileSync('public/players.json'));
const legends=JSON.parse(readFileSync('public/legends.json'));
for(const [name,players] of [['active',pool],['legends',legends]]){
 test(`${name}: exactly 1000 unique, complete bilingual players`,()=>{
  assert.equal(players.length,1000);assert.equal(new Set(players.map(p=>p.id)).size,1000);assert.equal(new Set(players.map(p=>normalize(p.name))).size,1000);
  for(const p of players){for(const k of ['name','nationality','club','position','group','league'])assert.ok(p[k],`${p.name} missing ${k}`);for(const k of ['nameZh','nationalityZh','clubZh'])assert.match(p[k],/\p{Script=Han}/u,`${p.name}: ${k}`);assert.ok(Number.isInteger(p.age)&&p.age>0&&p.age<60);assert.ok(Number.isInteger(p.number)&&p.number>0);assert.ok(Number.isInteger(p.referenceYear));}
 });
}
test('legends are marked retired, use historical years, and do not overlap with active players',()=>{
 const activeNames=new Set(pool.map(p=>normalize(p.name)));
 for(const p of legends){assert.equal(p.retired,true);assert.ok(p.referenceYear<2026);assert.ok(!activeNames.has(normalize(p.name)),p.name);}
 for(const name of ['Pelé','Diego Maradona','Zinedine Zidane','Ronaldo','Paolo Maldini','Sun Jihai','Gianluigi Buffon'])assert.ok(legends.find(p=>p.name===name));
});
const rice={id:'rice',nationality:'England',club:'Arsenal',league:'eng.1',position:'CM',group:'MID',number:41,age:27};
test('exact answer makes all clues green',()=>assert.ok(Object.values(compare(rice,rice)).every(c=>c==='exact')));
test('Kane example matches only nationality',()=>{assert.deepEqual(compare({id:'kane',nationality:'England',club:'Bayern',league:'ger.1',position:'ST',group:'FWD',number:9,age:33},rice),{name:'miss',nationality:'exact',club:'miss',position:'miss',number:'miss',age:'miss'});});
test('same league and midfield group are yellow, ages within two inclusive',()=>{const g={...rice,id:'other',club:'Chelsea',position:'CAM',age:29};const c=compare(g,rice);assert.equal(c.club,'close');assert.equal(c.position,'close');assert.equal(c.age,'close');assert.equal(compare({...g,age:25},rice).age,'close');assert.equal(compare({...g,age:30},rice).age,'miss');});
test('multilingual, accent-insensitive and alias search excludes guessed players',()=>{
 assert.equal(normalize('Martin Ødegaard'),normalize('Martin Odegaard'));
 const kane=pool.find(p=>p.name==='Harry Kane');assert.ok(kane);
 for(const q of ['凯恩','KANE','  Harry Kane  '])assert.ok(searchPlayers(pool,q).some(p=>p.id===kane.id));
 assert.ok(!searchPlayers(pool,'凯恩',[kane.id]).some(p=>p.id===kane.id));
 assert.equal(searchPlayers(legends,'大罗')[0].name,'Ronaldo');assert.equal(searchPlayers(legends,'马拉多纳')[0].name,'Diego Maradona');assert.deepEqual(searchPlayers(pool,''),[]);
});
test('all clubs have real badge sources and all players have portrait handling',()=>{
 for(const p of [...pool,...legends]){
  assert.match(p.badge,/^(\/media\/clubs\/|https:\/\/)/);if(p.badge.startsWith('/')){const bytes=readFileSync(`public${p.badge}`);assert.ok(bytes.length>100,`${p.club}: empty badge`);assert.ok(bytes[0]===0x89||bytes[0]===0xff||bytes.toString('ascii',0,3)==='GIF'||bytes.toString('ascii',0,4)==='RIFF',`${p.club}: invalid image`);}
  assert.ok(p.portrait);assert.ok(p.portraitFallback);
 }
});
test('recognisable stars outside the top five and Chinese players stay available in both languages',()=>{
 const outside=pool.filter(p=>!['eng.1','esp.1','ger.1','ita.1','fra.1'].includes(p.league));assert.ok(outside.length>=70);
 for(const name of ['Cristiano Ronaldo','Neymar',"N'Golo Kanté",'Thomas Müller','Son Heung-Min','Wu Lei','Zhu Chenjie'])assert.ok(outside.some(p=>p.name===name),name);
 const ronaldo=searchPlayers(pool,'罗哥');assert.equal(ronaldo[0].name,'Cristiano Ronaldo');assert.equal(ronaldo[0].clubZh,'利雅得胜利');assert.equal(ronaldo[0].number,7);assert.equal(searchPlayers(pool,'CR7')[0].name,'Cristiano Ronaldo');
 for(const name of ['Fan Zhiyi','Li Tie','Li Weifeng','Li Jinyu','Zhao Junzhe']){const p=legends.find(p=>p.name===name);assert.ok(p,name);assert.match(p.portrait,/^\/media\/players\//);assert.ok(readFileSync(`public${p.portrait}`).length>100);}
});
test('requested household names are searchable, with Giroud/Walker/Sterling active and Campbell retired',()=>{
 for(const [term,name] of [['sterling','Raheem Sterling'],['斯特林','Raheem Sterling'],['giroud','Olivier Giroud'],['吉鲁','Olivier Giroud'],['kyle walker','Kyle Walker'],['凯尔·沃克','Kyle Walker']])assert.ok(searchPlayers(pool,term).some(p=>p.name===name),term);
 assert.ok(searchPlayers(legends,'sol campbell').some(p=>p.name==='Sol Campbell'));
 assert.ok(searchPlayers(legends,'坎贝尔').some(p=>p.name==='Sol Campbell'));
 assert.ok(!legends.some(p=>['Olivier Giroud','Kyle Walker','Raheem Sterling'].includes(p.name)));
});
test('legend club clues accept each former club and preserve red/yellow for non-matches',()=>{
 const sol=legends.find(p=>p.name==='Sol Campbell');assert.ok(sol.careerClubs.length>=5);
 for(const club of ['Tottenham Hotspur','Arsenal','Portsmouth','Notts County','Newcastle United'])assert.equal(compare({...rice,club,clubKey:undefined},sol).club,'exact',club);
 assert.equal(compare({...rice,club:'Chelsea',league:'eng.1'},sol).club,'close');
 assert.equal(compare({...rice,club:'Barcelona',league:'esp.1'},sol).club,'miss');
 const current={...rice,careerClubs:['Chelsea'],retired:false};assert.equal(compare({...rice,club:'Chelsea'},current).club,'close');
 const beckham=legends.find(p=>p.name==='David Beckham');for(const club of ['AC Milan','Real Madrid','Manchester United','Paris Saint-Germain','LA Galaxy'])assert.equal(compare({...rice,club},beckham).club,'exact',club);
});
test('every legend carries a senior-club history and nationality flag',()=>{
 for(const p of legends){assert.ok(p.careerClubs.length>=1,p.name);assert.ok(p.careerClubKeys.length>=1,p.name);assert.ok(p.flag,p.name);assert.ok(p.flagEmoji,p.name);assert.ok(p.careerSource,p.name);}
});
test('separate clubs sharing a short name do not create false career matches',()=>{
 const fan=legends.find(p=>p.name==='Fan Zhiyi');assert.equal(compare({...rice,club:'Hong Kong Rangers',league:'hkg.1'},fan).club,'exact');assert.notEqual(compare({...rice,club:'Rangers',league:'sco.1'},fan).club,'exact');
});
test('renamed Shanghai Shenhua is accepted for Fan Zhiyi',()=>{
 const fan=legends.find(p=>p.name==='Fan Zhiyi'),zhu=pool.find(p=>p.name==='Zhu Chenjie');assert.equal(compare(zhu,fan).club,'exact');
});


test('difficulty tiers contain 200/700/1000 unique, nested players in each mode',async()=>{
 const {difficultyPool}=await import('./game.js');
 for(const file of ['players','legends']){
  const pool=JSON.parse(readFileSync(`public/${file}.json`));
  assert.deepEqual([...pool.map(p=>p.popularityRank)].sort((a,b)=>a-b),Array.from({length:1000},(_,i)=>i+1));
  const tiers=['easy','medium','hard'].map(d=>difficultyPool(pool,d));
  assert.deepEqual(tiers.map(t=>t.length),[200,700,1000]);
  for(let i=0;i<2;i++)assert.ok(tiers[i].every(p=>tiers[i+1].some(q=>q.id===p.id)));
  const shuffled=[...pool].reverse();assert.deepEqual(difficultyPool(shuffled,'easy').map(p=>p.id).sort(),tiers[0].map(p=>p.id).sort());
 }
});
test('requested stars are in Easy and searchable in Chinese and English',async()=>{
 const {difficultyPool}=await import('./game.js');
 const pool=JSON.parse(readFileSync('public/players.json'));
 const easy=difficultyPool(pool,'easy');
 for(const [en,zh] of [['Christian Pulisic','普利希奇'],['Karim Benzema','本泽马'],['Ángel Di María','迪马利亚'],['Marco Verratti','维拉蒂'],['Mohamed Salah','萨拉赫'],['Robert Lewandowski','莱万'],['Antoine Griezmann','格列兹曼'],['Alisson Becker','阿利松'],['Lautaro Martínez','劳塔罗'],['Raheem Sterling','斯特林'],['Olivier Giroud','吉鲁'],['Kyle Walker','沃克']]){
  assert.ok(searchPlayers(easy,en).some(p=>p.name===en),en);
  assert.ok(searchPlayers(easy,zh).some(p=>p.name===en),zh);
 }
 assert.ok(difficultyPool(JSON.parse(readFileSync('public/legends.json')),'easy').some(p=>p.name==='Sol Campbell'));
 assert.ok(!pool.some(p=>['Mohamadou Kanté','Mark Gillespie','Marcus Bettinelli'].includes(p.name)));
 const pulisic=pool.find(p=>p.name==='Christian Pulisic');assert.equal(pulisic.club,'AC Milan');assert.equal(pulisic.number,11);
});
