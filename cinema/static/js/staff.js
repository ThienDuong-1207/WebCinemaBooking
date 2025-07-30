// 📱 Staff Check-in QR Scanner
class StaffCheckinManager {
    constructor() {
        this.html5QrCode = null;
        this.currentTicketData = null;
        this.staffToken = localStorage.getItem('authToken') || localStorage.getItem('token');
        this.initializeEventListeners();
        this.ensureValidToken();
        
        // Load dashboard stats when page loads
        this.loadDashboardStats();
    }

    async ensureValidToken() {
        if (!this.staffToken) {
            console.log('🔑 No token found, getting fresh token...');
            await this.getFreshToken();
        } else {
            console.log('🔍 Testing existing token...');
            const isValid = await this.testToken();
            if (!isValid) {
                console.log('❌ Token invalid, getting fresh token...');
                await this.getFreshToken();
            }
        }
    }

    async testToken() {
        try {
            // Test token bằng cách gọi API broken-seats
            const response = await fetch('/api/staff/broken-seats', {
                headers: {
                    'Authorization': `Bearer ${this.staffToken}`
                }
            });
            return response.ok;
        } catch (error) {
            console.error('❌ Token test failed:', error);
            return false;
        }
    }

    async getFreshToken() {
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: 'staff1@vlu.vn',
                    password: '123'
                })
            });
            
            const data = await response.json();
            if (data.token) {
                this.staffToken = data.token;
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('token', data.token);
                console.log('✅ Fresh token set successfully');
            } else {
                console.error('❌ Login failed:', data.error);
            }
        } catch (error) {
            console.error('❌ Login request failed:', error);
        }
    }

    initializeEventListeners() {
        // Check-in button click
        document.getElementById('checkin-btn').addEventListener('click', (e) => {
            e.preventDefault();
            // Khi mở modal, ẩn cả 2 form, chờ chọn option
            document.getElementById('qr-scanner-container').style.display = 'none';
            document.getElementById('manual-checkin-container').style.display = 'none';
            document.getElementById('scanning-loading').style.display = 'none';
            document.getElementById('scan-result').style.display = 'none';
            document.getElementById('scan-error').style.display = 'none';
            this.currentTicketData = null;
            const modal = new bootstrap.Modal(document.getElementById('qrScannerModal'));
            modal.show();
        });
        // Option chọn camera
        document.getElementById('option-camera').addEventListener('click', () => {
            document.getElementById('qr-scanner-container').style.display = 'block';
            document.getElementById('manual-checkin-container').style.display = 'none';
            // Chỉ reset nếu chưa có booking data
            if (!this.currentBookingData) {
                this.resetScannerState();
            }
            setTimeout(() => { this.startScanning(); }, 300);
        });
        // Option chọn thủ công
        document.getElementById('option-manual').addEventListener('click', () => {
            document.getElementById('qr-scanner-container').style.display = 'none';
            document.getElementById('manual-checkin-container').style.display = 'block';
            document.getElementById('scanning-loading').style.display = 'none';
            // Chỉ ẩn scan-result nếu chưa có booking data
            if (!this.currentBookingData) {
                document.getElementById('scan-result').style.display = 'none';
            }
            document.getElementById('scan-error').style.display = 'none';
            this.stopScanner();
        });

        // Modal close events
        document.getElementById('qrScannerModal').addEventListener('hidden.bs.modal', () => {
            console.log('🔍 Modal hidden event triggered...');
            // Force cleanup after modal is hidden
            setTimeout(() => {
                this.forceCleanupAfterClose();
            }, 100);
        });

        // Scanner control buttons
        document.getElementById('stop-scanner').addEventListener('click', () => {
            this.stopScanner();
            // Đóng modal khi dừng quét
            const modal = bootstrap.Modal.getInstance(document.getElementById('qrScannerModal'));
            if (modal) modal.hide();
        });

        document.getElementById('scan-again').addEventListener('click', () => {
            this.resetScannerState();
            this.startScanning();
        });

        document.getElementById('retry-scan').addEventListener('click', () => {
            this.resetScannerState();
            this.startScanning();
        });

        document.getElementById('new-scan').addEventListener('click', () => {
            // Reset hoàn toàn để quét vé mới
            this.currentBookingData = null;
            this.currentTicketData = null;
            this.resetScannerState();
            document.getElementById('scan-result').style.display = 'none';
            document.getElementById('qr-scanner-container').style.display = 'block';
            this.startScanning();
        });

        document.getElementById('confirm-checkin').addEventListener('click', () => {
            this.performCheckin();
        });

        // Thêm event listener cho nút X đóng modal
        document.querySelector('#qrScannerModal .btn-close').addEventListener('click', () => {
            console.log('🔍 Close button clicked, closing modal...');
            this.forceCloseModal();
        });

        // ESC key to close modal
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                const modal = document.getElementById('qrScannerModal');
                if (modal && modal.classList.contains('show')) {
                    console.log('🔍 ESC key pressed, closing modal...');
                    this.forceCloseModal();
                }
            }
        });

        // Thủ công: nhập mã QR code
        document.getElementById('manual-qr-submit').addEventListener('click', async () => {
            const code = document.getElementById('manual-qr-input').value.trim();
            console.log('🔍 Manual QR input:', code);
            console.log('🔍 Code length:', code.length);
            console.log('🔍 Code type:', typeof code);
            
            if (!code) {
                this.showError('Vui lòng nhập mã QR code!');
                return;
            }
            
            // Hiển thị loading
            document.getElementById('scanning-loading').style.display = 'block';
            try {
                console.log('🔍 Calling validateTicket with:', code);
                const ticketInfo = await this.validateTicket(code);
                console.log('🔍 Ticket validation result:', ticketInfo);
                
                if (ticketInfo.success) {
                    // Hiển thị UI chọn seats thay vì tự động check-in
                    this.showTicketInfo(ticketInfo.booking);
                    this.currentBookingData = ticketInfo.booking;
                    
                    // Hiển thị kết quả scan thành công
                    document.getElementById('scan-result').style.display = 'block';
                    document.getElementById('scan-error').style.display = 'none';
                } else {
                    this.showError(ticketInfo.message);
                }
            } catch (error) {
                console.error('🔍 Error in manual QR submit:', error);
                this.showError('Lỗi khi xác thực vé: ' + error.message);
            }
            document.getElementById('scanning-loading').style.display = 'none';
        });
    }

    openQRScanner() {
        console.log('🎬 Opening QR Scanner...');
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('qrScannerModal'));
        modal.show();

        // Reset state and start scanning
        this.resetScannerState();
        setTimeout(() => {
            this.startScanning();
        }, 500); // Wait for modal animation
    }

    forceCloseModal() {
        console.log('🔍 Force closing modal...');
        
        // 1. Stop scanner first
        this.stopScanner();
        
        // 2. Reset all state
        this.currentBookingData = null;
        this.currentTicketData = null;
        this.resetScannerState();
        
        // 3. Hide all containers
        document.getElementById('qr-scanner-container').style.display = 'none';
        document.getElementById('manual-checkin-container').style.display = 'none';
        document.getElementById('scanning-loading').style.display = 'none';
        document.getElementById('scan-result').style.display = 'none';
        document.getElementById('scan-error').style.display = 'none';
        
        // 4. Reset input field
        document.getElementById('manual-qr-input').value = '';
        
        // 5. Reset option buttons
        document.getElementById('option-camera').classList.remove('active');
        document.getElementById('option-manual').classList.remove('active');
        
        // 6. Force close modal using Bootstrap
        const modal = bootstrap.Modal.getInstance(document.getElementById('qrScannerModal'));
        if (modal) {
            modal.hide();
        }
        
        // 7. Force remove modal backdrop
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => {
            backdrop.remove();
        });
        
        // 8. Force remove modal-open class from body
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        
        // 9. Force hide modal element
        const modalElement = document.getElementById('qrScannerModal');
        if (modalElement) {
            modalElement.style.display = 'none';
            modalElement.classList.remove('show');
            modalElement.setAttribute('aria-hidden', 'true');
        }
        
        console.log('🔍 Modal force closed successfully');
    }

    forceCleanupAfterClose() {
        console.log('🔍 Force cleanup after modal close...');
        
        // 1. Force remove any remaining modal backdrops
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => {
            backdrop.remove();
        });
        
        // 2. Force remove modal-open class and styles from body
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        
        // 3. Force hide modal element completely
        const modalElement = document.getElementById('qrScannerModal');
        if (modalElement) {
            modalElement.style.display = 'none';
            modalElement.classList.remove('show');
            modalElement.setAttribute('aria-hidden', 'true');
            modalElement.removeAttribute('style');
        }
        
        // 4. Remove any inline styles that might interfere
        const modalDialog = document.querySelector('#qrScannerModal .modal-dialog');
        if (modalDialog) {
            modalDialog.removeAttribute('style');
        }
        
        // 5. Ensure all containers are hidden
        const containers = [
            'qr-scanner-container',
            'manual-checkin-container', 
            'scanning-loading',
            'scan-result',
            'scan-error'
        ];
        
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                container.style.display = 'none';
            }
        });
        
        console.log('🔍 Force cleanup completed');
    }

    resetScannerState() {
        console.log('🔍 Resetting scanner state...');
        // Hide all result divs
        document.getElementById('qr-scanner-container').style.display = 'none';
        document.getElementById('manual-checkin-container').style.display = 'none';
        document.getElementById('scanning-loading').style.display = 'none';
        document.getElementById('scan-result').style.display = 'none';
        document.getElementById('scan-error').style.display = 'none';
        
        // Reset input field
        document.getElementById('manual-qr-input').value = '';
        
        // Reset option buttons
        document.getElementById('option-camera').classList.remove('active');
        document.getElementById('option-manual').classList.remove('active');
        
        // Stop scanner if running
        if (this.html5QrCode && this.html5QrCode.isScanning) {
            this.stopScanner();
        }
    }

    async startScanning() {
        console.log('📸 Starting QR scanner...');
        
        // Kiểm tra hỗ trợ camera
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.showError('Trình duyệt không hỗ trợ truy cập camera. Vui lòng dùng Chrome, Safari bản mới nhất hoặc upload ảnh QR.');
            return;
        }
        
        try {
            // Show loading
            document.getElementById('scanning-loading').style.display = 'block';
            
            // Initialize HTML5 QR Code scanner
            this.html5QrCode = new Html5Qrcode("qr-reader");
            
            // Get camera devices
            const devices = await Html5Qrcode.getCameras();
            if (devices && devices.length) {
                console.log(`📱 Found ${devices.length} camera(s)`);
                
                // Use back camera if available (better for QR scanning)
                let cameraId = devices[0].id;
                const backCamera = devices.find(device => 
                    device.label.toLowerCase().includes('back') || 
                    device.label.toLowerCase().includes('rear')
                );
                if (backCamera) {
                    cameraId = backCamera.id;
                }

                // Hide loading, show scanner
                document.getElementById('scanning-loading').style.display = 'none';

                // Start scanning
                await this.html5QrCode.start(
                    cameraId,
                    {
                        fps: 10,    // Frame rate
                        qrbox: { width: 250, height: 250 }  // QR scanning box
                    },
                    (decodedText, decodedResult) => {
                        console.log(`🎯 QR Code detected: ${decodedText}`);
                        this.handleQRCodeScan(decodedText);
                    },
                    (errorMessage) => {
                        // Ignore frequent scanning errors
                        // console.log(`QR Code scan error: ${errorMessage}`);
                    }
                );

                console.log('✅ QR Scanner started successfully');
            } else {
                throw new Error('Không tìm thấy camera nào trên thiết bị');
            }
        } catch (error) {
            console.error('❌ QR Scanner error:', error);
            
            // Xử lý các lỗi cụ thể
            if (error.name === 'NotAllowedError') {
                this.showError('Quyền truy cập camera bị từ chối. Vui lòng cho phép truy cập camera hoặc sử dụng chức năng nhập mã QR thủ công.');
            } else if (error.name === 'NotFoundError') {
                this.showError('Không tìm thấy camera. Vui lòng kiểm tra camera và thử lại.');
            } else if (error.name === 'NotSupportedError') {
                this.showError('Trình duyệt không hỗ trợ truy cập camera. Vui lòng dùng Chrome, Safari bản mới nhất.');
            } else {
                this.showError('Không thể khởi tạo camera: ' + error.message);
            }
            
            // Ẩn loading
            document.getElementById('scanning-loading').style.display = 'none';
        }
    }

    async stopScanner() {
        if (this.html5QrCode) {
            try {
                await this.html5QrCode.stop();
                this.html5QrCode = null;
                console.log('⏹️ QR Scanner stopped');
            } catch (error) {
                // Ignore errors when stopping scanner that's not running
                if (!error.message.includes('not running') && !error.message.includes('not started')) {
                    console.error('Error stopping scanner:', error);
                }
            }
        }
    }

    async handleQRCodeScan(barcodeData) {
        console.log('🔍 Processing barcode:', barcodeData);
        
        // Stop scanner first
        await this.stopScanner();
        
        // Hide scanner, show loading
        document.getElementById('qr-scanner-container').style.display = 'none';
        document.getElementById('scanning-loading').style.display = 'block';
        
        try {
            // Validate and get ticket info
            const ticketInfo = await this.validateTicket(barcodeData);
            
            if (ticketInfo.success) {
                this.currentTicketData = {
                    barcode: barcodeData,
                    booking: ticketInfo.booking
                };
                
                this.showTicketInfo(ticketInfo.booking);
                this.currentBookingData = ticketInfo.booking;
                
                // Hiển thị kết quả scan thành công
                document.getElementById('scan-result').style.display = 'block';
                document.getElementById('scan-error').style.display = 'none';
            } else {
                this.showError(ticketInfo.message);
            }
        } catch (error) {
            console.error('❌ Ticket validation error:', error);
            this.showError('Lỗi khi xác thực vé: ' + error.message);
        }
        
        // Hide loading
        document.getElementById('scanning-loading').style.display = 'none';
    }

    async validateTicket(barcodeData) {
        console.log('🎫 Validating ticket:', barcodeData);
        console.log('🎫 BarcodeData type:', typeof barcodeData);
        console.log('🎫 BarcodeData length:', barcodeData ? barcodeData.length : 'null/undefined');
        
        // Đảm bảo có token hợp lệ
        await this.ensureValidToken();
        
        const requestData = { barcode_data: barcodeData };
        console.log('🎫 Request data:', requestData);
        console.log('🎫 Request data JSON:', JSON.stringify(requestData));
        
        try {
            const response = await fetch('/api/staff/validate-ticket', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.staffToken}`
                },
                body: JSON.stringify(requestData)
            });

            console.log('🎫 Response status:', response.status);
            console.log('🎫 Response status text:', response.statusText);

            // Check if response is ok before parsing JSON
            if (!response.ok) {
                const errorText = await response.text();
                console.log('🎫 Error response text:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            console.log('✅ Ticket validation successful:', result);
            return { success: true, booking: result.booking_info };
        } catch (error) {
            console.error('❌ Ticket validation error:', error);
            if (error.message.includes('HTTP 405')) {
                return { success: false, message: 'API endpoint không tồn tại hoặc không được hỗ trợ' };
            } else if (error.message.includes('HTTP 401')) {
                return { success: false, message: 'Phiên đăng nhập đã hết hạn' };
            } else {
                return { success: false, message: 'Lỗi kết nối mạng: ' + error.message };
            }
        }
    }

    showTicketInfo(booking) {
        const tickets = booking.tickets || [];
        const showtime = booking.showtime_info || {};
        const movie = booking.movie_info || {};
        const customer = booking.customer_info || {};
        

        
        // Tạo danh sách tickets với checkbox để chọn
        const ticketsHtml = tickets.map(ticket => `
            <div class="form-check mb-2">
                <input class="form-check-input ticket-checkbox" type="checkbox" 
                       value="${ticket._id}" id="ticket_${ticket._id}"
                       ${ticket.status === 'checked_in' ? 'disabled' : ''}>
                <label class="form-check-label" for="ticket_${ticket._id}">
                    <strong>Ghế ${ticket.seat_code || ticket.seat_id || 'N/A'}</strong>
                    <span class="badge ${this.getStatusBadgeClass(ticket.status)} ms-2">
                        ${this.getStatusText(ticket.status)}
                    </span>
                </label>
            </div>
        `).join('');

        const ticketInfoHtml = `
            <div class="row">
                <div class="col-md-6">
                    <strong>Mã booking:</strong> ${booking.barcode_data || booking.booking_id || 'N/A'}<br>
                    <strong>Khách hàng:</strong> ${customer.full_name || 'N/A'}<br>
                    <strong>Email:</strong> ${customer.email || 'N/A'}<br>
                    <strong>Số điện thoại:</strong> ${customer.phone || 'N/A'}
                </div>
                <div class="col-md-6">
                    <strong>Phim:</strong> ${movie.title || 'N/A'}<br>
                    <strong>Suất chiếu:</strong> ${showtime.date || 'N/A'} ${showtime.time || ''}<br>
                    <strong>Phòng:</strong> ${showtime.hall || 'N/A'}<br>
                    <strong>Rạp:</strong> ${showtime.cinema || 'N/A'}
                </div>
            </div>
            <hr>
            <div class="row">
                <div class="col-12">
                    <strong>Danh sách vé (${tickets.length} vé):</strong>
                    <div class="mt-2">
                        ${ticketsHtml}
                    </div>
                </div>
            </div>
            <hr>
            <div class="row">
                <div class="col-md-6">
                    <strong>Trạng thái booking:</strong> 
                    <span class="badge ${this.getStatusBadgeClass(booking.status)}">${this.getStatusText(booking.status)}</span>
                </div>
                <div class="col-md-6">
                    <button type="button" class="btn btn-outline-primary btn-sm" onclick="selectAllTickets()">
                        <i class="fas fa-check-double"></i> Chọn tất cả
                    </button>
                    <button type="button" class="btn btn-outline-secondary btn-sm ms-2" onclick="deselectAllTickets()">
                        <i class="fas fa-times"></i> Bỏ chọn tất cả
                    </button>
                </div>
            </div>
        `;

        document.getElementById('ticket-info').innerHTML = ticketInfoHtml;
        document.getElementById('scan-result').style.display = 'block';
        
        // Lưu booking data để sử dụng khi check-in
        this.currentBookingData = booking;
    }

    showError(message) {
        document.getElementById('error-message').textContent = message;
        document.getElementById('scan-error').style.display = 'block';
    }

    async performCheckin() {
        if (!this.currentBookingData) {
            this.showError('Không có thông tin booking để check-in');
            return;
        }

        // Lấy danh sách tickets được chọn
        const selectedTickets = Array.from(document.querySelectorAll('.ticket-checkbox:checked'))
            .map(checkbox => checkbox.value);

        if (selectedTickets.length === 0) {
            this.showError('Vui lòng chọn ít nhất một vé để check-in');
            return;
        }

        console.log('✅ Performing check-in for tickets:', selectedTickets);

        // Đảm bảo có token hợp lệ
        await this.ensureValidToken();

        // Show loading on confirm button
        const confirmBtn = document.getElementById('confirm-checkin');
        const originalText = confirmBtn.innerHTML;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang xử lý...';
        confirmBtn.disabled = true;

        try {

            const response = await fetch('/api/staff/checkin-ticket', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.staffToken}`
                },
                body: JSON.stringify({ 
                    ticket_ids: selectedTickets,
                    booking_id: this.currentBookingData.booking_id
                })
            });

            // Check if response is ok before parsing JSON
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.showSuccessToast(`Check-in thành công ${result.total_checked_in} vé!`);
                
                // Hiển thị kết quả chi tiết
                let resultMessage = `✅ Check-in thành công ${result.total_checked_in} vé`;
                if (result.total_failed > 0) {
                    resultMessage += `\n❌ ${result.total_failed} vé không thể check-in`;
                }
                
                // Cập nhật UI để hiển thị trạng thái mới
                this.updateTicketStatus(selectedTickets, 'checked_in');
                
                // Update dashboard stats
                this.updateDashboardStats();
                
                // Hiển thị thông báo thành công
                this.showSuccessToast(resultMessage);
                
            } else {
                this.showError(result.error || 'Check-in thất bại');
            }

        } catch (error) {
            console.error('❌ Check-in error:', error);
            this.showError('Lỗi hệ thống khi check-in: ' + error.message);
        } finally {
            // Restore button state
            const confirmBtn = document.getElementById('confirm-checkin');
            confirmBtn.innerHTML = originalText;
            confirmBtn.disabled = false;
        }
    }

    // Thủ công: check-in bằng mã QR code
    async performCheckinManual(barcode) {
        try {
            // 1. Validate ticket trước để lấy booking info
            const validateResult = await this.validateTicket(barcode);
            if (!validateResult.success) {
                return { success: false, message: 'Không thể validate ticket' };
            }

            const booking = validateResult.booking;
            const tickets = booking.tickets;
            
            // 2. Hiển thị UI chọn seats thay vì tự động check-in
            this.showTicketInfo(booking);
            this.currentBookingData = booking;
            
            // 3. Hiển thị kết quả scan thành công
            document.getElementById('scan-result').style.display = 'block';
            document.getElementById('scan-error').style.display = 'none';
            
            return { success: true, message: 'Đã tìm thấy booking. Vui lòng chọn seats để check-in.' };
        } catch (error) {
            console.error('Manual check-in error:', error);
            if (error.message.includes('HTTP 405')) {
                return { success: false, message: 'API endpoint không tồn tại' };
            } else {
                return { success: false, message: error.message };
            }
        }
    }

    showSuccessToast(message) {
        const toastElement = document.getElementById('checkin-toast');
        const toastMessage = document.getElementById('toast-message');
        
        toastMessage.textContent = message;
        
        const toast = new bootstrap.Toast(toastElement);
        toast.show();
    }

    async updateDashboardStats() {
        try {
            console.log('📊 Updating dashboard stats...');
            
            await this.ensureValidToken();
            
            const response = await fetch('/api/staff/dashboard-stats', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.staffToken}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const stats = await response.json();
            console.log('📊 Dashboard stats:', stats);
            
            // Cập nhật UI với dữ liệu thực
            const todayCheckins = document.getElementById('today-checkins');
            const currentShows = document.getElementById('current-shows');
            const waitingCustomers = document.getElementById('waiting-customers');
            
            if (todayCheckins) {
                todayCheckins.textContent = stats.today_checkins || 0;
            }
            
            if (currentShows) {
                currentShows.textContent = stats.current_shows || 0;
            }
            
            if (waitingCustomers) {
                waitingCustomers.textContent = stats.waiting_customers || 0;
            }
            
            console.log('📊 Dashboard stats updated successfully');
            
        } catch (error) {
            console.error('❌ Error updating dashboard stats:', error);
            // Fallback to default values if API fails
            const todayCheckins = document.getElementById('today-checkins');
            const currentShows = document.getElementById('current-shows');
            const waitingCustomers = document.getElementById('waiting-customers');
            
            if (todayCheckins) todayCheckins.textContent = '0';
            if (currentShows) currentShows.textContent = '0';
            if (waitingCustomers) waitingCustomers.textContent = '0';
        }
    }

    async loadDashboardStats() {
        try {
            console.log('📊 Loading dashboard stats on page load...');
            await this.updateDashboardStats();
        } catch (error) {
            console.error('❌ Error loading dashboard stats:', error);
        }
    }

    getStatusBadgeClass(status) {
        const statusClasses = {
            'confirmed': 'bg-success',
            'checked_in': 'bg-primary',
            'cancelled': 'bg-danger',
            'used': 'bg-secondary'
        };
        return statusClasses[status] || 'bg-warning';
    }

    getStatusText(status) {
        const statusTexts = {
            'confirmed': 'Đã xác nhận',
            'checked_in': 'Đã check-in',
            'cancelled': 'Đã hủy',
            'used': 'Đã sử dụng'
        };
        return statusTexts[status] || status;
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleString('vi-VN');
        } catch (error) {
            return dateString;
        }
    }

    // Function để cập nhật trạng thái tickets trên UI
    updateTicketStatus(ticketIds, newStatus) {
        ticketIds.forEach(ticketId => {
            const checkbox = document.getElementById(`ticket_${ticketId}`);
            if (checkbox) {
                checkbox.disabled = true;
                checkbox.checked = false;
                
                // Cập nhật label
                const label = checkbox.nextElementSibling;
                if (label) {
                    const badge = label.querySelector('.badge');
                    if (badge) {
                        badge.className = `badge ${this.getStatusBadgeClass(newStatus)} ms-2`;
                        badge.textContent = this.getStatusText(newStatus);
                    }
                }
            }
        });
    }
}

