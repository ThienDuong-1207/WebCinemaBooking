# 📁 services/auth_service.py
import jwt
from functools import wraps
from flask import request, jsonify
from datetime import datetime, timedelta, timezone

# 🔐 Secret key dùng để mã hóa JWT
SECRET_KEY = "your-secret-key"  # 👉 Đổi khi deploy thực tế

def verify_password(password, hashed):
    # Nếu hashed là password plain text (không hash)
    if not hashed.startswith('$2b$'):
        return password == hashed
    # Nếu hashed là bcrypt hash (fallback cho dữ liệu cũ)
    import bcrypt
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def generate_token(user):
    payload = {
        "_id": str(user["_id"]),  # Convert ObjectId to string
        "role": user["role"],
        "exp": datetime.now(timezone.utc) + timedelta(days=1)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def verify_token(token):
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise Exception("Token expired")
    except jwt.InvalidTokenError:
        raise Exception("Invalid token")
    except Exception as e:
        raise Exception(f"Token verification failed: {str(e)}")

def require_auth(role=None):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            token = None
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]

            if not token:
                return jsonify({"error": "Missing or invalid token"}), 401

            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            except jwt.ExpiredSignatureError:
                return jsonify({"error": "Token expired"}), 401
            except jwt.InvalidTokenError:
                return jsonify({"error": "Invalid token"}), 401

            if role and payload.get("role") != role:
                return jsonify({"error": "Unauthorized role"}), 403

            return f(payload, *args, **kwargs)
        return wrapper
    return decorator
