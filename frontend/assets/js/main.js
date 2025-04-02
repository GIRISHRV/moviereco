/**
 * Main JavaScript for the Movie Recommendation System
 * Handles UI interactions and data display
 */
// Add at the beginning of the file
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
class MovieApp {
    constructor() {
        console.log('🎬 MovieApp: Constructor called');
        
        // DOM elements
        this.popularMoviesContainer = document.getElementById('popular-movies');
        this.genresContainer = document.getElementById('genres-container');
        this.searchForm = document.getElementById('search-form');
        this.searchInput = document.getElementById('search-input');
        this.featuredCarousel = document.querySelector('#featuredCarousel .carousel-inner');
        
        console.log('📍 DOM Elements:', {
            popularMovies: !!this.popularMoviesContainer,
            genres: !!this.genresContainer,
            searchForm: !!this.searchForm,
            searchInput: !!this.searchInput,
            featuredCarousel: !!this.featuredCarousel
        });

        // Check authentication status
        this.isAuthenticated = !!localStorage.getItem('token');

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
                this.loadFeaturedMovies(),
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

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        document.body.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        toast.addEventListener('hidden.bs.toast', () => {
            document.body.removeChild(toast);
        });
    }

    async loadFeaturedMovies() {
        if (!this.featuredCarousel) {
            console.log('⚠️ Featured carousel not found, skipping');
            return;
        }

        try {
            console.log('🎭 Loading featured movies...');
            const response = await apiService.getPopularMovies(); // Using getPopularMovies instead
            console.log('📦 Featured movies response:', response);

            const movies = response.movies?.slice(0, 5); // Update to use response.movies
            if (!movies?.length) {
                console.warn('⚠️ No featured movies found');
                return;
            }

            this.featuredCarousel.innerHTML = movies.map((movie, index) => `
                <div class="carousel-item ${index === 0 ? 'active' : ''}">
                    <div class="featured-backdrop" 
                         style="background-image: url('${apiService.getBackdropUrl(movie.backdrop_path)}')">
                    </div>
                    <div class="featured-overlay"></div>
                    <div class="featured-content">
                        <div class="featured-info">
                            <h1 class="featured-title">${movie.title}</h1>
                            <div class="featured-meta">
                                <div class="featured-rating">
                                    <i class="fas fa-star"></i>
                                    <span>${movie.vote_average.toFixed(1)}</span>
                                </div>
                                <span>${new Date(movie.release_date).getFullYear()}</span>
                            </div>
                            <p class="featured-overview">${movie.overview}</p>
                            <div class="featured-buttons">
                                <a href="pages/movie.html?id=${movie.id}" 
                                   class="btn btn-primary btn-lg me-2">
                                    <i class="fas fa-info-circle me-2"></i>More Info
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');

            // Initialize Bootstrap carousel
            new bootstrap.Carousel(document.getElementById('featuredCarousel'), {
                interval: 5000,
                pause: 'hover'
            });

            console.log('✅ Featured movies loaded successfully');

        } catch (error) {
            console.error('❌ Error loading featured movies:', error);
            this.featuredCarousel.innerHTML = `
                <div class="carousel-item active">
                    <div class="featured-content">
                        <div class="alert alert-danger">
                            Failed to load featured movies
                        </div>
                    </div>
                </div>
            `;
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
