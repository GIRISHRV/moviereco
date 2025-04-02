from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.models.user import User
from app.models.movie import Movie, Watchlist, Rating, watch_history  # Updated import
from app.utils.auth import get_current_user
from app.services.tmdb_service import tmdb_service
from typing import Optional, List
import os
import shutil
from uuid import uuid4
from app.config import TMDB_BASE_URL as BASE_URL
from datetime import datetime
import logging
import app.schemas.schemas as schemas

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["Users"])

UPLOAD_DIR = "uploads/avatars"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/avatar")
async def upload_avatar(
    avatar: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Validate file size (5MB max)
        file_size = 0
        chunk_size = 1024
        while chunk := await avatar.read(chunk_size):
            file_size += len(chunk)
            if file_size > 5 * 1024 * 1024:  # 5MB
                raise HTTPException(status_code=400, detail="File too large")
        
        await avatar.seek(0)  # Reset file pointer
        
        # Validate file type
        allowed_types = ["image/jpeg", "image/png", "image/gif"]
        if avatar.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Invalid file type")
        
        # Generate unique filename
        file_ext = os.path.splitext(avatar.filename)[1].lower()
        if file_ext not in ['.jpg', '.jpeg', '.png', '.gif']:
            raise HTTPException(status_code=400, detail="Invalid file extension")
            
        unique_filename = f"{uuid4()}{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(avatar.file, buffer)
        
        # Update user's avatar URL in database
        avatar_url = f"{BASE_URL}/uploads/avatars/{unique_filename}"
        current_user.avatar_url = avatar_url
        db.commit()
        
        return {"url": avatar_url}
        
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/profile")
async def get_profile(current_user: User = Depends(get_current_user)):
    """Get the current user's profile"""
    try:
        return {
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email,
            "created_at": current_user.created_at,
            "avatar_url": current_user.avatar_url
        }
    except Exception as e:
        logger.error(f"Error getting profile: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/profile")
async def update_profile(
    avatar: Optional[str] = Form(None),
    username: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        logger.info(f"Updating profile for user {current_user.id}")
        logger.info(f"Avatar: {avatar}")
        
        changes_made = False
        
        if avatar is not None:
            current_user.avatar_url = avatar
            changes_made = True
            logger.info(f"Updated avatar_url to: {avatar}")
        
        if username and username != current_user.username:
            if db.query(User).filter(User.username == username, User.id != current_user.id).first():
                raise HTTPException(status_code=400, detail="Username already taken")
            current_user.username = username
            changes_made = True
            
        if email and email != current_user.email:
            if db.query(User).filter(User.email == email, User.id != current_user.id).first():
                raise HTTPException(status_code=400, detail="Email already taken")
            current_user.email = email
            changes_made = True
            
        if changes_made:
            db.commit()
            db.refresh(current_user)
            
        return {
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email,
            "avatar_url": current_user.avatar_url
        }
        
    except Exception as e:
        logger.error(f"Error updating profile: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/avatars")
async def get_avatars():
    try:
        avatars = []
        for file in os.listdir(UPLOAD_DIR):
            if file.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
                avatars.append({
                    "filename": file,
                    "url": f"{BASE_URL}/uploads/avatars/{file}"
                })
        return {"avatars": avatars}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Watch history endpoints
@router.post("/watch-history")
async def add_to_watch_history(
    movie_data: schemas.MovieAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a movie to user's watch history"""
    try:
        logger.info(f"Adding movie {movie_data.movie_id} to watch history for user {current_user.id}")
        
        # Check if movie is already in watch history
        existing = db.query(watch_history).filter(
            watch_history.c.user_id == current_user.id,
            watch_history.c.movie_id == movie_data.movie_id
        ).first()
        
        if existing:
            logger.info("Movie already in watch history")
            return {"success": True, "message": "Movie already in watch history"}

        # Get movie details from TMDb
        movie_details = tmdb_service.get_movie_details(movie_data.movie_id)
        logger.info(f"Retrieved movie details: {movie_details}")

        # Create or get movie
        movie = db.query(Movie).filter(Movie.tmdb_id == movie_data.movie_id).first()
        if not movie:
            movie = Movie(
                tmdb_id=movie_details["id"],
                title=movie_details["title"],
                overview=movie_details.get("overview"),
                poster_path=movie_details.get("poster_path"),
                release_date=datetime.strptime(movie_details["release_date"], "%Y-%m-%d") if movie_details.get("release_date") else None,
                vote_average=movie_details.get("vote_average", 0),
                vote_count=movie_details.get("vote_count", 0),
                runtime=movie_details.get("runtime", 0),  # Add runtime here
                popularity=movie_details.get("popularity", 0)
            )
            db.add(movie)
            db.commit()
            db.refresh(movie)
            logger.info(f"Created new movie record: {movie.id}")

        # Add to watch history with timestamp
        stmt = watch_history.insert().values(
            user_id=current_user.id,
            movie_id=movie.id,
            watched_at=datetime.utcnow()
        )
        db.execute(stmt)
        db.commit()
        
        logger.info("Successfully added to watch history")
        return {"success": True, "message": "Added to watch history"}
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error adding to watch history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/watch-history")
async def get_watch_history(
    limit: int = 12,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Using the association table directly
    history = (
        db.query(Movie)
        .join(watch_history)
        .filter(watch_history.c.user_id == current_user.id)
        .order_by(watch_history.c.watched_at.desc())    
        .limit(limit)
        .all()
    )
    return {"history": history}

@router.delete("/watch-history/{movie_id}")
async def remove_from_watch_history(
    movie_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # Remove the association from watch_history table
        result = db.execute(
            watch_history.delete().where(
                (watch_history.c.user_id == current_user.id) &
                (watch_history.c.movie_id == movie_id)
            )
        )
        db.commit()
        
        if result.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Movie not found in watch history"
            )
            
        return {"status": "success", "message": "Removed from watch history"}
        
    except Exception as e:
        logger.error(f"Error removing from watch history: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

# Watchlist endpoints
@router.post("/watch-list/toggle")
async def toggle_watchlist(
    movie_data: schemas.WatchlistCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add or remove a movie from user's watchlist"""
    try:
        movie_id = movie_data.movie_id
        
        # Check if movie is already in watchlist
        existing = db.query(Watchlist).filter(
            Watchlist.user_id == current_user.id,
            Watchlist.movie_id == movie_id
        ).first()
        
        if existing:
            # Remove from watchlist
            db.delete(existing)
            db.commit()
            return {"success": True, "in_watchlist": False, "message": "Removed from watchlist"}
        
        # Get movie details from TMDB
        try:
            movie_details = tmdb_service.get_movie_details(movie_id)
        except Exception as e:
            logger.error(f"Failed to fetch movie details: {e}")
            raise HTTPException(status_code=404, detail=f"Movie not found: {str(e)}")
        
        # Add to watchlist
        watchlist_item = Watchlist(
            user_id=current_user.id,
            movie_id=movie_id,
            title=movie_details.get("title", "Unknown"),
            poster_path=movie_details.get("poster_path"),
            added_at=datetime.now()
        )
        
        db.add(watchlist_item)
        db.commit()
        
        return {"success": True, "in_watchlist": True, "message": "Added to watchlist"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error toggling watchlist: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/watch-list")
async def get_watchlist(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's watchlist"""
    try:
        watchlist = db.query(Watchlist).filter(
            Watchlist.user_id == current_user.id
        ).order_by(
            Watchlist.added_at.desc()
        ).all()
        
        # Transform to response format
        watchlist_items = []
        for item in watchlist:
            watchlist_items.append({
                "id": item.movie_id,
                "tmdb_id": item.movie_id,
                "title": item.title,
                "poster_path": item.poster_path,
                "added_at": item.added_at.isoformat()
            })
            
        return {"watchlist": watchlist_items}
        
    except Exception as e:
        logger.error(f"Error retrieving watchlist: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Rating endpoints
@router.post("/ratings")
async def rate_movie(
    rating_data: schemas.RatingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Rate a movie"""
    try:
        if rating_data.rating < 0 or rating_data.rating > 5:
            raise HTTPException(status_code=400, detail="Rating must be between 0 and 5")
            
        existing_rating = db.query(Rating).filter(
            Rating.user_id == current_user.id,
            Rating.movie_id == rating_data.movie_id
        ).first()
        
        if existing_rating:
            existing_rating.rating = rating_data.rating
            existing_rating.updated_at = datetime.utcnow()
        else:
            new_rating = Rating(
                user_id=current_user.id,
                movie_id=rating_data.movie_id,
                rating=rating_data.rating
            )
            db.add(new_rating)
            
        db.commit()
        return {"success": True, "message": "Rating updated"}
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error rating movie: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/ratings/{movie_id}")
async def get_movie_rating(
    movie_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's rating for a specific movie"""
    try:
        rating = db.query(Rating).filter(
            Rating.user_id == current_user.id,
            Rating.movie_id == movie_id
        ).first()
        
        return {"rating": rating.rating if rating else None}
    except Exception as e:
        logger.error(f"Error getting movie rating: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/ratings")
async def get_user_ratings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all ratings by the user"""
    try:
        logger.info(f"Getting ratings for user {current_user.id}")
        ratings = db.query(Rating).filter(
            Rating.user_id == current_user.id
        ).order_by(Rating.updated_at.desc()).all()
        
        logger.info(f"Found {len(ratings)} ratings")
        rated_movies = []
        
        for rating in ratings:
            try:
                movie_details = tmdb_service.get_movie_details(rating.movie_id)
                rated_movies.append({
                    "id": rating.movie_id,
                    "title": movie_details.get("title"),
                    "poster_path": movie_details.get("poster_path"),
                    "rating": float(rating.rating),  # Ensure rating is a float
                    "rated_at": rating.updated_at.isoformat()  # Format date properly
                })
            except Exception as e:
                logger.error(f"Error getting details for movie {rating.movie_id}: {str(e)}")
                continue
            
        logger.info(f"Returning {len(rated_movies)} rated movies")
        return {"ratings": rated_movies}
        
    except Exception as e:
        logger.error(f"Error getting user ratings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))