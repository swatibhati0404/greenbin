import { useEffect, useRef, useState } from "react";
import "./App.css";

const ITEMS = [
  {
    name: "Smartphone",
    icon: "📱",
    confidence: 92,
    hazards: ["Lead", "Lithium", "Mercury"],
    tags: ["Hazardous Battery", "Rare Metals"],
  },
  {
    name: "Laptop",
    icon: "💻",
    confidence: 88,
    hazards: ["Lead", "Mercury", "Cadmium"],
    tags: ["Battery", "PCB", "Display"],
  },
  {
    name: "AA Battery",
    icon: "🔋",
    confidence: 96,
    hazards: ["Mercury", "Cadmium"],
    tags: ["Hazardous", "No Landfill"],
  },
  {
    name: "CRT Monitor",
    icon: "🖥️",
    confidence: 84,
    hazards: ["Lead", "Cadmium"],
    tags: ["High Lead Content"],
  },
  {
    name: "USB Cable",
    icon: "🔌",
    confidence: 79,
    hazards: ["PVC", "Copper"],
    tags: ["Recyclable Copper"],
  },
  {
    name: "Circuit Board",
    icon: "🟩",
    confidence: 91,
    hazards: ["Lead", "Tin", "Gold"],
    tags: ["Precious Metals"],
  },
];

const BINS = [
  ["BIN-01", 42],
  ["BIN-02", 61],
  ["BIN-03", 72],
  ["BIN-04", 38],
  ["BIN-05", 65],
  ["BIN-06", 55],
  ["BIN-07", 95],
  ["BIN-08", 47],
  ["BIN-09", 43],
  ["BIN-10", 31],
  ["BIN-11", 58],
  ["BIN-12", 91],
];

const REWARDS = [
  {
    id: "rew_01",
    name: "Eco Store ₹150 Voucher",
    icon: "🎟️",
    cost: 150,
    description: "Get a voucher for sustainable products.",
  },
  {
    id: "rew_02",
    name: "Plant a Tree in Your Name",
    icon: "🌱",
    cost: 300,
    description: "Fund the planting of one tree.",
  },
  {
    id: "rew_03",
    name: "Metro / Transit 20% Pass Off",
    icon: "🚇",
    cost: 250,
    description: "Get 20% off an eligible transit pass.",
  },
  {
    id: "rew_04",
    name: "Solar Power Bank 10,000mAh",
    icon: "🔋",
    cost: 800,
    description: "Redeem points for a solar power bank.",
  },
];

const STOPS = [
  { number: 1, bin: "BIN-07", fill: 95, location: "Sector 14 Collection Point" },
  { number: 2, bin: "BIN-12", fill: 91, location: "University Road Bin" },
  { number: 3, bin: "BIN-03", fill: 72, location: "Central Market" },
  { number: 4, bin: "BIN-05", fill: 65, location: "Green Avenue" },
  { number: 5, bin: "BIN-09", fill: 43, location: "Community Center" },
];

function getInitials(name = "") {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "GB"
  );
}

function getBinStatus(fill) {
  if (fill >= 90) return "critical";
  if (fill >= 70) return "warning";
  return "normal";
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  const [authTab, setAuthTab] = useState("login");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  const [currentPage, setCurrentPage] = useState("scanner");
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const [selectedItem, setSelectedItem] = useState(ITEMS[0]);
  const [camLabel, setCamLabel] = useState("CAMERA OFFLINE");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const [selectedStop, setSelectedStop] = useState(1);
  const [dispatching, setDispatching] = useState(false);
  const [dispatched, setDispatched] = useState(false);
  const [routeResult, setRouteResult] = useState(null);

  const [rewardsOpen, setRewardsOpen] = useState(false);
  const [toast, setToast] = useState("");

  const startCamera = async () => {
  setCameraError("");

  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access is not supported by this browser.");
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });

    cameraStreamRef.current = stream;

    setCameraActive(true);
    setCamLabel("CAMERA READY");

    showToast("Camera connected successfully! 📷");
  } catch (error) {
    console.error("Camera error:", error);

    setCameraActive(false);
    setCamLabel("CAMERA UNAVAILABLE");

    if (error.name === "NotAllowedError") {
      setCameraError(
        "Camera permission was denied. Allow camera access in your browser."
      );
    } else if (error.name === "NotFoundError") {
      setCameraError("No camera was found on this device.");
    } else {
      setCameraError(`Camera error: ${error.message}`);
    }
  }
};

const stopCamera = () => {
  if (cameraStreamRef.current) {
    cameraStreamRef.current.getTracks().forEach((track) => {
      track.stop();
    });

    cameraStreamRef.current = null;
  }

  if (videoRef.current) {
    videoRef.current.srcObject = null;
  }

  setCameraActive(false);
  setCamLabel("CAMERA OFFLINE");
};

