from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy import DateTime
from app.models.database import get_db
from app.models.user import User
from app.utils.auth import create_access_token, get_current_user
from app.schemas.schemas import UserCreate, UserResponse, Token
from app.config import settings
import logging
from pydantic import ValidationError

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger(__name__)

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Log the received data for debugging
    logger.info(f"Registration request received: {user_data.dict(exclude={'password'})}")
    
    try:
        # Check if email exists
        if db.query(User).filter(User.email == user_data.email).first():
            logger.info(f"Email already registered: {user_data.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
            
        # Check if username exists
        if db.query(User).filter(User.username == user_data.username).first():
            logger.info(f"Username already taken: {user_data.username}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        
        # Create new user
        logger.info(f"Creating new user with username: {user_data.username}, email: {user_data.email}")
        new_user = User(
            email=user_data.email,
            username=user_data.username
        )
        new_user.set_password(user_data.password)
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        logger.info(f"User created successfully with ID: {new_user.id}")
        return new_user
        
    except ValidationError as ve:
        logger.error(f"Validation error: {str(ve)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(ve)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during registration: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    try:
        # Find user by email
        user = db.query(User).filter(User.email == form_data.username).first()
        if not user or not user.verify_password(form_data.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )

        # Create access token
        access_token = create_access_token(data={"sub": user.email})

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "avatar_url": user.avatar_url
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.options("/{path:path}")
async def auth_options_handler(path: str):
    return JSONResponse(
        status_code=200,
        content={"detail": "OK"},
        headers={
            "Access-Control-Allow-Origin": "https://moviereco-frontend.onrender.com",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Allow-Credentials": "true",
        }
    )