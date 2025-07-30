# 📁 routes/customer.py
from flask import Blueprint, request, jsonify, render_template
from services.auth_service import verify_password, generate_token, require_auth
from db import db
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import bcrypt


customer_bp = Blueprint("customer", __name__)

# 1. Register
@customer_bp.route("/api/register", methods=["POST"])
def register():
    data = request.json or {}
    email = data.get("email")
    password = data.get("password")  # <-- Đúng
    full_name = data.get("full_name")
    phone = data.get("phone")

    if db is not None and db.users.find_one({"email": email}):
        return jsonify({"error": "Email already registered"}), 400

    # Lưu password plain text thay vì hash
    user = {
        "_id": f"cus{str(ObjectId())}",
        "email": email,
        "password_hash": password,  # Lưu password plain text
        "role": "customer",
        "full_name": full_name,
        "phone": phone,
        "is_active": True,
        "created_at": datetime.now(timezone.utc)
    }
    if db is not None:
        db.users.insert_one(user)
    return jsonify({"message": "Registration successful"}), 201

# 2. Login
@customer_bp.route("/api/login", methods=["POST"])
def login():
    data = request.json or {}
    username = data.get("username")  # Hỗ trợ username
    email = data.get("email")        # Hỗ trợ email
    password = data.get("password")

    user = None
    if db is not None:
        # Tìm user bằng username hoặc email
        if username:
            user = db.users.find_one({"username": username})
        elif email:
            user = db.users.find_one({"email": email})
    
    # Get IP address for logging
    ip_address = request.remote_addr
    
    if not user:
        # Log failed login attempt
        from services.logging_service import get_logging_service
        logging_service = get_logging_service()
        if logging_service:
            logging_service.log_login(
                user_id=None,
                user_email=email or username,
                user_role="unknown",
                ip_address=ip_address,
                success=False,
                error_message="Invalid credentials"
            )
        return jsonify({"error": "Invalid credentials"}), 401
    
    # Kiểm tra password - ưu tiên password_hash, fallback về password plain text
    password_valid = False
    if user.get("password_hash"):
        try:
            password_valid = verify_password(password, user["password_hash"])
        except:
            password_valid = False
    elif user.get("password"):
        # Fallback: so sánh plain text password
        password_valid = (password == user["password"])
    
    if not password_valid:
        # Log failed login attempt
        from services.logging_service import get_logging_service
        logging_service = get_logging_service()
        if logging_service:
            logging_service.log_login(
                user_id=str(user.get("_id")),
                user_email=user.get("email"),
                user_role=user.get("role"),
                ip_address=ip_address,
                success=False,
                error_message="Invalid password"
            )
        return jsonify({"error": "Invalid credentials"}), 401

    # Log successful login
    from services.logging_service import get_logging_service
    logging_service = get_logging_service()
    if logging_service:
        logging_service.log_login(
            user_id=str(user.get("_id")),
            user_email=user.get("email"),
            user_role=user.get("role"),
            ip_address=ip_address,
            success=True
        )

    token = generate_token(user)
    user_info = {
        "full_name": user.get("full_name"),
        "email": user.get("email"),
        "username": user.get("username"),
        "role": user.get("role"),
        "_id": str(user.get("_id"))  # Convert ObjectId to string
    }
    return jsonify({"token": token, "user": user_info}), 200

# 4. View profile
@customer_bp.route("/api/view-profile", methods=["GET"])
@require_auth(role="customer")
def view_profile(current_user):
    user = None
    if db is not None:
        user = db.users.find_one({"_id": current_user["_id"]}, {"password_hash": 0})
    return jsonify(user), 200

# 4. Get movies with showtimes
@customer_bp.route("/api/movies", methods=["GET"])
def get_movies():
    # Get query parameters
    status = request.args.get('status')
    genre = request.args.get('genre')
    country = request.args.get('country')
    year = request.args.get('year')
    sort = request.args.get('sort')
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 10))
    
    # Build filter query
    filter_query = {}
    
    if status:
        if status == "Coming Soon":
            filter_query["status"] = {"$in": ["Coming Soon", "coming_soon"]}
        elif status == "showing":
            filter_query["status"] = {"$in": ["showing", "Active"]}
        else:
            filter_query["status"] = status
    
    if genre:
        filter_query["genre"] = genre
    
    if country:
        filter_query["country"] = country
    
    if year:
        filter_query["release_date"] = {"$regex": f"^{year}"}
    
    # If no status filter, get all movies
    if not status:
        filter_query = {}
    
    movies = []
    if db is not None:
        # Apply sorting
        sort_query = []
        if sort == "views":
            sort_query.append(("views", -1))
        elif sort == "rating":
            sort_query.append(("rating", -1))
        elif sort == "release_date":
            sort_query.append(("release_date", -1))
        
        # Get total count for pagination
        total_movies = db.movies.count_documents(filter_query)
        total_pages = (total_movies + limit - 1) // limit
        
        # Get movies with pagination
        cursor = db.movies.find(filter_query)
        if sort_query:
            cursor = cursor.sort(sort_query)
        cursor = cursor.skip((page - 1) * limit).limit(limit)
        
        movies = list(cursor)
        for m in movies:
            m["_id"] = str(m["_id"])
    
    # Return with pagination info
    return jsonify({
        "movies": movies,
        "page": page,
        "totalPages": total_pages,
        "totalMovies": total_movies
    }), 200

