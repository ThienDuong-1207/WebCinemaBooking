document.addEventListener('DOMContentLoaded', function() {
    console.log('🎟️ Ticket page loaded');
    
    // Load tickets from API instead of localStorage
    loadMyTickets();
});

function loadMyTickets() {
    console.log('🎫 Loading my tickets...');
    
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    console.log('🔑 Token exists:', !!token);
    console.log('👤 User exists:', !!user);
    
    if (!token) {
        console.log('❌ No token found, redirecting to login');
        window.location.href = '/login';
        return;
    }
    
    console.log('✔Token found, making API call...');
    
    // Make API call to get tickets
    fetch('/api/my-tickets', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        console.log('API response status:', response.status);
        console.log('API response headers:', response.headers);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Received tickets data:', data);
        console.log('Data type:', typeof data);
        console.log('Data length:', data.length);
        
        if (data && data.length > 0) {
            console.log('✅ Tickets found, displaying...');
            displayAllTicketGroups(data);
        } else {
            console.log('▲ No tickets found, showing empty message');
            showNoTicketsMessage('Bạn chưa có vé nào');
        }
    })
    .catch(error => {
        console.error('❌ Error loading tickets:', error);
        showNoTicketsMessage('Không thể tải vé. Vui lòng thử lại sau.');
    });
}

