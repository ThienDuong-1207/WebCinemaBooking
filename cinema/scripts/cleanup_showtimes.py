#!/usr/bin/env python3
"""
Cleanup script for old showtimes and broken seats management
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
import re
from db import db

def cleanup_old_showtimes():
    """Dọn dẹp các showtime cũ"""
    try:
        # Lấy ngày hiện tại
        now = datetime.now()
        today_str = now.strftime('%Y-%m-%d')
        
        # Đếm số lượng đã xóa và bỏ qua
        deleted_count = 0
        skipped = []
        
        # Lấy tất cả showtime
        showtimes = list(db.showtimes.find({}, {"_id": 1, "date": 1}))
        
        for st in showtimes:
            st_id = st["_id"]
            date_val = st.get("date")
            
            if date_val is None:
                skipped.append((st_id, "missing date"))
                continue
                
            # Nếu là datetime
            if isinstance(date_val, datetime):
                if date_val.date() < now.date():
                    db.showtimes.delete_one({"_id": st_id})
                    deleted_count += 1
            # Nếu là string
            elif isinstance(date_val, str):
                # Kiểm tra đúng format YYYY-MM-DD
                if re.match(r"^\d{4}-\d{2}-\d{2}$", date_val):
                    if date_val < today_str:
                        db.showtimes.delete_one({"_id": st_id})
                        deleted_count += 1
                else:
                    skipped.append((st_id, date_val))
            else:
                skipped.append((st_id, str(type(date_val))))
        
        print(f"✅ Đã xóa {deleted_count} showtime cũ.")
        if skipped:
            print("⚠️ Các bản ghi bị bỏ qua do format date sai hoặc thiếu:")
            for st_id, reason in skipped:
                print(f"  - _id: {st_id}, date: {reason}")
                
        return deleted_count
        
    except Exception as e:
        print(f"❌ Error cleaning up showtimes: {e}")
        return 0

def init_broken_seats_sample():
    """Khởi tạo dữ liệu mẫu cho ghế hỏng"""
    try:
        # Tạo một số ghế hỏng mẫu
        broken_seats_sample = [
            {
                "seat_id": "A1",
                "hall": "Hall 1",
                "cinema": "Storia Sài Gòn",
                "report_time": datetime.now() - timedelta(days=2),
                "description": "Ghế bị gãy chân",
                "reported_by": "staff",
                "status": "active",
                "resolved_time": None,
                "resolved_by": None
            },
            {
                "seat_id": "B5",
                "hall": "Hall 2", 
                "cinema": "Storia Hà Nội",
                "report_time": datetime.now() - timedelta(days=1),
                "description": "Ghế bị rách da",
                "reported_by": "staff",
                "status": "active",
                "resolved_time": None,
                "resolved_by": None
            },
            {
                "seat_id": "C3",
                "hall": "Hall 1",
                "cinema": "Storia Sài Gòn", 
                "report_time": datetime.now() - timedelta(days=5),
                "description": "Ghế bị lỏng ốc",
                "reported_by": "staff",
                "status": "resolved",
                "resolved_time": datetime.now() - timedelta(days=1),
                "resolved_by": "staff"
            }
        ]
        
        # Xóa dữ liệu cũ
        db.brokenSeats.delete_many({})
        
        # Thêm dữ liệu mẫu
        result = db.brokenSeats.insert_many(broken_seats_sample)
        
        print(f"✅ Đã thêm {len(result.inserted_ids)} ghế hỏng mẫu")
        
        # Cập nhật trạng thái ghế trong collection seats
        for broken_seat in broken_seats_sample:
            if broken_seat["status"] == "active":
                # Cập nhật ghế thành broken
                db.seats.update_many(
                    {
                        "seat_code": broken_seat["seat_id"],
                        "hall": broken_seat["hall"],
                        "cinema": broken_seat["cinema"]
                    },
                    {
                        "$set": {
                            "is_broken": True,
                            "status": "broken"
                        }
                    }
                )
            else:
                # Khôi phục ghế đã resolved
                db.seats.update_many(
                    {
                        "seat_code": broken_seat["seat_id"],
                        "hall": broken_seat["hall"],
                        "cinema": broken_seat["cinema"]
                    },
                    {
                        "$set": {
                            "is_broken": False,
                            "status": "available"
                        }
                    }
                )
        
        print("✅ Đã cập nhật trạng thái ghế trong collection seats")
        return len(result.inserted_ids)
        
    except Exception as e:
        print(f"❌ Error initializing broken seats: {e}")
        return 0

if __name__ == "__main__":
    print("=== Khởi tạo dữ liệu mẫu ===")
    deleted_count = cleanup_old_showtimes()
    broken_seats_count = init_broken_seats_sample()
    print(f"✅ Hoàn thành! Đã xóa {deleted_count} showtimes cũ, thêm {broken_seats_count} ghế hỏng mẫu") 