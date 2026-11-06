import {copy} from './new-i18n.js';
import {searchPlayers} from './game.js';
import {pickTarget,askDeepSeek} from './ai-game.js';

// Pages redirects /new to /new/; normalize dev URLs too so data paths agree.
if(!location.pathname.endsWith('/')) history.replaceState(null,'',`${location.pathname}/${location.search}${location.hash}`);
const $=s=>document.querySelector(s);
let pools={},target,key='',selected=null,won=false,busy=false,questions=0,guesses=0,historyMessages=[],controller;
let lang='en';
try{if(localStorage.getItem('touchline-ai-language')==='zh')lang='zh';}catch{}
const t=(key,...args)=>typeof copy[lang][key]==='function'?copy[lang][key](...args):copy[lang][key];
const names=p=>lang==='zh'?`${p.nameZh||p.name} · ${p.name}`:p.name;
function translate(){
 document.documentElement.lang=lang==='zh'?'zh-CN':'en';document.title=t('title');
 const heading=$('.ai-header h1');heading.firstChild.textContent=t('heading')+' ';$('.ai-mode-tag').textContent=t('tag');
 const labels={'.ai-header p':'subtitle','#ai-pool option[value="active"]':'active','#ai-pool option[value="legends"]':'legends','label[for="api-key"]':'key','#key-form button':'use','#clear-key':'clear','#key-form p':'privacy','.ai-rules>strong':'rules','.ai-rules>p':'help','label[for="question"]':'question','label[for="player-search"]':'guessLabel','#guess-player':'guess','#next-round':'next','.ai-game footer':'footer'};
 for(const [selector,key] of Object.entries(labels))$(selector).textContent=t(key);
 document.querySelectorAll('.ai-examples button').forEach((button,i)=>button.textContent=copy[lang].examples[i]);
 $('#question').placeholder=t('placeholder');$('#player-search').placeholder=t('search');$('#ai-language').textContent=lang==='en'?'中文':'English';
 $('#ai-language').setAttribute('aria-label',lang==='en'?'切换到中文':'Switch to English');
 for(const [selector,en,zh] of [['.ai-game','AI football guessing game','AI 猜球星'],['.ai-sidebar','Settings and rules','设置与玩法'],['#ai-pool','Player pool','题库'],['#conversation','Round conversation','本轮对话']])$(selector).setAttribute('aria-label',lang==='en'?en:zh);
 document.querySelectorAll('.ai-bubble').forEach(item=>item.querySelector('strong').textContent=item.classList.contains('user')?t('you'):t('referee'));
 if(selected)$('#player-search').value=names(selected);hideOptions();$('#ai-error').textContent='';
 $('#key-status').textContent=key?t('keySet'):'';
 $('#round-status').textContent=target?(won?t('win',names(target)):t('ready')):t('loading');sync();
}
$('#ai-language').onclick=()=>{lang=lang==='en'?'zh':'en';try{localStorage.setItem('touchline-ai-language',lang);}catch{}translate();};
function message(role,text){const item=document.createElement('div');item.className=`ai-bubble ${role}`;const label=document.createElement('strong');label.textContent=role==='user'?t('you'):t('referee');const content=document.createElement('p');content.textContent=text;item.append(label,content);$('#conversation').append(item);item.scrollIntoView?.({block:'nearest',behavior:'smooth'});}
function sync(){const ready=!!target&&!won;$('#question').disabled=!ready||!key||busy;$('#ask').disabled=!ready||!key||busy;$('#ask').textContent=busy?t('thinking'):t('ask');$('#player-search').disabled=!ready||busy;$('#guess-player').disabled=!ready||busy||!selected;$('#round-count').textContent=t('counts',questions,guesses);$('#next-round').hidden=!won;}
function hideOptions(){$('#player-options').hidden=true;$('#player-search').setAttribute('aria-expanded','false');}
function start(){controller?.abort();controller=null;busy=false;target=pickTarget(pools[$('#ai-pool').value],target?.id);won=false;selected=null;questions=0;guesses=0;historyMessages=[];$('#conversation').replaceChildren();$('#ai-error').textContent='';$('#question').value='';$('#player-search').value='';hideOptions();$('#round-status').textContent=t('ready');message('assistant',t('intro'));sync();}
$('#key-form').onsubmit=e=>{e.preventDefault();key=$('#api-key').value.trim();$('#api-key').value='';$('#key-status').textContent=key?t('keySet'):'';$('#key-settings').open=!key;sync();};
$('#clear-key').onclick=()=>{controller?.abort();key='';$('#api-key').value='';$('#key-status').textContent=t('keyCleared');sync();};
$('#ai-pool').onchange=()=>{if(pools[$('#ai-pool').value])start();};
$('#next-round').onclick=start;
document.querySelectorAll('.ai-examples button').forEach(button=>button.onclick=()=>{$('#question').value=button.textContent;$('#question').focus();});
$('#question-form').onsubmit=async e=>{
 e.preventDefault();const question=$('#question').value.trim();if(!target||!key||busy||won||!question||question.length>300)return;
 busy=true;$('#ai-error').textContent='';controller=new AbortController();const requestController=controller;const timer=setTimeout(()=>requestController.abort(),45000);sync();
 try{const result=await askDeepSeek({key,lang,player:target,history:historyMessages,question,signal:requestController.signal});
  if(requestController.signal.aborted)return;
  message('user',question);message('assistant',result.answer);
  historyMessages.push({role:'user',content:question},{role:'assistant',content:JSON.stringify(result)});questions++;$('#question').value='';
 }catch(error){if(controller===requestController)$('#ai-error').textContent=error.name==='AbortError'?t('timeout'):error instanceof TypeError?t('network'):error.message;
 }finally{clearTimeout(timer);if(controller===requestController){busy=false;sync();}}
};
$('#player-search').oninput=()=>{
 selected=null;sync();const query=$('#player-search').value.trim();const options=$('#player-options');options.replaceChildren();if(!query){hideOptions();return;}
 const results=searchPlayers(pools[$('#ai-pool').value]||[],query);
 for(const player of results){const button=document.createElement('button');button.type='button';button.setAttribute('role','option');button.textContent=names(player);button.onclick=()=>{selected=player;$('#player-search').value=names(player);hideOptions();sync();$('#guess-player').focus();};options.append(button);}
 if(!results.length)options.textContent=t('noResults');options.hidden=false;$('#player-search').setAttribute('aria-expanded','true');
};
$('#player-search').onkeydown=e=>{if(e.key==='ArrowDown'){e.preventDefault();$('#player-options button')?.focus();}if(e.key==='Escape')hideOptions();};
$('#player-options').onkeydown=e=>{if(e.key==='Escape'){hideOptions();$('#player-search').focus();}if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();(e.key==='ArrowDown'?document.activeElement.nextElementSibling:document.activeElement.previousElementSibling)?.focus();}};
$('#ai-guess-form').onsubmit=e=>{e.preventDefault();if(!selected||!target||won||busy)return;guesses++;message('user',t('guessMessage',names(selected)));if(selected.id===target.id){won=true;$('#round-status').textContent=t('win',names(target));message('assistant',t('won',names(target),questions,guesses));}else message('assistant',t('wrong'));selected=null;$('#player-search').value='';sync();if(won)$('#next-round').focus();};
translate();
try{const responses=await Promise.all(['players','legends'].map(async name=>{const response=await fetch(new URL(`../${name}.json`,location.href));if(!response.ok)throw new Error();return response.json();}));pools={active:responses[0],legends:responses[1]};start();}catch{$('#round-status').textContent=t('loadError');}
