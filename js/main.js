// ============================================================
// dub — page navigation
// ============================================================

function showPage(name) {
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  const target = document.getElementById(`page-${name}`);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-links a').forEach((a) => a.classList.remove('active'));
  const navLink = document.getElementById(`nav-${name}`);
  if (navLink) navLink.classList.add('active');

  window.scrollTo({ top: 0, behavior: 'instant' });
}

document.addEventListener('DOMContentLoaded', () => {
  showPage('landing');
});
