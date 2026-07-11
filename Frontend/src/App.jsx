import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutGrid, Map, ListTodo, Activity, UploadCloud, Cpu, Milestone, 
  RefreshCw, AlertTriangle, ShieldCheck, Thermometer, Zap, Gauge, 
  Sparkles, CheckCircle2, Info, ChevronRight, Download, Server, TrendingUp, Briefcase,
  Users, UserCheck, Bell, Send, Clock, MapPin, Shield, Phone, CheckCheck, XCircle, Plus, Edit3
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Leaflet marker styling fix: create a pulsing electric glow indicator for transformers
const createGlowingMarker = (riskLevel) => {
  let color = '#06d6a0'; // Low: Green
  let shadow = 'rgba(6, 214, 160, 0.5)';
  
  if (riskLevel === 'High') {
    color = '#ef476f'; // High: Red
    shadow = 'rgba(239, 71, 111, 0.6)';
  } else if (riskLevel === 'Medium') {
    color = '#ffd166'; // Medium: Yellow
    shadow = 'rgba(255, 209, 102, 0.5)';
  }

  return L.divIcon({
    html: `
      <div class="flex items-center justify-center w-8 h-8">
        <div class="absolute w-8 h-8 rounded-full pulse-slow" style="background-color: ${color}; opacity: 0.25;"></div>
        <div class="absolute w-6 h-6 rounded-full animate-ping" style="background-color: ${color}; opacity: 0.15; animation-duration: 2s;"></div>
        <div class="w-3.5 h-3.5 rounded-full border border-white shadow-lg" style="background-color: ${color}; box-shadow: 0 0 10px ${color}"></div>
      </div>
    `,
    className: 'custom-div-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

// Component to dynamically update map center
function MapController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 12, { animate: true });
    }
  }, [center, map]);
  return null;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [apiOnline, setApiOnline] = useState(false);
  const [metrics, setMetrics] = useState({
    accuracy: 0.89,
    precision: 0.79,
    recall: 0.91,
    total_monitored: 10,
    risk_distribution: { High: 3, Medium: 3, Low: 4 }
  });
  
  const [transformers, setTransformers] = useState([]);
  const [selectedTransformer, setSelectedTransformer] = useState(null);
  const [maintenanceQueue, setMaintenanceQueue] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [timelineData, setTimelineData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Manual Tester State
  const [testInputs, setTestInputs] = useState({
    transformer_id: 'TR-NEW',
    zone: 'Unknown',
    load: 85.0,
    temperature: 80.0,
    voltage: 215.0,
    current: 95.0,
    power: 18.5
  });
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  // Uploader State
  const [file, setFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [retrainLoadingProgress, setRetrainLoadingProgress] = useState(0);
  const [retrainedDashboardData, setRetrainedDashboardData] = useState(null); // tracks last retrained result
  const [liveTime, setLiveTime] = useState(new Date());

  // ── WORKFORCE MANAGEMENT STATE ──────────────────────────────────────────────
  const [workforceTab, setWorkforceTab] = useState('employees'); // employees | dispatch | notifications
  const [employees, setEmployees] = useState(() => {
    const saved = localStorage.getItem('gridtitan_employees');
    return saved ? JSON.parse(saved) : [
      { id: 'ADM-001', name: 'Rajesh Kumar',    role: 'Administrator', section: 'Control Room',      phone: '+91-9841001001', authorized: ['All Zones'], status: 'Online',  avatar: 'RK' },
      { id: 'ADM-002', name: 'Priya Nair',      role: 'Administrator', section: 'Grid Operations',   phone: '+91-9841002002', authorized: ['All Zones'], status: 'Online',  avatar: 'PN' },
      { id: 'WRK-101', name: 'Arun Selvam',     role: 'Field Engineer', section: 'Zone-A (Anna Nagar)',phone: '+91-9841003003', authorized: ['Zone-A','Zone-B'], status: 'On-Site', avatar: 'AS' },
      { id: 'WRK-102', name: 'Muthu Rajan',     role: 'Technician',    section: 'Zone-B (Porur)',    phone: '+91-9841004004', authorized: ['Zone-B'],        status: 'In Transit', avatar: 'MR' },
      { id: 'WRK-103', name: 'Divya Lakshmi',   role: 'Field Engineer', section: 'Zone-C (Ambattur)', phone: '+91-9841005005', authorized: ['Zone-C','Zone-D'], status: 'Available', avatar: 'DL' },
      { id: 'WRK-104', name: 'Senthil Arasu',   role: 'Technician',    section: 'Zone-D (Tambaram)', phone: '+91-9841006006', authorized: ['Zone-D'],        status: 'Available', avatar: 'SA' },
      { id: 'WRK-105', name: 'Kavitha Raman',   role: 'Supervisor',    section: 'Zone-E (Guindy)',   phone: '+91-9841007007', authorized: ['Zone-E','Zone-F'], status: 'Online',  avatar: 'KR' },
      { id: 'WRK-106', name: 'Bala Murugan',    role: 'Technician',    section: 'Zone-F (Velachery)', phone: '+91-9841008008', authorized: ['Zone-F'],       status: 'Off Duty', avatar: 'BM' },
    ];
  });
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('gridtitan_tasks');
    return saved ? JSON.parse(saved) : [
      { id: 'TSK-001', title: 'Inspect TR-1027 — High Risk Alert', assignedTo: 'WRK-101', assignedName: 'Arun Selvam',   zone: 'Zone-A', transformer: 'TR-1027', priority: 'Critical', scheduledAt: '09:00 AM', status: 'Reached',    authorizedBy: 'ADM-001', notes: 'Check oil temp & bushing insulation.' },
      { id: 'TSK-002', title: 'Voltage check TR-1019 — Medium Risk',assignedTo: 'WRK-102', assignedName: 'Muthu Rajan',  zone: 'Zone-B', transformer: 'TR-1019', priority: 'High',     scheduledAt: '10:30 AM', status: 'In Transit', authorizedBy: 'ADM-001', notes: 'Measure tap changer position.' },
      { id: 'TSK-003', title: 'Thermal scan Zone-C substation',      assignedTo: 'WRK-103', assignedName: 'Divya Lakshmi',zone: 'Zone-C', transformer: 'TR-1031', priority: 'Medium',   scheduledAt: '11:00 AM', status: 'Dispatched', authorizedBy: 'ADM-002', notes: 'Use IR camera. Report if >85°C.' },
      { id: 'TSK-004', title: 'Routine maintenance TR-1009',          assignedTo: 'WRK-104', assignedName: 'Senthil Arasu',zone: 'Zone-D', transformer: 'TR-1009', priority: 'Low',      scheduledAt: '02:00 PM', status: 'Scheduled',  authorizedBy: 'ADM-002', notes: 'Filter silica gel, clean terminals.' },
      { id: 'TSK-005', title: 'Emergency repair TR-1033 — Failure',   assignedTo: 'WRK-105', assignedName: 'Kavitha Raman',zone: 'Zone-E', transformer: 'TR-1033', priority: 'Critical', scheduledAt: '08:30 AM', status: 'Completed',  authorizedBy: 'ADM-001', notes: 'Replaced faulty relay. Restored supply.' },
    ];
  });
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('gridtitan_notifications');
    return saved ? JSON.parse(saved) : [
      { id: 'NTF-001', type: 'sent',     from: 'ADM-001', to: 'WRK-101', message: 'Dispatch authorized for TR-1027 inspection. Proceed immediately.', time: '08:45 AM', read: true  },
      { id: 'NTF-002', type: 'received', from: 'WRK-101', to: 'ADM-001', message: 'Reached TR-1027 site. Starting thermal inspection now.', time: '09:12 AM', read: true  },
      { id: 'NTF-003', type: 'sent',     from: 'ADM-001', to: 'WRK-102', message: 'Authorize voltage check TR-1019. ETA 30 mins. Report on arrival.', time: '09:55 AM', read: true  },
      { id: 'NTF-004', type: 'received', from: 'WRK-101', to: 'ADM-001', message: 'TR-1027 oil temp at 97°C. Bushing shows discoloration. Recommending shutdown.', time: '10:05 AM', read: false },
      { id: 'NTF-005', type: 'sent',     from: 'ADM-002', to: 'WRK-103', message: 'Thermal scan Zone-C approved. Use IR camera protocol #3.', time: '10:20 AM', read: true  },
      { id: 'NTF-006', type: 'received', from: 'WRK-102', to: 'ADM-001', message: 'In transit to TR-1019. ETA 15 minutes.', time: '10:38 AM', read: false },
      { id: 'NTF-007', type: 'system',   from: 'GRIDTITAN AI', to: 'ADM-001', message: '⚡ High Risk Alert: TR-1027 failure probability exceeded 85%. Immediate action required.', time: '08:30 AM', read: true },
      { id: 'NTF-008', type: 'system',   from: 'GRIDTITAN AI', to: 'ADM-002', message: '⚡ Medium Risk: TR-1031 thermal threshold approaching 78%. Schedule inspection.', time: '09:00 AM', read: true },
    ];
  });

  useEffect(() => {
    localStorage.setItem('gridtitan_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('gridtitan_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('gridtitan_notifications', JSON.stringify(notifications));
  }, [notifications]);

  const [newNotifText, setNewNotifText] = useState('');
  const [newNotifTo, setNewNotifTo]     = useState('WRK-101');

  // Chennai Center coordinate
  const chennaiCenter = [13.02, 80.22];

  // Manual tester presets
  const presets = [
    {
      name: 'Normal Operation',
      data: { transformer_id: 'TR-NORMAL', load: 45.0, temperature: 48.0, voltage: 231.0, current: 32.0, power: 7.2 }
    },
    {
      name: 'Thermal Overload',
      data: { transformer_id: 'TR-THERMAL', load: 105.0, temperature: 98.5, voltage: 202.0, current: 135.0, power: 26.0 }
    },
    {
      name: 'Voltage Drop',
      data: { transformer_id: 'TR-VOLTAGE', load: 88.0, temperature: 72.0, voltage: 190.5, current: 105.0, power: 18.0 }
    }
  ];

  // Real-time clock — ticks every second
  useEffect(() => {
    const tick = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  // Live Data Polling: Refresh dashboard metrics and transformer data every 3 seconds
  useEffect(() => {
    const poller = setInterval(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 3000);
    return () => clearInterval(poller);
  }, []);

  // 1. Check API Health and load initial data
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          setApiOnline(true);
        } else {
          setApiOnline(false);
        }
      } catch (err) {
        setApiOnline(false);
      }
    };
    checkHealth();
  }, [refreshTrigger]);

  // 2. Fetch main metrics, transformers, queue and alerts
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (apiOnline) {
        try {
          // Fetch metrics
          const metricsRes = await fetch('/api/metrics');
          const metricsData = await metricsRes.json();
          setMetrics(metricsData);

          // Fetch transformers
          const transRes = await fetch('/api/transformers');
          const transData = await transRes.json();
          setTransformers(transData);
          if (transData.length > 0) {
            if (!selectedTransformer) {
              // First load: pick the first transformer
              setSelectedTransformer(transData[0]);
            } else {
              // Subsequent polls: find the currently-selected transformer by ID
              // and refresh its telemetry values so the Digital Twin stays live
              const refreshed = transData.find(tr => tr.transformer_id === selectedTransformer.transformer_id);
              if (refreshed) {
                setSelectedTransformer(refreshed);
              }
            }
          }

          // Fetch maintenance queue
          const queueRes = await fetch('/api/maintenance-queue');
          const queueData = await queueRes.json();
          setMaintenanceQueue(queueData);

          // Fetch alerts
          const alertsRes = await fetch('/api/alerts');
          const alertsData = await alertsRes.json();
          setAlerts(alertsData);
        } catch (error) {
          console.error("Error fetching data from API:", error);
          await loadMockData();
        }
      } else {
        // Fallback to mock data for instant demo
        await loadMockData();
      }
      setLoading(false);
    };

    fetchData();
  }, [apiOnline, refreshTrigger, retrainedDashboardData]);

  // 3. Fetch Selected Transformer Timeline data
  const generateMockTimeline = (baseScore) => {
    const trend = [];
    for (let day = 1; day <= 7; day++) {
      const factor = Math.pow(day / 7.0, 1.5);
      const val = Math.min(99.9, Math.max(5.0, Math.round(baseScore * factor * 10) / 10));
      trend.push({ day: `Day ${day}`, probability: val });
    }
    setTimelineData(trend);
  };

  useEffect(() => {
    if (!selectedTransformer) return;

    // If this transformer has a pre-built timeline (from retrained data), use it immediately
    if (selectedTransformer._timeline && selectedTransformer._timeline.length > 0) {
      setTimelineData(selectedTransformer._timeline);
      return;
    }
    
    const fetchTimeline = async () => {
      if (apiOnline && selectedTransformer.transformer_id) {
        try {
          const res = await fetch(`/api/timeline/${selectedTransformer.transformer_id}`);
          const data = await res.json();
          // API returns either an array directly or { timeline: [...] }
          const timelineArr = Array.isArray(data) ? data : (data.timeline || []);
          if (timelineArr.length > 0) {
            setTimelineData(timelineArr);
          } else {
            generateMockTimeline(selectedTransformer.risk_score ?? 50);
          }
        } catch (error) {
          generateMockTimeline(selectedTransformer.risk_score ?? 50);
        }
      } else {
        generateMockTimeline(selectedTransformer.risk_score ?? 50);
      }
    };
    
    fetchTimeline();
  }, [selectedTransformer?.transformer_id, apiOnline]);

  // Load All 200 Transformers - works both online (backend) and offline (bundled JSON)
  const loadMockData = async () => {
    try {
      // Load all 200 transformers from the bundled public JSON file
      const res = await fetch('/chennai_200_transformers.json');
      if (!res.ok) throw new Error('JSON not found');
      const rawData = await res.json();

      // Enrich each transformer with risk prediction fields
      const enrichedData = rawData.map((t) => {
        // Normalize inputs to 0-100 range, then compute weighted risk score
        const loadNorm    = Math.min(100, (t.load / 120) * 100);
        const tempNorm    = Math.min(100, ((t.temperature - 20) / 100) * 100);
        const voltDev     = Math.min(100, (Math.abs(230 - t.voltage) / 40) * 100);
        const currNorm    = Math.min(100, (t.current / 150) * 100);
        const noise       = (Math.random() * 12) - 3; // -3 to +9 jitter
        const rawScore    = (loadNorm * 0.30) + (tempNorm * 0.35) + (voltDev * 0.20) + (currNorm * 0.15) + noise;
        const score       = Math.min(99.9, Math.max(5.0, rawScore));
        // Thresholds: High >=70, Medium >=42, Low <42  -> gives ~30 High, ~80 Medium, ~90 Low
        const risk_level  = score >= 70 ? "High" : score >= 42 ? "Medium" : "Low";
        return {
          ...t,
          transformer_id: t.id,
          risk_score: Math.round(score * 10) / 10,
          risk_level,
          explainability: {
            "Temperature Stress": Math.round(tempNorm * 0.35),
            "Load Stress":        Math.round(loadNorm * 0.30),
            "Voltage Deviation":  Math.round(voltDev  * 0.20),
            "Current Stress":     Math.round(currNorm * 0.15)
          },
          recommendation: risk_level === "High"
            ? "PRIORITY MAINTENANCE: Immediate inspection required. Activate cooling systems."
            : risk_level === "Medium"
            ? "Routine maintenance recommended. Monitor closely."
            : "Normal operations. Standard telemetry monitoring."
        };
      });

      setTransformers(enrichedData);
      if (enrichedData.length > 0) setSelectedTransformer(enrichedData[0]);

      const highCount = enrichedData.filter(t => t.risk_level === "High").length;
      const medCount  = enrichedData.filter(t => t.risk_level === "Medium").length;
      const lowCount  = enrichedData.filter(t => t.risk_level === "Low").length;

      setMetrics({
        accuracy: 0.94, precision: 0.88, recall: 0.92,
        total_monitored: enrichedData.length,
        risk_distribution: { High: highCount, Medium: medCount, Low: lowCount }
      });

      const sortedQueue = [...enrichedData]
        .sort((a, b) => b.risk_score - a.risk_score)
        .map((t, i) => ({
          ...t,
          rank: i + 1,
          zone: t.zone || "Chennai",
          probable_root_cause: t.risk_level === "High" ? "Thermal Overload" : "Normal Operations",
          priority: t.risk_level === "High" ? "Critical" : t.risk_level === "Medium" ? "Medium" : "Low",
          recommended_action: t.recommendation,
          inspection_window: t.risk_level === "High" ? "Immediate (0-24 Hrs)" : t.risk_level === "Medium" ? "Within 14 Days" : "Next Scheduled Cycle"
        }));
      setMaintenanceQueue(sortedQueue);

      const highRisk = enrichedData.filter(t => t.risk_level === "High").slice(0, 10);
      setAlerts(highRisk.map((t, i) => ({
        id: i + 1,
        transformer_id: t.transformer_id,
        type: t.risk_score >= 85 ? "Critical" : "Warning",
        message: `${t.transformer_id} - Risk score ${t.risk_score}% detected`,
        details: `Temp: ${t.temperature}°C, Load: ${t.load}%, Voltage: ${t.voltage}V`,
        timestamp: `${i * 3 + 1} mins ago`
      })));

    } catch (err) {
      console.error("Failed to load 200-transformer JSON, using minimal fallback:", err);
      // Absolute last resort - tiny 3-item fallback so UI doesn't crash
      const minimal = [
        { transformer_id:"TR-1021", name:"Adyar-A", lat:13.006, lng:80.257, load:65, temperature:55, voltage:230, current:45, power:10.1, risk_score:12.8, risk_level:"Low", zone:"Adyar", explainability:{"Load Stress":30}, recommendation:"Normal operations." },
        { transformer_id:"TR-1022", name:"T-Nagar Hub", lat:13.041, lng:80.233, load:92, temperature:95, voltage:210, current:120, power:25.3, risk_score:84.6, risk_level:"High", zone:"T-Nagar", explainability:{"Temperature Stress":45}, recommendation:"Immediate maintenance required." },
        { transformer_id:"TR-1023", name:"Nungambakkam", lat:13.056, lng:80.242, load:110, temperature:105, voltage:198, current:145, power:28.8, risk_score:94.8, risk_level:"High", zone:"Nungambakkam", explainability:{"Load Stress":40}, recommendation:"Critical overload." }
      ];
      setTransformers(minimal);
      setSelectedTransformer(minimal[0]);
    }
  };

  // 3-second live update when running offline (no backend)
  useEffect(() => {
    if (apiOnline) return; // backend handles updates when online
    if (transformers.length === 0) return;
    const interval = setInterval(() => {
      setTransformers(prev => prev.map(t => {
        const newLoad = Math.max(10, Math.min(120, (t.load || 50) + (Math.random() * 3 - 1.5)));
        const newTemp = Math.max(20, Math.min(120, (t.temperature || 60) + (Math.random() * 2 - 1.0)));
        const newVolt = Math.max(190, Math.min(250, (t.voltage || 220) + (Math.random() * 3 - 1.5)));
        const newCurr = Math.max(10, Math.min(150, (t.current || 60) + (Math.random() * 3 - 1.5)));
        const newPower = Math.round((newVolt * newCurr * 0.9) / 100) / 10;
        const newScore = Math.min(99.9, Math.max(5.0,
          ((Math.min(100,(newLoad/120)*100)) * 0.30) +
          ((Math.min(100,((newTemp-20)/100)*100)) * 0.35) +
          ((Math.min(100,(Math.abs(230-newVolt)/40)*100)) * 0.20) +
          ((Math.min(100,(newCurr/150)*100)) * 0.15)
        ));
        const newLevel = newScore >= 70 ? "High" : newScore >= 42 ? "Medium" : "Low";
        return { ...t, load: Math.round(newLoad*10)/10, temperature: Math.round(newTemp*10)/10,
          voltage: Math.round(newVolt*10)/10, current: Math.round(newCurr*10)/10, power: newPower,
          risk_score: Math.round(newScore*10)/10, risk_level: newLevel,
          last_updated: new Date().toISOString().slice(0, 19) + ' UTC' };
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, [apiOnline, transformers.length]);

  const handleDispatchEngineer = (transformer) => {
    if (!transformer) return;
    
    const transId = transformer.transformer_id || transformer.id;
    
    // Check if task already exists for this transformer
    const existing = tasks.find(t => t.transformer === transId && t.status !== 'Completed');
    if (existing) {
      alert(`Task ${existing.id} is already active for ${transId}.`);
      return;
    }
    
    // Find first available field worker/technician
    const availableWorker = employees.find(e => e.status === 'Available' && e.role !== 'Administrator');
    if (!availableWorker) {
      alert("All field engineers are currently busy. Please wait until a task is completed.");
      return;
    }
    
    const taskId = `TSK-${Date.now().toString().slice(-3)}`;
    const recText = typeof transformer.recommendation === 'object' ? transformer.recommendation.text : transformer.recommendation;
    
    const newTask = {
      id: taskId,
      title: `Emergency inspection of ${transId}`,
      assignedTo: availableWorker.id,
      assignedName: availableWorker.name,
      zone: transformer.zone || 'Unknown',
      transformer: transId,
      priority: transformer.risk_level === 'High' ? 'Critical' : 'High',
      scheduledAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'Dispatched',
      authorizedBy: 'ADM-001',
      notes: recText || "Perform SCADA validation check."
    };
    
    // Add task
    setTasks(prev => [newTask, ...prev]);
    
    // Update worker status to Online
    setEmployees(prev => prev.map(e => e.id === availableWorker.id ? { ...e, status: 'Online' } : e));
    
    // Add notification
    const newNotif = {
      id: `NTF-${Date.now()}`,
      type: 'sent',
      from: 'ADM-001',
      to: availableWorker.id,
      message: `Emergency dispatch authorized for ${transId}. Please proceed immediately. Notes: ${recText || 'Perform SCADA check.'}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
      read: true
    };
    setNotifications(prev => [newNotif, ...prev]);
    
    alert(`Successfully dispatched ${availableWorker.name} to Substation ${transId}!`);
  };

  // 4. Handle Manual Tester Prediction Submission
  const handleTestPredict = async (e) => {
    e.preventDefault();
    setTestLoading(true);
    if (apiOnline) {
      try {
        const res = await fetch('/api/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testInputs)
        });
        if (res.ok) {
          const data = await res.json();
          setTestResult(data);
        } else {
          setTestResult(mockOfflinePredict(testInputs));
        }
      } catch (err) {
        setTestResult(mockOfflinePredict(testInputs));
      }
    } else {
      // Offline prediction logic
      setTimeout(() => {
        setTestResult(mockOfflinePredict(testInputs));
      }, 500);
    }
    setTestLoading(false);
  };

  const mockOfflinePredict = (inputs) => {
    // physical formulas inside javascript to represent model.py rules when offline
    const load = Number(inputs.load || 50);
    const temp = Number(inputs.temperature || 50);
    const volt = Number(inputs.voltage || 230);
    const curr = Number(inputs.current || 40);
    
    // simple heuristic model for offline
    const t_stress = Math.max(0.0, (temp - 50.0) / 50.0);
    const l_stress = Math.max(0.0, (load - 60.0) / 50.0);
    const v_dev = Math.abs(volt - 230.0) / 230.0 * 10.0;
    const c_stress = curr > 80 ? (curr - 80) / 80 : (curr / 80) * 0.2;
    
    const sum = t_stress + l_stress + v_dev + c_stress;
    const prob = Math.min(0.999, Math.max(0.05, sum / 3.0));
    const score = Math.round(prob * 1000) / 10;
    
    let level = "Low";
    if (score >= 70) level = "High";
    else if (score >= 30) level = "Medium";

    // Explainability
    let t_pct = 25, l_pct = 25, v_pct = 25, c_pct = 25;
    if (sum > 0) {
      t_pct = Math.round((t_stress / sum) * 100);
      l_pct = Math.round((l_stress / sum) * 100);
      v_pct = Math.round((v_dev / sum) * 100);
      c_pct = 100 - (t_pct + l_pct + v_pct);
    }

    // Recommendation
    let rec = "Normal operations. Standard continuous telemetry monitoring.";
    if (level === "Medium") {
      rec = "Routine Maintenance recommended. Check cooling fins and oil levels.";
    } else if (level === "High") {
      rec = "PRIORITY MAINTENANCE REQUIRED: Plan load shedding and perform a dissolved gas analysis (DGA) immediately.";
    }

    return {
      transformer_id: inputs.transformer_id,
      risk_score: score,
      risk_level: level,
      explainability: {
        "Temperature Stress": t_pct,
        "Load Stress": l_pct,
        "Voltage Deviation": v_pct,
        "Current Stress": c_pct
      },
      recommendation: rec,
      imputed_values: inputs
    };
  };

  const applyPreset = (preset) => {
    setTestInputs(preset.data);
    setTestResult(null);
  };

  // 5. Handle File Upload
  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);
    setUploadError(null);
    setUploadResult(null);
  };

  const submitFile = async () => {
    if (!file) return;
    setUploadLoading(true);
    setUploadProgress(0);
    setUploadError(null);

    // Simulate progress count
    const interval = setInterval(() => {
      setUploadProgress((old) => {
        if (old >= 95) {
          clearInterval(interval);
          return 95;
        }
        return old + Math.floor(Math.random() * 15) + 5;
      });
    }, 150);
    
    if (apiOnline) {
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const res = await fetch('/api/upload-dataset', {
          method: 'POST',
          body: formData
        });
        
        clearInterval(interval);
        setUploadProgress(100);
        if (res.ok) {
          const data = await res.json();
          setUploadResult(data);
          // Trigger global update to refresh models in lists
          setRefreshTrigger(prev => prev + 1);
        } else {
          const errData = await res.json();
          setUploadError(errData.detail || "Failed to parse CSV dataset file.");
        }
      } catch (err) {
        clearInterval(interval);
        setUploadError("Error uploading file to server. Make sure backend is running.");
      }
    } else {
      // Mock File Upload (Demo mode)
      setTimeout(() => {
        clearInterval(interval);
        setUploadProgress(100);
        mockOfflineUpload();
      }, 1500);
    }
    setTimeout(() => {
      setUploadLoading(false);
    }, 400);
  };

  const mockOfflineUpload = () => {
    // Generate clean mock upload response
    const mockReport = [
      { transformer_id: "TR-2001", load: 108.5, temperature: 102.4, voltage: 195.4, current: 140.2, power: 27.2, risk_score: 96.2, risk_level: "High" },
      { transformer_id: "TR-2002", load: 95.2, temperature: 94.1, voltage: 205.1, current: 122.5, power: 24.8, risk_score: 85.4, risk_level: "High" },
      { transformer_id: "TR-2003", load: 88.4, temperature: 86.2, voltage: 212.5, current: 112.4, power: 22.5, risk_score: 74.2, risk_level: "High" },
      { transformer_id: "TR-2004", load: 74.5, temperature: 68.2, voltage: 224.2, current: 68.4, power: 15.2, risk_score: 34.2, risk_level: "Medium" },
      { transformer_id: "TR-2005", load: 52.4, temperature: 50.1, voltage: 230.1, current: 38.5, power: 8.8, risk_score: 15.6, risk_level: "Low" }
    ];

    setUploadResult({
      message: "Dataset uploaded successfully [LOCAL DEMO MODE]",
      total_records: 40,
      missing_value_summary: {
        "load": { count: 2, pct: 5.0 },
        "temperature": { count: 3, pct: 7.5 },
        "voltage": { count: 1, pct: 2.5 },
        "current": { count: 1, pct: 2.5 },
        "power": { count: 2, pct: 5.0 }
      },
      class_distribution: {
        "Normal (0)": 28,
        "Failure (1)": 12
      },
      preview_data: [
        { transformer_id: "TR-2001", load: 108.5, temperature: 102.4, voltage: 195.4, current: 140.2, power: 27.2, failure: 1 },
        { transformer_id: "TR-2002", load: 95.2, temperature: 94.1, voltage: 205.1, current: 122.5, power: 24.8, failure: 1 },
        { transformer_id: "TR-2003", load: 88.4, temperature: 86.2, voltage: 212.5, current: 112.4, power: 22.5, failure: 0 },
        { transformer_id: "TR-2004", load: null, temperature: 68.2, voltage: 224.2, current: 68.4, power: 15.2, failure: 0 },
        { transformer_id: "TR-2005", load: 52.4, temperature: null, voltage: 230.1, current: 38.5, power: 8.8, failure: 0 }
      ],
      risk_ranked_report: mockReport
    });
  };

  // Quick refresh data
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="flex min-h-screen bg-gridDark-bg text-gridDark-text grid-bg font-sans" style={{minWidth: 0}}>
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="gridtitan-sidebar w-64 min-w-[64px] border-r border-gridDark-border bg-gridDark-card flex flex-col justify-between select-none z-10 transition-all duration-200">
        <div>
          {/* Logo Brand */}
          <div className="p-4 lg:p-6 border-b border-gridDark-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-electric-blue/10 flex items-center justify-center border border-electric-blue/30 shadow-glow">
              <Zap className="w-6 h-6 text-electric-blue fill-electric-blue/20" />
            </div>
            <div className="sidebar-logo-text">
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg leading-tight tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-electric-blue via-white to-electric-blue">
                  GRIDTITAN
                </h1>
                <span className="px-2 py-0.5 rounded-full border border-risk-low/30 bg-risk-low/10 text-risk-low text-[8px] font-bold uppercase tracking-widest animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-risk-low"></span> Live
                </span>
              </div>
              <p className="text-[10px] text-gridDark-textMuted font-mono">RISK INTEL PLATFORM</p>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="p-4 space-y-1">
            {[
              { id: 'dashboard', name: 'Dashboard', icon: LayoutGrid },
              { id: 'map', name: 'Chennai Heatmap', icon: Map },
              { id: 'queue', name: 'Priority Queue', icon: ListTodo },
              { id: 'tester', name: 'Risk Tester', icon: Activity },
              { id: 'upload', name: 'Upload Dataset', icon: UploadCloud },
              { id: 'performance', name: 'Model Performance', icon: TrendingUp },
              { id: 'architecture', name: 'AI Pipeline', icon: Cpu },
              { id: 'impact', name: 'Business Impact', icon: Briefcase },
              { id: 'workforce', name: 'Workforce Ops', icon: Users },
              { id: 'roadmap', name: 'Deployment Road', icon: Milestone },
            ].map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 lg:px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    active 
                      ? 'bg-electric-blue/10 text-electric-blue border-l-2 border-electric-blue shadow-glow' 
                      : 'text-gridDark-textMuted hover:text-white hover:bg-gridDark-cardLight'
                  }`}
                  title={item.name}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-electric-blue' : 'text-gridDark-textMuted'}`} />
                  <span className="sidebar-label truncate">{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Server Status Indicators */}
        <div className="p-3 lg:p-4 border-t border-gridDark-border bg-gridDark-card/50">
          <div className="flex items-center justify-between p-2 lg:p-3 rounded-lg bg-gridDark-bg/60 border border-gridDark-border">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-gridDark-textMuted flex-shrink-0" />
              <span className="sidebar-label text-xs text-gridDark-textMuted">AI Engine</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${apiOnline ? 'bg-risk-low animate-pulse shadow-glowGreen' : 'bg-risk-high animate-pulse shadow-glowRed'}`}></span>
              <span className="sidebar-label text-[11px] font-mono uppercase tracking-wider font-semibold">
                {apiOnline ? 'ONLINE' : 'DEMO'}
              </span>
            </div>
          </div>
          <p className="sidebar-footer-text text-[10px] text-center mt-3 text-gridDark-textMuted">
            v1.0.0 &copy; 2026 GridTitan
          </p>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="gridtitan-main flex-1 flex flex-col min-h-screen overflow-x-hidden min-w-0">
        
        {/* HEADER */}
        <header className="gridtitan-header h-16 lg:h-20 border-b border-gridDark-border bg-gridDark-card/90 backdrop-blur-md px-4 lg:px-8 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg lg:text-2xl font-bold tracking-tight text-white flex items-center gap-2 truncate">
              {activeTab === 'dashboard' && 'Risk Intelligence Dashboard'}
              {activeTab === 'map' && 'Chennai Transformer Heatmap'}
              {activeTab === 'queue' && 'Maintenance Priority Queue'}
              {activeTab === 'tester' && 'Manual Transformer Risk Tester'}
              {activeTab === 'upload' && 'Upload Transformer Dataset'}
              {activeTab === 'architecture' && 'AI Model Pipeline'}
              {activeTab === 'roadmap' && 'SCADA & IoT Deployment Roadmap'}
              {activeTab === 'workforce' && 'Workforce Operations Centre'}
            </h2>
            <p className="text-xs text-gridDark-textMuted">
              AI-Powered Transformer Risk Intelligence Platform
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Live Real-Time Clock Widget */}
            <div className="hidden md:flex flex-col items-end border-r border-gridDark-border pr-4 font-mono">
              <span className="text-[10px] font-bold text-gridDark-textMuted uppercase tracking-widest">GRID TIME</span>
              <span className="text-sm font-extrabold text-electric-blue tabular-nums tracking-wide">
                {liveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </span>
              <span className="text-[10px] text-gridDark-textMuted">
                {liveTime.toLocaleDateString([], { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
            </div>
            {/* Refresh Button */}
            <button 
              onClick={handleRefresh}
              className="p-2 rounded-lg bg-gridDark-cardLight border border-gridDark-border hover:border-electric-blue transition-colors text-gridDark-textMuted hover:text-white"
              title="Refresh Data Source"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-electric-blue' : ''}`} />
            </button>
          </div>
        </header>

        {/* PAGE BODY */}
        <div className="flex-1 p-4 lg:p-8 overflow-y-auto overflow-x-hidden">
          
          {/* 1. LANDING DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-fadeIn">

              {/* RETRAINED MODEL ACTIVE BANNER */}
              {retrainedDashboardData && (
                <div className="flex items-center justify-between gap-4 bg-gradient-to-r from-risk-low/10 via-electric-blue/10 to-risk-low/10 border border-risk-low/40 rounded-xl px-5 py-3 animate-fadeIn shadow-md">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-risk-low opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-risk-low"></span>
                    </span>
                    <div>
                      <span className="text-xs font-extrabold text-risk-low font-mono tracking-widest uppercase">⚡ Retrained Model Active</span>
                      <span className="ml-3 text-[11px] text-gridDark-textMuted font-mono">
                        {retrainedDashboardData.records} records · Accuracy {retrainedDashboardData.accuracy}% · Updated at {retrainedDashboardData.timestamp}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setRetrainedDashboardData(null)}
                    className="text-gridDark-textMuted hover:text-white text-xs font-mono transition-colors px-2 py-0.5 rounded border border-gridDark-border hover:border-gridDark-textMuted"
                  >
                    DISMISS
                  </button>
                </div>
              )}
              
              {/* KPI CARD GRID */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-gridDark-card border border-gridDark-border p-4 rounded-xl relative overflow-hidden group hover:border-electric-blue/50 transition-all shadow-glow col-span-1">
                  <p className="text-xs font-mono font-bold tracking-widest text-gridDark-textMuted uppercase mb-1">Total Assets</p>
                  <p className="text-3xl font-extrabold text-white font-sans">{metrics.total_monitored}</p>
                </div>
                <div className="bg-gridDark-card border border-gridDark-border p-4 rounded-xl relative overflow-hidden group hover:border-risk-high/40 transition-all shadow-neon-red col-span-1">
                  <p className="text-xs font-mono font-bold tracking-widest text-gridDark-textMuted uppercase mb-1">High Risk</p>
                  <p className="text-3xl font-extrabold text-risk-high font-sans">{metrics.risk_distribution.High}</p>
                </div>
                <div className="bg-gridDark-card border border-gridDark-border p-4 rounded-xl relative overflow-hidden group hover:border-risk-medium/40 transition-all col-span-1">
                  <p className="text-xs font-mono font-bold tracking-widest text-gridDark-textMuted uppercase mb-1">Medium Risk</p>
                  <p className="text-3xl font-extrabold text-risk-medium font-sans">{metrics.risk_distribution.Medium}</p>
                </div>
                <div className="bg-gridDark-card border border-gridDark-border p-4 rounded-xl relative overflow-hidden group hover:border-risk-low/40 transition-all col-span-1">
                  <p className="text-xs font-mono font-bold tracking-widest text-gridDark-textMuted uppercase mb-1">Low Risk</p>
                  <p className="text-3xl font-extrabold text-risk-low font-sans">{metrics.risk_distribution.Low}</p>
                </div>
                <div className="bg-gridDark-card border border-gridDark-border p-4 rounded-xl relative overflow-hidden group hover:border-purple-500/50 transition-all col-span-1">
                  <p className="text-xs font-mono font-bold tracking-widest text-gridDark-textMuted uppercase mb-1">Avg Risk Score</p>
                  <p className="text-3xl font-extrabold text-white font-sans">
                    {transformers.length > 0 ? Math.round(transformers.reduce((acc, t) => acc + t.risk_score, 0) / transformers.length) : 0}%
                  </p>
                </div>
                <div className="bg-gridDark-card border border-gridDark-border p-4 rounded-xl relative overflow-hidden group hover:border-electric-blue/50 transition-all shadow-glow col-span-1">
                  <p className="text-xs font-mono font-bold tracking-widest text-gridDark-textMuted uppercase mb-1">Model Recall</p>
                  <p className="text-3xl font-extrabold text-electric-blue font-sans">{Math.round(metrics.recall * 100)}%</p>
                </div>
              </div>

              {/* PRIMARY CHARTS & PANELS GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* 7-DAY TIMELINE CHART CARD */}
                <div className="bg-gridDark-card border border-gridDark-border p-6 rounded-xl lg:col-span-2 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Activity className="w-5 h-5 text-electric-blue" />
                        Failure Probability Forecast
                      </h3>
                      <p className="text-xs text-gridDark-textMuted">
                        7-day predicted failure probability timeline for <span className="text-electric-blue font-mono font-bold">{selectedTransformer?.transformer_id || 'TR-1022'}</span>
                      </p>
                    </div>
                    {/* Transformer Selector dropdown */}
                    <select
                      value={selectedTransformer?.transformer_id || ''}
                      onChange={(e) => {
                        const t = transformers.find(tr => tr.transformer_id === e.target.value);
                        if (t) setSelectedTransformer(t);
                      }}
                      className="bg-gridDark-cardLight border border-gridDark-border rounded-lg text-xs p-2 text-white font-mono focus:border-electric-blue focus:outline-none"
                    >
                      {transformers.map(t => (
                        <option key={t.transformer_id} value={t.transformer_id}>{t.transformer_id} ({t.name})</option>
                      ))}
                    </select>
                  </div>

                  <div className="h-64 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timelineData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                        <XAxis dataKey="day" stroke="#9ca3af" fontSize={11} fontStyle="mono" />
                        <YAxis domain={[0, 100]} stroke="#9ca3af" fontSize={11} unit="%" />
                        <Tooltip 
                          contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                          labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                        />
                        <ReferenceLine 
                          y={70} 
                          stroke="#ef476f" 
                          strokeDasharray="4 4" 
                          label={{ value: 'Critical Threshold (70%)', fill: '#ef476f', position: 'insideBottomRight', fontSize: 10, fontWeight: 'bold' }} 
                        />
                        <Line 
                          type="monotone" 
                          dataKey="probability" 
                          stroke="#00b4d8" 
                          strokeWidth={3} 
                          dot={{ fill: '#00b4d8', r: 4 }} 
                          activeDot={{ r: 7, strokeWidth: 0 }}
                          name="Failure Probability"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  {timelineData.length > 0 && timelineData[timelineData.length - 1].probability >= 70 && (
                    <div className="mt-4 p-3 rounded-lg bg-risk-high/15 border border-risk-high/30 flex items-center gap-3 animate-pulse">
                      <AlertTriangle className="w-5 h-5 text-risk-high shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-risk-high">CRITICAL THRESHOLD CROSSED</p>
                        <p className="text-[11px] text-gridDark-textMuted">The 7-day failure forecast has breached the 70% high-risk threshold. Immediate preventive action is recommended.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* ROOT CAUSE EXPLAINABILITY PANEL */}
                <div className="bg-gridDark-card border border-gridDark-border p-6 rounded-xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                      <Cpu className="w-5 h-5 text-electric-blue" />
                      Root Cause Explainability
                    </h3>
                    <p className="text-xs text-gridDark-textMuted mb-6">
                      Telemetry risk stress drivers for <span className="text-electric-blue font-mono font-bold">{selectedTransformer?.transformer_id}</span>
                    </p>

                    {selectedTransformer && selectedTransformer.explainability ? (
                      <div className="space-y-5">
                        {Object.entries(selectedTransformer.explainability).map(([cause, percentage]) => {
                          let colorClass = "bg-electric-blue";
                          if (cause === "Temperature Stress") colorClass = "bg-risk-high";
                          else if (cause === "Load Stress") colorClass = "bg-risk-medium";
                          else if (cause === "Voltage Deviation") colorClass = "bg-electric-blue";
                          else if (cause === "Current Stress") colorClass = "bg-purple-500";
                          
                          return (
                            <div key={cause} className="space-y-1.5">
                              <div className="flex justify-between text-xs">
                                <span className="text-white font-medium">{cause}</span>
                                <span className="text-gridDark-textMuted font-mono font-bold">{percentage}%</span>
                              </div>
                              <div className="h-2.5 w-full bg-gridDark-cardLight rounded-full overflow-hidden border border-gridDark-border">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${colorClass}`} 
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-48 border border-dashed border-gridDark-border rounded-lg text-gridDark-textMuted p-4 text-center">
                        <Info className="w-8 h-8 mb-2 text-electric-blue/50" />
                        <p className="text-xs">Select a high/medium risk transformer to view root cause analysis.</p>
                      </div>
                    )}
                  </div>
                  
                  {selectedTransformer && selectedTransformer.explainability && (
                    <div className="mt-6 pt-4 border-t border-gridDark-border space-y-3">
                      <div className="bg-gridDark-cardLight/30 p-3 rounded-lg border border-gridDark-border">
                        <p className="text-xs font-bold text-white uppercase tracking-wider mb-1 font-mono">Root Cause Summary</p>
                        <p className="text-[11px] text-gridDark-textMuted leading-relaxed">
                          Transformer {selectedTransformer.transformer_id} is {selectedTransformer.risk_level.toLowerCase()} risk mainly due to {
                            Object.entries(selectedTransformer.explainability)
                              .sort(([,a], [,b]) => b - a)
                              .slice(0, 2)
                              .map(([k]) => k.toLowerCase())
                              .join(" and ")
                          }. {selectedTransformer.risk_level === 'High' ? 'Immediate inspection is recommended.' : 'Routine check is advised.'}
                        </p>
                      </div>
                      <div className="bg-gridDark-cardLight/30 p-3 rounded-lg border border-gridDark-border">
                        <p className="text-xs font-bold text-white uppercase tracking-wider mb-1 font-mono">AI Recommendation</p>
                        <p className="text-[11px] text-gridDark-textMuted leading-relaxed">
                          {typeof selectedTransformer.recommendation === 'object' ? selectedTransformer.recommendation.text : selectedTransformer.recommendation}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* REAL-TIME ALERTS FEED & TOP 5 PRIORITY ITEMS */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Real-time style Alert Feed */}
                <div className="bg-gridDark-card border border-gridDark-border p-6 rounded-xl lg:col-span-1 flex flex-col">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-5 h-5 text-risk-medium" />
                    Smart Alert Feed
                  </h3>
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-xs text-gridDark-textMuted">
                      Live risk threshold breach notices
                    </p>
                    {/* Minimal filter ui placeholder */}
                    <div className="flex gap-2">
                       <span className="w-2 h-2 rounded-full bg-risk-high mt-1 shadow-neon-red animate-pulse"></span>
                       <span className="w-2 h-2 rounded-full bg-risk-medium mt-1 animate-pulse"></span>
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-4 max-h-[300px] overflow-y-auto pr-1">
                    {alerts.map((alert) => (
                      <div 
                        key={alert.id} 
                        className={`p-3.5 rounded-lg border text-xs relative overflow-hidden transition-all hover:scale-[1.01] ${
                          alert.type === 'Critical' 
                            ? 'bg-risk-high/5 border-risk-high/20 shadow-neon-red' 
                            : alert.type === 'Warning'
                              ? 'bg-risk-medium/5 border-risk-medium/20'
                              : 'bg-risk-low/5 border-gridDark-border'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1.5">
                          <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold uppercase tracking-wider ${
                            alert.type === 'Critical' ? 'bg-risk-high/20 text-risk-high' : alert.type === 'Warning' ? 'bg-risk-medium/20 text-risk-medium' : 'bg-risk-low/10 text-risk-low'
                          }`}>
                            {alert.type === 'Critical' ? '🔴 Critical' : alert.type === 'Warning' ? '🟡 Warning' : '🟢 Normal'}
                          </span>
                          <span className="text-[10px] text-gridDark-textMuted font-mono">{alert.timestamp}</span>
                        </div>
                        <h4 className="font-bold text-white text-[12px] mb-1">{alert.message}</h4>
                        <p className="text-gridDark-textMuted text-[11px]">{alert.details}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top 5 High Risk Transformers mini-table */}
                <div className="bg-gridDark-card border border-gridDark-border p-6 rounded-xl lg:col-span-2 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                      <ListTodo className="w-5 h-5 text-electric-blue" />
                      Critical Maintenance Targets (Top 5)
                    </h3>
                    <p className="text-xs text-gridDark-textMuted mb-4">
                      Highest urgency failures sorted by XGBoost risk probability
                    </p>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-gridDark-border text-gridDark-textMuted uppercase font-mono text-[10px] tracking-wider">
                            <th className="pb-3">Rank</th>
                            <th className="pb-3">Transformer ID</th>
                            <th className="pb-3">Risk Score</th>
                            <th className="pb-3">Primary Factor</th>
                            <th className="pb-3">Action Urgency</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gridDark-border/60">
                          {maintenanceQueue.slice(0, 5).map((item, idx) => (
                            <tr 
                              key={item.transformer_id} 
                              className="hover:bg-gridDark-cardLight/40 transition-colors cursor-pointer group"
                              onClick={() => {
                                const t = transformers.find(tr => tr.transformer_id === item.transformer_id);
                                if (t) {
                                  setSelectedTransformer(t);
                                  // Scroll slightly up to see the chart update
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }
                              }}
                            >
                              <td className="py-3 font-mono font-bold text-electric-blue">#{item.rank}</td>
                              <td className="py-3 font-bold text-white group-hover:text-electric-blue transition-colors">
                                {item.transformer_id}
                                <span className="block text-[10px] text-gridDark-textMuted font-normal font-sans">{item.name}</span>
                              </td>
                              <td className="py-3">
                                <div className="flex items-center gap-2 font-mono font-bold">
                                  <span className={item.risk_score >= 70 ? 'text-risk-high' : 'text-risk-medium'}>{item.risk_score}%</span>
                                  <div className="w-12 h-1.5 bg-gridDark-cardLight rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full ${item.risk_score >= 85 ? 'bg-risk-critical' : item.risk_score >= 70 ? 'bg-risk-high' : 'bg-risk-medium'}`}
                                      style={{ width: `${item.risk_score}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 font-medium text-gridDark-textMuted">
                                {item.probable_root_cause}
                              </td>
                              <td className="py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider font-mono ${
                                  item.priority === 'Critical' ? 'bg-risk-critical/15 text-risk-critical border border-risk-critical/30' :
                                  item.priority === 'High' ? 'bg-risk-high/15 text-risk-high border border-risk-high/30' :
                                  'bg-risk-medium/15 text-risk-medium border border-risk-medium/30'
                                }`}>
                                  {item.priority}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-4">
                    <button 
                      onClick={() => setActiveTab('queue')}
                      className="text-xs font-bold text-electric-blue hover:text-white flex items-center gap-1 group"
                    >
                      View Full priority Queue <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. CHENNAI HEATMAP VIEW */}
          {activeTab === 'map' && (
            <div className="space-y-6 animate-fadeIn h-[calc(100vh-12rem)] flex flex-col">
              <div className="flex justify-between items-center bg-gridDark-card p-4 rounded-xl border border-gridDark-border">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Map className="w-5 h-5 text-electric-blue" />
                    Smart Grid Substation Live Risk Map
                  </h3>
                  <p className="text-xs text-gridDark-textMuted">
                    Chennai Metro grid layout showing localized failure probabilities. Click on pins for detailed root cause diagnostics.
                  </p>
                </div>
                {/* Map Quick stats legend */}
                <div className="flex gap-4 text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-risk-high shadow-glowRed"></span>
                    <span>High Risk (&ge;70%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-risk-medium"></span>
                    <span>Medium Risk (30-70%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-risk-low shadow-glowGreen"></span>
                    <span>Low Risk (&lt;30%)</span>
                  </div>
                </div>
              </div>

              {/* Map grid partition */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
                
                {/* Interactive Leaflet Map Container */}
                <div className="lg:col-span-3 border border-gridDark-border rounded-xl overflow-hidden relative shadow-inner bg-gridDark-card">
                  <MapContainer 
                    center={chennaiCenter} 
                    zoom={12} 
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={true}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                      url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    />
                    {transformers.map((t) => (
                      <Marker 
                        key={t.transformer_id} 
                        position={[t.lat, t.lng]} 
                        icon={createGlowingMarker(t.risk_level)}
                        eventHandlers={{
                          click: () => {
                            setSelectedTransformer(t);
                          }
                        }}
                      >
                        <Popup>
                          <div className="p-2 space-y-2 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-[14px] text-white">{t.transformer_id}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                t.risk_level === 'High' ? 'bg-risk-high/20 text-risk-high' :
                                t.risk_level === 'Medium' ? 'bg-risk-medium/20 text-risk-medium' :
                                'bg-risk-low/20 text-risk-low'
                              }`}>{t.risk_level} Risk</span>
                            </div>
                            <p className="text-gridDark-textMuted font-bold">{t.name}</p>
                            <p className="text-[10px] text-electric-blue/70 font-mono">Zone: {t.zone || 'N/A'}</p>
                            <div className="grid grid-cols-2 gap-2 border-t border-gridDark-border/60 pt-2 font-mono text-[10px]">
                              <div>Load: <span className="text-white">{t.load}%</span></div>
                              <div>Temp: <span className="text-white">{t.temperature}°C</span></div>
                              <div>Volt: <span className="text-white">{t.voltage}V</span></div>
                              <div>Risk: <span className="text-electric-blue font-bold">{t.risk_score}%</span></div>
                            </div>
                            <p className="text-[9px] text-gridDark-textMuted/60 font-mono border-t border-gridDark-border/40 pt-1">Updated: {t.last_updated || '—'}</p>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                    {selectedTransformer && (
                      <MapController center={[selectedTransformer.lat, selectedTransformer.lng]} />
                    )}
                  </MapContainer>
                </div>

                {/* Map Sidebar Telemetry details */}
                <div className="bg-gridDark-card border border-gridDark-border rounded-xl p-5 overflow-y-auto flex flex-col justify-between">
                  {selectedTransformer ? (
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-mono text-xs text-gridDark-textMuted font-bold tracking-wider uppercase mb-1">SELECTED NODE</h4>
                        <h3 className="text-lg font-bold text-white">{selectedTransformer.transformer_id}</h3>
                        <p className="text-xs text-gridDark-textMuted">{selectedTransformer.name}</p>
                      </div>

                      {/* Main gauge risk */}
                      <div className="p-4 rounded-lg bg-gridDark-cardLight/50 border border-gridDark-border flex flex-col items-center justify-center text-center">
                        <span className="text-xs text-gridDark-textMuted uppercase font-mono font-bold mb-1">XGBoost Risk Score</span>
                        <span className={`text-4xl font-extrabold font-mono ${
                          selectedTransformer.risk_level === 'High' ? 'text-risk-high' :
                          selectedTransformer.risk_level === 'Medium' ? 'text-risk-medium' :
                          'text-risk-low'
                        }`}>{selectedTransformer.risk_score}%</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider mt-2 border ${
                          selectedTransformer.risk_level === 'High' ? 'bg-risk-high/10 text-risk-high border-risk-high/20' :
                          selectedTransformer.risk_level === 'Medium' ? 'bg-risk-medium/10 text-risk-medium border-risk-medium/20' :
                          'bg-risk-low/10 text-risk-low border-risk-low/20'
                        }`}>
                          {selectedTransformer.risk_level} RISK
                        </span>
                      </div>

                      {/* Digital Twin */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] text-gridDark-textMuted font-bold uppercase tracking-wider border-b border-gridDark-border pb-1 flex justify-between items-center">
                          <span>LIVE DIGITAL TWIN</span>
                          <span className={`w-2 h-2 rounded-full animate-pulse ${
                            selectedTransformer.risk_level === 'High' ? 'bg-risk-high shadow-neon-red' :
                            selectedTransformer.risk_level === 'Medium' ? 'bg-risk-medium' :
                            'bg-risk-low'
                          }`}></span>
                        </h4>
                        
                        <div className="relative p-4 bg-gridDark-cardLight rounded-lg border border-gridDark-border flex items-center justify-center min-h-[160px] overflow-hidden">
                          {/* Pulsing background glow based on risk */}
                          <div className={`absolute inset-0 opacity-10 animate-pulse ${
                            selectedTransformer.risk_level === 'High' ? 'bg-risk-high' :
                            selectedTransformer.risk_level === 'Medium' ? 'bg-risk-medium' :
                            'bg-risk-low'
                          }`}></div>
                          
                          {/* The twin shape */}
                          <div className={`relative w-20 h-24 rounded border-2 ${
                              selectedTransformer.risk_level === 'High' ? 'border-risk-high shadow-[0_0_15px_rgba(239,71,111,0.5)]' : 
                              selectedTransformer.risk_level === 'Medium' ? 'border-risk-medium shadow-[0_0_15px_rgba(255,209,102,0.5)]' : 
                              'border-risk-low shadow-[0_0_15px_rgba(6,214,160,0.5)]'
                            } bg-gridDark-card z-10 flex flex-col items-center justify-between py-2`}>
                            <div className="w-12 h-2 bg-gray-600 rounded-sm"></div>
                            <div className="flex gap-1.5">
                              {/* Coils */}
                              <div className={`w-2 h-10 rounded-sm ${selectedTransformer.temperature > 80 ? 'bg-risk-high animate-pulse' : 'bg-electric-blue'}`}></div>
                              <div className={`w-2 h-10 rounded-sm ${selectedTransformer.temperature > 80 ? 'bg-risk-high animate-pulse' : 'bg-electric-blue'}`}></div>
                              <div className={`w-2 h-10 rounded-sm ${selectedTransformer.temperature > 80 ? 'bg-risk-high animate-pulse' : 'bg-electric-blue'}`}></div>
                            </div>
                            <div className="w-12 h-2 bg-gray-600 rounded-sm"></div>
                          </div>
                          
                          {/* Annotations */}
                          <div className="absolute top-3 left-3 text-[10px] font-mono text-gridDark-textMuted font-bold">TEMP: <span className={selectedTransformer.temperature > 85 ? 'text-risk-high' : 'text-white'}>{selectedTransformer.temperature}°C</span></div>
                          <div className="absolute top-3 right-3 text-[10px] font-mono text-gridDark-textMuted font-bold">LOAD: <span className={selectedTransformer.load > 85 ? 'text-risk-high' : 'text-white'}>{selectedTransformer.load}%</span></div>
                          <div className="absolute bottom-3 left-3 text-[10px] font-mono text-gridDark-textMuted font-bold">VOLT: <span className="text-white">{selectedTransformer.voltage}V</span></div>
                          <div className="absolute bottom-3 right-3 text-[10px] font-mono text-gridDark-textMuted font-bold">AMP: <span className="text-white">{selectedTransformer.current}A</span></div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between border-b border-gridDark-border pb-1">
                          <h4 className="text-[10px] text-gridDark-textMuted font-bold uppercase tracking-wider">RECOMMENDED ACTION</h4>
                          <button 
                            onClick={() => window.print()}
                            className="flex items-center gap-1 text-[9px] font-bold text-electric-blue hover:text-white transition-colors"
                          >
                            <Download className="w-3 h-3" /> PDF REPORT
                          </button>
                        </div>
                        <p className="text-[11px] text-gridDark-textMuted leading-relaxed bg-gridDark-cardLight/30 p-2.5 border border-gridDark-border rounded">
                          {typeof selectedTransformer.recommendation === 'object' ? selectedTransformer.recommendation.text : selectedTransformer.recommendation}
                        </p>
                      </div>

                      {/* Active Workforce Dispatch Card */}
                      {(() => {
                        const activeTask = tasks.find(tsk => tsk.transformer === selectedTransformer.transformer_id && tsk.status !== 'Completed');
                        return activeTask ? (
                          <div className="space-y-2 mt-4 pt-4 border-t border-gridDark-border">
                            <div className="flex items-center justify-between border-b border-gridDark-border pb-1">
                              <h4 className="text-[10px] text-gridDark-textMuted font-bold uppercase tracking-wider">WORKFORCE DISPATCH</h4>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                activeTask.status === 'Reached' ? 'bg-risk-low/20 text-risk-low animate-pulse' :
                                'bg-risk-medium/20 text-risk-medium'
                              }`}>{activeTask.status}</span>
                            </div>
                            <div className="p-2.5 bg-gridDark-cardLight/30 border border-gridDark-border rounded text-[11px] space-y-1 font-sans">
                              <div><span className="text-gridDark-textMuted">Task ID:</span> <span className="text-white font-bold">{activeTask.id}</span></div>
                              <div><span className="text-gridDark-textMuted">Assignee:</span> <span className="text-white font-bold">{activeTask.assignedName} ({activeTask.assignedTo})</span></div>
                              <div><span className="text-gridDark-textMuted">ETA/Sched:</span> <span className="text-electric-blue font-bold font-mono">{activeTask.scheduledAt}</span></div>
                              {activeTask.notes && <div><span className="text-gridDark-textMuted">Notes:</span> <span className="text-gridDark-textMuted font-mono block mt-0.5 bg-gridDark-bg/40 p-1.5 rounded border border-gridDark-border/60">{activeTask.notes}</span></div>}
                            </div>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-gridDark-textMuted">
                      <Info className="w-8 h-8 mb-2 text-electric-blue" />
                      <p className="text-xs">Click a substation marker on the map to load full telemetry readings.</p>
                    </div>
                  )}
                  
                  {/* Select controller buttons */}
                  {selectedTransformer && (
                    <div className="mt-4 pt-4 border-t border-gridDark-border flex flex-col gap-2">
                      {(() => {
                        const activeTask = tasks.find(tsk => tsk.transformer === selectedTransformer.transformer_id && tsk.status !== 'Completed');
                        if (!activeTask) {
                          return (
                            <button
                              onClick={() => handleDispatchEngineer(selectedTransformer)}
                              className="w-full bg-risk-high/15 hover:bg-risk-high/25 text-risk-high text-xs font-bold py-2 px-4 rounded border border-risk-high/30 transition-all hover:scale-[1.01]"
                            >
                              Dispatch Field Engineer
                            </button>
                          );
                        }
                        return null;
                      })()}
                      <button 
                        onClick={() => {
                          // set parameters in tester
                          setTestInputs({
                            transformer_id: selectedTransformer.transformer_id,
                            load: selectedTransformer.load,
                            temperature: selectedTransformer.temperature,
                            voltage: selectedTransformer.voltage,
                            current: selectedTransformer.current,
                            power: selectedTransformer.power
                          });
                          setActiveTab('tester');
                        }}
                        className="w-full bg-electric-blue/15 hover:bg-electric-blue/25 text-electric-blue text-xs font-bold py-2 px-4 rounded border border-electric-blue/30 transition-colors"
                      >
                        Load in Risk Tester
                      </button>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* 3. MAINTENANCE PRIORITY QUEUE */}
          {activeTab === 'queue' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-gridDark-card border border-gridDark-border p-6 rounded-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <ListTodo className="w-5 h-5 text-electric-blue" />
                      Priority Intervention Queue
                    </h3>
                    <p className="text-xs text-gridDark-textMuted">
                      XGBoost failure likelihood ordering. Sorts critical grid assets by calculated risk and maps corrective engineering instructions.
                    </p>
                  </div>
                  {/* Excel download dummy */}
                  <button 
                    onClick={() => {
                      alert("Downloading CSV report... (In production, this triggers a pandas excel/csv generation)");
                    }}
                    className="flex items-center gap-2 bg-gridDark-cardLight hover:bg-gridDark-cardLight/80 border border-gridDark-border hover:border-electric-blue px-4 py-2 rounded-lg text-xs font-bold text-white transition-colors"
                  >
                    <Download className="w-4 h-4" /> Export dispatch Sheet
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gridDark-border text-gridDark-textMuted uppercase font-mono text-[10px] tracking-wider">
                        <th className="py-3 px-4">Rank</th>
                        <th className="py-3 px-4">Transformer ID</th>
                        <th className="py-3 px-4">Substation Name</th>
                        <th className="py-3 px-4">Zone</th>
                        <th className="py-3 px-4">Risk score</th>
                        <th className="py-3 px-4">Failure level</th>
                        <th className="py-3 px-4">Primary stress driver</th>
                        <th className="py-3 px-4">Dispatch priority</th>
                        <th className="py-3 px-4">Inspection Window</th>
                        <th className="py-3 px-4">Workforce Status</th>
                        <th className="py-3 px-4">Action details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gridDark-border">
                      {maintenanceQueue.map((item) => (
                        <tr key={item.transformer_id} className="hover:bg-gridDark-cardLight/30 transition-colors">
                          <td className="py-4 px-4 font-mono font-bold text-electric-blue">#{item.rank}</td>
                          <td className="py-4 px-4 font-mono font-bold text-white">{item.transformer_id}</td>
                          <td className="py-4 px-4 text-gridDark-textMuted">{item.name}</td>
                          <td className="py-4 px-4 text-electric-blue/80 font-mono text-[10px]">{item.zone || '—'}</td>
                          <td className="py-4 px-4">
                            <span className={`font-mono font-bold ${
                              item.risk_score >= 70 ? 'text-risk-high' :
                              item.risk_score >= 30 ? 'text-risk-medium' :
                              'text-risk-low'
                            }`}>{item.risk_score}%</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                              item.risk_level === 'High' ? 'bg-risk-high/15 text-risk-high border border-risk-high/30' :
                              item.risk_level === 'Medium' ? 'bg-risk-medium/15 text-risk-medium border border-risk-medium/30' :
                              'bg-risk-low/15 text-risk-low border border-risk-low/30'
                            }`}>{item.risk_level}</span>
                          </td>
                          <td className="py-4 px-4 font-medium text-gridDark-textMuted">
                            {item.probable_root_cause}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide font-mono ${
                              item.priority === 'Critical' ? 'bg-risk-critical/20 text-risk-critical' :
                              item.priority === 'High' ? 'bg-risk-high/20 text-risk-high' :
                              item.priority === 'Medium' ? 'bg-risk-medium/20 text-risk-medium' :
                              'bg-risk-low/20 text-risk-low'
                            }`}>
                              {item.priority}
                            </span>
                          </td>
                          <td className="py-4 px-4 font-mono text-[10px]">
                            <span className={`${
                              item.priority === 'Critical' ? 'text-risk-high font-bold' :
                              item.priority === 'High' ? 'text-risk-medium' :
                              'text-gridDark-textMuted'
                            }`}>{item.inspection_window || '—'}</span>
                          </td>
                          <td className="py-4 px-4">
                            {(() => {
                              const activeTask = tasks.find(tsk => tsk.transformer === item.transformer_id && tsk.status !== 'Completed');
                              if (activeTask) {
                                return (
                                  <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                                    activeTask.status === 'Reached' ? 'bg-risk-low/20 text-risk-low animate-pulse border border-risk-low/30' :
                                    activeTask.status === 'In Transit' ? 'bg-risk-medium/20 text-risk-medium border border-risk-medium/30' :
                                    'bg-electric-blue/20 text-electric-blue border border-electric-blue/30'
                                  }`}>
                                    {activeTask.status} ({activeTask.assignedName})
                                  </span>
                                );
                              }
                              const transObj = transformers.find(t => t.transformer_id === item.transformer_id);
                              return (
                                <button
                                  onClick={() => handleDispatchEngineer(transObj)}
                                  className="bg-electric-blue/10 hover:bg-electric-blue/20 text-electric-blue border border-electric-blue/30 text-[9px] px-2.5 py-1 rounded font-bold uppercase tracking-wider transition-all hover:scale-[1.02]"
                                >
                                  Dispatch
                                </button>
                              );
                            })()}
                          </td>
                          <td className="py-4 px-4 max-w-xs truncate text-gridDark-textMuted font-sans" title={item.recommended_action}>
                            {item.recommended_action}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 4. MANUAL RISK TESTER */}
          {activeTab === 'tester' && (
            <div className="space-y-8 animate-fadeIn">
              
              {/* Presets Row */}
              <div className="bg-gridDark-card border border-gridDark-border p-4 rounded-xl flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-gridDark-textMuted">Telemetry Presets:</span>
                <div className="flex gap-3">
                  {presets.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => applyPreset(preset)}
                      className="bg-gridDark-cardLight hover:bg-electric-blue/15 hover:border-electric-blue hover:text-white border border-gridDark-border text-gridDark-textMuted text-xs px-3.5 py-1.5 rounded-lg font-medium transition-all"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Manual Tester input Form */}
                <div className="bg-gridDark-card border border-gridDark-border p-6 rounded-xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                      <Activity className="w-5 h-5 text-electric-blue" />
                      Telemetry Tester Form
                    </h3>
                    <p className="text-xs text-gridDark-textMuted mb-6">
                      Enter customized substation variables to query the KNN-imputed XGBoost classifier and calculate real-time risks.
                    </p>

                    <form onSubmit={handleTestPredict} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold font-mono text-gridDark-textMuted uppercase mb-1">Transformer ID</label>
                        <input 
                          type="text" 
                          value={testInputs.transformer_id}
                          onChange={(e) => setTestInputs({...testInputs, transformer_id: e.target.value})}
                          className="w-full bg-gridDark-cardLight border border-gridDark-border text-white rounded-lg p-2.5 text-xs font-mono focus:border-electric-blue focus:outline-none"
                          placeholder="e.g. TR-1099" 
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold font-mono text-gridDark-textMuted uppercase mb-1">Location / Zone</label>
                        <input 
                          type="text" 
                          value={testInputs.zone || ''}
                          onChange={(e) => setTestInputs({...testInputs, zone: e.target.value})}
                          className="w-full bg-gridDark-cardLight border border-gridDark-border text-white rounded-lg p-2.5 text-xs font-mono focus:border-electric-blue focus:outline-none"
                          placeholder="e.g. Adyar, T-Nagar" 
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold font-mono text-gridDark-textMuted uppercase mb-1">Load Factor (%)</label>
                          <input 
                            type="number" step="any"
                            value={testInputs.load || ''}
                            onChange={(e) => setTestInputs({...testInputs, load: e.target.value !== '' ? Number(e.target.value) : null})}
                            className="w-full bg-gridDark-cardLight border border-gridDark-border text-white rounded-lg p-2.5 text-xs font-mono focus:border-electric-blue focus:outline-none"
                            placeholder="Optional (Imputes if empty)"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold font-mono text-gridDark-textMuted uppercase mb-1">Core Temp (&deg;C)</label>
                          <input 
                            type="number" step="any"
                            value={testInputs.temperature || ''}
                            onChange={(e) => setTestInputs({...testInputs, temperature: e.target.value !== '' ? Number(e.target.value) : null})}
                            className="w-full bg-gridDark-cardLight border border-gridDark-border text-white rounded-lg p-2.5 text-xs font-mono focus:border-electric-blue focus:outline-none"
                            placeholder="Optional"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold font-mono text-gridDark-textMuted uppercase mb-1">Voltage (V)</label>
                          <input 
                            type="number" step="any"
                            value={testInputs.voltage || ''}
                            onChange={(e) => setTestInputs({...testInputs, voltage: e.target.value !== '' ? Number(e.target.value) : null})}
                            className="w-full bg-gridDark-cardLight border border-gridDark-border text-white rounded-lg p-2.5 text-xs font-mono focus:border-electric-blue focus:outline-none"
                            placeholder="Optional"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold font-mono text-gridDark-textMuted uppercase mb-1">Current (A)</label>
                          <input 
                            type="number" step="any"
                            value={testInputs.current || ''}
                            onChange={(e) => setTestInputs({...testInputs, current: e.target.value !== '' ? Number(e.target.value) : null})}
                            className="w-full bg-gridDark-cardLight border border-gridDark-border text-white rounded-lg p-2.5 text-xs font-mono focus:border-electric-blue focus:outline-none"
                            placeholder="Optional"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold font-mono text-gridDark-textMuted uppercase mb-1">Power (kW)</label>
                          <input 
                            type="number" step="any"
                            value={testInputs.power || ''}
                            onChange={(e) => setTestInputs({...testInputs, power: e.target.value !== '' ? Number(e.target.value) : null})}
                            className="w-full bg-gridDark-cardLight border border-gridDark-border text-white rounded-lg p-2.5 text-xs font-mono focus:border-electric-blue focus:outline-none"
                            placeholder="Optional"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={testLoading}
                        className="w-full bg-electric-blue hover:bg-electric-blueDark text-white py-3 rounded-lg text-xs font-bold uppercase tracking-wider shadow-glow transition-all flex items-center justify-center gap-2"
                      >
                        {testLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" /> RUNNING CLASSIFIER INFERENCE...
                          </>
                        ) : (
                          <>
                            <Activity className="w-4 h-4" /> PREDICT FAIL PROBABILITY
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Tester output Results pane */}
                <div className="bg-gridDark-card border border-gridDark-border p-6 rounded-xl flex flex-col justify-between">
                  {testResult ? (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center border-b border-gridDark-border pb-3">
                        <div>
                          <h4 className="font-mono text-xs text-gridDark-textMuted font-bold uppercase">RESULTS FOR</h4>
                          <h3 className="text-xl font-bold text-white">{testResult.transformer_id}</h3>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono border ${
                          testResult.risk_level === 'High' ? 'bg-risk-high/15 text-risk-high border-risk-high/30' :
                          testResult.risk_level === 'Medium' ? 'bg-risk-medium/15 text-risk-medium border-risk-medium/30' :
                          'bg-risk-low/15 text-risk-low border-risk-low/30'
                        }`}>
                          {testResult.risk_level} RISK LEVEL
                        </span>
                      </div>

                      {/* Score gauge card */}
                      <div className={`p-5 rounded-lg border flex flex-col items-center justify-center text-center ${
                        testResult.risk_level === 'High' ? 'bg-risk-high/5 border-risk-high/10 shadow-neon-red' :
                        testResult.risk_level === 'Medium' ? 'bg-risk-medium/5 border-risk-medium/10' :
                        'bg-risk-low/5 border-risk-low/10 shadow-glowGreen'
                      }`}>
                        <span className="text-xs text-gridDark-textMuted uppercase font-mono font-bold mb-1">XGBoost Risk Score</span>
                        <span className={`text-5xl font-extrabold font-mono ${
                          testResult.risk_level === 'High' ? 'text-risk-high' :
                          testResult.risk_level === 'Medium' ? 'text-risk-medium' :
                          'text-risk-low'
                        }`}>{testResult.risk_score}%</span>
                      </div>

                      {/* Imputed values show */}
                      <div className="bg-gridDark-cardLight/40 p-4 rounded-lg border border-gridDark-border space-y-2.5 text-xs font-mono">
                        <div className="text-[10px] text-gridDark-textMuted font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-electric-blue" />
                          KNN-Imputed Inputs (Replaced missing values)
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex justify-between">
                            <span className="text-gridDark-textMuted">Load:</span>
                            <span className="text-white font-bold">{parseFloat(testResult.imputed_values.load).toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gridDark-textMuted">Temp:</span>
                            <span className="text-white font-bold">{parseFloat(testResult.imputed_values.temperature).toFixed(1)}&deg;C</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gridDark-textMuted">Voltage:</span>
                            <span className="text-white font-bold">{parseFloat(testResult.imputed_values.voltage).toFixed(1)}V</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gridDark-textMuted">Current:</span>
                            <span className="text-white font-bold">{parseFloat(testResult.imputed_values.current).toFixed(1)}A</span>
                          </div>
                        </div>
                      </div>

                      {/* Stress factor bars */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] text-gridDark-textMuted font-bold uppercase tracking-wider font-mono">Stress Contributor Breakdown</h4>
                        {Object.entries(testResult.explainability).map(([cause, val]) => (
                          <div key={cause} className="space-y-1">
                            <div className="flex justify-between text-xs font-mono">
                              <span className="text-gridDark-textMuted">{cause}</span>
                              <span className="text-white font-bold">{val}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-gridDark-cardLight rounded-full overflow-hidden border border-gridDark-border">
                              <div 
                                className="h-full bg-electric-blue rounded-full transition-all duration-300"
                                style={{ width: `${val}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* HIGH RISK ALERT BANNER */}
                      {testResult.risk_level === 'High' && (
                        <div className="p-3 rounded-lg bg-risk-high/15 border border-risk-high/30 flex items-center gap-3 animate-pulse">
                          <AlertTriangle className="w-5 h-5 text-risk-high shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-risk-high">⚠ HIGH RISK DETECTED</p>
                            <p className="text-[11px] text-gridDark-textMuted">
                              Transformer {testResult.transformer_id} has been classified as HIGH RISK with a failure probability of {testResult.risk_score}%. Immediate field inspection is strongly recommended.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Predictive Maintenance Planner */}
                      <div className="bg-gridDark-cardLight p-4 border border-gridDark-border rounded-lg text-xs leading-relaxed font-sans">
                        <div className="flex items-center justify-between mb-3 border-b border-gridDark-border pb-2">
                          <span className="font-bold text-white uppercase tracking-wider font-mono text-[10px] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-electric-blue" />
                            Predictive Maintenance Planner
                          </span>
                          {testResult.recommendation?.priority && (
                            <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold uppercase tracking-wider ${
                              testResult.recommendation.priority === 'Critical' ? 'bg-risk-high/20 text-risk-high border border-risk-high/30' :
                              testResult.recommendation.priority === 'High' ? 'bg-risk-medium/20 text-risk-medium border border-risk-medium/30' :
                              'bg-electric-blue/10 text-electric-blue border border-electric-blue/30'
                            }`}>
                              {testResult.recommendation.priority} PRIORITY
                            </span>
                          )}
                        </div>
                        
                        <div className="space-y-3">
                          <p className="text-gridDark-textMuted text-[11.5px]">
                            <strong className="text-white">Action Plan: </strong> 
                            {typeof testResult.recommendation === 'string' ? testResult.recommendation : testResult.recommendation?.text}
                          </p>

                          {typeof testResult.recommendation === 'object' && testResult.recommendation?.failure_window && (
                            <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-gridDark-border/50">
                              <div>
                                <span className="block text-[9px] font-mono text-gridDark-textMuted uppercase mb-0.5">Predicted Failure Window</span>
                                <span className="font-bold text-risk-high">{testResult.recommendation.failure_window}</span>
                              </div>
                              <div>
                                <span className="block text-[9px] font-mono text-gridDark-textMuted uppercase mb-0.5">Recommended Maintenance Date</span>
                                <span className="font-bold text-electric-blue">{testResult.recommendation.recommended_date}</span>
                              </div>
                              <div>
                                <span className="block text-[9px] font-mono text-gridDark-textMuted uppercase mb-0.5">Estimated Downtime Saved</span>
                                <span className="font-bold text-risk-low">{testResult.recommendation.downtime_saved} Hours</span>
                              </div>
                              <div>
                                <span className="block text-[9px] font-mono text-gridDark-textMuted uppercase mb-0.5">Post-Action Risk Reduction</span>
                                <span className="font-bold text-risk-low">-{testResult.recommendation.risk_reduction}%</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-gridDark-textMuted p-6">
                      <Gauge className="w-12 h-12 mb-3 text-gridDark-textMuted/40" />
                      <p className="text-xs">Fill the telemetry values and click predict to run ML pipeline analysis.</p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* 5. UPLOAD DATASET SECTION */}
          {activeTab === 'upload' && (
            <div className="space-y-8 animate-fadeIn">
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Upload drag-drop area */}
                <div className="bg-gridDark-card border border-gridDark-border p-6 rounded-xl lg:col-span-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                      <UploadCloud className="w-5 h-5 text-electric-blue" />
                      CSV Dataset Uploader
                    </h3>
                    <p className="text-xs text-gridDark-textMuted mb-6">
                      Upload substation log sheets (CSV format) to perform automated cleanups, imputations, SMOTE balancing and XGBoost retraining.
                    </p>

                    <div className="border border-dashed border-gridDark-border hover:border-electric-blue rounded-xl p-8 text-center bg-gridDark-bg/40 cursor-pointer transition-colors relative group">
                      <input 
                        type="file" 
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <UploadCloud className="w-10 h-10 mx-auto text-gridDark-textMuted group-hover:text-electric-blue transition-colors mb-2" />
                      <p className="text-xs text-white font-medium mb-1">
                        {file ? file.name : "Select Transformer CSV File"}
                      </p>
                      <p className="text-[10px] text-gridDark-textMuted">
                        Expected: transformer_id, load, temperature, voltage, current, power, failure
                      </p>
                    </div>

                    <div className="mt-4 text-center">
                      <a 
                        href="/sample_data.csv" 
                        download="sample_data.csv"
                        className="inline-flex items-center gap-1.5 text-xs text-electric-blue hover:text-white transition-colors underline font-mono"
                      >
                        <Download className="w-3.5 h-3.5" /> Download Testing Sample CSV
                      </a>
                    </div>

                    {file && (
                      <div className="mt-4 p-3 rounded bg-gridDark-cardLight/50 border border-gridDark-border text-xs flex justify-between items-center font-mono">
                        <span className="truncate text-white max-w-[150px]">{file.name}</span>
                        <span className="text-gridDark-textMuted">{(file.size / 1024).toFixed(1)} KB</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={submitFile}
                    disabled={!file || uploadLoading}
                    className="w-full bg-electric-blue hover:bg-electric-blueDark text-white py-3 rounded-lg text-xs font-bold uppercase tracking-wider shadow-glow transition-all disabled:opacity-40 disabled:pointer-events-none mt-6 flex items-center justify-center gap-2"
                  >
                    {uploadLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> PROCESS DATASET & RETRAIN ({uploadProgress}%)...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" /> RETRAIN PIPELINE MODEL
                      </>
                    )}
                  </button>

                  {uploadLoading && (
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-[10px] font-mono text-electric-blue font-bold">
                        <span>PIPELINE RETRAINING</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-gridDark-cardLight h-1.5 rounded-full overflow-hidden border border-gridDark-border">
                        <div 
                          className="h-full bg-gradient-to-r from-electric-blue to-cyan-400 transition-all duration-150" 
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {uploadError && (
                    <div className="mt-4 p-3 rounded-lg bg-risk-high/15 border border-risk-high/30 text-risk-high text-xs leading-normal font-medium flex gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}
                </div>

                {/* Audit & Retrain Results pane */}
                <div className="bg-gridDark-card border border-gridDark-border p-6 rounded-xl lg:col-span-2 flex flex-col">
                  {uploadResult ? (
                    <div className="space-y-6 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center border-b border-gridDark-border pb-3 mb-4">
                          <h3 className="text-[15px] font-bold text-white flex items-center gap-1.5">
                            <CheckCircle2 className="w-5 h-5 text-risk-low" /> Model Retraining Metrics
                          </h3>
                          <span className="text-[11px] text-risk-low bg-risk-low/10 px-2 py-0.5 rounded border border-risk-low/20 font-mono">
                            SUCCESSFULLY LOADED {uploadResult.total_records} RECORDS
                          </span>
                        </div>

                        {/* Top KPI comparisons */}
                        <div className="grid grid-cols-3 gap-4 mb-6 text-center font-mono">
                          <div className="bg-gridDark-cardLight/50 p-3 rounded border border-gridDark-border">
                            <span className="text-[10px] text-gridDark-textMuted uppercase font-bold">Accuracy</span>
                            <span className="block text-xl font-extrabold text-white mt-1">
                              {Math.round(uploadResult.metrics.accuracy * 100)}%
                            </span>
                          </div>
                          <div className="bg-gridDark-cardLight/50 p-3 rounded border border-gridDark-border">
                            <span className="text-[10px] text-gridDark-textMuted uppercase font-bold">Precision</span>
                            <span className="block text-xl font-extrabold text-white mt-1">
                              {Math.round(uploadResult.metrics.precision * 100)}%
                            </span>
                          </div>
                          <div className="bg-gridDark-cardLight/50 p-3 rounded border border-gridDark-border">
                            <span className="text-[10px] text-gridDark-textMuted uppercase font-bold">Recall</span>
                            <span className="block text-xl font-extrabold text-white mt-1">
                              {Math.round(uploadResult.metrics.recall * 100)}%
                            </span>
                          </div>
                        </div>

                        {/* Missing values and class balances */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          {/* Missing value audit */}
                          <div className="space-y-3">
                            <h4 className="text-[11px] font-bold text-white uppercase tracking-wider font-mono border-b border-gridDark-border pb-1">
                              1. KNN Missing Value Imputation Audit
                            </h4>
                            <div className="space-y-2">
                              {Object.entries(uploadResult.missing_value_summary).map(([col, data]) => (
                                <div key={col} className="flex justify-between items-center text-xs font-mono">
                                  <span className="text-gridDark-textMuted">{col}:</span>
                                  <span className={data.count > 0 ? 'text-risk-medium' : 'text-risk-low'}>
                                    {data.count} Missing ({data.pct}%)
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Class Distribution */}
                          <div className="space-y-3">
                            <h4 className="text-[11px] font-bold text-white uppercase tracking-wider font-mono border-b border-gridDark-border pb-1">
                              2. Class Balance (SMOTE Over-sampling)
                            </h4>
                            <div className="space-y-2 text-xs font-mono">
                              <div className="flex justify-between items-center">
                                <span className="text-gridDark-textMuted">Raw Normal cases (0):</span>
                                <span className="text-white font-bold">{uploadResult.class_distribution["Normal (0)"]}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gridDark-textMuted">Raw Failure cases (1):</span>
                                <span className="text-risk-high font-bold">{uploadResult.class_distribution["Failure (1)"]}</span>
                              </div>
                              <div className="text-[10px] text-risk-low leading-relaxed bg-risk-low/5 p-2 border border-risk-low/20 rounded mt-2">
                                * SMOTE dynamically generated synthetic minority class samples to achieve a balanced 50:50 distribution for XGBoost training.
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Report list preview */}
                        <div className="space-y-3">
                          <h4 className="text-[11px] font-bold text-white uppercase tracking-wider font-mono border-b border-gridDark-border pb-1">
                            3. Risk Ranked Report Preview (Retrained Model Inference)
                          </h4>
                          <div className="max-h-[140px] overflow-y-auto border border-gridDark-border rounded">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-gridDark-cardLight/50 sticky top-0 border-b border-gridDark-border text-gridDark-textMuted font-mono text-[9px] uppercase tracking-wider">
                                <tr>
                                  <th className="py-2 px-3">ID</th>
                                  <th className="py-2 px-3">Load</th>
                                  <th className="py-2 px-3">Temp</th>
                                  <th className="py-2 px-3">Voltage</th>
                                  <th className="py-2 px-3">predicted Risk</th>
                                  <th className="py-2 px-3">Level</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gridDark-border/60">
                                {uploadResult.risk_ranked_report.slice(0, 10).map((r) => (
                                  <tr key={r.transformer_id} className="hover:bg-gridDark-cardLight/20">
                                    <td className="py-2 px-3 font-mono font-bold text-white">{r.transformer_id}</td>
                                    <td className="py-2 px-3 font-mono">{r.load}%</td>
                                    <td className="py-2 px-3 font-mono">{r.temperature}&deg;C</td>
                                    <td className="py-2 px-3 font-mono">{r.voltage}V</td>
                                    <td className="py-2 px-3 font-mono font-bold text-electric-blue">{r.risk_score}%</td>
                                    <td className="py-2 px-3 font-mono">
                                      <span className={r.risk_level === 'High' ? 'text-risk-high' : r.risk_level === 'Medium' ? 'text-risk-medium' : 'text-risk-low'}>
                                        {r.risk_level}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* DOWNLOAD RISK REPORT */}
                      <button 
                        onClick={() => {
                          if (!uploadResult || !uploadResult.risk_ranked_report) return;
                          const header = 'transformer_id,load,temperature,voltage,risk_score,risk_level\n';
                          const rows = uploadResult.risk_ranked_report.map(r => 
                            `${r.transformer_id},${r.load},${r.temperature},${r.voltage},${r.risk_score},${r.risk_level}`
                          ).join('\n');
                          const blob = new Blob([header + rows], { type: 'text/csv' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `gridtitan_risk_report_${new Date().toISOString().split('T')[0]}.csv`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-electric-blue/15 hover:bg-electric-blue/25 text-electric-blue text-xs font-bold py-2.5 px-4 rounded-lg border border-electric-blue/30 transition-colors"
                      >
                        <Download className="w-4 h-4" /> Download Full Risk Report (CSV)
                      </button>

                      {/* VIEW UPDATED DASHBOARD BUTTON */}
                      <button
                        onClick={() => {
                          if (!uploadResult) return;
                          // Build updated metrics from retrained result
                          const report = uploadResult.risk_ranked_report || [];
                          const highCount = report.filter(r => r.risk_level === 'High').length;
                          const medCount = report.filter(r => r.risk_level === 'Medium').length;
                          const lowCount = report.filter(r => r.risk_level === 'Low').length;
                          const updatedMetrics = {
                            accuracy: uploadResult.metrics?.accuracy ?? 0.92,
                            precision: uploadResult.metrics?.precision ?? 0.88,
                            recall: uploadResult.metrics?.recall ?? 0.94,
                            total_monitored: report.length || uploadResult.total_records,
                            risk_distribution: { High: highCount, Medium: medCount, Low: lowCount }
                          };
                          // Build updated transformers list from the risk report
                          // Must use transformer_id (not id) to match dropdown & timeline logic
                          const updatedTransformers = report.map((r, i) => {
                            const baseScore = r.risk_score ?? 50;
                            // Pre-build 7-day timeline for each transformer
                            const timeline = Array.from({ length: 7 }, (_, d) => {
                              const factor = Math.pow((d + 1) / 7.0, 1.5);
                              const val = Math.min(99.9, Math.max(5.0, Math.round(baseScore * factor * 10) / 10));
                              return { day: `Day ${d + 1}`, probability: val };
                            });
                            return {
                              transformer_id: r.transformer_id,
                              name: r.name || `Substation ${r.transformer_id}`,
                              zone: r.zone || `Zone-${String.fromCharCode(65 + (i % 6))}`,
                              risk_score: baseScore,
                              risk_level: r.risk_level,
                              load: r.load ?? 0,
                              temperature: r.temperature ?? 0,
                              voltage: r.voltage ?? 0,
                              current: r.current ?? 0,
                              power: r.power ?? 0,
                              lat: 13.02 + (Math.random() - 0.5) * 0.25,
                              lng: 80.22 + (Math.random() - 0.5) * 0.25,
                              _timeline: timeline,   // cached so selection triggers correct chart
                              explainability: {
                                "Temperature Stress": r.temperature > 90 ? 45 : 20,
                                "Load Stress": r.load > 90 ? 35 : 20,
                                "Voltage Deviation": (r.voltage < 200 || r.voltage > 240) ? 30 : 15,
                                "Current Fluctuation": r.current > 100 ? 20 : 10
                              }
                            };
                          });
                          // Mark retrained data for banner display
                          setRetrainedDashboardData({
                            timestamp: new Date().toLocaleTimeString(),
                            records: uploadResult.total_records,
                            accuracy: Math.round((uploadResult.metrics?.accuracy ?? 0.92) * 100)
                          });
                          // Navigate to dashboard
                          setActiveTab('dashboard');
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-risk-low/20 to-electric-blue/20 hover:from-risk-low/30 hover:to-electric-blue/30 text-risk-low text-xs font-bold py-3 px-4 rounded-lg border border-risk-low/40 transition-all hover:scale-[1.01] shadow-md"
                      >
                        <LayoutGrid className="w-4 h-4" />
                        View Updated Dashboard
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-gridDark-textMuted p-6">
                      <UploadCloud className="w-12 h-12 mb-3 text-gridDark-textMuted/40" />
                      <p className="text-xs">Upload a CSV log file on the left and run pipeline training to inspect statistics.</p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* 6. MODEL PERFORMANCE COMPARISON SECTION */}
          {activeTab === 'performance' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="bg-gridDark-card border border-gridDark-border p-6 rounded-xl">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-electric-blue" />
                  Model Performance: Baseline vs. Data-Centric AI
                </h3>
                <p className="text-xs text-gridDark-textMuted mb-8">
                  Comparison between a naïve Logistic Regression baseline and the improved GRIDTITAN pipeline (KNN + Feature Engineering + SMOTE + XGBoost), demonstrating the value of Data-Centric AI.
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Baseline Model */}
                  <div className="bg-gridDark-bg/60 border border-risk-high/20 p-6 rounded-xl relative">
                    <div className="absolute top-4 right-4">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-risk-high/15 text-risk-high border border-risk-high/30">Baseline</span>
                    </div>
                    <h4 className="text-sm font-bold text-white mb-1 font-mono">Logistic Regression</h4>
                    <p className="text-[11px] text-gridDark-textMuted mb-6">Trained on raw, unprocessed data without imputation, feature engineering, or SMOTE balancing.</p>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gridDark-textMuted font-mono">Accuracy</span>
                          <span className="text-white font-bold font-mono">94%</span>
                        </div>
                        <div className="h-3 w-full bg-gridDark-cardLight rounded-full overflow-hidden border border-gridDark-border">
                          <div className="h-full bg-risk-medium rounded-full" style={{width: '94%'}}></div>
                        </div>
                        <p className="text-[9px] text-gridDark-textMuted mt-1">Misleadingly high — driven by class imbalance</p>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gridDark-textMuted font-mono">Precision</span>
                          <span className="text-white font-bold font-mono">0%</span>
                        </div>
                        <div className="h-3 w-full bg-gridDark-cardLight rounded-full overflow-hidden border border-gridDark-border">
                          <div className="h-full bg-risk-high rounded-full" style={{width: '0%'}}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gridDark-textMuted font-mono">Recall</span>
                          <span className="text-risk-high font-bold font-mono">0%</span>
                        </div>
                        <div className="h-3 w-full bg-gridDark-cardLight rounded-full overflow-hidden border border-gridDark-border">
                          <div className="h-full bg-risk-high rounded-full" style={{width: '0%'}}></div>
                        </div>
                        <p className="text-[9px] text-risk-high mt-1 font-bold">ZERO failures detected — model is useless for predictive maintenance</p>
                      </div>
                    </div>
                  </div>

                  {/* Improved Model */}
                  <div className="bg-gridDark-bg/60 border border-electric-blue/30 p-6 rounded-xl relative shadow-glow">
                    <div className="absolute top-4 right-4">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-electric-blue/15 text-electric-blue border border-electric-blue/30">GRIDTITAN AI</span>
                    </div>
                    <h4 className="text-sm font-bold text-white mb-1 font-mono">XGBoost + Data-Centric Pipeline</h4>
                    <p className="text-[11px] text-gridDark-textMuted mb-6">KNN Imputation → Feature Engineering → SMOTE Balancing → XGBoost Classification</p>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gridDark-textMuted font-mono">Accuracy</span>
                          <span className="text-white font-bold font-mono">89%</span>
                        </div>
                        <div className="h-3 w-full bg-gridDark-cardLight rounded-full overflow-hidden border border-gridDark-border">
                          <div className="h-full bg-electric-blue rounded-full" style={{width: '89%'}}></div>
                        </div>
                        <p className="text-[9px] text-risk-low mt-1">Lower but honest — reflects real predictive power</p>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gridDark-textMuted font-mono">Precision</span>
                          <span className="text-white font-bold font-mono">79%</span>
                        </div>
                        <div className="h-3 w-full bg-gridDark-cardLight rounded-full overflow-hidden border border-gridDark-border">
                          <div className="h-full bg-electric-blue rounded-full" style={{width: '79%'}}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gridDark-textMuted font-mono">Recall</span>
                          <span className="text-risk-low font-bold font-mono">91%</span>
                        </div>
                        <div className="h-3 w-full bg-gridDark-cardLight rounded-full overflow-hidden border border-gridDark-border">
                          <div className="h-full bg-risk-low rounded-full" style={{width: '91%'}}></div>
                        </div>
                        <p className="text-[9px] text-risk-low mt-1 font-bold">91% of actual failures are correctly identified</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key Insight */}
                <div className="mt-8 p-5 rounded-xl bg-electric-blue/5 border border-electric-blue/20">
                  <h4 className="text-sm font-bold text-electric-blue flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4" />
                    Key Insight: Data-Centric AI
                  </h4>
                  <p className="text-xs text-gridDark-textMuted leading-relaxed">
                    The baseline model achieves 94% accuracy by simply predicting "No Failure" for every input — because failures represent less than 5% of the dataset. 
                    This is the <strong className="text-white">accuracy paradox</strong>. GRIDTITAN's data-centric approach fixes the data (imputation, engineering, balancing) 
                    rather than just tuning the algorithm. The result: <strong className="text-risk-low">91% Recall</strong> — meaning 9 out of 10 actual transformer failures are now caught before they happen.
                    This is the difference between a model that looks good on paper and one that actually <strong className="text-white">prevents blackouts</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 7. AI PIPELINE ARCHITECTURE SECTION */}
          {activeTab === 'architecture' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-gridDark-card border border-gridDark-border p-6 rounded-xl">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-electric-blue" />
                  GRIDTITAN Core AI Model Pipeline Flow
                </h3>
                <p className="text-xs text-gridDark-textMuted mb-8">
                  Technical blueprint showing data clean-up, feature extraction, class-imbalance fixing, classification training, and real-time inference engine.
                </p>

                {/* Pipeline Flow Diagram */}
                <div className="p-8 rounded-xl bg-gridDark-bg/60 border border-gridDark-border relative overflow-x-auto">
                  <div className="min-w-[800px] flex items-center justify-between gap-4 font-mono text-[11px]">
                    
                    {/* Node 1 */}
                    <div className="w-40 p-4 rounded-lg bg-gridDark-cardLight border border-gridDark-border flex flex-col justify-between h-32 hover:border-electric-blue/40 transition-colors">
                      <span className="text-[10px] text-electric-blue font-bold uppercase mb-1">Step 1</span>
                      <h4 className="font-bold text-white text-xs mb-1">Raw SCADA Data</h4>
                      <p className="text-[9px] text-gridDark-textMuted leading-normal">Telemetry logs containing Load, Temperature, Current, Voltage & Power.</p>
                    </div>

                    <div className="flex-1 h-[2px] bg-electric-blue/20 relative">
                      <div className="absolute right-0 top-0 -translate-y-1/2 w-2 h-2 border-t-2 border-r-2 border-electric-blue/60 rotate-45"></div>
                    </div>

                    {/* Node 2 */}
                    <div className="w-40 p-4 rounded-lg bg-gridDark-cardLight border border-gridDark-border flex flex-col justify-between h-32 hover:border-electric-blue/40 transition-colors">
                      <span className="text-[10px] text-electric-blue font-bold uppercase mb-1">Step 2</span>
                      <h4 className="font-bold text-white text-xs mb-1">KNN Imputation</h4>
                      <p className="text-[9px] text-gridDark-textMuted leading-normal">Imputes sensor offline periods using K-Nearest Neighbors nearest-distance averaging.</p>
                    </div>

                    <div className="flex-1 h-[2px] bg-electric-blue/20 relative">
                      <div className="absolute right-0 top-0 -translate-y-1/2 w-2 h-2 border-t-2 border-r-2 border-electric-blue/60 rotate-45"></div>
                    </div>

                    {/* Node 3 */}
                    <div className="w-40 p-4 rounded-lg bg-gridDark-cardLight border border-gridDark-border flex flex-col justify-between h-32 hover:border-electric-blue/40 transition-colors">
                      <span className="text-[10px] text-electric-blue font-bold uppercase mb-1">Step 3</span>
                      <h4 className="font-bold text-white text-xs mb-1">Feature Eng.</h4>
                      <p className="text-[9px] text-gridDark-textMuted leading-normal">Calculates Power Factor, core Impedance, Thermal ratio, Overload Index.</p>
                    </div>

                    <div className="flex-1 h-[2px] bg-electric-blue/20 relative">
                      <div className="absolute right-0 top-0 -translate-y-1/2 w-2 h-2 border-t-2 border-r-2 border-electric-blue/60 rotate-45"></div>
                    </div>

                    {/* Node 4 */}
                    <div className="w-40 p-4 rounded-lg bg-gridDark-cardLight border border-gridDark-border flex flex-col justify-between h-32 hover:border-electric-blue/40 transition-colors">
                      <span className="text-[10px] text-electric-blue font-bold uppercase mb-1">Step 4</span>
                      <h4 className="font-bold text-white text-xs mb-1">SMOTE Balancing</h4>
                      <p className="text-[9px] text-gridDark-textMuted leading-normal">Synthesizes historical failures to resolve class imbalance issues.</p>
                    </div>

                    <div className="flex-1 h-[2px] bg-electric-blue/20 relative">
                      <div className="absolute right-0 top-0 -translate-y-1/2 w-2 h-2 border-t-2 border-r-2 border-electric-blue/60 rotate-45"></div>
                    </div>

                    {/* Node 5 */}
                    <div className="w-40 p-4 rounded-lg bg-gridDark-card border border-electric-blue shadow-glow flex flex-col justify-between h-32">
                      <span className="text-[10px] text-electric-blue font-bold uppercase mb-1">Step 5</span>
                      <h4 className="font-bold text-white text-xs mb-1">XGBoost Classifier</h4>
                      <p className="text-[9px] text-gridDark-textMuted leading-normal">Calculates final failure probability score under boosted tree parameters.</p>
                    </div>
                  </div>
                </div>

                {/* Theoretical background info */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed">
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-white font-mono">1. KNN & Feature Engineering</h4>
                    <p className="text-gridDark-textMuted">
                      Transformer log sheets are prone to sensor outages due to heat stress or communications packet drops. 
                      Instead of dropping rows, which biases model training, the **KNN Imputer** (trained with \(K=3\) neighbors) finds the closest records in multi-dimensional space to fill telemetry.
                    </p>
                    <p className="text-gridDark-textMuted">
                      Our custom **Feature Engineering** leverages electrical principles:
                      <code className="block bg-gridDark-bg p-2 rounded mt-2 border border-gridDark-border text-[11px] font-mono">
                        Power Factor (PF) = Power / (Voltage * Current * 10^-3)<br />
                        Impedance = Voltage / Current
                      </code>
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-white font-mono">2. SMOTE & XGBoost</h4>
                    <p className="text-gridDark-textMuted">
                      Historical utility records are highly imbalanced: failures make up less than 5% of data. 
                      Standard training causes the classifier to ignore failure signals. **SMOTE** (Synthetic Minority Over-sampling Technique) creates synthetic failure records along the line segments joining k-nearest neighbors of the minority class.
                    </p>
                    <p className="text-gridDark-textMuted">
                      **XGBoost** (Extreme Gradient Boosting) builds sequential shallow trees, correcting the residual errors of prior trees. 
                      This gives GRIDTITAN high robustness to localized grid volatility and provides smooth, stable probabilities for proactive scheduling.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 8. BUSINESS IMPACT SECTION */}
          {activeTab === 'impact' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-gridDark-card border border-gridDark-border p-6 rounded-xl">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-electric-blue" />
                  GridTitan Utility-Scale Business Impact Metrics
                </h3>
                <p className="text-xs text-gridDark-textMuted mb-8">
                  Quantifying operating improvements, risk mitigation, and capital expenditures (CAPEX) optimizations enabled by Data-Centric AI forecasting.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Card 1 */}
                  <div className="bg-gridDark-bg/60 border border-gridDark-border p-5 rounded-xl space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-mono font-bold text-electric-blue bg-electric-blue/10 px-2 py-0.5 rounded border border-electric-blue/20">OPERATIONS</span>
                      <TrendingUp className="w-5 h-5 text-electric-blue" />
                    </div>
                    <h4 className="text-sm font-bold text-white">Early Failure Detection</h4>
                    <p className="text-xs text-gridDark-textMuted leading-relaxed">
                      Catches 91% of failure indicators up to 7 days before physical warning thresholds trip, shifting operations from fire fighting to planned interventions.
                    </p>
                  </div>

                  {/* Card 2 */}
                  <div className="bg-gridDark-bg/60 border border-gridDark-border p-5 rounded-xl space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-mono font-bold text-risk-high bg-risk-high/10 px-2 py-0.5 rounded border border-risk-high/20">RISK</span>
                      <AlertTriangle className="w-5 h-5 text-risk-high" />
                    </div>
                    <h4 className="text-sm font-bold text-white">Reduced Outage Risk</h4>
                    <p className="text-xs text-gridDark-textMuted leading-relaxed">
                      Proactively load-shares nodes breaching the 70% probability line, avoiding cascade blackouts that impact regional grid reliability indices.
                    </p>
                  </div>

                  {/* Card 3 */}
                  <div className="bg-gridDark-bg/60 border border-gridDark-border p-5 rounded-xl space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-mono font-bold text-risk-low bg-risk-low/10 px-2 py-0.5 rounded border border-risk-low/20">EFFICIENCY</span>
                      <ShieldCheck className="w-5 h-5 text-risk-low" />
                    </div>
                    <h4 className="text-sm font-bold text-white">Faster Maintenance Dispatch</h4>
                    <p className="text-xs text-gridDark-textMuted leading-relaxed">
                      Generates instant plain-English maintenance advice & root-cause progress bars, cutting troubleshooting window times by over 45%.
                    </p>
                  </div>

                  {/* Card 4 */}
                  <div className="bg-gridDark-bg/60 border border-gridDark-border p-5 rounded-xl space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-mono font-bold text-electric-blue bg-electric-blue/10 px-2 py-0.5 rounded border border-electric-blue/20">ASSETS</span>
                      <Cpu className="w-5 h-5 text-electric-blue" />
                    </div>
                    <h4 className="text-sm font-bold text-white">Asset Life Extension</h4>
                    <p className="text-xs text-gridDark-textMuted leading-relaxed">
                      Prevents severe overheating and dielectric breakdown, prolonging high-value power transformer useful life by 15-20 years.
                    </p>
                  </div>

                  {/* Card 5 */}
                  <div className="bg-gridDark-bg/60 border border-gridDark-border p-5 rounded-xl space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-mono font-bold text-risk-medium bg-risk-medium/10 px-2 py-0.5 rounded border border-risk-medium/20">RELIABILITY</span>
                      <Zap className="w-5 h-5 text-risk-medium" />
                    </div>
                    <h4 className="text-sm font-bold text-white">Improved Grid SAIDI / SAIFI</h4>
                    <p className="text-xs text-gridDark-textMuted leading-relaxed">
                      Directly boosts grid reliability indices by isolating and replacing problematic components during scheduled local maintenance windows.
                    </p>
                  </div>

                  {/* Card 6 */}
                  <div className="bg-gridDark-bg/60 border border-gridDark-border p-5 rounded-xl space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-mono font-bold text-risk-low bg-risk-low/10 px-2 py-0.5 rounded border border-risk-low/20">DECISION SUPPORT</span>
                      <ListTodo className="w-5 h-5 text-risk-low" />
                    </div>
                    <h4 className="text-sm font-bold text-white">Risk-Based Dispatching</h4>
                    <p className="text-xs text-gridDark-textMuted leading-relaxed">
                      Ranks nodes by predicted failure probability rather than arbitrary age metrics, maximizing return on human labor and inspection operations.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 9. FUTURE ROADMAP SECTION */}
          {activeTab === 'roadmap' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-gridDark-card border border-gridDark-border p-6 rounded-xl">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <Milestone className="w-5 h-5 text-electric-blue" />
                  Industrial SCADA & IoT Sensor Integration Roadmap
                </h3>
                <p className="text-xs text-gridDark-textMuted mb-12">
                  Projections for migrating the platform from offline modeling to continuous real-time smart grid operations.
                </p>

                {/* Roadmap timeline path */}
                <div className="relative border-l border-gridDark-border ml-4 md:ml-32 space-y-12">
                  
                  {/* Phase 1 */}
                  <div className="relative pl-8 md:pl-12">
                    {/* Pulsing indicator */}
                    <div className="absolute -left-3 top-1.5 w-6 h-6 rounded-full bg-electric-blue/15 border border-electric-blue/30 flex items-center justify-center">
                      <span className="w-2.5 h-2.5 rounded-full bg-electric-blue animate-pulse"></span>
                    </div>
                    <div className="absolute -left-20 md:-left-32 top-1.5 font-mono text-xs font-bold text-electric-blue">PHASE 1</div>
                    <h4 className="text-base font-bold text-white mb-1">Dynamic SCADA Interface</h4>
                    <p className="text-xs text-gridDark-textMuted max-w-2xl leading-normal">
                      Build direct DNP3 and Modbus protocol connectors to standard substation databases. 
                      Allowing GRIDTITAN to query current transformers, temperature gauges, and circuit breaker status without user uploads.
                    </p>
                  </div>

                  {/* Phase 2 */}
                  <div className="relative pl-8 md:pl-12">
                    <div className="absolute -left-3 top-1.5 w-6 h-6 rounded-full bg-gridDark-card border border-gridDark-border flex items-center justify-center">
                      <span className="w-2.5 h-2.5 rounded-full bg-gridDark-textMuted"></span>
                    </div>
                    <div className="absolute -left-20 md:-left-32 top-1.5 font-mono text-xs font-bold text-gridDark-textMuted">PHASE 2</div>
                    <h4 className="text-base font-bold text-white mb-1">IoT Transformer Dissolved Gas Sensors (DGA)</h4>
                    <p className="text-xs text-gridDark-textMuted max-w-2xl leading-normal">
                      Incorporate live sensor outputs from optical oil gas detectors (hydrogen, carbon monoxide, acetylene) to capture winding hotspots before thermal sensors register spikes.
                    </p>
                  </div>

                  {/* Phase 3 */}
                  <div className="relative pl-8 md:pl-12">
                    <div className="absolute -left-3 top-1.5 w-6 h-6 rounded-full bg-gridDark-card border border-gridDark-border flex items-center justify-center">
                      <span className="w-2.5 h-2.5 rounded-full bg-gridDark-textMuted"></span>
                    </div>
                    <div className="absolute -left-20 md:-left-32 top-1.5 font-mono text-xs font-bold text-gridDark-textMuted">PHASE 3</div>
                    <h4 className="text-base font-bold text-white mb-1">Predictive Grid Network Heatmaps</h4>
                    <p className="text-xs text-gridDark-textMuted max-w-2xl leading-normal">
                      Expand leaflet mapping into an active network graph. 
                      Model how failure of a critical high-risk transformer ripples loads to adjacent substations, creating an automated reactive overload simulator.
                    </p>
                  </div>

                  {/* Phase 4 */}
                  <div className="relative pl-8 md:pl-12">
                    <div className="absolute -left-3 top-1.5 w-6 h-6 rounded-full bg-gridDark-card border border-gridDark-border flex items-center justify-center">
                      <span className="w-2.5 h-2.5 rounded-full bg-gridDark-textMuted"></span>
                    </div>
                    <div className="absolute -left-20 md:-left-32 top-1.5 font-mono text-xs font-bold text-gridDark-textMuted">PHASE 4</div>
                    <h4 className="text-base font-bold text-white mb-1">Autonomous Dispatch & Alert Relays</h4>
                    <p className="text-xs text-gridDark-textMuted max-w-2xl leading-normal">
                      Hook notifications up to SMS/Email dispatching boards. 
                      Dynamically log work tickets on maintenance management suites (e.g. Maximo, SAP PM) when transformer risk breaches the critical 70% threshold.
                    </p>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* WORKFORCE OPERATIONS CENTRE */}
          {activeTab === 'workforce' && (
            <div className="space-y-6 animate-fadeIn">

              {/* Sub-tab bar */}
              <div className="flex gap-2 border-b border-gridDark-border pb-4">
                {[
                  { id: 'employees',      label: 'Employee Directory', icon: Users },
                  { id: 'dispatch',       label: 'Task Dispatch',      icon: Send  },
                  { id: 'notifications',  label: 'Notifications',      icon: Bell  },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setWorkforceTab(id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all ${
                      workforceTab === id
                        ? 'bg-electric-blue/15 text-electric-blue border border-electric-blue/40'
                        : 'text-gridDark-textMuted hover:text-white hover:bg-gridDark-cardLight border border-transparent'
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {label}
                    {id === 'notifications' && notifications.filter(n => !n.read).length > 0 && (
                      <span className="ml-1 bg-risk-high text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                        {notifications.filter(n => !n.read).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* ── 1. EMPLOYEE DIRECTORY ───────────────────────────────────── */}
              {workforceTab === 'employees' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {employees.map(emp => {
                      const statusColor =
                        emp.status === 'Online'      ? 'text-risk-low   bg-risk-low/10   border-risk-low/30' :
                        emp.status === 'On-Site'     ? 'text-electric-blue bg-electric-blue/10 border-electric-blue/30' :
                        emp.status === 'In Transit'  ? 'text-risk-medium bg-risk-medium/10 border-risk-medium/30' :
                        emp.status === 'Available'   ? 'text-risk-low   bg-risk-low/10   border-risk-low/30' :
                                                       'text-gridDark-textMuted bg-gridDark-cardLight border-gridDark-border';
                      const roleColor =
                        emp.role === 'Administrator' ? 'text-electric-blue' :
                        emp.role === 'Supervisor'    ? 'text-risk-medium' : 'text-gridDark-textMuted';
                      return (
                        <div key={emp.id} className="bg-gridDark-card border border-gridDark-border rounded-xl p-4 hover:border-electric-blue/40 transition-all space-y-3">
                          {/* Avatar + Name */}
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm font-mono ${
                              emp.role === 'Administrator' ? 'bg-electric-blue/20 text-electric-blue border border-electric-blue/40' :
                              emp.role === 'Supervisor' ? 'bg-risk-medium/20 text-risk-medium border border-risk-medium/40' :
                              'bg-gridDark-cardLight text-white border border-gridDark-border'
                            }`}>
                              {emp.avatar}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-white truncate">{emp.name}</p>
                              <p className={`text-[10px] font-mono font-bold ${roleColor}`}>{emp.role}</p>
                            </div>
                            {emp.role === 'Administrator' && (
                              <Shield className="w-4 h-4 text-electric-blue flex-shrink-0" />
                            )}
                          </div>

                          {/* Details */}
                          <div className="space-y-1.5 text-[11px] font-mono">
                            <div className="flex items-center gap-1.5 text-gridDark-textMuted">
                              <MapPin className="w-3 h-3" />
                              <span>{emp.section}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gridDark-textMuted">
                              <Phone className="w-3 h-3" />
                              <span>{emp.phone}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gridDark-textMuted">
                              <UserCheck className="w-3 h-3" />
                              <span>{emp.authorized.join(', ')}</span>
                            </div>
                          </div>

                          {/* ID + Status */}
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-mono text-gridDark-textMuted bg-gridDark-cardLight px-2 py-0.5 rounded border border-gridDark-border">
                              {emp.id}
                            </span>
                            <span className={`text-[9px] font-mono font-extrabold px-2 py-0.5 rounded border ${statusColor}`}>
                              ● {emp.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex gap-4 text-[10px] font-mono text-gridDark-textMuted px-1">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-risk-low inline-block"></span> Online / Available</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-electric-blue inline-block"></span> On-Site</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-risk-medium inline-block"></span> In Transit</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gridDark-textMuted inline-block"></span> Off Duty</span>
                  </div>
                </div>
              )}

              {/* ── 2. TASK DISPATCH BOARD ─────────────────────────────────── */}
              {workforceTab === 'dispatch' && (
                <div className="space-y-4">
                  {/* Pipeline stage legend */}
                  <div className="bg-gridDark-card border border-gridDark-border rounded-xl p-4">
                    <p className="text-[10px] font-mono font-bold text-gridDark-textMuted uppercase tracking-widest mb-3">Task Status Pipeline</p>
                    <div className="flex items-center gap-0">
                      {['Scheduled','Dispatched','In Transit','Reached','Completed'].map((s, i, arr) => (
                        <React.Fragment key={s}>
                          <div className={`flex flex-col items-center px-3 py-1.5 rounded text-[10px] font-mono font-bold ${
                            s === 'Scheduled'  ? 'text-gridDark-textMuted bg-gridDark-cardLight' :
                            s === 'Dispatched' ? 'text-electric-blue bg-electric-blue/10' :
                            s === 'In Transit' ? 'text-risk-medium bg-risk-medium/10' :
                            s === 'Reached'    ? 'text-risk-low bg-risk-low/10' :
                                                 'text-white bg-risk-low/20'
                          }`}>
                            {s === 'Scheduled'  && <Clock className="w-3 h-3 mb-0.5" />}
                            {s === 'Dispatched' && <Send className="w-3 h-3 mb-0.5" />}
                            {s === 'In Transit' && <MapPin className="w-3 h-3 mb-0.5" />}
                            {s === 'Reached'    && <CheckCircle2 className="w-3 h-3 mb-0.5" />}
                            {s === 'Completed'  && <CheckCheck className="w-3 h-3 mb-0.5" />}
                            {s}
                          </div>
                          {i < arr.length - 1 && <ChevronRight className="w-4 h-4 text-gridDark-border mx-0.5 flex-shrink-0" />}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  {/* Task cards */}
                  <div className="space-y-3">
                    {tasks.map(task => {
                      const stages = ['Scheduled','Dispatched','In Transit','Reached','Completed'];
                      const stageIdx = stages.indexOf(task.status);
                      const priorityColor =
                        task.priority === 'Critical' ? 'text-risk-high  border-risk-high/40  bg-risk-high/10' :
                        task.priority === 'High'     ? 'text-risk-medium border-risk-medium/40 bg-risk-medium/10' :
                        task.priority === 'Medium'   ? 'text-electric-blue border-electric-blue/40 bg-electric-blue/10' :
                                                       'text-gridDark-textMuted border-gridDark-border bg-gridDark-cardLight';
                      return (
                        <div key={task.id} className="bg-gridDark-card border border-gridDark-border rounded-xl p-5 hover:border-electric-blue/30 transition-all">
                          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-[9px] font-mono text-gridDark-textMuted bg-gridDark-cardLight px-1.5 py-0.5 rounded border border-gridDark-border">{task.id}</span>
                                <span className={`text-[9px] font-mono font-extrabold px-2 py-0.5 rounded border ${priorityColor}`}>{task.priority}</span>
                                <span className="text-[9px] font-mono text-gridDark-textMuted">Auth: {task.authorizedBy}</span>
                              </div>
                              <h4 className="text-sm font-bold text-white">{task.title}</h4>
                              <p className="text-[11px] text-gridDark-textMuted mt-1 font-mono">{task.notes}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs font-bold text-white font-mono">{task.assignedName}</p>
                              <p className="text-[10px] text-gridDark-textMuted">{task.assignedTo} · {task.zone}</p>
                              <p className="text-[10px] text-electric-blue font-mono">⏰ {task.scheduledAt}</p>
                            </div>
                          </div>

                          {/* Progress pipeline bar */}
                          <div className="flex items-center gap-1">
                            {stages.map((s, i) => (
                              <div key={s} className="flex-1 flex flex-col items-center gap-1">
                                <div className={`w-full h-1.5 rounded-full transition-all ${
                                  i <= stageIdx ? (
                                    task.status === 'Completed' ? 'bg-risk-low' :
                                    task.status === 'Reached'   ? 'bg-risk-low' :
                                    task.status === 'In Transit'? 'bg-risk-medium' :
                                    'bg-electric-blue'
                                  ) : 'bg-gridDark-border'
                                }`} />
                                <span className={`text-[8px] font-mono hidden sm:block ${i <= stageIdx ? 'text-white' : 'text-gridDark-textMuted/50'}`}>{s}</span>
                              </div>
                            ))}
                          </div>

                          {/* Advance status button */}
                          {task.status !== 'Completed' && (
                            <button
                              onClick={() => {
                                const next = stages[stageIdx + 1];
                                setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: next } : t));
                                
                                // Map task status to employee status
                                let empStatus = 'Available';
                                if (next === 'Dispatched') empStatus = 'Online';
                                else if (next === 'In Transit') empStatus = 'In Transit';
                                else if (next === 'Reached') empStatus = 'On-Site';
                                else if (next === 'Completed') empStatus = 'Available';

                                setEmployees(prev => prev.map(e => e.id === task.assignedTo ? { ...e, status: empStatus } : e));

                                const emp = employees.find(e => e.id === task.assignedTo);
                                const newNotif = {
                                  id: `NTF-${Date.now()}`,
                                  type: 'received',
                                  from: task.assignedTo,
                                  to: task.authorizedBy,
                                  message: `Status update for ${task.id}: Now "${next}" — ${task.transformer} at ${task.zone}.`,
                                  time: liveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
                                  read: false
                                };
                                setNotifications(prev => [newNotif, ...prev]);
                              }}
                              className="mt-3 text-[10px] font-mono font-bold px-3 py-1.5 rounded border border-electric-blue/30 text-electric-blue hover:bg-electric-blue/10 transition-colors"
                            >
                              → Advance to: {stages[stageIdx + 1]}
                            </button>
                          )}
                          {task.status === 'Completed' && (
                            <div className="mt-3 flex items-center gap-1.5 text-[10px] font-mono text-risk-low">
                              <CheckCheck className="w-3 h-3" /> Task Completed Successfully
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── 3. NOTIFICATION CENTRE ────────────────────────────────── */}
              {workforceTab === 'notifications' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Send new notification */}
                  <div className="bg-gridDark-card border border-gridDark-border rounded-xl p-5 space-y-4 h-fit">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Send className="w-4 h-4 text-electric-blue" /> Send Notification
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-mono font-bold text-gridDark-textMuted uppercase">To</label>
                        <select
                          value={newNotifTo}
                          onChange={e => setNewNotifTo(e.target.value)}
                          className="w-full mt-1 bg-gridDark-bg border border-gridDark-border rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-electric-blue/60"
                        >
                          {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-mono font-bold text-gridDark-textMuted uppercase">Message</label>
                        <textarea
                          value={newNotifText}
                          onChange={e => setNewNotifText(e.target.value)}
                          placeholder="Type your message..."
                          rows={4}
                          className="w-full mt-1 bg-gridDark-bg border border-gridDark-border rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-electric-blue/60 resize-none"
                        />
                      </div>
                      <button
                        onClick={() => {
                          if (!newNotifText.trim()) return;
                          const toEmp = employees.find(e => e.id === newNotifTo);
                          setNotifications(prev => [{
                            id: `NTF-${Date.now()}`,
                            type: 'sent',
                            from: 'ADM-001',
                            to: newNotifTo,
                            message: newNotifText.trim(),
                            time: liveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
                            read: true
                          }, ...prev]);
                          setNewNotifText('');
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-electric-blue/15 hover:bg-electric-blue/25 text-electric-blue text-xs font-bold py-2.5 rounded-lg border border-electric-blue/30 transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" /> Send Message
                      </button>
                    </div>
                  </div>

                  {/* Notification feed */}
                  <div className="lg:col-span-2 bg-gridDark-card border border-gridDark-border rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gridDark-border">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Bell className="w-4 h-4 text-electric-blue" /> Message Feed
                      </h3>
                      <button
                        onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                        className="text-[10px] font-mono text-gridDark-textMuted hover:text-white transition-colors"
                      >
                        Mark all read
                      </button>
                    </div>
                    <div className="divide-y divide-gridDark-border max-h-[520px] overflow-y-auto">
                      {notifications.map(notif => {
                        const typeIcon =
                          notif.type === 'sent'     ? <Send     className="w-3.5 h-3.5 text-electric-blue flex-shrink-0" /> :
                          notif.type === 'system'   ? <Zap      className="w-3.5 h-3.5 text-risk-medium  flex-shrink-0" /> :
                                                      <Phone    className="w-3.5 h-3.5 text-risk-low     flex-shrink-0" />;
                        const bgClass = !notif.read ? 'bg-electric-blue/5' : '';
                        return (
                          <div
                            key={notif.id}
                            className={`px-5 py-3 hover:bg-gridDark-cardLight/30 transition-colors cursor-pointer ${bgClass}`}
                            onClick={() => setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))}
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5">{typeIcon}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                  <span className="text-[10px] font-mono font-bold text-white">{notif.from}</span>
                                  <ChevronRight className="w-3 h-3 text-gridDark-textMuted" />
                                  <span className="text-[10px] font-mono text-gridDark-textMuted">{notif.to}</span>
                                  {!notif.read && <span className="w-1.5 h-1.5 rounded-full bg-electric-blue inline-block" />}
                                </div>
                                <p className="text-xs text-gridDark-textMuted leading-relaxed">{notif.message}</p>
                              </div>
                              <span className="text-[9px] font-mono text-gridDark-textMuted flex-shrink-0 mt-0.5">{notif.time}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      </main>
    </div>
  );
}
