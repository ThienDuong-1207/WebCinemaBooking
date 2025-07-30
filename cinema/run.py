# run.py
# ✅ Entry point để chạy Flask app
# Lệnh chạy: python run.py

from mongo_app import app
from db import db
from datetime import datetime, timedelta
import random

def init_showtimes():
    """Khởi tạo showtimes cho 4 ngày tiếp theo"""
    if db is None:
        return
    today = datetime.now().date()
    today_str = today.strftime('%Y-%m-%d')

    # Xóa showtimes cũ (ngày < hôm nay)
    deleted = db.showtimes.delete_many({"date": {"$lt": today_str}})
    print(f"Đã xóa {deleted.deleted_count} showtimes cũ.")

    # Lấy danh sách cinema, hall, movie
    cinemas = list(db.cinemas.find({}))
    halls = list(db.halls.find({}))
    movies = list(db.movies.find({"status": "showing"}))
    times = ["08:00", "12:00", "16:00", "20:00"]

    if not cinemas or not halls or not movies:
        print("⚠️ Không đủ dữ liệu để tạo showtimes (cinemas/halls/movies)")
        return

    for day in range(4):  # 4 ngày kế tiếp
        show_date = (today + timedelta(days=day)).strftime('%Y-%m-%d')
        for cinema in cinemas:
            cinema_halls = [h for h in halls if h.get('cinema_id') == cinema['_id']]
            for hall in cinema_halls:
                # Random số suất chiếu/ngày/hall (2-4 suất)
                num_showtimes = random.randint(2, 4)
                show_times_today = random.sample(times, num_showtimes)
                for time in show_times_today:
                    movie = random.choice(movies)
                    # Kiểm tra trùng lặp
                    exists = db.showtimes.find_one({
                        "hall_id": hall['_id'],
                        "date": show_date,
                        "time": time
                    })
                    if not exists:
                        # Lấy base_price từ movie hoặc dùng giá mặc định
                        base_price = movie.get("base_price", 90000)
                        
                        db.showtimes.insert_one({
                            "movie_id": movie['_id'],
                            "movie_title": movie['title'],
                            "cinema_id": cinema['_id'],
                            "cinema_name": cinema['name'],
                            "hall_id": hall['_id'],
                            "hall_name": hall['name'],
                            "date": show_date,
                            "time": time,
                            "status": "active",
                            "base_price": base_price,
                            "created_at": datetime.now()
                        })

if __name__ == "__main__":
    # Khởi tạo showtimes
    init_showtimes()
    
    # Kiểm tra kết nối MongoDB khi khởi động app
    if db is not None:
        try:
            collections = db.list_collection_names()
            print(f"✅ Đã kết nối MongoDB! Database: {db.name}, Collections: {collections}")
        except Exception as e:
            print(f"❌ Lỗi kết nối MongoDB: {e}")
    else:
        print("❌ db is None, chưa kết nối MongoDB!")

    # Custom logging to hide static file requests
    import logging
    from werkzeug.serving import WSGIRequestHandler
    
    class QuietHandler(WSGIRequestHandler):
        def log_request(self, code='-', size='-'):
            # Only log non-static requests (hide /static/* requests)
            if not self.path.startswith('/static/'):
                super().log_request(code, size)
    
    app.run(host='0.0.0.0', debug=True, port=5001, request_handler=QuietHandler)


