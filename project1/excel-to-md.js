// Excel to MD Script
function waitForXLSX(callback, attempts = 0) {
  if (typeof XLSX !== 'undefined') {
    callback();
  } else if (attempts < 50) {
    setTimeout(() => waitForXLSX(callback, attempts + 1), 100);
  } else {
    console.error('Failed to load XLSX library');
  }
}

class ExcelToMdConverter {
  constructor() {
    this.workbook = null;
    this.data = null;
    this.mdOutput = null;
    this.uploadSection = document.getElementById('excel-md-uploadSection');
    this.fileInput = document.getElementById('excel-md-fileInput');
    this.fileInfo = document.getElementById('excel-md-fileInfo');
    this.fileName = document.getElementById('excel-md-fileName');
    this.loading = document.getElementById('excel-md-loading');
    this.sheetSelector = document.getElementById('excel-md-sheetSelector');
    this.sheetSelect = document.getElementById('excel-md-sheetSelect');
    this.optionsSection = document.getElementById('excel-md-optionsSection');
    this.buttonGroup = document.getElementById('excel-md-buttonGroup');
    this.previewSection = document.getElementById('excel-md-previewSection');
    this.convertBtn = document.getElementById('excel-md-convertBtn');
    this.resetBtn = document.getElementById('excel-md-resetBtn');
    this.outputSection = document.getElementById('excel-md-outputSection');
    this.outputBox = document.getElementById('excel-md-outputBox');
    this.copyBtn = document.getElementById('excel-md-copyBtn');
    this.downloadBtn = document.getElementById('excel-md-downloadBtn');
    this.alertContainer = document.getElementById('excel-md-alertContainer');

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.uploadSection.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    this.uploadSection.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadSection.classList.add('dragover');
    });
    this.uploadSection.addEventListener('dragleave', () => {
      this.uploadSection.classList.remove('dragover');
    });
    this.uploadSection.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadSection.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files.length) {
        this.fileInput.files = files;
        this.handleFileSelect({ target: { files } });
      }
    });
    this.sheetSelect.addEventListener('change', () => this.loadSheet());
    document.getElementById('excel-md-useFirstRowAsHeader').addEventListener('change', () => {
      if (this.data) this.loadSheet();
    });
    this.convertBtn.addEventListener('click', () => this.convert());
    this.resetBtn.addEventListener('click', () => this.reset());
    this.copyBtn.addEventListener('click', () => this.copyToClipboard());
    this.downloadBtn.addEventListener('click', () => this.downloadMd());
  }

  handleFileSelect(e) {
    const files = e.target.files;
    if (!files.length) return;

    const file = files[0];
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      this.showAlert('Please upload a valid Excel or CSV file', 'error');
      return;
    }

    this.showAlert('');
    this.loading.classList.add('show');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const arrayBuffer = event.target.result;
        this.workbook = XLSX.read(arrayBuffer, { type: 'array' });
        this.fileName.textContent = file.name;
        this.fileInfo.style.display = 'block';
        this.loading.classList.remove('show');
        this.populateSheets();
      } catch (error) {
        this.loading.classList.remove('show');
        this.showAlert('Error reading file: ' + error.message, 'error');
      }
    };

    reader.readAsArrayBuffer(file);
  }

  populateSheets() {
    const sheets = this.workbook.SheetNames;
    this.sheetSelect.innerHTML = '';
    sheets.forEach((sheetName, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = sheetName;
      this.sheetSelect.appendChild(option);
    });

    this.sheetSelector.style.display = this.workbook.SheetNames.length > 1 ? 'block' : 'none';
    this.optionsSection.style.display = 'block';
    this.buttonGroup.style.display = 'flex';
    this.loadSheet();
  }

  loadSheet() {
    const sheetIndex = parseInt(this.sheetSelect.value) || 0;
    const sheetName = this.workbook.SheetNames[sheetIndex];
    const worksheet = this.workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: ''
    });

    this.data = rawData;
    this.showPreview();
  }

  showPreview() {
    if (!this.data || this.data.length === 0) {
      this.previewSection.style.display = 'none';
      return;
    }

    const useHeader = document.getElementById('excel-md-useFirstRowAsHeader').checked;
    const previewRows = this.data.slice(0, useHeader ? 6 : 5);
    const headers = useHeader && this.data.length > 0 ? this.data[0] : [];
    const bodyRows = useHeader ? previewRows.slice(1) : previewRows;

    const previewHead = document.getElementById('excel-md-previewHead');
    const previewBody = document.getElementById('excel-md-previewBody');

    previewHead.innerHTML = '';
    previewBody.innerHTML = '';

    if (headers.length > 0 && useHeader) {
      previewHead.innerHTML = headers.map(h => `<th>${this.escapeHtml(String(h || ''))}</th>`).join('');
    } else {
      const cols = Math.max(...bodyRows.map(r => r.length));
      previewHead.innerHTML = Array(cols).fill(0).map((_, i) => `<th>Column ${i + 1}</th>`).join('');
    }

    bodyRows.forEach(row => {
      const cells = row.map(cell => `<td>${this.escapeHtml(String(cell || ''))}</td>`).join('');
      previewBody.innerHTML += `<tr>${cells}</tr>`;
    });

    this.previewSection.style.display = 'block';
  }

  convert() {
    if (!this.data || this.data.length === 0) {
      this.showAlert('No data to convert', 'error');
      return;
    }

    try {
      const useHeader = document.getElementById('excel-md-useFirstRowAsHeader').checked;
      const includeEmpty = document.getElementById('excel-md-includeEmptyCells').checked;
      const dateFormat = document.getElementById('excel-md-dateFormat').value;
      const numberFormat = document.getElementById('excel-md-numberFormat').value;

      let rows = this.data;
      if (useHeader && this.data.length > 0) {
        rows = this.data.slice(1);
      }

      let jsonData = rows.map(row => {
        const parsedRow = row.map(cell => this.parseValue(cell, numberFormat, dateFormat));
        return {
          question: String(parsedRow[0] || ''),
          answer1: String(parsedRow[1] || ''),
          answer2: String(parsedRow[2] || ''),
          answer3: String(parsedRow[3] || ''),
          answer4: String(parsedRow[4] || ''),
          block: String(parsedRow[5] || 'General')
        };
      }).filter(item => item.question.trim() !== '');

      console.log('jsonData:', jsonData);
      if (jsonData.length === 0) {
        this.showAlert('No valid data found. Check that your Excel has at least 6 columns in order: question, answer1, answer2, answer3, answer4, block.', 'error');
        return;
      }
      const md = this.convertToMarkdown(jsonData);
      console.log('md:', md);
      this.displayOutput(md);
      this.mdOutput = md;
      this.showAlert('Conversion successful!', 'success');
    } catch (error) {
      this.showAlert('Error during conversion: ' + error.message, 'error');
    }
  }

  normalizeData(jsonData) {
    return jsonData.map(obj => {
      const lower = {};
      for(const k of Object.keys(obj)) lower[k.toLowerCase()] = obj[k];
      return {
        question: String(lower['question'] || lower['field1'] || ''),
        answer1: String(lower['answer1'] || lower['field2'] || ''),
        answer2: String(lower['answer2'] || lower['field3'] || ''),
        answer3: String(lower['answer3'] || lower['field4'] || ''),
        answer4: String(lower['answer4'] || lower['field5'] || ''),
        block: String(lower['block'] || lower['field6'] || 'General')
      };
    }).filter(item => item.question && item.answer1 && item.answer2 && item.answer3 && item.answer4);
  }

  convertToMarkdown(items) {
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
        if(item.answer1.trim()) md += `(a) ${item.answer1}\n`;
        if(item.answer2.trim()) md += `(b) ${item.answer2}\n`;
        if(item.answer3.trim()) md += `(c) ${item.answer3}\n`;
        if(item.answer4.trim()) md += `(d) ${item.answer4}\n`;
        md += '\n';
      });
      md += '\n';
    }
    return md.trim();
  }

  parseValue(value, numberFormat, dateFormat) {
    if (value === '' || value === null || value === undefined) {
      return value;
    }

    if (numberFormat === 'auto' || numberFormat === 'number') {
      const num = Number(value);
      if (!isNaN(num) && value !== '') {
        return numberFormat === 'number' || !isNaN(parseFloat(value)) ? num : value;
      }
    }

    if (this.isDate(value)) {
      if (dateFormat === 'iso') {
        return new Date(value).toISOString().split('T')[0];
      } else if (dateFormat === 'timestamp') {
        return new Date(value).getTime();
      }
    }

    return value;
  }

  isDate(value) {
    if (typeof value !== 'string') return false;
    const date = new Date(value);
    return date instanceof Date && !isNaN(date);
  }

  displayOutput(output) {
    this.outputBox.textContent = output;
    this.outputSection.classList.add('show');
  }

  copyToClipboard() {
    const text = this.outputBox.textContent;
    navigator.clipboard.writeText(text).then(() => {
      this.showAlert('Copied to clipboard!', 'success');
    });
  }

  downloadMd() {
    const md = this.outputBox.textContent;
    if (!md.trim()) {
      this.showAlert('No content to download', 'error');
      return;
    }
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz-md-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
    this.showAlert('Downloaded successfully!', 'success');
  }

  reset() {
    this.workbook = null;
    this.data = null;
    this.mdOutput = null;
    this.fileInput.value = '';
    this.fileInfo.style.display = 'none';
    this.sheetSelector.style.display = 'none';
    this.optionsSection.style.display = 'none';
    this.buttonGroup.style.display = 'none';
    this.previewSection.style.display = 'none';
    this.outputSection.classList.remove('show');
    this.showAlert('');
  }

  showAlert(message, type = 'info') {
    this.alertContainer.innerHTML = message ? `<div class="alert alert-${type}">${message}</div>` : '';
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}