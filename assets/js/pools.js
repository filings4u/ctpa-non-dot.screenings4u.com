(()=>{'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pretty=v=>String(v??'—').replaceAll('_',' ').replace(/\b\w/g,x=>x.toUpperCase());
const fmt=v=>v?new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(new Date(v)):'—';
function metric(l,v,n){return `<div class="metric"><small>${esc(l)}</small><strong>${esc(v)}</strong><span>${esc(n)}</span></div>`}
function render(d){
 const pools=d.pools||[],members=(d.pool_memberships||d.memberships||[]).filter(x=>!x.removed_at),programMap=new Map((d.programs||[]).map(x=>[x.id,x]));
 const rows=pools.length?pools.map(p=>{const pr=programMap.get(p.program_id)||{},ms=members.filter(x=>x.pool_id===p.id);return `<tr><td><strong>${esc(p.name||'Pool')}</strong><small>${esc(pretty(p.pool_type||'consortium'))}</small></td><td><strong>${esc(pr.name||'—')}</strong><small>${esc(pr.testing_panel||'Company policy')}</small></td><td>${ms.length}</td><td>${p.drug_testing_rate==null?'—':esc(p.drug_testing_rate)+'%'}</td><td>${p.alcohol_testing_rate==null?'—':esc(p.alcohol_testing_rate)+'%'}</td><td>${esc(pretty(p.selection_schedule||'—'))}</td><td>${esc(pretty(p.status||'active'))}</td><td><a class="mini-btn primary" href="/pool-detail.html?id=${encodeURIComponent(p.id)}">View</a></td></tr>`}).join(''):'<tr><td colspan="8"><div class="empty">No random pools have been created yet.</div></td></tr>';
 return `<div class="metrics">${metric('Pools',pools.length,'Workplace random pools')}${metric('Current Members',members.length,'People currently in pools')}${metric('Programs',(d.programs||[]).length,'Available workplace programs')}${metric('Managed Employers',(d.employers||[]).length,'Client companies')}</div>
 <div class="notice"><strong>Random pool management:</strong> Pools follow company policy. Add eligible people, set selection frequency, and manage testing rates from each pool.</div>
 <section class="panel section"><div class="panel-head"><div><h2>Random Pools</h2><p>Manage workplace random testing pools across your client Employers.</p></div></div><div class="table-wrap"><table><thead><tr><th>Pool</th><th>Program</th><th>Members</th><th>Drug Rate</th><th>Alcohol Rate</th><th>Schedule</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}
function bind(){}
window.PortalPools={render,bind};
})();