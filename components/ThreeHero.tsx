
import React, { useRef, useEffect } from 'react';
import * as THREE from 'https://esm.sh/three@0.182.0';

const ThreeHero: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  const playCyberSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.2);
    } catch (e) {
      console.warn("Audio Context not supported or blocked");
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    camera.position.set(0, 0, 15);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let boostActive = 0; 
    let initialLaunch = true;

    const rocketState = {
      pos: new THREE.Vector3(0, -45, 0),
      vel: new THREE.Vector3(0, 0, 0),
      rot: new THREE.Euler(0, 0, 0),
    };

    const DAMPING = 0.05; 
    const SPRING_STIFFNESS = 0.015;
    const ROTATION_LERP = 0.08; 
    let introInfluence = 0; 

    const particles: any[] = [];
    const particleGeometry = new THREE.IcosahedronGeometry(0.2, 0);
    const particleMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00D4FF, 
      transparent: true, 
      opacity: 0.8,
      blending: THREE.AdditiveBlending 
    });

    const ambientLight = new THREE.AmbientLight(0x404040, 5);
    scene.add(ambientLight);

    const mainLight = new THREE.SpotLight(0x00D4FF, 180);
    mainLight.position.set(15, 15, 15);
    scene.add(mainLight);

    const engineLight = new THREE.PointLight(0x00D4FF, 0, 50);
    scene.add(engineLight);

    const cyanWireframe = new THREE.MeshStandardMaterial({ 
      color: 0x00D4FF, 
      wireframe: true, 
      emissive: 0x00D4FF, 
      emissiveIntensity: 1.5 
    });
    const limeWireframe = new THREE.MeshStandardMaterial({ 
      color: 0x2ECC71, 
      wireframe: true, 
      emissive: 0x2ECC71, 
      emissiveIntensity: 1.0 
    });
    
    const rocket = new THREE.Group();
    const bodyGeo = new THREE.CylinderGeometry(1.2, 1.4, 6.5, 16, 6);
    const rocketBody = new THREE.Mesh(bodyGeo, cyanWireframe);
    rocket.add(rocketBody);
    
    const noseGeo = new THREE.ConeGeometry(1.2, 3.2, 16);
    const nose = new THREE.Mesh(noseGeo, cyanWireframe);
    nose.position.y = 4.8; 
    rocket.add(nose);
    
    for (let i = 0; i < 4; i++) {
      const pivot = new THREE.Object3D();
      pivot.rotation.y = (i / 4) * Math.PI * 2;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.5, 0.1), limeWireframe);
      fin.position.set(1.5, -2.0, 0);
      fin.rotation.z = -0.3;
      pivot.add(fin);
      rocket.add(pivot);
    }
    
    scene.add(rocket);

    const createStarLayer = (count: number, size: number, depth: number, speedMult: number) => {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      const phases = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 200;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 200;
        pos[i * 3 + 2] = Math.random() * -depth;
        phases[i] = Math.random() * Math.PI * 2;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
      
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uSize: { value: size },
          uColor: { value: new THREE.Color(0x00D4FF) }
        },
        vertexShader: `
          attribute float aPhase;
          uniform float uTime;
          uniform float uSize;
          varying float vOpacity;
          void main() {
            vOpacity = 0.3 + 0.7 * (sin(uTime * 2.0 + aPhase) * 0.5 + 0.5);
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = uSize * (700.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          varying float vOpacity;
          void main() {
            float dist = distance(gl_PointCoord, vec2(0.5));
            if (dist > 0.5) discard;
            gl_FragColor = vec4(uColor, vOpacity * (1.2 - dist * 2.4));
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const points = new THREE.Points(geo, mat);
      (points as any).speedMult = speedMult;
      return points;
    };

    const starsDepth = 500;
    const starsNear = createStarLayer(800, 2.5, 100, 1.0);
    const starsMid = createStarLayer(1500, 1.5, 300, 0.4);
    const starsFar = createStarLayer(2500, 0.8, 600, 0.1);
    
    scene.add(starsNear);
    scene.add(starsMid);
    scene.add(starsFar);

    const createParticle = (pos: THREE.Vector3, vel: THREE.Vector3) => {
      const p = new THREE.Mesh(particleGeometry, particleMaterial.clone());
      p.position.copy(pos);
      scene.add(p);
      return { 
        mesh: p, 
        vel: vel.clone().add(new THREE.Vector3((Math.random()-0.5)*0.1, (Math.random()-0.5)*0.1, (Math.random()-0.5)*0.1)), 
        life: 1.0,
        decay: 0.015 + Math.random() * 0.02
      };
    };

    let mouseX = 0, mouseY = 0;
    const onMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    const onMouseDown = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(rocket.children, true);
      if (intersects.length > 0) {
        boostActive = 1.0; 
        playCyberSound();
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);

    const animate = () => {
      requestAnimationFrame(animate);
      const time = Date.now() * 0.001;

      if (initialLaunch) {
        rocketState.vel.y += 0.5;
        rocketState.pos.y += rocketState.vel.y;
        if (rocketState.pos.y >= 0) {
          rocketState.pos.y = 0;
          rocketState.vel.y = 0;
          initialLaunch = false;
        }
      } else {
        if (introInfluence < 1.0) introInfluence += 0.02;
        const targetX = -mouseX * 6.0 * introInfluence; 
        const targetY = -mouseY * 6.0 * introInfluence;
        const forceX = (targetX - rocketState.pos.x) * SPRING_STIFFNESS;
        const forceY = (targetY - rocketState.pos.y) * SPRING_STIFFNESS;
        rocketState.vel.x = (rocketState.vel.x + forceX) * (1 - DAMPING);
        rocketState.vel.y = (rocketState.vel.y + forceY) * (1 - DAMPING);
        rocketState.pos.x += rocketState.vel.x;
        rocketState.pos.y += rocketState.vel.y;
      }

      const baseScrollSpeed = 0.5 + boostActive * 4.0;
      [starsNear, starsMid, starsFar].forEach((s: any) => {
        const positions = s.geometry.attributes.position.array as Float32Array;
        const depthFactor = s.speedMult;
        const parallaxX = -rocketState.vel.x * 2.0 * depthFactor;
        const parallaxY = -rocketState.vel.y * 2.0 * depthFactor;
        
        for (let i = 0; i < positions.length; i += 3) {
          positions[i] -= baseScrollSpeed * depthFactor * 0.4 + parallaxX;
          positions[i + 1] -= baseScrollSpeed * depthFactor * 0.4 + parallaxY;
          positions[i + 2] += baseScrollSpeed; 
          
          if (positions[i + 2] > 50) {
            positions[i + 2] = -starsDepth;
            positions[i] = (Math.random() - 0.5) * 200 + (mouseX * 50 * depthFactor);
            positions[i + 1] = (Math.random() - 0.5) * 200 + (mouseY * 50 * depthFactor);
          }
        }
        s.geometry.attributes.position.needsUpdate = true;
        (s.material as THREE.ShaderMaterial).uniforms.uTime.value = time;
      });

      const swayX = Math.sin(time * 0.7) * 0.4;
      const swayY = Math.cos(time * 0.9) * 0.4;
      rocket.position.set(rocketState.pos.x + swayX, rocketState.pos.y + swayY, 0);

      // Pronounced Feedback: Scaling based on boostActive
      const targetScale = 1.0 + (boostActive * 0.25);
      rocket.scale.setScalar(targetScale);

      // Pronounced Feedback: Emission intensity flash
      cyanWireframe.emissiveIntensity = 1.5 + (boostActive * 5.0);
      limeWireframe.emissiveIntensity = 1.0 + (boostActive * 3.0);

      const targetTiltX = (mouseY * 0.6 - rocketState.vel.y * 0.8) * introInfluence;
      const targetTiltZ = (mouseX * 0.5 + rocketState.vel.x * 0.8) * introInfluence;
      
      rocketState.rot.x += (targetTiltX - rocketState.rot.x) * ROTATION_LERP;
      rocketState.rot.z += ((-Math.PI / 4.5) + targetTiltZ - rocketState.rot.z) * ROTATION_LERP;
      
      rocket.rotation.set(
        rocketState.rot.x + Math.sin(time * 0.8) * 0.05,
        boostActive * Math.PI * 3.0 + Math.cos(time * 0.5) * 0.05, 
        rocketState.rot.z + Math.cos(time * 0.7) * 0.05
      );

      const engineGlobalPos = new THREE.Vector3(0, -3.2, 0).applyMatrix4(rocket.matrixWorld);
      if (Math.random() < (0.6 + boostActive)) {
        const particleVel = new THREE.Vector3(0, -0.3 - boostActive * 0.6, 0).applyQuaternion(rocket.quaternion);
        particleVel.add(rocketState.vel.clone().multiplyScalar(0.2));
        particles.push(createParticle(engineGlobalPos, particleVel));
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.mesh.position.add(p.vel);
        p.life -= p.decay;
        p.mesh.scale.setScalar(p.life);
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = p.life * 0.8;
        if (p.life <= 0) {
          scene.remove(p.mesh);
          particles.splice(i, 1);
        }
      }

      engineLight.position.copy(engineGlobalPos);
      engineLight.intensity = (60 + (Math.sin(time * 100) * 0.7 + 0.3) * 40) * (1.1 + boostActive * 12.0 + (initialLaunch ? 2.0 : 0));
      engineLight.color.setHex(boostActive > 0.5 ? 0x2ECC71 : 0x00D4FF);

      if (boostActive > 0) boostActive *= 0.94;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('resize', handleResize);
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0 z-0 overflow-hidden pointer-events-auto" />;
};

export default ThreeHero;
