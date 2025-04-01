import requests
from typing import List, Dict, Any, Optional
import os
from dotenv import load_dotenv
from app.config import settings
import httpx
import logging
import aiohttp

logger = logging.getLogger(__name__)

load_dotenv()

class TMDBService:
    BASE_URL = "https://api.themoviedb.org/3"
    
    def __init__(self):
        self.api_key = "b47eca218230f5060c3b60ce11f3a070"
        self.base_url = "https://api.themoviedb.org/3"
        self.bearer_token = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJiNDdlY2EyMTgyMzBmNTA2MGMzYjYwY2UxMWYzYTA3MCIsIm5iZiI6MTc0MzUzMDI3OS4wNDksInN1YiI6IjY3ZWMyOTI3NmI1NzA0MDE2MzJmYmQ4NiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.d8IgDiUdaiXjHwIN5lAY5d--OekpeHpscEF_UDiVLRs"
        self.session = aiohttp.ClientSession()
    
    def _make_request(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Dict:
        """Make a request to TMDB API with adult content filtered"""
        if params is None:
            params = {}
            
        # Always include these parameters to filter out adult content
        params.update({
            'api_key': self.api_key,
            'include_adult': False,
            'language': 'en-US'
        })
        
        try:
            response = requests.get(f"{self.base_url}{endpoint}", params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"TMDB API error: {str(e)}")
            return {}

    def get_popular_movies(self, page: int = 1) -> Dict:
        """Get popular movies from TMDB"""
        return self._make_request("/movie/popular", {"page": page})
    
    def get_movie_details(self, movie_id: int) -> Dict:
        """Get details for a specific movie"""
        return self._make_request(f"/movie/{movie_id}")
    
    def search_movies(self, query: str, page: int = 1) -> Dict:
        """Search for movies"""
        return self._make_request("/search/movie", {
            "query": query,
            "page": page
        })
    
    def get_movie_recommendations(self, movie_id: int) -> Dict:
        """Get movie recommendations from TMDB"""
        return self._make_request(f"/movie/{movie_id}/recommendations")
    
    def get_movie_genres(self) -> Dict:
        """Get all movie genres"""
        return self._make_request("/genre/movie/list")

    def get_similar_movies(self, movie_id: int, page: int = 1) -> Dict:
        """Get similar movies from TMDB API"""
        return self._make_request(f"/movie/{movie_id}/similar")
    

    async def get_movie(self, movie_id: int) -> dict:
        """Get detailed information about a specific movie from TMDB."""
        try:
            if not self.session:
                self.session = aiohttp.ClientSession()

            url = f"{self.base_url}/movie/{movie_id}"
            params = {
                "api_key": self.api_key,
                "language": "en-US"
            }

            async with self.session.get(url, params=params) as response:
                if response.status == 404:
                    logger.warning(f"Movie {movie_id} not found on TMDB")
                    return None
                    
                if response.status != 200:
                    logger.error(f"TMDB API error: {response.status}")
                    return None
                    
                data = await response.json()
                return {
                    "tmdb_id": data["id"],
                    "title": data["title"],
                    "overview": data.get("overview", ""),
                    "poster_path": data.get("poster_path"),
                    "release_date": data.get("release_date"),
                    "vote_average": data.get("vote_average", 0),
                    "vote_count": data.get("vote_count", 0),
                    "popularity": data.get("popularity", 0),
                    "genres": data.get("genres", [])
                }

        except Exception as e:
            logger.error(f"Error fetching movie from TMDB: {str(e)}")
            return None

    def get_movie_reviews(self, movie_id: int, page: int = 1) -> Dict:
        """Get reviews for a movie from TMDB API"""
        return self._make_request(
            f"/movie/{movie_id}/reviews",
            params={
                "page": page,
                "language": "en-US"
            }
        )

    def get_similar_movies(self, movie_id: int, limit: int = 25) -> Dict:
        """Get similar movies from TMDB API"""
        try:
            response = self._make_request(
                f"/movie/{movie_id}/similar",
                params={
                    "page": 1,
                    "language": "en-US"
                }
            )
            
            # Get and limit results
            results = response.get("results", [])[:limit]
            return {
                "results": results,
                "total_results": len(results)
            }
        except Exception as e:
            logger.error(f"Error getting similar movies: {e}")
            return {"results": [], "total_results": 0}

    def get_movie_videos(self, movie_id: int) -> Dict:
        """Get videos (trailers, teasers etc) for a movie"""
        return self._make_request(
            f"/movie/{movie_id}/videos",
            params={"language": "en-US"}
        )

    async def discover_movies(self, params: dict) -> dict:
        """Get discovered movies from TMDB"""
        try:
            url = f"{self.base_url}/discover/movie"
            
            headers = {
                "Authorization": f"Bearer {self.bearer_token}",
                "accept": "application/json"
            }

            # Remove api_key from params since we're using bearer token
            api_params = {
                "include_adult": params.get("include_adult", False),
                "include_video": params.get("include_video", False),
                "language": params.get("language", "en-US"),
                "page": params.get("page", 1),
                "sort_by": params.get("sort_by", "popularity.desc")
            }
            
            if params.get("with_genres"):
                api_params["with_genres"] = params["with_genres"]
                
            if params.get("primary_release_year"):
                api_params["primary_release_year"] = params["primary_release_year"]

            logger.info(f"Making TMDB API request to: {url}")
            logger.info(f"With params: {api_params}")
            
            async with self.session.get(url, params=api_params, headers=headers) as response:
                response.raise_for_status()
                data = await response.json()
                
                logger.info(f"TMDB Status: {response.status}")
                logger.info(f"Results count: {len(data.get('results', []))}")
                
                return data
                    
        except Exception as e:
            logger.error(f"TMDB discover movies error: {str(e)}")
            return {
                "results": [],
                "page": 1,
                "total_pages": 1,
                "total_results": 0
            }

# Create a singleton instance
tmdb_service = TMDBService()