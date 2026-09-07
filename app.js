
const PLAYER_COUNT = 4;
const FALLBACK = ["Aさん","Bさん","Cさん","Dさん"];
const OLYMPIC_POINTS = [5,4,3,2,1,0];
const AWARDS = [
  {key:"hio", label:"ホールインワン"},
  {key:"alb", label:"アルバトロス"},
  {key:"eagle", label:"イーグル"},
  {key:"birdie", label:"バーディー"}
];

const defaultState = () => ({
  date:"",
  course:"",
  golfCourse:"",
  frontCourse:"",
  backCourse:"",
  names:["","","",""],
  awardPoints:{
    hio:[100,100,100,100], alb:[100,100,100,100], eagle:[10,10,10,10], birdie:[1,1,1,1]
  },
  tateHandicap:[0,0,0,0],
  handicap:Array.from({length:18},()=>[0,0,0,0]),
  driveHoles:Array(18).fill(false),
  nearHoles:Array(18).fill(false),
  holes:Array.from({length:18},()=>({
    scores:[null,null,null,null],
    olympic:[null,null,null,null],
    drive:null,
    near:null,
    awards:{hio:[],alb:[],eagle:[],birdie:[]}
  })),
});

let state = loadState();
let currentHole = 1;
let currentLimit = 9;

function loadState(){
  try{
    const x = JSON.parse(localStorage.getItem("golfPointsState")||"null");
    return x || defaultState();
  }catch(e){ return defaultState(); }
}
function saveState(){ localStorage.setItem("golfPointsState", JSON.stringify(state)); }


function migrateDefaults(){
  const desired={hio:100,alb:100,eagle:10,birdie:1};
  let changed=false;

  // 旧「ゴルフコース」データを新しい「ゴルフ場」に引き継ぐ
  if(typeof state.golfCourse!=="string"){
    state.golfCourse = typeof state.course==="string" ? state.course : "";
    changed=true;
  }
  if(typeof state.frontCourse!=="string"){ state.frontCourse=""; changed=true; }
  if(typeof state.backCourse!=="string"){ state.backCourse=""; changed=true; }
  if(!Array.isArray(state.tateHandicap) || state.tateHandicap.length!==4){
    state.tateHandicap=[0,0,0,0];
    changed=true;
  }
  for(const k of Object.keys(desired)){
    if(!state.awardPoints[k] || state.awardPoints[k].length!==4){
      state.awardPoints[k]=[desired[k],desired[k],desired[k],desired[k]];
      changed=true;
      continue;
    }
    if(state.awardPoints[k].every(v=>Number(v)===0)){
      state.awardPoints[k]=[desired[k],desired[k],desired[k],desired[k]];
      changed=true;
    }
  }
  if(changed) saveState();
}

function playerNames(){
  return state.names.map((n,i)=> (n||"").trim() || FALLBACK[i]);
}
function syncNameHeaders(){
  const ns=playerNames();
  document.querySelectorAll("[data-name-col]").forEach(el=>{
    el.textContent=ns[Number(el.dataset.nameCol)];
  });
}

