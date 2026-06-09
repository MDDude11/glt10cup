import { useState, useEffect, useCallback, useMemo, useRef } from "react";

// ─── TEAMS & FIXTURES ────────────────────────────────────────────────────────
const TEAMS = {
  AIY:{code:"AIY",color:"#f87171",players:["Arsh","Ishaansh","Yug"]},
  ANA:{code:"ANA",color:"#fb923c",players:["Arnav","Naisha","Agastya"]},
  NTV:{code:"NTV",color:"#60a5fa",players:["Nishil","Tanmay","Vivaan"]},
  MAP:{code:"MAP",color:"#4ade80",players:["Manaansh","Aarya","Paranjay"]},
  YAM:{code:"YAM",color:"#c084fc",players:["Yash","Ayaansh","Manan"]},
};
const PLAYER_TEAM={};
Object.entries(TEAMS).forEach(([c,t])=>t.players.forEach(p=>(PLAYER_TEAM[p]=c)));

const FIXTURES=[
  {id:"D1",date:"2026-05-14",time:"19:00",t1:"AIY",t2:"NTV",stage:"demo"},
  {id:"D2",date:"2026-05-15",time:"14:30",t1:"ANA",t2:"YAM",stage:"demo"},

  {id:"M1",date:"2026-06-13",time:"14:30",t1:"AIY",t2:"NTV",stage:"league"},
  {id:"M2",date:"2026-06-13",time:"19:00",t1:"ANA",t2:"YAM",stage:"league"},

  {id:"M3",date:"2026-06-14",time:"14:30",t1:"MAP",t2:"NTV",stage:"league"},
  {id:"M4",date:"2026-06-14",time:"19:00",t1:"AIY",t2:"ANA",stage:"league"},

  {id:"M5",date:"2026-06-16",time:"19:00",t1:"NTV",t2:"YAM",stage:"league"},

  {id:"M6",date:"2026-06-17",time:"19:00",t1:"AIY",t2:"ANA",stage:"league"},

  {id:"M7",date:"2026-06-18",time:"19:00",t1:"MAP",t2:"YAM",stage:"league"},

  {id:"M8",date:"2026-06-20",time:"14:30",t1:"AIY",t2:"MAP",stage:"league"},
  {id:"M9",date:"2026-06-20",time:"19:00",t1:"ANA",t2:"YAM",stage:"league"},

  {id:"M10",date:"2026-06-21",time:"14:30",t1:"AIY",t2:"YAM",stage:"league"},
  {id:"M11",date:"2026-06-21",time:"19:00",t1:"ANA",t2:"MAP",stage:"league"},

  {id:"M12",date:"2026-06-23",time:"19:00",t1:"AIY",t2:"NTV",stage:"league"},

  {id:"M13",date:"2026-06-24",time:"19:00",t1:"MAP",t2:"YAM",stage:"league"},

  {id:"M14",date:"2026-06-26",time:"19:00",t1:"ANA",t2:"NTV",stage:"league"},

  {id:"M15",date:"2026-06-27",time:"14:30",t1:"AIY",t2:"MAP",stage:"league"},
  {id:"M16",date:"2026-06-27",time:"19:00",t1:"NTV",t2:"YAM",stage:"league"},

  {id:"M17",date:"2026-06-28",time:"14:30",t1:"ANA",t2:"MAP",stage:"league"},
  {id:"M18",date:"2026-06-28",time:"19:00",t1:"AIY",t2:"YAM",stage:"league"},

  {id:"M19",date:"2026-06-30",time:"19:00",t1:"ANA",t2:"NTV",stage:"league"},

  {id:"M20",date:"2026-07-01",time:"19:00",t1:"NTV",t2:"MAP",stage:"league"},

  {id:"SF",date:"2026-07-03",time:"19:00",t1:"TBD",t2:"TBD",stage:"semi"},
  {id:"GF",date:"2026-07-05",time:"18:30",t1:"TBD",t2:"TBD",stage:"final"},
];

const WICKET_TYPES=["Bowled","Caught","LBW","Run Out","Hit Wicket","Stumped"];
const ADMIN_PASS="GLT10ADMIN";

// ─── ENGINE ──────────────────────────────────────────────────────────────────
function computeInnings(dels=[]){
  let runs=0,wickets=0,legal=0;
  const bat={},bowl={};
  for(const d of dels){
    const W=!!d.wide,NB=!!d.noBall,L=!W&&!NB,r=d.runs||0;
    runs+=r+(W?1:0)+(NB?1:0);
    if(L)legal++;
    const out=!!d.wicket&&!NB;
    if(out)wickets++;
    if(!W&&d.striker){
      if(!bat[d.striker])bat[d.striker]={runs:0,balls:0,fours:0,sixes:0,out:false,dismissal:""};
      bat[d.striker].runs+=r;if(L)bat[d.striker].balls++;
      if(r===4)bat[d.striker].fours++;if(r===6)bat[d.striker].sixes++;
      if(out&&d.dismissed===d.striker){bat[d.striker].out=true;bat[d.striker].dismissal=d.dismissalText||d.wicketType||"out";}
    }
    if(d.bowler){
      if(!bowl[d.bowler])bowl[d.bowler]={runs:0,balls:0,wickets:0};
      bowl[d.bowler].runs+=r+(NB?1:0);if(L)bowl[d.bowler].balls++;
      if(out&&d.wicketType!=="Run Out")bowl[d.bowler].wickets++;
    }
  }
  const overs=Math.floor(legal/6),balls=legal%6;
  const ovH=[];let cur=[],lg=0;
  for(const d of dels){cur.push(d);if(!d.wide&&!d.noBall){lg++;if(lg>=6){ovH.push(cur);cur=[];lg=0;}}}
  if(cur.length)ovH.push(cur);
  return{runs,wickets,overs,balls,legal,batters:bat,bowlers:bowl,overHistory:ovH};
}

function matchDesc(r1,r2,r2wkts,bt1,bt2,standalone){
  if(r2>r1){
    const wicketsRemaining = 4 - r2wkts;
    return `${bt2} won by ${wicketsRemaining} ${wicketsRemaining===1?"wicket":"wickets"}`;
  }

  if(r1>r2){
    const d=r1-r2;
    return `${bt1} won by ${d} ${d===1?"run":"runs"}`;
  }

  return "Match tied";
}

function aggregateAllStats(matchStates){
  const S={};
  const g=n=>{if(!S[n])S[n]={name:n,team:PLAYER_TEAM[n]||"",bat_mat:0,bat_inn:0,bat_runs:0,bat_balls:0,bat_hs:0,bat_4s:0,bat_6s:0,bat_outs:0,bat_50s:0,bat_ducks:0,bowl_mat:0,bowl_inn:0,bowl_balls:0,bowl_runs:0,bowl_wkts:0,bowl_bbi_r:999,bowl_bbi_w:0,bowl_4w:0,field_catches:0,field_ro:0,field_st:0};return S[n];};
  const seen={};
  for(const [mid,ms] of Object.entries(matchStates)){
    if(!ms?.innings)continue;
    for(const inn of ms.innings){
      if(!inn?.deliveries?.length)continue;
      const c=computeInnings(inn.deliveries);
      for(const [n,b] of Object.entries(c.batters)){const p=g(n);if(!seen[`${mid}b${n}`]){seen[`${mid}b${n}`]=1;p.bat_mat++;}p.bat_inn++;p.bat_runs+=b.runs;p.bat_balls+=b.balls;p.bat_4s+=b.fours;p.bat_6s+=b.sixes;if(b.out)p.bat_outs++;if(b.runs>p.bat_hs)p.bat_hs=b.runs;if(b.runs>=50)p.bat_50s++;if(b.runs===0&&b.out)p.bat_ducks++;}
      for(const [n,b] of Object.entries(c.bowlers)){const p=g(n);if(!seen[`${mid}w${n}`]){seen[`${mid}w${n}`]=1;p.bowl_mat++;}p.bowl_inn++;p.bowl_balls+=b.balls;p.bowl_runs+=b.runs;p.bowl_wkts+=b.wickets;if(b.wickets>p.bowl_bbi_w||(b.wickets===p.bowl_bbi_w&&b.runs<p.bowl_bbi_r)){p.bowl_bbi_w=b.wickets;p.bowl_bbi_r=b.runs;}if(b.wickets>=4)p.bowl_4w++;}
      for(const d of inn.deliveries){if(!d.wicket||!d.fielder)continue;const p=g(d.fielder);if(d.wicketType==="Caught")p.field_catches++;else if(d.wicketType==="Run Out")p.field_ro++;else if(d.wicketType==="Stumped")p.field_st++;}
    }
  }
  return Object.values(S);
}

function computePoints(matchStates){
  const T={};
  for(const c of Object.keys(TEAMS))T[c]={team:c,p:0,w:0,l:0,pts:0,rf:0,bf:0,ra:0,ba:0};
  for(const fx of FIXTURES){
    if(!["league","demo"].includes(fx.stage))continue;
    const ms=matchStates[fx.id];
    if(!ms||ms.status!=="completed"||!ms.result)continue;
    const{winner,t1,t2,t1Runs:r1,t2Runs:r2,t1Balls:b1,t2Balls:b2}=ms.result;
    if(!T[t1]||!T[t2])continue;
    T[t1].p++;T[t2].p++;T[t1].rf+=r1||0;T[t1].bf+=b1||60;T[t1].ra+=r2||0;T[t1].ba+=b2||60;
    T[t2].rf+=r2||0;T[t2].bf+=b2||60;T[t2].ra+=r1||0;T[t2].ba+=b1||60;
    if(winner==="tie"){T[t1].pts++;T[t2].pts++;}
    else if(T[winner]){T[winner].w++;T[winner].pts+=2;const L=winner===t1?t2:t1;if(T[L])T[L].l++;}
  }
  return Object.values(T).map(t=>({...t,nrr:t.bf>0&&t.ba>0?+((t.rf/t.bf*6)-(t.ra/t.ba*6)).toFixed(3):0})).sort((a,b)=>b.pts-a.pts||b.nrr-a.nrr);
}

function buildCommentary(deliveries){
  const overs=[];let cur=[],lg=0;
  for(const d of deliveries){cur.push(d);if(!d.wide&&!d.noBall){lg++;if(lg>=6){overs.push([...cur]);cur=[];lg=0;}}}
  if(cur.length)overs.push(cur);
  return overs.map((ov,oi)=>{
    const runs=ov.reduce((s,d)=>s+(d.runs||0),0);
    const extras=ov.filter(d=>d.wide||d.noBall).length;
    const wkts=ov.filter(d=>d.wicket).length;
    const balls=ov.map((d)=>{
      const r=d.runs||0;let desc="";
      if(d.deadBall)desc="💀 Dead ball — no play";
      else if(d.wicket)desc=`❌ OUT! ${d.dismissed||"Batter"} — ${d.dismissalText||d.wicketType||"dismissed"}`;
      else if(d.noBall)desc=`⚡ NO BALL — ${r>0?`${r} run${r>1?"s":""} scored. `:""}FREE HIT next`;
      else if(d.wide)desc=`📏 Wide${r>0?` +${r}`:""} — extra awarded`;
      else if(r===6)desc=`🟣 SIX! ${d.striker||"Batter"} off ${d.bowler||"bowler"}`;
      else if(r===4)desc=`🟢 FOUR! ${d.striker||"Batter"} off ${d.bowler||"bowler"}`;
      else if(r===0)desc=`• Dot — ${d.bowler||"bowler"} to ${d.striker||"batter"}`;
      else desc=`${r} run${r>1?"s":""} — ${d.striker||"Batter"} off ${d.bowler||"bowler"}`;
      return{...d,desc};
    });
    return{over:oi+1,runs,wkts,extras,balls,summary:wkts?`${runs} runs, ${wkts}W`:`${runs} runs`};
  });
}

const todayStr=()=>{const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;};
const canEdit=fx=>fx.stage==="demo"||fx.date===todayStr();
const fmtOv=b=>`${Math.floor(b/6)}.${b%6}`;
const fmtDate=s=>{const[,m,dd]=s.split("-");return`${["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m]} ${dd}`;};
const fmt=(n,d=2)=>isFinite(n)&&!isNaN(n)?n.toFixed(d):"—";