# 5. Book multiple seats
@customer_bp.route("/api/book-multi", methods=["POST"])
@require_auth(role="customer")
def book_multi(current_user):
    data = request.json or {}
    showtime_id = data.get("showtime_id")
    seat_codes = data.get("seat_codes", [])

    showtime = None
    if db is not None:
        showtime = db.showtimes.find_one({"_id": showtime_id})
    if not showtime:
        return jsonify({"error": "Showtime not found"}), 404

    hall_id = showtime["hall_id"]
    seats = []
    if db is not None:
        seats = list(db.seats.find({"hall_id": hall_id, "seat_code": {"$in": seat_codes}}))
    seat_ids = [seat["_id"] for seat in seats]

    # Check if any seat already booked
    conflict = None
    if db is not None:
        conflict = db.bookings.find_one({
            "showtime_id": showtime_id,
            "seats": {"$in": seat_ids},
            "status": {"$in": ["pending", "paid"]}
        })
    if conflict:
        return jsonify({"error": "Some seats already booked"}), 400

    # Tính tổng tiền theo loại ghế
    base_price = showtime.get("base_price", 90000)
    
    total_amount = 0
    for seat in seats:
        seat_type = seat.get("seat_type", "NORMAL")
        if seat_type and seat_type.strip().upper() == "VIP":
            total_amount += base_price + 30000
        else:
            total_amount += base_price

    # Generate unique booking_id with retry logic to avoid duplicates
    booking_id = None
    max_retries = 3
    
    for attempt in range(max_retries):
        try:
            # Use full ObjectId to ensure uniqueness
            booking_id = f"bk{str(ObjectId())}"
            booking = {
                "_id": booking_id,
                "customer_id": current_user["_id"],
                "showtime_id": showtime_id,
                "seats": seat_ids,
                            "total_amount": total_amount,
            "status": "pending",
            "created_at": datetime.now(timezone.utc)
            }
            if db is not None:
                db.bookings.insert_one(booking)
                break  # Success, exit retry loop
        except Exception as e:
            if "duplicate key error" in str(e).lower() and attempt < max_retries - 1:
                print(f"Booking ID conflict on attempt {attempt + 1}, retrying...")
                booking_id = None  # Reset for next attempt
                continue
            else:
                # Re-raise if it's not a duplicate key error or we've exhausted retries
                raise e
    
    # Ensure booking_id was set successfully
    if booking_id is None:
        return jsonify({"error": "Failed to generate unique booking ID"}), 500

    for sid in seat_ids:
        ticket_id = str(ObjectId())
        
        # Lấy thông tin seat để tạo barcode
        seat = db.seats.find_one({"_id": sid})
        seat_code = seat["seat_code"] if seat else "A1"
        
        # Generate barcode data từ thông tin thật
        barcode_data = f"{showtime['cinema_name'][:2].upper()}{showtime['movie_id'][:4].upper()}{seat_code}{showtime['hall_name'][-1]}{showtime['date'].replace('-', '')}"
        
        ticket = {
            "_id": ticket_id,
            "booking_id": booking_id,
            "seat_id": sid,
            "status": "valid",
            "checkin_time": None,
            "checked_by": None,
            "barcode_data": barcode_data,
            "created_at": datetime.now(timezone.utc)
        }
        
        if db is not None:
            db.tickets.insert_one(ticket)

    # Log booking activity
    from services.logging_service import get_logging_service
    logging_service = get_logging_service()
    if logging_service:
        # Get movie and showtime info for logging
        movie = db.movies.find_one({"_id": showtime["movie_id"]}) if db else None
        movie_title = movie.get("title", "Unknown Movie") if movie else "Unknown Movie"
        showtime_info = f"{showtime.get('date', 'Unknown')} {showtime.get('time', 'Unknown')}"
        
        logging_service.log_booking(
            user_id=str(current_user["_id"]),
            user_email=current_user.get("email"),
            booking_id=booking_id,
            movie_title=movie_title,
            showtime_info=showtime_info,
            total_amount=total_amount,
            seats=seat_codes,
            ip_address=request.remote_addr,
            success=True
        )

    return jsonify({"message": "Booking created", "booking_id": booking_id}), 201

# 6. Payment
@customer_bp.route("/api/payment", methods=["POST"])
@require_auth(role="customer")
def payment(current_user):
    data = request.json or {}
    showtime_id = data.get("showtime_id")
    seat_codes = data.get("seat_codes", [])
    method = data.get("payment_method")

    if not showtime_id or not seat_codes:
        return jsonify({"error": "Thiếu showtime_id hoặc seat_codes"}), 400

    # Tìm seat lock của user này (không bắt buộc)
    seat_lock = None
    if db is not None:
        seat_lock = db.seatlocks.find_one({
            "showtime_id": showtime_id,
            "user_id": current_user["_id"],
            "status": {"$in": ["active", "completed"]},
            "expires_at": {"$gt": datetime.now(timezone.utc)}
        })
    
    # Nếu không có seat lock, vẫn cho phép thanh toán (có thể đã hết hạn)
    if not seat_lock:
        print(f"⚠️ No seat lock found for user {current_user['_id']} and showtime {showtime_id}")
        # Không return error, tiếp tục xử lý

    # Tạo booking thật từ seat lock
    from bson import ObjectId
    try:
        # Thử tìm với ObjectId trước
        showtime = db.showtimes.find_one({"_id": ObjectId(showtime_id)})
        if not showtime:
            # Nếu không tìm thấy, thử với string
            showtime = db.showtimes.find_one({"_id": showtime_id})
        if not showtime:
            return jsonify({"error": "Showtime not found"}), 404
    except Exception as e:
        return jsonify({"error": f"Invalid showtime_id: {e}"}), 400

    hall_id = showtime["hall_id"]
    seats = list(db.seats.find({"hall_id": hall_id, "seat_code": {"$in": seat_codes}}))
    seat_ids = [seat["_id"] for seat in seats]

    # Tính tổng tiền theo loại ghế
    base_price = showtime.get("base_price", 90000)
    
    total_amount = 0
    for seat in seats:
        seat_type = seat.get("seat_type", "NORMAL")
        if seat_type and seat_type.strip().upper() == "VIP":
            total_amount += base_price + 30000
        else:
            total_amount += base_price

    # Tạo booking thật
    booking_id = f"bk{str(ObjectId())}"
    booking = {
        "_id": booking_id,
        "customer_id": current_user["_id"],
        "showtime_id": showtime_id,
        "seats": seat_ids,
        "total_amount": total_amount,
        "status": "pending",
        "created_at": datetime.now(timezone.utc)
    }
    
    if db is not None:
        db.bookings.insert_one(booking)

    # Generate unique payment_id to avoid duplicates
    payment_id = f"pay{str(ObjectId())}"
    payment = {
        "_id": payment_id,
        "booking_id": booking_id,
        "payment_method": method,
        "status": "success",
        "amount": booking["total_amount"],
        "time": datetime.now(timezone.utc)
    }
    if db is not None:
        # Tạo tickets cho booking
        for sid in seat_ids:
            ticket_id = str(ObjectId())
            
            # Lấy thông tin seat để tạo barcode
            seat = db.seats.find_one({"_id": sid})
            seat_code = seat["seat_code"] if seat else "A1"
            
            # Generate barcode data từ thông tin thật
            cinema_code = showtime.get('cinema', 'CN')[:2].upper()
            hall_code = showtime.get('hall', 'H1')[-1]
            barcode_data = f"{cinema_code}{showtime['movie_id'][:4].upper()}{seat_code}{hall_code}{showtime['date'].replace('-', '')}"
            
            ticket = {
                "_id": ticket_id,
                "booking_id": booking_id,
                "seat_id": sid,
                "status": "valid",
                "checkin_time": None,
                "checked_by": None,
                "barcode_data": barcode_data,
                "created_at": datetime.now(timezone.utc)
            }
            
            db.tickets.insert_one(ticket)
        
        # Tạo payment record
        db.payments.insert_one(payment)
        
        # Update booking status thành paid
        db.bookings.update_one({"_id": booking_id}, {"$set": {"status": "paid"}})
        
        # Xóa seat lock (nếu có)
        if seat_lock:
            db.seatlocks.update_one(
                {"_id": seat_lock["_id"]},
                {"$set": {"status": "completed", "completed_at": datetime.now(timezone.utc)}}
            )
        
        # Lấy tickets và thông tin booking để trả về
        tickets = list(db.tickets.find({"booking_id": booking_id}))
        showtime = db.showtimes.find_one({"_id": booking["showtime_id"]})
        movie = None
        if showtime:
            movie_id = showtime.get("movie_id")
            if isinstance(movie_id, ObjectId):
                movie_id = str(movie_id)
            movie = db.movies.find_one({"_id": movie_id})
        
        # Format tickets cho frontend
        formatted_tickets = []
        for ticket in tickets:
            seat = db.seats.find_one({"_id": ticket["seat_id"]})
            seat_code = seat["seat_code"] if seat else "A1"
            
            formatted_tickets.append({
                "ticket_id": str(ticket["_id"]),
                "seat_code": seat_code,
                "seat_id": str(ticket["seat_id"]),
                "barcode_data": ticket["barcode_data"],
                "status": ticket["status"]
            })
        
        # Log payment activity
        from services.logging_service import get_logging_service
        logging_service = get_logging_service()
        if logging_service:
            logging_service.log_payment(
                user_id=str(current_user["_id"]),
                user_email=current_user.get("email"),
                booking_id=booking_id,
                payment_method=method,
                amount=booking["total_amount"],
                transaction_id=payment_id,
                ip_address=request.remote_addr,
                success=True
            )

        return jsonify({
            "message": "Payment successful",
            "payment_id": payment_id,
            "booking_id": booking_id,
            "tickets": formatted_tickets,
            "booking_info": {
                "cinema": showtime.get("cinema", "Storia Cinema") if showtime else "Storia Cinema",
                "movie_title": movie["title"] if movie and "title" in movie else "Unknown Movie",
                "movie_poster": movie.get("poster", movie.get("thumbnail_url", f"/static/img/{movie_id}.jpg")) if movie else (f"/static/img/{movie_id if 'movie_id' in locals() else 'default'}.jpg"),
                "hall": showtime.get("hall", "Hall 1") if showtime else "Hall 1",
                "date": showtime.get("date", "2024-01-01") if showtime else "2024-01-01",
                "time": showtime.get("time", "20:00") if showtime else "20:00",
                "total_amount": booking["total_amount"]
            }
        }), 200
    
    # Log payment activity for simple case
    from services.logging_service import get_logging_service
    logging_service = get_logging_service()
    if logging_service:
        logging_service.log_payment(
            user_id=str(current_user["_id"]),
            user_email=current_user.get("email"),
            booking_id=booking_id,
            payment_method=method,
            amount=total_amount,
            transaction_id=payment_id,
            ip_address=request.remote_addr,
            success=True
        )
    
    return jsonify({"message": "Payment successful", "payment_id": payment_id}), 200

