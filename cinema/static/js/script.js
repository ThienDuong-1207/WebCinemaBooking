document.addEventListener("DOMContentLoaded", function() {
  var loginModal = document.getElementById("loginModal");
  var registerModal = document.getElementById("registerModal");
  var loginBtn = document.getElementById("loginBtn");
  var registerBtn = document.getElementById("registerBtn");
  var loginClose = document.getElementById("loginClose");
  var registerClose = document.getElementById("registerClose");
  var toLogin = document.getElementById("toLogin");

  // Mở modal đăng nhập từ navbar/menu
  loginBtn && (loginBtn.onclick = function() {
    loginModal.style.display = "block";
  });

  // Đóng modal đăng nhập
  loginClose && (loginClose.onclick = function() {
    loginModal.style.display = "none";
  });

  // Mở modal đăng ký từ nút Register trong modal login
  registerBtn && (registerBtn.onclick = function() {
    loginModal.style.display = "none";
    registerModal.style.display = "block";
  });

  // Đóng modal đăng ký
  registerClose && (registerClose.onclick = function() {
    registerModal.style.display = "none";
  });

  // Quay lại modal đăng nhập từ nút Login trong modal đăng ký
  toLogin && (toLogin.onclick = function(e) {
    e.preventDefault();
    registerModal.style.display = "none";
    loginModal.style.display = "block";
  });

  // Đóng modal khi click ngoài
 // window.onclick = function(event) {
 //   if (event.target == loginModal) loginModal.style.display = "none";
 //   if (event.target == registerModal) registerModal.style.display = "none";
  //}
});


// Toggle show/hide password
function togglePassword(inputId, el) {
  const input = document.getElementById(inputId);
  if (input.type === "password") {
    input.type = "text";
    el.querySelector("img").src = "/static/img/eye-slash.png";
  } else {
    input.type = "password";
    el.querySelector("img").src = "/static/img/eye.png";
  }
}

// Gắn kiểm tra realtime khi người dùng nhập vào ô Retype
var retypeInput = document.getElementById('registerPassword1');
if (retypeInput) {
    retypeInput.addEventListener('input', checkRetypePassword);
}

// Kiểm tra xem mật khẩu nhập lại có khớp với mật khẩu chính hay không
function checkRetypePassword() {
    var pw = document.getElementById('registerPassword').value;
    var retype = document.getElementById('registerPassword1').value;
    var errorDiv = document.getElementById('retypeError');
    if (retype.length > 0 && pw !== retype) {
        errorDiv.textContent = "Passwords do not match!";
    } else {
        errorDiv.textContent = "";
    }
}

// Optionally, nếu muốn kiểm tra lại khi submit:
var registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', function(e){
    var pw = document.getElementById('registerPassword').value;
    var retype = document.getElementById('registerPassword1').value;
    if (pw !== retype) {
        e.preventDefault();
        document.getElementById('retypeError').textContent = "Passwords do not match!";
    }
});
}
