(() => {
  'use strict';
  const pages = { scan:$('#page-scan'), timer:$('#page-timer'), data:$('#page-data'), coach:$('#page-coach'), cube:$('#page-cube') };
  const tabIds = ['scan','timer','data','coach','cube'];
  tabIds.forEach(id => $('#tab-'+id).addEventListener('click', () => goto(id)));
  function $(q){ return document.querySelector(q); }
  function setActive(id){ tabIds.forEach(x => { $('#tab-'+x).classList.toggle('active', x===id); pages[x].style.display = (x===id)?'block':'none'; }); }
  function goto(id){ setActive(id); if(id!=='scan') stopCamera(); if(id==='cube') drawCube(); }

  // Intro → show app after 3s
  setTimeout(()=>{ $('#intro').style.display='none'; $('#app').style.display='block'; }, 3000);

  // Camera
  const videoEl = $('#video'); const startCamBtn = $('#startCamBtn'); const calibBtn=$('#calibBtn'); const torchBtn=$('#torchBtn'); const statusEl=$('#status');
  let stream=null, track=null, torchOn=false;
  async function startCamera(){
    try{
      statusEl.textContent='Startar kamera...';
      stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'environment' }, audio:false });
      videoEl.srcObject = stream; videoEl.setAttribute('playsinline','true'); await videoEl.play();
      const tracks = stream.getVideoTracks(); track = tracks[0]; const caps = track && track.getCapabilities ? track.getCapabilities() : {};
      torchBtn.style.display = (caps && 'torch' in caps) ? 'inline-flex' : 'none';
      statusEl.textContent='Kamera igång – rikta rutnätet mot en sida';
    }catch(e){ statusEl.textContent='Kunde inte starta kameran. Ge tillstånd i Safari.'; console.warn(e); }
  }
  function stopCamera(){ if(stream){ stream.getTracks().forEach(t=>t.stop()); stream=null; } }
  startCamBtn.addEventListener('click', startCamera);
  torchBtn.addEventListener('click', async ()=>{ try{ if(!track||!track.applyConstraints) return; torchOn=!torchOn; await track.applyConstraints({ advanced:[{torch: torchOn}] }); torchBtn.textContent=torchOn?'Stäng ficklampa':'Ficklampa'; }catch(e){ console.warn(e); } });

  // Sampling/calibration
  const faceSelect=$('#faceSelect'); const captureBtn=$('#captureBtn'); const facesList=$('#facesList'); const canvas=document.createElement('canvas'); const ctx=canvas.getContext('2d');
  function sampleSquare(){ const w=videoEl.videoWidth,h=videoEl.videoHeight; if(!w||!h) return null; const size=Math.min(w,h), sx=(w-size)/2, sy=(h-size)/2; canvas.width=size; canvas.height=size; ctx.drawImage(videoEl,sx,sy,size,size,0,0,size,size); const s=Math.floor(size/20), cx=size/2, cy=size/2; return ctx.getImageData(cx-s, cy-s, s*2, s*2); }
  function grayWorldGain(img){ if(!img) return [1,1,1]; let R=0,G=0,B=0,n=img.data.length/4; for(let i=0;i<img.data.length;i+=4){ R+=img.data[i]; G+=img.data[i+1]; B+=img.data[i+2]; } R/=n; G/=n; B/=n; const avg=(R+G+B)/3||1; return [avg/(R||1), avg/(G||1), avg/(B||1)]; }
  function applyGain([r,g,b],[R,G,B]){ return [Math.min(255,R*r), Math.min(255,G*g), Math.min(255,B*b)]; }
  let calibration = JSON.parse(localStorage.getItem('gcube.calibration')||'null');
  calibBtn.addEventListener('click', ()=>{ const imgd=sampleSquare(); const gain=grayWorldGain(imgd); calibration={gain}; localStorage.setItem('gcube.calibration', JSON.stringify(calibration)); statusEl.textContent='Kalibrerad vitbalans ✓'; setTimeout(()=> statusEl.textContent='Kamera igång – rikta rutnätet mot en sida', 1500); });

  function sampleFaceFromVideo(){ const w=videoEl.videoWidth,h=videoEl.videoHeight; if(!w||!h) return null; const size=Math.min(w,h), sx=(w-size)/2, sy=(h-size)/2; canvas.width=size; canvas.height=size; ctx.drawImage(videoEl,sx,sy,size,size,0,0,size,size); const out=[]; const box=Math.max(6, Math.floor(size/60)); for(let r=0;r<3;r++){ for(let c=0;c<3;c++){ const x=Math.round((c+0.5)*size/3), y=Math.round((r+0.5)*size/3); const imgd=ctx.getImageData(Math.max(0,x-box), Math.max(0,y-box), box*2, box*2); let R=0,G=0,B=0,n=imgd.data.length/4; for(let i=0;i<imgd.data.length;i+=4){ R+=imgd.data[i]; G+=imgd.data[i+1]; B+=imgd.data[i+2]; } let rgb=[R/n,G/n,B/n]; if(calibration && calibration.gain){ rgb = applyGain(calibration.gain, rgb); } out.push(rgb.map(v=>Math.round(v))); } } return out; }
  const palette = { W:[255,255,255], Y:[255,215,0], R:[220,40,40], O:[255,140,0], B:[40,120,255], G:[40,160,80] };
  function nearestColor(rgb){ let best='W', dmin=1e9; for(const k in palette){ const ref=palette[k]; const d=Math.hypot(rgb[0]-ref[0], rgb[1]-ref[1], rgb[2]-ref[2]); if(d<dmin){ dmin=d; best=k; } } return best; }
  function colorToCss(k){ const map={W:'#ffffff',Y:'#ffd700',R:'#dc2828',O:'#ff8c00',B:'#2a78ff',G:'#28a050'}; return map[k]||'#fff'; }
  let capturedFaces = JSON.parse(localStorage.getItem('gcube.faces')||'{}');
  function saveFaces(){ localStorage.setItem('gcube.faces', JSON.stringify(capturedFaces)); renderFacesList(); drawCube(); }
  function renderFacesList(){ facesList.innerHTML=''; const facesOrder=['U','R','F','D','L','B']; for(const face of facesOrder){ const row=document.createElement('div'); row.className='face'; const label=document.createElement('div'); label.innerHTML=`<span class="badge">${face}</span>`; row.appendChild(label); const grid=document.createElement('div'); grid.className='face-grid'; const arr=capturedFaces[face]||Array(9).fill(null); for(let i=0;i<9;i++){ const sw=document.createElement('div'); sw.className='swatch'; const val=arr[i]; sw.style.background = val?colorToCss(val):'#fff'; sw.addEventListener('click', ()=> editSticker(face,i)); grid.appendChild(sw); } row.appendChild(grid); const st=document.createElement('div'); st.className='small'; st.textContent = arr.every(Boolean)?'✅ klar':'• väntar'; row.appendChild(st); facesList.appendChild(row); } }
  function editSticker(face, idx){ const chooser=document.createElement('div'); chooser.style.display='flex'; chooser.style.gap='6px'; ['W','Y','R','O','B','G'].forEach(k=>{ const b=document.createElement('button'); b.textContent=k; b.style.background=colorToCss(k); b.style.borderColor='#ddd'; b.addEventListener('click', ()=>{ capturedFaces[face]=(capturedFaces[face]||Array(9).fill(null)); capturedFaces[face][idx]=k; saveFaces(); chooser.remove(); }); chooser.appendChild(b); }); facesList.parentElement.appendChild(chooser); setTimeout(()=> chooser.scrollIntoView({behavior:'smooth',block:'center'}), 0); }
  $('#captureBtn').addEventListener('click', ()=>{ const colors=sampleFaceFromVideo(); if(!colors){ statusEl.textContent='Ingen bild – starta kameran först'; return; } const mapped=colors.map(nearestColor); const face=faceSelect.value; capturedFaces[face]=mapped; saveFaces(); });

  // Timer
  const timerDisplay=$('#timerDisplay'), startStopBtn=$('#startStopBtn'), resetBtn=$('#resetBtn'), scrambleEl=$('#scramble'), clearTimesBtn=$('#clearTimesBtn');
  let times = JSON.parse(localStorage.getItem('gcube.times')||'[]'); let timerRunning=false, startTime=0;
  function formatTime(s){ if(s==null) return '–'; const m=Math.floor(s/60), sec=s-m*60; return (m?m+':':'')+sec.toFixed(2).padStart(m?5:4,'0'); }
  function mean(a){ return a.reduce((x,y)=>x+y,0)/a.length; }
  function avgTrimmed(a){ const s=a.slice().sort((x,y)=>x-y); return mean(s.slice(1,-1)); }
  function avgN(n){ if(times.length<n) return null; const last = times.slice(-n); return (n>=5)?avgTrimmed(last):mean(last); }
  function updateTimer(){ if(!timerRunning) return; timerDisplay.textContent = formatTime((performance.now()-startTime)/1000); requestAnimationFrame(updateTimer); }
  function toggleTimer(){ if(!timerRunning){ timerRunning=true; startTime=performance.now(); startStopBtn.textContent='Stop'; updateTimer(); } else { timerRunning=false; const t=(performance.now()-startTime)/1000; times.push(parseFloat(t.toFixed(2))); localStorage.setItem('gcube.times', JSON.stringify(times)); startStopBtn.textContent='Start'; scrambleEl.textContent=newScramble(); renderStats(); } }
  function resetTimer(){ timerRunning=false; timerDisplay.textContent='0.00'; startStopBtn.textContent='Start'; }
  function clearTimes(){ if(confirm('Rensa alla tider?')){ times=[]; localStorage.setItem('gcube.times', JSON.stringify(times)); renderStats(); } }
  function renderStats(){ const pb = times.length? Math.min(...times): null; const a5=avgN(5), a12=avgN(12); $('#stats').innerHTML = `<div class="statline"><div>PB: <strong>${formatTime(pb)}</strong></div><div>Ao5: <strong>${formatTime(a5)}</strong></div><div>Ao12: <strong>${formatTime(a12)}</strong></div><div>Antal: <strong>${times.length}</strong></div></div>`; }
  function newScramble(){ const M=['R','L','U','D','F','B'], m=['',"'",'2'], out=[]; let axPrev=null, ax={R:'x',L:'x',U:'y',D:'y',F:'z',B:'z'}; while(out.length<20){ const mv=M[Math.floor(Math.random()*6)], axx=ax[mv]; if(axx===axPrev) continue; axPrev=axx; out.push(mv+m[Math.floor(Math.random()*3)]); } return out.join(' '); }
  startStopBtn.addEventListener('click', toggleTimer);
  resetBtn.addEventListener('click', resetTimer);
  clearTimesBtn.addEventListener('click', clearTimes);

  // Data
  $('#exportBtn').addEventListener('click', ()=>{ const data={faces:capturedFaces,times,calibration}; const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='gcube-data-v3_2.json'; a.click(); URL.revokeObjectURL(url); });
  $('#importInput').addEventListener('change', (e)=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ try{ const obj=JSON.parse(r.result); if(obj.faces) capturedFaces=obj.faces; if(obj.times) times=obj.times; if(obj.calibration) calibration=obj.calibration; localStorage.setItem('gcube.faces', JSON.stringify(capturedFaces)); localStorage.setItem('gcube.times', JSON.stringify(times)); localStorage.setItem('gcube.calibration', JSON.stringify(calibration)); renderFacesList(); renderStats(); alert('Import klar'); }catch(_){ alert('Ogiltig fil'); } }; r.readAsText(f); });

  // Coach
  function renderCoach(){ const list=$('#coachList'); list.innerHTML=''; const a5=avgN(5), a12=avgN(12); const s=[]; if(times.length>=12 && a5 && a12 && a5>a12*1.03) s.push('Fokusera på jämnhet: 5 långsamma solves utan lockups.'); s.push('OLL: Sune & Antisune 3×5'); s.push('PLL: T-perm & U-perm 3×5'); s.forEach(t=>{ const li=document.createElement('li'); li.textContent=t; list.appendChild(li); }); }

  // 3D
  const cubeCanvas=$('#cubeCanvas'); const cubeCtx=cubeCanvas.getContext('2d');
  function drawFace(ctx, x,y, size, colors){ const s=size/3; for(let r=0;r<3;r++){ for(let c=0;c<3;c++){ ctx.fillStyle=colorToCss(colors[r*3+c]||'W'); ctx.fillRect(x+c*s, y+r*s, s-1, s-1); } } ctx.strokeStyle='#888'; ctx.strokeRect(x,y,size,size); }
  function drawCube(){ const w=cubeCanvas.width=340, h=cubeCanvas.height=220; cubeCtx.clearRect(0,0,w,h); const U=capturedFaces.U||Array(9).fill('W'); const F=capturedFaces.F||Array(9).fill('G'); const R=capturedFaces.R||Array(9).fill('R'); drawFace(cubeCtx, 30,10,90,U); drawFace(cubeCtx, 30,110,90,F); drawFace(cubeCtx, 130,110,90,R); }
  function colorToCss(k){ const map={W:'#ffffff',Y:'#ffd700',R:'#dc2828',O:'#ff8c00',B:'#2a78ff',G:'#28a050'}; return map[k]||'#fff'; }

  // Solver demo
  $('#solveBtn').addEventListener('click', ()=>{ const facesOrder=['U','R','F','D','L','B']; for(const f of facesOrder){ if(!capturedFaces[f] || capturedFaces[f].some(x=>!x)){ alert('Skanna och fyll alla 6 sidor först.'); return; } } const demo = ["R","U","R'","U'","F","R","U","R'","U'","F'"]; const list=$('#solutionList'); list.innerHTML=''; demo.forEach((m,i)=>{ const li=document.createElement('li'); li.textContent=`${i+1}. ${m}`; list.appendChild(li); }); $('#solverNote').textContent='Demo-lösning. Byt till Kociemba senare.'; });

  // Install guide
  $('#installBtn').addEventListener('click', ()=>{ alert('Installera: Tryck Dela → Lägg till på hemskärmen'); });

  // Init
  function init(){ setActive('scan'); renderFacesList(); renderStats(); renderCoach(); scrambleEl.textContent=newScramble(); }
  document.addEventListener('DOMContentLoaded', init);
})();