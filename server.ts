import express from "express";
import cors from "cors";
import multer from "multer";
import { XMLParser } from "fast-xml-parser";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use((req, res, next) => {
  const logLine = `[${new Date().toISOString()}] ${req.method} ${req.url}\n`;
  console.log(logLine.trim());
  try {
    fs.appendFileSync(path.join(process.cwd(), 'request.log'), logLine);
  } catch (e) {}
  next();
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// In-memory store for activities (can be replaced with a real DB)
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'activities.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let activities: any[] = [];

if (fs.existsSync(DATA_FILE)) {
  try {
    activities = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch (e) {
    console.error('Failed to load activities from file:', e);
  }
}

function saveActivities() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(activities, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save activities to file:', e);
  }
}

const CENTER_LAT = 39.9042;
const CENTER_LNG = 116.4074;

function generateRandomCoordinates(
  centerLat: number,
  centerLng: number,
  distanceKm: number,
  pointsCount: number = 50
): [number, number][] {
  const coords: [number, number][] = [];
  let currentLat = centerLat + (Math.random() - 0.5) * 0.1;
  let currentLng = centerLng + (Math.random() - 0.5) * 0.1;
  const stepSize = distanceKm / 111 / pointsCount;
  for (let i = 0; i < pointsCount; i++) {
    coords.push([currentLat, currentLng]);
    currentLat += (Math.random() - 0.5) * stepSize * 2;
    currentLng += (Math.random() - 0.5) * stepSize * 2;
  }
  return coords;
}

// --- API Routes ---

import bcrypt from 'bcryptjs'; // 切换为 bcryptjs

// ... 其他导入 ...

// 从环境变量读取凭据（注意：ADMIN_PASS 应该是一个 bcrypt 哈希值）
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS_HASH = process.env.ADMIN_PASS_HASH || '$2a$10$ydpKSiLUepB8Zxjgcolj1OkcmY1X7vFvbOH0lCaXDTmF5cLjfAq/O';

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  console.log(`[Auth] Login attempt for user: ${username}`);
  console.log(`[Auth] Input password length: ${password ? password.length : 'undefined'}`);
  console.log(`[Auth] Input password prefix: ${password ? password.substring(0, 20) : 'undefined'}`); // 新增：打印前两个字符
  console.log(`[Auth] ADMIN_USER configured: ${ADMIN_USER}`);
  console.log(`[Auth] ADMIN_PASS_HASH configured length: ${ADMIN_PASS_HASH.length}`);
  console.log(`[Auth] ADMIN_PASS_HASH prefix: ${ADMIN_PASS_HASH.substring(0, 5)}`);
  console.log(`[Auth] ADMIN_PASS_HASH full value: ${ADMIN_PASS_HASH}`);

  // 验证用户名
  if (username !== ADMIN_USER) {
    console.log('[Auth] Username mismatch');
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  try {
    // 使用 bcryptjs 比较明文密码和存储的哈希值
    const isPasswordValid = await bcrypt.compare(password, ADMIN_PASS_HASH);
    console.log(`[Auth] Password check result: ${isPasswordValid}`);

    if (isPasswordValid) {
      res.json({ success: true, token: ADMIN_TOKEN });
    } else {
      console.log('[Auth] Password mismatch');
      res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('[Auth] Bcrypt error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token === ADMIN_TOKEN) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Dynamic configuration for Strava
let stravaConfig = {
  clientId: process.env.STRAVA_CLIENT_ID || '',
  clientSecret: process.env.STRAVA_CLIENT_SECRET || ''
};

// Dynamic configuration for Dashboard
let dashboardConfig = {
  icon: 'Activity',
  title: 'Sport Dash',
  username: 'To5o.Xiao',
  userInfo: '',
  userLink: ''
};

app.get('/api/settings/strava', requireAuth, (req, res) => {
  res.json({
    clientId: stravaConfig.clientId,
    hasSecret: !!stravaConfig.clientSecret
  });
});

app.post('/api/settings/strava', requireAuth, (req, res) => {
  const { clientId, clientSecret } = req.body;
  if (clientId !== undefined) stravaConfig.clientId = clientId;
  if (clientSecret !== undefined && clientSecret !== '') stravaConfig.clientSecret = clientSecret;
  res.json({ success: true });
});

app.get('/api/settings/dashboard', (req, res) => {
  res.json(dashboardConfig);
});

app.post('/api/settings/dashboard', requireAuth, (req, res) => {
  const { icon, title, username, userInfo, userLink } = req.body;
  if (icon !== undefined) dashboardConfig.icon = icon;
  if (title !== undefined) dashboardConfig.title = title;
  if (username !== undefined) dashboardConfig.username = username;
  if (userInfo !== undefined) dashboardConfig.userInfo = userInfo;
  if (userLink !== undefined) dashboardConfig.userLink = userLink;
  res.json({ success: true });
});

app.get("/api/activities", (req, res) => {
  // Deduplicate activities based on date and distance
  const seen = new Set<string>();
  const uniqueActivities = activities.filter(act => {
    const key = `${act.date}-${act.distance.toFixed(3)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const translatedActivities = uniqueActivities.map(act => ({
    ...act,
    name: act.name
      ? act.name
          .replace(/早上/g, 'Morning')
          .replace(/中午/g, 'Noon')
          .replace(/下午/g, 'Afternoon')
          .replace(/晚上/g, 'Evening')
      : act.name
  }));
  res.json(translatedActivities);
});

app.post("/api/upload-activities", requireAuth, (req, res) => {
  const { newActivities } = req.body;
  if (!Array.isArray(newActivities)) {
    return res.status(400).json({ error: "Invalid data format" });
  }
  
  let importedCount = 0;
  let duplicateCount = 0;
  let conflictCount = 0;
  const skippedDetails: string[] = [];

  for (const act of newActivities) {
    if (act.id && act.name && act.type && act.date) {
      const startTime = new Date(act.date).getTime();
      const endTime = startTime + (act.duration * 1000);

      // Check for exact duplicate (same start time and distance)
      const isDuplicate = activities.some(existing => 
        existing.date === act.date && 
        Math.abs(existing.distance - act.distance) < 0.001
      );

      if (isDuplicate) {
        duplicateCount++;
        skippedDetails.push(`Duplicate: "${act.name}" at ${act.date}`);
        continue;
      }

      // Check for time conflict (overlapping intervals)
      const hasConflict = activities.some(existing => {
        const existingStart = new Date(existing.date).getTime();
        const existingEnd = existingStart + (existing.duration * 1000);
        return startTime < existingEnd && existingStart < endTime;
      });

      if (hasConflict) {
        conflictCount++;
        skippedDetails.push(`Conflict: "${act.name}" overlaps with an existing activity`);
        continue;
      }

      activities.unshift(act);
      importedCount++;
    }
  }
  
  if (importedCount > 0) {
    saveActivities();
  }
  
  res.json({ 
    success: true, 
    count: importedCount, 
    duplicates: duplicateCount, 
    conflicts: conflictCount,
    skippedDetails: skippedDetails.length > 0 ? skippedDetails : undefined
  });
});

// Migration endpoint to translate existing names to English and UTC+8
app.post("/api/migrate-activities", requireAuth, (req, res) => {
  let migratedCount = 0;
  let removedCount = 0;
  
  // 1. Deduplicate first
  const seen = new Set<string>();
  const uniqueActivities = activities.filter(act => {
    const key = `${act.date}-${act.distance.toFixed(3)}`;
    if (seen.has(key)) {
      removedCount++;
      return false;
    }
    seen.add(key);
    return true;
  });

  // 2. Translate names
  activities = uniqueActivities.map(act => {
    if (typeof act.name === 'string') {
      let name = act.name;
      const dateObj = new Date(act.date);
      const hour = (dateObj.getUTCHours() + 8) % 24;
      
      let timeOfDay = 'Morning';
      if (hour >= 12 && hour < 14) timeOfDay = 'Noon';
      else if (hour >= 14 && hour < 18) timeOfDay = 'Afternoon';
      else if (hour >= 18 || hour < 5) timeOfDay = 'Evening';

      const type = act.type || 'Run';
      const newName = `${timeOfDay} ${type}`;
      
      if (name.includes('早上') || name.includes('中午') || name.includes('下午') || name.includes('晚上')) {
        migratedCount++;
        return { ...act, name: newName };
      }
    }
    return act;
  });

  if (migratedCount > 0 || removedCount > 0) {
    saveActivities();
  }
  res.json({ success: true, count: migratedCount, removed: removedCount });
});

// TCX Upload (legacy, kept for fallback)
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: uploadDir });
app.post("/api/upload-tcx", requireAuth, (req, res, next) => {
  upload.array('files')(req, res, (err) => {
    if (err) {
      console.error("Multer error:", err);
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    }
    next();
  });
}, (req, res) => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }

  try {
    let importedCount = 0;
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

    for (const file of files) {
      try {
        const xmlData = fs.readFileSync(file.path, 'utf8');
        const result = parser.parse(xmlData);

        const tcxActivities = result?.TrainingCenterDatabase?.Activities?.Activity;
        if (!tcxActivities) {
          continue; // Skip invalid files
        }

        const activityList = Array.isArray(tcxActivities) ? tcxActivities : [tcxActivities];
        
        for (const act of activityList) {
          const sport = act["@_Sport"];
          let type = 'Run';
          if (sport === 'Biking') type = 'Ride';
          else if (sport === 'Hiking') type = 'Hike';

          const laps = Array.isArray(act.Lap) ? act.Lap : [act.Lap];
          let totalDistance = 0;
          let totalTime = 0;
          let coordinates: [number, number][] = [];
          let startTime = act.Id || new Date().toISOString();

          // Determine time of day based on startTime (UTC+8)
          const dateObj = new Date(startTime);
          const hour = (dateObj.getUTCHours() + 8) % 24;
          let timeOfDay = 'Morning'; // 05:00 - 11:59
          if (hour >= 12 && hour < 14) {
            timeOfDay = 'Noon'; // 12:00 - 13:59
          } else if (hour >= 14 && hour < 18) {
            timeOfDay = 'Afternoon'; // 14:00 - 17:59
          } else if (hour >= 18 || hour < 5) {
            timeOfDay = 'Evening'; // 18:00 - 04:59
          }

          for (const lap of laps) {
            if (!lap) continue;
            totalDistance += parseFloat(lap.DistanceMeters || 0);
            totalTime += parseFloat(lap.TotalTimeSeconds || 0);
            
            const track = lap.Track;
            if (track) {
              const trackpoints = Array.isArray(track.Trackpoint) ? track.Trackpoint : [track.Trackpoint];
              for (const tp of trackpoints) {
                if (tp && tp.Position && tp.Position.LatitudeDegrees && tp.Position.LongitudeDegrees) {
                  coordinates.push([
                    parseFloat(tp.Position.LatitudeDegrees),
                    parseFloat(tp.Position.LongitudeDegrees)
                  ]);
                }
              }
            }
          }

          if (totalDistance > 0 || coordinates.length > 0) {
            const actDate = startTime;
            const actDistance = Number((totalDistance / 1000).toFixed(2));
            const actDuration = Math.floor(totalTime);
            const actStartTime = new Date(actDate).getTime();
            const actEndTime = actStartTime + (actDuration * 1000);

            // Check for exact duplicate
            const isDuplicate = activities.some(existing => 
              existing.date === actDate && 
              Math.abs(existing.distance - actDistance) < 0.001
            );

            if (isDuplicate) continue;

            // Check for time conflict
            const hasConflict = activities.some(existing => {
              const existingStart = new Date(existing.date).getTime();
              const existingEnd = existingStart + (existing.duration * 1000);
              return actStartTime < existingEnd && existingStart < actEndTime;
            });

            if (hasConflict) continue;

            const newAct = {
              id: `tcx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: `${timeOfDay} ${type}`,
              type,
              date: actDate,
              distance: actDistance,
              duration: actDuration,
              elevationGain: 0, // TCX elevation parsing can be complex, skipping for simplicity
              coordinates: coordinates.length > 0 ? coordinates : generateRandomCoordinates(CENTER_LAT, CENTER_LNG, totalDistance / 1000)
            };
            activities.unshift(newAct);
            importedCount++;
          }
        }
      } catch (fileErr) {
        console.error(`Error parsing file ${file.originalname}:`, fileErr);
      } finally {
        // Clean up file
        try {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (cleanupErr) {
          console.error(`Failed to clean up file ${file.path}:`, cleanupErr);
        }
      }
    }

    if (importedCount > 0) {
      saveActivities();
    }

    res.json({ success: true, count: importedCount });
  } catch (error) {
    console.error("Error processing TCX files:", error);
    res.status(500).json({ error: "Failed to process TCX files" });
  }
});

// Strava OAuth
app.get('/api/auth/strava/url', (req, res) => {
  if (!stravaConfig.clientId) {
    return res.status(400).json({ error: "Strava Client ID is not configured." });
  }
  const redirectUri = `${req.protocol}://${req.get('host')}/auth/callback`;
  const params = new URLSearchParams({
    client_id: stravaConfig.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'read,activity:read_all',
  });
  const authUrl = `https://www.strava.com/oauth/authorize?${params}`;
  res.json({ url: authUrl });
});

app.get('/api/auth/strava/exchange', async (req, res) => {
  const { code } = req.query;
  if (!stravaConfig.clientId || !stravaConfig.clientSecret) {
    return res.status(400).json({ error: "Strava credentials are not configured." });
  }
  try {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: stravaConfig.clientId,
        client_secret: stravaConfig.clientSecret,
        code,
        grant_type: 'authorization_code'
      })
    });
    const data = await response.json();
    if (data.access_token) {
      res.json({ success: true, token: data.access_token });
    } else {
      res.status(400).json({ error: "Failed to get token", details: data });
    }
  } catch (err) {
    res.status(500).json({ error: "Server error during token exchange" });
  }
});

