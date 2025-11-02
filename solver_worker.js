
self.onmessage = (e)=>{
  const { type, state } = e.data || {};
  if(type !== 'solve'){ return; }
  const solved = isSolved(state);
  if(solved){ postMessage({ type:'solution', moves:[], note:'Already solved' }); return; }
  const demo = ["R","U","R'","U'","F","R","U","R'","U'","F'"];
  postMessage({ type:'solution', moves: demo, note: 'Experimental solver (demo). Replace with Kociemba for optimal solutions.' });
};
function isSolved(state){
  if(!state) return false;
  const faces = ["U","R","F","D","L","B"];
  for(const f of faces){
    const arr = state[f] || [];
    if(arr.length !== 9) return false;
    if(!arr.every(x=>x===arr[0])) return false;
  }
  return true;
}
