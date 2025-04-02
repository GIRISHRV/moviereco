/**
 * Movie details page JavaScript
 * Handles movie details display and user interactions
 */

class MoviePage {
    constructor() {
        this.isAuthenticated = false;
        this.hasWatched = false;
        this.watchHistoryCache = new Set();
        
        // Wait for DOM to be fully loaded before initializing
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }

        this.setupRatingHandlers = this.setupRatingHandlers.bind(this);
    }

    async initialize() {
        try {
            this.movieId = this.getMovieIdFromUrl();
            if (!this.movieId) {
                console.error('No movie ID found in URL');
                this.showError('Invalid movie ID');
                return;
            }

            // Initialize container references
            this.movieDetailsContainer = document.getElementById('movie-details');
            this.similarMoviesContainer = document.getElementById('similar-movies');
            this.reviewsContainer = document.getElementById('reviews-container');
            this.reviewsPagination = document.getElementById('reviews-pagination');
            this.trailerContainer = document.getElementById('movie-trailer');

            // Check auth status first
            this.isAuthenticated = this.checkAuthStatus();
            
            // If authenticated, load watch history
            if (this.isAuthenticated) {
                await this.loadWatchHistory();
            }

            // Show initial loading state
            this.showLoading();

            // Load all data
            await this.loadMovieData();

        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Failed to initialize page');
        }
    }

    validateMovieData(movie) {
        if (!movie) return false;
        
        const requiredFields = ['id', 'title', 'release_date', 'vote_average'];
        return requiredFields.every(field => movie[field] !== undefined && movie[field] !== null);
    }
    getMovieIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    async loadMovieData(retryCount = 3) {
        try {
            console.log('🎬 Loading movie data for ID:', this.movieId);
            
            // Load all data in parallel
            const [movieDetails, similarMovies, reviews, videos] = await Promise.all([
                this.loadMovieDetails(),
                this.loadSimilarMovies(),
                this.loadReviews(),
                this.loadTrailer()
            ]);

            // Additional validation
            if (!movieDetails || !movieDetails.title) {
                throw new Error('Invalid movie details received');
            }

            console.log('✅ Movie data loaded successfully');

        } catch (error) {
            console.error('❌ Error loading movie data:', error);
            
            if (retryCount > 0) {
                console.log(`🔄 Retrying... (${retryCount} attempts left)`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                await this.loadMovieData(retryCount - 1);
            } else {
                this.showError('Failed to load movie details. Please refresh the page.');
            }
        } finally {
            this.hideLoading();
        }
    }

    async init() {
        try {
            await this.checkWatchStatus(); // Keep the watch status check
            
            // Show loading states with delay
            setTimeout(() => {
                if (!this.movieDetailsContainer.querySelector('.movie-content')) {
                    this.showLoadingState();
                }
            }, 300);
            
            // Update to load all three in parallel
            await Promise.all([
                this.loadMovieDetails(),
                this.loadSimilarMovies(),
                this.loadReviews(),
                this.loadTrailer() // Add this
            ]);
            
        } catch (error) {
            console.error('Error initializing movie page:', error);
            this.showError('Failed to load movie details');
        }
    }

    showLoadingState() {
        if (this.loadingState.details && this.movieDetailsContainer) {
            // Only show loading if no content exists
            if (!this.movieDetailsContainer.querySelector('.movie-content')) {
                this.movieDetailsContainer.innerHTML = `
                    <div class="loading-state">
                        <div class="text-center py-5">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <p class="mt-3">Loading movie details...</p>
                        </div>
                    </div>
                `;
            }
        }

        // Similar movies loading state remains the same
        if (this.loadingState.similar && this.similarMoviesContainer) {
            this.similarMoviesContainer.innerHTML = `
                <div class="text-center py-3">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            `;
        }

        // Watch button loader
        const watchButton = document.getElementById('watch-button');
        if (this.loadingState.watchState && watchButton) {
            setTimeout(() => {
                watchButton.disabled = true;
                watchButton.innerHTML = `
                    <span class="spinner-border spinner-border-sm" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </span>
                    Loading...
                `;
            }, 300); // 300ms delay
        }
    }

    hideLoadingState() {
        this.loadingState.details = false;
        this.loadingState.similar = false;
        this.loadingState.watchState = false;
    }

    async checkWatchStatus() {
        try {
            const history = await apiService.getWatchHistory();
            this.hasWatched = history.some(movie => movie.tmdb_id === parseInt(this.movieId));
            this.updateWatchButton();
        } catch (error) {
            console.error('Error checking watch status:', error);
        }
    }

    updateWatchButton() {
        const watchButton = document.getElementById('watch-button');
        if (!watchButton) {
            console.warn('⚠️ Watch button not found');
            return;
        }

        console.log('🔄 Updating watch button, hasWatched:', this.hasWatched);
        
        if (this.hasWatched) {
            watchButton.classList.remove('btn-outline-light');
            watchButton.classList.add('btn-secondary');
            watchButton.innerHTML = '<i class="fas fa-check"></i> Watched';
            watchButton.disabled = true;
        } else {
            watchButton.classList.remove('btn-secondary');
            watchButton.classList.add('btn-outline-light');
            watchButton.innerHTML = '<i class="fas fa-plus"></i> Mark as Watched';
            watchButton.disabled = false;
        }
    }

    async loadMovieDetails() {
        try {
            console.log('📥 Fetching movie details...');
            const movie = await apiService.getMovieDetails(this.movieId);
            
            if (!this.validateMovieData(movie)) {
                throw new Error('Invalid movie data received');
            }
    
            console.log('📦 Movie details:', movie);
            this.renderMovieDetails(movie);
            return movie;
        } catch (error) {
            console.error('❌ Error loading movie details:', error);
            throw error;
        }
    }

    async loadSimilarMovies(page = 1) {
        try {
            if (!this.similarMoviesContainer) return;
            
            // Show loading state
            this.similarMoviesContainer.innerHTML = `
                <div class="text-center py-3">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            `;

            // Store watch button state
            const watchButton = document.getElementById('watch-button');
            const currentWatchState = watchButton ? {
                disabled: watchButton.disabled,
                innerHTML: watchButton.innerHTML,
                className: watchButton.className
            } : null;
            
            const response = await apiService.getSimilarMovies(this.movieId, page);
            
            // Render the movies
            this.renderSimilarMovies(response);
            
            // Restore watch button state
            if (currentWatchState && watchButton) {
                watchButton.disabled = currentWatchState.disabled;
                watchButton.innerHTML = currentWatchState.innerHTML;
                watchButton.className = currentWatchState.className;
            }
        } catch (error) {
            console.error('Error loading similar movies:', error);
            this.similarMoviesContainer.innerHTML = `
                <div class="alert alert-danger">
                    Failed to load similar movies. Please try again later.
                </div>
            `;
        }
    }

    async loadReviews(page = 1) {
        try {
            console.log('Starting to load reviews...');
            if (!this.movieId) {
                console.error('No movie ID available for loading reviews');
                return;
            }
    
            console.log(`Loading reviews for movie ${this.movieId}, page ${page}`);
            const response = await apiService.getMovieReviews(this.movieId, page);
            console.log('Review response received:', response);
    
            if (!this.reviewsContainer) {
                console.error('Reviews container not found');
                return;
            }
    
            this.renderReviews(response);
        } catch (error) {
            console.error('Error loading reviews:', error);
            if (this.reviewsContainer) {
                this.reviewsContainer.innerHTML = `
                    <div class="alert alert-danger">
                        Failed to load reviews. Please try again later.
                    </div>
                `;
            }
        }
    }
    
    async loadTrailer() {
        try {
            console.log('🎬 Loading trailer for movie:', this.movieId);
            const videos = await apiService.getMovieVideos(this.movieId);
            console.log('📽️ Videos response:', videos);

            if (!videos || !videos.length) {
                console.log('⚠️ No videos found');
                this.renderNoTrailer();
                return;
            }

            // Find the first official trailer
            const trailer = videos.find(video => 
                video.type?.toLowerCase() === 'trailer' && 
                video.site?.toLowerCase() === 'youtube'
            ) || videos[0];

            console.log('🎥 Selected trailer:', trailer);
            this.renderTrailer(trailer);
        } catch (error) {
            console.error('❌ Error loading trailer:', error);
            this.renderNoTrailer();
        }
    }

    renderTrailer(trailer) {
        if (!this.trailerContainer) return;

        this.trailerContainer.innerHTML = `
            <div class="container py-5">
                <h3 class="mb-4">
                    <i class="fas fa-film me-2"></i>Official Trailer
                </h3>
                <div class="ratio ratio-16x9 rounded overflow-hidden shadow">
                    <iframe 
                        src="https://www.youtube.com/embed/${trailer.key}?rel=0"
                        title="${trailer.name}"
                        class="rounded"
                        allowfullscreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    ></iframe>
                </div>
            </div>
        `;
    }

    renderNoTrailer() {
        if (!this.trailerContainer) return;

        this.trailerContainer.innerHTML = `
            <div class="container py-5">
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    No trailer available for this movie.
                </div>
            </div>
        `;
    }

    async loadWatchHistory() {
        try {
            console.log('📝 Loading watch history...');
            const history = await apiService.getWatchHistory();
            
            // Store IDs in cache
            this.watchHistoryCache = new Set(history.map(m => m.tmdb_id.toString()));
            
            // Check if current movie is watched
            this.hasWatched = this.watchHistoryCache.has(this.movieId.toString());
            
            console.log('✅ Watch history loaded, current movie watched:', this.hasWatched);
            
            // Update UI if needed
            this.updateWatchButton();
            
        } catch (error) {
            console.error('❌ Error loading watch history:', error);
        }
    }

    async renderMovieDetails(movie) {
        if (!this.movieDetailsContainer) {
            console.error('Cannot render movie details: Container not found');
            return;
        }

        // Check authentication status first
        this.isAuthenticated = this.checkAuthStatus();
        console.log('🔐 Auth status:', this.isAuthenticated);

        const posterUrl = apiService.getImageUrl(movie.poster_path);
        const rating = movie.vote_average ? (movie.vote_average / 2).toFixed(1) : 'N/A';
        
        this.movieDetailsContainer.innerHTML = `
            <div class="movie-content">
                <div class="container py-5">
                    <div class="row">
                        <div class="col-md-4">
                            <img src="${posterUrl}" 
                                 class="img-fluid rounded movie-poster-detail" 
                                 alt="${movie.title}"
                                 onerror="this.onerror=null; this.src='../assets/images/placeholder.jpg';">
                            <div class="mt-3">
                                ${this.isAuthenticated ? `
                                    <button id="watch-button" 
                                            class="btn ${this.hasWatched ? 'btn-secondary' : 'btn-outline-light'} w-100" 
                                            data-movie-id="${movie.id}"
                                            ${this.hasWatched ? 'disabled' : ''}>
                                        <i class="fas ${this.hasWatched ? 'fa-check' : 'fa-plus'}"></i> 
                                        ${this.hasWatched ? 'Watched' : 'Mark as Watched'}
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                        <div class="col-md-8">
                            <h2>${movie.title}</h2>
                            <div class="d-flex align-items-center mb-3">
                                <div class="me-3">
                                    <span class="badge bg-warning text-dark">
                                        <i class="fas fa-star"></i> ${rating}
                                    </span>
                                </div>
                                <div class="text-muted">
                                    ${movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A'} | 
                                    ${movie.runtime ? `${movie.runtime} min` : 'N/A'}
                                </div>
                            </div>
                            <p class="lead">${movie.overview || 'No overview available.'}</p>
                            <div class="genres mb-3">
                                ${movie.genres?.map(genre => 
                                    `<span class="badge bg-primary me-2">${genre.name}</span>`
                                ).join('') || ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add rating stars
        const ratingContainer = document.createElement('div');
        ratingContainer.className = 'rating-container mb-3';
        ratingContainer.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="rating-stars me-2">
                    ${this.createRatingStars()}
                </div>
                <small class="text-muted" id="rating-text">Rate this movie</small>
            </div>
        `;

        // Insert after movie title
        const movieTitle = this.movieDetailsContainer.querySelector('h2');
        movieTitle.parentNode.insertBefore(ratingContainer, movieTitle.nextSibling);

        // Setup rating handlers
        this.setupRatingHandlers();
        
        // Load user's rating
        await this.loadUserRating(movie.id);

        // Add watch button handler after rendering
        if (this.isAuthenticated) {
            const watchButton = document.getElementById('watch-button');
            if (watchButton) {
                watchButton.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    if (this.hasWatched) return;
                    
                    try {
                        watchButton.disabled = true;
                        watchButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Adding...';
                        
                        await this.addToWatchHistory(movie.id);
                    } catch (error) {
                        watchButton.disabled = false;
                        this.updateWatchButton();
                    }
                });
            }
        }
    }

    renderSimilarMovies(response) {
        // Add loading state with fade transition
        this.similarMoviesContainer.innerHTML = `
            <div class="container fade-in">
                <h3 class="mb-4">Similar Movies You Might Like</h3>
                <div id="similarMoviesCarousel" class="carousel slide" data-bs-ride="carousel">
                    <div class="carousel-indicators">
                        ${this.createCarouselIndicators(response.movies)}
                    </div>
                    <div class="carousel-inner">
                        ${this.createCarouselItems(response.movies)}
                    </div>
                    <button class="carousel-control-prev" type="button" data-bs-target="#similarMoviesCarousel" data-bs-slide="prev">
                        <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                        <span class="visually-hidden">Previous</span>
                    </button>
                    <button class="carousel-control-next" type="button" data-bs-target="#similarMoviesCarousel" data-bs-slide="next">
                        <span class="carousel-control-next-icon" aria-hidden="true"></span>
                        <span class="visually-hidden">Next</span>
                    </button>
                </div>
            </div>
        `;
    
        // Initialize carousel
        new bootstrap.Carousel(document.getElementById('similarMoviesCarousel'), {
            interval: 3000,
            wrap: true
        });
    
        // Setup watch button handlers
        this.setupWatchButtonHandlers();
    }
    

    renderReviews(response) {
        if (!this.reviewsContainer) return;

        const { results, page, total_pages } = response;

        if (!results || results.length === 0) {
            this.reviewsContainer.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    No reviews available for this movie yet.
                </div>
            `;
            return;
        }

        this.reviewsContainer.innerHTML = `
            ${results.map(review => {
                const date = new Date(review.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                const rating = review.author_details?.rating;
                
                return `
                    <div class="review-card">
                        <div class="review-header">
                            <img src="https://secure.gravatar.com/avatar/${review.author_details?.avatar_path || ''}" 
                                 alt="${review.author}"
                                 onerror="this.src='../assets/images/user-placeholder.jpg'">
                            <div>
                                <h5 class="review-author">${review.author}</h5>
                                <span class="review-date">
                                    <i class="far fa-calendar-alt me-1"></i>
                                    ${date}
                                </span>
                            </div>
                        </div>
                        <div class="review-content">
                            ${review.content}
                        </div>
                        ${rating ? `
                            <div class="review-rating">
                                <div class="star-rating">
                                    <i class="fas fa-star"></i>
                                </div>
                                <span>${rating}/10</span>
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('')}
        `;

        if (total_pages > 1) {
            this.reviewsPagination.innerHTML = this.renderPagination(page, total_pages);
            this.setupPaginationHandlers(this.reviewsPagination, (newPage) => {
                this.loadReviews(newPage);
            });
        }
    }
    

    setupPaginationHandlers(container, callback) {
        if (!container) return;
        
        container.querySelectorAll('.page-link').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                const page = parseInt(button.dataset.page);
                if (!isNaN(page)) {
                    // Scroll to top of similar movies section
                    this.similarMoviesContainer.scrollIntoView({ behavior: 'smooth' });
                    await callback(page);
                }
            });
        });
    }

    createMovieCard(movie) {
        const releaseDate = movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A';
        return `
            <div class="col-md-3 col-sm-6 mb-4">
                <div class="card h-100 movie-card">
                    <img src="${apiService.getImageUrl(movie.poster_path)}" 
                         class="card-img-top" 
                         alt="${movie.title}"
                         onerror="this.onerror=null; this.src='../assets/images/placeholder.jpg';">
                    <div class="card-body">
                        <h5 class="card-title text-truncate" title="${movie.title}">${movie.title}</h5>
                        <p class="card-text">
                            <small class="text-muted">${releaseDate}</small>
                            <span class="float-end">
                                <i class="fas fa-star text-warning"></i> 
                                ${movie.vote_average?.toFixed(1) || 'N/A'}
                            </span>
                        </p>
                        <div class="d-grid gap-2">
                            <a href="movie.html?id=${movie.tmdb_id || movie.id}" 
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
    }

    createSimilarMovieCard(movie) {
        return createMovieCard(movie, {
            showWatchButton: this.isAuthenticated,
            isWatched: this.watchHistoryCache.has(movie.id.toString())
        });
    }

    showError(message, type = 'danger') {
        const container = this.movieDetailsContainer || document.body;
        container.innerHTML = `
            <div class="container py-5">
                <div class="alert alert-${type} fade-in">
                    <i class="fas ${type === 'danger' ? 'fa-exclamation-circle' : 'fa-info-circle'} me-2"></i>
                    ${message}
                    <button type="button" class="btn btn-outline-light btn-sm ms-3" onclick="location.reload()">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                </div>
            </div>
        `;
    }

    showToast(message, type = 'info') {
        const toastContainer = document.querySelector('.toast-container') 
            || this.createToastContainer();

        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" 
                        data-bs-dismiss="toast"></button>
            </div>
        `;

        toastContainer.appendChild(toast);
        new bootstrap.Toast(toast).show();
    }

    createToastContainer() {
        const container = document.createElement('div');
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        document.body.appendChild(container);
        return container;
    }

    addLoadingStates() {
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                button.classList.add('disabled');
                button.innerHTML = `
                    <span class="spinner-border spinner-border-sm" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </span>
                    Loading...
                `;
            });
        });
    }

    showLoading() {
        // Add loading state to the movie details container
        if (this.movieDetailsContainer) {
            this.movieDetailsContainer.innerHTML = `
                <div class="container py-5 text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-3">Loading movie details...</p>
                </div>
            `;
        }
        
        // Add loading state to similar movies container
        if (this.similarMoviesContainer) {
            this.similarMoviesContainer.innerHTML = `
                <div class="col-12 text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            `;
        }

        // Add loading state for trailer
        if (this.trailerContainer) {
            this.trailerContainer.innerHTML = `
                <div class="container py-5 text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-3">Loading trailer...</p>
                </div>
            `;
        }
    }

    hideLoading() {
        // Loading is hidden when content is rendered
        // Nothing to do here as the containers are populated with content
    }

    // Add a method to check and refresh authentication status
    checkAuthStatus() {
        console.log('🔍 Checking auth status...');
        const token = localStorage.getItem('token');
        const result = !!token;
        console.log('🔐 Auth result:', result);
        return result;
    }

    // Update event listeners at the bottom of the file
    initializeEventListeners() {
        // Listen for authentication changes
        window.addEventListener('storage', (event) => {
            if (event.key === 'token') {
                const wasAuthenticated = this.isAuthenticated;
                this.checkAuthStatus();
                
                // Only reload content if auth state actually changed
                if (wasAuthenticated !== this.isAuthenticated) {
                    this.loadSimilarMovies();
                    
                    // Update auth-required elements visibility
                    const authElements = document.querySelectorAll('.auth-required');
                    authElements.forEach(el => {
                        el.style.display = this.isAuthenticated ? '' : 'none';
                    });
                }
            }
        });
    }

    renderPagination(currentPage, totalPages, containerId) {
        if (totalPages <= 1) return '';
        
        return `
            <nav aria-label="Movie navigation" class="mt-4">
                <ul class="pagination justify-content-center">
                    <li class="page-item ${currentPage <= 1 ? 'disabled' : ''}">
                        <button class="page-link" data-page="${currentPage - 1}" 
                                ${currentPage <= 1 ? 'disabled' : ''}>
                            Previous
                        </button>
                    </li>
                    ${this.generatePageNumbers(currentPage, totalPages)}
                    <li class="page-item ${currentPage >= totalPages ? 'disabled' : ''}">
                        <button class="page-link" data-page="${currentPage + 1}" 
                                ${currentPage >= totalPages ? 'disabled' : ''}>
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

    setupWatchButtonHandlers() {
        if (!this.isAuthenticated) return;
        
        this.similarMoviesContainer.querySelectorAll('.watch-btn').forEach(button => {
            if (button.disabled) return;
            
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const movieId = button.dataset.movieId;
                
                try {
                    button.disabled = true;
                    button.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Adding...';
                    
                    await apiService.addToWatchHistory(movieId);
                    
                    button.classList.remove('btn-outline-light');
                    button.classList.add('btn-secondary');
                    button.innerHTML = '<i class="fas fa-check"></i> Watched';
                    
                    this.showToast('Added to watch history!', 'success');
                } catch (error) {
                    console.error('Error adding to watch history:', error);
                    button.disabled = false;
                    button.innerHTML = '<i class="fas fa-plus"></i> Mark as Watched';
                    this.showToast('Error adding to watch history', 'danger');
                }
            });
        });
    }

    createCarouselItems(movies) {
        // Create groups of 4 movies for each carousel slide
        const itemsPerSlide = 4;
        const slides = [];

        for (let i = 0; i < movies.length; i += itemsPerSlide) {
            const movieGroup = movies.slice(i, i + itemsPerSlide);
            slides.push(`
                <div class="carousel-item ${i === 0 ? 'active' : ''}">
                    <div class="row g-4">
                        ${movieGroup.map(movie => {
                            const releaseDate = movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A';
                            const isWatched = movie.is_watched;
                            return `
                                <div class="col-md-3">
                                    <div class="card h-100 movie-card">
                                        <img src="${apiService.getImageUrl(movie.poster_path)}" 
                                             class="card-img-top" 
                                             alt="${movie.title}"
                                             onerror="this.onerror=null; this.src='../assets/images/placeholder.jpg';">
                                        <div class="card-body">
                                            <h5 class="card-title text-truncate" title="${movie.title}">${movie.title}</h5>
                                            <p class="card-text">
                                                <small class="text-muted">${releaseDate}</small>
                                                <span class="float-end">
                                                    <i class="fas fa-star text-warning"></i> 
                                                    ${movie.vote_average?.toFixed(1) || 'N/A'}
                                                </span>
                                            </p>
                                            <div class="d-grid gap-2">
                                                <a href="movie.html?id=${movie.id}" 
                                                   class="btn btn-primary">View Details</a>
                                                ${this.isAuthenticated ? `
                                                    <button class="btn btn-outline-light watch-btn" 
                                                            data-movie-id="${movie.id}"
                                                            ${isWatched ? 'disabled' : ''}>
                                                        <i class="fas ${isWatched ? 'fa-check' : 'fa-plus'}"></i> 
                                                        ${isWatched ? 'Watched' : 'Mark as Watched'}
                                                    </button>
                                                ` : ''}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `);
        }

        return slides.join('');
    }

    createCarouselIndicators(movies) {
        const slides = Math.ceil(movies.length / 4);
        return Array(slides).fill(0).map((_, i) => `
            <button type="button" 
                    data-bs-target="#similarMoviesCarousel" 
                    data-bs-slide-to="${i}" 
                    ${i === 0 ? 'class="active"' : ''}
                    aria-label="Slide ${i + 1}"></button>
        `).join('');
    }

    async addToWatchHistory(movieId) {
        try {
            await apiService.addToWatchHistory(movieId);
            this.watchHistoryCache.add(movieId.toString());
            this.hasWatched = true;
            this.updateWatchButton();
            this.showToast('Added to watch history!', 'success');
        } catch (error) {
            console.error('Error adding to watch history:', error);
            this.showToast('Failed to update watch history', 'danger');
            throw error;
        }
    }

    createRatingStars() {
        return Array.from({ length: 5 }, (_, i) => `
            <i class="fas fa-star rating-star" 
               data-rating="${i + 1}" 
               title="${i + 1} stars"></i>
        `).join('');
    }

    async loadUserRating(movieId) {
        const rating = await apiService.getMovieRating(movieId);
        if (rating) {
            this.updateRatingDisplay(rating);
        }
    }

    setupRatingHandlers() {
        console.log('🌟 Setting up rating handlers');
        const stars = document.querySelectorAll('.rating-star');
        const ratingText = document.getElementById('rating-text');

        stars.forEach(star => {
            star.addEventListener('mouseenter', () => {
                console.log('⭐ Mouse enter on star:', star.dataset.rating);
                const rating = parseInt(star.dataset.rating);
                this.highlightStars(rating);
            });

            star.addEventListener('mouseleave', async () => {
                console.log('⭐ Mouse leave star');
                const currentRating = await apiService.getMovieRating(this.movieId);
                this.highlightStars(currentRating || 0);
            });

            star.addEventListener('click', async () => {
                const rating = parseInt(star.dataset.rating);
                console.log('⭐ Rating clicked:', rating);
                
                try {
                    await apiService.rateMovie(this.movieId, rating);
                    this.updateRatingDisplay(rating);
                    this.showToast('Rating updated successfully', 'success');
                } catch (error) {
                    console.error('❌ Rating error:', error);
                    this.showToast('Failed to update rating', 'danger');
                }
            });
        });
    }

    highlightStars(rating) {
        const stars = document.querySelectorAll('.rating-star');
        stars.forEach((star, index) => {
            star.classList.toggle('text-warning', index < rating);
        });
    }

    updateRatingDisplay(rating) {
        this.highlightStars(rating);
        const ratingText = document.getElementById('rating-text');
        if (ratingText) {
            ratingText.textContent = `Your rating: ${rating} stars`;
        }
    }
}

// Initialize only after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const moviePage = new MoviePage();
    moviePage.initializeEventListeners();
});

function toggleSidebar() {
    const sidebar = document.getElementById("mySidebar");
    const mainContent = document.getElementById("main-content");
    const overlay = document.querySelector(".sidebar-overlay");
    
    if (sidebar.classList.contains("active")) {
        sidebar.classList.remove("active");
        mainContent.classList.remove("shifted");
        overlay.style.display = "none";
        document.body.style.overflow = "auto";
    } else {
        sidebar.classList.add("active");
        mainContent.classList.add("shifted");
        overlay.style.display = "block";
        document.body.style.overflow = "hidden";
    }
}