function renderSettings(){
  document.getElementById("dateInput").value = state.date || "";
  document.getElementById("golfCourseInput").value = state.golfCourse || state.course || "";
  document.getElementById("frontCourseInput").value = state.frontCourse || "";
  document.getElementById("backCourseInput").value = state.backCourse || "";

  const nameWrap=document.getElementById("playerNameInputs");
  nameWrap.innerHTML = state.names.map((n,i)=>`
    <label>${i+1}人目<input type="text" data-player-name="${i}" value="${escapeHtml(n)}" placeholder="名前"></label>
  `).join("");
  nameWrap.querySelectorAll("input").forEach(inp=>{
    inp.addEventListener("input",e=>{
      state.names[Number(e.target.dataset.playerName)] = e.target.value;
      syncNameHeaders();
      renderScoreNameOnly();
    });
  });

  document.getElementById("tateHandicapInputs").innerHTML = state.tateHandicap.map((v,p)=>`
    <label>${escapeHtml(playerNames()[p])}<input type="number" step="1" inputmode="numeric" data-tate-hcp-p="${p}" value="${v}"></label>
  `).join("");

  document.getElementById("awardPointTable").innerHTML = AWARDS.map(a=>`
    <tr><td>${a.label}</td>${state.awardPoints[a.key].map((v,p)=>`
      <td><input class="small-num" type="number" step="1" data-award-key="${a.key}" data-award-p="${p}" value="${v}"></td>
    `).join("")}</tr>
  `).join("");

  document.getElementById("handicapTable").innerHTML = state.handicap.map((row,h)=>`
    <tr>
      <td>${h+1}H</td>
      ${row.map((v,p)=>`<td><input class="small-num" type="number" step="1" data-h="${h}" data-p="${p}" value="${v}"></td>`).join("")}
      <td><input type="checkbox" data-drive-h="${h}" ${state.driveHoles[h]?"checked":""}></td>
      <td><input type="checkbox" data-near-h="${h}" ${state.nearHoles[h]?"checked":""}></td>
    </tr>
  `).join("");

  syncNameHeaders();
}

function saveSettings(){
  state.date=document.getElementById("dateInput").value;
  state.golfCourse=document.getElementById("golfCourseInput").value.trim();
  state.frontCourse=document.getElementById("frontCourseInput").value.trim();
  state.backCourse=document.getElementById("backCourseInput").value.trim();
  state.course=state.golfCourse;
  document.querySelectorAll("[data-player-name]").forEach(el=> state.names[Number(el.dataset.playerName)]=el.value);
  document.querySelectorAll("[data-tate-hcp-p]").forEach(el=>{
    state.tateHandicap[Number(el.dataset.tateHcpP)] = Number(el.value||0);
  });
  document.querySelectorAll("[data-award-key]").forEach(el=>{
    state.awardPoints[el.dataset.awardKey][Number(el.dataset.awardP)] = Number(el.value||0);
  });
  document.querySelectorAll("[data-h][data-p]").forEach(el=>{
    state.handicap[Number(el.dataset.h)][Number(el.dataset.p)] = Number(el.value||0);
  });
  document.querySelectorAll("[data-drive-h]").forEach(el=> state.driveHoles[Number(el.dataset.driveH)] = el.checked);
  document.querySelectorAll("[data-near-h]").forEach(el=> state.nearHoles[Number(el.dataset.nearH)] = el.checked);
  saveState();
  syncNameHeaders();
}

function renderHoleSelector(){
  const wrap=document.getElementById("holeSelector");
  wrap.innerHTML = Array.from({length:18},(_,i)=>`
    <button data-hole="${i+1}" class="${currentHole===i+1?"active":""}">${i+1}</button>
  `).join("");
  wrap.querySelectorAll("button").forEach(b=>b.onclick=()=>{saveCurrentHole();currentHole=Number(b.dataset.hole);renderScore();});
}

function renderScoreNameOnly(){
  if(!document.getElementById("score").classList.contains("active")) return;
  renderScore();
}

function carryBeforeHole(holeNo){
  let yoko=0, drive=0, near=0;
  for(let hi=0; hi<holeNo-1; hi++){
    const h=state.holes[hi];
    if(h.scores.every(v=>v!==null)){
      const nets=h.scores.map((score,p)=>score-state.handicap[hi][p]);
      const min=Math.min(...nets);
      const winners=nets.filter(v=>v===min).length;
      if(winners===1) yoko=0; else yoko+=1;
    }
    if(state.driveHoles[hi]){
      if(h.drive!==null && h.drive>=0) drive=0; else drive+=1;
    }
    if(state.nearHoles[hi]){
      if(h.near!==null && h.near>=0) near=0; else near+=1;
    }
  }
  return {yoko,drive,near};
}

