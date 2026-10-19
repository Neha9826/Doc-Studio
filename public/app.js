const $ = id => document.getElementById(id);
const state = { user: null, users: [], docs: [], activeId: null, activeDoc: null, filter: 'all', saveTimer: null, toastTimer: null, lastSavedHtml: '', dirty: false, history: [], aiRange: null, aiSelectedText: '', aiAnswer: '', aiTask: 'ask', aiBusy: false };
const api = async (url, options = {}) => {
  const headers = { ...(options.headers || {}) };
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const response = await fetch(url, { ...options, credentials: 'same-origin', headers });
  if (response.status === 204) return null;
  const type = response.headers.get('content-type') || '';
  const data = type.includes('application/json') ? await response.json().catch(() => ({})) : await response.text();
  if (!response.ok) throw new Error(data?.error || `Request failed (${response.status})`);
  return data;
};
function toast(message) { $('toast').textContent = message; $('toast').classList.add('show'); clearTimeout(state.toastTimer); state.toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2600); }
function setStatus(text, mode = 'saved') { $('saveStatus').textContent = text; const dot = document.querySelector('.saved-indicator i'); if(dot) dot.style.background = mode === 'error' ? '#c46b55' : mode === 'saving' ? '#d1a16a' : '#76a27a'; }
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function timeAgo(date) { const mins = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000)); if (mins < 1) return 'Just now'; if (mins < 60) return `${mins}m ago`; if (mins < 1440) return `${Math.floor(mins/60)}h ago`; return `${Math.floor(mins/1440)}d ago`; }
function currentUser() { return state.user || { name: 'User', email: '' }; }
function showAuth(message = '') { $('appShell').classList.add('hidden'); $('authView').classList.remove('hidden'); $('authError').textContent = message; }
function showApp() { $('authView').classList.add('hidden'); $('appShell').classList.remove('hidden'); }
function authMode(mode) { const signup = mode === 'signup'; $('authNameWrap').classList.toggle('hidden', !signup); $('authName').required = signup; $('authSubmit').textContent = signup ? 'Create account' : 'Sign in'; $('authSwitchText').textContent = signup ? 'Already have an account?' : 'New to Draft?'; $('authSwitch').textContent = signup ? 'Sign in' : 'Create an account'; $('authForm').dataset.mode = mode; $('authError').textContent = ''; }
async function boot() {
  try {
    const result = await api('/api/auth/me'); state.user = result.user; showApp(); updateUserChrome(); await loadUsers(); await refreshDocs();
  } catch { showAuth(); }
}
async function loadUsers() {
  state.users = await api('/api/users');
  $('shareUser').innerHTML = state.users.map(u => `<option value="${u.id}">${esc(u.name)} · ${esc(u.email)}</option>`).join('');
}
function updateUserChrome() { const user = currentUser(); $('sideName').textContent = user.name; $('sideAvatar').textContent = user.name.split(' ').map(n=>n[0]).join('').slice(0,2); $('topAvatar').textContent = user.name.split(' ').map(n=>n[0]).join('').slice(0,2); if($('sideNameTop')) $('sideNameTop').textContent = user.name; $('accountEmail').textContent = user.email || ''; }
async function refreshDocs() { state.docs = await api('/api/documents'); $('allCount').textContent = state.docs.length; renderDocList(); renderRecent(); }
function filteredDocs() { return state.docs.filter(d => state.filter === 'all' || (state.filter === 'owned' ? d.access === 'owned' : d.access === 'shared')); }
function renderDocList() {
  const docs = filteredDocs().slice(0,12);
  $('docList').innerHTML = docs.length ? docs.map(d => `<button class="doc-link ${d.id===state.activeId?'active':''}" data-open="${d.id}"><span class="doc-link-icon">▤</span><span class="doc-link-text"><strong>${esc(d.title)}</strong><span>${d.access==='owned'?'You own this':`Shared · ${esc(d.ownerName)}`}</span></span></button>`).join('') : '<div class="sidebar-empty">No documents here yet.</div>';
}
function renderRecent() {
  const docs = [...state.docs].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,3);
  $('recentGrid').innerHTML = docs.length ? docs.map(d => `<button class="recent-card" data-open="${d.id}"><div class="recent-card-top"><span class="file-glyph">▤</span><span class="card-badge">${d.access==='owned'?'My document':'Shared with me'}</span></div><h3>${esc(d.title)}</h3><p>Edited ${timeAgo(d.updatedAt)}</p><div class="recent-card-bottom"><span class="mini-avatar">${esc((d.access==='owned'?currentUser().name:d.ownerName).split(' ').map(n=>n[0]).join('').slice(0,2))}</span><span>${d.access==='owned'?'You':esc(d.ownerName)}</span></div></button>`).join('') : '<div class="card-empty">No drafts yet. Create your first document to get started.</div>';
}
function showHome() { $('homeView').classList.remove('hidden'); $('editorView').classList.add('hidden'); $('crumbTitle').textContent = state.filter==='owned'?'My documents':state.filter==='shared'?'Shared with me':'All documents'; state.activeId=null; state.activeDoc=null; renderDocList(); }
async function openDoc(id) {
  try {
    const doc = await api(`/api/documents/${id}`); state.activeId=id; state.activeDoc=doc; state.lastSavedHtml=doc.content||'<p></p>'; state.dirty=false;
    $('homeView').classList.add('hidden'); $('editorView').classList.remove('hidden'); $('crumbTitle').textContent=doc.title; $('docTitle').value=doc.title; $('editor').innerHTML=state.lastSavedHtml;
    $('docAccessLabel').textContent=doc.access==='owned'?'Private to you':`Shared by ${doc.ownerName}`; $('lastEdited').textContent=`Edited ${timeAgo(doc.updatedAt)}`; $('editorFooterRight').textContent=doc.permission==='view'?'View-only access':doc.access==='owned'?'Private document':'Shared document';
    $('shareBtn').disabled=doc.access!=='owned'; $('shareBtn').style.opacity=doc.access==='owned'?'1':'.5'; $('deleteBtn').classList.toggle('hidden',doc.access!=='owned'); $('docTitle').readOnly=doc.permission==='view'; $('editor').contentEditable=doc.permission!=='view'; document.querySelectorAll('[data-command],#blockFormat,#fontFamily,#fontSize,#textColor,#highlightColor,#insertTableBtn,#insertLinkBtn,#insertImageBtn,#insertVideoBtn,#insertSymbolBtn').forEach(el=>el.disabled=doc.permission==='view'); $('aiPanel').classList.add('hidden'); $('aiMessages').innerHTML=`<div class="ai-welcome"><span>✦</span><strong>Let's think this through.</strong><p>Ask a question about this document or select text and ask me to improve it. I'll tell you when the document doesn't contain the answer.</p></div>`; $('slashMenu').classList.add('hidden'); state.aiRange = null; state.aiSelectedText = '';
    $('exportBtn').disabled=false; $('historyBtn').disabled=false; updateWordCount(); renderDocList(); setStatus('All changes saved');
  } catch(e) { toast(e.message); }
}
async function createDoc(title='Untitled document', content) {
  try { const doc=await api('/api/documents',{method:'POST',body:JSON.stringify({title})}); if(content) await api(`/api/documents/${doc.id}`,{method:'PATCH',body:JSON.stringify({content})}); await refreshDocs(); await openDoc(doc.id); $('docTitle').focus(); $('docTitle').select(); }
  catch(e) { toast(e.message); }
}
function scheduleSave() { if(state.activeDoc?.permission==='view')return; state.dirty=true; setStatus('Unsaved changes','saving'); clearTimeout(state.saveTimer); state.saveTimer=setTimeout(saveDoc,700); }
async function saveDoc() {
  if(!state.activeId||!state.activeDoc||!state.dirty)return;
  const id=state.activeId, title=$('docTitle').value.trim()||'Untitled document', content=$('editor').innerHTML; setStatus('Saving…','saving');
  try { const doc=await api(`/api/documents/${id}`,{method:'PATCH',body:JSON.stringify({title,content})}); if(state.activeId!==id)return; state.activeDoc=doc; state.lastSavedHtml=doc.content; state.dirty=false; $('crumbTitle').textContent=doc.title; $('lastEdited').textContent=`Edited ${timeAgo(doc.updatedAt)}`; setStatus('All changes saved'); await refreshDocs(); }
  catch(e) { setStatus('Save failed','error'); toast(e.message); }
}
function updateWordCount() { const text=$('editor').innerText.trim(); const count=text?text.split(/\s+/).length:0; $('wordCount').textContent=`${count} ${count===1?'word':'words'}`; }
function openShare() {
  if(!state.activeDoc||state.activeDoc.access!=='owned')return;
  const eligible=state.users.filter(u=>u.id!==state.user.id&&!state.activeDoc.shares.some(s=>s.userId===u.id));
  $('shareUser').innerHTML=eligible.length?eligible.map(u=>`<option value="${u.id}">${esc(u.name)} · ${esc(u.email)}</option>`).join(''):'<option value="">Everyone already has access</option>';
  $('shareForm').querySelector('button').disabled=!eligible.length; $('shareError').textContent=''; renderPeople(); $('shareModal').classList.remove('hidden');
}
function renderPeople() {
  const doc=state.activeDoc; if(!doc)return;
  const people=[{userId:doc.ownerId,name:doc.ownerName,email:state.user.id===doc.ownerId?state.user.email:'',permission:'owner'},...doc.shares];
  $('peopleCount').textContent=people.length;
  $('peopleList').innerHTML=people.map(p=>`<div class="person-row"><span class="person-avatar">${esc(p.name.split(' ').map(n=>n[0]).join('').slice(0,2))}</span><span class="person-info"><strong>${esc(p.name)}${p.userId===state.user.id?' (you)':''}</strong><span>${esc(p.email||'')}</span></span><span class="person-permission">${p.permission==='owner'?'Owner':p.permission==='edit'?'Can edit':'Can view'}</span>${p.permission!=='owner'?`<button class="remove-share" data-remove-share="${p.userId}" aria-label="Remove ${esc(p.name)} access" title="Remove access">×</button>`:''}</div>`).join('');
}
async function deleteActiveDoc() {
  if(!state.activeDoc||state.activeDoc.access!=='owned')return;
  if(state.dirty) { await saveDoc(); if(state.dirty) { toast('Save failed. Resolve the save issue before deleting.'); return; } }
  const title=state.activeDoc.title;
  if(!confirm(`Delete “${title}”? This permanently removes the document, its sharing access, and its saved versions.`))return;
  try { await api(`/api/documents/${state.activeId}`,{method:'DELETE'}); clearTimeout(state.saveTimer); state.dirty=false; state.activeId=null; state.activeDoc=null; showHome(); await refreshDocs(); toast('Document deleted.'); }
  catch(e){toast(e.message);}
}
async function openHistory() {
  if(!state.activeId)return;
  try {
    const versions=await api(`/api/documents/${state.activeId}/versions`);
    $('versionPreview').classList.add('hidden');
    $('historyList').innerHTML=versions.length?versions.map(v=>`<div class="history-row"><div><strong>${esc(v.title)}</strong><span>${new Date(v.createdAt).toLocaleString()} · ${esc(v.createdBy)}</span></div><div class="history-actions"><button class="secondary" data-preview-version="${v.id}">Preview</button><button class="primary" data-restore-version="${v.id}" ${state.activeDoc.permission==='view'?'disabled':''}>Restore</button></div></div>`).join(''):'<p class="form-hint">No previous versions yet. Versions are created when saved content changes.</p>';
    $('historyModal').classList.remove('hidden');
  } catch(e){toast(e.message);}
}
async function downloadExport(format) {
  if(!state.activeId)return;
  if(format==='pdf') {
    if(state.dirty) await saveDoc();
    const title=esc(state.activeDoc.title||'Document');
    const content=$('editor').innerHTML;
    const win=window.open('', '_blank');
    if(!win){toast('Allow pop-ups to print or save as PDF.');return;}
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font:12pt Arial,sans-serif;line-height:1.6;margin:2cm;color:#222}h1,h2,h3{break-after:avoid}img{max-width:100%}blockquote{border-left:3px solid #aaa;padding-left:1em}@page{margin:2cm}</style></head><body><h1>${title}</h1>${content}</body></html>`);
    win.onload=()=>win.print(); win.document.close(); win.focus();
    toast('Choose “Save as PDF” in the print dialog.'); return;
  }
  try {
    if(state.dirty) await saveDoc();
    const response=await fetch(`/api/documents/${state.activeId}/export?format=${encodeURIComponent(format)}`,{credentials:'same-origin'});
    if(!response.ok){const err=await response.json().catch(()=>({}));throw new Error(err.error||'Export failed.');}
    const blob=await response.blob(); const url=URL.createObjectURL(blob); const a=document.createElement('a');
    const ext=format==='doc'?'doc':format==='txt'?'txt':'md';
    a.href=url; a.download=`${(state.activeDoc.title||'document').replace(/[^a-z0-9 _-]/gi,'').trim()||'document'}.${ext}`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000); toast(`${ext.toUpperCase()} export started.`);
  } catch(e){toast(e.message);}
}
function previewVersion(versionId) {
  const row=state.history.find(v=>v.id===versionId); if(!row)return;
  $('previewTitle').textContent=row.title;
  $('previewMeta').textContent=`${new Date(row.createdAt).toLocaleString()} · ${row.createdBy}`;
  $('previewContent').innerHTML=row.content||'<p><em>This version is empty.</em></p>';
  $('previewRestore').dataset.restoreVersion=versionId;
  $('previewRestore').disabled=state.activeDoc.permission==='view';
  $('versionPreview').classList.remove('hidden');
}
async function restoreVersion(versionId) {
  if(!versionId||state.activeDoc.permission==='view')return;
  if(!confirm('Restore this version? Your current content will be saved as a new version first.'))return;
  try{const updated=await api(`/api/documents/${state.activeId}/versions/${versionId}/restore`,{method:'POST'});state.activeDoc=updated;state.lastSavedHtml=updated.content;state.dirty=false;$('docTitle').value=updated.title;$('editor').innerHTML=updated.content;$('crumbTitle').textContent=updated.title;updateWordCount();setStatus('Version restored');await refreshDocs();$('historyModal').classList.add('hidden');toast('Previous version restored.');}
  catch(err){toast(err.message);}
}
function rememberEditorSelection() {
  const selection = window.getSelection();
  if (selection && selection.rangeCount && $('editor').contains(selection.anchorNode)) { state.aiRange = selection.getRangeAt(0).cloneRange(); state.aiSelectedText = selection.toString().trim(); }
}
function selectedEditorText() {
  const selection = window.getSelection();
  return selection && selection.rangeCount && $('editor').contains(selection.anchorNode) ? selection.toString().trim() : (state.aiSelectedText || '');
}
function appendAiMessage(role, text, task = 'ask') {
  const box = $('aiMessages');
  box.querySelector('.ai-welcome')?.remove();
  const article = document.createElement('article'); article.className = `ai-message ${role}`;
  const label = document.createElement('strong'); label.textContent = role === 'user' ? 'You' : 'Ajaia AI';
  const body = document.createElement('div'); body.className = 'ai-message-body'; body.textContent = text;
  article.append(label, body);
  if (role === 'assistant') {
    const actions = document.createElement('div'); actions.className = 'ai-answer-actions';
    const copy = document.createElement('button'); copy.type = 'button'; copy.textContent = 'Copy'; copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(text); toast('AI response copied.'); } catch { toast('Clipboard access is unavailable.'); } });
    actions.append(copy);
    if (['improve','concise','professional','expand'].includes(task) && state.activeDoc?.permission !== 'view') {
      const apply = document.createElement('button'); apply.type = 'button'; apply.className = 'apply-ai-answer'; apply.textContent = state.aiRange ? 'Replace selection' : 'Insert into document';
      apply.addEventListener('click', () => applyAiAnswer(text)); actions.append(apply);
    }
    article.append(actions);
  }
  box.append(article); box.scrollTop = box.scrollHeight;
}
function applyAiAnswer(text) {
  if (state.activeDoc?.permission === 'view') return toast('You have view-only access to this document.');
  const editor = $('editor'); editor.focus();
  let range = state.aiRange;
  if (range && editor.contains(range.commonAncestorContainer)) {
    range.deleteContents();
    const lines = String(text).split('\n'); const fragment = document.createDocumentFragment();
    lines.forEach((line, i) => { if (i) fragment.appendChild(document.createElement('br')); fragment.appendChild(document.createTextNode(line)); });
    range.insertNode(fragment);
  } else {
    const p = document.createElement('p'); p.textContent = text; editor.appendChild(p);
  }
  state.aiRange = null; state.aiSelectedText = ''; state.dirty = true; updateWordCount(); scheduleSave(); toast('AI text added to the document. Review it before sharing.');
}
async function runAi(task, question = '') {
  if (!state.activeId || state.aiBusy) return;
  const selectedText = selectedEditorText();
  if (['improve','concise','professional','expand'].includes(task) && !selectedText) {
    toast('Select text in the document first, then choose an AI writing action.'); return;
  }
  rememberEditorSelection(); state.aiTask = task; if (selectedText) state.aiSelectedText = selectedText; state.aiBusy = true; $('aiSend').disabled = true; $('aiSend').textContent = 'Thinking…';
  if (question) appendAiMessage('user', question);
  const loading = document.createElement('article'); loading.className = 'ai-message assistant ai-loading'; loading.textContent = 'Reading the document…'; $('aiMessages').append(loading); $('aiMessages').scrollTop = $('aiMessages').scrollHeight;
  try {
    if (state.dirty) { await saveDoc(); if (state.dirty) throw new Error('Save your document before asking AI.'); }
    const result = await api(`/api/documents/${state.activeId}/ai`, { method: 'POST', body: JSON.stringify({ task, question, selectedText }) });
    loading.remove(); state.aiAnswer = result.answer; appendAiMessage('assistant', result.answer, task);
  } catch (error) { loading.remove(); appendAiMessage('assistant', error.message, 'ask'); }
  finally { state.aiBusy = false; $('aiSend').disabled = false; $('aiSend').textContent = 'Ask AI ↗'; }
}
function insertAtCursor(html) {
  const editor = $('editor'); editor.focus();
  if (state.aiRange && editor.contains(state.aiRange.commonAncestorContainer)) { const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(state.aiRange); }
  document.execCommand('insertHTML', false, html); state.aiRange = null; state.aiSelectedText = ''; state.dirty = true; updateWordCount(); scheduleSave();
}
function safeHttpUrl(value) { try { const u = new URL(value); return ['http:','https:'].includes(u.protocol) ? u.href : null; } catch { return null; } }
function showSlashMenu() { $('slashMenu').classList.remove('hidden'); }
function hideSlashMenu() { $('slashMenu').classList.add('hidden'); }
// Keep ordered lists predictable across browsers: Enter continues numbering; Enter on an empty item exits the list.
$('editor').addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.shiftKey || state.activeDoc?.permission === 'view') return;
  const selection = window.getSelection();
  if (!selection?.rangeCount || !selection.isCollapsed) return;
  let node = selection.anchorNode;
  if (node?.nodeType === Node.TEXT_NODE) node = node.parentElement;
  const li = node?.closest?.('li');
  const list = li?.parentElement;
  if (!li || !list || !['OL','UL'].includes(list.tagName) || !$('editor').contains(li)) return;
  e.preventDefault();
  const range = selection.getRangeAt(0);
  const tail = range.cloneRange(); tail.selectNodeContents(li); tail.setStart(range.startContainer, range.startOffset);
  const remainder = tail.extractContents();
  if (!li.textContent.trim() && !li.querySelector('img,table')) {
    const p = document.createElement('p'); p.innerHTML = '<br>';
    if (list.children.length === 1) list.replaceWith(p);
    else { li.remove(); list.after(p); }
    const caret = document.createRange(); caret.selectNodeContents(p); caret.collapse(true); selection.removeAllRanges(); selection.addRange(caret);
  } else {
    const next = document.createElement('li');
    if (remainder.childNodes.length) next.appendChild(remainder); else next.innerHTML = '<br>';
    li.after(next);
    const caret = document.createRange(); caret.selectNodeContents(next); caret.collapse(true); selection.removeAllRanges(); selection.addRange(caret);
  }
  scheduleSave(); updateWordCount();
});

