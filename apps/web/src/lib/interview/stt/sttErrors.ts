import type { SttErrorKind } from './sttApi';

export type MicErrorCode = 'denied' | 'no-device' | 'unsupported' | 'lost';

const MIC_MESSAGES: Record<MicErrorCode, string> = {
  denied: 'Microphone permission denied. Allow mic access in your browser, or type your response.',
  'no-device': 'No microphone was found. Connect one, or type your response.',
  unsupported: 'Voice input is not supported in this browser. Use a recent Chrome, Edge, Firefox or Safari, or type your response.',
  lost: 'The microphone was disconnected. Reconnect it, or type your response.',
};

const STT_MESSAGES: Record<SttErrorKind, string> = {
  unavailable: 'The speech service is unavailable right now. Please type your response.',
  network: 'Could not reach the speech service. Check your connection or type your response.',
  rejected: 'Your last answer could not be processed. Please try again or type your response.',
};

export const micErrorMessage = (code: MicErrorCode): string => MIC_MESSAGES[code];
export const sttErrorMessage = (kind: SttErrorKind): string => STT_MESSAGES[kind];
