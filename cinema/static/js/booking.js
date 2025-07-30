// Lấy query param từ URL
function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

const movieId = getQueryParam('movie_id');
const showtimeId = getQueryParam('showtime_id');
let basePrice = 90000; // sẽ lấy động từ API

// Xóa mảng MOVIES tĩnh
// Demo dữ liệu phim (có thể fetch từ backend)
const movies = [
  { id: "httyd", title: "How to Train Your Dragon", poster: "/static/img/showing_movie1.jpg" },
  { id: "elio", title: "Elio Cậu Bé Đến Từ Trái Đất", poster: "/static/img/showing_movie3.jpg" },
  { id: "m3gan", title: "M3GAN 2.0", poster: "/static/img/showing_movie2.jpg" },
  { id: "makhongdau", title: "Ma Không Đầu", poster: "/static/img/showing_movie4.jpg" },
  { id: "bigdeal", title: "Big Deal", poster: "/static/img/showing_movie5.jpg" },
  { id: "28yearslater", title: "28 Years Later", poster: "/static/img/showing_movie6.jpg" }
];

function getMovieById(id) {
  return movies.find(m => m.id === id);
}

let seatList = [];
let seatMap = {}; // key: seat_code, value: seat object
let selectedSeats = new Set();
let currentShowtime = null;

// Render seat map
function renderSeatMap() {
  const seatMapContainer = document.getElementById('seat-map');
  if (!seatMapContainer || !seatList) return;

  // Group seats by row
  const seatsByRow = {};
  seatList.forEach(seat => {
    const row = seat.seat_code.charAt(0);
    if (!seatsByRow[row]) {
      seatsByRow[row] = [];
    }
    seatsByRow[row].push(seat);
  });

  // Sort rows
  const sortedRows = Object.keys(seatsByRow).sort();

  let html = '<div class="seat-map-container">';
  
  // Screen indicator
  html += '<div class="screen-indicator">MÀN HÌNH</div>';
  
  // Render each row
  sortedRows.forEach(row => {
    html += `<div class="seat-row" data-row="${row}">`;
    html += `<div class="row-label">${row}</div>`;
    html += '<div class="seats-in-row">';
    
    // Sort seats in row by column number
    const seatsInRow = seatsByRow[row].sort((a, b) => {
      const colA = parseInt(a.seat_code.substring(1));
      const colB = parseInt(b.seat_code.substring(1));
      return colA - colB;
    });
    
    seatsInRow.forEach(seat => {
      const seatCode = seat.seat_code;
      const seatId = seat.seat_id;
      const seatType = seat.seat_type || 'NORMAL';
      const status = seat.status || 'available';
      const isBroken = seat.is_broken || status === 'broken';
      
      let seatClass = 'seat';
      let seatContent = seatCode;
      let isClickable = true;
      
      // Determine seat styling based on status
      if (isBroken) {
        seatClass += ' broken';
        seatContent = 'X';
        isClickable = false;
      } else if (status === 'booked' || status === 'pending' || status === 'paid') {
        seatClass += ' booked';
        isClickable = false;
      } else if (status === 'locked') {
        seatClass += ' locked';
        isClickable = false;
      } else if (seatType === 'VIP') {
        seatClass += ' vip';
      } else {
        seatClass += ' available';
      }
      
      // Add selected class if seat is in selectedSeats
      if (selectedSeats.has(seatCode)) {
        seatClass += ' selected';
      }
      
      const clickHandler = isClickable ? `onclick="toggleSeat('${seatCode}', '${seatId}', '${seatType}')"` : '';
      const cursorStyle = isClickable ? 'cursor: pointer;' : 'cursor: not-allowed;';
      
      html += `
        <div class="${seatClass}" 
             data-seat="${seatCode}" 
             data-seat-id="${seatId}"
             data-type="${seatType}"
             style="${cursorStyle}"
             ${clickHandler}>
          <span class="seat-number">${seatContent}</span>
          ${isBroken ? '<span class="broken-mark">X</span>' : ''}
        </div>
      `;
    });
    
    html += '</div>'; // seats-in-row
    html += '</div>'; // seat-row
  });
  
  html += '</div>'; // seat-map-container
  
  seatMapContainer.innerHTML = html;
  
  // Remove existing legend first
  const existingLegend = seatMapContainer.parentElement.querySelector('.seat-legend');
  if (existingLegend) {
    existingLegend.remove();
  }
  
  // Add legend
  const legend = `
    <div class="seat-legend">
      <div class="legend-item">
        <div class="seat available"></div>
        <span>Có thể chọn</span>
      </div>
      <div class="legend-item">
        <div class="seat vip"></div>
        <span>Ghế VIP</span>
      </div>
      <div class="legend-item">
        <div class="seat selected"></div>
        <span>Đã chọn</span>
      </div>
      <div class="legend-item">
        <div class="seat booked"></div>
        <span>Đã đặt</span>
      </div>
      <div class="legend-item">
        <div class="seat locked"></div>
        <span>Đang được đặt</span>
      </div>
      <div class="legend-item">
        <div class="seat broken"></div>
        <span>Ghế hỏng</span>
      </div>
    </div>
  `;
  
  seatMapContainer.insertAdjacentHTML('afterend', legend);
}

