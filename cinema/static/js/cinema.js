// cinema.js - Xử lý logic cho trang cinema

let currentCity = 'Hồ Chí Minh';
let currentCinema = 'storia_sg';
let backgroundIndex = 0;
const backgrounds = [
    '/static/img/storia_cinema_1.jpg',
    '/static/img/storia_cinema_2.jpg'
];

// Chuyển đổi background mỗi 4 giây
function startBackgroundRotation() {
    setInterval(() => {
        backgroundIndex = (backgroundIndex + 1) % backgrounds.length;
        updateBackground();
    }, 4000);
}

function updateBackground() {
    const hero = document.querySelector('.cinema-hero');
    if (hero) {
        hero.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('${backgrounds[backgroundIndex]}')`;
    }
}

// Khởi tạo dropdown thành phố
function initCityDropdown() {
    const citySelect = document.getElementById('city-select');
    if (citySelect) {
        citySelect.innerHTML = `
            <option value="Hồ Chí Minh" selected>Hồ Chí Minh</option>
            <option value="Hà Nội">Hà Nội</option>
        `;
        
        citySelect.addEventListener('change', function() {
            currentCity = this.value;
            updateCinemaDropdown();
            loadCinemaData();
        });
    }
}

// Cập nhật dropdown cinema dựa trên thành phố
function updateCinemaDropdown() {
    const cinemaSelect = document.getElementById('cinema-select');
    if (cinemaSelect) {
        if (currentCity === 'Hồ Chí Minh') {
            cinemaSelect.innerHTML = `
                <option value="storia_sg" selected>Storia Sài Gòn</option>
            `;
            currentCinema = 'storia_sg';
        } else if (currentCity === 'Hà Nội') {
            cinemaSelect.innerHTML = `
                <option value="storia_hn" selected>Storia Hà Nội</option>
            `;
            currentCinema = 'storia_hn';
        }
        
        cinemaSelect.addEventListener('change', function() {
            currentCinema = this.value;
            loadCinemaData();
        });
    }
}

// Tải dữ liệu cinema từ API
async function loadCinemaData() {
    try {
        // Lấy thông tin cinema chi tiết
        const response = await fetch(`/api/cinema/${currentCinema}`);
        const cinema = await response.json();
        
        if (cinema) {
            updateCinemaInfo(cinema);
            updateLocationInfo(cinema);
        }
        
        // Lấy showtimes cho cinema này
        const showtimesResponse = await fetch(`/api/cinema/${currentCinema}/showtimes`);
        const showtimesData = await showtimesResponse.json();
        updateDateTabs(showtimesData);
        
        // Lấy movies cho cinema này
        const moviesResponse = await fetch(`/api/cinema/${currentCinema}/movies`);
        const movies = await moviesResponse.json();
        renderCinemaMovies(movies);
        
    } catch (error) {
        console.error('Error loading cinema data:', error);
    }
}

// Cập nhật thông tin cinema
function updateCinemaInfo(cinema) {
    const heroTitle = document.querySelector('.cinema-hero h1');
    const heroSubtitle = document.querySelector('.cinema-hero p');
    const cinemaName = document.querySelector('.cinema-name');
    const cinemaAddress = document.querySelector('.cinema-address');
    const cinemaPhone = document.querySelector('.cinema-phone');
    
    if (heroTitle) heroTitle.textContent = cinema.name;
    if (heroSubtitle) heroSubtitle.textContent = 'Trải nghiệm xem phim đẳng cấp quốc tế';
    if (cinemaName) cinemaName.textContent = cinema.name;
    if (cinemaAddress) cinemaAddress.innerHTML = `<i class="fas fa-map-marker-alt me-2"></i><strong>Địa chỉ:</strong> ${cinema.address}`;
    if (cinemaPhone) cinemaPhone.innerHTML = `<i class="fas fa-phone me-2"></i><strong>Hotline:</strong> ${cinema.phone}`;
}

// Cập nhật thông tin location
function updateLocationInfo(cinema) {
    const locationAddress = document.querySelector('.location-address');
    const locationPhone = document.querySelector('.location-phone');
    const cinemaDescription = document.querySelector('.cinema-description');
    
    if (locationAddress) locationAddress.innerHTML = `<i class="fas fa-map-marker-alt me-2"></i><strong>Địa chỉ:</strong> ${cinema.address}`;
    if (locationPhone) locationPhone.innerHTML = `<i class="fas fa-phone me-2"></i><strong>Số điện thoại:</strong> ${cinema.phone}`;
    if (cinemaDescription) cinemaDescription.innerHTML = `<p><strong>${cinema.name}</strong> ${cinema.description}</p>`;
    
    // Cập nhật map dựa trên cinema
    updateMap(cinema);
}

// Cập nhật map
function updateMap(cinema) {
    const mapContainer = document.querySelector('.map-container');
    if (!mapContainer) return;
    
    if (cinema && cinema.map_url) {
        // Sử dụng Google Maps embed
        mapContainer.innerHTML = `
            <iframe 
                src="${cinema.map_url}"
                width="100%" 
                height="300" 
                style="border:0; border-radius: 8px;" 
                allowfullscreen="" 
                loading="lazy" 
                referrerpolicy="no-referrer-when-downgrade">
            </iframe>
        `;
    } else {
        // Fallback với placeholder
        mapContainer.innerHTML = `
            <div style="width: 100%; height: 300px; border-radius: 8px; background: #f8f9fa; display: flex; align-items: center; justify-content: center; border: 2px dashed #dee2e6;">
                <div class="text-center text-muted">
                    <i class="fas fa-map-marker-alt fa-3x mb-3"></i>
                    <h5>${cinema ? cinema.name : 'Cinema'}</h5>
                    <p class="mb-0">${cinema ? cinema.address : 'Address not available'}</p>
                </div>
            </div>
        `;
    }
}

// Cập nhật date tabs
function updateDateTabs(showtimes) {
    const dateTabsContainer = document.querySelector('.date-tabs');
    if (!dateTabsContainer || !Array.isArray(showtimes)) return;
    // Lấy danh sách ngày duy nhất từ showtimes
    const uniqueDates = [...new Set(showtimes.map(st => st.date))].filter(Boolean);
        dateTabsContainer.innerHTML = '';
    uniqueDates.forEach((date, index) => {
            const tab = document.createElement('a');
            tab.href = '#';
            tab.className = `date-tab ${index === 0 ? 'active' : ''}`;
        // Hiển thị ngày dạng đẹp
        const dateObj = new Date(date);
        const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        const dayName = dayNames[dateObj.getDay()];
        const formattedDate = dateObj.toLocaleDateString('vi-VN');
        tab.textContent = `${dayName} ${formattedDate}`;
        tab.dataset.date = date;
            tab.addEventListener('click', function(e) {
                e.preventDefault();
                document.querySelectorAll('.date-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                // Có thể load showtimes cho ngày này
            console.log('Selected date:', date);
            });
            dateTabsContainer.appendChild(tab);
        });
}

// Hiển thị showtimes cho movie cụ thể
async function showMovieShowtimes(movieId) {
    try {
        // Lấy thông tin movie
        const movieResponse = await fetch(`/api/movies`);
        const movies = await movieResponse.json();
        const movie = movies.find(m => m._id === movieId);
        
        // Lấy showtimes cho movie này tại cinema hiện tại
        const response = await fetch(`/api/movie/${movieId}/showtimes`);
        const showtimes = await response.json();
        
        // Lọc showtimes theo cinema hiện tại
        const cinemaName = currentCinema === 'storia_sg' ? 'Storia Sài Gòn' : 'Storia Hà Nội';
        const filteredShowtimes = showtimes.filter(st => st.cinema === cinemaName);
        
        // Nhóm showtimes theo ngày
        const groupedShowtimes = groupShowtimesByDate(filteredShowtimes);
        
        // Hiển thị modal với showtimes
        showShowtimesModal(movieId, groupedShowtimes, movie);
        
    } catch (error) {
        console.error('Error loading showtimes:', error);
    }
}

// Nhóm showtimes theo ngày
function groupShowtimesByDate(showtimes) {
    const grouped = {};
    showtimes.forEach(st => {
        const date = st.date;
        if (!grouped[date]) {
            grouped[date] = [];
        }
        grouped[date].push(st);
    });
    return grouped;
}

// Hiển thị modal với showtimes
function showShowtimesModal(movieId, groupedShowtimes, movie) {
    const movieTitle = movie ? movie.title : 'Phim';
    const cinemaName = currentCinema === 'storia_sg' ? 'Storia Sài Gòn' : 'Storia Hà Nội';
    
    // Tạo modal HTML
    const modalHTML = `
        <div id="showtimes-modal" class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Chọn suất chiếu</h3>
                    <button class="close-btn" onclick="closeShowtimesModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="movie-info-modal">
                        <h4>${movieTitle}</h4>
                        <p class="cinema-name">${cinemaName}</p>
                    </div>
                    <div id="showtimes-container">
                        ${generateShowtimesHTML(groupedShowtimes)}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Thêm modal vào body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Thêm event listeners cho các nút showtime
    document.querySelectorAll('.showtime-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const showtimeId = this.dataset.showtimeId;
            const movieId = this.dataset.movieId;
            window.location.href = `/booking?movie_id=${movieId}&showtime_id=${showtimeId}`;
        });
    });
    
    // Thêm event listener để đóng modal khi click bên ngoài
    const modal = document.getElementById('showtimes-modal');
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeShowtimesModal();
        }
    });
    
    // Thêm event listener để đóng modal bằng phím ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeShowtimesModal();
        }
    });
}