function renderCarryStatus(){
  const el=document.getElementById("carryStatus");
  if(!el) return;
  const c=carryBeforeHole(currentHole);
  el.innerHTML=`<div class="carry-title">現在の持越し</div><div class="carry-items"><span>ヨコ <b>${c.yoko}pt</b></span><span>ドラコン <b>${c.drive}pt</b></span><span>ニアピン <b>${c.near}pt</b></span></div>`;
}

function renderScore(){
  syncNameHeaders();
  renderHoleSelector();
  renderCarryStatus();
  const ns=playerNames();
  const h=state.holes[currentHole-1];

  document.getElementById("holeTitle").textContent=`${currentHole}H`;
  const halfCourse = currentHole<=9 ? state.frontCourse : state.backCourse;
  const halfLabel = currentHole<=9 ? "前半コース未設定" : "後半コース未設定";
  document.getElementById("holeMeta").textContent=`${state.golfCourse || state.course || "ゴルフ場未設定"} / ${halfCourse || halfLabel} / ${state.date || "日付未設定"}`;
  const targetTags=[];
  if(state.driveHoles[currentHole-1]) targetTags.push(`<span class="hole-target-tag">ドラコン対象</span>`);
  if(state.nearHoles[currentHole-1]) targetTags.push(`<span class="hole-target-tag">ニアピン対象</span>`);
  document.getElementById("holeTargetTags").innerHTML=targetTags.join("");

  // 未入力ホールの初期値：ドラコン対象=5、ニアピン対象=3、それ以外=4
  // 両方に設定された場合はニアピン(3)を優先
  const defaultScore = state.nearHoles[currentHole-1] ? 3 : (state.driveHoles[currentHole-1] ? 5 : 4);
  h.scores = h.scores.map(v => (v===null || v===undefined || v==="") ? defaultScore : Number(v));
  document.getElementById("scoreInputs").innerHTML = ns.map((n,p)=>`
    <div class="score-player">
      <div class="score-player-name">${escapeHtml(n)}</div>
      <div class="score-stepper">
        <div class="score-step-value" data-score-value="${p}">${h.scores[p]}</div>
        <div class="score-step-controls">
          <button type="button" class="score-step-btn" data-score-plus="${p}" aria-label="${escapeHtml(n)}のスコアを1増やす">＋</button>
          <button type="button" class="score-step-btn" data-score-minus="${p}" aria-label="${escapeHtml(n)}のスコアを1減らす">−</button>
        </div>
      </div>
    </div>
  `).join("");
  document.querySelectorAll("[data-score-minus]").forEach(btn=>btn.onclick=()=>{
    const p=Number(btn.dataset.scoreMinus);
    h.scores[p]=Math.max(1, Number(h.scores[p]||4)-1);
    document.querySelector(`[data-score-value="${p}"]`).textContent=h.scores[p];
    updateHolePointSummary();
  });
  document.querySelectorAll("[data-score-plus]").forEach(btn=>btn.onclick=()=>{
    const p=Number(btn.dataset.scorePlus);
    h.scores[p]=Number(h.scores[p]||4)+1;
    document.querySelector(`[data-score-value="${p}"]`).textContent=h.scores[p];
    updateHolePointSummary();
  });

  const olympicLabels=["💎 ダイヤ 5","🥇 金 4","🥈 銀 3","🥉 銅 2","⚫ 鉄 1","🗑 クズ鉄"];
  document.getElementById("olympicInputs").innerHTML = ns.map((n,p)=>`
    <div class="olympic-player-col">
      <div class="olympic-player-name">${escapeHtml(n)}</div>
      ${olympicLabels.map((label,rank)=>`
        <button class="olympic-rank-btn ${h.olympic[p]===rank?"active":""}" data-olym-p="${p}" data-rank="${rank}">${label}</button>
      `).join("")}
    </div>
  `).join("");
  document.querySelectorAll("[data-olym-p]").forEach(btn=>btn.onclick=()=>{
    const p=Number(btn.dataset.olymP), rank=Number(btn.dataset.rank);
    h.olympic[p] = h.olympic[p]===rank ? null : rank;
    renderScore();
  });

  renderSingleChoices("driveChoices", h.drive, v=>{h.drive=v; renderScore();});
  renderSingleChoices("nearChoices", h.near, v=>{h.near=v; renderScore();});

  document.getElementById("driveCard").style.display = state.driveHoles[currentHole-1] ? "" : "none";
  document.getElementById("nearCard").style.display = state.nearHoles[currentHole-1] ? "" : "none";

  document.getElementById("holeAwardTable").innerHTML = AWARDS.map(a=>`
    <tr><td>${a.label}</td>${ns.map((n,p)=>`
      <td><input type="checkbox" data-hole-award="${a.key}" data-hole-award-p="${p}" ${h.awards[a.key].includes(p)?"checked":""}></td>
    `).join("")}</tr>
  `).join("");

  document.querySelectorAll("[data-hole-award]").forEach(el=>el.onchange=()=>{
    const key=el.dataset.holeAward, p=Number(el.dataset.holeAwardP);
    const arr=h.awards[key];
    if(el.checked && !arr.includes(p)) arr.push(p);
    if(!el.checked) h.awards[key]=arr.filter(x=>x!==p);
    updateHolePointSummary();
  });

  updateHolePointSummary();
}

