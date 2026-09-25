const STAGES = ["Lead","Touring","LOI","Underwriting","Closed"];
const KEY = "deal-command-v1";
const SEED = [
  {id:"d1",name:"Spectrum Center — Suite 240",city:"Irvine",sf:1850,psf:2.15,nnn:14.5,stage:"Touring",notes:"Client wants under $4k/mo all-in. Strong glass line."},
  {id:"d2",name:"4 Corporate Plaza — Ste 310",city:"Newport Beach",sf:2200,psf:2.85,nnn:16,stage:"LOI",notes:"LOI out for landlord review."},
  {id:"d3",name:"Jamboree Business Park — 120",city:"Irvine",sf:1200,psf:1.95,nnn:13.2,stage:"Lead",notes:"Cold lead from CoStar alert."},
  {id:"d4",name:"Tustin Metro — Suite 105",city:"Tustin",sf:980,psf:1.75,nnn:12.8,stage:"Underwriting",notes:"Owner-user; model 7+ cap on buy."},
  {id:"d5",name:"Harbor Gateway — 2nd Fl",city:"Costa Mesa",sf:1600,psf:2.05,nnn:13.9,stage:"Closed",notes:"Closed Q2 sample — keep for comps."},
  {id:"d6",name:"Anaheim Canyon Flex — Bay B",city:"Anaheim",sf:3100,psf:1.45,nnn:11.5,stage:"Lead",notes:"Flex/office hybrid."}
];

let deals = load();
let activeId = null;
let dragId = null;

function load(){
  try{
    const raw = localStorage.getItem(KEY);
    if(raw){ const p = JSON.parse(raw); if(Array.isArray(p)&&p.length) return p; }
  }catch(e){}
  return structuredClone(SEED);
}
function save(){ localStorage.setItem(KEY, JSON.stringify(deals)); }
function money(n){ return n.toLocaleString(undefined,{style:"currency",currency:"USD",maximumFractionDigits:0}); }
function money2(n){ return n.toLocaleString(undefined,{style:"currency",currency:"USD",maximumFractionDigits:2}); }
function toast(msg){ const t=document.getElementById("toast"); t.textContent=msg; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),1800); }
function rentMo(d){ return d.sf * d.psf; }

function renderBoard(){
  const q = (document.getElementById("q").value||"").trim().toLowerCase();
  const board = document.getElementById("board");
  board.innerHTML = "";
  STAGES.forEach(stage=>{
    const col = document.createElement("div");
    col.className = "col";
    col.dataset.stage = stage;
    const list = deals.filter(d=>d.stage===stage && (!q || (d.name+d.city+d.notes).toLowerCase().includes(q)));
    col.innerHTML = `<div class="col-h"><h2><span class="dot ${stage}"></span>${stage}</h2><span class="badge">${list.length}</span></div>`;
    const body = document.createElement("div");
    body.className = "col-b";
    body.addEventListener("dragover", e=>{ e.preventDefault(); });
    body.addEventListener("drop", e=>{
      e.preventDefault();
      if(!dragId) return;
      const d = deals.find(x=>x.id===dragId);
      if(d && d.stage!==stage){ d.stage=stage; save(); renderAll(); toast("Moved to "+stage); }
      dragId=null;
    });
    list.forEach(d=>{
      const card = document.createElement("article");
      card.className = "card";
      card.draggable = true;
      card.tabIndex = 0;
      card.innerHTML = `<h3>${esc(d.name)}</h3>
        <div class="meta">${esc(d.city)} · ${d.sf.toLocaleString()} SF</div>
        <div class="rent">${money2(rentMo(d))}/mo · ${d.psf.toFixed(2)}/SF</div>`;
      card.addEventListener("dragstart", ()=>{ dragId=d.id; card.classList.add("dragging"); });
      card.addEventListener("dragend", ()=> card.classList.remove("dragging"));
      card.addEventListener("click", ()=> openDrawer(d.id));
      card.addEventListener("keydown", e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); openDrawer(d.id);} });
      body.appendChild(card);
    });
    col.appendChild(body);
    board.appendChild(col);
  });
}