# 7. Booking history
@customer_bp.route("/api/booking-history", methods=["GET"])
@require_auth(role="customer")
def booking_history(current_user):
    bookings = []
    if db is not None:
        bookings = list(db.bookings.find({"customer_id": current_user["_id"]}))
        for b in bookings:
            b["_id"] = str(b["_id"])
            # Lấy title phim từ movie_id
            movie = db.movies.find_one({"_id": b.get("movie_id")})
            b["movie_title"] = movie["title"] if movie and "title" in movie else b.get("movie_id", "")
    return jsonify(bookings), 200

# 8. Recommend movies
@customer_bp.route("/api/recommend/movies", methods=["GET"])
def recommend_movies():
    movies = []
    if db is not None:
        movies = list(db.movies.aggregate([{ "$sample": {"size": 3}}]))
        for m in movies:
            m["_id"] = str(m["_id"])
    return jsonify(movies), 200

# 9. Recommend showtimes
@customer_bp.route("/api/recommend/showtimes", methods=["GET"])
def recommend_showtimes():
    shows = []
    if db is not None:
        shows = list(db.showtimes.aggregate([{ "$sample": {"size": 3}}]))
        for s in shows:
            s["_id"] = str(s["_id"])
    return jsonify(shows), 200

@customer_bp.route('/movie/<movie_id>')
def movie_detail(movie_id):
    print(f"🎬 Movie detail requested for ID: {movie_id}")
    # Có thể lấy thông tin phim từ db nếu muốn
    # movie = db.movies.find_one({"_id": movie_id})
    return render_template('movie-detail.html', movie_id=movie_id)

@customer_bp.route("/api/movie/<movie_id>/showtimes", methods=["GET"])
def get_movie_showtimes(movie_id):
    showtimes = []
    if db is not None:
        showtimes = list(db.showtimes.find({"movie_id": movie_id}))
        for s in showtimes:
            s["_id"] = str(s["_id"])
    return jsonify(showtimes), 200

@customer_bp.route('/booking')
def booking_page():
    movie_id = request.args.get('movie_id')
    showtime_id = request.args.get('showtime_id')
    return render_template('booking.html', movie_id=movie_id, showtime_id=showtime_id)

@customer_bp.route('/payment')
def payment_page():
    return render_template('payment.html')

@customer_bp.route('/demo')
def demo_page():
    return render_template('demo.html')

@customer_bp.route('/genre')
def genre_page():
    return render_template('genres.html')

@customer_bp.route('/api/genres')
def api_genres():
    genres = [
        {"id": "action", "name": "Hành động", "description": "Những bộ phim gay cấn, kịch tính, nhiều pha mạo hiểm.", "icon": "fa fa-bolt"},
        {"id": "comedy", "name": "Hài", "description": "Phim mang lại tiếng cười, giải trí.", "icon": "fa fa-laugh"},
        {"id": "drama", "name": "Tâm lý", "description": "Phim về cuộc sống, cảm xúc, các mối quan hệ.", "icon": "fa fa-theater-masks"},
        {"id": "horror", "name": "Kinh dị", "description": "Phim rùng rợn, hồi hộp, gây sợ hãi.", "icon": "fa fa-ghost"},
        {"id": "romance", "name": "Lãng mạn", "description": "Phim về tình yêu, cảm xúc lãng mạn.", "icon": "fa fa-heart"},
        {"id": "animation", "name": "Hoạt hình", "description": "Phim hoạt hình cho mọi lứa tuổi.", "icon": "fa fa-film"},
        {"id": "sci-fi", "name": "Khoa học viễn tưởng", "description": "Phim về tương lai, công nghệ, vũ trụ.", "icon": "fa fa-robot"},
        {"id": "thriller", "name": "Giật gân", "description": "Phim hồi hộp, bất ngờ, nhiều plot twist.", "icon": "fa fa-eye"}
    ]
    return jsonify(genres)

