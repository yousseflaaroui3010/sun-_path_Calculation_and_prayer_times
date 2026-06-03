import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ViewMode, LocationPreset, SunDetails, PrayerTime } from '../types';
import { getSolarCoordinates, getSunDetailsForTime } from '../utils/astronomy';
import { Play, Pause, ZoomIn, ZoomOut, Target, Compass } from 'lucide-react';

// Continent Polygons in (Longitude, Latitude) for detailed procedural Earth mapping
const CONTINENTS = [
  // North America
  [
    [-168, 65], [-160, 71], [-150, 71], [-140, 70], [-130, 69], [-120, 69], [-110, 68], [-100, 70], [-95, 73], [-85, 75], [-75, 73], [-65, 75], [-60, 68], [-55, 60], [-52, 53], [-55, 48], [-60, 45], [-65, 43], [-70, 42], [-75, 38], [-80, 32], [-81, 25], [-80, 24], [-83, 27], [-85, 30], [-90, 30], [-95, 26], [-97, 21], [-95, 17], [-90, 14], [-85, 10], [-80, 8], [-82, 8], [-85, 12], [-100, 16], [-105, 20], [-110, 23], [-115, 32], [-118, 30], [-121, 34], [-124, 40], [-125, 48], [-130, 52], [-135, 55], [-145, 60], [-155, 60], [-165, 60], [-168, 65]
  ],
  // South America
  [
    [-80, 9], [-76, 11], [-72, 11], [-65, 10], [-60, 5], [-55, 5], [-50, 0], [-45, -2], [-40, -5], [-35, -5], [-34, -8], [-38, -15], [-42, -22], [-48, -27], [-52, -32], [-58, -38], [-62, -42], [-65, -48], [-68, -52], [-71, -55], [-74, -53], [-72, -45], [-75, -40], [-70, -32], [-73, -25], [-80, -18], [-81, -5], [-81, 0], [-80, 5], [-80, 9]
  ],
  // Africa
  [
    [-17, 32], [-13, 35], [-5, 36], [2, 36], [10, 37], [15, 32], [20, 31], [25, 32], [30, 31], [32, 27], [34, 27], [34, 30], [36, 28], [40, 23], [43, 15], [51, 11], [48, 5], [46, 0], [40, -10], [35, -20], [32, -25], [30, -30], [25, -34], [20, -34], [18, -30], [15, -25], [11, -15], [10, -5], [5, 2], [2, 4], [-5, 4], [-10, 5], [-15, 10], [-17, 15], [-17, 20], [-15, 25], [-17, 32]
  ],
  // Eurasia (mainland)
  [
    [-10, 36], [-9, 39], [-5, 43], [-1, 44], [-2, 48], [-5, 50], [0, 52], [5, 53], [8, 55], [10, 58], [8, 62], [5, 65], [15, 68], [25, 71], [35, 68], [45, 68], [55, 70], [65, 73], [75, 76], [85, 77], [100, 78], [115, 78], [130, 77], [145, 75], [160, 73], [170, 70], [180, 65], [175, 60], [165, 55], [150, 50], [142, 43], [140, 35], [130, 35], [125, 37], [122, 35], [119, 25], [115, 22], [110, 20], [108, 15], [105, 10], [100, 5], [103, 2], [98, 8], [95, 15], [90, 20], [88, 22], [80, 15], [78, 8], [73, 12], [72, 20], [68, 23], [62, 25], [60, 25], [58, 25], [55, 25], [58, 21], [55, 15], [50, 12], [45, 12], [42, 15], [40, 20], [35, 30], [33, 32], [35, 34], [33, 35], [30, 36], [27, 36], [26, 40], [30, 42], [35, 45], [40, 42], [35, 41], [25, 41], [23, 38], [18, 40], [15, 38], [15, 41], [12, 43], [8, 43], [5, 43], [3, 40], [-5, 36], [-10, 36]
  ],
  // Great Britain
  [
    [-6, 50], [-5, 55], [-3, 58], [-2, 57], [1, 51], [-2, 50]
  ],
  // Ireland
  [
    [-10, 51], [-10, 54], [-6, 54], [-6, 52], [-10, 51]
  ],
  // Japan
  [
    [130, 32], [132, 33], [135, 35], [138, 37], [140, 38], [141, 41], [144, 43], [145, 43], [143, 39], [140, 37], [136, 34], [132, 31], [130, 32]
  ],
  // Iceland
  [
    [-24, 63], [-22, 66], [-14, 66], [-14, 63], [-24, 63]
  ],
  // Madagascar
  [
    [49, -12], [51, -16], [47, -25], [43, -25], [45, -18], [47, -12], [49, -12]
  ],
  // Greenland
  [
    [-60, 60], [-45, 60], [-35, 65], [-30, 75], [-12, 81], [-40, 83], [-60, 75], [-73, 77], [-60, 60]
  ],
  // Antarctica
  [
    [-180, -65], [-150, -65], [-120, -66], [-90, -70], [-60, -65], [-30, -68], [0, -65], [30, -65], [60, -66], [90, -64], [120, -65], [150, -64], [180, -65], [180, -90], [-180, -90], [-180, -65]
  ],
  // Australia
  [
    [113, -26], [114, -15], [121, -14], [130, -12], [136, -11], [142, -10], [142, -22], [150, -25], [153, -28], [150, -35], [147, -38], [138, -35], [125, -39], [115, -34], [113, -26]
  ],
  // Tasmania
  [
    [145, -41], [148, -41], [148, -43], [145, -43], [145, -41]
  ],
  // New Zealand North Island
  [
    [174, -35], [178, -38], [175, -41], [172, -39], [174, -35]
  ],
  // New Zealand South Island
  [
    [172, -41], [174, -42], [168, -46], [166, -46], [172, -41]
  ],
  // Sumatra
  [
    [95, 5], [100, 0], [105, -5], [102, -5], [96, 0], [95, 5]
  ],
  // Borneo
  [
    [110, 5], [115, 7], [118, 5], [118, 0], [112, -4], [109, -1], [110, 5]
  ],
  // Java
  [
    [105, -6], [115, -7], [115, -8], [105, -8], [105, -6]
  ],
  // Sulawesi
  [
    [120, 1], [123, 2], [125, 0], [124, -2], [120, -2], [119, -1], [120, 1]
  ],
  // New Guinea (Papua)
  [
    [131, -1], [135, -3], [141, -2], [145, -4], [147, -8], [141, -9], [131, -4], [131, -1]
  ],
  // Philippines
  [
    [120, 18], [124, 16], [121, 6], [125, 7], [121, 13], [120, 18]
  ],
  // Scandinavia
  [
    [5, 58], [10, 60], [12, 65], [16, 68], [20, 70], [25, 70], [30, 68], [30, 63], [25, 60], [22, 59], [15, 56], [10, 58], [5, 58]
  ]
];

