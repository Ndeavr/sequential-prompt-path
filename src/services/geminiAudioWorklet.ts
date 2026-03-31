/**
 * GeminiAudioWorklet — AudioWorklet processor for reliable 16kHz PCM mic capture.
 * Runs on a dedicated audio thread, avoiding ScriptProcessorNode's dropped-frame issues.
 *
 * Usage:
 *   1. Register the worklet via createWorkletBlobURL()
 *   2. Create AudioWorkletNode with name "pcm-capture-processor"
 *   3. Listen for messages on node.port (receives Int16 PCM chunks)
 */

/** The worklet processor code as a string (runs in AudioWorkletGlobalScope) */
const WORKLET_CODE = `
class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = new Float32Array(0);
    // We'll accumulate ~4096 samples before sending to match previous chunk size
    this._chunkSize = 4096;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0] || input[0].length === 0) return true;

    const channelData = input[0]; // mono channel 0

    // Accumulate samples
    const newBuffer = new Float32Array(this._buffer.length + channelData.length);
    newBuffer.set(this._buffer);
    newBuffer.set(channelData, this._buffer.length);
    this._buffer = newBuffer;

    // Send chunks when we have enough
    while (this._buffer.length >= this._chunkSize) {
      const chunk = this._buffer.slice(0, this._chunkSize);
      this._buffer = this._buffer.slice(this._chunkSize);

      // Convert Float32 → Int16
      const int16 = new Int16Array(chunk.length);
      for (let i = 0; i < chunk.length; i++) {
        int16[i] = Math.max(-32768, Math.min(32767, chunk[i] * 32768));
      }

      this.port.postMessage({ pcm: int16 }, [int16.buffer]);
    }

    return true;
  }
}

registerProcessor('pcm-capture-processor', PcmCaptureProcessor);
`;

/** Create a Blob URL for the AudioWorklet processor */
export function createWorkletBlobURL(): string {
  const blob = new Blob([WORKLET_CODE], { type: "application/javascript" });
  return URL.createObjectURL(blob);
}
