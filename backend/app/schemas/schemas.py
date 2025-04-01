from pydantic import BaseModel, EmailStr, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime

# First define Genre schemas since MovieResponse depends on it
class GenreBase(BaseModel):
    name: str

class GenreCreate(GenreBase):
    id: int

class GenreResponse(BaseModel):
    id: int
    name: str
    
    class Config:
        from_attributes = True

# Then define Movie schemas
class MovieBase(BaseModel):
    """Base movie schema"""
    tmdb_id: int
    title: str
    overview: Optional[str] = None
    poster_path: Optional[str] = None
    release_date: Optional[datetime] = None
    vote_average: Optional[float] = None
    runtime: Optional[int] = None
    watched_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class MovieCreate(MovieBase):
    tmdb_id: int
    poster_path: Optional[str] = None
    release_date: Optional[datetime] = None
    vote_average: Optional[float] = None
    vote_count: Optional[int] = None
    popularity: Optional[float] = None

class MovieResponse(BaseModel):
    id: int
    tmdb_id: int
    title: str
    overview: str
    poster_path: Optional[str] = None
    backdrop_path: Optional[str] = None
    release_date: Optional[str] = None
    vote_average: Optional[float] = None
    genres: List[GenreResponse] = []
    
    class Config:
        from_attributes = True
        
    @classmethod
    def from_orm(cls, movie):
        # Handle None values for optional fields
        if hasattr(movie, 'release_date') and isinstance(movie.release_date, datetime):
            movie.release_date = movie.release_date.strftime('%Y-%m-%d')
        if not hasattr(movie, 'backdrop_path'):
            movie.backdrop_path = None
        if not hasattr(movie, 'genres'):
            movie.genres = []
        return super().from_orm(movie)

class MovieAdd(BaseModel):
    """Schema for adding a movie to watch history"""
    movie_id: int

    class Config:
        json_schema_extra = {
            "example": {
                "movie_id": 550
            }
        }

class WatchHistoryMovie(MovieBase):
    """Schema for movies in watch history"""
    watched_at: datetime

    class Config:
        json_schema_extra = {
            "example": {
                "tmdb_id": 550,
                "title": "Fight Club",
                "poster_path": "/path/to/poster.jpg",
                "release_date": "1999-10-15T00:00:00",
                "vote_average": 8.4,
                "runtime": 139,
                "watched_at": "2024-04-02T10:30:00"
            }
        }

# Movie history schemas (needed for UserResponse)
class MovieHistoryCreate(BaseModel):
    movie_id: int

class MovieHistoryBase(BaseModel):
    id: int
    movie_id: int
    title: str
    poster_path: Optional[str] = None
    watched_at: datetime

    class Config:
        from_attributes = True

class MovieHistoryResponse(BaseModel):
    id: int
    title: str
    poster_path: Optional[str] = None
    watched_at: datetime

    class Config:
        from_attributes = True

# Watchlist schemas (needed for UserResponse)
class WatchlistCreate(BaseModel):
    movie_id: int

    class Config:
        json_schema_extra = {
            "example": {
                "movie_id": 550
            }
        }

class WatchlistBase(BaseModel):
    id: int
    movie_id: int
    title: str
    poster_path: Optional[str] = None
    added_at: datetime

class WatchlistResponse(WatchlistBase):
    user_id: int
    
    class Config:
        from_attributes = True

# Rating schemas (needed for UserResponse)
class RatingCreate(BaseModel):
    movie_id: int
    rating: int

    class Config:
        json_schema_extra = {
            "example": {
                "movie_id": 550,
                "rating": 8
            }
        }

class RatingBase(BaseModel):
    id: int
    movie_id: int
    title: str
    poster_path: Optional[str] = None
    rating: int
    created_at: datetime
    updated_at: datetime

class RatingResponse(RatingBase):
    user_id: int
    
    class Config:
        from_attributes = True

# Now we can define User schemas since all dependent schemas are defined
class UserBase(BaseModel):
    email: EmailStr = Field(..., description="User's email address")
    username: str = Field(..., min_length=3, max_length=50, description="Username")

class UserCreate(BaseModel):
    full_name: str
    age: int
    email: EmailStr
    gender: str
    password: str
    location: str
    marital_status: str
    favorite_countries: str  # Comma-separated list of countries
    username: str  # Keep username for system purposes

    @validator('age')
    def validate_age(cls, v):
        if v < 13:
            raise ValueError('Must be at least 13 years old')
        if v > 120:
            raise ValueError('Invalid age')
        return v

    @validator('gender')
    def validate_gender(cls, v):
        valid_genders = ['male', 'female', 'other', 'prefer not to say']
        if v.lower() not in valid_genders:
            raise ValueError('Invalid gender selection')
        return v.lower()

    @validator('marital_status')
    def validate_marital_status(cls, v):
        valid_statuses = ['single', 'married', 'divorced', 'widowed', 'prefer not to say']
        if v.lower() not in valid_statuses:
            raise ValueError('Invalid marital status')
        return v.lower()

class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    avatar_url: Optional[str] = None

# Authentication schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenData(BaseModel):
    email: Optional[str] = None

# Genre preference schema
class GenrePreferenceCreate(BaseModel):
    genre_ids: List[int]

class GenrePreferenceResponse(BaseModel):
    genres: List[GenreResponse]
    
    class Config:
        from_attributes = True

# Add this print statement to debug
print("Schemas loaded successfully")