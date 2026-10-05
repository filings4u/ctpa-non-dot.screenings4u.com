import { createClient } from 'npm:@supabase/supabase-js@2';

const U=Deno.env.get('SUPABASE_URL')!;
const K=(Deno.env.get('SUPABASE_SECRET_KEY')||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))!;
const db=createClient(U,K,{auth:{persistSession:false}});
const H={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type, x-supabase-api-version','Access-Control-Allow-Methods':'POST, OPTIONS'};
const J=(x:any,s=200)=>new Response(JSON.stringify(x),{status:s,headers:H});
const validEmail=(v:any)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||'').trim());
const clean=(v:any,n=10000)=>String(v??'').trim().slice(0,n);

async function ctx(req:Request,membershipId=''){
  const jwt=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
  const {data:{user},error}=await db.auth.getUser(jwt);if(error||!user)return null;
  const {data,error:me}=await db.from('organization_memberships').select('id,tenant_id,organization_id,status,is_primary,roles(code),organizations(organization_type,legal_name)').eq('user_id',user.id).eq('status','active').order('is_primary',{ascending:false}).order('created_at',{ascending:true});if(me)throw me;
  const all=(data||[]) as any[];
  const platform=all.find(m=>m.roles?.code==='platform_admin');if(platform&&!membershipId)return{user,m:platform,portal:'admin'};
  const candidates=membershipId?all.filter(m=>m.id===membershipId):all;
  for(const m of candidates){const role=m.roles?.code,type=m.organizations?.organization_type;let portal:string|null=null;
    if(type==='employer'&&['employer_admin','der','supervisor','hr_admin'].includes(role))portal='employer';
    else if(type==='employer'&&role==='employee')portal='employee';
    else if(type==='ctpa'&&['ctpa_admin','ctpa_staff'].includes(role))portal='ctpa';
    else if(role==='platform_admin')portal='admin';
    if(portal)return{user,m,portal};
  }
  return null;
}

async function sendEmail(p:any){
  const r=await fetch(`${U}/functions/v1/workforce-email`,{method:'POST',headers:{Authorization:`Bearer ${K}`,'Content-Type':'application/json'},body:JSON.stringify(p)});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j?.error||'Email delivery failed.');return j;
}

async function adminRecipients(){
  const r=await db.from('organization_memberships').select('user_id,tenant_id,status,roles(code)').eq('status','active');if(r.error)throw r.error;
  const rows=(r.data||[]).filter((x:any)=>x.roles?.code==='platform_admin'),seen=new Set<string>(),out:any[]=[];
  for(const x of rows as any[]){if(seen.has(x.user_id))continue;seen.add(x.user_id);const u=await db.auth.admin.getUserById(x.user_id);const email=u.data.user?.email;if(validEmail(email))out.push({user_id:x.user_id,tenant_id:x.tenant_id,email:String(email).toLowerCase()});}
  return out;
}

function countTickets(rows:any[]){
  const c={open:0,in_progress:0,waiting_customer:0,resolved:0};
  for(const t of rows){const s=String(t.status||'open').toLowerCase();if(s==='in_progress')c.in_progress++;else if(s==='waiting_customer')c.waiting_customer++;else if(['resolved','closed','complete','completed'].includes(s))c.resolved++;else c.open++;}
  return c;
}

Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:H});
  if(req.method!=='POST')return J({error:'Method not allowed.'},405);
  try{
    const b=await req.json().catch(()=>({})),action=String(b.action||'list');
    const c=await ctx(req,clean(b.membership_id,100));if(!c)return J({error:'Active DOT portal account access required.'},403);
    if(action==='create'){
      const subject=clean(b.subject,180),message=clean(b.message||b.description,10000);if(!subject||!message)return J({error:'Subject and message are required.'},400);
      const priority=clean(b.priority||'normal',20),category=clean(b.category||'general',80);if(!['low','normal','high','urgent'].includes(priority))return J({error:'Invalid support priority.'},400);
      const replyEmail=clean(b.email||c.user.email,320).toLowerCase();if(!validEmail(replyEmail))return J({error:'A valid reply-to email is required.'},400);
      const meta={
        page_url:clean(b.page_url,2000)||null,
        page_title:clean(b.page_title,300)||null,
        portal_page:clean(b.portal_page,100)||null,
        detected_error:clean(b.detected_error,12000)||null,
        console_error:clean(b.console_error,20000)||null,
        reply_email:replyEmail,
        preferred_contact:clean(b.preferred_contact||'email',30),
        user_agent:req.headers.get('user-agent')||null
      };
      const {data,error}=await db.from('support_tickets').insert({tenant_id:c.m.tenant_id,organization_id:c.m.organization_id,user_id:c.user.id,portal:c.portal,category,subject,message,requested_feature:b.requested_feature?clean(b.requested_feature,200):null,priority,metadata:meta}).select().single();if(error)throw error;
      const orgName=clean(c.m.organizations?.legal_name||'Customer',180),ticket=data.ticket_number||data.id;
      let customerOk=false,adminOk=false;
      try{await sendEmail({event_type:'support_ticket_customer_confirmation',to:replyEmail,tenant_id:c.m.tenant_id,recipient_user_id:c.user.id,related_type:'support_ticket',related_id:data.id,variables:{customer_name:clean(c.user.user_metadata?.full_name||c.user.user_metadata?.name||replyEmail,180),organization_name:orgName,ticket_number:ticket,subject,category,priority,message,page_url:meta.page_url||'Not provided'},metadata:{support_ticket_id:data.id,portal:c.portal}});customerOk=true;}catch(e){console.error('support customer email',e);}
      try{
        const admins=await adminRecipients(),results=await Promise.allSettled(admins.map(a=>sendEmail({event_type:'support_ticket_admin_created',to:a.email,tenant_id:a.tenant_id||c.m.tenant_id,recipient_user_id:a.user_id,related_type:'support_ticket',related_id:data.id,variables:{organization_name:orgName,customer_email:replyEmail,portal:c.portal,ticket_number:ticket,subject,category,priority,message,page_url:meta.page_url||'Not provided',detected_error:meta.detected_error||'None captured',console_error:meta.console_error||'None provided'},metadata:{support_ticket_id:data.id,customer_tenant_id:c.m.tenant_id,customer_organization_id:c.m.organization_id}})));
        adminOk=admins.length>0&&results.some(x=>x.status==='fulfilled');
      }catch(e){console.error('support admin email',e);}
      return J({success:true,ticket:data,email_delivery:{customer:customerOk,admin:adminOk}});
    }
    let q=db.from('support_tickets').select('*').order('created_at',{ascending:false}).limit(c.portal==='admin'?250:100);
    if(c.portal!=='admin')q=q.eq('organization_id',c.m.organization_id);
    const {data,error}=await q;if(error)throw error;
    const rows=data||[];return J({portal:c.portal,organization:c.m.organizations,tickets:rows,counts:countTickets(rows)});
  }catch(e){console.error('workforce-support',e);return J({error:e instanceof Error?e.message:'Support request failed.'},500)}
});
