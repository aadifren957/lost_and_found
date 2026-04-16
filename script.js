// Sample Data for Recently Found Items
const items = [
    { title: "Black Wallet", img: "https://via.placeholder.com/200" },
    { title: "Calculator", img: "https://via.placeholder.com/200" },
    { title: "Water Bottle", img: "https://via.placeholder.com/200" },
    { title: "ID Card", img: "https://via.placeholder.com/200" }
];

const BASE_URL = CONFIG.BASE_URL; 


document.getElementById("googleLoginBtn")?.addEventListener("click", () => {
    window.location.href = `${BASE_URL}/api/auth/google`;
});

// 🔐 ADD THIS HERE
function getAuthHeaders() {
    const token = localStorage.getItem("token");

    return {
        Authorization: `Bearer ${token}`
    };
}

// 🔥 HANDLE GOOGLE AUTH TOKEN IN URL
async function handleGoogleAuth() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");

    if (token) {
        localStorage.setItem("token", token);
        
        // Remove token from URL to keep it clean
        const newUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);

        try {
            // Fetch user profile after Google login
            const response = await fetch(`${BASE_URL}/api/auth/profile`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const userData = await response.json();
            
            if (response.ok) {
                localStorage.setItem("user", JSON.stringify({
                    name: userData.name,
                    email: userData.email,
                    role: userData.role,
                    profilePic: userData.profilePic
                }));
                checkUserLogin();
                
            }
        } catch (error) {
            console.error("Error fetching Google profile:", error);
        }
    }
}
handleGoogleAuth();
// Helper for Toast Notifications
function showToast(message, duration = 3000) {
    const toast = document.getElementById("toast");
    if (toast) {
        toast.textContent = message;
        toast.classList.add("show");
        setTimeout(() => {
            toast.classList.remove("show");
        }, duration);
    } else {
        alert(message); // Fallback for browsers without toast support
    }
}

// Helper for Mobile Navigation
document.addEventListener("DOMContentLoaded", function () {
    const hamburger = document.getElementById("hamburger");
    const nav = document.querySelector(".nav");
    const dropdowns = document.querySelectorAll(".dropdown");

    if (hamburger && nav) {
        hamburger.addEventListener("click", function () {
            hamburger.classList.toggle("active");
            nav.classList.toggle("active");
        });

        // Close menu when clicking a link (mobile)
        nav.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                hamburger.classList.remove("active");
                nav.classList.remove("active");
            });
        });

        // Handle mobile dropdowns
        dropdowns.forEach(dropdown => {
            const btn = dropdown.querySelector(".dropbtn");
            if (btn) {
                btn.addEventListener("click", function (e) {
                    if (window.innerWidth <= 768) {
                        e.preventDefault();
                        dropdown.classList.toggle("active");
                    }
                });
            }
        });

        // Close menu when clicking outside
        document.addEventListener("click", function (e) {
            if (!nav.contains(e.target) && !hamburger.contains(e.target)) {
                hamburger.classList.remove("active");
                nav.classList.remove("active");
            }
        });
    }

    const grid = document.getElementById("itemGrid");

    if (grid) {
        grid.innerHTML = ""; // Clear existing
        items.forEach(item => {
            const card = document.createElement("div");
            card.className = "item-card glass";

            card.innerHTML = `
                <img src="${item.img}" alt="${item.title}">
                <p>${item.title}</p>
            `;

            grid.appendChild(card);
        });
    }
});

function searchItems() {
    const text = document.getElementById("searchInput").value;
    if (!isUserLoggedIn()) {
        showToast("Please Login to search your lost Item");
        return;
    }
    if (text) {
        showToast("🔍 Searching for: " + text);
    } else {
        showToast("Please enter a search term");
    }
}

// SEARCH SUGGESTIONS LOGIC
let myLostItemsCache = null;

async function fetchMyItemsForSuggestions() {
    if (myLostItemsCache) return myLostItemsCache;
    try {
        const res = await fetch(`${BASE_URL}/api/lost/mine`, {
            headers: getAuthHeaders()
        });
        if (res.ok) {
            myLostItemsCache = await res.json();
            return myLostItemsCache;
        }
    } catch (err) {
        console.error("Error fetching items for suggestions:", err);
    }
    return [];
}

document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("searchInput");
    const suggestionsContainer = document.getElementById("searchSuggestions");

    if (searchInput && suggestionsContainer) {
        searchInput.addEventListener("input", async () => {
            const query = searchInput.value.trim().toLowerCase();
            
            if (!isUserLoggedIn()) {
                if (query.length > 0) {
                    showToast("Please Login to search your lost Item");
                    searchInput.value = ""; // Clear input to prevent further spam
                }
                return;
            }

            if (query.length === 0) {
                suggestionsContainer.style.display = "none";
                return;
            }

            const items = await fetchMyItemsForSuggestions();
            const filtered = items.filter(item => 
                item.title.toLowerCase().includes(query) || 
                (item.category && item.category.toLowerCase().includes(query))
            );

            if (filtered.length > 0) {
                suggestionsContainer.innerHTML = filtered.map(item => `
                    <div class="suggestion-item" onclick="redirectToTrack('${item._id}', '${item.title.replace(/'/g, "\\'")}')">
                        <img src="${imgUrl(item.image)}" alt="">
                        <div class="suggestion-info">
                            <h4>${item.title}</h4>
                            <p>${item.category || "No Category"} • ${item.location || "No Location"}</p>
                        </div>
                    </div>
                `).join("");
                suggestionsContainer.style.display = "block";
            } else {
                suggestionsContainer.style.display = "none";
            }
        });

        // Close suggestions when clicking outside
        document.addEventListener("click", (e) => {
            if (!searchInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                suggestionsContainer.style.display = "none";
            }
        });
    }
});

