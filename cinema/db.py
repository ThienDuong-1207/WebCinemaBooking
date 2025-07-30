#!/usr/bin/env python3
# Database configuration file

from pymongo import MongoClient
from bson import ObjectId

# Database connection
client = MongoClient('mongodb://localhost:27017/')
db = client['Cinema']

# Collections
movies = db.movies
showtimes = db.showtimes
bookings = db.bookings
tickets = db.tickets
users = db.users
payments = db.payments
seats = db.seats

# Helper functions
def get_db():
    """Get database instance"""
    return db

def get_collection(collection_name):
    """Get collection by name"""
    return db[collection_name]

def convert_objectid_to_string(obj):
    """Convert ObjectId to string in a document"""
    if isinstance(obj, dict):
        for key, value in obj.items():
            if isinstance(value, ObjectId):
                obj[key] = str(value)
            elif isinstance(value, dict):
                convert_objectid_to_string(value)
            elif isinstance(value, list):
                for item in value:
                    if isinstance(item, dict):
                        convert_objectid_to_string(item)
    return obj

def convert_string_to_objectid(obj):
    """Convert string to ObjectId in a document"""
    if isinstance(obj, dict):
        for key, value in obj.items():
            if key == '_id' and isinstance(value, str):
                try:
                    obj[key] = ObjectId(value)
                except:
                    pass
            elif isinstance(value, dict):
                convert_string_to_objectid(value)
            elif isinstance(value, list):
                for item in value:
                    if isinstance(item, dict):
                        convert_string_to_objectid(item)
    return obj

# Database connection test
def test_connection():
    """Test database connection"""
    try:
        # Test connection
        client.admin.command('ping')
        print("✅ Database connection successful")
        
        # Test collections
        collections = db.list_collection_names()
        print(f"📋 Available collections: {collections}")
        
        # Test basic queries
        movie_count = movies.count_documents({})
        showtime_count = showtimes.count_documents({})
        booking_count = bookings.count_documents({})
        ticket_count = tickets.count_documents({})
        user_count = users.count_documents({})
        payment_count = payments.count_documents({})
        seat_count = seats.count_documents({})
        
        print(f"📊 Collection counts:")
        print(f"  - Movies: {movie_count}")
        print(f"  - Showtimes: {showtime_count}")
        print(f"  - Bookings: {booking_count}")
        print(f"  - Tickets: {ticket_count}")
        print(f"  - Users: {user_count}")
        print(f"  - Payments: {payment_count}")
        print(f"  - Seats: {seat_count}")
        
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

if __name__ == "__main__":
    test_connection() 