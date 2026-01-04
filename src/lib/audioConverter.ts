/**
 * Audio conversion utilities for voice cloning
 * Converts WebM/MP4 recordings to high-quality WAV format for better voice cloning results
 */

// Debug logging - only enabled in development
const DEBUG = import.meta.env?.DEV ?? false;

/**
 * Convert WebM/MP4 audio blob to WAV format with high quality settings
 *
 * Why this matters for voice cloning:
 * - WebM uses Opus codec with lossy compression (poor for voice cloning)
 * - WAV is uncompressed PCM audio (preserves voice characteristics)
 * - 44.1kHz sample rate matches ElevenLabs expected format
 * - Single channel (mono) is sufficient and reduces file size
 * - Normalization targets ElevenLabs optimal levels (-18dB RMS, -3dB peak)
 *
 * @param blob - Input audio blob (WebM, MP4, etc.)
 * @returns Promise<Blob> - High-quality WAV blob suitable for voice cloning
 */
export async function convertToWAV(blob: Blob): Promise<Blob> {
  if (DEBUG) console.log('[convertToWAV] Starting conversion, input blob size:', blob.size, 'type:', blob.type);

  // Create audio context - 44.1kHz is standard high-quality sample rate for voice
  const audioContext = new AudioContext({ sampleRate: 44100 });

  try {
    // Decode the input audio to raw PCM data
    const arrayBuffer = await blob.arrayBuffer();
    if (DEBUG) console.log('[convertToWAV] ArrayBuffer size:', arrayBuffer.byteLength);

    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    if (DEBUG) console.log('[convertToWAV] Decoded audio - duration:', audioBuffer.duration, 'sampleRate:', audioBuffer.sampleRate, 'channels:', audioBuffer.numberOfChannels, 'length:', audioBuffer.length);

    // Convert to mono if stereo (voice cloning doesn't need stereo)
    const monoData = audioBuffer.numberOfChannels > 1
      ? mergeChannels(audioBuffer)
      : audioBuffer.getChannelData(0);

    if (DEBUG) console.log('[convertToWAV] Mono data length:', monoData.length);

    if (monoData.length === 0) {
      throw new Error('Audio decoding produced empty data');
    }

    // ========================================================================
    // Audio preprocessing pipeline for optimal voice cloning quality
    // Order matters: filter → trim → normalize
    // ========================================================================

    // Step 1: Apply high-pass filter to remove low-frequency rumble (80Hz cutoff)
    // Removes AC hum, traffic noise, HVAC rumble while preserving voice
    const filteredData = applyHighPassFilter(monoData, audioBuffer.sampleRate, 80);

    // Step 2: Trim silence from start/end (keeps 300ms buffer)
    // Removes dead air that wastes voice clone training data
    const trimmedData = trimSilence(filteredData, 0.01, 300, audioBuffer.sampleRate);

    // Step 3: Normalize to ElevenLabs optimal levels
    // Target: -18dB RMS (center of -23 to -18 dB range), -3dB peak limit
    const channelData = normalizeToElevenLabsSpecs(trimmedData, -18, -3);

    // Create WAV file with optimal settings for voice cloning
    const wavBlob = encodeWAV(channelData, audioBuffer.sampleRate);

    // Validate the WAV blob has correct header
    const wavArrayBuffer = await wavBlob.arrayBuffer();
    const wavBytes = new Uint8Array(wavArrayBuffer);
    const riff = String.fromCharCode(wavBytes[0], wavBytes[1], wavBytes[2], wavBytes[3]);
    const wave = String.fromCharCode(wavBytes[8], wavBytes[9], wavBytes[10], wavBytes[11]);

    if (riff !== 'RIFF' || wave !== 'WAVE') {
      console.error('[convertToWAV] Invalid WAV headers:', { riff, wave });
      throw new Error('WAV encoding failed - invalid headers');
    }

    if (DEBUG) console.log('[convertToWAV] Conversion successful - output size:', wavBlob.size, 'type:', wavBlob.type);
    return wavBlob;
  } catch (error) {
    console.error('[convertToWAV] Conversion failed:', error);
    throw error;
  } finally {
    // Clean up audio context to free resources
    await audioContext.close();
  }
}

/**
 * Merge stereo channels to mono by averaging
 */
function mergeChannels(audioBuffer: AudioBuffer): Float32Array {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const merged = new Float32Array(length);

  // Average all channels
  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (let channel = 0; channel < numberOfChannels; channel++) {
      sum += audioBuffer.getChannelData(channel)[i];
    }
    merged[i] = sum / numberOfChannels;
  }

  return merged;
}

/**
 * Utility: Convert dB to linear amplitude
 */
function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

/**
 * Utility: Convert linear amplitude to dB
 */
function linearToDb(linear: number): number {
  if (linear <= 0) return -100;
  return 20 * Math.log10(linear);
}

