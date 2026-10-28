(function () {
    var storageKey = 'hazlo-theme-preference';
    var preference = 'system';
    try {
        var stored = window.localStorage.getItem(storageKey);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
            preference = stored;
        }
    } catch (_) { }

    var systemPrefersDark = false;
    try {
        systemPrefersDark = window.matchMedia &&
            window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch (_) { }

    var activeTheme = preference === 'dark' || (preference === 'system' && systemPrefersDark)
        ? 'dark'
        : 'light';
    var root = document.documentElement;
    root.classList.toggle('dark', activeTheme === 'dark');
    root.dataset.theme = activeTheme;
    root.style.colorScheme = activeTheme;

    var themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
        themeMeta.setAttribute('content', activeTheme === 'dark' ? '#15171a' : '#f7f5f0');
    }
})();
