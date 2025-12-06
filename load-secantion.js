(async () => {
  const FRAMES_PATH = 'https://raw.githubusercontent.com/Goga0000/secantion/main/one/';
  const FPS = 30;
  
  const frameCache = new Map();
  let totalFrames = 0;
  let framesReady = false;
  let webpFiles = []; // ← НОВОЕ!
  
  // 🚀 1. СКАНИРОВАНИЕ ВСЕХ ФАЙЛОВ в папке
  const getFileList = async () => {
    try {
      const response = await fetch(FRAMES_PATH);
      const html = await response.text();
      
      // Парсим .webp файлы из GitHub directory listing
      const fileMatches = [...html.matchAll(/href="([^"]*\.webp[^"]*)"/g)];
      webpFiles = fileMatches
        .map(match => decodeURIComponent(match[1]))
        .filter(name => !name.includes('..') && name.endsWith('.webp'))
        .sort(); // Последовательная анимация
        
      totalFrames = webpFiles.length;
      console.log(`📁 Найдено ${totalFrames} WebP файлов:`, webpFiles.slice(0, 3));
      return true;
    } catch(e) {
      console.error('❌ Ошибка сканирования:', e);
      return false;
    }
  };
  
  // 🚀 2. Предзагрузка ВСЕХ найденных файлов
  const preloadAllFrames = async () => {
    if (framesReady) return;
    
    console.log('🔄 Загружаем кадры с GitHub...');
    
    if (!await getFileList()) return;
    
    // Параллельная загрузка ВСЕХ файлов
    const promises = webpFiles.map(async (fileName, index) => {
      const url = `${FRAMES_PATH}${fileName}`;
      const response = await fetch(url);
      const blob = await response.blob();
      const img = new Image();
      img.src = URL.createObjectURL(blob);
      await new Promise((r, e) => {
        img.onload = r;
        img.onerror = e;
      });
      frameCache.set(index, img);
    });
    
    await Promise.allSettled(promises);
    framesReady = true;
    console.log(`✅ ${totalFrames} файлов в памяти!`);
  };
  
  preloadAllFrames();
  
  // Остальной код БЕЗ ИЗМЕНЕНИЙ...
  const style = document.createElement('style');
  style.textContent = `
    .video360-container * { user-select: none !important; }
    .video360-container { cursor: grab !important; transform: translateZ(0); }
    .video360-container.dragging .video-protect-overlay { cursor: grabbing !important; }
    #vid360-canvas { background: white; will-change: contents; }
  `;
  document.head.appendChild(style);
  
  // 🔥 ОСНОВНОЙ ЦИКЛ TILDA (тот же)
  setInterval(() => {
    if (!framesReady) return;
    // ... весь остальной код без изменений
  }, 500);
})();
