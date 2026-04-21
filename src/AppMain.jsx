import React, { useState, useEffect } from "react";
import { initGoogle, signIn, loadFromDrive, saveToDrive, isSignedIn } from "./drive.js";

const CLIENT_ID = "1012373951225-03etd81l508pfupdlrarsvkldn6jnevp.apps.googleusercontent.com";
const INC = ["Aira","Ingreso extra","Mbaeichapa"];
const EXP = ["Colegio nenas","Gastos Santi","Gastos de trabajo","Gastos de la casa","Combustible","Super","Ahorro","Imprevistos"];
const COLORS = ["#5DCAA5","#7F77DD","#378ADD","#D85A30","#D4537E"];
const PIE_C = ["#5DCAA5","#7F77DD","#378ADD","#D85A30","#D4537E","#EF9F27","#97C459","#ED93B1","#85B7EB","#F09595"];
const DEFACCS = [{id:"1",name:"Cuenta principal",type:"bank",balance:0,initialBalance:0,color:COLORS[0]},{id:"2",name:"Tarjeta de credito",type:"credit",balance:0,initialBalance:0,color:COLORS[1]}];
const fmt = n => new Intl.NumberFormat("es-PY",{style:"currency",currency:"PYG",maximumFractionDigits:0}).format(n);
const ICONS = {bank:"🏦",credit:"💳",wallet:"👛"};
const EMOJI = {Combustible:"⛽",Super:"🛒",Ahorro:"🐷",Imprevistos:"⚡",Aira:"💚","Ingreso extra":"✨",Mbaeichapa:"🌟","Colegio nenas":"🏫","Gastos Santi":"👦","Gastos de trabajo":"💼","Gastos de la casa":"🏠"};
const mLabel = m => { if(m==="all") return "Todos"; const [y,mo]=m.split("-"); return ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][+mo-1]+" "+y; };
const G="#1D9E75",GD="#0F6E56",GL="#E1F5EE",R="#D85A30",P="#7F77DD",PD="#534AB7",AM="#854F0B",AML="#FAEEDA";
const BG="#fff",BGS="#f5f5f5",TX="#1a1a1a",TXS="#666",BD="rgba(0,0,0,0.1)";
const KEY="gApp_local";

const ce = React.createElement;

function Pie({data}) {
  if(!data||!data.length) return null;
  const tot=data.reduce((s,d)=>s+d.value,0); if(!tot) return null;
  const cx=100,cy=100,r=80,ir=44; let a=-Math.PI/2;
  const sl=data.map((d,i)=>{
    const p=d.value/tot,a1=a,a2=a+p*2*Math.PI; a=a2;
    const f=(ang,rad)=>[cx+rad*Math.cos(ang),cy+rad*Math.sin(ang)];
    const [x1,y1]=f(a1,r),[x2,y2]=f(a2,r),[ix1,iy1]=f(a1,ir),[ix2,iy2]=f(a2,ir);
    return {label:d.label,p,c:PIE_C[i%PIE_C.length],path:"M "+ix1+" "+iy1+" L "+x1+" "+y1+" A "+r+" "+r+" 0 "+(p>.5?1:0)+" 1 "+x2+" "+y2+" L "+ix2+" "+iy2+" A "+ir+" "+ir+" 0 "+(p>.5?1:0)+" 0 "+ix1+" "+iy1+" Z"};
  });
  return ce("div",null,
    ce("svg",{viewBox:"0 0 200 200",width:"100%",style:{maxWidth:200,display:"block",margin:"0 auto"}},
      sl.map((s,i)=>ce("path",{key:i,d:s.path,fill:s.c,stroke:"#fff",strokeWidth:"1.5"})),
      ce("text",{x:"100",y:"94",textAnchor:"middle",fontSize:"11",fill:TXS},"Total"),
      ce("text",{x:"100",y:"110",textAnchor:"middle",fontSize:"10",fontWeight:"500",fill:TX},fmt(tot))
    ),
    ce("div",{style:{display:"flex",flexWrap:"wrap",gap:"5px 10px",marginTop:10,justifyContent:"center"}},
      sl.map((s,i)=>ce("div",{key:i,style:{display:"flex",alignItems:"center",gap:4}},
        ce("div",{style:{width:9,height:9,borderRadius:2,background:s.c}}),
        ce("span",{style:{fontSize:11,color:TXS}},s.label+" ",ce("b",{style:{color:TX,fontWeight:500}},Math.round(s.p*100)+"%"))
      ))
    )
  );
}

