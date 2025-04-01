/**
 * Main JavaScript for the Movie Recommendation System
 * Handles UI interactions and data display
 */

class MovieApp {
    constructor() {
        console.log('🎬 MovieApp: Constructor called');
        
        // DOM elements
        this.popularMoviesContainer = document.getElementById('popular-movies');
        this.genresContainer = document.getElementById('genres-container');
        this.searchForm = document.getElementById('search-form');
        this.searchInput = document.getElementById('search-input');
        
        console.log('📍 DOM Elements:', {
            popularMovies: !!this.popularMoviesContainer,
            genres: !!this.genresContainer,
            searchForm: !!this.searchForm,
            searchInput: !!this.searchInput
        });

        // Initialize after DOM is fully loaded
        if (document.readyState === 'loading') {
            console.log('🔄 Document still loading, adding DOMContentLoaded listener');
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            console.log('📄 Document already loaded, initializing immediately');
            this.init();
        }
    }
    
    async init() {
        console.log('🚀 MovieApp: Initializing...');
        try {
            console.log('📥 Loading initial data...');
            await Promise.all([
                this.loadPopularMovies(),
                this.loadGenres()
            ]);
            this.bindEvents();
            console.log('✅ Initialization complete');
        } catch (error) {
            console.error('❌ Initialization error:', error);
        }
    }
    
    bindEvents() {
        // Search form submit
        if (this.searchForm) {
            this.searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const query = this.searchInput.value.trim();
                if (query) {
                    window.location.href = `pages/search-results.html?q=${encodeURIComponent(query)}`;
                }
            });
        }
    }
    
    setupSearch() {
        document.getElementById('search-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const query = document.getElementById('search-input').value.trim();
            if (query) {
                window.location.href = `pages/search-results.html?q=${encodeURIComponent(query)}`;
            }
        });
    }

    async loadPopularMovies(page = 1) {
        if (!this.popularMoviesContainer) {
            console.error('❌ Popular movies container not found');
            return;
        }
        
        try {
            console.log(`📽️ Loading popular movies page ${page}...`);
            
            // Show loading state
            this.popularMoviesContainer.innerHTML = `
                <div class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            `;

            const response = await apiService.getPopularMovies(page);
            console.log('📦 Popular movies response:', response);
            
            if (!response || !Array.isArray(response.movies)) {
                console.error('❌ Invalid response format:', response);
                throw new Error('Invalid response format');
            }

            const { movies, current_page, total_pages } = response;
            console.log(`📊 Received ${movies.length} movies, page ${current_page}/${total_pages}`);
            
            if (!movies || movies.length === 0) {
                console.warn('⚠️ No movies returned');
                this.popularMoviesContainer.innerHTML = `
                    <div class="col-12 text-center">
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle me-2"></i>
                            No movies found. Please try refreshing the page.
                            <button onclick="location.reload()" class="btn btn-link">Refresh</button>
                        </div>
                    </div>
                `;
                return;
            }

            // Render movies grid with pagination
            console.log('🎨 Rendering movies...');
            this.popularMoviesContainer.innerHTML = `
                <div class="row g-4">
                    ${movies.map(movie => this.createMovieCard(movie)).join('')}
                </div>
                ${this.renderPagination(current_page, total_pages)}
            `;

            // Setup handlers after content is rendered
            console.log('🔗 Setting up event handlers...');
            this.attachWatchButtonHandlers();
            this.setupPaginationHandlers();

        } catch (error) {
            console.error('❌ Error loading popular movies:', error);
            this.popularMoviesContainer.innerHTML = `
                <div class="col-12 text-center">
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-circle me-2"></i>
                        Failed to load movies. 
                        <button onclick="location.reload()" class="btn btn-link">Try Again</button>
                    </div>
                </div>
            `;
        }
    }

    renderPagination(currentPage, totalPages) {
        if (totalPages <= 1) return '';
        
        return `
            <nav aria-label="Popular movies navigation" class="mt-4">
                <ul class="pagination justify-content-center">
                    <li class="page-item ${currentPage <= 1 ? 'disabled' : ''}">
                        <button class="page-link" data-page="${currentPage - 1}" ${currentPage <= 1 ? 'disabled' : ''}>
                            Previous
                        </button>
                    </li>
                    ${this.generatePageNumbers(currentPage, totalPages)}
                    <li class="page-item ${currentPage >= totalPages ? 'disabled' : ''}">
                        <button class="page-link" data-page="${currentPage + 1}" ${currentPage >= totalPages ? 'disabled' : ''}>
                            Next
                        </button>
                    </li>
                </ul>
            </nav>
        `;
    }

    generatePageNumbers(currentPage, totalPages) {
        let pages = [];
        const maxVisiblePages = 5;
        
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        if (startPage > 1) {
            pages.push(`
                <li class="page-item">
                    <button class="page-link" data-page="1">1</button>
                </li>
            `);
            if (startPage > 2) {
                pages.push('<li class="page-item disabled"><span class="page-link">...</span></li>');
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            pages.push(`
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <button class="page-link" data-page="${i}">${i}</button>
                </li>
            `);
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pages.push('<li class="page-item disabled"><span class="page-link">...</span></li>');
            }
            pages.push(`
                <li class="page-item">
                    <button class="page-link" data-page="${totalPages}">${totalPages}</button>
                </li>
            `);
        }
        
        return pages.join('');
    }

    setupPaginationHandlers() {
        this.popularMoviesContainer.querySelectorAll('.pagination .page-link').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                const page = parseInt(button.dataset.page);
                if (!isNaN(page)) {
                    await this.loadPopularMovies(page);
                    // Scroll to top of container smoothly
                    this.popularMoviesContainer.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }
    
    async loadGenres() {
        if (!this.genresContainer) return;
        
        try {
            const response = await apiService.getGenres();
            
            // Clear container
            this.genresContainer.innerHTML = '';
            
            // Extract genres array from response
            const genres = response.genres || [];
            console.log('Genres array:', genres); // Debug statement
            
            // Display genres
            genres.forEach(genre => {
                const genreCard = document.createElement('div');
                genreCard.className = 'col-md-3 col-sm-4 col-6';
                genreCard.innerHTML = `
                    <div class="genre-card" data-genre-id="${genre.id}">
                        <h5>${genre.name}</h5>
                    </div>
                `;
                
                genreCard.querySelector('.genre-card').addEventListener('click', () => {
                    window.location.href = `pages/genre.html?id=${genre.id}&name=${encodeURIComponent(genre.name)}`;
                });
                
                this.genresContainer.appendChild(genreCard);
            });
        } catch (error) {
            console.error('Error loading genres:', error);
            this.genresContainer.innerHTML = `
                <div class="col-12 text-center">
                    <div class="alert alert-danger">
                        Failed to load genres. Please try again later.
                    </div>
                </div>
            `;
        }
    }
    
    createMovieCard(movie) {
        return `
            <div class="col-md-3 col-sm-6 mb-4">
                <div class="card movie-card h-100">
                    <img src="${apiService.getImageUrl(movie.poster_path)}" 
                         class="card-img-top" 
                         alt="${movie.title}"
                         onerror="this.onerror=null; this.src='assets/images/placeholder.jpg'">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title text-truncate" title="${movie.title}">${movie.title}</h5>
                        <p class="card-text">
                            <small class="text-muted">
                                ${movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A'}
                            </small>
                            <span class="float-end">
                                <i class="fas fa-star text-warning"></i> 
                                ${movie.vote_average?.toFixed(1) || 'N/A'}
                            </span>
                        </p>
                        <div class="mt-auto d-grid gap-2">
                            <a href="pages/movie.html?id=${movie.tmdb_id || movie.id}" 
                               class="btn btn-primary">View Details</a>
                            ${this.isAuthenticated ? `
                                <button class="btn btn-outline-light watch-btn" 
                                        data-movie-id="${movie.id}">
                                    <i class="fas fa-check"></i> Mark as Watched
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        movieCard.addEventListener('click', () => {
            window.location.href = `pages/movie-details.html?id=${movie.id}`;
        });
    }

    attachWatchButtonHandlers() {
        if (!this.isAuthenticated) return;
        
        document.querySelectorAll('.watch-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const movieId = button.dataset.movieId;
                try {
                    await apiService.addToWatchHistory(movieId);
                    button.disabled = true;
                    button.innerHTML = '<i class="fas fa-check"></i> Watched';
                    this.showToast('Added to watch history!', 'success');
                } catch (error) {
                    this.showToast('Error adding to watch history', 'danger');
                }
            });
        });
    }
    
    showLoadingSpinner() {
        const spinner = document.createElement('div');
        spinner.className = 'spinner-overlay';
        spinner.innerHTML = `
            <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                <span class="visually-hidden">Loading...</span>
            </div>
        `;
        document.body.appendChild(spinner);
        return spinner;
    }
    
    hideLoadingSpinner(spinner) {
        if (spinner && spinner.parentNode) {
            spinner.parentNode.removeChild(spinner);
        }
    }
}

