class SearchPage {
    constructor() {
        // Get query from 'query' or 'q' parameter for compatibility
        this.query = new URLSearchParams(window.location.search).get('query') 
                  || new URLSearchParams(window.location.search).get('q');
        this.currentPage = parseInt(new URLSearchParams(window.location.search).get('page') || '1');
        
        this.searchTitle = document.getElementById('search-title');
        this.searchInfo = document.getElementById('search-info');
        this.searchResults = document.getElementById('search-results');
        this.pagination = document.getElementById('pagination');
        
        this.searchInput = document.getElementById('search-input');
        if (this.searchInput && this.query) {
            this.searchInput.value = this.query;
        }
        
        this.setupSearch();
        this.init();
    }
    
    async init() {
        if (!this.query) {
            this.showEmptyState();
            return;
        }
        
        try {
            await this.loadSearchResults(this.query, this.currentPage);
        } catch (error) {
            console.error('Error initializing search:', error);
            this.showError('Failed to initialize search');
        }
    }
    
    async loadSearchResults(query, page = 1) {
        try {
            this.showLoading();
            
            const response = await apiService.searchMovies(query, page);
            
            if (this.searchTitle) {
                this.searchTitle.textContent = `Search Results for "${query}"`;
            }
            
            if (this.searchInfo) {
                this.searchInfo.textContent = `Found ${response.total_results || 0} results`;
            }
            
            this.renderResults(response.results || []);
            this.renderPagination(response.page || 1, response.total_pages || 1);
            
        } catch (error) {
            console.error('Error loading search results:', error);
            this.showError('Failed to load search results');
        } finally {
            this.hideLoading();
        }
    }
    
    renderResults(movies) {
        if (!this.searchResults) return;
        
        if (!movies || movies.length === 0) {
            this.searchResults.innerHTML = `
                <div class="col-12 text-center">
                    <div class="alert alert-info">No movies found matching your search.</div>
                </div>
            `;
            return;
        }
        
        this.searchResults.innerHTML = movies.map(movie => `
            <div class="col-md-3 col-sm-6 mb-4">
                <div class="card h-100">
                    <img src="${apiService.getImageUrl(movie.poster_path)}" 
                         class="card-img-top" 
                         alt="${movie.title}"
                         onerror="this.onerror=null; this.src='../assets/images/placeholder.jpg';">
                    <div class="card-body">
                        <h5 class="card-title">${movie.title}</h5>
                        <p class="card-text text-muted">${movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A'}</p>
                        <p class="card-text">Rating: ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}/10</p>
                        <a href="movie.html?id=${movie.id}" class="btn btn-primary stretched-link">View Details</a>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    renderPagination(currentPage, totalPages) {
        if (!this.pagination || totalPages <= 1) {
            if (this.pagination) this.pagination.innerHTML = '';
            return;
        }
        
        let paginationHTML = '';
        
        // Previous button
        paginationHTML += `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="search-results.html?q=${encodeURIComponent(this.query)}&page=${currentPage - 1}" aria-label="Previous">
                    <span aria-hidden="true">&laquo;</span>
                </a>
            </li>
        `;
        
        // Page numbers
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, startPage + 4);
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="search-results.html?q=${encodeURIComponent(this.query)}&page=${i}">${i}</a>
                </li>
            `;
        }
        
        // Next button
        paginationHTML += `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="search-results.html?q=${encodeURIComponent(this.query)}&page=${currentPage + 1}" aria-label="Next">
                    <span aria-hidden="true">&raquo;</span>
                </a>
            </li>
        `;
        
        this.pagination.innerHTML = paginationHTML;
    }
    
    setupSearch() {
        const searchForm = document.getElementById('search-form');
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const query = this.searchInput.value.trim();
                if (query) {
                    window.location.href = `search-results.html?q=${encodeURIComponent(query)}`;
                }
            });
        }
    }
    
    showLoading() {
        if (this.searchResults) {
            this.searchResults.innerHTML = `
                <div class="col-12 text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            `;
        }
    }
    
    hideLoading() {
        // Loading is hidden when results are rendered
    }
    
    showError(message) {
        if (this.searchResults) {
            this.searchResults.innerHTML = `
                <div class="col-12 text-center">
                    <div class="alert alert-danger" role="alert">
                        ${message}
                    </div>
                </div>
            `;
        }
    }

    showEmptyState() {
        if (this.searchTitle) {
            this.searchTitle.textContent = "Search Movies";
        }
        if (this.searchResults) {
            this.searchResults.innerHTML = `
                <div class="col-12 text-center">
                    <div class="alert alert-info">Enter a search term to find movies</div>
                </div>
            `;
        }
        if (this.searchInfo) {
            this.searchInfo.textContent = '';
        }
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById("mySidebar");
    const mainContent = document.getElementById("main-content");
    const overlay = document.querySelector(".sidebar-overlay");
    
    if (sidebar.classList.contains("active")) {
        sidebar.classList.remove("active");
        mainContent.classList.remove("shifted");
        overlay.style.display = "none";
    } else {
        sidebar.classList.add("active");
        mainContent.classList.add("shifted");
        overlay.style.display = "block";
    }
}

// Initialize the search page
document.addEventListener('DOMContentLoaded', () => {
    try {
        new SearchPage();
    } catch (error) {
        console.error('Error initializing search page:', error);
    }
});