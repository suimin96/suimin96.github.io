// JSON to MD Script
const jsonMdFileInput = document.getElementById('json-md-fileInput');
const jsonMdJsonInput = document.getElementById('json-md-jsonInput');
const jsonMdConvertBtn = document.getElementById('json-md-convertBtn');
const jsonMdPreviewBtn = document.getElementById('json-md-previewBtn');
const jsonMdValidateBtn = document.getElementById('json-md-validateBtn');
const jsonMdClearBtn = document.getElementById('json-md-clearBtn');
const jsonMdMsg = document.getElementById('json-md-msg');
const jsonMdPreview = document.getElementById('json-md-preview');
const jsonMdAutoId = document.getElementById('json-md-autoId');
const jsonMdDownloadBtn = document.getElementById('json-md-downloadBtn');

const jsonMdHEADERS = ['id','question','rightanswer','wrong1','wrong2','wrong3','block'];

jsonMdFileInput.addEventListener('change', (e)=>{
  const f = e.target.files[0];
  if(!f) return;
  const r = new FileReader();
  r.onload = ()=>{ jsonMdJsonInput.value = r.result; jsonMdPreview.textContent = ''; jsonMdMsg.textContent = ''; };
  r.readAsText(f, 'utf-8');
});

jsonMdClearBtn.addEventListener('click', ()=>{ jsonMdJsonInput.value = ''; jsonMdPreview.textContent = ''; jsonMdMsg.textContent=''; });

jsonMdValidateBtn.addEventListener('click', ()=>{
  const res = jsonMdParseAndNormalize();
  if(res.error){ jsonMdMsg.innerHTML = `<div class="json-error">${res.error}</div>`; return; }
  jsonMdMsg.innerHTML = `<div class="json-info">Valid JSON — ${res.items.length} items parsed.</div>`;
  jsonMdPreview.textContent = JSON.stringify(res.items, null, 2);
});

jsonMdPreviewBtn.addEventListener('click', ()=>{
  const res = jsonMdParseAndNormalize();
  if(res.error){ jsonMdMsg.innerHTML = `<div class="json-error">${res.error}</div>`; return; }
  const md = jsonMdConvertToMarkdown(res.items);
  jsonMdPreview.textContent = md;
});

jsonMdConvertBtn.addEventListener('click', ()=>{
  const res = jsonMdParseAndNormalize();
  if(res.error){ jsonMdMsg.innerHTML = `<div class="json-error">${res.error}</div>`; return; }
  if(res.items.length === 0){ jsonMdMsg.innerHTML = `<div class="json-error">No items to export</div>`; return; }
  const md = jsonMdConvertToMarkdown(res.items);
  jsonMdPreview.textContent = md;
  jsonMdMsg.innerHTML = `<div class="json-info">Converted ${res.items.length} items to Markdown</div>`;
});

jsonMdDownloadBtn.addEventListener('click', ()=>{
  const md = jsonMdPreview.textContent;
  if(!md.trim()){ jsonMdMsg.innerHTML = `<div class="json-error">No content to download</div>`; return; }
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `quiz-md-${new Date().toISOString().split('T')[0]}.md`;
  a.click();
  URL.revokeObjectURL(url);
  jsonMdMsg.innerHTML = `<div class="json-info">Downloaded quiz-md-${new Date().toISOString().split('T')[0]}.md</div>`;
});

function jsonMdBuildTableHtml(items){
  if(items.length===0) return '[]';
  const cols = jsonMdHEADERS;
  let html = '<table style="width:100%;border-collapse:collapse">';
  html += '<thead><tr>' + cols.map(c=>`<th style="border:1px solid #ddd;padding:6px;background:#f3f4f6;text-align:left">${c}</th>`).join('') + '</tr></thead>';
  html += '<tbody>' + items.map(r=>'<tr>'+cols.map(c=>`<td style="border:1px solid #ddd;padding:6px">${jsonMdEscapeHtml(String(r[c]!==undefined? r[c]: ''))}</td>`).join('') + '</tr>').join('') + '</tbody>';
  html += '</table>';
  return html;
}

function jsonMdEscapeHtml(str){ return str.replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[m])); }

function jsonMdParseAndNormalize(){
  const raw = jsonMdJsonInput.value.trim();
  if(!raw) return { items: [], error: null };
  let parsed;
  try{ parsed = JSON.parse(raw); }catch(e){ return { error: 'Invalid JSON: ' + e.message }; }
  if(!Array.isArray(parsed)) return { error: 'JSON must be an array of objects' };
  const items = [];
  for(const obj of parsed){
    if(typeof obj !== 'object' || obj === null) continue;
    const lower = {};
    for(const k of Object.keys(obj)) lower[k.toLowerCase()] = obj[k];
    if(typeof lower['question'] !== 'string' || typeof lower['rightanswer'] !== 'string' || typeof lower['wrong1'] !== 'string' || typeof lower['wrong2'] !== 'string' || typeof lower['wrong3'] !== 'string'){
      continue;
    }
    const entry = {
      id: (typeof lower['id'] === 'number') ? lower['id'] : undefined,
      question: lower['question'],
      rightanswer: lower['rightanswer'],
      wrong1: lower['wrong1'],
      wrong2: lower['wrong2'],
      wrong3: lower['wrong3'],
      block: (typeof lower['block'] === 'string') ? lower['block'] : (lower['block'] == null ? '' : String(lower['block']))
    };
    items.push(entry);
  }
  if(jsonMdAutoId.checked){
    let id = 0;
    return { items: items.map(it=>({ id: ++id, ...it })), error: null };
  }
  return { items, error: null };
}

function jsonMdConvertToMarkdown(items){
  // Group by block
  const blocks = {};
  items.forEach(item => {
    const block = item.block || 'General';
    if(!blocks[block]) blocks[block] = [];
    blocks[block].push(item);
  });

  let md = '';
  for(const blockName in blocks){
    md += `# ${blockName}\n\n`;
    blocks[blockName].forEach(item => {
      md += `## ${item.question}\n`;
      md += `- + ${item.rightanswer}\n`;
      if(item.wrong1) md += `- ${item.wrong1}\n`;
      if(item.wrong2) md += `- ${item.wrong2}\n`;
      if(item.wrong3) md += `- ${item.wrong3}\n`;
      md += '\n';
    });
    md += '\n';
  }
  return md.trim();
}