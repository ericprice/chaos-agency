(function(){
  function shuffleArray(items){
    const arr = items.slice();
    for(let i = arr.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function renderStatement(container, texts){
    container.innerHTML = '';
    const section = document.createElement('section');
    section.className = 'statement';
    texts.slice(0, 3).forEach(text => {
      const p = document.createElement('p');
      p.className = 'line';
      p.textContent = String(text);
      section.appendChild(p);
    });
    container.appendChild(section);
  }

  // Base random size/placement/color setup shared across modes
  function randomizeShapesBase(shapesRoot, options){
    const paletteVars = ['--green','--purple','--black','--red','--blue','--orange'];
    const excludeVar = options && options.excludeVar ? String(options.excludeVar) : null;
    const palette = excludeVar && paletteVars.includes(excludeVar)
      ? paletteVars.filter(v => v !== excludeVar)
      : paletteVars;
    const chosenVar = palette[Math.floor(Math.random() * palette.length)];
    const nodes = Array.from(shapesRoot.querySelectorAll('.shape'));

    // Apply color
    nodes.forEach(svg => {
      const paintTargets = svg.querySelectorAll('.cls-1, path, rect, polygon, circle, ellipse, polyline');
      paintTargets.forEach(el => {
        el.style.fill = `var(${chosenVar})`;
      });
    });

    // Randomize order and place shapes
    const shuffledNodes = (arr => arr.map(v=>({v, r:Math.random()})).sort((a,b)=>a.r-b.r).map(o=>o.v))([...nodes]);
    const columns = [0.12, 0.5, 0.88];
    const rows = [0.12, 0.5, 0.88];
    const colOrder = (arr => arr.map(v=>({v, r:Math.random()})).sort((a,b)=>a.r-b.r).map(o=>o.v))([0,1,2]);
    const rowOrder = (arr => arr.map(v=>({v, r:Math.random()})).sort((a,b)=>a.r-b.r).map(o=>o.v))([0,1,2]);
    const jitter = (n) => (Math.random() - 0.5) * n;
    const clampRange = (x, min, max) => Math.max(min, Math.min(max, x));
    const bigIndex = Math.floor(Math.random() * shuffledNodes.length);

    const baseStates = shuffledNodes.map((node, i) => {
      const colIdx = colOrder[i % columns.length];
      const rowIdx = rowOrder[i % rows.length];
      const left = clampRange(columns[colIdx] + jitter(0.36), 0.12, 0.88);
      const top = clampRange(rows[rowIdx] + jitter(0.44), 0.12, 0.88);
      let scale = 0.35 + Math.random() * 0.4;
      if (i === bigIndex) {
        scale = 1.0 + Math.random() * 0.25;
      }
      const rotate = Math.floor(Math.random() * 360);
      const z = 10 + Math.floor(Math.random() * 90);
      return { node, left, top, scale, rotate, z };
    });

    // Apply base styles to DOM
    applyBaseStyles(baseStates);
    return baseStates;
  }

  function applyBaseStyles(baseStates){
    baseStates.forEach(s => {
      s.node.style.left = (s.left * 100) + '%';
      s.node.style.top = (s.top * 100) + '%';
      s.node.style.transform = `translate(-50%, -50%) rotate(${s.rotate}deg) scale(${s.scale})`;
      s.node.style.opacity = '1';
      s.node.style.zIndex = String(s.z);
      s.node.style.transition = '';
    });
  }

  const ModeControllers = {
    1: function staticRandomized(_shapesRoot, base){
      // Keep base as-is
      applyBaseStyles(base);
      return function teardown(){
        applyBaseStyles(base);
      };
    },

    2: function slowDrift(shapesRoot, base, setBase){
      applyBaseStyles(base);
      let state = base.map(b => ({
        ...b,
        vx: (Math.random() - 0.5) * 0.0006,
        vy: (Math.random() - 0.5) * 0.0006,
        vr: (Math.random() - 0.5) * 0.06,
        ox: 0,
        oy: 0,
        or: 0
      }));

      function getCurrentPaletteVar(){
        const anyShape = shapesRoot.querySelector('.shape');
        if (!anyShape) return null;
        const painted = anyShape.querySelector('.cls-1, path, rect, polygon, circle, ellipse, polyline');
        if (!painted) return null;
        const fill = painted.style.fill || '';
        // Expect format like 'var(--green)'
        const match = /var\((--[a-z]+)\)/i.exec(fill);
        return match ? match[1] : null;
      }

      function regenerate(){
        const currentVar = getCurrentPaletteVar();
        const newBase = randomizeShapesBase(shapesRoot, { excludeVar: currentVar }); // re-color and re-place
        if (typeof setBase === 'function') setBase(newBase);
        state = newBase.map(b => ({
          ...b,
          vx: (Math.random() - 0.5) * 0.0006,
          vy: (Math.random() - 0.5) * 0.0006,
          vr: (Math.random() - 0.5) * 0.06,
          ox: 0,
          oy: 0,
          or: 0
        }));
      }

      let rafId = 0;
      function tick(){
        state.forEach(s => {
          s.ox += s.vx;
          s.oy += s.vy;
          s.or += s.vr;
          if (s.left + s.ox < 0.08 || s.left + s.ox > 0.92) s.vx *= -1;
          if (s.top + s.oy < 0.08 || s.top + s.oy > 0.92) s.vy *= -1;
          const left = (s.left + s.ox) * 100;
          const top = (s.top + s.oy) * 100;
          const rotate = s.rotate + s.or;
          s.node.style.left = left + '%';
          s.node.style.top = top + '%';
          s.node.style.transform = `translate(-50%, -50%) rotate(${rotate}deg) scale(${s.scale})`;
        });
        rafId = requestAnimationFrame(tick);
      }
      rafId = requestAnimationFrame(tick);

      function onClick(){
        regenerate();
      }
      window.addEventListener('click', onClick, { passive: true });

      return function teardown(){
        window.removeEventListener('click', onClick);
        cancelAnimationFrame(rafId);
        applyBaseStyles(base);
      };
    },

    3: function cursorReactive(_shapesRoot, base){
      applyBaseStyles(base);
      let targetX = 0.5, targetY = 0.5;
      function onPointerMove(e){
        const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
        const x = ('clientX' in e) ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : vw/2);
        const y = ('clientY' in e) ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : vh/2);
        targetX = x / vw;
        targetY = y / vh;
      }
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('touchmove', onPointerMove, { passive: true });

      let rafId = 0;
      function tick(){
        base.forEach((b, i) => {
          const dx = (targetX - 0.5) * 0.6;
          const dy = (targetY - 0.5) * 0.6;
          const parallax = (i + 1) / (base.length + 1);
          const left = (b.left + dx * (0.3 + parallax * 0.7));
          const top = (b.top + dy * (0.3 + parallax * 0.7));
          const rot = b.rotate + (dx - dy) * 40 * (parallax);
          b.node.style.left = (left * 100) + '%';
          b.node.style.top = (top * 100) + '%';
          b.node.style.transform = `translate(-50%, -50%) rotate(${rot}deg) scale(${b.scale})`;
        });
        rafId = requestAnimationFrame(tick);
      }
      rafId = requestAnimationFrame(tick);

      return function teardown(){
        cancelAnimationFrame(rafId);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('touchmove', onPointerMove);
        applyBaseStyles(base);
      };
    },
    4: function shakeRamp(_shapesRoot, base){
      applyBaseStyles(base);
      const state = base.map(b => ({
        ...b,
        phase: Math.random() * Math.PI * 2
      }));
      let startTime = performance.now();
      let rafId = 0;
      function easeOutCubic(p){ return 1 - Math.pow(1 - p, 3); }
      const freqHz = 12; // constant speed
      const omega = 2 * Math.PI * freqHz;
      const maxAmp = 0.05; // max horizontal distance in viewport fraction
      function tick(){
        const elapsed = (performance.now() - startTime) / 1000;
        const p = Math.min(Math.max(elapsed / 20, 0), 1);
        const amp = maxAmp * easeOutCubic(p);
        state.forEach(s => {
          const angle = s.phase + elapsed * omega;
          const dx = amp * Math.sin(angle);
          const left = Math.max(0.06, Math.min(0.94, s.left + dx));
          s.node.style.left = (left * 100) + '%';
        });
        rafId = requestAnimationFrame(tick);
      }
      function onClick(){ startTime = performance.now() + 5000; }
      window.addEventListener('click', onClick, { passive: true });
      rafId = requestAnimationFrame(tick);
      return function teardown(){
        window.removeEventListener('click', onClick);
        cancelAnimationFrame(rafId);
        applyBaseStyles(base);
      };
    },
    5: function magneticFollow(_shapesRoot, base){
      applyBaseStyles(base);
      let cursorX = 0.5, cursorY = 0.5;
      const state = base.map(b => ({ ...b, ox: 0, oy: 0 }));
      const influenceRadius = 0.6; // viewport fraction
      const maxOffset = 0.05; // max displacement from base in viewport fraction
      const smoothing = 0.12; // approach speed toward target offset

      function onPointerMove(e){
        const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
        const x = ('clientX' in e) ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : vw/2);
        const y = ('clientY' in e) ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : vh/2);
        cursorX = x / vw;
        cursorY = y / vh;
      }
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('touchmove', onPointerMove, { passive: true });

      let rafId = 0;
      function tick(){
        state.forEach(s => {
          const dx = cursorX - s.left;
          const dy = cursorY - s.top;
          const dist = Math.hypot(dx, dy) || 0.0001;
          const nx = dx / dist;
          const ny = dy / dist;
          const influence = Math.max(0, 1 - dist / influenceRadius);
          const targetOx = nx * maxOffset * (influence * influence);
          const targetOy = ny * maxOffset * (influence * influence);
          s.ox += (targetOx - s.ox) * smoothing;
          s.oy += (targetOy - s.oy) * smoothing;
          const left = Math.max(0.06, Math.min(0.94, s.left + s.ox));
          const top = Math.max(0.06, Math.min(0.94, s.top + s.oy));
          const rot = s.rotate + (s.ox * 60);
          s.node.style.left = (left * 100) + '%';
          s.node.style.top = (top * 100) + '%';
          s.node.style.transform = `translate(-50%, -50%) rotate(${rot}deg) scale(${s.scale})`;
        });
        rafId = requestAnimationFrame(tick);
      }
      rafId = requestAnimationFrame(tick);

      return function teardown(){
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('touchmove', onPointerMove);
        cancelAnimationFrame(rafId);
        applyBaseStyles(base);
      };
    },
    6: function magneticFollowGlobal(_shapesRoot, base){
      applyBaseStyles(base);
      let cursorX = 0.5, cursorY = 0.5;
      const state = base.map(b => ({ ...b, ox: 0, oy: 0, bx: 0, by: 0, bvx: 0, bvy: 0 }));
      const maxOffset = 0.20; // increased max displacement
      const smoothing = 0.10;
      const distanceEmphasis = 6; // stronger emphasis for far shapes
      const baseBias = 0.22; // minimum influence even when very close
      // Blast (click) dynamics
      const blastSpring = 0.08;      // pull blast offsets back to 0
      const blastDamping = 0.86;     // velocity damping per frame
      const shockRadius = 0.8;       // viewport fraction
      const shockImpulse = 0.35;     // initial outward speed in viewport frac units

      function onPointerMove(e){
        const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
        const x = ('clientX' in e) ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : vw/2);
        const y = ('clientY' in e) ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : vh/2);
        cursorX = x / vw;
        cursorY = y / vh;
      }
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('touchmove', onPointerMove, { passive: true });

      let rafId = 0;
      function tick(){
        state.forEach(s => {
          const dx = cursorX - s.left;
          const dy = cursorY - s.top;
          const dist = Math.hypot(dx, dy) || 0.0001;
          const nx = dx / dist;
          const ny = dy / dist;
          const distNorm = Math.min(dist / Math.SQRT2, 1); // 0 near, ~1 far corner
          // Strength grows with distance; ensure a baseline for near shapes
          let strength = baseBias + (1 - baseBias) * Math.pow(distNorm, distanceEmphasis);
          const targetOx = nx * maxOffset * strength;
          const targetOy = ny * maxOffset * strength;
          s.ox += (targetOx - s.ox) * smoothing;
          s.oy += (targetOy - s.oy) * smoothing;

          // Blast physics: spring back to zero with damping
          s.bvx += -s.bx * blastSpring;
          s.bvy += -s.by * blastSpring;
          s.bvx *= blastDamping;
          s.bvy *= blastDamping;
          s.bx += s.bvx;
          s.by += s.bvy;

          const left = Math.max(0.06, Math.min(0.94, s.left + s.ox + s.bx));
          const top = Math.max(0.06, Math.min(0.94, s.top + s.oy + s.by));
          const rot = s.rotate + (s.ox * 60);
          s.node.style.left = (left * 100) + '%';
          s.node.style.top = (top * 100) + '%';
          s.node.style.transform = `translate(-50%, -50%) rotate(${rot}deg) scale(${s.scale})`;
        });
        rafId = requestAnimationFrame(tick);
      }
      rafId = requestAnimationFrame(tick);

      function onClick(e){
        const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
        const cx = ('clientX' in e) ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : vw/2);
        const cy = ('clientY' in e) ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : vh/2);
        const clickX = cx / vw;
        const clickY = cy / vh;
        state.forEach(s => {
          const curLeft = s.left + s.ox + s.bx;
          const curTop = s.top + s.oy + s.by;
          const dx = curLeft - clickX;
          const dy = curTop - clickY;
          const d = Math.hypot(dx, dy) || 0.0001;
          const nx = dx / d;
          const ny = dy / d;
          const influence = Math.max(0, 1 - d / shockRadius);
          const impulse = shockImpulse * (influence * influence);
          s.bvx += nx * impulse;
          s.bvy += ny * impulse;
        });
      }
      window.addEventListener('click', onClick, { passive: true });

      return function teardown(){
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('touchmove', onPointerMove);
        window.removeEventListener('click', onClick);
        cancelAnimationFrame(rafId);
        applyBaseStyles(base);
      };
    },
    7: function repelCursor(_shapesRoot, base){
      applyBaseStyles(base);
      let cursorX = 0.5, cursorY = 0.5;
      const state = base.map(b => ({ ...b, ox: 0, oy: 0 }));
      const maxOffset = 0.28; // stronger max push
      const smoothing = 0.12; // slightly quicker response
      const nearEmphasis = 4; // emphasize near repulsion
      const baseBias = 0.20; // minimum repulsion even when far

      function onPointerMove(e){
        const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
        const x = ('clientX' in e) ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : vw/2);
        const y = ('clientY' in e) ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : vh/2);
        cursorX = x / vw;
        cursorY = y / vh;
      }
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('touchmove', onPointerMove, { passive: true });

      let rafId = 0;
      function tick(){
        state.forEach(s => {
          const dx = s.left - cursorX; // vector away from cursor (supports diagonal)
          const dy = s.top - cursorY;
          const dist = Math.hypot(dx, dy) || 0.0001;
          const nx = dx / dist;
          const ny = dy / dist;
          const distNorm = Math.min(dist / Math.SQRT2, 1); // 0 near, ~1 far corner
          // Nearer shapes are repelled more; far shapes retain baseline
          let strength = baseBias + (1 - baseBias) * Math.pow(1 - distNorm, nearEmphasis);
          const targetOx = nx * maxOffset * strength;
          const targetOy = ny * maxOffset * strength;
          s.ox += (targetOx - s.ox) * smoothing;
          s.oy += (targetOy - s.oy) * smoothing;
          const left = Math.max(0.06, Math.min(0.94, s.left + s.ox));
          const top = Math.max(0.06, Math.min(0.94, s.top + s.oy));
          const rot = s.rotate + (s.ox * 60);
          s.node.style.left = (left * 100) + '%';
          s.node.style.top = (top * 100) + '%';
          s.node.style.transform = `translate(-50%, -50%) rotate(${rot}deg) scale(${s.scale})`;
        });
        rafId = requestAnimationFrame(tick);
      }
      rafId = requestAnimationFrame(tick);

      return function teardown(){
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('touchmove', onPointerMove);
        cancelAnimationFrame(rafId);
        applyBaseStyles(base);
      };
    },
    8: function swapOnHover(shapesRoot, base){
      applyBaseStyles(base);
      const nodesDom = Array.from(shapesRoot.querySelectorAll('.shape')); // DOM order: 0,1,2
      const paintSel = '.cls-1, path, rect, polygon, circle, ellipse, polyline';

      // Capture templates for each original type (by initial id)
      const templatesByType = {};
      const initialTypeByNode = new Map();
      const currentTypeByNode = new Map();
      const fillByNode = new Map();

      nodesDom.forEach(node => {
        const type = node.getAttribute('id') || 'shape';
        if (!templatesByType[type]) {
          templatesByType[type] = {
            viewBox: node.getAttribute('viewBox') || '',
            inner: node.innerHTML
          };
        }
        initialTypeByNode.set(node, type);
        currentTypeByNode.set(node, type);
        const sample = node.querySelector(paintSel);
        const fill = sample && sample.style && sample.style.fill ? sample.style.fill : '';
        fillByNode.set(node, fill);
      });

      function applyTypeToNode(node, type){
        const tpl = templatesByType[type];
        if (!tpl) return;
        if (tpl.viewBox) node.setAttribute('viewBox', tpl.viewBox);
        node.innerHTML = tpl.inner;
        const fill = fillByNode.get(node) || '';
        node.querySelectorAll(paintSel).forEach(el => { el.style.fill = fill; });
      }

      function swapForIndex(index){
        if (index < 0 || index >= nodesDom.length) return;
        const target = nodesDom[index];
        // pick a random other index
        const others = nodesDom.filter(n => n !== target);
        const other = others[Math.floor(Math.random() * others.length)];
        const typeA = currentTypeByNode.get(target);
        const typeB = currentTypeByNode.get(other);
        if (!typeA || !typeB || typeA === typeB) return;
        applyTypeToNode(target, typeB);
        applyTypeToNode(other, typeA);
        currentTypeByNode.set(target, typeB);
        currentTypeByNode.set(other, typeA);
      }

      let lastZone = -1;
      const onPointerMove = (e) => {
        const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
        const x = ('clientX' in e) ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : null);
        const y = ('clientY' in e) ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : null);
        const useVertical = vh > vw; // portrait: divide into top/middle/bottom thirds
        let zone = -1;
        if (useVertical) {
          if (y == null || vh === 0) return;
          const frac = y / vh;
          zone = frac < 1/3 ? 0 : (frac < 2/3 ? 1 : 2);
        } else {
          if (x == null || vw === 0) return;
          const frac = x / vw;
          zone = frac < 1/3 ? 0 : (frac < 2/3 ? 1 : 2);
        }
        if (zone !== lastZone) {
          swapForIndex(zone);
          lastZone = zone;
        }
      };
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('touchmove', onPointerMove, { passive: true });

      return function teardown(){
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('touchmove', onPointerMove);
        // Restore original types to nodes
        nodesDom.forEach(node => {
          const orig = initialTypeByNode.get(node);
          applyTypeToNode(node, orig);
        });
        applyBaseStyles(base);
      };
    },
    9: function spinOnHit(shapesRoot, base){
      // Physics parameters (slightly longer wind-down, minimal spin)
      const angularDamping = 0.94;  // closer to 1 → slower decay
      const hitImpulseScale = 4;    // ~half of previous impulse
      const maxAngularVelocity = 45; // ~half of previous cap

      // Build runtime state: track extra rotation offset and angular velocity
      const state = base.map(b => ({
        ...b,
        rotOffset: 0,
        angVel: 0
      }));

      applyBaseStyles(base);

      function findStateForNode(node){
        return state.find(s => s.node === node) || null;
      }

      function nodesAtPoint(x, y){
        // Return all shapes whose bounding box contains the point (ignores stacking)
        const hits = [];
        for (let i = 0; i < state.length; i++){
          const rect = state[i].node.getBoundingClientRect();
          if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
            hits.push(state[i]);
          }
        }
        return hits;
      }

      let lastX = null, lastY = null, lastT = null;
      function onPointerMove(e){
        const now = performance.now();
        const x = ('clientX' in e) ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : null);
        const y = ('clientY' in e) ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : null);
        if (x == null || y == null) return;
        if (lastX == null || lastY == null || lastT == null){
          lastX = x; lastY = y; lastT = now; return;
        }
        const dt = Math.max((now - lastT) / 1000, 1/1000);
        const vx = (x - lastX) / dt; // px/s
        const vy = (y - lastY) / dt; // px/s

        // Determine if we hit shapes this frame; apply to all under cursor
        const hits = nodesAtPoint(x, y);
        if (hits.length){
          for (let i = 0; i < hits.length; i++){
            const h = hits[i];
            const rect = h.node.getBoundingClientRect();
            const cx = rect.left + rect.width/2;
            const cy = rect.top + rect.height/2;
            // Lever arm from center to contact point
            const rx = x - cx;
            const ry = y - cy;
            // 2D torque sign via z-component of cross(r, v) = r_x * v_y - r_y * v_x
            const torque = (rx * vy - ry * vx);
            // Convert to deg/s impulse
            let impulse = (torque / Math.max(rect.width, rect.height)) * hitImpulseScale;
            // Clamp and accumulate
            impulse = Math.max(-maxAngularVelocity, Math.min(maxAngularVelocity, impulse));
            h.angVel = Math.max(-maxAngularVelocity, Math.min(maxAngularVelocity, h.angVel + impulse));
          }
        }

        lastX = x; lastY = y; lastT = now;
      }
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('touchmove', onPointerMove, { passive: true });

      let rafId = 0;
      function tick(){
        const dt = 1/60; // assume ~60fps for damping simplicity
        state.forEach(s => {
          if (Math.abs(s.angVel) > 0.01){
            s.rotOffset += s.angVel * dt;
            s.angVel *= angularDamping;
            const rot = s.rotate + s.rotOffset;
            s.node.style.transform = `translate(-50%, -50%) rotate(${rot}deg) scale(${s.scale})`;
          }
        });
        rafId = requestAnimationFrame(tick);
      }
      rafId = requestAnimationFrame(tick);

      return function teardown(){
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('touchmove', onPointerMove);
        cancelAnimationFrame(rafId);
        applyBaseStyles(base);
      };
    },
    10: function blastOnly(_shapesRoot, base){
      applyBaseStyles(base);
      const state = base.map(b => ({ ...b, bx: 0, by: 0, bvx: 0, bvy: 0 }));
      const blastSpring = 0.08;
      const blastDamping = 0.86;
      const shockRadius = 0.8;
      const shockImpulse = 0.35;

      let rafId = 0;
      function tick(){
        state.forEach(s => {
          s.bvx += -s.bx * blastSpring;
          s.bvy += -s.by * blastSpring;
          s.bvx *= blastDamping;
          s.bvy *= blastDamping;
          s.bx += s.bvx;
          s.by += s.bvy;
          const left = Math.max(0.06, Math.min(0.94, s.left + s.bx));
          const top = Math.max(0.06, Math.min(0.94, s.top + s.by));
          s.node.style.left = (left * 100) + '%';
          s.node.style.top = (top * 100) + '%';
          s.node.style.transform = `translate(-50%, -50%) rotate(${s.rotate}deg) scale(${s.scale})`;
        });
        rafId = requestAnimationFrame(tick);
      }
      rafId = requestAnimationFrame(tick);

      function onClick(e){
        const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
        const cx = ('clientX' in e) ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : vw/2);
        const cy = ('clientY' in e) ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : vh/2);
        const clickX = cx / vw;
        const clickY = cy / vh;
        state.forEach(s => {
          const curLeft = s.left + s.bx;
          const curTop = s.top + s.by;
          const dx = curLeft - clickX;
          const dy = curTop - clickY;
          const d = Math.hypot(dx, dy) || 0.0001;
          const nx = dx / d;
          const ny = dy / d;
          const influence = Math.max(0, 1 - d / shockRadius);
          const impulse = shockImpulse * (influence * influence);
          s.bvx += nx * impulse;
          s.bvy += ny * impulse;
        });
      }
      window.addEventListener('click', onClick, { passive: true });

      return function teardown(){
        window.removeEventListener('click', onClick);
        cancelAnimationFrame(rafId);
        applyBaseStyles(base);
      };
    },
    11: function driftWithIdleFade(shapesRoot, base){
      // Reuse slow drift logic
      applyBaseStyles(base);
      shapesRoot.style.filter = 'none';
      const state = base.map(b => ({
        ...b,
        vx: (Math.random() - 0.5) * 0.0006,
        vy: (Math.random() - 0.5) * 0.0006,
        vr: (Math.random() - 0.5) * 0.06,
        ox: 0,
        oy: 0,
        or: 0
      }));

      // Idle fade controller
      let lastMoveAt = performance.now();
      let opacity = 1;
      const idleThresholdMs = 5000; // 5s without movement
      const fadeDurationMs = 20000; // 20s fade to 0
      const blurMaxEm = 3;        // max blur at full fade

      function onPointerMove(){
        lastMoveAt = performance.now();
        if (opacity !== 1) {
          opacity = 1;
          shapesRoot.style.opacity = '1';
          shapesRoot.style.filter = 'none';
        }
      }
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('touchmove', onPointerMove, { passive: true });

      let rafId = 0;
      function tick(){
        // Drift
        state.forEach(s => {
          s.ox += s.vx;
          s.oy += s.vy;
          s.or += s.vr;
          if (s.left + s.ox < 0.08 || s.left + s.ox > 0.92) s.vx *= -1;
          if (s.top + s.oy < 0.08 || s.top + s.oy > 0.92) s.vy *= -1;
          const left = (s.left + s.ox) * 100;
          const top = (s.top + s.oy) * 100;
          const rotate = s.rotate + s.or;
          s.node.style.left = left + '%';
          s.node.style.top = top + '%';
          s.node.style.transform = `translate(-50%, -50%) rotate(${rotate}deg) scale(${s.scale})`;
        });

        // Idle fade over time
        const now = performance.now();
        const idleMs = now - lastMoveAt;
        if (idleMs >= idleThresholdMs){
          const t = Math.min((idleMs - idleThresholdMs) / fadeDurationMs, 1);
          const nextOpacity = 1 - t; // linear fade
          const blurEm = blurMaxEm * t;
          if (nextOpacity !== opacity){
            opacity = nextOpacity;
            shapesRoot.style.opacity = String(opacity);
          }
          shapesRoot.style.filter = `blur(${blurEm.toFixed(2)}em)`;
        }

        rafId = requestAnimationFrame(tick);
      }
      rafId = requestAnimationFrame(tick);

      return function teardown(){
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('touchmove', onPointerMove);
        cancelAnimationFrame(rafId);
        shapesRoot.style.opacity = '1';
        shapesRoot.style.filter = 'none';
        applyBaseStyles(base);
      };
    }
  };

  document.addEventListener('DOMContentLoaded', function(){
    const statementsContainer = document.getElementById('statements');
    const shapesRoot = document.getElementById('shapes');

    if (statementsContainer) {
      let loadedStatements = null;
      let index = 0;
      fetch('/statements.json?ts=' + Date.now(), { cache: 'no-store' })
        .then(res => {
          if(!res.ok) throw new Error('Failed to load blocks.json');
          return res.json();
        })
        .then(json => {
          if(Array.isArray(json)){
            loadedStatements = json
              .filter(item => Array.isArray(item) && item.length > 0)
              .map(item => item.slice(0, 3));
            loadedStatements = shuffleArray(loadedStatements);
            index = 0;
            renderStatement(statementsContainer, loadedStatements[index]);
            setInterval(() => {
              index = (index + 1) % loadedStatements.length;
              renderStatement(statementsContainer, loadedStatements[index]);
            }, 30000);
          } else {
            const nodes = Array.from(statementsContainer.querySelectorAll('.statement'));
            if(nodes.length > 0){
              const texts = nodes.map(node => Array.from(node.querySelectorAll('p')).map(p=>p.textContent));
              loadedStatements = shuffleArray(texts);
              statementsContainer.innerHTML = '';
              index = 0;
              renderStatement(statementsContainer, loadedStatements[index]);
              setInterval(() => {
                index = (index + 1) % loadedStatements.length;
                renderStatement(statementsContainer, loadedStatements[index]);
              }, 30000);
            }
          }
        })
        .catch(() => {
          const nodes = Array.from(statementsContainer.querySelectorAll('.statement'));
          if(nodes.length > 0){
            const texts = nodes.map(node => Array.from(node.querySelectorAll('p')).map(p=>p.textContent));
            loadedStatements = shuffleArray(texts);
            statementsContainer.innerHTML = '';
            index = 0;
            renderStatement(statementsContainer, loadedStatements[index]);
            setInterval(() => {
              index = (index + 1) % loadedStatements.length;
              renderStatement(statementsContainer, loadedStatements[index]);
            }, 30000);
          }
        });
    }

    // Shape modes + toggle
    const toggle = document.getElementById('mode-toggle');
    const select = toggle ? toggle.querySelector('#mode-select') : null;
    let activeTeardown = null;
    let shapesBase = null;

    function setSelectValue(mode){
      if (!select) return;
      select.value = String(mode);
    }

    function startMode(mode){
      if (!shapesRoot || !ModeControllers[mode]) return;
      if (activeTeardown) {
        try { activeTeardown(); } catch(_){}
        activeTeardown = null;
      }
      if (!shapesBase) {
        shapesBase = randomizeShapesBase(shapesRoot);
      } else {
        applyBaseStyles(shapesBase);
      }
      const setBase = (nextBase) => { shapesBase = nextBase; };
      activeTeardown = ModeControllers[mode](shapesRoot, shapesBase, setBase);
      setSelectValue(mode);
      try { localStorage.setItem('shapeMode', String(mode)); } catch(_){}
      document.documentElement.setAttribute('data-shape-mode', String(mode));
    }

    if (select) {
      select.addEventListener('change', () => {
        const mode = Number(select.value) || 1;
        startMode(mode);
      });
    }

    // Initialize default or persisted mode
    const initialMode = Number((() => { try { return localStorage.getItem('shapeMode'); } catch(_) { return null; } })()) || 1;
    if (shapesRoot) startMode(initialMode);
    else setSelectValue(initialMode);
  });
})();
