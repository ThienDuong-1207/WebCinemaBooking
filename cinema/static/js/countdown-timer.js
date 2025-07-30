/**
 * Countdown Timer for Booking Session
 * Auto-expires booking session after 7 minutes
 */

class BookingCountdownTimer {
    constructor(options = {}) {
        this.duration = options.duration || 7 * 60 * 1000; // 7 minutes in milliseconds
        this.onTimeout = options.onTimeout || this.defaultTimeoutHandler;
        this.onTick = options.onTick || this.defaultTickHandler;
        this.onWarning = options.onWarning || this.defaultWarningHandler;
        this.warningThreshold = options.warningThreshold || 2 * 60 * 1000; // 2 minutes warning
        
        this.startTime = null;
        this.endTime = null;
        this.intervalId = null;
        this.hasWarned = false;
        
        this.initializeFromStorage();
    }

    // Initialize timer from localStorage if existing session
    initializeFromStorage() {
        const storedSession = localStorage.getItem('bookingSession');
        if (storedSession) {
            const session = JSON.parse(storedSession);
            this.startTime = new Date(session.startTime);
            this.endTime = new Date(session.endTime);
            
            // Check if session already expired
            if (new Date() >= this.endTime) {
                this.handleTimeout();
                return;
            }
            
            // Continue with existing session
            this.start();
        }
    }

    // Start new countdown timer
    startNew(customDuration) {
        this.startTime = new Date();
        const duration = customDuration || this.duration;
        this.endTime = new Date(this.startTime.getTime() + duration);
        
        // Save session to localStorage
        this.saveSessionToStorage();
        
        this.start();
    }

    // Continue existing countdown
    start() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }

        this.intervalId = setInterval(() => {
            this.tick();
        }, 1000);

        // Initial tick
        this.tick();
    }

    // Stop the timer
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.clearSessionStorage();
    }

    // Timer tick handler
    tick() {
        const now = new Date();
        const timeLeft = this.endTime - now;

        if (timeLeft <= 0) {
            this.handleTimeout();
            return;
        }

        // Warning when 2 minutes left
        if (!this.hasWarned && timeLeft <= this.warningThreshold) {
            this.hasWarned = true;
            this.onWarning(timeLeft);
        }

        this.onTick(timeLeft);
    }

    // Handle timeout
    handleTimeout() {
        this.stop();
        this.onTimeout();
    }

    // Save session to localStorage
    saveSessionToStorage() {
        const sessionData = {
            startTime: this.startTime.toISOString(),
            endTime: this.endTime.toISOString()
        };
        localStorage.setItem('bookingSession', JSON.stringify(sessionData));
    }

    // Clear session from localStorage
    clearSessionStorage() {
        localStorage.removeItem('bookingSession');
    }

    // Get remaining time
    getRemainingTime() {
        if (!this.endTime) return 0;
        return Math.max(0, this.endTime - new Date());
    }

    // Format time for display
    formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Default handlers
    defaultTickHandler(timeLeft) {
        const timerElement = document.getElementById('countdown-timer');
        if (timerElement) {
            const timeString = this.formatTime(timeLeft);
            timerElement.textContent = timeString;
            
            // Add warning class when less than 2 minutes
            if (timeLeft <= this.warningThreshold) {
                timerElement.classList.add('text-danger', 'fw-bold');
                // Add pulsing animation to countdown display
                const countdownDisplay = document.getElementById('countdown-display');
                if (countdownDisplay) {
                    countdownDisplay.classList.add('text-danger');
                }
            }
        }
    }

    defaultWarningHandler(timeLeft) {
        // Show warning modal
        const warningModal = document.getElementById('timeoutWarningModal');
        if (warningModal) {
            const modal = new bootstrap.Modal(warningModal);
            modal.show();
        } else {
            // Fallback alert
            alert('⚠️ Cảnh báo: Phiên đặt vé sẽ hết hạn trong 2 phút! Vui lòng hoàn tất thanh toán.');
        }
    }

    defaultTimeoutHandler() {
        // Use payment.js timeout handler if on payment page
        if (window.handlePaymentTimeout && typeof window.handlePaymentTimeout === 'function') {
            window.handlePaymentTimeout();
            return;
        }
        
        // Default countdown timer timeout (fallback)
        const bookingData = localStorage.getItem('paymentBookingData');
        if (bookingData) {
            const parsedData = JSON.parse(bookingData);
            if (parsedData.booking_id) {
                // Call cancel booking API
                fetch(`/api/booking/${parsedData.booking_id}/cancel`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        console.log('✅ Booking cancelled due to countdown timeout:', data.released_seats);
                        const seatList = data.released_seats.join(', ');
                        alert(`⏰ Hết thời gian thanh toán!\n\nGhế ${seatList} đã được giải phóng.`);
                    } else {
                        console.log('⚠️ Countdown timeout cancel had issues:', data);
                        alert('⏰ Hết thời gian thanh toán!');
                    }
                })
                .catch(error => {
                    console.error('❌ Countdown timeout cancel API error:', error);
                    alert('⏰ Hết thời gian thanh toán!');
                })
                .finally(() => {
                    // Clean up and redirect to movie detail page
                    localStorage.removeItem('paymentBookingData');
                    localStorage.removeItem('bookingSession');
                    
                    setTimeout(() => {
                        if (parsedData.movie_id) {
                            window.location.href = `/movie/${parsedData.movie_id}`;
                        } else {
                            window.location.href = '/';
                        }
                    }, 2000);
                });
            } else {
                // No booking ID, just clean up and redirect
                localStorage.removeItem('paymentBookingData');
                localStorage.removeItem('bookingSession');
                alert('⏰ Hết thời gian thanh toán!');
                
                setTimeout(() => {
                    if (parsedData.movie_id) {
                        window.location.href = `/movie/${parsedData.movie_id}`;
                    } else {
                        window.location.href = '/';
                    }
                }, 2000);
            }
        } else {
            // No booking data, just clean up and redirect
            localStorage.removeItem('paymentBookingData');
            localStorage.removeItem('bookingSession');
            alert('⏰ Hết thời gian thanh toán!');
            
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        }
    }
}

