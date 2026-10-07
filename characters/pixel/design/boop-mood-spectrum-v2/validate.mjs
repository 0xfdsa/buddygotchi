import fs from 'node:fs';
import assert from 'node:assert/strict';
if(process.argv.includes('--help')){console.log('Usage: node characters/pixel/design/boop-mood-spectrum-v2/validate.mjs\nChecks node inventory, directed edges, option bounds and ordinary strong connectivity.');process.exit(0);}
const g=JSON.parse(fs.readFileSync(new URL('./mood-graph.json',import.meta.url)));
const names=Object.keys(g.nodes);let count=0;
assert.equal(names.length,13);
for(const [m,node]of Object.entries(g.nodes)){
 const all=[...node.ordinary,...node.dramatic];count+=all.length;
 assert.equal(new Set(all).size,all.length);assert(all.length>=6&&all.length<=8);
 for(const to of all)assert(to!==m&&names.includes(to));
 const seen=new Set([m]),queue=[m];while(queue.length)for(const to of g.nodes[queue.shift()].ordinary)if(!seen.has(to)){seen.add(to);queue.push(to);}
 assert.equal(seen.size,13,`Ordinary graph disconnected from ${m}`);
}
assert.equal(count,98);assert.deepEqual(g.deletedMoods,[]);
assert.equal(new Set([...g.retainedArtMoods,...g.newArtMoods]).size,13);
console.log(JSON.stringify({pass:true,moods:names.length,directedEdges:count,ordinaryStrongConnectivity:true,maxOfferedOptionsIncludingHold:9}));