function redirectToTrack(itemId, title) {
    window.location.href = `track-status.html?id=${itemId}&title=${encodeURIComponent(title)}`;
}

// Preview uploaded image
function previewImage(event) {
    const img = document.getElementById("imagePreview");
    img.src = URL.createObjectURL(event.target.files[0]);
    img.style.display = "block";
}

function isUserLoggedIn() {
    const token = localStorage.getItem("token");
    return !!token; // true if token exists
}
document.getElementById("lostForm")?.addEventListener("submit", async function(e) {
    e.preventDefault();

    // 🔐 ADD THIS BLOCK
    if (!isUserLoggedIn()) {
        showToast("⚠️ Please login first to Report Lost Item");
        setTimeout(() => {
            window.location.href = "user-login.html";
        }, 1500);
        return;
    }

    const user = JSON.parse(localStorage.getItem("user"));

    const formData = new FormData();

    formData.append("title", document.getElementById("itemName").value);
    formData.append("category", document.getElementById("itemCategory").value);
    formData.append("location", document.getElementById("lostLocation").value);
    formData.append("description", document.getElementById("lostDescription").value);
    formData.append("date", new Date().toISOString());

    const fileInput = document.getElementById("lostImage");
    if (fileInput.files[0]) {
        formData.append("image", fileInput.files[0]);
    }

    try {
        const response = await fetch(`${BASE_URL}/api/lost/report`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            showToast("✅ Lost item reported successfully!");
            document.getElementById("lostForm").reset();
            const preview = document.getElementById("imagePreview");
            if (preview) preview.style.display = "none";
        } else {
            showToast("❌ Failed to submit report");
        }

    } catch (error) {
        console.error(error);
        showToast("❌ Server error");
    }
});

// Preview image for FOUND item
function previewFoundImage(event) {
    const img = document.getElementById("foundImagePreview");
    img.src = URL.createObjectURL(event.target.files[0]);
    img.style.display = "block";
}

document.getElementById("foundForm")?.addEventListener("submit", async function(e) {
    e.preventDefault();

    // 🔐 ADD THIS BLOCK
    if (!isUserLoggedIn()) {
        showToast("⚠️ Please login first to report found item");
        setTimeout(() => {
            window.location.href = "user-login.html";
        }, 1500);
        return;
    }

    const user = JSON.parse(localStorage.getItem("user"));

    const formData = new FormData();

    formData.append("title", document.getElementById("foundItemName").value);
    formData.append("category", document.getElementById("foundCategory").value);
    formData.append("location", document.getElementById("foundLocation").value);
    formData.append("description", document.getElementById("foundDescription").value);
    formData.append("date", new Date().toISOString());

    const fileInput = document.getElementById("foundImage");
    if (fileInput.files[0]) {
        formData.append("image", fileInput.files[0]);
    }

    try {
        const response = await fetch(`${BASE_URL}/api/found/report`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            showToast("Please return the item to the admin office!", 5000);
            console.log(data);

            document.getElementById("foundForm").reset();

            const img = document.getElementById("foundImagePreview");
            if (img) img.style.display = "none";

        } else {
            showToast("❌ Failed to submit report");
        }

    } catch (error) {
        console.error(error);
        showToast("❌ Server error");
    }
});

function trackItem() {
    const input = document.getElementById("trackInput").value;

    if (input.trim() === "") {
        showToast("⚠️ Please enter a Tracking ID or Item Name");
        return;
    }

    // Dummy demo result
    document.getElementById("statusCard").style.display = "block";
}

// Simulate status-based button visibility
const currentStatus = "Matched"; // change to "Under Matching" to test

if (currentStatus !== "Matched") {
    const matchBtn = document.getElementById("matchBtn");
    if (matchBtn) {
        matchBtn.style.display = "none";
    }
}

function showSection(sectionId) {
  // Hide all sections
  document.querySelectorAll('.dashboard-section').forEach(section => {
    section.classList.remove('active');
  });

  // Remove active class from sidebar
  document.querySelectorAll('.sidebar-menu li').forEach(item => {
    item.classList.remove('active');
  });

  // Show selected section
  document.getElementById(sectionId).classList.add('active');

  // Highlight sidebar item
  event.target.classList.add('active');
}

// ================================
// ADMIN DASHBOARD COUNT-UP EFFECT
// ================================

function animateCountUp(element, duration = 1000) {
    const target = parseInt(element.innerText);
    let start = 0;
    const increment = Math.ceil(target / (duration / 16));

    element.innerText = "0";

    const counter = setInterval(() => {
        start += increment;
        if (start >= target) {
            element.innerText = target;
            clearInterval(counter);
        } else {
            element.innerText = start;
        }
    }, 16);
}

// Run animation when page loads
window.addEventListener("load", () => {
    const statNumbers = document.querySelectorAll(".stats .card p");
    statNumbers.forEach(num => animateCountUp(num, 2000));
});

async function adminLogin() {
    const email = document.getElementById("adminEmail").value;
    const password = document.getElementById("adminPassword").value;

    try {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) {
            showToast(data.message || "Login failed");
            return;
        }

        // 🔐 CHECK ROLE
        if (data.user.role !== "admin") {
            showToast("⚠️ Access denied: Not an admin");
            return;
        }

        // ✅ SAVE TOKEN
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        sessionStorage.setItem("showLoginToast", "true");

        window.location.href = "admin-dashboard.html";

    } catch (error) {
        console.error(error);
        showToast("❌ Server error");
    }
}
function checkAdminAccess() {
    const user = JSON.parse(localStorage.getItem("user"));

    if (!user || user.role !== "admin") {
        showToast("⚠️ Access denied");
        setTimeout(() => {
            window.location.href = "admin-login.html";
        }, 1500);
    }
}


