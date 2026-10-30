(()=> {
  const map=document.querySelector("#map-grid");if(!map)return;const canvas=document.createElement("canvas");canvas.id="radar-gl";map.prepend(canvas);const ctx=canvas.getContext("2d");let state= {
    mode:"reflectivity",storms:[]
  };function resize() {
    const r=map.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);canvas.width=r.width*d;canvas.height=r.height*d;draw()
  }
  function draw() {
    const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);if(state.mode==="velocity") {
      ctx.fillStyle="rgba(10,20,45,.2)";ctx.fillRect(0,0,w,h)
    }
    for(const s of state.storms) {
      const x=s.x*w,y=s.y*h,r=Math.min(w,h)*(.13+(s.dbz-45)*.0015);ctx.save();ctx.translate(x,y);ctx.rotate(-.45);if(state.mode==="reflectivity") {
        [[1.5,"rgba(65,190,100,.25)"],[1.2,"rgba(240,205,55,.5)"],[.9,"rgba(235,105,45,.7)"],[.55,"rgba(185,40,90,.88)"],[.28,"rgba(145,65,190,.95)"]].forEach(([k,c])=> {
          ctx.beginPath();ctx.ellipse(0,0,r*k,r*.72*k,0,0,Math.PI*2);ctx.fillStyle=c;ctx.fill()
        });if(s.rotation>.48) {
          ctx.beginPath();ctx.moveTo(r*.5,-r*.1);ctx.bezierCurveTo(r*1.3,0,r*1.5,r*.8,r*.5,r);ctx.lineWidth=r*.24;ctx.strokeStyle="rgba(190,55,115,.8)";ctx.stroke()
        }
      }
      else if(s.rotation>.05) {
        const q=r*(.35+s.rotation*.2);ctx.beginPath();ctx.ellipse(-q*.7,0,q*.72,q*.55,0,0,Math.PI*2);ctx.fillStyle="rgba(35,105,245,.9)";ctx.fill();ctx.beginPath();ctx.ellipse(q*.7,0,q*.72,q*.55,0,0,Math.PI*2);ctx.fillStyle="rgba(245,55,55,.9)";ctx.fill();ctx.fillStyle="white";ctx.font="11px monospace";ctx.fillText("ROT",q,-q)
      }
    }
    ctx.restore();ctx.fillStyle="#eff";ctx.font="11px monospace";ctx.fillText("STORM "+s.id,x+8,y-8)
  }
  ctx.fillStyle="#eaf6f0";ctx.font="11px monospace";ctx.fillText(state.mode==="velocity"?"SRV · BLUE TOWARD / RED AWAY (SCHEMATIC)":"SIMULATED dBZ",12,h-14)
}
window.SWO= {
  updateRadar:s=> {
    state=s;draw()
  }
};new ResizeObserver(resize).observe(map);resize()
})();
