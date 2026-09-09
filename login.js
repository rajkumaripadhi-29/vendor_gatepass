import { auth, authPersistenceReady } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", async function () {
  await authPersistenceReady;

  // ========== Session Management ==========
  onAuthStateChanged(auth, (user) => {
    if (user) {
      window.location.href = "dashboard.html";
    }
  });

  // ========== DOM References ==========
  const loginForm = document.getElementById("loginForm");
  const userIdInput = document.getElementById("userId");
  const passwordInput = document.getElementById("password");
  const passwordToggle = document.getElementById("passwordToggle");
  const eyeShowIcon = document.getElementById("eyeShow");
  const eyeHideIcon = document.getElementById("eyeHide");
  const btnLogin = document.getElementById("btnLogin");
  const errorMessage = document.getElementById("errorMessage");
  const errorText = document.getElementById("errorText");

  // ========== Password Show/Hide Toggle ==========
  passwordToggle.addEventListener("click", function () {
    const isPassword = passwordInput.type === "password";
    passwordInput.type = isPassword ? "text" : "password";
    eyeShowIcon.style.display = isPassword ? "none" : "block";
    eyeHideIcon.style.display = isPassword ? "block" : "none";
    const label = isPassword ? "Hide password" : "Show password";
    passwordToggle.setAttribute("aria-label", label);
    passwordToggle.setAttribute("title", label);
    passwordInput.focus();
  });

  // ========== Form Submission ==========
  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = userIdInput.value.trim();
    const password = passwordInput.value;

    hideError();

    if (!email) {
      showError("Please enter your User ID/Email.");
      userIdInput.focus();
      return;
    }

    if (!password) {
      showError("Please enter your password.");
      passwordInput.focus();
      return;
    }

    btnLogin.classList.add("loading");

    try {
      await authPersistenceReady;
      await signInWithEmailAndPassword(auth, email, password);
      alert("Logged in successfully");
    } catch (error) {
      btnLogin.classList.remove("loading");
      showError(getFirebaseErrorMessage(error.code));
    }
  });

  // ========== Error Display Helpers ==========
  function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.add("show");
    setTimeout(function () {
      hideError();
    }, 5000);
  }

  function hideError() {
    errorMessage.classList.remove("show");
  }

  // ========== Forgot Password ==========
  const forgotPasswordLink = document.getElementById("forgotPasswordLink");
  const forgotPasswordModal = document.getElementById("forgotPasswordModal");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const forgotPasswordForm = document.getElementById("forgotPasswordForm");
  const resetEmailInput = document.getElementById("resetEmail");
  const btnResetPassword = document.getElementById("btnResetPassword");
  const modalMessage = document.getElementById("modalMessage");

  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener("click", function (e) {
      e.preventDefault();
      forgotPasswordModal.classList.add("show");
      resetEmailInput.value = userIdInput.value;
      modalMessage.className = "modal-message";
      modalMessage.textContent = "";
      resetEmailInput.focus();
    });
  }

  function closeModal() {
    forgotPasswordModal.classList.remove("show");
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", closeModal);
  }

  window.addEventListener("click", function (e) {
    if (e.target === forgotPasswordModal) {
      closeModal();
    }
  });

  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const email = resetEmailInput.value.trim();

      modalMessage.className = "modal-message";
      modalMessage.textContent = "";

      if (!email) {
        modalMessage.classList.add("error");
        modalMessage.textContent = "Please enter your email address.";
        return;
      }

      btnResetPassword.classList.add("loading");

      try {
        await sendPasswordResetEmail(auth, email);
        btnResetPassword.classList.remove("loading");
        modalMessage.classList.add("success");
        modalMessage.textContent =
          "Password reset link has been sent to your registered email address.";
        resetEmailInput.value = "";
      } catch (error) {
        btnResetPassword.classList.remove("loading");
        modalMessage.classList.add("error");
        modalMessage.textContent = getFirebaseErrorMessage(error.code);
      }
    });
  }

  // ========== Input Focus Animations ==========
  const formInputs = document.querySelectorAll(".form-input");
  formInputs.forEach(function (input) {
    input.addEventListener("focus", function () {
      this.closest(".input-wrapper").style.transform = "scale(1.01)";
    });
    input.addEventListener("blur", function () {
      this.closest(".input-wrapper").style.transform = "scale(1)";
    });
  });

  // ========== Navbar Scroll Effect ==========
  window.addEventListener("scroll", function () {
    const currentScroll = window.pageYOffset;
    const navbar = document.getElementById("navbar");
    if (currentScroll > 10) {
      navbar.style.background =
        "linear-gradient(135deg, rgba(0, 31, 63, 0.98), rgba(0, 51, 102, 0.98))";
      navbar.style.boxShadow = "0 4px 30px rgba(0, 0, 0, 0.4)";
    } else {
      navbar.style.background = "";
      navbar.style.boxShadow = "";
    }
  });

  // ========== Firebase Helper ==========
  function getFirebaseErrorMessage(errorCode) {
    switch (errorCode) {
      case "auth/user-not-found":
        return "No account found with this User ID.";
      case "auth/wrong-password":
        return "Incorrect password. Please try again.";
      case "auth/invalid-email":
        return "Invalid email format.";
      case "auth/user-disabled":
        return "This account has been disabled. Contact admin.";
      case "auth/too-many-requests":
        return "Too many attempts. Please try again later.";
      case "auth/invalid-credential":
        return "Invalid credentials. Please try again.";
      default:
        return "Authentication failed: " + errorCode;
    }
  }

  console.log(
    "%c🏭 Tata Steel SEZ – Gate Pass System",
    "color: #0078d4; font-size: 16px; font-weight: bold;",
  );
});
