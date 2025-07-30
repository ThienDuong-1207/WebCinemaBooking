#!/usr/bin/env python3
"""
Logging Service for Cinema Management System
Handles system logs for admin dashboard
"""

from datetime import datetime
from typing import Dict, Any, Optional
from pymongo import MongoClient
import json

class LoggingService:
    def __init__(self, db_connection):
        self.db = db_connection
        self.logs_collection = self.db.logs
    
    def log_activity(self, 
                    activity_type: str, 
                    user_id: Optional[str] = None,
                    user_email: Optional[str] = None,
                    user_role: Optional[str] = None,
                    details: Optional[Dict[str, Any]] = None,
                    ip_address: Optional[str] = None,
                    success: bool = True,
                    error_message: Optional[str] = None) -> str:
        """
        Log an activity to the logs collection
        
        Args:
            activity_type: Type of activity (login, logout, booking, payment, etc.)
            user_id: ID of the user performing the activity
            user_email: Email of the user
            user_role: Role of the user (admin, staff, customer)
            details: Additional details about the activity
            ip_address: IP address of the user
            success: Whether the activity was successful
            error_message: Error message if activity failed
            
        Returns:
            str: ID of the created log entry
        """
        try:
            log_entry = {
                "timestamp": datetime.utcnow(),
                "activity_type": activity_type,
                "user_id": user_id,
                "user_email": user_email,
                "user_role": user_role,
                "details": details or {},
                "ip_address": ip_address,
                "success": success,
                "error_message": error_message,
                "created_at": datetime.utcnow()
            }
            
            # Remove None values
            log_entry = {k: v for k, v in log_entry.items() if v is not None}
            
            result = self.logs_collection.insert_one(log_entry)
            print(f"📝 Logged activity: {activity_type} - User: {user_email} - Success: {success}")
            return str(result.inserted_id)
            
        except Exception as e:
            print(f"❌ Error logging activity: {e}")
            return None
    
    def log_login(self, user_id: str, user_email: str, user_role: str, 
                  ip_address: str = None, success: bool = True, 
                  error_message: str = None) -> str:
        """Log user login activity"""
        return self.log_activity(
            activity_type="login",
            user_id=user_id,
            user_email=user_email,
            user_role=user_role,
            ip_address=ip_address,
            success=success,
            error_message=error_message
        )
    
    def log_logout(self, user_id: str, user_email: str, user_role: str, 
                   ip_address: str = None) -> str:
        """Log user logout activity"""
        return self.log_activity(
            activity_type="logout",
            user_id=user_id,
            user_email=user_email,
            user_role=user_role,
            ip_address=ip_address,
            success=True
        )
    
    def log_booking(self, user_id: str, user_email: str, booking_id: str,
                    movie_title: str, showtime_info: str, total_amount: float,
                    seats: list, ip_address: str = None, success: bool = True,
                    error_message: str = None) -> str:
        """Log booking activity"""
        details = {
            "booking_id": booking_id,
            "movie_title": movie_title,
            "showtime_info": showtime_info,
            "total_amount": total_amount,
            "seats": seats,
            "payment_status": "pending"
        }
        
        return self.log_activity(
            activity_type="booking",
            user_id=user_id,
            user_email=user_email,
            user_role="customer",
            details=details,
            ip_address=ip_address,
            success=success,
            error_message=error_message
        )
    
    def log_payment(self, user_id: str, user_email: str, booking_id: str,
                    payment_method: str, amount: float, transaction_id: str = None,
                    ip_address: str = None, success: bool = True,
                    error_message: str = None) -> str:
        """Log payment activity"""
        details = {
            "booking_id": booking_id,
            "payment_method": payment_method,
            "amount": amount,
            "transaction_id": transaction_id
        }
        
        return self.log_activity(
            activity_type="payment",
            user_id=user_id,
            user_email=user_email,
            user_role="customer",
            details=details,
            ip_address=ip_address,
            success=success,
            error_message=error_message
        )
    
    def log_admin_action(self, admin_id: str, admin_email: str, action: str,
                         target_type: str = None, target_id: str = None,
                         details: Dict[str, Any] = None, ip_address: str = None,
                         success: bool = True, error_message: str = None) -> str:
        """Log admin actions"""
        log_details = {
            "action": action,
            "target_type": target_type,
            "target_id": target_id
        }
        
        if details:
            log_details.update(details)
        
        return self.log_activity(
            activity_type="admin_action",
            user_id=admin_id,
            user_email=admin_email,
            user_role="admin",
            details=log_details,
            ip_address=ip_address,
            success=success,
            error_message=error_message
        )
    
    def log_staff_action(self, staff_id: str, staff_email: str, action: str,
                         details: Dict[str, Any] = None, ip_address: str = None,
                         success: bool = True, error_message: str = None) -> str:
        """Log staff actions"""
        return self.log_activity(
            activity_type="staff_action",
            user_id=staff_id,
            user_email=staff_email,
            user_role="staff",
            details=details,
            ip_address=ip_address,
            success=success,
            error_message=error_message
        )
    
    def get_logs(self, 
                 activity_type: str = None,
                 user_role: str = None,
                 user_email: str = None,
                 start_date: datetime = None,
                 end_date: datetime = None,
                 success: bool = None,
                 limit: int = 100,
                 skip: int = 0) -> list:
        """
        Get logs with filters
        
        Args:
            activity_type: Filter by activity type
            user_role: Filter by user role
            user_email: Filter by user email
            start_date: Filter logs from this date
            end_date: Filter logs to this date
            success: Filter by success status
            limit: Number of logs to return
            skip: Number of logs to skip
            
        Returns:
            list: List of log entries
        """
        try:
            # Build filter
            filter_query = {}
            
            if activity_type:
                filter_query["activity_type"] = activity_type
            if user_role:
                filter_query["user_role"] = user_role
            if user_email:
                filter_query["user_email"] = user_email
            if success is not None:
                filter_query["success"] = success
            if start_date or end_date:
                filter_query["timestamp"] = {}
                if start_date:
                    filter_query["timestamp"]["$gte"] = start_date
                if end_date:
                    filter_query["timestamp"]["$lte"] = end_date
            
            # Get logs
            logs = list(self.logs_collection.find(filter_query)
                       .sort("timestamp", -1)
                       .skip(skip)
                       .limit(limit))
            
            # Convert ObjectId to string
            for log in logs:
                log["_id"] = str(log["_id"])
                log["timestamp"] = log["timestamp"].isoformat()
                if "created_at" in log:
                    log["created_at"] = log["created_at"].isoformat()
            
            return logs
            
        except Exception as e:
            print(f"❌ Error getting logs: {e}")
            return []
    
    def get_logs_summary(self) -> Dict[str, Any]:
        """Get summary statistics of logs"""
        try:
            # Total logs
            total_logs = self.logs_collection.count_documents({})
            
            # Logs by activity type
            activity_stats = list(self.logs_collection.aggregate([
                {"$group": {"_id": "$activity_type", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]))
            
            # Logs by user role
            role_stats = list(self.logs_collection.aggregate([
                {"$group": {"_id": "$user_role", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]))
            
            # Success/failure stats
            success_stats = list(self.logs_collection.aggregate([
                {"$group": {"_id": "$success", "count": {"$sum": 1}}}
            ]))
            
            # Recent activity (last 24 hours)
            from datetime import timedelta
            yesterday = datetime.utcnow() - timedelta(days=1)
            recent_logs = self.logs_collection.count_documents({
                "timestamp": {"$gte": yesterday}
            })
            
            return {
                "total_logs": total_logs,
                "activity_stats": activity_stats,
                "role_stats": role_stats,
                "success_stats": success_stats,
                "recent_logs_24h": recent_logs
            }
            
        except Exception as e:
            print(f"❌ Error getting logs summary: {e}")
            return {}
    
    def create_logs_indexes(self):
        """Create indexes for better query performance"""
        try:
            # Index on timestamp for date range queries
            self.logs_collection.create_index("timestamp")
            
            # Index on activity_type for filtering
            self.logs_collection.create_index("activity_type")
            
            # Index on user_role for filtering
            self.logs_collection.create_index("user_role")
            
            # Index on user_email for filtering
            self.logs_collection.create_index("user_email")
            
            # Index on success for filtering
            self.logs_collection.create_index("success")
            
            # Compound index for common queries
            self.logs_collection.create_index([
                ("timestamp", -1),
                ("activity_type", 1),
                ("user_role", 1)
            ])
            
            print("✅ Logs indexes created successfully")
            
        except Exception as e:
            print(f"❌ Error creating logs indexes: {e}")

# Global logging service instance
logging_service = None

def init_logging_service(db_connection):
    """Initialize the global logging service"""
    global logging_service
    logging_service = LoggingService(db_connection)
    logging_service.create_logs_indexes()
    return logging_service

def get_logging_service():
    """Get the global logging service instance"""
    return logging_service 