@customer_bp.route('/api/showtimes/<showtime_id>', methods=['GET'])
def get_showtime(showtime_id):
    from bson import ObjectId
    try:
        # Thử tìm với ObjectId trước
        showtime = db.showtimes.find_one({"_id": ObjectId(showtime_id)})
        if not showtime:
            # Nếu không tìm thấy, thử với string
            showtime = db.showtimes.find_one({"_id": showtime_id})
        if not showtime:
            return jsonify({"error": "Showtime not found"}), 404
        
        # Convert _id về string để JSON serializable
        showtime["_id"] = str(showtime["_id"])
        return jsonify(showtime), 200
    except Exception as e:
        return jsonify({"error": f"Invalid showtime_id: {e}"}), 400

@customer_bp.route('/api/showtime/<showtime_id>/seats', methods=['GET'])
def get_seats_for_showtime(showtime_id):
    from bson import ObjectId
    try:
        # Thử tìm với ObjectId trước
        showtime = db.showtimes.find_one({"_id": ObjectId(showtime_id)})
        if not showtime:
            # Nếu không tìm thấy, thử với string
            showtime = db.showtimes.find_one({"_id": showtime_id})
        if not showtime:
            return jsonify({"error": "Showtime not found"}), 404
    except Exception as e:
        return jsonify({"error": f"Invalid showtime_id: {e}"}), 400

    # Fix tại đây
    hall_id = showtime.get("hall_id") or showtime.get("hall")

    # Lấy tất cả ghế trong phòng, loại trừ ghế hỏng
    seats = list(db.seats.find({
        "hall_id": hall_id, 
        "is_broken": {"$ne": True},  # Loại trừ ghế hỏng
        "status": {"$ne": "broken"}  # Thêm điều kiện status
    }))
    
    # Kiểm tra ghế đã đặt (bookings)
    booked_seats = {}
    
    # Thử tìm với ObjectId trước
    bookings = list(db.bookings.find({"showtime_id": ObjectId(showtime_id), "status": {"$in": ["pending", "paid"]}}))
    if not bookings:
        # Nếu không tìm thấy, thử với string
        bookings = list(db.bookings.find({"showtime_id": showtime_id, "status": {"$in": ["pending", "paid"]}}))
    
    for booking in bookings:
        for seat_ref in booking.get("seats", []):
            # seat_ref có thể là seat_id (ObjectId) hoặc seat_code (string)
            if isinstance(seat_ref, str):
                # Nếu là string, có thể là seat_code
                if '_' in seat_ref:  # Format: hall_seat (e.g., "hn_hall1_A1")
                    booked_seats[seat_ref] = booking["status"]
                else:
                    # Có thể là seat_id string
                    booked_seats[seat_ref] = booking["status"]
            else:
                # Nếu là ObjectId
                booked_seats[str(seat_ref)] = booking["status"]
    
    # Kiểm tra ghế bị lock (seat locks)
    locked_seats = {}
    current_time = datetime.now(timezone.utc)
    for lock in db.seatlocks.find({
        "showtime_id": showtime_id,
        "status": "active",
        "expires_at": {"$gt": current_time}
    }):
        for seat_code in lock.get("seat_codes", []):
            # Tìm seat_id từ seat_code
            seat = db.seats.find_one({"hall_id": hall_id, "seat_code": seat_code})
            if seat:
                locked_seats[str(seat["_id"])] = "locked"

    result = []
    for seat in seats:
        seat_id = seat["_id"]
        seat_code = seat["seat_code"].strip().upper()  # chuẩn hóa nếu cần
        
        # Kiểm tra trạng thái: locked > booked > available
        status = "available"
        
        # Kiểm tra locked trước
        if str(seat_id) in locked_seats:
            status = "locked"
        # Kiểm tra booked - có thể là seat_id hoặc seat_code
        elif str(seat_id) in booked_seats:
            status = booked_seats[str(seat_id)]
        elif seat_code in booked_seats:
            status = booked_seats[seat_code]
        # Kiểm tra seat_code với format hall_seat
        elif f"{hall_id}_{seat_code}" in booked_seats:
            status = booked_seats[f"{hall_id}_{seat_code}"]
        
        # Kiểm tra thêm trạng thái hỏng
        if seat.get("is_broken") or seat.get("status") == "broken":
            status = "broken"
        
        result.append({
            "seat_id": str(seat_id),  # Convert ObjectId to string
            "seat_code": seat_code,
            "seat_type": seat.get("seat_type", "NORMAL"),
            "status": status,
            "is_broken": seat.get("is_broken", False)
        })

    return jsonify({
        "seats": result,
        "base_price": showtime.get("base_price", 90000)
    }), 200

# Debug API - kiểm tra customer data
@customer_bp.route("/api/debug/customer-info", methods=["GET"])
@require_auth(role="customer")
def debug_customer_info(current_user):
    """Debug: Kiểm tra thông tin customer và bookings"""
    try:
        result = {
            "customer_id": current_user["_id"],
            "customer_role": current_user.get("role"),
            "bookings": [],
            "tickets": []
        }
        
        if db is not None:
            # Lấy tất cả bookings của customer
            bookings = list(db.bookings.find({"customer_id": current_user["_id"]}))
            result["bookings"] = [{
                "booking_id": str(b["_id"]),
                "status": b.get("status"),
                "showtime_id": str(b.get("showtime_id")) if b.get("showtime_id") else None,
                "total_amount": b.get("total_amount"),
                "created_at": str(b.get("created_at", ""))
            } for b in bookings]
            
            # Lấy tất cả tickets của customer qua bookings
            booking_ids = [b["_id"] for b in bookings]
            if booking_ids:
                tickets = list(db.tickets.find({"booking_id": {"$in": booking_ids}}))
                result["tickets"] = [{
                    "ticket_id": str(t["_id"]),
                    "booking_id": str(t["booking_id"]),
                    "status": t.get("status"),
                    "barcode_data": t.get("barcode_data"),
                    "seat_id": str(t.get("seat_id")) if t.get("seat_id") else None,
                    "created_at": str(t.get("created_at", ""))
                } for t in tickets]
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"❌ Debug customer info error: {e}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