useEffect(() => {
  if (!cameraActive) return;
  if (!cameraStreamRef.current) return;
  if (!videoRef.current) return;

  videoRef.current.srcObject = cameraStreamRef.current;

  videoRef.current.play().catch((error) => {
    console.error("Video play error:", error);
  });
}, [cameraActive]);

  const showToast = (message) => {
    setToast(message);

    setTimeout(() => {
      setToast("");
    }, 2500);
  };

  const switchAuthTab = (tab) => {
    setAuthTab(tab);
    setAuthError("");
  };

 const handleLogin = async (event) => {
  event.preventDefault();
  setAuthError("");
  setAuthLoading(true);

  const email = event.target.loginEmail.value.trim();
  const password = event.target.loginPassword.value;

  if (!email || !password) {
    setAuthError("Please enter your email and password.");
    setAuthLoading(false);
    return;
  }

  try {
    const response = await fetch("http://localhost:5000/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setAuthError(data.message || "Login failed.");
      setAuthLoading(false);
      return;
    }

    // Backend returned the real MySQL user
    setUser(data.user);
    setIsLoggedIn(true);
    setCurrentPage("scanner");

    setAuthLoading(false);

    showToast("Welcome back to GreenBin! ♻");
  } catch (error) {
    console.error("Login error:", error);

    setAuthError(
      "Cannot connect to GreenBin server. Make sure the backend is running."
    );

    setAuthLoading(false);
  }
};

 const handleRegister = async (event) => {
  event.preventDefault();
  setAuthError("");

  const name = event.target.registerName.value.trim();
  const email = event.target.registerEmail.value.trim();
  const password = event.target.registerPassword.value;
  const role = event.target.registerRole.value;

  if (name.length < 2) {
    setAuthError("Please enter your full name.");
    return;
  }

  if (!email.includes("@") || !email.includes(".")) {
    setAuthError("Please enter a valid email address.");
    return;
  }

  if (password.length < 8) {
    setAuthError("Password must contain at least 8 characters.");
    return;
  }

  setAuthLoading(true);

  try {
    const response = await fetch("http://localhost:5000/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        email,
        password,
        role,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setAuthError(data.message || "Could not create account.");
      setAuthLoading(false);
      return;
    }

    // Backend returned the newly created MySQL user
    setUser(data.user);
    setIsLoggedIn(true);
    setCurrentPage("scanner");

    setAuthLoading(false);

    showToast("Account created successfully! 🎉");
  } catch (error) {
    console.error("Registration error:", error);

    setAuthError(
      "Cannot connect to GreenBin server. Make sure the backend is running."
    );

    setAuthLoading(false);
  }
};

  const logout = () => {
    setIsLoggedIn(false);
    setUser(null);
    setUserMenuOpen(false);
    setCurrentPage("scanner");
    setAuthTab("login");
    setScanResult(null);
    setCamLabel("READY TO SCAN");
  };

  const selectItem = (item) => {
    setSelectedItem(item);
    setScanResult(null);
    setCamLabel("READY TO SCAN");
  };

const runScan = () => {
  if (scanning) return;

  if (!cameraActive) {
    showToast("Start the camera before scanning.");
    return;
  }

  setScanning(true);
  setScanResult(null);
  setCamLabel("AI CLASSIFYING...");

  setTimeout(async () => {
    const result = {
      name: selectedItem.name,
      icon: selectedItem.icon,
      confidence: selectedItem.confidence,
      hazards: selectedItem.hazards,
      tags: selectedItem.tags,
    };

    setScanning(false);
    setCamLabel(selectedItem.name.toUpperCase() + " DETECTED");

    // Show result immediately in the frontend
    setScanResult(result);

    // Save scan to backend
    try {
      const response = await fetch("http://localhost:5000/api/scans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user?.id || null,
          itemName: result.name,
          confidence: result.confidence,
          hazards: result.hazards,
          tags: result.tags,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update points shown in navbar/profile
        if (user && data.totalPoints !== null) {
          setUser((currentUser) => ({
            ...currentUser,
            points: data.totalPoints,
          }));
        }

        showToast(
          `AI scan completed! +${data.pointsEarned} points ⚡`
        );

        console.log("Scan saved to backend:", data);
      } else {
        showToast("Scan completed, but could not be saved.");
        console.error("Backend error:", data);
      }
    } catch (error) {
      console.error("Backend connection error:", error);
      showToast("Scan completed. Backend is unavailable.");
    }
  }, 1500);
};

 const schedulePickup = async () => {
  try {
    const response = await fetch("http://localhost:5000/api/pickups", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: user?.id || null,
        itemName: selectedItem?.name || "E-waste",
        location: "GreenBin Collection Point",
      }),
    });

    const data = await response.json();

    if (response.ok) {
      showToast("Pickup request created successfully! 🚚");
      console.log("Pickup saved:", data);
    } else {
      showToast("Could not create pickup request.");
      console.error("Pickup error:", data);
    }
  } catch (error) {
    console.error("Backend connection error:", error);
    showToast("Pickup created locally, but backend is unavailable.");
  }
};

  const dropAtBin = () => {
    showToast("Nearest GreenBin location selected.");
  };

  const dispatchRoute = async () => {
  if (dispatching) return;

  setDispatching(true);
  setDispatched(false);

  try {
    const response = await fetch(
      "http://localhost:5000/api/routes/optimize"
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message || "Route optimization failed."
      );
    }

    console.log("HHO optimization result:", data);

    // Store the optimized route
    setRouteResult(data.route);

    setDispatched(true);

    showToast(
      `HHO optimized route generated! 🚚`
    );

  } catch (error) {
    console.error("HHO route error:", error);

    showToast(
      "Could not generate optimized route."
    );

  } finally {
    setDispatching(false);
  }
};

  const highlightStop = (number) => {
    setSelectedStop(number);
  };

  const redeemReward = (reward) => {
    if (!user) return;

    if (user.points < reward.cost) {
      showToast("Not enough points for this reward.");
      return;
    }

    const updatedUser = {
      ...user,
      points: user.points - reward.cost,
    };

    setUser(updatedUser);
    showToast(`${reward.name} redeemed successfully! 🎉`);
  };

  const navigate = (page) => {
    setCurrentPage(page);
    setUserMenuOpen(false);
  };

  if (!isLoggedIn) {
    return (
      <AuthScreen
        authTab={authTab}
        authError={authError}
        authLoading={authLoading}
        showLoginPassword={showLoginPassword}
        showRegisterPassword={showRegisterPassword}
        setShowLoginPassword={setShowLoginPassword}
        setShowRegisterPassword={setShowRegisterPassword}
        switchAuthTab={switchAuthTab}
        handleLogin={handleLogin}
        handleRegister={handleRegister}
      />
    );
  }

  return (
    <div className="app-shell">
      <Navbar
        user={user}
        currentPage={currentPage}
        userMenuOpen={userMenuOpen}
        setUserMenuOpen={setUserMenuOpen}
        navigate={navigate}
        logout={logout}
      />

      {currentPage === "scanner" && (
        <ScannerPage
          selectedItem={selectedItem}
          selectItem={selectItem}
          camLabel={camLabel}
          scanning={scanning}
          scanResult={scanResult}
          runScan={runScan}
          schedulePickup={schedulePickup}
          dropAtBin={dropAtBin}
          cameraActive={cameraActive}
          cameraError={cameraError}
          videoRef={videoRef}
          startCamera={startCamera}
          stopCamera={stopCamera}
        />
      )}

      {currentPage === "dashboard" && (
        <DashboardPage navigate={navigate} />
      )}

      {currentPage === "route" && (
        <RoutePage
          selectedStop={selectedStop}
          highlightStop={highlightStop}
          dispatchRoute={dispatchRoute}
          dispatching={dispatching}
          dispatched={dispatched}
          routeResult={routeResult}
        />
      )}

      {currentPage === "profile" && (
        <ProfilePage
          user={user}
          setRewardsOpen={setRewardsOpen}
        />
      )}

      {rewardsOpen && (
        <RewardsModal
          user={user}
          rewards={REWARDS}
          close={() => setRewardsOpen(false)}
          redeemReward={redeemReward}
        />
      )}

      {toast && <div className="pts-toast show">{toast}</div>}
    </div>
  );
}

