class MovieDetailsHandler {
    constructor() {
        this.movieId = new URLSearchParams(window.location.search).get('id');
        this.movieDetailsContainer = document.getElementById('movie-details');
        this.init();
    }

    async init() {
        if (!this.movieId) {
            this.showError('Movie ID not found');
            return;
        }

        try {
            const movie = await apiService.getMovieDetails(this.movieId);
            this.renderMovieDetails(movie);
            
            // Reset Disqus if it exists (useful for SPA-like navigation)
            if (window.DISQUS) {
                window.DISQUS.reset({
                    reload: true,
                    config: function () {
                        this.page.identifier = 'movie_' + this.movieId;
                        this.page.url = window.location.href;
                    }
                });
            }
        } catch (error) {
            console.error('Error loading movie details:', error);
            this.showError('Failed to load movie details');
        }
    }

    renderMovieDetails(movie) {
        this.movieDetailsContainer.innerHTML = `
            <div class="row">
                <div class="col-md-4">
                    <img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" 
                         class="img-fluid rounded" 
                         alt="${movie.title}">
                </div>
                <div class="col-md-8">
                    <h1>${movie.title}</h1>
                    <p class="lead">${movie.overview}</p>
                    <div class="mb-3">
                        <strong>Release Date:</strong> ${movie.release_date}
                    </div>
                    <div class="mb-3">
                        <strong>Rating:</strong> ${movie.vote_average}/10
                    </div>
                    <!-- Add more movie details as needed -->
                </div>
            </div>
        `;
    }

    showError(message) {
        this.movieDetailsContainer.innerHTML = `
            <div class="alert alert-danger" role="alert">
                ${message}
            </div>
        `;
    }
}

// Initialize the handler when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MovieDetailsHandler();
});