// Toggle seat selection
function toggleSeat(seatCode, seatId, seatType) {
  const seatElement = document.querySelector(`[data-seat="${seatCode}"]`);
  if (!seatElement) {
    return;
  }
  
  if (selectedSeats.has(seatCode)) {
    // Deselect seat
    selectedSeats.delete(seatCode);
    seatElement.classList.remove('selected');
  } else {
    // Select seat
    selectedSeats.add(seatCode);
    seatElement.classList.add('selected');
  }
  
  updateBookingInfo();
}

// Update booking info display
function updateBookingInfo() {
  const selectedSeatsList = document.getElementById('selected-seats');
  const totalPriceElement = document.getElementById('total-price');
  const bookButton = document.getElementById('book-button');
  
  if (selectedSeats.size === 0) {
    selectedSeatsList.textContent = 'Chưa chọn ghế nào';
    totalPriceElement.textContent = '0 VNĐ';
    bookButton.disabled = true;
    bookButton.classList.add('disabled');
    return;
  }
  
  // Calculate total price
  let totalPrice = 0;
  const seatCodes = [];
  
  selectedSeats.forEach(seatCode => {
    const seat = seatMap[seatCode];
    if (seat) {
      seatCodes.push(seatCode);
      const seatType = seat.seat_type || 'NORMAL';
      if (seatType === 'VIP') {
        totalPrice += basePrice + 30000; // VIP seat costs extra
      } else {
        totalPrice += basePrice;
      }
    }
  });
  
  // Hiển thị mỗi ghế trên một hàng riêng
  selectedSeatsList.innerHTML = seatCodes.map(seatCode => {
    const seat = seatMap[seatCode];
    const seatType = seat ? seat.seat_type || 'NORMAL' : 'NORMAL';
    const seatPrice = seatType === 'VIP' ? basePrice + 30000 : basePrice;
    return `<div class="selected-seat-item">
      <span class="seat-code">${seatCode}</span>
      <span class="seat-type">(${seatType})</span>
      <span class="seat-price">${seatPrice.toLocaleString('vi-VN')} VNĐ</span>
    </div>`;
  }).join('');
  
  totalPriceElement.textContent = totalPrice.toLocaleString('vi-VN') + ' VNĐ';
  
  bookButton.disabled = false;
  bookButton.classList.remove('disabled');
}

async function renderBookingInfo() {
  console.log('🎬 renderBookingInfo called with movieId:', movieId);
  try {
    // Fetch movie data từ API
    console.log('📡 Fetching movie data from API...');
    const response = await fetch(`/api/movies/${movieId}`);
    console.log('📡 API response status:', response.status);
    
    if (response.ok) {
      const movie = await response.json();
      console.log('📡 Movie data received:', movie);
      const posterUrl = movie.poster_url || movie.poster || movie.thumbnail_url || '/static/img/showing_movie1.jpg';
      console.log('🖼️ Setting poster URL:', posterUrl);
      document.getElementById('movie-poster').src = posterUrl;
      document.getElementById('movie-title').textContent = movie.title;
    } else {
      console.log('❌ API response not ok, using fallback');
      // Fallback to static data
      const movie = getMovieById(movieId);
      if (movie) {
        document.getElementById('movie-poster').src = movie.poster_url || movie.poster || movie.thumbnail_url || '/static/img/showing_movie1.jpg';
        document.getElementById('movie-title').textContent = movie.title;
      }
    }
  } catch (error) {
    console.error('❌ Error fetching movie data:', error);
    // Fallback to static data
    const movie = getMovieById(movieId);
    if (movie) {
      document.getElementById('movie-poster').src = movie.poster_url || movie.poster || movie.thumbnail_url || '/static/img/showing_movie1.jpg';
      document.getElementById('movie-title').textContent = movie.title;
    }
  }
}