/* =========================================================
   AUTH SCREEN
========================================================= */

function AuthScreen({
  authTab,
  authError,
  authLoading,
  showLoginPassword,
  showRegisterPassword,
  setShowLoginPassword,
  setShowRegisterPassword,
  switchAuthTab,
  handleLogin,
  handleRegister,
}) {
  return (
    <div className="auth-overlay">
      <div className="auth-split">
        <div className="auth-quote-panel">
          <div className="auth-logo">
            <div className="logo-icon">♻</div>
            GREENBIN
          </div>

          <div className="auth-quote-mark">“</div>

          <div className="auth-quote-text">
            Every device you recycle keeps hazardous waste out of the ground{" "}
            <span>and its metals back in the loop.</span>
          </div>

          <div className="auth-quote-attribution">
            — The GreenBin Initiative
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-subtitle">
            Log in or create an account to start recycling and earning points!
          </div>

          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${authTab === "login" ? "active" : ""}`}
              onClick={() => switchAuthTab("login")}
            >
              Log In
            </button>

            <button
              type="button"
              className={`auth-tab ${
                authTab === "register" ? "active" : ""
              }`}
              onClick={() => switchAuthTab("register")}
            >
              Create Account
            </button>
          </div>

          {authError && <div className="auth-error">{authError}</div>}

          {authTab === "login" ? (
            <form className="auth-form active" onSubmit={handleLogin}>
              <div className="auth-field">
                <label htmlFor="loginEmail">Email</label>
                <input
                  type="email"
                  id="loginEmail"
                  name="loginEmail"
                  placeholder="Enter your email"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="auth-field">
                <label htmlFor="loginPassword">Password</label>

                <div className="password-wrap">
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    id="loginPassword"
                    name="loginPassword"
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowLoginPassword((value) => !value)}
                  >
                    {showLoginPassword ? "🙈" : "👁"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="auth-submit"
                disabled={authLoading}
              >
                {authLoading ? "Logging In..." : "Log In"}
              </button>
            </form>
          ) : (
            <form className="auth-form active" onSubmit={handleRegister}>
              <div className="auth-field">
                <label htmlFor="registerName">Full Name</label>
                <input
                  type="text"
                  id="registerName"
                  name="registerName"
                  placeholder="Enter your full name"
                  required
                  autoComplete="name"
                />
              </div>

              <div className="auth-field">
                <label htmlFor="registerEmail">Email</label>
                <input
                  type="email"
                  id="registerEmail"
                  name="registerEmail"
                  placeholder="Enter your email"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="auth-field">
                <label htmlFor="registerPassword">Password</label>

                <div className="password-wrap">
                  <input
                    type={showRegisterPassword ? "text" : "password"}
                    id="registerPassword"
                    name="registerPassword"
                    placeholder="Enter a password (at least 8 characters)"
                    required
                    minLength="8"
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowRegisterPassword((value) => !value)
                    }
                  >
                    {showRegisterPassword ? "🙈" : "👁"}
                  </button>
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="registerRole">I am a...</label>

                <select id="registerRole" name="registerRole">
                  <option value="resident">Resident</option>
                  <option value="collector">Collector</option>
                </select>
              </div>

              <button
                type="submit"
                className="auth-submit"
                disabled={authLoading}
              >
                {authLoading ? "Creating Account..." : "Create Account"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   NAVBAR
========================================================= */

function Navbar({
  user,
  currentPage,
  userMenuOpen,
  setUserMenuOpen,
  navigate,
  logout,
}) {
  return (
    <nav className="navbar">
      <div className="nav-logo" onClick={() => navigate("scanner")}>
        <div className="logo-icon">♻</div>
        GREENBIN
      </div>

      <div className="nav-tabs">
        <button
          className={`nav-tab ${currentPage === "scanner" ? "active" : ""}`}
          onClick={() => navigate("scanner")}
        >
          Scanner
        </button>

        <button
          className={`nav-tab ${
            currentPage === "dashboard" ? "active" : ""
          }`}
          onClick={() => navigate("dashboard")}
        >
          Dashboard
        </button>

        <button
          className={`nav-tab ${currentPage === "route" ? "active" : ""}`}
          onClick={() => navigate("route")}
        >
          Route
        </button>
      </div>

      <div className="user-area">
        <button
          className="user-badge"
          onClick={() => setUserMenuOpen((value) => !value)}
        >
          <div className="nav-avatar">{getInitials(user?.name)}</div>

          <div className="nav-user-info">
            <strong>{user?.name}</strong>
            <span>⚡ {user?.points?.toLocaleString()} pts</span>
          </div>

          <span className="user-chevron">⌄</span>
        </button>

        {userMenuOpen && (
          <div className="user-dropdown">
            <button
              className="user-dropdown-item"
              onClick={() => navigate("profile")}
            >
              👤 Profile
            </button>

            <button className="user-dropdown-item danger" onClick={logout}>
              ↪ Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

/* =========================================================
   SCANNER
========================================================= */

function ScannerPage({
  selectedItem,
  selectItem,
  camLabel,
  scanning,
  scanResult,
  runScan,
  schedulePickup,
  dropAtBin,
  cameraActive,
  cameraError,
  videoRef,
  startCamera,
  stopCamera,
}) {
  return (
    <main className="page page-scanner">
      <section className="page-heading">
        <div>
          <div className="eyebrow">EDGE AI / CLASSIFICATION</div>
          <h1>AI Scanner — Edge Classification</h1>

          <p>
            Edge Classification · Raspberry Pi 4 · TensorFlow Lite · SSD
            MobileNetV2 · &lt;120ms inference
          </p>
        </div>

        <div className="live-indicator">
          <span className="status-dot online"></span>
          SYSTEM ONLINE
        </div>
      </section>

      <section className="scanner-layout">
        <div className="scanner-left">
          <div className="card item-selector-card">
            <div className="card-header">
              <div>
                <span className="section-kicker">SELECT OBJECT</span>
                <h2>What are you recycling?</h2>
              </div>
            </div>

            <div className="item-chips">
              {ITEMS.map((item) => (
                <button
                  key={item.name}
                  className={`item-chip ${
                    selectedItem.name === item.name ? "selected" : ""
                  }`}
                  onClick={() => selectItem(item)}
                >
                  <span>{item.icon}</span>
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="camera-card">
            <div className="camera-topbar">
              <span>CAMERA FEED</span>
              <span className="camera-status">
                <span className="status-dot online"></span>
                LIVE
              </span>
            </div>

            <div className={`camera-viewport ${scanning ? "scanning" : ""}`}>
  <video
  ref={videoRef}
  className={`camera-video ${
    !cameraActive ? "camera-video-hidden" : ""
  }`}
  autoPlay
  playsInline
  muted
/>

{!cameraActive && (
  <div className="camera-placeholder">
    <div className="camera-placeholder-icon">📷</div>

    <strong>Camera is ready</strong>

    <span>
      Start the camera to use live e-waste scanning.
    </span>

    <button
      type="button"
      className="btn btn-primary"
      onClick={startCamera}
    >
      📷 Start Camera
    </button>

    {cameraError && (
      <small className="camera-error">
        {cameraError}
      </small>
    )}
  </div>

)}
<div className="camera-grid"></div>

  <div className="scan-frame">
    <span className="corner top-left"></span>
    <span className="corner top-right"></span>
    <span className="corner bottom-left"></span>
    <span className="corner bottom-right"></span>
  </div>

  {scanning && <div className="scan-line"></div>}

  <div className="camera-label">
    {camLabel}
  </div>

  {cameraActive && (
    <div className="camera-object">
      <span>{selectedItem.icon}</span>
    </div>
  )}

  <div className="camera-data">
    <span>MODEL: SSD-MOBILENET-V2</span>
    <span>FPS: 30</span>
  </div>
</div>

            <div className="scanner-actions">
                <button
                  className="btn btn-primary"
                  onClick={cameraActive ? stopCamera : startCamera}
                >
                  {cameraActive ? "⏹ Stop Camera" : "📷 Start Camera"}
                </button>

                <button
                  className="btn btn-primary scan-button"
                  onClick={runScan}
                  disabled={scanning || !cameraActive}
                >
                  {scanning ? "⟳ AI Scanning..." : "◉ Run AI Scan"}
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={schedulePickup}
                >
                  🚚 Schedule Pickup
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={dropAtBin}
                >
                  📍 Drop at Bin
                </button>
              </div>
          </div>
        </div>

        <div className="scanner-right">
          {scanResult ? (
            <ScanResult result={scanResult} />
          ) : (
            <EmptyScanResult />
          )}

          <div className="card xai-card">
            <div className="section-kicker">EXPLAINABLE AI</div>
            <h2>Why this classification?</h2>

            <div className="heatmap">
                <div className="heatmap-grid">
                  {[
                    0, 1, 2, 3, 4, 2,
                    1, 3, 4, 4, 2, 1,
                    2, 4, 4, 4, 3, 1,
                    1, 3, 4, 4, 2, 0,
                    0, 1, 2, 3, 1, 0,
                  ].map((heat, index) => (
                    <div
                      key={index}
                      className={`heat-cell heat-${heat}`}
                    />
                  ))}
                </div>

                <div className="heatmap-object">
                  {selectedItem.icon}
                </div>

                <div className="heatmap-label">
                  MODEL ATTENTION
                </div>
              </div>
            <p className="muted-text">
              Attention heatmap highlights the regions that contributed most
              strongly to the model's classification.
            </p>
          </div>

          <Lifecycle />
        </div>
      </section>
    </main>
  );
}

function EmptyScanResult() {
  return (
    <div className="card result-card empty-result">
      <div className="empty-result-icon">⌁</div>
      <div className="section-kicker">CLASSIFICATION RESULT</div>
      <h2>Waiting for scan</h2>
      <p>
        Select an e-waste item and run the AI scanner to classify the object.
      </p>
    </div>
  );
}

function ScanResult({ result }) {
  return (
    <div className="card result-card">
      <div className="result-top">
        <div>
          <div className="section-kicker">CLASSIFICATION RESULT</div>
          <h2>
            {result.icon} {result.name}
          </h2>
        </div>

        <div className="confidence-number">
          {result.confidence}
          <span>%</span>
        </div>
      </div>

      <div className="confidence-label">
        <span>MODEL CONFIDENCE</span>
        <strong>{result.confidence}%</strong>
      </div>

      <div className="confidence-bar">
        <div style={{ width: `${result.confidence}%` }}></div>
      </div>

      <div className="result-tags">
        {result.tags.map((tag) => (
          <span className="result-tag" key={tag}>
            {tag}
          </span>
        ))}
      </div>

      <div className="hazard-section">
        <div className="hazard-title">⚠ HAZARDOUS MATERIALS</div>

        <div className="hazard-tags">
          {result.hazards.map((hazard) => (
            <span className="hazard-tag" key={hazard}>
              {hazard}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Lifecycle() {
  const steps = [
    ["01", "AI Classified", "Object identified"],
    ["02", "Pickup / Drop", "Collection initiated"],
    ["03", "Material Recovery", "Components separated"],
    ["04", "Back in the Loop", "Materials reused"],
  ];

  return (
    <div className="card lifecycle-card">
      <div className="section-kicker">CIRCULAR LIFECYCLE</div>
      <h2>Track the journey</h2>

      <div className="timeline">
        {steps.map(([number, title, description], index) => (
          <div className="timeline-step" key={number}>
            <div className="timeline-number">{number}</div>

            <div className="timeline-content">
              <strong>{title}</strong>
              <span>{description}</span>
            </div>

            {index < steps.length - 1 && (
              <div className="timeline-line"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

function DashboardPage({ navigate }) {
  return (
    <main className="page page-dashboard">
      <section className="page-heading">
        <div>
          <div className="eyebrow">NETWORK CONTROL CENTER</div>
          <h1>Smart Bin Dashboard</h1>
          <p>Real-time visibility across the GreenBin collection network.</p>
        </div>

        <div className="live-indicator">
          <span className="status-dot online"></span>
          NETWORK ONLINE
        </div>
      </section>

      <section className="metrics-grid">
        <MetricCard
          label="ITEMS RECYCLED"
          value="247"
          suffix="items"
          icon="♻"
          detail="+18 this week"
        />

        <MetricCard
          label="SMART BINS"
          value="12/12"
          suffix="online"
          icon="◫"
          detail="100% network uptime"
        />

        <MetricCard
          label="CO₂ DIVERTED"
          value="1,842"
          suffix="kg"
          icon="◌"
          detail="Equivalent to 76 trees"
        />
      </section>

      <section className="dashboard-grid">
        <div className="card bin-network-card">
          <div className="card-header">
            <div>
              <div className="section-kicker">LIVE NETWORK</div>
              <h2>Smart Bin Network</h2>
            </div>

            <span className="last-updated">Updated just now</span>
          </div>

          <div className="bin-grid">
            {BINS.map(([id, fill]) => {
              const status = getBinStatus(fill);

              return (
                <div className="bin-card" key={id}>
                  <div className="bin-card-top">
                    <span>{id}</span>
                    <span className={`bin-status ${status}`}>
                      {status}
                    </span>
                  </div>

                  <div className="bin-visual">
                    <div className="bin-body">
                      <div
                        className={`bin-fill ${status}`}
                        style={{ height: `${fill}%` }}
                      ></div>
                    </div>

                    <strong>{fill}%</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="dashboard-side">
          <div className="card chart-card">
            <div className="section-kicker">WEEKLY ACTIVITY</div>
            <h2>Collection Volume</h2>

            <div className="bar-chart">
              {[42, 58, 47, 73, 61, 86, 68].map((height, index) => (
                <div className="chart-column" key={index}>
                  <div className="chart-value">{height}</div>
                  <div
                    className="chart-bar"
                    style={{ height: `${height}%` }}
                  ></div>
                  <span>
                    {["M", "T", "W", "T", "F", "S", "S"][index]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card alerts-card">
            <div className="section-kicker">ATTENTION REQUIRED</div>
            <h2>Network Alerts</h2>

            <div className="alert-item">
              <span className="alert-icon critical">!</span>
              <div>
                <strong>BIN-07 at 95%</strong>
                <span>Pickup recommended</span>
              </div>
            </div>

            <div className="alert-item">
              <span className="alert-icon warning">!</span>
              <div>
                <strong>BIN-12 at 91%</strong>
                <span>Pickup recommended</span>
              </div>
            </div>

            <div className="alert-item">
              <span className="alert-icon normal">✓</span>
              <div>
                <strong>All systems operational</strong>
                <span>No hardware faults detected</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="route-cta">
        <div>
          <div className="section-kicker">OPTIMIZED COLLECTION</div>
          <h2>Need to dispatch a collection truck?</h2>
          <p>
            Harris Hawks Optimization calculates an efficient route based on
            current bin fill levels.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => navigate("route")}>
          View Optimized Route →
        </button>
      </section>
    </main>
  );
}

function MetricCard({ label, value, suffix, icon, detail }) {
  return (
    <div className="metric-card">
      <div className="metric-icon">{icon}</div>
      <div className="section-kicker">{label}</div>
      <div className="metric-value">
        {value}
        <small>{suffix}</small>
      </div>
      <div className="metric-detail">{detail}</div>
    </div>
  );
}

/* =========================================================
   ROUTE
========================================================= */

function RoutePage({
  selectedStop,
  highlightStop,
  dispatchRoute,
  dispatching,
  dispatched,
  routeResult,
}) {

  // Get the optimized route safely
  const route = routeResult?.route ?? routeResult;

  // Get stops regardless of response structure
  const routeStops = route?.stops ?? [];

  console.log("========== GREENBIN HHO ==========");
  console.log("Full route result:", routeResult);
  console.log("Route:", route);
  console.log("Route stops:", routeStops);
  console.log("Number of stops:", routeStops.length);
  console.log("==================================");

  return (
    <main className="page">

      {/* =========================
          PAGE HEADER
      ========================== */}

      <section className="page-header">

        <div>

          <span className="eyebrow">
            SMART COLLECTION
          </span>

          <h1>
            HHO Route Optimization
          </h1>

          <p>
            Harris Hawks Optimization intelligently plans
            e-waste collection routes using bin priority,
            distance and collection efficiency.
          </p>

        </div>

        <div className="hho-live-status">

          <span className="status-dot"></span>

          {routeResult
            ? "OPTIMIZATION COMPLETE"
            : "READY"}

        </div>

      </section>


      {/* =========================
          HHO CONTROL CARD
      ========================== */}

      <section className="hho-control-card">

        <div className="hho-control-content">

          <div className="hho-icon">
            🦅
          </div>

          <div>

            <span className="eyebrow">
              OPTIMIZATION ENGINE
            </span>

            <h2>
              Harris Hawks Optimization
            </h2>

            <p>
              The HHO algorithm evaluates multiple possible
              collection sequences and selects a route that
              reduces travel distance while prioritizing
              high-fill bins.
            </p>

          </div>

        </div>

        <button
          className="btn btn-primary hho-button"
          onClick={dispatchRoute}
          disabled={dispatching}
        >
          {dispatching
            ? "🦅 HHO OPTIMIZING..."
            : "🚚 OPTIMIZE COLLECTION ROUTE"}
        </button>

      </section>


      {/* =========================
          BEFORE OPTIMIZATION
      ========================== */}

      {!routeResult && (

        <section className="hho-empty-state">

          <div className="hho-empty-icon">
            🗺️
          </div>

          <h2>
            No optimized route generated
          </h2>

          <p>
            Click <strong>Optimize Collection Route</strong>
            to run the HHO algorithm using the current
            smart-bin data.
          </p>

          <div className="hho-process">

            <div>
              <span>01</span>
              <strong>Read Bin Data</strong>
              <small>MySQL</small>
            </div>

            <div className="process-arrow">
              →
            </div>

            <div>
              <span>02</span>
              <strong>Find Priority Bins</strong>
              <small>&gt; 60% fill</small>
            </div>

            <div className="process-arrow">
              →
            </div>

            <div>
              <span>03</span>
              <strong>Run HHO</strong>
              <small>25 Hawks</small>
            </div>

            <div className="process-arrow">
              →
            </div>

            <div>
              <span>04</span>
              <strong>Optimized Route</strong>
              <small>Minimum distance</small>
            </div>

          </div>

        </section>

      )}


      {/* =========================
          HHO RESULT
      ========================== */}

      {routeResult && (

        <>

          {/* =========================
              METRICS
          ========================== */}

          <section className="hho-metrics-grid">

            <div className="hho-stat-card">

              <span className="stat-label">
                BINS MONITORED
              </span>

              <strong>
                {routeResult.monitoredBins ?? 12}
              </strong>

              <small>
                Smart bins
              </small>

            </div>


            <div className="hho-stat-card">

              <span className="stat-label">
                PRIORITY BINS
              </span>

              <strong>
                {routeResult.priorityBins ??
                  routeStops.length}
              </strong>

              <small>
                Require collection
              </small>

            </div>


            <div className="hho-stat-card">

              <span className="stat-label">
                TOTAL DISTANCE
              </span>

              <strong>

                {route?.totalDistanceKm ?? 0}

                <small>
                  {" "}km
                </small>

              </strong>

              <small>
                Optimized route
              </small>

            </div>


            <div className="hho-stat-card">

              <span className="stat-label">
                ESTIMATED TIME
              </span>

              <strong>

                {route?.durationMin ?? 0}

                <small>
                  {" "}min
                </small>

              </strong>

              <small>
                Collection + travel
              </small>

            </div>

          </section>


          {/* =========================
              ROUTE VISUALIZATION
          ========================== */}

          <section className="route-visual-card">

            <div className="route-card-header">

              <div>

                <span className="eyebrow">
                  LIVE OPTIMIZED ROUTE
                </span>

                <h2>
                  Collection Network
                </h2>

              </div>

              <div className="route-algorithm">
                🦅 HHO
              </div>

            </div>


            {/* =========================
                MAP
            ========================== */}

            <div className="hho-map">

              {/* ACTUAL HHO PATH */}

              {route?.pathD && (

                <svg
                  className="route-canvas"
                  viewBox="0 0 900 700"
                  preserveAspectRatio="none"
                >

                  <path
                    d={route.pathD}
                    className="actual-hho-path"
                    fill="none"
                    stroke="#62ff78"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="12 7"
                  />

                </svg>

              )}


              {/* CENTRAL DEPOT */}

              <div
                className="simple-map-marker depot-marker-box"
                style={{
                  left: "8.9%",
                  top: "71.4%",
                }}
              >

                <div className="simple-marker-icon">
                  🏭
                </div>

                <div className="simple-marker-label">

                  <strong>
                    Central Depot
                  </strong>

                  <span>
                    Start / End
                  </span>

                </div>

              </div>


              {/* =========================
                  HHO STOPS
              ========================== */}

              {routeStops.map((stop, index) => {

                // Safety check
                if (!stop || !stop.coords) {
                  console.warn(
                    "Invalid HHO stop:",
                    stop
                  );

                  return null;
                }

                const x = Number(stop.coords.x);
                const y = Number(stop.coords.y);

                const left =
                  (x / 900) * 100;

                const top =
                  (y / 700) * 100;

                console.log(
                  `STOP ${index + 1}:`,
                  stop.binId,
                  "x:",
                  x,
                  "y:",
                  y,
                  "left:",
                  left,
                  "top:",
                  top
                );

                return (

                  <div
                    key={
                      stop.binId ||
                      stop.id ||
                      index
                    }
                    className={`simple-map-marker ${
                      stop.urgent
                        ? "critical-marker"
                        : ""
                    }`}
                    style={{
                      left: `${left}%`,
                      top: `${top}%`,
                    }}
                  >

                    <div className="simple-stop-number">

                      {stop.stopNumber ??
                        index + 1}

                    </div>

                    <div className="simple-marker-label">

                      <strong>

                        {stop.binId ||
                          stop.id ||
                          `BIN-${index + 1}`}

                      </strong>

                      <span>

                        {stop.fill ?? 0}% full

                      </span>

                      <small>

                        {stop.urgent
                          ? "URGENT"
                          : "PRIORITY"}

                      </small>

                    </div>

                  </div>

                );

              })}


              {/* DEBUG COUNTER */}

              <div
                style={{
                  position: "absolute",
                  top: "18px",
                  left: "18px",
                  zIndex: 100,

                  padding: "8px 12px",

                  background:
                    "rgba(0,0,0,0.9)",

                  border:
                    "1px solid #62ff78",

                  borderRadius: "6px",

                  color: "#62ff78",

                  fontSize: "11px",

                  fontWeight: "800",
                }}
              >

                HHO STOPS: {routeStops.length}

              </div>


              {/* MAP TITLE */}

              <div className="simple-map-title">

                🦅 HHO OPTIMIZED ROUTE

              </div>


              {/* LEGEND */}

              <div className="simple-map-legend">

                <span>

                  <i className="legend-green"></i>

                  Priority

                </span>

                <span>

                  <i className="legend-red"></i>

                  Critical

                </span>

                <span>

                  <i className="legend-white"></i>

                  Depot

                </span>

              </div>

            </div>

          </section>


          {/* =========================
              COLLECTION SEQUENCE
          ========================== */}

          <section className="hho-sequence-card">

            <div className="route-card-header">

              <div>

                <span className="eyebrow">
                  COLLECTION SEQUENCE
                </span>

                <h2>
                  Optimized Stop Order
                </h2>

              </div>

              <span className="optimized-badge">
                ✓ OPTIMIZED
              </span>

            </div>


            <div className="sequence">

              <div className="sequence-item depot">

                <div className="sequence-number">
                  0
                </div>

                <div>

                  <strong>
                    Central Depot
                  </strong>

                  <small>
                    Route starting point
                  </small>

                </div>

              </div>


              {routeStops.map((stop, index) => (

                <div
                  className="sequence-item"
                  key={
                    stop.binId ||
                    stop.id ||
                    index
                  }
                >

                  <div className="sequence-number">

                    {stop.stopNumber ??
                      index + 1}

                  </div>

                  <div className="sequence-info">

                    <strong>

                      {stop.binId ||
                        stop.id ||
                        `BIN-${index + 1}`}

                    </strong>

                    <small>

                      {stop.area ||
                        "Collection Zone"}

                      {" • "}

                      {stop.fill ?? 0}% filled

                    </small>

                    <small>

                      Estimated arrival:
                      {" "}

                      {stop.estArrivalMin ||
                        "Pending"}

                    </small>

                  </div>


                  {stop.urgent && (

                    <span className="urgent-label">
                      URGENT
                    </span>

                  )}

                </div>

              ))}


              <div className="sequence-item depot">

                <div className="sequence-number">
                  ✓
                </div>

                <div>

                  <strong>
                    Recycling Facility
                  </strong>

                  <small>
                    Final destination
                  </small>

                </div>

              </div>

            </div>

          </section>


          {/* =========================
              ALGORITHM DETAILS
          ========================== */}

          <section className="hho-details-grid">

            <div className="hho-detail-card">

              <span className="eyebrow">
                ALGORITHM
              </span>

              <h3>
                🦅 Harris Hawks Optimization
              </h3>

              <p>
                HHO searches through multiple candidate
                collection sequences. Each hawk represents
                a possible route, while the best solution
                becomes the current optimal route.
              </p>

            </div>


            <div className="hho-detail-card">

              <span className="eyebrow">
                ECO IMPACT
              </span>

              <h3>
                🌱 Sustainable Collection
              </h3>

              <div className="eco-metrics">

                <div>

                  <strong>

                    {route?.fuelSavedPct ?? 0}%

                  </strong>

                  <span>
                    Distance Saved
                  </span>

                </div>

                <div>

                  <strong>

                    {route?.co2AvoidedKg ?? 0} kg

                  </strong>

                  <span>
                    CO₂ Avoided
                  </span>

                </div>

              </div>

            </div>

          </section>

        </>

      )}

    </main>
  );
}

function MapMarker({
  x,
  y,
  label,
  fill,
  number,
  selected,
  onClick,
}) {
  return (
    <g
      className={`map-marker ${selected ? "selected" : ""}`}
      onClick={onClick}
    >
      <circle cx={x} cy={y} r="24" className="marker-ring" />
      <circle cx={x} cy={y} r="17" className="marker-circle" />
      <text x={x} y={y + 5} textAnchor="middle">
        {number}
      </text>
      <text x={x + 30} y={y - 7} className="marker-label">
        {label}
      </text>
      <text x={x + 30} y={y + 10} className="marker-fill">
        {fill}
      </text>
    </g>
  );
}

/* =========================================================
   PROFILE
========================================================= */

function ProfilePage({ user, setRewardsOpen }) {
  const points = user?.points || 0;
  const nextLevel = 1500;
  const progress = Math.min((points / nextLevel) * 100, 100);
  const pointsNeeded = Math.max(nextLevel - points, 0);

  return (
    <main className="page page-profile">
      <section className="page-heading">
        <div>
          <div className="eyebrow">YOUR GREENBIN ACCOUNT</div>
          <h1>Profile</h1>
          <p>Your recycling activity, impact and rewards.</p>
        </div>
      </section>

      <section className="profile-layout">
        <div className="profile-main">
          <div className="card profile-card">
            <div className="profile-header">
              <div className="profile-avatar">{getInitials(user?.name)}</div>

              <div>
                <div className="section-kicker">GREENBIN MEMBER</div>
                <h2>{user?.name}</h2>
                <p>{user?.email}</p>
                <span className="profile-role">
                  {user?.role || "resident"}
                </span>
              </div>
            </div>

            <div className="profile-points">
              <div>
                <span className="section-kicker">TOTAL POINTS</span>
                <strong>⚡ {points.toLocaleString()}</strong>
              </div>

              <button
                className="btn btn-primary"
                onClick={() => setRewardsOpen(true)}
              >
                Redeem Rewards
              </button>
            </div>

            <div className="level-section">
              <div className="level-top">
                <span>Level 2 · Eco Recycler</span>
                <span>{pointsNeeded} pts to next level</span>
              </div>

              <div className="level-bar">
                <div style={{ width: `${progress}%` }}></div>
              </div>

              <div className="level-bottom">
                <span>Eco Recycler</span>
                <span>Green Champion · 1,500 pts</span>
              </div>
            </div>
          </div>

          <div className="card achievements-card">
            <div className="section-kicker">MILESTONES</div>
            <h2>Achievements</h2>

            <div className="achievements-grid">
              <Achievement icon="♻" title="First Recycle" done />
              <Achievement icon="🌱" title="Eco Starter" done />
              <Achievement icon="⚡" title="1K Points" done />
              <Achievement icon="🏆" title="Green Champion" />
            </div>
          </div>

          <div className="card history-card">
            <div className="card-header">
              <div>
                <div className="section-kicker">ACTIVITY</div>
                <h2>Disposal History</h2>
              </div>
            </div>

            <div className="history-list">
              <HistoryRow
                icon="📱"
                title="Smartphone"
                date="Recently"
                points="+50 pts"
              />

              <HistoryRow
                icon="💻"
                title="Laptop"
                date="This month"
                points="+100 pts"
              />

              <HistoryRow
                icon="🔋"
                title="AA Battery"
                date="This month"
                points="+25 pts"
              />
            </div>
          </div>
        </div>

        <aside className="profile-side">
          <div className="card impact-card">
            <div className="section-kicker">YOUR IMPACT</div>
            <h2>Small actions. Big loop.</h2>

            <div className="impact-stat">
              <span>⚠</span>
              <div>
                <strong>37</strong>
                <small>hazardous items diverted</small>
              </div>
            </div>

            <div className="impact-stat">
              <span>◇</span>
              <div>
                <strong>18.4 kg</strong>
                <small>valuable metals recovered</small>
              </div>
            </div>

            <div className="impact-stat">
              <span>🌱</span>
              <div>
                <strong>42 kg</strong>
                <small>CO₂ impact avoided</small>
              </div>
            </div>
          </div>

          <div className="card latest-card">
            <div className="section-kicker">LATEST LIFECYCLE</div>
            <h2>Smartphone</h2>

            <div className="mini-timeline">
              <div className="mini-step done">
                <span>✓</span>
                <div>
                  <strong>Classified</strong>
                  <small>AI scanner</small>
                </div>
              </div>

              <div className="mini-step done">
                <span>✓</span>
                <div>
                  <strong>Collected</strong>
                  <small>GreenBin network</small>
                </div>
              </div>

              <div className="mini-step">
                <span>3</span>
                <div>
                  <strong>Material Recovery</strong>
                  <small>Next stage</small>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

function Achievement({ icon, title, done = false }) {
  return (
    <div className={`achievement ${done ? "done" : ""}`}>
      <div className="achievement-icon">{icon}</div>
      <strong>{title}</strong>
      <span>{done ? "Unlocked" : "Locked"}</span>
    </div>
  );
}

function HistoryRow({ icon, title, date, points }) {
  return (
    <div className="history-row">
      <div className="history-icon">{icon}</div>

      <div className="history-info">
        <strong>{title}</strong>
        <span>{date}</span>
      </div>

      <strong className="history-points">{points}</strong>
    </div>
  );
}

/* =========================================================
   REWARDS MODAL
========================================================= */

function RewardsModal({ user, rewards, close, redeemReward }) {
  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="rewards-modal" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={close}>
          ×
        </button>

        <div className="section-kicker">GREENBIN REWARDS</div>
        <h2>Redeem your points</h2>

        <div className="modal-points">
          ⚡ {user?.points?.toLocaleString() || 0} points available
        </div>

        <div className="rewards-grid">
          {rewards.map((reward) => {
            const canRedeem = (user?.points || 0) >= reward.cost;

            return (
              <div className="reward-card" key={reward.id}>
                <div className="reward-icon">{reward.icon}</div>

                <div className="reward-info">
                  <strong>{reward.name}</strong>
                  <p>{reward.description}</p>

                  <div className="reward-bottom">
                    <span>⚡ {reward.cost} pts</span>

                    <button
                      className="btn btn-small"
                      disabled={!canRedeem}
                      onClick={() => redeemReward(reward)}
                    >
                      {canRedeem ? "Redeem" : "Need more"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default App;