function renderSingleChoices(id, selected, onPick){
  const ns=playerNames();
  const el=document.getElementById(id);
  el.innerHTML = ns.map((n,p)=>`<button class="${selected===p?"active":""}" data-choice="${p}">${escapeHtml(n)}</button>`).join("")
    + `<button class="${selected===-1?"active":""}" data-choice="-1">該当なし</button>`;
  el.querySelectorAll("button").forEach(b=>b.onclick=()=>onPick(Number(b.dataset.choice)));
}

function saveCurrentHole(){
  saveState();
}

function calcYoko(limit){
  const totals=[0,0,0,0];
  const detail=Array.from({length:4},()=>({yoko:0,olympic:0,drive:0,near:0,hio:0,alb:0,eagle:0,birdie:0,grand:0}));

  // ヨコ本体：各ホールのネット最少が単独勝者。引き分けは持越し。18H最終引き分けは消滅。
  let carry=0;
  for(let hi=0; hi<limit; hi++){
    const h=state.holes[hi];
    if(h.scores.every(v=>v!==null)){
      const nets=h.scores.map((s,p)=>s-state.handicap[hi][p]);
      const min=Math.min(...nets);
      const winners=nets.map((v,p)=>v===min?p:null).filter(v=>v!==null);
      if(winners.length===1){
        const pt=1+carry; carry=0;
        totals[winners[0]]+=pt; detail[winners[0]].yoko+=pt;
      }else{
        carry += 1;
      }
    }
  }
  // limitが18なら未解決carryは消滅。途中なら単に未確定。

  // オリンピック
  for(let hi=0;hi<limit;hi++){
    const h=state.holes[hi];
    const kuzuPlayers=h.olympic.map((r,p)=>r===5?p:null).filter(p=>p!==null);
    for(let p=0;p<4;p++){
      const r=h.olympic[p];
      if(r!==null){
        const pt=OLYMPIC_POINTS[r];
        totals[p]+=pt; detail[p].olympic+=pt;
      }
    }
    kuzuPlayers.forEach(kuzup=>{
      for(let p=0;p<4;p++) if(p!==kuzup){ totals[p]+=1; detail[p].olympic+=1; }
    });
  }

  // グランドスラム
  for(let p=0;p<4;p++){
    const got=new Set();
    for(let hi=0;hi<limit;hi++){
      const r=state.holes[hi].olympic[p];
      if([0,1,2,3,4].includes(r)) got.add(r);
    }
    if(got.size===5){ totals[p]+=100; detail[p].grand+=100; }
  }

  // ドラコン・ニアピン持越し（対象ホール間）
  ["drive","near"].forEach(kind=>{
    let c=0;
    for(let hi=0;hi<limit;hi++){
      const target = kind==="drive" ? state.driveHoles[hi] : state.nearHoles[hi];
      if(!target) continue;
      c += 1;
      const winner=state.holes[hi][kind];
      if(winner!==null && winner>=0){
        totals[winner]+=c; detail[winner][kind]+=c; c=0;
      }
    }
  });

  // ホール賞
  for(let hi=0;hi<limit;hi++){
    const h=state.holes[hi];
    AWARDS.forEach(a=>{
      h.awards[a.key].forEach(p=>{
        const pt=Number(state.awardPoints[a.key][p]||0);
        totals[p]+=pt; detail[p][a.key]+=pt;
      });
    });
  }
  return {totals,detail,carry};
}

