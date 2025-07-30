# 📁 routes/manager.py
from flask import Blueprint, request, jsonify, render_template
from services.auth_service import require_auth
from db import db
from datetime import datetime
from bson import ObjectId

manager_bp = Blueprint("manager", __name__)

# === MOVIE MANAGEMENT ENDPOINTS ===

# 1. Add new movie
@manager_bp.route("/manager/add-movie", methods=["POST"])
@require_auth(role="manager")
def add_movie(current_user):
    try:
        data = request.json or {}
        
        # Validate required fields
        required_fields = ["_id", "title", "duration", "genres", "release_date", "status", "description", "poster_url"]
        for field in required_fields:
            if not data.get(field):
                return jsonify({"success": False, "message": f"Thiếu trường bắt buộc: {field}"}), 400
        
        # Check if movie ID already exists
        if db is not None:
            existing_movie = db.movies.find_one({"_id": data["_id"]})
            if existing_movie:
                return jsonify({"success": False, "message": "ID phim đã tồn tại"}), 400
        
        # Prepare movie document
        movie = {
            "_id": data["_id"],
            "title": data["title"],
            "duration": int(data["duration"]),
            "genres": data["genres"] if isinstance(data["genres"], list) else [data["genres"]],
            "release_date": data["release_date"],
            "status": data["status"],
            "description": data["description"],
            "poster_url": data["poster_url"],
            "thumbnail_url": data.get("thumbnail_url", ""),
            "created_at": datetime.utcnow(),
            "created_by": current_user["_id"]
        }
        
        # Insert movie into database
        if db is not None:
            db.movies.insert_one(movie)
        
        return jsonify({"success": True, "message": "Thêm phim thành công", "movie_id": data["_id"]}), 201
        
    except Exception as e:
        print(f"Error adding movie: {e}")
        return jsonify({"success": False, "message": "Có lỗi xảy ra khi thêm phim"}), 500

# 2. Get all movies
@manager_bp.route("/manager/movies", methods=["GET"])
@require_auth(role="manager")
def get_all_movies(current_user):
    try:
        movies = []
        if db is not None:
            movies = list(db.movies.find({}).sort("created_at", -1))
            # Convert ObjectId fields to string if needed
            for movie in movies:
                if isinstance(movie.get("_id"), ObjectId):
                    movie["_id"] = str(movie["_id"])
        
        return jsonify(movies), 200
        
    except Exception as e:
        print(f"Error fetching movies: {e}")
        return jsonify([]), 500

# 3. Delete movie
@manager_bp.route("/manager/delete-movie/<movie_id>", methods=["DELETE"])
@require_auth(role="manager")
def delete_movie(current_user, movie_id):
    try:
        if db is not None:
            # Check if movie exists
            movie = db.movies.find_one({"_id": movie_id})
            if not movie:
                return jsonify({"success": False, "message": "Không tìm thấy phim"}), 404
            
            # Check if movie has active showtimes
            active_showtimes = db.showtimes.find_one({"movie_id": movie_id})
            if active_showtimes:
                return jsonify({"success": False, "message": "Không thể xóa phim đang có suất chiếu"}), 400
            
            # Delete movie
            result = db.movies.delete_one({"_id": movie_id})
            
            if result.deleted_count > 0:
                return jsonify({"success": True, "message": "Xóa phim thành công"}), 200
            else:
                return jsonify({"success": False, "message": "Không thể xóa phim"}), 500
        
        return jsonify({"success": False, "message": "Lỗi kết nối database"}), 500
        
    except Exception as e:
        print(f"Error deleting movie: {e}")
        return jsonify({"success": False, "message": "Có lỗi xảy ra khi xóa phim"}), 500

