# mongo_app.py

from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_cors import CORS
from routes.customer import customer_bp
from routes.staff import staff_bp
from db import db
from services.logging_service import init_logging_service
init_logging_service(db)

# 🧠 Tạo Flask app
app = Flask(__name__)
CORS(app)  # Cho phép gọi API từ frontend nếu khác port

# 🧩 Đăng ký Blueprint theo vai trò
from routes.manager import manager_bp
from routes.admin import admin_bp

app.register_blueprint(customer_bp)
app.register_blueprint(staff_bp)
app.register_blueprint(manager_bp)
app.register_blueprint(admin_bp)

@app.route('/')
def home():
    return render_template('index_new.html')

@app.route('/cinema')
def cinema():
    return render_template('cinema.html')

@app.route('/genres')
def genres():
    return render_template('genres.html')

@app.route('/contact')
def contact():
    return render_template('contact.html')

@app.route('/staff')
def staff():
    return render_template('staff.html')

@app.route('/my-tickets')
def my_tickets_page():
    return render_template('ticket.html')

@app.route('/manager')
def manager():
    return render_template('manager.html')

@app.route('/admin')
def admin():
    return render_template('admin.html')

# 🔥 Chạy app
if __name__ == "__main__":
    app.run(debug=True, port=5001)