function showNoTicketsMessage(message) {
    const container = document.getElementById('tickets-container');
    if (container) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-ticket-alt fa-3x text-muted mb-3"></i>
                <h4 class="text-muted">${message}</h4>
                <a href="/" class="btn btn-primary mt-3">
                    <i class="fas fa-home me-2"></i>Về trang chủ
                </a>
            </div>
        `;
    }
}

function displayAllTicketGroups(ticketGroups) {
    const container = document.getElementById('tickets-container');
    if (!container) {
        console.error('❌ tickets-container not found');
        return;
    }
    
    container.innerHTML = '';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'flex-start';
    
    console.log('🎬 Displaying', ticketGroups.length, 'booking groups');
    
    ticketGroups.forEach((group, groupIndex) => {
        // Add booking group header
        const groupHeader = document.createElement('div');
        groupHeader.className = 'booking-group-header';
        groupHeader.style.cssText = `
            width: 70vh; 
            margin-bottom: 10px; 
            padding: 10px 20px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            border-radius: 8px; 
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        `;
        groupHeader.innerHTML = `
            <h5 style="margin: 0; font-weight: bold;">
                <i class="fas fa-film me-2"></i>${group.booking_info.movie_title}
            </h5>
            <small style="opacity: 0.9;">
                ${group.booking_info.cinema} - ${group.booking_info.hall} | 
                ${new Date(group.booking_info.date).toLocaleDateString('vi-VN')} ${group.booking_info.time}
            </small>
        `;
        container.appendChild(groupHeader);
        
        // Display tickets in this group
        group.tickets.forEach((ticket, ticketIndex) => {
            displaySingleTicket(ticket, group.booking_info, container);
        });
        
        // Add spacing between groups
        if (groupIndex < ticketGroups.length - 1) {
            const spacer = document.createElement('div');
            spacer.style.height = '30px';
            container.appendChild(spacer);
        }
    });
    
    // Add hover effects and click events
    addTicketHoverEffects();
    addTicketClickEvents();
    
    // Add modal for barcode display
    addBarcodeModal();
}

function displaySingleTicket(ticket, bookingInfo, container) {
    console.log('🎟️ Creating ticket with ID:', ticket.ticket_id, 'Seat:', ticket.seat_code);
    
    const ticketElement = document.createElement('div');
    ticketElement.className = 'cinema-ticket mb-4';
    ticketElement.setAttribute('data-ticket-id', ticket.ticket_id);
    ticketElement.setAttribute('data-barcode', ticket.barcode_data);
    ticketElement.setAttribute('data-seat', ticket.seat_code);
    ticketElement.style.cssText = `
        width: 70vh; 
        min-width: 70vh; 
        display: flex; 
        align-items: center; 
        padding: 20px; 
        margin-bottom: 16px; 
        border: 2px solid #d1d5db; 
        border-radius: 16px; 
        background: #fff; 
        box-shadow: 0 2px 8px rgba(0,0,0,0.06); 
        cursor: pointer; 
        transition: all 0.3s ease;
    `;
    
    ticketElement.innerHTML = `
        <div class="movie-poster-section" style="flex: 0 0 120px; margin-right: 24px; display: flex; flex-direction: column; align-items: center;">
            <img src="${bookingInfo.movie_poster}" alt="${bookingInfo.movie_title}" class="movie-poster" style="max-width: 100px; max-height: 120px; border-radius: 8px; margin-bottom: 8px;">
            <h5 class="movie-title" style="font-size: 1.1rem; margin: 0; text-align: center;">${bookingInfo.movie_title}</h5>
        </div>
        <div class="ticket-info" style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
            <div class="seat-info" style="font-weight: bold; margin-bottom: 4px;">ROW ${ticket.seat_code.charAt(0)} - Seat ${ticket.seat_code.substring(1)}</div>
            <div class="show-info" style="margin-bottom: 4px;">
                <span>${new Date(bookingInfo.date).toLocaleDateString('vi-VN', {day: '2-digit', month: 'short', year: 'numeric'})}</span>
                <span style="margin-left: 12px;">${bookingInfo.time}</span>
            </div>
            <div class="hall-info" style="margin-bottom: 4px;">Hall: ${bookingInfo.hall}</div>
            <div class="cinema-name" style="color: #d32f2f; font-weight: bold; margin-bottom: 8px;">${bookingInfo.cinema}</div>
            <div class="click-hint" style="color: #666; font-size: 0.85rem; font-style: italic;">
                <i class="fas fa-hand-pointer me-1"></i>Click để hiển thị barcode
            </div>
        </div>
        <div class="barcode-section" style="flex: 0 0 160px; display: flex; flex-direction: column; align-items: center;">
            <div class="barcode-display" style="margin-bottom: 8px;">
                <div class="barcode-lines" style="font-size: 1.5rem; letter-spacing: 2px;">${'|'.repeat(40)}</div>
                <div class="barcode-text" style="font-size: 0.95rem; letter-spacing: 1px;">${ticket.barcode_data}</div>
            </div>
        </div>
    `;
    
    container.appendChild(ticketElement);
}

function displayTickets(tickets, bookingInfo) {
    const container = document.getElementById('tickets-container');
    if (!container) {
        console.error('❌ tickets-container not found');
        return;
    }
    
    console.log('🎫 Displaying tickets:', tickets.length, 'tickets for booking:', bookingInfo);
    
    container.innerHTML = '';
    container.className = 'tickets-container-progressive';
    
    tickets.forEach((ticket, index) => {
        console.log(`🎫 Creating ticket ${index + 1}:`, ticket);
        const ticketHtml = `
            <div class="ticket-card-progressive" data-ticket-id="${ticket.ticket_id}" data-barcode="${ticket.barcode_data}" data-seat="${ticket.seat_code}">
                <!-- Mobile Layout (Default) -->
                <div class="ticket-mobile">
                    <div class="ticket-poster-section">
                        <img src="${bookingInfo.movie_poster}" alt="${bookingInfo.movie_title}" class="ticket-poster">
                        <h5 class="ticket-movie-title">${bookingInfo.movie_title}</h5>
                    </div>
                    <div class="ticket-info-section">
                        <div class="ticket-seat-info">
                            <i class="fas fa-chair"></i>
                            <span>ROW ${ticket.seat_code.charAt(0)} - Seat ${ticket.seat_code.substring(1)}</span>
                        </div>
                        <div class="ticket-show-info">
                            <div class="ticket-date">
                                <i class="fas fa-calendar"></i>
                                <span>${new Date(bookingInfo.date).toLocaleDateString('vi-VN', {day: '2-digit', month: 'short', year: 'numeric'})}</span>
                            </div>
                            <div class="ticket-time">
                                <i class="fas fa-clock"></i>
                                <span>${bookingInfo.time}</span>
                            </div>
                        </div>
                        <div class="ticket-hall-info">
                            <i class="fas fa-film"></i>
                            <span>Hall: ${bookingInfo.hall}</span>
                        </div>
                        <div class="ticket-cinema-name">
                            <i class="fas fa-building"></i>
                            <span>${bookingInfo.cinema}</span>
                        </div>
                        <div class="ticket-barcode-mobile">
                            <div class="barcode-lines">${'|'.repeat(20)}</div>
                            <div class="barcode-text">${ticket.barcode_data}</div>
                        </div>
                        <div class="ticket-actions-mobile">
                            <button class="btn-show-barcode" onclick="showBarcodeModal('${ticket.ticket_id}', '${ticket.barcode_data}', '${ticket.seat_code}')">
                                <i class="fas fa-qrcode"></i> Hiện Barcode
                            </button>
                            <button class="btn-download-ticket" onclick="downloadTicket('${ticket.ticket_id}', '${ticket.barcode_data}', '${ticket.seat_code}', ${JSON.stringify(bookingInfo).replace(/"/g, '&quot;')})">
                                <i class="fas fa-download"></i> Tải Vé
                            </button>
                            <button class="btn-share-ticket" onclick="shareTicket('${ticket.ticket_id}', '${ticket.barcode_data}', '${ticket.seat_code}', ${JSON.stringify(bookingInfo).replace(/"/g, '&quot;')})">
                                <i class="fas fa-share"></i> Chia Sẻ
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Tablet Layout -->
                <div class="ticket-tablet">
                    <div class="ticket-poster-section">
                        <img src="${bookingInfo.movie_poster}" alt="${bookingInfo.movie_title}" class="ticket-poster">
                        <h5 class="ticket-movie-title">${bookingInfo.movie_title}</h5>
                    </div>
                    <div class="ticket-info-section">
                        <div class="ticket-seat-info">
                            <i class="fas fa-chair"></i>
                            <span>ROW ${ticket.seat_code.charAt(0)} - Seat ${ticket.seat_code.substring(1)}</span>
                        </div>
                        <div class="ticket-show-info">
                            <div class="ticket-date">
                                <i class="fas fa-calendar"></i>
                                <span>${new Date(bookingInfo.date).toLocaleDateString('vi-VN', {day: '2-digit', month: 'short', year: 'numeric'})}</span>
                            </div>
                            <div class="ticket-time">
                                <i class="fas fa-clock"></i>
                                <span>${bookingInfo.time}</span>
                            </div>
                        </div>
                        <div class="ticket-hall-info">
                            <i class="fas fa-film"></i>
                            <span>Hall: ${bookingInfo.hall}</span>
                        </div>
                        <div class="ticket-cinema-name">
                            <i class="fas fa-building"></i>
                            <span>${bookingInfo.cinema}</span>
                        </div>
                    </div>
                    <div class="ticket-barcode-section">
                        <div class="barcode-display">
                            <div class="barcode-lines">${'|'.repeat(30)}</div>
                            <div class="barcode-text">${ticket.barcode_data}</div>
                        </div>
                        <div class="ticket-actions">
                            <button class="btn-show-barcode" onclick="showBarcodeModal('${ticket.ticket_id}', '${ticket.barcode_data}', '${ticket.seat_code}')">
                                <i class="fas fa-qrcode"></i>
                            </button>
                            <button class="btn-download-ticket" onclick="downloadTicket('${ticket.ticket_id}', '${ticket.barcode_data}', '${ticket.seat_code}', ${JSON.stringify(bookingInfo).replace(/"/g, '&quot;')})">
                                <i class="fas fa-download"></i>
                            </button>
                            <button class="btn-share-ticket" onclick="shareTicket('${ticket.ticket_id}', '${ticket.barcode_data}', '${ticket.seat_code}', ${JSON.stringify(bookingInfo).replace(/"/g, '&quot;')})">
                                <i class="fas fa-share"></i>
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Desktop Layout -->
                <div class="ticket-desktop">
                    <div class="ticket-poster-section">
                        <img src="${bookingInfo.movie_poster}" alt="${bookingInfo.movie_title}" class="ticket-poster">
                        <h5 class="ticket-movie-title">${bookingInfo.movie_title}</h5>
                    </div>
                    <div class="ticket-info-section">
                        <div class="ticket-seat-info">
                            <i class="fas fa-chair"></i>
                            <span>ROW ${ticket.seat_code.charAt(0)} - Seat ${ticket.seat_code.substring(1)}</span>
                        </div>
                        <div class="ticket-show-info">
                            <div class="ticket-date">
                                <i class="fas fa-calendar"></i>
                                <span>${new Date(bookingInfo.date).toLocaleDateString('vi-VN', {day: '2-digit', month: 'short', year: 'numeric'})}</span>
                            </div>
                            <div class="ticket-time">
                                <i class="fas fa-clock"></i>
                                <span>${bookingInfo.time}</span>
                            </div>
                        </div>
                        <div class="ticket-hall-info">
                            <i class="fas fa-film"></i>
                            <span>Hall: ${bookingInfo.hall}</span>
                        </div>
                        <div class="ticket-cinema-name">
                            <i class="fas fa-building"></i>
                            <span>${bookingInfo.cinema}</span>
                        </div>
                    </div>
                    <div class="ticket-barcode-section">
                        <div class="barcode-display">
                            <div class="barcode-lines">${'|'.repeat(40)}</div>
                            <div class="barcode-text">${ticket.barcode_data}</div>
                        </div>
                        <div class="ticket-actions">
                            <button class="btn-show-barcode" onclick="showBarcodeModal('${ticket.ticket_id}', '${ticket.barcode_data}', '${ticket.seat_code}')" title="Hiện Barcode">
                                <i class="fas fa-qrcode"></i>
                            </button>
                            <button class="btn-download-ticket" onclick="downloadTicket('${ticket.ticket_id}', '${ticket.barcode_data}', '${ticket.seat_code}', ${JSON.stringify(bookingInfo).replace(/"/g, '&quot;')})" title="Tải Vé">
                                <i class="fas fa-download"></i>
                            </button>
                            <button class="btn-share-ticket" onclick="shareTicket('${ticket.ticket_id}', '${ticket.barcode_data}', '${ticket.seat_code}', ${JSON.stringify(bookingInfo).replace(/"/g, '&quot;')})" title="Chia Sẻ">
                                <i class="fas fa-share"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', ticketHtml);
    });
    
    console.log('✅ Tickets HTML created, setting up events...');
    
    // Add hover effects
    addTicketHoverEffects();
    
    // Add modal for barcode display
    addBarcodeModal();
    
    // Add click event listeners with delay to ensure DOM is ready
    setTimeout(() => {
        addTicketClickEvents();
    }, 500);
    
    console.log('✅ All ticket setup completed');
}

