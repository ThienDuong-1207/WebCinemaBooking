// Get query parameters from URL
function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Xóa mảng MOVIES tĩnh
// Khi render card phim, dùng:
// <img src="${movie.poster_url || movie.poster || movie.thumbnail_url || '/static/img/showing_movie1.jpg'}" ... >

async function getMovieById(id) {
    try {
        const response = await fetch(`/api/movies/${id}`);
        if (response.ok) {
            return await response.json();
        }
        return null;
    } catch (error) {
        console.error('Error fetching movie:', error);
        return null;
    }
}

// Global variables
let bookingData = {};
let showtimeData = {};
let movieData = {};

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎬 Payment page loaded');
    
    // Setup event listeners first (always)
    setupEventListeners();
    
    // Get booking data from localStorage (set by booking page)
    const storedBookingData = localStorage.getItem('paymentBookingData');
    if (storedBookingData) {
        bookingData = JSON.parse(storedBookingData);
        loadPaymentData().then(() => {
            initializePaymentCountdown();
        });
    } else {
        // If no booking data, show error but don't redirect immediately
        console.warn('⚠️ No booking data found');
        showMockBookingData(); // For testing
    }
});

// Setup all event listeners
function setupEventListeners() {
    console.log('🔧 Setting up event listeners...');
    
    // Back button
    const backBtn = document.getElementById('back-to-booking');
    if (backBtn) {
        backBtn.addEventListener('click', goBackToBooking);
        console.log('✅ Back button listener added');
    } else {
        console.error('❌ Back button not found');
    }
    
    // Payment button
    const paymentBtn = document.getElementById('confirm-payment');
    if (paymentBtn) {
        paymentBtn.addEventListener('click', processPayment);
        console.log('✅ Payment button listener added');
    } else {
        console.error('❌ Payment button not found');
    }
    
    // Terms checkbox removed - no validation needed
    console.log('✅ No terms validation required');
}

// Mock booking data for testing
function showMockBookingData() {
    console.log('🧪 Using mock booking data for testing');
    bookingData = {
        movie_id: 'httyd',
        booking_id: 'test-booking',
        selected_seats: ['A17', 'A18'],
        total_amount: 240000,
        base_price: 90000,
        cinema: 'Storia Cinema',
        hall: 'Hall 1',
        date: '2025-01-15',
        time: '19:30',
        seat_map: {
            'A17': { seat_code: 'A17', seat_type: 'NORMAL', status: 'available' },
            'A18': { seat_code: 'A18', seat_type: 'NORMAL', status: 'available' }
        }
    };
    movieData = {
        title: 'How to Train Your Dragon',
        poster: '/static/img/showing_movie1.jpg'
    };
    loadPaymentData().then(() => {
        // Add a test button to show ticket preview
        setTimeout(() => {
            addTicketPreviewButton();
        }, 1000);
    });
}

// Add button to preview ticket design
function addTicketPreviewButton() {
    const paymentBtn = document.getElementById('confirm-payment');
    if (paymentBtn && !document.getElementById('preview-ticket-btn')) {
        const previewBtn = document.createElement('button');
        previewBtn.id = 'preview-ticket-btn';
        previewBtn.className = 'btn btn-info px-4 py-2 fw-bold ms-2';
        previewBtn.innerHTML = '<i class="fas fa-eye me-2"></i>Xem mẫu vé';
        previewBtn.onclick = showMockTicketPreview;
        
        paymentBtn.parentNode.appendChild(previewBtn);
        console.log('✅ Ticket preview button added');
    }
}

