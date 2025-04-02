from sqlalchemy import Column, Integer, String, Float, ForeignKey, Table, DateTime, Boolean
from sqlalchemy.orm import relationship
from app.models.database import Base
from datetime import datetime

# Many-to-many relationship table for movie genres
movie_genre = Table(
    'movie_genre',
    Base.metadata,
    Column('movie_id', Integer, ForeignKey('movies.id')),
    Column('genre_id', Integer, ForeignKey('genres.id'))
)

# Watch history association table
watch_history = Table(
    'watch_history',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('movie_id', Integer, ForeignKey('movies.id'), primary_key=True),
    Column('watched_at', DateTime, default=datetime.utcnow)
)

class Movie(Base):
    __tablename__ = "movies"

    id = Column(Integer, primary_key=True, index=True)
    tmdb_id = Column(Integer, unique=True, index=True)
    title = Column(String)
    overview = Column(String)
    release_date = Column(DateTime, nullable=True)
    poster_path = Column(String, nullable=True)
    backdrop_path = Column(String, nullable=True)
    vote_average = Column(Float)
    vote_count = Column(Integer)
    popularity = Column(Float)
    runtime = Column(Integer, nullable=True)  # Add this line
    adult = Column(Boolean, default=False, nullable=False)

    # Relationships remain the same
    genres = relationship("Genre", secondary="movie_genre", back_populates="movies")
    watchers = relationship(
        "User",
        secondary=watch_history,
        back_populates="watch_history",
        lazy="dynamic"
    )

class Genre(Base):
    __tablename__ = "genres"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    
    # Relationships
    movies = relationship("Movie", secondary=movie_genre, back_populates="genres")
    users = relationship("User", secondary="user_genre", back_populates="preferences")

class Watchlist(Base):
    __tablename__ = "watchlists"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    movie_id = Column(Integer, index=True)
    title = Column(String)
    poster_path = Column(String, nullable=True)
    added_at = Column(DateTime, default=datetime.now)
    
    user = relationship("User", back_populates="watchlist_entries")

class Rating(Base):
    __tablename__ = "ratings"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    movie_id = Column(Integer)
    rating = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="ratings")