function updateShowtimeInfo() {
  if (currentShowtime) {
    // Update cinema name
    const cinemaElement = document.getElementById('cinema-name');
    if (cinemaElement) {
      cinemaElement.textContent = currentShowtime.cinema || 'Storia Cinema';
    }
    
    // Update hall name
    const hallElement = document.getElementById('hall-name');
    if (hallElement) {
      hallElement.textContent = currentShowtime.hall || 'Hall 1';
    }
    
    // Update show time
    const timeElement = document.getElementById('show-time');
    if (timeElement) {
      timeElement.textContent = currentShowtime.time || '20:00';
    }
    
    // Update show date (format from YYYY-MM-DD to DD/MM/YYYY)
    const dateElement = document.getElementById('show-date');
    if (dateElement && currentShowtime.date) {
      const date = new Date(currentShowtime.date + 'T00:00:00');
      const formattedDate = date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
      });
      dateElement.textContent = formattedDate;
    }
    

  }
}

document.addEventListener('DOMContentLoaded', function() {
  renderBookingInfo().then(() => {
    checkForCancelledBooking();
  });
  
  // Fetch showtime data first
  fetch(`/api/showtimes/${showtimeId}`)
    .then(res => res.json())
    .then(showtime => {
      currentShowtime = showtime;
      updateShowtimeInfo(); // Update UI with showtime info
      // Then fetch seat list và base_price từ backend
      return fetch(`/api/showtime/${showtimeId}/seats`);
    })
    .then(res => res.json())
    .then(data => {
      seatList = data.seats;
      basePrice = data.base_price;
      seatMap = {};
      seatList.forEach(seat => {
        seatMap[seat.seat_code] = seat;
      });
      
      // Fetch locked seats để hiển thị
      return fetch(`/api/showtime/${showtimeId}/locked-seats`);
    })
    .then(res => res.json())
    .then(lockedData => {
      // Mark locked seats
      if (lockedData.locked_seats) {
        lockedData.locked_seats.forEach(seatCode => {
          const seatElement = document.querySelector(`[data-seat="${seatCode}"]`);
          if (seatElement) {
            seatElement.classList.add('locked');
            seatElement.classList.remove('available');
            seatElement.style.cursor = 'not-allowed';
            seatElement.onclick = null;
          }
        });
      }
      
      renderSeatMap();
    })
    .catch(error => {
      console.error('Error fetching data:', error);
      // Fallback to seat data only
      fetch(`/api/showtime/${showtimeId}/seats`).then(res => res.json()).then(data => {
        seatList = data.seats;
        basePrice = data.base_price;
        seatMap = {};
        seatList.forEach(seat => {
          seatMap[seat.seat_code] = seat;
        });
        renderSeatMap();
      });
    });
  
  document.getElementById('back-btn').onclick = function() {
    window.location.href = `/movie/${movieId}`;
  };
});

// Enhanced auto-cleanup when returning from payment
function checkForCancelledBooking() {
  console.log('🔄 Checking for cancelled booking and cleaning up...');
  
  // Clean up any leftover localStorage data
  localStorage.removeItem('releasedSeats');
  localStorage.removeItem('timeoutInfo');
  localStorage.removeItem('paymentBookingData');
  localStorage.removeItem('bookingSession');
  
  // Check for recent cancellation info
  const recentCancellation = localStorage.getItem('recentCancellation');
  let cancelInfo = null;
  
  if (recentCancellation) {
    try {
      cancelInfo = JSON.parse(recentCancellation);
      console.log('📋 Found recent cancellation info:', cancelInfo);
      localStorage.removeItem('recentCancellation');
    } catch (e) {
      console.warn('⚠️ Invalid cancellation info format');
    }
  }
  
  if (showtimeId) {
    // Step 1: Cancel specific booking if available
    if (cancelInfo && cancelInfo.booking_id) {
      cancelSpecificBooking(cancelInfo.booking_id)
        .then(() => {
          // Step 2: Single refresh after short delay
          setTimeout(() => {
            refreshSeatMap();
          }, 1000);
        })
        .catch(error => {
          console.error('❌ Cleanup error:', error);
          // Still refresh on error
          setTimeout(() => {
            refreshSeatMap();
          }, 1000);
        });
    } else {
      // No specific booking to cancel, just refresh
      setTimeout(() => {
        refreshSeatMap();
      }, 500);
    }
  }
}