// Tạo HTML cho showtimes
function generateShowtimesHTML(groupedShowtimes) {
    let html = '';
    
    if (Object.keys(groupedShowtimes).length === 0) {
        return `
            <div class="no-showtimes">
                <p>Không có suất chiếu nào cho phim này tại rạp hiện tại.</p>
            </div>
        `;
    }
    
    Object.keys(groupedShowtimes).forEach(date => {
        const showtimes = groupedShowtimes[date];
        const dateObj = new Date(date);
        const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        const dayName = dayNames[dateObj.getDay()];
        const formattedDate = dateObj.toLocaleDateString('vi-VN');
        
        html += `
            <div class="date-section">
                <h4>${dayName} ${formattedDate}</h4>
                <div class="showtimes-grid">
                    ${showtimes.map(st => `
                        <button class="showtime-btn" 
                                data-showtime-id="${st._id}" 
                                data-movie-id="${st.movie_id}">
                            ${st.time}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    });
    
    return html;
}

// Đóng modal
function closeShowtimesModal() {
    const modal = document.getElementById('showtimes-modal');
    if (modal) {
        modal.remove();
    }
    
    // Xóa event listener cho phím ESC
    document.removeEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeShowtimesModal();
        }
    });
}

// Lấy poster URL cho movie
function getMoviePosterUrl(movieId) {
    // Xóa mapping posterMapping tĩnh
}

