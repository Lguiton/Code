import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# We are bypassing the .env file and forcing it to look at port 5433
DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5433/postgres"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