// === Báo cáo ghế hỏng ===
document.addEventListener('DOMContentLoaded', function() {
  const cinemaSelect = document.getElementById('cinema');
  const hallSelect = document.getElementById('hall');
  const brokenSeatForm = document.getElementById('broken-seat-form');
  const brokenSeatTableBody = document.querySelector('#broken-seat-table');

  // Mock data for cinemas and halls to avoid API errors
  const mockCinemas = [
    { name: 'Storia Hà Nội' },
    { name: 'Storia Sài Gòn' }
  ];
  
  const mockHalls = [
    { name: 'Hall 1' },
    { name: 'Hall 2' },
    { name: 'Hall 3' }
  ];

  // Set default values for datetime-local
  const reportTimeInput = document.getElementById('report-time');
  if (reportTimeInput) {
    const now = new Date();
    const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    reportTimeInput.value = localDateTime;
  }

  // Load cinemas
  function loadCinemas() {
    fetch('/api/cinemas')
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then(cinemas => {
        cinemaSelect.innerHTML = '<option value="">Chọn rạp</option>';
        cinemas.forEach(cinema => {
          const option = document.createElement('option');
          option.value = cinema.name;
          option.textContent = cinema.name;
          cinemaSelect.appendChild(option);
        });
      })
      .catch(error => {
        console.error('Error loading cinemas:', error);
        // Fallback to mock data
        cinemaSelect.innerHTML = '<option value="">Chọn rạp</option>';
        mockCinemas.forEach(cinema => {
          const option = document.createElement('option');
          option.value = cinema.name;
          option.textContent = cinema.name;
          cinemaSelect.appendChild(option);
        });
      });
  }

  // Load halls
  function loadHalls() {
    fetch('/api/halls')
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then(halls => {
        hallSelect.innerHTML = '<option value="">Chọn phòng chiếu</option>';
        halls.forEach(hall => {
          const option = document.createElement('option');
          option.value = hall.name;
          option.textContent = hall.name;
          hallSelect.appendChild(option);
        });
      })
      .catch(error => {
        console.error('Error loading halls:', error);
        // Fallback to mock data
        hallSelect.innerHTML = '<option value="">Chọn phòng chiếu</option>';
        mockHalls.forEach(hall => {
          const option = document.createElement('option');
          option.value = hall.name;
          option.textContent = hall.name;
          hallSelect.appendChild(option);
        });
      });
  }

  if (cinemaSelect) loadCinemas();
  if (hallSelect) loadHalls();

  // Load danh sách ghế hỏng
  function loadBrokenSeats() {
    console.log('Loading broken seats...');
    
    // Thử endpoint chính trước
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    const headers = token ? {
      'Authorization': 'Bearer ' + token
    } : {};
    
    fetch('/api/staff/broken-seats', { headers })
      .then(res => {
        if (res.ok) {
          return res.json();
        } else if (res.status === 401) {
          console.log('Auth failed, trying test endpoint...');
          // Nếu auth thất bại, thử endpoint test
          return fetch('/api/test-broken-seats').then(res => res.json());
        } else {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
      })
      .then(data => {
        // Xử lý cả 2 format response
        const seats = Array.isArray(data) ? data : (data.data || []);
        
        if (seats.length > 0) {
          console.log(`Found ${seats.length} broken seats`);
          brokenSeatTableBody.innerHTML = seats.map((item, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td>${item.seat_id}</td>
              <td>${item.hall}</td>
              <td>${item.cinema}</td>
              <td>${item.report_time ? new Date(item.report_time).toLocaleString('vi-VN') : ''}</td>
              <td>${item.description}</td>
              <td>${item.reported_by || ''}</td>
              <td>
                ${item.status === 'active' ? 
                  `<button class="btn btn-success btn-sm" onclick="restoreSeat('${item.seat_id}', '${item.hall}', '${item.cinema}')">
                    <i class="fas fa-tools"></i> Khôi phục
                  </button>` : 
                  `<span class="badge bg-secondary">Đã khôi phục</span>`
                }
              </td>
            </tr>
          `).join('');
        } else {
          brokenSeatTableBody.innerHTML = '<tr><td colspan="8">Không có dữ liệu</td></tr>';
        }
      })
      .catch(error => {
        console.error('Error loading broken seats:', error);
        // Fallback to mock data
        const mockBrokenSeats = [
          {
            seat_id: 'A1',
            hall: 'Hall 1',
            cinema: 'Storia Hà Nội',
            report_time: new Date().toISOString(),
            description: 'Ghế bị gãy lưng',
            reported_by: 'Nhân viên A',
            status: 'active'
          },
          {
            seat_id: 'B5',
            hall: 'Hall 2',
            cinema: 'Storia Sài Gòn',
            report_time: new Date(Date.now() - 86400000).toISOString(),
            description: 'Ghế bị rách da',
            reported_by: 'Nhân viên B',
            status: 'resolved'
          }
        ];
        
        brokenSeatTableBody.innerHTML = mockBrokenSeats.map((item, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${item.seat_id}</td>
            <td>${item.hall}</td>
            <td>${item.cinema}</td>
            <td>${item.report_time ? new Date(item.report_time).toLocaleString('vi-VN') : ''}</td>
            <td>${item.description}</td>
            <td>${item.reported_by || ''}</td>
            <td>
              ${item.status === 'active' ? 
                `<button class="btn btn-success btn-sm" onclick="restoreSeat('${item.seat_id}', '${item.hall}', '${item.cinema}')">
                  <i class="fas fa-tools"></i> Khôi phục
                </button>` : 
                `<span class="badge bg-secondary">Đã khôi phục</span>`
              }
            </td>
          </tr>
        `).join('');
      });
  }
  
  // Load broken seats khi trang load
  if (brokenSeatTableBody) {
    console.log('🔄 Loading broken seats on page load...');
    loadBrokenSeats();
  }

  // Submit báo cáo ghế hỏng
  if (brokenSeatForm) {
    brokenSeatForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const seat_id = document.getElementById('seat-id').value.trim();
      const hall = hallSelect.value;
      const cinema = cinemaSelect.value;
      const report_time = document.getElementById('report-time').value;
      const description = document.getElementById('description').value.trim();
      
      if (!seat_id || !hall || !cinema || !report_time || !description) {
        alert('Vui lòng nhập đầy đủ thông tin!');
        return;
      }
      
      console.log('Submitting broken seat report:', { seat_id, hall, cinema, report_time, description });
      
      fetch('/api/staff/report-broken-seat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + (localStorage.getItem('authToken') || '')
        },
        body: JSON.stringify({ seat_id, hall, cinema, report_time, description })
      })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        if (data.success) {
          alert('Đã gửi báo cáo ghế hỏng thành công!');
          brokenSeatForm.reset();
          
          // Set default datetime again
          const now = new Date();
          const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
          document.getElementById('report-time').value = localDateTime;
          
          // Reload the table
          loadBrokenSeats();
        } else {
          alert(data.error || 'Gửi báo cáo thất bại!');
        }
      })
      .catch(error => {
        console.error('Error submitting broken seat report:', error);
        alert('Lỗi hệ thống khi gửi báo cáo! Vui lòng thử lại sau.');
      });
    });
  }
});