// UI Helper functions
function createCountdownUI() {
    // For payment page - show inline countdown
    const countdownDisplay = document.getElementById('countdown-display');
    if (countdownDisplay) {
        countdownDisplay.classList.remove('d-none');
        return null; // Use existing inline countdown
    }
    
    // Fallback for other pages
    const countdownHTML = `
        <div class="countdown-container bg-warning text-dark p-3 rounded mb-3">
            <div class="d-flex align-items-center justify-content-between">
                <div>
                    <i class="fas fa-clock me-2"></i>
                    <strong>Thời gian còn lại:</strong>
                </div>
                <div id="countdown-timer" class="fs-5 fw-bold">07:00</div>
            </div>
            <div class="mt-2">
                <small class="text-muted">
                    <i class="fas fa-info-circle me-1"></i>
                    Phiên đặt vé sẽ tự động hết hạn sau 7 phút
                </small>
            </div>
        </div>
    `;
    
    return countdownHTML;
}

function createWarningModal() {
    const modalHTML = `
        <div class="modal fade" id="timeoutWarningModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-warning text-dark">
                        <h5 class="modal-title">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            Cảnh báo hết hạn
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body text-center">
                        <div class="mb-3">
                            <i class="fas fa-clock fa-3x text-warning"></i>
                        </div>
                        <h6>Phiên đặt vé sắp hết hạn!</h6>
                        <p class="text-muted">
                            Bạn còn ít hơn 2 phút để hoàn tất thanh toán. 
                            Sau thời gian này, ghế đã chọn sẽ được giải phóng.
                        </p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            Đã hiểu
                        </button>
                        <button type="button" class="btn btn-warning" onclick="proceedToPayment()">
                            <i class="fas fa-credit-card me-2"></i>
                            Thanh toán ngay
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    return modalHTML;
}

// Global timer instance
let globalBookingTimer = null;

// Initialize countdown timer
function initializeCountdownTimer(options = {}) {
    // Add countdown UI to page if needed
    const countdownUI = createCountdownUI();
    if (countdownUI) {
        const container = document.querySelector('.container') || document.body;
        const countdownElement = document.createElement('div');
        countdownElement.innerHTML = countdownUI;
        container.insertBefore(countdownElement.firstElementChild, container.firstElementChild);
    }
    
    // Add warning modal
    const modalElement = document.createElement('div');
    modalElement.innerHTML = createWarningModal();
    document.body.appendChild(modalElement.firstElementChild);
    
    // Create timer instance
    globalBookingTimer = new BookingCountdownTimer(options);
    
    return globalBookingTimer;
}

// Start new booking session
function startNewBookingSession(customDuration) {
    if (globalBookingTimer) {
        globalBookingTimer.startNew(customDuration);
    }
}

// Stop current booking session
function stopBookingSession() {
    if (globalBookingTimer) {
        globalBookingTimer.stop();
    }
}

// Helper function for payment redirect
function proceedToPayment() {
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('timeoutWarningModal'));
    if (modal) {
        modal.hide();
    }
    
    // If on payment page, focus on payment button
    if (window.location.pathname.includes('/payment')) {
        const paymentBtn = document.getElementById('confirm-payment');
        if (paymentBtn && !paymentBtn.disabled) {
            paymentBtn.focus();
            paymentBtn.classList.add('btn-pulse');
        }
    } else {
        // Redirect to payment page
        window.location.href = '/payment';
    }
} 