# API để lấy tất cả vé của customer
@customer_bp.route("/api/my-tickets", methods=["GET"])
@require_auth(role="customer")
def get_my_tickets(current_user):
    """Lấy tất cả vé hợp lệ của customer (chưa check-in)"""
    try:
        if db is not None:
            # Bước 1: Lấy tất cả bookings của customer
            bookings = list(db.bookings.find({
                "customer_id": current_user["_id"],
                "status": "paid"  # Chỉ lấy booking đã thanh toán
            }))
            

            
            if not bookings:
                return jsonify([]), 200
            
            result = []
            
            for booking in bookings:
                booking_id = booking["_id"]
                
                # Lấy tickets cho booking này (chỉ lấy valid tickets)
                tickets = list(db.tickets.find({
                    "booking_id": booking_id,
                    "status": "valid"  # Chỉ lấy vé chưa check-in
                }))
                
                if not tickets:
                    continue
                
                # Lấy thông tin showtime
                from bson import ObjectId
                try:
                    # Thử tìm với ObjectId trước
                    showtime = db.showtimes.find_one({"_id": ObjectId(booking["showtime_id"])})
                    if not showtime:
                        # Nếu không tìm thấy, thử với string
                        showtime = db.showtimes.find_one({"_id": booking["showtime_id"]})
                    if not showtime:
                        continue
                except Exception as e:
                    continue
                
                # Lấy thông tin movie
                movie_id = showtime.get("movie_id")
                movie = None
                if isinstance(movie_id, ObjectId):
                    movie_id = str(movie_id)
                movie = db.movies.find_one({"_id": movie_id})
                
                # Format tickets
                formatted_tickets = []
                for ticket in tickets:
                    # Lấy thông tin seat
                    seat = db.seats.find_one({"_id": ticket["seat_id"]})
                    seat_code = seat["seat_code"] if seat else "A1"
                    
                    try:
                        formatted_tickets.append({
                            "ticket_id": str(ticket["_id"]),
                            "seat_code": seat_code,
                            "seat_id": str(ticket["seat_id"]),
                            "barcode_data": ticket.get("barcode_data"),
                            "status": ticket["status"],
                            "created_at": str(ticket.get("created_at", datetime.now(timezone.utc)))
                        })
                    except Exception as e:
                        continue
                
                # Tạo booking group
                try:
                    booking_group = {
                        "booking_id": str(booking_id),
                        "booking_info": {
                            "cinema": showtime.get("cinema", "Storia Cinema"),
                            "movie_title": movie["title"] if movie and "title" in movie else "Unknown Movie",
                            "movie_poster": movie.get("poster_url", movie.get("poster", movie.get("thumbnail_url", f"/static/img/{movie_id}.jpg"))) if movie else f"/static/img/{movie_id if movie_id else 'default'}.jpg",
                            "hall": showtime.get("hall", "Hall 1"),
                            "date": showtime.get("date", "2024-01-01"),
                            "time": showtime.get("time", "20:00"),
                            "total_amount": booking.get("total_amount", 0)
                        },
                        "tickets": formatted_tickets
                    }
                    
                    result.append(booking_group)
                except Exception as e:
                    continue
            
            # Sort theo thời gian booking mới nhất
            result.sort(key=lambda x: x["tickets"][0]["created_at"] if x["tickets"] else "1900-01-01", reverse=True)
            
            return jsonify(result), 200
        

        return jsonify([]), 200
        
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500

# API để lấy barcode data
@customer_bp.route("/api/ticket/<ticket_id>/barcode", methods=["GET"])
@require_auth(role="customer")
def get_ticket_barcode(ticket_id, current_user):
    # Tìm ticket thuộc về customer
    ticket = None
    if db is not None:
        # Tìm ticket thông qua booking
        ticket = db.tickets.find_one({"_id": ticket_id})
        if ticket:
            booking = db.bookings.find_one({
                "_id": ticket["booking_id"], 
                "customer_id": current_user["_id"]
            })
            if not booking:
                return jsonify({"error": "Ticket not found"}), 404
    
    if not ticket:
        return jsonify({"error": "Ticket not found"}), 404
    
    return jsonify({
        "barcode_data": ticket["barcode_data"],
        "status": ticket["status"]
    }), 200

# API để hủy booking - Enhanced version
@customer_bp.route("/api/booking/<booking_id>/cancel", methods=["POST"])
@require_auth(role="customer")
def cancel_booking(booking_id, current_user):
    try:
        # Tìm booking thuộc về customer
        booking = None
        if db is not None:
            booking = db.bookings.find_one({
                "_id": booking_id, 
                "customer_id": current_user["_id"]
            })
        
        if not booking:
            return jsonify({"error": "Booking not found"}), 404
        
        # Chỉ cho phép hủy booking chưa thanh toán
        if booking.get("status") != "pending":
            return jsonify({"error": "Cannot cancel paid booking"}), 400
        
        # Lấy thông tin chi tiết trước khi hủy
        seat_ids = booking.get("seats", [])
        released_seats = []
        showtime_info = {}
        
        if db is not None:
            # Lấy thông tin seats
            seats = list(db.seats.find({"_id": {"$in": seat_ids}}))
            released_seats = [seat["seat_code"] for seat in seats]
            
            # Lấy thông tin showtime để trả về cho frontend
            showtime = db.showtimes.find_one({"_id": booking.get("showtime_id")})
            if showtime:
                showtime_info = {
                    "showtime_id": showtime["_id"],
                    "movie_id": showtime.get("movie_id"),
                    "hall": showtime.get("hall"),
                    "date": showtime.get("date"),
                    "time": showtime.get("time")
                }
        
        # Atomic update - cập nhật cả booking và tickets
        if db is not None:
            # Cập nhật booking status
            booking_result = db.bookings.update_one(
                {"_id": booking_id, "status": "pending"},  # Double-check status
                {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc)}}
            )
            
            # Cập nhật tickets status nếu booking được update thành công
            if booking_result.modified_count > 0:
                db.tickets.update_many(
                    {"booking_id": booking_id, "status": "valid"},
                    {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc)}}
                )
                
                return jsonify({
                    "success": True,
                    "message": "Booking cancelled successfully",
                    "booking_id": booking_id,
                    "released_seats": released_seats,
                    "seat_count": len(released_seats),
                    "showtime_info": showtime_info
                }), 200
            else:
                return jsonify({"error": "Booking already cancelled or modified"}), 400
        
        return jsonify({"error": "Database connection error"}), 500
        
    except Exception as e:
        print(f"Cancel booking error: {e}")
        return jsonify({"error": "Internal server error"}), 500

