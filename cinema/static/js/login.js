// Global fetch wrapper to handle server offline
if (!window.originalFetch) {
    window.originalFetch = window.fetch;
    window.fetch = function(...args) {
        return window.originalFetch.apply(this, args)
            .catch(error => {
                // If it's a network error and user is logged in, force logout immediately
                if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                    const token = localStorage.getItem('token');
                    if (token) {
                        console.log('🔌 Server offline detected, force logout immediately...');
                        forceLogout();
                    }
                }
                throw error;
            });
    };
}

// Utility function to parse JWT token and get user role
function parseJWTToken(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error parsing JWT token:', error);
        return null;
    }
}

// Function to redirect user based on their role
function redirectByRole(role) {
    console.log('🔄 Redirecting user with role:', role);
    
    switch(role) {
        case 'staff':
            console.log('👥 Redirecting to staff page');
            window.location.href = '/staff';
            break;
        case 'manager':
            console.log('👔 Redirecting to manager page');
            window.location.href = '/manager';
            break;
        case 'admin':
            console.log('👑 Redirecting to admin page');
            window.location.href = '/admin';
            break;
        case 'customer':
        default:
            console.log('🏠 Staying on homepage for customer');
            // Customer stays on current page
            break;
    }
}

// Hàm đăng nhập
async function loginCustomer(email, password) {
    const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: email,
            password: password
        })
    });

    const result = await response.json();
    return result;
}

// Hàm đăng ký
async function registerCustomer(fullname, email, phone, password, dob, gender) {
    const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            full_name: fullname,
            email: email,
            phone: phone,
            password: password,
            date_of_birth: dob,
            gender: gender
        })
    });

    const result = await response.json();
    return result;
}

// Hàm xử lý khi người dùng nhấn nút đăng nhập
function handleLoginSubmit(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        alert("Vui lòng nhập đầy đủ thông tin!");
        return;
    }
    // Front-end kiểm tra trường trong response, kiểm tra result.token
    loginCustomer(email, password)
        .then(result => {
            if (result.token) {
                // Đăng nhập thành công
                localStorage.setItem('token', result.token);
                localStorage.setItem('user', JSON.stringify(result.user)); // Lưu thông tin user
                
                // Parse token to get user role
                const tokenData = parseJWTToken(result.token);
                const userRole = tokenData ? tokenData.role : (result.user ? result.user.role : 'customer');
                // Nếu là staff, manager hoặc admin thì lưu token vào authToken
                if (['staff', 'manager', 'admin'].includes(userRole)) {
                    localStorage.setItem('authToken', result.token);
                }
                
                console.log('✅ Login successful! User role:', userRole);
                
                // Hide login modal
                document.getElementById('loginModal').style.display = 'none';
                
                // Show user info first
                showUserInfo(result.user);
                
                // Add small delay for better UX, then redirect based on role
                setTimeout(() => {
                    redirectByRole(userRole);
                }, 500); // 500ms delay
                
            } else {
                alert(result.error || "Đăng nhập thất bại!");
            }
        })
        .catch(err => {
            console.error('Login error:', err);
            alert("Có lỗi xảy ra khi đăng nhập!");
        });
}

// Hàm xử lý khi người dùng nhấn nút đăng ký
function handleRegisterSubmit(event) {
    event.preventDefault();
    const fullname = document.getElementById('register-fullname').value;
    const email = document.getElementById('register-email').value;
    const phone = document.getElementById('register-phone').value;
    const password = document.getElementById('registerPassword').value;
    const password1 = document.getElementById('registerPassword1').value;
    const dob = document.getElementById('register-dob').value;

    // Kiểm tra mật khẩu
    if (password !== password1) {
        alert("Mật khẩu nhập lại không khớp!");
        return;
    }

    if (!fullname || !email || !phone || !password || !dob) {
        alert("Vui lòng nhập đầy đủ thông tin!");
        return;
    }

    registerCustomer(fullname, email, phone, password, dob, 'Unknown')
        .then(result => {
            if (result.message === "Registration successful") {
                alert("Đăng ký thành công! Vui lòng đăng nhập.");
                // Đóng modal đăng ký
                document.getElementById('registerModal').style.display = 'none';
                // (Tùy chọn) Chuyển sang modal đăng nhập
                document.getElementById('loginModal').style.display = 'block';
                // (Tùy chọn) Chuyển về trang chủ:
                window.location.href = '/';
            } else {
                alert(result.error || "Đăng ký thất bại!");
            }
        })
        .catch(err => {
            console.error('Register error:', err);
            alert("Có lỗi xảy ra khi đăng ký!");
        });
}