// ================================
// ADMIN LOGOUT
// ================================

function adminLogout() {
    const confirmLogout = confirm("Are you sure you want to logout?");

    if (confirmLogout) {
        sessionStorage.removeItem("isAdminLoggedIn");

        // Flag to show toast after redirect
        sessionStorage.setItem("showLogoutToast", "true");

        window.location.href = "admin-login.html";
    }
}


window.addEventListener("load", () => {

    // LOGIN SUCCESS TOAST
    if (sessionStorage.getItem("showLoginToast") === "true") {
        const toast = document.getElementById("toast");

        if (toast) {
            toast.textContent = "Logged in successfully!";
            toast.classList.add("show");

            setTimeout(() => {
                toast.classList.remove("show");
            }, 2000);
        }

        sessionStorage.removeItem("showLoginToast");
    }


    if (sessionStorage.getItem("showLogoutToast") === "true") {
        const toast = document.getElementById("toast");

        if (toast) {
            toast.textContent = "Logged out successfully!";
            toast.classList.add("show");

            setTimeout(() => {
                toast.classList.remove("show");
            }, 2000);
        }

        sessionStorage.removeItem("showLogoutToast");
    }

});

// ================================
// ADMIN SIDEBAR TOGGLE
// ================================
document.addEventListener("DOMContentLoaded", () => {
    const adminToggle = document.getElementById("adminSidebarToggle");
    const adminLayout = document.querySelector(".admin-layout");

    if (adminToggle && adminLayout) {
        // Toggle sidebar on click
        adminToggle.addEventListener("click", () => {
            adminToggle.classList.toggle("active");
            adminLayout.classList.toggle("sidebar-collapsed");
        });

        // Optional: Start collapsed on mobile by default
        if (window.innerWidth <= 768) {
            adminLayout.classList.add("sidebar-collapsed");
            adminToggle.classList.remove("active");
        }
    }
});






function closeMatchModal() {
    document.getElementById("matchModal").style.display = "none";
}


function approveMatch() {
    updateMatchStatus("Approved", "approved");
}

function rejectMatch() {
    updateMatchStatus("Rejected", "rejected");
}

function updateMatchStatus(text, statusClass) {
    const statusEl = document.getElementById("matchStatus");

    if (!statusEl) {
        console.error("matchStatus element not found");
        return;
    }

    statusEl.textContent = text;
    statusEl.className = `status ${statusClass}`;

    closeMatchModal();
}


// ============================
// FOUND ITEMS MODAL HANDLING
// ============================

// Attach click to all View buttons
document.addEventListener("click", function (e) {
    if (e.target.classList.contains("btn-view")) {

        const row = e.target.closest("tr");

        const item = row.cells[0].textContent;
        const category = row.cells[1].textContent;
        const foundAt = row.cells[2].textContent;
        const reportedBy = row.cells[3].textContent;
        const statusEl = row.querySelector(".status");
        const status = statusEl.textContent.trim();

        // Fill modal fields
        document.getElementById("modalItemName").textContent = item;
        document.getElementById("modalCategory").textContent = category;
        document.getElementById("modalFoundAt").textContent = foundAt;
        document.getElementById("modalReportedBy").textContent = reportedBy;
        document.getElementById("modalStatus").textContent = status;

        // (Optional) image fallback

        const returnBtn = document.getElementById("returnBtn");

        // 🔒 KEY RULE
        if (status.toLowerCase() === "unmatched") {
            returnBtn.disabled = true;
            returnBtn.textContent = "Waiting for Match Approval";
            returnBtn.style.opacity = "0.6";
            returnBtn.style.cursor = "not-allowed";
        } else {
            returnBtn.disabled = false;
            returnBtn.textContent = "Mark as Returned";
            returnBtn.style.opacity = "1";
            returnBtn.style.cursor = "pointer";
        }

        document.getElementById("foundItemModal").style.display = "block";
    }
});



function markItemReturned() {
    alert("Item marked as returned (frontend only)");
}



