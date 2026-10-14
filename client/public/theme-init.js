// Applies the saved theme before first paint (no flash). Key shared with ThemeProvider.tsx.
try {
  var t = localStorage.getItem('xenocare.theme') || 'system';
  if (t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches))
    document.documentElement.classList.add('dark');
} catch (e) {}
