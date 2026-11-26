/** @typedef {{ x: number, y: number }} Point */

const keyboardRows = [0.08, 0.29, 0.5, 0.71, 0.92];
const columns = 48;
const rows = 30;

export class ScratchCoverage {
  #cells = new Uint8Array(columns * rows);
  #marked = 0;
  #cellWidth;
  #cellHeight;

  /** @param {number} width @param {number} height */
  constructor(width, height) {
    // Include the outer edges when sampling the whole card for coverage.
    this.#cellWidth = width / (columns - 1);
    this.#cellHeight = height / (rows - 1);
  }

  /**
   * A cell counts at most once. Check its distance to the whole segment so
   * quick gestures erase the space between pointer events too.
   * @param {Point} from @param {Point} to @param {number} radius
   */
  markStroke(from, to, radius) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const lengthSquared = dx * dx + dy * dy;
    const firstColumn = Math.max(0, Math.floor((Math.min(from.x, to.x) - radius) / this.#cellWidth));
    const lastColumn = Math.min(columns - 1, Math.floor((Math.max(from.x, to.x) + radius) / this.#cellWidth));
    const firstRow = Math.max(0, Math.floor((Math.min(from.y, to.y) - radius) / this.#cellHeight));
    const lastRow = Math.min(rows - 1, Math.floor((Math.max(from.y, to.y) + radius) / this.#cellHeight));

    for (let row = firstRow; row <= lastRow; row++) {
      for (let column = firstColumn; column <= lastColumn; column++) {
        const index = row * columns + column;
        if (this.#cells[index]) continue;
        const x = column * this.#cellWidth - from.x;
        const y = row * this.#cellHeight - from.y;
        const projection = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, (x * dx + y * dy) / lengthSquared));
        if ((x - projection * dx) ** 2 + (y - projection * dy) ** 2 <= radius ** 2) {
          this.#cells[index] = 1;
          this.#marked++;
        }
      }
    }
    return this.#marked / this.#cells.length;
  }
}

/** @param {CanvasRenderingContext2D} context @param {number} width @param {number} height */
function paintFoil(context, width, height) {
  const foil = context.createLinearGradient(0, 0, width, height);
  foil.addColorStop(0, "#c5905a");
  foil.addColorStop(0.49, "#f4daa5");
  foil.addColorStop(1, "#ba8352");
  context.globalCompositeOperation = "source-over";
  context.fillStyle = foil;
  context.fillRect(0, 0, width, height);

  // A fixed seed keeps the printed texture identical each time a door opens.
  let seed = 1147;
  for (let i = 0; i < 14500; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const x = (seed / 2 ** 32) * width;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const y = (seed / 2 ** 32) * height;
    context.fillStyle = i % 2 === 0 ? "#75441635" : "#fff6d85e";
    context.fillRect(x, y, 1.5, 1);
  }

  context.strokeStyle = "#7e452e70";
  context.lineWidth = 1.5;
  context.strokeRect(20, 20, width - 40, height - 40);
  context.font = 'italic 47px "Instrument Serif", Georgia, serif';
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#593228";
  context.fillText("Hier rubbeln", width / 2, height / 2);
  context.globalCompositeOperation = "destination-out";
  // Opaque strokes erase the gold in one pass, including its printed border.
  context.strokeStyle = "#000";
  context.fillStyle = "#000";
}

/** @param {HTMLCanvasElement} canvas @param {() => void} reveal */
export function createScratchCard(canvas, reveal) {
  const context = canvas.getContext("2d");
  const { width, height } = canvas;
  const radius = height * 0.12;
  let coverage = new ScratchCoverage(width, height);
  let keyboardRow = 0;
  /** @type {number | null} */
  let activePointer = null;
  /** @type {Point | null} */
  let previous = null;

  /** @param {Point} start @param {Point} end */
  function rub(start, end) {
    if (context) {
      context.beginPath();
      if (start.x === end.x && start.y === end.y) {
        context.arc(end.x, end.y, radius, 0, Math.PI * 2);
        context.fill();
      } else {
        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
        context.lineWidth = radius * 2;
        context.lineCap = "round";
        context.stroke();
      }
    }
    if (coverage.markStroke(start, end, radius) === 1) {
      stop();
      reveal();
    }
  }

  /** @param {PointerEvent} event */
  function scratch(event) {
    const box = canvas.getBoundingClientRect();
    const point = {
      x: (event.clientX - box.left) * width / box.width,
      y: (event.clientY - box.top) * height / box.height,
    };
    const start = previous ?? point;
    previous = point;
    rub(start, point);
  }

  function stop() {
    const pointer = activePointer;
    activePointer = null;
    previous = null;
    if (pointer !== null && canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || activePointer !== null) return;
    activePointer = event.pointerId;
    canvas.setPointerCapture(event.pointerId);
    scratch(event);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (event.pointerId === activePointer) scratch(event);
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
    canvas.addEventListener(type, (event) => {
      if (event.pointerId === activePointer) stop();
    });
  }

  return {
    stop,
    rubStep() {
      stop();
      const y = height * keyboardRows[keyboardRow];
      keyboardRow = (keyboardRow + 1) % keyboardRows.length;
      rub({ x: 0, y }, { x: width, y });
    },
    reset() {
      stop();
      keyboardRow = 0;
      coverage = new ScratchCoverage(width, height);
      if (context) paintFoil(context, width, height);
    },
  };
}
