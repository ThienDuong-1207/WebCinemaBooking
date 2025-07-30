#!/usr/bin/env python3
import sys
import os
import json
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import db
from bson import ObjectId

def import_movies():
    """Import movies data from JSON"""
    print("🎬 Importing movies data...")
    
    try:
        with open('json data/movies.json', 'r', encoding='utf-8') as f:
            movies_data = json.load(f)
        
        # Clear existing movies
        db.movies.delete_many({})
        print(f"🗑️  Cleared existing movies")
        
        # Insert new movies
        for movie in movies_data:
            # Convert string _id to ObjectId if needed
            if isinstance(movie.get('_id'), str):
                movie['_id'] = movie['_id']  # Keep as string for now
            
            # Add poster_url if not exists
            if not movie.get('poster_url') and movie.get('poster'):
                movie['poster_url'] = movie['poster']
            
            # Add views field if not exists
            if 'views' not in movie:
                movie['views'] = 0
        
        result = db.movies.insert_many(movies_data)
        print(f"✅ Imported {len(result.inserted_ids)} movies")
        
    except Exception as e:
        print(f"❌ Error importing movies: {e}")

def import_cinemas():
    """Import cinemas data from JSON"""
    print("🏢 Importing cinemas data...")
    
    try:
        with open('json data/cinemas.json', 'r', encoding='utf-8') as f:
            cinemas_data = json.load(f)
        
        # Clear existing cinemas
        db.cinemas.delete_many({})
        print(f"🗑️  Cleared existing cinemas")
        
        # Insert new cinemas
        cinemas = cinemas_data['data']
        result = db.cinemas.insert_many(cinemas)
        print(f"✅ Imported {len(result.inserted_ids)} cinemas")
        
    except Exception as e:
        print(f"❌ Error importing cinemas: {e}")

def import_halls():
    """Import halls data from JSON"""
    print("🎭 Importing halls data...")
    
    try:
        with open('json data/halls.json', 'r', encoding='utf-8') as f:
            halls_data = json.load(f)
        
        # Clear existing halls
        db.halls.delete_many({})
        print(f"🗑️  Cleared existing halls")
        
        # Insert new halls
        halls = halls_data['data']
        result = db.halls.insert_many(halls)
        print(f"✅ Imported {len(result.inserted_ids)} halls")
        
    except Exception as e:
        print(f"❌ Error importing halls: {e}")

def update_showtimes():
    """Update showtimes with new cinema and hall data"""
    print("🎬 Updating showtimes with new cinema/hall data...")
    
    try:
        # Update cinema names in showtimes
        cinema_updates = {
            "Storia Hà Nội": "Storia Hà Nội",
            "Storia Sài Gòn": "Storia Sài Gòn"
        }
        
        for old_name, new_name in cinema_updates.items():
            result = db.showtimes.update_many(
                {"cinema": old_name},
                {"$set": {"cinema": new_name}}
            )
            print(f"✅ Updated {result.modified_count} showtimes for {new_name}")
        
        # Update hall names
        hall_updates = {
            "Hall 1": "HN-01",
            "Hall 2": "HN-02", 
            "Hall 3": "HN-03",
            "Hall 4": "SG-01",
            "Hall 5": "SG-02",
            "Hall 6": "SG-03"
        }
        
        for old_name, new_name in hall_updates.items():
            result = db.showtimes.update_many(
                {"hall": old_name},
                {"$set": {"hall": new_name}}
            )
            print(f"✅ Updated {result.modified_count} showtimes for hall {new_name}")
            
    except Exception as e:
        print(f"❌ Error updating showtimes: {e}")

def main():
    """Main import function"""
    print("🚀 Starting data import...")
    print("=" * 50)
    
    # Import data
    import_movies()
    print()
    import_cinemas()
    print()
    import_halls()
    print()
    update_showtimes()
    print()
    
    print("✅ Data import completed!")
    print("=" * 50)
    
    # Show summary
    print("\n📊 Database Summary:")
    print(f"Movies: {db.movies.count_documents({})}")
    print(f"Cinemas: {db.cinemas.count_documents({})}")
    print(f"Halls: {db.halls.count_documents({})}")
    print(f"Showtimes: {db.showtimes.count_documents({})}")

if __name__ == "__main__":
    main() 