// Initialize the app with debugging
console.log('📝 Script loaded, creating MovieApp instance');
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌟 DOMContentLoaded fired');
    window.movieApp = new MovieApp();
});

// Log readyState changes
document.onreadystatechange = () => {
    console.log('📄 Document readyState:', document.readyState);
};

// Add to assets/js/main.js

document.addEventListener('DOMContentLoaded', () => {

    // Image loading animation
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        img.classList.add('loading');
        img.onload = () => {
            img.classList.remove('loading');
            img.classList.add('loaded');
        };
    });

    // Handle hero image loading
    const heroImage = document.querySelector('.hero-image');
    if (heroImage) {
        heroImage.onload = () => {
            heroImage.classList.remove('loading');
            heroImage.classList.add('loaded');
        };

        // If image is already loaded when script runs
        if (heroImage.complete) {
            heroImage.classList.remove('loading');
            heroImage.classList.add('loaded');
        }
    }
});

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

// Close sidebar on window resize if it's open
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        const sidebar = document.getElementById("mySidebar");
        const mainContent = document.getElementById("main-content");
        const overlay = document.querySelector(".sidebar-overlay");
        
        sidebar.classList.remove("active");
        mainContent.classList.remove("shifted");
        overlay.style.display = "none";
    }
});

// Close sidebar when clicking outside
document.addEventListener('click', (e) => {
    const sidebar = document.getElementById("mySidebar");
    const sidebarToggle = document.querySelector(".sidebar-toggle");
    
    if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target) && sidebar.classList.contains("active")) {
        toggleSidebar();
    }
});

// Add search form handler
document.addEventListener('DOMContentLoaded', function() {
    const searchForm = document.getElementById('search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const query = document.getElementById('search-input').value.trim();
            if (query) {
                window.location.href = `pages/search-results.html?query=${encodeURIComponent(query)}`;
            }
        });
    }
});