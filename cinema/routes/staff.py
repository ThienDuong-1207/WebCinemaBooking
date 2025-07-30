# 📁 routes/staff.py
from flask import Blueprint, request, jsonify, render_template
from services.auth_service import require_auth
from db import db
from datetime import datetime, timedelta
from bson import ObjectId
import json

staff_bp = Blueprint("staff", __name__)

# 1. Validate ticket (kiểm tra thông tin vé trước khi check-in)
@staff_bp.route("/api/staff/validate-ticket", methods=["POST"])
@require_auth(role="staff")
def validate_ticket(current_user):
    try:
        data = request.json or {}
        barcode_data = data.get("barcode_data")
        
        if not barcode_data:
            return jsonify({"error": "Thiếu mã vạch"}), 400

        # Tìm booking theo barcode (QR code của ticket)
        booking = None
        ticket = None
        
        try:
            if db is not None:
                # Thử tìm ticket trước (vì barcode thường nằm trong tickets)
                ticket = db.tickets.find_one({"barcode_data": barcode_data})
                if ticket:
                    booking_id = ticket.get("booking_id")
                    if booking_id:
                        # Tìm booking trực tiếp với ID (có thể là string hoặc ObjectId)
                        booking = db.bookings.find_one({"_id": booking_id})
                
                # Nếu không tìm thấy, thử tìm booking trực tiếp
                if not booking:
                    booking = db.bookings.find_one({"barcode_data": barcode_data})
        except Exception as e:
            print(f"Error finding booking: {e}")
            return jsonify({"error": "Lỗi tìm kiếm booking"}), 500
        
        if not booking:
            return jsonify({"error": "Không tìm thấy booking với mã này"}), 404

        # Lấy thông tin showtime, movie, customer
        showtime = None
        movie = None
        customer = None
        
        try:
            if db is not None:
                showtime_id = booking.get("showtime_id")
                if showtime_id:
                    # Convert string to ObjectId if needed
                    if isinstance(showtime_id, str):
                        showtime_id = ObjectId(showtime_id)
                    showtime = db.showtimes.find_one({"_id": showtime_id})
                
                user_id = booking.get("user_id")
                if user_id:
                    # Convert string to ObjectId if needed
                    if isinstance(user_id, str):
                        user_id = ObjectId(user_id)
                    customer = db.users.find_one({"_id": user_id})
                
                if showtime:
                    movie_id = showtime.get("movie_id")
                    if movie_id:
                        # Convert string to ObjectId if needed
                        if isinstance(movie_id, str):
                            movie_id = ObjectId(movie_id)
                        movie = db.movies.find_one({"_id": movie_id})
        except Exception as e:
            print(f"Error getting related data: {e}")
            return jsonify({"error": "Lỗi lấy thông tin liên quan"}), 500

        # Lấy tickets trong booking
        tickets = []
        try:
            if db is not None:
                # LUÔN lấy tất cả tickets trong booking, bất kể scan ticket nào
                booking_id_obj = booking["_id"]
                print(f"Debug: booking_id = {booking_id_obj}, type = {type(booking_id_obj)}")
                
                tickets = list(db.tickets.find({"booking_id": booking_id_obj}))
                print(f"Debug: Found {len(tickets)} tickets")
                
                # Lấy thông tin seat cho mỗi ticket
                for i, ticket_item in enumerate(tickets):
                    print(f"Debug: Processing ticket {i+1}: {ticket_item.get('_id')}")
                    ticket_item["_id"] = str(ticket_item["_id"])
                    if ticket_item.get("seat_id"):
                        seat_id = ticket_item.get("seat_id")
                        print(f"Debug: seat_id = {seat_id}, type = {type(seat_id)}")
                        # Thử tìm seat với seat_id trực tiếp (có thể là string)
                        seat = db.seats.find_one({"_id": seat_id})
                        if not seat:
                            # Nếu không tìm thấy, thử tìm với seat_code
                            seat = db.seats.find_one({"seat_code": seat_id})
                        if seat:
                            ticket_item["seat_code"] = seat.get("seat_code")
                            print(f"Debug: Found seat: {seat.get('seat_code')}")
                        else:
                            # Nếu không tìm thấy seat, sử dụng seat_id làm seat_code
                            ticket_item["seat_code"] = seat_id
                            print(f"Debug: Using seat_id as seat_code: {seat_id}")
        except Exception as e:
            print(f"Error getting tickets: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({"error": "Lỗi lấy thông tin vé"}), 500

        # Tạo response data
        booking_info = {
            "booking_id": str(booking["_id"]),
            "barcode_data": barcode_data,
            "status": booking.get("status"),
            "total_tickets": len(tickets),
            "tickets": tickets,
            "showtime_info": {},
            "movie_info": {},
            "customer_info": {}
        }

        # Lấy thông tin showtime
        if showtime:
            booking_info["showtime_info"] = {
                "showtime_id": str(showtime["_id"]),
                "date": showtime.get("start_date") or showtime.get("date"),
                "time": showtime.get("start_time") or showtime.get("time"),
                "hall": showtime.get("hall_id") or showtime.get("hall"),
                "cinema": showtime.get("cinema_id") or showtime.get("cinema")
            }

        # Lấy thông tin movie
        if movie:
            booking_info["movie_info"] = {
                "movie_id": str(movie["_id"]),
                "title": movie.get("title"),
                "duration": movie.get("duration"),
                "poster": movie.get("poster")
            }

        # Lấy thông tin customer
        if customer:
            booking_info["customer_info"] = {
                "customer_id": str(customer["_id"]),
                "full_name": customer.get("full_name"),
                "email": customer.get("email"),
                "phone": customer.get("phone")
            }
        else:
            # Nếu không tìm thấy customer, tạo thông tin mặc định
            booking_info["customer_info"] = {
                "customer_id": str(booking.get("customer_id", "")),
                "full_name": "N/A",
                "email": "N/A", 
                "phone": "N/A"
            }

        return jsonify({
            "success": True,
            "booking_info": booking_info
        }), 200

    except Exception as e:
        print(f"Validate ticket error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Lỗi hệ thống"}), 500

