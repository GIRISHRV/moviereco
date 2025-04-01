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
    movie_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        movie_id = movie_data.get("movie_id")
        if not movie_id:
            raise HTTPException(
                status_code=422, 
                detail="movie_id is required"
            )
        
        # Check if movie exists in database
        movie = db.query(Movie).filter(Movie.tmdb_id == movie_id).first()
        
        if not movie:
            # Fetch movie details from TMDB
            logger.info(f"Fetching movie {movie_id} from TMDB")
            movie_details = await tmdb_service.get_movie(movie_id)
            
            if not movie_details:
                logger.error(f"Movie {movie_id} not found on TMDB")
                raise HTTPException(
                    status_code=404,
                    detail="Movie not found on TMDB"
                )
            
            logger.info(f"Creating new movie record for {movie_details['title']}")
            # Create new movie record
            movie = Movie(
                tmdb_id=movie_details["tmdb_id"],
                title=movie_details["title"],
                overview=movie_details["overview"],
                poster_path=movie_details["poster_path"],
                release_date=datetime.strptime(movie_details["release_date"], "%Y-%m-%d") if movie_details["release_date"] else None,
                vote_average=movie_details["vote_average"],
                vote_count=movie_details["vote_count"],
                popularity=movie_details["popularity"]
            )
            
            try:
                db.add(movie)
                db.commit()
                db.refresh(movie)
            except Exception as e:
                logger.error(f"Error saving movie to database: {str(e)}")
                db.rollback()
                raise HTTPException(
                    status_code=500,
                    detail=f"Error saving movie to database: {str(e)}"
                )
        
        # Add to watch history if not already watched
        if movie not in current_user.watch_history:
            current_user.watch_history.append(movie)
            try:
                db.commit()
            except Exception as e:
                logger.error(f"Error adding to watch history: {str(e)}")
                db.rollback()
                raise HTTPException(
                    status_code=500,
                    detail=f"Error adding to watch history: {str(e)}"
                )
        
        return {
            "status": "success",
            "message": "Added to watch history",
            "movie": {
                "id": movie.id,
                "tmdb_id": movie.tmdb_id,
                "title": movie.title,
                "poster_path": movie.poster_path
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}"
        )

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
        if rating_data.rating < 1 or rating_data.rating > 10:
            raise HTTPException(status_code=400, detail="Rating must be between 1 and 10")
            
        movie_id = rating_data.movie_id
        
        # Check if user has already rated this movie
        existing_rating = db.query(Rating).filter(
            Rating.user_id == current_user.id,
            Rating.movie_id == movie_id
        ).first()
        
        if existing_rating:
            # Update existing rating
            existing_rating.rating = rating_data.rating
            existing_rating.updated_at = datetime.now()
            db.commit()
            return {"success": True, "message": "Rating updated"}
            
        # Get movie details from TMDB
        try:
            movie_details = tmdb_service.get_movie_details(movie_id)
        except Exception as e:
            logger.error(f"Failed to fetch movie details: {e}")
            raise HTTPException(status_code=404, detail=f"Movie not found: {str(e)}")
            
        # Create new rating
        new_rating = Rating(
            user_id=current_user.id,
            movie_id=movie_id,
            rating=rating_data.rating,
            title=movie_details.get("title", "Unknown"),
            poster_path=movie_details.get("poster_path"),
            created_at=datetime.now()
        )
        
        db.add(new_rating)
        db.commit()
        
        return {"success": True, "message": "Rating added"}
        
    except HTTPException:
        raise
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
        
        if not rating:
            return {"rating": None}
            
        return {"rating": rating.rating}
        
    except Exception as e:
        logger.error(f"Error getting movie rating: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))