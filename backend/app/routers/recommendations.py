from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from app.models.database import get_db
from app.models.user import User
from app.models.movie import Movie
from app.services.tmdb_service import tmdb_service
from app.services.recommendation_service import RecommendationService
from app.utils.auth import get_current_user
from app.schemas.schemas import MovieResponse
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])
recommendation_service = RecommendationService()

@router.get("/personalized", response_model=List[MovieResponse])
async def get_personalized_recommendations(
    limit: int = 12,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        recommendations = recommendation_service.get_recommendations_for_user(
            user=current_user,
            limit=limit,
            db=db
        )
        
        return [MovieResponse.from_orm(movie) for movie in recommendations]
    except Exception as e:
        logger.error(f"Error getting personalized recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/similar/{movie_id}", response_model=List[MovieResponse])
async def get_similar_movies(
    movie_id: int,
    limit: int = Query(8, ge=1, le=20),
    db: Session = Depends(get_db)
):
    """Get movies similar to the specified movie by genre"""
    try:
        # Get movie details to find its genres
        movie_details = tmdb_service.get_movie_details(movie_id)  # Remove await
        if not movie_details:
            raise HTTPException(status_code=404, detail="Movie not found")

        # Get genre IDs from the movie
        genre_ids = [genre["id"] for genre in movie_details.get("genres", [])]
        if not genre_ids:
            raise HTTPException(status_code=404, detail="No genres found for movie")

        # Get movies from the same genres
        discover_params = {
            "with_genres": ",".join(map(str, genre_ids)),
            "sort_by": "popularity.desc",
            "page": 1
        }
        
        response = tmdb_service.discover_movies(discover_params)
        movies = response.get("results", [])

        # Filter out the original movie and format response
        similar_movies = [
            MovieResponse(
                id=movie["id"],
                tmdb_id=movie["id"],
                title=movie["title"],
                overview=movie["overview"],
                poster_path=movie["poster_path"],
                release_date=movie["release_date"],
                vote_average=movie["vote_average"],
                genre_ids=movie["genre_ids"]
            )
            for movie in movies
            if movie["id"] != movie_id
        ][:limit]

        return similar_movies

    except Exception as e:
        logger.error(f"Error getting similar movies: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error getting similar movies: {str(e)}"
        )

@router.get("/by-genre/{genre_id}", response_model=List[MovieResponse])
async def get_recommendations_by_genre(
    genre_id: int,
    page: int = Query(1, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get movie recommendations for a specific genre"""
    # Use the discover endpoint to get movies by genre
    response = tmdb_service.discover_movies({
        "with_genres": genre_id,
        "sort_by": "popularity.desc",
        "page": page
    })
    
    return response.get("results", [])

@router.post("/train")
async def train_recommendation_model(
    db: Session = Depends(get_db)
):
    """Train the recommendation model"""
    try:
        success = recommendation_service.train(db)
        if success:
            return {"message": "Successfully trained recommendation model"}
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to train recommendation model"
            )
    except Exception as e:
        logger.error(f"Error training model: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error training model: {str(e)}"
        )

