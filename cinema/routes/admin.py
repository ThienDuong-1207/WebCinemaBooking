#!/usr/bin/env python3
"""
Admin Routes for Cinema Management System
"""

from flask import Blueprint, request, jsonify, render_template
from services.auth_service import require_auth
from services.logging_service import get_logging_service
from datetime import datetime, timedelta
from bson import ObjectId
import traceback
from db import db
import json

admin_bp = Blueprint('admin', __name__)

# User Management Endpoints
@admin_bp.route('/api/users', methods=['GET'])
@require_auth('admin')
def get_users(payload):
    """Get users with pagination and filters"""
    try:
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 10))
        role = request.args.get('role')
        status = request.args.get('status')
        name = request.args.get('name')
        
        # Build query
        query = {}
        if role:
            query['role'] = role
        if status:
            query['is_active'] = (status == 'active')
        if name:
            query['$or'] = [
                {'full_name': {'$regex': name, '$options': 'i'}},
                {'email': {'$regex': name, '$options': 'i'}}
            ]
        
        # Get total count
        total = db.users.count_documents(query)
        
        # Get users with pagination
        skip = (page - 1) * page_size
        users = list(db.users.find(query).skip(skip).limit(page_size))
        
        # Convert ObjectId to string
        for user in users:
            user['_id'] = str(user['_id'])
            if 'created_at' in user:
                # Handle both datetime and string
                if hasattr(user['created_at'], 'isoformat'):
                    user['created_at'] = user['created_at'].isoformat()
                elif isinstance(user['created_at'], str):
                    # Already a string, keep as is
                    pass
                else:
                    # Convert to string if it's something else
                    user['created_at'] = str(user['created_at'])
        
        return jsonify({
            'users': users,
            'page': page,
            'page_size': page_size,
            'total': total
        })
        
    except Exception as e:
        print(f"❌ Error getting users: {e}")
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/api/users', methods=['POST'])
@require_auth('admin')
def create_user(payload):
    """Create new user"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['full_name', 'email', 'role']
        for field in required_fields:
            if not data.get(field):
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Check if email already exists
        existing_user = db.users.find_one({'email': data['email']})
        if existing_user:
            return jsonify({"error": "Email already exists"}), 400
        
        # Create user
        user = {
            'full_name': data['full_name'],
            'email': data['email'],
            'role': data['role'],
            'is_active': data.get('is_active', True),
            'created_at': datetime.utcnow()
        }
        
        # Lưu password plain text nếu được cung cấp
        if data.get('password'):
            user['password_hash'] = data['password']  # Lưu plain text
        
        result = db.users.insert_one(user)
        user['_id'] = str(result.inserted_id)
        
        return jsonify({
            'message': 'User created successfully',
            'user': user
        }), 201
        
    except Exception as e:
        print(f"❌ Error creating user: {e}")
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/api/users/<user_id>', methods=['PUT'])
@require_auth('admin')
def update_user(payload, user_id):
    """Update user"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['full_name', 'email', 'role']
        for field in required_fields:
            if not data.get(field):
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Check if email already exists for other users
        existing_user = db.users.find_one({
            'email': data['email'],
            '_id': {'$ne': user_id}
        })
        if existing_user:
            return jsonify({"error": "Email already exists"}), 400
        
        # Update user
        update_data = {
            'full_name': data['full_name'],
            'email': data['email'],
            'role': data['role'],
            'is_active': data.get('is_active', True)
        }
        
        result = db.users.update_one(
            {'_id': user_id},
            {'$set': update_data}
        )
        
        if result.modified_count == 0:
            return jsonify({"error": "User not found"}), 404
        
        return jsonify({
            'message': 'User updated successfully'
        })
        
    except Exception as e:
        print(f"❌ Error updating user: {e}")
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/api/users/<user_id>', methods=['DELETE'])
@require_auth('admin')
def delete_user(payload, user_id):
    """Delete user"""
    try:
        result = db.users.delete_one({'_id': user_id})
        
        if result.deleted_count == 0:
            return jsonify({"error": "User not found"}), 404
        
        return jsonify({
            'message': 'User deleted successfully'
        })
        
    except Exception as e:
        print(f"❌ Error deleting user: {e}")
        return jsonify({"error": str(e)}), 500