/**
 * Apply RMS normalization to ElevenLabs optimal levels
 *
 * ElevenLabs IVC recommendations (from docs):
 * - Target RMS: -18 dB (0.126 linear) - center of -23 to -18 dB optimal range
 * - Peak limit: -3 dB (0.708 linear) - prevents distortion
 * - Use soft-knee compression near peak limit for natural sound
 *
 * Why this matters for voice cloning:
 * - Consistent audio levels improve voice clone quality
 * - Proper peak limiting prevents "weird twist" artifacts
 * - Soft-knee compression sounds more natural than hard clipping
 *
 * @param samples - Float32Array of audio samples
 * @param targetRmsDb - Target RMS in dB (default: -18 for ElevenLabs optimal)
 * @param peakLimitDb - Peak limit in dB (default: -3 per ElevenLabs recommendation)
 * @returns Float32Array - Normalized audio samples
 */
function normalizeToElevenLabsSpecs(
  samples: Float32Array,
  targetRmsDb: number = -18,
  peakLimitDb: number = -3
): Float32Array {
  // Convert dB targets to linear scale
  const targetRms = dbToLinear(targetRmsDb); // -18dB = 0.126
  const peakLimit = dbToLinear(peakLimitDb); // -3dB = 0.708

  // Calculate current RMS and peak
  let sumSquares = 0;
  let currentPeak = 0;
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    sumSquares += samples[i] * samples[i];
    if (abs > currentPeak) currentPeak = abs;
  }
  const currentRms = Math.sqrt(sumSquares / samples.length);

  // If audio is too quiet (silence), skip normalization
  if (currentRms < 0.0001) {
    if (DEBUG) console.log('[normalizeToElevenLabsSpecs] Audio too quiet, skipping normalization');
    return samples;
  }

  // Calculate RMS-based gain
  let gain = targetRms / currentRms;

  // Check if gain would cause peaks to exceed limit
  const projectedPeak = currentPeak * gain;
  if (projectedPeak > peakLimit) {
    // Reduce gain to respect peak limit
    const oldGain = gain;
    gain = peakLimit / currentPeak;
    if (DEBUG) console.log(`[normalizeToElevenLabsSpecs] Gain limited by peak: ${oldGain.toFixed(2)}x -> ${gain.toFixed(2)}x`);
  }

  // Apply gain with soft-knee compression near peak limit
  const normalized = new Float32Array(samples.length);
  const kneeStart = peakLimit * 0.85; // Start compression at 85% of peak limit
  const kneeRange = peakLimit - kneeStart;
  let compressedSamples = 0;

  for (let i = 0; i < samples.length; i++) {
    let sample = samples[i] * gain;
    const abs = Math.abs(sample);

    // Soft-knee compression for samples approaching peak limit
    if (abs > kneeStart) {
      // Calculate how far into the knee region we are (0-1)
      const excess = abs - kneeStart;
      // Use exponential curve for natural-sounding compression
      // ratio ~4:1 at the knee, approaches hard limit at peakLimit
      const compressionRatio = 4;
      const compressedExcess = kneeRange * (1 - Math.exp(-excess / kneeRange * compressionRatio));
      const newAbs = kneeStart + compressedExcess;
      sample = sample > 0 ? newAbs : -newAbs;
      compressedSamples++;
    }

    // Hard limit as safety (should rarely trigger with soft knee)
    if (Math.abs(sample) > peakLimit) {
      sample = sample > 0 ? peakLimit : -peakLimit;
    }

    normalized[i] = sample;
  }

  // Calculate final stats using iterative approach (avoid spread operator stack overflow)
  let finalSumSquares = 0;
  let finalPeak = 0;
  for (let i = 0; i < normalized.length; i++) {
    finalSumSquares += normalized[i] * normalized[i];
    const abs = Math.abs(normalized[i]);
    if (abs > finalPeak) finalPeak = abs;
  }
  const finalRms = Math.sqrt(finalSumSquares / normalized.length);

  if (DEBUG) {
    console.log(`[normalizeToElevenLabsSpecs] Normalized:`, {
      inputRms: `${linearToDb(currentRms).toFixed(1)}dB`,
      inputPeak: `${linearToDb(currentPeak).toFixed(1)}dB`,
      outputRms: `${linearToDb(finalRms).toFixed(1)}dB`,
      outputPeak: `${linearToDb(finalPeak).toFixed(1)}dB`,
      gain: `${gain.toFixed(2)}x`,
      compressedSamples: `${compressedSamples} (${(compressedSamples / samples.length * 100).toFixed(2)}%)`,
    });
  }

  return normalized;
}

/**
 * Apply high-pass filter to remove low-frequency rumble
 * Common in home recordings (AC hum ~60Hz, traffic rumble, HVAC noise)
 *
 * Uses a simple first-order RC high-pass filter.
 * Cutoff of 80Hz removes rumble while preserving voice fundamentals (typically 85-255Hz)
 *
 * @param samples - Float32Array of audio samples
 * @param sampleRate - Sample rate in Hz
 * @param cutoffHz - Cutoff frequency (default: 80Hz)
 * @returns Float32Array - Filtered audio samples
 */
