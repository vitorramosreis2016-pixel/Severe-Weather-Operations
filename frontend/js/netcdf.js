(() => {
  const input = document.querySelector("#netcdf-file");
  const status = document.querySelector("#netcdf-status");
  const details = document.querySelector("#netcdf-details");
  if (!input || !status || !details) return;

  const TYPE = {1:["byte",1],2:["char",1],3:["short",2],4:["int",4],5:["float",4],6:["double",8],7:["ubyte",1],8:["ushort",2],9:["uint",4],10:["int64",8],11:["uint64",8]};
  const align4 = n => (n + 3) & ~3;

  async function readRange(file, start, length) {
    if (length < 0 || length > 64 * 1024 * 1024) throw new Error("A leitura solicitada excede 64 MiB. Selecione uma variável/camada menor.");
    const b = await file.slice(start, start + length).arrayBuffer();
    if (b.byteLength !== length) throw new Error("Não foi possível ler o trecho solicitado do arquivo.");
    return b;
  }

  async function parseHeader(file) {
    const head = await file.slice(0, Math.min(file.size, 16 * 1024 * 1024)).arrayBuffer();
    const v = new DataView(head);
    let p = 0;
    const need = n => { if (p + n > v.byteLength) throw new Error("Cabeçalho NetCDF incompleto ou maior que 16 MiB."); };
    const u32 = () => { need(4); const x = v.getUint32(p); p += 4; return x; };
    const u64 = () => { need(8); const x = Number(v.getBigUint64(p)); p += 8; return x; };
    const name = () => { const n = u32(); need(align4(n)); let s=""; for(let i=0;i<n;i++) s += String.fromCharCode(v.getUint8(p+i)); p += align4(n); return s; };
    const listStart = tag => { const t=u32(), n=u32(); if(t===0 && n===0) return 0; if(t!==tag) throw new Error("Estrutura CDF-2 inválida (tag "+t+")."); return n; };
    const skipAttrs = () => { const n=listStart(12); for(let i=0;i<n;i++){ name(); const type=u32(), count=u32(), sz=TYPE[type]?.[1]; if(!sz) throw new Error("Tipo de atributo não suportado: "+type); const bytes=count*sz; need(align4(bytes)); p+=align4(bytes); } };
    if(v.getUint8(0)!==67 || v.getUint8(1)!==68 || v.getUint8(2)!==70 || v.getUint8(3)!==2) throw new Error("Este leitor de arquivo grande aceita CDF-2 (magic CDF\\x02).");
    p=4; const records=u32();
    const nd=listStart(10), dims=[];
    for(let i=0;i<nd;i++) dims.push({name:name(),size:u32()});
    skipAttrs();
    const nv=listStart(11), vars=[];
    for(let i=0;i<nv;i++){
      const n=name(), rank=u32(), ids=[];
      for(let j=0;j<rank;j++) ids.push(u32());
      skipAttrs();
      const type=u32(), vsize=u32(), begin=u64(), info=TYPE[type];
      if(!info) throw new Error("Tipo de variável não suportado em "+n+": "+type);
      vars.push({name:n,dimIds:ids,type,size:info[1],typeName:info[0],vsize,begin,record:ids.length>0 && dims[ids[0]]?.size===0});
    }
    const recVars=vars.filter(x=>x.record);
    const recordSize=recVars.reduce((s,x)=>s+x.vsize,0);
    for(const d of dims) if(d.size===0) d.size=records;
    for(const x of vars) x.shape=x.dimIds.map(id=>dims[id].size);
    return {dims,vars,records,recordSize};
  }

  async function readVariable(file, meta, variable, record) {
    const shape=variable.shape;
    const count=shape.reduce((a,b)=>a*b,1);
    let offset=variable.begin, length=count*variable.size;
    if(variable.record){
      const recIndex=Math.max(0,Math.min(meta.records-1,record|0));
      offset += recIndex*meta.recordSize;
      length = count/Math.max(1,meta.records)*variable.size;
    }
    const raw=await readRange(file,offset,length);
    const dv=new DataView(raw);
    const vals=[];
    for(let i=0;i<raw.byteLength/variable.size;i++){
      let x;
      switch(variable.type){
        case 1:x=dv.getInt8(i);break; case 2:x=dv.getUint8(i);break;
        case 3:x=dv.getInt16(i*2);break; case 4:x=dv.getInt32(i*4);break;
        case 5:x=dv.getFloat32(i*4);break; case 6:x=dv.getFloat64(i*8);break;
        case 7:x=dv.getUint8(i);break; case 8:x=dv.getUint16(i*2);break;
        case 9:x=dv.getUint32(i*4);break; case 10:x=Number(dv.getBigInt64(i*8));break;
        case 11:x=Number(dv.getBigUint64(i*8));break;
      }
      vals.push(x);
    }
    return vals;
  }

  input.addEventListener("change", async () => {
    const file=input.files?.[0]; if(!file) return;
    details.hidden=true; details.replaceChildren();
    status.textContent="Lendo somente o cabeçalho do arquivo…";
    try {
      if(!file.name.toLowerCase().endsWith(".nc")) throw new Error("Selecione um arquivo .nc.");
      const meta=await parseHeader(file);
      const heading=document.createElement("strong"); heading.textContent=file.name;
      const summary=document.createElement("p"); summary.textContent=(file.size/1024/1024/1024).toFixed(2)+" GiB · CDF-2 · "+meta.dims.length+" dimensões · "+meta.vars.length+" variáveis · "+meta.records+" registros";
      const dim=document.createElement("p"); dim.textContent="Dimensões: "+meta.dims.map(d=>d.name+"="+d.size).join(" · ");
      const label=document.createElement("label"); label.textContent="Variável para leitura parcial";
      const select=document.createElement("select");
      meta.vars.forEach((v,i)=>{const o=document.createElement("option");o.value=i;o.textContent=v.name+" ("+v.shape.join("×")+")";select.append(o);});
      const timeLabel=document.createElement("label"); timeLabel.textContent="Índice do tempo/registro (quando aplicável)";
      const time=document.createElement("input");time.type="number";time.min="0";time.max=String(Math.max(0,meta.records-1));time.value="0";
      const read=document.createElement("button");read.type="button";read.className="button secondary";read.textContent="Ler variável selecionada";
      const output=document.createElement("pre");output.className="fine-print";
      read.addEventListener("click",async()=>{
        const variable=meta.vars[Number(select.value)];
        try{
          status.textContent="Lendo trecho de "+variable.name+"…";
          const values=await readVariable(file,meta,variable,Number(time.value));
          const valid=values.filter(Number.isFinite);
          let min=Infinity,max=-Infinity; for(let i=0;i<Math.min(valid.length,100000);i++){if(valid[i]<min)min=valid[i];if(valid[i]>max)max=valid[i];} if(!valid.length)min=max=NaN;
          output.textContent="Leitura parcial concluída. Valores lidos: "+values.length+"; amostra inicial: "+values.slice(0,12).join(", ")+"; mínimo/máximo da amostra: "+min+" / "+max+".";
          status.textContent="Cabeçalho carregado; trecho da variável lido com sucesso.";
        }catch(e){status.textContent="Não foi possível ler essa variável: "+e.message;output.textContent="Dica: variáveis muito grandes precisam ser reduzidas por dimensão/nível antes da leitura.";}
      });
      details.append(heading,summary,dim,label,select,timeLabel,time,read,output);
      details.hidden=false;
      status.textContent="Metadados carregados sem ler os 2,2 GB. Escolha uma variável para leitura parcial.";
      window.dispatchEvent(new CustomEvent("swo-netcdf-loaded",{detail:{fileName:file.name,dimensions:meta.dims,variables:meta.vars.map(v=>({name:v.name,shape:v.shape,type:v.typeName}))}}));
    }catch(e){console.error("[SWO] NetCDF:",e);status.textContent="Falha na leitura: "+e.message;}
    finally{input.value="";}
  });
  status.textContent="Leitor CDF-2 pronto. O arquivo será acessado por trechos.";
})();