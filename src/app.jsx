import { useState, useEffect } from “react”;
import { initGoogleAuth, loadFromDrive, saveToDrive, isSignedIn } from “./drive.js”;

const CLIENT_ID = “TU_CLIENT_ID_ACA”;

const INC = [“Aira”,“Ingreso extra”,“Mbaeichapa”];
const EXP = [“Colegio nenas”,“Gastos Santi”,“Gastos de trabajo”,“Gastos de la casa”,“Combustible”,“Súper”,“Ahorro”,“Imprevistos”];
const COLORS = [”#5DCAA5”,”#7F77DD”,”#378ADD”,”#D85A30”,”#D4537E”];
const PIE_C = [”#5DCAA5”,”#7F77DD”,”#378ADD”,”#D85A30”,”#D4537E”,”#EF9F27”,”#97C459”,”#ED93B1”,”#85B7EB”,”#F09595”];
const DEFACCS = [{id:“1”,name:“Cuenta principal”,type:“bank”,balance:0,initialBalance:0,color:COLORS[0]},{id:“2”,name:“Tarjeta de crédito”,type:“credit”,balance:0,initialBalance:0,color:COLORS[1]}];
const fmt = n => new Intl.NumberFormat(“es-PY”,{style:“currency”,currency:“PYG”,maximumFractionDigits:0}).format(n);
const ICONS = {bank:“🏦”,credit:“💳”,wallet:“👛”};
const EMOJI = {Combustible:“⛽”,Súper:“🛒”,Ahorro:“🐷”,Imprevistos:“⚡”,Aira:“💚”,“Ingreso extra”:“✨”,Mbaeichapa:“🌟”,“Colegio nenas”:“🏫”,“Gastos Santi”:“👦”,“Gastos de trabajo”:“💼”,“Gastos de la casa”:“🏠”};
const mLabel = m => { if(m===“all”) return “Todos”; const [y,mo]=m.split(”-”); return `${["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][+mo-1]} ${y}`; };
const G=”#1D9E75”,GD=”#0F6E56”,GL=”#E1F5EE”,R=”#D85A30”,P=”#7F77DD”,PD=”#534AB7”,AM=”#854F0B”,AML=”#FAEEDA”;
const BG=”#fff”,BGS=”#f5f5f5”,TX=”#1a1a1a”,TXS=”#666”,BD=“rgba(0,0,0,0.1)”;
const KEY = “gApp_local”;

function Pie({data}) {
if(!data?.length) return null;
const tot=data.reduce((s,d)=>s+d.value,0); if(!tot) return null;
const cx=100,cy=100,r=80,ir=44; let a=-Math.PI/2;
const sl=data.map((d,i)=>{
const p=d.value/tot,a1=a,a2=a+p*2*Math.PI; a=a2;
const f=(ang,rad)=>[cx+rad*Math.cos(ang),cy+rad*Math.sin(ang)];
const [x1,y1]=f(a1,r),[x2,y2]=f(a2,r),[ix1,iy1]=f(a1,ir),[ix2,iy2]=f(a2,ir);
return {…d,p,c:PIE_C[i%PIE_C.length],path:`M ${ix1} ${iy1} L ${x1} ${y1} A ${r} ${r} 0 ${p>.5?1:0} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${ir} ${ir} 0 ${p>.5?1:0} 0 ${ix1} ${iy1} Z`};
});
return <div>
<svg viewBox=“0 0 200 200” width=“100%” style={{maxWidth:200,display:“block”,margin:“0 auto”}}>
{sl.map((s,i)=><path key={i} d={s.path} fill={s.c} stroke="#fff" strokeWidth="1.5"/>)}
<text x="100" y="94" textAnchor="middle" fontSize="11" fill={TXS}>Total</text>
<text x="100" y="110" textAnchor="middle" fontSize="10" fontWeight="500" fill={TX}>{fmt(tot)}</text>
</svg>
<div style={{display:“flex”,flexWrap:“wrap”,gap:“5px 10px”,marginTop:10,justifyContent:“center”}}>
{sl.map((s,i)=><div key={i} style={{display:“flex”,alignItems:“center”,gap:4}}><div style={{width:9,height:9,borderRadius:2,background:s.c}}/><span style={{fontSize:11,color:TXS}}>{s.label} <b style={{color:TX,fontWeight:500}}>{Math.round(s.p*100)}%</b></span></div>)}
</div>

  </div>;
}

const Sheet = ({onClose,title,children}) => (

  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-end",zIndex:100}} onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={{background:BG,borderRadius:"20px 20px 0 0",width:"100%",padding:"20px 16px 40px",maxHeight:"88vh",overflowY:"auto",boxSizing:"border-box"}}>
      <p style={{fontSize:17,fontWeight:500,marginBottom:14,color:TX}}>{title}</p>
      {children}
    </div>
  </div>
);

const Btn = ({onClick,color=G,outline,children,style={}}) => <button onClick={onClick} style={{padding:“12px”,background:outline?“transparent”:color,color:outline?color:”#fff”,border:`1.5px solid ${color}`,borderRadius:10,fontSize:14,fontWeight:500,cursor:“pointer”,width:“100%”,…style}}>{children}</button>;
const Inp = ({style,…p}) => <input {…p} style={{width:“100%”,boxSizing:“border-box”,marginBottom:8,background:BGS,color:TX,border:`1px solid ${BD}`,borderRadius:8,padding:“9px 10px”,fontSize:15,…style}}/>;
const Sel = ({…p}) => <select {…p} style={{width:“100%”,boxSizing:“border-box”,marginBottom:8,background:BGS,color:TX,border:`1px solid ${BD}`,borderRadius:8,padding:“9px 10px”,fontSize:15}}/>;
const Lbl = ({children}) => <label style={{fontSize:13,color:TXS,marginBottom:4,display:“block”,marginTop:6}}>{children}</label>;
const Toggle = ({val,onChange}) => <div style={{display:“flex”,background:BGS,borderRadius:10,padding:3,marginBottom:12}}>
{[[“gasto”,“Gasto”,R],[“ingreso”,“Ingreso”,G]].map(([v,l,c])=><button key={v} onClick={()=>onChange(v)} style={{flex:1,padding:“8px”,border:“none”,borderRadius:8,fontWeight:500,fontSize:14,cursor:“pointer”,background:val===v?c:“transparent”,color:val===v?”#fff”:TXS}}>{l}</button>)}

</div>;

export default function App() {
const [accs, setAccs] = useState(DEFACCS);
const [txs, setTxs] = useState([]);
const [recs, setRecs] = useState([]);
const [iCats, setICats] = useState(INC);
const [eCats, setECats] = useState(EXP);
const [view, setView] = useState(“home”);
const [selAcc, setSelAcc] = useState(null);
const [selMonth, setSelMonth] = useState(new Date().toISOString().slice(0,7));
const [tab, setTab] = useState(“todos”);
const [modal, setModal] = useState(null);
const [catType, setCatType] = useState(“gasto”);
const [newCat, setNewCat] = useState(””);
const [editCat, setEditCat] = useState(null);
const [toast, setToast] = useState(””);
const [status, setStatus] = useState(“Iniciando…”);
const [signedIn, setSignedIn] = useState(false);
const [form, setForm] = useState({type:“gasto”,category:””,amount:””,description:””,date:new Date().toISOString().slice(0,10),accountId:null});
const [accForm, setAccForm] = useState({name:””,type:“bank”,initialBalance:””});
const [recForm, setRecForm] = useState({client:””,concept:””,amount:””,dueDate:””,notes:””});
const [editAccForm, setEditAccForm] = useState(null);

const toast_ = m => { setToast(m); setTimeout(()=>setToast(””),3000); };

const applyData = d => {
if(!d) return;
if(d.accs) setAccs(d.accs);
if(d.txs) setTxs(d.txs);
if(d.recs) setRecs(d.recs);
if(d.iCats) setICats(d.iCats);
if(d.eCats) setECats(d.eCats);
};

const getData = () => ({accs,txs,recs,iCats,eCats,savedAt:new Date().toISOString()});

useEffect(()=>{
// Load from localStorage first
try { const r=localStorage.getItem(KEY); if(r) applyData(JSON.parse(r)); } catch{}
// Then try Drive
setStatus(“Conectando con Google…”);
initGoogleAuth(CLIENT_ID)
.then(async () => {
setSignedIn(true);
setStatus(“Cargando desde Drive…”);
try {
const d = await loadFromDrive();
if(d) { applyData(d); toast_(“✓ Datos cargados desde Drive”); }
setStatus(“✓ Conectado a Drive”);
} catch { setStatus(“✓ Conectado”); }
})
.catch(()=>{ setStatus(“Sin conexión a Drive — modo local”); });
},[]);

const save = async (a,t,r,ic,ec) => {
const d={accs:a??accs,txs:t??txs,recs:r??recs,iCats:ic??iCats,eCats:ec??eCats,savedAt:new Date().toISOString()};
try { localStorage.setItem(KEY,JSON.stringify(d)); } catch{}
if(isSignedIn()) {
try { await saveToDrive(d); setStatus(“✓ Guardado en Drive”); setTimeout(()=>setStatus(“✓ Conectado a Drive”),2000); }
catch { setStatus(“Guardado solo local”); }
}
};

const months = [“all”,…Array.from(new Set([…txs.map(t=>t.date?.slice(0,7)).filter(Boolean),new Date().toISOString().slice(0,7)])).sort((a,b)=>b.localeCompare(a))];
const vis = (selAcc?txs.filter(t=>t.accountId===selAcc.id):txs).filter(t=>selMonth===“all”||t.date?.slice(0,7)===selMonth);
const filt = tab===“todos”?vis:vis.filter(t=>t.type===tab);
const totBal = accs.filter(a=>a.type!==“credit”).reduce((s,a)=>s+a.balance,0);
const totInc = vis.filter(t=>t.type===“ingreso”).reduce((s,t)=>s+t.amount,0);
const totExp = vis.filter(t=>t.type===“gasto”).reduce((s,t)=>s+t.amount,0);
const totPend = recs.filter(r=>r.status===“pendiente”).reduce((s,r)=>s+r.amount,0);
const pRecs = recs.filter(r=>r.status===“pendiente”);
const oRecs = recs.filter(r=>r.status!==“pendiente”);
const pieData = Object.entries(vis.filter(t=>t.type===“gasto”).reduce((m,t)=>({…m,[t.category]:(m[t.category]||0)+t.amount}),{})).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({label:k,value:v}));
const curCats = catType===“ingreso”?iCats:eCats;

const addTx = async () => {
const cat=form.category||(form.type===“ingreso”?iCats[0]:eCats[0]);
const amt=parseInt(form.amount,10); if(!amt||!form.accountId) return;
const tx={id:String(Date.now()),…form,category:cat,amount:amt};
const nt=[tx,…txs],na=accs.map(a=>a.id!==form.accountId?a:{…a,balance:a.balance+(form.type===“ingreso”?amt:-amt)});
setTxs(nt);setAccs(na);await save(na,nt);
setModal(null);setForm({type:“gasto”,category:eCats[0]||””,amount:””,description:””,date:new Date().toISOString().slice(0,10),accountId:form.accountId});
};

const delTx = async id => {
const tx=txs.find(t=>t.id===id);if(!tx)return;
const nt=txs.filter(t=>t.id!==id),na=accs.map(a=>a.id!==tx.accountId?a:{…a,balance:a.balance-(tx.type===“ingreso”?tx.amount:-tx.amount)});
setTxs(nt);setAccs(na);await save(na,nt);
};

const addAcc = async () => {
if(!accForm.name)return;
const ib=parseInt(accForm.initialBalance,10)||0;
const acc={id:String(Date.now()),name:accForm.name,type:accForm.type,balance:ib,initialBalance:ib,color:COLORS[accs.length%COLORS.length]};
const na=[…accs,acc];setAccs(na);await save(na);
setAccForm({name:””,type:“bank”,initialBalance:””});setModal(null);
};

const saveAcc = async () => {
if(!editAccForm)return;
const ib=parseInt(editAccForm.initialBalance,10)||0,diff=ib-(editAccForm._orig??0);
const na=accs.map(a=>a.id!==editAccForm.id?a:{…a,name:editAccForm.name,type:editAccForm.type,initialBalance:ib,balance:a.balance+diff});
setAccs(na);await save(na);setModal(null);
};

const addRec = async () => {
if(!recForm.client||!recForm.amount)return;
const r={id:String(Date.now()),…recForm,amount:parseInt(recForm.amount,10)||0,status:“pendiente”,createdAt:new Date().toISOString().slice(0,10)};
const nr=[r,…recs];setRecs(nr);await save(null,null,nr);
setRecForm({client:””,concept:””,amount:””,dueDate:””,notes:””});setModal(null);
};

const markRec = async (id,s) => { const nr=recs.map(r=>r.id!==id?r:{…r,status:s});setRecs(nr);await save(null,null,nr); };
const delRec = async id => { const nr=recs.filter(r=>r.id!==id);setRecs(nr);await save(null,null,nr); };

const addCat = async () => {
if(!newCat.trim())return;
if(catType===“ingreso”){const nc=[…iCats,newCat.trim()];setICats(nc);await save(null,null,null,nc,null);}
else{const nc=[…eCats,newCat.trim()];setECats(nc);await save(null,null,null,null,nc);}
setNewCat(””);
};

const renameCat = async (old,neu) => {
if(!neu?.trim()||neu===old){setEditCat(null);return;}
if(catType===“ingreso”){const nc=iCats.map(c=>c===old?neu.trim():c);const nt=txs.map(t=>t.category===old?{…t,category:neu.trim()}:t);setICats(nc);setTxs(nt);await save(null,nt,null,nc,null);}
else{const nc=eCats.map(c=>c===old?neu.trim():c);const nt=txs.map(t=>t.category===old?{…t,category:neu.trim()}:t);setECats(nc);setTxs(nt);await save(null,nt,null,null,nc);}
setEditCat(null);
};

const delCat = async cat => {
if(catType===“ingreso”){const nc=iCats.filter(c=>c!==cat);setICats(nc);await save(null,null,null,nc,null);}
else{const nc=eCats.filter(c=>c!==cat);setECats(nc);await save(null,null,null,null,nc);}
};

const openTxForm = aid => {
setForm({type:“gasto”,category:eCats[0]||””,amount:””,description:””,date:new Date().toISOString().slice(0,10),accountId:aid||(accs[0]?.id??null)});
setModal(“tx”);
};

return <div style={{fontFamily:“system-ui,-apple-system,sans-serif”,maxWidth:480,margin:“0 auto”,paddingBottom:80,background:BG,minHeight:“100vh”}}>
{toast&&<div style={{position:“fixed”,bottom:90,left:“50%”,transform:“translateX(-50%)”,background:”#1a1a1a”,color:”#fff”,fontSize:13,padding:“10px 20px”,borderRadius:20,zIndex:200,whiteSpace:“nowrap”}}>{toast}</div>}

```
<div style={{borderBottom:`1px solid ${BD}`,display:"flex",background:BG}}>
  {[["home","Finanzas"],["rec","Por cobrar"],["bak","💾"]].map(([v,l])=>(
    <button key={v} onClick={()=>{setView(v);if(v==="home")setSelAcc(null);}} style={{flex:1,padding:"12px 0",border:"none",background:"none",fontWeight:view===v?500:400,fontSize:14,color:view===v?G:TXS,borderBottom:view===v?`2px solid ${G}`:"2px solid transparent",cursor:"pointer"}}>
      {l}{v==="rec"&&pRecs.length>0&&<span style={{background:R,color:"#fff",borderRadius:10,fontSize:11,padding:"1px 5px",marginLeft:3}}>{pRecs.length}</span>}
    </button>
  ))}
</div>
<div style={{textAlign:"center",fontSize:11,color:TXS,padding:"3px 0",background:BGS}}>{status}</div>

{view==="home"&&<>
  {selAcc&&<div style={{padding:"10px 16px 0"}}><button style={{background:"none",border:"none",color:G,fontSize:14,cursor:"pointer",padding:0}} onClick={()=>{setSelAcc(null);setTab("todos");}}>← Volver</button></div>}
  <div style={{margin:"14px 16px",borderRadius:16,padding:"18px 20px",background:`linear-gradient(135deg,${G} 0%,${GD} 100%)`}}>
    <p style={{fontSize:12,color:"rgba(255,255,255,0.8)",marginBottom:3}}>{selAcc?"Saldo actual":"Saldo total"} · {mLabel(selMonth)}</p>
    <p style={{fontSize:30,fontWeight:500,color:"#fff",margin:0}}>{fmt(selAcc?selAcc.balance:totBal)}</p>
    <div style={{display:"flex",gap:8,marginTop:12}}>
      {[["+"+fmt(totInc),"Ingresos"],["-"+fmt(totExp),"Gastos"],[fmt(totPend),"Por cobrar"]].map(([v,l])=>(
        <div key={l} style={{flex:1,background:"rgba(255,255,255,0.15)",borderRadius:10,padding:"9px 10px"}}>
          <p style={{fontSize:11,color:"rgba(255,255,255,0.75)",margin:0}}>{l}</p>
          <p style={{fontSize:13,fontWeight:500,color:"#fff",margin:"2px 0 0"}}>{v}</p>
        </div>
      ))}
    </div>
  </div>

  {!selAcc&&<>
    <p style={{fontSize:12,fontWeight:500,color:TXS,padding:"12px 16px 6px",textTransform:"uppercase",letterSpacing:0.5,margin:0}}>Cuentas</p>
    {accs.map(a=>(
      <div key={a.id} style={{margin:"0 16px 8px",background:BG,border:`1px solid ${BD}`,borderRadius:12,padding:"12px 14px",display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:38,height:38,borderRadius:10,background:a.color+"33",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,cursor:"pointer"}} onClick={()=>setSelAcc(a)}>{ICONS[a.type]||"💰"}</div>
        <div style={{flex:1,cursor:"pointer"}} onClick={()=>setSelAcc(a)}>
          <p style={{fontSize:15,fontWeight:500,color:TX,margin:0}}>{a.name}</p>
          <p style={{fontSize:12,color:TXS,margin:0}}>{a.type==="bank"?"Cuenta bancaria":a.type==="credit"?"Tarjeta de crédito":"Billetera"}</p>
        </div>
        <div style={{textAlign:"right"}}>
          <p style={{fontSize:15,fontWeight:500,color:a.balance>=0?TX:R,margin:0}}>{fmt(a.balance)}</p>
          <p style={{fontSize:11,color:TXS,margin:0}}>inicial: {fmt(a.initialBalance??0)}</p>
        </div>
        <button style={{background:"none",border:"none",color:TXS,cursor:"pointer",fontSize:14,padding:"4px 6px"}} onClick={()=>{setEditAccForm({...a,_orig:a.initialBalance??0});setModal("editAcc");}}>✏️</button>
      </div>
    ))}
    {accs.length<5&&<button style={{margin:"4px 16px 0",background:"none",border:`1px dashed rgba(0,0,0,0.18)`,borderRadius:12,padding:"10px",width:"calc(100% - 32px)",color:TXS,fontSize:14,cursor:"pointer"}} onClick={()=>setModal("addAcc")}>+ Agregar cuenta</button>}
  </>}

  <div style={{display:"flex",gap:6,padding:"10px 16px 2px",overflowX:"auto"}}>
    {months.map(m=><button key={m} style={{padding:"5px 14px",borderRadius:20,border:"none",cursor:"pointer",whiteSpace:"nowrap",fontSize:13,fontWeight:selMonth===m?500:400,background:selMonth===m?G:BGS,color:selMonth===m?"#fff":TXS,flexShrink:0}} onClick={()=>setSelMonth(m)}>{mLabel(m)}</button>)}
  </div>

  <div style={{fontSize:12,fontWeight:500,color:TXS,padding:"12px 16px 6px",textTransform:"uppercase",letterSpacing:0.5,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
    <span>Movimientos</span>
    <div style={{display:"flex",gap:8}}>
      <button style={{fontSize:12,color:G,background:"none",border:"none",cursor:"pointer",fontWeight:500}} onClick={()=>{setCatType("ingreso");setModal("cats");}}>+ Ingresos</button>
      <button style={{fontSize:12,color:G,background:"none",border:"none",cursor:"pointer",fontWeight:500}} onClick={()=>{setCatType("gasto");setModal("cats");}}>+ Gastos</button>
    </div>
  </div>
  <div style={{display:"flex",borderBottom:`1px solid ${BD}`,padding:"0 16px",background:BG}}>
    {["todos","ingreso","gasto"].map(t=><button key={t} style={{padding:"9px 12px",fontSize:13,border:"none",background:"none",cursor:"pointer",color:tab===t?G:TXS,fontWeight:tab===t?500:400,borderBottom:tab===t?`2px solid ${G}`:"2px solid transparent"}} onClick={()=>setTab(t)}>{t==="todos"?"Todos":t==="ingreso"?"Ingresos":"Gastos"}</button>)}
  </div>
  {filt.length===0?<p style={{textAlign:"center",color:TXS,padding:"28px 16px",fontSize:14}}>Sin movimientos en {mLabel(selMonth)}</p>
    :filt.map(tx=>{const acc=accs.find(a=>a.id===tx.accountId);return(
      <div key={tx.id} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 16px",borderBottom:`1px solid ${BD}`,background:BG}}>
        <div style={{width:36,height:36,borderRadius:9,background:tx.type==="ingreso"?GL:"#FAECE7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{EMOJI[tx.category]||"📌"}</div>
        <div style={{flex:1,minWidth:0}}>
          <p style={{fontSize:14,fontWeight:500,color:TX,margin:0}}>{tx.category}</p>
          <p style={{fontSize:12,color:TXS,margin:0}}>{[tx.description,acc?.name,tx.date].filter(Boolean).join(" · ")}</p>
        </div>
        <p style={{marginLeft:"auto",fontSize:14,fontWeight:500,color:tx.type==="ingreso"?G:R,whiteSpace:"nowrap"}}>{tx.type==="ingreso"?"+":"-"}{fmt(tx.amount)}</p>
        <button style={{background:"none",border:"none",color:TXS,cursor:"pointer",fontSize:14,padding:"4px",marginLeft:4}} onClick={()=>delTx(tx.id)}>✕</button>
      </div>
    );})}
  {pieData.length>0&&<div style={{margin:"16px 16px 8px",background:BG,border:`1px solid ${BD}`,borderRadius:14,padding:"16px"}}><p style={{fontSize:14,fontWeight:500,color:TX,marginBottom:14,textAlign:"center"}}>Gastos · {mLabel(selMonth)}</p><Pie data={pieData}/></div>}
</>}

{view==="rec"&&<>
  <div style={{margin:"14px 16px",borderRadius:16,padding:"18px 20px",background:`linear-gradient(135deg,${P} 0%,${PD} 100%)`}}>
    <p style={{fontSize:12,color:"rgba(255,255,255,0.8)",marginBottom:3}}>Total por cobrar</p>
    <p style={{fontSize:30,fontWeight:500,color:"#fff",margin:0}}>{fmt(totPend)}</p>
    <div style={{display:"flex",gap:8,marginTop:12}}>
      <div style={{flex:1,background:"rgba(255,255,255,0.15)",borderRadius:10,padding:"9px 10px"}}><p style={{fontSize:11,color:"rgba(255,255,255,0.75)",margin:0}}>Pendientes</p><p style={{fontSize:13,fontWeight:500,color:"#fff",margin:"2px 0 0"}}>{pRecs.length}</p></div>
      <div style={{flex:1,background:"rgba(255,255,255,0.15)",borderRadius:10,padding:"9px 10px"}}><p style={{fontSize:11,color:"rgba(255,255,255,0.75)",margin:0}}>Cobrados</p><p style={{fontSize:13,fontWeight:500,color:"#fff",margin:"2px 0 0"}}>{recs.filter(r=>r.status==="cobrado").length}</p></div>
    </div>
  </div>
  {pRecs.length>0&&<p style={{fontSize:12,fontWeight:500,color:TXS,padding:"12px 16px 6px",textTransform:"uppercase",letterSpacing:0.5,margin:0}}>Pendientes</p>}
  {pRecs.map(r=>(
    <div key={r.id} style={{margin:"0 16px 8px",background:BG,border:`1px solid ${BD}`,borderRadius:12,padding:"12px 14px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div><p style={{fontSize:15,fontWeight:500,color:TX,margin:0}}>{r.client}</p>{r.concept&&<p style={{fontSize:13,color:TXS,margin:"2px 0 0"}}>{r.concept}</p>}{r.dueDate&&<p style={{fontSize:12,color:TXS,margin:"2px 0 0"}}>Vence: {r.dueDate}</p>}</div>
        <div style={{textAlign:"right"}}><p style={{fontSize:16,fontWeight:500,color:P,margin:0}}>{fmt(r.amount)}</p><span style={{fontSize:11,fontWeight:500,padding:"2px 8px",borderRadius:6,background:AML,color:AM}}>{r.status}</span></div>
      </div>
      {r.notes&&<p style={{fontSize:12,color:TXS,marginTop:6,marginBottom:0}}>{r.notes}</p>}
      <div style={{display:"flex",gap:6,marginTop:8}}>
        <button style={{flex:1,padding:"7px",border:`1px solid ${G}`,borderRadius:8,background:"none",color:G,fontSize:12,fontWeight:500,cursor:"pointer"}} onClick={()=>markRec(r.id,"cobrado")}>✓ Cobrado</button>
        <button style={{flex:1,padding:"7px",border:`1px solid ${R}`,borderRadius:8,background:"none",color:R,fontSize:12,fontWeight:500,cursor:"pointer"}} onClick={()=>markRec(r.id,"cancelado")}>✗ Cancelado</button>
        <button style={{flex:1,padding:"7px",border:"1px solid #888",borderRadius:8,background:"none",color:"#888",fontSize:12,fontWeight:500,cursor:"pointer"}} onClick={()=>delRec(r.id)}>Eliminar</button>
      </div>
    </div>
  ))}
  {oRecs.length>0&&<p style={{fontSize:12,fontWeight:500,color:TXS,padding:"12px 16px 6px",textTransform:"uppercase",letterSpacing:0.5,margin:0}}>Historial</p>}
  {oRecs.map(r=>(
    <div key={r.id} style={{margin:"0 16px 8px",background:BG,border:`1px solid ${BD}`,borderRadius:12,padding:"12px 14px",opacity:0.7}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><p style={{fontSize:14,fontWeight:500,color:TX,margin:0}}>{r.client}</p>{r.concept&&<p style={{fontSize:12,color:TXS,margin:"2px 0 0"}}>{r.concept}</p>}</div>
        <div style={{textAlign:"right"}}><p style={{fontSize:14,fontWeight:500,color:TXS,margin:0}}>{fmt(r.amount)}</p><span style={{fontSize:11,fontWeight:500,padding:"2px 8px",borderRadius:6,background:r.status==="cobrado"?GL:"#FCEBEB",color:r.status==="cobrado"?GD:"#A32D2D"}}>{r.status}</span></div>
      </div>
      <div style={{display:"flex",gap:6,marginTop:8}}>
        <button style={{flex:1,padding:"7px",border:`1px solid ${P}`,borderRadius:8,background:"none",color:P,fontSize:12,fontWeight:500,cursor:"pointer"}} onClick={()=>markRec(r.id,"pendiente")}>Reabrir</button>
        <button style={{flex:1,padding:"7px",border:"1px solid #888",borderRadius:8,background:"none",color:"#888",fontSize:12,fontWeight:500,cursor:"pointer"}} onClick={()=>delRec(r.id)}>Eliminar</button>
      </div>
    </div>
  ))}
  {recs.length===0&&<p style={{textAlign:"center",color:TXS,padding:"28px 16px",fontSize:14}}>Sin trabajos por cobrar</p>}
</>}

{view==="bak"&&<>
  <div style={{padding:"20px 16px 8px"}}>
    <p style={{fontSize:20,fontWeight:500,color:TX,margin:"0 0 4px"}}>Respaldo</p>
    <p style={{fontSize:14,color:TXS,margin:0}}>Tus datos se sincronizan automáticamente con Google Drive.</p>
  </div>
  <div style={{margin:"12px 16px",background:signedIn?GL:"#FAEEDA",borderRadius:12,padding:"14px"}}>
    <p style={{fontSize:14,fontWeight:500,color:signedIn?GD:AM,margin:"0 0 2px"}}>{signedIn?"✓ Conectado a Google Drive":"⚠ Sin conexión a Drive"}</p>
    <p style={{fontSize:13,color:signedIn?GD:AM,margin:0}}>{signedIn?"Los datos se guardan automáticamente en tu Drive.":"Los datos se guardan solo en este dispositivo."}</p>
  </div>
  <div style={{margin:"12px 16px",background:BGS,borderRadius:12,padding:"16px",border:`1px solid ${BD}`}}>
    <p style={{fontSize:14,fontWeight:500,color:TX,marginBottom:4}}>Estado actual</p>
    <p style={{fontSize:13,color:TXS,margin:0}}>{accs.length} cuentas · {txs.length} movimientos · {recs.length} cobros</p>
  </div>
</>}

{view!=="bak"&&<button style={{position:"fixed",bottom:24,right:24,width:54,height:54,borderRadius:27,background:G,border:"none",color:"#fff",fontSize:26,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}} onClick={()=>view==="rec"?setModal("addRec"):openTxForm(selAcc?.id)}>+</button>}

{modal==="tx"&&<Sheet onClose={()=>setModal(null)} title="Nueva transacción">
  <Toggle val={form.type} onChange={v=>setForm({...form,type:v,category:(v==="ingreso"?iCats:eCats)[0]||""})}/>
  <Lbl>Cuenta</Lbl><Sel value={form.accountId||""} onChange={e=>setForm({...form,accountId:e.target.value})}>{accs.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</Sel>
  <Lbl>Categoría</Lbl><Sel value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{(form.type==="ingreso"?iCats:eCats).map(c=><option key={c}>{c}</option>)}</Sel>
  <Lbl>Monto (₲)</Lbl><Inp type="number" placeholder="0" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/>
  <Lbl>Descripción (opcional)</Lbl><Inp type="text" placeholder="Ej: Superseis" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
  <Lbl>Fecha</Lbl><Inp type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/>
  <Btn onClick={addTx}>Guardar</Btn>
</Sheet>}

{modal==="addAcc"&&<Sheet onClose={()=>setModal(null)} title="Nueva cuenta">
  <Lbl>Nombre</Lbl><Inp type="text" placeholder="Ej: Itaú" value={accForm.name} onChange={e=>setAccForm({...accForm,name:e.target.value})}/>
  <Lbl>Tipo</Lbl><Sel value={accForm.type} onChange={e=>setAccForm({...accForm,type:e.target.value})}><option value="bank">Cuenta bancaria</option><option value="credit">Tarjeta de crédito</option><option value="wallet">Billetera</option></Sel>
  <Lbl>Saldo inicial (₲)</Lbl><Inp type="number" placeholder="0" value={accForm.initialBalance} onChange={e=>setAccForm({...accForm,initialBalance:e.target.value})}/>
  <Btn onClick={addAcc}>Agregar cuenta</Btn>
</Sheet>}

{modal==="editAcc"&&editAccForm&&<Sheet onClose={()=>setModal(null)} title="Editar cuenta">
  <Lbl>Nombre</Lbl><Inp type="text" value={editAccForm.name} onChange={e=>setEditAccForm({...editAccForm,name:e.target.value})}/>
  <Lbl>Tipo</Lbl><Sel value={editAccForm.type} onChange={e=>setEditAccForm({...editAccForm,type:e.target.value})}><option value="bank">Cuenta bancaria</option><option value="credit">Tarjeta de crédito</option><option value="wallet">Billetera</option></Sel>
  <Lbl>Saldo inicial (₲)</Lbl><Inp type="number" value={editAccForm.initialBalance} onChange={e=>setEditAccForm({...editAccForm,initialBalance:e.target.value})}/>
  <Btn onClick={saveAcc}>Guardar cambios</Btn>
</Sheet>}

{modal==="addRec"&&<Sheet onClose={()=>setModal(null)} title="Nuevo trabajo por cobrar">
  <Lbl>Cliente</Lbl><Inp type="text" placeholder="Nombre del cliente" value={recForm.client} onChange={e=>setRecForm({...recForm,client:e.target.value})}/>
  <Lbl>Concepto</Lbl><Inp type="text" placeholder="Ej: Diseño, Consultoría" value={recForm.concept} onChange={e=>setRecForm({...recForm,concept:e.target.value})}/>
  <Lbl>Monto (₲)</Lbl><Inp type="number" placeholder="0" value={recForm.amount} onChange={e=>setRecForm({...recForm,amount:e.target.value})}/>
  <Lbl>Vencimiento (opcional)</Lbl><Inp type="date" value={recForm.dueDate} onChange={e=>setRecForm({...recForm,dueDate:e.target.value})}/>
  <Lbl>Notas (opcional)</Lbl><Inp type="text" placeholder="Ej: Acordado por WhatsApp" value={recForm.notes} onChange={e=>setRecForm({...recForm,notes:e.target.value})}/>
  <Btn onClick={addRec}>Guardar</Btn>
</Sheet>}

{modal==="cats"&&<Sheet onClose={()=>setModal(null)} title="Categorías">
  <Toggle val={catType} onChange={v=>{setCatType(v);setEditCat(null);setNewCat("");}}/>
  {curCats.map(cat=>(
    <div key={cat} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:`1px solid ${BD}`}}>
      {editCat===cat
        ?<input autoFocus style={{flex:1,padding:"5px 8px",border:`1px solid rgba(0,0,0,0.18)`,borderRadius:6,fontSize:14,background:BGS,color:TX}} defaultValue={cat} onBlur={e=>renameCat(cat,e.target.value)} onKeyDown={e=>{if(e.key==="Enter")renameCat(cat,e.target.value);if(e.key==="Escape")setEditCat(null);}}/>
        :<span style={{flex:1,fontSize:14,color:TX}}>{EMOJI[cat]||"📌"} {cat}</span>
      }
      <button style={{background:"none",border:"none",color:TXS,cursor:"pointer",fontSize:14,padding:"4px 6px"}} onClick={()=>setEditCat(cat)}>✏️</button>
      <button style={{background:"none",border:"none",color:R,cursor:"pointer",fontSize:14,padding:"4px 6px"}} onClick={()=>delCat(cat)}>✕</button>
    </div>
  ))}
  <div style={{display:"flex",gap:8,marginTop:14}}>
    <input style={{flex:1,padding:"8px 10px",border:`1px solid rgba(0,0,0,0.18)`,borderRadius:8,fontSize:14,background:BGS,color:TX}} placeholder="Nueva categoría..." value={newCat} onChange={e=>setNewCat(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCat()}/>
    <button style={{padding:"8px 16px",background:G,color:"#fff",border:"none",borderRadius:8,fontWeight:500,cursor:"pointer"}} onClick={addCat}>Agregar</button>
  </div>
</Sheet>}
```

  </div>;
}
