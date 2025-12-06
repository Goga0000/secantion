(async () => {
  // 📁 ПУТЬ К ПАПКЕ С КАДрами на GitHub
  const FRAMES_PATH = 'https://raw.githubusercontent.com/Goga0000/secantion/main/one/';
  const FPS = 30;
  
  // 🧠 Глобальный кэш кадров (по индексу)
  const frameCache = new Map();
  let totalFrames = 0;
  let framesReady = false;
  let webpFiles = [];
  
  // 🚀 1. Получаем СПИСОК всех файлов в папке
  const getFileList = async () => {
    try {
      const response = await fetch(FRAMES_PATH);
      const html = await response.text();
      
      // Парсим имена .webp файлов из GitHub directory listing
      const fileMatches = [...html.matchAll(/href="([^"]+\.webp[^"]*)"/g)];
      webpFiles = fileMatches
        .map(match => match[1])
        .filter(name => name.includes('.webp') && !name.includes('..'))
        .sort(); // Сортируем для последовательности
        
      totalFrames = webpFiles.length;
      console.log(`📁 Найдено ${totalFrames} WebP файлов:`, webpFiles.slice(0, 5));
      return true;
    } catch(e) {
      console.error('❌ Ошибка получения списка:', e);
      return false;
    }
  };
  
  // 🚀 2. Предзагрузка ВСЕХ кадров параллельно
  const preloadAllFrames = async () => {
    if (framesReady || totalFrames === 0) return;
    
    console.log('🔄 Загружаем кадры с GitHub...');
    
    if (!await getFileList()) {
      console.error('❌ Не удалось получить список файлов');
      return;
    }
    
    // Параллельная загрузка всех кадров
    const promises = webpFiles.map(async (fileName, index) => {
      try {
        const response = await fetch(`${FRAMES_PATH}${fileName}`);
        const blob = await response.blob();
        const img = new Image();
        img.src = URL.createObjectURL(blob);
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        frameCache.set(index, img);
      } catch(e) {
        console.warn(`⚠️ Ошибка загрузки ${fileName}:`, e);
      }
    });
    
    await Promise.allSettled(promises);
    framesReady = true;
    console.log(`✅ ВСЕ ${totalFrames} КАДРОВ В ПАМЯТИ!`);
  };
  
  // Запускаем предзагрузку СРАЗУ
  preloadAllFrames();
  
  // Стили (без изменений)
  const style = document.createElement('style');
  style.textContent = `
    .video360-container * { user-select: none !important; }
    .video360-container { cursor: grab !important; transform: translateZ(0); }
    .video360-container.dragging .video-protect-overlay { cursor: grabbing !important; }
    #vid360-canvas { background: white; will-change: contents; }
  `;
  document.head.appendChild(style);
  
  // 🔥 ОСНОВНОЙ ЦИКЛ TILDA (без изменений)
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
    
    console.log('⚡ Video360: кадры готовы, заменяем слайд!');
    prevLastSlide.classList.add('video-replaced');
    
    // ✅ HTML (0ms - кадры уже в памяти!)
    targetWrapper.innerHTML = `
      <div class="video360-container" style="position:relative;width:100%;height:100%;background:white;overflow:hidden;">
        <div class="video-protect-overlay" style="position:absolute;top:0;left:0;width:100%;height:100%;z-index:99;background:transparent;cursor:grab;pointer-events:all;touch-action:none;"></div>
        nvas id="vid360-canvas" stylee="width:100%;height:100%;aspect-ratio:1;display:block;pointer-events:none;background:white;"></canvas>
      </div>
    `;
    
    const canvas = document.getElementById('vid360-canvas');
    const ctx = canvas.getContext('2d');
    const container = targetWrapper.querySelector('.video360-container');
    const protectOverlay = container.querySelector('.video-protect-overlay');
    const sliderWrapper = document.querySelector('.t-slds__items-wrapper');
    
    const setupCanvas = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    
    setupCanvas();
    window.addEventListener('resize', setupCanvas);
    
    // 🎮 Drag controls
    let isDragging = false;
    let startX = 0;
    let currentFrame = 0;
    let rafId = null;
    const pixelsPerFrame = 8;
    
    const displayFrame = (frameIndex) => {
      const normalized = Math.floor(((frameIndex % totalFrames) + totalFrames) % totalFrames);
      const frameImg = frameCache.get(normalized);
      
      const dpr = window.devicePixelRatio || 1;
      const canvasWidth = canvas.width / dpr;
      const canvasHeight = canvas.height / dpr;
      
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      
      if (frameImg && frameImg.complete) {
        ctx.drawImage(frameImg, 0, 0, canvasWidth, canvasHeight);
      }
    };
    
    const updateFrame = () => {
      displayFrame(currentFrame);
      if (isDragging) rafId = requestAnimationFrame(updateFrame);
    };
    
    const handleMouseDown = (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      
      if (rafId) cancelAnimationFrame(rafId);
      
      isDragging = true;
      startX = e.clientX || (e.touches?.[0]?.clientX || 0);
      
      sliderWrapper.style.pointerEvents = 'none';
      container.classList.add('dragging');
      
      rafId = requestAnimationFrame(updateFrame);
    };
    
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      
      const currentX = e.clientX || (e.touches?.[0]?.clientX || startX);
      currentFrame = (currentX - startX) / pixelsPerFrame;
      
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
        
        displayFrame(currentFrame);
      }
    };
    
    // ✅ Events (TILDA-safe)
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
    
    // ПЕРВЫЙ КАДР МГНОВЕННО!
    displayFrame(0);
    console.log('🚀 Video360 из GitHub кадров готов!');
  }, 500);
})();