function applyHighPassFilter(
  samples: Float32Array,
  sampleRate: number,
  cutoffHz: number = 80
): Float32Array {
  // RC time constant for the filter
  const rc = 1.0 / (2.0 * Math.PI * cutoffHz);
  const dt = 1.0 / sampleRate;
  const alpha = rc / (rc + dt);

  const filtered = new Float32Array(samples.length);
  filtered[0] = samples[0];

  // Apply first-order high-pass filter
  for (let i = 1; i < samples.length; i++) {
    filtered[i] = alpha * (filtered[i - 1] + samples[i] - samples[i - 1]);
  }

  if (DEBUG) {
    console.log(`[applyHighPassFilter] Applied ${cutoffHz}Hz high-pass filter`);
  }

  return filtered;
}

/**
 * Trim silence from start and end of audio
 * Keeps a small buffer for natural feel, removes dead air that wastes clone training
 *
 * @param samples - Float32Array of audio samples
 * @param threshold - Amplitude threshold to consider as silence (default: 0.01)
 * @param bufferMs - Buffer to keep at start/end in ms (default: 300ms)
 * @param sampleRate - Sample rate in Hz
 * @returns Float32Array - Trimmed audio samples
 */
function trimSilence(
  samples: Float32Array,
  threshold: number = 0.01,
  bufferMs: number = 300,
  sampleRate: number = 44100
): Float32Array {
  const bufferSamples = Math.floor((bufferMs / 1000) * sampleRate);

  let start = 0;
  let end = samples.length - 1;

  // Find first non-silent sample
  for (let i = 0; i < samples.length; i++) {
    if (Math.abs(samples[i]) > threshold) {
      start = Math.max(0, i - bufferSamples);
      break;
    }
  }

  // Find last non-silent sample
  for (let i = samples.length - 1; i >= 0; i--) {
    if (Math.abs(samples[i]) > threshold) {
      end = Math.min(samples.length - 1, i + bufferSamples);
      break;
    }
  }

  // Don't trim if we'd remove too much (>50% of audio)
  const trimmedLength = end - start + 1;
  if (trimmedLength < samples.length * 0.5) {
    if (DEBUG) {
      console.log(`[trimSilence] Skipped - would remove >50% of audio`);
    }
    return samples;
  }

  if (DEBUG) {
    const trimmedStart = start / sampleRate;
    const trimmedEnd = (samples.length - end) / sampleRate;
    console.log(`[trimSilence] Trimmed ${trimmedStart.toFixed(2)}s from start, ${trimmedEnd.toFixed(2)}s from end`);
  }

  return samples.slice(start, end + 1);
}

/**
 * Encode PCM audio data to WAV format
 *
 * WAV format structure:
 * - RIFF header (12 bytes)
 * - fmt chunk (24 bytes) - audio format info
 * - data chunk (8 bytes + audio data)
 */
function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const numChannels = 1; // Mono
  const bitsPerSample = 16; // 16-bit PCM
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // Write WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // Write fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // Write data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM samples (convert float32 to int16)
  floatTo16BitPCM(view, 44, samples);

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Write string to DataView (for WAV headers)
 */
function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Convert Float32 samples to 16-bit PCM
 */
function floatTo16BitPCM(view: DataView, offset: number, input: Float32Array): void {
  for (let i = 0; i < input.length; i++, offset += 2) {
    // Clamp to [-1, 1] range and convert to 16-bit integer
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

/**
 * Get audio duration from blob without decoding
 */
export async function getAudioDuration(blob: Blob): Promise<number> {
  const audioContext = new AudioContext();
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer.duration;
  } finally {
    await audioContext.close();
  }
}

/**
 * Validate audio quality for voice cloning
 * Aligned with ElevenLabs IVC recommendations
 *
 * @returns { valid: boolean, duration: number, message?: string }
 */
export async function validateAudioForCloning(blob: Blob): Promise<{
  valid: boolean;
  duration: number;
  message?: string;
}> {
  const MIN_DURATION = 60; // ElevenLabs: "at least 1 minute of audio"
  const MAX_DURATION = 120; // ElevenLabs: "avoid exceeding 3 minutes" (we use 2 min for safety)
  const MIN_SIZE = 50000; // bytes (~50KB)

  // Check file size
  if (blob.size < MIN_SIZE) {
    return {
      valid: false,
      duration: 0,
      message: 'Audio file too small. Please record a longer sample.'
    };
  }

  // Check duration
  const duration = await getAudioDuration(blob);

  if (duration < MIN_DURATION) {
    return {
      valid: false,
      duration,
      message: `Recording too short (${duration.toFixed(1)}s). Please record at least ${MIN_DURATION} seconds for best quality.`
    };
  }

  if (duration > MAX_DURATION) {
    return {
      valid: false,
      duration,
      message: `Recording too long (${duration.toFixed(1)}s). Please keep it under ${MAX_DURATION} seconds.`
    };
  }

  return { valid: true, duration };
}
