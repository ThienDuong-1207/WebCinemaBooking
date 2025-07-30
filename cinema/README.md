# Cinema Management System

A comprehensive web-based cinema management system built with Flask, MongoDB, and modern frontend technologies. This system provides complete management capabilities for movie theaters, including ticket booking, staff management, and revenue reporting.

## 👥 Team Members

| Name                | Student ID    |
|---------------------|---------------|
| Dương Ngọc Linh Đan | 2374802010091 |
| Võ Ngọc Phú         | 2374802010390 |
| Lê Tấn Nguyện       | 2374802010354 |
| Dương Chí Thiện     | 2374802010468 |
| Bùi Gia Phát        | 2374802010375 |



## 🎬 Features

### Customer Features
- **Movie Browsing**: View current and upcoming movies with detailed information
- **Ticket Booking**: Interactive seat selection with real-time availability
- **Payment Integration**: Support for multiple payment methods (MOMO, VNPay)
- **Ticket Management**: View booking history and download tickets
- **QR Code Tickets**: Digital tickets with QR codes for easy validation

### Staff Features
- **Ticket Validation**: Scan and validate tickets using QR codes
- **Check-in System**: Real-time seat status updates
- **Customer Support**: Handle booking issues and refunds

### Manager Features
- **Movie Management**: Add, edit, and manage movie information
- **Showtime Management**: Create and schedule movie showtimes
- **Revenue Reports**: Comprehensive sales analytics and reporting
- **Dashboard**: Real-time statistics and performance metrics

### Admin Features
- **User Management**: Manage staff accounts and permissions
- **System Monitoring**: Activity logs and system health monitoring
- **Data Analytics**: Advanced reporting and data visualization

## 🏗️ Architecture

### Backend
- **Framework**: Flask (Python)
- **Database**: MongoDB with PyMongo
- **Authentication**: JWT-based authentication system
- **API**: RESTful API design with role-based access control

### Frontend
- **UI Framework**: Bootstrap 5 with custom CSS
- **Charts**: Chart.js for data visualization
- **JavaScript**: Vanilla JS with modern ES6+ features
- **Responsive Design**: Mobile-first approach

### Database Collections
- `users`: User accounts and authentication
- `movies`: Movie information and metadata
- `showtimes`: Screening schedules and availability
- `bookings`: Customer reservations and ticket data
- `tickets`: Individual ticket records with QR codes
- `payments`: Payment transaction records
- `seats`: Seat configuration and status
- `seatlocks`: Temporary seat reservations
- `logs`: System activity and audit trails

## 🚀 Installation

### Prerequisites
- Python 3.8+
- MongoDB 4.4+
- Node.js (for development)

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cinema
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure MongoDB**
   - Start MongoDB service
   - Create database: `cinema_db`
   - Import initial data (if available)

4. **Environment Setup**
   ```bash
   # Create .env file
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Run the application**
   ```bash
   python run.py
   ```

6. **Access the application**
   - Open browser: `http://localhost:5001`
   - Default admin credentials: admin/admin123

## 📁 Project Structure

```
cinema/
├── mongo_app.py              # Main Flask application
├── run.py                    # Application entry point
├── db.py                     # Database connection
├── routes/                   # API route handlers
│   ├── admin.py             # Admin endpoints
│   ├── customer.py          # Customer endpoints
│   ├── manager.py           # Manager endpoints
│   └── staff.py             # Staff endpoints
├── services/                 # Business logic services
│   ├── auth_service.py      # Authentication service
│   └── logging_service.py   # Logging service
├── static/                   # Frontend assets
│   ├── css/                 # Stylesheets
│   ├── js/                  # JavaScript files
│   └── img/                 # Images and media
├── templates/                # HTML templates
│   ├── layout_customer.html
│   ├── layout_employees.html
│   ├── manager.html
│   └── ...
├── scripts/                  # Utility scripts
│   └── cleanup_showtimes.py # Maintenance scripts
└── README.md                # This file
```

## 🔧 Configuration

### Environment Variables
```env
MONGODB_URI=mongodb://localhost:27017/cinema_db
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret
FLASK_ENV=development
```

### Database Configuration
- **Host**: localhost:27017
- **Database**: cinema_db
- **Collections**: users, movies, showtimes, bookings, tickets, payments, seats, seatlocks, logs

## 🎯 API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/register` - User registration
- `POST /api/logout` - User logout

### Customer APIs
- `GET /api/movies` - List movies
- `GET /api/movies/<id>` - Get movie details
- `GET /api/showtimes` - List showtimes
- `GET /api/seats/<showtime_id>` - Get seat availability
- `POST /api/bookings` - Create booking
- `GET /api/my-tickets` - Get user tickets

