export type AudioTranscriptionInput = {
  audio: Buffer;
  mimeType: string;
  filename: string;
};

export interface AudioTranscriber {
  transcribeAudio(input: AudioTranscriptionInput): Promise<string>;
}
