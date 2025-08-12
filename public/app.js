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
    const quote = document.createElement('p');
    quote.className = 'line quote';
    quote.textContent = String(item && item.quote ? item.quote : item);
    section.appendChild(quote);
    const attr = document.createElement('p');
    attr.className = 'line attribution';
    if (item && item.attribution) {
      attr.textContent = String(item.attribution);
      section.appendChild(attr);
    }
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

    // Statements: keep existing behavior (attempt runtime JSON; fallback to server HTML)
    if (statementsContainer) {
      function startStatementsRotation(items){
        if (!Array.isArray(items) || items.length === 0) return;
        const totalMs = 15000; // 15s per item
        const gapMs = 2000;    // 2s hidden between items
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
          if(Array.isArray(json)){
            const items = shuffleArray(json.filter(item => (typeof item === 'object' && item && typeof item.quote === 'string') || typeof item === 'string'));
            startStatementsRotation(items);
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

    // Shapes: parallax only
    if (!shapesRoot) return;
    const base = randomizeShapesBase(shapesRoot);

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

    // No teardown management needed since this is the only mode on main
  });
})();