$('editor').addEventListener('input', () => {
  if (state.activeDoc?.permission === 'view') return;
  const selection = window.getSelection();
  const node = selection?.anchorNode;
  const text = node?.nodeType === Node.TEXT_NODE ? node.textContent : node?.textContent || '';
  const atStartOfEmptyBlock = node && $('editor').contains(node) && text.trim() === '/' && selection.anchorOffset === 1;
  if (atStartOfEmptyBlock) showSlashMenu(); else hideSlashMenu();
});
$('slashMenu').addEventListener('mousedown', e => e.preventDefault());
$('slashMenu').addEventListener('click', e => {
  const button = e.target.closest('[data-insert-block]'); if (!button) return;
  rememberEditorSelection();
  const selection = window.getSelection();
  if (selection?.rangeCount && $('editor').contains(selection.anchorNode)) {
    const range = selection.getRangeAt(0); const node = range.startContainer;
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() === '/') node.textContent = node.textContent.replace('/', '');
  }
  const kind = button.dataset.insertBlock; hideSlashMenu();
  const html = kind === 'h1' ? '<h1>Heading</h1>' : kind === 'table' ? '<table><tbody><tr><th><p>Header</p></th><th><p>Header</p></th></tr><tr><td><p><br></p></td><td><p><br></p></td></tr></tbody></table><p><br></p>' : kind === 'quote' ? '<blockquote><p>Callout text</p></blockquote><p><br></p>' : kind === 'code' ? '<pre><code>Write code here</code></pre><p><br></p>' : kind === 'hr' ? '<hr><p><br></p>' : '<ul><li>☐ Action item</li><li>☐ Next step</li></ul><p><br></p>';
  insertAtCursor(html);
});