function calcYokoRange(start,end){
  const originalHoles=state.holes, originalHandicap=state.handicap, originalDrive=state.driveHoles, originalNear=state.nearHoles;
  const from=start-1, count=end-start+1;
  state.holes=originalHoles.slice(from,end); state.handicap=originalHandicap.slice(from,end);
  state.driveHoles=originalDrive.slice(from,end); state.nearHoles=originalNear.slice(from,end);
  const result=calcYoko(count);
  state.holes=originalHoles; state.handicap=originalHandicap; state.driveHoles=originalDrive; state.nearHoles=originalNear;
  return result;
}

function netRange(start,end,p){
  let gross=0;
  for(let h=start;h<=end;h++){
    const score=state.holes[h-1].scores[p];
    if(score===null) return null;
    gross+=score;
  }
  const holes=end-start+1;
  const full=Number(state.tateHandicap?.[p]||0);
  const hdcp = holes===18 ? full : (holes===9 ? full/2 : 0);
  return gross-hdcp;
}

function calcHoleEarnedPoints(holeNo){
  const now=calcYoko(holeNo);
  const prev=holeNo>1 ? calcYoko(holeNo-1) : {totals:[0,0,0,0]};
  return now.totals.map((v,p)=>v-prev.totals[p]);
}

function updateHolePointSummary(){
  const el=document.getElementById("holePointSummary");
  if(!el) return;
  const ns=playerNames();
  const pts=calcHoleEarnedPoints(currentHole);
  el.innerHTML=ns.map((n,p)=>`
    <div class="hole-point-item">
      <div class="hole-point-name">${escapeHtml(n)}</div>
      <div class="hole-point-value">+${pts[p]}pt</div>
    </div>
  `).join("");
}

function signed(v){
  const n=Number(v||0);
  return n>0 ? `+${n}` : `${n}`;
}

function medalMarks(start,end,p){
  const marks=["","","","",""];
  for(let hi=start-1;hi<end;hi++){
    const r=state.holes[hi].olympic[p];
    if([0,1,2,3,4].includes(r)) marks[r]=["💎","🥇","🥈","🥉","⚫"][r];
  }
  return marks;
}

// タテ：各相手とのネットスコア差をポイント化（少ないスコアが＋）
// ヨコ：各相手との獲得ポイント差を＋−化
function settlementPoints(values, lowerIsBetter=false){
  return values.map((v,p)=>{
    if(v===null || v===undefined) return null;
    let pt=0;
    values.forEach((other,q)=>{
      if(q===p || other===null || other===undefined) return;
      pt += lowerIsBetter ? Number(other)-Number(v) : Number(v)-Number(other);
    });
    return pt;
  });
}