// Show mock ticket preview
function showMockTicketPreview() {
    console.log('🎫 Showing mock ticket preview...');
    
    // Create mock tickets data
    const mockTickets = [
        {
            ticket_id: 'tk_mock_001',
            seat_code: 'A17',
            barcode_data: 'A17430249202023'
        },
        {
            ticket_id: 'tk_mock_002', 
            seat_code: 'A18',
            barcode_data: 'A18430249202023'
        }
    ];
    
    const mockBookingInfo = {
        movie_title: bookingData ? (movieData?.title || 'How to Train Your Dragon') : 'How to Train Your Dragon',
        movie_poster: bookingData ? (movieData?.poster || '/static/img/showing_movie1.jpg') : '/static/img/showing_movie1.jpg',
        cinema: bookingData?.cinema || 'Storia Cinema',
        hall: bookingData?.hall || 'Hall 1',
        date: bookingData?.date || '2025-01-15',
        time: bookingData?.time || '19:30'
    };
    
    // Generate tickets in a modal or container
    let container = document.getElementById('tickets-container');
    if (!container) {
        // Create a temporary container for preview
        container = document.createElement('div');
        container.id = 'tickets-container';
        container.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 9999;
            background: white;
            padding: 20px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            max-height: 80vh;
            overflow-y: auto;
            max-width: 95vw;
        `;
        document.body.appendChild(container);
        
        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 15px;
            border: none;
            background: none;
            font-size: 20px;
            cursor: pointer;
            color: #666;
        `;
        closeBtn.onclick = () => {
            document.body.removeChild(container);
        };
        container.appendChild(closeBtn);
    }
    
    generateTicketDisplay(mockTickets, mockBookingInfo);
    
    alert('🎫 Xem vé mẫu ở giữa màn hình! Click ✕ để đóng.');
}

// Show ticket directly in payment page (replace payment section)
function showTicketInPaymentPage() {
    console.log('🎫 Displaying ticket in payment page...');
    
    // Hide payment methods section
    const paymentMethodsCard = document.querySelector('.col-lg-6:last-child .card');
    if (paymentMethodsCard) {
        paymentMethodsCard.style.display = 'none';
    }
    
    // Create ticket data
    const ticketData = {
        seat_code: bookingData.selected_seats[0] || 'A17',
        barcode_data: generateBarcodeData(),
        movie_title: movieData ? movieData.title : 'How to Train Your Dragon',
        movie_poster: movieData ? movieData.poster : '/static/img/showing_movie1.jpg',
        cinema: bookingData.cinema || 'Storia Cinema',
        hall: bookingData.hall || 'Hall 1',
        date: bookingData.date || '2025-01-15',
        time: bookingData.time || '19:30'
    };
    
    // Create ticket container
    const ticketContainer = document.createElement('div');
    ticketContainer.className = 'col-lg-6';
    ticketContainer.innerHTML = generateSimpleTicketHTML(ticketData);
    
    // Insert ticket where payment methods were
    const paymentSection = document.querySelector('.col-lg-6:last-child');
    if (paymentSection) {
        paymentSection.parentNode.insertBefore(ticketContainer, paymentSection);
    }
    
    // Add simple ticket styles
    addSimpleTicketStyles();
}

// Generate barcode data
function generateBarcodeData() {
    const seat = bookingData.selected_seats[0] || 'A17';
    const date = new Date().toISOString().slice(0,10).replace(/-/g,'');
    return seat + date + Math.random().toString().slice(2,8);
}

// Generate simple ticket HTML - 2 sections: Barcode + Info
function generateSimpleTicketHTML(ticket) {
    const date = new Date(ticket.date);
    const formattedDate = date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    
    return `
        <div class="simple-ticket-card">
            <h5 class="text-center mb-4">
                <i class="fas fa-ticket-alt text-success me-2"></i>
                Vé Điện Tử
            </h5>
            
            <!-- Barcode Section -->
            <div class="barcode-section">
                <h6 class="text-center mb-3">Mã Vé - Quét Để Vào Rạp</h6>
                <div class="barcode-display">
                    <div class="barcode-lines">${generateBarcodeLines()}</div>
                    <div class="barcode-text">${ticket.barcode_data}</div>
                </div>
            </div>
            
            <!-- Movie Info Section -->
            <div class="movie-info-section">
                <div class="row">
                    <div class="col-4">
                        <img src="${ticket.movie_poster}" alt="${ticket.movie_title}" class="movie-thumbnail">
                    </div>
                    <div class="col-8">
                        <h6 class="movie-title">${ticket.movie_title}</h6>
                        <div class="ticket-details">
                            <div class="detail-row">
                                <span class="label">Ghế:</span>
                                <span class="value seat-highlight">${ticket.seat_code}</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Giờ chiếu:</span>
                                <span class="value">${ticket.time}</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Ngày:</span>
                                <span class="value">${formattedDate}</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Phòng:</span>
                                <span class="value">${ticket.hall}</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Rạp:</span>
                                <span class="value">${ticket.cinema}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="text-center mt-4">
                <button class="btn btn-primary" onclick="window.location.href='/'">
                    <i class="fas fa-home me-2"></i>Về trang chủ
                </button>
                <br/>
                <small class="text-muted d-block mt-2">
                    <i class="fas fa-info-circle me-1"></i>
                    Vui lòng xuất trình mã này tại quầy để nhận vé
                </small>
            </div>
        </div>
    `;
}