$('aiToggle').addEventListener('click', () => { $('aiPanel').classList.toggle('hidden'); if (!$('aiPanel').classList.contains('hidden')) $('aiQuestion').focus(); });
$('aiClose').addEventListener('click', () => $('aiPanel').classList.add('hidden'));
$('aiForm').addEventListener('submit', async e => { e.preventDefault(); const question = $('aiQuestion').value.trim(); if (!question) return; $('aiQuestion').value = ''; await runAi('ask', question); });
$('aiQuestion').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('aiForm').requestSubmit(); } });
document.querySelectorAll('[data-ai-task]').forEach(button => button.addEventListener('mousedown', rememberEditorSelection));
document.querySelectorAll('[data-ai-task]').forEach(button => button.addEventListener('click', () => runAi(button.dataset.aiTask)));
$('fontFamily').addEventListener('change', e => { $('editor').focus(); if(state.aiRange && $('editor').contains(state.aiRange.commonAncestorContainer)){const sel=window.getSelection();sel.removeAllRanges();sel.addRange(state.aiRange);} document.execCommand('fontName', false, e.target.value); scheduleSave(); });
$('fontSize').addEventListener('change', e => { $('editor').focus(); if(state.aiRange && $('editor').contains(state.aiRange.commonAncestorContainer)){const sel=window.getSelection();sel.removeAllRanges();sel.addRange(state.aiRange);} document.execCommand('fontSize', false, e.target.value); scheduleSave(); });
$('textColor').addEventListener('input', e => { $('editor').focus(); if(state.aiRange && $('editor').contains(state.aiRange.commonAncestorContainer)){const sel=window.getSelection();sel.removeAllRanges();sel.addRange(state.aiRange);} document.execCommand('foreColor', false, e.target.value); scheduleSave(); });
$('highlightColor').addEventListener('input', e => { $('editor').focus(); if(state.aiRange && $('editor').contains(state.aiRange.commonAncestorContainer)){const sel=window.getSelection();sel.removeAllRanges();sel.addRange(state.aiRange);} document.execCommand('hiliteColor', false, e.target.value); scheduleSave(); });
$('insertTableBtn').addEventListener('click', () => { const rows = Math.max(2, Math.min(8, Number(prompt('How many rows? (2–8)', '3')) || 3)); const cols = Math.max(2, Math.min(6, Number(prompt('How many columns? (2–6)', '3')) || 3)); const cell = '<td><p><br></p></td>'; const table = `<table><tbody>${Array.from({length:rows},(_,i)=>`<tr>${Array.from({length:cols},()=>i===0?'<th><p>Header</p></th>':cell).join('')}</tr>`).join('')}</tbody></table><p><br></p>`; insertAtCursor(table); });
$('insertLinkBtn').addEventListener('click', () => { const url = safeHttpUrl(prompt('Enter a link URL (https://…)') || ''); if (!url) return toast('Enter a valid http or https URL.'); const selection = selectedEditorText(); if (selection) insertAtCursor(`<a href="${esc(url)}">${esc(selection)}</a>`); else insertAtCursor(`<a href="${esc(url)}">${esc(url)}</a>`); scheduleSave(); });
$('insertImageBtn').addEventListener('click', () => { const url = safeHttpUrl(prompt('Enter an image URL (https://…)') || ''); if (!url) return toast('Enter a valid image URL.'); const alt = prompt('Image description (alt text):', 'Document image') || 'Document image'; insertAtCursor(`<p><img src="${esc(url)}" alt="${esc(alt)}" style="max-width:100%;height:auto"></p>`); });
$('insertVideoBtn').addEventListener('click', () => { const url = safeHttpUrl(prompt('Paste a video URL (YouTube, Vimeo, or another https link)') || ''); if (!url) return toast('Enter a valid video URL.'); insertAtCursor(`<p>▶ <a href="${esc(url)}">Watch video</a></p>`); });
$('insertSymbolBtn').addEventListener('click', () => { const symbols = ['©','®','™','€','£','¥','±','×','÷','→','←','↔','✓','★','•','§','¶','∞','≤','≥','≠','∑','π','α','β','Ω']; const symbol = prompt(`Choose a symbol:\n${symbols.join('  ')}`, '✓'); if (symbol && symbol.length <= 4) insertAtCursor(esc(symbol)); });

