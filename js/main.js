/* KubeConfess — the confession
   0) theme toggle (persisted)
   1) the hero "statement" typer, ending in a GUILTY stamp
   2) terminal typewriter engine for the charge demos
   3) the attack-graph reveal
*/

function sleep(ms){return new Promise(function(r){setTimeout(r,ms);});}
var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 0. theme ---------- */
var TKEY='kubeconfess-theme';
function stored(){try{return localStorage.getItem(TKEY);}catch(e){return null;}}
function save(t){try{localStorage.setItem(TKEY,t);}catch(e){}}
function sysDark(){return !!(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);}
function eff(){var s=stored();return (s==='light'||s==='dark')?s:(sysDark()?'dark':'light');}
function paint(btn,t){
  if(!btn)return;
  if(t==='dark'){btn.classList.add('show-sun');btn.classList.remove('show-moon');btn.setAttribute('aria-label','Switch to light theme');}
  else{btn.classList.add('show-moon');btn.classList.remove('show-sun');btn.setAttribute('aria-label','Switch to dark theme');}
}
function initTheme(){
  var s=stored();
  if(s==='light'||s==='dark')document.documentElement.setAttribute('data-theme',s);
  var btn=document.getElementById('themeToggle');
  paint(btn,eff());
  if(btn)btn.addEventListener('click',function(){
    var n=eff()==='dark'?'light':'dark';
    document.documentElement.setAttribute('data-theme',n);save(n);paint(btn,n);
  });
  if(window.matchMedia){
    var mq=window.matchMedia('(prefers-color-scheme: dark)');
    var f=function(e){if(!stored())paint(btn,e.matches?'dark':'light');};
    if(mq.addEventListener)mq.addEventListener('change',f);else if(mq.addListener)mq.addListener(f);
  }
}

/* ---------- 1. the confession statement ---------- */
/* Each line is HTML (allows the coloured spans). Typed word-by-word so
   it reads like a statement being taken down, then GUILTY thuds on. */
var STATEMENT = [
  'Findings for <span class="subj">cluster prod-eu-1</span>, as established under examination.',
  'A service account in <span class="subj">vulnerable-workloads</span> is bound to <span class="adm">cluster-admin</span> — unrestricted access to every resource.',
  'Its token is auto-mounted into a pod that <span class="adm">runs as root</span>, in privileged mode.',
  'From that pod, the following secrets are readable in plaintext: <span class="term">prod-db-credentials</span>, <span class="term">aws-keys</span>, <span class="term">stripe-key</span>.',
  'Using them, an attacker can reach the <span class="adm">production database</span> and run commands in adjacent pods.',
  'The path was confirmed by carrying it out. Case closed.'
];

function typeStatement(el, guiltyEl){
  if(REDUCED){
    el.innerHTML = STATEMENT.map(function(h){return '<span class="l show">'+h+'</span>';}).join('');
    if(guiltyEl)guiltyEl.classList.add('stamped');
    return;
  }
  el.innerHTML='';
  var idx=0;
  function nextLine(){
    if(idx>=STATEMENT.length){
      // stamp GUILTY over the finished statement
      setTimeout(function(){ if(guiltyEl)guiltyEl.classList.add('stamped'); }, 350);
      return;
    }
    var span=document.createElement('span');
    span.className='l show';
    el.appendChild(span);
    var html=STATEMENT[idx];
    // reveal by word, but keep tags intact: split on spaces outside tags is
    // overkill — instead reveal the whole line's words progressively using a
    // temp holder.
    var words=html.split(' ');
    var i=0;
    (function word(){
      span.innerHTML = words.slice(0,i+1).join(' ');
      i++;
      if(i<words.length){ setTimeout(word, 42); }
      else { idx++; setTimeout(nextLine, 360); }
    })();
  }
  nextLine();
}

