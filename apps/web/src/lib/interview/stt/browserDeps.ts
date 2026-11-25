import type { AnalyserLike, MicCaptureDeps } from './micCapture';
import { pickRecorderMimeType } from './utterance';

const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true, // lets the mic ignore the interviewer's voice coming out of the speakers
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
};

function createAnalyser(stream: MediaStream): AnalyserLike {
  const AudioCtx =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  void ctx.resume().catch(() => {});
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  ctx.createMediaStreamSource(stream).connect(analyser); // not connected to speakers: no feedback
  const samples = new Float32Array(analyser.fftSize);

  return {
    readRms() {
      analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
      return Math.sqrt(sum / samples.length);
    },
    close() {
      void ctx.close().catch(() => {});
    },
  };
}

export const browserMicDeps: MicCaptureDeps = {
  recordingSupported: () =>
    typeof MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia),
  getAudioStream: () => navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS }),
  pickMimeType: () => pickRecorderMimeType((m) => MediaRecorder.isTypeSupported(m)),
  createAnalyser,
  createRecorder: (stream, mimeType) =>
    new MediaRecorder(stream, mimeType ? { mimeType } : undefined) as unknown as ReturnType<MicCaptureDeps['createRecorder']>,
  now: () => performance.now(),
  setInterval: (fn, ms) => window.setInterval(fn, ms),
  clearInterval: (handle) => window.clearInterval(handle as number),
};
