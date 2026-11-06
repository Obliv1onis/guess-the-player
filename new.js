import {searchPlayers} from './game.js';
import {pickTarget,askDeepSeek} from './ai-game.js';

// Pages redirects /new to /new/; normalize dev URLs too so data paths agree.
if(!location.pathname.endsWith('/')) history.replaceState(null,'',`${location.pathname}/${location.search}${location.hash}`);
const $=s=>document.querySelector(s);
let pools={},target,key='',selected=null,won=false,busy=false,questions=0,guesses=0,historyMessages=[],controller;
const names=p=>`${p.nameZh||p.name} · ${p.name}`;
function message(role,text){const item=document.createElement('div');item.className=`ai-bubble ${role}`;const label=document.createElement('strong');label.textContent=role==='user'?'你':'AI 裁判';const content=document.createElement('p');content.textContent=text;item.append(label,content);$('#conversation').append(item);item.scrollIntoView?.({block:'nearest',behavior:'smooth'});}
function sync(){const ready=!!target&&!won;$('#question').disabled=!ready||!key||busy;$('#ask').disabled=!ready||!key||busy;$('#ask').textContent=busy?'思考中…':'发送问题 ↗';$('#player-search').disabled=!ready||busy;$('#guess-player').disabled=!ready||busy||!selected;$('#round-count').textContent=`提问 ${questions} · 猜测 ${guesses}`;$('#next-round').hidden=!won;}
function hideOptions(){$('#player-options').hidden=true;$('#player-search').setAttribute('aria-expanded','false');}
function start(){controller?.abort();controller=null;busy=false;target=pickTarget(pools[$('#ai-pool').value],target?.id);won=false;selected=null;questions=0;guesses=0;historyMessages=[];$('#conversation').replaceChildren();$('#ai-error').textContent='';$('#question').value='';$('#player-search').value='';hideOptions();$('#round-status').textContent='新一轮 · 神秘球员已就位';message('assistant','我已经选好一位球员。问一个限定范围的问题，或者直接猜猜他是谁。');sync();}
$('#key-form').onsubmit=e=>{e.preventDefault();key=$('#api-key').value.trim();$('#api-key').value='';$('#key-status').textContent=key?'Key 已设置，首次提问时验证。':'';$('#key-settings').open=!key;sync();};
$('#clear-key').onclick=()=>{controller?.abort();key='';$('#api-key').value='';$('#key-status').textContent='Key 已清除。';sync();};
$('#ai-pool').onchange=()=>{if(pools[$('#ai-pool').value])start();};
$('#next-round').onclick=start;
document.querySelectorAll('.ai-examples button').forEach(button=>button.onclick=()=>{$('#question').value=button.textContent;$('#question').focus();});
$('#question-form').onsubmit=async e=>{
 e.preventDefault();const question=$('#question').value.trim();if(!target||!key||busy||won||!question||question.length>300)return;
 busy=true;$('#ai-error').textContent='';controller=new AbortController();const requestController=controller;const timer=setTimeout(()=>requestController.abort(),45000);sync();
 try{const result=await askDeepSeek({key,player:target,history:historyMessages,question,signal:requestController.signal});
  if(requestController.signal.aborted)return;
  message('user',question);message('assistant',`${result.allowed?'':'问题范围过大或不符合规则：'}${result.answer}`);
  historyMessages.push({role:'user',content:question},{role:'assistant',content:JSON.stringify(result)});questions++;$('#question').value='';
 }catch(error){if(controller===requestController)$('#ai-error').textContent=error.name==='AbortError'?'请求已取消或超时，可重新提问。':error instanceof TypeError?'连接 DeepSeek 失败，请检查网络后重试。':error.message;
 }finally{clearTimeout(timer);if(controller===requestController){busy=false;sync();}}
};
$('#player-search').oninput=()=>{
 selected=null;sync();const query=$('#player-search').value.trim();const options=$('#player-options');options.replaceChildren();if(!query){hideOptions();return;}
 const results=searchPlayers(pools[$('#ai-pool').value]||[],query);
 for(const player of results){const button=document.createElement('button');button.type='button';button.setAttribute('role','option');button.textContent=names(player);button.onclick=()=>{selected=player;$('#player-search').value=names(player);hideOptions();sync();$('#guess-player').focus();};options.append(button);}
 if(!results.length)options.textContent='没有匹配的球员，请换个名字。';options.hidden=false;$('#player-search').setAttribute('aria-expanded','true');
};
$('#player-search').onkeydown=e=>{if(e.key==='ArrowDown'){e.preventDefault();$('#player-options button')?.focus();}if(e.key==='Escape')hideOptions();};
$('#player-options').onkeydown=e=>{if(e.key==='Escape'){hideOptions();$('#player-search').focus();}if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();(e.key==='ArrowDown'?document.activeElement.nextElementSibling:document.activeElement.previousElementSibling)?.focus();}};
$('#ai-guess-form').onsubmit=e=>{e.preventDefault();if(!selected||!target||won||busy)return;guesses++;message('user',`我猜是 ${names(selected)}`);if(selected.id===target.id){won=true;$('#round-status').textContent=`猜对了！答案是 ${names(target)}`;message('assistant',`恭喜猜中 ${names(target)}！本轮提问 ${questions} 次，猜测 ${guesses} 次。准备好就开始下一轮。`);}else message('assistant','还不是他，继续缩小范围吧。');selected=null;$('#player-search').value='';sync();if(won)$('#next-round').focus();};
try{const responses=await Promise.all(['players','legends'].map(async name=>{const response=await fetch(new URL(`../${name}.json`,location.href));if(!response.ok)throw new Error();return response.json();}));pools={active:responses[0],legends:responses[1]};start();}catch{$('#round-status').textContent='题库加载失败，请刷新重试。';}
