(()=>{'use strict';
const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pretty=v=>String(v??'—').replaceAll('_',' ').replace(/\b\w/g,x=>x.toUpperCase());
const id=()=>new URLSearchParams(location.search).get('id')||'';
function activeMembers(d,poolId){return (d.memberships||d.pool_memberships||[]).filter(m=>String(m.pool_id)===String(poolId)&&!m.removed_at)}
function option(v,l,selected=''){return `<option value="${esc(v)}" ${String(v)===String(selected)?'selected':''}>${esc(l)}</option>`}
function render(d){
 const poolId=id(),isCreate=!poolId;
 const employers=(d.employers||[]).filter(x=>!x.archived_at&&String(x.status||'active')!=='inactive');
 const programs=(d.programs||[]).filter(x=>String(x.program_type||'').toUpperCase()==='NON_DOT'&&!x.archived_at);
 const pool=isCreate?null:(d.pools||[]).find(x=>String(x.id)===String(poolId));
 if(!isCreate&&!pool)return `<section class="panel section"><div class="panel-head"><div><h2>Pool Configuration</h2></div><a class="btn secondary" href="/pools.html">Back to Pools</a></div><div class="empty" style="padding:32px">Pool not found.</div></section>`;
 const selectedProgram=pool?programs.find(x=>String(x.id)===String(pool.program_id)):null;
 const selectedEmployer=pool?employers.find(x=>String(x.id)===String(pool.employer_id||selectedProgram?.employer_id)):null;
 const members=pool?activeMembers(d,pool.id):[],locked=members.length>0;
 const ui=d.ui_options||{},schedules=Array.isArray(ui.selection_schedules)&&ui.selection_schedules.length?ui.selection_schedules:['monthly','quarterly','semiannual','annual'],statuses=Array.isArray(ui.pool_statuses)&&ui.pool_statuses.length?ui.pool_statuses:['draft','active','inactive'];
 const empOptions=['<option value="">Select Employer</option>',...employers.map(e=>option(e.id,e.workforce_display_name||e.legal_name||'Employer',selectedEmployer?.id))].join('');
 const programOptions=['<option value="">Select NON-DOT Program</option>',...programs.map(pr=>`<option value="${esc(pr.id)}" data-employer-id="${esc(pr.employer_id)}" data-name="${esc(pr.name||'')}" data-panel="${esc(pr.testing_panel||'')}" data-drug="${esc(pr.drug_random_rate??'')}" data-alcohol="${esc(pr.alcohol_random_rate??0)}" data-frequency="${esc(pr.testing_frequency||'quarterly')}" data-effective="${esc(pr.effective_date||'')}" ${String(pr.id)===String(selectedProgram?.id)?'selected':''}>${esc(pr.name||'Program')}</option>`)].join('');
 const lockedNotice=locked?`<div class="notice danger" style="margin:18px"><strong>Pool locked:</strong> This Pool has ${members.length} current member${members.length===1?'':'s'}. Remove every current member before changing Pool configuration.</div>`:'';
 if(!employers.length)return `<section class="panel section"><div class="panel-head"><div><h2>Create Pool</h2><p>Add a managed Employer before creating a pool.</p></div><a class="btn secondary" href="/pools.html">Back to Pools</a></div><div class="empty" style="padding:32px">No managed Employers are available.</div></section>`;
 return `<section class="panel section pool-form-page"><div class="panel-head"><div><h2>${isCreate?'Create Pool':'Pool Configuration'}</h2><p>${isCreate?'Create a workplace random-testing pool for one of your managed Employers.':'Manage this workplace random-testing pool.'}</p></div><a class="btn secondary" href="/pools.html">Back to Pools</a></div>${lockedNotice}<form id="poolForm" style="padding:18px"><div class="modal-grid">
 <div class="field"><label>Employer</label><select name="employer_id" id="poolEmployer" required ${locked?'disabled':''}>${empOptions}</select></div>
 <div class="field"><label>NON-DOT Program</label><select name="program_id" id="poolProgram" required ${locked?'disabled':''}>${programOptions}</select></div>
 <div class="field full"><label>Pool name</label><input name="name" id="poolName" required value="${esc(pool?.name||selectedProgram?.name||'')}"></div>
 <div class="field"><label>Testing panel</label><input id="poolPanel" value="${esc(selectedProgram?.testing_panel||'Company policy')}" readonly aria-readonly="true"></div>
 <div class="field"><label>Drug random rate</label><input name="drug_testing_rate" id="poolDrug" type="number" min="0" max="100" step="0.1" value="${esc(pool?.drug_testing_rate??selectedProgram?.drug_random_rate??'')}" ${locked?'disabled':''}></div>
 <div class="field"><label>Alcohol random rate</label><input name="alcohol_testing_rate" id="poolAlcohol" type="number" min="0" max="100" step="0.1" value="${esc(pool?.alcohol_testing_rate??selectedProgram?.alcohol_random_rate??0)}" ${locked?'disabled':''}></div>
 <div class="field"><label>Effective date</label><input type="date" name="effective_date" id="poolEffective" required value="${esc(pool?.effective_date||selectedProgram?.effective_date||'')}" ${locked?'disabled':''}></div>
 <div class="field"><label>Selection schedule</label><select name="selection_schedule" id="poolSchedule" required ${locked?'disabled':''}>${schedules.map(x=>option(x,pretty(x),pool?.selection_schedule||selectedProgram?.testing_frequency||'quarterly')).join('')}</select></div>
 <div class="field"><label>Status</label><select name="status" required ${locked?'disabled':''}>${statuses.map(x=>option(x,pretty(x),pool?.status||'active')).join('')}</select></div>
 </div><div class="notice" style="margin-top:18px"><strong>Company policy:</strong> Pool rates and selection frequency are controlled by the Employer’s NON-DOT workplace policy.</div><div class="testing-modal-error" id="poolFormError"></div><div class="modal-actions"><a class="btn ghost" href="/pools.html">Cancel</a>${locked?'':`<button class="btn primary" type="submit">${isCreate?'Create Pool':'Save Pool Configuration'}</button>`}</div></form></section>`;
}
function bind(){
 const form=$('#poolForm');if(!form)return;
 const emp=$('#poolEmployer'),program=$('#poolProgram');
 const syncPrograms=()=>{if(!emp||!program)return;const eid=emp.value;for(const o of [...program.options]){if(!o.value)continue;o.hidden=!!eid&&String(o.dataset.employerId)!==String(eid);if(o.selected&&o.hidden)program.value='';}syncDefaults();};
 const syncDefaults=()=>{if(!program)return;const o=program.selectedOptions[0];if(!o||!o.value)return;const name=$('#poolName'),panel=$('#poolPanel'),drug=$('#poolDrug'),alcohol=$('#poolAlcohol'),freq=$('#poolSchedule'),eff=$('#poolEffective');if(name&&!name.value)name.value=o.dataset.name||'';if(panel)panel.value=o.dataset.panel||'Company policy';if(drug&&!drug.value)drug.value=o.dataset.drug||'';if(alcohol&&!alcohol.value)alcohol.value=o.dataset.alcohol||'0';if(freq&&o.dataset.frequency)freq.value=o.dataset.frequency;if(eff&&!eff.value)eff.value=o.dataset.effective||'';};
 if(emp)emp.onchange=syncPrograms;if(program)program.onchange=syncDefaults;syncPrograms();
 const btn=form.querySelector('button[type=submit]');if(!btn)return;
 form.onsubmit=async e=>{e.preventDefault();const err=$('#poolFormError');btn.disabled=true;const original=btn.textContent;btn.textContent='Saving…';err.textContent='';try{const pool=Object.fromEntries(new FormData(form).entries());if(id())pool.id=id();const r=await window.Portal.invoke('workforce-ctpa-pools',{action:'save_pool',pool});location.href=`/pool-detail.html?id=${encodeURIComponent(r.pool.id)}`}catch(x){err.textContent=x.message||String(x);btn.disabled=false;btn.textContent=original}};
}
window.CtpaPoolForm={render,bind};
})();
