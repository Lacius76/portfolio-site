class PixelOverlay {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.container = canvas.parentElement;

    this.pixelSize = 52; // Tiny pixels (3x3)
    this.radius = 0;
    this.maxRadius = 0;
    this.isHovered = false;
    this.animFrame = null;
    this.lastTime = 10;
    this.fps = 25; // Sebesség (képkocka/másodperc)
    this.pixelDensity = 0.1; // Sűrűség (0.1 = nagyon sűrű, 0.9 = nagyon ritka)
    this.pixelOpacity = 0.7; // Globális átlátszóság (0.1 = nagyon halvány, 1.0 = teljes fényerő)

    this.init();

    this.container.addEventListener('mouseenter', () => {
      this.isHovered = true;
      this.cancelAnim();
      this.animate(performance.now());
    });

    this.container.addEventListener('mouseleave', () => {
      this.isHovered = false;
      this.cancelAnim();
      this.animate(performance.now());
    });

    window.addEventListener('resize', () => {
      this.cancelAnim();
      this.init();
      this.draw();
    });
  }

  cancelAnim() {
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
  }

  init() {
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.maxRadius = Math.sqrt(rect.width ** 2 + rect.height ** 2) / 2 + 50;
  }

  animate(now) {
    // A sugár (radius) számítása fusson teljes sebességgel (60 FPS), 
    // hogy a "kinyitás" folyamatos és gyors maradjon.
    const target = this.isHovered ? this.maxRadius : 0;
    this.radius += (target - this.radius) * 0.08;

    // A kirajzolás (draw) viszont legyen korlátozva (pl. 20 FPS-re), 
    // hogy a pixelek lassabban villogjanak.
    const delta = now - this.lastTime;
    const interval = 1000 / this.fps;

    if (delta > interval) {
      this.lastTime = now - (delta % interval);
      this.draw();
    }

    // Animáció folytatása
    if (this.isHovered || Math.abs((this.isHovered ? this.maxRadius : 0) - this.radius) > 1) {
      this.animFrame = requestAnimationFrame((timestamp) => this.animate(timestamp));
    } else if (!this.isHovered) {
      this.radius = 0;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  drawPixel(x, y, alphaValue = 0.1, hash = 0) {
    const colors = [
      { r: 204, g: 218, b: 250 },   // #ccdafaff
      { r: 132, g: 132, b: 135 },  // #848487ff
      { r: 237, g: 252, b: 251 }   // #edfcfbff
    ];

    // A hash alapján választunk színt, hogy ne vibráljon a színe minden képkockánál
    const color = colors[Math.floor(hash * colors.length)];

    this.ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alphaValue})`;
    this.ctx.fillRect(x, y, this.pixelSize, this.pixelSize);
  }

  draw() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.ctx.clearRect(0, 0, w, h);

    if (this.radius <= 1) return;

    if (!this.isHovered && this.radius < 80) {
      this.ctx.globalAlpha = Math.max(0, this.radius / 80);
    } else {
      this.ctx.globalAlpha = 1.0;
    }

    const cx = w / 2;
    const cy = h / 2;
    const ringThickness = 120;
    const time = Date.now() * 0.001;

    for (let x = 0; x < w; x += this.pixelSize) {
      for (let y = 0; y < h; y += this.pixelSize) {
        const dx = (x + this.pixelSize / 2) - cx;
        const dy = (y + this.pixelSize / 2) - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // A zajt is lelassítjuk vagy fixáljuk, hogy ne legyen "bolhás"
        const seed = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        const hash = seed - Math.floor(seed);

        const noise = Math.sin(time * 2 + hash * 10) * 30;
        const noisyDist = dist + noise;

        if (noisyDist < this.radius && noisyDist > this.radius - ringThickness) {
          const distanceFromEdge = Math.min(this.radius - noisyDist, noisyDist - (this.radius - ringThickness));
          const density = (distanceFromEdge / (ringThickness / 2));

          // Szinusz alapú lüktetés - minden pixel saját egyedi sebességgel (2-5)
          const pixelSpeed = 2 + hash * 3;
          const pulse = Math.sin(time * pixelSpeed + hash * Math.PI * 10) * density;

          if (pulse > this.pixelDensity) {
            // Skálázzuk az alfát a megadott pixelOpacity-vel
            const normalizedAlpha = ((pulse - this.pixelDensity) / (1 - this.pixelDensity)) * this.pixelOpacity;
            this.drawPixel(x, y, normalizedAlpha, hash);
          }
        }
        else if (this.isHovered && noisyDist <= this.radius - ringThickness) {
          const blinkSpeed = 1 + hash * 2;
          const blink = Math.sin(time * blinkSpeed + hash * Math.PI * 10);

          if (blink > 0.4 + (this.pixelDensity * 0.5)) {
            const alpha = (blink - (0.4 + this.pixelDensity * 0.5)) * 2;
            // Itt is alkalmazzuk a szorzót
            this.drawPixel(x, y, alpha * 0.4 * this.pixelOpacity, hash);
          }
        }
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const canvases = document.querySelectorAll('.pixel-canvas');
  canvases.forEach(canvas => {
    new PixelOverlay(canvas);
  });
});