function addTicketHoverEffects() {
    const tickets = document.querySelectorAll('.ticket-card-progressive');
    tickets.forEach(ticket => {
        ticket.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px)';
            this.style.boxShadow = '0 20px 60px rgba(0,0,0,0.25)';
        });
        
        ticket.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '';
        });
    });
}

function addTicketClickEvents() {
    console.log('🎯 Setting up ticket click events...');
    
    // Wait for DOM to be ready and tickets to be created
    setTimeout(() => {
        // Try different selectors to find tickets
        const ticketsByClass = document.querySelectorAll('.ticket-card-progressive');
        const ticketsByData = document.querySelectorAll('[data-ticket-id]');
        const allDivs = document.querySelectorAll('div');
        
        console.log('🎯 Found tickets by class:', ticketsByClass.length);
        console.log('🎯 Found tickets by data:', ticketsByData.length);
        console.log('🎯 Total divs on page:', allDivs.length);
        
        // Check what divs we have
        allDivs.forEach((div, index) => {
            if (div.className && div.className.includes('ticket')) {
                console.log(`Div ${index} with ticket class:`, div.className);
            }
            if (div.getAttribute('data-ticket-id')) {
                console.log(`Div ${index} with ticket data:`, div.getAttribute('data-ticket-id'));
            }
        });
        
        // Use the selector that finds tickets
        const tickets = ticketsByData.length > 0 ? ticketsByData : ticketsByClass;
        console.log('🎯 Using tickets:', tickets.length);
        
        if (tickets.length === 0) {
            console.error('❌ No tickets found! Waiting longer...');
            // Try again after a longer delay
            setTimeout(() => {
                const retryTickets = document.querySelectorAll('[data-ticket-id]');
                console.log('🔄 Retry: Found', retryTickets.length, 'tickets');
                
                if (retryTickets.length > 0) {
                    setupTicketEvents(retryTickets);
                } else {
                    console.error('❌ Still no tickets found after retry');
                    // Try to find any elements with ticket data
                    const allElements = document.querySelectorAll('*');
                    const ticketElements = Array.from(allElements).filter(el => el.getAttribute('data-ticket-id'));
                    console.log('🔍 Found elements with ticket data:', ticketElements.length);
                    if (ticketElements.length > 0) {
                        console.log('✅ Found ticket elements, setting up events');
                        setupTicketEvents(ticketElements);
                    }
                }
            }, 2000);
            return;
        }
        
        setupTicketEvents(tickets);
        
    }, 1500); // Increased timeout
}