// Hàm hiển thị user info sau khi đăng nhập
function showUserInfo(user) {
    const loginBtn = document.getElementById('loginBtn');
    const userName = document.getElementById('userName');
    const userDropdownWrapper = document.getElementById('userDropdownWrapper');
    if (loginBtn) loginBtn.style.display = 'none';
    if (userName) {
        userName.textContent = user.full_name || user.email || 'User';
        userName.style.display = 'inline-block';
    }
    if (userDropdownWrapper) userDropdownWrapper.style.display = 'inline-block';
}

// Hàm ẩn user info khi đăng xuất
function hideUserInfo() {
    const loginBtn = document.getElementById('loginBtn');
    const userName = document.getElementById('userName');
    const userDropdownWrapper = document.getElementById('userDropdownWrapper');
    if (loginBtn) loginBtn.style.display = 'inline-block';
    if (userName) userName.style.display = 'none';
    if (userDropdownWrapper) userDropdownWrapper.style.display = 'none';
}

// Hàm kiểm tra user đã đăng nhập chưa
function checkLoginStatus() {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (userData && token) {
        try {
            const user = JSON.parse(userData);
            
            // Kiểm tra token có còn hợp lệ không bằng cách gọi API test
            fetch('/api/test-auth', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 5000 // 5 second timeout
            })
            .then(response => {
                if (response.ok) {
                    // Token còn hợp lệ, hiển thị user info
                    showUserInfo(user);
                } else {
                    // Token không hợp lệ (server offline hoặc token expired)
                    console.log('🚪 Token invalid or server offline, logging out...');
                    forceLogout();
                }
            })
            .catch(error => {
                // Lỗi network (server offline), logout user
                console.log('🔌 Server offline, logging out user...', error.message);
                forceLogout();
            });
            
        } catch (e) {
            // JSON parse error
            forceLogout();
        }
    } else {
        hideUserInfo();
    }
}

// Hàm kiểm tra server connection đơn giản
function checkServerConnection() {
    const token = localStorage.getItem('token');
    if (!token) return; // Không cần kiểm tra nếu chưa login
    
    // Gọi API đơn giản để test connection
    fetch('/api/test-auth', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .catch(error => {
        // Nếu có lỗi network, force logout
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            console.log('🔌 Server connection lost, force logout...');
            forceLogout();
        }
    });
}

// Hàm force logout
function forceLogout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    hideUserInfo();
    
    // Nếu đang ở trang employee, chuyển về trang chủ
    if (window.location.pathname.includes('admin') || 
        window.location.pathname.includes('manager') || 
        window.location.pathname.includes('staff')) {
        alert('Mất kết nối server hoặc phiên đăng nhập hết hạn. Bạn sẽ được chuyển về trang chủ.');
        window.location.href = '/';
    }
}

// Hàm hiển thị modal hồ sơ khách hàng
function showProfileModal() {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    if (!userData._id) {
        alert('Không tìm thấy thông tin khách hàng!');
        return;
    }
    // Hiện modal trước (để UX tốt hơn)
    const modalBody = document.getElementById('profileModalBody');
    modalBody.innerHTML = '<div class="text-center text-secondary">Đang tải...</div>';
    const profileModal = new bootstrap.Modal(document.getElementById('profileModal'));
    profileModal.show();

    // Gọi API lấy thông tin khách hàng
    fetch(`/api/view-profile`, {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        }
    })
        .then(res => res.json())
        .then(data => {
            if (data.full_name) { // hoặc kiểm tra data._id
                modalBody.innerHTML = `
                    <ul class="list-group">
                        <li class="list-group-item"><b>Họ tên:</b> ${data.full_name || ''}</li>
                        <li class="list-group-item"><b>Email:</b> ${data.email || ''}</li>
                        <li class="list-group-item"><b>Số điện thoại:</b> ${data.phone || ''}</li>
                        <li class="list-group-item"><b>Ngày tạo:</b> ${data.created_at || ''}</li>
                        <li class="list-group-item"><b>Trạng thái:</b> ${data.is_active ? 'Hoạt động' : 'Khoá'}</li>
                    </ul>
                `;
            } else {
                modalBody.innerHTML = `<div class="text-danger">Không tìm thấy thông tin!</div>`;
            }
        })
        .catch(err => {
            modalBody.innerHTML = `<div class="text-danger">Lỗi khi lấy thông tin: ${err}</div>`;
        });
}

