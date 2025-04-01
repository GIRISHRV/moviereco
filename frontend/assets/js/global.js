class GlobalSearch {
    constructor() {
        this.setupSearchHandlers();
    }

    setupSearchHandlers() {
        // Get all search forms across pages
        const searchForms = document.querySelectorAll('.search-form');
        
        searchForms.forEach(form => {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const searchInput = form.querySelector('input[type="search"]');
                const query = searchInput?.value?.trim();
                
                if (query) {
                    // Redirect to search results page with query
                    window.location.href = `/pages/search.html?query=${encodeURIComponent(query)}`;
                }
            });
        });
    }
}

// Initialize global search on all pages
document.addEventListener('DOMContentLoaded', () => {
    new GlobalSearch();
});