function exportPDF(fixture,ms){
  if(!ms?.innings?.length){alert("No match data to export yet.");return;}
  const innHtml=ms.innings.map(inn=>{
    const c=getAdjustedInnings(inn);
    const matchOvers = 10 + (inn.adjust?.maxOvers || 0);
    const bR=Object.entries(c.batters).map(([n,b])=>`<tr><td><b>${n}</b>${b.out?"":" *"}</td><td style="color:#555;font-size:11px">${b.dismissal||"not out"}</td><td align="right"><b style="color:#1d4ed8">${b.runs}</b></td><td align="right">${b.balls}</td><td align="right">${b.fours}</td><td align="right">${b.sixes}</td><td align="right" style="color:#059669">${b.balls>0?((b.runs/b.balls)*100).toFixed(0):"—"}</td></tr>`).join("");
    const wR=Object.entries(c.bowlers).map(([n,b])=>`<tr><td><b>${n}</b></td><td align="right">${fmtOv(b.balls)}</td><td align="right">${b.runs}</td><td align="right"><b style="color:#7c3aed">${b.wickets}</b></td><td align="right" style="color:#059669">${b.balls>0?fmt(b.runs/(b.balls/6),1):"—"}</td></tr>`).join("");
    return`<div style="margin-bottom:22px"><h2 style="background:#f1f5f9;padding:8px 12px;border-radius:6px;font-size:15px;margin:16px 0 8px">${inn.battingTeam} — ${c.runs}/${c.wickets} (${c.overs}.${c.balls} ov)
<br>
<span style="font-size:11px;color:#64748b">
Match Limit: ${matchOvers} overs
</span></h2><table width="100%" cellpadding="5" style="font-size:12px;border-collapse:collapse;margin-bottom:10px"><thead><tr style="background:#4f46e5;color:white"><th align="left">Batter</th><th align="left">Dismissal</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr></thead><tbody>${bR}</tbody></table><h3 style="font-size:11px;color:#555;margin:10px 0 4px;text-transform:uppercase">Bowling — ${inn.bowlingTeam}</h3><table width="100%" cellpadding="5" style="font-size:12px;border-collapse:collapse"><thead><tr style="background:#7c3aed;color:white"><th align="left">Bowler</th><th>Overs</th><th>Runs</th><th>Wkts</th><th>Eco</th></tr></thead><tbody>${wR}</tbody></table></div>`;
  }).join("");
  const tossInfo = ms.toss
  ? `<div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:10px 16px;margin:12px 0;border-radius:4px">
      <b>🏏 Toss:</b> ${ms.toss.winner} won the toss and elected to ${ms.toss.decision}
    </div>`
  : "";
  const res=ms.result?`<div style="background:#ecfdf5;border-left:4px solid #10b981;padding:10px 16px;margin:12px 0;font-size:15px;font-weight:700;border-radius:4px">🏆 ${ms.result.desc}</div>`:"";
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>GLT10CUP</title><style>body{font-family:Arial,sans-serif;max-width:700px;margin:0 auto;padding:20px}table tr:nth-child(even)td{background:#f8fafc}@media print{.np{display:none}}</style></head><body>
<h1 style="color:#4f46e5">🏏 GLT10CUP Score Pro</h1>

<p style="color:#888;font-size:11px">
${fixture.t1} vs ${fixture.t2} · ${fixture.date}
</p>

${tossInfo}

${res}

${innHtml}<button class="np" onclick="window.print()" style="margin-top:12px;padding:8px 20px;background:#4f46e5;color:white;border:none;border-radius:6px;cursor:pointer">🖨 Save as PDF</button></body></html>`;
  const blob=new Blob([html],{type:"text/html;charset=utf-8"});
  const url=URL.createObjectURL(blob);const a=document.createElement("a");
  a.href=url;a.download=`GLT10CUP_${fixture.t1}_vs_${fixture.t2}.html`;
  document.body.appendChild(a);a.click();
  setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(url);},500);
}

// ─── CSS ─────────────────────────────────────────────────────────────────────
const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body{height:100%;font-family:'Inter',sans-serif;background:#07080f;color:#f0f2f8;-webkit-text-size-adjust:100%;}

/* ── Background ── */
.bg-layer{
  position:fixed;inset:0;z-index:0;pointer-events:none;
  background:
    radial-gradient(ellipse 60% 50% at 15% 8%, rgba(99,40,255,.22) 0%,transparent 60%),
    radial-gradient(ellipse 50% 45% at 85% 15%, rgba(0,160,255,.15) 0%,transparent 55%),
    radial-gradient(ellipse 55% 50% at 50% 95%, rgba(140,0,255,.12) 0%,transparent 55%),
    #07080f;
  animation:bgpulse 18s ease-in-out infinite;
  transition:filter 1s ease;
}
@keyframes bgpulse{0%,100%{transform:scale(1) translate(0,0)}50%{transform:scale(1.05) translate(1%,-1%)}}

.page{position:relative;z-index:1;min-height:100vh;}

/* ── Cards ── */
.card{
  background:rgba(255,255,255,.04);
  border:1px solid rgba(255,255,255,.08);
  border-radius:20px;
  transition:all .2s;
}
.card-dark{
  background:rgba(0,0,0,.45);
  border:1px solid rgba(255,255,255,.07);
  border-radius:20px;
  backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
}
.card-pop{
  background:rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.12);
  border-radius:16px;
}
.card-tap{cursor:pointer;transition:transform .15s,background .15s,border-color .15s;}
.card-tap:active{transform:scale(.97);}
.card-tap:hover{background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.16);}
.surface{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.07);border-radius:12px;}

/* ── Buttons ── */
.btn{cursor:pointer;font-family:'Inter',sans-serif;font-weight:700;border:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;transition:transform .1s,opacity .15s;letter-spacing:.01em;}
.btn:active{transform:scale(.92)!important;}

.btn-primary{background:linear-gradient(135deg,#5c1fff,#0095e5);color:white;border-radius:14px;padding:13px 24px;font-size:15px;}
.btn-primary:hover{opacity:.88;}
.btn-ghost{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);color:#f0f2f8;border-radius:12px;padding:9px 16px;font-size:13px;}
.btn-ghost:hover{background:rgba(255,255,255,.12);}
.btn-danger{background:linear-gradient(135deg,#7f1d1d,#dc2626);color:white;border-radius:12px;padding:9px 16px;font-size:13px;}
.btn-warn{background:linear-gradient(135deg,#78350f,#d97706);color:white;border-radius:12px;padding:9px 16px;font-size:13px;}
.btn-success{background:linear-gradient(135deg,#064e3b,#059669);color:white;border-radius:12px;padding:9px 16px;font-size:13px;}
.btn-sm{padding:7px 13px!important;font-size:12px!important;border-radius:10px!important;}
.btn-icon{width:40px;height:40px;border-radius:12px;padding:0;}

/* ── Run Buttons ── */
.run-btn{
  cursor:pointer;font-family:'JetBrains Mono',monospace;font-weight:700;border:1px solid;
  border-radius:18px;font-size:28px;height:68px;display:flex;align-items:center;justify-content:center;
  transition:transform .1s,box-shadow .15s;user-select:none;-webkit-user-select:none;
}
.run-btn:active{transform:scale(.88)!important;}
.run-btn:hover{box-shadow:0 0 20px rgba(255,255,255,.08);}

/* ── Tabs — pill style ── */
.tabs-wrap{display:flex;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:4px;gap:3px;}
.tab-pill{flex:1;text-align:center;padding:9px 4px;border-radius:11px;cursor:pointer;font-family:'Inter',sans-serif;font-weight:600;font-size:12px;color:rgba(255,255,255,.38);border:none;background:transparent;transition:all .2s;letter-spacing:.01em;}
.tab-pill.on{background:rgba(255,255,255,.1);color:#f0f2f8;box-shadow:0 1px 8px rgba(0,0,0,.25);}
.tab-pill:active{transform:scale(.94);}

/* ── Bottom nav ── */
.bottom-nav{
  position:fixed;bottom:0;left:0;right:0;z-index:100;
  background:rgba(7,8,15,.88);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
  border-top:1px solid rgba(255,255,255,.07);
  display:flex;padding:8px 4px 12px;gap:4px;
  padding-bottom:max(12px,env(safe-area-inset-bottom));
}
.nav-item{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;border:none;background:transparent;padding:6px 0;border-radius:12px;transition:all .18s;color:rgba(255,255,255,.32);}
.nav-item.on{color:#fff;}
.nav-item:active{transform:scale(.9);}
.nav-dot{width:4px;height:4px;border-radius:50%;background:linear-gradient(135deg,#6c3fff,#00a8ff);margin:0 auto;opacity:0;transition:opacity .2s;}
.nav-item.on .nav-dot{opacity:1;}
.nav-icon{font-size:22px;line-height:1;}
.nav-label{font-size:9px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;}

/* ── Typography ── */
.score-num{font-family:'JetBrains Mono',monospace;font-size:52px;font-weight:700;line-height:1;}
.mono{font-family:'JetBrains Mono',monospace;}
.label-xs{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,.35);}
.label-sm{font-size:11px;font-weight:600;color:rgba(255,255,255,.45);}

/* ── Inputs ── */
input,select{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:12px;color:#f0f2f8;font-family:'Inter',sans-serif;font-size:15px;padding:11px 14px;outline:none;width:100%;transition:border-color .2s,background .2s;}
input:focus,select:focus{border-color:rgba(92,31,255,.6);background:rgba(255,255,255,.09);}
input::placeholder{color:rgba(255,255,255,.22);}
select option{background:#0e0f1c;color:#f0f2f8;}
.field-label{font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:rgba(255,255,255,.38);display:block;margin-bottom:6px;}

/* ── Ball dot ── */
.ball{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;border:1px solid;flex-shrink:0;transition:transform .1s;}
.ball:active{transform:scale(.82);}

/* ── Chips / badges ── */
.badge{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:20px;font-size:10px;font-weight:700;border:1px solid;letter-spacing:.04em;}
.live-pulse{width:6px;height:6px;border-radius:50%;background:#ef4444;animation:livepulse 1.2s ease-in-out infinite;}
@keyframes livepulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.8)}}

/* ── Table ── */
.data-table{border-collapse:collapse;white-space:nowrap;min-width:100%;font-size:12px;}
.data-table th{padding:8px 12px;text-align:center;border-bottom:1px solid rgba(255,255,255,.07);font-size:9px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:rgba(255,255,255,.3);background:rgba(0,0,0,.3);}
.data-table th.tl{text-align:left;}
.data-table td{padding:10px 12px;text-align:center;border-bottom:1px solid rgba(255,255,255,.04);}
.data-table td.tl{text-align:left;font-weight:600;}
.data-table tbody tr:hover td{background:rgba(255,255,255,.03);}
.data-table tbody tr:last-child td{border-bottom:none;}
.tbl-wrap{width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;}

/* ── Commentary ── */
.over-block{border:1px solid rgba(255,255,255,.06);border-radius:14px;overflow:hidden;margin-bottom:8px;transition:all .18s;}
.over-hd{padding:12px 14px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;background:rgba(0,0,0,.25);transition:background .15s;}
.over-hd:hover{background:rgba(255,255,255,.04);}
.ball-row{padding:9px 14px;border-top:1px solid rgba(255,255,255,.04);display:flex;gap:10px;align-items:flex-start;animation:ballin .18s ease-out;}
@keyframes ballin{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}}

/* ── Player selector ── */
.player-sel{border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:12px 10px;cursor:pointer;text-align:center;transition:all .18s;background:rgba(255,255,255,.03);}
.player-sel:active{transform:scale(.93);}
.player-sel.striker{background:rgba(80,30,220,.3);border-color:rgba(110,60,255,.65);box-shadow:0 0 16px rgba(99,63,255,.25);}
.player-sel.nonstr{background:rgba(0,120,200,.06);border-color:rgba(0,140,220,.18);transform:scale(.92);opacity:.65;}
.player-sel.out{opacity:.3;cursor:not-allowed;}
.player-sel.blocked{opacity:.35;cursor:not-allowed;border-color:rgba(239,68,68,.25);}

/* ── Bowler selector ── */
.bowler-sel{border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:11px 8px;cursor:pointer;text-align:center;transition:all .18s;background:rgba(255,255,255,.03);}
.bowler-sel:active{transform:scale(.93);}
.bowler-sel.active{background:rgba(168,85,247,.2);border-color:rgba(168,85,247,.5);}

/* ── Score header (sticky) ── */
.score-header{
  position:sticky;top:0;z-index:50;
  background:rgba(7,8,15,.85);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  border-bottom:1px solid rgba(255,255,255,.06);
  padding:10px 16px 12px;
}

/* ── Momentum bars ── */
.mom-bar{border-radius:3px 3px 0 0;transition:height .4s ease;}

/* ── Warn tier buttons ── */
.tier-btn{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:8px;font-size:11px;font-weight:800;cursor:pointer;border:1px solid;transition:all .12s;}
.tier-btn:active{transform:scale(.82);}

/* ── Animations ── */
@keyframes popIn{0%{transform:scale(.2);opacity:0}70%{transform:scale(1.06)}100%{transform:scale(1);opacity:1}}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}
.pop{animation:popIn .3s cubic-bezier(.34,1.56,.64,1);}
.fu{animation:fadeUp .26s ease-out;}
.fi{animation:fadeIn .22s ease-out;}
.su{animation:slideUp .28s ease-out;}

/* ── Modal ── */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9000;display:flex;align-items:flex-end;justify-content:center;padding:0;animation:fadeIn .18s;}
.modal-sheet{width:100%;max-width:480px;border-radius:24px 24px 0 0;background:rgba(12,13,22,.97);border-top:1px solid rgba(255,255,255,.1);padding:6px 0 0;animation:slideUp .25s ease-out;}
.modal-handle{width:36px;height:4px;border-radius:2px;background:rgba(255,255,255,.2);margin:0 auto 16px;}
.modal-inner{padding:0 20px 24px;max-height:85vh;overflow-y:auto;}
.modal-center{align-items:center;}
.modal-sheet-center{width:calc(100% - 32px);max-width:380px;border-radius:24px;background:rgba(12,13,22,.97);border:1px solid rgba(255,255,255,.1);padding:22px;animation:popIn .28s cubic-bezier(.34,1.56,.64,1);}

/* ── Toast ── */
.toast{position:fixed;top:16px;right:16px;z-index:9999;border-radius:14px;padding:11px 16px;font-size:13px;font-weight:600;backdrop-filter:blur(16px);max-width:280px;box-shadow:0 8px 32px rgba(0,0,0,.6);animation:slideUp .22s ease-out;letter-spacing:.01em;}

/* ── Scrollbar ── */
::-webkit-scrollbar{width:2px;height:2px;}
::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:2px;}

/* ── Status colors ── */
.c-green{color:#4ade80;}.c-red{color:#f87171;}.c-amber{color:#fbbf24;}.c-blue{color:#60a5fa;}.c-purple{color:#c084fc;}.c-white{color:#f0f2f8;}.c-muted{color:rgba(255,255,255,.35);}

/* ── GLT10CUP theme enhancements ── */
html,body{
  background:#050816;
  color:#f8fafc;
  font-family:'Inter',sans-serif;
}
.bg-layer{
  background:
    radial-gradient(circle at 12% 14%, rgba(79,70,229,.28) 0, transparent 28%),
    radial-gradient(circle at 86% 18%, rgba(14,165,233,.18) 0, transparent 22%),
    radial-gradient(circle at 50% 92%, rgba(168,85,247,.16) 0, transparent 24%),
    linear-gradient(180deg, #050816 0%, #080b16 55%, #050816 100%);
  filter:saturate(1.15) contrast(1.03);
}
.card,.card-dark,.modal-sheet,.modal-sheet-center,.adj-card,.adj-hero,.surface{
  background:rgba(10,12,22,.68);
  border:1px solid rgba(255,255,255,.10);
  box-shadow:0 20px 60px rgba(0,0,0,.32);
  backdrop-filter:blur(20px);
}
.btn-primary{
  background:linear-gradient(135deg,#7c3aed 0%,#2563eb 55%,#06b6d4 100%);
  box-shadow:0 12px 30px rgba(59,130,246,.25);
}
.btn-ghost{
  background:rgba(255,255,255,.06);
  border-color:rgba(255,255,255,.12);
}
.tabs-wrap{
  background:rgba(255,255,255,.05);
  border-color:rgba(255,255,255,.08);
  box-shadow:0 10px 30px rgba(0,0,0,.18);
}
.tab-pill.on{
  background:linear-gradient(135deg,rgba(124,58,237,.32),rgba(37,99,235,.22));
  color:#fff;
}
.score-header{
  background:rgba(5,8,16,.84);
  border-bottom:1px solid rgba(255,255,255,.08);
}
.score-num,.adj-score{
  font-family:'Space Grotesk','Inter',sans-serif;
  letter-spacing:-.03em;
}
.adj-shell{display:grid;gap:12px;}
.adj-hero{
  padding:18px;
  border-radius:22px;
  background:linear-gradient(135deg,rgba(99,102,241,.22),rgba(14,165,233,.12));
}
.adj-grid{display:grid;gap:12px;}
.adj-card{padding:14px;border-radius:18px;}
.adj-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;}
.adj-value{font-size:30px;font-weight:700;color:#dbeafe;line-height:1;margin-top:6px;}
.adj-score{font-size:42px;font-weight:700;line-height:1;color:#fff;}
.adj-actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;}
.adj-note{margin-top:8px;font-size:11px;color:rgba(255,255,255,.42);}
`;

// ─── TINY UTILS ──────────────────────────────────────────────────────────────

// ─── TINY UTILS ──────────────────────────────────────────────────────────────
function Ball({del,size=30}){
  if(!del)return null;
  let bg,col,bc;
  if(del.wicket){bg="rgba(127,29,29,.9)";col="#fca5a5";bc="#dc2626";}
  else if(del.noBall){bg="rgba(120,53,15,.9)";col="#fcd34d";bc="#d97706";}
  else if(del.wide){bg="rgba(30,58,138,.9)";col="#93c5fd";bc="#2563eb";}
  else if(del.deadBall){bg="rgba(15,18,30,.9)";col="#6b7280";bc="#374151";}
  else if((del.runs||0)===6){bg="rgba(88,28,135,.9)";col="#e9d5ff";bc="#9333ea";}
  else if((del.runs||0)===4){bg="rgba(6,78,59,.9)";col="#6ee7b7";bc="#059669";}
  else if((del.runs||0)===0){bg="rgba(10,12,22,.9)";col="#374151";bc="#1f2937";}
  else{bg="rgba(15,35,70,.9)";col="#93c5fd";bc="#2563eb";}
  const lbl=del.wicket?"W":del.noBall?"NB":del.wide?"Wd":del.deadBall?"D":(del.runs||0)===0?"·":String(del.runs);
  return <div className="ball" style={{background:bg,color:col,borderColor:bc,width:size,height:size,fontSize:size<26?8:size>32?12:10}}>{lbl}</div>;
}

function TBadge({code,size="sm"}){
  const t=TEAMS[code];
  if(!t)return <span style={{color:"rgba(255,255,255,.3)",fontSize:11}}>{code||"?"}</span>;
  const cfg={lg:{fs:14,px:"6px 14px"},md:{fs:12,px:"5px 10px"},sm:{fs:10,px:"4px 8px"}}[size]||{fs:10,px:"4px 8px"};
  return <span style={{background:`${t.color}18`,border:`1px solid ${t.color}50`,borderRadius:8,color:t.color,fontWeight:700,fontSize:cfg.fs,padding:cfg.px,display:"inline-block",letterSpacing:.4,whiteSpace:"nowrap"}}>{code}</span>;
}

function Toast({msg,type}){
  const cfg={warn:{bg:"rgba(180,110,0,.95)",icon:"⚠️"},success:{bg:"rgba(5,140,80,.95)",icon:"✅"},danger:{bg:"rgba(180,20,20,.95)",icon:"❌"},info:{bg:"rgba(70,20,200,.95)",icon:"ℹ️"}}[type]||{bg:"rgba(70,20,200,.95)",icon:"ℹ️"};
  return <div className="toast" style={{background:cfg.bg,color:"white"}}>{msg}</div>;
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function AuthScreen({onLogin}){
  const [pass,setPass]=useState("");const [err,setErr]=useState("");
  const go=()=>{if(pass===ADMIN_PASS)onLogin({name:"Admin",isAdmin:true});else setErr("Wrong password");};
  return(
    <div className="page" style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:20}}>
      <style>{CSS}</style><div className="bg-layer"/>
      <div style={{position:"relative",zIndex:1,width:"100%",maxWidth:360}}>
        <div className="card-dark fu" style={{padding:32}}>
          <div style={{textAlign:"center",marginBottom:28}}>
            <div style={{width:64,height:64,borderRadius:20,background:"linear-gradient(135deg,#5c1fff,#0095e5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 16px",boxShadow:"0 8px 32px rgba(92,31,255,.4)"}}>🏏</div>
            <h1 style={{fontFamily:"JetBrains Mono",fontWeight:700,fontSize:26,color:"#f0f2f8"}}>GLT<span style={{color:"#38bdf8"}}>10</span>CUP</h1>
            <p className="label-xs" style={{marginTop:4}}>Score Pro · 2026 Season</p>
          </div>
          <div style={{marginBottom:14}}>
            <label className="field-label">Admin Password</label>
            <input type="password" placeholder="Enter password…" value={pass}
              onChange={e=>{setPass(e.target.value);setErr("");}}
              onKeyDown={e=>e.key==="Enter"&&go()} autoFocus/>
          </div>
          {err&&<p style={{color:"#f87171",fontSize:13,marginBottom:10,fontWeight:500}}>{err}</p>}
          <button className="btn btn-primary" style={{width:"100%",marginBottom:10,justifyContent:"center"}} onClick={go}>Sign In as Admin →</button>
          <div style={{height:1,background:"rgba(255,255,255,.07)",margin:"6px 0 12px"}}/>
          <button className="btn btn-ghost" style={{width:"100%",justifyContent:"center",fontSize:13}} onClick={()=>onLogin({name:"Viewer",isAdmin:false})}>
            👁 View Only — no password
          </button>
          <p style={{textAlign:"center",marginTop:12,fontSize:11,color:"rgba(255,255,255,.18)"}}>Hint: GLT10ADMIN</p>
        </div>
      </div>
    </div>
  );
}

// ─── WICKET MODAL ─────────────────────────────────────────────────────────────
function WicketModal({batTeam,bowlTeam,striker,nonStriker,bowler,isOMS,onConfirm,onCancel}){
  const [wt,setWt]=useState("Bowled");const [dis,setDis]=useState(striker||"");const [fld,setFld]=useState("");
  const bwlP=TEAMS[bowlTeam]?.players||[];const needFld=["Caught","Run Out","Stumped"].includes(wt);
  const ok=()=>{
    if(!dis){alert("Select dismissed batter");return;}if(needFld&&!fld){alert("Select fielder");return;}
    const b=bowler||"?";
    const dt=wt==="Caught"?`c ${fld} b ${b}`:wt==="Bowled"?`b ${b}`:wt==="LBW"?`lbw b ${b}`:wt==="Run Out"?`run out (${fld})`:wt==="Stumped"?`st ${fld} b ${b}`:`hit wkt b ${b}`;
    onConfirm({wicketType:wt,dismissed:dis,fielder:fld,dismissalText:dt});
  };
  return(
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-sheet" style={{maxWidth:480}} onClick={e=>e.stopPropagation()}>
        <div className="modal-handle"/>
        <div className="modal-inner">
          <p style={{fontWeight:800,fontSize:20,marginBottom:4}}>Wicket</p>
          {isOMS&&<div style={{padding:"8px 12px",borderRadius:10,background:"rgba(220,38,38,.12)",border:"1px solid rgba(220,38,38,.25)",marginBottom:12}}><p style={{fontSize:12,color:"#fca5a5",fontWeight:600}}>⚠ One-Man Standing — LBW & Hit Wicket require bowling team appeal</p></div>}
          <label className="field-label" style={{marginTop:8}}>Wicket Type</label>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,marginBottom:14}}>
            {WICKET_TYPES.map(w=><button key={w} onClick={()=>setWt(w)} className="btn"
              style={{padding:"10px 4px",fontSize:13,fontWeight:700,borderRadius:12,cursor:"pointer",
                background:wt===w?"rgba(92,31,255,.3)":"rgba(255,255,255,.05)",
                border:`1px solid ${wt===w?"rgba(92,31,255,.7)":"rgba(255,255,255,.1)"}`,
                color:wt===w?"#f0f2f8":"rgba(255,255,255,.45)"}}>
              {w}
            </button>)}
          </div>
          <label className="field-label">Who's Out?</label>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
            {[striker,nonStriker].filter(Boolean).map(p=><button key={p} onClick={()=>setDis(p)} className="btn"
              style={{padding:"12px",fontSize:14,fontWeight:700,borderRadius:12,cursor:"pointer",
                background:dis===p?"rgba(220,38,38,.25)":"rgba(255,255,255,.05)",
                border:`1px solid ${dis===p?"rgba(220,38,38,.6)":"rgba(255,255,255,.1)"}`,
                color:"#f0f2f8"}}>
              {p}
            </button>)}
          </div>
          {needFld&&<><label className="field-label">{wt==="Caught"?"Caught by":wt==="Stumped"?"Stumped by":"Run out fielder"}</label>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,marginBottom:14}}>
            {bwlP.map(p=><button key={p} onClick={()=>setFld(p)} className="btn"
              style={{padding:"10px 4px",fontSize:13,fontWeight:700,borderRadius:12,cursor:"pointer",
                background:fld===p?"rgba(5,150,85,.25)":"rgba(255,255,255,.05)",
                border:`1px solid ${fld===p?"rgba(5,150,85,.55)":"rgba(255,255,255,.1)"}`,color:"#f0f2f8"}}>
              {p}
            </button>)}
          </div></>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:4}}>
            <button className="btn btn-danger" style={{padding:"13px",fontSize:15,justifyContent:"center"}} onClick={ok}>Confirm OUT</button>
            <button className="btn btn-ghost" style={{padding:"13px",fontSize:15,justifyContent:"center"}} onClick={onCancel}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── STANDALONE PICKER ────────────────────────────────────────────────────────