app.post('/api/sync-strava', requireAuth, async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "No token provided" });

  try {
    const response = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=30', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const stravaActivities = await response.json();

    if (!Array.isArray(stravaActivities)) {
      return res.status(400).json({ error: "Invalid response from Strava" });
    }

    let importedCount = 0;
    for (const sa of stravaActivities) {
      // Check if already imported
      if (activities.find(a => a.id === `strava-${sa.id}`)) continue;

      let type = 'Run';
      if (sa.type === 'Ride') type = 'Ride';
      else if (sa.type === 'Hike') type = 'Hike';

      activities.unshift({
        id: `strava-${sa.id}`,
        name: sa.name,
        type,
        date: sa.start_date,
        distance: Number((sa.distance / 1000).toFixed(2)),
        duration: sa.moving_time,
        elevationGain: sa.total_elevation_gain,
        // Strava provides summary_polyline, but decoding it requires a library.
        // For simplicity in this demo, we'll generate random coords if we don't decode it.
        coordinates: generateRandomCoordinates(CENTER_LAT, CENTER_LNG, sa.distance / 1000)
      });
      importedCount++;
    }

    if (importedCount > 0) {
      saveActivities();
    }

    res.json({ success: true, count: importedCount });
  } catch (error) {
    console.error("Error syncing Strava:", error);
    res.status(500).json({ error: "Failed to sync with Strava" });
  }
});

// Strava OAuth Callback (For popup flow)
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  
  res.send(`
    <html>
      <body>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'STRAVA_AUTH_SUCCESS', code: '${code}' }, '*');
            window.close();
          } else {
            window.location.href = '/';
          }
        </script>
        <p>Authentication successful. This window should close automatically.</p>
      </body>
    </html>
  `);
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global error handler to prevent HTML error pages
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Global error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
