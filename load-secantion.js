(async () => {
  const REPO_PATH = 'https://goga0000.github.io/secantion/one/';
  const API_URL = 'https://api.github.com/repos/Goga0000/secantion/contents/one?ref=main';
  
  const frameCache = new Map();
  let totalFrames = 0;
  let framesReady = false;
  let webpFiles = [];
  
  // GitHub API + preload (БЕЗ ИЗМЕНЕНИЙ)
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
        if (!response.ok) return;
        const blob = await response.blob();
        const img = new Image();
        img.src = URL.createObjectURL(blob);
        await new Promise((r, e) => {
          img.onload = () => r(img);
          img.onerror = e;
        });
        frameCache.set(index, img);
        console.log(`✅ КЭШ ${index}: ${fileName} (${img.naturalWidth}x${img.naturalHeight})`);
      } catch(e) {
        console.warn(`⚠️ ${fileName}`);
      }
    });
    
    await Promise.allSettled(promises);
    framesReady = true;
    console.log(`🎉 ${totalFrames} файлов в памяти! frameCache.size=${frameCache.size}`);
  };
  
  preloadAllFrames();
  
  // ✅ СТИЛИ (упрощенные)
  const style = document.createElement('style');
  style.textContent = `
    .video360-container {
      position: relative !important;
      width: calc(567px * var(--zoom, 1)) !important;
      height: calc(558px * var(--zoom, 1)) !important;
      background: #f0f0f0 !important;
      overflow: hidden;
    }
    #vid360-canvas {
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      display: block !important;
    }
    .video-protect-overlay {
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      cursor: grab !important;
      z-index: 10 !important;
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
    
    // ✅ HTML
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
    
    // ✅ DEBUG setupCanvas
    const setupCanvas = () => {
      requestAnimationFrame(() => {
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        
        ctx.scale(dpr, dpr);
        console.log(`📐 Canvas setup: ${rect.width.toFixed(0)}x${rect.height.toFixed(0)}`);
      });
    };
    
    setupCanvas();
    
    // ✅ DEBUG displayFrame
    const displayFrame = (frameIndex = 0) => {
      console.log(`🎨 displayFrame(${frameIndex}) totalFrames=${totalFrames} cache=${frameCache.size}`);
      
      const normalized = Math.floor(((frameIndex % totalFrames) + totalFrames) % totalFrames);
      const frameImg = frameCache.get(normalized);
      
      console.log(`🎨 Frame ${normalized}:`, frameImg ? `${frameImg.naturalWidth}x${frameImg.naturalHeight}` : 'NULL');
      
      const rect = container.getBoundingClientRect();
      const canvasWidth = rect.width;
      const canvasHeight = rect.height;
      
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      
      if (frameImg && frameImg.complete && frameImg.naturalWidth > 0) {
        ctx.drawImage(frameImg, 0, 0, canvasWidth, canvasHeight);
        console.log(`✅ НАРИСОВАЛИ кадр ${normalized}`);
      } else {
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        console.log(`❌ НЕ НАРИСОВАЛИ: img=${!!frameImg} complete=${frameImg?.complete} size=${frameImg?.naturalWidth}`);
      }
    };
    
    // ✅ ПЕРВЫЙ КАДР СРАЗУ (DEBUG)
    setTimeout(() => {
      setupCanvas();
      displayFrame(0);
    }, 200);
    
    // 🎮 Drag (упрощенный DEBUG)
    let isDragging = false;
    let currentFrame = 0;
    
    protectOverlay.addEventListener('mousedown', (e) => {
      console.log('🖱️ MOUSE DOWN');
      isDragging = true;
      e.preventDefault();
    });
    
    protectOverlay.addEventListener('touchstart', (e) => {
      console.log('👆 TOUCH DOWN');
      isDragging = true;
      e.preventDefault();
    }, { passive: false });
    
    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        currentFrame = (e.clientX % totalFrames + totalFrames) % totalFrames;
        displayFrame(currentFrame);
      }
    });
    
    document.addEventListener('touchmove', (e) => {
      if (isDragging) {
        const touch = e.touches[0];
        currentFrame = (touch.clientX % totalFrames + totalFrames) % totalFrames;
        displayFrame(currentFrame);
        e.preventDefault();
      }
    }, { passive: false });
    
    document.addEventListener('mouseup', () => {
      console.log('🖱️ MOUSE UP');
      isDragging = false;
    });
    
    document.addEventListener('touchend', () => {
      console.log('👆 TOUCH UP');
      isDragging = false;
    });
    
    console.log('🚀 Video360 DEBUG готов! Проверьте Console');
  }, 500);
})();