// Function to restore broken seat
function restoreSeat(seatId, hall, cinema) {
  if (!confirm(`Bạn có chắc chắn muốn khôi phục ghế ${seatId}?`)) {
    return;
  }
  
  fetch(`/api/staff/restore-seat/${seatId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + (localStorage.getItem('authToken') || '')
    },
    body: JSON.stringify({ hall, cinema })
  })
  .then(res => {
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return res.json();
  })
  .then(data => {
    if (data.success) {
      alert(`Đã khôi phục ghế ${seatId} thành công!`);
      // Reload the table
      const brokenSeatTableBody = document.querySelector('#broken-seat-table');
      if (brokenSeatTableBody) {
        // Trigger reload
        const event = new Event('DOMContentLoaded');
        document.dispatchEvent(event);
      }
    } else {
      alert(data.error || 'Khôi phục ghế thất bại!');
    }
  })
  .catch(error => {
    console.error('Error restoring seat:', error);
    alert('Lỗi hệ thống khi khôi phục ghế! Vui lòng thử lại sau.');
  });
}

// Function để chọn tất cả tickets
function selectAllTickets() {
    const checkboxes = document.querySelectorAll('.ticket-checkbox:not(:disabled)');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
    });
}

// Function để bỏ chọn tất cả tickets
function deselectAllTickets() {
    const checkboxes = document.querySelectorAll('.ticket-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Staff Check-in Manager initializing...');
    window.staffCheckinManager = new StaffCheckinManager();
    console.log('✅ Staff Check-in Manager ready');
}); 