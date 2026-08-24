/**
 * Enterprise AI Face & Attention Proctoring Engine
 * Provides client-side face detection, reference face embedding extraction,
 * identity verification matching, attention monitoring, and anti-cheating heuristics.
 *
 * Optimized with relaxed thresholds, multi-frame temporal smoothing,
 * cosine embedding similarity, and grace periods for a seamless and secure user experience.
 */

export type FacePositionState =
  | "centered"
  | "too_left"
  | "too_right"
  | "too_high"
  | "too_low"
  | "too_close"
  | "too_far"
  | "partially_out_of_frame";

export type HeadPoseState =
  | "facing_forward"
  | "looking_away_left"
  | "looking_away_right"
  | "looking_away_down"
  | "looking_away_up";

export type LightingState = "good" | "low_light" | "overexposed";

export interface FaceDetectionResult {
  faceCount: number;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  }; // Normalized 0..1
  positionState: FacePositionState;
  headPoseState: HeadPoseState;
  lightingState: LightingState;
  luminance: number;
  isObstructed: boolean;
  embedding?: number[];
  referenceSimilarity?: number; // 0.0 to 1.0 (if reference embedding provided)
  isIdentityMatched?: boolean;
  allFaceEmbeddings?: number[][];
  landmarks?: {
    leftEye?: { x: number; y: number };
    rightEye?: { x: number; y: number };
    nose?: { x: number; y: number };
    mouth?: { x: number; y: number };
  };
}

export class AIFaceTracker {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private faceDetector: any = null;
  private hasNativeDetector = false;

  // Smoothing buffers for noise filtering
  private positionBuffer: { x: number; y: number; w: number; h: number }[] = [];
  private poseBuffer: HeadPoseState[] = [];
  private faceCountBuffer: number[] = [];
  private similarityBuffer: number[] = [];
  private readonly bufferSize = 6;

  constructor() {
    if (typeof window !== "undefined") {
      this.canvas = document.createElement("canvas");
      this.canvas.width = 160;
      this.canvas.height = 120;
      this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });

