(function(root){
'use strict';
const suppliers=[{name:'Northstar Components',lead:2,otd:94,fill:96},{name:'Meridian Industrial',lead:3,otd:86,fill:91},{name:'Apex Parts',lead:1,otd:97,fill:98},{name:'Harbor Supply',lead:4,otd:81,fill:89}];
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
const sd=a=>Math.sqrt(mean(a.map(x=>(x-mean(a))**2)));
const items=Array.from({length:24},(_,i)=>{const base=12+(i*17)%95,vol=[.12,.32,.65][i%3],history=Array.from({length:16},(_,w)=>Math.max(0,Math.round(base*(1+vol*Math.sin((i+1)*1.7+w*2.1)+.08*Math.cos(w*.8+i))+(i%4===0?w:0))));return {sku:'SKU-'+String(i+1).padStart(3,'0'),category:['Filters','Brakes','Electrical','Cooling'][i%4],supplier:suppliers[i%4].name,lead:suppliers[i%4].lead,cost:8+(i*13)%83,stock:Math.round(base*(.5+(i%7)*.85)),inbound:Math.round(base*(i%3)*.6),history};});
function predict(h,k){return mean(h.slice(-k))}
function mae(h,k){return mean(h.slice(12).map((actual,j)=>Math.abs(actual-predict(h.slice(0,12+j),k))));}
function simulate({demand=100,leadFactor=100,service=95,review=2}={}){
 if(![demand,leadFactor,review].every(Number.isFinite)||demand<0||demand>200||leadFactor<50||leadFactor>200||review<1||review>4||![90,95,98,99].includes(service))throw Error('Invalid scenario');
 const z={90:1.282,95:1.645,98:2.054,99:2.326}[service];
 const rows=items.map(x=>{const e4=mae(x.history,4),e8=mae(x.history,8),window=e4<=e8?4:8,forecast=predict(x.history,window)*demand/100,variation=sd(x.history.slice(-8))*demand/100,lead=x.lead*leadFactor/100,position=x.stock+x.inbound,safety=Math.ceil(z*variation*Math.sqrt(lead)),rop=Math.ceil(forecast*lead+safety),target=Math.ceil(forecast*(lead+review)+z*variation*Math.sqrt(lead+review)),order=position<rop?Math.max(0,target-position):0,cover=forecast>0?x.stock/forecast:null,cv=mean(x.history)>0?sd(x.history)/mean(x.history):0;return {...x,forecast,variation,lead,position,safety,rop,target,order,cover,cv,xyz:cv<=.2?'X':cv<=.5?'Y':'Z',window,validationMAE:Math.min(e4,e8),annualValue:forecast*52*x.cost,risk:forecast===0?'No demand':x.stock<forecast*lead?'Stockout risk':position<rop?'Reorder':position>target*1.5?'Excess':'Healthy'};});
 const sorted=[...rows].sort((a,b)=>b.annualValue-a.annualValue||a.sku.localeCompare(b.sku)),totalValue=sorted.reduce((s,x)=>s+x.annualValue,0);let cumulative=0;for(const x of sorted){const share=totalValue?cumulative/totalValue:0;x.abc=share<.8?'A':share<.95?'B':'C';cumulative+=x.annualValue;}
 const sum=(key,filter=()=>true)=>rows.filter(filter).reduce((s,x)=>s+x[key],0);
 return {rows,suppliers,inventoryValue:rows.reduce((s,x)=>s+x.stock*x.cost,0),purchaseValue:rows.reduce((s,x)=>s+x.order*x.cost,0),atRisk:rows.filter(x=>x.risk==='Stockout risk').length,reorders:rows.filter(x=>x.order>0).length,excess:rows.filter(x=>x.risk==='Excess').length,forecastTotal:sum('forecast'),matrix:['A','B','C'].map(a=>['X','Y','Z'].map(b=>rows.filter(x=>x.abc===a&&x.xyz===b).length))};
}
const api={simulate,items};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SupplyModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