# Debug API - kiểm tra database state cho showtime
@customer_bp.route("/api/debug/showtime/<showtime_id>/bookings", methods=["GET"])
def debug_showtime_bookings(showtime_id):
    """Debug API để kiểm tra tất cả bookings cho một showtime"""
    try:
        if db is not None:
            # Lấy tất cả bookings cho showtime này
            all_bookings = list(db.bookings.find({"showtime_id": showtime_id}))
            
            # Group theo status
            booking_stats = {}
            seat_conflicts = {}
            
            for booking in all_bookings:
                status = booking.get("status", "unknown")
                booking_stats[status] = booking_stats.get(status, 0) + 1
                
                # Check seat conflicts
                for seat_id in booking.get("seats", []):
                    if seat_id not in seat_conflicts:
                        seat_conflicts[seat_id] = []
                    seat_conflicts[seat_id].append({
                        "booking_id": booking["_id"],
                        "status": status,
                        "created_at": booking.get("created_at", "unknown")
                    })
            
            # Tìm seats có conflicts
            conflicted_seats = {k: v for k, v in seat_conflicts.items() if len(v) > 1}
            
            return jsonify({
                "showtime_id": showtime_id,
                "total_bookings": len(all_bookings),
                "booking_stats": booking_stats,
                "conflicted_seats": conflicted_seats,
                "all_bookings": [{
                    "booking_id": b["_id"],
                    "status": b.get("status"),
                    "seat_count": len(b.get("seats", [])),
                    "created_at": str(b.get("created_at", ""))
                } for b in all_bookings]
            }), 200
        
        return jsonify({"error": "Database connection error"}), 500
        
    except Exception as e:
        print(f"Debug API error: {e}")
        return jsonify({"error": str(e)}), 500

# Cleanup API - dọn dẹp pending bookings cũ
@customer_bp.route("/api/cleanup/showtime/<showtime_id>/old-bookings", methods=["POST"])
def cleanup_old_bookings(showtime_id):
    """Cleanup pending bookings cũ hơn 10 phút"""
    try:
        if db is not None:
            # Tính thời gian 10 phút trước
            cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=10)
            
            # Tìm pending bookings cũ
            old_bookings = list(db.bookings.find({
                "showtime_id": showtime_id,
                "status": "pending",
                "created_at": {"$lt": cutoff_time}
            }))
            
            cancelled_count = 0
            released_seats = []
            
            for booking in old_bookings:
                # Cancel booking
                result = db.bookings.update_one(
                    {"_id": booking["_id"], "status": "pending"},
                    {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc)}}
                )
                
                if result.modified_count > 0:
                    cancelled_count += 1
                    
                    # Cancel tickets
                    db.tickets.update_many(
                        {"booking_id": booking["_id"], "status": "valid"},
                        {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc)}}
                    )
                    
                    # Get seat codes
                    seats = list(db.seats.find({"_id": {"$in": booking.get("seats", [])}}))
                    for seat in seats:
                        released_seats.append(seat["seat_code"])
            
            return jsonify({
                "success": True,
                "message": f"Cleaned up {cancelled_count} old bookings",
                "cancelled_bookings": cancelled_count,
                "released_seats": released_seats
            }), 200
        
        return jsonify({"error": "Database connection error"}), 500
        
    except Exception as e:
        print(f"Cleanup API error: {e}")
        return jsonify({"error": str(e)}), 500

# Force cleanup user's pending bookings for showtime
@customer_bp.route("/api/force-cleanup/user/<showtime_id>", methods=["POST"])
@require_auth(role="customer")
def force_cleanup_user_bookings(showtime_id, current_user):
    """Force cleanup tất cả pending bookings của user cho showtime cụ thể"""
    try:
        if db is not None:
            # Tìm tất cả pending/cancelled bookings của user cho showtime này (in case of race conditions)
            user_bookings = list(db.bookings.find({
                "showtime_id": showtime_id,
                "customer_id": current_user["_id"],
                "status": {"$in": ["pending", "cancelled"]}
            }))
            
            cancelled_count = 0
            released_seats = []
            
            for booking in user_bookings:
                booking_status = booking.get("status")
                
                if booking_status == "pending":
                    # Cancel pending booking
                    result = db.bookings.update_one(
                        {"_id": booking["_id"], "status": "pending"},
                        {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc)}}
                    )
                    
                    if result.modified_count > 0:
                        cancelled_count += 1
                        
                        # Cancel tickets
                        db.tickets.update_many(
                            {"booking_id": booking["_id"], "status": "valid"},
                            {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc)}}
                        )
                elif booking_status == "cancelled":
                    # Already cancelled, but ensure tickets are cancelled too
                    db.tickets.update_many(
                        {"booking_id": booking["_id"], "status": "valid"},
                        {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc)}}
                    )
                    cancelled_count += 1  # Count as processed
                
                # Get seat codes for both cases
                seats = list(db.seats.find({"_id": {"$in": booking.get("seats", [])}}))
                for seat in seats:
                    released_seats.append(seat["seat_code"])
            
            return jsonify({
                "success": True,
                "message": f"Force cleaned up {cancelled_count} user bookings",
                "cancelled_bookings": cancelled_count,
                "released_seats": released_seats,
                "user_id": current_user["_id"]
            }), 200
        
        return jsonify({"error": "Database connection error"}), 500
        
    except Exception as e:
        print(f"Force cleanup error: {e}")
        return jsonify({"error": str(e)}), 500

