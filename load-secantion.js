(async () => {
  // КЭШ КАДРОВ
  let framesMap = new Map(); // index -> Image
  let totalFrames = 0;
  let preloadReady = false;
  let urls = [];
  let angle = 0; // виртуальный "угол", по которому выбирается кадр

  // ФЛАГИ / СОСТОЯНИЕ
  let sliderRoot = null;
  let isDragging = false;
  let dragStartX = 0;

  let autoAnimId = null;         // requestAnimationFrame id автоанимации
  let isUserInteracting = false; // любое ручное взаимодействие отключает автоанимацию
  let holdIntervalId = null;     // setInterval для удержания кнопок

  let canvas = null;
  let ctx = null;

  // ЗАГРУЗКА СПИСКА ФАЙЛОВ
  const loadList = async () => {
    try {
      const res = await fetch("https://api.github.com/repos/Goga0000/secantion/contents/one?ref=main");
      const json = await res.json();
      urls = json.map(item => item.download_url);
      totalFrames = urls.length;
      console.log(`📁 ${totalFrames} файлов всего`);
      return true;
    } catch (err) {
      console.error("❌ API:", err);
      return false;
    }
  };

  // ПРОГРЕССИВНАЯ ЗАГРУЗКА ПАКЕТАМИ
  const loadBatch = async step => {
    console.log(`📦 ПАКЕТ шаг=${step}...`);
    let added = 0;

    for (let i = 0; i < totalFrames; i += step) {
      const index = i % totalFrames;
      if (framesMap.has(index)) continue;

      try {
        const blob = await (await fetch(urls[index])).blob();
        const img = new Image();
        img.src = URL.createObjectURL(blob);

        await new Promise((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
        });

        framesMap.set(index, img);
        added++;
      } catch (e) {
        console.warn(`⚠️ Кадр ${index}`, e);
      }
    }

    console.log(`✅ ПАКЕТ ${step}: +${added} кадров. Кэш: ${framesMap.size}/${totalFrames}`);
  };

  // ФИНАЛЬНАЯ ДОГРУЗКА
  const loadRest = async () => {
    console.log("🔄 Финальная загрузка ОСТАТКА...");
    let added = 0;

    for (let i = 0; i < totalFrames; i++) {
      if (framesMap.has(i)) continue;
      try {
        const blob = await (await fetch(urls[i])).blob();
        const img = new Image();
        img.src = URL.createObjectURL(blob);

        await new Promise((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
        });

        framesMap.set(i, img);
        added++;
        if (added % 50 === 0) {
          console.log(`🔄 Остаток: +${added}. Всего: ${framesMap.size}/${totalFrames}`);
        }
      } catch (e) {
        console.warn("⚠️ Остаточный кадр ошибка", i, e);
      }
    }

    console.log(`🎉 ✅ ПОЛНАЯ загрузка! ${framesMap.size}/${totalFrames}`);
  };

  // СТАРТ ПРЕЗАГРУЗКИ
  (async () => {
    if (await loadList()) {
      console.log("🚀 Прогрессивная загрузка 25→12→6→2→ПОЛНАЯ...");
      await loadBatch(25);
      preloadReady = true;
      console.log("✅ ПАКЕТ 25 готов! Video360 СТАРТУЕТ!");

      setTimeout(() => loadBatch(12), 200);
      setTimeout(() => loadBatch(6), 800);
      setTimeout(() => loadBatch(2), 2000);
      setTimeout(() => loadRest(), 4000);
    }
  })();

  // УТИЛИТЫ ОТРИСОВКИ
  const setupCanvas = () => {
    if (!canvas || !ctx) return;
    canvas.width = 1024;
    canvas.height = 1024;
    ctx.resetTransform();
  };

  const renderImage = img => {
    if (!ctx) return;
    ctx.clearRect(0, 0, 1024, 1024);

    let ratio = img.naturalWidth / img.naturalHeight;
    let drawW, drawH, offsetX = 0, offsetY = 0;

    if (ratio > 1) {
      drawH = 1024;
      drawW = 1024 * ratio;
      offsetX = -((drawW - 1024) / 2);
    } else {
      drawW = 1024;
      drawH = 1024 / ratio;
      offsetY = -((drawH - 1024) / 2);
    }

    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
  };

  const drawFrame = frameAngle => {
    if (!ctx || totalFrames === 0) return;

    let index = Math.floor((frameAngle + totalFrames) % totalFrames);
    let frame = framesMap.get(index);

    if (frame) {
      renderImage(frame);
      return;
    }

    // поиск ближайшего загруженного
    for (let r = 1; r <= 10; r++) {
      let left = (index - r + totalFrames) % totalFrames;
      let right = (index + r) % totalFrames;
      frame = framesMap.get(left) || framesMap.get(right);
      if (frame) {
        renderImage(frame);
        return;
      }
    }

    // фоллбек на любой кадр
    for (let any of framesMap.values()) {
      renderImage(any);
      return;
    }

    ctx.clearRect(0, 0, 1024, 1024);
    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(0, 0, 1024, 1024);
  };

  // ПОМЕТИТЬ РУЧНОЕ ВЗАИМОДЕЙСТВИЕ
  const markUserInteraction = () => {
    isUserInteracting = true;
    if (autoAnimId !== null) {
      cancelAnimationFrame(autoAnimId);
      autoAnimId = null;
    }
    if (holdIntervalId !== null) {
      clearInterval(holdIntervalId);
      holdIntervalId = null;
    }
  };

  // АВТОАНИМАЦИЯ 0 → 20% → 0
  const startAutoAnimation = () => {
    if (isUserInteracting || autoAnimId !== null || !totalFrames || !ctx) return;

    const delta = totalFrames * 0.2; // 20%
    const startAngle = angle;
    const forwardAngle = startAngle + delta;
    const duration = 1500; // мс туда и столько же обратно

    let phase = "forward";
    let startTime = null;

    const step = ts => {
      if (isUserInteracting) {
        autoAnimId = null;
        return;
      }

      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (phase === "forward") {
        const current = startAngle + delta * progress;
        angle = current;
        drawFrame(angle);

        if (progress < 1) {
          autoAnimId = requestAnimationFrame(step);
        } else {
          phase = "backward";
          startTime = null;
          autoAnimId = requestAnimationFrame(step);
        }
      } else {
        const current = forwardAngle - delta * progress;
        angle = current;
        drawFrame(angle);

        if (progress < 1) {
          autoAnimId = requestAnimationFrame(step);
        } else {
          angle = startAngle;
          drawFrame(angle);
          autoAnimId = null;
        }
      }
    };

    autoAnimId = requestAnimationFrame(step);
  };

  // MUTATION OBSERVER: СЛЕДИМ ЗА ПОЛУЧЕНИЕМ КЛАССА t-slds__item_active
  let observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === "attributes" && mutation.attributeName === "class") {
        let slide = mutation.target;

        // только для наших слайдов
        if (!slide.classList.contains("video-replaced")) return;

        if (slide.classList.contains("t-slds__item_active")) {
          console.log("🎯 Video360 АКТИВЕН! block → .t-slds__main + АВТОАНИМАЦИЯ");

          let main = slide.closest(".t-slds__items-wrapper")?.closest(".t-slds")?.querySelector(".t-slds__main")
            || slide.closest(".t-slds__wrapper")?.querySelector(".t-slds__main")
            || slide.closest(".t-slds__main");

          if (main) {
            main.classList.add("block");
            console.log("✅ block ДОБАВЛЕН к .t-slds__main");
          }

          // запуск автоанимации ТОЛЬКО при активации
          startAutoAnimation();
        } else {
          console.log("🔄 Video360 НЕАКТИВЕН!");
          let activeVideoSlide = document.querySelector(".video-replaced.t-slds__item_active");
          let main = slide.closest(".t-slds__items-wrapper")?.closest(".t-slds")?.querySelector(".t-slds__main")
            || slide.closest(".t-slds__wrapper")?.querySelector(".t-slds__main")
            || slide.closest(".t-slds__main");

          if (main && !activeVideoSlide) {
            main.classList.remove("block");
            console.log("✅ block УДАЛЕН с .t-slds__main");
          }
        }
      }
    });
  });

  const attachObserver = () => {
    document.querySelectorAll(".video-replaced").forEach(el => {
      observer.observe(el, { attributes: true, attributeFilter: ["class"] });
    });
  };

  // ГЛАВНЫЙ ИНТЕРВАЛ ПОИСКА СЛАЙДА И ИНИТ CANVAS
  setInterval(() => {
    if (!preloadReady || framesMap.size === 0) return;

    let wrapper = document.querySelector(".t-slds__items-wrapper");
    if (wrapper && !sliderRoot) {
      sliderRoot = wrapper.closest(".t-slds");
      if (sliderRoot) console.log("🎯 .t-slds для драга найден");
    }

    let itemsWrapper = document.querySelector(".t-slds__items-wrapper");
    if (!itemsWrapper) return;

    let slides = itemsWrapper.querySelectorAll(".t-slds__item");
    if (slides.length < 2) return;

    // предпоследний слайд
    let targetSlide = slides[slides.length - 2];
    if (targetSlide?.classList.contains("video-replaced")) return;

    let nullWrapper = targetSlide.querySelector(".t-null__slds-wrapper");
    if (!nullWrapper) return;

    console.log("⚡ Video360: замена!");
    targetSlide.classList.add("video-replaced");

    nullWrapper.innerHTML = `
      <div class="video360-container" style="position:relative;">
        <canvas id="vid360-canvas"></canvas>
        <div class="video360-controls"
             style="
               position:absolute;
               left:50%;
               bottom:20px;
               transform:translateX(-50%);
               display:flex;
               align-items:center;
               justify-content:center;
               gap:10px;
             ">
          <button class="video360-btn video360-prev"
                  type="button"
                  style="
                    width:30px;
                    height:30px;
                    padding:0;
                    border:none;
                    background:transparent;
                    cursor:pointer;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                  ">
            <img src="https://static.tildacdn.com/tild3961-3766-4131-a531-386233346139/left.svg"
                 alt="Назад"
                 style="width:100%;height:100%;object-fit:contain;" />
          </button>
          <button class="video360-btn video360-next"
                  type="button"
                  style="
                    width:30px;
                    height:30px;
                    padding:0;
                    border:none;
                    background:transparent;
                    cursor:pointer;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                  ">
            <img src="https://static.tildacdn.com/tild3930-3062-4362-b730-663038363061/right.svg"
                 alt="Вперёд"
                 style="width:100%;height:100%;object-fit:contain;" />
          </button>
        </div>
      </div>
    `;

    attachObserver();

    canvas = document.getElementById("vid360-canvas");
    ctx = canvas.getContext("2d");

    setupCanvas();
    drawFrame(angle);

    let btnPrev = nullWrapper.querySelector(".video360-prev");
    let btnNext = nullWrapper.querySelector(".video360-next");

    // --- ДРАГ ПО .t-slds (крутит ТОЛЬКО canvas) ---
    if (sliderRoot && !sliderRoot.video360DragSetup) {
      sliderRoot.video360DragSetup = true;

      const onDown = e => {
        isDragging = true;
        dragStartX = e.clientX || e.touches?.[0]?.clientX || 0;
        markUserInteraction();
        console.log("👆 Драг по .t-slds");
      };

      const onMove = e => {
        if (!isDragging) return;
        const x = e.clientX || e.touches?.[0]?.clientX || 0;
        angle += (x - dragStartX) * 0.1;
        dragStartX = x;
        drawFrame(angle);
        e.preventDefault();
      };

      const onUp = () => {
        isDragging = false;
        console.log("✋ Драг по .t-slds закончен");
      };

      sliderRoot.addEventListener("mousedown", onDown, { passive: false });
      sliderRoot.addEventListener("mousemove", onMove, { passive: false });
      document.addEventListener("mouseup", onUp);

      sliderRoot.addEventListener("touchstart", onDown, { passive: false });
      sliderRoot.addEventListener("touchmove", onMove, { passive: false });
      document.addEventListener("touchend", onUp);

      console.log("🌐 ✅ Драг по .t-slds АКТИВЕН! block на .t-slds__main");
    }

    // --- УДЕРЖАНИЕ КНОПОК ВПЕРЁД / НАЗАД (крутят ТОТ ЖЕ angle, что и драг) ---
    const startHold = direction => {
      markUserInteraction();
      const delta = direction === "next" ? 1 : -1; // шаг в кадрах

      if (holdIntervalId !== null) clearInterval(holdIntervalId);
      holdIntervalId = setInterval(() => {
        angle += delta;
        drawFrame(angle);
      }, 16); // ~60fps
    };

    const stopHold = () => {
      if (holdIntervalId !== null) {
        clearInterval(holdIntervalId);
        holdIntervalId = null;
      }
    };

    if (btnPrev && btnNext) {
      const addHoldListeners = (btn, direction) => {
        const onDown = e => {
          e.preventDefault();
          startHold(direction);
        };
        const onUp = () => stopHold();

        btn.addEventListener("mousedown", onDown);
        btn.addEventListener("touchstart", onDown, { passive: false });

        document.addEventListener("mouseup", onUp);
        document.addEventListener("touchend", onUp);
        document.addEventListener("touchcancel", onUp);
      };

      addHoldListeners(btnPrev, "prev");
      addHoldListeners(btnNext, "next");
    }

    console.log("🚀 ✅ Video360 готов с автоанимацией и кнопками (крутят canvas)!");
  }, 500);
})();