/* ---------- 2. terminal engine ---------- */
function Term(el, script){
  this.el=el; this.script=script; this.active=false; this.runId=0;
}
Term.prototype.staticRender=function(){
  this.el.innerHTML='';
  var self=this;
  this.script.forEach(function(l){
    if(l.type==='gap')return;
    var d=document.createElement('div');
    d.className='ln'+(l.cls?' '+l.cls:'')+(l.type==='cmd'?' c':'');
    d.style.opacity=1; d.textContent=l.text||'\u00A0';
    self.el.appendChild(d);
  });
};
Term.prototype.typeCmd=function(l,id){
  var self=this;
  return new Promise(function(res){
    var d=document.createElement('div'); d.className='ln c'; d.style.opacity=1;
    var t=document.createElement('span'); d.appendChild(t);
    var c=document.createElement('span'); c.className='cur'; d.appendChild(c);
    self.el.appendChild(d);
    var s=l.text,i=0;
    (function step(){
      if(id!==self.runId){res();return;}
      if(i>=s.length){c.remove();res();return;}
      t.textContent+=s[i];i++;setTimeout(step,14+Math.random()*22);
    })();
  });
};
Term.prototype.reveal=function(l){
  var d=document.createElement('div'); d.className='ln'+(l.cls?' '+l.cls:'');
  d.textContent=l.text||'\u00A0'; this.el.appendChild(d); return Promise.resolve();
};
Term.prototype.run=async function(id){
  this.el.innerHTML='';
  for(var i=0;i<this.script.length;i++){
    if(id!==this.runId)return;
    var l=this.script[i];
    if(l.type==='cmd')await this.typeCmd(l,id);
    else if(l.type==='gap'){await sleep(l.ms||300);continue;}
    else await this.reveal(l);
    if(id!==this.runId)return;
    await sleep(l.pause!=null?l.pause:90);
  }
  if(id!==this.runId)return;
  await sleep(2600);
  if(id!==this.runId)return;
  this.run(id);
};
Term.prototype.start=function(){ if(REDUCED){this.staticRender();return;} if(this.active)return; this.active=true; this.runId++; this.run(this.runId); };
Term.prototype.stop=function(){ this.active=false; this.runId++; };

var SCRIPTS={
  chat:[
    {type:'cmd',text:'are there any privileged containers?'},
    {type:'out',text:'\u2717 2 workloads flagged',cls:'warn'},
    {type:'out',text:'  vulnerable-workloads/payments-service — privileged: true',cls:'out'},
    {type:'out',text:'  vulnerable-workloads/cicd-runner — runs as root (UID 0)',cls:'out'},
    {type:'gap',ms:450},
    {type:'cmd',text:'what can I do in this cluster?'},
    {type:'out',text:'Permission audit:',cls:'hd'},
    {type:'out',text:'  \u2713 secrets: get, list (all namespaces)',cls:'out'},
    {type:'out',text:'  \u2713 pods/exec · \u2713 create clusterrolebindings',cls:'out'},
    {type:'out',text:'\u26A0 sa-cluster-admin has wildcard access — effectively root',cls:'warn'}
  ],
  incluster:[
    {type:'out',text:'$ kubeconfess --incluster',cls:'dim'},
    {type:'out',text:'\u2713 running in-cluster — using mounted ServiceAccount token',cls:'ok'},
    {type:'gap',ms:350},
    {type:'cmd',text:'scan this pod'},
    {type:'out',text:'\u2717 3 CRITICAL · 8 HIGH',cls:'warn'},
    {type:'out',text:'  container runs as root — no runAsNonRoot set',cls:'out'},
    {type:'out',text:'  hostPath mount /host-tmp — full node filesystem access',cls:'out'},
    {type:'out',text:'  8 secrets exposed in plaintext env vars',cls:'out'},
    {type:'gap',ms:450},
    {type:'cmd',text:'what tokens can I steal?'},
    {type:'out',text:'\u2713 3 static SA tokens found in readable secrets',cls:'ok'},
    {type:'out',text:'  sa-cluster-admin — decoded, kubectl/curl commands ready',cls:'out'},
    {type:'gap',ms:400},
    {type:'cmd',text:'harvest secrets from vulnerable-workloads'},
    {type:'out',text:'\u2713 decoded 6 secret values',cls:'ok'},
    {type:'out',text:'  prod-db-credentials · aws-keys · stripe-key',cls:'warn'},
    {type:'out',text:'\u26A0 production credentials recovered in plaintext',cls:'warn'}
  ],
  investigate:[
    {type:'cmd',text:'investigate pod/pod-fully-compromised -n vulnerable-workloads --graph'},
    {type:'out',text:'\u26A1 tracing identity \u2192 cluster-admin ...',cls:'dim'},
    {type:'out',text:'STARTING POINT',cls:'hd'},
    {type:'out',text:'  sa-cluster-admin — bound to ClusterRole cluster-admin',cls:'out'},
    {type:'out',text:'  container privileged · token automounted',cls:'out'},
    {type:'out',text:'ATTACK PATH',cls:'hd'},
    {type:'out',text:'  1. exec into pod — already running as root',cls:'out'},
    {type:'out',text:'  2. read token from /var/run/secrets/...',cls:'out'},
    {type:'out',text:'  3. create clusterrolebinding using stolen token',cls:'out'},
    {type:'out',text:'\u2713 report written — 4 fixes, ranked by impact',cls:'ok'},
    {type:'out',text:'\u2713 attack graph rendered \u2192 graph.html',cls:'ok'}
  ]
};

