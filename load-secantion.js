(async () => {
  // 📁 Пути (без изменений)
  const REPO_PATH = 'https://goga0000.github.io/secantion/one/';
  const API_URL = 'https://api.github.com/repos/Goga0000/secantion/contents/one?ref=main';
  
  const frameCache = new Map();
  let totalFrames = 0;
  let framesReady = false;
  let webpFiles = [];
  
  // 🚀 GitHub API + preload (без изменений)
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
  
  const preloadAllFrames = async () => {
    if (framesReady) return;
    if (!await getFileListFromAPI()) return;
    
    console.log('🔄 Загружаем кадры...');
    const promises = webpFiles.map(async (fileName, index) => {
      try {
        const response = await fetch(`${REPO_PATH}${fileName}`);
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
  
  // ✅ СТИЛИ: Fullscreen canvas + плавный drag
  const style = document.createElement('style');
  style.textContent = `
    .video360-container {
      position: relative !important;
      width: 100% !important; 
      height: 100% !important;
      background: white;
      overflow: hidden;
      cursor: grab;
      transform: translateZ(0);
    }
    .video360-container * { user-select: none !important; }
    .video360-container.dragging .video-protect-overlay { cursor: grabbing !important; }
    #vid360-canvas {
      position: absolute !important;
      top: 0 !important; left: 0 !important;
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
  
  // 🔥 ОСНОВНОЙ ЦИКЛ TILDA
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
    
    // ✅ FULLSCREEN CANVAS HTML
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
    
    // ✅ Setup canvas ПОЛНОЭКРАННЫЙ
    const setupCanvas = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      // ✅ Canvas на ВЕСЬ контейнер
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      
      ctx.scale(dpr, dpr);
    };
    
    setupCanvas();
    window.addEventListener('resize', setupCanvas);
    
    // 🎮 ✅ ПЛАВНЫЙ DRAG (без рывков!)
    let isDragging = false;
    let dragStartFrame = 0;  // ✅ Текущий кадр при старте
    let dragAccumulatedDelta = 0;  // ✅ НАКОПИТЕЛЬНОЕ смещение
    let rafId = null;
    
    const pixelsPerFrame = 4;  // ✅ Регулируйте скорость
    
    const displayFrame = (frameIndex) => {
      const normalized = Math.floor(((frameIndex % totalFrames) + totalFrames) % totalFrames);
      const frameImg = frameCache.get(normalized);
      
      const rect = container.getBoundingClientRect();
      const canvasWidth = rect.width;
      const canvasHeight = rect.height;
      
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      
      if (frameImg && frameImg.complete) {
        // ✅ РАСТЯГИВАЕМ на весь canvas
        ctx.drawImage(frameImg, 0, 0, canvasWidth, canvasHeight);
      } else {
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }
    };
    
    const updateFrame = () => {
      displayFrame(dragStartFrame + dragAccumulatedDelta);
      if (isDragging) rafId = requestAnimationFrame(updateFrame);
    };
    
    // ✅ ПЛАВНЫЙ START (запоминаем кадр)
    const handleMouseDown = (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      
      if (rafId) cancelAnimationFrame(rafId);
      
      isDragging = true;
      dragAccumulatedDelta = 0;
      dragStartFrame = Math.floor(dragAccumulatedDelta); // Текущая позиция
      
      sliderWrapper.style.pointerEvents = 'none';
      container.classList.add('dragging');
      
      rafId = requestAnimationFrame(updateFrame);
    };
    
    // ✅ ПЛАВНЫЙ MOVE (накопительное!)
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      
      const currentX = e.clientX || (e.touches?.[0]?.clientX || 0);
      const deltaX = currentX - startX;
      dragAccumulatedDelta = deltaX / pixelsPerFrame; // ✅ НАКОПИТЕЛЬНО!
      
      if (!rafId) rafId = requestAnimationFrame(updateFrame);
    };
    
    const handleMouseUp = (e) => {
      if (isDragging) {
        isDragging = false;
        container.classList.remove('dragging');
        setTimeout(() => sliderWrapper.style.pointerEvents = '', 300);
        
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        
        // ✅ ФИНАЛЬНАЯ позиция
        dragStartFrame += dragAccumulatedDelta;
        dragAccumulatedDelta = 0;
        displayFrame(dragStartFrame);
      }
    };
    
    // ✅ ГЛОБАЛЬНЫЕ переменные для drag
    let startX = 0;
    
    protectOverlay.addEventListener('mousedown', (e) => {
      startX = e.clientX;
      handleMouseDown(e);
    });
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    protectOverlay.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      handleMouseDown({ clientX: startX });
      e.preventDefault();
    }, { passive: false });
    
    document.addEventListener('touchmove', handleMouseMove, { passive: false });
    document.addEventListener('touchend', handleMouseUp);
    
    // ✅ ПЕРВЫЙ КАДР
    displayFrame(0);
    console.log('🚀 Video360: плавный drag + fullscreen готов!');
  }, 500);
})();