$('authForm').addEventListener('submit',async e=>{
  e.preventDefault(); const mode=$('authForm').dataset.mode; $('authSubmit').disabled=true; $('authError').textContent='';
  try { const body={email:$('authEmail').value.trim(),password:$('authPassword').value}; if(mode==='signup')body.name=$('authName').value.trim(); const result=await api(`/api/auth/${mode}`,{method:'POST',body:JSON.stringify(body)}); state.user=result.user; $('authForm').reset(); showApp(); updateUserChrome(); await loadUsers(); await refreshDocs(); toast(mode==='signup'?'Account created.':'Welcome back.'); }
  catch(err){$('authError').textContent=err.message;} finally{$('authSubmit').disabled=false;}
});
$('authSwitch').addEventListener('click',()=>authMode($('authForm').dataset.mode==='signup'?'login':'signup'));
$('logoutBtn').addEventListener('click',async()=>{try{if(state.dirty)await saveDoc();await api('/api/auth/logout',{method:'POST'});}catch{} state.user=null;state.docs=[];state.activeDoc=null;state.activeId=null;showAuth();authMode('login');toast('Signed out.');});
$('newDoc').addEventListener('click',()=>createDoc()); $('heroNew').addEventListener('click',()=>createDoc()); $('refreshDocs').addEventListener('click',()=>refreshDocs().catch(e=>toast(e.message))); $('seeAll').addEventListener('click',()=>{state.filter='all';document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.filter==='all'));showHome();});
$('backHome').addEventListener('click',async()=>{if(state.dirty)await saveDoc();showHome();});
document.querySelectorAll('.nav-item').forEach(b=>b.addEventListener('click',()=>{state.filter=b.dataset.filter;document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x===b));showHome();}));
document.addEventListener('click',e=>{const target=e.target.closest('[data-open]');if(target)openDoc(target.dataset.open);});
$('docTitle').addEventListener('input',scheduleSave); $('editor').addEventListener('input',()=>{updateWordCount();scheduleSave();});
document.querySelectorAll('[data-command], #insertTableBtn, #insertLinkBtn, #insertImageBtn, #insertVideoBtn, #insertSymbolBtn, #fontFamily, #fontSize, #textColor, #highlightColor').forEach(b=>b.addEventListener('mousedown',e=>{rememberEditorSelection(); if (b.tagName === 'BUTTON') e.preventDefault();})); document.querySelectorAll('[data-command]').forEach(b=>b.addEventListener('click',()=>{$('editor').focus();document.execCommand(b.dataset.command,false,null);scheduleSave();updateWordCount();}));
$('blockFormat').addEventListener('change',e=>{$('editor').focus();document.execCommand('formatBlock',false,e.target.value);scheduleSave();});
$('shareBtn').addEventListener('click',openShare); $('closeShare').addEventListener('click',()=>$('shareModal').classList.add('hidden')); $('shareModal').addEventListener('click',e=>{if(e.target===$('shareModal'))$('shareModal').classList.add('hidden');});
$('shareForm').addEventListener('submit',async e=>{e.preventDefault();try{await saveDoc();const result=await api(`/api/documents/${state.activeId}/share`,{method:'POST',body:JSON.stringify({userId:$('shareUser').value,permission:$('sharePermission').value})});state.activeDoc=result;await refreshDocs();renderPeople();openShare();toast('Document shared successfully.');}catch(err){$('shareError').textContent=err.message;}});
$('peopleList').addEventListener('click',async e=>{const b=e.target.closest('[data-remove-share]');if(!b)return;try{state.activeDoc=await api(`/api/documents/${state.activeId}/share/${b.dataset.removeShare}`,{method:'DELETE'});await refreshDocs();renderPeople();toast('Access removed.');}catch(err){$('shareError').textContent=err.message;}});
$('fileInput').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;const form=new FormData();form.append('file',file);try{setStatus('Importing…','saving');const doc=await api('/api/import',{method:'POST',body:form});await refreshDocs();await openDoc(doc.id);toast('File imported into a new document.');}catch(err){toast(err.message);setStatus('Import failed','error');}finally{e.target.value='';}});
$('deleteBtn').addEventListener('click',deleteActiveDoc); $('historyBtn').addEventListener('click',async()=>{await openHistory();}); $('exportBtn').addEventListener('click',()=>downloadExport($('exportFormat').value));
$('closeHistory').addEventListener('click',()=>$('historyModal').classList.add('hidden')); $('historyModal').addEventListener('click',e=>{if(e.target===$('historyModal'))$('historyModal').classList.add('hidden');});
$('historyList').addEventListener('click',async e=>{const preview=e.target.closest('[data-preview-version]');if(preview){state.history=await api(`/api/documents/${state.activeId}/versions`);previewVersion(preview.dataset.previewVersion);return;}const restore=e.target.closest('[data-restore-version]');if(restore)await restoreVersion(restore.dataset.restoreVersion);}); $('previewRestore').addEventListener('click',()=>restoreVersion($('previewRestore').dataset.restoreVersion));
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();clearTimeout(state.saveTimer);saveDoc();}if(e.key==='Escape'){$('shareModal').classList.add('hidden');$('historyModal').classList.add('hidden');}});
window.addEventListener('beforeunload',e=>{if(state.dirty){e.preventDefault();e.returnValue='';}});
authMode('login'); boot();
