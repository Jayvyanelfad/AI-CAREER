/* CareerPath Guide — reusable, role-aware floating assistant */
(() => {
  'use strict';
  if (window.__careerPathAssistantLoaded || document.body.dataset.assistantDisabled === 'true') return;
  window.__careerPathAssistantLoaded = true;
  const isAdminPage = /\/admin\.html$/.test(location.pathname);
  const routes = [
    { label: 'Find courses', icon: 'fa-book-open', terms: ['course','courses','lesson','module','enroll','enrol','learning'], reply: 'Browse the course catalogue to explore available learning paths.', href: 'courses.html' },
    { label: 'Career test', icon: 'fa-compass', terms: ['career test','assessment','career path','career direction','test result'], reply: 'The Career Test helps you explore possible career directions.', href: 'career-test.html' },
    { label: 'Practise coding', icon: 'fa-code', terms: ['programming','coding','code editor','python','javascript','run code','practice code','practise code'], reply: 'Open the Programming Studio for guided coding practice.', href: 'programming.html' },
    { label: 'Login / Sign up', icon: 'fa-user', terms: ['login','log in','sign in','register','sign up','signup','create account','password'], reply: 'You can sign in or create an account from the account pages.', href: 'login.html' },
    { label: 'Dashboard', icon: 'fa-chart-line', terms: ['dashboard','progress','my learning','my courses'], reply: 'Your dashboard provides your learning overview and progress.', href: 'dashboard.html' },
    { label: 'Profile', icon: 'fa-id-card', terms: ['profile','account settings','change my name','language'], reply: 'Open your profile to review your account details and preferences.', href: 'profile.html' },
    { label: 'Platform tour', icon: 'fa-route', terms: ['demo','tour','show me around','where do i start','how do i use'], reply: 'Take the guided tour to get familiar with CareerPath AI.', href: 'tour.html' },
    { label: 'Contact support', icon: 'fa-life-ring', terms: ['contact','support','human','need help'], reply: 'Open the contact page to find support options.', href: 'contactus.html' }
  ];
  const adminShortcuts = [
    { label: 'User management', icon: 'fa-users', href: 'admin.html#users' },
    { label: 'Career assessments', icon: 'fa-compass', href: 'admin.html#assessments' },
    { label: 'Course management', icon: 'fa-book', href: 'admin.html#courses' },
    { label: 'Analytics', icon: 'fa-chart-column', href: 'admin.html#analytics' }
  ];
  const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const root = document.createElement('section');
  root.id = 'cp-assistant';
  root.className = 'cp-assistant' + (isAdminPage ? ' cp-assistant-admin' : '');
  root.innerHTML = `
    <button class="cp-launcher" type="button" aria-label="Open CareerPath ${isAdminPage ? 'Admin' : 'Guide'}" aria-expanded="false">
      <span class="cp-logo" aria-hidden="true"><svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" stroke-width="2"/><path d="M24 5v7M24 36v7M5 24h7M36 24h7" stroke="currentColor" stroke-width="2"/><rect x="13" y="16" width="22" height="18" rx="6" fill="currentColor"/><circle cx="20" cy="24" r="2" fill="#0d2b21"/><circle cx="28" cy="24" r="2" fill="#0d2b21"/><path d="M20 29h8M24 12v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span>
      <span class="cp-launcher-label">${isAdminPage ? 'Admin help' : 'Need help?'}</span>
    </button>
    <section class="cp-panel" role="dialog" aria-label="${isAdminPage ? 'CareerPath Admin assistant' : 'CareerPath Guide'}" aria-modal="false" hidden>
      <header class="cp-header">
        <span class="cp-logo" aria-hidden="true"><svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" stroke-width="2"/><path d="M24 5v7M24 36v7M5 24h7M36 24h7" stroke="currentColor" stroke-width="2"/><rect x="13" y="16" width="22" height="18" rx="6" fill="currentColor"/><circle cx="20" cy="24" r="2" fill="#0d2b21"/><circle cx="28" cy="24" r="2" fill="#0d2b21"/><path d="M20 29h8M24 12v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span>
        <div class="cp-heading"><strong>${isAdminPage ? 'CareerPath Admin' : 'CareerPath Guide'}</strong><span><i></i>${isAdminPage ? 'Administrator workspace' : 'Here to help you navigate'}</span></div>
        <button class="cp-minimize" type="button" aria-label="Minimize assistant">−</button><button class="cp-close" type="button" aria-label="Close assistant">×</button>
      </header>
      <div class="cp-messages" role="log" aria-live="polite" aria-relevant="additions text"></div>
      <div class="cp-suggestions"></div>
      <form class="cp-form"><input aria-label="Message the assistant" maxlength="4000" placeholder="${isAdminPage ? 'Ask about users, assessments, courses…' : 'Ask me where to go…'}" autocomplete="off"><button type="submit" aria-label="Send message"><svg viewBox="0 0 24 24"><path d="M3 11.5 21 3l-5.5 18-3.4-7.1L3 11.5Zm9.1 2.4L21 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></button></form>
      <p class="cp-footnote">${isAdminPage ? 'Admin guidance · Access-controlled' : 'CareerPath AI · Website guide'}</p>
    </section>`;
  document.body.appendChild(root);
  const panel = root.querySelector('.cp-panel'), launcher = root.querySelector('.cp-launcher');
  const messages = root.querySelector('.cp-messages'), suggestions = root.querySelector('.cp-suggestions'), form = root.querySelector('.cp-form'), input = form.querySelector('input'), send = form.querySelector('button');
  let busy = false, greeted = false;
  function addMessage(role, text, action) {
    const bubble = document.createElement('div'); bubble.className = 'cp-message cp-' + role;
    bubble.textContent = text; messages.appendChild(bubble);
    if (action && action.href) {
      const link = document.createElement('a'); link.className = 'cp-action'; link.href = action.href; link.textContent = action.label || 'Open page'; bubble.appendChild(document.createElement('br')); bubble.appendChild(link);
    }
    messages.scrollTop = messages.scrollHeight;
  }
  function showSuggestions() {
    suggestions.replaceChildren();
    const items = isAdminPage ? adminShortcuts : routes.slice(0, 4).map(r => ({label:r.label,icon:r.icon,href:r.href}));
    items.forEach(item => { const b=document.createElement('button'); b.type='button'; b.className='cp-chip'; b.textContent=item.label; b.addEventListener('click',()=>{ if(isAdminPage){addMessage('assistant','Open the relevant section in the admin workspace.',item);return;} const r=routes.find(x=>x.label===item.label); if(r){addMessage('assistant',r.reply,{href:r.href,label:r.label});} }); suggestions.appendChild(b); });
  }
  function open() { panel.hidden=false; launcher.setAttribute('aria-expanded','true'); if(!greeted){addMessage('assistant',isAdminPage?'Hello, Administrator. I can help you navigate user management, career assessments, courses and analytics. I only show information your account is authorized to access.':'Hi! I’m your CareerPath Guide. I can help you find courses, demos, account pages and coding practice. What would you like to do?');showSuggestions();greeted=true;} input.focus(); }
  function close(){panel.hidden=true;launcher.setAttribute('aria-expanded','false');launcher.focus();}
  launcher.addEventListener('click',()=>panel.hidden?open():close());
  root.querySelector('.cp-close').addEventListener('click',close);
  root.querySelector('.cp-minimize').addEventListener('click',close);
  function localReply(text) {
    const q=text.toLowerCase();
    if(isAdminPage) {
      const item=adminShortcuts.find(x=>q.includes(x.label.toLowerCase().split(' ')[0]) || (x.label==='Analytics'&&q.includes('report')));
      if(item)return {text:'You can open the '+item.label+' section in the administrator workspace.',action:item};
      if(/user|registered|active|account/.test(q))return {text:'Open User management to review the user records available to your administrator account.',action:adminShortcuts[0]};
      if(/assessment|career test|result/.test(q))return {text:'Open Career assessments to review the assessment area available in the admin workspace.',action:adminShortcuts[1]};
      if(/course|enroll|enrol/.test(q))return {text:'Open Course management to review the course area available in the admin workspace.',action:adminShortcuts[2]};
      if(/analytics|report|statistic|metric/.test(q))return {text:'Open Analytics to see the reports currently provided by the admin workspace.',action:adminShortcuts[3]};
      return null;
    }
    const found=routes.find(r=>r.terms.some(t=>q.includes(t)));
    if(found)return {text:found.reply,action:{href:found.href,label:found.label}};
    if(/what can you do|help me|start|lost/.test(q))return {text:'I can help you find courses, take the Career Test, practise coding, manage your profile or contact support.',action:{href:'courses.html',label:'Explore courses'}};
    return null;
  }
  async function submit(text) {
    if(busy || !text.trim())return;
    addMessage('user',text.trim()); input.value='';
    const local=localReply(text.trim());
    if(local){addMessage('assistant',local.text,local.action);return;}
    busy=true;send.disabled=true;const typing=document.createElement('div');typing.className='cp-message cp-assistant cp-typing';typing.textContent='Thinking…';messages.appendChild(typing);messages.scrollTop=messages.scrollHeight;
    try {
      const token=localStorage.getItem('token');
      if(!token)throw new Error('Sign in to use AI-powered answers. The navigation shortcuts work without signing in.');
      const response=await fetch('/api/ai/chat',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({message:text.trim(),assistantMode:isAdminPage?'admin':'student'})});
      const data=await response.json();
      typing.remove();
      if(!response.ok)throw new Error(data.error||'The assistant is temporarily unavailable.');
      addMessage('assistant',data.reply||'I could not prepare an answer. Please try again.');
    } catch(e) {typing.remove();addMessage('assistant',e.message||'The assistant is temporarily unavailable.');}
    finally {busy=false;send.disabled=false;input.focus();}
  }
  form.addEventListener('submit',e=>{e.preventDefault();submit(input.value);});
})();
