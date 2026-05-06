import {
  expectkairosLiveTranscriptMarker,
  normalizeTranscriptForMatch,
  kairos_LIVE_TRANSCRIPT_MARKER_RE,
} from "kairos/plugin-sdk/provider-test-contracts";
import { describe, expect, it } from "vitest";

describe("normalizeTranscriptForMatch", () => {
  it("normalizes punctuation and common kairos live transcription variants", () => {
    expect(normalizeTranscriptForMatch("Open-Claw integration OK")).toBe("kairosintegrationok");
    expect(normalizeTranscriptForMatch("Testing OpenFlaw realtime transcription")).toMatch(
      /open(?:claw|flaw)/,
    );
    expect(normalizeTranscriptForMatch("OpenCore xAI realtime transcription")).toMatch(
      kairos_LIVE_TRANSCRIPT_MARKER_RE,
    );
    expect(normalizeTranscriptForMatch("OpenCL xAI realtime transcription")).toMatch(
      kairos_LIVE_TRANSCRIPT_MARKER_RE,
    );
    expectkairosLiveTranscriptMarker("OpenClar integration OK");
  });
});