@customer_bp.route('/api/movies/showing')
def get_showing_movies():
    """API để lấy danh sách phim đang chiếu với phân trang"""
    try:
        # Lấy tham số phân trang
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 6, type=int)  # 6 phim mỗi trang
        search = request.args.get('search', '')
        
        # Tính toán skip
        skip = (page - 1) * per_page
        
        # Tạo query filter - chỉ lấy movies có status showing/Active
        filter_query = {'status': {'$in': ['showing', 'Active']}}
        if search:
            filter_query['title'] = {'$regex': search, '$options': 'i'}
        
        # Đếm tổng số phim
        total_movies = db.movies.count_documents(filter_query)
        total_pages = (total_movies + per_page - 1) // per_page
        
        # Lấy danh sách phim
        movies = list(db.movies.find(filter_query)
                     .sort('created_at', -1)
                     .skip(skip)
                     .limit(per_page))
        
        # Format dữ liệu
        formatted_movies = []
        for movie in movies:
            # Xử lý poster_url
            poster_url = movie.get('poster_url')
            if not poster_url:
                # Fallback to static image based on movie_id
                poster_url = f"/static/img/showing_movie{movie.get('_id', '1')}.jpg"
            
            formatted_movie = {
                'id': str(movie['_id']),
                'title': movie.get('title', 'Unknown'),
                'genre': movie.get('genre', 'Unknown'),
                'poster_url': poster_url,
                'description': movie.get('description', ''),
                'duration': movie.get('duration', ''),
                'rating': movie.get('rating', ''),
                'director': movie.get('director', 'Unknown'),
                'cast': movie.get('cast', 'Unknown'),
                'trailer_url': movie.get('trailer_url', ''),
                'status': movie.get('status', 'showing')
            }
            formatted_movies.append(formatted_movie)
        
        return jsonify({
            'success': True,
            'movies': formatted_movies,
            'pagination': {
                'current_page': page,
                'total_pages': total_pages,
                'total_movies': total_movies,
                'per_page': per_page,
                'has_next': page < total_pages,
                'has_prev': page > 1
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@customer_bp.route('/api/movies/coming-soon')
def get_coming_soon_movies():
    """API để lấy danh sách phim sắp chiếu với phân trang"""
    try:
        # Lấy tham số phân trang
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 6, type=int)  # 6 phim mỗi trang
        search = request.args.get('search', '')
        
        # Tính toán skip
        skip = (page - 1) * per_page
        
        # Tạo query filter - hỗ trợ cả 'coming_soon' và 'Coming Soon'
        filter_query = {'status': {'$in': ['coming_soon', 'Coming Soon']}}
        if search:
            filter_query['title'] = {'$regex': search, '$options': 'i'}
        
        # Đếm tổng số phim
        total_movies = db.movies.count_documents(filter_query)
        total_pages = (total_movies + per_page - 1) // per_page
        
        # Lấy danh sách phim
        movies = list(db.movies.find(filter_query)
                     .sort('created_at', -1)
                     .skip(skip)
                     .limit(per_page))
        
        # Format dữ liệu
        formatted_movies = []
        for movie in movies:
            # Xử lý poster_url
            poster_url = movie.get('poster_url')
            if not poster_url:
                # Fallback to static image based on movie_id
                poster_url = f"/static/img/comingsoon_movie{movie.get('_id', '1')}.jpg"
            
            formatted_movie = {
                'id': str(movie['_id']),
                'title': movie.get('title', 'Unknown'),
                'genre': movie.get('genre', 'Unknown'),
                'poster_url': poster_url,
                'description': movie.get('description', ''),
                'duration': movie.get('duration', ''),
                'rating': movie.get('rating', ''),
                'status': movie.get('status', 'coming_soon')
            }
            formatted_movies.append(formatted_movie)
        
        return jsonify({
            'success': True,
            'movies': formatted_movies,
            'pagination': {
                'current_page': page,
                'total_pages': total_pages,
                'total_movies': total_movies,
                'per_page': per_page,
                'has_next': page < total_pages,
                'has_prev': page > 1
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@customer_bp.route('/api/movies/<movie_id>')
def get_movie_by_id(movie_id):
    """API để lấy thông tin một phim theo ID"""
    try:
        # Tìm phim theo ID
        movie = db.movies.find_one({'_id': movie_id})
        
        if not movie:
            return jsonify({
                'success': False,
                'error': 'Movie not found'
            }), 404
        
        # Format dữ liệu
        poster_url = movie.get('poster_url')
        if not poster_url:
            # Fallback to static image based on movie_id
            poster_url = f"/static/img/showing_movie{movie.get('_id', '1')}.jpg"
        
        formatted_movie = {
            'id': str(movie['_id']),
            'title': movie.get('title', 'Unknown'),
            'genre': movie.get('genre', 'Unknown'),
            'poster_url': poster_url,
            'poster': poster_url,  # For backward compatibility
            'thumbnail_url': movie.get('thumbnail_url', poster_url),
            'description': movie.get('description', ''),
            'duration': movie.get('duration', ''),
            'rating': movie.get('rating', ''),
            'status': movie.get('status', ''),
            'release_date': movie.get('release_date', ''),
            'genres': movie.get('genres', []),
            'director': movie.get('director', 'Unknown'),
            'cast': movie.get('cast', 'Unknown'),
            'trailer_url': movie.get('trailer_url', ''),
            'age_rating': movie.get('age_rating', 'K'),
            'views': movie.get('views', 0)
        }
        
        return jsonify(formatted_movie)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@customer_bp.route('/api/test-auth')
def test_auth():
    """Test endpoint to check if server is running and token is valid"""
    try:
        # Check if Authorization header is present
        auth_header = request.headers.get('Authorization')
        
        if auth_header and auth_header.startswith('Bearer '):
            # Token provided - validate it
            token = auth_header.split(' ')[1]
            try:
                from services.auth_service import verify_token
                payload = verify_token(token)
                return jsonify({
                    'success': True,
                    'message': 'Token is valid',
                    'user_id': payload.get('user_id'),
                    'role': payload.get('role'),
                    'timestamp': datetime.utcnow().isoformat()
                })
            except Exception as e:
                return jsonify({
                    'success': False,
                    'message': 'Token is invalid',
                    'error': str(e)
                }), 401
        else:
            # No token - just return server status
            return jsonify({
                'success': True,
                'message': 'Server is running',
                'timestamp': datetime.utcnow().isoformat()
            })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@customer_bp.route('/cinema')
def cinema_page():
    return render_template('cinema.html')

@customer_bp.route('/api/cinema/<cinema_id>')
def get_cinema_info(cinema_id):
    """API để lấy thông tin cinema"""
    try:
        cinema = db.cinemas.find_one({'_id': cinema_id})
        if not cinema:
            return jsonify({
                'success': False,
                'error': 'Cinema not found'
            }), 404
        
        return jsonify(cinema)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@customer_bp.route('/api/cinema/<cinema_id>/movies')
def get_cinema_movies(cinema_id):
    """API để lấy movies cho cinema"""
    try:
        # Lấy tất cả movies (không filter theo status)
        movies = list(db.movies.find({}, {
            '_id': 1, 'title': 1, 'poster_url': 1, 'poster': 1, 
            'thumbnail_url': 1, 'description': 1, 'genre': 1, 'status': 1
        }))
        
        # Format dữ liệu
        formatted_movies = []
        for movie in movies:
            formatted_movie = {
                '_id': str(movie['_id']),
                'title': movie.get('title', 'Unknown'),
                'poster_url': movie.get('poster_url') or movie.get('poster') or '/static/img/showing_movie1.jpg',
                'poster': movie.get('poster_url') or movie.get('poster') or '/static/img/showing_movie1.jpg',
                'thumbnail_url': movie.get('thumbnail_url'),
                'description': movie.get('description', ''),
                'genre': movie.get('genre', 'Unknown')
            }
            formatted_movies.append(formatted_movie)
        
        return jsonify(formatted_movies)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@customer_bp.route('/api/cinema/<cinema_id>/showtimes')
def get_cinema_showtimes(cinema_id):
    """API để lấy showtimes cho cinema"""
    try:
        # Lấy showtimes cho cinema này
        showtimes = list(db.showtimes.find({'cinema_id': cinema_id}, {
            '_id': 1, 'movie_id': 1, 'date': 1, 'time': 1, 'hall_name': 1
        }))
        
        # Format dữ liệu
        formatted_showtimes = []
        for showtime in showtimes:
            formatted_showtime = {
                '_id': str(showtime['_id']),
                'movie_id': str(showtime.get('movie_id', '')),
                'date': showtime.get('date', ''),
                'time': showtime.get('time', ''),
                'hall_name': showtime.get('hall_name', 'Unknown')
            }
            formatted_showtimes.append(formatted_showtime)
        
        return jsonify(formatted_showtimes)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Removed duplicate routes - using the new ones above

# Seat Locking APIs
@customer_bp.route("/api/seat-locks/create", methods=["POST"])
@require_auth(role="customer")
def create_seat_lock(current_user):
    """Tạo seat lock khi customer bấm 'Đặt vé'"""
    try:
        data = request.json or {}
        showtime_id = data.get("showtime_id")
        seat_codes = data.get("seat_codes", [])
        booking_data = data.get("booking_data", {})
        
        if not showtime_id or not seat_codes:
            return jsonify({"error": "Thiếu showtime_id hoặc seat_codes"}), 400
        
        if db is not None:
            # Kiểm tra xem ghế có bị lock bởi user khác không
            existing_locks = list(db.seatlocks.find({
                "showtime_id": showtime_id,
                "seat_codes": {"$in": seat_codes},
                "status": "active",
                "expires_at": {"$gt": datetime.now(timezone.utc)}
            }))
            
            if existing_locks:
                locked_seats = []
                for lock in existing_locks:
                    locked_seats.extend(lock.get("seat_codes", []))
                return jsonify({
                    "error": "Một số ghế đã bị đặt bởi người khác",
                    "locked_seats": list(set(locked_seats))
                }), 409
            
            # Tạo session_id unique
            session_id = f"lock_{str(ObjectId())}"
            
            # Tính thời gian hết hạn (7 phút)
            locked_at = datetime.now(timezone.utc)
            expires_at = locked_at + timedelta(minutes=7)
            
            # Tạo seat lock
            seat_lock = {
                "showtime_id": showtime_id,
                "seat_codes": seat_codes,
                "user_id": current_user["_id"],
                "session_id": session_id,
                "locked_at": locked_at,
                "expires_at": expires_at,
                "status": "active",
                "booking_data": booking_data
            }
            
            result = db.seatlocks.insert_one(seat_lock)
            
            return jsonify({
                "success": True,
                "message": "Seat lock created successfully",
                "session_id": session_id,
                "expires_at": expires_at.isoformat(),
                "locked_seats": seat_codes
            }), 201
        
        return jsonify({"error": "Database connection error"}), 500
        
    except Exception as e:
        print(f"Create seat lock error: {e}")
        return jsonify({"error": "Internal server error"}), 500

@customer_bp.route("/api/seat-locks/release", methods=["DELETE"])
@require_auth(role="customer")
def release_seat_lock(current_user):
    """Release seat lock khi customer bấm 'Quay lại' hoặc timeout"""
    try:
        data = request.json or {}
        session_id = data.get("session_id")
        
        if not session_id:
            return jsonify({"error": "Thiếu session_id"}), 400
        
        if db is not None:
            # Tìm và xóa seat lock
            lock = db.seatlocks.find_one({
                "session_id": session_id,
                "user_id": current_user["_id"],
                "status": "active"
            })
            
            if not lock:
                return jsonify({"error": "Seat lock not found"}), 404
            
            # Update status thành released
            result = db.seatlocks.update_one(
                {"_id": lock["_id"]},
                {
                    "$set": {
                        "status": "released",
                        "released_at": datetime.now(timezone.utc)
                    }
                }
            )
            
            if result.modified_count > 0:
                return jsonify({
                    "success": True,
                    "message": "Seat lock released successfully",
                    "released_seats": lock.get("seat_codes", [])
                }), 200
            else:
                return jsonify({"error": "Failed to release seat lock"}), 500
        
        return jsonify({"error": "Database connection error"}), 500
        
    except Exception as e:
        print(f"Release seat lock error: {e}")
        return jsonify({"error": "Internal server error"}), 500

@customer_bp.route("/api/seat-locks/cleanup-expired", methods=["POST"])
def cleanup_expired_locks():
    """Cleanup expired seat locks (background job)"""
    try:
        if db is not None:
            # Tính thời gian 7 phút trước
            cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=7)
            
            # Tìm expired locks
            expired_locks = list(db.seatlocks.find({
                "expires_at": {"$lt": cutoff_time},
                "status": "active"
            }))
            
            released_seats = []
            affected_users = []
            
            for lock in expired_locks:
                # Update lock status thành expired
                db.seatlocks.update_one(
                    {"_id": lock["_id"]},
                    {
                        "$set": {
                            "status": "expired",
                            "expired_at": datetime.now(timezone.utc)
                        }
                    }
                )
                
                # Collect released seats
                released_seats.extend(lock.get("seat_codes", []))
                affected_users.append(lock.get("user_id"))
            
            return jsonify({
                "success": True,
                "message": f"Cleaned up {len(expired_locks)} expired locks",
                "released_seats": released_seats,
                "affected_users": affected_users
            }), 200
        
        return jsonify({"error": "Database connection error"}), 500
        
    except Exception as e:
        print(f"Cleanup expired locks error: {e}")
        return jsonify({"error": str(e)}), 500

@customer_bp.route("/api/showtime/<showtime_id>/locked-seats", methods=["GET"])
def get_locked_seats(showtime_id):
    """Lấy danh sách ghế đang bị lock cho showtime"""
    try:
        if db is not None:
            # Lấy tất cả active locks cho showtime này
            active_locks = list(db.seatlocks.find({
                "showtime_id": showtime_id,
                "status": "active",
                "expires_at": {"$gt": datetime.now(timezone.utc)}
            }))
            
            locked_seats = []
            for lock in active_locks:
                locked_seats.extend(lock.get("seat_codes", []))
            
            return jsonify({
                "showtime_id": showtime_id,
                "locked_seats": list(set(locked_seats)),
                "active_locks_count": len(active_locks)
            }), 200
        
        return jsonify({"error": "Database connection error"}), 500
        
    except Exception as e:
        print(f"Get locked seats error: {e}")
        return jsonify({"error": "Internal server error"}), 500