# 2. Check-in ticket
@staff_bp.route("/api/staff/checkin-ticket", methods=["POST"])
@require_auth(role="staff")
def checkin_ticket(current_user):
    try:
        data = request.json or {}
        ticket_ids = data.get("ticket_ids", [])  # List of ticket IDs to check-in
        booking_id = data.get("booking_id")  # Optional: check-in all tickets in booking
        
        if not ticket_ids and not booking_id:
            return jsonify({"error": "Thiếu ID vé hoặc ID booking"}), 400

        # Nếu có booking_id, lấy tất cả tickets trong booking
        if booking_id and not ticket_ids:
            if db is not None:
                tickets = list(db.tickets.find({"booking_id": ObjectId(booking_id)}))
                ticket_ids = [str(ticket["_id"]) for ticket in tickets]
            else:
                return jsonify({"error": "Lỗi kết nối database"}), 500

        if not ticket_ids:
            return jsonify({"error": "Không có vé nào để check-in"}), 400

        # Kiểm tra và cập nhật từng ticket
        checked_in_tickets = []
        failed_tickets = []
        
        for ticket_id in ticket_ids:
            try:
                # Tìm ticket
                ticket = None
                if db is not None:
                    # Tìm với string ID trực tiếp
                    ticket = db.tickets.find_one({"_id": ticket_id})
                
                if not ticket:
                    failed_tickets.append({
                        "ticket_id": ticket_id,
                        "error": "Không tìm thấy vé"
                    })
                    continue

                # Kiểm tra trạng thái vé
                if ticket.get("status") == "checked_in":
                    failed_tickets.append({
                        "ticket_id": ticket_id,
                        "error": "Vé đã được check-in rồi"
                    })
                    continue
                    
                if ticket.get("status") == "cancelled":
                    failed_tickets.append({
                        "ticket_id": ticket_id,
                        "error": "Vé đã bị hủy"
                    })
                    continue

                # Cập nhật trạng thái vé
                if db is not None:
                    result = db.tickets.update_one(
                        {"_id": ticket_id, "status": {"$in": ["valid", "confirmed"]}},
                        {
                            "$set": {
                                "status": "checked_in",
                                "checked_in_at": datetime.now(),
                                "checked_in_by": current_user.get("full_name", "staff")
                            }
                        }
                    )
                    
                    if result.modified_count > 0:
                        checked_in_tickets.append(ticket_id)
                    else:
                        failed_tickets.append({
                            "ticket_id": ticket_id,
                            "error": "Không thể cập nhật trạng thái vé"
                        })
                    
            except Exception as e:
                failed_tickets.append({
                    "ticket_id": ticket_id,
                    "error": f"Lỗi xử lý vé: {str(e)}"
                })

        # Trả về kết quả
        if checked_in_tickets:
            return jsonify({
                "success": True,
                "message": f"Check-in thành công {len(checked_in_tickets)} vé",
                "checked_in_tickets": checked_in_tickets,
                "failed_tickets": failed_tickets,
                "total_checked_in": len(checked_in_tickets),
                "total_failed": len(failed_tickets)
            }), 200
        else:
            return jsonify({
                "success": False,
                "error": "Không có vé nào được check-in thành công",
                "failed_tickets": failed_tickets
            }), 400

    except Exception as e:
        print(f"Check-in ticket error: {e}")
        return jsonify({"error": "Lỗi hệ thống"}), 500

