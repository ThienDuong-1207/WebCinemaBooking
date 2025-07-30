document.addEventListener('DOMContentLoaded', function() {
  checkLoginStatus();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!user.CustomerID) {
    document.getElementById('history-content').innerHTML = '<div class="alert alert-danger">Bạn cần đăng nhập để xem lịch sử!</div>';
    return;
  }
  fetch(`/api/booking-history?customer_id=${user.CustomerID}`)
    .then(res => res.json())
    .then(data => {
      if (data.status === 'success' && data.data.length > 0) {
        renderHistoryTable(data.data);
        window._bookingHistory = data.data; // Lưu lại để show chi tiết
      } else {
        document.getElementById('history-content').innerHTML = '<div class="alert alert-info">Bạn chưa có lịch sử đặt vé nào.</div>';
      }
    });
});

function renderHistoryTable(history) {
  let html = '<table class="table table-bordered"><thead><tr>' +
    '<th>Tên phim</th><th></th></tr></thead><tbody>';
  history.forEach((item, idx) => {
    html += `<tr>
      <td>${item.Movie}</td>
      <td><button class="btn btn-info btn-sm" onclick="showDetail(${idx})">Xem chi tiết</button></td>
    </tr>`;
  });
  html += '</tbody></table>';
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
  const modal = new bootstrap.Modal(document.getElementById('detailModal'));
  modal.show();
} 