function setupTicketEvents(tickets) {
    console.log('🎯 Setting up events for', tickets.length, 'tickets');
    
    tickets.forEach((ticket, index) => {
        console.log(`🎫 Setting up click for ticket ${index + 1}`);
        
        // Add click event directly
        ticket.addEventListener('click', function(event) {
            console.log('🖱️ Ticket clicked!', event.target);
            
            // Don't trigger if clicking on buttons
            if (event.target.closest('button')) {
                console.log('🔘 Button clicked, not showing modal');
                return;
            }
            
            const ticketId = this.getAttribute('data-ticket-id');
            const barcodeData = this.getAttribute('data-barcode');
            const seatCode = this.getAttribute('data-seat');
            
            console.log('🎫 Ticket data:', { ticketId, barcodeData, seatCode });
            
            if (ticketId && barcodeData && seatCode) {
                // Add visual feedback
                this.style.transform = 'scale(0.95)';
                this.style.boxShadow = '0 0 20px rgba(211, 47, 47, 0.5)';
                this.style.border = '2px solid #d32f2f';
                
                setTimeout(() => {
                    this.style.transform = 'translateY(-8px)';
                    this.style.boxShadow = '0 8px 25px rgba(0,0,0,0.2)';
                    this.style.border = '';
                }, 150);
                
                // Show modal
                showBarcodeModal(ticketId, barcodeData, seatCode);
            } else {
                console.error('❌ Missing ticket data:', { ticketId, barcodeData, seatCode });
            }
        });
        
        // Add specific click events to barcode buttons
        const barcodeButtons = ticket.querySelectorAll('.btn-show-barcode');
        barcodeButtons.forEach(button => {
            button.addEventListener('click', function(event) {
                event.stopPropagation();
                console.log('🔘 Barcode button clicked');
                
                const ticketId = ticket.getAttribute('data-ticket-id');
                const barcodeData = ticket.getAttribute('data-barcode');
                const seatCode = ticket.getAttribute('data-seat');
                
                console.log('🎫 Button ticket data:', { ticketId, barcodeData, seatCode });
                
                if (ticketId && barcodeData && seatCode) {
                    showBarcodeModal(ticketId, barcodeData, seatCode);
                } else {
                    console.error('❌ Missing ticket data in button:', { ticketId, barcodeData, seatCode });
                }
            });
        });
        
        // Add visual feedback for all buttons
        const allButtons = ticket.querySelectorAll('button');
        allButtons.forEach(button => {
            button.addEventListener('click', function(event) {
                console.log('🔘 Button clicked:', this.className);
                // Add button click effect
                this.style.transform = 'scale(0.9)';
                setTimeout(() => {
                    this.style.transform = '';
                }, 100);
            });
        });
    });
    
    console.log('✅ Click events setup completed');
    
    // Test if events are working
    setTimeout(() => {
        console.log('🧪 Testing click events...');
        const testTicketsByClass = document.querySelectorAll('.ticket-card-progressive');
        const testTicketsByData = document.querySelectorAll('[data-ticket-id]');
        
        const testTicket = testTicketsByData.length > 0 ? testTicketsByData[0] : testTicketsByClass[0];
        
        if (testTicket) {
            console.log('✅ Found test ticket, events should work');
            console.log('Test ticket data:', {
                ticketId: testTicket.getAttribute('data-ticket-id'),
                seatCode: testTicket.getAttribute('data-seat'),
                className: testTicket.className
            });
            testTicket.style.border = '2px solid green';
            setTimeout(() => {
                testTicket.style.border = '';
            }, 2000);
        } else {
            console.error('❌ No test ticket found for testing');
            console.log('Available tickets by class:', testTicketsByClass.length);
            console.log('Available tickets by data:', testTicketsByData.length);
        }
    }, 1000);
}