const Sheet = ({onClose,title,children}) =>
  ce("div",{style:{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-end",zIndex:100},onClick:e=>e.target===e.currentTarget&&onClose()},
    ce("div",{style:{background:BG,borderRadius:"20px 20px 0 0",width:"100%",padding:"20px 16px 40px",maxHeight:"88vh",overflowY:"auto",boxSizing:"border-box"}},
      ce("p",{style:{fontSize:17,fontWeight:500,marginBottom:14,color:TX}},title),
      children
    )
  );

export default function App() {
  const [accs,setAccs]=useState(DEFACCS);
  const [txs,setTxs]=useState([]);
  const [recs,setRecs]=useState([]);
  const [iCats,setICats]=useState(INC);
  const [eCats,setECats]=useState(EXP);
  const [view,setView]=useState("home");
  const [selAcc,setSelAcc]=useState(null);
  const [selMonth,setSelMonth]=useState(new Date().toISOString().slice(0,7));
  const [tab,setTab]=useState("todos");
  const [modal,setModal]=useState(null);
  const [catType,setCatType]=useState("gasto");
  const [newCat,setNewCat]=useState("");
  const [editCat,setEditCat]=useState(null);
  const [toast,setToast]=useState("");
  const [status,setStatus]=useState("Iniciando...");
  const [signedIn,setSignedIn]=useState(false);
  const [form,setForm]=useState({type:"gasto",category:"",amount:"",description:"",date:new Date().toISOString().slice(0,10),accountId:null});
  const [accForm,setAccForm]=useState({name:"",type:"bank",initialBalance:""});
  const [recForm,setRecForm]=useState({client:"",concept:"",amount:"",dueDate:"",notes:""});
  const [editAccForm,setEditAccForm]=useState(null);

  const toast_=m=>{setToast(m);setTimeout(()=>setToast(""),3000);};

  const applyData=d=>{
    if(!d) return;
    const a=d.accs||d.accounts; const t=d.txs||d.transactions; const r=d.recs||d.receivables;
    const ic=d.iCats||d.incomeCats; const ec=d.eCats||d.expenseCats;
    if(a) setAccs(a); if(t) setTxs(t); if(r) setRecs(r); if(ic) setICats(ic); if(ec) setECats(ec);
  };

  useEffect(()=>{
    try{const r=localStorage.getItem(KEY);if(r)applyData(JSON.parse(r));}catch{}
    initGoogle(CLIENT_ID).then(()=>setStatus("Conectar con Google Drive")).catch(()=>setStatus("Sin Google"));
  },[]);

  const handleSignIn=async()=>{
    try{
      setStatus("Conectando...");
      await signIn();
      setSignedIn(true);
      setStatus("Cargando desde Drive...");
      const d=await loadFromDrive();
      if(d){applyData(d);toast_("Datos cargados desde Drive");}
      setStatus("Conectado a Drive");
    }catch(e){setStatus("Error: "+e);}
  };

  const save=async(a,t,r,ic,ec)=>{
    const d={accs:a||accs,txs:t||txs,recs:r||recs,iCats:ic||iCats,eCats:ec||eCats,savedAt:new Date().toISOString()};
    try{localStorage.setItem(KEY,JSON.stringify(d));}catch{}
    if(isSignedIn()){try{await saveToDrive(d);}catch{}}
  };

  const months=["all",...Array.from(new Set([...txs.map(t=>t.date&&t.date.slice(0,7)).filter(Boolean),new Date().toISOString().slice(0,7)])).sort((a,b)=>b.localeCompare(a))];
  const vis=(selAcc?txs.filter(t=>t.accountId===selAcc.id):txs).filter(t=>selMonth==="all"||t.date&&t.date.slice(0,7)===selMonth);
  const filt=tab==="todos"?vis:vis.filter(t=>t.type===tab);
  const totBal=accs.filter(a=>a.type!=="credit").reduce((s,a)=>s+a.balance,0);
  const totInc=vis.filter(t=>t.type==="ingreso").reduce((s,t)=>s+t.amount,0);
  const totExp=vis.filter(t=>t.type==="gasto").reduce((s,t)=>s+t.amount,0);
  const totPend=recs.filter(r=>r.status==="pendiente").reduce((s,r)=>s+r.amount,0);
  const pRecs=recs.filter(r=>r.status==="pendiente");
  const oRecs=recs.filter(r=>r.status!=="pendiente");
  const pieData=Object.entries(vis.filter(t=>t.type==="gasto").reduce((m,t)=>Object.assign({},m,{[t.category]:(m[t.category]||0)+t.amount}),{})).sort((a,b)=>b[1]-a[1]).map(e=>({label:e[0],value:e[1]}));
  const curCats=catType==="ingreso"?iCats:eCats;

  const addTx=async()=>{
    const cat=form.category||(form.type==="ingreso"?iCats[0]:eCats[0]);
    const amt=parseInt(form.amount,10); if(!amt||!form.accountId) return;
    const tx={id:String(Date.now()),type:form.type,category:cat,amount:amt,description:form.description,date:form.date,accountId:form.accountId};
    const nt=[tx,...txs],na=accs.map(a=>a.id!==form.accountId?a:Object.assign({},a,{balance:a.balance+(form.type==="ingreso"?amt:-amt)}));
    setTxs(nt);setAccs(na);await save(na,nt);
    setModal(null);setForm({type:"gasto",category:eCats[0]||"",amount:"",description:"",date:new Date().toISOString().slice(0,10),accountId:form.accountId});
  };
  const delTx=async id=>{
    const tx=txs.find(t=>t.id===id);if(!tx)return;
    const nt=txs.filter(t=>t.id!==id),na=accs.map(a=>a.id!==tx.accountId?a:Object.assign({},a,{balance:a.balance-(tx.type==="ingreso"?tx.amount:-tx.amount)}));
    setTxs(nt);setAccs(na);await save(na,nt);
  };
  const addAcc=async()=>{
    if(!accForm.name)return;
    const ib=parseInt(accForm.initialBalance,10)||0;
    const acc={id:String(Date.now()),name:accForm.name,type:accForm.type,balance:ib,initialBalance:ib,color:COLORS[accs.length%COLORS.length]};
    const na=[...accs,acc];setAccs(na);await save(na);
    setAccForm({name:"",type:"bank",initialBalance:""});setModal(null);
  };
  const saveAcc=async()=>{
    if(!editAccForm)return;
    const ib=parseInt(editAccForm.initialBalance,10)||0,diff=ib-(editAccForm._orig||0);
    const na=accs.map(a=>a.id!==editAccForm.id?a:Object.assign({},a,{name:editAccForm.name,type:editAccForm.type,initialBalance:ib,balance:a.balance+diff}));
    setAccs(na);await save(na);setModal(null);
  };
  const addRec=async()=>{
    if(!recForm.client||!recForm.amount)return;
    const r={id:String(Date.now()),client:recForm.client,concept:recForm.concept,amount:parseInt(recForm.amount,10)||0,dueDate:recForm.dueDate,notes:recForm.notes,status:"pendiente",createdAt:new Date().toISOString().slice(0,10)};
    const nr=[r,...recs];setRecs(nr);await save(null,null,nr);
    setRecForm({client:"",concept:"",amount:"",dueDate:"",notes:""});setModal(null);
  };
  const markRec=async(id,s)=>{const nr=recs.map(r=>r.id!==id?r:Object.assign({},r,{status:s}));setRecs(nr);await save(null,null,nr);};
  const delRec=async id=>{const nr=recs.filter(r=>r.id!==id);setRecs(nr);await save(null,null,nr);};
  const addCat=async()=>{
    if(!newCat.trim())return;
    if(catType==="ingreso"){const nc=[...iCats,newCat.trim()];setICats(nc);await save(null,null,null,nc,null);}
    else{const nc=[...eCats,newCat.trim()];setECats(nc);await save(null,null,null,null,nc);}
    setNewCat("");
  };
  const renameCat=async(old,neu)=>{
    if(!neu||!neu.trim()||neu===old){setEditCat(null);return;}
    if(catType==="ingreso"){const nc=iCats.map(c=>c===old?neu.trim():c);const nt=txs.map(t=>t.category===old?Object.assign({},t,{category:neu.trim()}):t);setICats(nc);setTxs(nt);await save(null,nt,null,nc,null);}
    else{const nc=eCats.map(c=>c===old?neu.trim():c);const nt=txs.map(t=>t.category===old?Object.assign({},t,{category:neu.trim()}):t);setECats(nc);setTxs(nt);await save(null,nt,null,null,nc);}
    setEditCat(null);
  };
  const delCat=async cat=>{
    if(catType==="ingreso"){const nc=iCats.filter(c=>c!==cat);setICats(nc);await save(null,null,null,nc,null);}
    else{const nc=eCats.filter(c=>c!==cat);setECats(nc);await save(null,null,null,null,nc);}
  };
  const openTxForm=aid=>{
    setForm({type:"gasto",category:eCats[0]||"",amount:"",description:"",date:new Date().toISOString().slice(0,10),accountId:aid||(accs[0]&&accs[0].id)||null});
    setModal("tx");
  };

  const btn=(label,onClick,col)=>ce("button",{onClick,style:{padding:"12px",background:col||G,color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:500,cursor:"pointer",width:"100%",marginBottom:8}},label);
  const inp=props=>ce("input",Object.assign({},props,{style:{width:"100%",boxSizing:"border-box",marginBottom:8,background:BGS,color:TX,border:"1px solid "+BD,borderRadius:8,padding:"9px 10px",fontSize:15}}));
  const sel=(props,children)=>ce("select",Object.assign({},props,{style:{width:"100%",boxSizing:"border-box",marginBottom:8,background:BGS,color:TX,border:"1px solid "+BD,borderRadius:8,padding:"9px 10px",fontSize:15}}),children);
  const lbl=text=>ce("label",{style:{fontSize:13,color:TXS,marginBottom:4,display:"block",marginTop:6}},text);
  const tog=(val,onChange)=>ce("div",{style:{display:"flex",background:BGS,borderRadius:10,padding:3,marginBottom:12}},
    [["gasto","Gasto",R],["ingreso","Ingreso",G]].map(([v,l,c])=>ce("button",{key:v,onClick:()=>onChange(v),style:{flex:1,padding:"8px",border:"none",borderRadius:8,fontWeight:500,fontSize:14,cursor:"pointer",background:val===v?c:"transparent",color:val===v?"#fff":TXS}},l))
  );

  const importData=()=>{
    const el=document.getElementById("importTA");
    const val=el&&el.value;
    if(!val||!val.trim()){alert("Pega el JSON primero");return;}
    try{
      const s=val.indexOf("{"),e=val.lastIndexOf("}");
      const d=JSON.parse(val.slice(s,e+1));
      applyData(d);
      const a=d.accs||d.accounts||accs;
      const t=d.txs||d.transactions||txs;
      const r=d.recs||d.receivables||recs;
      const ic=d.iCats||d.incomeCats||iCats;
      const ec=d.eCats||d.expenseCats||eCats;
      save(a,t,r,ic,ec);
      alert("Datos importados correctamente");
      el.value="";
    }catch(err){alert("Error: "+err.message);}
  };

  return ce("div",{style:{fontFamily:"system-ui,-apple-system,sans-serif",maxWidth:480,margin:"0 auto",paddingBottom:80,background:BG,minHeight:"100vh"}},
    toast&&ce("div",{style:{position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",background:"#1a1a1a",color:"#fff",fontSize:13,padding:"10px 20px",borderRadius:20,zIndex:200,whiteSpace:"nowrap"}},toast),
    ce("div",{style:{borderBottom:"1px solid "+BD,display:"flex",background:BG}},
      [["home","Finanzas"],["rec","Por cobrar"],["bak","Drive"]].map(([v,l])=>
        ce("button",{key:v,onClick:()=>{setView(v);if(v==="home")setSelAcc(null);},style:{flex:1,padding:"12px 0",border:"none",background:"none",fontWeight:view===v?500:400,fontSize:14,color:view===v?G:TXS,borderBottom:view===v?"2px solid "+G:"2px solid transparent",cursor:"pointer"}},
          l,v==="rec"&&pRecs.length>0&&ce("span",{style:{background:R,color:"#fff",borderRadius:10,fontSize:11,padding:"1px 5px",marginLeft:3}},pRecs.length))
      )
    ),
    ce("div",{style:{textAlign:"center",fontSize:11,color:TXS,padding:"3px 0",background:BGS}},status),

    view==="home"&&ce("div",null,
      selAcc&&ce("div",{style:{padding:"10px 16px 0"}},ce("button",{style:{background:"none",border:"none",color:G,fontSize:14,cursor:"pointer",padding:0},onClick:()=>{setSelAcc(null);setTab("todos");}},"\u2190 Volver")),
      ce("div",{style:{margin:"14px 16px",borderRadius:16,padding:"18px 20px",background:"linear-gradient(135deg,"+G+" 0%,"+GD+" 100%)"}},
        ce("p",{style:{fontSize:12,color:"rgba(255,255,255,0.8)",marginBottom:3}},(selAcc?"Saldo actual":"Saldo total")+" - "+mLabel(selMonth)),
        ce("p",{style:{fontSize:30,fontWeight:500,color:"#fff",margin:0}},fmt(selAcc?selAcc.balance:totBal)),
        ce("div",{style:{display:"flex",gap:8,marginTop:12}},
          [["+"+fmt(totInc),"Ingresos"],["-"+fmt(totExp),"Gastos"],[fmt(totPend),"Por cobrar"]].map(([v,l])=>
            ce("div",{key:l,style:{flex:1,background:"rgba(255,255,255,0.15)",borderRadius:10,padding:"9px 10px"}},
              ce("p",{style:{fontSize:11,color:"rgba(255,255,255,0.75)",margin:0}},l),
              ce("p",{style:{fontSize:13,fontWeight:500,color:"#fff",margin:"2px 0 0"}},v)
            )
          )
        )
      ),
      !selAcc&&ce("div",null,
        ce("p",{style:{fontSize:12,fontWeight:500,color:TXS,padding:"12px 16px 6px",textTransform:"uppercase",letterSpacing:0.5,margin:0}},"Cuentas"),
        accs.map(a=>ce("div",{key:a.id,style:{margin:"0 16px 8px",background:BG,border:"1px solid "+BD,borderRadius:12,padding:"12px 14px",display:"flex",alignItems:"center",gap:12}},
          ce("div",{style:{width:38,height:38,borderRadius:10,background:a.color+"33",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,cursor:"pointer"},onClick:()=>setSelAcc(a)},ICONS[a.type]||"💰"),
          ce("div",{style:{flex:1,cursor:"pointer"},onClick:()=>setSelAcc(a)},
            ce("p",{style:{fontSize:15,fontWeight:500,color:TX,margin:0}},a.name),
            ce("p",{style:{fontSize:12,color:TXS,margin:0}},a.type==="bank"?"Cuenta bancaria":a.type==="credit"?"Tarjeta de credito":"Billetera")
          ),
          ce("div",{style:{textAlign:"right"}},
            ce("p",{style:{fontSize:15,fontWeight:500,color:a.balance>=0?TX:R,margin:0}},fmt(a.balance)),
            ce("p",{style:{fontSize:11,color:TXS,margin:0}},"inicial: "+fmt(a.initialBalance||0))
          ),
          ce("button",{style:{background:"none",border:"none",color:TXS,cursor:"pointer",fontSize:14,padding:"4px 6px"},onClick:()=>{setEditAccForm(Object.assign({},a,{_orig:a.initialBalance||0}));setModal("editAcc");}},"\u270F\uFE0F")
        )),
        accs.length<5&&ce("button",{style:{margin:"4px 16px 0",background:"none",border:"1px dashed rgba(0,0,0,0.18)",borderRadius:12,padding:"10px",width:"calc(100% - 32px)",color:TXS,fontSize:14,cursor:"pointer"},onClick:()=>setModal("addAcc")},"+ Agregar cuenta")
      ),
      ce("div",{style:{display:"flex",gap:6,padding:"10px 16px 2px",overflowX:"auto"}},
        months.map(m=>ce("button",{key:m,style:{padding:"5px 14px",borderRadius:20,border:"none",cursor:"pointer",whiteSpace:"nowrap",fontSize:13,fontWeight:selMonth===m?500:400,background:selMonth===m?G:BGS,color:selMonth===m?"#fff":TXS,flexShrink:0},onClick:()=>setSelMonth(m)},mLabel(m)))
      ),
      ce("div",{style:{fontSize:12,fontWeight:500,color:TXS,padding:"12px 16px 6px",textTransform:"uppercase",letterSpacing:0.5,display:"flex",justifyContent:"space-between",alignItems:"center"}},
        ce("span",null,"Movimientos"),
        ce("div",{style:{display:"flex",gap:8}},
          ce("button",{style:{fontSize:12,color:G,background:"none",border:"none",cursor:"pointer",fontWeight:500},onClick:()=>{setCatType("ingreso");setModal("cats");}},"+ Ingresos"),
          ce("button",{style:{fontSize:12,color:G,background:"none",border:"none",cursor:"pointer",fontWeight:500},onClick:()=>{setCatType("gasto");setModal("cats");}},"+ Gastos")
        )
      ),
      ce("div",{style:{display:"flex",borderBottom:"1px solid "+BD,padding:"0 16px",background:BG}},
        ["todos","ingreso","gasto"].map(t=>ce("button",{key:t,style:{padding:"9px 12px",fontSize:13,border:"none",background:"none",cursor:"pointer",color:tab===t?G:TXS,fontWeight:tab===t?500:400,borderBottom:tab===t?"2px solid "+G:"2px solid transparent"},onClick:()=>setTab(t)},t==="todos"?"Todos":t==="ingreso"?"Ingresos":"Gastos"))
      ),
      filt.length===0?ce("p",{style:{textAlign:"center",color:TXS,padding:"28px 16px",fontSize:14}},"Sin movimientos en "+mLabel(selMonth))
      :filt.map(tx=>{const acc=accs.find(a=>a.id===tx.accountId);return ce("div",{key:tx.id,style:{display:"flex",alignItems:"center",gap:10,padding:"11px 16px",borderBottom:"1px solid "+BD,background:BG}},
        ce("div",{style:{width:36,height:36,borderRadius:9,background:tx.type==="ingreso"?GL:"#FAECE7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}},EMOJI[tx.category]||"📌"),
        ce("div",{style:{flex:1,minWidth:0}},
          ce("p",{style:{fontSize:14,fontWeight:500,color:TX,margin:0}},tx.category),
          ce("p",{style:{fontSize:12,color:TXS,margin:0}},[tx.description,acc&&acc.name,tx.date].filter(Boolean).join(" - "))
        ),
        ce("p",{style:{marginLeft:"auto",fontSize:14,fontWeight:500,color:tx.type==="ingreso"?G:R,whiteSpace:"nowrap"}},(tx.type==="ingreso"?"+":"-")+fmt(tx.amount)),
        ce("button",{style:{background:"none",border:"none",color:TXS,cursor:"pointer",fontSize:14,padding:"4px",marginLeft:4},onClick:()=>delTx(tx.id)},"\u2715")
      );}),
      pieData.length>0&&ce("div",{style:{margin:"16px 16px 8px",background:BG,border:"1px solid "+BD,borderRadius:14,padding:"16px"}},
        ce("p",{style:{fontSize:14,fontWeight:500,color:TX,marginBottom:14,textAlign:"center"}},"Gastos - "+mLabel(selMonth)),
        ce(Pie,{data:pieData})
      )
    ),

    view==="rec"&&ce("div",null,
      ce("div",{style:{margin:"14px 16px",borderRadius:16,padding:"18px 20px",background:"linear-gradient(135deg,"+P+" 0%,"+PD+" 100%)"}},
        ce("p",{style:{fontSize:12,color:"rgba(255,255,255,0.8)",marginBottom:3}},"Total por cobrar"),
        ce("p",{style:{fontSize:30,fontWeight:500,color:"#fff",margin:0}},fmt(totPend)),
        ce("div",{style:{display:"flex",gap:8,marginTop:12}},
          [["Pendientes",pRecs.length],["Cobrados",recs.filter(r=>r.status==="cobrado").length]].map(([l,v])=>
            ce("div",{key:l,style:{flex:1,background:"rgba(255,255,255,0.15)",borderRadius:10,padding:"9px 10px"}},
              ce("p",{style:{fontSize:11,color:"rgba(255,255,255,0.75)",margin:0}},l),
              ce("p",{style:{fontSize:13,fontWeight:500,color:"#fff",margin:"2px 0 0"}},v)
            )
          )
        )
      ),
      pRecs.length>0&&ce("p",{style:{fontSize:12,fontWeight:500,color:TXS,padding:"12px 16px 6px",textTransform:"uppercase",letterSpacing:0.5,margin:0}},"Pendientes"),
      pRecs.map(r=>ce("div",{key:r.id,style:{margin:"0 16px 8px",background:BG,border:"1px solid "+BD,borderRadius:12,padding:"12px 14px"}},
        ce("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}},
          ce("div",null,
            ce("p",{style:{fontSize:15,fontWeight:500,color:TX,margin:0}},r.client),
            r.concept&&ce("p",{style:{fontSize:13,color:TXS,margin:"2px 0 0"}},r.concept),
            r.dueDate&&ce("p",{style:{fontSize:12,color:TXS,margin:"2px 0 0"}},"Vence: "+r.dueDate)
          ),
          ce("div",{style:{textAlign:"right"}},
            ce("p",{style:{fontSize:16,fontWeight:500,color:P,margin:0}},fmt(r.amount)),
            ce("span",{style:{fontSize:11,fontWeight:500,padding:"2px 8px",borderRadius:6,background:AML,color:AM}},r.status)
          )
        ),
        r.notes&&ce("p",{style:{fontSize:12,color:TXS,marginTop:6,marginBottom:0}},r.notes),
        ce("div",{style:{display:"flex",gap:6,marginTop:8}},
          ce("button",{style:{flex:1,padding:"7px",border:"1px solid "+G,borderRadius:8,background:"none",color:G,fontSize:12,fontWeight:500,cursor:"pointer"},onClick:()=>markRec(r.id,"cobrado")},"\u2713 Cobrado"),
          ce("button",{style:{flex:1,padding:"7px",border:"1px solid "+R,borderRadius:8,background:"none",color:R,fontSize:12,fontWeight:500,cursor:"pointer"},onClick:()=>markRec(r.id,"cancelado")},"\u2717 Cancelado"),
          ce("button",{style:{flex:1,padding:"7px",border:"1px solid #888",borderRadius:8,background:"none",color:"#888",fontSize:12,fontWeight:500,cursor:"pointer"},onClick:()=>delRec(r.id)},"Eliminar")
        )
      )),
      oRecs.length>0&&ce("p",{style:{fontSize:12,fontWeight:500,color:TXS,padding:"12px 16px 6px",textTransform:"uppercase",letterSpacing:0.5,margin:0}},"Historial"),
      oRecs.map(r=>ce("div",{key:r.id,style:{margin:"0 16px 8px",background:BG,border:"1px solid "+BD,borderRadius:12,padding:"12px 14px",opacity:0.7}},
        ce("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"}},
          ce("div",null,
            ce("p",{style:{fontSize:14,fontWeight:500,color:TX,margin:0}},r.client),
            r.concept&&ce("p",{style:{fontSize:12,color:TXS,margin:"2px 0 0"}},r.concept)
          ),
          ce("div",{style:{textAlign:"right"}},
            ce("p",{style:{fontSize:14,fontWeight:500,color:TXS,margin:0}},fmt(r.amount)),
            ce("span",{style:{fontSize:11,fontWeight:500,padding:"2px 8px",borderRadius:6,background:r.status==="cobrado"?GL:"#FCEBEB",color:r.status==="cobrado"?GD:"#A32D2D"}},r.status)
          )
        ),
        ce("div",{style:{display:"flex",gap:6,marginTop:8}},
          ce("button",{style:{flex:1,padding:"7px",border:"1px solid "+P,borderRadius:8,background:"none",color:P,fontSize:12,fontWeight:500,cursor:"pointer"},onClick:()=>markRec(r.id,"pendiente")},"Reabrir"),
          ce("button",{style:{flex:1,padding:"7px",border:"1px solid #888",borderRadius:8,background:"none",color:"#888",fontSize:12,fontWeight:500,cursor:"pointer"},onClick:()=>delRec(r.id)},"Eliminar")
        )
      )),
      recs.length===0&&ce("p",{style:{textAlign:"center",color:TXS,padding:"28px 16px",fontSize:14}},"Sin trabajos por cobrar")
    ),

    view==="bak"&&ce("div",null,
      ce("div",{style:{padding:"20px 16px 8px"}},
        ce("p",{style:{fontSize:20,fontWeight:500,color:TX,margin:"0 0 4px"}},"Google Drive"),
        ce("p",{style:{fontSize:14,color:TXS,margin:0}},"Sincroniza tus datos automaticamente.")
      ),
      ce("div",{style:{margin:"12px 16px",background:signedIn?GL:AML,borderRadius:12,padding:"14px"}},
        ce("p",{style:{fontSize:14,fontWeight:500,color:signedIn?GD:AM,margin:"0 0 2px"}},signedIn?"Conectado a Google Drive":"Sin conexion a Drive"),
        ce("p",{style:{fontSize:13,color:signedIn?GD:AM,margin:0}},signedIn?"Los datos se guardan automaticamente.":"Conectate para sincronizar entre dispositivos.")
      ),
      !signedIn&&ce("div",{style:{margin:"12px 16px"}},
        ce("button",{onClick:handleSignIn,style:{width:"100%",padding:"14px",background:G,color:"#fff",border:"none",borderRadius:12,fontSize:16,fontWeight:500,cursor:"pointer"}},"Conectar con Google Drive")
      ),
      signedIn&&ce("div",{style:{margin:"12px 16px",background:BGS,borderRadius:12,padding:"16px",border:"1px solid "+BD}},
        ce("p",{style:{fontSize:13,color:TXS,margin:0}},accs.length+" cuentas - "+txs.length+" movimientos - "+recs.length+" cobros")
      ),
      ce("div",{style:{margin:"12px 16px",background:BGS,borderRadius:12,padding:"16px",border:"1px solid "+BD}},
        ce("p",{style:{fontSize:14,fontWeight:500,color:TX,marginBottom:4}},"Importar datos"),
        ce("p",{style:{fontSize:13,color:TXS,marginBottom:8}},"Pega tu JSON de respaldo para restaurar tus datos."),
        ce("textarea",{id:"importTA",style:{width:"100%",boxSizing:"border-box",marginBottom:8,height:100,resize:"none",fontSize:12,fontFamily:"monospace",background:"#fff",color:TX,border:"1px solid "+BD,borderRadius:8,padding:"9px 10px"},placeholder:"Pega el JSON aqui..."}),
        ce("button",{onClick:importData,style:{width:"100%",padding:"12px",background:G,color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:500,cursor:"pointer"}},"Importar")
      )
    ),

    view!=="bak"&&ce("button",{style:{position:"fixed",bottom:24,right:24,width:54,height:54,borderRadius:27,background:G,border:"none",color:"#fff",fontSize:26,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50},onClick:()=>view==="rec"?setModal("addRec"):openTxForm(selAcc&&selAcc.id)},"+"),

    modal==="tx"&&ce(Sheet,{onClose:()=>setModal(null),title:"Nueva transaccion"},
      tog(form.type,v=>setForm(Object.assign({},form,{type:v,category:(v==="ingreso"?iCats:eCats)[0]||""}))),
      lbl("Cuenta"),sel({value:form.accountId||"",onChange:e=>setForm(Object.assign({},form,{accountId:e.target.value}))},accs.map(a=>ce("option",{key:a.id,value:a.id},a.name))),
      lbl("Categoria"),sel({value:form.category,onChange:e=>setForm(Object.assign({},form,{category:e.target.value}))},(form.type==="ingreso"?iCats:eCats).map(c=>ce("option",{key:c},c))),
      lbl("Monto (Gs)"),inp({type:"number",placeholder:"0",value:form.amount,onChange:e=>setForm(Object.assign({},form,{amount:e.target.value}))}),
      lbl("Descripcion"),inp({type:"text",placeholder:"Ej: Superseis",value:form.description,onChange:e=>setForm(Object.assign({},form,{description:e.target.value}))}),
      lbl("Fecha"),inp({type:"date",value:form.date,onChange:e=>setForm(Object.assign({},form,{date:e.target.value}))}),
      btn("Guardar",addTx)
    ),
    modal==="addAcc"&&ce(Sheet,{onClose:()=>setModal(null),title:"Nueva cuenta"},
      lbl("Nombre"),inp({type:"text",placeholder:"Ej: Itau",value:accForm.name,onChange:e=>setAccForm(Object.assign({},accForm,{name:e.target.value}))}),
      lbl("Tipo"),sel({value:accForm.type,onChange:e=>setAccForm(Object.assign({},accForm,{type:e.target.value}))},
        ce("option",{value:"bank"},"Cuenta bancaria"),ce("option",{value:"credit"},"Tarjeta de credito"),ce("option",{value:"wallet"},"Billetera")
      ),
      lbl("Saldo inicial (Gs)"),inp({type:"number",placeholder:"0",value:accForm.initialBalance,onChange:e=>setAccForm(Object.assign({},accForm,{initialBalance:e.target.value}))}),
      btn("Agregar cuenta",addAcc)
    ),
    modal==="editAcc"&&editAccForm&&ce(Sheet,{onClose:()=>setModal(null),title:"Editar cuenta"},
      lbl("Nombre"),inp({type:"text",value:editAccForm.name,onChange:e=>setEditAccForm(Object.assign({},editAccForm,{name:e.target.value}))}),
      lbl("Tipo"),sel({value:editAccForm.type,onChange:e=>setEditAccForm(Object.assign({},editAccForm,{type:e.target.value}))},
        ce("option",{value:"bank"},"Cuenta bancaria"),ce("option",{value:"credit"},"Tarjeta de credito"),ce("option",{value:"wallet"},"Billetera")
      ),
      lbl("Saldo inicial (Gs)"),inp({type:"number",value:editAccForm.initialBalance,onChange:e=>setEditAccForm(Object.assign({},editAccForm,{initialBalance:e.target.value}))}),
      btn("Guardar cambios",saveAcc)
    ),
    modal==="addRec"&&ce(Sheet,{onClose:()=>setModal(null),title:"Nuevo trabajo por cobrar"},
      lbl("Cliente"),inp({type:"text",placeholder:"Nombre del cliente",value:recForm.client,onChange:e=>setRecForm(Object.assign({},recForm,{client:e.target.value}))}),
      lbl("Concepto"),inp({type:"text",placeholder:"Ej: Diseno",value:recForm.concept,onChange:e=>setRecForm(Object.assign({},recForm,{concept:e.target.value}))}),
      lbl("Monto (Gs)"),inp({type:"number",placeholder:"0",value:recForm.amount,onChange:e=>setRecForm(Object.assign({},recForm,{amount:e.target.value}))}),
      lbl("Vencimiento (opcional)"),inp({type:"date",value:recForm.dueDate,onChange:e=>setRecForm(Object.assign({},recForm,{dueDate:e.target.value}))}),
      lbl("Notas (opcional)"),inp({type:"text",placeholder:"Ej: WhatsApp",value:recForm.notes,onChange:e=>setRecForm(Object.assign({},recForm,{notes:e.target.value}))}),
      btn("Guardar",addRec)
    ),
    modal==="cats"&&ce(Sheet,{onClose:()=>setModal(null),title:"Categorias"},
      tog(catType,v=>{setCatType(v);setEditCat(null);setNewCat("");}),
      curCats.map(cat=>ce("div",{key:cat,style:{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:"1px solid "+BD}},
        editCat===cat
          ?ce("input",{autoFocus:true,style:{flex:1,padding:"5px 8px",border:"1px solid rgba(0,0,0,0.18)",borderRadius:6,fontSize:14,background:BGS,color:TX},defaultValue:cat,onBlur:e=>renameCat(cat,e.target.value),onKeyDown:e=>{if(e.key==="Enter")renameCat(cat,e.target.value);if(e.key==="Escape")setEditCat(null);}})
          :ce("span",{style:{flex:1,fontSize:14,color:TX}},(EMOJI[cat]||"📌")+" "+cat),
        ce("button",{style:{background:"none",border:"none",color:TXS,cursor:"pointer",fontSize:14,padding:"4px 6px"},onClick:()=>setEditCat(cat)},"\u270F\uFE0F"),
        ce("button",{style:{background:"none",border:"none",color:R,cursor:"pointer",fontSize:14,padding:"4px 6px"},onClick:()=>delCat(cat)},"\u2715")
      )),
      ce("div",{style:{display:"flex",gap:8,marginTop:14}},
        ce("input",{style:{flex:1,padding:"8px 10px",border:"1px solid rgba(0,0,0,0.18)",borderRadius:8,fontSize:14,background:BGS,color:TX},placeholder:"Nueva categoria...",value:newCat,onChange:e=>setNewCat(e.target.value),onKeyDown:e=>e.key==="Enter"&&addCat()}),
        ce("button",{style:{padding:"8px 16px",background:G,color:"#fff",border:"none",borderRadius:8,fontWeight:500,cursor:"pointer"},onClick:addCat},"Agregar")
      )
    )
  );
}
