// Hàm chuyển đổi YouTube URL sang embed URL
function convertToEmbedUrl(url) {
  if (!url) return '';
  
  // Nếu đã là embed URL thì giữ nguyên
  if (url.includes('youtube.com/embed/')) {
    return url;
  }
  
  // Chuyển đổi từ watch URL sang embed URL
  if (url.includes('youtube.com/watch')) {
    const videoId = url.match(/[?&]v=([^&]+)/);
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId[1]}`;
    }
  }
  
  // Nếu có video ID trực tiếp
  const videoIdMatch = url.match(/youtube\.com\/watch\?v=([^&]+)/);
  if (videoIdMatch) {
    return `https://www.youtube.com/embed/${videoIdMatch[1]}`;
  }
  
  return url; // Fallback
}

// Lấy id phim từ URL path
function getMovieId() {
  if (typeof movieId !== 'undefined' && movieId && movieId !== 'None' && movieId !== '') {
    return movieId;
  }
  const pathParts = window.location.pathname.split('/');
  const idFromPath = pathParts[pathParts.length - 1];
  if (idFromPath && idFromPath !== 'movie') {
    return idFromPath;
  }
  return null;
}

// Lấy thông tin phim từ API
async function getMovieById(id) {
  console.log('🔍 getMovieById called with id:', id);
  
  try {
    console.log('📡 Fetching from API...');
    const response = await fetch(`/api/movies/showing?per_page=100`);
    console.log('📥 Response status:', response.status);
    
    const data = await response.json();
    console.log('📋 API data:', data);
    
    if (data.success && data.movies) {
      console.log('🎬 Looking for movie with id:', id);
      console.log('📽️ Available movies:', data.movies.map(m => ({ id: m.id, title: m.title })));
      
      const movie = data.movies.find(m => m.id === id);
      console.log('🎯 Found movie:', movie);
      
      if (movie) {
        return {
          id: movie.id,
          title: movie.title,
          poster: movie.poster_url,
          genre: movie.genre,
          description: movie.description || 'Không có mô tả.',
          director: movie.director || 'Unknown',
          cast: movie.cast || 'Unknown',
          trailer: convertToEmbedUrl(movie.trailer_url || movie.trailer || '')
        };
      }
    }
  } catch (error) {
    console.error('❌ Error fetching movie:', error);
  }
  
  console.log('🔄 Falling back to hardcoded list...');
  // Fallback to hardcoded list
  return null; // No hardcoded list, so return null
}

async function renderMovieDetail(movie) {
  if (!movie) {
    document.getElementById('movie-detail').innerHTML = `
      <div class="text-center">
        <h2 class="text-danger">Không tìm thấy phim này!</h2>
        <p>Vui lòng kiểm tra lại URL hoặc quay về trang chủ.</p>
        <a href="/" class="btn btn-darkred">← Về trang chủ</a>
      </div>
    `;
    return;
  }
  document.getElementById('movie-detail').innerHTML = `
    <div class="row">
      <div class="col-md-4 text-center">
        <img src="${movie.poster_url || movie.poster || movie.thumbnail_url || '/static/img/showing_movie1.jpg'}" class="img-fluid rounded-3 shadow mb-3" style="max-height:420px" alt="${movie.title}">
        <div class="mt-4">
          <a href="/" class="btn btn-outline-darkred fw-bold px-4">← Về trang chủ</a>
        </div>
      </div>
      <div class="col-md-8">
        <h2 class="fw-bold" style="color:darkred">${movie.title}</h2>
        <ul style="list-style:none;padding-left:0">
          <li><b>Genres:</b> ${Array.isArray(movie.genre) ? movie.genre.join(', ') : movie.genre}</li>
          <li><b>Director:</b> ${movie.director}</li>
          <li><b>Actor:</b> ${Array.isArray(movie.cast) ? movie.cast.join(', ') : movie.cast}</li>
        </ul>
        <div class="mb-4">
          ${movie.trailer ? `<iframe width="100%" height="320" src="${movie.trailer}" frameborder="0" allowfullscreen></iframe>` : ''}
        </div>
      </div>
    </div>
    <div class="movie-detail-bottom container px-0">
      <div class="movie-description mt-5">
        <h2 class="section-title">Nội Dung Phim</h2>
        <div class="movie-desc">${movie.description.replace(/\n/g, '<br>')}</div>
      </div>
    </div>
  `;
}

// Fetch showtimes từ backend
function fetchShowtimes(movieId) {
  return fetch(`/api/movie/${movieId}/showtimes`).then(res => res.json());
}

// Group showtimes theo ngày và cinema
function groupShowtimes(showtimes) {
  const grouped = {};
  showtimes.forEach(st => {
    const date = st.date;
    if (!grouped[date]) grouped[date] = {};
    // Sử dụng cinema_name thay vì cinema
    const cinemaName = st.cinema_name || st.cinema || 'Unknown Cinema';
    if (!grouped[date][cinemaName]) grouped[date][cinemaName] = [];
    grouped[date][cinemaName].push(st);
  });
  return grouped;
}