function addBarcodeModal() {
    console.log('🔧 Creating barcode modal...');
    
    // Remove existing modal if any
    const existingModal = document.getElementById('barcodeModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modalHtml = `
        <div class="modal fade" id="barcodeModal" tabindex="-1" aria-labelledby="barcodeModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content" style="background: #000; color: #fff; text-align: center;">
                    <div class="modal-header" style="border-bottom: 1px solid #333;">
                        <h5 class="modal-title" id="barcodeModalLabel" style="color: #fff;">Vé điện tử - Quét để vào rạp</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body" style="padding: 20px;">
                        <div id="ticket-info-display" style="margin-bottom: 20px;">
                            <h4 id="seat-display" style="color: #fff; margin-bottom: 10px;"></h4>
                            <p id="ticket-id-display" style="color: #ccc; font-size: 0.9rem;"></p>
                        </div>
                        <div id="qrcode-container" style="background: #fff; padding: 30px; border-radius: 12px; margin: 20px auto; max-width: 90%; display: flex; justify-content: center;">
                            <div id="qrcode-display"></div>
                        </div>
                        <div id="barcode-text-display" style="background: #333; padding: 15px; border-radius: 8px; margin-top: 15px;">
                            <div style="color: #fff; font-size: 0.9rem; margin-bottom: 5px;">Mã barcode:</div>
                            <div id="barcode-text-large" style="color: #0ff; font-family: 'Courier New', monospace; font-size: 1rem; letter-spacing: 1px; word-break: break-all;"></div>
                        </div>
                        <p style="color: #999; font-size: 0.9rem; margin-top: 15px;">
                            <i class="fas fa-info-circle me-2"></i>
                            Đưa QR Code cho nhân viên quét để vào rạp
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add new modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    console.log('✅ Barcode modal created successfully');
}

function showBarcodeModal(ticketId, barcodeData, seatCode) {
    console.log('🔄 Showing barcode modal for ticket:', ticketId);
    
    // Create a simple modal without Bootstrap
    const modalHtml = `
        <div id="simpleBarcodeModal" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
        ">
            <div style="
                background: #000;
                color: #fff;
                padding: 30px;
                border-radius: 15px;
                max-width: 500px;
                width: 90%;
                text-align: center;
                position: relative;
            ">
                <button onclick="closeSimpleModal()" style="
                    position: absolute;
                    top: 10px;
                    right: 15px;
                    background: none;
                    border: none;
                    color: #fff;
                    font-size: 24px;
                    cursor: pointer;
                ">&times;</button>
                
                <h3 style="color: #fff; margin-bottom: 20px;">Vé điện tử - Quét để vào rạp</h3>
                
                <div style="margin-bottom: 20px;">
                    <h4 style="color: #fff; margin-bottom: 10px;">Ghế ${seatCode}</h4>
                    <p style="color: #ccc; font-size: 0.9rem;">Mã vé: ${ticketId}</p>
                </div>
                
                <div id="simpleQrContainer" style="
                    background: #fff;
                    padding: 30px;
                    border-radius: 12px;
                    margin: 20px auto;
                    max-width: 90%;
                    display: flex;
                    justify-content: center;
                ">
                    <div id="simpleQrDisplay"></div>
                </div>
                
                <div style="
                    background: #333;
                    padding: 15px;
                    border-radius: 8px;
                    margin-top: 15px;
                ">
                    <div style="color: #fff; font-size: 0.9rem; margin-bottom: 5px;">Mã barcode:</div>
                    <div style="color: #0ff; font-family: 'Courier New', monospace; font-size: 1rem; letter-spacing: 1px; word-break: break-all;">${barcodeData}</div>
                </div>
                
                <p style="color: #999; font-size: 0.9rem; margin-top: 15px;">
                    <i class="fas fa-info-circle me-2"></i>
                    Đưa QR Code cho nhân viên quét để vào rạp
                </p>
            </div>
        </div>
    `;
    
    // Remove existing modal
    const existingModal = document.getElementById('simpleBarcodeModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add new modal
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Generate QR code
    const qrContainer = document.getElementById('simpleQrDisplay');
    if (qrContainer && typeof generateSimpleQR !== 'undefined') {
        try {
            const canvas = generateSimpleQR(barcodeData, 200);
            qrContainer.appendChild(canvas);
            console.log('✅ QR Code generated successfully');
        } catch (error) {
            console.error('❌ QR Code generation error:', error);
            qrContainer.innerHTML = `<div style="padding: 50px; color: #666;">QR Code không tạo được<br/>${barcodeData}</div>`;
        }
    } else {
        qrContainer.innerHTML = `<div style="padding: 50px; color: #666;">QR Generator not loaded<br/>${barcodeData}</div>`;
    }
    
    console.log('✅ Simple modal shown successfully');
}

function closeSimpleModal() {
    const modal = document.getElementById('simpleBarcodeModal');
    if (modal) {
        modal.remove();
    }
}

function showModalManually(modalElement) {
    console.log('📱 Showing modal manually');
    // Manual display
    modalElement.style.display = 'block';
    modalElement.classList.add('show');
    modalElement.style.backgroundColor = 'rgba(0,0,0,0.5)';
    document.body.classList.add('modal-open');
    
    // Add backdrop
    const existingBackdrop = document.getElementById('modal-backdrop');
    if (existingBackdrop) {
        existingBackdrop.remove();
    }
    
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop fade show';
    backdrop.id = 'modal-backdrop';
    backdrop.style.zIndex = '1040';
    document.body.appendChild(backdrop);
    
    // Set modal z-index higher than backdrop
    modalElement.style.zIndex = '1050';
    modalElement.style.position = 'fixed';
    modalElement.style.top = '0';
    modalElement.style.left = '0';
    modalElement.style.width = '100%';
    modalElement.style.height = '100%';
    
    // Add close functionality
    const closeBtn = modalElement.querySelector('.btn-close, [data-bs-dismiss="modal"]');
    if (closeBtn) {
        closeBtn.onclick = function() {
            modalElement.style.display = 'none';
            modalElement.classList.remove('show');
            document.body.classList.remove('modal-open');
            if (backdrop) backdrop.remove();
        };
    }
    
    // Close on backdrop click
    backdrop.onclick = function() {
        modalElement.style.display = 'none';
        modalElement.classList.remove('show');
        document.body.classList.remove('modal-open');
        backdrop.remove();
    };
}

function downloadTicket(ticketId, barcodeData, seatCode, bookingInfo) {
    console.log('📥 Downloading ticket:', ticketId);
    
    // Tạo canvas để vẽ ticket
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 800;
    canvas.height = 400;
    
    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 800, 400);
    
    // Border
    ctx.strokeStyle = '#d32f2f';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, 780, 380);
    
    // Title
    ctx.fillStyle = '#d32f2f';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('STORIA CINEMA - VÉ XEM PHIM', 20, 40);
    
    // Movie info
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(bookingInfo.movie_title, 20, 80);
    
    // Seat info
    ctx.font = 'bold 18px Arial';
    ctx.fillText(`Ghế: ${seatCode}`, 20, 120);
    
    // Date and time
    ctx.font = '16px Arial';
    ctx.fillText(`Ngày: ${new Date(bookingInfo.date).toLocaleDateString('vi-VN')}`, 20, 150);
    ctx.fillText(`Giờ: ${bookingInfo.time}`, 20, 170);
    ctx.fillText(`Rạp: ${bookingInfo.cinema}`, 20, 190);
    ctx.fillText(`Phòng: ${bookingInfo.hall}`, 20, 210);
    
    // Barcode
    ctx.font = 'bold 14px Courier';
    ctx.fillText('Barcode:', 20, 250);
    ctx.font = '12px Courier';
    ctx.fillText(barcodeData, 20, 270);
    
    // Convert to blob and download
    canvas.toBlob(function(blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ticket-${ticketId}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

function shareTicket(ticketId, barcodeData, seatCode, bookingInfo) {
    console.log('📤 Sharing ticket:', ticketId);
    
    const shareText = `Vé xem phim ${bookingInfo.movie_title} - Ghế ${seatCode} - ${bookingInfo.cinema} - ${new Date(bookingInfo.date).toLocaleDateString('vi-VN')} ${bookingInfo.time}`;
    
    if (navigator.share) {
        // Native sharing on mobile
        navigator.share({
            title: 'Vé xem phim Storia',
            text: shareText,
            url: window.location.href
        }).catch(console.error);
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(shareText).then(() => {
            alert('Đã sao chép thông tin vé vào clipboard!');
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = shareText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('Đã sao chép thông tin vé vào clipboard!');
        });
    }
}

// Function to refresh tickets (useful after check-in)
function refreshTickets() {
    console.log('🔄 Refreshing tickets...');
    loadMyTickets();
}

// Auto-refresh disabled to reduce server logs
// setInterval(refreshTickets, 30000);

// Debug function to check tickets
function debugTickets() {
    console.log('🔍 Debugging tickets...');
    
    const tickets = document.querySelectorAll('.ticket-card-progressive');
    console.log('Found tickets:', tickets.length);
    
    tickets.forEach((ticket, index) => {
        const ticketId = ticket.getAttribute('data-ticket-id');
        const barcodeData = ticket.getAttribute('data-barcode');
        const seatCode = ticket.getAttribute('data-seat');
        
        console.log(`Ticket ${index + 1}:`, {
            ticketId,
            barcodeData,
            seatCode,
            element: ticket
        });
        
        // Test click manually
        ticket.style.border = '2px solid red';
        setTimeout(() => {
            ticket.style.border = '';
        }, 2000);
    });
}

// Add debug function to window for console access
window.debugTickets = debugTickets;
window.showBarcodeModal = showBarcodeModal;
window.closeSimpleModal = closeSimpleModal;

// Function to check if tickets are loaded
function checkTicketsLoaded() {
    console.log('🔍 Checking if tickets are loaded...');
    
    const ticketsByClass = document.querySelectorAll('.ticket-card-progressive');
    const ticketsByData = document.querySelectorAll('[data-ticket-id]');
    
    console.log('Found tickets by class:', ticketsByClass.length);
    console.log('Found tickets by data:', ticketsByData.length);
    
    const tickets = ticketsByData.length > 0 ? ticketsByData : ticketsByClass;
    
    if (tickets.length === 0) {
        console.log('❌ No tickets found in DOM');
        console.log('Checking container:', document.getElementById('tickets-container'));
        
        // Check what's in the container
        const container = document.getElementById('tickets-container');
        if (container) {
            console.log('Container HTML:', container.innerHTML.substring(0, 500) + '...');
        }
        
        return false;
    }
    
    tickets.forEach((ticket, index) => {
        const ticketId = ticket.getAttribute('data-ticket-id');
        const barcodeData = ticket.getAttribute('data-barcode');
        const seatCode = ticket.getAttribute('data-seat');
        
        console.log(`Ticket ${index + 1}:`, {
            ticketId,
            barcodeData,
            seatCode,
            className: ticket.className,
            hasClickEvent: ticket.onclick !== null
        });
        
        // Highlight ticket for testing
        ticket.style.border = '3px solid blue';
        setTimeout(() => {
            ticket.style.border = '';
        }, 3000);
    });
    
    return true;
}

// Add to window for console access
window.checkTicketsLoaded = checkTicketsLoaded;

// Function to manually trigger ticket click for testing
function testTicketClick() {
    console.log('🧪 Manually testing ticket click...');
    const ticketsByClass = document.querySelectorAll('.ticket-card-progressive');
    const ticketsByData = document.querySelectorAll('[data-ticket-id]');
    
    const tickets = ticketsByData.length > 0 ? ticketsByData : ticketsByClass;
    
    if (tickets.length === 0) {
        console.log('❌ No tickets found for testing');
        return;
    }
    
    const firstTicket = tickets[0];
    const ticketId = firstTicket.getAttribute('data-ticket-id');
    const barcodeData = firstTicket.getAttribute('data-barcode');
    const seatCode = firstTicket.getAttribute('data-seat');
    
    console.log('🎫 Testing first ticket:', { ticketId, barcodeData, seatCode });
    
    // Simulate click
    firstTicket.click();
}

// Add to window for console access
window.testTicketClick = testTicketClick;

// Function to test click on first ticket
function testFirstTicketClick() {
    console.log('🧪 Testing click on first ticket...');
    const tickets = document.querySelectorAll('[data-ticket-id]');
    
    if (tickets.length === 0) {
        console.log('❌ No tickets found');
        return;
    }
    
    const firstTicket = tickets[0];
    console.log('🎫 Clicking first ticket:', {
        ticketId: firstTicket.getAttribute('data-ticket-id'),
        seatCode: firstTicket.getAttribute('data-seat'),
        barcodeData: firstTicket.getAttribute('data-barcode')
    });
    
    // Trigger click event
    firstTicket.click();
}

// Add to window for console access
window.testFirstTicketClick = testFirstTicketClick;