function esc(s){ return String(s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }

function openDrawer(id){
  activeId = id;
  const d = deals.find(x=>x.id===id);
  if(!d) return;
  document.getElementById("d-name").value = d.name;
  document.getElementById("d-city").value = d.city;
  document.getElementById("d-sf").value = d.sf;
  document.getElementById("d-psf").value = d.psf;
  document.getElementById("d-nnn").value = d.nnn;
  document.getElementById("d-stage").value = d.stage;
  document.getElementById("d-notes").value = d.notes||"";
  document.getElementById("drawer").classList.add("open");
  document.getElementById("drawer").setAttribute("aria-hidden","false");
}
function closeDrawer(){
  document.getElementById("drawer").classList.remove("open");
  document.getElementById("drawer").setAttribute("aria-hidden","true");
  activeId=null;
}

function calc(){
  const price = +document.getElementById("c-price").value||0;
  const noi = +document.getElementById("c-noi").value||0;
  const downPct = +document.getElementById("c-down").value||0;
  const rate = (+document.getElementById("c-rate").value||0)/100;
  const years = +document.getElementById("c-amort").value||1;
  const cap = price>0 ? (noi/price)*100 : 0;
  const cash = price * (downPct/100);
  const loan = Math.max(price-cash,0);
  const r = rate/12;
  const n = years*12;
  const pmt = r===0 ? (loan/n) : (loan * r * Math.pow(1+r,n)) / (Math.pow(1+r,n)-1);
  const ads = pmt*12;
  const ctc = cash>0 ? ((noi-ads)/cash)*100 : 0;
  document.getElementById("o-cap").textContent = cap.toFixed(2)+"%";
  document.getElementById("o-ads").textContent = money(ads);
  document.getElementById("o-cash").textContent = money(cash);
  document.getElementById("o-coc").textContent = ctc.toFixed(2)+"%";
  document.getElementById("o-math").innerHTML =
    `Cap = NOI ÷ Price = ${money(noi)} ÷ ${money(price)}.<br/>
     Monthly P&amp;I on ${money(loan)} @ ${(rate*100).toFixed(2)}% / ${years}yr → annual debt service ${money(ads)}.<br/>
     CoC = (NOI − ADS) ÷ Cash = (${money(noi)} − ${money(ads)}) ÷ ${money(cash)}.`;
}

function renderInventory(){
  const maxRent = +document.getElementById("f-rent").value||Infinity;
  const minSf = +document.getElementById("f-sf").value||0;
  const city = document.getElementById("f-city").value;
  const tb = document.querySelector("#inv-table tbody");
  tb.innerHTML = "";
  deals.filter(d=>{
    const r = rentMo(d);
    return r<=maxRent && d.sf>=minSf && (!city || d.city===city);
  }).forEach(d=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${esc(d.name)}</td><td>${esc(d.city)}</td><td>${d.sf.toLocaleString()}</td>
      <td>${d.psf.toFixed(2)}</td><td>${money(rentMo(d))}</td>
      <td><button class="btn btn-ghost" type="button" data-id="${d.id}">Open</button></td>`;
    tr.querySelector("button").onclick = ()=> openDrawer(d.id);
    tb.appendChild(tr);
  });
}

function fillBriefSelect(){
  const sel = document.getElementById("brief-deal");
  sel.innerHTML = deals.map(d=>`<option value="${d.id}">${esc(d.name)} (${esc(d.city)})</option>`).join("");
}

function genBrief(){
  const id = document.getElementById("brief-deal").value;
  const d = deals.find(x=>x.id===id);
  if(!d) return;
  const text =
`TOUR BRIEF — ${d.name}
${d.city}, CA · ${d.sf.toLocaleString()} SF
Asking: $${d.psf.toFixed(2)}/SF/mo · Est. rent ${money(rentMo(d))}/mo
NNN: ~$${d.nnn.toFixed(1)}/SF/yr
Pipeline stage: ${d.stage}

Notes
${d.notes||"—"}

Next step: confirm tour window and send access instructions.
Contact: Chad Nasir · (949) 358-0056 · sales@realestateca.org
RealEstateCA.org · eXp Commercial

(Sample demo data — verify before client send.)`;
  document.getElementById("brief-out").textContent = text;
}

function exportCsv(){
  const rows = [["id","name","city","sf","psf","nnn","stage","rent_mo","notes"]];
  deals.forEach(d=> rows.push([d.id,d.name,d.city,d.sf,d.psf,d.nnn,d.stage,rentMo(d).toFixed(2),JSON.stringify(d.notes||"")]));
  const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob([csv],{type:"text/csv"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "deal-command-export.csv";
  a.click();
  URL.revokeObjectURL(a.href);
  toast("CSV downloaded");
}

function newDeal(){
  const id = "d"+Math.random().toString(36).slice(2,8);
  deals.unshift({id,name:"New suite",city:"Irvine",sf:1000,psf:2.0,nnn:13,stage:"Lead",notes:""});
  save(); renderAll(); openDrawer(id); toast("Deal added");
}

function renderAll(){ renderBoard(); renderInventory(); fillBriefSelect(); calc(); }

document.querySelectorAll(".tab").forEach(tab=>{
  tab.addEventListener("click", ()=>{
    document.querySelectorAll(".tab").forEach(t=>t.setAttribute("aria-selected","false"));
    tab.setAttribute("aria-selected","true");
    document.querySelectorAll(".panel").forEach(p=>p.classList.remove("active"));
    document.getElementById("panel-"+tab.dataset.tab).classList.add("active");
  });
});

["c-price","c-noi","c-down","c-rate","c-amort"].forEach(id=> document.getElementById(id).addEventListener("input", calc));
["f-rent","f-sf","f-city"].forEach(id=> document.getElementById(id).addEventListener("input", renderInventory));
document.getElementById("f-city").addEventListener("change", renderInventory);
document.getElementById("q").addEventListener("input", renderBoard);
document.getElementById("btn-new").onclick = newDeal;
document.getElementById("btn-export").onclick = exportCsv;
document.getElementById("btn-gen-brief").onclick = genBrief;
document.getElementById("btn-copy-brief").onclick = async ()=>{
  const t = document.getElementById("brief-out").textContent;
  try{ await navigator.clipboard.writeText(t); toast("Copied"); }catch(e){ toast("Copy failed — select text manually"); }
};
document.getElementById("btn-print").onclick = ()=> window.print();
document.getElementById("d-close").onclick = closeDrawer;
document.getElementById("drawer").addEventListener("click", e=>{ if(e.target.id==="drawer") closeDrawer(); });
document.getElementById("d-save").onclick = ()=>{
  const d = deals.find(x=>x.id===activeId); if(!d) return;
  d.name = document.getElementById("d-name").value.trim()||d.name;
  d.city = document.getElementById("d-city").value.trim()||d.city;
  d.sf = +document.getElementById("d-sf").value||0;
  d.psf = +document.getElementById("d-psf").value||0;
  d.nnn = +document.getElementById("d-nnn").value||0;
  d.stage = document.getElementById("d-stage").value;
  d.notes = document.getElementById("d-notes").value;
  save(); renderAll(); toast("Saved"); closeDrawer();
};
document.getElementById("d-del").onclick = ()=>{
  deals = deals.filter(x=>x.id!==activeId); save(); renderAll(); toast("Deleted"); closeDrawer();
};
document.addEventListener("keydown", e=>{
  if(e.key==="/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){
    e.preventDefault(); document.getElementById("q").focus();
  }
  if((e.key==="n"||e.key==="N") && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){
    e.preventDefault(); newDeal();
  }
  if(e.key==="Escape") closeDrawer();
});

renderAll();
