// === QUẢN LÝ PHIM ===
function loadMovies() {
    const token = localStorage.getItem('token');
    fetch('/manager/movies', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(movies => {
        const tbody = document.getElementById('movieTableBody');
        if (!tbody) return;
        if (!movies.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Chưa có phim nào</td></tr>';
            return;
        }
        tbody.innerHTML = movies.map(movie => `
            <tr>
                <td>${movie._id}</td>
                <td>${movie.title}</td>
                <td>${Array.isArray(movie.genres) ? movie.genres.join(', ') : movie.genres}</td>
                <td>${movie.duration} phút</td>
                <td>${movie.release_date}</td>
                <td><span class="badge ${movie.status === 'Active' || movie.status === 'showing' ? 'bg-success' : movie.status === 'Coming Soon' ? 'bg-warning' : 'bg-secondary'}">${movie.status === 'Active' || movie.status === 'showing' ? 'Đang chiếu' : movie.status === 'Coming Soon' ? 'Sắp chiếu' : 'Ngừng chiếu'}</span></td>
                <td><button class="btn btn-sm btn-danger" onclick="deleteMovie('${movie._id}')">Xóa</button></td>
            </tr>
        `).join('');
        console.log('Gọi attachMovieRowClick sau khi render bảng');
        attachMovieRowClick();
    });
}
window.loadMovies = loadMovies;

let editingMovieId = null;

function fillMovieForm(movie) {
  document.getElementById('movie_id').value = movie._id;
  document.getElementById('title').value = movie.title;
  document.getElementById('genres').value = Array.isArray(movie.genres) ? movie.genres.join(', ') : movie.genres;
  document.getElementById('duration').value = movie.duration;
  document.getElementById('release_date').value = movie.release_date;
  document.getElementById('status').value = movie.status;
  document.getElementById('description').value = movie.description;
  document.getElementById('thumbnail_url').value = movie.thumbnail_url || '';
  document.getElementById('poster').value = movie.poster_url || movie.poster || '';
}

function setFormModeEdit(isEdit) {
  const movieIdInput = document.getElementById('movie_id');
  const submitBtn = document.querySelector('#addMovieForm button[type="submit"]');
  if (isEdit) {
    movieIdInput.readOnly = true;
    submitBtn.textContent = 'Cập nhật';
  } else {
    movieIdInput.readOnly = false;
    submitBtn.textContent = 'Thêm phim';
    editingMovieId = null;
  }
}

function attachMovieRowClick() {
  console.log('attachMovieRowClick chạy');
  const tbody = document.getElementById('movieTableBody');
  if (!tbody) return;
  Array.from(tbody.querySelectorAll('tr')).forEach(row => {
    row.onclick = function(e) {
      if (e.target && e.target.tagName === 'BUTTON') return;
      console.log('Row clicked:', this.querySelector('td').textContent);
      const movieId = this.querySelector('td').textContent;
      fetch(`/manager/movies`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
        .then(res => res.json())
        .then(movies => {
          const movie = movies.find(m => m._id === movieId);
          if (movie) {
            fillMovieForm(movie);
            setFormModeEdit(true);
            editingMovieId = movieId;
          }
        });
    };
  });
}

const addMovieForm = document.getElementById('addMovieForm');
if (addMovieForm) {
    addMovieForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const formData = new FormData(this);
        const genresArray = formData.get('genres').split(',').map(g => g.trim()).filter(g => g);
        const movieData = {
            _id: formData.get('movie_id'),
            title: formData.get('title'),
            duration: parseInt(formData.get('duration')),
            genres: genresArray,
            release_date: formData.get('release_date'),
            status: formData.get('status'),
            description: formData.get('description'),
            thumbnail_url: formData.get('thumbnail_url'),
            poster_url: formData.get('poster')
        };
        if (editingMovieId) {
          // Cập nhật phim
          fetch(`/manager/update-movie/${editingMovieId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(movieData)
          })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              alert('Cập nhật phim thành công!');
              this.reset();
              setFormModeEdit(false);
              loadMovies();
            } else {
              alert('Lỗi: ' + (data.message || 'Không rõ lỗi'));
            }
          });
        } else {
          // Thêm phim mới
          fetch('/manager/add-movie', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify(movieData)
          })
          .then(res => res.json())
          .then(data => {
              if (data.success) {
                  alert('Thêm phim thành công!');
                  this.reset();
                  loadMovies();
              } else {
                  alert('Lỗi: ' + (data.message || 'Không rõ lỗi'));
              }
          });
        }
    });
}
// Reset form về chế độ thêm mới khi bấm Xóa form
const resetBtn = document.querySelector('#addMovieForm button[type="reset"]');
if (resetBtn) {
  resetBtn.addEventListener('click', function() {
    setFormModeEdit(false);
    addMovieForm.reset();
  });
}
window.deleteMovie = function(movieId) {
    if (!confirm('Bạn có chắc chắn muốn xóa phim này?')) return;
    const token = localStorage.getItem('token');
    fetch(`/manager/delete-movie/${movieId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('Xóa phim thành công!');
            loadMovies();
        } else {
            alert('Lỗi: ' + (data.message || 'Không rõ lỗi'));
        }
    });
};

// === QUẢN LÝ SUẤT CHIẾU ===
function loadShowtimes() {
    const token = localStorage.getItem('token');
    fetch('/manager/showtimes', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(showtimes => {
        const tbody = document.getElementById('showtimeTableBody');
        if (!tbody) return;
        if (!showtimes.length) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">Chưa có suất chiếu nào</td></tr>';
            return;
        }
        tbody.innerHTML = showtimes.map(st => `
            <tr>
                <td>${st.movie_title || st.movie_id || 'N/A'}</td>
                <td>${st.cinema_name || 'N/A'}</td>
                <td>${st.hall_name || 'N/A'}</td>
                <td>${st.date || 'N/A'}</td>
                <td>${st.time || 'N/A'}</td>
                <td>${st.base_price ? st.base_price.toLocaleString() : 'N/A'} VNĐ</td>
                <td><span class="badge ${st.status === 'active' ? 'bg-success' : 'bg-secondary'}">${st.status === 'active' ? 'Hoạt động' : 'Không khả dụng'}</span></td>
                <td><button class="btn btn-sm btn-danger" onclick="deleteShowtime('${st._id}')">Xóa</button></td>
            </tr>
        `).join('');
    });
}
window.loadShowtimes = loadShowtimes;

const addShowtimeForm = document.getElementById('addShowtimeForm');
if (addShowtimeForm) {
    addShowtimeForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const formData = new FormData(this);
        // Lấy các trường cần thiết từ form, tuỳ chỉnh theo form thực tế
        const showtimeData = {
            movie_id: formData.get('movie_id'),
            hall_id: formData.get('hall_id'),
            cinema_id: formData.get('cinema_id'),
            start_date: formData.get('start_date'),
            end_date: formData.get('end_date'),
            start_time: formData.get('start_time'),
            end_time: formData.get('end_time'),
            base_price: parseInt(formData.get('base_price'))
        };
        fetch('/api/manager/create-showtime', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(showtimeData)
        })
        .then(res => res.json())
        .then(data => {
            if (data.message && data.message.includes('created')) {
                alert('Tạo suất chiếu thành công!');
                this.reset();
                loadShowtimes();
            } else {
                alert('Lỗi: ' + (data.message || 'Không rõ lỗi'));
            }
        });
    });
}
window.deleteShowtime = function(showtimeId) {
    if (!confirm('Bạn có chắc chắn muốn xóa suất chiếu này?')) return;
    const token = localStorage.getItem('token');
    fetch(`/manager/delete-showtime/${showtimeId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('Xóa suất chiếu thành công!');
            loadShowtimes();
        } else {
            alert('Lỗi: ' + (data.message || 'Không rõ lỗi'));
        }
    });
};

function loadMovieOptions() {
  const select = document.getElementById('showtime_movie_id');
  if (!select) return;
  const token = localStorage.getItem('token');
  fetch('/manager/active-movies', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(res => res.json())
  .then(movies => {
    select.innerHTML = '<option value="">Chọn phim...</option>' +
      movies.map(m => `<option value="${m._id}">${m.title}</option>`).join('');
  });
}

document.addEventListener('DOMContentLoaded', loadMovieOptions);

  const chartTypeSelect = document.getElementById('salesChartType');
  const chartCanvas = document.getElementById('salesChart');
  let salesChart = null;

  const cinemaFilterRow = document.getElementById('cinema-filter-row');
  const cinemaFilter = document.getElementById('cinemaFilter');

  function showCinemaFilter(show) {
    if (cinemaFilterRow) cinemaFilterRow.style.display = show ? '' : 'none';
  }

  async function fetchSalesReport(type, cinema) {
    const token = localStorage.getItem('token');
    let url = `/api/manager/sales-report?type=${type}`;
    if (type === 'byHall' && cinema) {
      url += `&cinema=${encodeURIComponent(cinema)}`;
    }
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.ok ? res.json() : [];
  }

  function renderSalesChart(type, data) {
    if (salesChart) salesChart.destroy();

    let labels = [];
    let values = [];
    let chartType = 'bar';
    let chartLabel = '';

    if (type === 'byDay') {
      labels = data.map(item => {
        const date = new Date(item._id);
        return date.toLocaleDateString('vi-VN', { 
          day: '2-digit', 
          month: '2-digit' 
        });
      });
      values = data.map(item => item.total_sales);
      
      // Lấy tháng hiện tại để hiển thị
      const currentDate = new Date();
      const monthName = currentDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
      chartLabel = `Doanh thu theo ngày - ${monthName}`;
      chartType = 'line';
    } else if (type === 'byMovie') {
      labels = data.map(item => item.movie_title);
      values = data.map(item => item.total_sales);
      chartLabel = 'Doanh thu theo phim';
      chartType = 'bar';
    } else if (type === 'byCinema') {
      labels = data.map(item => item._id);
      values = data.map(item => item.total_sales);
      chartLabel = 'Doanh thu theo rạp';
      chartType = 'bar';
    } else if (type === 'byShowtime') {
      labels = data.map(item => item._id || item.time);
      values = data.map(item => item.total_sales);
      chartLabel = 'Doanh thu theo giờ chiếu';
      chartType = 'bar';
    } else if (type === 'byHall') {
      labels = data.map(item => item._id);
      values = data.map(item => item.total_sales);
      chartLabel = 'Doanh thu theo Hall';
      chartType = 'bar';
    }

    salesChart = new Chart(chartCanvas, {
      type: chartType,
      data: {
        labels: labels,
        datasets: [{
          label: chartLabel,
          data: values,
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
          fill: type === 'byDay'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `Doanh thu: ${context.parsed.y.toLocaleString('vi-VN')} VNĐ`;
              }
            }
          }
        },
        scales: {
          x: { 
            title: { display: true, text: (type === 'byDay' ? 'Ngày trong tháng' : (type === 'byMovie' ? 'Phim' : (type === 'byCinema' ? 'Rạp/phòng chiếu' : (type === 'byShowtime' ? 'Giờ chiếu' : 'Hall')))) },
            ticks: {
              maxTicksLimit: type === 'byDay' ? 31 : 10
            }
          },
          y: { 
            title: { display: true, text: 'Doanh thu (VNĐ)' }, 
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return value.toLocaleString('vi-VN') + ' VNĐ';
              }
            }
          }
        }
      }
    });
  }

  async function updateSalesChart() {
    const type = chartTypeSelect.value;
    let cinema = null;
    if (type === 'byHall' && cinemaFilter) {
      cinema = cinemaFilter.value;
    }
    const data = await fetchSalesReport(type, cinema);
    renderSalesChart(type, data);
  }

  if (chartTypeSelect) {
    chartTypeSelect.addEventListener('change', function() {
      const type = chartTypeSelect.value;
      showCinemaFilter(type === 'byHall');
      updateSalesChart();
    });
    updateSalesChart(); // Load chart mặc định khi vào tab
  }
  if (cinemaFilter) {
    cinemaFilter.addEventListener('change', updateSalesChart);
  }

  const movieTab = document.querySelector('[href="#movie-management"]');
  if (movieTab) {
    movieTab.addEventListener('shown.bs.tab', loadMovies);
  }
  if (document.getElementById('movie-management') && document.getElementById('movie-management').classList.contains('active')) {
    loadMovies();
  }

  const showtimeTab = document.querySelector('[href="#showtime-management"]');
  if (showtimeTab) {
    showtimeTab.addEventListener('shown.bs.tab', function() {
      loadShowtimes();
      loadMovieOptions(); // Đảm bảo dropdown phim luôn được cập nhật
    });
  }
  if (document.getElementById('showtime-management') && document.getElementById('showtime-management').classList.contains('active')) {
    loadShowtimes();
  }

// === DASHBOARD WIDGETS ===
function renderDashboardWidgets(stats) {
  document.getElementById('widget-total-movies').textContent = stats.total_movies;
  document.getElementById('widget-showtimes-today').textContent = stats.showtimes_today;
  document.getElementById('widget-revenue-today').textContent = stats.revenue_today.toLocaleString() + ' VNĐ';
  document.getElementById('widget-revenue-month').textContent = stats.revenue_month.toLocaleString() + ' VNĐ';
  document.getElementById('widget-tickets-sold').textContent = stats.tickets_sold;
}

function renderComingSoonList(movies) {
  const ul = document.getElementById('dashboard-comingsoon-list');
  if (!ul) return;
  if (!movies.length) {
    ul.innerHTML = '<li class="list-group-item text-center text-muted">Không có phim sắp chiếu</li>';
    return;
  }
  ul.innerHTML = movies.map(m => {
    // Get the best available poster URL
    let posterUrl = '/static/img/comingsoon_movie1.jpg'; // Default fallback
    
    if (m.poster_url && m.poster_url.startsWith('/static/')) {
        posterUrl = m.poster_url;
    } else if (m.poster && m.poster.startsWith('/static/')) {
        posterUrl = m.poster;
    } else if (m.thumbnail_url && m.thumbnail_url.startsWith('/static/')) {
        posterUrl = m.thumbnail_url;
    }
    
    return `
    <li class="list-group-item d-flex align-items-center">
      <img src="${posterUrl}" alt="" style="width:40px;height:60px;object-fit:cover;margin-right:10px;">
      <div>
        <div class="fw-bold">${m.title}</div>
        <div class="text-muted small">Khởi chiếu: ${m.release_date}</div>
      </div>
    </li>
  `;
  }).join('');
}

let dashboardRevenueChart = null;
function renderDashboardRevenueChart(data) {
  const ctx = document.getElementById('dashboard-revenue-chart');
  if (!ctx) return;
  if (dashboardRevenueChart) dashboardRevenueChart.destroy();

  // Tạo mảng tất cả các ngày trong tháng hiện tại
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const allDays = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    allDays.push(dayStr);
  }
  // Map doanh thu vào từng ngày
  const revenueMap = {};
  (data || []).forEach(item => { revenueMap[item._id] = item.total; });
  const labels = allDays;
  const values = allDays.map(day => revenueMap[day] || 0);

  dashboardRevenueChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Doanh thu theo ngày',
        data: values,
        backgroundColor: 'rgba(54, 162, 235, 0.3)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 2,
        fill: true
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { title: { display: true, text: 'Ngày' } },
        y: { title: { display: true, text: 'Doanh thu (VNĐ)' }, beginAtZero: true }
      }
    }
  });
}

function loadDashboard() {
  const token = localStorage.getItem('token');
  fetch('/manager/dashboard-stats', { headers: { 'Authorization': `Bearer ${token}` } })
    .then(res => res.json())
    .then(stats => {
      renderDashboardWidgets(stats);
      renderComingSoonList(stats.coming_soon_movies);
      // Vẽ chart doanh thu ngày
      renderDashboardRevenueChart(stats.revenue_by_day || []);
    });
}

// Gọi khi vào tab dashboard
const dashboardTab = document.querySelector('[href="#dashboard"]');
if (dashboardTab) {
  dashboardTab.addEventListener('shown.bs.tab', loadDashboard);
}
// Nếu dashboard là tab mặc định khi load trang
if (document.getElementById('dashboard') && document.getElementById('dashboard').classList.contains('active')) {
  loadDashboard();
}

// Manager Dashboard JavaScript
class ManagerDashboard {
    constructor() {
        this.managerToken = localStorage.getItem('authToken') || localStorage.getItem('token');
        this.initializeDashboard();
    }

    async initializeDashboard() {
        try {
            console.log('📊 Initializing manager dashboard...');
            await this.loadDashboardStats();
            await this.loadComingSoonMovies();
        } catch (error) {
            console.error('❌ Error initializing dashboard:', error);
        }
    }

    async loadDashboardStats() {
        try {
            console.log('📊 Loading dashboard stats...');
            
            await this.ensureValidToken();
            
            const response = await fetch('/manager/dashboard-stats', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.managerToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const stats = await response.json();
            console.log('📊 Dashboard stats:', stats);
            
            // Update dashboard widgets
            this.updateDashboardWidgets(stats);
            
        } catch (error) {
            console.error('❌ Error loading dashboard stats:', error);
            // Show fallback values
            this.updateDashboardWidgets({
                total_movies: 0,
                showtimes_today: 0,
                revenue_today: 0,
                tickets_sold: 0,
                revenue_month: 0
            });
        }
    }

    updateDashboardWidgets(stats) {
        // Update total movies
        const totalMoviesElement = document.getElementById('widget-total-movies');
        if (totalMoviesElement) {
            totalMoviesElement.textContent = stats.total_movies || 0;
        }

        // Update showtimes today
        const showtimesTodayElement = document.getElementById('widget-showtimes-today');
        if (showtimesTodayElement) {
            showtimesTodayElement.textContent = stats.showtimes_today || 0;
        }

        // Update revenue today
        const revenueTodayElement = document.getElementById('widget-revenue-today');
        if (revenueTodayElement) {
            const revenue = stats.revenue_today || 0;
            revenueTodayElement.textContent = this.formatCurrency(revenue);
        }

        // Update tickets sold
        const ticketsSoldElement = document.getElementById('widget-tickets-sold');
        if (ticketsSoldElement) {
            ticketsSoldElement.textContent = stats.tickets_sold || 0;
        }

        // Update revenue month
        const revenueMonthElement = document.getElementById('widget-revenue-month');
        if (revenueMonthElement) {
            const revenue = stats.revenue_month || 0;
            revenueMonthElement.textContent = this.formatCurrency(revenue);
        }

        console.log('📊 Dashboard widgets updated successfully');
    }

    async loadComingSoonMovies() {
        try {
            console.log('🎬 Loading coming soon movies...');
            
            await this.ensureValidToken();
            
            const response = await fetch('/manager/dashboard-stats', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.managerToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const stats = await response.json();
            const comingSoonMovies = stats.coming_soon_movies || [];
            
            this.updateComingSoonList(comingSoonMovies);
            
        } catch (error) {
            console.error('❌ Error loading coming soon movies:', error);
            this.updateComingSoonList([]);
        }
    }

    updateComingSoonList(movies) {
        const comingSoonList = document.getElementById('dashboard-comingsoon-list');
        if (!comingSoonList) return;

        if (movies.length === 0) {
            comingSoonList.innerHTML = '<li class="list-group-item text-center text-muted">Không có phim sắp chiếu</li>';
            return;
        }

        comingSoonList.innerHTML = '';
        movies.forEach(movie => {
            const releaseDate = new Date(movie.release_date).toLocaleDateString('vi-VN');
            
            // Get the best available poster URL
            let posterUrl = '/static/img/comingsoon_movie1.jpg'; // Default fallback
            
            if (movie.poster_url && movie.poster_url.startsWith('/static/')) {
                posterUrl = movie.poster_url;
            } else if (movie.poster && movie.poster.startsWith('/static/')) {
                posterUrl = movie.poster;
            } else if (movie.thumbnail_url && movie.thumbnail_url.startsWith('/static/')) {
                posterUrl = movie.thumbnail_url;
            }
            
            const listItem = document.createElement('li');
            listItem.className = 'list-group-item d-flex align-items-center';
            listItem.innerHTML = `
                <div class="flex-shrink-0 me-3">
                    <img src="${posterUrl}" 
                         alt="${movie.title}" 
                         class="rounded" 
                         style="width: 40px; height: 60px; object-fit: cover;">
                </div>
                <div class="flex-grow-1">
                    <h6 class="mb-1">${movie.title}</h6>
                    <small class="text-muted">Khởi chiếu: ${releaseDate}</small>
                </div>
            `;
            comingSoonList.appendChild(listItem);
        });

        console.log('🎬 Coming soon movies updated successfully');
    }

    formatCurrency(amount) {
        if (amount >= 1000000) {
            return `${(amount / 1000000).toFixed(1)}M`;
        } else if (amount >= 1000) {
            return `${(amount / 1000).toFixed(0)}K`;
        } else {
            return amount.toString();
        }
    }

    async ensureValidToken() {
        if (!this.managerToken) {
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
            const response = await fetch('/api/test-auth', {
                headers: {
                    'Authorization': `Bearer ${this.managerToken}`
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
                    email: 'manager1@vlu.vn',
                    password: '123'
                })
            });
            
            const data = await response.json();
            if (data.token) {
                this.managerToken = data.token;
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
}

// Initialize manager dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎬 Manager Dashboard initializing...');
    new ManagerDashboard();
}); 