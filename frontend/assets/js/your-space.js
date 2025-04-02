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

class YourSpace {
    constructor() {
        console.log('🚀 Initializing Your Space...');
        this.setupContainers();
        this.init();
    }

    setupContainers() {
        this.ratingsContainer = document.getElementById('ratings-container');
        if (!this.ratingsContainer) {
            console.error('❌ Ratings container not found!');
        }
        
        this.watchHistoryContainer = document.getElementById('watch-history-container');
        if (!this.watchHistoryContainer) {
            console.error('❌ Watch history container not found!');
        }
        
        this.recommendationsContainer = document.getElementById('recommendations-container');
        if (!this.recommendationsContainer) {
            console.error('❌ Recommendations container not found!');
        }
    }

    async init() {
        try {
            console.log('📥 Loading user data...');
            await this.loadRatings();
            await this.loadWatchHistory();
            await this.loadRecommendations();
        } catch (error) {
            console.error('❌ Error initializing:', error);
            this.showError(error.message);
        }
    }

    async loadRatings() {
        console.log('🌟 Loading ratings...');
        try {
            // Show loading state
            this.ratingsContainer.innerHTML = this.getLoadingHTML();

            const response = await apiService.getUserRatings();
            console.log('📦 Ratings loaded:', response);

            if (!response?.ratings?.length) {
                this.ratingsContainer.innerHTML = this.getEmptyStateHTML('ratings');
                return;
            }

            this.ratingsContainer.innerHTML = response.ratings
                .map(movie => this.createRatingCard(movie))
                .join('');

        } catch (error) {
            console.error('❌ Ratings error:', error);
            this.ratingsContainer.innerHTML = this.getErrorHTML('Failed to load ratings');
        }
    }

    async loadWatchHistory() {
        try {
            const history = await apiService.getWatchHistory();
            
            if (!history.length) {
                this.watchHistoryContainer.innerHTML = `
                    <div class="col-12 text-center py-4">
                        <p class="text-muted">You haven't watched any movies yet.</p>
                        <a href="../index.html" class="btn btn-primary">
                            <i class="fas fa-film me-2"></i>Browse Movies
                        </a>
                    </div>
                `;
                return;
            }

            this.watchHistoryContainer.innerHTML = `
                <div class="row g-3">
                    ${history.map(movie => this.createWatchHistoryCard(movie)).join('')}
                </div>
            `;

            this.setupEventListeners();

        } catch (error) {
            console.error('Error loading watch history:', error);
            this.showError('Failed to load watch history');
        }
    }

    async loadRecommendations() {
        try {
            const recommendations = await apiService.getPersonalizedRecommendations();
            
            if (!recommendations.length) {
                this.recommendationsContainer.innerHTML = `
                    <div class="col-12 text-center">
                        <p>Start watching movies to get personalized recommendations!</p>
                    </div>
                `;
                return;
            }

            this.recommendationsContainer.innerHTML = recommendations
                .map(movie => this.createRecommendationCard(movie))
                .join('');

        } catch (error) {
            console.error('Error loading recommendations:', error);
            this.recommendationsContainer.innerHTML = `
                <div class="col-12 text-center">
                    <p>Error loading recommendations. Please try again later.</p>
                </div>
            `;
        }
    }