// Hiển thị danh sách phim cho rạp
function renderCinemaMovies(movies) {
  const list = document.getElementById('cinema-movie-list');
  if (!list) return;
  list.innerHTML = '';
  movies.forEach(movie => {
    const col = document.createElement('div');
    col.className = 'col-12 col-md-6'; // 2 card/hàng ở md trở lên
    col.innerHTML = `
      <div class="card movie-card h-100 shadow">
        <img src="${movie.poster_url || movie.poster || movie.thumbnail_url || '/static/img/showing_movie1.jpg'}" class="card-img-top" alt="${movie.title}">
        <div class="card-body d-flex flex-column">
          <h5 class="card-title fw-bold mb-1">${movie.title}</h5>
          <div class="d-flex gap-2 mt-auto">
            <a href="/movie/${movie._id}" class="btn btn-darkred flex-fill rounded-pill fw-bold py-2">Chi tiết</a>
          </div>
        </div>
      </div>
    `;
    list.appendChild(col);
  });
}

// Khởi tạo trang
document.addEventListener('DOMContentLoaded', function() {
    startBackgroundRotation();
    initCityDropdown();
    updateCinemaDropdown();
    loadCinemaData();
    console.log('Cinema page loaded!');
    // Fetch phim đang chiếu
    fetch('/api/movies?status=Active')
      .then(res => res.json())
      .then(data => {
        renderCinemaMovies(data.movies || []);
      });
}); 