### Manager APIs
- `GET /manager/dashboard-stats` - Dashboard statistics
- `GET /api/manager/sales-report` - Revenue reports
- `POST /manager/add-movie` - Add new movie
- `PUT /manager/update-movie/<id>` - Update movie
- `DELETE /manager/delete-movie/<id>` - Delete movie

### Staff APIs
- `POST /api/staff/validate-ticket` - Validate ticket
- `POST /api/staff/checkin` - Check-in customer

### Admin APIs
- `GET /admin/dashboard-stats` - Admin dashboard
- `GET /admin/logs/summary` - System logs
- `GET /admin/logs/recent` - Recent activities

## 🎨 User Interface

### Customer Interface
- **Homepage**: Movie listings and promotions
- **Movie Details**: Comprehensive movie information
- **Booking Page**: Interactive seat selection
- **Payment Page**: Secure payment processing
- **My Tickets**: Ticket management and history

### Staff Interface
- **Check-in Dashboard**: Ticket validation tools
- **Seat Status**: Real-time seat availability
- **Customer Support**: Issue resolution tools

### Manager Interface
- **Dashboard**: Key performance indicators
- **Movie Management**: CRUD operations for movies
- **Showtime Management**: Schedule management
- **Revenue Reports**: Sales analytics and charts

### Admin Interface
- **System Dashboard**: Overall system health
- **User Management**: Staff account administration
- **Activity Logs**: System monitoring and audit

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: Different permissions for different user types
- **Input Validation**: Server-side validation for all inputs
- **SQL Injection Protection**: MongoDB with parameterized queries
- **XSS Protection**: Content Security Policy headers
- **CSRF Protection**: Cross-Site Request Forgery protection

## 📊 Reporting & Analytics

### Revenue Reports
- **Daily Revenue**: Revenue by day
- **Movie Performance**: Revenue by movie
- **Hall Performance**: Revenue by cinema hall
- **Time Analysis**: Revenue by showtime

### Dashboard Metrics
- **Total Movies**: Number of active movies
- **Today's Showtimes**: Current day screenings
- **Revenue Today**: Daily revenue
- **Tickets Sold**: Total tickets sold
- **Coming Soon**: Upcoming movie releases

## 🛠️ Development

### Code Style
- **Python**: PEP 8 compliance
- **JavaScript**: ES6+ with modern practices
- **HTML/CSS**: Bootstrap 5 framework

### Testing
```bash
# Run tests (if available)
python -m pytest tests/

# Manual testing
python scripts/test_*.py
```

### Database Maintenance
```bash
# Cleanup old showtimes
python scripts/cleanup_showtimes.py

# Database backup
mongodump --db cinema_db --out backup/
```

## 🚀 Deployment

### Production Setup
1. **Server Requirements**
   - Ubuntu 20.04+ / CentOS 8+
   - Python 3.8+
   - MongoDB 4.4+
   - Nginx (reverse proxy)

2. **Environment Configuration**
   ```bash
   export FLASK_ENV=production
   export MONGODB_URI=mongodb://localhost:27017/cinema_db
   ```

3. **Process Management**
   ```bash
   # Using systemd
   sudo systemctl enable cinema
   sudo systemctl start cinema
   ```

### Docker Deployment
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 5001
CMD ["python", "run.py"]
```

## 📈 Performance

### Optimization Features
- **Database Indexing**: Optimized MongoDB queries
- **Caching**: Redis caching for frequently accessed data
- **CDN**: Static asset delivery optimization
- **Compression**: Gzip compression for responses

### Monitoring
- **Application Logs**: Structured logging with levels
- **Performance Metrics**: Response time monitoring
- **Error Tracking**: Exception handling and reporting
- **Health Checks**: System status monitoring

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests (if applicable)
5. Submit a pull request

### Code Review Process
- Automated testing
- Code style checks
- Security review
- Performance review

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [API Documentation](docs/api.md)
- [User Guide](docs/user-guide.md)
- [Admin Guide](docs/admin-guide.md)

### Contact
- **Email**: support@cinema-system.com
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions

## 🔄 Changelog

### Version 1.0.0
- Initial release
- Basic cinema management features
- Customer booking system
- Staff check-in system
- Manager dashboard
- Admin panel

### Upcoming Features
- Mobile app integration
- Advanced analytics
- Multi-language support
- API rate limiting
- Enhanced security features

---

**Built with ❤️ for modern cinema management** 