import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {pickTarget,askDeepSeek,safeAnswer,systemPrompt} from './ai-game.js';
const players=JSON.parse(readFileSync('public/players.json'));
test('both Easy libraries follow the curated first 200 names exactly',()=>{
 const order=JSON.parse(readFileSync('data/popularity-order.json'));
 for(const [mode,file] of [['active','players'],['legends','legends']]){
  const pool=JSON.parse(readFileSync(`public/${file}.json`));
  assert.deepEqual(pool.filter(p=>p.popularityRank<=200).sort((a,b)=>a.popularityRank-b.popularityRank).map(p=>p.name),order[mode].slice(0,200));
 }
});
test('AI targets stay in easy and avoid the previous player',()=>{
 const target=pickTarget(players,null,()=>0);
 assert.ok(target.popularityRank<=200);
 assert.notEqual(pickTarget(players,target.id,()=>0).id,target.id);
 assert.match(systemPrompt(target),/主观推测/);
 assert.match(systemPrompt(target),/哪个俱乐部/);
 assert.equal(safeAnswer({allowed:true,kind:'choice',options:[target.name,'其他'],choice:target.name,subjective:false},target,`${target.name}还是其他`).allowed,false);
});
test('DeepSeek uses structured replies, handles refusals and errors',async()=>{
 let request;
 const result=await askDeepSeek({key:'test-only',player:players[0],history:[],question:'左脚还是右脚？',fetcher:async(url,options)=>{request={url,...options};return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({allowed:true,kind:'boolean',verdict:'unknown'})}}]})};}});
 assert.equal(result.allowed,true);
 assert.equal(request.url,'https://api.deepseek.com/chat/completions');
 assert.equal(request.headers.Authorization,'Bearer test-only');
 assert.equal(JSON.parse(request.body).response_format.type,'json_object');
 await assert.rejects(askDeepSeek({key:'x',player:players[0],history:[],question:'test',fetcher:async()=>({ok:false,status:401})}),/API Key 无效/);
 assert.throws(()=>safeAnswer({answer:'invalid'},players[0]),/格式异常/);
});
test('new page supports key, questions, wrong guesses, win and next round',async()=>{
 const dom=new JSDOM(readFileSync('new/index.html','utf8'),{url:'https://example.com/guess-the-player/new/'});
 globalThis.document=dom.window.document;globalThis.location=dom.window.location;globalThis.history=dom.window.history;
 const pool=[{...players[0],popularityRank:1},{...players[1],popularityRank:2}];
 const originalRandom=Math.random;Math.random=()=>0;
 globalThis.fetch=async(url)=>String(url).includes('chat/completions')?{ok:true,json:async()=>({choices:[{message:{content:'{"allowed":true,"kind":"boolean","verdict":"yes"}'}}]})}:{ok:true,json:async()=>pool};
 try{
  await import(`./new.js?test=${Date.now()}`);
  const $=s=>document.querySelector(s);
  $('#api-key').value='test-key';$('#key-form').dispatchEvent(new dom.window.Event('submit',{cancelable:true}));
  assert.equal($('#api-key').value,'');assert.equal($('#question').disabled,false);
  $('#question').value='他是前锋吗？';$('#question-form').dispatchEvent(new dom.window.Event('submit',{cancelable:true}));
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.match($('#conversation').textContent,/是。/);
  const guess=player=>{$('#player-search').value=player.name;$('#player-search').dispatchEvent(new dom.window.Event('input'));$('#player-options button').click();$('#ai-guess-form').dispatchEvent(new dom.window.Event('submit',{cancelable:true}));};
  guess(pool[1]);assert.equal($('#next-round').hidden,true);
  guess(pool[0]);assert.equal($('#next-round').hidden,false);assert.equal($('#question').disabled,true);
  $('#next-round').click();assert.equal($('#next-round').hidden,true);assert.equal($('#round-count').textContent,'提问 0 · 猜测 0');
  guess(pool[1]);assert.equal($('#next-round').hidden,false);
  assert.equal(dom.window.localStorage.length,0);
 }finally{Math.random=originalRandom;dom.window.close();}
});

test('boolean answers cannot leak extra clues and choices are limited to the question',()=>{
 const player=players[0];
 assert.deepEqual(safeAnswer({allowed:true,kind:'boolean',verdict:'no',answer:'不是，他主要踢后腰。'},player,'他是前锋吗？'),{allowed:true,answer:'不是。'});
 assert.deepEqual(safeAnswer({allowed:true,kind:'boolean',verdict:'yes',answer:'是，他在西甲。'},player,'他在西甲吗？'),{allowed:true,answer:'是。'});
 assert.equal(safeAnswer({allowed:true,kind:'choice',options:['左脚','右脚'],choice:'右脚',subjective:false},player,'左脚还是右脚？').answer,'右脚');
 assert.equal(safeAnswer({allowed:true,kind:'choice',options:['文科','理科'],choice:'文科',subjective:true},player,'如果上大学会学文科还是理科？').answer,'主观推测：文科');
 assert.equal(safeAnswer({allowed:true,kind:'choice',options:['前锋','后腰'],choice:'后腰',subjective:false},player,'他是前锋吗？').allowed,false);
 assert.equal(safeAnswer({allowed:false,answer:'他主要踢后腰'},player,'介绍他').answer.includes('后腰'),false);
});
