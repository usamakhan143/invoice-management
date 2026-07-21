import type {
  LearningExtractionAiInput,
  LearningExtractionAiOutput,
  LearningExtractionAiPort,
} from "./LearningExtractionAiPort";

/** Deterministic null adapter — returns empty proposals for F1/F2 until real AI is bound. */
export class NullLearningExtractionAiPort implements LearningExtractionAiPort {
  async proposeCandidates(
    _input: LearningExtractionAiInput,
  ): Promise<LearningExtractionAiOutput> {
    return {
      proposals: [],
      modelMetadata: {
        provider: "null",
        modelId: "null",
        promptVersion: "f1-null-v1",
      },
      rawResponseHash: "null",
    };
  }
}

export const nullLearningExtractionAiPort = new NullLearningExtractionAiPort();
