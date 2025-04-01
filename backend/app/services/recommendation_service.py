from typing import List
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.movie import Movie, watch_history
from app.services.tmdb_service import tmdb_service
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class RecommendationService:
    """Service for generating movie recommendations using TMDB API"""

    def get_recommendations_for_user(self, user: User, limit: int = 10, db: Session = None) -> List[Movie]:
        """Get personalized recommendations based on user's watch history"""
        try:
            # Get user's recently watched movies
            watched_movies = (
                db.query(Movie)
                .join(watch_history)
                .filter(Movie.adult == False)  # Filter adult content
                .filter(watch_history.c.user_id == user.id)
                .order_by(watch_history.c.watched_at.desc())
                .limit(5)  # Get last 5 watched movies
                .all()
            )

            if not watched_movies:
                return self.get_popular_movies(db, limit)

            recommendations = []
            seen_movies = set(m.id for m in watched_movies)

            # Get recommendations from TMDB for each watched movie
            for movie in watched_movies:
                # Try getting recommendations first, fallback to similar movies
                similar_movies = tmdb_service.get_movie_recommendations(movie.tmdb_id).get('results', [])
                if not similar_movies:
                    similar_movies = tmdb_service.get_similar_movies(movie.tmdb_id).get('results', [])
                
                for movie_data in similar_movies[:3]:  # Get top 3 recommendations per movie
                    if movie_data.get('adult', False):
                        continue
                        
                    # Check if movie exists in database
                    db_movie = db.query(Movie).filter(Movie.tmdb_id == movie_data['id']).first()
                    
                    if not db_movie:
                        # Create new movie record if it doesn't exist
                        release_date = None
                        if movie_data.get('release_date'):
                            try:
                                release_date = datetime.strptime(movie_data['release_date'], '%Y-%m-%d')
                            except ValueError:
                                pass

                        db_movie = Movie(
                            tmdb_id=movie_data['id'],
                            title=movie_data['title'],
                            overview=movie_data['overview'],
                            poster_path=movie_data.get('poster_path'),
                            backdrop_path=movie_data.get('backdrop_path'),
                            release_date=release_date,
                            vote_average=movie_data.get('vote_average', 0.0),
                            popularity=movie_data.get('popularity', 0.0),
                            adult=movie_data.get('adult', False)
                        )
                        db.add(db_movie)
                        db.commit()
                        db.refresh(db_movie)
                    
                    if db_movie and db_movie.id not in seen_movies:
                        recommendations.append(db_movie)
                        seen_movies.add(db_movie.id)

            # Sort by vote average and popularity
            recommendations.sort(
                key=lambda x: (x.vote_average or 0) * (x.popularity or 1), 
                reverse=True
            )

            if not recommendations:
                logger.info("No recommendations found from watch history, falling back to popular movies")
                return self.get_popular_movies(db, limit)

            return recommendations[:limit]

        except Exception as e:
            logger.error(f"Error getting recommendations: {str(e)}")
            return self.get_popular_movies(db, limit)

    def get_popular_movies(self, db: Session, limit: int = 10) -> List[Movie]:
        """Get popular movies as fallback recommendations"""
        try:
            return (
                db.query(Movie)
                .filter(Movie.adult == False)
                .order_by(Movie.popularity.desc(), Movie.vote_average.desc())
                .limit(limit)
                .all()
            )
        except Exception as e:
            logger.error(f"Error getting popular movies: {str(e)}")
            return []