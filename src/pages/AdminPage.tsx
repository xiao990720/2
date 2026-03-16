import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Link as LinkIcon, Save, ArrowLeft, LogOut } from 'lucide-react';

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

export default function AdminPage() {
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  // Strava config state
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [dashboardConfig, setDashboardConfig] = useState({ icon: 'Activity', title: 'Sport Dash', username: 'To5o.Xiao', userInfo: '', userLink: '' });
  const [savingDashboard, setSavingDashboard] = useState(false);

  const token = localStorage.getItem('admin_token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    // Fetch Strava config
    fetch('/api/settings/strava', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (res.status === 401) {
          localStorage.removeItem('admin_token');
          navigate('/login');
          throw new Error('Unauthorized');
        }
        return res.json();
      })
      .then(data => {
        setClientId(data.clientId || '');
        setIsConfigured(!!data.clientId && data.hasSecret);
      })
      .catch(err => console.error("Failed to fetch Strava config", err));

    // Fetch Dashboard config
    fetch('/api/settings/dashboard')
      .then(res => res.json())
      .then(data => setDashboardConfig(data))
      .catch(err => console.error("Failed to fetch Dashboard config", err));
  }, [navigate, token]);

  const handleSaveDashboard = async () => {
    setSavingDashboard(true);
    setMessage('');
    try {
      const res = await fetch('/api/settings/dashboard', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dashboardConfig)
      });
      if (res.ok) {
        setMessage('Dashboard configuration saved successfully.');
      } else {
        setMessage('Failed to save configuration.');
      }
    } catch (err) {
      setMessage('Error saving configuration.');
    } finally {
      setSavingDashboard(false);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setMessage('');
    try {
      const res = await fetch('/api/settings/strava', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ clientId, clientSecret })
      });
      if (res.ok) {
        setMessage('Strava configuration saved successfully.');
        setIsConfigured(true);
        setClientSecret(''); // Clear secret from UI after saving
      } else {
        setMessage('Failed to save configuration.');
      }
    } catch (err) {
      setMessage('Error saving configuration.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setMessage('Parsing files locally...');
    
    const fileArray = Array.from(files) as File[];
    let totalImported = 0;
    let totalDuplicates = 0;
    let totalConflicts = 0;
    const newActivities: any[] = [];

    try {
      // Dynamically import XMLParser to avoid bloating the main bundle
      const { XMLParser } = await import('fast-xml-parser');
      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        setMessage(`Parsing file ${i + 1} of ${fileArray.length}: ${file.name}...`);
        
        // Yield to main thread to prevent UI freeze and allow message to update
        await new Promise(resolve => setTimeout(resolve, 0));

        try {
          const text = await file.text();
          const result = parser.parse(text);
          
          const tcxActivities = result?.TrainingCenterDatabase?.Activities?.Activity;
          if (!tcxActivities) continue;

          const activityList = Array.isArray(tcxActivities) ? tcxActivities : [tcxActivities];
          
          let fileTotalDistance = 0;
          let fileTotalTime = 0;
          let fileCoordinates: [number, number][] = [];
          let fileStartTime = '';
          let fileType: string | null = null;

          for (const act of activityList) {
            if (!fileStartTime) fileStartTime = act.Id || new Date().toISOString();
            
            if (!fileType) {
              const sport = act["@_Sport"];
              fileType = 'Run';
              if (sport === 'Biking') fileType = 'Ride';
              else if (sport === 'Hiking') fileType = 'Hike';
            }

            const laps = Array.isArray(act.Lap) ? act.Lap : [act.Lap];
            for (const lap of laps) {
              if (!lap) continue;
              fileTotalDistance += parseFloat(lap.DistanceMeters || 0);
              fileTotalTime += parseFloat(lap.TotalTimeSeconds || 0);
              
              const track = lap.Track;
              if (track) {
                const trackpoints = Array.isArray(track.Trackpoint) ? track.Trackpoint : [track.Trackpoint];
                
                // Downsample trackpoints if there are too many to prevent memory issues
                // Keep at most 2000 points per file for performance
                const step = Math.max(1, Math.ceil(trackpoints.length / 2000));
                
                for (let tpIdx = 0; tpIdx < trackpoints.length; tpIdx += step) {
                  const tp = trackpoints[tpIdx];
                  if (tp && tp.Position && tp.Position.LatitudeDegrees && tp.Position.LongitudeDegrees) {
                    fileCoordinates.push([
                      parseFloat(tp.Position.LatitudeDegrees),
                      parseFloat(tp.Position.LongitudeDegrees)
                    ]);
                  }
                }
              }
            }
          }

          if (fileTotalDistance > 0 || fileCoordinates.length > 0) {
            const dateObj = new Date(fileStartTime);
            const hour = (dateObj.getUTCHours() + 8) % 24;
            let timeOfDay = 'Morning';
            if (hour >= 12 && hour < 14) timeOfDay = 'Noon';
            else if (hour >= 14 && hour < 18) timeOfDay = 'Afternoon';
            else if (hour >= 18 || hour < 5) timeOfDay = 'Evening';

            newActivities.push({
              id: `tcx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: `${timeOfDay} ${fileType || 'Run'}`,
              type: fileType || 'Run',
              date: fileStartTime,
              distance: Number((fileTotalDistance / 1000).toFixed(2)),
              duration: Math.floor(fileTotalTime),
              elevationGain: 0,
              coordinates: fileCoordinates.length > 0 ? fileCoordinates : generateRandomCoordinates(CENTER_LAT, CENTER_LNG, fileTotalDistance / 1000)
            });
          }
        } catch (err) {
          console.error(`Failed to parse ${file.name}:`, err);
        }
      }

      if (newActivities.length === 0) {
        throw new Error("No valid activities found in the selected files.");
      }

      setMessage(`Uploading ${newActivities.length} activities...`);

      // Chunk the activities to avoid large payloads
      const CHUNK_SIZE = 50;
      for (let i = 0; i < newActivities.length; i += CHUNK_SIZE) {
        const chunk = newActivities.slice(i, i + CHUNK_SIZE);
        const res = await fetch('/api/upload-activities', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ newActivities: chunk }),
        });
        
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Server returned ${res.status}: ${text.slice(0, 100)}`);
        }

        const data = await res.json();
        if (data.success) {
          totalImported += data.count;
          totalDuplicates += (data.duplicates || 0);
          totalConflicts += (data.conflicts || 0);
        } else {
          throw new Error(data.error || 'Failed to import batch');
        }
      }
      
      let finalMsg = `Successfully imported ${totalImported} activities.`;
      if (totalDuplicates > 0 || totalConflicts > 0) {
        finalMsg += ` Skipped ${totalDuplicates} duplicates and ${totalConflicts} conflicts.`;
      }
      setMessage(finalMsg);
    } catch (err: any) {
      setMessage(`Failed to upload files: ${err.message}`);
    } finally {
      setUploading(false);
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleStravaConnect = async () => {
    if (!isConfigured) {
      setMessage('Please configure Strava Client ID and Secret first.');
      return;
    }
    try {
      const res = await fetch('/api/auth/strava/url');
      const data = await res.json();
      
      if (data.error) {
        setMessage(`Error: ${data.error}`);
        return;
      }

      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      window.open(
        data.url,
        'strava_oauth',
        `width=${width},height=${height},top=${top},left=${left}`
      );
    } catch (err) {
      setMessage('Failed to initiate Strava connection.');
    }
  };

  // Listen for Strava OAuth success message
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'STRAVA_AUTH_SUCCESS') {
        const { code } = event.data;
        setSyncing(true);
        setMessage('Authenticating with Strava...');
        
        try {
          const exchangeRes = await fetch(`/api/auth/strava/exchange?code=${code}`);
          const exchangeData = await exchangeRes.json();
          
          if (exchangeData.success) {
            setMessage('Syncing activities from Strava...');
            const syncRes = await fetch('/api/sync-strava', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ token: exchangeData.token })
            });
            const syncData = await syncRes.json();
            
            if (syncData.success) {
              setMessage(`Successfully synced ${syncData.count} new activities from Strava.`);
            } else {
              setMessage(`Sync Error: ${syncData.error}`);
            }
          } else {
            setMessage(`Auth Error: ${exchangeData.error}`);
          }
        } catch (err) {
          setMessage('Failed to complete Strava sync.');
        } finally {
          setSyncing(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/login');
  };

  const handleMigrate = async () => {
    if (!window.confirm('This will translate all existing "早上/中午/下午/晚上" labels to English and recalculate them based on UTC+8. Continue?')) return;
    
    setMigrating(true);
    setMessage('Migrating existing activities...');
    try {
      const res = await fetch('/api/migrate-activities', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        let msg = `Successfully migrated ${data.count} activities.`;
        if (data.removed > 0) {
          msg += ` Removed ${data.removed} duplicate tracks.`;
        }
        setMessage(msg);
      } else {
        setMessage('Failed to migrate activities.');
      }
    } catch (err) {
      setMessage('Error during migration.');
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans p-4 md:p-6 lg:p-10">
      <div className="max-w-3xl mx-auto space-y-6 md:space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-neutral-200 gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/')}
              className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-neutral-900">Manage Data</h1>
              <p className="text-neutral-500 text-xs md:text-sm mt-1">Import and sync your activities</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors w-full sm:w-auto"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </header>

        {message && (
          <div className="p-4 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-medium border border-indigo-100">
            {message}
          </div>
        )}

        <div className="grid gap-6 md:gap-8 grid-cols-1 md:grid-cols-2">
          {/* TCX Upload Section */}
          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-neutral-200/60 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Upload className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-neutral-900">Import TCX File</h2>
            </div>
            <p className="text-sm text-neutral-500 mb-4">
              Upload a .tcx file from your Garmin or other GPS device to add activities manually.
            </p>
            <label className="flex items-center justify-center w-full h-32 md:h-40 px-4 transition bg-neutral-50 border-2 border-neutral-300 border-dashed rounded-xl appearance-none cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 focus:outline-none">
              <div className="flex flex-col items-center space-y-2">
                <Upload className="w-6 h-6 md:w-8 md:h-8 text-neutral-400" />
                <span className="font-medium text-neutral-600 text-center text-sm md:text-base">
                  {uploading ? 'Uploading...' : 'Drop TCX files here or click to browse'}
                </span>
              </div>
              <input type="file" accept=".tcx" multiple className="hidden" onChange={handleFileUpload} disabled={uploading || syncing} />
            </label>
          </div>

          {/* Strava Integration Section */}
          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-neutral-200/60 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-[#FC4C02]/10 text-[#FC4C02] rounded-lg">
                <LinkIcon className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-neutral-900">Strava Integration</h2>
            </div>
            <p className="text-sm text-neutral-500">
              Connect your Strava account to automatically sync your latest activities.
            </p>

            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Client ID</label>
                <input
                  type="text"
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-neutral-900"
                  placeholder="e.g. 12345"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Client Secret</label>
                <input
                  type="password"
                  value={clientSecret}
                  onChange={e => setClientSecret(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-neutral-900"
                  placeholder={isConfigured ? "•••••••• (Saved)" : "Your Strava Client Secret"}
                />
              </div>
              <button
                onClick={handleSaveConfig}
                disabled={savingConfig || !clientId}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {savingConfig ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>

            <button
              onClick={handleStravaConnect}
              disabled={uploading || syncing || !isConfigured}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#FC4C02] hover:bg-[#E34402] text-white rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              <LinkIcon className="w-5 h-5" />
              {syncing ? 'Syncing...' : 'Connect with Strava'}
            </button>
            {!isConfigured && (
              <p className="text-xs text-neutral-500 text-center">
                Please save your Strava configuration first.
              </p>
            )}
          </div>

          {/* Dashboard Customization Section */}
          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-neutral-200/60 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Save className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-neutral-900">Dashboard Customization</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Title</label>
                <input
                  type="text"
                  value={dashboardConfig.title}
                  onChange={e => setDashboardConfig({...dashboardConfig, title: e.target.value})}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-neutral-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Username</label>
                <input
                  type="text"
                  value={dashboardConfig.username}
                  onChange={e => setDashboardConfig({...dashboardConfig, username: e.target.value})}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-neutral-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">User Info</label>
                <input
                  type="text"
                  value={dashboardConfig.userInfo}
                  onChange={e => setDashboardConfig({...dashboardConfig, userInfo: e.target.value})}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-neutral-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">User Link (URL)</label>
                <input
                  type="text"
                  value={dashboardConfig.userLink}
                  onChange={e => setDashboardConfig({...dashboardConfig, userLink: e.target.value})}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-neutral-900"
                />
              </div>
              <button
                onClick={handleSaveDashboard}
                disabled={savingDashboard}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {savingDashboard ? 'Saving...' : 'Save Dashboard Config'}
              </button>
            </div>
          </div>
          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-neutral-200/60 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <Save className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-neutral-900">Maintenance</h2>
            </div>
            <p className="text-sm text-neutral-500 mb-4">
              Update existing data to use English labels and UTC+8 time calculation.
            </p>
            <button
              onClick={handleMigrate}
              disabled={migrating || uploading || syncing}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {migrating ? 'Migrating...' : 'Migrate Existing Data'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