function renderResultTable(label,start,end,y){
  const ns=playerNames();
  const nets=[0,1,2,3].map(p=>netRange(start,end,p));
  const tatePts=settlementPoints(nets,true);
  const yokoPts=settlementPoints(y.totals,false);
  const totals=tatePts.map((v,p)=>v===null ? null : v+yokoPts[p]);
  const order=[0,1,2,3].sort((a,b)=>(totals[b]??-999999)-(totals[a]??-999999));

  return `
    <div class="card ranking">
      <h2>${label}</h2>
      <div class="table-wrap result-summary-wrap">
        <table class="result-summary-table">
          <thead>
            <tr><th>順位</th><th>氏名</th><th>💎</th><th>🥇</th><th>🥈</th><th>🥉</th><th>⚫</th><th>ヨコ</th><th>タテ</th><th>合計</th></tr>
          </thead>
          <tbody>${order.map((p,i)=>{
            const m=medalMarks(start,end,p);
            return `<tr>
              <td>${i+1}位</td>
              <td>${escapeHtml(ns[p])}</td>
              ${m.map(x=>`<td class="medal-cell">${x}</td>`).join("")}
              <td class="${yokoPts[p]>=0?"pos":"neg"}">${signed(yokoPts[p])}</td>
              <td class="${(tatePts[p]??0)>=0?"pos":"neg"}">${tatePts[p]===null?"－":signed(tatePts[p])}</td>
              <td class="big ${(totals[p]??0)>=0?"pos":"neg"}">${totals[p]===null?"－":signed(totals[p])}</td>
            </tr>`;
          }).join("")}</tbody>
        </table>
      </div>
    </div>`;
}

function renderResults(limit=currentLimit){
  currentLimit=limit;
  saveCurrentHole();
  document.querySelectorAll(".result-range button").forEach(b=>b.classList.toggle("active",Number(b.dataset.limit)===limit));

  const body=document.getElementById("resultsBody");
  const isBack9=limit===109;
  const is18=limit===18;

  if(is18){
    const front=calcYoko(9);
    const back=calcYokoRange(10,18);
    const all=calcYoko(18);
    body.innerHTML =
      renderResultTable("前半9H 結果",1,9,front) +
      renderResultTable("後半9H 結果",10,18,back) +
      renderResultTable("18H 最終結果",1,18,all);
    return;
  }

  if(isBack9){
    body.innerHTML=renderResultTable("後半9H 結果",10,18,calcYokoRange(10,18));
  }else{
    body.innerHTML=renderResultTable("前半9H 結果",1,9,calcYoko(9));
  }
}

function escapeHtml(s){
  return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

document.querySelectorAll(".main-tabs button").forEach(btn=>btn.onclick=()=>{
  document.querySelectorAll(".main-tabs button").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  document.getElementById(btn.dataset.tab).classList.add("active");
  if(btn.dataset.tab==="score") renderScore();
  if(btn.dataset.tab==="results") renderResults(currentLimit);
  window.scrollTo(0,0);
});

document.getElementById("saveSettingsBtn").onclick=()=>{
  saveSettings();
  document.querySelector('[data-tab="score"]').click();
};
document.getElementById("saveHoleBtn").onclick=()=>{
  saveCurrentHole();
  if(currentHole < 18){
    currentHole += 1;
    renderScore();
    window.scrollTo(0,0);
  }else{
    currentLimit = 18;
    document.querySelector('[data-tab="results"]').click();
    renderResults(18);
    window.scrollTo(0,0);
  }
};
document.getElementById("prevHole").onclick=()=>{saveCurrentHole(); currentHole=Math.max(1,currentHole-1); renderScore();};
document.getElementById("nextHole").onclick=()=>{saveCurrentHole(); currentHole=Math.min(18,currentHole+1); renderScore();};
document.querySelectorAll(".result-range button").forEach(b=>b.onclick=()=>renderResults(Number(b.dataset.limit)));
document.getElementById("resetBtn").onclick=()=>{
  if(confirm("入力内容をすべて初期化しますか？")){
    localStorage.removeItem("golfPointsState");
    location.reload();
  }
};

migrateDefaults();
renderSettings();
renderScore();
renderResults(9);
