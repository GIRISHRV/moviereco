from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Set
from app.models.database import get_db
from app.models.user import User
from app.models.movie import Movie, Genre, watch_history  # Add watch_history import
from app.services.tmdb_service import tmdb_service
from app.utils.auth import get_current_user, get_current_user_optional
from app.schemas.schemas import MovieResponse, GenreResponse
from datetime import datetime
import logging
import math
from ..services.tmdb_service import tmdb_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/movies", tags=["movies"])

@router.get("/popular")
async def get_popular_movies(page: int = Query(1, ge=1)):
    try:
        response = tmdb_service.get_popular_movies(page)
        
        return {
            "movies": response.get("results", []),
            "current_page": response.get("page", 1),
            "total_pages": response.get("total_pages", 1),
            "total_results": response.get("total_results", 0)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/genres")
async def get_genres():
    try:
        print("Fetching movie genres")
        response = tmdb_service.get_movie_genres()
        print(f"TMDB Genres Response: {response}")
        
        # Return only the genres array
        return {
            "genres": response.get("genres", [])
        }
    except Exception as e:
        print(f"Error in get_genres: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search")
async def search_movies(
    query: str = Query(...),  # Make it required
    page: int = Query(1, ge=1)
):
    """Search for movies by title"""
    try:
        logger.info(f"Search request received - Query: '{query}', Page: {page}")
        
        # Handle empty query case
        if not query.strip():
            logger.warning("Empty search query received")
            return {
                "page": 1,
                "results": [],
                "total_pages": 0,
                "total_results": 0
            }
            
        response = tmdb_service.search_movies(query.strip(), page)
        logger.info(f"Search response received with {len(response.get('results', []))} results")
        
        # Filter out adult content from results
        filtered_results = [
            movie for movie in response.get("results", [])
            if not movie.get("adult", False) and movie.get("poster_path")
        ]
        
        return {
            "page": response.get("page", 1),
            "results": filtered_results,
            "total_pages": response.get("total_pages", 1),
            "total_results": len(filtered_results)
        }
        
    except Exception as e:
        logger.error(f"Error searching movies: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/genre/{genre_id}")
async def get_movies_by_genre(
    genre_id: int,
    page: int = 1
):
    try:
        logger.info(f"Fetching movies for genre {genre_id}, page {page}")
        
        # Get movies from TMDB API - remove await since _make_request is not async
        response = tmdb_service.discover_movies({
            "with_genres": genre_id,
            "page": page,
            "sort_by": "popularity.desc"
        })
        
        if not response or "results" not in response:
            raise HTTPException(status_code=404, detail="No movies found for this genre")
            
        return response
        
    except Exception as e:
        logger.error(f"Error getting movies for genre {genre_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/test")
async def test_endpoint():
    """Simple test endpoint for debugging"""
    return {"status": "ok", "message": "API is working"}

@router.get("/{movie_id}")
async def get_movie_details(movie_id: int):
    try:
        logger.info(f"Fetching details for movie: {movie_id}")
        # Get movie details directly from TMDB
        response = tmdb_service.get_movie_details(movie_id)
        print(f"TMDB Movie Details Response: {response}")

        # Transform response to match frontend expectations
        movie_details = {
            "id": response.get("id"),
            "title": response.get("title"),
            "overview": response.get("overview"),
            "poster_path": response.get("poster_path"),
            "backdrop_path": response.get("backdrop_path"),
            "release_date": response.get("release_date"),
            "runtime": response.get("runtime"),
            "vote_average": response.get("vote_average"),
            "genres": response.get("genres", [])
        }
        return movie_details
    except Exception as e:
        logger.error(f"Error in get_movie_details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Update the similar movies endpoint to use DB session
@router.get("/{movie_id}/similar")
async def get_similar_movies(
    movie_id: int, 
    limit: int = Query(25, ge=1, le=50)
):
    """Get similar movies"""
    try:
        response = tmdb_service.get_similar_movies(movie_id, limit)
        
        # Transform response to match frontend expectations
        movies = response.get("results", [])
        if not movies:
            return {
                "movies": [],
                "total_results": 0
            }
            
        return {
            "movies": [
                {
                    "id": movie["id"],
                    "title": movie["title"],
                    "poster_path": movie["poster_path"],
                    "release_date": movie["release_date"],
                    "vote_average": movie["vote_average"],
                    "overview": movie["overview"]
                }
                for movie in movies
            ],
            "total_results": len(movies)
        }
    except Exception as e:
        logger.error(f"Error getting similar movies: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{movie_id}/reviews")
async def get_movie_reviews(
    movie_id: int,
    page: int = Query(1, ge=1)
):
    """Get reviews for a specific movie"""
    try:
        response = tmdb_service.get_movie_reviews(movie_id, page)
        return {
            "results": response.get("results", []),
            "page": response.get("page", 1),
            "total_pages": response.get("total_pages", 1),
            "total_results": response.get("total_results", 0)
        }
    except Exception as e:
        logger.error(f"Error getting movie reviews: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{movie_id}/videos")
async def get_movie_videos(movie_id: int):
    """Get videos for a movie"""
    try:
        response = tmdb_service.get_movie_videos(movie_id)
        # Filter for YouTube trailers only
        videos = [
            video for video in response.get("results", [])
            if video["site"].lower() == "youtube" 
            and video["type"].lower() == "trailer"
        ]
        return {"videos": videos}
    except Exception as e:
        logger.error(f"Error getting movie videos: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/discover/movie")
async def discover_movies(
    sort_by: str = Query("popularity.desc"),
    page: int = Query(1, ge=1),
    with_genres: str = Query(None),
    language: str = Query("en-US"),
    include_adult: bool = Query(False),
    include_video: bool = Query(False),
    primary_release_year: Optional[int] = Query(None)
):
    """Discover movies with filters"""
    try:
        logger.info("=== Discover Movies Request ===")
        logger.info(f"Sort by: {sort_by}")
        logger.info(f"Page: {page}")
        logger.info(f"Genres: {with_genres}")
        logger.info(f"Year: {primary_release_year}")
        
        # Build TMDb params
        params = {
            "sort_by": sort_by,
            "page": page,
            "language": language,
            "include_adult": include_adult,
            "include_video": include_video
        }
        
        # Only add optional params if they have values
        if with_genres and with_genres.strip():
            params["with_genres"] = with_genres.strip()
            
        if primary_release_year:
            params["primary_release_year"] = primary_release_year

        logger.info(f"Making TMDb API request with params: {params}")
        response = await tmdb_service.discover_movies(params)
        
        logger.info(f"Found {len(response.get('results', []))} movies")
        return response

    except Exception as e:
        logger.error(f"Error discovering movies: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