    createMovieCard(movie, options = {}) {
        const {
            showWatchButton = false,
            showRemoveButton = false,
            showRating = true,
            isWatched = false
        } = options;

        return `
            <div class="col-6 col-sm-4 col-md-3 col-lg-2 mb-4">
                <div class="card bg-dark h-100 movie-card">
                    <img src="${apiService.getImageUrl(movie.poster_path)}" 
                         class="card-img-top" 
                         alt="${movie.title}"
                         title="${movie.title}"
                         onerror="this.src='../assets/images/placeholder.jpg'">
                    <div class="card-body d-flex flex-column">
                        <h6 class="card-title text-truncate mb-2">${movie.title}</h6>
                        ${showRating ? `
                            <div class="ratings-container">
                                ${movie.rating ? `
                                    <div class="user-rating mb-2">
                                        <small class="text-muted">Your Rating:</small>
                                        <div class="rating-stars">
                                            ${Array.from({ length: 5 }, (_, i) => `
                                                <i class="fas fa-star ${i < movie.rating ? 'text-warning' : 'text-muted'}"></i>
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                                ${movie.vote_average ? `
                                    <div class="tmdb-rating mb-2">
                                        <small class="text-muted">TMDB Rating:</small>
                                        <div class="rating-stars">
                                            ${Array.from({ length: 5 }, (_, i) => `
                                                <i class="fas fa-star ${i < (movie.vote_average/2) ? 'text-info' : 'text-muted'}"></i>
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        ` : ''}
                        <div class="movie-metadata mb-3">
                            <small class="text-muted">
                                ${movie.watched_at 
                                    ? `Watched: ${new Date(movie.watched_at).toLocaleDateString()}`
                                    : movie.release_date 
                                        ? new Date(movie.release_date).getFullYear() 
                                        : 'N/A'
                                }
                            </small>
                        </div>
                        <div class="mt-auto d-grid gap-2">
                            <a href="movie.html?id=${movie.tmdb_id || movie.id}" 
                               class="btn btn-primary btn-sm">View Details</a>
                            ${showWatchButton && !isWatched ? `
                                <button class="btn btn-sm btn-outline-light watch-btn" 
                                        data-movie-id="${movie.id}">
                                    <i class="fas fa-plus me-1"></i>Watch
                                </button>
                            ` : ''}
                            ${showRemoveButton ? `  
                                <button class="btn btn-sm btn-outline-danger remove-btn" 
                                        data-movie-id="${movie.id}">
                                    <i class="fas fa-trash-alt me-1"></i>Remove
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    createWatchHistoryCard(movie) {
        return this.createMovieCard(movie, {
            showWatchButton: false,
            showRemoveButton: true,
            isWatched: true
        });
    }

    createRecommendationCard(movie) {
        return this.createMovieCard(movie, {
            showWatchButton: true,
            showRemoveButton: false
        });
    }

    createRatingCard(movie) {
        const dateDisplay = movie.rated_at 
            ? `Rated on ${new Date(movie.rated_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}`
            : '';
    
        return `
            <div class="col-6 col-sm-4 col-md-3 col-lg-2 mb-4">
                <div class="card bg-dark h-100 movie-card">
                    <img src="${apiService.getImageUrl(movie.poster_path)}" 
                         class="card-img-top" 
                         alt="${movie.title}"
                         title="${movie.title}"
                         onerror="this.src='../assets/images/placeholder.jpg'">
                    <div class="card-body d-flex flex-column">
                        <h6 class="card-title text-truncate mb-2">${movie.title}</h6>
                        <div class="ratings-container">
                            <div class="user-rating mb-2">
                                <small class="text-muted">Your Rating:</small>
                                <div class="rating-stars">
                                    ${Array.from({ length: 5 }, (_, i) => `
                                        <i class="fas fa-star ${i < movie.rating ? 'text-warning' : 'text-muted'}"></i>
                                    `).join('')}
                                </div>
                                <small class="text-muted mt-1">${dateDisplay}</small>
                            </div>
                            ${movie.vote_average ? `
                                <div class="tmdb-rating mt-2">
                                    <small class="text-muted">TMDB Rating:</small>
                                    <div class="rating-stars">
                                        ${Array.from({ length: 5 }, (_, i) => `
                                            <i class="fas fa-star ${i < (movie.vote_average/2) ? 'text-info' : 'text-muted'}"></i>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                        <div class="mt-auto">
                            <a href="movie.html?id=${movie.tmdb_id || movie.id}" 
                               class="btn btn-primary btn-sm w-100">View Details</a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Remove from watch history buttons
        document.querySelectorAll('.remove-watch-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const movieId = button.dataset.movieId;
                try {
                    await apiService.removeFromWatchHistory(movieId);
                    await this.loadWatchHistory(); // Reload the list
                    this.showToast('Removed from watch history', 'success');
                } catch (error) {
                    this.showToast('Failed to remove from watch history', 'danger');
                }
            });
        });
    }

    getLoadingHTML() {
        return `
            <div class="col-12 text-center">
                <div class="spinner-border text-light" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;
    }

    getEmptyStateHTML(type) {
        return `
            <div class="col-12 text-center">
                <p class="text-muted">No ${type} yet.</p>
                <a href="discover.html" class="btn btn-primary">
                    <i class="fas fa-film me-2"></i>Discover Movies
                </a>
            </div>
        `;
    }

    getErrorHTML(message) {
        return `
            <div class="col-12">
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    ${message}
                </div>
            </div>
        `;
    }

    showError(message) {
        console.error('❌ Error:', message);
    }

    showLoadingState() {
        const loadingTemplate = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2 text-muted">Loading content...</p>
            </div>
        `;

        if (this.watchHistoryContainer) {
            this.watchHistoryContainer.innerHTML = loadingTemplate;
        }
        if (this.recommendationsContainer) {
            this.recommendationsContainer.innerHTML = loadingTemplate;
        }
    }
}

// Initialize when DOM is loaded AND verify API service is available
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎥 Initializing Your Space page...');
    // Check if API service is loaded
    if (typeof apiService === 'undefined') {
        console.error('API Service not loaded. Check script inclusion order.');
        return;
    }
    new YourSpace();
});