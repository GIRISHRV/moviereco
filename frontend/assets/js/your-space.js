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
        this.watchHistoryContainer = document.getElementById('watch-history-container');
        this.recommendationsContainer = document.getElementById('recommendations-container');
        
        this.isAuthenticated = localStorage.getItem('token') !== null;
        
        // Verify apiService is available
        if (typeof apiService === 'undefined') {
            console.error('API Service not loaded!');
            this.showError('Failed to initialize API service');
            return;
        }
        
        this.showLoadingState();
        this.init();
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

    async init() {
        try {
            // Remove model training and just load content
            await Promise.all([
                this.loadWatchHistory(),
                this.loadRecommendations()
            ]);
        } catch (error) {
            console.error('Error initializing Your Space:', error);
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

    createMovieCard(movie) {
        return `
            <div class="col-md-2 col-sm-4 col-6 mb-4">
                <div class="card bg-dark text-white movie-card h-100">
                    <div class="card-img-wrapper position-relative">
                        <img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" 
                             class="card-img-top" 
                             alt="${movie.title}"
                             onerror="this.src='../assets/images/placeholder.jpg'">
                    </div>
                    <div class="card-body d-flex flex-column">
                        <h6 class="card-title text-truncate mb-1">${movie.title}</h6>
                        <small class="text-muted mb-2">
                            ${new Date(movie.watched_at || movie.release_date).getFullYear()}
                        </small>
                        <div class="mt-auto">
                            <button class="btn btn-sm btn-danger w-100 remove-watch-btn" 
                                    data-movie-id="${movie.id}">
                                <i class="fas fa-trash-alt me-1"></i>Remove
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    createWatchHistoryCard(movie) {
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
                            <button class="btn btn-outline-danger remove-watch-btn" 
                                    data-movie-id="${movie.id}">
                                <i class="fas fa-trash-alt"></i> Remove
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    createRecommendationCard(movie) {
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

    showError(message) {
        const errorHtml = `
            <div class="col-12">
                <div class="alert alert-danger">
                    ${message}
                </div>
            </div>
        `;
        
        if (this.watchHistoryContainer) {
            this.watchHistoryContainer.innerHTML = errorHtml;
        }
        if (this.recommendationsContainer) {
            this.recommendationsContainer.innerHTML = errorHtml;
        }
    }

    showLoading(container) {
        if (container) {
            container.innerHTML = `
                <div class="text-center col-12">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            `;
        }
    }
}

// Initialize when DOM is loaded AND verify API service is available
document.addEventListener('DOMContentLoaded', () => {
    // Check if API service is loaded
    if (typeof apiService === 'undefined') {
        console.error('API Service not loaded. Check script inclusion order.');
        return;
    }
    new YourSpace();
});