function StandalonePicker({players,onSelect,onCancel}){
  const [sel,setSel]=useState("");
  return(
    <div className="modal-overlay modal-center" onClick={onCancel}>
      <div className="modal-sheet-center" onClick={e=>e.stopPropagation()}>
        <div style={{textAlign:"center",marginBottom:16}}>
          <div style={{fontSize:44,marginBottom:8}}>🛡️</div>
          <p style={{fontWeight:800,fontSize:20,color:"#f0f2f8"}}>Standalone Player</p>
          <p style={{fontSize:13,color:"rgba(255,255,255,.45)",marginTop:4}}>3 wickets down. Pick 1 player for 1 extra life.</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
          {players.map(p=><button key={p} onClick={()=>setSel(p)} className="btn"
            style={{padding:"14px 4px",borderRadius:14,cursor:"pointer",fontSize:13,fontWeight:700,
              background:sel===p?"rgba(168,85,247,.3)":"rgba(255,255,255,.05)",
              border:`1px solid ${sel===p?"rgba(168,85,247,.65)":"rgba(255,255,255,.1)"}`,
              color:sel===p?"#e9d5ff":"rgba(255,255,255,.5)"}}>
            {p}
          </button>)}
        </div>
        <button className="btn btn-primary" style={{width:"100%",padding:"13px",justifyContent:"center",opacity:sel?1:.45}} onClick={()=>sel&&onSelect(sel)}>
          {sel?`${sel} → Standalone`:"Select above"}
        </button>
        <button className="btn btn-ghost" style={{width:"100%",marginTop:8,justifyContent:"center",fontSize:13}} onClick={onCancel}>End Innings Instead</button>
      </div>
    </div>
  );
}

