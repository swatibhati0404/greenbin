require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();

const PORT = process.env.PORT || 5000;

const { runHHO } = require("./hho");
// ======================================================
// MIDDLEWARE
// ======================================================

app.use(cors());
app.use(express.json());


// ======================================================
// MYSQL CONNECTION
// ======================================================

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const BIN_LOCATIONS = {
  "BIN-01": { x: 180, y: 420, area: "Sector 1" },
  "BIN-02": { x: 300, y: 350, area: "Sector 2" },
  "BIN-03": { x: 430, y: 280, area: "Sector 3" },
  "BIN-04": { x: 250, y: 520, area: "Sector 4" },
  "BIN-05": { x: 380, y: 500, area: "Sector 5" },
  "BIN-06": { x: 520, y: 420, area: "Sector 6" },
  "BIN-07": { x: 650, y: 330, area: "Sector 7" },
  "BIN-08": { x: 600, y: 520, area: "Sector 8" },
  "BIN-09": { x: 720, y: 450, area: "Sector 9" },
  "BIN-10": { x: 450, y: 620, area: "Sector 10" },
  "BIN-11": { x: 760, y: 570, area: "Sector 11" },
  "BIN-12": { x: 820, y: 380, area: "Sector 12" },
};

// ======================================================
// TEST DATABASE CONNECTION
// ======================================================

async function testDatabase() {
  try {
    const connection = await pool.getConnection();

    console.log("MySQL connected successfully ✓");

    connection.release();
  } catch (error) {
    console.error("MySQL connection failed:");
    console.error(error.message);
  }
}


// ======================================================
// HOME
// ======================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "GreenBin API is running 🌱",
  });
});


// ======================================================
// REGISTER
// ======================================================

app.post("/api/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const [existingUsers] = await pool.execute(
      "SELECT id FROM users WHERE email = ?",
      [normalizedEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    // Insert user
    const [result] = await pool.execute(
      `INSERT INTO users
       (name, email, password, role, points)
       VALUES (?, ?, ?, ?, ?)`,
      [
        name.trim(),
        normalizedEmail,
        password,
        role || "resident",
        0,
      ]
    );

    // Return newly created user
    const [users] = await pool.execute(
      `SELECT id, name, email, role, points, created_at
       FROM users
       WHERE id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: "Account created successfully.",
      user: users[0],
    });

  } catch (error) {
    console.error("Register error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while creating account.",
    });
  }
});


// ======================================================
// LOGIN
// ======================================================

app.post("/api/login", async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [users] = await pool.execute(
      `SELECT id, name, email, password, role, points, created_at
       FROM users
       WHERE email = ?`,
      [normalizedEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const user = users[0];

    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Remove password before sending to frontend
    delete user.password;

    res.json({
      success: true,
      message: "Login successful.",
      user,
    });

  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Server error during login.",
    });
  }
});


// ======================================================
// SAVE SCAN
// ======================================================

app.post("/api/scans", async (req, res) => {
  try {
    const {
      userId,
      itemName,
      confidence,
      hazards,
      tags,
    } = req.body;

    if (!itemName) {
      return res.status(400).json({
        success: false,
        message: "Item name is required.",
      });
    }

    // Points awarded for a successful scan
    const pointsEarned = 50;

    // 1. Save the scan
    const [result] = await pool.execute(
      `INSERT INTO scans
       (user_id, item_name, confidence, hazards, tags)
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId || null,
        itemName,
        confidence || 0,
        JSON.stringify(hazards || []),
        JSON.stringify(tags || []),
      ]
    );

    // 2. Increase user's points
    if (userId) {
      await pool.execute(
        `UPDATE users
         SET points = points + ?
         WHERE id = ?`,
        [pointsEarned, userId]
      );
    }

    // 3. Get the saved scan
    const [scanRows] = await pool.execute(
      "SELECT * FROM scans WHERE id = ?",
      [result.insertId]
    );

    const scan = scanRows[0];

    scan.hazards = JSON.parse(scan.hazards || "[]");
    scan.tags = JSON.parse(scan.tags || "[]");

    // 4. Get updated user points
    let updatedPoints = null;

    if (userId) {
      const [userRows] = await pool.execute(
        `SELECT id, name, email, role, points
         FROM users
         WHERE id = ?`,
        [userId]
      );

      if (userRows.length > 0) {
        updatedPoints = userRows[0].points;
      }
    }

    console.log(
      `New scan saved: ${scan.item_name} | +${pointsEarned} points`
    );

    res.status(201).json({
      success: true,
      message: "Scan saved successfully.",
      scan,
      pointsEarned,
      totalPoints: updatedPoints,
    });

  } catch (error) {
    console.error("Scan error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while saving scan.",
    });
  }
});


// ======================================================
// GET SCANS
// ======================================================