interface ThreeCanvasProps {
  viewMode: ViewMode;
  location: LocationPreset;
  date: Date; // both date and time of day
  sunDetails: SunDetails;
  prayerTimes: PrayerTime[];
  onTimeChange: (newDate: Date) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  trackingTarget: 'sun' | 'earth';
  setTrackingTarget: (t: 'sun' | 'earth') => void;
}

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  viewMode,
  location,
  date,
  sunDetails,
  prayerTimes,
  onTimeChange,
  isPlaying,
  onTogglePlay,
  trackingTarget,
  setTrackingTarget
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Custom Smooth Camera Positions using standard spherical math bindings
  const cameraDistanceRef = useRef<number>(65);
  const cameraThetaRef = useRef<number>(-Math.PI / 4); // Yaw
  const cameraPhiRef = useRef<number>(0.35); // Pitch (clamped below PI/2)
  const cameraTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

  const isDraggingRef = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });

  // Reset default camera bounds on mode changes
  useEffect(() => {
    if (viewMode === 'dome') {
      cameraDistanceRef.current = 65;
      cameraThetaRef.current = -Math.PI / 4;
      cameraPhiRef.current = 0.35;
      cameraTargetRef.current.set(0, 0, 0);
    } else if (viewMode === 'globe') {
      cameraDistanceRef.current = 32;
      // Set default orientation facing the location coordinates
      cameraThetaRef.current = (-location.longitude * Math.PI) / 180 - Math.PI / 2;
      cameraPhiRef.current = (location.latitude * Math.PI) / 180;
      cameraTargetRef.current.set(0, 0, 0);
    } else if (viewMode === 'orbit') {
      cameraDistanceRef.current = 75;
      cameraThetaRef.current = 0.8;
      cameraPhiRef.current = 0.45;
      cameraTargetRef.current.set(0, 0, 0);
    }
  }, [viewMode, location.latitude, location.longitude]);

  // Procedural 2D World Map Generator (renders Earth custom texture)
  const generateWorldMapTexture = (): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // Ocean styling: dark cosmic blue
    ctx.fillStyle = '#050a14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Gridlines every 30 degrees
    ctx.strokeStyle = '#10223f';
    ctx.lineWidth = 0.5;
    for (let lon = -180; lon <= 180; lon += 30) {
      const x = ((lon + 180) / 360) * canvas.width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let lat = -90; lat <= 90; lat += 30) {
      const y = ((90 - lat) / 180) * canvas.height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Outline equator & prime meridian in subtle blue
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    ctx.strokeStyle = '#0891b2';
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();

    // Draw solid landmasses
    ctx.fillStyle = '#0f1d3a'; 
    ctx.strokeStyle = '#14b8a6'; // Emerald outline glow vibe
    ctx.lineWidth = 1.5;

    CONTINENTS.forEach(poly => {
      ctx.beginPath();
      poly.forEach(([lon, lat], i) => {
        const x = ((lon + 180) / 360) * canvas.width;
        const y = ((90 - lat) / 180) * canvas.height;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    return canvas;
  };

  // Cartesian conversion helper
  const latLngToCartesian = (lat: number, lng: number, radius: number): THREE.Vector3 => {
    const phi = (lat * Math.PI) / 180;
    const theta = ((lng + 180) * Math.PI) / 180;
    const x = -radius * Math.cos(phi) * Math.sin(theta);
    const y = radius * Math.sin(phi);
    const z = radius * Math.cos(phi) * Math.cos(theta);
    return new THREE.Vector3(x, y, z);
  };

  // Orbit control interaction trigger bindings
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    previousMousePosition.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - previousMousePosition.current.x;
    const deltaY = e.clientY - previousMousePosition.current.y;

    cameraThetaRef.current -= deltaX * 0.005;
    // Clamp polar pitch prevents gimbal lock (flips)
    cameraPhiRef.current = Math.max(-Math.PI / 2.05, Math.min(Math.PI / 2.05, cameraPhiRef.current + deltaY * 0.005));

    previousMousePosition.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    const zoomMultiplier = 0.025;
    cameraDistanceRef.current = Math.max(12, Math.min(180, cameraDistanceRef.current + e.deltaY * zoomMultiplier));
  };

  // Zoom overlay controls
  const handleZoom = (direction: 'in' | 'out') => {
    const factor = direction === 'in' ? -5 : 5;
    cameraDistanceRef.current = Math.max(12, Math.min(180, cameraDistanceRef.current + factor));
  };

  const latestPropsRef = useRef({ date, sunDetails, prayerTimes, isPlaying });
  useEffect(() => {
    latestPropsRef.current = { date, sunDetails, prayerTimes, isPlaying };
  }, [date, sunDetails, prayerTimes, isPlaying]);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    if (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }
    containerRef.current.appendChild(renderer.domElement);

    // Atmospheric dynamic sky calculation
    let skyColor = new THREE.Color('#02040a');
    const alt = sunDetails.altitude;

    if (viewMode === 'dome') {
      if (alt > 12) {
        skyColor = new THREE.Color('#0a1128'); // Rich day sky
      } else if (alt > 0) {
        // Evening / dawn transition
        const factor = alt / 12;
        skyColor = new THREE.Color().lerpColors(new THREE.Color('#1f0c2a'), new THREE.Color('#0a1128'), factor);
      } else if (alt > -8) {
        // Astronomical twilight
        const factor = (alt + 8) / 8;
        skyColor = new THREE.Color().lerpColors(new THREE.Color('#010206'), new THREE.Color('#1f0c2a'), factor);
      } else {
        skyColor = new THREE.Color('#010206');
      }
    } else {
      skyColor = new THREE.Color('#020409'); // Space backdrop
    }
    scene.background = skyColor;

    // Standard high aspect perspective camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    cameraRef.current = camera;

    // Dynamic lights
    const ambientLight = new THREE.AmbientLight();
    scene.add(ambientLight);

    // Add a directional shadow light
    const sunLight = new THREE.DirectionalLight('#ffffff', 2.8);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 180;
    const shadowSize = 50;
    sunLight.shadow.camera.left = -shadowSize;
    sunLight.shadow.camera.right = shadowSize;
    sunLight.shadow.camera.top = shadowSize;
    sunLight.shadow.camera.bottom = -shadowSize;
    scene.add(sunLight);

    // Group matching coordinate rotation system
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // Initializer for the standard 3D texture loader
    const textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = 'anonymous';

    // Create local tracker handles for closures
    let domeSunModel: THREE.Group | null = null;
    let globeSunSphere: THREE.Mesh | null = null;
    let orbitEarthGroup: THREE.Group | null = null;
    let orbitGlobeMesh: THREE.Mesh | null = null;
    let orbitSunRay: THREE.Line | null = null;

    // Dome Mode Scene setup
    if (viewMode === 'dome') {
      if (alt > 0) {
        ambientLight.color.set('#20273d');
        ambientLight.intensity = Math.min(1.0, alt / 15 + 0.3);
        sunLight.intensity = 2.5;
        sunLight.color.lerpColors(new THREE.Color('#f97316'), new THREE.Color('#fef08a'), Math.min(1.0, alt / 15));
      } else if (alt > -12) {
        ambientLight.color.set('#0b0e1a');
        ambientLight.intensity = 0.2;
        sunLight.intensity = ((alt + 12) / 12) * 0.5;
        sunLight.color.set('#ef4444');
      } else {
        ambientLight.color.set('#05070e');
        ambientLight.intensity = 0.08;
        sunLight.intensity = 0;
      }

      // 1. Starfield constellations
      const starsCount = 500;
      const starsGeo = new THREE.BufferGeometry();
      const starsPos = new Float32Array(starsCount * 3);
      for (let i = 0; i < starsCount * 3; i += 3) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2 * Math.PI;
        const phi = Math.acos(v);
        const r = 160 + Math.random() * 40;
        starsPos[i] = r * Math.sin(phi) * Math.sin(theta);
        starsPos[i+1] = r * Math.cos(phi);
        starsPos[i+2] = r * Math.sin(phi) * Math.cos(theta);
      }
      starsGeo.setAttribute('position', new THREE.BufferAttribute(starsPos, 3));
      const starsMat = new THREE.PointsMaterial({
        color: '#ffffff',
        size: 1.0,
        transparent: true,
        opacity: alt < 0 ? Math.min(0.95, Math.abs(alt) / 8) : 0
      });
      mainGroup.add(new THREE.Points(starsGeo, starsMat));

      // 2. Horizon platform pad
      const platformRadius = 35;
      const diskGeo = new THREE.CylinderGeometry(platformRadius, platformRadius, 0.4, 64);
      const diskMat = new THREE.MeshStandardMaterial({
        color: '#080d1a',
        roughness: 0.18,
        metalness: 0.9,
        emissive: '#0b162f',
        emissiveIntensity: 0.45
      });
      const disk = new THREE.Mesh(diskGeo, diskMat);
      disk.position.y = -0.2;
      disk.receiveShadow = true;
      mainGroup.add(disk);

      // Neon glowing platform guide rings
      for (let i = 1; i <= 3; i++) {
        const ringRadius = (platformRadius / 3) * i;
        const ringMesh = new THREE.Mesh(
          new THREE.RingGeometry(ringRadius - 0.15, ringRadius + 0.15, 64),
          new THREE.MeshBasicMaterial({
            color: i === 3 ? '#ef4444' : '#14b8a6',
            transparent: true,
            opacity: i === 3 ? 0.35 : 0.15,
            side: THREE.DoubleSide
          })
        );
        ringMesh.rotation.x = Math.PI / 2;
        ringMesh.position.y = 0.05;
        mainGroup.add(ringMesh);
      }

      const gridHelper = new THREE.GridHelper(platformRadius * 2, 22, '#152b52', '#0e1d3a');
      gridHelper.position.y = 0.08;
      mainGroup.add(gridHelper);

      // Direction markers
      const createArrowIndicator = (dir: THREE.Vector3, color: string) => {
        const arrow = new THREE.ArrowHelper(dir.clone().normalize(), new THREE.Vector3(0, 0.1, 0), platformRadius - 1.5, color, 1.2, 0.6);
        mainGroup.add(arrow);
      };
      createArrowIndicator(new THREE.Vector3(0, 0, -1), '#f43f5e'); // North
      createArrowIndicator(new THREE.Vector3(1, 0, 0), '#10b981');  // East
      createArrowIndicator(new THREE.Vector3(0, 0, 1), '#64748b');  // South
      createArrowIndicator(new THREE.Vector3(-1, 0, 0), '#f59e0b'); // West

      // Gnomon minaret in center (casts precise shadows)
      const monument = new THREE.Group();
      // base pedestal
      const podium = new THREE.Mesh(
        new THREE.CylinderGeometry(2, 2.5, 0.4, 32),
        new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.6 })
      );
      podium.position.y = 0.2;
      podium.castShadow = true;
      podium.receiveShadow = true;
      monument.add(podium);

      // columns
      const column = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.6, 7.5, 16),
        new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.4, metalness: 0.2 })
      );
      column.position.y = 4.15;
      column.castShadow = true;
      column.receiveShadow = true;
      monument.add(column);

      // dome
      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(1.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 1.5),
        new THREE.MeshStandardMaterial({ color: '#0ea5e9', roughness: 0.2, metalness: 0.8 })
      );
      crown.position.set(0, 7.9, 0);
      crown.castShadow = true;
      monument.add(crown);

      // metal pin coordinate center is physical shadows pointer
      const metalPin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 1.8, 8),
        new THREE.MeshStandardMaterial({ color: '#fbbf24', roughness: 0.1, metalness: 0.9 })
      );
      metalPin.position.y = 9.2;
      metalPin.castShadow = true;
      monument.add(metalPin);

      mainGroup.add(monument);

      // Sky grid cage
      const domeRadius = 32;
      const wireDome = new THREE.Mesh(
        new THREE.SphereGeometry(domeRadius, 32, 16, 0, Math.PI*2, 0, Math.PI/2),
        new THREE.MeshBasicMaterial({ color: '#1e293b', wireframe: true, transparent: true, opacity: 0.05 })
      );
      mainGroup.add(wireDome);

      // 3. Sun Travel trajectory
      const pathPoints: THREE.Vector3[] = [];
      const midnightRef = new Date(date);
      midnightRef.setHours(0,0,0,0);
      for (let m = 0; m <= 1440; m += 15) {
        const timeSample = new Date(midnightRef.getTime() + m * 60 * 1000);
        const details = getSunDetailsForTime(timeSample, location.latitude, location.longitude);
        const theta = (details.altitude * Math.PI) / 180;
        const phi = (details.azimuth * Math.PI) / 180;
        const ptX = domeRadius * Math.cos(theta) * Math.sin(phi);
        const ptY = Math.max(-0.5, domeRadius * Math.sin(theta));
        const ptZ = domeRadius * Math.cos(theta) * Math.cos(phi);
        pathPoints.push(new THREE.Vector3(ptX, ptY, ptZ));
      }
      const pathCurve = new THREE.CatmullRomCurve3(pathPoints);
      const curveGeo = new THREE.BufferGeometry().setFromPoints(pathCurve.getPoints(140));
      mainGroup.add(new THREE.Line(curveGeo, new THREE.LineBasicMaterial({ color: '#fbbf24', transparent: true, opacity: 0.85 })));

      // Ground glow shadow under line
      const glowCurveMat = new THREE.LineBasicMaterial({ color: '#f97316', transparent: true, opacity: 0.25 });
      const sunPathGlow = new THREE.Line(curveGeo, glowCurveMat);
      sunPathGlow.scale.set(1.015, 1.015, 1.015);
      mainGroup.add(sunPathGlow);

      // Visual helper guides and interactive markers representing calculated prayer spots
      prayerTimes.forEach(pt => {
        const pos = getSunDetailsForTime(pt.timestamp, location.latitude, location.longitude);
        const theta = (pos.altitude * Math.PI) / 180;
        const phi = (pos.azimuth * Math.PI) / 180;
        const px = domeRadius * Math.cos(theta) * Math.sin(phi);
        const py = domeRadius * Math.sin(theta);
        const pz = domeRadius * Math.cos(theta) * Math.cos(phi);

        let color = '#38bdf8';
        if (pt.id === 'fajr') color = '#a855f7';
        if (pt.id === 'shorooq') color = '#f97316';
        if (pt.id === 'dhuhr') color = '#facc15';
        if (pt.id === 'asr') color = '#eab308';
        if (pt.id === 'maghrib') color = '#ef4444';
        if (pt.id === 'isha') color = '#4f46e5';

        // Dome trajectory point
        const marker = new THREE.Mesh(new THREE.SphereGeometry(0.65, 16, 16), new THREE.MeshBasicMaterial({ color }));
        marker.position.set(px, py, pz);
        mainGroup.add(marker);

        // Ground coordinate cross contact
        if (py >= -2) {
          const contact = new THREE.Mesh(new THREE.RingGeometry(0, 0.5, 16), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
          contact.rotation.x = Math.PI / 2;
          contact.position.set(px, 0.05, pz);
          mainGroup.add(contact);

          // Connection wire
          const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(px, 0.05, pz), new THREE.Vector3(px, py, pz)]);
          const dashLine = new THREE.Line(lineGeo, new THREE.LineDashedMaterial({ color, dashSize: 0.6, gapSize: 0.6, opacity: 0.4, transparent: true }));
          dashLine.computeLineDistances();
          mainGroup.add(dashLine);
        }
      });

      // The active traveling glowing physical Sun
      const sunModel = new THREE.Group();
      const sAlt = (sunDetails.altitude * Math.PI) / 180;
      const sAz = (sunDetails.azimuth * Math.PI) / 180;
      const sx = domeRadius * Math.cos(sAlt) * Math.sin(sAz);
      const sy = domeRadius * Math.sin(sAlt);
      const sz = domeRadius * Math.cos(sAlt) * Math.cos(sAz);
      sunModel.position.set(sx, sy, sz);

      const sunCoreMesh = new THREE.Mesh(new THREE.SphereGeometry(1.4, 32, 32), new THREE.MeshBasicMaterial({ color: '#fffdf5' }));
      const sunCoronaMesh = new THREE.Mesh(new THREE.SphereGeometry(2.2, 16, 16), new THREE.MeshBasicMaterial({ color: '#fbbf24', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending }));
      sunModel.add(sunCoreMesh);
      sunModel.add(sunCoronaMesh);
      mainGroup.add(sunModel);
      domeSunModel = sunModel;

      sunLight.position.set(sx, sy, sz);
      sunLight.lookAt(0, 0, 0);

    } else if (viewMode === 'globe') {
      ambientLight.color.set('#0b101c');
      ambientLight.intensity = 0.6;

      // 1. Globe model with beautiful procedural earth as primary backdrop
      const globeRadius = 13.0;
      const textureCanvas = generateWorldMapTexture();
      const earthTexture = new THREE.CanvasTexture(textureCanvas);
      
      const earthMat = new THREE.MeshPhongMaterial({
        map: earthTexture,
        shininess: 35,
        specular: new THREE.Color('#38bdf8'),
        bumpScale: 0.1
      });

      const earthMesh = new THREE.Mesh(
        new THREE.SphereGeometry(globeRadius, 64, 64),
        earthMat
      );
      earthMesh.rotation.y = Math.PI; // Correct 180-degree phase alignment with latLngToCartesian
      mainGroup.add(earthMesh);

      // Async upgrade to photorealistic 3D satellite imagery
      textureLoader.load(
        'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          earthMat.map = texture;
          earthMat.needsUpdate = true;
        },
        undefined,
        (err) => {
          console.warn('Satellite Earth texture loading failed. Remaining in custom high-detail vector continent mode:', err);
        }
      );

      // Glowing ocean halo
      const glowAtmosphere = new THREE.Mesh(
        new THREE.SphereGeometry(globeRadius + 0.25, 32, 32),
        new THREE.MeshBasicMaterial({ color: '#00ffff', transparent: true, opacity: 0.08, side: THREE.BackSide, blending: THREE.AdditiveBlending })
      );
      mainGroup.add(glowAtmosphere);

      // Positioning illumination relative to solar UTC zenith noon
      const totalHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
      const sunLongitude = 180 - (totalHours / 24) * 360;
      const solarVector = latLngToCartesian(sunDetails.declination, sunLongitude, 42);

      sunLight.position.copy(solarVector);
      sunLight.lookAt(0, 0, 0);
      sunLight.intensity = 3.2;

      // Miniature visual Sun orbit tracker
      const sunSphere = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 16), new THREE.MeshBasicMaterial({ color: '#fffeb0' }));
      sunSphere.position.copy(solarVector);
      const sunGlow = new THREE.Mesh(new THREE.SphereGeometry(1.9, 16, 16), new THREE.MeshBasicMaterial({ color: '#f59e0b', transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending }));
      sunSphere.add(sunGlow);
      mainGroup.add(sunSphere);
      globeSunSphere = sunSphere;

      // Observer Target pin
      const pinVector = latLngToCartesian(location.latitude, location.longitude, globeRadius);
      const pinAnchor = new THREE.Group();
      pinAnchor.position.copy(pinVector);
      pinAnchor.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pinVector.clone().normalize());

      const pinCone = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.2, 16), new THREE.MeshBasicMaterial({ color: '#06b6d4' }));
      pinCone.position.y = 0.6;
      pinCone.rotation.x = Math.PI;
      pinAnchor.add(pinCone);

      const pinTip = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), new THREE.MeshBasicMaterial({ color: '#22d3ee' }));
      pinTip.position.y = 1.2;
      pinAnchor.add(pinTip);

      mainGroup.add(pinAnchor);

      // Background stars
      const fieldCount = 400;
      const fieldArr = new Float32Array(fieldCount * 3);
      const fieldGeo = new THREE.BufferGeometry();
      for (let i = 0; i < fieldCount * 3; i += 3) {
        const u = Math.random() * Math.PI * 2;
        const v = Math.acos((Math.random() * 2) - 1);
        const r = 100 + Math.random() * 30;
        fieldArr[i] = r * Math.sin(v) * Math.sin(u);
        fieldArr[i+1] = r * Math.cos(v);
        fieldArr[i+2] = r * Math.sin(v) * Math.cos(u);
      }
      fieldGeo.setAttribute('position', new THREE.BufferAttribute(fieldArr, 3));
      mainGroup.add(new THREE.Points(fieldGeo, new THREE.PointsMaterial({ color: '#475569', size: 0.8 })));

    } else if (viewMode === 'orbit') {
      ambientLight.color.set('#0e1324');
      ambientLight.intensity = 0.5;

      // 1. Massive central Sun
      const coreSun = new THREE.Mesh(new THREE.SphereGeometry(5.2, 32, 32), new THREE.MeshBasicMaterial({ color: '#fffaec' }));
      const solarCorona = new THREE.Mesh(new THREE.SphereGeometry(7.5, 32, 32), new THREE.MeshBasicMaterial({ color: '#fbbf24', transparent: true, opacity: 0.22, side: THREE.BackSide, blending: THREE.AdditiveBlending }));
      coreSun.add(solarCorona);
      scene.add(coreSun);

      // Omnidirectional point light radiates out from center
      const omniLight = new THREE.PointLight('#ffffff', 3.0, 150);
      omniLight.castShadow = true;
      scene.add(omniLight);

      // 2. Orbits tracker pathway ellipse
      const radiusX = 35;
      const radiusZ = 33;
      const orbitPoints: THREE.Vector3[] = [];
      for (let i = 0; i <= 100; i++) {
        const angle = (i / 100) * Math.PI * 2;
        orbitPoints.push(new THREE.Vector3(radiusX * Math.cos(angle), 0, radiusZ * Math.sin(angle)));
      }
      const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
      const orbitMainLine = new THREE.Line(orbitGeo, new THREE.LineDashedMaterial({ color: '#334155', dashSize: 1.2, gapSize: 0.8 }));
      orbitMainLine.computeLineDistances();
      mainGroup.add(orbitMainLine);

      // 3. Orbiting Earth Group
      const earthGroup = new THREE.Group();
      const startOfYear = new Date(date.getFullYear(), 0, 1);
      const dayIndex = Math.floor((date.getTime() - startOfYear.getTime()) / 86400000);
      const routeAngle = (dayIndex / 365.25) * Math.PI * 2;

      const ex = radiusX * Math.cos(routeAngle);
      const ez = radiusZ * Math.sin(routeAngle);
      earthGroup.position.set(ex, 0, ez);
      mainGroup.add(earthGroup);
      orbitEarthGroup = earthGroup;

      // Earth axial tilt alignment at obliquity of ~23.44°
      const trueObliquity = 23.44; 
      earthGroup.rotation.z = (trueObliquity * Math.PI) / 180;

      // Miniature active rotating Earth sphere
      const earthTexture = new THREE.CanvasTexture(generateWorldMapTexture());
      const orbitEarthMat = new THREE.MeshStandardMaterial({ 
        map: earthTexture, 
        roughness: 0.65, 
        metalness: 0.15 
      });

      const globeMesh = new THREE.Mesh(
        new THREE.SphereGeometry(2.3, 32, 32),
        orbitEarthMat
      );
      globeMesh.castShadow = true;
      globeMesh.receiveShadow = true;

      // Axis Spin fraction 
      const dayFraction = (date.getUTCHours() * 60 + date.getUTCMinutes()) / 1440;
      globeMesh.rotation.y = dayFraction * Math.PI * 2 + Math.PI; // Correct alignment
      earthGroup.add(globeMesh);
      orbitGlobeMesh = globeMesh;

      // Async upgrade to photorealistic satellite image
      textureLoader.load(
        'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          orbitEarthMat.map = texture;
          orbitEarthMat.needsUpdate = true;
        },
        undefined,
        (err) => {
          console.warn('Orbital Earth texture loading failed. Remaining in vector fallback mode:', err);
        }
      );

      // Red polarity poles axis pin
      const coreYAxis = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 6.5, 8),
        new THREE.MeshBasicMaterial({ color: '#f43f5e' })
      );
      earthGroup.add(coreYAxis);

      // Visual sub-solar vector connector straight back to center Sun
      const sunRayGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(-ex, 0, -ez)]);
      const sunRay = new THREE.Line(sunRayGeo, new THREE.LineBasicMaterial({ color: '#38bdf8', opacity: 0.18, transparent: true }));
      earthGroup.add(sunRay);
      orbitSunRay = sunRay;

      // Background skies
      const skyPtsGeo = new THREE.BufferGeometry();
      const skyPtsArr = new Float32Array(250 * 3);
      for (let i = 0; i < 250 * 3; i += 3) {
        const u = Math.random() * Math.PI * 2;
        const v = Math.acos((Math.random() * 2) - 1);
        const r = 90;
        skyPtsArr[i] = r * Math.sin(v) * Math.sin(u);
        skyPtsArr[i+1] = r * Math.cos(v);
        skyPtsArr[i+2] = r * Math.sin(v) * Math.cos(u);
      }
      skyPtsGeo.setAttribute('position', new THREE.BufferAttribute(skyPtsArr, 3));
      mainGroup.add(new THREE.Points(skyPtsGeo, new THREE.PointsMaterial({ color: '#334155', size: 0.9 })));
    }

    // --- Interactive Tick Loop Handler ---
    const animate = () => {
      // Dynamic camera rotation mappings
      const distance = cameraDistanceRef.current;
      const theta = cameraThetaRef.current;
      const phi = cameraPhiRef.current;
      
      const currentProps = latestPropsRef.current;
      const currentDate = currentProps.date;
      const currentSunDetails = currentProps.sunDetails;

      // Orbit camera target tracking offsets
      const startOfYear = new Date(currentDate.getFullYear(), 0, 1);
      const dayIndex = Math.floor((currentDate.getTime() - startOfYear.getTime()) / 86400000);
      const routeAngle = (dayIndex / 365.25) * Math.PI * 2;
      const ex = 35 * Math.cos(routeAngle);
      const ez = 33 * Math.sin(routeAngle);

      let targetPos = new THREE.Vector3(0, 0, 0);
      if (viewMode === 'orbit') {
        if (trackingTarget === 'earth') {
          targetPos.set(ex, 0, ez);
        } else {
          targetPos.set(0, 0, 0);
        }
      }
      cameraTargetRef.current.lerp(targetPos, 0.08); // smooth tracking transition!

      const target = cameraTargetRef.current;
      camera.position.x = target.x + distance * Math.cos(phi) * Math.sin(theta);
      camera.position.y = target.y + distance * Math.sin(phi);
      camera.position.z = target.z + distance * Math.cos(phi) * Math.cos(theta);
      camera.lookAt(target);

      // Perform real-time dynamic rendering position updates without reconstruction
      if (viewMode === 'dome') {
        const alt = currentSunDetails.altitude;

        // Dynamic sky calculation
        let skyColor = new THREE.Color('#02040a');
        if (alt > 12) {
          skyColor = new THREE.Color('#0a1128');
        } else if (alt > 0) {
          const factor = alt / 12;
          skyColor = new THREE.Color().lerpColors(new THREE.Color('#1f0c2a'), new THREE.Color('#0a1128'), factor);
        } else if (alt > -8) {
          const factor = (alt + 8) / 8;
          skyColor = new THREE.Color().lerpColors(new THREE.Color('#010206'), new THREE.Color('#1f0c2a'), factor);
        } else {
          skyColor = new THREE.Color('#010206');
        }
        scene.background = skyColor;

        // Dynamic lights
        if (alt > 0) {
          ambientLight.color.set('#20273d');
          ambientLight.intensity = Math.min(1.0, alt / 15 + 0.3);
          sunLight.intensity = 2.5;
          sunLight.color.lerpColors(new THREE.Color('#f97316'), new THREE.Color('#fef08a'), Math.min(1.0, alt / 15));
        } else if (alt > -12) {
          ambientLight.color.set('#0b0e1a');
          ambientLight.intensity = 0.2;
          sunLight.intensity = ((alt + 12) / 12) * 0.5;
          sunLight.color.set('#ef4444');
        } else {
          ambientLight.color.set('#05070e');
          ambientLight.intensity = 0.08;
          sunLight.intensity = 0;
        }

        if (domeSunModel) {
          const sAlt = (alt * Math.PI) / 180;
          const sAz = (currentSunDetails.azimuth * Math.PI) / 180;
          const sx = 32 * Math.cos(sAlt) * Math.sin(sAz);
          const sy = 32 * Math.sin(sAlt);
          const sz = 32 * Math.cos(sAlt) * Math.cos(sAz);
          domeSunModel.position.set(sx, sy, sz);
          sunLight.position.set(sx, sy, sz);
          sunLight.lookAt(0, 0, 0);
        }

      } else if (viewMode === 'globe') {
        const totalHours = currentDate.getUTCHours() + currentDate.getUTCMinutes() / 60 + currentDate.getUTCSeconds() / 3600;
        const sunLongitude = 180 - (totalHours / 24) * 360;
        const solarVector = latLngToCartesian(currentSunDetails.declination, sunLongitude, 42);

        sunLight.position.copy(solarVector);
        sunLight.lookAt(0, 0, 0);

        if (globeSunSphere) {
          globeSunSphere.position.copy(solarVector);
        }

      } else if (viewMode === 'orbit') {
        if (orbitEarthGroup) {
          orbitEarthGroup.position.set(ex, 0, ez);
        }

        if (orbitGlobeMesh) {
          const dayFraction = (currentDate.getUTCHours() * 60 + currentDate.getUTCMinutes()) / 1440;
          orbitGlobeMesh.rotation.y = dayFraction * Math.PI * 2 + Math.PI;
        }

        if (orbitSunRay) {
          const positions = orbitSunRay.geometry.attributes.position.array as Float32Array;
          positions[3] = -ex;
          positions[5] = -ez;
          orbitSunRay.geometry.attributes.position.needsUpdate = true;
        }
      }

      renderer.render(scene, camera);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      resizeObserver.disconnect();
      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.domElement.remove();
      }
    };
  }, [viewMode, location, trackingTarget, prayerTimes]);

  return (
    <div className="relative w-full h-full bg-[#020409] rounded-xl overflow-hidden border border-slate-800 shadow-2xl select-none group/viewport">
      
      {/* 3D Drag Overlay Target */}
      <div 
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Floating Headers and Stats readouts inside target viewport */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 pointer-events-none select-none">
          <div className="flex items-center gap-2 bg-[#060b18]/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-cyan-500/25 text-xs font-mono text-cyan-400">
            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
            <span className="font-extrabold uppercase">
              {viewMode === 'dome' && 'Observer Local Celestial Dome'}
              {viewMode === 'globe' && 'World Globe & Daylight Terminator'}
              {viewMode === 'orbit' && 'Keplerian Solar System Orbit'}
            </span>
          </div>

          <p className="text-[10px] font-mono text-slate-400 bg-slate-950/80 backdrop-blur px-2.5 py-1.5 rounded-md border border-slate-800 max-w-[210px] leading-tight shadow-md">
            🖱️ Drag viewport anywhere to rotate orbit yaw/pitch. Support mouse scroll wheel or buttons to zoom.
          </p>
        </div>

        {/* Floating Viewport control buttons */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
          {/* Zoom Buttons */}
          <div className="flex flex-col rounded-lg bg-[#060b18]/90 border border-slate-800 overflow-hidden shadow-lg p-0.5">
            <button
              onClick={() => handleZoom('in')}
              className="p-1 px-2.5 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition"
              title="Zoom Camera In"
            >
              <ZoomIn size={15} />
            </button>
            <div className="h-[1px] bg-slate-800/80 mx-1" />
            <button
              onClick={() => handleZoom('out')}
              className="p-1 px-2.5 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition"
              title="Zoom Camera Out"
            >
              <ZoomOut size={15} />
            </button>
          </div>

          {/* Heliocentric Orbit Mode target focus switcher */}
          {viewMode === 'orbit' && (
            <div className="bg-[#060b18]/95 border border-slate-800 rounded-lg p-1.5 flex flex-col gap-1 text-[10px] font-mono shadow-xl shrink-0">
              <span className="text-slate-500 uppercase text-[8px] font-extrabold px-1 tracking-wider leading-none mb-1">CAMERA TRACK TARGET</span>
              <button
                onClick={() => setTrackingTarget('sun')}
                className={`py-1 px-2 rounded-md text-left transition flex items-center gap-1.5 cursor-pointer font-bold ${trackingTarget === 'sun' ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300' : 'text-slate-400 hover:text-white'}`}
              >
                <Target size={11} className="text-amber-500" />
                <span>Central Sun</span>
              </button>
              <button
                onClick={() => setTrackingTarget('earth')}
                className={`py-1 px-2 rounded-md text-left transition flex items-center gap-1.5 cursor-pointer font-bold ${trackingTarget === 'earth' ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300' : 'text-slate-400 hover:text-white'}`}
              >
                <Target size={11} className="text-cyan-400" />
                <span>Orbiting Earth</span>
              </button>
            </div>
          )}
        </div>

        {/* Play/Pause Simulator Control overlay footer */}
        <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2">
          {/* View angle indicators */}
          <div className="hidden xs:flex items-center gap-1.5 bg-slate-950/85 border border-slate-800 text-[10px] text-slate-400 px-3 py-1.5 rounded-lg font-mono">
            <Compass size={11} className="text-cyan-400" />
            <span>Viewer Elev Angle: {(-cameraPhiRef.current * 180 / Math.PI).toFixed(0)}°</span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePlay();
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border font-mono text-xs font-bold transition-all shadow-md cursor-pointer ${
              isPlaying 
                ? 'bg-amber-500/20 border-amber-400/50 text-amber-300 hover:bg-amber-400/30' 
                : 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 hover:bg-cyan-400/30'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause size={13} className="animate-pulse" />
                <span>TIME FLOW RUNNING</span>
              </>
            ) : (
              <>
                <Play size={13} />
                <span>SIMULATE ACTIONS</span>
              </>
            )}
          </button>
        </div>

        {/* Cardinal Legends overlay for local celestial dome */}
        {viewMode === 'dome' && (
          <div className="absolute bottom-4 left-4 z-10 flex flex-wrap gap-1.5 pointer-events-none select-none">
            <span className="bg-[#ef4444]/25 border border-[#ef4444]/40 text-[#fca5a5] font-mono text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">N (Morocco North)</span>
            <span className="bg-[#10b981]/25 border border-[#10b981]/40 text-[#a7f3d0] font-mono text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">E (Sunrise)</span>
            <span className="bg-[#64748b]/25 border border-[#64748b]/40 text-slate-300 font-mono text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">S (South)</span>
            <span className="bg-[#f59e0b]/25 border border-[#f59e0b]/40 text-[#fde047] font-mono text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">W (Sunset)</span>
          </div>
        )}

        {/* Dynamic target container */}
        <div ref={containerRef} className="w-full h-full" id="observatory-canvas-viewport" />
      </div>
    </div>
  );
};
