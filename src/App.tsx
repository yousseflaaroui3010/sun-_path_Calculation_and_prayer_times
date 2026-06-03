import React, { useState, useEffect } from 'react';
import { ViewMode, LocationPreset, PrayerTime, AdhanConvention } from './types';
import { ThreeCanvas } from './components/ThreeCanvas';
import {
  LOCATION_PRESETS,
  CONVENTIONS,
  calculatePrayerTimes,
  getSunDetailsForTime,
  getDaylightHours,
  getSeason,
  formatTimeInTimezone,
  solveAltitudeTimes
} from './utils/astronomy';
import {
  Compass,
  Globe,
  Settings,
  MapPin,
  Calendar,
  Clock,
  Navigation,
  BookOpen,
  Sun,
  Moon,
  TrendingUp,
  RotateCcw,
  Award,
  Sliders,
  Eye,
  Activity
} from 'lucide-react';

export default function App() {
  // Navigation active tab deck state
  const [activeTab, setActiveTab] = useState<'solvers' | 'telemetry' | 'location'>('solvers');

  // Observer Location State (Defaults to Casablanca, Morocco)
  const [selectedLocation, setSelectedLocation] = useState<LocationPreset>(LOCATION_PRESETS[0]);
  const [customLat, setCustomLat] = useState<string>(LOCATION_PRESETS[0].latitude.toString());
  const [customLng, setCustomLng] = useState<string>(LOCATION_PRESETS[0].longitude.toString());
  const [useCustomLocation, setUseCustomLocation] = useState<boolean>(false);

  // Time-of-day: fraction from midnight (0 to 1439 local minutes)
  const [timeMinutes, setTimeMinutes] = useState<number>(9 * 60 + 19); // 09:19 AM default local Casablanca standard time

  // Calibrated Calendar Date state variables
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(5); // 0-indexed: June is 5
  const [selectedDay, setSelectedDay] = useState<number>(3); // 3rd of June

  // Astronomy constraints and parameters
  const [convention, setConvention] = useState<AdhanConvention>('Morocco');
  const [isHanafi, setIsHanafi] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>('dome');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [trackingTarget, setTrackingTarget] = useState<'sun' | 'earth'>('sun');
  
  // Custom interactive elevation solver variable (-19° Moroccan Fajr default)
  const [solverAltitude, setSolverAltitude] = useState<number>(-19.0);
  const [activePrayerHighlight, setActivePrayerHighlight] = useState<string | null>(null);

  // Construct stable, offset-calibrated UTC target Dates
  const getCombinedDate = (): Date => {
    const hrs = Math.floor(timeMinutes / 60);
    const mins = timeMinutes % 60;
    // Calculate precise UTC epoch representation by subtracting local time offset
    const utcMs = Date.UTC(selectedYear, selectedMonth, selectedDay, hrs, mins, 0, 0) - (selectedLocation.utcOffset * 60 * 60 * 1000);
    return new Date(utcMs);
  };

  // Re-sync coordinates fields if preset is selected
  const handlePresetSelect = (preset: LocationPreset) => {
    setSelectedLocation(preset);
    setCustomLat(preset.latitude.toString());
    setCustomLng(preset.longitude.toString());
    setUseCustomLocation(false);
    setActivePrayerHighlight(null);
  };

  // Manual input apply
  const handleCustomLocationApply = () => {
    const lat = parseFloat(customLat);
    const lng = parseFloat(customLng);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      alert("Invalid Coordinates! Latitude must be between [-90, 90] and Longitude between [-180, 180].");
      return;
    }

    // Auto calculate approximate GMT offset based on longitude (15 degrees per clock hour)
    const calculatedOffset = Math.round(lng / 15);
    
    const customPreset: LocationPreset = {
      name: `Custom Location (${lat.toFixed(3)}°, ${lng.toFixed(3)}°)`,
      country: 'Observer Coordinates',
      latitude: lat,
      longitude: lng,
      timezone: `GMT${calculatedOffset >= 0 ? '+' : ''}${calculatedOffset}`,
      utcOffset: calculatedOffset,
      description: 'Manually keyed geographic observer coordinates.'
    };

    setSelectedLocation(customPreset);
    setUseCustomLocation(true);
    setActivePrayerHighlight(null);
  };

  // Immediate reactive application of custom coordinates as the user inputs them
  useEffect(() => {
    const lat = parseFloat(customLat);
    const lng = parseFloat(customLng);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      const calculatedOffset = Math.round(lng / 15);
      const livePreset: LocationPreset = {
        name: `Custom (${lat.toFixed(3)}°, ${lng.toFixed(3)}°)`,
        country: 'User Input Coordinate',
        latitude: lat,
        longitude: lng,
        timezone: `gmt${calculatedOffset >= 0 ? '+' : ''}${calculatedOffset}`,
        utcOffset: calculatedOffset,
        description: 'Manually specified observer coordinate.'
      };
      setSelectedLocation(livePreset);
      setUseCustomLocation(true);
    }
  }, [customLat, customLng]);

  // Active simulation playback state timer
  useEffect(() => {
    if (!isPlaying) return;

    let animFrame: number;
    let lastTick = performance.now();

    const tick = () => {
      const now = performance.now();
      const elapsedMs = now - lastTick;
      if (elapsedMs >= 30) { // update every ~30ms for smooth motion
        lastTick = now;
        
        // Advance timeMinutes by 1.5 minutes per tick (equal to what ThreeCanvas was doing)
        setTimeMinutes(prev => {
          let next = prev + 1.5;
          if (next >= 1440) {
            next = next % 1440;
            // Advance day helper
            setSelectedDay(d => {
              const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
              let nextD = d + 1;
              if (nextD > daysInMonth) {
                nextD = 1;
                setSelectedMonth(m => {
                  let nextM = m + 1;
                  if (nextM > 11) {
                    nextM = 0;
                    setSelectedYear(y => y + 1);
                  }
                  return nextM;
                });
              }
              return nextD;
            });
          }
          return next;
        });
      }
      animFrame = requestAnimationFrame(tick);
    };

    animFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame);
  }, [isPlaying, selectedYear, selectedMonth]);

  const activeDate = getCombinedDate();
  const sunDetails = getSunDetailsForTime(activeDate, selectedLocation.latitude, selectedLocation.longitude);
  const daylight = getDaylightHours(activeDate, selectedLocation.latitude, selectedLocation.longitude);
  const currentSeason = getSeason(activeDate, selectedLocation.latitude < 0);

  // Stable Local Noon reference ensures prayer times do not shift as times slider moves across UTC transition bounds
  const stableNoonReferenceDate = new Date(Date.UTC(selectedYear, selectedMonth, selectedDay, 12, 0, 0, 0) - (selectedLocation.utcOffset * 60 * 60 * 1000));
  const prayerTimes = calculatePrayerTimes(stableNoonReferenceDate, selectedLocation.latitude, selectedLocation.longitude, convention, selectedLocation.utcOffset, isHanafi);
  const altitudeSolution = solveAltitudeTimes(stableNoonReferenceDate, selectedLocation.latitude, selectedLocation.longitude, solverAltitude);

  // Sample diurnal solar altitudes for our Telemetry SVG Graph
  const diurnalPoints: { hour: number; altitude: number; localTime: string }[] = [];
  const startOfDayLocal = new Date(Date.UTC(selectedYear, selectedMonth, selectedDay, 0, 0, 0, 0) - (selectedLocation.utcOffset * 60 * 60 * 1000));
  for (let m = 0; m <= 1440; m += 15) {
    const sampleTime = new Date(startOfDayLocal.getTime() + m * 60 * 1000);
    const samplePos = getSunDetailsForTime(sampleTime, selectedLocation.latitude, selectedLocation.longitude);
    
    const h = Math.floor(m / 60);
    const minStr = (m % 60).toString().padStart(2, '0');
    diurnalPoints.push({
      hour: m / 60,
      altitude: samplePos.altitude,
      localTime: `${h.toString().padStart(2, '0')}:${minStr}`
    });
  }

  // Handle graph clicks – Jump simulation to click location on the diurnal line
  const handleGraphClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const paddingLeft = 40;
    const paddingRight = 15;
    const graphWidth = rect.width - paddingLeft - paddingRight;
    
    if (clickX >= paddingLeft && clickX <= rect.width - paddingRight) {
      const fraction = (clickX - paddingLeft) / graphWidth;
      const targetMins = Math.round(fraction * 1440);
      setTimeMinutes(Math.max(0, Math.min(1439, targetMins)));
      setIsPlaying(false);
    }
  };

  // Core visual jumps for prayer times
  const jumpToSolarEvent = (pt: PrayerTime) => {
    if (!pt.timestamp || isNaN(pt.timestamp.getTime())) return;
    const shifted = new Date(pt.timestamp.getTime() + selectedLocation.utcOffset * 60 * 60 * 1000);
    setTimeMinutes(shifted.getUTCHours() * 60 + shifted.getUTCMinutes());
    setActivePrayerHighlight(pt.id);
    setIsPlaying(false);
  };

  const handleFlowTimeUpdate = (newDateTime: Date) => {
    const shifted = new Date(newDateTime.getTime() + selectedLocation.utcOffset * 60 * 60 * 1000);
    setTimeMinutes(shifted.getUTCHours() * 60 + shifted.getUTCMinutes());
    
    // Crosses calendar date
    if (shifted.getUTCHours() === 0 && shifted.getUTCMinutes() === 0) {
      const nextRef = new Date(Date.UTC(selectedYear, selectedMonth, selectedDay + 1, 12, 0, 0, 0));
      setSelectedYear(nextRef.getUTCFullYear());
      setSelectedMonth(nextRef.getUTCMonth());
      setSelectedDay(nextRef.getUTCDate());
    }
  };

  // Browser navigator geolocation finders
  const handleGeolocate = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCustomLat(lat.toString());
          setCustomLng(lng.toString());
          
          const livePreset: LocationPreset = {
            name: 'Device Geolocation',
            country: 'Browser Sensor',
            latitude: lat,
            longitude: lng,
            timezone: 'Local UTC Sensor',
            utcOffset: -new Date().getTimezoneOffset() / 60,
            description: 'Geolocated coordinate matched matches browser sensor.'
          };
          setSelectedLocation(livePreset);
          setUseCustomLocation(true);
          setActivePrayerHighlight(null);
        },
        () => {
          alert("Could not access browser device coordinates. Please type manually inside coordinates fields.");
        }
      );
    } else {
      alert("Geolocation coordinates sensor is not compatible with this browser variant.");
    }
  };

  const handleDateStringChange = (dateStr: string) => {
    if (!dateStr) return;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      setSelectedYear(parseInt(parts[0]));
      setSelectedMonth(parseInt(parts[1]) - 1);
      setSelectedDay(parseInt(parts[2]));
      setActivePrayerHighlight(null);
    }
  };

  const resetToInstructionTime = () => {
    setSelectedYear(2026);
    setSelectedMonth(5); // June
    setSelectedDay(3);
    setTimeMinutes(8 * 60 + 36); // 08:36
    setIsPlaying(false);
  };

  const formatMinutes = (m: number): string => {
    const hrs = Math.floor(m / 60);
    const mins = m % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const getAzimuthDescriptive = (deg: number): string => {
    const d = (deg + 360) % 360;
    if (d >= 337.5 || d < 22.5) return `${d.toFixed(1)}° (N)`;
    if (d >= 22.5 && d < 67.5) return `${d.toFixed(1)}° (NE)`;
    if (d >= 67.5 && d < 112.5) return `${d.toFixed(1)}° (E)`;
    if (d >= 112.5 && d < 157.5) return `${d.toFixed(1)}° (SE)`;
    if (d >= 157.5 && d < 202.5) return `${d.toFixed(1)}° (S)`;
    if (d >= 202.5 && d < 247.5) return `${d.toFixed(1)}° (SW)`;
    if (d >= 247.5 && d < 292.5) return `${d.toFixed(1)}° (W)`;
    return `${d.toFixed(1)}° (NW)`;
  };

  return (
    <div className="min-h-screen bg-[#030610] text-[#e2e8f0] flex flex-col font-sans antialiased">
      
      {/* Editorial Responsive Header */}
      <header className="border-b border-[#1e293b]/70 bg-[#070d1e]/90 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-[#0ea5e9] to-[#fbbf24] rounded-xl shadow-inner shadow-black/60">
            <Compass className="text-[#030712] w-6 h-6 animate-spin duration-10000" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              Celestial Heliocentric & Solar Path Tracker 
              <span className="text-[10px] font-mono font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">v3.5 Precise Astronomy</span>
            </h1>
            <p className="text-xs text-slate-400">Solar altitude analysis, Adhan Solvers, axial tilted Earth orbit & local dome simulation</p>
          </div>
        </div>

        {/* Rapid control utilities */}
        <div className="flex items-center gap-3.5">
          <div className="bg-[#0b132a]/80 border border-slate-800 rounded-lg px-3 py-1 text-xs text-slate-300 flex items-center gap-2 font-mono">
            <MapPin size={13} className="text-cyan-400" />
            <span>{selectedLocation.name} {selectedLocation.timezone}</span>
          </div>

          <button
            onClick={resetToInstructionTime}
            className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg transition"
            title="Restore simulation timelines"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </header>

      {/* Main Responsive Grid Layout (Zero Overflow Bottom Blocking Footer) */}
      <main className="flex-1 p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto w-full">
        
        {/* LEFT COMPONENT: 3D interactive WebGL viewport */}
        <section className="lg:col-span-7 flex flex-col gap-4 h-[450px] sm:h-[550px] lg:h-[calc(100vh-140px)] min-h-[380px]">
          {/* Sub-header rendering state chips */}
          <div className="bg-[#070d1e] p-1.5 rounded-xl border border-slate-800/80 flex items-center justify-between shadow-md">
            <h2 className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase pl-2 flex items-center gap-2">
              <Activity size={12} className="text-cyan-400" /> ACTIVE VIEWMODE
            </h2>

            <div className="flex items-center gap-1 font-semibold text-xs text-slate-300">
              <button
                onClick={() => setViewMode('dome')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'dome' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'hover:bg-slate-800/50'}`}
              >
                1. Local Dome
              </button>
              <button
                onClick={() => setViewMode('globe')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'globe' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'hover:bg-slate-800/50'}`}
              >
                2. World Globe
              </button>
              <button
                onClick={() => setViewMode('orbit')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'orbit' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'hover:bg-slate-800/50'}`}
              >
                3. Helios Orbit
              </button>
            </div>
          </div>

          {/* Core Interactive WebGL container */}
          <div className="flex-1 relative">
            <ThreeCanvas
              viewMode={viewMode}
              location={selectedLocation}
              date={activeDate}
              sunDetails={sunDetails}
              prayerTimes={prayerTimes}
              onTimeChange={handleFlowTimeUpdate}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              trackingTarget={trackingTarget}
              setTrackingTarget={setTrackingTarget}
            />
          </div>

          {/* Bottom aligned time scrubber controller */}
          <div className="bg-[#070d1e] border border-slate-800 rounded-xl p-4 flex flex-col gap-2.5 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold">
                <Clock size={14} className="text-amber-400" />
                <span>OBSERVER LOCAL DIURNAL TIMELINE</span>
              </div>
              
              <div className="flex items-center gap-2 font-mono text-xs bg-slate-950/80 border border-slate-800 p-1 px-2.5 rounded text-amber-400 font-extrabold shadow-inner">
                <span>{selectedDateStringChangeReadable(selectedYear, selectedMonth, selectedDay)}</span>
                <span className="text-slate-500 font-normal">|</span>
                <span>{formatMinutes(timeMinutes)} AM/PM</span>
              </div>
            </div>

            <div className="relative pt-1">
              <input
                type="range"
                min="0"
                max="1439"
                value={timeMinutes}
                onChange={(e) => {
                  setTimeMinutes(parseInt(e.target.value));
                  setActivePrayerHighlight(null);
                }}
                className="w-full h-1.5 bg-slate-850 rounded appearance-none cursor-pointer accent-amber-500 outline-none hover:bg-slate-800 transition"
              />
              <div className="flex justify-between text-[8px] font-mono text-slate-500 pt-1">
                <span>00:00 (Midnight)</span>
                <span>06:00 (Dawn)</span>
                <span>12:00 (Noon Solar Zenith)</span>
                <span>18:00 (Sol Sunset)</span>
                <span>23:59 (Midnight)</span>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT COMPONENT: Elegant Tabbed Controls Deck */}
        <section className="lg:col-span-5 flex flex-col gap-4 lg:h-[calc(100vh-140px)] min-h-[450px]">
          
          {/* Tab Navigation buttons */}
          <div className="bg-[#070d1e] p-1 rounded-xl border border-slate-800/80 flex shadow-md shrink-0">
            <button
              onClick={() => setActiveTab('solvers')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${activeTab === 'solvers' ? 'bg-[#0f172a] text-[#06b6d4] border border-[#1e293b]/50 shadow-inner' : 'text-slate-400 hover:text-white'}`}
            >
              <Award size={13} className="text-[#06b6d4]" />
              <span>Timings & Solver</span>
            </button>
            <button
              onClick={() => setActiveTab('telemetry')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${activeTab === 'telemetry' ? 'bg-[#0f172a] text-[#06b6d4] border border-[#1e293b]/50 shadow-inner' : 'text-slate-400 hover:text-white'}`}
            >
              <TrendingUp size={13} className="text-[#eab308]" />
              <span>Solar Telemetry</span>
            </button>
            <button
              onClick={() => setActiveTab('location')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${activeTab === 'location' ? 'bg-[#0f172a] text-[#06b6d4] border border-[#1e293b]/50 shadow-inner' : 'text-slate-400 hover:text-white'}`}
            >
              <Globe size={13} className="text-[#10b981]" />
              <span>Coordinates Preset</span>
            </button>
          </div>

          {/* Render target tab window */}
          <div className="flex-1 lg:overflow-y-auto pr-1 flex flex-col gap-4">
            
            {/* TAB 1: solvers AND ADHAN */}
            {activeTab === 'solvers' && (
              <div className="flex flex-col gap-4">
                {/* Algorithmic settings and conventions */}
                <div className="bg-[#070d1e] border border-slate-800/80 rounded-xl p-4 flex flex-col gap-3 shadow-md">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block tracking-wider font-extrabold border-b border-slate-800 pb-1.5">🔬 TWILIGHT CONSTANTS SELECTORS</span>
                  
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-[9px] font-mono text-slate-500 block mb-1">Convention Method</label>
                      <select
                        value={convention}
                        onChange={(e) => setConvention(e.target.value as AdhanConvention)}
                        className="w-full bg-[#030610] border border-slate-800 rounded-lg px-2 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                      >
                        {CONVENTIONS.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-mono text-slate-550 block mb-1">Asr Shadow Juristic Rule</label>
                      <div className="flex bg-[#030610] border border-slate-800 p-0.5 rounded-lg">
                        <button
                          onClick={() => setIsHanafi(false)}
                          className={`flex-1 text-[10px] py-1 rounded-md text-center transition cursor-pointer font-semibold ${!isHanafi ? 'bg-[#0e223d] text-cyan-300 font-bold' : 'text-slate-400'}`}
                        >
                          Standard (1x)
                        </button>
                        <button
                          onClick={() => setIsHanafi(true)}
                          className={`flex-1 text-[10px] py-1 rounded-md text-center transition cursor-pointer font-semibold ${isHanafi ? 'bg-[#0e223d] text-cyan-300 font-bold' : 'text-slate-400'}`}
                        >
                          Hanafi (2x)
                        </button>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 italic font-mono pt-1 leading-relaxed">
                    ⚙️ {CONVENTIONS.find(c => c.id === convention)?.description}
                  </p>
                </div>

                {/* ADHAN TIMINGS LIST WITH QUICK SNAP BUTTONS */}
                <div className="bg-[#070d1e] border border-slate-800/80 rounded-xl p-4 flex flex-col gap-2.5 shadow-md">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block tracking-wider font-extrabold border-b border-slate-800 pb-1.5">🕌 CHRONOLOGICAL ADHAN SOLAR ANGLES</span>
                  <div className="flex flex-col gap-2">
                    {prayerTimes.map(pt => {
                      const isSelected = activePrayerHighlight === pt.id;
                      
                      let badgeColor = 'bg-[#38bdf8]/10 text-[#38bdf8] border-[#38bdf8]/20';
                      if (pt.id === 'fajr') badgeColor = 'bg-[#a855f7]/10 text-purple-300 border-[#a855f7]/20';
                      if (pt.id === 'shorooq') badgeColor = 'bg-[#f97316]/10 text-orange-300 border-[#f97316]/20';
                      if (pt.id === 'dhuhr') badgeColor = 'bg-[#facc15]/10 text-yellow-300 border-[#facc15]/20';
                      if (pt.id === 'asr') badgeColor = 'bg-[#eab308]/10 text-amber-300 border-[#eab308]/20';
                      if (pt.id === 'maghrib') badgeColor = 'bg-[#ef4444]/10 text-rose-300 border-[#ef4444]/20';
                      if (pt.id === 'isha') badgeColor = 'bg-[#4f46e5]/10 text-indigo-300 border-[#4f46e5]/20';

                      return (
                        <button
                          key={pt.id}
                          onClick={() => jumpToSolarEvent(pt)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left group cursor-pointer ${isSelected ? 'bg-slate-900 border-cyan-400 ring-1 ring-cyan-500/25' : 'bg-[#030610]/40 border-slate-800 hover:border-slate-705'}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-0.5 border rounded-lg text-[9px] font-mono font-bold tracking-wider ${badgeColor}`}>
                              {pt.name}
                            </span>
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                {pt.name} <span className="text-[10px] text-slate-400 font-normal">({pt.arabicName})</span>
                              </div>
                              <p className="text-[9px] text-slate-500 font-mono truncate max-w-[210px] leading-tight">
                                {pt.definition}
                              </p>
                            </div>
                          </div>

                          <div className="text-right flex items-center gap-3 font-mono">
                            <div className="leading-tight">
                              <span className="text-xs font-extrabold text-[#f1f5f9] block">{pt.time}</span>
                              <span className="text-[8px] text-cyan-400">θ: {pt.sunAltitude.toFixed(1)}°</span>
                            </div>
                            <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-cyan-400 animate-ping' : 'bg-slate-700'}`} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* INTERACTIVE SOLVER ACCORDION */}
                <div className="bg-[#070d1e] border border-slate-800/80 rounded-xl p-4 flex flex-col gap-4 shadow-md">
                  <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-extrabold">📐 CUSTOM CELESTIAL ANGLE SOLVER</span>
                    <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded">
                      {solverAltitude.toFixed(1)}°
                    </span>
                  </div>

                  <div className="pt-1">
                    <p className="text-[10px] text-slate-400 mb-2 font-medium">
                      Drag vertical slider to solve exact times when Sun coordinates cross that specific altitude today.
                    </p>
                    <input
                      type="range"
                      min="-90"
                      max="90"
                      step="0.1"
                      value={solverAltitude}
                      onChange={(e) => setSolverAltitude(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-850 rounded appearance-none cursor-pointer accent-amber-500 outline-none hover:bg-slate-800"
                    />
                    <div className="flex justify-between text-[7px] font-mono text-slate-500 pt-1 leading-none">
                      <span>-90° (Nadir)</span>
                      <span>-19° (Morocco Fajr)</span>
                      <span>0° (Horizon Plane)</span>
                      <span>+90° (Zenith Noon)</span>
                    </div>
                  </div>

                  {/* Solved details readout */}
                  <div className="bg-slate-950/75 p-3 rounded-xl border border-slate-850 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-400">Reachability Status</span>
                      {altitudeSolution.isReachable ? (
                        <span className="px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 rounded font-bold uppercase text-[8px]">REACHABLE TODAY</span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-rose-500/15 text-rose-400 border border-rose-500/20 rounded font-bold uppercase text-[8px]">UNREACHABLE</span>
                      )}
                    </div>

                    <div className="text-xs bg-[#0b132a]/60 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed text-slate-300 italic">
                      💡 {altitudeSolution.explanation}
                    </div>

                    {altitudeSolution.isReachable ? (
                      <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
                        {/* Morning */}
                        <div className="bg-[#030610] p-2.5 rounded-lg border border-slate-850 flex flex-col justify-between gap-2 shadow-sm">
                          <div>
                            <span className="text-[8px] text-slate-500 uppercase block tracking-wider font-semibold">Morning Ascent</span>
                            <span className="text-sm font-bold text-white mt-1 block">
                              {formatTimeInTimezone(altitudeSolution.morningTime, selectedLocation.utcOffset)}
                            </span>
                          </div>
                          {altitudeSolution.morningTime && (
                            <button
                              onClick={() => {
                                const shifted = new Date(altitudeSolution.morningTime!.getTime() + selectedLocation.utcOffset * 60 * 60 * 1000);
                                setTimeMinutes(shifted.getUTCHours() * 60 + shifted.getUTCMinutes());
                              }}
                              className="py-1 px-2 border border-amber-500/20 hover:border-amber-400/50 bg-amber-500/5 hover:bg-amber-500/10 text-amber-300 text-[8px] font-extrabold rounded-md uppercase tracking-wider transition cursor-pointer text-center"
                            >
                              Jump local morning
                            </button>
                          )}
                        </div>

                        {/* Evening */}
                        <div className="bg-[#030610] p-2.5 rounded-lg border border-slate-850 flex flex-col justify-between gap-2 shadow-sm">
                          <div>
                            <span className="text-[8px] text-slate-500 uppercase block tracking-wider font-semibold">Evening Descent</span>
                            <span className="text-sm font-bold text-white mt-1 block">
                              {formatTimeInTimezone(altitudeSolution.afternoonTime, selectedLocation.utcOffset)}
                            </span>
                          </div>
                          {altitudeSolution.afternoonTime && (
                            <button
                              onClick={() => {
                                const shifted = new Date(altitudeSolution.afternoonTime!.getTime() + selectedLocation.utcOffset * 60 * 60 * 1000);
                                setTimeMinutes(shifted.getUTCHours() * 60 + shifted.getUTCMinutes());
                              }}
                              className="py-1 px-2 border border-amber-500/20 hover:border-amber-400/50 bg-amber-500/5 hover:bg-amber-500/10 text-amber-300 text-[8px] font-extrabold rounded-md uppercase tracking-wider transition cursor-pointer text-center"
                            >
                              Jump local evening
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-rose-350 bg-rose-950/20 border border-rose-900/40 p-2.5 rounded-lg leading-normal font-mono">
                        Axis obliquity ensures the Sun does not cross this angle on this day. Highest point: {altitudeSolution.highestToday.toFixed(1)}° • Lowest: {altitudeSolution.lowestToday.toFixed(1)}°
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: TELEMETRY (SVG CHART SPLINE AND DETAILED SUN VECTORS) */}
            {activeTab === 'telemetry' && (
              <div className="flex flex-col gap-4">
                {/* SVG Diurnal elevation curve chart */}
                <div className="bg-[#070d1e] border border-slate-800/80 rounded-xl p-4 flex flex-col gap-3 shadow-md">
                  <div className="border-b border-slate-850 pb-2 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-extrabold block">📈 DIURNAL SUN ALTITUDE SPLINE GRAPH</span>
                    <span className="text-[8px] font-mono text-cyan-400">CLICK GRAPH TO SCRUB TIME</span>
                  </div>

                  <div className="relative w-full aspect-[16/7] bg-[#02050b] rounded-lg border border-slate-850/80 overflow-hidden mt-1 p-2 shadow-inner">
                    <svg
                      viewBox="0 0 500 190"
                      className="w-full h-full select-none"
                      onClick={handleGraphClick}
                    >
                      {/* Gridlines */}
                      <line x1="40" y1="15" x2="485" y2="15" stroke="#111c34" strokeWidth="0.5" />
                      <line x1="40" y1="95" x2="485" y2="95" stroke="#ff3b30" strokeWidth="0.8" strokeDasharray="3,3" /> {/* Horizon Plane */}
                      <line x1="40" y1="165" x2="485" y2="165" stroke="#111c34" strokeWidth="0.5" />
                      
                      {/* Vertical Hour reference grid */}
                      <line x1="40" y1="15" x2="40" y2="165" stroke="#1c273a" strokeWidth="0.5" />
                      <line x1="151.25" y1="15" x2="151.25" y2="165" stroke="#111c34" strokeWidth="0.5" strokeDasharray="1,2" />
                      <line x1="262.5" y1="15" x2="262.5" y2="165" stroke="#1c273a" strokeWidth="0.5" />
                      <line x1="373.75" y1="15" x2="373.75" y2="165" stroke="#111c34" strokeWidth="0.5" strokeDasharray="1,2" />
                      <line x1="485" y1="15" x2="485" y2="165" stroke="#1c273a" strokeWidth="0.5" />

                      {/* Text Y Axis annotations */}
                      <text x="32" y="18" fill="#5a7090" fontSize="9" fontFamily="monospace" textAnchor="end">+90°</text>
                      <text x="32" y="98" fill="#ef4444" fontSize="9" fontFamily="monospace" textAnchor="end">Horizon 0°</text>
                      <text x="32" y="168" fill="#5a7090" fontSize="9" fontFamily="monospace" textAnchor="end">-90°</text>

                      {/* Day and Night color shading block path generators */}
                      {(() => {
                        let pathD = "M 40 95";
                        diurnalPoints.forEach((pt) => {
                          const x = 40 + (pt.hour / 24) * 445;
                          const y = 95 - (pt.altitude / 90) * 70;
                          pathD += ` L ${x} ${y}`;
                        });
                        pathD += " L 485 95 Z";
                        return (
                          <>
                            {/* Ambient curves fill gradients */}
                            <path d={pathD} fill="url(#sun-amplitude-grad)" opacity="0.1" />
                            <path d={pathD} stroke="url(#sun-stroke-grad)" strokeWidth="1.8" fill="none" />
                          </>
                        );
                      })()}

                      {/* Gradients definitions */}
                      <defs>
                        <linearGradient id="sun-amplitude-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#fbbf24" />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="sun-stroke-grad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#a855f7" />
                          <stop offset="30%" stopColor="#fbbf24" />
                          <stop offset="70%" stopColor="#fbbf24" />
                          <stop offset="100%" stopColor="#4f46e5" />
                        </linearGradient>
                      </defs>

                      {/* Prayer milestones indicators on the spline curve */}
                      {prayerTimes.map(pt => {
                        const markerHour = (pt.timestamp.getUTCHours() + pt.timestamp.getUTCMinutes() / 60 + selectedLocation.utcOffset + 24) % 24;
                        const mx = 40 + (markerHour / 24) * 445;
                        const my = 95 - (pt.sunAltitude / 90) * 70;

                        if (mx >= 40 && mx <= 485) {
                          return (
                            <g key={`graph-pt-${pt.id}`}>
                              <circle cx={mx} cy={my} r="3.2" fill="#02050b" stroke="#38bdf8" strokeWidth="1.5" />
                              <text x={mx} y={my - 7} fill="#94a3b8" fontSize="7" fontFamily="monospace" textAnchor="middle">{pt.name}</text>
                            </g>
                          );
                        }
                        return null;
                      })}

                      {/* Active time indicator line */}
                      {(() => {
                        const curH = timeMinutes / 60;
                        const activeX = 40 + (curH / 24) * 445;
                        const activeY = 95 - (sunDetails.altitude / 90) * 70;
                        return (
                          <g>
                            <line x1={activeX} y1="15" x2={activeX} y2="165" stroke="#fbbf24" strokeWidth="1" strokeDasharray="2,2" />
                            <circle cx={activeX} cy={activeY} r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.8" className="animate-pulse" />
                          </g>
                        );
                      })()}

                      {/* Hours X Axis annotations */}
                      <text x="40" y="181" fill="#5a7090" fontSize="8" fontFamily="monospace" textAnchor="middle">00h (Mid)</text>
                      <text x="151.25" y="181" fill="#5a7090" fontSize="8" fontFamily="monospace" textAnchor="middle">06h</text>
                      <text x="262.5" y="181" fill="#5a7090" fontSize="8" fontFamily="monospace" textAnchor="middle">12h (Noon)</text>
                      <text x="373.75" y="181" fill="#5a7090" fontSize="8" fontFamily="monospace" textAnchor="middle">18h</text>
                      <text x="485" y="181" fill="#5a7090" fontSize="8" fontFamily="monospace" textAnchor="middle">24h</text>
                    </svg>
                  </div>
                </div>

                {/* REAL TIME READOUTS STATS */}
                <div className="bg-[#070d1e] border border-slate-800/80 rounded-xl p-4 flex flex-col gap-3 shadow-md">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block tracking-wider font-extrabold border-b border-slate-800 pb-1.5">📊 CELESTIAL METEOROLOGY READOUTS</span>
                  
                  <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                    <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-850 flex flex-col gap-1 text-left">
                      <span className="text-[8px] text-slate-500 uppercase font-semibold">Sun Altitude Angle</span>
                      <span className={`text-xl font-black block mt-1 ${sunDetails.altitude >= 0 ? 'text-emerald-400' : 'text-purple-400'}`}>
                        {sunDetails.altitude.toFixed(3)}°
                        <span className="text-[9px] font-normal text-slate-400 block mt-0.5">
                          {sunDetails.altitude >= 0 ? '☀️ geometric day' : '🌘 night nadir'}
                        </span>
                      </span>
                    </div>

                    <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-850 flex flex-col gap-1 text-left">
                      <span className="text-[8px] text-slate-500 uppercase font-semibold">Compass Azimuth Direction</span>
                      <span className="text-sm font-bold text-cyan-300 block mt-1 leading-snug">
                        {getAzimuthDescriptive(sunDetails.azimuth)}
                      </span>
                      <span className="text-[8px] text-slate-450 uppercase block">Degrees relative north (0°)</span>
                    </div>
                  </div>

                  {/* Seasonal indices */}
                  <div className="bg-[#0b132a]/45 p-3.5 rounded-xl border border-slate-850 text-xs flex flex-col gap-2 font-mono">
                    <div className="flex items-center justify-between border-b border-slate-850 pb-1.5 text-[10px] uppercase font-bold text-slate-400">
                      <span>Celestial Ephemeris Metrics</span>
                      <span className="text-amber-400">J2000 calculations</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-[10px] pt-1">
                      <div>
                        <span className="text-slate-500 block leading-none">Declination</span>
                        <span className="text-slate-200 font-semibold mt-1 block">{sunDetails.declination.toFixed(2)}°</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block leading-none">Orbit Distance</span>
                        <span className="text-slate-200 font-semibold mt-1 block">{sunDetails.distance.toFixed(4)} AU</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block leading-none">Daylight Hours</span>
                        <span className="text-slate-200 font-semibold mt-1 block">{daylight.hours}h {daylight.minutes}m</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: LOCATION SELECTOR & GEOLOCATION COORDINATES */}
            {activeTab === 'location' && (
              <div className="flex flex-col gap-4">
                <div className="bg-[#070d1e] border border-slate-800/80 rounded-xl p-4 flex flex-col gap-3.5 shadow-md">
                  <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-extrabold">🌐 GEOGRAPHIC PROFILE TRACKER</span>
                    <button
                      onClick={handleGeolocate}
                      className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-800/40 px-2.5 py-1 rounded-md transition flex items-center gap-1 cursor-pointer font-bold uppercase tracking-wider"
                    >
                      <Navigation size={11} className="text-cyan-400" /> Auto-Sense Core
                    </button>
                  </div>

                  {/* Preset Locations Grid Chips */}
                  <div>
                    <span className="text-[9px] font-mono text-slate-500 uppercase block mb-1.5">Preset Regional Observers</span>
                    <div className="grid grid-cols-2 xs:grid-cols-3 gap-2">
                      {LOCATION_PRESETS.map(p => {
                        const isSelected = !useCustomLocation && selectedLocation.name === p.name;
                        return (
                          <button
                            key={p.name}
                            onClick={() => handlePresetSelect(p)}
                            className={`p-2.5 rounded-xl border text-left transition-all leading-snug cursor-pointer flex flex-col justify-between h-[52px] ${isSelected ? 'bg-cyan-500/10 border-cyan-400/80 text-cyan-200' : 'bg-slate-950/50 border-slate-850 text-slate-400 hover:text-white hover:border-slate-750'}`}
                          >
                            <span className="text-[10.5px] font-semibold block truncate leading-tight w-full">{p.name}</span>
                            <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider block mt-0.5">{p.country}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Key custom coordinates fields */}
                  <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-850 flex flex-col gap-3">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block tracking-wider font-extrabold">⌨️ DIAL COORDINATES MANUALLY</span>
                    
                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <label className="text-[9px] font-mono text-slate-500 block mb-1">Latitude Observer [-90, 90]</label>
                        <input
                          type="number"
                          step="0.0001"
                          min="-90"
                          max="90"
                          value={customLat}
                          onChange={(e) => setCustomLat(e.target.value)}
                          className="w-full bg-[#030610] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-mono text-slate-555 block mb-1">Longitude Observer [-180, 180]</label>
                        <input
                          type="number"
                          step="0.0001"
                          min="-180"
                          max="180"
                          value={customLng}
                          onChange={(e) => setCustomLng(e.target.value)}
                          className="w-full bg-[#030610] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleCustomLocationApply}
                      className="w-full py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-cyan-400 text-xs font-mono uppercase tracking-wider font-bold rounded-lg transition-all cursor-pointer"
                    >
                      Update Coordinates Manual Pin
                    </button>
                  </div>
                </div>

                {/* Date/Declination Controls card */}
                <div className="bg-[#070d1e] border border-slate-800/80 rounded-xl p-4 flex flex-col gap-3 shadow-md">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block tracking-wider font-extrabold border-b border-slate-850 pb-1.5">📅 SEASONALITY CALENDAR INDEX</span>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[9px] font-mono text-slate-500 block mb-1">Target Date Range</span>
                      <input
                        type="date"
                        value={`${selectedYear}-${(selectedMonth+1).toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`}
                        onChange={(e) => handleDateStringChange(e.target.value)}
                        className="w-full bg-[#030610] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] font-mono text-slate-550 block mb-1">Astronomy Season</span>
                      <div className="bg-[#030610] border border-slate-800 p-2 text-xs font-mono text-amber-200 rounded-lg leading-none flex flex-col justify-center h-[34px] xl:h-[34px]">
                        <strong>{currentSeason}</strong>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 italic leading-relaxed font-mono mt-1">
                    Earth's physical axis tilt of 23.44° relative to the ecliptic creates four seasons. Declination swings from +23.44° (June Solstice) to -23.44° (December Solstice).
                  </p>
                </div>
              </div>
            )}

            {/* Scientific Proof card (Permanently visible under tab deck for observatory proofing) */}
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850 flex flex-col gap-3">
              <span className="text-[10px] font-mono text-slate-400 uppercase block tracking-wider font-extrabold flex items-center gap-2">
                <BookOpen size={13} className="text-cyan-400" /> Morocco Standards Evidence
              </span>

              <div className="text-xs text-slate-300 leading-relaxed font-mono flex flex-col gap-2 bg-[#02050e]/60 p-3 rounded-lg border border-slate-800/80">
                <p>
                  🇲🇦 **Fajr (Dawn)**: Calculated at exactly <strong className="text-white">-19.0°</strong> solar elevation angle below eastern horizon. On June 3rd, 2026, Fajr falls correctly at **04:33**!
                </p>
                <div className="h-[1px] bg-slate-800/60 my-1" />
                <p>
                  🌇 **Maghrib (Sunset)**: Calculated at the refraction-corrected geographic horizon of <strong className="text-white">-0.833°</strong>. Over Casablanca, this lands exactly at **20:41**!
                </p>
              </div>
            </div>

          </div>
        </section>

      </main>

      {/* Simplified Footer - Positioned without obstructing user selections */}
      <footer className="mt-auto border-t border-[#111c34]/60 bg-[#020409] px-6 py-3 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-500 font-mono shadow-inner select-none leading-none shrink-0 border-t-slate-850">
        <div className="flex items-center gap-2">
          <TrendingUp size={12} className="text-slate-500" />
          <span>Computed J2000 Keplerian Celestial Simulator • Precision mathematical algorithms</span>
        </div>
        <div className="mt-1 sm:mt-0">
          <span>Observed in high precision real-time tracking mode</span>
        </div>
      </footer>
    </div>
  );
}

// Simple Helper for calendar dates readout
function selectedDateStringChangeReadable(y: number, m: number, d: number): string {
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.toString().padStart(2, '0')} ${MONTHS[m]} ${y}`;
}
