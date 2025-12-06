(async () => {
  // 📁 Пути
  const REPO_PATH = 'https://goga0000.github.io/secantion/one/';
  const API_URL = 'https://api.github.com/repos/Goga0000/secantion/contents/one?ref=main';
  
  // 🧠 Кэш
  const frameCache = new Map();
  let totalFrames = 0;
  let framesReady = false;
  let webpFiles = [];
  
  // 🚀 GitHub API
  const getFileListFromAPI = async () => {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error(`API: ${response.status}`);
      const files = await response.json();
      webpFiles = files.map(file => file.name);
      totalFrames = webpFiles.length;
      console.log(`📁 GitHub API: ${totalFrames} файлов`);
      return true;
    } catch(e) {
      console.error('❌ GitHub API:', e.message);
      return false;
    }
  };
  
  // 🚀 Предзагрузка
  const preloadAllFrames = async () => {
    if (framesReady) return;
    if (!await getFileListFromAPI()) return;
    
    console.log('🔄 Загружаем кадры...');
    const promises = webpFiles.map(async (fileName, index) => {
      try {
        const response = await fetch(`${REPO_PATH}${fileName}`);
        if (!response.ok) return;
        const blob = await response.blob();
        const img = new Image();
        img.src = URL.createObjectURL(blob);
        await new Promise((r, e) => {
          img.onload = () => r(img);
          img.onerror = e;
        });
        frameCache.set(index, img);
      } catch(e) {
        console.warn(`⚠️ ${fileName}`);
      }
    });
    
    await Promise.allSettled(promises);
    framesReady = true;
    console.log(`🎉 ${totalFrames} файлов в памяти!`);
  };
  
  preloadAllFrames();
  
  // ✅ СТИЛИ: Fullscreen + фиксированная высота
  const style = document.createElement('style');
  style.textContent = `
    .video360-container {
      position: relative !important;
      width: 100% !important;
      height: 400px !important; /* ✅ ФИКС высоты */
      background: #f0f0f0;
      overflow: hidden;
      cursor: grab;
      transform: translateZ(0);
    }
    .video360-container * { user-select: none !important; }
    .video360-container.dragging .video-protect-overlay { cursor: grabbing !important; }
    #vid360-canvas {
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      object-fit: cover;
      display: block !important;
      pointer-events: none !important;
      background: white;
      will-change: contents;
    }
  `;
  document.head.appendChild(style);
  
  // 🔥 TILDA ЦИКЛ
  setInterval(() => {
    if (!framesReady) return;
    
    const wrapper = document.querySelector('.t-slds__items-wrapper');
    if (!wrapper) return;
    
    const slides = wrapper.querySelectorAll('.t-slds__item');
    if (slides.length < 2) return;
    
    const prevLastSlide = slides[slides.length - 2];
    if (!prevLastSlide || prevLastSlide.classList.contains('video-replaced')) return;
    
    const targetWrapper = prevLastSlide.querySelector('.t-null__slds-wrapper');
    if (!targetWrapper) return;
    
    console.log('⚡ Video360: заменяем слайд!');
    prevLastSlide.classList.add('video-replaced');
    
    // ✅ HTML: ФИКСИРОВАННАЯ высота 400px
    targetWrapper.innerHTML = `
      <div class="video360-container">
        <div class="video-protect-overlay"></div>
        <canvas id="vid360-canvas"></canvas>
      </div>
    `;
    
    const canvas = document.getElementById('vid360-canvas');
    const ctx = canvas.getContext('2d');
    const container = targetWrapper.querySelector('.video360-container');
    const protectOverlay = container.querySelector('.video-protect-overlay');
    const sliderWrapper = document.querySelector('.t-slds__items-wrapper');
    
    // ✅ SETUP CANVAS: ФИКС height=0
    const setupCanvas = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      // ✅ ТОЧНЫЙ размер с минимальными ограничениями
      const canvasWidth = Math.max(rect.width, 300);
      const canvasHeight = Math.max(rect.height, 400); // ✅ Минимум 400px!
      
      canvas.width = canvasWidth * dpr;
      canvas.height = canvasHeight * dpr;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      
      ctx.scale(dpr, dpr);
      ctx.imageSmoothingEnabled = true;
      
      console.log(`📐 Canvas: ${canvasWidth.toFixed(0)}x${canvasHeight.toFixed(0)} DPR:${dpr}`);
    };
    
    setupCanvas();
    window.addEventListener('resize', setupCanvas);
    
    // 🎮 ПЛАВНЫЙ DRAG (накопительный)
    let isDragging = false;
    let startX = 0;
    let dragStartFrame = 0;
    let dragAccumulatedDelta = 0;
    let rafId = null;
    const pixelsPerFrame = 4;
    
    const displayFrame = (frameIndex) => {
      const normalized = Math.floor(((frameIndex % totalFrames) + totalFrames) % totalFrames);
      const frameImg = frameCache.get(normalized);
      
      const rect = container.getBoundingClientRect();
      const canvasWidth = rect.width;
      const canvasHeight = rect.height;
      
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      
      if (frameImg && frameImg.complete) {
        ctx.drawImage(frameImg, 0, 0, canvasWidth, canvasHeight); // ✅ Fullscreen растягивание
      } else {
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }
    };
    
    const updateFrame = () => {
      displayFrame(dragStartFrame + dragAccumulatedDelta);
      if (isDragging) rafId = requestAnimationFrame(updateFrame);
    };
    
    const handleMouseDown = (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      
      if (rafId) cancelAnimationFrame(rafId);
      
      isDragging = true;
      startX = e.clientX || (e.touches?.[0]?.clientX || 0);
      dragAccumulatedDelta = 0;
      dragStartFrame = 0;
      
      sliderWrapper.style.pointerEvents = 'none';
      container.classList.add('dragging');
      
      rafId = requestAnimationFrame(updateFrame);
    };
    
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      
      const currentX = e.clientX || (e.touches?.[0]?.clientX || 0);
      const deltaX = currentX - startX;
      dragAccumulatedDelta = deltaX / pixelsPerFrame; // ✅ НАКОПИТЕЛЬНО
      
      if (!rafId) rafId = requestAnimationFrame(updateFrame);
    };
    
    const handleMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        container.classList.remove('dragging');
        setTimeout(() => sliderWrapper.style.pointerEvents = '', 300);
        
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        
        // ✅ ФИНАЛЬНАЯ позиция сохраняется
        dragStartFrame += dragAccumulatedDelta;
        dragAccumulatedDelta = 0;
        displayFrame(dragStartFrame);
      }
    };
    
    // ✅ Events
    protectOverlay.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    protectOverlay.addEventListener('touchstart', (e) => {
      handleMouseDown({ clientX: e.touches[0].clientX });
      e.preventDefault();
    }, { passive: false });
    
    document.addEventListener('touchmove', (e) => {
      if (isDragging) {
        handleMouseMove({ clientX: e.touches[0].clientX });
        e.preventDefault();
      }
    }, { passive: false });
    
    document.addEventListener('touchend', handleMouseUp);
    
    // ✅ ПЕРВЫЙ КАДР
    displayFrame(0);
    console.log('🚀 Video360: ✅ height fixed + плавный drag готов!');
  }, 500);
})();
