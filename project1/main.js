// Main initialization script
// Tab switching
function showTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(div => div.classList.remove('active'));
  document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  document.querySelector(`[onclick="showTab('${tabId}')"]`).classList.add('active');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new QuizCRUD();
  waitForXLSX(() => {
    new ExcelToJsonConverter();
    new ExcelToMdConverter();
  });
});