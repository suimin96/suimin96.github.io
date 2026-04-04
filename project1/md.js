// MD to Quiz Script
function mdParseMarkdownToQuiz(mdText, options = { genId: true }){
  const lines = mdText.split(/\r?\n/);
  let currentBlock = '';
  let currentQuestion = null;
  const questions = [];

  function flushQuestion(){
    if(!currentQuestion) return;
    const wrongs = currentQuestion.wrongs.slice(0,3);
    while(wrongs.length < 3) wrongs.push('');

    const obj = {
      Question: currentQuestion.text || '',
      RightAnswer: currentQuestion.right || '',
      Wrong1: wrongs[0],
      Wrong2: wrongs[1],
      Wrong3: wrongs[2],
      Block: currentBlock || ''
    };
    questions.push(obj);
    currentQuestion = null;
  }

  for(let raw of lines){
    const line = raw.replace(/\u00A0/g,' ').trimEnd();
    if(!line) continue;

    if(/^#\s+/.test(line)){
      flushQuestion();
      currentBlock = line.replace(/^#\s+/, '').trim();
      continue;
    }

    if(/^##\s+/.test(line)){
      flushQuestion();
      currentQuestion = { text: line.replace(/^##\s+/, '').trim(), right: null, wrongs: [] };
      continue;
    }

    if(/^-\s*\+\s*/.test(line)){
      const val = line.replace(/^-\s*\+\s*/, '').trim();
      if(!currentQuestion){
        currentQuestion = { text: '', right: val, wrongs: [] };
      } else {
        currentQuestion.right = val;
      }
      continue;
    }

    if(/^-\s+/.test(line)){
      const val = line.replace(/^-\s+/, '').trim();
      if(!currentQuestion){
        currentQuestion = { text: '', right: null, wrongs: [val] };
      } else {
        currentQuestion.wrongs.push(val);
      }
      continue;
    }

    if(currentQuestion && !currentQuestion.right && currentQuestion.wrongs.length===0){
      currentQuestion.text += ' ' + line.trim();
    }
  }

  flushQuestion();

  const errors = [];
  questions.forEach((q, idx) => {
    if(!q.Question || q.Question.trim()===''){
      errors.push(`Question #${idx+1} has empty question text.`);
    }
    if(!q.RightAnswer || q.RightAnswer.trim()===''){
      errors.push(`Question #${idx+1} is missing RightAnswer.`);
    }
    const wrongCount = [q.Wrong1, q.Wrong2, q.Wrong3].filter(Boolean).length;
    if(wrongCount === 0){
      errors.push(`Question #${idx+1} has no wrong answers.`);
    }
  });

  if(options.genId){
    let id = 0;
    return { questions: questions.map(q => ({ id: ++id, ...q })), errors };
  }

  return { questions, errors };
}

const mdMdBox = document.getElementById('md-md');
const mdConvertBtn = document.getElementById('md-convert');
const mdOut = document.getElementById('md-out');
const mdCopyBtn = document.getElementById('md-copy');
const mdDlBtn = document.getElementById('md-download');
const mdClearBtn = document.getElementById('md-clear');
const mdGenId = document.getElementById('md-genId');
const mdErrBox = document.getElementById('md-errors');
const mdFileInput = document.getElementById('md-fileInput');

mdFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => mdMdBox.value = e.target.result;
    reader.readAsText(file);
  }
});

mdConvertBtn.addEventListener('click', ()=>{
  mdErrBox.textContent = '';
  const res = mdParseMarkdownToQuiz(mdMdBox.value || '', { genId: mdGenId.checked });
  if(res.errors.length) mdErrBox.textContent = res.errors.join(' ');
  mdOut.textContent = JSON.stringify(res.questions, null, 2);
});

mdCopyBtn.addEventListener('click', async ()=>{
  try{ await navigator.clipboard.writeText(mdOut.textContent); alert('Copied'); }catch(e){ alert('Clipboard failed'); }
});

mdDlBtn.addEventListener('click', ()=>{
  const data = mdOut.textContent || '[]';
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='quiz-from-md.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});

mdClearBtn.addEventListener('click', ()=>{ mdMdBox.value = ''; mdOut.textContent = '[]'; mdErrBox.textContent=''; });