# 4. Update movie
@manager_bp.route("/manager/update-movie/<movie_id>", methods=["PUT"])
@require_auth(role="manager")
def update_movie(current_user, movie_id):
    try:
        data = request.json or {}
        if db is not None:
            movie = db.movies.find_one({"_id": movie_id})
            if not movie:
                return jsonify({"success": False, "message": "Không tìm thấy phim"}), 404
            # Chỉ cập nhật các trường hợp lệ
            update_fields = {}
            allowed_fields = ["title", "duration", "genres", "release_date", "status", "description", "poster_url", "thumbnail_url"]
            for field in allowed_fields:
                if field in data:
                    update_fields[field] = data[field]
            if not update_fields:
                return jsonify({"success": False, "message": "Không có trường nào để cập nhật"}), 400
            db.movies.update_one({"_id": movie_id}, {"$set": update_fields})
            return jsonify({"success": True, "message": "Cập nhật phim thành công"}), 200
        return jsonify({"success": False, "message": "Lỗi kết nối database"}), 500
    except Exception as e:
        print(f"Error updating movie: {e}")
        return jsonify({"success": False, "message": "Có lỗi xảy ra khi cập nhật phim"}), 500

# === SHOWTIME MANAGEMENT ENDPOINTS ===

# 4. Create new showtime
@manager_bp.route("/api/manager/create-showtime", methods=["POST"])
@require_auth(role="manager")
def create_showtime(current_user):
    data = request.json or {}
    movie_id = data.get("movie_id")
    hall_id = data.get("hall_id")
    cinema_id = data.get("cinema_id")
    start_date = data.get("start_date")  # string format YYYY-MM-DD
    end_date = data.get("end_date")      # string format YYYY-MM-DD
    start_time = data.get("start_time")
    end_time = data.get("end_time")
    base_price = data.get("base_price")

    # Validate movie status
    movie = None
    if db is not None:
        movie = db.movies.find_one({"_id": movie_id, "status": "Active"})
    if not movie:
        return jsonify({"error": "Movie not active or not found"}), 400

    # Check for time conflicts in same hall (check if date ranges overlap)
    conflict = None
    if db is not None:
        conflict = db.showtimes.find_one({
            "hall_id": hall_id,
            "$or": [
                # Check if start_date falls within existing range
                {"start_date": {"$lte": start_date}, "end_date": {"$gte": start_date}},
                # Check if end_date falls within existing range  
                {"start_date": {"$lte": end_date}, "end_date": {"$gte": end_date}},
                # Check if new range contains existing range
                {"start_date": {"$gte": start_date}, "end_date": {"$lte": end_date}}
            ]
        })
    if conflict:
        return jsonify({"error": "Time conflict with another showtime"}), 409

    showtime_id = f"st{str(ObjectId())[:6]}"
    showtime = {
        "_id": showtime_id,
        "movie_id": movie_id,
        "hall_id": hall_id,
        "cinema_id": cinema_id,
        "start_date": start_date,
        "end_date": end_date,
        "start_time": start_time,
        "end_time": end_time,
        "base_price": base_price,
        "status": "available"
    }
    if db is not None:
        db.showtimes.insert_one(showtime)
    return jsonify({"message": "Showtime created", "showtime_id": showtime_id}), 201

# === SHOWTIME MANAGEMENT ENDPOINTS ===

