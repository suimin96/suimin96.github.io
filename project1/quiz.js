// Quiz Manager Script
class QuizCRUD {
  constructor() {
    this.data = [];
    this.editingId = null;
    this.deleteTargetId = null;
    this.filteredData = [];
    this.selectedItems = new Set();

    this.form = document.getElementById('quiz-quizForm');
    this.idField = document.getElementById('quiz-idField');
    this.questionField = document.getElementById('quiz-questionField');
    this.rightAnswerField = document.getElementById('quiz-rightAnswerField');
    this.wrong1Field = document.getElementById('quiz-wrong1Field');
    this.wrong2Field = document.getElementById('quiz-wrong2Field');
    this.wrong3Field = document.getElementById('quiz-wrong3Field');
    this.blockField = document.getElementById('quiz-blockField');
    this.submitBtn = document.getElementById('quiz-submitBtn');
    this.cancelEditBtn = document.getElementById('quiz-cancelEditBtn');
    this.formAlert = document.getElementById('quiz-formAlert');
    this.questionError = document.getElementById('quiz-questionError');

    this.dataPanel = document.getElementById('quiz-dataPanel');
    this.searchInput = document.getElementById('quiz-searchInput');
    this.blockFilter = document.getElementById('quiz-blockFilter');
    this.totalCount = document.getElementById('quiz-totalCount');
    this.filteredCount = document.getElementById('quiz-filteredCount');

    this.deleteModal = document.getElementById('quiz-deleteModal');
    this.cancelDeleteBtn = document.getElementById('quiz-cancelDeleteBtn');
    this.confirmDeleteBtn = document.getElementById('quiz-confirmDeleteBtn');

    this.importBtn = document.getElementById('quiz-importBtn');
    this.importFile = document.getElementById('quiz-importFile');
    this.exportBtn = document.getElementById('quiz-exportBtn');
    this.deleteAllBtn = document.getElementById('quiz-deleteAllBtn');
    this.bulkBlockBtn = document.getElementById('quiz-bulkBlockBtn');
    this.lastExport = document.getElementById('quiz-lastExport');

    this.selectAllCheckbox = document.getElementById('quiz-selectAll');
    this.massChangeBlockBtn = document.getElementById('quiz-massChangeBlockBtn');

    this.init();
  }

  init() {
    this.loadData();
    this.attachEventListeners();
    this.updateMassChangeButton();
    this.render();
  }

  loadData() {
    const stored = localStorage.getItem('quizData');
    this.data = stored ? JSON.parse(stored) : [];
  }

  saveData() {
    localStorage.setItem('quizData', JSON.stringify(this.data));
  }

  attachEventListeners() {
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    this.cancelEditBtn.addEventListener('click', () => this.cancelEdit());
    this.searchInput.addEventListener('input', () => this.render());
    this.blockFilter.addEventListener('change', () => this.render());
    this.cancelDeleteBtn.addEventListener('click', () => this.closeDeleteModal());
    this.confirmDeleteBtn.addEventListener('click', () => this.confirmDelete());
    this.importBtn.addEventListener('click', () => this.importFile.click());
    this.importFile.addEventListener('change', (e) => this.handleImport(e));
    this.exportBtn.addEventListener('click', () => this.handleExport());
    this.deleteAllBtn.addEventListener('click', () => this.handleDeleteAll());
    this.bulkBlockBtn.addEventListener('click', () => this.handleBulkBlock());
    this.selectAllCheckbox.addEventListener('change', () => this.handleSelectAll());
    this.massChangeBlockBtn.addEventListener('click', () => this.handleMassChangeBlock());
  }