// ===============================
// ===============================
// GET OTP
// ===============================
async function getOTP() {
    const emailInput = document.getElementById("signupEmail");
    const email = emailInput.value.trim();
    const btn = document.getElementById("getOTPBtn");
    const btnText = btn.querySelector("span");

    if (!email) {
        showToast("👉 Enter your E-Mail ID to get OTP");
        return;
    }

    // Basic email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showToast("❌ Please enter a valid email address");
        return;
    }

    try {
        // UI Loading State
        btn.disabled = true;
        btnText.textContent = "Sending...";
        
        const response = await fetch(`${BASE_URL}/api/auth/send-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (response.ok) {
            // Mask email for privacy (Bonus)
            const parts = email.split("@");
            const maskedEmail = parts[0][0] + "***@" + parts[1];
            showToast(`✅ OTP sent to ${maskedEmail}`);

            // 30s Cooldown (Bonus)
            let cooldown = 30;
            const timer = setInterval(() => {
                cooldown--;
                btnText.textContent = `Resend in ${cooldown}s`;
                if (cooldown <= 0) {
                    clearInterval(timer);
                    btn.disabled = false;
                    btnText.textContent = "Get OTP";
                }
            }, 1000);
        } else {
            showToast(`❌ ${data.message || "Failed to send OTP"}`);
            btn.disabled = false;
            btnText.textContent = "Get OTP";
        }
    } catch (error) {
        console.error("GET OTP ERROR:", error);
        showToast("❌ Server error");
        btn.disabled = false;
        btnText.textContent = "Get OTP";
    }
}

// ===============================
// USER SIGNUP (REAL)
// ===============================
async function signupUser() {
    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const otp = document.getElementById("signupOTP").value.trim();
    const password = document.getElementById("signupPassword").value;
    const confirmPassword = document.getElementById("signupConfirmPassword").value;

    if (!name || !email || !password || !otp) {
        showToast("⚠️ All fields are required!");
        return;
    }

    if (password !== confirmPassword) {
        showToast("❌ Passwords do not match!");
        return;
    }

    try {
        const signupBtn = document.getElementById("signupBtn");
        const originalText = signupBtn.textContent;
        signupBtn.disabled = true;
        signupBtn.textContent = "Creating Account...";

        const response = await fetch(`${BASE_URL}/api/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password, otp })
        });

        const data = await response.json();

        if (response.ok) {
            showToast("✅ Signup successful! Redirecting to login...");
            setTimeout(() => {
                window.location.href = "user-login.html";
            }, 2000);
        } else {
            showToast(`❌ ${data.message || "Signup failed"}`);
            signupBtn.disabled = false;
            signupBtn.textContent = originalText;
        }
    } catch (error) {
        console.error("SIGNUP ERROR:", error);
        showToast("❌ Server error");
        const signupBtn = document.getElementById("signupBtn");
        signupBtn.disabled = false;
        signupBtn.textContent = "Sign Up";
    }
}