# 5. Get all showtimes for manager
@manager_bp.route("/manager/showtimes", methods=["GET"])
@require_auth(role="manager")
def get_showtimes(current_user):
    try:
        print(f"🔍 get_showtimes called by user: {current_user}")
        
        if db is None:
            print("❌ Database connection failed")
            return jsonify([]), 500
        
        print("✅ Database connection OK")
        
        # Simple query first
        try:
            showtimes = list(db.showtimes.find({}))
            print(f"✅ Found {len(showtimes)} showtimes")
        except Exception as e:
            print(f"❌ Database query error: {e}")
            return jsonify([]), 500
        
        # Process showtimes - chỉ lấy các field cần thiết
        processed_showtimes = []
        for i, showtime in enumerate(showtimes):
            try:
                # Xử lý ObjectId an toàn
                showtime_id = showtime.get("_id")
                if isinstance(showtime_id, ObjectId):
                    showtime_id = str(showtime_id)
                else:
                    showtime_id = str(showtime_id) if showtime_id else ""
                
                # Chỉ lấy các field cần thiết
                processed_showtime = {
                    "_id": showtime_id,
                    "movie_id": str(showtime.get("movie_id", "")),
                    "movie_title": str(showtime.get("movie_title", showtime.get("movie_id", "Unknown"))),
                    "date": str(showtime.get("date", "")),
                    "time": str(showtime.get("time", "")),
                    "hall_name": str(showtime.get("hall_name", "")),
                    "cinema_name": str(showtime.get("cinema_name", "")),
                    "status": str(showtime.get("status", ""))
                }
                
                processed_showtimes.append(processed_showtime)
                print(f"✅ Processed showtime {i+1}")
            except Exception as e:
                print(f"❌ Error processing showtime {i+1}: {e}")
                continue
        
        print(f"✅ Returning {len(processed_showtimes)} showtimes")
        return jsonify(processed_showtimes), 200
        
    except Exception as e:
        print(f"Error fetching showtimes: {e}")
        import traceback
        traceback.print_exc()
        return jsonify([]), 500

# 6. Delete showtime
@manager_bp.route("/manager/delete-showtime/<showtime_id>", methods=["DELETE"])
@require_auth(role="manager")
def delete_showtime(current_user, showtime_id):
    try:
        if db is not None:
            # Check if showtime exists
            showtime = db.showtimes.find_one({"_id": showtime_id})
            if not showtime:
                return jsonify({"success": False, "message": "Không tìm thấy suất chiếu"}), 404
            
            # Check if showtime has bookings
            existing_bookings = db.bookings.find_one({"showtime_id": showtime_id, "status": {"$in": ["pending", "paid"]}})
            if existing_bookings:
                return jsonify({"success": False, "message": "Không thể xóa suất chiếu đã có người đặt vé"}), 400
            
            # Delete showtime
            result = db.showtimes.delete_one({"_id": showtime_id})
            
            if result.deleted_count > 0:
                return jsonify({"success": True, "message": "Xóa suất chiếu thành công"}), 200
            else:
                return jsonify({"success": False, "message": "Không thể xóa suất chiếu"}), 500
        
        return jsonify({"success": False, "message": "Lỗi kết nối database"}), 500
        
    except Exception as e:
        print(f"Error deleting showtime: {e}")
        return jsonify({"success": False, "message": "Có lỗi xảy ra khi xóa suất chiếu"}), 500