// ─── INNING SETUP ─────────────────────────────────────────────────────────────
function InningSetup({fixture,inningNumber,firstBatTeam,prevScore,onStart,onBack}){
  const locked=inningNumber===1?(firstBatTeam===fixture.t1?fixture.t2:fixture.t1):null;
  const [tossWinner,setTossWinner]=useState(fixture.t1);
const [tossDecision,setTossDecision]=useState("bat");

const bat =
  inningNumber === 1
    ? locked
    : (
        tossDecision === "bat"
          ? tossWinner
          : (tossWinner === fixture.t1 ? fixture.t2 : fixture.t1)
      );
  const [str,setStr]=useState("");const [ns,setNs]=useState("");const [bwl,setBwl]=useState("");
  const [bt,setBt]=useState("pace");const [err,setErr]=useState("");
  const bowlTeam =
  bat === fixture.t1
    ? fixture.t2
    : fixture.t1;
  const bP=TEAMS[bat]?.players||[];const wP=TEAMS[bowlTeam]?.players||[];
  const pick=p=>{if(!str||str===p)setStr(p);else if(!ns&&p!==str)setNs(p);else{setStr(p);setNs("");}};
  const go=()=>{
    if(!str){setErr("Select striker");return;}if(!ns){setErr("Select non-striker");return;}
    if(str===ns){setErr("Must be different players");return;}if(!bwl){setErr("Select bowler");return;}
    onStart({
  batting:bat,
  bowling:bowlTeam,

  tossWinner,
  tossDecision,

  striker:str,
  nonStriker:ns,
  bowler:bwl,
  ballType:bt
});
  };
  return(
    <div className="page">
      <style>{CSS}</style><div className="bg-layer"/>
      <div style={{position:"relative",zIndex:1,padding:"16px 16px 32px"}}>
        <button className="btn btn-ghost btn-sm" style={{marginBottom:16}} onClick={onBack}>← Back</button>
        <div className="card-dark fu" style={{padding:22,maxWidth:420,margin:"0 auto"}}>
          <p style={{fontWeight:800,fontSize:20,marginBottom:16,color:"#f0f2f8"}}>{inningNumber===0?"Toss — Who Bats First?":"2nd Innings Setup"}</p>
          {prevScore&&<div style={{padding:"10px 14px",borderRadius:12,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",marginBottom:16}}>
            <p style={{fontSize:13,color:"rgba(255,255,255,.5)"}}>1st innings: <span className="mono c-white" style={{fontWeight:700}}>{prevScore.runs}/{prevScore.wickets}</span> · Target: <span className="mono c-amber" style={{fontWeight:700}}>{prevScore.runs+1}</span></p>
          </div>}
          
          {inningNumber===0&&<div style={{marginBottom:16}}>

  <label className="field-label">Toss Winner</label>

  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
    {[fixture.t1,fixture.t2].map(tc=><button
      key={tc}
      onClick={()=>{
  setTossWinner(tc);
  setStr("");
  setNs("");
  setBwl("");
}}
      className="btn"
      style={{
        padding:"12px",
        borderRadius:14,
        cursor:"pointer",
        fontSize:15,
        fontWeight:700,
        background:tossWinner===tc
          ?`${TEAMS[tc]?.color||"#fff"}20`
          :"rgba(255,255,255,.05)",
        border:`1.5px solid ${
          tossWinner===tc
            ?(TEAMS[tc]?.color||"#fff")+"80"
            :"rgba(255,255,255,.1)"
        }`,
        color:tossWinner===tc
          ?(TEAMS[tc]?.color||"#f0f2f8")
          :"rgba(255,255,255,.5)"
      }}
    >
      <TBadge code={tc} size="md"/>
    </button>)}
  </div>

  <label className="field-label">Toss Decision</label>

  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
    {[
      ["bat","🏏 Bat First"],
      ["bowl","🎯 Bowl First"]
    ].map(([v,l])=>(
      <button
        key={v}
        onClick={()=>{
  setTossDecision(v);
  setStr("");
  setNs("");
  setBwl("");
}}
        className="btn"
        style={{
          padding:"12px",
          borderRadius:14,
          fontWeight:700,
          background:tossDecision===v
            ?"rgba(92,31,255,.22)"
            :"rgba(255,255,255,.05)",
          border:`1px solid ${
            tossDecision===v
              ?"rgba(92,31,255,.5)"
              :"rgba(255,255,255,.1)"
          }`
        }}
      >
        {l}
      </button>
    ))}
  </div>
</div>}
          {inningNumber===1&&<div style={{padding:"10px 14px",borderRadius:12,background:"rgba(92,31,255,.12)",border:"1px solid rgba(92,31,255,.25)",marginBottom:16}}>
            <p style={{fontSize:13,color:"rgba(255,255,255,.6)"}}>Batting <TBadge code={bat} size="sm"/> · Bowling <TBadge code={bowlTeam} size="sm"/></p>
          </div>}
          <div style={{marginBottom:16}}>
            <label className="field-label">Opening Batters ({bat}) — tap 1st for striker ★, 2nd for non-striker †</label>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              {bP.map(p=><button key={p} onClick={()=>pick(p)} className="btn"
                style={{padding:"12px 4px",borderRadius:12,cursor:"pointer",fontSize:14,fontWeight:600,
                  background:str===p?"rgba(92,31,255,.25)":ns===p?"rgba(0,148,255,.18)":"rgba(255,255,255,.05)",
                  border:`1px solid ${str===p?"rgba(92,31,255,.6)":ns===p?"rgba(0,148,255,.45)":"rgba(255,255,255,.1)"}`,
                  color:"#f0f2f8"}}>
                {p}{str===p?" ★":ns===p?" †":""}
              </button>)}
            </div>
          </div>
          <div style={{marginBottom:16}}>
            <label className="field-label">Opening Bowler ({bowlTeam})</label>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              {wP.map(p=><button key={p} onClick={()=>setBwl(p)} className="btn"
                style={{padding:"12px 4px",borderRadius:12,cursor:"pointer",fontSize:14,fontWeight:600,
                  background:bwl===p?"rgba(168,85,247,.25)":"rgba(255,255,255,.05)",
                  border:`1px solid ${bwl===p?"rgba(168,85,247,.6)":"rgba(255,255,255,.1)"}`,color:"#f0f2f8"}}>
                {p}
              </button>)}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:18}}>
            {[["pace","⚡ Pace","#38bdf8"],["spin","🌀 Spin","#c084fc"]].map(([t,l,c])=><button key={t} onClick={()=>setBt(t)} className="btn"
              style={{padding:"11px",borderRadius:12,cursor:"pointer",fontSize:13,fontWeight:700,
                background:bt===t?`${c}18`:"rgba(255,255,255,.05)",border:`1px solid ${bt===t?`${c}55`:"rgba(255,255,255,.1)"}`,color:bt===t?c:"rgba(255,255,255,.38)"}}>
              {l}
            </button>)}
          </div>
          {err&&<p style={{color:"#f87171",fontSize:13,marginBottom:10,fontWeight:500}}>{err}</p>}
          <button className="btn btn-primary" style={{width:"100%",padding:"14px",fontSize:16,justifyContent:"center"}} onClick={go}>
            🏏 Start {inningNumber===0?"1st":"2nd"} Innings
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SCORECARD ────────────────────────────────────────────────────────────────
function Scorecard({innings}){
  if(!innings?.length)return <p style={{textAlign:"center",padding:24,color:"rgba(255,255,255,.25)",fontSize:13}}>No innings yet</p>;
  return(
    <div className="fu">
      {innings.map((inn,i)=>{
        const c=getAdjustedInnings(inn);
        return(
          <div key={i} className="card" style={{padding:16,marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <TBadge code={inn.battingTeam} size="md"/>
              <span className="mono" style={{fontSize:15,fontWeight:700,color:"#60a5fa"}}>{c.runs}/{c.wickets} <span style={{color:"rgba(255,255,255,.3)",fontSize:12}}>({c.overs}.{c.balls})</span></span>
            </div>
            <p className="label-xs" style={{marginBottom:8}}>Batting</p>
            {Object.entries(c.batters).map(([n,b])=>(
              <div key={n} style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,.04)"}}>
                <div><p style={{fontWeight:600,fontSize:13,color:b.out?"rgba(255,255,255,.35)":"#f0f2f8"}}>{n}{!b.out&&" *"}</p>{b.dismissal&&<p style={{fontSize:10,color:"rgba(255,255,255,.3)",marginTop:1}}>{b.dismissal}</p>}</div>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <span className="mono" style={{fontSize:16,fontWeight:700,color:"#60a5fa"}}>{b.runs}</span>
                  <span style={{fontSize:11,color:"rgba(255,255,255,.28)"}}>({b.balls}b)</span>
                  <span style={{fontSize:11,color:"#4ade80"}}>SR {b.balls>0?((b.runs/b.balls)*100).toFixed(0):"—"}</span>
                </div>
              </div>
            ))}
            <p className="label-xs" style={{marginTop:12,marginBottom:8}}>Bowling — {inn.bowlingTeam}</p>
            {Object.entries(c.bowlers).map(([n,b])=>(
              <div key={n} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,.04)"}}>
                <span style={{fontWeight:600,fontSize:13,color:"#f0f2f8"}}>{n}</span>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <span className="mono" style={{fontSize:12,color:"#c084fc"}}>{fmtOv(b.balls)}</span>
                  <span className="mono" style={{fontSize:12,color:"#f0f2f8"}}>{b.runs}R</span>
                  <span className="mono" style={{fontSize:12,fontWeight:700,color:"#f87171"}}>{b.wickets}W</span>
                  <span style={{fontSize:11,color:"rgba(255,255,255,.3)"}}>Eco {b.balls>0?fmt(b.runs/(b.balls/6),1):"—"}</span>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── COMMENTARY ───────────────────────────────────────────────────────────────
function Commentary({innings,penaltyLog=[]}){
  const [open,setOpen]=useState(null);const [innSel,setInnSel]=useState(0);
  const selInn=innings[innSel];
  const comm=useMemo(()=>selInn?buildCommentary(selInn.deliveries||[]):[],[selInn]);
  const rev=[...comm].reverse();
  if(!innings?.length)return <p style={{textAlign:"center",padding:24,color:"rgba(255,255,255,.25)",fontSize:13}}>No data yet</p>;
  return(
    <div className="su">
      {innings.length>1&&<div className="tabs-wrap" style={{marginBottom:10}}>
        {innings.map((inn,i)=><button key={i} className={`tab-pill ${innSel===i?"on":""}`} onClick={()=>setInnSel(i)}>{inn.battingTeam} Inn {i+1}</button>)}
      </div>}
      {/* Momentum chart */}
      {comm.length>0&&<div style={{padding:"12px 14px",borderRadius:14,background:"rgba(0,0,0,.3)",border:"1px solid rgba(255,255,255,.06)",marginBottom:10}}>
        <p className="label-xs" style={{marginBottom:8}}>Run Rate Per Over</p>
        <div style={{display:"flex",gap:3,alignItems:"flex-end",height:44}}>
          {comm.map((ov,i)=>{
            const mx=Math.max(...comm.map(o=>o.runs),1);
            const h=Math.max(4,(ov.runs/mx)*40);
            const col=ov.wkts>0?"#f87171":ov.runs>=8?"#c084fc":ov.runs>=5?"#4ade80":"#60a5fa";
            return(<div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
              <div className="mom-bar" style={{width:"100%",height:h,background:col,opacity:.75}}/>
              <span style={{fontSize:7,color:"rgba(255,255,255,.25)",fontFamily:"JetBrains Mono"}}>{ov.over}</span>
            </div>);
          })}
          {Array.from({length:Math.max(0,10-comm.length)}).map((_,i)=>(
            <div key={`e${i}`} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
              <div style={{width:"100%",height:4,background:"rgba(255,255,255,.04)",borderRadius:"2px 2px 0 0"}}/>
              <span style={{fontSize:7,color:"rgba(255,255,255,.12)",fontFamily:"JetBrains Mono"}}>{comm.length+i+1}</span>
            </div>
          ))}
        </div>
      </div>}
      {rev.length===0&&<p style={{textAlign:"center",padding:20,color:"rgba(255,255,255,.25)",fontSize:13}}>No overs bowled yet</p>}
      {rev.map(ov=>{
        const key=`${innSel}_${ov.over}`;const isOpen=open===key;
        const isWkt=ov.wkts>0;const isBig=ov.runs>=8;
        return(
          <div key={key} className="over-block" style={{borderColor:isWkt?"rgba(220,38,38,.25)":isBig?"rgba(168,85,247,.2)":"rgba(255,255,255,.06)"}}>
            <div className="over-hd" onClick={()=>setOpen(isOpen?null:key)}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:34,height:34,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",background:isWkt?"rgba(220,38,38,.18)":isBig?"rgba(168,85,247,.15)":"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.08)"}}>
                  <span style={{fontFamily:"JetBrains Mono",fontSize:12,fontWeight:700,color:isWkt?"#fca5a5":isBig?"#c084fc":"#60a5fa"}}>{ov.over}</span>
                </div>
                <div>
                  <p style={{fontSize:14,fontWeight:700,color:"#f0f2f8"}}>Over {ov.over} <span style={{color:isWkt?"#f87171":isBig?"#c084fc":"#4ade80"}}>— {ov.summary}</span></p>
                  {ov.extras>0&&<p style={{fontSize:10,color:"rgba(255,255,255,.3)",marginTop:1}}>{ov.extras} extra{ov.extras>1?"s":""}</p>}
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{display:"flex",gap:3}}>{ov.balls.filter(b=>!b.wide&&!b.noBall).map((b,i)=><Ball key={i} del={b} size={24}/>)}</div>
                <span style={{color:"rgba(255,255,255,.25)",fontSize:16,transition:"transform .2s",transform:isOpen?"rotate(180deg)":""}}>▾</span>
              </div>
            </div>
            {isOpen&&<div className="fi">
              {ov.balls.map((d,bi)=>{
                let rowBg="transparent";
                if(d.wicket)rowBg="rgba(220,38,38,.08)";else if((d.runs||0)===6)rowBg="rgba(168,85,247,.07)";else if((d.runs||0)===4)rowBg="rgba(5,150,85,.07)";
                return(
                  <div key={bi} className="ball-row" style={{background:rowBg}}>
                    <Ball del={d} size={28}/>
                    <div style={{flex:1}}>
                      <p style={{fontSize:13,color:"#f0f2f8",lineHeight:1.4}}>{d.desc}</p>
                      {d.bowler&&<p style={{fontSize:10,color:"rgba(255,255,255,.3)",marginTop:2}}>🎳 {d.bowler}{d.striker?` → ${d.striker}`:""}</p>}
                    </div>
                    {(d.runs||0)>0&&!d.wide&&!d.noBall&&<span className="mono" style={{color:(d.runs||0)>=4?"#6ee7b7":"rgba(255,255,255,.4)",fontSize:14,fontWeight:700}}>+{d.runs}</span>}
                  </div>
                );
              })}
            </div>}
          </div>
        );
      })}
      {penaltyLog.length>0&&<div style={{marginTop:10,padding:"12px 14px",borderRadius:14,background:"rgba(0,0,0,.3)",border:"1px solid rgba(255,255,255,.06)"}}>
        <p className="label-xs" style={{marginBottom:8}}>⚠️ Events Log</p>
        {[...penaltyLog].reverse().map((log,i)=>(
          <div key={i} style={{display:"flex",gap:10,padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,.04)",alignItems:"flex-start"}}>
            <span className="badge" style={{color:log.type==="PLAYER"?"#fcd34d":log.type==="TEAM"?"#fca5a5":"#c084fc",borderColor:"rgba(255,255,255,.1)",background:"rgba(0,0,0,.3)",fontSize:8,flexShrink:0}}>
              {log.type} T{log.tier}
            </span>
            <div style={{flex:1}}>
              <p style={{fontSize:12,fontWeight:600,color:"#f0f2f8"}}>{log.team}{log.player?` · ${log.player}`:""}</p>
              <p style={{fontSize:10,color:"rgba(255,255,255,.3)"}}>{log.reason}</p>
            </div>
            <span className="mono" style={{fontSize:9,color:"rgba(255,255,255,.2)",flexShrink:0}}>Ov {log.over}</span>
          </div>
        ))}
      </div>}
    </div>
  );
}

// ─── VIEWER MATCH SCREEN ──────────────────────────────────────────────────────
function ViewerMatch({ms,fixture}){
  const [tab,setTab]=useState("live");
  const curInn = ms?.innings?.[ms.innings.length - 1];
  const inn = curInn
    ? getAdjustedInnings(curInn)
    : { runs: 0, wickets: 0, overs: 0, balls: 0, legal: 0, batters: {}, bowlers: {}, overHistory: [], limitOvers: 10, limitBalls: 60 };
  const prevInn = ms?.innings?.length >= 2
    ? getAdjustedInnings(ms.innings[0])
    : null;
  const target = prevInn ? prevInn.runs + 1 : null;
  const limitBalls = curInn ? getMatchLimitBalls(curInn) : 60;
  const live = ms.live || {};
  const crr = inn.legal > 0 ? fmt(inn.runs / (inn.legal / 6)) : "0.00";
  const rtr = target && (limitBalls - inn.legal) > 0 ? fmt((target - inn.runs) / ((limitBalls - inn.legal) / 6)) : "—";
  if(ms.status==="upcoming")return <p style={{textAlign:"center",padding:40,color:"rgba(255,255,255,.3)",fontSize:14}}>Match hasn't started yet</p>;
  return(
    <div>
      {/* Score display */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
        {ms.innings.map((inn2,i)=>{
          const c=getAdjustedInnings(inn2);const isAct=i===ms.innings.length-1&&ms.status==="live";
          return(
            <div key={i} style={{padding:"16px 14px",borderRadius:20,background:isAct?"rgba(0,0,0,.5)":"rgba(255,255,255,.03)",border:`1px solid ${isAct?"rgba(92,31,255,.4)":"rgba(255,255,255,.07)"}`,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)"}}>
              <TBadge code={inn2.battingTeam} size="sm"/>
              <p className="score-num" style={{marginTop:8,color:"#f0f2f8"}}>{c.runs}<span style={{color:"rgba(255,255,255,.25)",fontSize:22}}>/{c.wickets}</span></p>
              <p className="mono" style={{fontSize:10,color:"rgba(255,255,255,.3)",marginTop:2}}>{c.overs}.{c.balls} overs</p>
              {isAct&&target&&<p style={{fontSize:12,fontWeight:700,color:"#fbbf24",marginTop:4}}>Need {target-c.runs} off {limitBalls-inn.legal}b</p>}
            </div>
          );
        })}
        {ms.innings.length<2&&<div className="card" style={{padding:16,display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{color:"rgba(255,255,255,.2)",fontSize:12}}>2nd innings</p></div>}
      </div>
      {/* Status alerts */}
      {live.standaloneMode&&<div style={{padding:"10px 14px",borderRadius:12,background:"rgba(168,85,247,.12)",border:"1px solid rgba(168,85,247,.3)",marginBottom:10}}><p style={{fontSize:13,fontWeight:700,color:"#e9d5ff"}}>🛡 Standalone — {live.standalonePlayer} batting</p></div>}
      {!live.standaloneMode&&inn.wickets>=2&&ms.status==="live"&&<div style={{padding:"10px 14px",borderRadius:12,background:"rgba(220,38,38,.12)",border:"1px solid rgba(220,38,38,.25)",marginBottom:10}}><p style={{fontSize:13,fontWeight:700,color:"#fca5a5"}}>⚠ One-Man Standing</p></div>}
      {live.freeHit&&<div style={{padding:"8px 14px",borderRadius:12,background:"linear-gradient(135deg,rgba(217,119,6,.2),rgba(220,38,38,.15))",border:"1px solid rgba(217,119,6,.35)",marginBottom:10}}><p style={{fontSize:13,fontWeight:700,color:"#fcd34d"}}>⚡ FREE HIT!</p></div>}
      {/* Tabs */}
      <div className="tabs-wrap" style={{marginBottom:12}}>
        {[["live","📡 Live"],["comm","📝 Commentary"],["sc","📋 Scorecard"]].map(([k,l])=><button key={k} className={`tab-pill ${tab===k?"on":""}`} onClick={()=>setTab(k)}>{l}</button>)}
      </div>
      {tab==="live"&&(
        <div className="su">
          {/* Batters at crease */}
          {live.striker&&<div className="card" style={{padding:14,marginBottom:10}}>
            <p className="label-xs" style={{marginBottom:8}}>At The Crease</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[{name:live.striker,isStr:true},{name:live.nonStriker,isStr:false}].filter(p=>p.name).map(p=>{
                const b=inn.batters[p.name]||{runs:0,balls:0};
                return(
                  <div key={p.name} style={{padding:"12px",borderRadius:14,background:p.isStr?"rgba(92,31,255,.18)":"rgba(255,255,255,.04)",border:`1px solid ${p.isStr?"rgba(92,31,255,.4)":"rgba(255,255,255,.08)"}`}}>
                    <p style={{fontSize:9,fontWeight:700,color:p.isStr?"#a78bfa":"rgba(255,255,255,.35)",letterSpacing:.5,textTransform:"uppercase",marginBottom:4}}>{p.isStr?"★ Striker":"† Non-Striker"}</p>
                    <p style={{fontWeight:800,fontSize:14,color:"#f0f2f8"}}>{p.name}</p>
                    <p className="mono" style={{fontSize:18,fontWeight:700,color:"#60a5fa",marginTop:4}}>{b.runs}<span style={{fontSize:10,color:"rgba(255,255,255,.3)",fontWeight:400}}> ({b.balls}b)</span></p>
                    <p style={{fontSize:10,color:"#4ade80",marginTop:2}}>SR {b.balls>0?((b.runs/b.balls)*100).toFixed(0):"—"}</p>
                  </div>
                );
              })}
            </div>
          </div>}
          {/* Current over */}
          {curInn&&<div className="card" style={{padding:"11px 14px",marginBottom:10}}>
            <p className="label-xs" style={{marginBottom:6}}>Over {inn.overs+1} · {curInn.battingTeam}</p>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
              {(inn.overHistory[inn.overHistory.length-1]||[]).map((d,i)=><Ball key={i} del={d}/>)}
              {!(inn.overHistory[inn.overHistory.length-1]||[]).length&&<p style={{color:"rgba(255,255,255,.2)",fontSize:12}}>Awaiting first ball…</p>}
            </div>
          </div>}
          {/* Stats row */}
          {target&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
            {[["CRR",crr,"#4ade80"],["RRR",rtr,"#fbbf24"],["Balls Left",limitBalls-inn.legal,"#60a5fa"]].map(([l,v,c])=>(
              <div key={l} style={{padding:"11px 10px",borderRadius:14,background:"rgba(0,0,0,.3)",border:"1px solid rgba(255,255,255,.06)",textAlign:"center"}}>
                <p className="label-xs" style={{marginBottom:4}}>{l}</p>
                <p className="mono" style={{fontSize:17,fontWeight:700,color:c}}>{v}</p>
              </div>
            ))}
          </div>}
        </div>
      )}
      {tab==="comm"&&<Commentary innings={ms.innings} penaltyLog={ms.penaltyLog||[]}/>}
      {tab==="sc"&&<Scorecard innings={ms.innings}/>}
    </div>
  );
}
function getMatchLimitOvers(inn) {
  return 10 + (Number(inn?.adjust?.maxOvers) || 0);
}

function getMatchLimitBalls(inn) {
  return getMatchLimitOvers(inn) * 6;
}

function getAdjustedInnings(inn) {
  const raw = computeInnings(inn?.deliveries || []);
  const runsAdj = Number(inn?.adjust?.runs) || 0;

  return {
    ...raw,
    runs: Math.max(0, raw.runs + runsAdj),
    limitOvers: getMatchLimitOvers(inn),
    limitBalls: getMatchLimitBalls(inn),
  };
}

function AdjustTab({ ms, onUpdate }) {
  const idx = Math.max(0, (ms.innings?.length || 1) - 1);
  const curInn = ms.innings?.[idx];

  if (!curInn) {
    return (
      <div className="adj-shell">
        <div className="adj-card">
          <p className="adj-note">No innings available to adjust yet.</p>
        </div>
      </div>
    );
  }

  const adj = curInn.adjust || { runs: 0, maxOvers: 0 };
  const score = getAdjustedInnings(curInn);
  const limitOvers = getMatchLimitOvers(curInn);

  const saveAdj = (nextAdj) => {
    const nextInnings = (ms.innings || []).map((inn, i) =>
      i === idx
        ? {
            ...inn,
            adjust: {
              runs: Number(nextAdj.runs) || 0,
              maxOvers: Number(nextAdj.maxOvers) || 0,
            },
          }
        : inn
    );
    onUpdate({ ...ms, innings: nextInnings });
  };

  const bumpRuns = (delta) => {
    saveAdj({
      ...adj,
      runs: (Number(adj.runs) || 0) + delta,
    });
  };

  const bumpOvers = (deltaOvers) => {
    saveAdj({
      ...adj,
      maxOvers: (Number(adj.maxOvers) || 0) + deltaOvers,
    });
  };

  return (
    <div className="su">
      <div className="adj-shell">
        <div className="adj-hero">
          <p className="label-xs">Current innings</p>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "end" }}>
            <div>
              <p style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginTop: 4 }}>
                {curInn.battingTeam}
              </p>
              <p className="adj-note">Match limit: {limitOvers} overs</p>
            </div>
            <p className="adj-score">{score.runs}/{score.wickets}</p>
          </div>
          <p className="adj-note" style={{ marginTop: 6 }}>
            Adjust runs and the innings limit independently.
          </p>
        </div>

        <div className="adj-grid">
          <div className="adj-card">
            <div className="adj-head">
              <div>
                <p className="label-xs">Runs adjustment</p>
                <p className="mono adj-value">{adj.runs || 0}</p>
              </div>
              <div className="adj-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => bumpRuns(-5)}>-5</button>
                <button className="btn btn-ghost btn-sm" onClick={() => bumpRuns(-1)}>-1</button>
                <button className="btn btn-ghost btn-sm" onClick={() => bumpRuns(1)}>+1</button>
                <button className="btn btn-ghost btn-sm" onClick={() => bumpRuns(5)}>+5</button>
              </div>
            </div>
            <p className="adj-note">Use this for scoreboard corrections.</p>
          </div>

          <div className="adj-card">
            <div className="adj-head">
              <div>
                <p className="label-xs">Match overs</p>
                <p className="mono adj-value">{limitOvers}</p>
              </div>
              <div className="adj-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => bumpOvers(-1)}>-1 ov</button>
                <button className="btn btn-ghost btn-sm" onClick={() => bumpOvers(1)}>+1 ov</button>
              </div>
            </div>
            <p className="adj-note">10 is the default. +1 makes it 11 overs, -1 makes it 9 overs.</p>
          </div>

          <div className="adj-card">
            <p className="label-xs" style={{ marginBottom: 8 }}>Reset</p>
            <button
              className="btn btn-warn"
              style={{ width: "100%" }}
              onClick={() => saveAdj({ runs: 0, maxOvers: 0 })}
            >
              Clear adjustments
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN SCORING SCREEN ─────────────────────────────────────────────────────
// ─── ADMIN SCORING SCREEN ─────────────────────────────────────────────────────
function ScoringScreen({fixture,matchState,onUpdate,onBack,isAdmin}){
  const BLANK_LIVE={striker:"",nonStriker:"",bowler:"",ballType:"pace",freeHit:false,standaloneMode:false,standalonePlayer:"",lastBowler:"",needsStandalonePick:false};
  const [ms, setMs] = useState(() =>
    matchState && Array.isArray(matchState.innings)
      ? matchState
      : { status: "upcoming", innings: [], live: { ...BLANK_LIVE }, result: null, penaltyLog: [] }
  );
  const [toast,setToast]=useState(null);const [wktMod,setWktMod]=useState(false);
  const [shakeK,setShakeK]=useState(0);const [viewTab,setViewTab]=useState("live");
  const [resetAsk,setResetAsk]=useState(false);

  const notify=(msg,type="info")=>{setToast({msg,type});setTimeout(()=>setToast(null),3000);};
  const shake=()=>setShakeK(k=>k+1);
  const doSave=useCallback(nm=>{setMs(nm);onUpdate(nm);},[onUpdate]);
  const doReset=useCallback(()=>{doSave({status:"upcoming",innings:[],live:{...BLANK_LIVE},result:null,penaltyLog:[]});setResetAsk(false);},[doSave]);

  const curInn = ms?.innings?.[ms.innings.length - 1];
  const inn = curInn
    ? getAdjustedInnings(curInn)
    : { runs: 0, wickets: 0, overs: 0, balls: 0, legal: 0, batters: {}, bowlers: {}, overHistory: [], limitOvers: 10, limitBalls: 60 };
  const prevInn = ms?.innings?.length >= 2
    ? getAdjustedInnings(ms.innings[0])
    : null;
  const target = prevInn ? prevInn.runs + 1 : null;
  const limitBalls = curInn ? getMatchLimitBalls(curInn) : 60;
  const live=ms.live||{...BLANK_LIVE};
  const standaloneMode=!!live.standaloneMode;
  const oneMan=inn.wickets>=2&&!standaloneMode;
  const batTeam=curInn?.battingTeam||fixture.t1;
  const bowlTeam=curInn?.bowlingTeam||(batTeam===fixture.t1?fixture.t2:fixture.t1);
  const batPlrs=TEAMS[batTeam]?.players||[];
  const bowlPlrs=TEAMS[bowlTeam]?.players||[];
  const bowlerOvers = (name) =>
  Math.floor((inn.bowlers?.[name]?.balls || 0) / 6);

const someoneHasFour = bowlPlrs.some(
  (p) => bowlerOvers(p) >= 4
);

const canBowl = (name) => {
  const overs = bowlerOvers(name);

  const matchOvers =
    10 + (curInn?.adjust?.maxOvers || 0);

  // Extended matches
  if (matchOvers > 10) {
    return overs < 4;
  }

  // Standard 10-over rule
  if (overs >= 4) return false;

  const anotherBowlerHasFour = bowlPlrs.some(
    (p) => p !== name && bowlerOvers(p) >= 4
  );

  if (anotherBowlerHasFour && overs >= 3) {
    return false;
  }

  return true;
};

  if(ms.status==="upcoming"&&isAdmin)
    return <InningSetup fixture={fixture} inningNumber={0} firstBatTeam={null} prevScore={null}
      onStart={cfg=>{
  const i={
    battingTeam:cfg.batting,
    bowlingTeam:cfg.bowling,
    deliveries:[],
    adjust:{runs:0,maxOvers:0}
  };

  doSave({
    status:"live",

    toss:{
      winner:cfg.tossWinner,
      decision:cfg.tossDecision
    },

    innings:[i],

    live:{
      ...BLANK_LIVE,
      striker:cfg.striker,
      nonStriker:cfg.nonStriker,
      bowler:cfg.bowler,
      ballType:cfg.ballType
    },

    result:null,
    penaltyLog:[]
  });

  notify("🏏 Match started!","success");
}}
      onBack={onBack}/>;

  if(ms.status==="inning2"&&isAdmin){
    const fbT=ms.innings[0]?.battingTeam;const prev=getAdjustedInnings(ms.innings[0]);
    return <InningSetup fixture={fixture} inningNumber={1} firstBatTeam={fbT} prevScore={prev}
      onStart={cfg=>{const i={battingTeam:cfg.batting,bowlingTeam:cfg.bowling,deliveries:[],adjust:{runs:0,maxOvers:0}};doSave({...ms,status:"live",innings:[...ms.innings,i],live:{...BLANK_LIVE,striker:cfg.striker,nonStriker:cfg.nonStriker,bowler:cfg.bowler,ballType:cfg.ballType}});notify("🏏 2nd innings!","success");}}
      onBack={onBack}/>;
  }

  // Completed
  if(ms.status==="completed"&&ms.result){
    const r=ms.result;
    return(
      <div className="page">
        <style>{CSS}</style><div className="bg-layer"/>
        {toast&&<Toast {...toast}/>}
        <div style={{position:"relative",zIndex:1,padding:"16px 16px 32px"}}>
          <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
            <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back</button>
            {isAdmin&&<button className="btn btn-ghost btn-sm" onClick={()=>exportPDF(fixture,ms)}>📄 PDF</button>}
            {isAdmin&&!resetAsk&&<button className="btn btn-sm" style={{background:"rgba(220,38,38,.15)",border:"1px solid rgba(220,38,38,.3)",color:"#fca5a5",borderRadius:10,padding:"7px 13px",fontSize:12,fontWeight:700}} onClick={()=>setResetAsk(true)}>🔄 Reset</button>}
            {isAdmin&&resetAsk&&<div style={{display:"flex",gap:6,alignItems:"center"}}>
              <span style={{fontSize:12,color:"#fca5a5",fontWeight:700}}>Sure?</span>
              <button className="btn btn-sm btn-danger" onClick={doReset}>Yes</button>
              <button className="btn btn-ghost btn-sm" onClick={()=>setResetAsk(false)}>No</button>
            </div>}
          </div>
          {/* Result card */}
          <div className="card-dark pop" style={{padding:28,textAlign:"center",marginBottom:16,maxWidth:440,margin:"0 auto 16px"}}>
            <p style={{fontSize:44,marginBottom:6}}>🏆</p>
            <p style={{fontWeight:900,fontSize:24,color:"#fbbf24"}}>{r.winner==="tie"?"IT'S A TIE!":r.winner+" WINS!"}</p>
            <p style={{color:"rgba(255,255,255,.45)",fontSize:14,marginTop:4,marginBottom:18}}>{r.desc}</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {ms.innings.map((inn2,i)=>{const c=getAdjustedInnings(inn2);return(<div key={i} className="card" style={{padding:14}}><TBadge code={inn2.battingTeam}/><p className="score-num" style={{marginTop:8,fontSize:36,color:"#f0f2f8"}}>{c.runs}<span style={{color:"rgba(255,255,255,.25)",fontSize:18}}>/{c.wickets}</span></p><p className="mono" style={{fontSize:10,color:"rgba(255,255,255,.25)",marginTop:2}}>{c.overs}.{c.balls} ov</p></div>);})}
            </div>
          </div>
          <div style={{maxWidth:440,margin:"0 auto"}}><Scorecard innings={ms.innings}/></div>
        </div>
      </div>
    );
  }

    const addDelivery = (runs, opts = {}) => {

  if (!live.bowler) {
    notify("Select a bowler before scoring", "warn");
    return;
  }

  if (!isAdmin) {
    notify("Admin only", "warn");
    return;
  }

  if (!curInn || ms.status !== "live") {
    notify("Start inning first", "warn");
    return;
  }

  const {
    wide = false,
    noBall = false,
    wicket = false,
    wicketData = {},
    deadBall = false
  } = opts;


    if(deadBall){notify("🚫 Dead ball","info");return;}
    const del={striker:live.striker,nonStriker:live.nonStriker,bowler:live.bowler,runs,wide,noBall,wicket:wicket&&!live.freeHit,wicketType:wicketData.wicketType||"",dismissed:wicketData.dismissed||"",fielder:wicketData.fielder||"",dismissalText:wicketData.dismissalText||"",ballType:live.ballType,deadBall:false};
    const newDels=[...(curInn.deliveries||[]),del];
    const newInn={...curInn,deliveries:newDels};
    const newInns=[...ms.innings];
    newInns[newInns.length-1]=newInn;
    const nc=computeInnings(newDels);
    const nl={...live,freeHit:noBall};

    if(!wide){
      if((runs%2)!==0){
        const tmp=nl.striker;nl.striker=nl.nonStriker;nl.nonStriker=tmp;
      }
      if(!noBall&&nc.balls===0&&nc.legal>0){
        const tmp=nl.striker;nl.striker=nl.nonStriker;nl.nonStriker=tmp;nl.lastBowler=del.bowler;nl.bowler="";
        notify(`✅ Over ${nc.overs} done — pick new bowler`,"success");
      }
      if(del.wicket&&del.dismissed){
        if(del.dismissed===nl.striker)nl.striker="";else nl.nonStriker="";
        notify("❌ WICKET!","danger");
        shake();
      }
    }

    if(noBall)notify("⚡ No Ball — FREE HIT next!","warn");

    const need3rd=del.wicket&&!noBall&&nc.wickets>=3&&!nl.standaloneMode&&!nl.needsStandalonePick;
    const allOut=nl.standaloneMode&&nc.wickets>=4;
    const maxOversAdj = Number(curInn.adjust?.maxOvers) || 0;
    const maxBalls = (10 + maxOversAdj) * 6;
    const legalLimitReached = nc.legal >= maxBalls;
    const chased = !!target && nc.runs >= target;
    const innOver = !wide && !noBall && (legalLimitReached || allOut || chased);

    if(need3rd&&!innOver){
      nl.needsStandalonePick=true;
      doSave({...ms,innings:newInns,live:nl,status:"live"});
      return;
    }

    let newStatus="live",newResult=ms.result;
    if(innOver){
      if(newInns.length===1){
        newStatus="inning2";
        notify(`📌 1st inn: ${nc.runs}/${nc.wickets}. Setup 2nd.`,"success");
      } else {
        newStatus="completed";
        const r1=getAdjustedInnings(newInns[0]);
        const r2=getAdjustedInnings(newInn);
        const bt1=newInns[0].battingTeam,bt2=newInns[1].battingTeam;
        const winner=r2.runs>r1.runs?bt2:r1.runs>r2.runs?bt1:"tie";
        const desc=matchDesc(r1.runs,r2.runs,r2.wickets,bt1,bt2,nl.standaloneMode);
        newResult={winner,t1:bt1,t2:bt2,t1Runs:r1.runs,t2Runs:r2.runs,t1Balls:r1.legal,t2Balls:r2.legal,t1Wkts:r1.wickets,t2Wkts:r2.wickets,desc};
        notify(`🏆 ${desc}`,"success");
      }
    }
    doSave({...ms,innings:newInns,live:nl,status:newStatus,result:newResult});
  };

  const issueWarn=(type,target2,tier,reason)=>{
    const log={time:new Date().toLocaleTimeString(),type,team:type==="PLAYER"?PLAYER_TEAM[target2]||"":target2,player:type==="PLAYER"?target2:"",tier,reason,over:`${inn.overs}.${inn.balls}`};
    doSave({...ms,penaltyLog:[...(ms.penaltyLog||[]),log]});
    notify(`⚠️ ${type} Warning T${tier}`,"warn");
  };

  const endManually=()=>{
    if(ms.innings.length===1)doSave({...ms,status:"inning2"});
    else{const r1=computeInnings(ms.innings[0].deliveries||[]),r2=inn;const bt1=ms.innings[0].battingTeam,bt2=ms.innings[1].battingTeam;const winner=r2.runs>r1.runs?bt2:r1.runs>r2.runs?bt1:"tie";const desc=matchDesc(r1.runs,r2.runs,r2.wickets,bt1,bt2,live.standaloneMode);doSave({...ms,status:"completed",result:{winner,t1:bt1,t2:bt2,t1Runs:r1.runs,t2Runs:r2.runs,t1Balls:r1.legal,t2Balls:r2.legal,t1Wkts:r1.wickets,t2Wkts:r2.wickets,desc}});}
  };

  // Viewer mode
  if(!isAdmin)return(
    <div className="page">
      <style>{CSS}</style><div className="bg-layer"/>
      <div style={{position:"relative",zIndex:1,padding:"14px 16px 28px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back</button>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <TBadge code={fixture.t1} size="sm"/>
            <span style={{color:"rgba(255,255,255,.25)",fontSize:11}}>vs</span>
            <TBadge code={fixture.t2} size="sm"/>
          </div>
          {ms.status==="live"?<div className="badge" style={{color:"#f87171",borderColor:"rgba(248,113,113,.25)",background:"rgba(248,113,113,.1)",gap:5}}><span className="live-pulse"/>LIVE</div>:<span style={{width:48}}/>}
        </div>
        <ViewerMatch ms={ms} fixture={fixture}/>
      </div>
    </div>
  );

  // Admin live scoring
  const runConfig=[
    {r:0,bg:"rgba(255,255,255,.04)",col:"rgba(255,255,255,.35)",bc:"rgba(255,255,255,.1)"},
    {r:1,bg:"rgba(37,99,235,.16)",col:"#93c5fd",bc:"rgba(37,99,235,.35)"},
    {r:2,bg:"rgba(37,99,235,.2)", col:"#7dd3fc",bc:"rgba(37,99,235,.4)"},
    {r:3,bg:"rgba(37,99,235,.25)",col:"#60a5fa",bc:"rgba(37,99,235,.45)"},
    {r:4,bg:"rgba(5,120,70,.22)", col:"#6ee7b7",bc:"rgba(5,150,85,.45)"},
    {r:5,bg:"rgba(180,100,0,.2)", col:"#fcd34d",bc:"rgba(200,120,0,.4)"},
    {r:6,bg:"rgba(100,15,180,.24)",col:"#e9d5ff",bc:"rgba(120,20,200,.5)"},
  ];

  return(
    <div className="page">
      <style>{CSS}</style><div className="bg-layer"/>
      {toast&&<Toast {...toast}/>}
      {live.needsStandalonePick&&<StandalonePicker players={batPlrs} onSelect={p=>{const nl2={...live,needsStandalonePick:false,standaloneMode:true,standalonePlayer:p,striker:p,nonStriker:""};doSave({...ms,live:nl2});notify(`🛡 ${p} is standalone!`,"success");}}
        onCancel={()=>{if(ms.innings.length===1)doSave({...ms,live:{...live,needsStandalonePick:false},status:"inning2"});else{const r1=computeInnings(ms.innings[0].deliveries||[]);const r2=inn;const bt1=ms.innings[0].battingTeam,bt2=ms.innings[1].battingTeam;const w=r2.runs>r1.runs?bt2:r1.runs>r2.runs?bt1:"tie";const d=matchDesc(r1.runs,r2.runs,r2.wickets,bt1,bt2,false);doSave({...ms,live:{...live,needsStandalonePick:false},status:"completed",result:{winner:w,t1:bt1,t2:bt2,t1Runs:r1.runs,t2Runs:r2.runs,t1Balls:r1.legal,t2Balls:r2.legal,t1Wkts:r1.wickets,t2Wkts:r2.wickets,desc:d}});}}}/>}
      {wktMod&&curInn&&<WicketModal batTeam={batTeam} bowlTeam={bowlTeam} striker={live.striker} nonStriker={live.nonStriker} bowler={live.bowler} isOMS={oneMan||standaloneMode} onConfirm={wd=>{addDelivery(0,{wicket:true,wicketData:wd});setWktMod(false);}} onCancel={()=>setWktMod(false)}/>}

      {/* Sticky score header */}
      <div className="score-header" key={shakeK}>
        {ms.toss && (
  <div
    style={{
      marginBottom:10,
      padding:"8px 12px",
      borderRadius:12,
      background:"rgba(245,158,11,.08)",
      border:"1px solid rgba(245,158,11,.2)"
    }}
  >
    <p
      style={{
        fontSize:12,
        fontWeight:700,
        color:"#fbbf24"
      }}
    >
      🏏 Toss: {ms.toss?.winner || "—"} won the toss and elected to {ms.toss?.decision || "—"}
    </p>
  </div>
)}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back</button>
          <span className="badge" style={{color:"#4ade80",borderColor:"rgba(74,222,128,.25)",background:"rgba(74,222,128,.08)"}}>⚡ ADMIN</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {ms.innings.map((inn2,i)=>{
            const c=getAdjustedInnings(inn2);const isAct=i===ms.innings.length-1&&ms.status==="live";
            return(<div key={i} style={{padding:"10px 12px",borderRadius:14,background:isAct?"rgba(92,31,255,.15)":"rgba(255,255,255,.03)",border:`1px solid ${isAct?"rgba(92,31,255,.35)":"rgba(255,255,255,.06)"}`}}>
              <TBadge code={inn2.battingTeam} size="sm"/>
              <div style={{display:"flex",alignItems:"baseline",gap:4,marginTop:4}}>
                <span className="mono" style={{fontSize:28,fontWeight:700,color:"#f0f2f8"}}>{c.runs}</span>
                <span className="mono" style={{fontSize:14,color:"rgba(255,255,255,.3)"}}>/{c.wickets}</span>
              </div>
              <p className="mono" style={{fontSize:9,color:"rgba(255,255,255,.3)"}}>{c.overs}.{c.balls} ov</p>
              {isAct && <p style={{fontSize:11,fontWeight:700,color:"#fbbf24",marginTop:2}}>Live</p>}
              {isAct&&oneMan&&<p style={{fontSize:10,fontWeight:700,color:"#f87171"}}>⚠ ONE-MAN</p>}
              {isAct&&standaloneMode&&<p style={{fontSize:10,fontWeight:700,color:"#c084fc"}}>🛡 STANDALONE</p>}
              {isAct&&live.freeHit&&<span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,background:"linear-gradient(135deg,#d97706,#dc2626)",color:"white",display:"inline-block",marginTop:2}}>FREE HIT</span>}
            </div>);
          })}
          {ms.innings.length<2&&<div style={{padding:"10px 12px",borderRadius:14,background:"rgba(255,255,255,.02)",border:"1px solid rgba(255,255,255,.05)",display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{fontSize:11,color:"rgba(255,255,255,.2)"}}>2nd innings</p></div>}
        </div>
      </div>

      <div style={{position:"relative",zIndex:1,padding:"12px 16px 120px"}}>
        {/* Tab bar */}
        <div className="tabs-wrap" style={{marginBottom:14}}>
          {[
            ["live","⚡ Score"],
            ["adj","🧮 Adjust"],
            ["sc","📋 Cards"],
            ["comm","📝 Comm"],
            ["warn","⚠️ Warn"]
          ].map(([k,l])=>(
            <button key={k} className={`tab-pill ${viewTab===k?"on":""}`} onClick={()=>setViewTab(k)}>
              {l}
            </button>
          ))}
        </div>

        {viewTab==="adj" && isAdmin && (
          <AdjustTab
            ms={ms}
            onUpdate={(next)=>doSave(next)}
          />
        )}

        {viewTab==="sc" && <Scorecard innings={ms.innings}/>}

        {viewTab==="comm" && (
          <Commentary
            innings={ms.innings}
            penaltyLog={ms.penaltyLog||[]}
          />
        )}

        {/* Warnings tab */}
        {viewTab==="warn"&&ms.status==="live"&&(
          <div className="su">
            {[{type:"PLAYER",lbl:"👤 Player",desc:"T2: deduct runs · T3: suspension · T4: match ban"},
              {type:"TEAM",  lbl:"🏏 Team",  desc:"T2: over reduction · T4: −20 runs + deduction"},
              {type:"BOWLING",lbl:"⚡ Bowling",desc:"T2: no-ball+free hit · T4: batting picks bowler"},
            ].map(({type,lbl,desc})=>(
              <div key={type} className="card" style={{padding:16,marginBottom:10}}>
                <p style={{fontWeight:700,fontSize:14,color:"#f0f2f8",marginBottom:3}}>{lbl} Warnings</p>
                <p style={{fontSize:11,color:"rgba(255,255,255,.3)",marginBottom:12}}>{desc}</p>
                {type==="PLAYER"&&[batTeam,bowlTeam].map(team=>(
                  <div key={team} style={{marginBottom:12}}>
                    <p className="label-xs" style={{marginBottom:6}}>{team}</p>
                    {(TEAMS[team]?.players||[]).map(p=>(
                      <div key={p} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                        <span style={{fontSize:13,fontWeight:600,flex:1,color:"#f0f2f8"}}>{p}</span>
                        {[1,2,3,4].map(t=><button key={t} onClick={()=>issueWarn("PLAYER",p,t,`T${t} player warning`)} className="tier-btn"
                          style={{background:t===4?"rgba(220,38,38,.2)":t===3?"rgba(180,100,0,.2)":"rgba(255,255,255,.06)",borderColor:t===4?"rgba(220,38,38,.45)":t===3?"rgba(200,120,0,.35)":"rgba(255,255,255,.12)",color:t===4?"#fca5a5":t===3?"#fcd34d":"rgba(255,255,255,.45)"}}>T{t}</button>)}
                      </div>
                    ))}
                  </div>
                ))}
                {type==="TEAM"&&[batTeam,bowlTeam].map(team=>(
                  <div key={team} style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                    <TBadge code={team} size="sm"/>
                    <div style={{flex:1}}/>
                    {[1,2,3,4].map(t=><button key={t} onClick={()=>issueWarn("TEAM",team,t,`T${t} team warning`)} className="tier-btn"
                      style={{background:t===4?"rgba(220,38,38,.2)":"rgba(255,255,255,.06)",borderColor:t===4?"rgba(220,38,38,.45)":"rgba(255,255,255,.12)",color:t===4?"#fca5a5":"rgba(255,255,255,.45)"}}>T{t}</button>)}
                  </div>
                ))}
                {type==="BOWLING"&&(TEAMS[bowlTeam]?.players||[]).map(p=>(
                  <div key={p} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                    <span style={{fontSize:13,fontWeight:600,flex:1,color:"#f0f2f8"}}>{p}</span>
                    {[1,2,3,4].map(t=><button key={t} onClick={()=>{issueWarn("BOWLING",p,t,`T${t} bowling warning`);if(t===2)addDelivery(0,{noBall:true});}} className="tier-btn"
                      style={{background:t===4?"rgba(220,38,38,.2)":t===2?"rgba(180,100,0,.2)":"rgba(255,255,255,.06)",borderColor:t===4?"rgba(220,38,38,.45)":t===2?"rgba(200,120,0,.35)":"rgba(255,255,255,.12)",color:t===4?"#fca5a5":t===2?"#fcd34d":"rgba(255,255,255,.45)"}}>T{t}</button>)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Live scoring tab */}
        {viewTab==="live"&&ms.status==="live"&&curInn&&(
          <div className="su">
            {/* Current over */}
            <div className="card" style={{padding:"10px 14px",marginBottom:14}}>
              <p className="label-xs" style={{marginBottom:6}}>Over {inn.overs+1} · {batTeam}</p>
              <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
                {(inn.overHistory[inn.overHistory.length-1]||[]).map((d,i)=><Ball key={i} del={d}/>)}
                {!(inn.overHistory[inn.overHistory.length-1]||[]).length&&<p style={{color:"rgba(255,255,255,.2)",fontSize:12}}>Awaiting first ball…</p>}
              </div>
            </div>

            {/* Batters */}
            <div className="card" style={{padding:14,marginBottom:10}}>
              <p className="label-xs" style={{marginBottom:10}}>Batters — {batTeam}</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                {batPlrs.map(p=>{
                  const bd=inn.batters[p]||{runs:0,balls:0,out:false};
                  const isSt=live.striker===p,isNS=live.nonStriker===p;
                  const cls=bd.out?"out":isSt?"striker":isNS?"nonstr":"";
                  return(
                    <div key={p} className={`player-sel ${cls}`} onClick={()=>{
                      if(bd.out)return;const nl2={...live};
                      if(!nl2.striker||nl2.striker===p)nl2.striker=p;
                      else if(!nl2.nonStriker&&p!==nl2.striker)nl2.nonStriker=p;
                      else nl2.striker=p;
                      doSave({...ms,live:nl2});
                    }}>
                      <p style={{fontSize:isNS?10:11,fontWeight:700,color:isNS?"rgba(255,255,255,.55)":"#f0f2f8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p}</p>
                      <p className="mono" style={{fontSize:isNS?13:16,fontWeight:700,color:isNS?"rgba(96,165,250,.55)":"#60a5fa",marginTop:4}}>{bd.runs}<span style={{fontSize:9,color:"rgba(255,255,255,.25)",fontWeight:400}}> ({bd.balls})</span></p>
                      {isSt&&<p style={{fontSize:8,fontWeight:700,color:"#a78bfa",marginTop:2,letterSpacing:.5,textTransform:"uppercase"}}>★ Striker</p>}
                      {isNS&&<p style={{fontSize:8,fontWeight:600,color:"rgba(56,189,248,.55)",marginTop:2,letterSpacing:.4,textTransform:"uppercase"}}>† Non-Str</p>}
                      {bd.out&&<p style={{fontSize:8,fontWeight:700,color:"#f87171",marginTop:2,letterSpacing:.5,textTransform:"uppercase"}}>Out</p>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bowlers */}
            <div className="card" style={{padding:14,marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <p className="label-xs">Bowler — {bowlTeam}</p>
                {live.lastBowler&&<p style={{fontSize:10,color:"#f87171",fontWeight:600}}>{live.lastBowler} blocked this over</p>}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
                {bowlPlrs.map(p=>{
                  const bwl=inn.bowlers[p]||{runs:0,balls:0,wickets:0};
                  const blocked=live.lastBowler===p;
const quotaBlocked=!canBowl(p);
                  return(
                    <div
  key={p}
  className={`bowler-sel ${live.bowler===p?"active":""} ${(blocked||quotaBlocked)?"blocked":""}`}
  onClick={()=>{
    if(blocked){
      notify(`${p} can't bowl consecutive overs!`,"warn");
      return;
    }

    if(quotaBlocked){
      notify(`${p} has reached the bowling limit`,"warn");
      return;
    }

    doSave({...ms,live:{...live,bowler:p}});
  }}
>
                      <p
  style={{
    fontSize:11,
    fontWeight:700,
    color:(blocked||quotaBlocked)?"#f87171":"#f0f2f8",
    overflow:"hidden",
    textOverflow:"ellipsis",
    whiteSpace:"nowrap"
  }}
>
  {p}
  {blocked?" 🚫":""}
  {quotaBlocked?" ⛔":""}
</p>
                      <p className="mono" style={{fontSize:10,color:"#c084fc",marginTop:3}}>{fmtOv(bwl.balls)} {bwl.runs}R {bwl.wickets}W</p>
                    </div>
                  );
                })}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[["pace","⚡ Pace","#38bdf8"],["spin","🌀 Spin","#c084fc"]].map(([t,l,c])=>(
                  <button key={t} onClick={()=>doSave({...ms,live:{...live,ballType:t}})} className="btn"
                    style={{padding:"9px",borderRadius:10,fontSize:12,fontWeight:700,background:live.ballType===t?`${c}18`:"rgba(255,255,255,.04)",border:`1px solid ${live.ballType===t?`${c}50`:"rgba(255,255,255,.08)"}`,color:live.ballType===t?c:"rgba(255,255,255,.3)"}}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Run buttons */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:10}}>
              {runConfig.slice(0,4).map(({r,bg,col,bc})=>(
                <button key={r} className="run-btn" style={{background:bg,color:col,borderColor:bc}}
                  onClick={()=>addDelivery(r)}
                  onTouchStart={e=>e.currentTarget.style.transform="scale(.88)"}
                  onTouchEnd={e=>e.currentTarget.style.transform="scale(1)"}>
                  {r}
                </button>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:12}}>
              {runConfig.slice(4).map(({r,bg,col,bc})=>(
                <button key={r} className="run-btn" style={{background:bg,color:col,borderColor:bc}}
                  onClick={()=>addDelivery(r)}
                  onTouchStart={e=>e.currentTarget.style.transform="scale(.88)"}
                  onTouchEnd={e=>e.currentTarget.style.transform="scale(1)"}>
                  {r}
                </button>
              ))}
            </div>

            {/* Special buttons */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:8}}>
              <button className="btn btn-warn" style={{height:52,fontSize:15,justifyContent:"center",borderRadius:14}} onClick={()=>addDelivery(0,{wide:true})}>📏 Wide</button>
              <button className="btn btn-warn" style={{height:52,fontSize:15,justifyContent:"center",borderRadius:14}} onClick={()=>addDelivery(0,{noBall:true})}>⚡ No Ball</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <button className="btn btn-danger" style={{height:52,fontSize:15,justifyContent:"center",borderRadius:14}} onClick={()=>setWktMod(true)}>❌ Wicket</button>
              <button className="btn btn-ghost" style={{height:52,fontSize:15,justifyContent:"center",borderRadius:14}} onClick={()=>addDelivery(0,{deadBall:true})}>🚫 Dead Ball</button>
            </div>
            <button className="btn btn-ghost" style={{width:"100%",height:44,fontSize:13,justifyContent:"center",borderRadius:12,marginBottom:8}} onClick={endManually}>End Innings →</button>
            {fixture.stage==="demo"&&!resetAsk&&<button className="btn" style={{width:"100%",height:40,fontSize:12,justifyContent:"center",borderRadius:12,background:"rgba(220,38,38,.1)",border:"1px solid rgba(220,38,38,.25)",color:"#fca5a5",fontWeight:700}} onClick={()=>setResetAsk(true)}>🔄 Reset Demo</button>}
            {fixture.stage==="demo"&&resetAsk&&<div style={{display:"flex",gap:8,padding:"10px 14px",borderRadius:12,background:"rgba(220,38,38,.1)",border:"1px solid rgba(220,38,38,.25)",alignItems:"center"}}>
              <p style={{fontSize:13,color:"#fca5a5",fontWeight:700,flex:1}}>Reset this demo?</p>
              <button className="btn btn-danger btn-sm" onClick={doReset}>Yes</button>
              <button className="btn btn-ghost btn-sm" onClick={()=>setResetAsk(false)}>No</button>
            </div>}
          </div>
        )}
        {viewTab==="live"&&ms.status!=="live"&&<p style={{textAlign:"center",padding:24,color:"rgba(255,255,255,.25)",fontSize:13}}>Match not live yet</p>}
      </div>
    </div>
  );
}

// ─── STATS ────────────────────────────────────────────────────────────────────
function StatsScreen({matchStates}){
  const [tab,setTab]=useState("bat");
  const all=useMemo(()=>aggregateAllStats(matchStates),[matchStates]);
  const rows=useMemo(()=>{if(tab==="bat")return [...all].filter(p=>p.bat_inn>0).sort((a,b)=>b.bat_runs-a.bat_runs);if(tab==="bowl")return [...all].filter(p=>p.bowl_inn>0).sort((a,b)=>b.bowl_wkts-a.bowl_wkts);return [...all].filter(p=>p.field_catches+p.field_ro+p.field_st>0).sort((a,b)=>(b.field_catches+b.field_ro+b.field_st)-(a.field_catches+a.field_ro+a.field_st));},[all,tab]);
  const T=({v,ta="center",c,fw,m=false})=><td style={{textAlign:ta,color:c,fontWeight:fw,fontFamily:m?"JetBrains Mono":"Inter"}}>{v??""}</td>;
  return(
    <div>
      <div className="tabs-wrap" style={{marginBottom:12}}>
        {[["bat","🏏 Batting"],["bowl","⚡ Bowling"],["field","🧤 Fielding"]].map(([k,l])=><button key={k} className={`tab-pill ${tab===k?"on":""}`} onClick={()=>setTab(k)}>{l}</button>)}
      </div>
      <div className="card" style={{padding:14}}>
        <div className="tbl-wrap">
          {tab==="bat"&&<table className="data-table"><thead><tr><th className="tl">#</th><th className="tl" style={{minWidth:80}}>Player</th><th style={{minWidth:44}}>Team</th><th>Mat</th><th>Runs</th><th>Balls</th><th>HS</th><th>Avg</th><th>SR</th><th>4s</th><th>6s</th><th>50s</th><th>Ducks</th></tr></thead><tbody>
            {rows.map((p,i)=><tr key={p.name}>
              <T v={i+1} ta="left" c="rgba(255,255,255,.25)"/>
              <td className="tl" style={{fontFamily:"Inter"}}>{p.name}</td>
              <td style={{textAlign:"center"}}><TBadge code={p.team}/></td>
              <T v={p.bat_mat} m/><T v={p.bat_runs} c="#60a5fa" fw={700} m/><T v={p.bat_balls} m/>
              <T v={p.bat_hs} c="#fbbf24" m/><T v={p.bat_outs>0?fmt(p.bat_runs/p.bat_outs,1):"—"} m/><T v={p.bat_balls>0?fmt(p.bat_runs/p.bat_balls*100,1):"—"} c="#4ade80" m/>
              <T v={p.bat_4s} m/><T v={p.bat_6s} m/><T v={p.bat_50s} c="#c084fc" m/><T v={p.bat_ducks} c="#f87171" m/>
            </tr>)}
            {!rows.length&&<tr><td colSpan={13} style={{padding:24,textAlign:"center",color:"rgba(255,255,255,.2)"}}>No batting data yet</td></tr>}
          </tbody></table>}
          {tab==="bowl"&&<table className="data-table"><thead><tr><th className="tl">#</th><th className="tl" style={{minWidth:80}}>Player</th><th style={{minWidth:44}}>Team</th><th>Mat</th><th>Overs</th><th>Runs</th><th>Wkts</th><th>BBI</th><th>Avg</th><th>Eco</th><th>SR</th></tr></thead><tbody>
            {rows.map((p,i)=><tr key={p.name}>
              <T v={i+1} ta="left" c="rgba(255,255,255,.25)"/>
              <td className="tl" style={{fontFamily:"Inter"}}>{p.name}</td>
              <td style={{textAlign:"center"}}><TBadge code={p.team}/></td>
              <T v={p.bowl_mat} m/><T v={fmtOv(p.bowl_balls)} m/><T v={p.bowl_runs} m/>
              <T v={p.bowl_wkts} c="#c084fc" fw={700} m/><T v={p.bowl_bbi_w>0?`${p.bowl_bbi_w}/${p.bowl_bbi_r}`:"—"} c="#fbbf24" m/>
              <T v={p.bowl_wkts>0?fmt(p.bowl_runs/p.bowl_wkts,1):"—"} m/><T v={p.bowl_balls>0?fmt(p.bowl_runs/(p.bowl_balls/6),2):"—"} c="#4ade80" m/>
              <T v={p.bowl_wkts>0?fmt(p.bowl_balls/p.bowl_wkts,1):"—"} m/>
            </tr>)}
            {!rows.length&&<tr><td colSpan={11} style={{padding:24,textAlign:"center",color:"rgba(255,255,255,.2)"}}>No bowling data yet</td></tr>}
          </tbody></table>}
          {tab==="field"&&<table className="data-table"><thead><tr><th className="tl">#</th><th className="tl" style={{minWidth:80}}>Player</th><th style={{minWidth:44}}>Team</th><th>Catches</th><th>Run Outs</th><th>Stumpings</th><th>Total</th></tr></thead><tbody>
            {rows.map((p,i)=><tr key={p.name}>
              <T v={i+1} ta="left" c="rgba(255,255,255,.25)"/>
              <td className="tl" style={{fontFamily:"Inter"}}>{p.name}</td>
              <td style={{textAlign:"center"}}><TBadge code={p.team}/></td>
              <T v={p.field_catches} c="#4ade80" m/><T v={p.field_ro} c="#fbbf24" m/><T v={p.field_st} c="#c084fc" m/>
              <T v={p.field_catches+p.field_ro+p.field_st} c="#60a5fa" fw={700} m/>
            </tr>)}
            {!rows.length&&<tr><td colSpan={7} style={{padding:24,textAlign:"center",color:"rgba(255,255,255,.2)"}}>No fielding data yet</td></tr>}
          </tbody></table>}
        </div>
        {rows.length>0&&<p style={{fontSize:10,color:"rgba(255,255,255,.18)",marginTop:8}}>← Swipe to see all columns</p>}
      </div>
    </div>
  );
}

// ─── TEAMS SCREEN ─────────────────────────────────────────────────────────────
function TeamsScreen({matchStates,isAdmin,demerits,onDemerit}){
  const [sel,setSel]=useState(null);const [selP,setSelP]=useState(null);
  const all=useMemo(()=>aggregateAllStats(matchStates),[matchStates]);
  const sOf=n=>all.find(s=>s.name===n)||{bat_runs:0,bat_balls:0,bat_hs:0,bat_4s:0,bat_6s:0,bat_inn:0,bowl_wkts:0,bowl_balls:0,bowl_runs:0,field_catches:0,field_ro:0,field_st:0};
  return(
    <div>
      {selP&&<div className="modal-overlay modal-center" onClick={()=>setSelP(null)}>
        <div className="modal-sheet-center" onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
            <div><p style={{fontWeight:800,fontSize:20,color:"#f0f2f8"}}>{selP}</p><div style={{marginTop:6}}><TBadge code={PLAYER_TEAM[selP]} size="md"/></div></div>
            <button className="btn btn-ghost btn-sm" onClick={()=>setSelP(null)}>✕</button>
          </div>
          {(()=>{const s=sOf(selP);const ded=demerits.players[selP]||0;return(
            <>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
                {[["Runs",s.bat_runs,"#60a5fa"],["HS",s.bat_hs,"#fbbf24"],["SR",s.bat_balls>0?((s.bat_runs/s.bat_balls)*100).toFixed(1):"—","#4ade80"],["4s",s.bat_4s,null],["6s",s.bat_6s,null],["Wkts",s.bowl_wkts,"#c084fc"]].map(([l,v,c])=>(
                  <div key={l} style={{padding:"10px 8px",borderRadius:12,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)",textAlign:"center"}}>
                    <p className="label-xs" style={{marginBottom:4}}>{l}</p>
                    <p className="mono" style={{fontSize:16,fontWeight:700,color:c||"#f0f2f8"}}>{v}</p>
                  </div>
                ))}
              </div>
              <div style={{padding:"10px 14px",borderRadius:12,background:ded>0?"rgba(220,38,38,.12)":"rgba(255,255,255,.04)",border:`1px solid ${ded>0?"rgba(220,38,38,.25)":"rgba(255,255,255,.07)"}`,display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:isAdmin?10:0}}>
                <span style={{fontSize:13,fontWeight:600,color:"#f0f2f8"}}>⚠ Demerits: <span style={{color:ded>0?"#fca5a5":"#f0f2f8",fontFamily:"JetBrains Mono"}}>{ded}</span></span>
                {isAdmin&&<button className="btn btn-danger btn-sm" onClick={()=>onDemerit("player",selP)}>+1</button>}
              </div>
              {isAdmin&&<div style={{marginTop:10}}><p className="label-xs" style={{marginBottom:8}}>In-Game Warning</p><div style={{display:"flex",gap:8}}>{[1,2,3,4].map(t=><button key={t} className="tier-btn" onClick={()=>alert(`Warning T${t} → ${selP}. Log in match warn tab!`)} style={{width:38,height:34,borderRadius:10,background:t===4?"rgba(220,38,38,.2)":t===3?"rgba(180,100,0,.2)":"rgba(255,255,255,.06)",borderColor:t===4?"rgba(220,38,38,.45)":t===3?"rgba(200,120,0,.35)":"rgba(255,255,255,.12)",color:t===4?"#fca5a5":t===3?"#fcd34d":"rgba(255,255,255,.4)"}}>T{t}</button>)}</div></div>}
            </>
          );})()}
        </div>
      </div>}

      {Object.values(TEAMS).map(t=>{
        const isOpen=sel===t.code;const tDem=demerits.teams[t.code]||0;
        return(
          <div key={t.code} className="card card-tap" style={{marginBottom:10,overflow:"hidden"}} onClick={()=>setSel(isOpen?null:t.code)}>
            <div style={{padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:36,height:36,borderRadius:10,background:`${t.color}20`,border:`1px solid ${t.color}50`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:t.color}}>{t.code[0]}</div>
                <div>
                  <TBadge code={t.code} size="md"/>
                  <p style={{fontSize:11,color:"rgba(255,255,255,.35)",marginTop:2}}>{t.players.join(" · ")}</p>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                {tDem>0&&<span className="badge" style={{color:"#fca5a5",borderColor:"rgba(220,38,38,.25)",background:"rgba(220,38,38,.1)"}}>⚠ {tDem}</span>}
                <span style={{color:"rgba(255,255,255,.25)",fontSize:18,transition:"transform .2s",display:"inline-block",transform:isOpen?"rotate(180deg)":""}}>▾</span>
              </div>
            </div>
            {isOpen&&<div className="fi" style={{padding:"0 16px 16px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
                {t.players.map(p=>{const s=sOf(p);return(
                  <button key={p} onClick={e=>{e.stopPropagation();setSelP(p);}} className="btn"
                    style={{padding:"12px 6px",borderRadius:14,background:"rgba(255,255,255,.04)",border:`1px solid ${t.color}35`,textAlign:"center",cursor:"pointer",transition:"all .15s"}}>
                    <p style={{fontSize:12,fontWeight:700,color:"#f0f2f8"}}>{p}</p>
                    <p className="mono" style={{fontSize:14,color:"#60a5fa",marginTop:4,fontWeight:700}}>{s.bat_runs}R</p>
                    <p className="mono" style={{fontSize:11,color:"#c084fc"}}>{s.bowl_wkts}W</p>
                  </button>
                );})}
              </div>
              {isAdmin&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",borderRadius:12,background:tDem>0?"rgba(220,38,38,.1)":"rgba(255,255,255,.04)",border:`1px solid ${tDem>0?"rgba(220,38,38,.25)":"rgba(255,255,255,.07)"}`}} onClick={e=>e.stopPropagation()}>
                <span style={{fontSize:13,color:"#f0f2f8",fontWeight:600}}>Team Demerits: <span style={{color:tDem>0?"#fca5a5":"#f0f2f8",fontFamily:"JetBrains Mono",fontWeight:700}}>{tDem}</span></span>
                <button className="btn btn-danger btn-sm" onClick={e=>{e.stopPropagation();onDemerit("team",t.code);}}>+1</button>
              </div>}
            </div>}
          </div>
        );
      })}
    </div>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function HomeScreen({matchStates,user,onSelectMatch,onLogout,demerits,onDemerit,reschedules,onReschedule}){
  const [tab,setTab]=useState("fixtures");
  const [reschedFx,setReschedFx]=useState(null);
  const [newDate,setNewDate]=useState("");const [newTime,setNewTime]=useState("");
  const today=todayStr();
  const pts=useMemo(()=>computePoints(matchStates),[matchStates]);
  const getDate=fx=>reschedules[fx.id]?.date||fx.date;
  const getTime=fx=>reschedules[fx.id]?.time||fx.time;
  const getBounds=fx=>{
    const pad=n=>String(n).padStart(2,"0");const f=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    const o=new Date(fx.date);const mn=new Date(o);mn.setDate(mn.getDate()-7);const mx=new Date(o);mx.setDate(mx.getDate()+7);
    return{min:f(mn),max:f(mx)};
  };
  const openR=fx=>{setReschedFx(fx);setNewDate(getDate(fx));setNewTime(getTime(fx));};
  const saveR=()=>{if(!newDate||!newTime)return;onReschedule(reschedFx.id,{date:newDate,time:newTime});setReschedFx(null);};

  const gS=fx=>{
    const ms=matchStates[fx.id];
    if(ms?.status==="completed")return "completed";if(ms?.status==="live"||ms?.status==="inning2")return "live";
    if(fx.stage==="demo")return "demo";const d=getDate(fx);if(d===today)return "today";if(d<today)return "past";return "upcoming";
  };

  const statusCfg={
    completed:{label:"Done",color:"#4ade80",bg:"rgba(74,222,128,.1)"},
    live:{label:"● Live",color:"#f87171",bg:"rgba(248,113,113,.1)"},
    demo:{label:"Demo",color:"#c084fc",bg:"rgba(192,132,252,.1)"},
    today:{label:"Today",color:"#fbbf24",bg:"rgba(251,191,36,.1)"},
    past:{label:"Missed",color:"rgba(255,255,255,.3)",bg:"rgba(255,255,255,.04)"},
    upcoming:{label:"Upcoming",color:"rgba(255,255,255,.22)",bg:"rgba(255,255,255,.03)"},
  };

  const secs=[{lbl:"Demo Matches",fxs:FIXTURES.filter(f=>f.stage==="demo")},{lbl:"League Phase",fxs:FIXTURES.filter(f=>f.stage==="league")},{lbl:"Knockouts",fxs:FIXTURES.filter(f=>["semi","final"].includes(f.stage))}];

  const TAB_ITEMS=[
    {k:"fixtures",icon:"🏏",label:"Matches"},
    {k:"points",icon:"🏆",label:"Table"},
    {k:"stats",icon:"📊",label:"Stats"},
    {k:"teams",icon:"👥",label:"Teams"},
  ];

  return(
    <div>
      {/* Reschedule modal */}
      {reschedFx&&<div className="modal-overlay" onClick={()=>setReschedFx(null)}>
        <div className="modal-sheet" style={{maxWidth:480}} onClick={e=>e.stopPropagation()}>
          <div className="modal-handle"/>
          <div className="modal-inner">
            <p style={{fontWeight:800,fontSize:18,color:"#f0f2f8",marginBottom:8}}>📅 Reschedule</p>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
              <TBadge code={reschedFx.t1} size="md"/>
              <span style={{color:"rgba(255,255,255,.3)"}}>vs</span>
              <TBadge code={reschedFx.t2} size="md"/>
              <span style={{fontSize:11,color:"rgba(255,255,255,.28)",marginLeft:4}}>±7 days max</span>
            </div>
            <label className="field-label">New Date</label>
            <input type="date" value={newDate} min={getBounds(reschedFx).min} max={getBounds(reschedFx).max} onChange={e=>setNewDate(e.target.value)} style={{marginBottom:12,colorScheme:"dark"}}/>
            <label className="field-label">New Time</label>
            <input type="time" value={newTime} onChange={e=>setNewTime(e.target.value)} style={{marginBottom:18,colorScheme:"dark"}}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <button className="btn btn-primary" style={{padding:"13px",justifyContent:"center"}} onClick={saveR}>✅ Save</button>
              <button className="btn btn-ghost" style={{padding:"13px",justifyContent:"center"}} onClick={()=>setReschedFx(null)}>Cancel</button>
            </div>
            {reschedules[reschedFx.id]&&<button className="btn btn-ghost" style={{width:"100%",marginTop:8,justifyContent:"center",fontSize:12}} onClick={()=>{onReschedule(reschedFx.id,null);setReschedFx(null);}}>↩ Restore original</button>}
          </div>
        </div>
      </div>}

      {/* Header */}
      <div style={{padding:"20px 16px 12px",position:"sticky",top:0,zIndex:50,background:"rgba(7,8,15,.9)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderBottom:"1px solid rgba(255,255,255,.06)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <h1 style={{fontFamily:"JetBrains Mono",fontWeight:700,fontSize:22,color:"#f0f2f8",letterSpacing:-.5}}>GLT<span style={{color:"#38bdf8"}}>10</span>CUP</h1>
            <p style={{fontSize:10,color:"rgba(255,255,255,.25)",letterSpacing:1,textTransform:"uppercase",marginTop:1}}>2026 Season</p>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <span className="badge" style={{color:user.isAdmin?"#4ade80":"rgba(255,255,255,.35)",borderColor:user.isAdmin?"rgba(74,222,128,.25)":"rgba(255,255,255,.1)",background:user.isAdmin?"rgba(74,222,128,.08)":"transparent"}}>
              {user.isAdmin?"⚡ Admin":"👁 Viewer"}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={onLogout}>Sign Out</button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{padding:"16px 16px 90px"}}>
        {tab==="fixtures"&&secs.map(s=>(
          <div key={s.lbl} style={{marginBottom:22}}>
            <p style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.28)",letterSpacing:.07*12,textTransform:"uppercase",marginBottom:10}}>{s.lbl}</p>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {s.fxs.map(fx=>{
                const st=gS(fx),ms=matchStates[fx.id],cfg=statusCfg[st]||statusCfg.upcoming,r=ms?.result;
                const clickable=["demo","today","live","completed"].includes(st)||!!ms;
                const reschedulable=user?.isAdmin&&["upcoming","past"].includes(st)&&fx.stage!=="demo"&&fx.t1!=="TBD";
                const isR=!!reschedules[fx.id];
                const t1c=TEAMS[fx.t1]?.color||"#fff";const t2c=TEAMS[fx.t2]?.color||"#fff";
                return(
                  <div key={fx.id} className={`card card-tap`}
                    style={{padding:"14px 16px",opacity:st==="upcoming"&&!reschedulable?.45:1,cursor:(clickable||reschedulable)?"pointer":"default",position:"relative",overflow:"hidden"}}
                    onClick={()=>{if(clickable)onSelectMatch(fx);else if(reschedulable)openR(fx);}}>
                    {/* Team color accent bar */}
                    {(st==="today"||st==="live")&&<div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:`linear-gradient(to bottom,${t1c},${t2c})`}}/>}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginLeft:(st==="today"||st==="live")?8:0}}>
                      <div>
                        <p style={{fontSize:11,color:isR?"#fbbf24":"rgba(255,255,255,.28)",marginBottom:6,fontWeight:isR?700:400}}>
                          {fmtDate(getDate(fx))} · {getTime(fx)}{isR?" ✎":""}
                        </p>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <TBadge code={fx.t1} size="md"/>
                          <span style={{color:"rgba(255,255,255,.2)",fontSize:12,fontWeight:700}}>vs</span>
                          <TBadge code={fx.t2} size="md"/>
                        </div>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5}}>
                        <span className="badge" style={{color:cfg.color,borderColor:cfg.color+"38",background:cfg.bg,fontSize:9}}>{cfg.label}</span>
                        {isR&&<span className="badge" style={{color:"#fbbf24",borderColor:"rgba(251,191,36,.25)",background:"rgba(251,191,36,.08)",fontSize:8}}>Rescheduled</span>}
                      </div>
                    </div>
                    {r&&<p style={{fontSize:12,color:"rgba(255,255,255,.4)",marginTop:8,fontWeight:500,marginLeft:(st==="today"||st==="live")?8:0}}>{r.desc}</p>}
                    {reschedulable&&<p style={{fontSize:10,color:"rgba(255,255,255,.2)",marginTop:6}}>📅 Tap to reschedule (±7 days)</p>}
                    {st==="today"&&!ms&&user?.isAdmin&&<p style={{fontSize:11,color:"#fbbf24",marginTop:6,fontWeight:700}}>👆 Tap to start scoring</p>}
                    {st==="demo"&&!r&&user?.isAdmin&&<p style={{fontSize:11,color:"#c084fc",marginTop:6,fontWeight:700}}>👆 Tap to start demo</p>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {tab==="points"&&(
          <div>
            <p style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.28)",letterSpacing:.08*12,textTransform:"uppercase",marginBottom:12}}>Points Table</p>
            <div className="card" style={{padding:14}}>
              <div className="tbl-wrap">
                <table className="data-table" style={{minWidth:"100%"}}>
                  <thead><tr><th className="tl" style={{width:24}}>#</th><th className="tl">Team</th><th>P</th><th>W</th><th>L</th><th>NRR</th><th style={{color:"#fbbf24"}}>PTS</th></tr></thead>
                  <tbody>
                    {pts.map((row,i)=>(
                      <tr key={row.team} style={{borderLeft:i<2?`2px solid ${TEAMS[row.team]?.color||"white"}`:"2px solid transparent"}}>
                        <td className="tl" style={{color:"rgba(255,255,255,.25)"}}>{i+1}</td>
                        <td className="tl"><TBadge code={row.team} size="md"/></td>
                        <td style={{textAlign:"center",fontFamily:"JetBrains Mono"}}>{row.p}</td>
                        <td style={{textAlign:"center",color:"#4ade80",fontFamily:"JetBrains Mono"}}>{row.w}</td>
                        <td style={{textAlign:"center",color:"#f87171",fontFamily:"JetBrains Mono"}}>{row.l}</td>
                        <td style={{textAlign:"center",color:row.nrr>=0?"#4ade80":"#f87171",fontFamily:"JetBrains Mono"}}>{row.nrr>=0?"+":""}{row.nrr}</td>
                        <td style={{textAlign:"center",color:"#fbbf24",fontFamily:"JetBrains Mono",fontWeight:700,fontSize:15}}>{row.pts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{fontSize:10,color:"rgba(255,255,255,.18)",marginTop:10}}>Left color border = top-2 qualifying zone</p>
            </div>
          </div>
        )}

        {tab==="stats"&&<StatsScreen matchStates={matchStates}/>}
        {tab==="teams"&&<TeamsScreen matchStates={matchStates} isAdmin={user.isAdmin} demerits={demerits} onDemerit={onDemerit}/>}
      </div>

      {/* Bottom navigation */}
      <nav className="bottom-nav">
        {TAB_ITEMS.map(({k,icon,label})=>(
          <button key={k} className={`nav-item ${tab===k?"on":""}`} onClick={()=>setTab(k)}>
            <span className="nav-icon">{icon}</span>
            <span className="nav-label">{label}</span>
            <div className="nav-dot"/>
          </button>
        ))}
      </nav>
    </div>
  );
}
const SYNC_KEY = "glt10_live_v7";

async function syncWrite(data){
  try{
    localStorage.setItem(SYNC_KEY, JSON.stringify(data));
  }catch(e){
    console.error("Sync write failed:", e);
  }
}

async function syncRead(){
  try{
    const r = localStorage.getItem(SYNC_KEY);
    return r ? JSON.parse(r) : null;
  }catch{
    return null;
  }
}

// ─── SUPER OVER ───────────────────────────────────────────────────────────────
function SuperOver({fixture,so,onUpdate,onClose,isAdmin}){
  const [toast,setToast]=useState(null);
  const [wktMod,setWktMod]=useState(false);
  const notify=(msg,type="info")=>{setToast({msg,type});setTimeout(()=>setToast(null),3000);};

  const soInn=so.innings[so.innings.length-1];
  const soC=soInn?computeInnings(soInn.deliveries||[]):{runs:0,wickets:0,overs:0,balls:0,legal:0};
  const live=so.live||{striker:"",nonStriker:"",bowler:"",freeHit:false};
  const target=so.innings.length===2?computeInnings(so.innings[0].deliveries||[]).runs+1:null;
  const batTeam=soInn?.battingTeam||"";
  const bowlTeam=soInn?.bowlingTeam||"";
  const batPlrs=TEAMS[batTeam]?.players||[];
  const bowlPlrs=TEAMS[bowlTeam]?.players||[];




  // Setup for each innings
  const [setupBat,setSetupBat]=useState({str:"",ns:"",bwl:""});

  if(so.status==="setup1"||so.status==="setup2"){
    const innNum=so.status==="setup1"?1:2;
    // Team that batted 2nd in main match bats first in SO
    const defaultBat=so.status==="setup1"?fixture.soFirstBat:fixture.soSecondBat;
    const bat=defaultBat||fixture.t1;
    const bowl=bat===fixture.t1?fixture.t2:fixture.t1;
    const bP=TEAMS[bat]?.players||[];const wP=TEAMS[bowl]?.players||[];
    const pick=p=>{setSetupBat(s=>!s.str||s.str===p?{...s,str:p}:!s.ns&&p!==s.str?{...s,ns:p}:{...s,str:p,ns:""});};
    return(
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-sheet" style={{maxWidth:480}} onClick={e=>e.stopPropagation()}>
          <div className="modal-handle"/>
          <div className="modal-inner">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <p style={{fontWeight:800,fontSize:20,color:"#f0f2f8"}}>⚡ Super Over — Inn {innNum}</p>
              {so.innings.length===1&&<div style={{padding:"6px 12px",borderRadius:12,background:"rgba(251,191,36,.12)",border:"1px solid rgba(251,191,36,.25)"}}><p style={{fontSize:11,color:"#fbbf24",fontWeight:700}}>Target: {computeInnings(so.innings[0].deliveries||[]).runs+1}</p></div>}
            </div>
            <p style={{fontSize:13,color:"rgba(255,255,255,.4)",marginBottom:16}}>1 over · max 2 wickets · pick 2 batters + 1 bowler</p>
            <div style={{padding:"8px 12px",borderRadius:10,background:"rgba(92,31,255,.12)",border:"1px solid rgba(92,31,255,.25)",marginBottom:14}}>
              <p style={{fontSize:12,color:"rgba(255,255,255,.6)"}}>Batting: <TBadge code={bat} size="sm"/> · Bowling: <TBadge code={bowl} size="sm"/></p>
            </div>
            <label className="field-label">Batters ({bat}) — tap striker ★ then non-striker †</label>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
              {bP.map(p=><button key={p} onClick={()=>pick(p)} className="btn"
                style={{padding:"12px 4px",borderRadius:12,cursor:"pointer",fontSize:14,fontWeight:600,background:setupBat.str===p?"rgba(92,31,255,.25)":setupBat.ns===p?"rgba(0,148,255,.18)":"rgba(255,255,255,.05)",border:`1px solid ${setupBat.str===p?"rgba(92,31,255,.6)":setupBat.ns===p?"rgba(0,148,255,.45)":"rgba(255,255,255,.1)"}`,color:"#f0f2f8"}}>
                {p}{setupBat.str===p?" ★":setupBat.ns===p?" †":""}
              </button>)}
            </div>
            <label className="field-label">Bowler ({bowl})</label>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:18}}>
              {wP.map(p=><button key={p} onClick={()=>setSetupBat(s=>({...s,bwl:p}))} className="btn"
                style={{padding:"12px 4px",borderRadius:12,cursor:"pointer",fontSize:14,fontWeight:600,background:setupBat.bwl===p?"rgba(168,85,247,.25)":"rgba(255,255,255,.05)",border:`1px solid ${setupBat.bwl===p?"rgba(168,85,247,.6)":"rgba(255,255,255,.1)"}`,color:"#f0f2f8"}}>
                {p}
              </button>)}
            </div>
            <button className="btn btn-primary" style={{width:"100%",padding:"13px",justifyContent:"center",fontSize:15,opacity:(setupBat.str&&setupBat.ns&&setupBat.bwl)?1:.45}}
              onClick={()=>{
                if(!setupBat.str||!setupBat.ns||!setupBat.bwl){notify("Select all players","warn");return;}
                const newInn={battingTeam:bat,bowlingTeam:bowl,deliveries:[]};
                const newSo={...so,innings:[...so.innings,newInn],status:so.status==="setup1"?"live1":"live2",live:{striker:setupBat.str,nonStriker:setupBat.ns,bowler:setupBat.bwl,freeHit:false}};
                setSetupBat({str:"",ns:"",bwl:""});
                onUpdate(newSo);
              }}>
              🏏 Start Super Over Innings {innNum}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if(so.status==="completed"&&so.result){
    const r=so.result;
    return(
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-sheet-center" style={{maxWidth:380}} onClick={e=>e.stopPropagation()}>
          <div style={{textAlign:"center",marginBottom:16}}>
            <p style={{fontSize:48}}>⚡</p>
            <p style={{fontWeight:900,fontSize:22,color:"#fbbf24",marginTop:6}}>{r.winner==="tie"?"SUPER OVER TIED!":r.winner+" WINS!"}</p>
            <p style={{color:"rgba(255,255,255,.4)",fontSize:13,marginTop:4}}>{r.desc}</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            {so.innings.map((inn2,i)=>{const c=getAdjustedInnings(inn2);return(<div key={i} className="card" style={{padding:12,textAlign:"center"}}><TBadge code={inn2.battingTeam}/><p className="mono" style={{fontSize:24,fontWeight:700,color:"#f0f2f8",marginTop:6}}>{c.runs}/{c.wickets}</p><p className="mono" style={{fontSize:9,color:"rgba(255,255,255,.3)"}}>SO Inn {i+1}</p></div>);})}
          </div>
          {r.winner==="tie"&&isAdmin&&(
            <button className="btn btn-primary" style={{width:"100%",padding:"12px",justifyContent:"center",marginBottom:8}}
              onClick={()=>onUpdate({...SO_BLANK,innings:[],soNum:(so.soNum||1)+1})}>
              ⚡ Another Super Over!
            </button>
          )}
          <button className="btn btn-ghost" style={{width:"100%",padding:"12px",justifyContent:"center"}} onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  // Live super over scoring
  if((so.status==="live1"||so.status==="live2")&&soInn){
    const addSOBall=(runs,opts={})=>{
      if(!isAdmin) return;
      const{wide=false,noBall=false,wicket=false,wicketData={}}=opts;
      const del={striker:live.striker,nonStriker:live.nonStriker,bowler:live.bowler,runs,wide,noBall,wicket:wicket&&!live.freeHit,wicketType:wicketData.wicketType||"",dismissed:wicketData.dismissed||"",fielder:wicketData.fielder||"",dismissalText:wicketData.dismissalText||"",ballType:"pace",deadBall:false};
      const newDels=[...(soInn.deliveries||[]),del];
      const newInn={...soInn,deliveries:newDels};
      const newInns=[...so.innings];newInns[newInns.length-1]=newInn;
      const nc=computeInnings(newDels);
      const nl={...live,freeHit:noBall};
      if(!wide){
        if((runs%2)!==0){const tmp=nl.striker;nl.striker=nl.nonStriker;nl.nonStriker=tmp;}
        if(del.wicket&&del.dismissed){if(del.dismissed===nl.striker)nl.striker="";else nl.nonStriker="";}
      }
      if(noBall)notify("⚡ No Ball — FREE HIT!","warn");
      if(del.wicket)notify("❌ WICKET!","danger");
      // End super over innings: 6 legal balls OR 2 wickets OR target chased
      const chased=target&&nc.runs>=target;
      const innOver=!wide&&!noBall&&(nc.legal>=6||nc.wickets>=2||chased);
      let newSo={...so,innings:newInns,live:nl};
      if(innOver){
        if(so.status==="live1"){
          // End of first SO innings
          newSo={...newSo,status:"setup2"};
          notify(`📌 SO Inn 1: ${nc.runs}/${nc.wickets}. Setup 2nd SO inn.`,"success");
        } else {
          // End of match — determine winner
          const r1=computeInnings(newInns[0].deliveries),r2=nc;
          const bt1=newInns[0].battingTeam,bt2=newInns[1].battingTeam;
          const winner=r2.runs>r1.runs?bt2:r1.runs>r2.runs?bt1:"tie";
          const soNum=so.soNum||1;
          const desc=winner==="tie"?`Super Over ${soNum} tied!`:winner===bt1?`${bt1} won Super Over by ${r1.runs-r2.runs} runs`:`${bt2} won Super Over by ${2-r2.wickets} wickets`;
          newSo={...newSo,status:"completed",result:{winner,t1:bt1,t2:bt2,t1Runs:r1.runs,t2Runs:r2.runs,desc}};
          notify(`⚡ ${desc}`,"success");
        }
      }
      onUpdate(newSo);
    };

    const runCfg=[
      {r:0,bg:"rgba(255,255,255,.04)",col:"rgba(255,255,255,.35)",bc:"rgba(255,255,255,.1)"},
      {r:1,bg:"rgba(37,99,235,.16)", col:"#93c5fd",bc:"rgba(37,99,235,.35)"},
      {r:2,bg:"rgba(37,99,235,.2)",  col:"#7dd3fc",bc:"rgba(37,99,235,.4)"},
      {r:3,bg:"rgba(37,99,235,.25)", col:"#60a5fa",bc:"rgba(37,99,235,.45)"},
      {r:4,bg:"rgba(5,120,70,.22)",  col:"#6ee7b7",bc:"rgba(5,150,85,.45)"},
      {r:5,bg:"rgba(180,100,0,.2)",  col:"#fcd34d",bc:"rgba(200,120,0,.4)"},
      {r:6,bg:"rgba(100,15,180,.24)",col:"#e9d5ff",bc:"rgba(120,20,200,.5)"},
    ];

    return(
      <div className="modal-overlay" onClick={isAdmin?undefined:onClose}>
        <div className="modal-sheet" style={{maxWidth:480}} onClick={e=>e.stopPropagation()}>
          <div className="modal-handle"/>
          <div className="modal-inner">
            {toast&&<Toast {...toast}/>}
            {wktMod&&<WicketModal batTeam={batTeam} bowlTeam={bowlTeam} striker={live.striker} nonStriker={live.nonStriker} bowler={live.bowler} isOMS={false} onConfirm={wd=>{addSOBall(0,{wicket:true,wicketData:wd});setWktMod(false);}} onCancel={()=>setWktMod(false)}/>}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div>
                <p style={{fontWeight:800,fontSize:18,color:"#fbbf24"}}>⚡ Super Over</p>
                <p style={{fontSize:11,color:"rgba(255,255,255,.4)"}}>Inn {so.status==="live1"?1:2} · <TBadge code={batTeam} size="sm"/> batting</p>
              </div>
              <div style={{textAlign:"right"}}>
                <p className="mono" style={{fontSize:26,fontWeight:700,color:"#f0f2f8"}}>{soC.runs}<span style={{color:"rgba(255,255,255,.3)",fontSize:14}}>/{soC.wickets}</span></p>
                <p className="mono" style={{fontSize:10,color:"rgba(255,255,255,.3)"}}>{soC.overs}.{soC.balls} ov</p>
                {target&&<p style={{fontSize:11,fontWeight:700,color:"#fbbf24"}}>Need {target-soC.runs} off {6-soC.legal}b</p>}
              </div>
            </div>
            {/* Current over dots */}
            <div className="card" style={{padding:"9px 12px",marginBottom:12}}>
              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                {(soC.overHistory[0]||[]).map((d,i)=><Ball key={i} del={d}/>)}
                {!(soC.overHistory[0]||[]).length&&<p style={{color:"rgba(255,255,255,.2)",fontSize:12}}>Awaiting first ball…</p>}
              </div>
            </div>
            {isAdmin&&(
              <>
                {/* Batter cards */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                  {[live.striker,live.nonStriker].filter(Boolean).map((p,idx)=>{
                    const bd=soC.batters[p]||{runs:0,balls:0};const isStr=idx===0;
                    return(<div key={p} className={`player-sel ${isStr?"striker":"nonstr"}`} onClick={()=>{const nl2={...live};nl2.striker=isStr?live.striker:live.nonStriker;nl2.nonStriker=isStr?live.nonStriker:live.striker;onUpdate({...so,live:nl2});}}>
                      <p style={{fontSize:11,fontWeight:700,color:isStr?"#f0f2f8":"rgba(255,255,255,.55)"}}>{p}</p>
                      <p className="mono" style={{fontSize:isStr?16:13,fontWeight:700,color:isStr?"#60a5fa":"rgba(96,165,250,.55)",marginTop:4}}>{bd.runs}<span style={{fontSize:9,color:"rgba(255,255,255,.25)"}}> ({bd.balls}b)</span></p>
                      <p style={{fontSize:8,fontWeight:700,color:isStr?"#a78bfa":"rgba(56,189,248,.55)",marginTop:2,textTransform:"uppercase"}}>{isStr?"★ Striker":"† Non-Str"}</p>
                    </div>);
                  })}
                </div>
                {/* Run buttons */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:6}}>
                  {runCfg.slice(0,4).map(({r,bg,col,bc})=><button key={r} className="run-btn" style={{background:bg,color:col,borderColor:bc,height:58,fontSize:24}} onClick={()=>addSOBall(r)}>{r}</button>)}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:8}}>
                  {runCfg.slice(4).map(({r,bg,col,bc})=><button key={r} className="run-btn" style={{background:bg,color:col,borderColor:bc,height:58,fontSize:24}} onClick={()=>addSOBall(r)}>{r}</button>)}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:6}}>
                  <button className="btn btn-warn" style={{height:46,justifyContent:"center"}} onClick={()=>addSOBall(0,{wide:true})}>📏 Wide</button>
                  <button className="btn btn-warn" style={{height:46,justifyContent:"center"}} onClick={()=>addSOBall(0,{noBall:true})}>⚡ No Ball</button>
                </div>
                <button className="btn btn-danger" style={{width:"100%",height:46,justifyContent:"center"}} onClick={()=>setWktMod(true)}>❌ Wicket</button>
              </>
            )}
            <button className="btn btn-ghost" style={{width:"100%",marginTop:8,justifyContent:"center",fontSize:12}} onClick={onClose}>Minimise</button>
          </div>
        </div>
      </div>
    );
  }
  return null;
}
const STORE = "glt10cup_store";
const UKEY = "glt10cup_user";
const KEY = "glt10cup_matchdata";
const DKEY = "glt10cup_demerits";
const RKEY = "glt10cup_reschedules";
const BLANK = {
  status: "upcoming",
  innings: [],
  live: {
    striker: "",
    nonStriker: "",
    bowler: "",
    ballType: "pace",
    freeHit: false,
    standaloneMode: false,
    standalonePlayer: "",
    lastBowler: ""
  },
  result: null,
  penaltyLog: []
};
export default function App(){
  const [user,setUser]      = useState(()=>{try{const u=localStorage.getItem(UKEY);return u?JSON.parse(u):null;}catch{return null;}});
  const [MS,setMS]          = useState(()=>{try{const s=localStorage.getItem(STORE);return s?{D1:{...BLANK},D2:{...BLANK},...JSON.parse(s)}:{D1:{...BLANK},D2:{...BLANK}};}catch{return{D1:{...BLANK},D2:{...BLANK}};}});
  const [dem,setDem]        = useState(()=>{try{const d=localStorage.getItem(DKEY);return d?JSON.parse(d):{players:{},teams:{}};}catch{return{players:{},teams:{}};}});
  const [resched,setResched]= useState(()=>{try{const r=localStorage.getItem(RKEY);return r?JSON.parse(r):{};}catch{return{};}});
  const [selFx,setSelFx]    = useState(null);
  const [hue,setHue]        = useState(0);
  const [syncStatus,setSyncStatus] = useState("connecting");

  // ── Persist to localStorage ─────────────────────────────────────────────────
  useEffect(()=>localStorage.setItem(STORE,JSON.stringify(MS)),[MS]);
  useEffect(()=>{if(user)localStorage.setItem(UKEY,JSON.stringify(user));else localStorage.removeItem(UKEY);},[user]);
  useEffect(()=>localStorage.setItem(DKEY,JSON.stringify(dem)),[dem]);
  useEffect(()=>localStorage.setItem(RKEY,JSON.stringify(resched)),[resched]);

  // ── Shared storage sync: write full state, poll every 2s for updates ─────────
  const lastSyncRef = useRef(null);

  // Push full state to shared storage whenever MS changes (admin action)
  const pushSync = useCallback(async (newMS) => {
    await syncWrite({MS:newMS, ts:Date.now()});
    setSyncStatus("connected");
  },[]);

  // Poll shared storage — viewers get updates, admin also picks up any fixes
  useEffect(()=>{
    let mounted=true;
    const poll = async()=>{
      if(!mounted) return;
      try{
        const data = await syncRead();
        if(!mounted) return;
        if(data?.MS && data.ts !== lastSyncRef.current){
          lastSyncRef.current = data.ts;
          setMS(prev=>{
            // Merge: keep any local-only keys, overwrite with synced data
            return {...prev, ...data.MS};
          });
        }
        setSyncStatus("connected");
      }catch{
        setSyncStatus("error");
      }
    };

    // Initial load
    poll();
    // Poll every 2 seconds
    const interval = setInterval(poll, 2000);
    return ()=>{ mounted=false; clearInterval(interval); };
  },[]);

  // ── Write helpers ───────────────────────────────────────────────────────────
  const upd = useCallback((id, ms)=>{
    setMS(p=>{
      const next={...p,[id]:ms};
      pushSync(next);
      return next;
    });
  },[pushSync]);

  const addDem = useCallback((type, key)=>{
    setDem(p=>{
      const next=type==="player"
        ?{...p,players:{...p.players,[key]:(p.players[key]||0)+1}}
        :{...p,teams:{...p.teams,[key]:(p.teams[key]||0)+1}};
      return next;
    });
  },[]);

  const handleR = useCallback((id, val)=>{
    setResched(p=>{
      const next={...p};
      if(!val) delete next[id]; else next[id]=val;
      return next;
    });
  },[]);

  const tap = useCallback(()=>setHue(h=>(h+40)%360),[]);
  const resolvedFx = selFx?{...selFx,...(resched[selFx.id]||{})}:null;

  const pill = syncStatus==="connected"
    ? {label:"🟢 Live",color:"#4ade80"}
    : syncStatus==="error"
    ? {label:"⚠️ Offline",color:"#f87171"}
    : {label:"⏳ Syncing…",color:"#fbbf24"};

  if(!user) return <AuthScreen onLogin={setUser}/>;

  return(
    <div className="page" onClick={tap}>
      <style>{CSS}</style>
      <div className="bg-layer" style={{filter:`hue-rotate(${hue}deg)`}}/>

      {/* Sync status pill */}
      <div style={{position:"fixed",bottom:80,right:12,zIndex:200,pointerEvents:"none"}}>
        <div style={{background:"rgba(7,8,15,.9)",border:`1px solid ${pill.color}44`,borderRadius:20,padding:"5px 10px",display:"flex",alignItems:"center",gap:5,backdropFilter:"blur(12px)"}}>
          {syncStatus==="connected"&&<span style={{width:6,height:6,borderRadius:"50%",background:"#4ade80",animation:"livepulse 1.2s ease-in-out infinite"}}/>}
          <span style={{fontSize:10,fontWeight:600,color:pill.color}}>{pill.label}</span>
        </div>
      </div>

      <div style={{position:"relative",zIndex:1}}>
        {selFx?(
          <ScoringScreen
            fixture={resolvedFx}
            matchState={MS[selFx.id]||null}
            onUpdate={ms=>upd(selFx.id,ms)}
            onBack={()=>setSelFx(null)}
            isAdmin={!!user.isAdmin&&canEdit(resolvedFx)}
          />
        ):(
          <HomeScreen
            matchStates={MS}
            user={user}
            onSelectMatch={setSelFx}
            onLogout={()=>{setUser(null);localStorage.removeItem(UKEY);}}
            demerits={dem}
            onDemerit={addDem}
            reschedules={resched}
            onReschedule={handleR}
          />
        )}
      </div>
    </div>
  );
}