function renderShowtimeTabs(groupedShowtimes, selectedDate, onDateChange) {
  const dates = Object.keys(groupedShowtimes).sort();
  const container = document.getElementById('showtime-dates');
  container.innerHTML = '';
  dates.forEach(date => {
    const btn = document.createElement('button');
    btn.className = 'btn btn-outline-danger btn-sm' + (date === selectedDate ? ' active' : '');
    // Hiển thị dạng DD/MM
    const d = new Date(date);
    btn.textContent = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    btn.onclick = () => onDateChange(date);
    container.appendChild(btn);
  });
}

function renderCinemaFilter(groupedShowtimes, selectedDate, selectedCinema, onCinemaChange) {
  const select = document.getElementById('cinema-filter');
  const cinemas = selectedDate ? Object.keys(groupedShowtimes[selectedDate]) : [];
  select.innerHTML = `<option value="all">Tất cả Cinemas</option>`;
  cinemas.forEach(cinema => {
    const opt = document.createElement('option');
    opt.value = cinema;
    opt.textContent = cinema;
    if (cinema === selectedCinema) opt.selected = true;
    select.appendChild(opt);
  });
  select.onchange = () => onCinemaChange(select.value);
}

function renderShowtimeList(groupedShowtimes, selectedDate, selectedCinema) {
  const container = document.getElementById('showtime-list');
  container.innerHTML = '';
  if (!selectedDate || !groupedShowtimes[selectedDate]) {
    container.innerHTML = '<div class="text-muted">Không có suất chiếu cho ngày này.</div>';
    return;
  }
  const cinemas = Object.keys(groupedShowtimes[selectedDate]);
  cinemas.forEach(cinema => {
    if (selectedCinema !== 'all' && cinema !== selectedCinema) return;
    const showtimes = groupedShowtimes[selectedDate][cinema];
    const cinemaDiv = document.createElement('div');
    cinemaDiv.className = 'mb-3';
    cinemaDiv.innerHTML = `<div class="fw-bold mb-1">${cinema}</div>`;
    showtimes.forEach(st => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-outline-darkred btn-sm me-2 mb-2';
      btn.textContent = st.time; // Chỉ hiện giờ, không hiện Hall
      btn.onclick = () => {
        // Chuyển hướng sang trang đặt ghế với movie_id và showtime_id
        window.location.href = `/booking?movie_id=${getMovieId()}&showtime_id=${st._id}`;
      };
      cinemaDiv.appendChild(btn);
    });
    container.appendChild(cinemaDiv);
  });
}

// Initialize page
async function init() {
  console.log('🔍 Initializing movie detail page...');
  const movieId = getMovieId();
  console.log('🎬 Movie ID:', movieId);
  
  if (!movieId) {
    console.log('❌ No movie ID found');
    renderMovieDetail(null);
    return;
  }
  
  console.log('🔍 Fetching movie data...');
  const movie = await getMovieById(movieId);
  console.log('📽️ Movie data:', movie);
  
  await renderMovieDetail(movie);
  
  // Load showtimes
  try {
    console.log('🔍 Fetching showtimes...');
    const showtimes = await fetchShowtimes(movieId);
    console.log('🎭 Showtimes:', showtimes);
    
    const groupedShowtimes = groupShowtimes(showtimes);
    const dates = Object.keys(groupedShowtimes).sort();
    
    if (dates.length > 0) {
      const selectedDate = dates[0];
      const selectedCinema = 'all';
      
      renderShowtimeTabs(groupedShowtimes, selectedDate, (newDate) => {
        renderCinemaFilter(groupedShowtimes, newDate, selectedCinema, (newCinema) => {
          renderShowtimeList(groupedShowtimes, newDate, newCinema);
        });
        renderShowtimeList(groupedShowtimes, newDate, selectedCinema);
      });
      
      renderCinemaFilter(groupedShowtimes, selectedDate, selectedCinema, (newCinema) => {
        renderShowtimeList(groupedShowtimes, selectedDate, newCinema);
      });
      
      renderShowtimeList(groupedShowtimes, selectedDate, selectedCinema);
    } else {
      document.getElementById('showtime-list').innerHTML = '<p class="text-muted">Không có suất chiếu cho phim này.</p>';
    }
  } catch (error) {
    console.error('❌ Error loading showtimes:', error);
    document.getElementById('showtime-list').innerHTML = '<p class="text-muted">Không thể tải lịch chiếu.</p>';
  }
}

// Khi trang load
document.addEventListener("DOMContentLoaded", function() {
  console.log('🚀 DOM loaded, starting init...');
  try {
    init();
  } catch (error) {
    console.error('❌ Error in init:', error);
    // Fallback: hiển thị thông báo lỗi
    document.getElementById('movie-detail').innerHTML = `
      <div class="alert alert-warning">
        <h4>Có lỗi xảy ra khi tải thông tin phim</h4>
        <p>Vui lòng thử lại hoặc liên hệ hỗ trợ.</p>
        <a href="/" class="btn btn-darkred">← Về trang chủ</a>
      </div>
    `;
  }
});

// Test function
function testFunction() {
  console.log('✅ JavaScript is working!');
  return true;
}