// Thêm event listeners khi trang load
document.addEventListener('DOMContentLoaded', function() {
    // Event listener cho form đăng nhập
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }

    // Event listener cho form đăng ký
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegisterSubmit);
    }
    
    // Kiểm tra trạng thái đăng nhập
    checkLoginStatus();
    
    // Kiểm tra khi window được focus (user quay lại tab)
    window.addEventListener('focus', checkLoginStatus);
    
    // Kiểm tra khi user có bất kỳ tương tác nào (click, scroll, keypress)
    ['click', 'scroll', 'keypress', 'mousemove'].forEach(eventType => {
        document.addEventListener(eventType, function() {
            // Throttle: chỉ kiểm tra 1 lần mỗi 5 giây
            if (!window.lastServerCheck || Date.now() - window.lastServerCheck > 5000) {
                window.lastServerCheck = Date.now();
                checkServerConnection();
            }
        }, { passive: true });
    });
    
    // Event listener cho nút đăng xuất
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            hideUserInfo();
            alert('Đã đăng xuất thành công!');
        });
    }

    const profileLink = document.getElementById('profileLink');
    if (profileLink) {
        profileLink.addEventListener('click', function(e) {
            e.preventDefault();
            showProfileModal();
        });
    }

    const historyLink = document.getElementById('bookingHistoryLink');
    if (historyLink) {
        historyLink.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = '/my-tickets';
        });
    }

    const user = localStorage.getItem('user');
    if (user) {
        showUserInfo(JSON.parse(user));
    }
});

function showBookingHistory() {
    const token = localStorage.getItem('token');
    if (!token) {
        document.getElementById('history-content').innerHTML = '<div class="alert alert-danger">Bạn cần đăng nhập để xem lịch sử!</div>';
        new bootstrap.Modal(document.getElementById('historyModal')).show();
        return;
    }
    fetch(`/api/booking-history`, {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })
    .then(res => res.json())
    .then(data => {
        if (Array.isArray(data) && data.length > 0) {
            renderHistoryTable(data);
            window._bookingHistory = data;
        } else {
            document.getElementById('history-content').innerHTML = '<div class="alert alert-info">Bạn chưa có lịch sử đặt vé nào.</div>';
        }
        new bootstrap.Modal(document.getElementById('historyModal')).show();
    });
}

function renderHistoryTable(history) {
    let html = '<ul class="list-group">';
    history.forEach(item => {
        // Lấy ngày chiếu (chỉ phần yyyy-mm-dd)
        let rawDate = item.show_date || item.created_at || '';
        let dateOnly = rawDate ? rawDate.split('T')[0] : '';
        // Định dạng tổng tiền (nếu có)
        let total = item.total_amount ? item.total_amount.toLocaleString() + 'đ' : '';
        html += `<li class="list-group-item">
            <b>${item.movie_title || item.movie_name || item.movie_id || ''}</b>
            &nbsp;-&nbsp; Số ghế: <b>${item.seats ? item.seats.length : 0}</b>
            &nbsp;-&nbsp; Ngày chiếu: <b>${dateOnly}</b>
            &nbsp;-&nbsp; Tổng tiền: <b>${total}</b>
        </li>`;
    });
    html += '</ul>';
    document.getElementById('history-content').innerHTML = html;
}

window.showDetail = function(idx) {
    const item = window._bookingHistory[idx];
    let html = `<ul class="list-group">
        <li class="list-group-item"><b>Mã đặt vé:</b> ${item.BookingID}</li>
        <li class="list-group-item"><b>Tên phim:</b> ${item.Movie}</li>
        <li class="list-group-item"><b>Ngày chiếu:</b> ${item.ShowDate}</li>
        <li class="list-group-item"><b>Giờ chiếu:</b> ${item.StartTime}</li>
        <li class="list-group-item"><b>Rạp:</b> ${item.Cinema}</li>
        <li class="list-group-item"><b>Ghế:</b> ${item.SeatID}</li>
        <li class="list-group-item"><b>Tổng tiền:</b> ${item.TotalAmount.toLocaleString()}đ</li>
        <li class="list-group-item"><b>Trạng thái đặt vé:</b> ${item.BookingStatus}</li>
        <li class="list-group-item"><b>Trạng thái thanh toán:</b> ${item.PaymentStatus}</li>
    </ul>`;
    document.getElementById('modalDetailBody').innerHTML = html;
    new bootstrap.Modal(document.getElementById('detailModal')).show();
}