# 7. View sales report
@manager_bp.route("/api/manager/sales-report", methods=["GET"])
@require_auth(role="manager")
def sales_report(current_user):
    report_type = request.args.get('type', 'byTime')
    pipeline = []

    if report_type == 'byDay':
        from datetime import datetime, timedelta
        import calendar
        
        # Lấy tháng hiện tại
        now = datetime.now()
        year = now.year
        month = now.month
        
        # Tạo danh sách tất cả các ngày trong tháng
        num_days = calendar.monthrange(year, month)[1]
        all_days = []
        for day in range(1, num_days + 1):
            date_str = f"{year:04d}-{month:02d}-{day:02d}"
            all_days.append(date_str)
        
        # Pipeline để lấy doanh thu theo ngày từ bookings
        pipeline = [
            {"$match": {
                "status": {"$in": ["paid", "completed", "success"]}
            }},
            {"$addFields": {
                "date": {
                    "$cond": {
                        "if": {"$eq": [{"$type": "$created_at"}, "string"]},
                        "then": {"$substr": ["$created_at", 0, 10]},
                        "else": {
                            "$dateToString": {
                                "format": "%Y-%m-%d",
                                "date": "$created_at"
                            }
                        }
                    }
                }
            }},
            {"$match": {
                "date": {"$regex": f"^{year:04d}-{month:02d}"}
            }},
            {"$group": {
                "_id": "$date",
                "total_sales": {"$sum": "$total_amount"}
            }}
        ]
        
        # Thực hiện query
        result = list(db.bookings.aggregate(pipeline))
        
        # Tạo map từ kết quả
        sales_by_date = {item["_id"]: item["total_sales"] for item in result}
        
        # Tạo kết quả cuối cùng với tất cả các ngày
        final_result = []
        for date_str in all_days:
            final_result.append({
                "_id": date_str,
                "total_sales": sales_by_date.get(date_str, 0)
            })
        
        return jsonify(final_result), 200
    elif report_type == 'byTime':
        pipeline = [
            {"$match": {"status": "success"}},
            {"$lookup": {
                "from": "bookings",
                "localField": "booking_id",
                "foreignField": "_id",
                "as": "booking_info"
            }},
            {"$unwind": "$booking_info"},
            {"$lookup": {
                "from": "showtimes",
                "localField": "booking_info.showtime_id",
                "foreignField": "_id",
                "as": "showtime_info"
            }},
            {"$unwind": "$showtime_info"},
            {"$addFields": {
                "month": {"$substr": ["$showtime_info.date", 0, 7]}
            }},
            {"$group": {
                "_id": "$month",
                "total_sales": {"$sum": "$amount"}
            }},
            {"$sort": {"_id": 1}}
        ]
    elif report_type == 'byMovie':
        pipeline = [
            {"$match": {"status": "success"}},
            {"$lookup": {
                "from": "bookings",
                "localField": "booking_id",
                "foreignField": "_id",
                "as": "booking_info"
            }},
            {"$unwind": "$booking_info"},
            {"$lookup": {
                "from": "showtimes",
                "localField": "booking_info.showtime_id",
                "foreignField": "_id",
                "as": "showtime_info"
            }},
            {"$unwind": "$showtime_info"},
            {"$group": {
                "_id": "$showtime_info.movie_id",
                "total_sales": {"$sum": "$amount"}
            }},
            {"$lookup": {
                "from": "movies",
                "localField": "_id",
                "foreignField": "_id",
                "as": "movie_info"
            }},
            {"$unwind": "$movie_info"},
            {"$project": {
                "_id": 0,
                "movie_id": "$_id",
                "movie_title": "$movie_info.title",
                "total_sales": 1
            }},
            {"$sort": {"total_sales": -1}}
        ]
    elif report_type == 'byCinema':
        pipeline = [
            {"$match": {"status": "success"}},
            {"$lookup": {
                "from": "bookings",
                "localField": "booking_id",
                "foreignField": "_id",
                "as": "booking_info"
            }},
            {"$unwind": "$booking_info"},
            {"$lookup": {
                "from": "showtimes",
                "localField": "booking_info.showtime_id",
                "foreignField": "_id",
                "as": "showtime_info"
            }},
            {"$unwind": "$showtime_info"},
            {"$group": {
                "_id": "$showtime_info.cinema",
                "total_sales": {"$sum": "$amount"}
            }},
            {"$sort": {"_id": 1}}
        ]
    elif report_type == 'byShowtime':
        pipeline = [
            {"$match": {"status": "success"}},
            {"$lookup": {
                "from": "bookings",
                "localField": "booking_id",
                "foreignField": "_id",
                "as": "booking_info"
            }},
            {"$unwind": "$booking_info"},
            {"$lookup": {
                "from": "showtimes",
                "localField": "booking_info.showtime_id",
                "foreignField": "_id",
                "as": "showtime_info"
            }},
            {"$unwind": "$showtime_info"},
            {"$group": {
                "_id": "$showtime_info.time",
                "total_sales": {"$sum": "$amount"}
            }},
            {"$sort": {"_id": 1}}
        ]
    elif report_type == 'byHall':
        cinema_filter = request.args.get('cinema', 'All')
        pipeline = [
            {"$match": {"status": "success"}},
            {"$lookup": {
                "from": "bookings",
                "localField": "booking_id",
                "foreignField": "_id",
                "as": "booking_info"
            }},
            {"$unwind": "$booking_info"},
            {"$lookup": {
                "from": "showtimes",
                "localField": "booking_info.showtime_id",
                "foreignField": "_id",
                "as": "showtime_info"
            }},
            {"$unwind": "$showtime_info"},
        ]
        if cinema_filter != "All":
            pipeline.append({"$match": {"showtime_info.cinema": cinema_filter}})
        pipeline += [
            {"$group": {
                "_id": {"$ifNull": ["$showtime_info.hall_name", "Unknown"]},
                "total_sales": {"$sum": "$amount"}
            }},
            {"$sort": {"_id": 1}}
        ]
    else:
        return jsonify({"error": "Invalid report type"}), 400

    result = list(db.payments.aggregate(pipeline))
    return jsonify(result), 200

