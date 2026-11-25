// Private Cut Phase hosting. The secret is configured only in Cloudflare.
const COOKIE="__Host-cutphase_session", LOGIN="/__cutphase/login", AGE=30*24*60*60;
const enc=new TextEncoder();
const hex=b=>Array.from(new Uint8Array(b),n=>n.toString(16).padStart(2,"0")).join("");
const decode=s=>Uint8Array.from(s.match(/../g)||[],v=>parseInt(v,16));
const key=secret=>crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign","verify"]);
const sign=async(k,v)=>hex(await crypto.subtle.sign("HMAC",k,enc.encode(v)));
const verify=(k,v,s)=>/^[a-f0-9]{64}$/.test(s)&&crypto.subtle.verify("HMAC",k,decode(s),enc.encode(v));
const headers={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY","Referrer-Policy":"no-referrer"};
function login(error=false){
 return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cut Phase · Sign in</title><style>body{background:#121820;color:#f4f5f7;font:17px system-ui;max-width:24rem;margin:15vh auto;padding:1.5rem}input,button{box-sizing:border-box;width:100%;font:inherit;padding:.9rem;margin-top:1rem;border-radius:8px}button{background:#4cbcf2;color:#10202a;border:0;font-weight:bold}label{display:block}</style><h1>Cut Phase</h1><p>Private training log</p>${error?'<p role="alert">Incorrect password. Try again.</p>':''}<form method="post" action="/__cutphase/login"><label>Password<input type="password" name="password" autocomplete="current-password" required maxlength="256"></label><button>Sign in</button></form></html>`,{status:error?401:200,headers:{...headers,"Content-Type":"text/html; charset=utf-8","Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"}});
}
function redirect(cookie){return new Response(null,{status:303,headers:{...headers,Location:"/", "Set-Cookie":cookie}})}
export default {
 async fetch(request,env){
  const secret=env.CUT_PHASE_PASSWORD;
  if(typeof secret!=="string"||secret.length<4)return new Response("Cut Phase is locked until its administrator configures CUT_PHASE_PASSWORD (minimum 4 characters).",{status:503,headers});
  const url=new URL(request.url),k=await key(secret);
  if(url.pathname===LOGIN&&request.method==="POST"){
   if(request.headers.get("Origin")!==url.origin)return new Response("Forbidden",{status:403,headers});
   if(!request.headers.get("Content-Type")?.startsWith("application/x-www-form-urlencoded"))return new Response("Invalid form",{status:400,headers});
   const len=Number(request.headers.get("Content-Length")||0);
   if(len>4096)return new Response("Invalid form",{status:413,headers});
   const body=await request.text();
   if(body.length>4096)return new Response("Invalid form",{status:413,headers});
   const candidate=new URLSearchParams(body).get("password")||"";
   const expected=await sign(k,"password:"+secret);
   if(candidate.length>256||!await verify(k,"password:"+candidate,expected))return login(true);
   const expires=String(Math.floor(Date.now()/1000)+AGE),token=expires+"."+crypto.randomUUID(),sig=await sign(k,"session:"+token);
   return redirect(COOKIE+"="+token+"."+sig+"; Path=/; Max-Age="+AGE+"; Secure; HttpOnly; SameSite=Strict");
  }
  const cookie=(request.headers.get("Cookie")||"").split(";").map(v=>v.trim()).find(v=>v.startsWith(COOKIE+"="))?.slice(COOKIE.length+1)||"";
  const parts=cookie.split(".");
  const authorized=parts.length===3&&/^\d{10}$/.test(parts[0])&&Number(parts[0])>Math.floor(Date.now()/1000)&&await verify(k,"session:"+parts[0]+"."+parts[1],parts[2]);
  if(!authorized){
   if(request.method==="GET"&&(url.pathname==="/"||url.pathname==="/index.html"||url.pathname===LOGIN))return login();
   return new Response("Sign in required",{status:401,headers});
  }
  if(url.pathname===LOGIN)return new Response(null,{status:303,headers:{...headers,Location:"/"}});
  if(request.method!=="GET"&&request.method!=="HEAD")return new Response("Method not allowed",{status:405,headers});
  const asset=await env.ASSETS.fetch(request);
  const out=new Response(asset.body,asset);
  for(const [name,value] of Object.entries(headers))out.headers.set(name,value);
  return out;
 }
};