# 3. Dashboard stats
@staff_bp.route("/api/staff/dashboard-stats", methods=["GET"])
@require_auth(role="staff")
def dashboard_stats(current_user):
    try:
        today = datetime.now().date()
        today_start = datetime.combine(today, datetime.min.time())
        today_end = datetime.combine(today, datetime.max.time())
        
        stats = {
            "today_checkins": 0,
            "current_shows": 0,
            "waiting_customers": 0
        }
        
        if db is not None:
            # Đếm vé check-in hôm nay
            stats["today_checkins"] = db.tickets.count_documents({
                "status": "checked_in",
                "checked_in_at": {"$gte": today_start, "$lte": today_end}
            })
            
            # Đếm suất chiếu hiện tại (trong vòng 2 giờ)
            current_time = datetime.now()
            time_range_start = current_time - timedelta(hours=1)
            time_range_end = current_time + timedelta(hours=1)
            
            # Sử dụng start_date và start_time thay vì date và time
            current_showtimes = list(db.showtimes.find({
                "start_date": today.strftime("%Y-%m-%d"),
                "start_time": {
                    "$gte": time_range_start.strftime("%H:%M"),
                    "$lte": time_range_end.strftime("%H:%M")
                },
                "status": "active"
            }))
            
            stats["current_shows"] = len(current_showtimes)
            
            # Đếm khách hàng chờ (có booking nhưng chưa check-in)
            if current_showtimes:
                showtime_ids = [s["_id"] for s in current_showtimes]
                waiting_bookings = list(db.bookings.find({
                    "showtime_id": {"$in": showtime_ids},
                    "status": "paid"
                }))
                
                waiting_customers = set()
                for booking in waiting_bookings:
                    # Kiểm tra xem có vé nào chưa check-in không
                    unchecked_tickets = db.tickets.count_documents({
                        "booking_id": booking["_id"],
                        "status": {"$in": ["valid", "confirmed", "paid"]}
                    })
                    if unchecked_tickets > 0:
                        waiting_customers.add(booking.get("user_id"))
                
                stats["waiting_customers"] = len(waiting_customers)

        return jsonify(stats), 200

    except Exception as e:
        print(f"Dashboard stats error: {e}")
        return jsonify({
            "today_checkins": 0,
            "current_shows": 0,
            "waiting_customers": 0
        }), 200

# 4. Get cinemas
@staff_bp.route("/api/cinemas", methods=["GET"])
def get_cinemas():
    cinemas = [
        {"name": "Storia Hà Nội"},
        {"name": "Storia Sài Gòn"}
    ]
    return jsonify(cinemas), 200

# 5. Get halls
@staff_bp.route("/api/halls", methods=["GET"])
def get_halls():
    halls = [
        {"name": "Hall 1"},
        {"name": "Hall 2"},
        {"name": "Hall 3"}
    ]
    return jsonify(halls), 200

