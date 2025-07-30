document.addEventListener('DOMContentLoaded', function() {
  const genreSelect = document.getElementById('filter-genre') || document.getElementById('genre-select');
  const countrySelect = document.getElementById('filter-country') || document.getElementById('country-select');
  const yearSelect = document.getElementById('filter-year') || document.getElementById('year-select');
  const statusSelect = document.getElementById('filter-status') || document.getElementById('status-select');
  const sortSelect = document.getElementById('filter-sort') || document.getElementById('sort-select');
  const paginationDiv = document.getElementById('pagination');
  let currentPage = 1;
  let totalPages = 1;
  const MOVIES_PER_PAGE = 6;

  // Fetch filter options (nếu có filter)
  if (genreSelect) {
    fetch('/api/genres').then(res => res.json()).then(genres => {
        genres.forEach(g => {
          const opt = document.createElement('option');
          opt.value = g.id;
          opt.textContent = g.name;
        genreSelect.appendChild(opt);
      });
    });
  }
  if (countrySelect) {
    const countries = ['Việt Nam', 'Mỹ', 'Hàn Quốc', 'Nhật Bản', 'Trung Quốc', 'Anh', 'Pháp'];
    countries.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      countrySelect.appendChild(opt);
        });
  }
  if (yearSelect) {
    const thisYear = new Date().getFullYear();
    for (let y = thisYear; y >= 2000; y--) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      yearSelect.appendChild(opt);
    }
  }

  // Cột trái: render phim sắp chiếu
  function fetchAndRenderComingSoon(page = 1) {
    const params = new URLSearchParams();
    params.append('status', 'Coming Soon');
    params.append('page', page);
    params.append('limit', MOVIES_PER_PAGE);
    if (genreSelect && genreSelect.value) params.append('genre', genreSelect.value);
    if (countrySelect && countrySelect.value) params.append('country', countrySelect.value);
    if (yearSelect && yearSelect.value) params.append('year', yearSelect.value);
    fetch('/api/movies?' + params.toString())
      .then(res => res.json())
      .then(data => {
        renderMovies(data.movies || []);
        renderPagination(data.page || 1, data.totalPages || 1, fetchAndRenderComingSoon);
      });
  }
  if (document.getElementById('filter-apply')) {
    document.getElementById('filter-apply').addEventListener('click', function() { fetchAndRenderComingSoon(1); });
  }
  // fetchAndRenderComingSoon(); // Bỏ gọi hàm này khi load trang
  fetchAndRenderMovies();

  function fetchAndRenderMovies(page = 1) {
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('limit', MOVIES_PER_PAGE);
    // Không filter status để lấy tất cả phim
    if (genreSelect && genreSelect.value) params.append('genre', genreSelect.value);
    if (countrySelect && countrySelect.value) params.append('country', countrySelect.value);
    if (yearSelect && yearSelect.value) params.append('year', yearSelect.value);
    if (statusSelect && statusSelect.value) params.append('status', statusSelect.value); // Cho phép filter nếu chọn
    if (sortSelect && sortSelect.value) params.append('sort', sortSelect.value);
    fetch('/api/movies?' + params.toString())
        .then(res => res.json())
      .then(data => {
        console.log('API /api/movies response:', data);
        if (Array.isArray(data)) {
          renderMovies(data);
          // Không có phân trang nếu backend không trả về page/totalPages
        } else {
          renderMovies(data.movies || []);
          renderPagination(data.page || 1, data.totalPages || 1, fetchAndRenderMovies);
        }
      });
  }

  if (document.getElementById('filter-apply')) {
    document.getElementById('filter-apply').addEventListener('click', function() { fetchAndRenderMovies(1); });
  }
  // fetchAndRenderMovies(); // Bỏ gọi hàm này khi load trang

    function renderMovies(movies) {
      const movieList = document.getElementById('movie-list');
      movieList.innerHTML = '';
      if (!movies.length) {
        movieList.innerHTML = '<div class="text-center text-muted mt-5" style="font-size:1.2rem;">Không tìm thấy phim nào!</div>';
        return;
      }
    movies.forEach(movie => {
      const row = document.createElement('div');
      row.className = 'd-flex mb-4 pb-3 border-bottom';
      row.innerHTML = `
        <img src="${movie.poster_url || movie.poster || '/static/img/comingsoon_movie1.jpg'}" style="width:220px; height:130px; object-fit:cover; border-radius:12px; box-shadow:0 2px 12px rgba(30,0,0,0.08);" class="me-4" alt="${movie.title}">
          <div class="flex-grow-1">
            <div class="d-flex align-items-center mb-1">
              <h5 class="mb-0" style="color:#1976d2; font-weight:700;">${movie.title}</h5>
            </div>
            <div class="d-flex align-items-center gap-2 mb-2">
              <button class="btn btn-primary btn-sm btn-like" style="font-weight:600;"><i class="fa fa-thumbs-up"></i> Thích</button>
              <span class="text-muted" style="font-size:0.97rem;"><i class="fa fa-eye"></i> ${movie.views || 0}</span>
            </div>
            <div style="color:#222; font-size:0.98rem; line-height:1.5; max-width:95%;">${movie.description || ''}</div>
          </div>
        `;
        setTimeout(() => {
        const btnLike = row.querySelector('.btn-like');
          btnLike.addEventListener('click', function() {
            this.classList.toggle('btn-success');
            this.classList.toggle('btn-primary');
          });
        }, 0);
      movieList.appendChild(row);
    });
  }

  // Cột phải: render phim đang chiếu
  function fetchAndRenderComingSoonMovies() {
    fetch('/api/movies?status=Coming Soon&limit=4')
      .then(res => res.json())
      .then(data => {
        const rightCol = document.querySelector('.col-md-4');
        if (!rightCol) return;
        const comingSoonList = document.createElement('div');
        comingSoonList.innerHTML = '<h5 class="mb-3 section-title red">COMING SOON</h5>';
        (Array.isArray(data) ? data : data.movies || []).slice(0, 4).forEach(movie => {
          const card = document.createElement('div');
          card.className = 'card movie-card mb-3';
          card.innerHTML = `
            <img src="${movie.poster_url || movie.poster || '/static/img/comingsoon_movie1.jpg'}" class="card-img-top" alt="${movie.title}">
            <div class="card-body">
              <h6 class="card-title" style="color:#8B0000; font-weight:700;">${movie.title}</h6>
              <div class="d-flex align-items-center mb-2">
                <span class="badge bg-warning text-dark me-2">${movie.age_rating || 'K'}</span>
                <span class="me-2"><i class="fa fa-star text-warning"></i> ${movie.rating || '9.0'}</span>
                <span class="text-muted">${movie.release_date || ''}</span>
              </div>
              <p class="card-text">${movie.description || ''}</p>
            </div>
          `;
          comingSoonList.appendChild(card);
        });
        rightCol.innerHTML = '';
        rightCol.appendChild(comingSoonList);
      });
  }
  fetchAndRenderComingSoonMovies();

  function renderPagination(page, totalPages, fetchPageFn) {
    if (!paginationDiv) return;
    paginationDiv.innerHTML = '';
    if (totalPages <= 1) return;
    const createBtn = (label, p, active = false, disabled = false) => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-sm mx-1 ' + (active ? 'btn-warning' : 'btn-outline-secondary');
      btn.textContent = label;
      btn.disabled = disabled;
      btn.onclick = () => fetchPageFn(p);
      return btn;
    };
    // First & Prev
    paginationDiv.appendChild(createBtn('«', 1, false, page === 1));
    paginationDiv.appendChild(createBtn('<', page - 1, false, page === 1));
    // Pages
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, page + 2);
    if (page <= 3) end = Math.min(5, totalPages);
    if (page >= totalPages - 2) start = Math.max(1, totalPages - 4);
    for (let i = start; i <= end; i++) {
      paginationDiv.appendChild(createBtn(i, i, i === page));
    }
    if (end < totalPages - 1) {
      const dots = document.createElement('span');
      dots.textContent = '...';
      dots.className = 'mx-2';
      paginationDiv.appendChild(dots);
    }
    if (end < totalPages) {
      paginationDiv.appendChild(createBtn(totalPages, totalPages, page === totalPages));
        }
    // Next & Last
    paginationDiv.appendChild(createBtn('>', page + 1, false, page === totalPages));
    paginationDiv.appendChild(createBtn('»', totalPages, false, page === totalPages));
    }
  });