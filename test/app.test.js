const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../server');

const accounts = {
  neha: { email: 'neha@example.com', password: 'Demo123!Pass' },
  alex: { email: 'alex@example.com', password: 'Demo123!Pass' },
  sam: { email: 'sam@example.com', password: 'Demo123!Pass' }
};
async function setup(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ajaia-docs-test-'));
  const app = createApp({ dataFile: path.join(dir, 'store.json') });
  await app.locals.load();
  const server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const cookies = new Map();
  async function request(user, url, options = {}) {
    if (user && !cookies.has(user)) {
      const login = await fetch(base + '/api/auth/login', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(accounts[user]) });
      assert.equal(login.status, 200, `test account ${user} should authenticate`);
      cookies.set(user, login.headers.get('set-cookie').split(';')[0]);
    }
    const headers = { ...(options.headers || {}) };
    if (user) headers.cookie = cookies.get(user);
    return fetch(base + url, { ...options, headers });
  }
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await fs.rm(dir, { recursive:true, force:true }); });
  return { request, base };
}

test('creates, sanitizes, and persists a document', async t => {
  const { request } = await setup(t);
  const create = await request('neha','/api/documents',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:'Project brief'})});
  assert.equal(create.status,201); const doc=await create.json();
  const update=await request('neha',`/api/documents/${doc.id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({content:'<h1>Plan</h1><script>alert(1)</script><p>Next step</p>'})});
  assert.equal(update.status,200); const saved=await update.json();
  assert.match(saved.content,/<h1>Plan<\/h1>/); assert.doesNotMatch(saved.content,/<script/i);
  const reopened=await request('neha',`/api/documents/${doc.id}`); assert.equal(reopened.status,200); assert.match((await reopened.json()).content,/Next step/);
});

test('authentication supports signup, login, and rejects invalid credentials', async t => {
  const { base } = await setup(t);
  const signup=await fetch(base+'/api/auth/signup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Test User',email:'test@example.com',password:'LongPassword123!'})});
  assert.equal(signup.status,201); assert.ok(signup.headers.get('set-cookie').includes('HttpOnly'));
  const duplicate=await fetch(base+'/api/auth/signup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Test User',email:'test@example.com',password:'LongPassword123!'})}); assert.equal(duplicate.status,409);
  const bad=await fetch(base+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'test@example.com',password:'wrong-password'})}); assert.equal(bad.status,401);
  const unauth=await fetch(base+'/api/documents'); assert.equal(unauth.status,401);
});

test('enforces share access and read-only permissions', async t => {
  const { request }=await setup(t);
  const created=await request('neha','/api/documents',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:'Team notes'})}); const doc=await created.json();
  assert.equal((await request('alex',`/api/documents/${doc.id}`)).status,404);
  const share=await request('neha',`/api/documents/${doc.id}/share`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({userId:'alex',permission:'view'})}); assert.equal(share.status,200);
  assert.equal((await request('alex',`/api/documents/${doc.id}`)).status,200);
  const patch=await request('alex',`/api/documents/${doc.id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({content:'<p>Not allowed</p>'})}); assert.equal(patch.status,403);
  assert.equal((await request('alex',`/api/documents/${doc.id}`,{method:'DELETE'})).status,404);
});

test('imports supported text files as editable documents', async t => {
  const { request }=await setup(t); const form=new FormData(); form.append('file',new Blob(['Hello team\nNext steps'],{type:'text/plain'}),'notes.txt');
  const response=await request('neha','/api/import',{method:'POST',body:form}); assert.equal(response.status,201); const doc=await response.json();
  assert.equal(doc.title,'notes'); assert.match(doc.content,/Hello team/); assert.match(doc.content,/Next steps/);
});

test('creates version history, restores an earlier version, and exports Markdown', async t => {
  const { request }=await setup(t); const created=await request('neha','/api/documents',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:'Versioned'})}); const doc=await created.json();
  await request('neha',`/api/documents/${doc.id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({content:'<h1>First</h1><p>Initial content</p>'})});
  await request('neha',`/api/documents/${doc.id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({content:'<h2>Second</h2><p>Updated content</p>'})});
  const versions=await (await request('neha',`/api/documents/${doc.id}/versions`)).json(); assert.ok(versions.length>=1);
  const restored=await request('neha',`/api/documents/${doc.id}/versions/${versions[0].id}/restore`,{method:'POST'}); assert.equal(restored.status,200); assert.match((await restored.json()).content,/First|Initial content/);
  const exported=await request('neha',`/api/documents/${doc.id}/export.md`); assert.equal(exported.status,200); assert.match(await exported.text(),/# Versioned/);
});

test('owner can delete a document and its related history/shares', async t => {
  const { request }=await setup(t); const created=await request('neha','/api/documents',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:'Delete me'})}); const doc=await created.json();
  await request('neha',`/api/documents/${doc.id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({content:'<p>One</p>'})});
  const deleted=await request('neha',`/api/documents/${doc.id}`,{method:'DELETE'}); assert.equal(deleted.status,204);
  assert.equal((await request('neha',`/api/documents/${doc.id}`)).status,404);
});


test('AI copilot requires authentication and enforces document visibility', async t => {
  const originalKey = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = '';
  t.after(() => { if (originalKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = originalKey; });
  const { request } = await setup(t);
  const created = await request('neha','/api/documents',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:'Private AI context'})});
  const doc = await created.json();
  assert.equal((await request(null,`/api/documents/${doc.id}/ai`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({task:'summarize'})})).status,401);
  assert.equal((await request('alex',`/api/documents/${doc.id}/ai`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({task:'summarize'})})).status,404);
  const missingConfig = await request('neha',`/api/documents/${doc.id}/ai`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({task:'summarize'})});
  assert.equal(missingConfig.status,503);
});
