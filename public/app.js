(function(){
  function shuffleArray(items){
    const arr = items.slice();
    for(let i = arr.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function renderStatement(container, item){
    container.innerHTML = '';
    const section = document.createElement('section');
    section.className = 'statement';
    const p = document.createElement('p');
    const quote = document.createElement('span');
    quote.className = 'quote';
    quote.textContent = String(item && item.quote ? item.quote : item);
    p.appendChild(quote);
    if (item && item.attribution) {
      const space = document.createTextNode(' ');
      p.appendChild(space);
      const attr = document.createElement('span');
      attr.className = 'attribution';
      attr.textContent = String(item.attribution);
      p.appendChild(attr);
    }
    section.appendChild(p);
    container.appendChild(section);
  }

  function randomizeShapesBase(shapesRoot){
    const paletteVars = ['--green','--purple','--black','--red','--blue','--orange'];
    const chosenVar = paletteVars[Math.floor(Math.random() * paletteVars.length)];
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
    baseStates.forEach(s => {
      s.node.style.left = (s.left * 100) + '%';
      s.node.style.top = (s.top * 100) + '%';
      s.node.style.transform = `translate(-50%, -50%) rotate(${s.rotate}deg) scale(${s.scale})`;
      s.node.style.opacity = '1';
      s.node.style.zIndex = String(s.z);
      s.node.style.transition = '';
    });
    return baseStates;
  }

  document.addEventListener('DOMContentLoaded', function(){
    const statementsContainer = document.getElementById('statements');
    const shapesRoot = document.getElementById('shapes');
    const footerEmail = document.querySelector('.site-footer-email');

    // Footer contact info (runtime-editable via /contact.json)
    if (footerEmail) {
      fetch('/contact.json?ts=' + Date.now(), { cache: 'no-store' })
        .then(res => res.ok ? res.json() : null)
        .then(json => {
          if (!json || typeof json !== 'object') return;
          const email = typeof json.email === 'string' ? json.email : null;
          if (email) {
            footerEmail.setAttribute('href', 'mailto:' + email);
            footerEmail.textContent = email;
          }
        })
        .catch(() => {});
    }

    // Statements (attempt runtime JSON; fallback to server HTML)
    if (statementsContainer) {
      function startStatementsRotation(items, options){
        if (!Array.isArray(items) || items.length === 0) return;
        const totalMs = Math.max(1000, Number(options && options.cycleMs) || 15000);
        const gapMs = Math.max(0, Number(options && options.gapMs) || 1000);
        const visibleMs = Math.max(0, totalMs - gapMs);
        let idx = 0;
        statementsContainer.style.opacity = '1';
        renderStatement(statementsContainer, items[idx]);
        (function schedule(){
          setTimeout(() => {
            statementsContainer.style.opacity = '0';
            setTimeout(() => {
              idx = (idx + 1) % items.length;
              renderStatement(statementsContainer, items[idx]);
              statementsContainer.style.opacity = '1';
              schedule();
            }, gapMs);
          }, visibleMs);
        })();
      }

      fetch('/statements.json?ts=' + Date.now(), { cache: 'no-store' })
        .then(res => { if(!res.ok) throw new Error('no json'); return res.json(); })
        .then(json => {
          if (Array.isArray(json)){
            const items = shuffleArray(json.filter(item => (typeof item === 'object' && item && typeof item.quote === 'string') || typeof item === 'string'));
            startStatementsRotation(items);
          } else if (json && typeof json === 'object'){
            const cfg = { cycleMs: json.cycleMs, gapMs: json.gapMs };
            const raw = Array.isArray(json.items) ? json.items : [];
            const items = shuffleArray(raw.filter(item => (typeof item === 'object' && item && typeof item.quote === 'string') || typeof item === 'string'));
            startStatementsRotation(items, cfg);
          }
        })
        .catch(() => {
          const nodes = Array.from(statementsContainer.querySelectorAll('.statement'));
          if(nodes.length > 0){
            const items = shuffleArray(nodes.map(node => {
              const q = node.querySelector('.quote');
              const a = node.querySelector('.attribution');
              return { quote: (q && q.textContent) || '', attribution: (a && a.textContent) || '' };
            }).filter(o => o.quote));
            statementsContainer.innerHTML = '';
            startStatementsRotation(items);
          }
        });
    }

    if (!shapesRoot) return;
    const base = randomizeShapesBase(shapesRoot);

    // Parallax configuration (runtime-editable via /parallax.json)
    const defaultParallax = {
      moveScale: 0.6,       // overall cursor→movement scale
      depthBase: 0.3,       // minimum movement factor for farthest shape
      depthRange: 0.7,      // additional movement factor scaled by depth
      rotationScale: 40,    // rotation sensitivity
      invertX: false,       // flip X direction
      invertY: false        // flip Y direction
    };
    let parallaxCfg = { ...defaultParallax };
    fetch('/parallax.json?ts=' + Date.now(), { cache: 'no-store' })
      .then(res => res.ok ? res.json() : null)
      .then(cfg => {
        if (cfg && typeof cfg === 'object'){
          parallaxCfg = {
            moveScale: Number(cfg.moveScale) || defaultParallax.moveScale,
            depthBase: Number(cfg.depthBase) || defaultParallax.depthBase,
            depthRange: Number(cfg.depthRange) || defaultParallax.depthRange,
            rotationScale: Number(cfg.rotationScale) || defaultParallax.rotationScale,
            invertX: Boolean(cfg.invertX),
            invertY: Boolean(cfg.invertY)
          };
        }
      })
      .catch(()=>{});

    let targetX = 0.5, targetY = 0.5;
    // Idle fade config
    let lastMoveAt = performance.now();
    const idleThresholdMs = 180000;  // start fading after 3 minutes idle
    const fadeDurationMs = 20000;  // fade to 0 over 20s
    function onPointerMove(e){
      const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
      const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
      const x = ('clientX' in e) ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : vw/2);
      const y = ('clientY' in e) ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : vh/2);
      targetX = x / vw;
      targetY = y / vh;
      lastMoveAt = performance.now();
      if (shapesRoot.style.opacity !== '1') shapesRoot.style.opacity = '1';
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });

    let rafId = 0;
    function tick(){
      base.forEach((b, i) => {
        const invX = parallaxCfg.invertX ? -1 : 1;
        const invY = parallaxCfg.invertY ? -1 : 1;
        const dx = (targetX - 0.5) * parallaxCfg.moveScale * invX;
        const dy = (targetY - 0.5) * parallaxCfg.moveScale * invY;
        const depth = (i + 1) / (base.length + 1);
        const factor = parallaxCfg.depthBase + depth * parallaxCfg.depthRange;
        const left = (b.left + dx * factor);
        const top = (b.top + dy * factor);
        const rot = b.rotate + (dx - dy) * parallaxCfg.rotationScale * depth;
        b.node.style.left = (left * 100) + '%';
        b.node.style.top = (top * 100) + '%';
        b.node.style.transform = `translate(-50%, -50%) rotate(${rot}deg) scale(${b.scale})`;
      });
      // Idle fade logic
      const now = performance.now();
      const idleMs = now - lastMoveAt;
      if (idleMs >= idleThresholdMs){
        const t = Math.min((idleMs - idleThresholdMs) / fadeDurationMs, 1);
        const nextOpacity = 1 - t;
        shapesRoot.style.opacity = String(nextOpacity);
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
  });
})();


