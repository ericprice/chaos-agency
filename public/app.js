(function(){
  function shuffleArray(items){
    const arr = items.slice();
    for(let i = arr.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function shuffleNodes(container){
    const nodes = Array.from(container.querySelectorAll('.statement'));
    const shuffled = shuffleArray(nodes);
    shuffled.forEach(node => container.appendChild(node));
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

  document.addEventListener('DOMContentLoaded', function(){
    const container = document.getElementById('statements');
    const shapes = document.getElementById('shapes');
    if(!container) return;

    let loadedStatements = null;
    let index = 0;

    // Try to load runtime-editable JSON from the server
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
          const shuffled = shuffleArray(loadedStatements);
          loadedStatements = shuffled;
          index = 0;
          renderStatement(container, loadedStatements[index]);
          setInterval(() => {
            index = (index + 1) % loadedStatements.length;
            renderStatement(container, loadedStatements[index]);
          }, 6000);
        } else {
          // Fallback to server-rendered HTML
          // Build an array from existing DOM to cycle
          const nodes = Array.from(container.querySelectorAll('.statement'));
          if(nodes.length > 0){
            const texts = nodes.map(node => Array.from(node.querySelectorAll('p')).map(p=>p.textContent));
            loadedStatements = shuffleArray(texts);
            container.innerHTML = '';
            index = 0;
            renderStatement(container, loadedStatements[index]);
            setInterval(() => {
              index = (index + 1) % loadedStatements.length;
              renderStatement(container, loadedStatements[index]);
            }, 15000);
          }
        }
      })
      .catch(() => {
        // Fallback to server-rendered HTML if JSON is missing or invalid
        const nodes = Array.from(container.querySelectorAll('.statement'));
        if(nodes.length > 0){
          const texts = nodes.map(node => Array.from(node.querySelectorAll('p')).map(p=>p.textContent));
          loadedStatements = shuffleArray(texts);
          container.innerHTML = '';
          index = 0;
          renderStatement(container, loadedStatements[index]);
          setInterval(() => {
            index = (index + 1) % loadedStatements.length;
            renderStatement(container, loadedStatements[index]);
          }, 15000);
        }
      });

    if (shapes) {
      // Randomize node order so which shape lands where varies per load
      const nodes = Array.from(shapes.querySelectorAll('.shape'));

      const paletteVars = ['--green','--purple','--black','--red','--blue','--orange'];
      const chosenVar = paletteVars[Math.floor(Math.random() * paletteVars.length)];

      nodes.forEach(svg => {
        const paintTargets = svg.querySelectorAll('.cls-1, path, rect, polygon, circle, ellipse, polyline');
        paintTargets.forEach(el => {
          el.style.fill = `var(${chosenVar})`;
        });
      });
      const shuffledNodes = (arr => arr.map(v=>({v, r:Math.random()})).sort((a,b)=>a.r-b.r).map(o=>o.v))([...nodes]);

      // Loose anchors for left/center/right and top/middle/bottom
      const columns = [0.12, 0.5, 0.88];
      const rows = [0.12, 0.5, 0.88];

      // Random permutations to avoid fixed mapping of left→top, center→middle, right→bottom
      const colOrder = (arr => arr.map(v=>({v, r:Math.random()})).sort((a,b)=>a.r-b.r).map(o=>o.v))([0,1,2]);
      const rowOrder = (arr => arr.map(v=>({v, r:Math.random()})).sort((a,b)=>a.r-b.r).map(o=>o.v))([0,1,2]);

      const jitter = (n) => (Math.random() - 0.5) * n;
      const clampRange = (x, min, max) => Math.max(min, Math.min(max, x));

      const bigIndex = Math.floor(Math.random() * shuffledNodes.length);

      shuffledNodes.forEach((node, i) => {
        const colIdx = colOrder[i % columns.length];
        const rowIdx = rowOrder[i % rows.length];

        const leftFrac = clampRange(columns[colIdx] + jitter(0.36), 0.12, 0.88); // base ±18%
        const topFrac = clampRange(rows[rowIdx] + jitter(0.44), 0.12, 0.88);    // base ±22%
        const left = leftFrac * 100;
        const top = topFrac * 100;

        let scale = 0.35 + Math.random() * 0.4;
        if (i === bigIndex) {
          scale = 1.0 + Math.random() * 0.25;
        }
        const rotate = Math.floor(Math.random() * 360);
        const z = 10 + Math.floor(Math.random() * 90);

        node.style.left = left + '%';
        node.style.top = top + '%';
        node.style.transform = `translate(-50%, -50%) rotate(${rotate}deg) scale(${scale})`;
        node.style.opacity = '1';
        node.style.zIndex = String(z);
      });
    }
  });
})();