# 6. Report broken seat - Cập nhật với trường status
@staff_bp.route("/api/staff/report-broken-seat", methods=["POST"])
@require_auth(role="staff")
def report_broken_seat(current_user):
    try:
        data = request.json or {}
        seat_id = data.get("seat_id")
        hall = data.get("hall")
        cinema = data.get("cinema")
        report_time = data.get("report_time")
        description = data.get("description")
        
        if not all([seat_id, hall, cinema, report_time, description]):
            return jsonify({"error": "Thiếu thông tin báo cáo"}), 400

        # Tạo báo cáo ghế hỏng
        broken_seat = {
            "seat_id": seat_id,
            "hall": hall,
            "cinema": cinema,
            "report_time": report_time,
            "description": description,
            "reported_by": current_user.get("full_name", "staff"),
            "status": "active",  # Thêm trạng thái
            "resolved_time": None,
            "resolved_by": None
        }
        
        if db is not None:
            # Lưu báo cáo
            result = db.brokenSeats.insert_one(broken_seat)
            
            # Cập nhật trạng thái ghế trong collection seats
            db.seats.update_many(
                {
                    "seat_code": seat_id,
                    "hall": hall,
                    "cinema": cinema
                },
                {
                    "$set": {
                        "is_broken": True,
                        "broken_report_id": result.inserted_id,
                        "status": "broken"
                    }
                }
            )
            
            # Hủy tất cả booking tương lai của ghế này
            current_time = datetime.now()
            future_showtimes = list(db.showtimes.find({
                "date": {"$gte": current_time.strftime("%Y-%m-%d")},
                "hall": hall,
                "cinema": cinema
            }))
            
            for showtime in future_showtimes:
                # Tìm bookings có ghế này
                bookings = list(db.bookings.find({
                    "showtime_id": showtime["_id"],
                    "status": {"$in": ["pending", "paid"]}
                }))
                
                for booking in bookings:
                    # Kiểm tra xem booking có chứa ghế hỏng không
                    seat_ids = booking.get("seats", [])
                    for seat_id_obj in seat_ids:
                        seat = db.seats.find_one({"_id": seat_id_obj})
                        if seat and seat.get("seat_code") == seat_id:
                            # Hủy booking
                            db.bookings.update_one(
                                {"_id": booking["_id"]},
                                {
                                    "$set": {
                                        "status": "cancelled",
                                        "cancel_reason": "seat_broken",
                                        "cancelled_at": datetime.now()
                                    }
                                }
                            )
                            
                            # Hủy tickets
                            db.tickets.update_many(
                                {"booking_id": booking["_id"]},
                                {
                                    "$set": {
                                        "status": "cancelled",
                                        "cancel_reason": "seat_broken",
                                        "cancelled_at": datetime.now()
                                    }
                                }
                            )
                            break

        return jsonify({
            "success": True, 
            "message": "Đã ghi nhận báo cáo ghế hỏng và cập nhật trạng thái"
        }), 201

    except Exception as e:
        print(f"Report broken seat error: {e}")
        return jsonify({"error": "Lỗi hệ thống khi báo cáo ghế hỏng"}), 500

# 7. Get broken seats list
@staff_bp.route("/api/staff/broken-seats", methods=["GET"])
@require_auth(role="staff")
def get_broken_seats(current_user):
    try:
        broken_seats = []
        if db is not None:
            broken_seats = list(db.brokenSeats.find().sort("report_time", -1))
            
            # Convert ObjectId to string
            for seat in broken_seats:
                seat["_id"] = str(seat["_id"])
                
        return jsonify(broken_seats), 200

    except Exception as e:
        print(f"Get broken seats error: {e}")
        return jsonify([]), 200

# 8. Restore broken seat - Khôi phục ghế hỏng
@staff_bp.route("/api/staff/restore-seat/<seat_id>", methods=["PUT"])
@require_auth(role="staff")
def restore_broken_seat(seat_id, current_user):
    try:
        data = request.json or {}
        hall = data.get("hall")
        cinema = data.get("cinema")
        
        if not all([hall, cinema]):
            return jsonify({"error": "Thiếu thông tin hall hoặc cinema"}), 400

        if db is not None:
            # Tìm báo cáo ghế hỏng
            broken_report = db.brokenSeats.find_one({
                "seat_id": seat_id,
                "hall": hall,
                "cinema": cinema,
                "status": "active"
            })
            
            if not broken_report:
                return jsonify({"error": "Không tìm thấy báo cáo ghế hỏng"}), 404

            # Cập nhật báo cáo thành resolved
            db.brokenSeats.update_one(
                {"_id": broken_report["_id"]},
                {
                    "$set": {
                        "status": "resolved",
                        "resolved_time": datetime.now(),
                        "resolved_by": current_user.get("full_name", "staff")
                    }
                }
            )
            
            # Khôi phục trạng thái ghế
            db.seats.update_many(
                {
                    "seat_code": seat_id,
                    "hall": hall,
                    "cinema": cinema
                },
                {
                    "$set": {
                        "is_broken": False,
                        "broken_report_id": None,
                        "status": "available",
                        "last_maintenance": datetime.now()
                    }
                }
            )

        return jsonify({
            "success": True,
            "message": f"Đã khôi phục ghế {seat_id} thành công"
        }), 200

    except Exception as e:
        print(f"Restore broken seat error: {e}")
        return jsonify({"error": "Lỗi hệ thống khi khôi phục ghế"}), 500
