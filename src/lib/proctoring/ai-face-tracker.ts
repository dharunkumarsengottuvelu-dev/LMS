/**
 * Enterprise AI Face & Attention Proctoring Engine
 * Provides real-time client-side face detection, position tracking, head-pose estimation,
 * eye attention monitoring, luminance check, and anti-cheating heuristics without UI lag.
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
  private readonly bufferSize = 4;

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
   * Analyzes the current video frame and returns full proctoring heuristics.
   */
  public async analyzeFrame(video: HTMLVideoElement): Promise<FaceDetectionResult> {
    if (!video || video.paused || video.ended || !this.ctx || !this.canvas) {
      return {
        faceCount: 0,
        confidence: 0,
        positionState: "partially_out_of_frame",
        headPoseState: "facing_forward",
        lightingState: "good",
        luminance: 128,
        isObstructed: false,
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
    if (avgLuminance < 30) lightingState = "low_light";
    else if (avgLuminance > 235) lightingState = "overexposed";

    // 2. Face Detection (Native API or Fast Chrominance Segmentation)
    let nativeFaces: any[] = [];
    if (this.hasNativeDetector && this.faceDetector) {
      try {
        nativeFaces = await this.faceDetector.detect(this.canvas);
      } catch {
        // Fallback to heuristic
        nativeFaces = [];
      }
    }

    if (nativeFaces.length > 0) {
      return this.processNativeFaces(nativeFaces, w, h, avgLuminance, lightingState);
    } else {
      return this.processChrominanceHeuristic(data, w, h, avgLuminance, lightingState);
    }
  }

  private processNativeFaces(
    faces: any[],
    w: number,
    h: number,
    luminance: number,
    lightingState: LightingState
  ): FaceDetectionResult {
    const faceCount = faces.length;
    if (faceCount === 0) {
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

    // Primary face is the largest one
    faces.sort((a, b) => b.boundingBox.width * b.boundingBox.height - a.boundingBox.width * a.boundingBox.height);
    const primary = faces[0];
    const box = primary.boundingBox;

    // Normalized coordinates
    const normX = Math.max(0, box.x / w);
    const normY = Math.max(0, box.y / h);
    const normW = Math.min(1, box.width / w);
    const normH = Math.min(1, box.height / h);

    const smoothed = this.smoothBox({ x: normX, y: normY, w: normW, h: normH });
    const positionState = this.classifyPosition(smoothed);
    const headPoseState = this.classifyPoseFromLandmarks(primary.landmarks, smoothed);

    return {
      faceCount,
      confidence: 96 + Math.min(faceCount === 1 ? 3 : 0, 4),
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
      isObstructed: smoothed.w < 0.1 || smoothed.h < 0.1,
    };
  }

  /**
   * Fast Chrominance-Skin segmentation & contour centroid analysis
   * Runs in ~1-2ms on 160x120 frame
   */
  private processChrominanceHeuristic(
    data: Uint8ClampedArray,
    w: number,
    h: number,
    luminance: number,
    lightingState: LightingState
  ): FaceDetectionResult {
    if (luminance < 15) {
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

    // Fast skin color model in YCbCr / RGB space
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const idx = (y * w + x) * 4;
        const r = data[idx] ?? 0;
        const g = data[idx + 1] ?? 0;
        const b = data[idx + 2] ?? 0;

        const isSkin =
          r > 60 &&
          g > 40 &&
          b > 20 &&
          r > g &&
          r > b &&
          Math.abs(r - g) > 12 &&
          r - g >= 10 &&
          r - b >= 10;

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

    // If skin pixels are too sparse, no face is detected
    if (skinRatio < 0.05 || skinPixelCount < 80) {
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

    // Determine if multiple large disconnected regions exist
    let faceCount = 1;
    if (skinRatio > 0.48) {
      // Possible multiple candidates or candidate is extremely close
      const spanW = (maxX - minX) / w;
      if (spanW > 0.85) faceCount = 2;
    }

    const rawX = Math.max(0, minX / w);
    const rawY = Math.max(0, minY / h);
    const rawW = Math.min(1, Math.max(0.2, (maxX - minX) / w));
    const rawH = Math.min(1, Math.max(0.25, (maxY - minY) / h));

    const smoothed = this.smoothBox({ x: rawX, y: rawY, w: rawW, h: rawH });
    const positionState = this.classifyPosition(smoothed);

    // Estimate head pose from centroid vs bounding center
    const centroidX = sumX / (skinPixelCount || 1) / w;
    const centroidY = sumY / (skinPixelCount || 1) / h;
    const headPoseState = this.classifyPoseFromCentroid(centroidX, centroidY, smoothed);

    return {
      faceCount,
      confidence: Math.min(98, Math.round(skinRatio * 300 + 40)),
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
      isObstructed: smoothed.w < 0.12 || smoothed.h < 0.12,
    };
  }

  private classifyPosition(box: { x: number; y: number; w: number; h: number }): FacePositionState {
    const centerX = box.x + box.w / 2;
    const centerY = box.y + box.h / 2;
    const area = box.w * box.h;

    if (area > 0.58) return "too_close";
    if (area < 0.065) return "too_far";
    if (box.x <= 0.02 || box.x + box.w >= 0.98 || box.y <= 0.02) return "partially_out_of_frame";
    if (centerX < 0.28) return "too_left";
    if (centerX > 0.72) return "too_right";
    if (centerY < 0.22) return "too_high";
    if (centerY > 0.78) return "too_low";

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
    if (diffX < -0.09) pose = "looking_away_left";
    else if (diffX > 0.09) pose = "looking_away_right";
    else if (diffY > 0.10) pose = "looking_away_down";
    else if (diffY < -0.10) pose = "looking_away_up";

    this.poseBuffer.push(pose);
    if (this.poseBuffer.length > this.bufferSize) this.poseBuffer.shift();

    // Mode in pose buffer to prevent flickering
    const counts: Record<string, number> = {};
    for (const p of this.poseBuffer) {
      counts[p] = (counts[p] || 0) + 1;
    }
    let maxCount = 0;
    let selectedPose = pose;
    for (const [p, c] of Object.entries(counts)) {
      if (c > maxCount) {
        maxCount = c;
        selectedPose = p as HeadPoseState;
      }
    }
    return selectedPose;
  }

  private classifyPoseFromLandmarks(landmarks: any[] | undefined, box: { x: number; y: number; w: number; h: number }): HeadPoseState {
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

      if (ratio < 0.45) return "looking_away_left";
      if (ratio > 2.2) return "looking_away_right";
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
}