  handleSubmit(e) {
    e.preventDefault();
    this.formAlert.innerHTML = '';
    this.questionError.style.display = 'none';

    const question = this.questionField.value.trim();
    const rightAnswer = this.rightAnswerField.value.trim();
    const wrong1 = this.wrong1Field.value.trim();
    const wrong2 = this.wrong2Field.value.trim();
    const wrong3 = this.wrong3Field.value.trim();
    const block = this.blockField.value.trim();

    if (!question) {
      this.showFormAlert('Question cannot be empty', 'error');
      return;
    }

    if (!rightAnswer || !wrong1 || !wrong2 || !wrong3) {
      this.showFormAlert('All answer fields are required', 'error');
      return;
    }

    const isDuplicate = this.data.some(
      (item) => item.Question.toLowerCase() === question.toLowerCase() && item.id !== this.editingId
    );
    if (isDuplicate) {
      this.questionError.textContent = 'This question already exists!';
      this.questionError.style.display = 'block';
      this.showFormAlert('Question already exists', 'error');
      return;
    }

    const item = {
      id: this.editingId || this.generateId(),
      Question: question,
      RightAnswer: rightAnswer,
      Wrong1: wrong1,
      Wrong2: wrong2,
      Wrong3: wrong3,
      Block: block || null,
    };

    if (this.editingId) {
      const index = this.data.findIndex((d) => d.id === this.editingId);
      if (index >= 0) {
        this.data[index] = item;
        this.showFormAlert('Question updated!', 'success');
      }
      this.cancelEdit();
    } else {
      this.data.push(item);
      this.showFormAlert('Question added!', 'success');
      this.form.reset();
      this.idField.value = '';
    }

    this.saveData();
    this.render();
  }

  generateId() {
    return this.data.length > 0 ? Math.max(...this.data.map((d) => d.id)) + 1 : 1;
  }

  editItem(id) {
    const item = this.data.find((d) => d.id === id);
    if (!item) return;

    this.editingId = id;
    this.idField.value = item.id;
    this.questionField.value = item.Question;
    this.rightAnswerField.value = item.RightAnswer;
    this.wrong1Field.value = item.Wrong1;
    this.wrong2Field.value = item.Wrong2;
    this.wrong3Field.value = item.Wrong3;
    this.blockField.value = item.Block || '';
    this.submitBtn.textContent = 'Update Question';
    this.cancelEditBtn.style.display = 'inline-block';
    this.formAlert.innerHTML = '<div class="quiz-alert quiz-alert-info">Editing mode</div>';

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit() {
    this.editingId = null;
    this.form.reset();
    this.idField.value = '';
    this.submitBtn.textContent = 'Add Question';
    this.cancelEditBtn.style.display = 'none';
    this.formAlert.innerHTML = '';
    this.questionError.style.display = 'none';
  }

  deleteItem(id) {
    this.deleteTargetId = id;
    this.deleteModal.classList.add('show');
  }

  confirmDelete() {
    this.data = this.data.filter((d) => d.id !== this.deleteTargetId);
    this.saveData();
    this.closeDeleteModal();
    if (this.editingId === this.deleteTargetId) {
      this.cancelEdit();
    }
    this.selectedItems.delete(this.deleteTargetId);
    this.render();
    this.showFormAlert('Question deleted!', 'success');
  }

  closeDeleteModal() {
    this.deleteModal.classList.remove('show');
    this.deleteTargetId = null;
  }

  showFormAlert(message, type) {
    this.formAlert.innerHTML = `<div class="quiz-alert quiz-alert-${type}">${message}</div>`;
  }

  handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);

        if (!Array.isArray(imported)) {
          this.showFormAlert('Invalid JSON: Expected an array of questions', 'error');
          return;
        }

        const validItems = imported
          .filter((item) => {
            return (
              typeof item.Question === 'string' &&
              typeof item.RightAnswer === 'string' &&
              typeof item.Wrong1 === 'string' &&
              typeof item.Wrong2 === 'string' &&
              typeof item.Wrong3 === 'string' &&
              (item.Block === null || item.Block === '' || typeof item.Block === 'string')
            );
          })
          .map((item) => ({
            ...item,
            id: typeof item.id === 'number' ? item.id : undefined,
            Block: item.Block || null,
          }));

        if (validItems.length === 0) {
          this.showFormAlert('No valid questions found in the JSON file', 'error');
          return;
        }

        if (validItems.length < imported.length) {
          this.showFormAlert(
            `Importing ${validItems.length} out of ${imported.length} questions. Some items were skipped due to missing required fields.`,
            'info'
          );
        }