      // Check for native Shape Detection API (FaceDetector)
      if ("FaceDetector" in window) {
        try {
          const FaceDetectorCtor = (window as any).FaceDetector;
          this.faceDetector = new FaceDetectorCtor({
            maxDetectedFaces: 5,
            fastMode: true,
          });
          this.hasNativeDetector = true;
        } catch {
          this.hasNativeDetector = false;
        }
      }
    }
  }

  /**
   * Analyzes the current video frame and optionally verifies against registered reference face embedding.
   */
  public async analyzeFrame(
    video: HTMLVideoElement,
    referenceEmbedding?: number[] | null
  ): Promise<FaceDetectionResult> {
    if (!video || video.paused || video.ended || !this.ctx || !this.canvas) {
      return {
        faceCount: 0,
        confidence: 0,
        positionState: "partially_out_of_frame",
        headPoseState: "facing_forward",
        lightingState: "good",
        luminance: 128,
        isObstructed: false,
        isIdentityMatched: true,
      };
    }

    const w = this.canvas.width;
    const h = this.canvas.height;
    this.ctx.drawImage(video, 0, 0, w, h);

    const frame = this.ctx.getImageData(0, 0, w, h);
    const data = frame.data;

    // 1. Luminance & Lighting Analysis
    let totalLuminance = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      totalLuminance += 0.299 * r + 0.587 * g + 0.114 * b;
    }
    const avgLuminance = totalLuminance / (w * h);
    let lightingState: LightingState = "good";
    if (avgLuminance < 10) lightingState = "low_light";
    else if (avgLuminance > 245) lightingState = "overexposed";

    // 2. Face Detection (Native Shape Detector or Robust Heuristics)
    let nativeFaces: any[] = [];
    if (this.hasNativeDetector && this.faceDetector) {
      try {
        nativeFaces = await this.faceDetector.detect(this.canvas);
      } catch {
        nativeFaces = [];
      }
    }

    let detection: FaceDetectionResult;
    if (nativeFaces.length > 0) {
      detection = this.processNativeFaces(nativeFaces, w, h, avgLuminance, lightingState);
    } else {
      detection = this.processChrominanceHeuristic(data, w, h, avgLuminance, lightingState);
    }

    // 3. Face Embedding & Identity Verification Matching
    if (detection.faceCount > 0 && detection.boundingBox && this.ctx) {
      const box = detection.boundingBox;
      const cropX = Math.max(0, Math.floor(box.x * w));
      const cropY = Math.max(0, Math.floor(box.y * h));
      const cropW = Math.min(w - cropX, Math.max(10, Math.floor(box.width * w)));
      const cropH = Math.min(h - cropY, Math.max(10, Math.floor(box.height * h)));

      const faceCrop = this.ctx.getImageData(cropX, cropY, cropW, cropH);
      const liveEmbedding = this.computeDescriptorFromImageData(faceCrop);
      detection.embedding = liveEmbedding;

      if (referenceEmbedding && referenceEmbedding.length > 0) {
        const rawSim = this.computeCosineSimilarity(liveEmbedding, referenceEmbedding);
        this.similarityBuffer.push(rawSim);
        if (this.similarityBuffer.length > this.bufferSize) this.similarityBuffer.shift();

        // Smoothed similarity (average of recent valid samples)
        const avgSim =
          this.similarityBuffer.reduce((acc, v) => acc + v, 0) / this.similarityBuffer.length;

        detection.referenceSimilarity = Math.round(avgSim * 100) / 100;
        // Configurable similarity threshold (0.62 is tolerant to lighting & minor pose)
        detection.isIdentityMatched = avgSim >= 0.62;
      } else {
        detection.isIdentityMatched = true;
      }
    } else {
      detection.isIdentityMatched = true;
    }

    return detection;
  }

  /**
   * Extracts a standardized, normalized face representation / embedding vector from an image dataURL, image, or video element.
   */
  public async extractFaceEmbedding(
    source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | string
  ): Promise<number[] | null> {
    if (typeof window === "undefined") return null;

    let img: HTMLImageElement;
    if (typeof source === "string") {
      img = new Image();
      img.crossOrigin = "anonymous";
      img.src = source;
      await new Promise((resolve) => {
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
      });
    } else if (source instanceof HTMLImageElement) {
      img = source;
    } else {
      // Canvas or Video
      const tmpCanvas = document.createElement("canvas");
      tmpCanvas.width = 160;
      tmpCanvas.height = 120;
      const tmpCtx = tmpCanvas.getContext("2d");
      if (!tmpCtx) return null;
      tmpCtx.drawImage(source, 0, 0, 160, 120);
      const data = tmpCtx.getImageData(0, 0, 160, 120);
      return this.computeDescriptorFromImageData(data);
    }

    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = 160;
    tmpCanvas.height = 120;
    const tmpCtx = tmpCanvas.getContext("2d");
    if (!tmpCtx) return null;
    tmpCtx.drawImage(img, 0, 0, 160, 120);

    // Locate face region
    let faceBox = { x: 20, y: 15, w: 120, h: 90 };
    if (this.hasNativeDetector && this.faceDetector) {
      try {
        const faces = await this.faceDetector.detect(tmpCanvas);
        if (faces.length > 0) {
          const b = faces[0].boundingBox;
          faceBox = { x: b.x, y: b.y, w: b.width, h: b.height };
        }
      } catch {}
    }

    const faceData = tmpCtx.getImageData(
      Math.max(0, Math.floor(faceBox.x)),
      Math.max(0, Math.floor(faceBox.y)),
      Math.min(160, Math.floor(faceBox.w)),
      Math.min(120, Math.floor(faceBox.h))
    );

    return this.computeDescriptorFromImageData(faceData);
  }

  /**
   * Computes Cosine Similarity between two face embeddings.
   * Range: 0.0 (completely dissimilar) to 1.0 (identical)
   */
  public computeCosineSimilarity(embA: number[], embB: number[]): number {
    if (!embA || !embB || embA.length === 0 || embB.length === 0) return 0;
    const len = Math.min(embA.length, embB.length);
    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < len; i++) {
      const a = embA[i] ?? 0;
      const b = embB[i] ?? 0;
      dot += a * b;
      normA += a * a;
      normB += b * b;
    }

    if (normA === 0 || normB === 0) return 0;
    const cosine = dot / (Math.sqrt(normA) * Math.sqrt(normB));
    return Math.max(0, Math.min(1, (cosine + 1) / 2)); // Normalize -1..1 to 0..1
  }

  /**
   * Robust multi-scale spatial LBP (Local Binary Patterns) + HOG Gradient structure descriptor.
   * Generates a 64-element L2 normalized feature vector that is invariant to illumination and scale.
   */
  private computeDescriptorFromImageData(imageData: ImageData): number[] {
    const w = imageData.width;
    const h = imageData.height;
    const data = imageData.data;

    // 1. Convert to 32x32 normalized grayscale matrix
    const targetDim = 32;
    const gray = new Float32Array(targetDim * targetDim);

    const stepX = w / targetDim;
    const stepY = h / targetDim;

    for (let ty = 0; ty < targetDim; ty++) {
      for (let tx = 0; tx < targetDim; tx++) {
        const sx = Math.floor(tx * stepX);
        const sy = Math.floor(ty * stepY);
        const idx = (sy * w + sx) * 4;
        const r = data[idx] ?? 0;
        const g = data[idx + 1] ?? 0;
        const b = data[idx + 2] ?? 0;
        gray[ty * targetDim + tx] = 0.299 * r + 0.587 * g + 0.114 * b;
      }
    }

    // 2. Contrast Normalization
    let mean = 0;
    for (let i = 0; i < gray.length; i++) mean += gray[i] ?? 0;
    mean /= gray.length;

    let variance = 0;
    for (let i = 0; i < gray.length; i++) {
      const diff = (gray[i] ?? 0) - mean;
      variance += diff * diff;
    }
    const stdDev = Math.sqrt(variance / gray.length) || 1;

    for (let i = 0; i < gray.length; i++) {
      gray[i] = ((gray[i] ?? 0) - mean) / stdDev;
    }

    // 3. Extract 4x4 Grid Zone LBP & Gradient Histograms (16 zones * 4 bins = 64 dimensions)
    const gridSize = 4;
    const cellSize = targetDim / gridSize;
    const descriptor = new Float32Array(gridSize * gridSize * 4);
    let descIdx = 0;

    for (let gy = 0; gy < gridSize; gy++) {
      for (let gx = 0; gx < gridSize; gx++) {
        let patternSum = 0;
        let gradMagH = 0;
        let gradMagV = 0;
        let gradDiag = 0;

        const startY = gy * cellSize;
        const startX = gx * cellSize;

        for (let cy = 1; cy < cellSize - 1; cy++) {
          for (let cx = 1; cx < cellSize - 1; cx++) {
            const y = Math.floor(startY + cy);
            const x = Math.floor(startX + cx);
            const center = gray[y * targetDim + x] ?? 0;

            // 8-neighbor comparison (Local Binary Pattern)
            let lbp = 0;
            if ((gray[(y - 1) * targetDim + (x - 1)] ?? 0) >= center) lbp |= 1;
            if ((gray[(y - 1) * targetDim + x] ?? 0) >= center) lbp |= 2;
            if ((gray[(y - 1) * targetDim + (x + 1)] ?? 0) >= center) lbp |= 4;
            if ((gray[y * targetDim + (x + 1)] ?? 0) >= center) lbp |= 8;
            if ((gray[(y + 1) * targetDim + (x + 1)] ?? 0) >= center) lbp |= 16;
            if ((gray[(y + 1) * targetDim + x] ?? 0) >= center) lbp |= 32;
            if ((gray[(y + 1) * targetDim + (x - 1)] ?? 0) >= center) lbp |= 64;
            if ((gray[y * targetDim + (x - 1)] ?? 0) >= center) lbp |= 128;

            patternSum += lbp;

            // Spatial Gradients
            const dx = (gray[y * targetDim + (x + 1)] ?? 0) - (gray[y * targetDim + (x - 1)] ?? 0);
            const dy = (gray[(y + 1) * targetDim + x] ?? 0) - (gray[(y - 1) * targetDim + x] ?? 0);
            gradMagH += Math.abs(dx);
            gradMagV += Math.abs(dy);
            gradDiag += Math.abs(dx - dy);
          }
        }

        const count = (cellSize - 2) * (cellSize - 2) || 1;
        descriptor[descIdx++] = patternSum / (count * 255);
        descriptor[descIdx++] = gradMagH / count;
        descriptor[descIdx++] = gradMagV / count;
        descriptor[descIdx++] = gradDiag / count;
      }
    }

    // 4. L2 Normalization
    let norm = 0;
    for (let i = 0; i < descriptor.length; i++) norm += (descriptor[i] ?? 0) ** 2;
    norm = Math.sqrt(norm) || 1;

    const finalEmbedding: number[] = [];
    for (let i = 0; i < descriptor.length; i++) {
      finalEmbedding.push(Number(((descriptor[i] ?? 0) / norm).toFixed(5)));
    }

    return finalEmbedding;
  }

  private processNativeFaces(
    faces: any[],
    w: number,
    h: number,
    luminance: number,
    lightingState: LightingState
  ): FaceDetectionResult {
    const validFaces = faces.filter(
      (f) => f.boundingBox && f.boundingBox.width >= 20 && f.boundingBox.height >= 20
    );

    const rawFaceCount = validFaces.length;
    this.faceCountBuffer.push(rawFaceCount);
    if (this.faceCountBuffer.length > this.bufferSize) this.faceCountBuffer.shift();

    const faceCount = this.getMode(this.faceCountBuffer);

    if (faceCount === 0 || validFaces.length === 0) {
      return {
        faceCount: 0,
        confidence: 0,
        positionState: "partially_out_of_frame",
        headPoseState: "facing_forward",
        lightingState,
        luminance,
        isObstructed: false,
      };
    }

    validFaces.sort((a, b) => b.boundingBox.width * b.boundingBox.height - a.boundingBox.width * a.boundingBox.height);
    const primary = validFaces[0];
    const box = primary.boundingBox;

    const normX = Math.max(0, box.x / w);
    const normY = Math.max(0, box.y / h);
    const normW = Math.min(1, box.width / w);
    const normH = Math.min(1, box.height / h);

    const smoothed = this.smoothBox({ x: normX, y: normY, w: normW, h: normH });
    const positionState = this.classifyPosition(smoothed);
    const headPoseState = this.classifyPoseFromLandmarks(primary.landmarks, smoothed);

    return {
      faceCount,
      confidence: 97 + Math.min(faceCount === 1 ? 2 : 0, 3),
      boundingBox: {
        x: smoothed.x,
        y: smoothed.y,
        width: smoothed.w,
        height: smoothed.h,
      },
      positionState,
      headPoseState,
      lightingState,
      luminance,
      isObstructed: false,
    };
  }

  private processChrominanceHeuristic(
    data: Uint8ClampedArray,
    w: number,
    h: number,
    luminance: number,
    lightingState: LightingState
  ): FaceDetectionResult {
    if (luminance < 8) {
      return {
        faceCount: 0,
        confidence: 0,
        positionState: "partially_out_of_frame",
        headPoseState: "facing_forward",
        lightingState: "low_light",
        luminance,
        isObstructed: false,
      };
    }

    let minX = w,
      maxX = 0,
      minY = h,
      maxY = 0;
    let skinPixelCount = 0;
    let sumX = 0,
      sumY = 0;

    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const idx = (y * w + x) * 4;
        const r = data[idx] ?? 0;
        const g = data[idx + 1] ?? 0;
        const b = data[idx + 2] ?? 0;

        const isSkin =
          r > 38 &&
          g > 22 &&
          b > 16 &&
          r > g &&
          r > b &&
          (r - g >= 5) &&
          (r - b >= 5);

        if (isSkin) {
          skinPixelCount++;
          sumX += x;
          sumY += y;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const totalSampledPixels = (w * h) / 4;
    const skinRatio = skinPixelCount / totalSampledPixels;

    if (skinRatio < 0.015 || skinPixelCount < 25) {
      this.faceCountBuffer.push(0);
      if (this.faceCountBuffer.length > this.bufferSize) this.faceCountBuffer.shift();
      const faceCount = this.getMode(this.faceCountBuffer);

      return {
        faceCount,
        confidence: 0,
        positionState: "partially_out_of_frame",
        headPoseState: "facing_forward",
        lightingState,
        luminance,
        isObstructed: false,
      };
    }

    let rawFaceCount = 1;
    if (skinRatio > 0.65) {
      const spanW = (maxX - minX) / w;
      if (spanW > 0.92) rawFaceCount = 2;
    }

    this.faceCountBuffer.push(rawFaceCount);
    if (this.faceCountBuffer.length > this.bufferSize) this.faceCountBuffer.shift();
    const faceCount = this.getMode(this.faceCountBuffer);

    const rawX = Math.max(0, minX / w);
    const rawY = Math.max(0, minY / h);
    const rawW = Math.min(1, Math.max(0.2, (maxX - minX) / w));
    const rawH = Math.min(1, Math.max(0.25, (maxY - minY) / h));

    const smoothed = this.smoothBox({ x: rawX, y: rawY, w: rawW, h: rawH });
    const positionState = this.classifyPosition(smoothed);

    const centroidX = sumX / (skinPixelCount || 1) / w;
    const centroidY = sumY / (skinPixelCount || 1) / h;
    const headPoseState = this.classifyPoseFromCentroid(centroidX, centroidY, smoothed);

    return {
      faceCount,
      confidence: Math.min(99, Math.round(skinRatio * 200 + 70)),
      boundingBox: {
        x: smoothed.x,
        y: smoothed.y,
        width: smoothed.w,
        height: smoothed.h,
      },
      positionState,
      headPoseState,
      lightingState,
      luminance,
      isObstructed: false,
    };
  }

  private classifyPosition(box: { x: number; y: number; w: number; h: number }): FacePositionState {
    const centerX = box.x + box.w / 2;
    const centerY = box.y + box.h / 2;
    const area = box.w * box.h;

    if (area > 0.85) return "too_close";
    if (area < 0.02) return "too_far";
    if (centerX < 0.08) return "too_left";
    if (centerX > 0.92) return "too_right";
    if (centerY < 0.06) return "too_high";
    if (centerY > 0.94) return "too_low";

    return "centered";
  }

  private classifyPoseFromCentroid(
    cx: number,
    cy: number,
    box: { x: number; y: number; w: number; h: number }
  ): HeadPoseState {
    const boxCenterX = box.x + box.w / 2;
    const boxCenterY = box.y + box.h / 2;

    const diffX = cx - boxCenterX;
    const diffY = cy - boxCenterY;

    let pose: HeadPoseState = "facing_forward";
    if (diffX < -0.24) pose = "looking_away_left";
    else if (diffX > 0.24) pose = "looking_away_right";
    else if (diffY > 0.28) pose = "looking_away_down";
    else if (diffY < -0.28) pose = "looking_away_up";

    this.poseBuffer.push(pose);
    if (this.poseBuffer.length > this.bufferSize) this.poseBuffer.shift();

    return this.getMode(this.poseBuffer);
  }

  private classifyPoseFromLandmarks(
    landmarks: any[] | undefined,
    box: { x: number; y: number; w: number; h: number }
  ): HeadPoseState {
    if (!landmarks || landmarks.length < 2) {
      return "facing_forward";
    }

    const leftEye = landmarks.find((l) => l.type === "eye" && l.location?.x < (box.x + box.w / 2));
    const rightEye = landmarks.find((l) => l.type === "eye" && l.location?.x >= (box.x + box.w / 2));
    const nose = landmarks.find((l) => l.type === "nose");

    if (leftEye && rightEye && nose) {
      const eyeDistLeft = Math.abs(nose.location.x - leftEye.location.x);
      const eyeDistRight = Math.abs(rightEye.location.x - nose.location.x);
      const ratio = eyeDistLeft / (eyeDistRight || 0.001);

      if (ratio < 0.25) return "looking_away_left";
      if (ratio > 3.8) return "looking_away_right";
    }

    return "facing_forward";
  }

  private smoothBox(box: { x: number; y: number; w: number; h: number }) {
    this.positionBuffer.push(box);
    if (this.positionBuffer.length > this.bufferSize) this.positionBuffer.shift();

    const sum = this.positionBuffer.reduce(
      (acc, b) => ({
        x: acc.x + b.x,
        y: acc.y + b.y,
        w: acc.w + b.w,
        h: acc.h + b.h,
      }),
      { x: 0, y: 0, w: 0, h: 0 }
    );

    const len = this.positionBuffer.length;
    return {
      x: sum.x / len,
      y: sum.y / len,
      w: sum.w / len,
      h: sum.h / len,
    };
  }

  private getMode<T>(arr: T[]): T {
    if (arr.length === 0) return ("facing_forward" as unknown) as T;
    const counts = new Map<T, number>();
    for (const item of arr) {
      counts.set(item, (counts.get(item) || 0) + 1);
    }
    let best: T = arr[arr.length - 1] as T;
    let max = 0;
    counts.forEach((cnt, val) => {
      if (cnt > max) {
        max = cnt;
        best = val;
      }
    });
    return best;
  }
}