# Dashboard stats endpoint
@admin_bp.route('/api/admin/dashboard-stats', methods=['GET'])
@require_auth('admin')
def admin_dashboard_stats(payload):
    try:
        from datetime import datetime, timedelta, date
        
        today = date.today()
        today_str = today.strftime("%Y-%m-%d")
        
        # 1. Tổng số phim
        total_movies = db.movies.count_documents({})
        
        # 2. Suất chiếu hôm nay
        today_showtimes = db.showtimes.count_documents({"date": today_str})
        
        # 3. Doanh thu hôm nay
        today_revenue = 0
        today_payments = list(db.payments.find({
            "time": {"$regex": f"^{today_str}"}
        }))
        
        for payment in today_payments:
            if payment.get("status") == "completed":
                today_revenue += payment.get("amount", 0)
        
        # 4. Vé đã bán
        total_tickets = db.tickets.count_documents({})
        
        # User statistics
        total_users = db.users.count_documents({})
        active_users = db.users.count_documents({"is_active": True})
        new_users_month = db.users.count_documents({
            "created_at": {"$regex": f"^{today.strftime('%Y-%m')}"}
        })
        admin_count = db.users.count_documents({"role": "admin"})
        
        # User role distribution
        role_distribution = list(db.users.aggregate([
            {"$group": {"_id": "$role", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]))
        
        # User registration by month (last 6 months)
        six_months_ago = (today - timedelta(days=180)).strftime('%Y-%m')
        registration_by_month = list(db.users.aggregate([
            {"$match": {"created_at": {"$gte": six_months_ago}}},
            {"$addFields": {"month": {"$substr": ["$created_at", 0, 7]}}},
            {"$group": {"_id": "$month", "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}}
        ]))
        
        # System information
        total_showtimes = db.showtimes.count_documents({})
        total_bookings = db.bookings.count_documents({})
        
        # Total revenue
        total_revenue_result = list(db.payments.aggregate([
            {"$match": {"status": "completed"}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]))
        total_revenue = total_revenue_result[0]["total"] if total_revenue_result else 0
        
        # Recent activity (last 10 logs)
        recent_activity = list(db.logs.find().sort("timestamp", -1).limit(10))
        for log in recent_activity:
            log["_id"] = str(log["_id"])
            if "timestamp" in log and hasattr(log["timestamp"], "isoformat"):
                log["timestamp"] = log["timestamp"].isoformat()
        
        return jsonify({
            "user_stats": {
                "total_users": total_users,
                "active_users": active_users,
                "new_users_month": new_users_month,
                "admin_count": admin_count
            },
            "role_distribution": role_distribution,
            "registration_by_month": registration_by_month,
            "system_info": {
                "total_movies": total_movies,
                "total_showtimes": total_showtimes,
                "total_bookings": total_bookings,
                "total_revenue": total_revenue,
                "today_showtimes": today_showtimes,
                "today_revenue": today_revenue,
                "total_tickets": total_tickets
            },
            "recent_activity": recent_activity
        }), 200
        
    except Exception as e:
        print(f"Error getting admin dashboard stats: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Internal server error"}), 500

# Logs Endpoints
@admin_bp.route('/admin/logs', methods=['GET'])
@require_auth('admin')
def get_system_logs(payload):
    """Get system logs with filters"""
    try:
        logging_service = get_logging_service()
        if not logging_service:
            return jsonify({"error": "Logging service not available"}), 500
        
        # Get query parameters
        activity_type = request.args.get('activity_type')
        user_role = request.args.get('user_role')
        user_email = request.args.get('user_email')
        success = request.args.get('success')
        limit = int(request.args.get('limit', 100))
        skip = int(request.args.get('skip', 0))
        
        # Parse date filters
        start_date = None
        end_date = None
        
        if request.args.get('start_date'):
            start_date = datetime.fromisoformat(request.args.get('start_date'))
        if request.args.get('end_date'):
            end_date = datetime.fromisoformat(request.args.get('end_date'))
        
        # Parse success filter
        if success is not None:
            success = success.lower() == 'true'
        
        # Get logs
        logs = logging_service.get_logs(
            activity_type=activity_type,
            user_role=user_role,
            user_email=user_email,
            start_date=start_date,
            end_date=end_date,
            success=success,
            limit=limit,
            skip=skip
        )
        
        return jsonify({
            "success": True,
            "logs": logs,
            "total": len(logs)
        })
        
    except Exception as e:
        print(f"❌ Error getting system logs: {e}")
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/admin/logs/summary', methods=['GET'])
@require_auth('admin')
def get_logs_summary(payload):
    """Get logs summary statistics"""
    try:
        logging_service = get_logging_service()
        if not logging_service:
            return jsonify({"error": "Logging service not available"}), 500
        
        summary = logging_service.get_logs_summary()
        
        return jsonify({
            "success": True,
            "summary": summary
        })
        
    except Exception as e:
        print(f"❌ Error getting logs summary: {e}")
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/admin/logs/activity-types', methods=['GET'])
@require_auth('admin')
def get_activity_types(payload):
    """Get list of available activity types"""
    try:
        logging_service = get_logging_service()
        if not logging_service:
            return jsonify({"error": "Logging service not available"}), 500
        
        # Get unique activity types
        activity_types = list(logging_service.logs_collection.distinct("activity_type"))
        
        return jsonify({
            "success": True,
            "activity_types": activity_types
        })
        
    except Exception as e:
        print(f"❌ Error getting activity types: {e}")
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/admin/logs/user-roles', methods=['GET'])
@require_auth('admin')
def get_user_roles(payload):
    """Get list of available user roles"""
    try:
        logging_service = get_logging_service()
        if not logging_service:
            return jsonify({"error": "Logging service not available"}), 500
        
        # Get unique user roles
        user_roles = list(logging_service.logs_collection.distinct("user_role"))
        
        return jsonify({
            "success": True,
            "user_roles": user_roles
        })
        
    except Exception as e:
        print(f"❌ Error getting user roles: {e}")
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/admin/logs/recent', methods=['GET'])
@require_auth('admin')
def get_recent_logs(payload):
    """Get recent logs (last 24 hours)"""
    try:
        logging_service = get_logging_service()
        if not logging_service:
            return jsonify({"error": "Logging service not available"}), 500
        
        # Get logs from last 24 hours
        yesterday = datetime.utcnow() - timedelta(days=1)
        
        logs = logging_service.get_logs(
            start_date=yesterday,
            limit=50
        )
        
        return jsonify({
            "success": True,
            "logs": logs,
            "total": len(logs)
        })
        
    except Exception as e:
        print(f"❌ Error getting recent logs: {e}")
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/admin/logs/export', methods=['GET'])
@require_auth('admin')
def export_logs(payload):
    """Export logs to JSON format"""
    try:
        logging_service = get_logging_service()
        if not logging_service:
            return jsonify({"error": "Logging service not available"}), 500
        
        # Get all logs (with reasonable limit)
        logs = logging_service.get_logs(limit=1000)
        
        # Create export data
        export_data = {
            "export_date": datetime.utcnow().isoformat(),
            "total_logs": len(logs),
            "logs": logs
        }
        
        return jsonify(export_data)
        
    except Exception as e:
        print(f"❌ Error exporting logs: {e}")
        return jsonify({"error": str(e)}), 500