// Refresh seat map (simplified)
function refreshSeatMap() {
  if (!showtimeId) {
    return Promise.resolve();
  }
  
  const timestamp = new Date().getTime();
  
  return fetch(`/api/showtime/${showtimeId}/seats?t=${timestamp}`, {
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  })
    .then(res => res.json())
    .then(data => {
      seatList = data.seats;
      basePrice = data.base_price;
      
      // Update seat map
      seatMap = {};
      seatList.forEach(seat => {
        seatMap[seat.seat_code] = seat;
      });
      
      // Re-render seat map
      renderSeatMap();
      
      // Clear selected seats since booking was cancelled
      selectedSeats.clear();
      updateBookingInfo();
      

    })
    .catch(error => {
      console.error('❌ Refresh error:', error);
    });
}



// Cancel specific booking by ID (simplified)
function cancelSpecificBooking(bookingId) {
  if (!bookingId) {
    return Promise.resolve();
  }
  
  const token = localStorage.getItem('token');
  if (!token) {
    return Promise.resolve();
  }
  
  return fetch(`/api/booking/${bookingId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log('✅ Booking cancelled:', data.released_seats);
    }
  })
  .catch(error => {
    console.log('⚠️ Cancel error:', error);
  });
}

// Hàm đặt vé - tạo seat lock và chuyển sang trang payment
async function bookSeats() {
  if (selectedSeats.size === 0) {
    alert('Vui lòng chọn ít nhất một ghế!');
    return;
  }

  // Kiểm tra authentication
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Vui lòng đăng nhập để đặt vé!');
    return;
  }

  // Show loading state
  const bookButton = document.getElementById('book-button');
  const originalText = bookButton.innerHTML;
  bookButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang xử lý...';
  bookButton.disabled = true;

  try {
      // Tạo booking data
  const bookingData = {
    showtime_id: showtimeId,
    movie_id: movieId,
    selected_seats: Array.from(selectedSeats),
    total_amount: selectedSeats.size * basePrice,
    base_price: basePrice,
    seat_map: seatMap,
    cinema: currentShowtime ? currentShowtime.cinema : 'Storia Cinema',
    hall: currentShowtime ? currentShowtime.hall : 'Hall 1',
    date: currentShowtime ? currentShowtime.date : new Date().toISOString().split('T')[0],
    time: currentShowtime ? currentShowtime.time : '20:00',
    booking_started_at: new Date().toISOString() // Thêm timestamp khi booking được tạo
  };

    // 1. Tạo seat lock trước
    const lockResponse = await fetch('/api/seat-locks/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        showtime_id: showtimeId,
        seat_codes: Array.from(selectedSeats),
        booking_data: bookingData
      })
    });

    if (!lockResponse.ok) {
      const errorData = await lockResponse.json();
      if (lockResponse.status === 409) {
        // Ghế đã bị đặt bởi người khác
        alert(`Ghế ${errorData.locked_seats.join(', ')} đã bị đặt bởi người khác. Vui lòng chọn ghế khác!`);
        // Refresh seat map để cập nhật trạng thái
        refreshSeatMap();
      } else {
        alert('Có lỗi xảy ra khi đặt vé: ' + (errorData.error || 'Lỗi không xác định'));
      }
      return;
    }

    const lockData = await lockResponse.json();
    
    // 2. Lưu session_id để release sau
    localStorage.setItem('seatLockSession', lockData.session_id);
    
    // 3. Lưu booking data vào localStorage
    localStorage.setItem('paymentBookingData', JSON.stringify(bookingData));

    // 4. Chuyển sang trang payment
    window.location.href = `/payment?showtime_id=${showtimeId}&movie_id=${movieId}`;

  } catch (error) {
    console.error('Booking error:', error);
    alert('Có lỗi xảy ra khi đặt vé. Vui lòng thử lại.');
  } finally {
    // Restore button state
    bookButton.innerHTML = originalText;
    bookButton.disabled = false;
  }
}