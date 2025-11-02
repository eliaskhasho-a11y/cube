// Experimental placeholder solver: very naive heuristic for demo purposes.
// Provides same API as a Kociemba worker would: postMessage({type:'solve', state}) => {type:'solution', moves, note}
self.onmessage = (e)=>{
  const { type, state } = e.data || {};
  if(type !== 'solve'){ return; }
  // For demo, if state looks solved, return empty
  const solved = isSolved(state);
  if(solved){
    postMessage({ type:'solution', moves:[], note:'Already solved' });
    return;
  }
  // Very naive: return a canned example to show UI working.
  // In production, replace this worker file with a Kociemba implementation.
  const demo = ["R","U","R'","U'","F","R","U","R'","U'","F'"];
  postMessage({ type:'solution', moves: demo, note: 'Experimental solver (demo). Replace solver_worker.js with Kociemba for optimal solutions.' });
};

function isSolved(state){
  if(!state) return false;
  // state: object {U: [9 letters], R: [...], F: [...], D: [...], L: [...], B: [...]}
  const faces = ["U","R","F","D","L","B"];
  for(const f of faces){
    const arr = state[f] || [];
    if(arr.length !== 9) return false;
    if(!arr.every(x=>x===arr[0])) return false;
  }
  return true;
}