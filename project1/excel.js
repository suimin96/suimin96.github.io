// Excel to JSON Script
function waitForXLSX(callback, attempts = 0) {
  if (typeof XLSX !== 'undefined') {
    callback();
  } else if (attempts < 50) {
    setTimeout(() => waitForXLSX(callback, attempts + 1), 100);
  } else {
    console.error('Failed to load XLSX library');
  }
}

class ExcelToJsonConverter {
  constructor() {
    this.workbook = null;
    this.data = null;
    this.jsonOutput = null;
    this.uploadSection = document.getElementById('excel-uploadSection');
    this.fileInput = document.getElementById('excel-fileInput');
    this.fileInfo = document.getElementById('excel-fileInfo');
    this.fileName = document.getElementById('excel-fileName');
    this.loading = document.getElementById('excel-loading');
    this.sheetSelector = document.getElementById('excel-sheetSelector');
    this.sheetSelect = document.getElementById('excel-sheetSelect');
    this.optionsSection = document.getElementById('excel-optionsSection');
    this.buttonGroup = document.getElementById('excel-buttonGroup');
    this.previewSection = document.getElementById('excel-previewSection');
    this.convertBtn = document.getElementById('excel-convertBtn');
    this.resetBtn = document.getElementById('excel-resetBtn');
    this.outputSection = document.getElementById('excel-outputSection');
    this.outputBox = document.getElementById('excel-outputBox');
    this.copyBtn = document.getElementById('excel-copyBtn');
    this.downloadBtn = document.getElementById('excel-downloadBtn');
    this.alertContainer = document.getElementById('excel-alertContainer');

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
    document.getElementById('excel-useFirstRowAsHeader').addEventListener('change', () => {
      if (this.data) this.loadSheet();
    });
    this.convertBtn.addEventListener('click', () => this.convert());
    this.resetBtn.addEventListener('click', () => this.reset());
    this.copyBtn.addEventListener('click', () => this.copyToClipboard());
    this.downloadBtn.addEventListener('click', () => this.downloadJson());
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

    const useHeader = document.getElementById('excel-useFirstRowAsHeader').checked;
    const previewRows = this.data.slice(0, useHeader ? 6 : 5);
    const headers = useHeader && this.data.length > 0 ? this.data[0] : [];
    const bodyRows = useHeader ? previewRows.slice(1) : previewRows;

    const previewHead = document.getElementById('excel-previewHead');
    const previewBody = document.getElementById('excel-previewBody');

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
      const useHeader = document.getElementById('excel-useFirstRowAsHeader').checked;
      const includeEmpty = document.getElementById('excel-includeEmptyCells').checked;
      const dateFormat = document.getElementById('excel-dateFormat').value;
      const numberFormat = document.getElementById('excel-numberFormat').value;

      let jsonData = [];

      if (useHeader && this.data.length > 1) {
        const headers = this.data[0];
        const rows = this.data.slice(1);

        jsonData = rows.map(row => {
          const obj = {};
          headers.forEach((header, index) => {
            const value = row[index];
            if (includeEmpty || value !== '' && value !== null && value !== undefined) {
              obj[header || `Column${index + 1}`] = this.parseValue(value, numberFormat, dateFormat);
            }
          });
          return obj;
        });
      } else {
        jsonData = this.data.map((row, rowIndex) => {
          const obj = {};
          row.forEach((cell, colIndex) => {
            const key = `field${colIndex + 1}`;
            if (includeEmpty || cell !== '' && cell !== null && cell !== undefined) {
              obj[key] = this.parseValue(cell, numberFormat, dateFormat);
            }
          });
          return obj;
        });
      }

      this.jsonOutput = jsonData;
      this.displayOutput(JSON.stringify(jsonData, null, 2));
      this.showAlert('Conversion successful!', 'success');
    } catch (error) {
      this.showAlert('Error during conversion: ' + error.message, 'error');
    }
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
      this.showToast('Copied to clipboard!');
    }).catch(err => {
      this.showAlert('Failed to copy to clipboard', 'error');
    });
  }

  downloadJson() {
    if (!this.jsonOutput) return;

    const filename = (this.fileName.textContent || 'data').replace(/\.[^/.]+$/, '') + '.json';
    const element = document.createElement('a');
    element.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.jsonOutput, null, 2)));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    this.showToast('File downloaded!');
  }

  reset() {
    this.fileInput.value = '';
    this.workbook = null;
    this.data = null;
    this.jsonOutput = null;
    this.fileInfo.style.display = 'none';
    this.sheetSelector.style.display = 'none';
    this.optionsSection.style.display = 'none';
    this.buttonGroup.style.display = 'none';
    this.previewSection.style.display = 'none';
    this.outputSection.classList.remove('show');
    this.alertContainer.innerHTML = '';
  }

  showAlert(message, type = 'error') {
    if (!message) {
      this.alertContainer.innerHTML = '';
      return;
    }
    this.alertContainer.innerHTML = `<div class="excel-alert excel-alert-${type}">${this.escapeHtml(message)}</div>`;
  }

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'excel-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}