/* ---------- 3. attack graph ---------- */
function Graph(root){
  this.root=root; this.order=JSON.parse(root.getAttribute('data-order')||'[]');
  this.active=false; this.runId=0; this.lines={};
  var self=this;
  this.order.forEach(function(s){
    if(s.type!=='edge')return;
    var g=root.querySelector('#'+s.id); if(!g)return;
    var p=g.querySelector('path.ln'); if(!p)return;
    var len=p.getTotalLength(); p.style.strokeDasharray=len;
    self.lines[s.id]={p:p,len:len};
  });
}
Graph.prototype.reset=function(){
  var self=this;
  this.order.forEach(function(s){
    var el=self.root.querySelector('#'+s.id); if(!el)return;
    if(s.type==='node')el.classList.remove('in');
    else{var l=self.lines[s.id]; if(l)l.p.style.strokeDashoffset=l.len; var lb=el.querySelector('.el'); if(lb)lb.classList.remove('in');}
  });
};
Graph.prototype.staticRender=function(){
  var self=this;
  this.order.forEach(function(s){
    var el=self.root.querySelector('#'+s.id); if(!el)return;
    if(s.type==='node')el.classList.add('in');
    else{var l=self.lines[s.id]; if(l)l.p.style.strokeDashoffset=0; var lb=el.querySelector('.el'); if(lb)lb.classList.add('in');}
  });
};
Graph.prototype.run=async function(id){
  this.reset();
  for(var i=0;i<this.order.length;i++){
    if(id!==this.runId)return;
    var s=this.order[i]; var el=this.root.querySelector('#'+s.id);
    if(el){
      if(s.type==='node')el.classList.add('in');
      else{var l=this.lines[s.id]; if(l)l.p.style.strokeDashoffset=0; var lb=el.querySelector('.el'); if(lb)lb.classList.add('in');}
    }
    await sleep(520);
  }
  if(id!==this.runId)return;
  await sleep(3400);
  if(id!==this.runId)return;
  this.run(id);
};
Graph.prototype.start=function(){ if(REDUCED){this.staticRender();return;} if(this.active)return; this.active=true; this.runId++; this.run(this.runId); };
Graph.prototype.stop=function(){ this.active=false; this.runId++; };

/* ---------- boot ---------- */
document.addEventListener('DOMContentLoaded',function(){
  initTheme();

  // confession: type as soon as the hero is on screen
  var st=document.getElementById('statement');
  var guilty=document.getElementById('guilty');
  if(st){
    var started=false;
    var kick=function(){ if(started)return; started=true; typeStatement(st,guilty); };
    if('IntersectionObserver' in window){
      var o=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){kick();o.disconnect();}});},{threshold:0.35});
      o.observe(document.getElementById('confessionDoc'));
    } else { kick(); }
  }

  // terminals + graph, gated on visibility
  var insts=[];
  document.querySelectorAll('[data-script]').forEach(function(n){
    var s=SCRIPTS[n.getAttribute('data-script')]; if(s)insts.push(new Term(n,s));
  });
  var g=document.getElementById('attackGraph'); if(g)insts.push(new Graph(g));

  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){
      es.forEach(function(e){
        var inst=insts.find(function(t){return t.root===e.target||t.el===e.target;});
        if(!inst)return;
        if(e.isIntersecting)inst.start(); else inst.stop();
      });
    },{threshold:0.3});
    insts.forEach(function(t){io.observe(t.root||t.el);});
  } else { insts.forEach(function(t){t.start();}); }

  // copy button
  var btn=document.getElementById('copyBtn'), label=document.getElementById('copyLabel');
  var cmd="git clone https://github.com/arnavtripathy/KubeConfess.git\ncd KubeConfess\npython -m venv .venv && source .venv/bin/activate\npip install .\nexport API_KEY=\"your-api-key-here\"\nkubeconfess --kubeconfig ~/.kube/config\nkubeconfess --incluster";
  if(btn)btn.addEventListener('click',function(){
    try{navigator.clipboard.writeText(cmd).then(function(){label.textContent='Copied';setTimeout(function(){label.textContent='Copy';},1800);}).catch(function(){});}catch(e){}
  });
});