@manager_bp.route("/manager/active-movies", methods=["GET"])
@require_auth(role="manager")
def get_active_movies(current_user):
    try:
        movies = []
        if db is not None:
            movies = list(db.movies.find({"status": "Active"}).sort("created_at", -1))
            for movie in movies:
                if isinstance(movie.get("_id"), ObjectId):
                    movie["_id"] = str(movie["_id"])
        return jsonify(movies), 200
    except Exception as e:
        print(f"Error fetching active movies: {e}")
        return jsonify([]), 500

@manager_bp.route("/manager/dashboard-stats", methods=["GET"])
@require_auth(role="manager")
def dashboard_stats(current_user):
    from datetime import datetime
    today = datetime.now().strftime('%Y-%m-%d')
    month = datetime.now().strftime('%Y-%m')
    stats = {}
    # Tổng số phim
    stats["total_movies"] = db.movies.count_documents({}) if db is not None else 0
    # Số suất chiếu hôm nay (theo trường date)
    stats["showtimes_today"] = db.showtimes.count_documents({"date": today}) if db is not None else 0
    # Doanh thu hôm nay (tổng total_amount của booking đã paid, ngày created_at là hôm nay)
    revenue_today = db.bookings.aggregate([
        {"$match": {
            "status": "paid",
            "$expr": {"$eq": [ {"$substr": [
                {"$toString": "$created_at"}, 0, 10
            ]}, today ]}
        }},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]) if db is not None else []
    stats["revenue_today"] = next(revenue_today, {}).get("total", 0) if db is not None else 0
    # Doanh thu từng ngày trong tháng hiện tại (hỗ trợ date là string hoặc datetime)
    revenue_by_day = list(db.payments.aggregate([
        {"$match": {"status": "success"}},
        {"$lookup": {"from": "bookings", "localField": "booking_id", "foreignField": "_id", "as": "booking_info"}},
        {"$unwind": "$booking_info"},
        {"$lookup": {"from": "showtimes", "localField": "booking_info.showtime_id", "foreignField": "_id", "as": "showtime_info"}},
        {"$unwind": "$showtime_info"},
        {"$addFields": {"date_str": {"$cond": [
            {"$eq": [ {"$type": "$showtime_info.date"}, "date"] },
            {"$dateToString": {"format": "%Y-%m-%d", "date": "$showtime_info.date"}},
            "$showtime_info.date"
        ]}}},
        {"$match": {"date_str": {"$regex": f"^{month}"}}},
        {"$group": {"_id": "$date_str", "total": {"$sum": "$amount"}}},
        {"$sort": {"_id": 1}}
    ])) if db is not None else []
    stats["revenue_by_day"] = revenue_by_day
    stats["revenue_month"] = sum(day["total"] for day in revenue_by_day) if revenue_by_day else 0
    # Số vé đã bán
    stats["tickets_sold"] = db.bookings.count_documents({"status": "paid"}) if db is not None else 0
    # Danh sách phim sắp chiếu
    coming_soon = list(db.movies.find({"status": "Coming Soon"}, {"_id": 1, "title": 1, "release_date": 1, "poster_url": 1, "thumbnail_url": 1}).sort("release_date", 1)) if db is not None else []
    for m in coming_soon:
        if isinstance(m.get("_id"), ObjectId):
            m["_id"] = str(m["_id"])
    stats["coming_soon_movies"] = coming_soon
    return jsonify(stats), 200


