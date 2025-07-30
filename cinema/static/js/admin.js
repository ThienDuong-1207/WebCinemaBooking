/**
 * Admin Dashboard JavaScript
 * Handles system logs display and management
 */

class AdminDashboard {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 20;
        this.currentFilters = {};
        this.init();
    }

    async init() {
        console.log('📊 Initializing Admin Dashboard...');
        await this.loadDashboardStats();
        await this.loadLogsSummary();
        await this.loadRecentLogs();
        this.setupEventListeners();
        console.log('✅ Admin Dashboard initialized');
    }

    setupEventListeners() {
        // Filter controls
        const activityTypeFilter = document.getElementById('activity-type-filter');
        const userRoleFilter = document.getElementById('user-role-filter');
        const successFilter = document.getElementById('success-filter');
        const dateFromFilter = document.getElementById('date-from-filter');
        const dateToFilter = document.getElementById('date-to-filter');
        const searchInput = document.getElementById('log-search-input');

        if (activityTypeFilter) {
            activityTypeFilter.addEventListener('change', () => this.applyFilters());
        }
        if (userRoleFilter) {
            userRoleFilter.addEventListener('change', () => this.applyFilters());
        }
        if (successFilter) {
            successFilter.addEventListener('change', () => this.applyFilters());
        }
        if (dateFromFilter) {
            dateFromFilter.addEventListener('change', () => this.applyFilters());
        }
        if (dateToFilter) {
            dateToFilter.addEventListener('change', () => this.applyFilters());
        }
        if (searchInput) {
            searchInput.addEventListener('input', () => this.applyFilters());
        }

        // Export button
        const exportBtn = document.getElementById('export-logs-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportLogs());
        }

        // Clear filters button
        const clearFiltersBtn = document.getElementById('clear-filters-btn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearFilters());
        }
    }

    async loadDashboardStats() {
        try {
            console.log('📊 Loading dashboard stats...');
            const response = await fetch('/api/admin/dashboard-stats', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('📊 Dashboard stats loaded:', data);
            
            this.updateDashboardCards(data.user_stats);
            this.updateSystemInfo(data.system_info);
            this.renderUserRoleChart(data.role_distribution);
            this.renderUserRegistrationChart(data.registration_by_month);
            this.renderRecentActivity(data.recent_activity);
            
        } catch (error) {
            console.error('❌ Error loading dashboard stats:', error);
            // Show fallback data
            this.updateDashboardCards({
                total_users: 0,
                active_users: 0,
                new_users_month: 0,
                admin_count: 0
            });
        }
    }

    updateDashboardCards(userStats) {
        document.getElementById('total-users').textContent = userStats.total_users || 0;
        document.getElementById('active-users').textContent = userStats.active_users || 0;
        document.getElementById('new-users-month').textContent = userStats.new_users_month || 0;
        document.getElementById('admin-count').textContent = userStats.admin_count || 0;
    }

    updateSystemInfo(systemInfo) {
        document.getElementById('total-movies').textContent = systemInfo.total_movies || 0;
        document.getElementById('total-showtimes').textContent = systemInfo.today_showtimes || 0;
        document.getElementById('total-bookings').textContent = systemInfo.total_bookings || 0;
        document.getElementById('total-revenue').textContent = this.formatCurrency(systemInfo.today_revenue || 0);
    }

    renderUserRoleChart(roleData) {
        const ctx = document.getElementById('user-role-chart');
        if (!ctx) return;

        const labels = roleData.map(item => {
            const roleNames = {
                'admin': 'Admin',
                'manager': 'Manager', 
                'staff': 'Staff',
                'customer': 'Customer'
            };
            return roleNames[item._id] || item._id;
        });
        const values = roleData.map(item => item.count);

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: [
                        '#FF6384',
                        '#36A2EB', 
                        '#FFCE56',
                        '#4BC0C0'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    renderUserRegistrationChart(registrationData) {
        const ctx = document.getElementById('user-registration-chart');
        if (!ctx) return;

        const labels = registrationData.map(item => {
            const date = new Date(item._id + '-01');
            return date.toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' });
        });
        const values = registrationData.map(item => item.count);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Users đăng ký',
                    data: values,
                    borderColor: '#36A2EB',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    renderRecentActivity(activities) {
        const container = document.getElementById('recent-activity-list');
        if (!container) return;

        if (!activities || activities.length === 0) {
            container.innerHTML = '<div class="text-center text-muted">Không có hoạt động gần đây</div>';
            return;
        }

        container.innerHTML = activities.map(activity => {
            const timestamp = new Date(activity.timestamp).toLocaleString('vi-VN');
            const activityText = this.getActivityText(activity);
            
            return `
                <div class="d-flex align-items-center mb-2">
                    <div class="flex-shrink-0">
                        <i class="fas fa-circle text-primary" style="font-size: 8px;"></i>
                    </div>
                    <div class="flex-grow-1 ms-3">
                        <div class="small text-muted">${timestamp}</div>
                        <div>${activityText}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getActivityText(activity) {
        const activityType = activity.activity_type || '';
        const userEmail = activity.user_email || 'Unknown';
        const success = activity.success;
        const errorMessage = activity.error_message;
        
        switch (activityType) {
            case 'login':
                if (success) {
                    return `${userEmail} đã đăng nhập thành công`;
                } else {
                    return `${userEmail} đăng nhập thất bại: ${errorMessage || 'Lỗi không xác định'}`;
                }
            case 'logout':
                return `${userEmail} đã đăng xuất`;
            case 'booking_created':
                return `${userEmail} đã tạo booking mới`;
            case 'payment_success':
                return `${userEmail} đã thanh toán thành công`;
            case 'payment_failed':
                return `${userEmail} thanh toán thất bại: ${errorMessage || 'Lỗi không xác định'}`;
            case 'user_created':
                return `${userEmail} đã tạo user mới`;
            case 'user_updated':
                return `${userEmail} đã cập nhật thông tin user`;
            case 'user_deleted':
                return `${userEmail} đã xóa user`;
            default:
                return `${userEmail} thực hiện ${activityType}`;
        }
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    }

    async loadLogsSummary() {
        try {
            console.log('📊 Loading logs summary...');
            const response = await fetch('/admin/logs/summary', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.updateSummaryDisplay(data.summary);
            console.log('✅ Logs summary loaded');
        } catch (error) {
            console.error('❌ Error loading logs summary:', error);
            this.showError('Không thể tải thống kê logs');
        }
    }

    updateSummaryDisplay(summary) {
        // Update activity type chart
        this.updateActivityChart(summary.activity_stats || []);
        
        // Update user role chart
        this.updateRoleChart(summary.role_stats || []);
    }

    updateActivityChart(activityStats) {
        const ctx = document.getElementById('activity-chart');
        if (!ctx) return;

        const labels = activityStats.map(stat => stat._id || 'Unknown');
        const data = activityStats.map(stat => stat.count || 0);

        if (window.activityChart) {
            window.activityChart.destroy();
        }

        window.activityChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    title: {
                        display: true,
                        text: 'Hoạt động theo loại'
                    }
                }
            }
        });
    }

    updateRoleChart(roleStats) {
        const ctx = document.getElementById('role-chart');
        if (!ctx) return;

        const labels = roleStats.map(stat => stat._id || 'Unknown');
        const data = roleStats.map(stat => stat.count || 0);

        if (window.roleChart) {
            window.roleChart.destroy();
        }

        window.roleChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Số lượng',
                    data: data,
                    backgroundColor: '#36A2EB',
                    borderColor: '#2693E6',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Hoạt động theo vai trò'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    async loadRecentLogs() {
        try {
            console.log('📋 Loading recent logs...');
            const response = await fetch('/admin/logs/recent', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.renderLogsTable(data.logs);
            console.log('✅ Recent logs loaded');
        } catch (error) {
            console.error('❌ Error loading recent logs:', error);
            this.showError('Không thể tải logs gần đây');
        }
    }

    async applyFilters() {
        try {
            console.log('🔍 Applying filters...');
            
            // Build query parameters
            const params = new URLSearchParams();
            
            const activityType = document.getElementById('activity-type-filter')?.value;
            const userRole = document.getElementById('user-role-filter')?.value;
            const success = document.getElementById('success-filter')?.value;
            const dateFrom = document.getElementById('date-from-filter')?.value;
            const dateTo = document.getElementById('date-to-filter')?.value;
            const search = document.getElementById('log-search-input')?.value;

            if (activityType) params.append('activity_type', activityType);
            if (userRole) params.append('user_role', userRole);
            if (success) params.append('success', success);
            if (dateFrom) params.append('start_date', dateFrom);
            if (dateTo) params.append('end_date', dateTo);
            if (search) params.append('user_email', search);

            params.append('limit', this.pageSize);
            params.append('skip', (this.currentPage - 1) * this.pageSize);

            const response = await fetch(`/admin/logs?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.renderLogsTable(data.logs);
            this.updatePagination(data.total);
            console.log('✅ Filters applied');
        } catch (error) {
            console.error('❌ Error applying filters:', error);
            this.showError('Không thể áp dụng bộ lọc');
        }
    }

    renderLogsTable(logs) {
        const tbody = document.getElementById('logs-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!logs || logs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted">
                        Không có logs nào được tìm thấy
                    </td>
                </tr>
            `;
            return;
        }

        logs.forEach(log => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <span class="badge bg-${this.getActivityBadgeColor(log.activity_type)}">
                        ${this.getActivityDisplayName(log.activity_type)}
                    </span>
                </td>
                <td>${log.user_email || 'N/A'}</td>
                <td>
                    <span class="badge bg-${this.getRoleBadgeColor(log.user_role)}">
                        ${this.getRoleDisplayName(log.user_role)}
                    </span>
                </td>
                <td>${this.formatTimestamp(log.timestamp)}</td>
                <td>
                    <span class="badge bg-${log.success ? 'success' : 'danger'}">
                        ${log.success ? 'Thành công' : 'Thất bại'}
                    </span>
                </td>
                <td>${log.ip_address || 'N/A'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-info" 
                            onclick="adminDashboard.showLogDetails('${log._id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    getActivityBadgeColor(activityType) {
        const colors = {
            'login': 'primary',
            'logout': 'secondary',
            'booking': 'success',
            'payment': 'info',
            'admin_action': 'warning',
            'staff_action': 'dark'
        };
        return colors[activityType] || 'light';
    }

    getActivityDisplayName(activityType) {
        const names = {
            'login': 'Đăng nhập',
            'logout': 'Đăng xuất',
            'booking': 'Đặt vé',
            'payment': 'Thanh toán',
            'admin_action': 'Hành động Admin',
            'staff_action': 'Hành động Staff'
        };
        return names[activityType] || activityType;
    }

    getRoleBadgeColor(role) {
        const colors = {
            'admin': 'danger',
            'staff': 'warning',
            'customer': 'primary',
            'manager': 'info'
        };
        return colors[role] || 'light';
    }

    getRoleDisplayName(role) {
        const names = {
            'admin': 'Admin',
            'staff': 'Staff',
            'customer': 'Khách hàng',
            'manager': 'Manager'
        };
        return names[role] || role;
    }

    formatTimestamp(timestamp) {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp);
        return date.toLocaleString('vi-VN');
    }

    updatePagination(total) {
        const pagination = document.getElementById('logs-pagination');
        if (!pagination) return;

        const totalPages = Math.ceil(total / this.pageSize);
        let html = '';

        // Previous button
        html += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="adminDashboard.goToPage(${this.currentPage - 1})">
                    &laquo;
                </a>
            </li>
        `;

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                html += `
                    <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                        <a class="page-link" href="#" onclick="adminDashboard.goToPage(${i})">
                            ${i}
                        </a>
                    </li>
                `;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
        }

        // Next button
        html += `
            <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="adminDashboard.goToPage(${this.currentPage + 1})">
                    &raquo;
                </a>
            </li>
        `;

        pagination.innerHTML = html;
    }

    goToPage(page) {
        if (page < 1) return;
        this.currentPage = page;
        this.applyFilters();
    }

    clearFilters() {
        // Reset all filter inputs
        const filters = [
            'activity-type-filter',
            'user-role-filter',
            'success-filter',
            'date-from-filter',
            'date-to-filter',
            'log-search-input'
        ];

        filters.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.value = '';
            }
        });

        this.currentPage = 1;
        this.applyFilters();
    }

    async exportLogs() {
        try {
            console.log('📤 Exporting logs...');
            const response = await fetch('/admin/logs/export', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Create and download file
            const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: 'application/json'
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `system-logs-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            console.log('✅ Logs exported successfully');
            this.showSuccess('Đã xuất logs thành công');
        } catch (error) {
            console.error('❌ Error exporting logs:', error);
            this.showError('Không thể xuất logs');
        }
    }

    showLogDetails(logId) {
        // Implement log details modal
        console.log('Showing log details for:', logId);
        // TODO: Implement modal to show log details
    }

    showSuccess(message) {
        // Implement success notification
        alert(message);
    }

    showError(message) {
        // Implement error notification
        alert('Lỗi: ' + message);
    }
}

// Initialize admin dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.adminDashboard = new AdminDashboard();
}); 