// Generate barcode visual lines
function generateBarcodeLines() {
    let lines = '';
    for(let i = 0; i < 80; i++) {
        const width = Math.random() > 0.5 ? '2px' : '1px';
        lines += `<span style="width: ${width}"></span>`;
    }
    return lines;
}

// Add simple ticket styles
function addSimpleTicketStyles() {
    if (document.querySelector('#simple-ticket-styles')) return;
    
    const styles = `
        <style id="simple-ticket-styles">
        .simple-ticket-card {
            background: white;
            border: 2px solid #e9ecef;
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            margin: 20px 0;
        }
        
        .barcode-section {
            background: #f8f9fa;
            border: 2px dashed #dee2e6;
            border-radius: 10px;
            padding: 25px;
            margin-bottom: 25px;
            text-align: center;
        }
        
        .barcode-display {
            background: white;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #dee2e6;
        }
        
        .barcode-lines {
            height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 1px;
            margin-bottom: 10px;
            background: linear-gradient(90deg, #000 0%, #000 50%, transparent 50%, transparent 100%);
            background-size: 3px 100%;
        }
        
        .barcode-lines span {
            height: 40px;
            background: #000;
            display: inline-block;
        }
        
        .barcode-text {
            font-family: 'Courier New', monospace;
            font-size: 14px;
            font-weight: 600;
            color: #333;
            letter-spacing: 2px;
        }
        
        .movie-info-section {
            background: #fff;
            border-radius: 10px;
            padding: 20px;
            border: 1px solid #e9ecef;
        }
        
        .movie-thumbnail {
            width: 100%;
            height: 120px;
            object-fit: cover;
            border-radius: 8px;
        }
        
        .movie-title {
            color: #333;
            font-weight: 700;
            margin-bottom: 15px;
            font-size: 16px;
        }
        
        .ticket-details {
            margin-top: 10px;
        }
        
        .detail-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .detail-row:last-child {
            border-bottom: none;
        }
        
        .label {
            font-weight: 600;
            color: #666;
            font-size: 14px;
        }
        
        .value {
            font-weight: 700;
            color: #333;
            font-size: 14px;
        }
        
        .seat-highlight {
            background: #ffd700;
            color: #333;
            padding: 4px 8px;
            border-radius: 5px;
            font-weight: 700;
        }
        
        @media (max-width: 768px) {
            .simple-ticket-card {
                padding: 20px;
                margin: 10px 0;
            }
            
            .barcode-section {
                padding: 20px;
            }
            
            .barcode-lines {
                height: 50px;
            }
        }
        </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', styles);
}

// Load and display payment data
async function loadPaymentData() {
    movieData = await getMovieById(bookingData.movie_id);
    
    if (movieData) {
        document.getElementById('payment-movie-poster').src = movieData.poster_url || movieData.poster || movieData.thumbnail_url || '/static/img/showing_movie1.jpg';
        document.getElementById('payment-movie-title').textContent = movieData.title;
    }

    // Display booking information
    document.getElementById('payment-cinema').textContent = bookingData.cinema || 'Storia Cinema';
    document.getElementById('payment-hall').textContent = bookingData.hall || 'Hall 1';
    document.getElementById('payment-date').textContent = formatDate(bookingData.date);
    document.getElementById('payment-time').textContent = bookingData.time || '';
    document.getElementById('payment-seats').textContent = bookingData.selected_seats.join(', ');
    document.getElementById('payment-booking-id').textContent = bookingData.booking_id || 'Chưa có mã';
    
    // Calculate and display price breakdown
    calculatePriceBreakdown();
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Calculate price breakdown
function calculatePriceBreakdown() {
    const priceBreakdown = document.getElementById('price-breakdown');
    const basePrice = bookingData.base_price || 90000;
    let totalAmount = 0;
    let normalCount = 0;
    let vipCount = 0;
    let seatTypesText = '';

    // Count seat types
    bookingData.selected_seats.forEach(seatCode => {
        const seat = bookingData.seat_map ? bookingData.seat_map[seatCode] : null;
        if (seat && seat.seat_type && seat.seat_type.trim().toUpperCase() === 'VIP') {
            vipCount++;
        } else {
            normalCount++;
        }
    });

    // Build price breakdown HTML
    let breakdownHTML = '';
    
    if (normalCount > 0) {
        const normalTotal = normalCount * basePrice;
        breakdownHTML += `
            <div class="price-item">
                <span>Vé thường (${normalCount} ghế)</span>
                <span>${normalTotal.toLocaleString()}đ</span>
            </div>
        `;
        totalAmount += normalTotal;
        seatTypesText += `${normalCount} thường`;
    }

    if (vipCount > 0) {
        const vipTotal = vipCount * (basePrice + 30000);
        breakdownHTML += `
            <div class="price-item">
                <span>Vé VIP (${vipCount} ghế)</span>
                <span>${vipTotal.toLocaleString()}đ</span>
            </div>
        `;
        totalAmount += vipTotal;
        if (seatTypesText) seatTypesText += ', ';
        seatTypesText += `${vipCount} VIP`;
    }

    priceBreakdown.innerHTML = breakdownHTML;
    document.getElementById('payment-total-amount').textContent = `${totalAmount.toLocaleString()}đ`;
    document.getElementById('payment-total-final').textContent = `${totalAmount.toLocaleString()}đ`;
    document.getElementById('payment-seat-types').textContent = seatTypesText;
    
    // Store total amount for payment
    bookingData.total_amount = totalAmount;
}

// Go back to booking page - Release seat lock
async function goBackToBooking() {
    // Stop countdown timer
    stopBookingSession();
    
    // Show loading state
    const backButton = document.getElementById('back-to-booking');
    const originalText = backButton.innerHTML;
    backButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang hủy...';
    backButton.disabled = true;
    
    try {
        // 1. Release seat lock
        const sessionId = localStorage.getItem('seatLockSession');
        if (sessionId) {
            const token = localStorage.getItem('token');
            const releaseResponse = await fetch('/api/seat-locks/release', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ session_id: sessionId })
            });
            
            if (releaseResponse.ok) {
                console.log('✅ Seat lock released successfully');
            } else {
                console.log('⚠️ Seat lock release had issues but proceeding with redirect');
            }
            
            localStorage.removeItem('seatLockSession');
        }
        
        // 2. Clean up localStorage
        localStorage.removeItem('paymentBookingData');
        localStorage.removeItem('bookingSession');
        
        // 3. Redirect to booking page
        const movieId = getQueryParam('movie_id') || 'movie2';
        const showtimeId = getQueryParam('showtime_id') || 'st687daa';
        window.location.href = `/booking?movie_id=${movieId}&showtime_id=${showtimeId}`;
        
    } catch (error) {
        console.error('❌ Error releasing seat lock:', error);
        // Still redirect even if there's an error
        const movieId = getQueryParam('movie_id') || 'movie2';
        const showtimeId = getQueryParam('showtime_id') || 'st687daa';
        window.location.href = `/booking?movie_id=${movieId}&showtime_id=${showtimeId}`;
    } finally {
        // Restore button state
        backButton.innerHTML = originalText;
        backButton.disabled = false;
    }
}

// Process payment
function processPayment() {
    console.log('💳 Processing payment...');
    
    const selectedPaymentMethod = document.querySelector('input[name="payment_method"]:checked');
    if (!selectedPaymentMethod) {
        alert('Vui lòng chọn phương thức thanh toán');
        return;
    }

    // Check if we have a valid token
    let token = localStorage.getItem('token');
    if (!token) {
        console.error('❌ No authentication token found');
        alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        window.location.href = '/?login=required';
        return;
    }
    
    console.log('✅ Using authentication token for payment');

    // Prepare payment data
    const paymentData = {
        showtime_id: bookingData.showtime_id,
        seat_codes: bookingData.selected_seats,
        payment_method: selectedPaymentMethod.value
    };
    
    console.log('📤 Sending payment data:', paymentData);

    // Call payment API
    fetch('/api/payment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(paymentData)
    })
    .then(response => {
        console.log('📥 Payment response:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('📋 Payment data:', data);
        
        if (data.message === 'Payment successful') {
            // Stop countdown timer on successful payment
            stopBookingSession();
            
            // Clear booking data from localStorage
            localStorage.removeItem('paymentBookingData');
            localStorage.removeItem('seatLockSession');
            
            // Store payment info for reference
            localStorage.setItem('lastPayment', JSON.stringify({
                booking_id: data.booking_id,
                payment_id: data.payment_id,
                amount: bookingData.total_amount,
                method: selectedPaymentMethod.value,
                movie_title: movieData ? movieData.title : 'Movie',
                seats: bookingData.selected_seats.join(', ')
            }));
            
            // Show success message and redirect to my-tickets page
            alert('Thanh toán thành công! Bạn sẽ được chuyển đến trang vé của mình.');
            window.location.href = '/my-tickets';
        } else {
            alert('Thanh toán thất bại: ' + (data.error || 'Lỗi không xác định'));
        }
    })
    .catch(error => {
        console.error('❌ Payment error:', error);
        alert('Có lỗi xảy ra khi thanh toán. Vui lòng thử lại.');
    });
}

// Render all tickets (each ticket 1 barcode, 1 ghế)
function showAllTickets(tickets, bookingInfo) {
    // Hide payment methods section
    const paymentMethodsCard = document.querySelector('.col-lg-6:last-child .card');
    if (paymentMethodsCard) {
        paymentMethodsCard.style.display = 'none';
    }
    // Remove old ticket container if exists
    const old = document.getElementById('tickets-container');
    if (old) old.remove();
    // Create ticket container
    const ticketContainer = document.createElement('div');
    ticketContainer.id = 'tickets-container';
    ticketContainer.className = 'col-lg-6';
    // Render all tickets
    generateTicketDisplay(tickets, bookingInfo);
    // Insert ticket where payment methods were
    const paymentSection = document.querySelector('.col-lg-6:last-child');
    if (paymentSection) {
        paymentSection.parentNode.insertBefore(ticketContainer, paymentSection);
    }
    // Add simple ticket styles
    addSimpleTicketStyles();
}

// Show ticket modal
function showTicketModal() {
    if (window.ticketsData && window.bookingInfo) {
        generateTicketDisplay(window.ticketsData, window.bookingInfo);
        
        // Hide success modal and show ticket modal
        const successModal = bootstrap.Modal.getInstance(document.getElementById('successModal'));
        successModal.hide();
        
        const ticketModal = new bootstrap.Modal(document.getElementById('ticketModal'));
        ticketModal.show();
    } else {
        alert('Không tìm thấy thông tin vé');
    }
}

// Generate ticket display - Beautiful layout like cinema tickets
function generateTicketDisplay(tickets, bookingInfo) {
    const container = document.getElementById('tickets-container');
    container.innerHTML = '';
    
    tickets.forEach((ticket, index) => {
        // Extract seat info
        const seatCode = ticket.seat_code;
        const row = seatCode.charAt(0); // First character (A, B, C...)
        const seatNumber = seatCode.substring(1); // Rest of the string (1, 2, 3...)
        
        // Format date nicely
        const date = new Date(bookingInfo.date);
        const formattedDate = date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
        
        const ticketHtml = `
            <div class="cinema-ticket mb-4">
                <!-- Ticket Stub (Left Side) -->
                <div class="ticket-stub">
                    <div class="stub-content">
                        <div class="seat-info">
                            <div class="row-label">ROW ${row}</div>
                            <div class="seat-label">Seat ${seatNumber}</div>
                        </div>
                        
                        <div class="show-info">
                            <div class="show-date">${formattedDate}</div>
                            <div class="show-time">${bookingInfo.time}</div>
                        </div>
                        
                        <div class="barcode-section">
                            <div class="barcode-display">
                                <div class="barcode-lines">
                                    ${'|'.repeat(50)}
                                </div>
                                <div class="barcode-text">${ticket.barcode_data}</div>
                            </div>
                        </div>
                        
                        <div class="cinema-name">${bookingInfo.cinema}</div>
                    </div>
                </div>
                
                <!-- Ticket Body (Right Side) -->
                <div class="ticket-body">
                    <div class="movie-poster-section">
                        <img src="${bookingInfo.movie_poster}" alt="${bookingInfo.movie_title}" class="movie-poster">
                        <div class="movie-overlay">
                            <h3 class="movie-title">${bookingInfo.movie_title}</h3>
                        </div>
                    </div>
                    
                    <div class="ticket-info-grid">
                        <div class="info-item">
                            <div class="info-label">ROW</div>
                            <div class="info-value">${row}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">SEAT</div>
                            <div class="info-value">${seatNumber}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">DATE</div>
                            <div class="info-value">${formattedDate}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">TIME</div>
                            <div class="info-value">${bookingInfo.time}</div>
                        </div>
                    </div>
                    
                    <div class="cinema-logo">
                        <span class="cinema-brand">${bookingInfo.cinema}</span>
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', ticketHtml);
    });
    
    // Add cinema ticket styles if not already added
    if (!document.querySelector('#cinema-ticket-styles')) {
        addCinemaTicketStyles();
    }
}