// ===============================
// USER DROPDOWN KEYBOARD SUPPORT
// ===============================
(function () {
    const dropdown = document.getElementById("userAuthBox");
    const menu = document.getElementById("userDropdownMenu");

    if (!dropdown || !menu) return;

    const items = menu.querySelectorAll("a");
    let index = -1;

    dropdown.addEventListener("keydown", (e) => {
        if (!["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)) return;

        e.preventDefault();

        if (e.key === "ArrowDown") {
            index = (index + 1) % items.length;
            items[index].focus();
        }

        if (e.key === "ArrowUp") {
            index = index <= 0 ? items.length - 1 : index - 1;
            items[index].focus();
        }

        if (e.key === "Enter" && document.activeElement.tagName === "A") {
            document.activeElement.click();
        }

        if (e.key === "Escape") {
            index = -1;
            document.getElementById("userWelcome").focus();
        }
    });

    dropdown.addEventListener("mouseenter", () => {
        index = -1;
    });
})();

// ===============================
// SHOW / HIDE PASSWORD (SIGNUP)
// ===============================
document.getElementById("showPasswordCheckbox")?.addEventListener("change", function () {
    const pwd = document.getElementById("signupPassword");
    const confirmPwd = document.getElementById("signupConfirmPassword");

    if (!pwd || !confirmPwd) return;

    const type = this.checked ? "text" : "password";
    pwd.type = type;
    confirmPwd.type = type;
});

document.addEventListener("DOMContentLoaded", () => {
    const passwordInput = document.querySelector('input[placeholder="Create password"]');
    if (!passwordInput) return; // Exit if not on signup page
    
    const confirmPasswordInput = document.querySelector('input[placeholder="Confirm password"]');
    const strengthBar = document.querySelector(".strength-bar span");
    const strengthText = document.getElementById("strengthText");
    const matchText = document.getElementById("passwordMatchText");
    const signupBtn = document.getElementById("signupBtn");
    const showPasswordCheckbox = document.getElementById("showPasswordCheckbox");
    const strengthContainer = document.querySelector(".password-strength");

    const ruleLength = document.getElementById("rule-length");
    const ruleUppercase = document.getElementById("rule-uppercase");
    const ruleNumber = document.getElementById("rule-number");
    const ruleSpecial = document.getElementById("rule-special");

    const passwordRules = document.getElementById("passwordRules");


function checkStrength(password) {

    // 🔴 If empty → hide everything
    if (password.length === 0) {
        passwordRules.classList.remove("show");
        strengthContainer.classList.remove("show");

        strengthBar.style.width = "0%";
        strengthText.textContent = "";

        ruleLength.textContent = "❌ At least 8 characters";
        ruleUppercase.textContent = "❌ One uppercase letter";
        ruleNumber.textContent = "❌ One number";
        ruleSpecial.textContent = "❌ One special character";

        ruleLength.classList.remove("valid");
        ruleUppercase.classList.remove("valid");
        ruleNumber.classList.remove("valid");
        ruleSpecial.classList.remove("valid");

        return false;
    }

    // ✅ Show rules + meter when typing
    passwordRules.classList.add("show");
    strengthContainer.classList.add("show");

    // 🔥 RESET RULES FIRST (THIS IS THE FIX)
    ruleLength.classList.remove("valid");
    ruleUppercase.classList.remove("valid");
    ruleNumber.classList.remove("valid");
    ruleSpecial.classList.remove("valid");

    ruleLength.textContent = "❌ At least 8 characters";
    ruleUppercase.textContent = "❌ One uppercase letter";
    ruleNumber.textContent = "❌ One number";
    ruleSpecial.textContent = "❌ One special character";

    let score = 0;

    // Length
    if (password.length >= 8) {
        score++;
        ruleLength.classList.add("valid");
        ruleLength.textContent = "✔ At least 8 characters";
    }

    // Uppercase
    if (/[A-Z]/.test(password)) {
        score++;
        ruleUppercase.classList.add("valid");
        ruleUppercase.textContent = "✔ One uppercase letter";
    }

    // Number
    if (/[0-9]/.test(password)) {
        score++;
        ruleNumber.classList.add("valid");
        ruleNumber.textContent = "✔ One number";
    }

    // Special character
    if (/[^A-Za-z0-9]/.test(password)) {
        score++;
        ruleSpecial.classList.add("valid");
        ruleSpecial.textContent = "✔ One special character";
    }

    // Strength meter
    if (score <= 1) {
        strengthBar.style.width = "25%";
        strengthBar.style.background = "#dc3545";
        strengthText.textContent = "Weak password";
        return false;
    } else if (score === 2 || score === 3) {
        strengthBar.style.width = "60%";
        strengthBar.style.background = "#ffc107";
        strengthText.textContent = "Medium strength";
        return true;
        
        
    } 

    else {

        strengthBar.style.width = "100%";
        strengthBar.style.background = "#28a745";
        strengthText.textContent = "Strong password";
        return true;
    }
}
 



    function checkMatch() {
        if (!confirmPasswordInput.value) {
            matchText.textContent = "";
            return false;
        }

        if (passwordInput.value !== confirmPasswordInput.value) {
            matchText.textContent = "Passwords do not match";
            return false;
        } else {
            matchText.textContent = "";
            return true;
        }
    }

    function validateForm() {
        const strong = checkStrength(passwordInput.value);
        const match = checkMatch();
        signupBtn.disabled = !(strong && match);
    }

    passwordInput.addEventListener("input", validateForm);
    confirmPasswordInput.addEventListener("input", validateForm);

    // Show / Hide password
    showPasswordCheckbox.addEventListener("change", () => {
        const type = showPasswordCheckbox.checked ? "text" : "password";
        passwordInput.type = type;
        confirmPasswordInput.type = type;
    });

    const capsWarning = document.getElementById("capsWarning");

    passwordInput.addEventListener("keyup", (e) => {
        if (e.getModifierState("CapsLock")) {
            capsWarning.style.display = "block";
        } else {
            capsWarning.style.display = "none";
        }
    });

});





// Save account changes (frontend only)
function saveAccount() {
    const name = document.getElementById("accountName").value.trim();
    const newPassword = document.getElementById("newPassword").value;

    if (!name) {
        showToast("⚠️ Name cannot be empty");
        return;
    }

    const user = JSON.parse(localStorage.getItem("user"));
    user.name = name;
    localStorage.setItem("user", JSON.stringify(user));

    showToast("✅ Account updated successfully!");
}




document.addEventListener("DOMContentLoaded", () => {
    const nameInput = document.getElementById("accountName");
    const emailInput = document.getElementById("accountEmail");

    const user = JSON.parse(localStorage.getItem("user"));

    // Only run on my-account page
    if (!nameInput || !emailInput) return;

    if (!user) {
        window.location.href = "user-login.html";
        return;
    }

    nameInput.value = user.name;
    emailInput.value = user.email;
});

async function signupUser() {
    const name = document.getElementById("signupName").value;
    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;
    const confirmPassword = document.getElementById("signupConfirmPassword").value;

    // Basic validation
    if (password !== confirmPassword) {
        showToast("⚠️ Passwords do not match!");
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/api/auth/signup`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            showToast("✅ Signup successful!");
            console.log(data);

            // Optional: redirect to login
            setTimeout(() => {
                window.location.href = "user-login.html";
            }, 1500);

        } else {
            showToast(data.message || "Signup failed");
        }

    } catch (error) {
        console.error(error);
        showToast("❌ Server error");
    }
}
async function loginUser() {
    const email = document.getElementById("loginEmail")?.value;
    const password = document.getElementById("loginPassword")?.value;

    try {
        const response = await fetch(`${BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            showToast("✅ Login successful");

            // ✅ Save user
            localStorage.setItem("user", JSON.stringify(data.user));

            // 🔐 Save token
            localStorage.setItem("token", data.token);

            // Redirect
            window.location.href = "index.html";

        } else {
            showToast(data.message || "Login failed");
        }

    } catch (error) {
        console.error("Login Error:", error);
        showToast("❌ Server error");
    }
}

// ✅ ADD THIS FUNCTION (IMPORTANT - was missing before)
function checkUserLogin() {
    const user = JSON.parse(localStorage.getItem("user"));

    const loginDropdown = document.getElementById("loginDropdown");
    const userAuthBox = document.getElementById("userAuthBox");
    const usernameText = document.querySelector(".username-text");

    if (user) {
        if (loginDropdown) loginDropdown.style.display = "none";
        if (userAuthBox) userAuthBox.style.display = "flex";

        if (usernameText) {
            usernameText.textContent = user.name;
        }

        // ✅ HANDLE PROFILE PIC
        const profileImg = document.querySelector(".user-profile-img");
        if (profileImg && user.profilePic) {
            profileImg.src = user.profilePic;
            profileImg.style.display = "block";
            
            // Hide the default user icon if it exists
            const defaultUserIcon = document.querySelector(".default-user-icon");
            if (defaultUserIcon) defaultUserIcon.style.display = "none";
        }
    } else {
        // ✅ Ensure icons are hidden if NOT logged in
        if (loginDropdown) loginDropdown.style.display = "flex";
        if (userAuthBox) userAuthBox.style.display = "none";

        // ✅ RESET PROFILE PIC
        const profileImg = document.querySelector(".user-profile-img");
        if (profileImg) {
            profileImg.src = "";
            profileImg.style.display = "none";
        }
        const defaultUserIcon = document.querySelector(".default-user-icon");
        if (defaultUserIcon) defaultUserIcon.style.display = "block";
    }
}

// ✅ SAFELY CALL IT
document.addEventListener("DOMContentLoaded", () => {
    if (typeof checkUserLogin === "function") {
        checkUserLogin();
    }
});

function userLogout() {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    showToast("👋 Logged out successfully");
    
    // Refresh UI state immediately
    checkUserLogin();

    setTimeout(() => {
        window.location.href = "index.html";
    }, 1000);
}

// ✅ ADDED ADMIN LOGOUT
function adminLogout() {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    showToast("👋 Admin logged out");

    // Refresh UI state immediately
    checkUserLogin();

    setTimeout(() => {
        window.location.href = "admin-login.html";
    }, 1000);
}

async function loadLostItemCount() {
    try {
        const response = await fetch(`${BASE_URL}/api/lost/count`);
        const data = await response.json();

        const lostCountEl = document.getElementById("lostCount");

        if (lostCountEl) {
            lostCountEl.innerText = data.count;
        }
    } catch (error) {
        console.error("Error fetching count:", error);
    }
}
window.addEventListener("DOMContentLoaded", () => {
    loadLostItemCount();
});

// ===============================
// TRACK STATUS PAGE
// ===============================
// Flow:
//   1. Load the logged-in user's lost items into #myLostList
//   2. User clicks "Find Match" on one card
//   3. GET /api/matches/find/:id → render ranked table in #matchResults

const IMG_PLACEHOLDER = "https://via.placeholder.com/80?text=No+Img";

function imgUrl(filename) {
    return filename ? `${BASE_URL}/uploads/${filename}` : IMG_PLACEHOLDER;
}

async function loadMyLostItems() {
    const list = document.getElementById("myLostList");
    if (!list) return; // not on track-status page

    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!user || !user.name) {
        list.innerHTML =
            "<p style='text-align:center;'>Please <a href='user-login.html'>log in</a> to see your reported items.</p>";
        return;
    }

    list.innerHTML = "<p style='text-align:center;'>Loading your items...</p>";

    try {
        const res = await fetch(`${BASE_URL}/api/lost/mine`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const items = await res.json();

        if (!items.length) {
            list.innerHTML =
                "<p style='text-align:center;'>You haven't reported any lost items yet. <a href='report-lost.html'>Report one</a>.</p>";
            return;
        }

        list.innerHTML = "";
        items.forEach((item) => {
            const card = document.createElement("div");
            card.className = "lost-card";
            card.innerHTML = `
                <img src="${imgUrl(item.image)}" alt="" class="lost-thumb">
                <div class="lost-info">
                    <h4>${item.title || "Untitled"}</h4>
                    <p><strong>Category:</strong> ${item.category || "N/A"}</p>
                    <p><strong>Lost at:</strong> ${item.location || "N/A"}</p>
                    <p class="lost-desc">${item.description || ""}</p>
                </div>
                <button class="btn btn-primary find-match-btn">Find Match</button>
            `;
            card.querySelector(".find-match-btn").addEventListener("click", () => {
                findMatchesFor(item._id, item.title);
            });
            list.appendChild(card);
        });
    } catch (err) {
        console.error(err);
        list.innerHTML =
            "<p style='text-align:center;color:#c00;'>Failed to load your items. Is the backend running?</p>";
    }
}

async function findMatchesFor(lostItemId, lostTitle) {
    const section = document.getElementById("matchResultsSection");
    const heading = document.getElementById("matchResultsHeading");
    const tbody = document.getElementById("matchResultsBody");
    const persistentToast = document.getElementById("persistentToast");

    if (persistentToast) {
        persistentToast.style.display = "block";
    }

    if (!section || !tbody) return;

    section.style.display = "block";
    heading.textContent = `Finding matches for "${lostTitle}"...`;
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Searching...</td></tr>`;
    section.scrollIntoView({ behavior: "smooth", block: "start" });

    try {
        const res = await fetch(`${BASE_URL}/api/matches/find/${lostItemId}?limit=10`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { results } = await res.json();

        heading.textContent = `Top matches for "${lostTitle}"`;

        if (!results || results.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No found items in the system yet.</td></tr>`;
            return;
        }

        const filteredResults = results.filter(r => Math.round(r.score || 0) >= 70);

        if (filteredResults.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No high-confidence matches (70%+) found yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = "";
        filteredResults.forEach(({ foundItem, score }) => {
            const s = Math.round(score || 0);
            let cls = "low";
            if (s >= 75) cls = "high";
            else if (s >= 50) cls = "medium";

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><img src="${imgUrl(foundItem.image)}" alt="" class="table-thumb"></td>
                <td>${foundItem.title || "N/A"}</td>
                <td>${foundItem.category || "N/A"}</td>
                <td>${foundItem.location || "N/A"}</td>
                <td>${foundItem.reportedBy || "N/A"}</td>
                <td><span class="match-score ${cls}">${s}%</span></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#c00;">Failed to fetch matches.</td></tr>`;
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadMyLostItems();
    
    // Check for auto-track params
    const urlParams = new URLSearchParams(window.location.search);
    const trackId = urlParams.get("id");
    const trackTitle = urlParams.get("title");

    if (trackId && trackTitle) {
        findMatchesFor(trackId, trackTitle);
    }
});

async function loadLostItemsAdmin() {
    try {
        const response = await fetch(`${BASE_URL}/api/lost/all`);

        const data = await response.json();

        const tableBody = document.getElementById("lostItemsTable");

        if (!tableBody) return;

        tableBody.innerHTML = ""; // clear old data

        data.forEach(item => {
            const row = `
                <tr>
                    <td>${item.title}</td>
                    <td>${item.category}</td>
                    <td>${item.location}</td>
                    <td>${item.reportedBy || "Unknown"}</td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });

    } catch (error) {
        console.error("Error loading lost items:", error);
    }
}

let foundItems = [];



async function loadFoundItems() {
    const tableBody = document.getElementById("foundItemsTableBody");

    // ✅ STOP if not on admin page
    if (!tableBody) return;

    try {
        const response = await fetch(`${BASE_URL}/api/found`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();

        // ✅ STORE GLOBALLY (IMPORTANT)
        foundItems = data;

        tableBody.innerHTML = "";

        data.forEach((item, index) => {
            const row = `
                <tr>
                    <td>${item.title}</td>
                    <td>${item.category}</td>
                    <td>${item.location}</td>
                    <td>${item.reportedBy || "Unknown"}</td>
                    <td>
                        <span class="status-badge status-${item.status}">
                            ${item.status}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-view" onclick="openFoundItemModal(${index})">
                            View
                        </button>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });

    } catch (error) {
        console.error("Error loading found items:", error);
    }
}
function renderTable(items) {
    const tbody = document.getElementById("foundItemsTableBody");
    tbody.innerHTML = "";

    items.forEach((item, index) => {
        const row = `
            <tr>
                <td>${item.title}</td>
                <td>${item.category}</td>
                <td>${item.location}</td>
                <td>${item.reportedBy}</td>
                <td><span class="status ${item.status}">${item.status}</span></td>
                <td>
                    <button class="btn btn-view" onclick="openFoundItemModal(${index})">
                        View
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

function openFoundItemModal(index) {
    const item = foundItems[index];

    // ✅ SAFETY CHECK (prevents crash)
    if (!item) {
        console.error("❌ Item not found at index:", index);
        return;
    }

    console.log("✅ OPENING ITEM:", item);

    // ✅ TEXT DATA (with fallback)
    document.getElementById("modalItemName").textContent = item.title || "N/A";
    document.getElementById("modalCategory").textContent = item.category || "N/A";
    document.getElementById("modalFoundAt").textContent = item.location || "N/A";
    document.getElementById("modalReportedBy").textContent = item.reportedBy || "Unknown";
    document.getElementById("modalStatus").textContent = item.status || "N/A";

    // ✅ IMAGE HANDLING (robust)
    const modalImage = document.getElementById("modalImage");

    if (item.image && item.image !== "null" && item.image !== "") {
        modalImage.src = `${BASE_URL}/uploads/${item.image}`;
    } else {
        modalImage.src = "https://via.placeholder.com/300?text=No+Image";
    }

    // ✅ BUTTON LOGIC (clean reset first)
    const returnBtn = document.getElementById("returnBtn");
    returnBtn.onclick = null;

    if (item.status === "returned") {
        returnBtn.style.display = "none";
    } else {
        returnBtn.style.display = "block";
        
        if (item.status === "matched") {
            returnBtn.disabled = false;
            returnBtn.textContent = "Mark as Returned";
            returnBtn.onclick = () => markItemReturned(item._id);
        } else {
            returnBtn.disabled = true;
            returnBtn.textContent = "Waiting for Match Approval";
        }
    }

    // ✅ OPEN MODAL
    document.getElementById("foundItemModal").style.display = "flex";
}
function closeFoundItemModal() {
    document.getElementById("foundItemModal").style.display = "none";
}

let matchRequests = [];

async function loadMatchRequests() {
    const tableBody = document.querySelector("#match-section tbody");

    // ✅ Stop if not on this page
    if (!tableBody) return;

    try {
        const res = await fetch(`${BASE_URL}/api/matches`);
        const data = await res.json();

        // ✅ Filter for 70%+ matches
        const highConfidenceMatches = data.filter(m => (m.score || 0) >= 70);

        console.log("HIGH CONFIDENCE MATCHES:", highConfidenceMatches);

        // ✅ Store filtered globally
        matchRequests = highConfidenceMatches;

        if (highConfidenceMatches.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No high-confidence matches (70%+) pending.</td></tr>`;
            return;
        }

        tableBody.innerHTML = "";

        // ✅ Use map + join (faster than +=)
        const rows = highConfidenceMatches.map((match, index) => {
            const lost = match.lostItem || {};
            const found = match.foundItem || {};

            // ✅ SAFE SCORE HANDLING
            const score = match.score ? (match.score).toFixed(2) : "0.00";

            return `
                <tr>
                    <td>${lost.title || "N/A"}</td>
                    <td>${found.title || "N/A"}</td>
                    <td>${score}%</td>
                    <td>
                        <button class="btn btn-details"
                            onclick="openMatchModal(${index})">
                            View Details
                        </button>
                    </td>
                </tr>
            `;
        }).join("");

        tableBody.innerHTML = rows;

    } catch (error) {
        console.error("❌ Error loading match requests:", error);
    }
}
function openMatchModal(index) {
    const match = matchRequests[index];

    // ✅ Safety check
    if (!match) {
        console.error("❌ Match not found at index:", index);
        return;
    }

    console.log("✅ OPENING MATCH:", match);

    const lost = match.lostItem || {};
    const found = match.foundItem || {};

    // ✅ Image helper
    const getImageUrl = (img) => {
        if (img && img !== "null" && img !== "") {
            return `${BASE_URL}/uploads/${img}`;
        }
        return "https://via.placeholder.com/300x200?text=No+Image";
    };

    // ✅ Date formatter
    const formatDate = (date) => {
        return date ? new Date(date).toLocaleDateString() : "N/A";
    };

    // =========================
    // LOST ITEM
    // =========================
    const lostCard = document.querySelector("#matchModal .modal-card:nth-child(1)");

    if (lostCard) {
        lostCard.innerHTML = `
            <h3>Lost Item</h3>
            <img src="${getImageUrl(lost.image)}" class="modal-img">
            <p><strong>Name:</strong> ${lost.title || "N/A"}</p>
            <p><strong>Category:</strong> ${lost.category || "N/A"}</p>
            <p><strong>Description:</strong> ${lost.description || "N/A"}</p>
            <p><strong>Date Lost:</strong> ${formatDate(lost.date)}</p>
        `;
    }

    // =========================
    // FOUND ITEM
    // =========================
    const foundCard = document.querySelector("#matchModal .modal-card:nth-child(2)");

    if (foundCard) {
        foundCard.innerHTML = `
            <h3>Found Item</h3>
            <img src="${getImageUrl(found.image)}" class="modal-img">
            <p><strong>Name:</strong> ${found.title || "N/A"}</p>
            <p><strong>Category:</strong> ${found.category || "N/A"}</p>
            <p><strong>Description:</strong> ${found.description || "N/A"}</p>
            <p><strong>Date Found:</strong> ${formatDate(found.date)}</p>
        `;
    }

    // =========================
    // STORE IDS (IMPORTANT FOR APPROVE/REJECT)
    // =========================
    window.currentMatchId = match._id;
    window.currentFoundId = found._id;

    // =========================
    // OPEN MODAL
    // =========================
    const modal = document.getElementById("matchModal");
    if (modal) {
        modal.style.display = "flex";
    }
}
async function approveMatch() {
    if (!window.currentMatchId) {
        showToast("⚠️ No match selected");
        return;
    }

    try {
        const res = await fetch(
            `${BASE_URL}/api/matches/${currentMatchId}/approve`,
            {
                method: "PUT"
            }
        );

        const data = await res.json();

        showToast(data.message);

        closeMatchModal();

        // 🔄 Refresh tables
        loadMatchRequests();
        loadFoundItems();

    } catch (error) {
        console.error("Approve error:", error);
    }
}
async function rejectMatch() {
    if (!window.currentMatchId) {
        showToast("⚠️ No match selected");
        return;
    }

    try {
        const res = await fetch(
            `${BASE_URL}/api/matches/${currentMatchId}/reject`,
            {
                method: "DELETE"
            }
        );

        const data = await res.json();

        showToast(data.message);

        closeMatchModal();

        // 🔄 Refresh table
        loadMatchRequests();

    } catch (error) {
        console.error("Reject error:", error);
    }
}
function closeMatchModal() {
    document.getElementById("matchModal").style.display = "none";
}
async function loadDashboardStats() {
    try {
        const [lostRes, foundRes, pendingRes, returnedRes] = await Promise.all([
            fetch(`${BASE_URL}/api/lost/count`),
            fetch(`${BASE_URL}/api/found/count`),
            fetch(`${BASE_URL}/api/found/pending-count`),
            fetch(`${BASE_URL}/api/found/returned-count`)
        ]);

        const lostData = await lostRes.json();
        const foundData = await foundRes.json();
        const pendingData = await pendingRes.json();
        const returnedData = await returnedRes.json();

        console.log("DASHBOARD DATA:", {
            lostData, foundData, pendingData, returnedData
        });

        // ✅ SAFE DOM UPDATE
        const lostEl = document.getElementById("lostCount");
        const foundEl = document.getElementById("foundCount");
        const pendingEl = document.getElementById("pendingCount");
        const returnedEl = document.getElementById("returnedCount");

        if (lostEl) lostEl.innerText = lostData.count;
        if (foundEl) foundEl.innerText = foundData.count;
        if (pendingEl) pendingEl.innerText = pendingData.count;
        if (returnedEl) returnedEl.innerText = returnedData.count;

    } catch (error) {
        console.error("Dashboard stats error:", error);
    }
}
async function loadHomeStats() {
    try {
        const res = await fetch(`${BASE_URL}/api/found/returned-count`);
        const data = await res.json();

        const el = document.getElementById("homeReturnedCount");
        if (el) {
            el.innerText = data.count;
        }

    } catch (error) {
        console.error("Home stats error:", error);
    }
}
document.addEventListener("DOMContentLoaded", () => {
    checkUserLogin();

    // ✅ Only for admin dashboard page
    loadDashboardStats();
    loadHomeStats();
    loadLostItemsAdmin();
    loadFoundItems();
    loadMatchRequests();
});

document.addEventListener("DOMContentLoaded", async function () {
    const grid = document.getElementById("itemGrid");

    if (!grid) return;

    try {
        const res = await fetch(`${BASE_URL}/api/found/recent-matched`);
        const data = await res.json();

        grid.innerHTML = "";

        data.forEach(item => {
            const card = document.createElement("div");
            card.className = "item-card";

            const imageUrl = item.image
                ? `${BASE_URL}/uploads/${item.image}`
                : "placeholder.png";

            card.innerHTML = `
                <img src="${imageUrl}" alt="${item.title}">
                <p>${item.title}</p>
            `;

            grid.appendChild(card);
        });

    } catch (error) {
        console.error("Error loading recent items:", error);
    }
});
async function markItemReturned(id) {
    try {
        const response = await fetch(
            `${BASE_URL}/api/found/${id}/return`,
            {
                method: "PUT"
            }
        );

        const data = await response.json();

        if (response.ok) {
            showToast("✅ Item marked as returned");

            closeFoundItemModal();
            loadFoundItems(); // refresh table
        } else {
            showToast(data.message || "Failed");
        }

    } catch (error) {
        console.error(error);
    }
}