        if (this.data.length > 0) {
          const confirmReplace = confirm(
            `You have ${this.data.length} existing questions.\n\nDo you want to:\nOK = Replace all with imported data\nCancel = Merge with existing data`
          );
          if (confirmReplace) {
            this.data = this.assignIds(validItems);
          } else {
            const maxId = Math.max(...this.data.map((d) => d.id), 0);
            const merged = validItems.map((item, index) => ({
              ...item,
              id: item.id || maxId + index + 1,
            }));
            this.data = [...this.data, ...merged];
          }
        } else {
          this.data = this.assignIds(validItems);
        }

        this.saveData();
        this.cancelEdit();
        this.selectedItems.clear();
        this.render();
        this.showFormAlert('✓ Data imported successfully!', 'success');
      } catch (error) {
        this.showFormAlert(`Error parsing JSON: ${error.message}`, 'error');
      }
    };

    reader.readAsText(file);
    this.importFile.value = '';
  }

  assignIds(items) {
    let maxId = this.data.length > 0 ? Math.max(...this.data.map((d) => d.id), 0) : 0;
    return items.map((item) => {
      if (item.id === undefined) {
        item.id = ++maxId;
      } else {
        maxId = Math.max(maxId, item.id);
      }
      return item;
    });
  }

  handleExport() {
    if (this.data.length === 0) {
      this.showFormAlert('No data to export', 'error');
      return;
    }

    const filename = `quiz-data-${new Date().toISOString().split('T')[0]}.json`;
    const blob = new Blob([JSON.stringify(this.data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.lastExport.textContent = `Last export: ${new Date().toLocaleTimeString()}`;
    this.showFormAlert(`✓ Exported ${this.data.length} questions to ${filename}`, 'success');
  }

  handleDeleteAll() {
    if (this.data.length === 0) {
      this.showFormAlert('Nothing to delete', 'info');
      return;
    }
    if (confirm('Are you sure you want to delete ALL questions? This cannot be undone.')) {
      this.data = [];
      this.saveData();
      this.cancelEdit();
      this.selectedItems.clear();
      this.render();
      this.showFormAlert('All questions deleted', 'success');
    }
  }

  handleBulkBlock() {
    const filtered = this.getFilteredData();
    if (filtered.length === 0) {
      this.showFormAlert('No questions match current filter/search', 'error');
      return;
    }
    const newBlock = prompt('Enter new block value (empty for none):', '');
    if (newBlock === null) return;
    filtered.forEach(item => { item.Block = newBlock.trim() || null; });
    this.saveData();
    this.render();
    this.showFormAlert(`Updated block for ${filtered.length} questions`, 'success');
  }

  handleSelectAll() {
    const checkboxes = document.querySelectorAll('.quiz-item-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = this.selectAllCheckbox.checked;
      const id = parseInt(checkbox.dataset.id);
      if (this.selectAllCheckbox.checked) {
        this.selectedItems.add(id);
      } else {
        this.selectedItems.delete(id);
      }
    });
    this.updateMassChangeButton();
  }

  handleItemCheckboxChange(event) {
    const checkbox = event.target;
    const id = parseInt(checkbox.dataset.id);
    if (checkbox.checked) {
      this.selectedItems.add(id);
    } else {
      this.selectedItems.delete(id);
    }
    this.updateSelectAllCheckbox();
    this.updateMassChangeButton();
  }

  updateSelectAllCheckbox() {
    const checkboxes = document.querySelectorAll('.quiz-item-checkbox');
    const checkedBoxes = document.querySelectorAll('.quiz-item-checkbox:checked');
    this.selectAllCheckbox.checked = checkboxes.length > 0 && checkedBoxes.length === checkboxes.length;
    this.selectAllCheckbox.indeterminate = checkedBoxes.length > 0 && checkedBoxes.length < checkboxes.length;
  }

  updateMassChangeButton() {
    this.massChangeBlockBtn.disabled = this.selectedItems.size === 0;
  }

  handleMassChangeBlock() {
    if (this.selectedItems.size === 0) {
      this.showFormAlert('No questions selected', 'error');
      return;
    }
    const newBlock = prompt('Enter new block value (empty for none):', '');
    if (newBlock === null) return;
    const count = this.selectedItems.size;
    this.selectedItems.forEach(id => {
      const item = this.data.find(d => d.id === id);
      if (item) {
        item.Block = newBlock.trim() || null;
      }
    });
    this.saveData();
    this.selectedItems.clear();
    this.render();
    this.showFormAlert(`Updated block for ${count} questions`, 'success');
  }

  getFilteredData() {
    let filtered = this.data;

    const search = this.searchInput.value.toLowerCase();
    if (search) {
      filtered = filtered.filter(
        (item) =>
          item.id.toString().includes(search) ||
          item.Question.toLowerCase().includes(search)
      );
    }

    const blockFilter = this.blockFilter.value;
    if (blockFilter) {
      filtered = filtered.filter((item) => item.Block === blockFilter);
    }

    return filtered;
  }

  populateBlockFilter() {
    const blocks = [...new Set(this.data.map((d) => d.Block).filter(Boolean))];
    blocks.sort();

    this.blockFilter.innerHTML = '<option value="">All Blocks</option>';
    blocks.forEach((block) => {
      const option = document.createElement('option');
      option.value = block;
      option.textContent = block;
      this.blockFilter.appendChild(option);
    });
  }

  render() {
    this.filteredData = this.getFilteredData();
    this.totalCount.textContent = this.data.length;
    this.filteredCount.textContent = this.filteredData.length;
    this.populateBlockFilter();

    if (this.filteredData.length === 0) {
      this.dataPanel.innerHTML = `
        <div class="quiz-empty-state">
          <div class="quiz-empty-state-icon">📭</div>
          <p>${this.data.length === 0 ? 'No questions yet. Add one to get started!' : 'No questions match your search or filter.'}</p>
        </div>
      `;
      this.updateSelectAllCheckbox();
      this.updateMassChangeButton();
      return;
    }

    this.dataPanel.innerHTML = this.filteredData
      .map((item) => this.renderItem(item))
      .join('');

    this.filteredData.forEach((item) => {
      const editBtn = document.getElementById(`quiz-edit-${item.id}`);
      const deleteBtn = document.getElementById(`quiz-delete-${item.id}`);
      const checkbox = document.querySelector(`.quiz-item-checkbox[data-id="${item.id}"]`);
      const questionItem = document.querySelector(`.quiz-question-item[data-id="${item.id}"]`);
      if (editBtn) editBtn.addEventListener('click', () => this.editItem(item.id));
      if (deleteBtn) deleteBtn.addEventListener('click', () => this.deleteItem(item.id));
      if (checkbox) {
        checkbox.addEventListener('change', (e) => this.handleItemCheckboxChange(e));
        checkbox.checked = this.selectedItems.has(item.id);
      }
      if (questionItem) {
        questionItem.addEventListener('click', (e) => {
          if (e.target.type !== 'checkbox' && !e.target.classList.contains('quiz-btn-small')) {
            this.editItem(item.id);
          }
        });
      }
    });

    this.updateSelectAllCheckbox();
    this.updateMassChangeButton();
  }

  renderItem(item) {
    const blockBadge = item.Block ? `<span class="quiz-question-block">${this.escapeHtml(item.Block)}</span>` : '';
    return `
      <div class="quiz-question-item" data-id="${item.id}">
        <div>
          <input type="checkbox" class="quiz-question-checkbox quiz-item-checkbox" data-id="${item.id}">
          <span class="quiz-question-id">#${item.id}</span>
          ${blockBadge}
        </div>
        <div class="quiz-question-text">${this.escapeHtml(item.Question)}</div>
        <div class="quiz-answer-preview">
          <strong>✓ ${this.escapeHtml(item.RightAnswer)}</strong><br>
          <small>✗ ${this.escapeHtml(item.Wrong1)}</small><br>
          <small>✗ ${this.escapeHtml(item.Wrong2)}</small><br>
          <small>✗ ${this.escapeHtml(item.Wrong3)}</small>
        </div>
        <div class="quiz-question-actions">
          <button class="quiz-btn-primary quiz-btn-small" id="quiz-edit-${item.id}">Edit</button>
          <button class="quiz-btn-danger quiz-btn-small" id="quiz-delete-${item.id}">Delete</button>
        </div>
      </div>
    `;
  }

  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}