// Add CSS styles for cinema ticket layout
function addCinemaTicketStyles() {
    const styles = `
        <style id="cinema-ticket-styles">
        .cinema-ticket {
            display: flex;
            max-width: 900px;
            height: 300px;
            margin: 20px auto;
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
            border-radius: 15px;
            overflow: hidden;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .ticket-stub {
            width: 250px;
            background: white;
            padding: 20px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            border-right: 2px dashed #ddd;
            position: relative;
        }
        
        .ticket-stub::before {
            content: '';
            position: absolute;
            right: -10px;
            top: 50%;
            transform: translateY(-50%);
            width: 20px;
            height: 20px;
            background: #f8f9fa;
            border-radius: 50%;
            box-shadow: inset 0 0 10px rgba(0,0,0,0.1);
        }
        
        .stub-content {
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        
        .seat-info {
            text-align: center;
            margin-bottom: 15px;
        }
        
        .row-label {
            font-size: 14px;
            font-weight: 600;
            color: #666;
            margin-bottom: 5px;
        }
        
        .seat-label {
            font-size: 14px;
            font-weight: 600;
            color: #666;
        }
        
        .show-info {
            text-align: center;
            margin: 15px 0;
        }
        
        .show-date {
            font-size: 14px;
            font-weight: 600;
            color: #333;
            margin-bottom: 8px;
        }
        
        .show-time {
            font-size: 14px;
            color: #666;
        }
        
        .barcode-section {
            text-align: center;
            margin: 15px 0;
        }
        
        .barcode-lines {
            font-family: 'Courier New', monospace;
            font-size: 8px;
            line-height: 1;
            color: #333;
            margin-bottom: 5px;
            letter-spacing: 0.5px;
        }
        
        .barcode-text {
            font-size: 11px;
            font-weight: 600;
            color: #333;
            font-family: 'Courier New', monospace;
        }
        
        .cinema-name {
            text-align: center;
            font-size: 12px;
            font-weight: 600;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .ticket-body {
            flex: 1;
            position: relative;
            display: flex;
            flex-direction: column;
            color: white;
        }
        
        .movie-poster-section {
            flex: 1;
            position: relative;
            overflow: hidden;
        }
        
        .movie-poster {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .movie-overlay {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: linear-gradient(transparent, rgba(0,0,0,0.8));
            padding: 20px;
        }
        
        .movie-title {
            color: white;
            font-size: 24px;
            font-weight: 700;
            margin: 0;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        }
        
        .ticket-info-grid {
            display: flex;
            background: rgba(0,0,0,0.2);
            padding: 15px 20px;
        }
        
        .info-item {
            flex: 1;
            text-align: center;
        }
        
        .info-label {
            font-size: 10px;
            font-weight: 600;
            color: rgba(255,255,255,0.8);
            margin-bottom: 5px;
            letter-spacing: 1px;
        }
        
        .info-value {
            font-size: 16px;
            font-weight: 700;
            color: white;
        }
        
        .cinema-logo {
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(255,255,255,0.1);
            padding: 8px 15px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
        }
        
        .cinema-brand {
            font-size: 12px;
            font-weight: 600;
            color: white;
            letter-spacing: 1px;
        }
        
        @media (max-width: 768px) {
            .cinema-ticket {
                flex-direction: column;
                height: auto;
                max-width: 350px;
            }
            
            .ticket-stub {
                width: 100%;
                flex-direction: row;
                padding: 15px;
                border-right: none;
                border-bottom: 2px dashed #ddd;
            }
            
            .ticket-stub::before {
                display: none;
            }
            
            .ticket-body {
                min-height: 200px;
            }
            
            .movie-title {
                font-size: 18px;
            }
        }
        </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', styles);
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Print tickets
function printTickets() {
    window.print();
}

// Navigation functions for success modal
function goToHistory() {
    window.location.href = '/';
    // Trigger booking history modal
    setTimeout(() => {
        const historyModal = new bootstrap.Modal(document.getElementById('historyModal'));
        historyModal.show();
    }, 500);
}

function goToHome() {
    window.location.href = '/';
}

// Handle payment method selection visual feedback
document.addEventListener('DOMContentLoaded', function() {
    const paymentOptions = document.querySelectorAll('.payment-method-option');
    
    paymentOptions.forEach(option => {
        option.addEventListener('click', function() {
            const radio = this.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
                
                // Remove active class from all options
                paymentOptions.forEach(opt => opt.classList.remove('active'));
                
                // Add active class to selected option
                this.classList.add('active');
            }
        });
    });
}); 

// Initialize countdown timer for payment page
function initializePaymentCountdown() {
    // Check if booking has started_at timestamp
    if (!bookingData.booking_started_at) {
        console.warn('No booking_started_at timestamp found');
        return;
    }
    
    // Calculate remaining time based on booking_started_at
    const bookingStartTime = new Date(bookingData.booking_started_at);
    const now = new Date();
    const elapsed = now - bookingStartTime;
    const duration = 7 * 60 * 1000; // 7 minutes
    const remaining = Math.max(0, duration - elapsed);
    
    // If already expired, redirect immediately
    if (remaining <= 0) {
        handlePaymentTimeout();
        return;
    }
    
    const countdownOptions = {
        duration: remaining, // Use remaining time instead of full 7 minutes
        onTimeout: handlePaymentTimeout,
        onWarning: function(timeLeft) {
            // Show warning modal
            const warningModal = document.getElementById('timeoutWarningModal');
            if (warningModal) {
                const modal = new bootstrap.Modal(warningModal);
                modal.show();
            } else {
                alert('⚠️ Cảnh báo: Phiên thanh toán sẽ hết hạn trong 2 phút! Vui lòng hoàn tất thanh toán.');
            }
        }
    };
    
    // Initialize countdown timer with remaining time
    initializeCountdownTimer(countdownOptions);
    
    // Start countdown immediately with remaining time
    startNewBookingSession(remaining);
}

// Handle payment timeout - Release seat lock and redirect to movie detail
async function handlePaymentTimeout() {
    try {
        // 1. Release seat lock
        const sessionId = localStorage.getItem('seatLockSession');
        if (sessionId) {
            const token = localStorage.getItem('token');
            const releaseResponse = await fetch('/api/seat-locks/release', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ session_id: sessionId })
            });
            
            if (releaseResponse.ok) {
                console.log('✅ Seat lock released due to timeout');
            } else {
                console.log('⚠️ Seat lock release had issues during timeout');
            }
            
            localStorage.removeItem('seatLockSession');
        }
        
        // 2. Clean up localStorage
        localStorage.removeItem('paymentBookingData');
        localStorage.removeItem('bookingSession');
        
        // 3. Show timeout message
        alert('⏰ Hết thời gian đặt vé! Ghế đã được giải phóng.');
        
        // 4. Redirect to movie detail page
        const movieId = getQueryParam('movie_id') || 'movie2';
        setTimeout(() => {
            window.location.href = `/movie/${movieId}`;
        }, 2000);
        
    } catch (error) {
        console.error('❌ Error during timeout handling:', error);
        // Still redirect even if there's an error
        const movieId = getQueryParam('movie_id') || 'movie2';
        localStorage.removeItem('paymentBookingData');
        localStorage.removeItem('bookingSession');
        localStorage.removeItem('seatLockSession');
        
        alert('⏰ Hết thời gian đặt vé!');
        setTimeout(() => {
            window.location.href = `/movie/${movieId}`;
        }, 2000);
    }
}