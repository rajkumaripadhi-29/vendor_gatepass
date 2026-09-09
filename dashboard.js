import { app, auth, db, authPersistenceReady } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  onAuthStateChanged,
  signOut,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  getAuth,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  collection,
  doc,
  addDoc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


const ADMIN_ONLY_VIEWS = ["delete-record"];

let currentUserIsAdmin = false;

async function checkAdminStatus() {
  const user = auth.currentUser;

  if (!user) {
    currentUserIsAdmin = false;
    return;
  }

  const adminDoc = await getDoc(doc(db, "admin", user.uid));
  currentUserIsAdmin = adminDoc.exists();
}

function updateAdminNavVisibility() {
  ADMIN_ONLY_VIEWS.forEach((viewId) => {
    const navLink = document.querySelector(
      `a.sidebar__link[data-view="${viewId}"]`,
    );
    if (navLink) {
      const navItem = navLink.closest("li") || navLink;
      navItem.style.display = currentUserIsAdmin ? "" : "none";
    }
  });
}


function getFirebaseAuthErrorMessage(errorCode) {
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
    case "auth/email-already-in-use":
      return "This email is already registered.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    default:
      return "Authentication failed: " + errorCode;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await authPersistenceReady;

  // ───────────────────────────────────────────────
  // Session Management
  // ───────────────────────────────────────────────
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    await checkAdminStatus();
updateAdminNavVisibility();
  });

  // ───────────────────────────────────────────────
  // DOM References – Navbar / Profile
  // ───────────────────────────────────────────────
  const profileBtn = document.getElementById("profileBtn");
  const profileDropdown = document.getElementById("profileDropdown");
  const logoutBtn = document.getElementById("logoutBtn");
  const changePasswordBtn = document.getElementById("changePasswordBtn");

  // Change Password Modal DOM
  const changePasswordModal = document.getElementById("changePasswordModal");
  const changePasswordForm = document.getElementById("changePasswordForm");
  const currentPasswordInput = document.getElementById("currentPassword");
  const newPasswordInput = document.getElementById("newPassword");
  const confirmNewPasswordInput = document.getElementById("confirmNewPassword");
  const btnCancelCp = document.getElementById("btnCancelCp");
  const cpErrorMessage = document.getElementById("cpErrorMessage");
  const cpErrorText = document.getElementById("cpErrorText");
  const cpSuccessMessage = document.getElementById("cpSuccessMessage");
  const cpSuccessText = document.getElementById("cpSuccessText");
  const btnUpdatePassword = document.getElementById("btnUpdatePassword");

  // ───────────────────────────────────────────────
  // Profile Dropdown
  // ───────────────────────────────────────────────
  function toggleDropdown() {
    const isOpen = profileDropdown.classList.contains("show");
    if (isOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  }

  function openDropdown() {
    profileDropdown.classList.add("show");
    profileBtn.setAttribute("aria-expanded", "true");
  }

  function closeDropdown() {
    profileDropdown.classList.remove("show");
    profileBtn.setAttribute("aria-expanded", "false");
  }

  profileBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleDropdown();
  });

  document.addEventListener("click", (e) => {
    if (!profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
      closeDropdown();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeDropdown();
      profileBtn.focus();
    }
  });

  // ───────────────────────────────────────────────
  // Change Password Action
  // ───────────────────────────────────────────────
  changePasswordBtn.addEventListener("click", (e) => {
    e.preventDefault();
    closeDropdown();
    changePasswordForm.reset();
    cpErrorMessage.style.display = "none";
    cpSuccessMessage.style.display = "none";
    changePasswordModal.style.display = "flex";
  });

  btnCancelCp.addEventListener("click", () => {
    changePasswordModal.style.display = "none";
  });

  changePasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmNewPassword = confirmNewPasswordInput.value;

    cpErrorMessage.style.display = "none";
    cpSuccessMessage.style.display = "none";

    if (newPassword.length < 6) {
      cpErrorText.textContent = "New password must be at least 6 characters.";
      cpErrorMessage.style.display = "block";
      return;
    }

    if (newPassword !== confirmNewPassword) {
      cpErrorText.textContent = "New passwords do not match.";
      cpErrorMessage.style.display = "block";
      return;
    }

    btnUpdatePassword.disabled = true;
    btnUpdatePassword.textContent = "Updating...";

    const user = auth.currentUser;
    if (user) {
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword,
      );
      try {
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);
        cpSuccessText.textContent = "Password updated successfully";
        cpSuccessMessage.style.display = "block";
        changePasswordForm.reset();

        setTimeout(() => {
          changePasswordModal.style.display = "none";
        }, 2000);
      } catch (error) {
        cpErrorText.textContent = getFirebaseErrorMessage(error.code);
        cpErrorMessage.style.display = "block";
      }
    }

    btnUpdatePassword.disabled = false;
    btnUpdatePassword.textContent = "Update Password";
  });

  // ───────────────────────────────────────────────
  // Logout
  // ───────────────────────────────────────────────
  async function handleLogout() {
    closeDropdown();
    try {
      await signOut(auth);
      // Redirect handled by onAuthStateChanged
    } catch (error) {
      console.error("Logout failed", error);
    }
  }

  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    handleLogout();
  });

  function getFirebaseErrorMessage(errorCode) {
    switch (errorCode) {
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Incorrect current password.";
      case "auth/too-many-requests":
        return "Too many attempts. Please try again later.";
      default:
        return "Authentication failed: " + errorCode;
    }
  }

  // ───────────────────────────────────────────────
  // DOM References – Form Elements
  // ───────────────────────────────────────────────
  const form = document.getElementById("vendor-pass-form");

  const formNumberInput = document.getElementById("formNumber");
  const gpNumberInput = document.getElementById("gpNumber");
  const vendorCodeInput = document.getElementById("vendorCode");
  const workOrderInput = document.getElementById("workOrderNumber");
  const issuedDateInput = document.getElementById("issuedDate");
  const validTillDateInput = document.getElementById("validTillDate");
  const medicalFromDateInput = document.getElementById("medicalFromDate");
  const medicalToDateInput = document.getElementById("medicalToDate");
  const vendorNameInput = document.getElementById("vendorName");
  const genderInput = document.getElementById("gender");
  const idMarkInput = document.getElementById("idMark");
  const dobInput = document.getElementById("dob");
  const designationInput = document.getElementById("designation");
  const bloodGroupInput = document.getElementById("bloodGroup");
  const companyNameInput = document.getElementById("companyName");
  const categoryInput = document.getElementById("category");
  const passStatusInput = document.getElementById("passStatus");
  const vendorPhotoInput = document.getElementById("vendorPhoto");

  // Output (preview) fields
  const outFormNumber = document.getElementById("outFormNumber");
  const outCompanyName = document.getElementById("outCompanyName");
  const outGpNumber = document.getElementById("outGpNumber");
  const outIssuedDate = document.getElementById("outIssuedDate");
  const outValidTill = document.getElementById("outValidTill");
  const outVendorCode = document.getElementById("outVendorCode");
  const outWorkOrder = document.getElementById("outWorkOrder");
  const outName = document.getElementById("outName");
  const outGender = document.getElementById("outGender");
  const outIdMark = document.getElementById("outIdMark");
  const outDob = document.getElementById("outDob");
  const outDesignation = document.getElementById("outDesignation");
  const outBloodGroup = document.getElementById("outBloodGroup");
  const outCategory = document.getElementById("outCategory");
  const outPassStatus = document.getElementById("outPassStatus");
  const outPhoto = document.getElementById("outPhoto");

  // Buttons
  const btnReset = document.getElementById("btnReset");
  const btnDownload = document.getElementById("btnDownload");
  const btnSaveRecord = document.getElementById("btnSaveRecord");

  // Toast
  const toastNotification = document.getElementById("toastNotification");
  const toastMessage = document.getElementById("toastMessage");

  // Dashboard stat elements
  const statTotalPasses = document.getElementById("statTotalPasses");
  const statActivePasses = document.getElementById("statActivePasses");
  const statExpiredPasses = document.getElementById("statExpiredPasses");
  const statExpiringToday = document.getElementById("statExpiringToday");

  // Pass History DOM
  const passHistoryTableBody = document.getElementById("passHistoryTableBody");
  const historySearch = document.getElementById("historySearch");
  const monthFilter = document.getElementById("monthFilter");
  const historyYearFilter = document.getElementById("historyYearFilter");
  const btnSearchPassHistory = document.getElementById("btnSearchPassHistory");
  const btnExportHistory = document.getElementById("btnExportHistory");

  const expiredPassTableBody = document.getElementById("expiredPassTableBody");
  const expiredSearch = document.getElementById("expiredSearch");
  const expiredMonthFilter = document.getElementById("expiredMonthFilter");
  const expiringYearFilter = document.getElementById("expiringYearFilter");
  const expiringPassTableBody = document.getElementById(
    "expiringPassTableBody",
  );
  const expiringSearch = document.getElementById("expiringSearch");
  const expiringDayFilter = document.getElementById("expiringDayFilter");
  const btnSearchExpiringPasses = document.getElementById(
    "btnSearchExpiringPasses",
  );
  const btnExportExpiringPasses = document.getElementById(
    "btnExportExpiringPasses",
  );
  const btnExpiringPrevPage = document.getElementById("btnExpiringPrevPage");
  const btnExpiringNextPage = document.getElementById("btnExpiringNextPage");
  const expiringPageInfo = document.getElementById("expiringPageInfo");
  const btnSearchExpiredPasses = document.getElementById(
    "btnSearchExpiredPasses",
  );
  const btnExportExpiredPasses = document.getElementById(
    "btnExportExpiredPasses",
  );
  const btnExpiredPrevPage = document.getElementById("btnExpiredPrevPage");
  const btnExpiredNextPage = document.getElementById("btnExpiredNextPage");
  const expiredPageInfo = document.getElementById("expiredPageInfo");
  const btnPrevPage = document.getElementById("btnPrevPage");
  const btnNextPage = document.getElementById("btnNextPage");
  const pageInfo = document.getElementById("pageInfo");

  const companyMonthFilter = document.getElementById("companyMonthFilter");
  const companyYearFilter = document.getElementById("CompanyYearFilter");
  const companyNameSearch = document.getElementById("companyNameSearch");
  const btnSearchCompanies = document.getElementById("btnSearchCompanies");
  const companiesSummaryTableBody = document.getElementById(
    "companiesSummaryTableBody",
  );
  const viewCompanies = document.getElementById("view-companies");
  const viewCompanyDetail = document.getElementById("view-company-detail");
  const btnBackToCompanies = document.getElementById("btnBackToCompanies");
  const companyDetailName = document.getElementById("companyDetailName");
  const companyDetailYear = document.getElementById("companyDetailYear");
  const companyDetailTotal = document.getElementById("companyDetailTotal");
  const companyRecordsSearch = document.getElementById("companyRecordsSearch");
  const btnExportCompanyRecords = document.getElementById(
    "btnExportCompanyRecords",
  );
  const btnExportCompanySummary = document.getElementById(
    "btnExportCompanySummary",
  );
  const companyRecordsTableBody = document.getElementById(
    "companyRecordsTableBody",
  );
  const btnCompanyPrevPage = document.getElementById("btnCompanyPrevPage");
  const btnCompanyNextPage = document.getElementById("btnCompanyNextPage");
  const companyPageInfo = document.getElementById("companyPageInfo");

  const deleteMonthFilter = document.getElementById("deleteMonthFilter");
  const deleteYearFilter = document.getElementById("deleteYearFilter");
  const btnLoadDeleteRecords = document.getElementById("btnLoadDeleteRecords");
  const btnDeleteRecords = document.getElementById("btnDeleteRecords");
  const deleteRecordHint = document.getElementById("deleteRecordHint");
  const deleteRecordsTableBody = document.getElementById(
    "deleteRecordsTableBody",
  );
  const btnDeleteRecordsPrevPage = document.getElementById(
    "btnDeleteRecordsPrevPage",
  );
  const btnDeleteRecordsNextPage = document.getElementById(
    "btnDeleteRecordsNextPage",
  );
  const deleteRecordsPageInfo = document.getElementById(
    "deleteRecordsPageInfo",
  );
  const aboutLastUpdated = document.getElementById("aboutLastUpdated");

  let isPassGenerated = false;

  // ───────────────────────────────────────────────
  // Toast Function
  // ───────────────────────────────────────────────
  function showToast(message, isError = false, isWarning = false) {
    if (!toastNotification || !toastMessage) return;
    toastMessage.textContent = message;
    toastNotification.classList.remove("error", "warning");
    if (isError) {
      toastNotification.classList.add("error");
      toastNotification.querySelector("svg").innerHTML =
        '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>';
    } else if (isWarning) {
      toastNotification.classList.add("warning");
      toastNotification.querySelector("svg").innerHTML =
        '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>';
    } else {
      toastNotification.querySelector("svg").innerHTML =
        '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>';
    }

    const duration = isWarning ? 15000 : 3000;
    toastNotification.classList.add("show");
    setTimeout(() => {
      toastNotification.classList.remove("show");
    }, duration);
  }

  // ───────────────────────────────────────────────
  // Date Helpers
  // ───────────────────────────────────────────────
  const defaultPhoto =
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

  function formatDate(dateString) {
    if (!dateString) return "";
    const parts = dateString.split("-");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateString;
  }

  function formatTimestamp(timestamp) {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return formatDate(`${year}-${month}-${day}`);
  }

  function getTodayString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  /**
   * Validate medical dates before pass generation.
   * Returns false to block generation, or an object with warning info.
   */
  function validateMedicalDatesForGenerate() {
    const issuedDate = issuedDateInput?.value || "";
    const validTill = validTillDateInput?.value || "";
    const medicalFrom = medicalFromDateInput?.value || "";
    const medicalTo = medicalToDateInput?.value || "";

    if (!medicalFrom || !medicalTo) {
      showToast("Please enter medical validity dates.", true);
      return false;
    }
    if (issuedDate > validTill) {
      showToast("Valid Till Date cannot be earlier than Issue Date.", true);
      return false;
    }

    if (medicalFrom > medicalTo) {
      showToast(
        "Medical From Date cannot be later than Medical To Date.",
        true,
      );
      return false;
    }

    if (issuedDate > medicalTo) {
      showToast(
        "Please update Medical Status before generating the pass preview.",
        true,
      );
      return false;
    }

    if (issuedDate < medicalFrom) {
      showToast(
        "Please correct the pass issued date or medical validity dates before generating the pass preview.",
        true,
      );
      return false;
    }

    if (medicalTo < validTill) {
      showToast(
        `Gate pass can only be generated up to the Medical To Date.(${formatDate(medicalTo)})`,
        true,
      );
      return false;
    }

    return true;
  }

  // ───────────────────────────────────────────────
  // Photo Upload Preview
  // ───────────────────────────────────────────────
  let currentPhotoBase64 = defaultPhoto;
  if (vendorPhotoInput) {
    vendorPhotoInput.addEventListener("change", function (e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (event) {
          currentPhotoBase64 = event.target.result;
        };
        reader.readAsDataURL(file);
      } else {
        currentPhotoBase64 = defaultPhoto;
      }
    });
  }

  // ───────────────────────────────────────────────
  // Generate Pass (Form Submit)
  // ───────────────────────────────────────────────
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const medicalValidation = validateMedicalDatesForGenerate();
      if (!medicalValidation) return;

      outFormNumber.textContent =
        formNumberInput.value || "FORM NO-S&F/1403/R.O";
      outCompanyName.textContent = companyNameInput.value || "COMPANY NAME";
      outGpNumber.textContent = gpNumberInput.value;
      outIssuedDate.textContent = formatDate(issuedDateInput.value);
      outValidTill.textContent = formatDate(validTillDateInput.value);
      outVendorCode.textContent = vendorCodeInput.value;
      outWorkOrder.textContent = workOrderInput.value;
      outName.textContent = vendorNameInput.value;
      outGender.textContent = genderInput.value;
      outIdMark.textContent = idMarkInput.value;
      outDob.textContent = formatDate(dobInput.value);
      outDesignation.textContent = designationInput.value;
      outBloodGroup.textContent = bloodGroupInput.value;
      outCategory.textContent = categoryInput.value;
      outPassStatus.textContent = passStatusInput.value;

      outPhoto.src = currentPhotoBase64;
      btnDownload.disabled = false;
      isPassGenerated = true;

      document
        .querySelector(".preview-section")
        .scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // ───────────────────────────────────────────────
  // Reset Form
  // ───────────────────────────────────────────────
  if (btnReset) {
    btnReset.addEventListener("click", () => {
      form.reset();

      outFormNumber.textContent = "FORM NO-S&F/1403/R.O";
      outCompanyName.textContent = "COMPANY NAME";
      outGpNumber.textContent = "";
      outIssuedDate.textContent = "";
      outValidTill.textContent = "";
      outVendorCode.textContent = "";
      outWorkOrder.textContent = "";
      outName.textContent = "";
      outGender.textContent = "";
      outIdMark.textContent = "";
      outDob.textContent = "";
      outDesignation.textContent = "";
      outBloodGroup.textContent = "";
      outCategory.textContent = "";
      outPassStatus.textContent = "NEW";

      currentPhotoBase64 = defaultPhoto;
      outPhoto.src = currentPhotoBase64;

      btnDownload.disabled = true;
      isPassGenerated = false;
    });
  }

  // Invalidate generated pass if any field is changed
  if (form) {
    const invalidatePass = () => {
      isPassGenerated = false;
      if (btnDownload) btnDownload.disabled = true;
    };
    form.addEventListener("input", invalidatePass);
    form.addEventListener("change", invalidatePass);
  }

  // ───────────────────────────────────────────────
  // Download JPG
  // ───────────────────────────────────────────────
  if (btnDownload) {
    btnDownload.addEventListener("click", () => {
      const passCard = document.getElementById("pass-card");

      if (typeof html2canvas === "undefined") {
        alert(
          "html2canvas library is not loaded. Please check your internet connection.",
        );
        return;
      }

      setTimeout(() => {
        html2canvas(passCard, {
          scale: 3,
          useCORS: true,
          backgroundColor: "#fcf9cd",
        })
          .then((canvas) => {
            const imgData = canvas.toDataURL("image/jpeg", 1.0);
            const link = document.createElement("a");
            const gpNumber = gpNumberInput.value
              ? gpNumberInput.value.replace(/[^a-z0-9]/gi, "_").toUpperCase()
              : "GP";
            link.download = `entry_permit_${gpNumber}.jpg`;
            link.href = imgData;
            link.click();
          })
          .catch((err) => {
            console.error("Error generating image: ", err);
            alert("An error occurred while generating the image.");
          });
      }, 100);
    });
  }

  // ═══════════════════════════════════════════════
  // FIRESTORE: DASHBOARD STATS
  // ═══════════════════════════════════════════════

  /**
   * Ensures dashboard/stats document exists.
   * Called once at startup.
   */
  async function ensureStatsDocExists() {
    const statsRef = doc(db, "dashboard", "stats");
    const snap = await getDoc(statsRef);
    if (!snap.exists()) {
      await setDoc(statsRef, {
        totalPasses: 0,
        activePasses: 0,
        expiredPasses: 0,
        expiringToday: 0,
        lastExpirySyncDate: "",
        lastExpiringTodayUpdate: "",
        updatedAt: serverTimestamp(),
      });
    }
  }
  async function syncDashboardCounters() {
    try {
      const today = getTodayString();

      const statsRef = doc(db, "dashboard", "stats");
      const statsSnap = await getDoc(statsRef);

      if (!statsSnap.exists()) return;

      const stats = statsSnap.data();

      // Already synced today
      if (
        stats.lastExpirySyncDate === today &&
        stats.lastExpiringTodayUpdate === today
      ) {
        return;
      }

      // Find Active passes that should now be Expired
      const expiredQuery = query(
        collection(db, "gatePasses"),
        where("status", "==", "Active"),
        where("validTillDate", "<", today),
      );

      const expiredSnap = await getDocs(expiredQuery);

      const expiredCount = expiredSnap.size;

      // Update status of expired passes
      const updates = [];

      expiredSnap.forEach((docSnap) => {
        updates.push(
          updateDoc(doc(db, "gatePasses", docSnap.id), {
            status: "Expired",
          }),
        );
      });

      await Promise.all(updates);

      // Calculate Expiring Today
      const expiringTodayQuery = query(
        collection(db, "gatePasses"),
        where("status", "==", "Active"),
        where("validTillDate", "==", today),
      );

      const expiringTodaySnap = await getDocs(expiringTodayQuery);

      await updateDoc(statsRef, {
        activePasses: increment(-expiredCount),
        expiredPasses: increment(expiredCount),
        expiringToday: expiringTodaySnap.size,
        lastExpirySyncDate: today,
        lastExpiringTodayUpdate: today,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("[Dashboard Sync] Error:", error);
    }
  }

  /**
   * Loads dashboard statistics:
   * 1. Read dashboard/stats (1 read)
   * 2. Query passes where validTillDate == today (expiringToday count)
   */
  async function loadDashboardStats() {
    try {
      const statsRef = doc(db, "dashboard", "stats");
      const statsSnap = await getDoc(statsRef);

      let data = {};

      if (statsSnap.exists()) {
        data = statsSnap.data();

        statTotalPasses.textContent = data.totalPasses || 0;
        statActivePasses.textContent = data.activePasses || 0;
        statExpiredPasses.textContent = data.expiredPasses || 0;
        statExpiringToday.textContent = data.expiringToday || 0;
      } else {
        statTotalPasses.textContent = 0;
        statActivePasses.textContent = 0;
        statExpiredPasses.textContent = 0;
        statExpiringToday.textContent = 0;
      }
    } catch (error) {
      console.error("[Dashboard] Error loading stats:", error);
    }
  }
  // ═══════════════════════════════════════════════
  // FIRESTORE: SAVE RECORD
  // ═══════════════════════════════════════════════

  if (btnSaveRecord) {
    btnSaveRecord.addEventListener("click", async () => {
      if (!isPassGenerated) {
        showToast("Please generate the pass first.", true);
        return;
      }

      const isConfirmed = confirm("Are you sure to save the record?");
      if (!isConfirmed) return;

      // Disable button to prevent double-click
      btnSaveRecord.disabled = true;
      btnSaveRecord.textContent = "Saving...";

      try {
        const today = getTodayString();
        const validTill = validTillDateInput.value; // YYYY-MM-DD
        const issuedDate = issuedDateInput.value; // YYYY-MM-DD

        // Determine status: Active or Expired
        const status = validTill < today ? "Expired" : "Active";

        // Parse year/month from issuedDate for efficient filtering
        const issuedParts = issuedDate.split("-");
        const issuedYear = parseInt(issuedParts[0], 10);
        const issuedMonth = parseInt(issuedParts[1], 10);

        // Pass data document
        const passData = {
          formNumber: formNumberInput.value,
          gpNumber: gpNumberInput.value,
          vendorCode: vendorCodeInput.value,
          workOrderNumber: workOrderInput.value,
          issuedDate: issuedDate,
          validTillDate: validTill,
          medicalFromDate: medicalFromDateInput?.value || "",
          medicalToDate: medicalToDateInput?.value || "",
          vendorName: vendorNameInput.value,
          gender: genderInput.value,
          idMark: idMarkInput.value,
          dob: dobInput.value,
          bloodGroup: bloodGroupInput.value,
          designation: designationInput.value,
          companyName: companyNameInput.value,
          category: categoryInput.value,
          passType: passStatusInput.value,
          status: status,
          issuedYear: issuedYear,
          issuedMonth: issuedMonth,
          createdAt: serverTimestamp(),
        };

        // 1. Write pass document
        await addDoc(collection(db, "gatePasses"), passData);

        // 2. Update dashboard/stats using increment()
        const statsRef = doc(db, "dashboard", "stats");
        const statsUpdate = {
          totalPasses: increment(1),
          updatedAt: serverTimestamp(),
        };

        if (status === "Active") {
          statsUpdate.activePasses = increment(1);
        }

        if (validTill === today) {
          statsUpdate.expiringToday = increment(1);
        }

        if (status === "Expired") {
          statsUpdate.expiredPasses = increment(1);
        }
        await updateDoc(statsRef, statsUpdate);

        showToast("✔ Data Saved Successfully");

        // Reset the form
        if (btnReset) {
          btnReset.click();
        }
      } catch (error) {
        console.error("[Save Record] Error:", error);
        showToast("Error saving record. Please try again.", true);
      } finally {
        btnSaveRecord.disabled = false;
        btnSaveRecord.textContent = "Save Record";
      }
    });
  }

  // ═══════════════════════════════════════════════
  // FIRESTORE: PASS HISTORY
  // ═══════════════════════════════════════════════

  let allPassRecords = []; // All records loaded from Firestore for selected year/month
  let filteredRecords = []; // After local search filtering
  let currentPage = 1;
  const recordsPerPage = 20;
  const PASS_HISTORY_COLSPAN = 19;

  function showPassHistoryFilterPrompt() {
    allPassRecords = [];
    filteredRecords = [];
    currentPage = 1;
    passHistoryTableBody.innerHTML = `
      <tr><td colspan="${PASS_HISTORY_COLSPAN}">
        <div class="table-empty-state">
          <p>Select year and month to view records</p>
        </div>
      </td></tr>`;
    pageInfo.textContent = "Page 1 of 1";
    btnPrevPage.disabled = true;
    btnNextPage.disabled = true;
  }

  function arePassHistoryFiltersSelected() {
    return Boolean(historyYearFilter?.value && monthFilter?.value);
  }

  function validateMonthYearFilters(monthSelect, yearSelect) {
    const hasMonth = Boolean(monthSelect?.value);
    const hasYear = Boolean(yearSelect?.value);

    if (!hasMonth && !hasYear) {
      showToast("Please select Month and Year.", true);
      return false;
    }
    if (!hasMonth) {
      showToast("Please select a Month.", true);
      return false;
    }
    if (!hasYear) {
      showToast("Please select a Year.", true);
      return false;
    }
    return true;
  }

  /**
   * Load pass records from Firestore filtered by year (and optionally month).
   * Stores results in allPassRecords[].
   */
  async function loadPassHistory() {
    const selectedYear = historyYearFilter.value;
    const selectedMonth = monthFilter.value;

    if (!selectedYear || !selectedMonth) {
      showPassHistoryFilterPrompt();
      return;
    }

    const selectedYearInt = parseInt(selectedYear, 10);

    // Show loading state
    passHistoryTableBody.innerHTML = `
      <tr><td colspan="${PASS_HISTORY_COLSPAN}">
        <div class="table-loading">
          <div class="spinner"></div>
          <p>Loading records...</p>
        </div>
      </td></tr>`;

    try {
      let q;
      if (selectedMonth === "all") {
        q = query(
          collection(db, "gatePasses"),
          where("issuedYear", "==", selectedYearInt),
          orderBy("createdAt", "desc"),
        );
      } else {
        q = query(
          collection(db, "gatePasses"),
          where("issuedYear", "==", selectedYearInt),
          where("issuedMonth", "==", parseInt(selectedMonth, 10)),
          orderBy("createdAt", "desc"),
        );
      }

      const snapshot = await getDocs(q);
      allPassRecords = [];
      snapshot.forEach((docSnap) => {
        allPassRecords.push({ id: docSnap.id, ...docSnap.data() });
      });

      // Apply current search filter
      applySearchFilter();
    } catch (error) {
      console.error("[Pass History] Error loading:", error);
      passHistoryTableBody.innerHTML = `
        <tr><td colspan="${PASS_HISTORY_COLSPAN}">
          <div class="table-empty-state">
            <p>Error loading records. Please try again.</p>
          </div>
        </td></tr>`;
    }
  }

  /**
   * Filter allPassRecords locally based on search input.
   */
  function applySearchFilter() {
    const searchTerm = (historySearch.value || "").toLowerCase().trim();

    if (!searchTerm) {
      filteredRecords = [...allPassRecords];
    } else {
      filteredRecords = allPassRecords.filter((record) => {
        const searchableFields = [
          record.gpNumber,
          record.workOrderNumber,
          record.vendorName,
          record.companyName,
        ];
        return searchableFields.some((field) =>
          (field || "").toLowerCase().includes(searchTerm),
        );
      });
    }

    currentPage = 1;
    renderPassHistoryTable();
  }

  /**
   * Render the pass history table for the current page.
   */
  function renderPassHistoryTable() {
    const totalRecords = filteredRecords.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / recordsPerPage));

    // Clamp current page
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIdx = (currentPage - 1) * recordsPerPage;
    const endIdx = Math.min(startIdx + recordsPerPage, totalRecords);
    const pageRecords = filteredRecords.slice(startIdx, endIdx);

    if (totalRecords === 0) {
      passHistoryTableBody.innerHTML = `
        <tr><td colspan="${PASS_HISTORY_COLSPAN}">
          <div class="table-empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <p>No records found</p>
          </div>
        </td></tr>`;
    } else {
      passHistoryTableBody.innerHTML = pageRecords
        .map((record) => {
          const statusClass =
            record.status === "Expired" ? "badge-expired" : "badge-active";
          return `<tr>
          <td>${escapeHtml(record.formNumber || "")}</td>
          <td>${escapeHtml(record.gpNumber || "")}</td>
          <td>${escapeHtml(record.vendorCode || "")}</td>
          <td>${escapeHtml(record.workOrderNumber || "")}</td>
          <td>${formatDate(record.issuedDate || "")}</td>
          <td>${formatDate(record.validTillDate || "")}</td>
          <td>${formatDate(record.medicalFromDate || "")}</td>
          <td>${formatDate(record.medicalToDate || "")}</td>
          <td>${escapeHtml(record.vendorName || "")}</td>
          <td>${escapeHtml(record.gender || "")}</td>
          <td>${escapeHtml(record.idMark || "")}</td>
          <td>${formatDate(record.dob || "")}</td>
          <td>${escapeHtml(record.bloodGroup || "")}</td>
          <td>${escapeHtml(record.designation || "")}</td>
          <td>${escapeHtml(record.companyName || "")}</td>
          <td>${escapeHtml(record.category || "")}</td>
          <td>${escapeHtml(record.passType || "")}</td>
          <td><span class="badge ${statusClass}">${escapeHtml(record.status || "")}</span></td>
          <td>
            <button
              type="button"
              class="btn-renew-pass"
              data-record-id="${escapeHtml(record.id)}"
              title="Renew this pass"
            >
              Renew
            </button>
          </td>
        </tr>`;
        })
        .join("");
    }

    // Update pagination controls
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    btnPrevPage.disabled = currentPage <= 1;
    btnNextPage.disabled = currentPage >= totalPages;
  }

  /**
   * HTML escape utility to prevent XSS
   */
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function populateGeneratePassFormForRenew(record) {
    if (!record || !form) return;

    if (formNumberInput) {
      formNumberInput.value = record.formNumber || "";
    }
    if (gpNumberInput) gpNumberInput.value = record.gpNumber || "";
    if (vendorCodeInput) vendorCodeInput.value = record.vendorCode || "";
    if (workOrderInput) {
      workOrderInput.value = record.workOrderNumber || "";
    }
    if (vendorNameInput) vendorNameInput.value = record.vendorName || "";
    if (genderInput) genderInput.value = record.gender || "";
    if (idMarkInput) idMarkInput.value = record.idMark || "";
    if (dobInput) dobInput.value = record.dob || "";
    if (bloodGroupInput) bloodGroupInput.value = record.bloodGroup || "";
    if (designationInput) {
      designationInput.value = record.designation || "";
    }
    if (companyNameInput) companyNameInput.value = record.companyName || "";
    if (categoryInput) categoryInput.value = record.category || "";
    if (passStatusInput) passStatusInput.value = record.passType || "NEW";

    if (issuedDateInput) issuedDateInput.value = "";
    if (validTillDateInput) validTillDateInput.value = "";
    if (medicalFromDateInput) {
      medicalFromDateInput.value = record.medicalFromDate || "";
    }
    if (medicalToDateInput) {
      medicalToDateInput.value = record.medicalToDate || "";
    }

    isPassGenerated = false;
    if (btnDownload) btnDownload.disabled = true;
    currentPhotoBase64 = defaultPhoto;
    if (vendorPhotoInput) vendorPhotoInput.value = "";
    if (outPhoto) outPhoto.src = defaultPhoto;
  }

  function renewPassRecord(record) {
    populateGeneratePassFormForRenew(record);
    switchView("generate-pass");

    requestAnimationFrame(() => {
      const formSection = document.querySelector(
        "#view-generate-pass .form-section",
      );
      if (formSection) {
        formSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      if (issuedDateInput) issuedDateInput.focus();
    });

    showToast("Record loaded successfully for renewal.");
  }

  // ───────────────────────────────────────────────
  // Pass History: Event Listeners
  // ───────────────────────────────────────────────

  // Search – local JS filtering (no Firestore query)
  if (historySearch) {
    historySearch.addEventListener("input", () => {
      if (!arePassHistoryFiltersSelected()) return;
      applySearchFilter();
    });
  }

  if (btnSearchPassHistory) {
    btnSearchPassHistory.addEventListener("click", () => {
      if (!validateMonthYearFilters(monthFilter, historyYearFilter)) return;
      loadPassHistory();
    });
  }

  // Pagination buttons
  if (btnPrevPage) {
    btnPrevPage.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderPassHistoryTable();
      }
    });
  }
  if (btnNextPage) {
    btnNextPage.addEventListener("click", () => {
      const totalPages = Math.max(
        1,
        Math.ceil(filteredRecords.length / recordsPerPage),
      );
      if (currentPage < totalPages) {
        currentPage++;
        renderPassHistoryTable();
      }
    });
  }

  if (passHistoryTableBody) {
    passHistoryTableBody.addEventListener("click", (e) => {
      const renewBtn = e.target.closest(".btn-renew-pass");
      if (!renewBtn) return;

      const recordId = renewBtn.dataset.recordId;
      if (!recordId) return;

      const record =
        filteredRecords.find((item) => item.id === recordId) ||
        allPassRecords.find((item) => item.id === recordId);
      if (record) renewPassRecord(record);
    });
  }

  // ═══════════════════════════════════════════════
  // EXPORT EXCEL – ALL filtered records
  // ═══════════════════════════════════════════════

  if (btnExportHistory) {
    btnExportHistory.addEventListener("click", () => {
      if (!arePassHistoryFiltersSelected()) {
        showToast("Please select year and month first.", true);
        return;
      }
      if (filteredRecords.length === 0) {
        showToast("No records to export.", true);
        return;
      }

      try {
        // Build data array for SheetJS
        const exportData = filteredRecords.map((record, index) => ({
          "S.No": index + 1,
          "Form No": record.formNumber || "",
          "GP Number": record.gpNumber || "",
          "Vendor Code": record.vendorCode || "",
          "Work Order Number": record.workOrderNumber || "",
          "Issued Date": formatDate(record.issuedDate || ""),
          "Valid Till Date": formatDate(record.validTillDate || ""),
          "Medical From Date": formatDate(record.medicalFromDate || ""),
          "Medical To Date": formatDate(record.medicalToDate || ""),
          "Vendor Name": record.vendorName || "",
          Gender: record.gender || "",
          "Identification Mark": record.idMark || "",
          "Date of Birth": formatDate(record.dob || ""),
          "Blood Group": record.bloodGroup || "",
          Designation: record.designation || "",
          "Company Name": record.companyName || "",
          Category: record.category || "",
          "Pass Type": record.passType || "",
          Status: record.status || "",
        }));

        // Use SheetJS to create .xlsx file
        if (typeof XLSX !== "undefined") {
          const ws = XLSX.utils.json_to_sheet(exportData);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Pass History");

          // Auto-size columns
          const colWidths = Object.keys(exportData[0]).map((key) => ({
            wch:
              Math.max(
                key.length,
                ...exportData.map((row) => String(row[key]).length),
              ) + 2,
          }));
          ws["!cols"] = colWidths;

          const selectedYear = historyYearFilter.value;
          const selectedMonth = monthFilter.value;

          let fileName;

          if (selectedMonth === "all") {
            fileName = `TSSEZ_GatePass_History_${selectedYear}.xlsx`;
          } else {
            const monthNames = {
              1: "January",
              2: "February",
              3: "March",
              4: "April",
              5: "May",
              6: "June",
              7: "July",
              8: "August",
              9: "September",
              10: "October",
              11: "November",
              12: "December",
            };

            fileName = `TSSEZ_GatePass_History_${monthNames[selectedMonth]}_${selectedYear}.xlsx`;
          }

          XLSX.writeFile(wb, fileName);
          showToast(`✔ Exported ${filteredRecords.length} records`);
        } else {
          // Fallback: CSV export
          const headers = Object.keys(exportData[0]);
          const csvContent = [
            headers.join(","),
            ...exportData.map((row) =>
              headers
                .map((h) => `"${String(row[h]).replace(/"/g, '""')}"`)
                .join(","),
            ),
          ].join("\n");

          const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
          });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          const selectedYear = historyYearFilter.value;
          const selectedMonth = monthFilter.value;

          let fileName;

          if (selectedMonth === "all") {
            fileName = `TSSEZ_GatePass_History_${selectedYear}.csv`;
          } else {
            const monthNames = {
              1: "January",
              2: "February",
              3: "March",
              4: "April",
              5: "May",
              6: "June",
              7: "July",
              8: "August",
              9: "September",
              10: "October",
              11: "November",
              12: "December",
            };

            fileName = `TSSEZ_GatePass_History_${monthNames[selectedMonth]}_${selectedYear}.csv`;
          }

          link.download = fileName;
          link.click();
          URL.revokeObjectURL(link.href);
          showToast(`✔ Exported ${filteredRecords.length} records (CSV)`);
        }
      } catch (error) {
        console.error("[Export] Error:", error);
        showToast("Error exporting records.", true);
      }
    });
  }

  // ═══════════════════════════════════════════════
  // FIRESTORE: EXPIRING PASS RECORDS
  // ═══════════════════════════════════════════════

  let allExpiringPassRecords = [];
  let filteredExpiringRecords = [];
  let expiringCurrentPage = 1;
  const expiringRecordsPerPage = 5;

  function getFutureDateString(daysToAdd) {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getExpiringPassSearchableValues(record) {
    return [
      record.gpNumber,
      record.workOrderNumber,
      record.vendorName,
      record.companyName,
    ];
  }

  function expiringRecordMatchesSearch(record, searchTerm) {
    if (!searchTerm) return true;
    return getExpiringPassSearchableValues(record).some((field) =>
      (field || "").toLowerCase().includes(searchTerm),
    );
  }

  function updateExpiringPaginationControls(totalRecords) {
    const totalPages = Math.max(
      1,
      Math.ceil(totalRecords / expiringRecordsPerPage),
    );
    if (expiringPageInfo) {
      expiringPageInfo.textContent = `Page ${expiringCurrentPage} of ${totalPages}`;
    }
    if (btnExpiringPrevPage) {
      btnExpiringPrevPage.disabled = expiringCurrentPage <= 1;
    }
    if (btnExpiringNextPage) {
      btnExpiringNextPage.disabled = expiringCurrentPage >= totalPages;
    }
  }

  function resetExpiringPaginationControls() {
    expiringCurrentPage = 1;
    if (expiringPageInfo) expiringPageInfo.textContent = "Page 1 of 1";
    if (btnExpiringPrevPage) btnExpiringPrevPage.disabled = true;
    if (btnExpiringNextPage) btnExpiringNextPage.disabled = true;
  }

  function showExpiringPassFilterPrompt() {
    allExpiringPassRecords = [];
    filteredExpiringRecords = [];
    resetExpiringPaginationControls();
    if (!expiringPassTableBody) return;
    expiringPassTableBody.innerHTML = `
      <tr><td colspan="19">
        <div class="table-empty-state">
          <p>Select day range, then click Search to view records</p>
        </div>
      </td></tr>`;
  }

  function buildExpiringPassExportFileName() {
    const selectedDayRange = expiringDayFilter?.value || "range";
    if (selectedDayRange === "0") return "TSSEZ_Expiring_Passes_Today.xlsx";
    if (selectedDayRange === "1") return "TSSEZ_Expiring_Passes_Tomorrow.xlsx";
    return `TSSEZ_Expiring_Passes_${selectedDayRange}_Days.xlsx`;
  }

  function exportExpiringPasses() {
    if (allExpiringPassRecords.length === 0) {
      showToast("Please search for records first.", true);
      return;
    }
    if (filteredExpiringRecords.length === 0) {
      showToast("No records to export.", true);
      return;
    }

    try {
      const exportData = filteredExpiringRecords.map((record, index) => ({
        "S.No": index + 1,
        "Form No": record.formNumber || "",
        "GP Number": record.gpNumber || "",
        "Vendor Code": record.vendorCode || "",
        "Work Order Number": record.workOrderNumber || "",
        "Issued Date": formatDate(record.issuedDate || ""),
        "Valid Till Date": formatDate(record.validTillDate || ""),
        "Medical From Date": formatDate(record.medicalFromDate || ""),
        "Medical To Date": formatDate(record.medicalToDate || ""),
        "Vendor Name": record.vendorName || "",
        Gender: record.gender || "",
        "Identification Mark": record.idMark || "",
        "Date of Birth": formatDate(record.dob || ""),
        "Blood Group": record.bloodGroup || "",
        Designation: record.designation || "",
        "Company Name": record.companyName || "",
        Category: record.category || "",
        "Pass Type": record.passType || "",
        Status: record.status || "",
        "Generation Date": formatTimestamp(record.createdAt),
      }));

      const fileName = buildExpiringPassExportFileName();

      if (typeof XLSX !== "undefined") {
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Expiring Passes");

        const colWidths = Object.keys(exportData[0]).map((key) => ({
          wch:
            Math.max(
              key.length,
              ...exportData.map((row) => String(row[key]).length),
            ) + 2,
        }));
        ws["!cols"] = colWidths;

        XLSX.writeFile(wb, fileName);
        showToast(`✔ Exported ${filteredExpiringRecords.length} records`);
      } else {
        const headers = Object.keys(exportData[0]);
        const csvContent = [
          headers.join(","),
          ...exportData.map((row) =>
            headers
              .map((h) => `"${String(row[h]).replace(/"/g, '""')}"`)
              .join(","),
          ),
        ].join("\n");

        const blob = new Blob([csvContent], {
          type: "text/csv;charset=utf-8;",
        });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = fileName.replace(".xlsx", ".csv");
        link.click();
        URL.revokeObjectURL(link.href);
        showToast(`✔ Exported ${filteredExpiringRecords.length} records (CSV)`);
      }
    } catch (error) {
      console.error("[Expiring Export] Error:", error);
      showToast("Error exporting records.", true);
    }
  }

  async function loadExpiringPasses() {
    const selectedDayRange = expiringDayFilter?.value || "";

    if (!selectedDayRange) {
      showToast("Please select day range.", true);
      showExpiringPassFilterPrompt();
      return;
    }

    const endDate = getFutureDateString(parseInt(selectedDayRange, 10));
    const today = getTodayString();

    expiringPassTableBody.innerHTML = `
      <tr><td colspan="19">
        <div class="table-loading">
          <div class="spinner"></div>
          <p>Loading records...</p>
        </div>
      </td></tr>`;

    try {
      const q = query(
        collection(db, "gatePasses"),
        where("status", "==", "Active"),
        where("validTillDate", ">=", today),
        where("validTillDate", "<=", endDate),
        orderBy("validTillDate", "asc"),
      );

      const snapshot = await getDocs(q);
      allExpiringPassRecords = [];
      snapshot.forEach((docSnap) => {
        allExpiringPassRecords.push({ id: docSnap.id, ...docSnap.data() });
      });

      expiringCurrentPage = 1;
      if (expiringSearch) expiringSearch.value = "";
      applyExpiringSearchFilter();
    } catch (error) {
      console.error("[Expiring Passes] Error loading:", error);
      expiringPassTableBody.innerHTML = `
        <tr><td colspan="19">
          <div class="table-empty-state">
            <p>Error loading records. Please try again.</p>
          </div>
        </td></tr>`;
    }
  }

  function applyExpiringSearchFilter() {
    const searchTerm = (expiringSearch?.value || "").toLowerCase().trim();
    filteredExpiringRecords = allExpiringPassRecords.filter((record) =>
      expiringRecordMatchesSearch(record, searchTerm),
    );

    expiringCurrentPage = 1;
    renderExpiringPassTable();
  }

  function renderExpiringPassTable() {
    if (!expiringPassTableBody) return;

    const totalRecords = filteredExpiringRecords.length;
    const totalPages = Math.max(
      1,
      Math.ceil(totalRecords / expiringRecordsPerPage),
    );

    if (expiringCurrentPage > totalPages) expiringCurrentPage = totalPages;
    if (expiringCurrentPage < 1) expiringCurrentPage = 1;

    if (totalRecords === 0) {
      expiringPassTableBody.innerHTML = `
        <tr><td colspan="19">
          <div class="table-empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <p>No records found</p>
          </div>
        </td></tr>`;
      updateExpiringPaginationControls(0);
      return;
    }

    const startIdx = (expiringCurrentPage - 1) * expiringRecordsPerPage;
    const endIdx = Math.min(startIdx + expiringRecordsPerPage, totalRecords);
    const pageRecords = filteredExpiringRecords.slice(startIdx, endIdx);

    expiringPassTableBody.innerHTML = pageRecords
      .map(
        (record) => `<tr>
          <td>${escapeHtml(record.formNumber || "")}</td>
          <td>${escapeHtml(record.gpNumber || "")}</td>
          <td>${escapeHtml(record.vendorCode || "")}</td>
          <td>${escapeHtml(record.workOrderNumber || "")}</td>
          <td>${formatDate(record.issuedDate || "")}</td>
          <td>${formatDate(record.validTillDate || "")}</td>
          <td>${formatDate(record.medicalFromDate || "")}</td>
          <td>${formatDate(record.medicalToDate || "")}</td>
          <td>${escapeHtml(record.vendorName || "")}</td>
          <td>${escapeHtml(record.gender || "")}</td>
          <td>${escapeHtml(record.idMark || "")}</td>
          <td>${formatDate(record.dob || "")}</td>
          <td>${escapeHtml(record.bloodGroup || "")}</td>
          <td>${escapeHtml(record.designation || "")}</td>
          <td>${escapeHtml(record.companyName || "")}</td>
          <td>${escapeHtml(record.category || "")}</td>
          <td>${escapeHtml(record.passType || "")}</td>
          <td><span class="badge badge-active">${escapeHtml(record.status || "")}</span></td>
          <td>${escapeHtml(formatTimestamp(record.createdAt))}</td>
        </tr>`,
      )
      .join("");

    updateExpiringPaginationControls(totalRecords);
  }

  if (expiringSearch) {
    expiringSearch.addEventListener("input", () => {
      if (allExpiringPassRecords.length === 0) return;
      applyExpiringSearchFilter();
    });
  }

  if (btnSearchExpiringPasses) {
    btnSearchExpiringPasses.addEventListener("click", () => {
      loadExpiringPasses();
    });
  }

  if (btnExportExpiringPasses) {
    btnExportExpiringPasses.addEventListener("click", exportExpiringPasses);
  }

  if (btnExpiringPrevPage) {
    btnExpiringPrevPage.addEventListener("click", () => {
      if (expiringCurrentPage > 1) {
        expiringCurrentPage--;
        renderExpiringPassTable();
      }
    });
  }

  if (btnExpiringNextPage) {
    btnExpiringNextPage.addEventListener("click", () => {
      const totalPages = Math.max(
        1,
        Math.ceil(filteredExpiringRecords.length / expiringRecordsPerPage),
      );
      if (expiringCurrentPage < totalPages) {
        expiringCurrentPage++;
        renderExpiringPassTable();
      }
    });
  }

  // ═══════════════════════════════════════════════
  // FIRESTORE: EXPIRED PASS RECORDS
  // ═══════════════════════════════════════════════

  let allExpiredPassRecords = [];
  let filteredExpiredRecords = [];
  let expiredCurrentPage = 1;
  const expiredRecordsPerPage = 5;

  const EXPIRED_PASS_MONTH_NAMES = {
    1: "January",
    2: "February",
    3: "March",
    4: "April",
    5: "May",
    6: "June",
    7: "July",
    8: "August",
    9: "September",
    10: "October",
    11: "November",
    12: "December",
  };

  function getExpiredPassSearchableValues(record) {
    return [
      record.gpNumber,
      record.workOrderNumber,
      record.vendorName,
      record.companyName,
    ];
  }

  function expiredRecordMatchesSearch(record, searchTerm) {
    if (!searchTerm) return true;
    return getExpiredPassSearchableValues(record).some((field) =>
      (field || "").toLowerCase().includes(searchTerm),
    );
  }

  function updateExpiredPaginationControls(totalRecords) {
    const totalPages = Math.max(
      1,
      Math.ceil(totalRecords / expiredRecordsPerPage),
    );
    if (expiredPageInfo) {
      expiredPageInfo.textContent = `Page ${expiredCurrentPage} of ${totalPages}`;
    }
    if (btnExpiredPrevPage) {
      btnExpiredPrevPage.disabled = expiredCurrentPage <= 1;
    }
    if (btnExpiredNextPage) {
      btnExpiredNextPage.disabled = expiredCurrentPage >= totalPages;
    }
  }

  function resetExpiredPaginationControls() {
    expiredCurrentPage = 1;
    if (expiredPageInfo) expiredPageInfo.textContent = "Page 1 of 1";
    if (btnExpiredPrevPage) btnExpiredPrevPage.disabled = true;
    if (btnExpiredNextPage) btnExpiredNextPage.disabled = true;
  }

  function showExpiredPassFilterPrompt() {
    allExpiredPassRecords = [];
    filteredExpiredRecords = [];
    resetExpiredPaginationControls();
    if (!expiredPassTableBody) return;
    expiredPassTableBody.innerHTML = `
      <tr><td colspan="19">
        <div class="table-empty-state">
          <p>Select year and month to view records</p>
        </div>
      </td></tr>`;
  }

  function buildExpiredPassExportFileName() {
    const selectedYear = expiringYearFilter?.value || "Year";
    const selectedMonth = expiredMonthFilter?.value || "";
    if (selectedMonth === "all" || !selectedMonth) {
      return `TSSEZ_Expired_Passes_${selectedYear}.xlsx`;
    }
    const monthLabel = EXPIRED_PASS_MONTH_NAMES[selectedMonth] || selectedMonth;
    return `TSSEZ_Expired_Passes_${monthLabel}_${selectedYear}.xlsx`;
  }

  function exportExpiredPasses() {
    if (allExpiredPassRecords.length === 0) {
      showToast("Please search for records first.", true);
      return;
    }
    if (filteredExpiredRecords.length === 0) {
      showToast("No records to export.", true);
      return;
    }

    try {
      const exportData = filteredExpiredRecords.map((record, index) => ({
        "S.No": index + 1,
        "Form No": record.formNumber || "",
        "GP Number": record.gpNumber || "",
        "Vendor Code": record.vendorCode || "",
        "Work Order Number": record.workOrderNumber || "",
        "Issued Date": formatDate(record.issuedDate || ""),
        "Valid Till Date": formatDate(record.validTillDate || ""),
        "Medical From Date": formatDate(record.medicalFromDate || ""),
        "Medical To Date": formatDate(record.medicalToDate || ""),
        "Vendor Name": record.vendorName || "",
        Gender: record.gender || "",
        "Identification Mark": record.idMark || "",
        "Date of Birth": formatDate(record.dob || ""),
        "Blood Group": record.bloodGroup || "",
        Designation: record.designation || "",
        "Company Name": record.companyName || "",
        Category: record.category || "",
        "Pass Type": record.passType || "",
        Status: record.status || "",
        "Created Date": formatTimestamp(record.createdAt),
      }));

      const fileName = buildExpiredPassExportFileName();

      if (typeof XLSX !== "undefined") {
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Expired Passes");

        const colWidths = Object.keys(exportData[0]).map((key) => ({
          wch:
            Math.max(
              key.length,
              ...exportData.map((row) => String(row[key]).length),
            ) + 2,
        }));
        ws["!cols"] = colWidths;

        XLSX.writeFile(wb, fileName);
        showToast(`✔ Exported ${filteredExpiredRecords.length} records`);
      } else {
        const headers = Object.keys(exportData[0]);
        const csvContent = [
          headers.join(","),
          ...exportData.map((row) =>
            headers
              .map((h) => `"${String(row[h]).replace(/"/g, '""')}"`)
              .join(","),
          ),
        ].join("\n");

        const blob = new Blob([csvContent], {
          type: "text/csv;charset=utf-8;",
        });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = fileName.replace(".xlsx", ".csv");
        link.click();
        URL.revokeObjectURL(link.href);
        showToast(`✔ Exported ${filteredExpiredRecords.length} records (CSV)`);
      }
    } catch (error) {
      console.error("[Expired Export] Error:", error);
      showToast("Error exporting records.", true);
    }
  }

  async function loadExpiredPasses() {
    const selectedYear = expiringYearFilter.value;
    const selectedMonth = expiredMonthFilter.value;

    if (!selectedYear || !selectedMonth) {
      showExpiredPassFilterPrompt();
      return;
    }

    const selectedYearInt = parseInt(selectedYear, 10);

    expiredPassTableBody.innerHTML = `
      <tr><td colspan="19">
        <div class="table-loading">
          <div class="spinner"></div>
          <p>Loading records...</p>
        </div>
      </td></tr>`;

    try {
      let q;
      if (selectedMonth === "all") {
        q = query(
          collection(db, "gatePasses"),
          where("issuedYear", "==", selectedYearInt),
          where("status", "==", "Expired"),
          orderBy("createdAt", "desc"),
        );
      } else {
        q = query(
          collection(db, "gatePasses"),
          where("issuedYear", "==", selectedYearInt),
          where("issuedMonth", "==", parseInt(selectedMonth, 10)),
          where("status", "==", "Expired"),
          orderBy("createdAt", "desc"),
        );
      }

      const snapshot = await getDocs(q);
      allExpiredPassRecords = [];
      snapshot.forEach((docSnap) => {
        allExpiredPassRecords.push({ id: docSnap.id, ...docSnap.data() });
      });

      expiredCurrentPage = 1;
      if (expiredSearch) expiredSearch.value = "";
      applyExpiredSearchFilter();
    } catch (error) {
      console.error("[Expired Passes] Error loading:", error);
      expiredPassTableBody.innerHTML = `
        <tr><td colspan="19">
          <div class="table-empty-state">
            <p>Error loading records. Please try again.</p>
          </div>
        </td></tr>`;
    }
  }

  function applyExpiredSearchFilter() {
    const searchTerm = (expiredSearch?.value || "").toLowerCase().trim();
    filteredExpiredRecords = allExpiredPassRecords.filter((record) =>
      expiredRecordMatchesSearch(record, searchTerm),
    );

    expiredCurrentPage = 1;
    renderExpiredPassTable();
  }

  function renderExpiredPassTable() {
    if (!expiredPassTableBody) return;

    const totalRecords = filteredExpiredRecords.length;
    const totalPages = Math.max(
      1,
      Math.ceil(totalRecords / expiredRecordsPerPage),
    );

    if (expiredCurrentPage > totalPages) expiredCurrentPage = totalPages;
    if (expiredCurrentPage < 1) expiredCurrentPage = 1;

    if (totalRecords === 0) {
      expiredPassTableBody.innerHTML = `
        <tr><td colspan="19">
          <div class="table-empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <p>No records found</p>
          </div>
        </td></tr>`;
      updateExpiredPaginationControls(0);
      return;
    }

    const startIdx = (expiredCurrentPage - 1) * expiredRecordsPerPage;
    const endIdx = Math.min(startIdx + expiredRecordsPerPage, totalRecords);
    const pageRecords = filteredExpiredRecords.slice(startIdx, endIdx);

    expiredPassTableBody.innerHTML = pageRecords
      .map(
        (record) => `<tr>
          <td>${escapeHtml(record.formNumber || "")}</td>
          <td>${escapeHtml(record.gpNumber || "")}</td>
          <td>${escapeHtml(record.vendorCode || "")}</td>
          <td>${escapeHtml(record.workOrderNumber || "")}</td>
          <td>${formatDate(record.issuedDate || "")}</td>
          <td>${formatDate(record.validTillDate || "")}</td>
          <td>${formatDate(record.medicalFromDate || "")}</td>
          <td>${formatDate(record.medicalToDate || "")}</td>
          <td>${escapeHtml(record.vendorName || "")}</td>
          <td>${escapeHtml(record.gender || "")}</td>
          <td>${escapeHtml(record.idMark || "")}</td>
          <td>${formatDate(record.dob || "")}</td>
          <td>${escapeHtml(record.bloodGroup || "")}</td>
          <td>${escapeHtml(record.designation || "")}</td>
          <td>${escapeHtml(record.companyName || "")}</td>
          <td>${escapeHtml(record.category || "")}</td>
          <td>${escapeHtml(record.passType || "")}</td>
          <td><span class="badge badge-expired">${escapeHtml(record.status || "")}</span></td>
          <td>${escapeHtml(formatTimestamp(record.createdAt))}</td>
        </tr>`,
      )
      .join("");

    updateExpiredPaginationControls(totalRecords);
  }

  if (expiredSearch) {
    expiredSearch.addEventListener("input", () => {
      if (allExpiredPassRecords.length === 0) return;
      applyExpiredSearchFilter();
    });
  }

  if (btnSearchExpiredPasses) {
    btnSearchExpiredPasses.addEventListener("click", () => {
      if (!validateMonthYearFilters(expiredMonthFilter, expiringYearFilter))
        return;
      loadExpiredPasses();
    });
  }

  if (btnExportExpiredPasses) {
    btnExportExpiredPasses.addEventListener("click", exportExpiredPasses);
  }

  if (btnExpiredPrevPage) {
    btnExpiredPrevPage.addEventListener("click", () => {
      if (expiredCurrentPage > 1) {
        expiredCurrentPage--;
        renderExpiredPassTable();
      }
    });
  }

  if (btnExpiredNextPage) {
    btnExpiredNextPage.addEventListener("click", () => {
      const totalPages = Math.max(
        1,
        Math.ceil(filteredExpiredRecords.length / expiredRecordsPerPage),
      );
      if (expiredCurrentPage < totalPages) {
        expiredCurrentPage++;
        renderExpiredPassTable();
      }
    });
  }

  // ═══════════════════════════════════════════════
  // COMPANIES MODULE
  // ═══════════════════════════════════════════════

  let allCompanyYearRecords = [];
  let companySummaryList = [];
  let selectedCompanyYear = "";
  let selectedCompanyMonth = "";
  let selectedCompanyName = "";
  let allCompanyRecords = [];
  let filteredCompanyRecords = [];
  let companyCurrentPage = 1;
  const companyRecordsPerPage = 20;

  const COMPANY_MONTH_NAMES = {
    1: "January",
    2: "February",
    3: "March",
    4: "April",
    5: "May",
    6: "June",
    7: "July",
    8: "August",
    9: "September",
    10: "October",
    11: "November",
    12: "December",
  };

  function formatCompanyPeriodLabel(year, month) {
    if (month === "all") return `${year} · All Months`;
    const monthLabel = COMPANY_MONTH_NAMES[month] || month;
    return `${year} · ${monthLabel}`;
  }

  function getCompanyExportMonthName(month) {
    if (!month || month === "all") return null;
    return COMPANY_MONTH_NAMES[month] || null;
  }

  function sanitizeCompanyFileName(companyName) {
    const sanitized = (companyName || "Company")
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_-]/g, "");
    return sanitized || "Company";
  }

  function buildCompanyExportFileName(companyName, year, monthName = null) {
    const base = sanitizeCompanyFileName(companyName);
    if (monthName) {
      return `${base}_${monthName}_${year}.xlsx`;
    }
    return `${base}_${year}.xlsx`;
  }

  function getPassRecordSearchableValues(record) {
    return [
      record.gpNumber,
      record.workOrderNumber,
      record.vendorName,
      record.companyName,
    ];
  }

  function recordMatchesSearch(record, searchTerm) {
    if (!searchTerm) return true;
    return getPassRecordSearchableValues(record).some((field) =>
      (field || "").toLowerCase().includes(searchTerm),
    );
  }

  function getFilteredCompanySummaryList() {
    const searchTerm = (companyNameSearch?.value || "").toLowerCase().trim();
    if (!searchTerm) return companySummaryList;
    return companySummaryList.filter((item) =>
      item.name.toLowerCase().includes(searchTerm),
    );
  }

  function showCompaniesFilterPrompt() {
    allCompanyYearRecords = [];
    companySummaryList = [];
    if (companyNameSearch) companyNameSearch.value = "";
    if (!companiesSummaryTableBody) return;
    companiesSummaryTableBody.innerHTML = `
      <tr><td colspan="2">
        <div class="table-empty-state">
          <p>Select month and year, then click Search to view companies</p>
        </div>
      </td></tr>`;
  }

  function renderCompaniesSummaryTable() {
    if (!companiesSummaryTableBody) return;

    if (companySummaryList.length === 0) {
      companiesSummaryTableBody.innerHTML = `
        <tr><td colspan="2">
          <div class="table-empty-state">
            <p>No companies found for the selected month and year</p>
          </div>
        </td></tr>`;
      return;
    }

    const displayList = getFilteredCompanySummaryList();

    if (displayList.length === 0) {
      companiesSummaryTableBody.innerHTML = `
        <tr><td colspan="2">
          <div class="table-empty-state">
            <p>No companies match your search</p>
          </div>
        </td></tr>`;
      return;
    }

    companiesSummaryTableBody.innerHTML = displayList
      .map(
        (item) => `<tr>
          <td>${escapeHtml(item.name)}</td>
          <td>
            <button type="button" class="company-record-count" data-company-name="${escapeHtml(item.name)}">
              [${item.count}]
            </button>
          </td>
        </tr>`,
      )
      .join("");
  }

  async function loadCompaniesSummary() {
    const selectedYear = companyYearFilter.value;
    const selectedMonth = companyMonthFilter?.value || "";

    if (!selectedYear || !selectedMonth) {
      showCompaniesFilterPrompt();
      return;
    }

    selectedCompanyYear = selectedYear;
    selectedCompanyMonth = selectedMonth;
    const selectedYearInt = parseInt(selectedYear, 10);
    if (companyNameSearch) companyNameSearch.value = "";

    companiesSummaryTableBody.innerHTML = `
      <tr><td colspan="2">
        <div class="table-loading">
          <div class="spinner"></div>
          <p>Loading companies...</p>
        </div>
      </td></tr>`;

    try {
      let q;
      if (selectedMonth === "all") {
        q = query(
          collection(db, "gatePasses"),
          where("issuedYear", "==", selectedYearInt),
          orderBy("createdAt", "desc"),
        );
      } else {
        q = query(
          collection(db, "gatePasses"),
          where("issuedYear", "==", selectedYearInt),
          where("issuedMonth", "==", parseInt(selectedMonth, 10)),
          orderBy("createdAt", "desc"),
        );
      }

      const snapshot = await getDocs(q);
      allCompanyYearRecords = [];
      snapshot.forEach((docSnap) => {
        allCompanyYearRecords.push({ id: docSnap.id, ...docSnap.data() });
      });

      const countsMap = new Map();
      allCompanyYearRecords.forEach((record) => {
        const name = (record.companyName || "").trim() || "(No Company Name)";
        countsMap.set(name, (countsMap.get(name) || 0) + 1);
      });

      companySummaryList = Array.from(countsMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b.name));

      renderCompaniesSummaryTable();
    } catch (error) {
      console.error("[Companies] Error loading summary:", error);
      companiesSummaryTableBody.innerHTML = `
        <tr><td colspan="2">
          <div class="table-empty-state">
            <p>Error loading companies. Please try again.</p>
          </div>
        </td></tr>`;
    }
  }

  function showCompanyDetailView(companyName) {
    const company = companySummaryList.find((item) => item.name === companyName);
    if (!company) return;

    selectedCompanyName = company.name;
    allCompanyRecords = allCompanyYearRecords.filter((record) => {
      const name = (record.companyName || "").trim() || "(No Company Name)";
      return name === selectedCompanyName;
    });

    if (companyRecordsSearch) companyRecordsSearch.value = "";
    filteredCompanyRecords = [...allCompanyRecords];
    companyCurrentPage = 1;

    if (companyDetailName) companyDetailName.textContent = selectedCompanyName;
    if (companyDetailYear) {
      companyDetailYear.textContent = formatCompanyPeriodLabel(
        selectedCompanyYear,
        selectedCompanyMonth,
      );
    }
    if (companyDetailTotal) {
      companyDetailTotal.textContent = String(allCompanyRecords.length);
    }

    document.querySelectorAll(".view-section").forEach((section) => {
      section.style.display = "none";
    });
    if (viewCompanyDetail) viewCompanyDetail.style.display = "block";

    sidebarLinks.forEach((link) => {
      link.classList.remove("active");
      if (link.dataset.view === "companies") {
        link.classList.add("active");
      }
    });

    renderCompanyRecordsTable();
  }

  function showCompaniesSummaryView() {
    document.querySelectorAll(".view-section").forEach((section) => {
      section.style.display = "none";
    });
    if (viewCompanies) viewCompanies.style.display = "block";

    sidebarLinks.forEach((link) => {
      link.classList.remove("active");
      if (link.dataset.view === "companies") {
        link.classList.add("active");
      }
    });

    if (companySummaryList.length > 0) {
      renderCompaniesSummaryTable();
    } else {
      showCompaniesFilterPrompt();
    }
  }

  function applyCompanyRecordsSearchFilter() {
    const searchTerm = (companyRecordsSearch?.value || "").toLowerCase().trim();
    filteredCompanyRecords = allCompanyRecords.filter((record) =>
      recordMatchesSearch(record, searchTerm),
    );
    companyCurrentPage = 1;
    renderCompanyRecordsTable();
  }

  function renderCompanyRecordsTable() {
    if (!companyRecordsTableBody) return;

    const totalRecords = filteredCompanyRecords.length;
    const totalPages = Math.max(
      1,
      Math.ceil(totalRecords / companyRecordsPerPage),
    );

    if (companyCurrentPage > totalPages) companyCurrentPage = totalPages;
    if (companyCurrentPage < 1) companyCurrentPage = 1;

    const startIdx = (companyCurrentPage - 1) * companyRecordsPerPage;
    const endIdx = Math.min(startIdx + companyRecordsPerPage, totalRecords);
    const pageRecords = filteredCompanyRecords.slice(startIdx, endIdx);

    if (totalRecords === 0) {
      companyRecordsTableBody.innerHTML = `
        <tr><td colspan="18">
          <div class="table-empty-state">
            <p>No records found</p>
          </div>
        </td></tr>`;
    } else {
      companyRecordsTableBody.innerHTML = pageRecords
        .map((record) => {
          const statusClass =
            record.status === "Expired" ? "badge-expired" : "badge-active";
          return `<tr>
          <td>${escapeHtml(record.formNumber || "")}</td>
          <td>${escapeHtml(record.gpNumber || "")}</td>
          <td>${escapeHtml(record.vendorCode || "")}</td>
          <td>${escapeHtml(record.workOrderNumber || "")}</td>
          <td>${formatDate(record.issuedDate || "")}</td>
          <td>${formatDate(record.validTillDate || "")}</td>
          <td>${formatDate(record.medicalFromDate || "")}</td>
          <td>${formatDate(record.medicalToDate || "")}</td>
          <td>${escapeHtml(record.vendorName || "")}</td>
          <td>${escapeHtml(record.gender || "")}</td>
          <td>${escapeHtml(record.idMark || "")}</td>
          <td>${formatDate(record.dob || "")}</td>
          <td>${escapeHtml(record.bloodGroup || "")}</td>
          <td>${escapeHtml(record.designation || "")}</td>
          <td>${escapeHtml(record.companyName || "")}</td>
          <td>${escapeHtml(record.category || "")}</td>
          <td>${escapeHtml(record.passType || "")}</td>
          <td><span class="badge ${statusClass}">${escapeHtml(record.status || "")}</span></td>
        </tr>`;
        })
        .join("");
    }

    if (companyPageInfo) {
      companyPageInfo.textContent = `Page ${companyCurrentPage} of ${totalPages}`;
    }
    if (btnCompanyPrevPage)
      btnCompanyPrevPage.disabled = companyCurrentPage <= 1;
    if (btnCompanyNextPage) {
      btnCompanyNextPage.disabled = companyCurrentPage >= totalPages;
    }
    if (companyDetailTotal) {
      companyDetailTotal.textContent = String(allCompanyRecords.length);
    }
  }

  function exportCompanyRecords() {
    if (filteredCompanyRecords.length === 0) {
      showToast("No records to export.", true);
      return;
    }

    try {
      const exportData = filteredCompanyRecords.map((record, index) => ({
        "S.No": index + 1,
        "Form No": record.formNumber || "",
        "GP Number": record.gpNumber || "",
        "Vendor Code": record.vendorCode || "",
        "Work Order Number": record.workOrderNumber || "",
        "Issued Date": formatDate(record.issuedDate || ""),
        "Valid Till Date": formatDate(record.validTillDate || ""),
        "Medical From Date": formatDate(record.medicalFromDate || ""),
        "Medical To Date": formatDate(record.medicalToDate || ""),
        "Vendor Name": record.vendorName || "",
        Gender: record.gender || "",
        "Identification Mark": record.idMark || "",
        "Date of Birth": formatDate(record.dob || ""),
        "Blood Group": record.bloodGroup || "",
        Designation: record.designation || "",
        "Company Name": record.companyName || "",
        Category: record.category || "",
        "Pass Type": record.passType || "",
        Status: record.status || "",
      }));

      const fileName = buildCompanyExportFileName(
        selectedCompanyName,
        selectedCompanyYear,
        getCompanyExportMonthName(selectedCompanyMonth),
      );

      if (typeof XLSX !== "undefined") {
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Company Records");

        const colWidths = Object.keys(exportData[0]).map((key) => ({
          wch:
            Math.max(
              key.length,
              ...exportData.map((row) => String(row[key]).length),
            ) + 2,
        }));
        ws["!cols"] = colWidths;

        XLSX.writeFile(wb, fileName);
        showToast(`✔ Exported ${filteredCompanyRecords.length} records`);
      } else {
        const headers = Object.keys(exportData[0]);
        const csvContent = [
          headers.join(","),
          ...exportData.map((row) =>
            headers
              .map((h) => `"${String(row[h]).replace(/"/g, '""')}"`)
              .join(","),
          ),
        ].join("\n");

        const blob = new Blob([csvContent], {
          type: "text/csv;charset=utf-8;",
        });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = fileName.replace(".xlsx", ".csv");
        link.click();
        URL.revokeObjectURL(link.href);
        showToast(`✔ Exported ${filteredCompanyRecords.length} records (CSV)`);
      }
    } catch (error) {
      console.error("[Companies Export] Error:", error);
      showToast("Error exporting records.", true);
    }
  }

  function exportCompanySummaryWorkbook() {
    if (companySummaryList.length === 0) {
      showToast("No records to export.", true);
      return;
    }

    try {
      if (typeof XLSX !== "undefined") {
        const wb = XLSX.utils.book_new();

        // 1. Summary Sheet
        const summaryData = companySummaryList.map((item) => ({
          "Company Name": item.name,
          "Total Records": item.count,
        }));
        const summaryWs = XLSX.utils.json_to_sheet(summaryData);

        // Auto-size columns for Summary sheet
        if (summaryData.length > 0) {
          const summaryColWidths = Object.keys(summaryData[0]).map((key) => ({
            wch:
              Math.max(
                key.length,
                ...summaryData.map((row) => String(row[key] ?? "").length),
              ) + 2,
          }));
          summaryWs["!cols"] = summaryColWidths;
        }

        XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

        // 2. Company Sheets
        const usedSheetNames = new Set();
        companySummaryList.forEach((item) => {
          // Clean sheet name: Excel sheet names cannot contain : \ / ? * [ ]
          let sheetName = item.name.replace(/[:\\/\?\*\[\]]/g, "");
          sheetName = sheetName.substring(0, 31).trim();
          if (!sheetName) {
            sheetName = "Company";
          }
          let finalSheetName = sheetName;
          let counter = 1;
          while (usedSheetNames.has(finalSheetName.toLowerCase())) {
            const suffix = ` (${counter})`;
            finalSheetName = sheetName.substring(0, 31 - suffix.length) + suffix;
            counter++;
          }
          usedSheetNames.add(finalSheetName.toLowerCase());

          // Get records for this company
          const companyRecords = allCompanyYearRecords.filter((record) => {
            const name = (record.companyName || "").trim() || "(No Company Name)";
            return name === item.name;
          });

          const exportData = companyRecords.map((record, index) => ({
            "S.No": index + 1,
            "Form No": record.formNumber || "",
            "GP Number": record.gpNumber || "",
            "Vendor Code": record.vendorCode || "",
            "Work Order Number": record.workOrderNumber || "",
            "Issued Date": formatDate(record.issuedDate || ""),
            "Valid Till Date": formatDate(record.validTillDate || ""),
            "Medical From Date": formatDate(record.medicalFromDate || ""),
            "Medical To Date": formatDate(record.medicalToDate || ""),
            "Vendor Name": record.vendorName || "",
            Gender: record.gender || "",
            "Identification Mark": record.idMark || "",
            "Date of Birth": formatDate(record.dob || ""),
            "Blood Group": record.bloodGroup || "",
            Designation: record.designation || "",
            "Company Name": record.companyName || "",
            Category: record.category || "",
            "Pass Type": record.passType || "",
            Status: record.status || "",
          }));

          const ws = XLSX.utils.json_to_sheet(exportData);

          // Auto-size columns
          if (exportData.length > 0) {
            const colWidths = Object.keys(exportData[0]).map((key) => ({
              wch:
                Math.max(
                  key.length,
                  ...exportData.map((row) => String(row[key] ?? "").length),
                ) + 2,
            }));
            ws["!cols"] = colWidths;
          }

          XLSX.utils.book_append_sheet(wb, ws, finalSheetName);
        });

        // Filename: Companies_<Month>_<Year>.xlsx
        const monthLabel = COMPANY_MONTH_NAMES[selectedCompanyMonth] || "All_Months";
        const fileName = `Companies_${monthLabel}_${selectedCompanyYear}.xlsx`;

        XLSX.writeFile(wb, fileName);
        showToast(`✔ Exported summary and ${companySummaryList.length} companies`);
      } else {
        showToast("XLSX library is not loaded. Cannot export workbook.", true);
      }
    } catch (error) {
      console.error("[Companies Summary Export] Error:", error);
      showToast("Error exporting company summary workbook.", true);
    }
  }

  if (btnSearchCompanies) {
    btnSearchCompanies.addEventListener("click", () => {
      if (!validateMonthYearFilters(companyMonthFilter, companyYearFilter))
        return;
      loadCompaniesSummary();
    });
  }

  if (companyNameSearch) {
    companyNameSearch.addEventListener("input", () => {
      if (companySummaryList.length === 0) return;
      renderCompaniesSummaryTable();
    });
  }

  if (companiesSummaryTableBody) {
    companiesSummaryTableBody.addEventListener("click", (e) => {
      const btn = e.target.closest(".company-record-count");
      if (!btn) return;
      const name = btn.dataset.companyName;
      if (!name) return;
      showCompanyDetailView(name);
    });
  }

  if (btnBackToCompanies) {
    btnBackToCompanies.addEventListener("click", () => {
      showCompaniesSummaryView();
    });
  }

  if (companyRecordsSearch) {
    companyRecordsSearch.addEventListener("input", () => {
      if (allCompanyRecords.length === 0) return;
      applyCompanyRecordsSearchFilter();
    });
  }

  if (btnExportCompanyRecords) {
    btnExportCompanyRecords.addEventListener("click", exportCompanyRecords);
  }

  if (btnExportCompanySummary) {
    btnExportCompanySummary.addEventListener(
      "click",
      exportCompanySummaryWorkbook
    );
  }

  if (btnCompanyPrevPage) {
    btnCompanyPrevPage.addEventListener("click", () => {
      if (companyCurrentPage > 1) {
        companyCurrentPage--;
        renderCompanyRecordsTable();
      }
    });
  }

  if (btnCompanyNextPage) {
    btnCompanyNextPage.addEventListener("click", () => {
      const totalPages = Math.max(
        1,
        Math.ceil(filteredCompanyRecords.length / companyRecordsPerPage),
      );
      if (companyCurrentPage < totalPages) {
        companyCurrentPage++;
        renderCompanyRecordsTable();
      }
    });
  }

  // ═══════════════════════════════════════════════
  // FIRESTORE: DELETE RECORDS (Admin)
  // ═══════════════════════════════════════════════

  const DELETE_MONTH_NAMES = {
    1: "January",
    2: "February",
    3: "March",
    4: "April",
    5: "May",
    6: "June",
    7: "July",
    8: "August",
    9: "September",
    10: "October",
    11: "November",
    12: "December",
  };

  const FIRESTORE_BATCH_LIMIT = 500;
  const deleteRecordsPerPage = 20;

  let loadedDeleteRecords = [];
  let loadedDeleteRecordsKey = null;
  let deleteRecordsCurrentPage = 1;

  function getDeleteRecordsFilterKey(year, month) {
    return `${year}-${month}`;
  }

  function areDeleteRecordsLoadedForCurrentFilters() {
    const year = deleteYearFilter?.value;
    const month = deleteMonthFilter?.value;
    if (!year || !month) return false;
    return loadedDeleteRecordsKey === getDeleteRecordsFilterKey(year, month);
  }

  function clearLoadedDeleteRecordsState() {
    loadedDeleteRecords = [];
    loadedDeleteRecordsKey = null;
    deleteRecordsCurrentPage = 1;
  }

  function showDeleteRecordsFilterPrompt() {
    clearLoadedDeleteRecordsState();
    if (!deleteRecordsTableBody) return;
    deleteRecordsTableBody.innerHTML = `
      <tr><td colspan="19">
        <div class="table-empty-state">
          <p>Select month and year, then click Load Records</p>
        </div>
      </td></tr>`;
    if (deleteRecordsPageInfo) {
      deleteRecordsPageInfo.textContent = "Page 1 of 1";
    }
    if (btnDeleteRecordsPrevPage) btnDeleteRecordsPrevPage.disabled = true;
    if (btnDeleteRecordsNextPage) btnDeleteRecordsNextPage.disabled = true;
  }

  function formatDeletePeriodLabel(year, month) {
    if (month === "all") return `all months in ${year}`;
    const monthLabel = DELETE_MONTH_NAMES[month] || month;
    return `${monthLabel} ${year}`;
  }

  function buildDeleteRecordsQuery(selectedYearInt, selectedMonth) {
    if (selectedMonth === "all") {
      return query(
        collection(db, "gatePasses"),
        where("issuedYear", "==", selectedYearInt),
      );
    }
    return query(
      collection(db, "gatePasses"),
      where("issuedYear", "==", selectedYearInt),
      where("issuedMonth", "==", parseInt(selectedMonth, 10)),
    );
  }

  function buildDeleteRecordsLoadQuery(selectedYearInt, selectedMonth) {
    if (selectedMonth === "all") {
      return query(
        collection(db, "gatePasses"),
        where("issuedYear", "==", selectedYearInt),
        orderBy("createdAt", "desc"),
      );
    }
    return query(
      collection(db, "gatePasses"),
      where("issuedYear", "==", selectedYearInt),
      where("issuedMonth", "==", parseInt(selectedMonth, 10)),
      orderBy("createdAt", "desc"),
    );
  }

  function getDeleteRecordData(recordItem) {
    if (recordItem.data && typeof recordItem.data === "function") {
      return recordItem.data();
    }
    const { id: _id, ...rest } = recordItem;
    return rest;
  }

  async function deleteRecordsInBatches(recordItems) {
    for (let i = 0; i < recordItems.length; i += FIRESTORE_BATCH_LIMIT) {
      const chunk = recordItems.slice(i, i + FIRESTORE_BATCH_LIMIT);
      const batch = writeBatch(db);
      chunk.forEach((recordItem) => {
        batch.delete(doc(db, "gatePasses", recordItem.id));
      });
      await batch.commit();
    }
  }

  function buildStatsDecrementFromRecords(records, today) {
    let activeDec = 0;
    let expiredDec = 0;
    let expiringTodayDec = 0;

    records.forEach((record) => {
      if (record.status === "Active") {
        activeDec += 1;
        if (record.validTillDate === today) {
          expiringTodayDec += 1;
        }
      } else if (record.status === "Expired") {
        expiredDec += 1;
      }
    });

    return { activeDec, expiredDec, expiringTodayDec };
  }

  async function decrementDashboardStatsForRecords(recordData) {
    const recordCount = recordData.length;
    if (recordCount === 0) return;

    const today = getTodayString();
    const { activeDec, expiredDec, expiringTodayDec } =
      buildStatsDecrementFromRecords(recordData, today);

    const statsRef = doc(db, "dashboard", "stats");
    const statsUpdate = {
      totalPasses: increment(-recordCount),
      updatedAt: serverTimestamp(),
    };
    if (activeDec > 0) statsUpdate.activePasses = increment(-activeDec);
    if (expiredDec > 0) statsUpdate.expiredPasses = increment(-expiredDec);
    if (expiringTodayDec > 0) {
      statsUpdate.expiringToday = increment(-expiringTodayDec);
    }
    await updateDoc(statsRef, statsUpdate);
  }

  function refreshPassHistoryIfVisible() {
    const viewPassRecord = document.getElementById("view-pass-record");
    if (viewPassRecord?.style.display !== "none") {
      historyYearFilter.value = "";
      monthFilter.value = "";
      allPassRecords = [];
      filteredRecords = [];
      showPassHistoryFilterPrompt();
    }
  }

  function renderDeleteRecordsTable() {
    if (!deleteRecordsTableBody) return;

    const totalRecords = loadedDeleteRecords.length;
    const totalPages = Math.max(
      1,
      Math.ceil(totalRecords / deleteRecordsPerPage),
    );

    if (deleteRecordsCurrentPage > totalPages) {
      deleteRecordsCurrentPage = totalPages;
    }
    if (deleteRecordsCurrentPage < 1) deleteRecordsCurrentPage = 1;

    const startIdx = (deleteRecordsCurrentPage - 1) * deleteRecordsPerPage;
    const endIdx = Math.min(startIdx + deleteRecordsPerPage, totalRecords);
    const pageRecords = loadedDeleteRecords.slice(startIdx, endIdx);

    if (totalRecords === 0) {
      deleteRecordsTableBody.innerHTML = `
        <tr><td colspan="19">
          <div class="table-empty-state">
            <p>No records found for the selected month and year</p>
          </div>
        </td></tr>`;
    } else {
      deleteRecordsTableBody.innerHTML = pageRecords
        .map((record) => {
          const statusClass =
            record.status === "Expired" ? "badge-expired" : "badge-active";
          return `<tr data-record-id="${escapeHtml(record.id)}">
          <td>${escapeHtml(record.formNumber || "")}</td>
          <td>${escapeHtml(record.gpNumber || "")}</td>
          <td>${escapeHtml(record.vendorCode || "")}</td>
          <td>${escapeHtml(record.workOrderNumber || "")}</td>
          <td>${formatDate(record.issuedDate || "")}</td>
          <td>${formatDate(record.validTillDate || "")}</td>
          <td>${formatDate(record.medicalFromDate || "")}</td>
          <td>${formatDate(record.medicalToDate || "")}</td>
          <td>${escapeHtml(record.vendorName || "")}</td>
          <td>${escapeHtml(record.gender || "")}</td>
          <td>${escapeHtml(record.idMark || "")}</td>
          <td>${formatDate(record.dob || "")}</td>
          <td>${escapeHtml(record.bloodGroup || "")}</td>
          <td>${escapeHtml(record.designation || "")}</td>
          <td>${escapeHtml(record.companyName || "")}</td>
          <td>${escapeHtml(record.category || "")}</td>
          <td>${escapeHtml(record.passType || "")}</td>
          <td><span class="badge ${statusClass}">${escapeHtml(record.status || "")}</span></td>
          <td>
            <button
              type="button"
              class="btn-delete-single-record"
              data-record-id="${escapeHtml(record.id)}"
              title="Delete this record"
            >
              Delete
            </button>
          </td>
        </tr>`;
        })
        .join("");
    }

    if (deleteRecordsPageInfo) {
      deleteRecordsPageInfo.textContent = `Page ${deleteRecordsCurrentPage} of ${totalPages}`;
    }
    if (btnDeleteRecordsPrevPage) {
      btnDeleteRecordsPrevPage.disabled = deleteRecordsCurrentPage <= 1;
    }
    if (btnDeleteRecordsNextPage) {
      btnDeleteRecordsNextPage.disabled =
        deleteRecordsCurrentPage >= totalPages;
    }
  }

  async function loadDeleteRecords() {
    if (!validateMonthYearFilters(deleteMonthFilter, deleteYearFilter)) return;

    const selectedYear = deleteYearFilter.value;
    const selectedMonth = deleteMonthFilter.value;
    const selectedYearInt = parseInt(selectedYear, 10);
    const periodLabel = formatDeletePeriodLabel(selectedYear, selectedMonth);

    if (btnLoadDeleteRecords) btnLoadDeleteRecords.disabled = true;
    if (deleteRecordHint) {
      deleteRecordHint.textContent = `Loading records for ${periodLabel}...`;
    }

    deleteRecordsTableBody.innerHTML = `
      <tr><td colspan="19">
        <div class="table-loading">
          <div class="spinner"></div>
          <p>Loading records...</p>
        </div>
      </td></tr>`;

    try {
      const snapshot = await getDocs(
        buildDeleteRecordsLoadQuery(selectedYearInt, selectedMonth),
      );

      loadedDeleteRecords = [];
      snapshot.forEach((docSnap) => {
        loadedDeleteRecords.push({ id: docSnap.id, ...docSnap.data() });
      });
      loadedDeleteRecordsKey = getDeleteRecordsFilterKey(
        selectedYear,
        selectedMonth,
      );
      deleteRecordsCurrentPage = 1;
      renderDeleteRecordsTable();

      if (deleteRecordHint) {
        deleteRecordHint.textContent =
          loadedDeleteRecords.length === 0
            ? `No records found for ${periodLabel}.`
            : `Loaded ${loadedDeleteRecords.length} record(s) for ${periodLabel}.`;
      }
    } catch (error) {
      console.error("[Delete Records] Load error:", error);
      clearLoadedDeleteRecordsState();
      deleteRecordsTableBody.innerHTML = `
        <tr><td colspan="19">
          <div class="table-empty-state">
            <p>Error loading records. Please try again.</p>
          </div>
        </td></tr>`;
      if (deleteRecordHint) {
        deleteRecordHint.textContent =
          "Load failed. Check your connection and try again.";
      }
      showToast("Error loading records. Please try again.", true);
    } finally {
      if (btnLoadDeleteRecords) btnLoadDeleteRecords.disabled = false;
    }
  }

  async function deleteSingleLoadedRecord(recordId) {
    const recordIndex = loadedDeleteRecords.findIndex(
      (record) => record.id === recordId,
    );
    if (recordIndex === -1) return;

    const record = loadedDeleteRecords[recordIndex];
    const label = record.gpNumber || record.formNumber || recordId;
    if (!confirm(`Delete record ${label}?\n\nThis cannot be undone.`)) {
      return;
    }

    const deleteBtn = deleteRecordsTableBody?.querySelector(
      `[data-record-id="${recordId}"] .btn-delete-single-record`,
    );
    if (deleteBtn) deleteBtn.disabled = true;

    try {
      await deleteDoc(doc(db, "gatePasses", recordId));
      await decrementDashboardStatsForRecords([getDeleteRecordData(record)]);

      loadedDeleteRecords.splice(recordIndex, 1);
      renderDeleteRecordsTable();
      refreshPassHistoryIfVisible();
      await loadDashboardStats();

      showToast(`✔ Deleted record ${label}`);
      if (deleteRecordHint) {
        const remaining = loadedDeleteRecords.length;
        deleteRecordHint.textContent =
          remaining === 0
            ? "All loaded records have been deleted."
            : `${remaining} loaded record(s) remaining.`;
      }
    } catch (error) {
      console.error("[Delete Records] Single delete error:", error);
      showToast("Error deleting record. Please try again.", true);
      if (deleteBtn) deleteBtn.disabled = false;
    }
  }

  async function finalizeBulkDelete(recordItems, periodLabel) {
    const recordData = recordItems.map((item) => getDeleteRecordData(item));
    const recordCount = recordItems.length;

    await deleteRecordsInBatches(recordItems);
    await decrementDashboardStatsForRecords(recordData);

    if (areDeleteRecordsLoadedForCurrentFilters()) {
      clearLoadedDeleteRecordsState();
      showDeleteRecordsFilterPrompt();
      if (deleteRecordsTableBody) {
        deleteRecordsTableBody.innerHTML = `
          <tr><td colspan="19">
            <div class="table-empty-state">
              <p>All records deleted for ${escapeHtml(periodLabel)}</p>
            </div>
          </td></tr>`;
      }
    }

    refreshPassHistoryIfVisible();
    await loadDashboardStats();
    showToast(`✔ Deleted ${recordCount} record(s) for ${periodLabel}`);
    if (deleteRecordHint) {
      deleteRecordHint.textContent = `Last action: deleted ${recordCount} record(s) for ${periodLabel}.`;
    }
  }

  async function deleteRecordsForPeriod() {
    if (!validateMonthYearFilters(deleteMonthFilter, deleteYearFilter)) return;

    const selectedYear = deleteYearFilter.value;
    const selectedMonth = deleteMonthFilter.value;
    const selectedYearInt = parseInt(selectedYear, 10);
    const periodLabel = formatDeletePeriodLabel(selectedYear, selectedMonth);
    const recordsAlreadyLoaded = areDeleteRecordsLoadedForCurrentFilters();

    if (btnDeleteRecords) btnDeleteRecords.disabled = true;
    if (deleteRecordHint) {
      deleteRecordHint.textContent = recordsAlreadyLoaded
        ? "Preparing to delete loaded records..."
        : "Checking how many records match...";
    }

    try {
      let recordItems = [];

      if (recordsAlreadyLoaded) {
        recordItems = [...loadedDeleteRecords];
      } else {
        const snapshot = await getDocs(
          buildDeleteRecordsQuery(selectedYearInt, selectedMonth),
        );
        snapshot.forEach((docSnap) => {
          recordItems.push(docSnap);
        });
      }

      if (recordItems.length === 0) {
        showToast(`No records found for ${periodLabel}.`, true);
        if (deleteRecordHint) {
          deleteRecordHint.textContent =
            "No matching records. Select a different month or year.";
        }
        return;
      }

      const confirmMessage =
        "Are you sure you want to delete all records for the selected Month and Year?";
      if (!confirm(confirmMessage)) return;

      if (deleteRecordHint) {
        deleteRecordHint.textContent = `Deleting ${recordItems.length} record(s)...`;
      }

      await finalizeBulkDelete(recordItems, periodLabel);
    } catch (error) {
      console.error("[Delete Records] Error:", error);
      showToast("Error deleting records. Please try again.", true);
      if (deleteRecordHint) {
        deleteRecordHint.textContent =
          "Delete failed. Check your connection and try again.";
      }
    } finally {
      if (btnDeleteRecords) {
        btnDeleteRecords.disabled = false;
      }
    }
  }

  if (btnLoadDeleteRecords) {
    btnLoadDeleteRecords.addEventListener("click", loadDeleteRecords);
  }

  if (btnDeleteRecords) {
    btnDeleteRecords.addEventListener("click", deleteRecordsForPeriod);
  }

  if (deleteRecordsTableBody) {
    deleteRecordsTableBody.addEventListener("click", (e) => {
      const deleteBtn = e.target.closest(".btn-delete-single-record");
      if (!deleteBtn || !areDeleteRecordsLoadedForCurrentFilters()) return;
      const recordId = deleteBtn.dataset.recordId;
      if (recordId) deleteSingleLoadedRecord(recordId);
    });
  }

  if (btnDeleteRecordsPrevPage) {
    btnDeleteRecordsPrevPage.addEventListener("click", () => {
      if (deleteRecordsCurrentPage > 1) {
        deleteRecordsCurrentPage--;
        renderDeleteRecordsTable();
      }
    });
  }

  if (btnDeleteRecordsNextPage) {
    btnDeleteRecordsNextPage.addEventListener("click", () => {
      const totalPages = Math.max(
        1,
        Math.ceil(loadedDeleteRecords.length / deleteRecordsPerPage),
      );
      if (deleteRecordsCurrentPage < totalPages) {
        deleteRecordsCurrentPage++;
        renderDeleteRecordsTable();
      }
    });
  }

  function invalidateDeleteRecordsOnFilterChange() {
    if (!areDeleteRecordsLoadedForCurrentFilters()) {
      showDeleteRecordsFilterPrompt();
      if (deleteRecordHint) {
        deleteRecordHint.textContent =
          "Filters changed. Click Load Records to preview or Delete Records to remove all matching records.";
      }
    }
  }

  if (deleteMonthFilter) {
    deleteMonthFilter.addEventListener(
      "change",
      invalidateDeleteRecordsOnFilterChange,
    );
  }
  if (deleteYearFilter) {
    deleteYearFilter.addEventListener(
      "change",
      invalidateDeleteRecordsOnFilterChange,
    );
  }


  // ═══════════════════════════════════════════════
  // SIDEBAR NAVIGATION
  // ═══════════════════════════════════════════════

  const sidebar = document.getElementById("sidebar");
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  const sidebarToggleBtn = document.getElementById("sidebarToggleBtn");
  const sidebarLinks = document.querySelectorAll(".sidebar__link");

  function toggleSidebar() {
    const isOpen = sidebar.classList.contains("sidebar-open");
    if (isOpen) {
      sidebar.classList.remove("sidebar-open");
      sidebarOverlay.classList.remove("show");
      document.body.classList.remove("sidebar-is-open");
    } else {
      sidebar.classList.add("sidebar-open");
      sidebarOverlay.classList.add("show");
      document.body.classList.add("sidebar-is-open");
    }
  }

  if (sidebarToggleBtn) {
    sidebarToggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleSidebar();
    });
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", () => {
      toggleSidebar();
    });
  }

  // Navigation Logic
  function switchView(viewId) {
    if (ADMIN_ONLY_VIEWS.includes(viewId) && !currentUserIsAdmin) {
      return;
    }

    document.querySelectorAll(".view-section").forEach((section) => {
      section.style.display = "none";
    });

    const targetView = document.getElementById(`view-${viewId}`);
    if (!targetView) return;

    if (viewId === "home") {
      targetView.style.display = "flex";
      // Load dashboard stats when switching to home
      loadDashboardStats();
    } else {
      targetView.style.display = "block";
    }

    // Show filter prompt when switching to pass-record (no auto-load)
    if (viewId === "pass-record") {
      historyYearFilter.value = "";
      monthFilter.value = "";

      allPassRecords = [];
      filteredRecords = [];
      currentPage = 1;

      showPassHistoryFilterPrompt();
    }

    if (viewId === "expiring-pass") {
      if (expiringDayFilter) expiringDayFilter.value = "";
      if (expiringSearch) expiringSearch.value = "";
      showExpiringPassFilterPrompt();
      if (expiringYearFilter) expiringYearFilter.value = "";
      if (expiredMonthFilter) expiredMonthFilter.value = "";
      if (expiredSearch) expiredSearch.value = "";
      showExpiredPassFilterPrompt();
    }

    if (viewId === "companies") {
      if (companyMonthFilter) companyMonthFilter.value = "";
      if (companyYearFilter) companyYearFilter.value = "";
      if (companyNameSearch) companyNameSearch.value = "";
      selectedCompanyYear = "";
      selectedCompanyMonth = "";
      selectedCompanyName = "";
      allCompanyYearRecords = [];
      companySummaryList = [];
      allCompanyRecords = [];
      filteredCompanyRecords = [];
      companyCurrentPage = 1;
      if (companyRecordsSearch) companyRecordsSearch.value = "";
      showCompaniesFilterPrompt();
    }

    if (viewId === "delete-record") {
      if (deleteMonthFilter) deleteMonthFilter.value = "";
      if (deleteYearFilter) deleteYearFilter.value = "";
      showDeleteRecordsFilterPrompt();
      if (deleteRecordHint) {
        deleteRecordHint.textContent =
          "Select month and year, then click Load Records to preview or Delete Records to remove all matching records.";
      }
    }


    if (viewId === "about" && aboutLastUpdated) {
  aboutLastUpdated.textContent = "June 2026";
}

    sidebarLinks.forEach((link) => {
      link.classList.remove("active");
      if (link.dataset.view === viewId) {
        link.classList.add("active");
      }
    });

    // Close sidebar on mobile after clicking
    if (
      window.innerWidth <= 1024 &&
      sidebar.classList.contains("sidebar-open")
    ) {
      toggleSidebar();
    }
  }

  // Add click event to sidebar links
  sidebarLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const viewId = link.dataset.view;
      if (ADMIN_ONLY_VIEWS.includes(viewId) && !currentUserIsAdmin) {
        return;
      }
      switchView(viewId);
    });
  });

  // ───────────────────────────────────────────────
  // Year Dropdown Populator
  // ───────────────────────────────────────────────
  function populateYearDropdown(selectId) {
    const dropdown = document.getElementById(selectId);
    if (!dropdown) return;

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select Year";
    placeholder.selected = true;
    dropdown.appendChild(placeholder);

    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= 2000; year--) {
      const option = document.createElement("option");
      option.value = year;
      option.textContent = year;
      dropdown.appendChild(option);
    }
  }

  populateYearDropdown("historyYearFilter");
  populateYearDropdown("expiringYearFilter");
  populateYearDropdown("CompanyYearFilter");
  populateYearDropdown("deleteYearFilter");

  // ───────────────────────────────────────────────
  // INIT: Ensure stats doc + load default view
  // ───────────────────────────────────────────────
  ensureStatsDocExists()
    .then(async () => {
      await syncDashboardCounters();
      switchView("home");
    })
    .catch((err) => {
      console.error("[Init] Error ensuring stats doc:", err);
      switchView("home");
    });

  console.log(
    "[Dashboard] Tata Steel SEZ Gate Pass System initialized with Firestore.",
  );
});
