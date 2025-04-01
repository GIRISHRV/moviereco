class GenrePage {
    constructor() {
        this.genreTitle = document.getElementById('genre-title');
        this.moviesGrid = document.getElementById('movies-grid');
        this.loadingSpinner = document.getElementById('loading-spinner');
        
        // Get genre ID and name from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        this.genreId = urlParams.get('id');
        this.genreName = urlParams.get('name');
        
        // Initialize
        this.init();
    }
    
    async init() {
        if (!this.genreId || !this.genreName) {
            window.location.href = '../index.html';
            return;
        }
        
        this.genreTitle.textContent = `${this.genreName} Movies`;
        await this.loadGenreMovies();
    }
    
    async loadGenreMovies() {
        try {
            this.showLoading();
            const response = await apiService.getMoviesByGenre(this.genreId);
            this.renderMovies(response.results);
        } catch (error) {
            console.error('Error loading genre movies:', error);
            this.showError('Failed to load movies');
        } finally {
            this.hideLoading();
        }
    }
    
    renderMovies(movies) {
        if (!this.moviesGrid) return;
        
        this.moviesGrid.innerHTML = movies.map(movie => `
            <div class="col">
                <div class="card h-100">
                    <img src="${movie.poster_path ? apiService.getImageUrl(movie.poster_path) : '../assets/images/placeholder.jpg'}"
                         class="card-img-top"
                         alt="${movie.title}"
                         onerror="this.src='../assets/images/placeholder.jpg'">
                    <div class="card-body">
                        <h5 class="card-title">${movie.title}</h5>
                        <p class="card-text text-muted">
                            ${movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A'} | 
                            Rating: ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}
                        </p>
                        <a href="movie.html?id=${movie.id}" class="btn btn-primary stretched-link">View Details</a>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    showLoading() {
        if (this.loadingSpinner) {
            this.loadingSpinner.classList.remove('d-none');
        }
    }
    
    hideLoading() {
        if (this.loadingSpinner) {
            this.loadingSpinner.classList.add('d-none');
        }
    }
    
    showError(message) {
        if (this.moviesGrid) {
            this.moviesGrid.innerHTML = `
                <div class="col-12 text-center">
                    <div class="alert alert-danger" role="alert">
                        ${message}
                    </div>
                </div>
            `;
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

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    new GenrePage();
});