app.get("/api/scans", async (req, res) => {
  try {
    const [scans] = await pool.execute(
      "SELECT * FROM scans ORDER BY created_at DESC"
    );

    scans.forEach((scan) => {
      scan.hazards = JSON.parse(scan.hazards || "[]");
      scan.tags = JSON.parse(scan.tags || "[]");
    });

    res.json({
      success: true,
      scans,
    });

  } catch (error) {
    console.error("Get scans error:", error);

    res.status(500).json({
      success: false,
      message: "Could not fetch scans.",
    });
  }
});


// ======================================================
// CREATE PICKUP
// ======================================================

app.post("/api/pickups", async (req, res) => {
  try {
    const {
      userId,
      itemName,
      location,
    } = req.body;

    const [result] = await pool.execute(
      `INSERT INTO pickups
       (user_id, item_name, location, status)
       VALUES (?, ?, ?, ?)`,
      [
        userId || null,
        itemName || "E-waste",
        location || "User location",
        "requested",
      ]
    );

    const [rows] = await pool.execute(
      "SELECT * FROM pickups WHERE id = ?",
      [result.insertId]
    );

    console.log("New pickup request:", rows[0]);

    res.status(201).json({
      success: true,
      message: "Pickup request created.",
      pickup: rows[0],
    });

  } catch (error) {
    console.error("Pickup error:", error);

    res.status(500).json({
      success: false,
      message: "Could not create pickup request.",
    });
  }
});


// ======================================================
// GET PICKUPS
// ======================================================

app.get("/api/pickups", async (req, res) => {
  try {
    const [pickups] = await pool.execute(
      "SELECT * FROM pickups ORDER BY created_at DESC"
    );

    res.json({
      success: true,
      pickups,
    });

  } catch (error) {
    console.error("Get pickups error:", error);

    res.status(500).json({
      success: false,
      message: "Could not fetch pickups.",
    });
  }
});


// ======================================================
// GET BINS
// ======================================================

app.get("/api/bins", async (req, res) => {
  try {
    const [bins] = await pool.execute(
      "SELECT * FROM bins ORDER BY id"
    );

    res.json({
      success: true,
      bins,
    });

  } catch (error) {
    console.error("Get bins error:", error);

    res.status(500).json({
      success: false,
      message: "Could not fetch bins.",
    });
  }
});


// ======================================================
// ROUTE DISPATCH
// ======================================================

app.post("/api/routes/dispatch", (req, res) => {
  res.json({
    success: true,
    message: "Collection truck dispatched successfully.",
    route: {
      distance: "18.4 km",
      estimatedTime: "52 min",
      fuelSaved: "34%",
      co2Saved: "8.2 kg",
      stops: 5,
      status: "dispatched",
    },
  });
});


// ======================================================
// START SERVER
// ======================================================
app.get("/api/routes/optimize", async (req, res) => {
  try {
    // Get current bin data from MySQL
    const [rows] = await pool.execute(`
      SELECT
        id,
        bin_code,
        fill_level,
        status
      FROM bins
      ORDER BY id
    `);

    // Convert MySQL bins into the format expected by HHO
    const allBins = rows
      .map((bin) => {
        const location = BIN_LOCATIONS[bin.bin_code];

        if (!location) {
          return null;
        }

        return {
          id: bin.bin_code,
          name: bin.bin_code,
          area: location.area,
          fill: Number(bin.fill_level),
          status: bin.status,
          coords: {
            x: location.x,
            y: location.y,
          },
        };
      })
      .filter(Boolean);

    // Run Harris Hawks Optimization
    const optimizedRoute = runHHO(allBins);

    console.log("\n===== HHO ROUTE OPTIMIZATION =====");

    console.log(
      "Candidate bins:",
      allBins.filter((bin) => bin.fill >= 60).map((bin) => bin.id)
    );

    console.log(
      "Optimized route:",
      optimizedRoute.stops.map((stop) => stop.binId)
    );

    console.log(
      "Distance:",
      optimizedRoute.totalDistanceKm,
      "km"
    );

    console.log(
      "Duration:",
      optimizedRoute.durationMin,
      "minutes"
    );

    console.log("==================================\n");

    res.json({
      success: true,
      route: optimizedRoute,
      monitoredBins: allBins.length,
      priorityBins: allBins.filter((bin) => bin.fill >= 60).length,
    });

  } catch (error) {
    console.error("HHO optimization error:", error);

    res.status(500).json({
      success: false,
      message: "Could not generate optimized route.",
    });
  }
});

app.listen(PORT, async () => {
  console.log("");
  console.log("======================================");
  console.log("       GREENBIN BACKEND SERVER");
  console.log("======================================");
  console.log(`API running at http://localhost:${PORT}`);

  await testDatabase();

  console.log("======================================");
  console.log("");
});