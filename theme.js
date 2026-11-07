// Theme Toggle & Persistence
(function () {
    function applyTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }

    // Always default to 'light' (white theme) on direct link opening
    // Only use 'dark' if the user explicitly clicked the switch to set it
    function getPreferredTheme() {
        return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
    }

    // Apply preferred theme on load
    applyTheme(getPreferredTheme());

    // Attach click listeners to all theme toggle buttons
    function setupToggleButtons() {
        const toggleButtons = document.querySelectorAll('.theme-toggle-btn');
        toggleButtons.forEach(btn => {
            if (btn.dataset.themeBound) return;
            btn.dataset.themeBound = 'true';

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const isDark = document.documentElement.classList.contains('dark');
                const newTheme = isDark ? 'light' : 'dark';
                applyTheme(newTheme);
                localStorage.setItem('theme', newTheme);
            });
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupToggleButtons);
    } else {
        setupToggleButtons();
    }

    // Sync theme across open tabs
    window.addEventListener('storage', (e) => {
        if (e.key === 'theme') {
            applyTheme(e.newValue === 'dark' ? 'dark' : 'light');
        }
    });
})();
