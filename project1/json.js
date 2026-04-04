// JSON to Excel Script
const jsonFileInput = document.getElementById('json-fileInput');
const jsonJsonInput = document.getElementById('json-jsonInput');
const jsonConvertBtn = document.getElementById('json-convertBtn');
const jsonPreviewBtn = document.getElementById('json-previewBtn');
const jsonValidateBtn = document.getElementById('json-validateBtn');
const jsonClearBtn = document.getElementById('json-clearBtn');
const jsonMsg = document.getElementById('json-msg');
const jsonPreview = document.getElementById('json-preview');
const jsonAutoId = document.getElementById('json-autoId');
const jsonPasteToCrudBtn = document.getElementById('json-pasteToCrudBtn');

const jsonHEADERS = ['id','question','rightanswer','wrong1','wrong2','wrong3','block'];

jsonFileInput.addEventListener('change', (e)=>{
  const f = e.target.files[0];
  if(!f) return;
  const r = new FileReader();
  r.onload = ()=>{ jsonJsonInput.value = r.result; jsonPreview.textContent = '[]'; jsonMsg.textContent = ''; };
  r.readAsText(f, 'utf-8');
});

jsonClearBtn.addEventListener('click', ()=>{ jsonJsonInput.value = ''; jsonPreview.textContent = '[]'; jsonMsg.textContent=''; });

jsonValidateBtn.addEventListener('click', ()=>{
  const res = jsonParseAndNormalize();
  if(res.error){ jsonMsg.innerHTML = `<div class="json-error">${res.error}</div>`; return; }
  jsonMsg.innerHTML = `<div class="json-info">Valid JSON — ${res.items.length} items parsed.</div>`;
  jsonPreview.textContent = JSON.stringify(res.items, null, 2);
});

jsonPreviewBtn.addEventListener('click', ()=>{
  const res = jsonParseAndNormalize();
  if(res.error){ jsonMsg.innerHTML = `<div class="json-error">${res.error}</div>`; return; }
  const html = jsonBuildTableHtml(res.items);
  jsonPreview.innerHTML = html;
});

jsonConvertBtn.addEventListener('click', ()=>{
  const res = jsonParseAndNormalize();
  if(res.error){ jsonMsg.innerHTML = `<div class="json-error">${res.error}</div>`; return; }
  if(res.items.length === 0){ jsonMsg.innerHTML = `<div class="json-error">No items to export</div>`; return; }
  const ws = XLSX.utils.json_to_sheet(res.items, { header: jsonHEADERS });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const filename = `quiz-export-${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
  jsonMsg.innerHTML = `<div class="json-info">Exported ${res.items.length} rows to ${filename}</div>`;
});

jsonPasteToCrudBtn.addEventListener('click', ()=>{
  const res = jsonParseAndNormalize();
  if(res.error){ jsonMsg.innerHTML = `<div class="json-error">${res.error}</div>`; return; }
  if(res.items.length === 0){ jsonMsg.innerHTML = `<div class="json-error">No items to push</div>`; return; }
  let existing = [];
  try{ existing = JSON.parse(localStorage.getItem('quizData') || '[]'); }catch(e){ existing = []; }
  if(jsonAutoId.checked){
    const start = existing.length>0 ? Math.max(...existing.map(d=>d.id)) : 0;
    let id = start;
    const withIds = res.items.map(it => ({ id: ++id, ...it }));
    existing = existing.concat(withIds);
  } else {
    const used = new Set(existing.map(d=>d.id));
    let maxId = existing.length>0 ? Math.max(...existing.map(d=>d.id)) : 0;
    const merged = res.items.map(it=>{
      if(typeof it.id === 'number' && !used.has(it.id)) { used.add(it.id); return it; }
      maxId += 1; return { ...it, id: maxId };
    });
    existing = existing.concat(merged);
  }
  localStorage.setItem('quizData', JSON.stringify(existing));
  jsonMsg.innerHTML = `<div class="json-info">Pushed ${res.items.length} items to Quiz Manager</div>`;
});

function jsonBuildTableHtml(items){
  if(items.length===0) return '[]';
  const cols = jsonHEADERS;
  let html = '<table style="width:100%;border-collapse:collapse">';
  html += '<thead><tr>' + cols.map(c=>`<th style="border:1px solid #ddd;padding:6px;background:#f3f4f6;text-align:left">${c}</th>`).join('') + '</tr></thead>';
  html += '<tbody>' + items.map(r=>'<tr>'+cols.map(c=>`<td style="border:1px solid #ddd;padding:6px">${jsonEscapeHtml(String(r[c]!==undefined? r[c]: ''))}</td>`).join('') + '</tr>').join('') + '</tbody>';
  html += '</table>';
  return html;
}

function jsonEscapeHtml(str){ return str.replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[m])); }

function jsonParseAndNormalize(){
  const raw = jsonJsonInput.value.trim();
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
  if(jsonAutoId.checked){
    let id = 0;
    return { items: items.map(it=>({ id: ++id, ...it })), error: null };
  }
  return { items, error: null };
}