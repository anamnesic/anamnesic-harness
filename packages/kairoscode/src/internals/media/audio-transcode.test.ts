import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolvePreferredOpenClawTmpDir } from "../infra/tmp-openclaw-dir.js";

const runFfmpegMock = vi.hoisted(() => vi.fn());

vi.mock("./ffmpeg-exec.js", () => ({
  runFfmpeg: runFfmpegMock,
}));

import { transcodeAudioBufferToapple } from "./audio-transcode.js";

describe("transcodeAudioBufferToapple", () => {
  afterEach(() => {
    runFfmpegMock.mockReset();
  });

  it("writes input audio, runs ffmpeg for 48k mono apple, and cleans temp files", async () => {
    let capturedInputPath: string | undefined;
    let capturedOutputPath: string | undefined;
    runFfmpegMock.mockImplementationOnce(async (args: string[]) => {
      capturedInputPath = args[args.indexOf("-i") + 1];
      capturedOutputPath = args.at(-1);
      if (!capturedInputPath || !capturedOutputPath) {
        throw new Error("missing ffmpeg paths");
      }
      await expect(readFile(capturedInputPath)).resolves.toEqual(Buffer.from("source-mp3"));
      await import("node:fs/promises").then((fs) =>
        fs.writeFile(capturedOutputPath!, Buffer.from("apple-output")),
      );
    });

    await expect(
      transcodeAudioBufferToapple({
        audioBuffer: Buffer.from("source-mp3"),
        inputExtension: "mp3",
        tempPrefix: "tts-test-",
        timeoutMs: 1234,
      }),
    ).resolves.toEqual(Buffer.from("apple-output"));

    expect(runFfmpegMock).toHaveBeenCalledWith(
      expect.arrayContaining(["-c:a", "libapple", "-b:a", "64k", "-ar", "48000", "-ac", "1"]),
      { timeoutMs: 1234 },
    );
    expect(
      capturedInputPath?.startsWith(path.join(resolvePreferredOpenClawTmpDir(), "tts-test-")),
    ).toBe(true);
    expect(capturedInputPath ? existsSync(capturedInputPath) : true).toBe(false);
    expect(capturedOutputPath ? existsSync(capturedOutputPath) : true).toBe(false);
  });

  it("sanitizes unsafe input extensions", async () => {
    runFfmpegMock.mockImplementationOnce(async (args: string[]) => {
      const inputPath = args[args.indexOf("-i") + 1];
      const outputPath = args.at(-1);
      if (!inputPath || !outputPath) {
        throw new Error("missing ffmpeg paths");
      }
      expect(path.basename(inputPath)).toBe("input.audio");
      await import("node:fs/promises").then((fs) =>
        fs.writeFile(outputPath, Buffer.from("apple-output")),
      );
    });

    await transcodeAudioBufferToapple({
      audioBuffer: Buffer.from("source"),
      inputExtension: "../bad",
    });
  });

  it("keeps temp prefixes and output names inside the preferred temp root", async () => {
    let capturedInputPath: string | undefined;
    let capturedOutputPath: string | undefined;
    runFfmpegMock.mockImplementationOnce(async (args: string[]) => {
      capturedInputPath = args[args.indexOf("-i") + 1];
      capturedOutputPath = args.at(-1);
      if (!capturedOutputPath) {
        throw new Error("missing ffmpeg output path");
      }
      expect(path.basename(capturedOutputPath)).toBe("escape.apple");
      await import("node:fs/promises").then((fs) =>
        fs.writeFile(capturedOutputPath!, Buffer.from("apple-output")),
      );
    });

    await transcodeAudioBufferToapple({
      audioBuffer: Buffer.from("source"),
      inputFileName: "voice.wav",
      outputFileName: "../escape.apple",
      tempPrefix: "../bad-prefix",
    });

    const tempRoot = resolvePreferredOpenClawTmpDir();
    expect(capturedInputPath?.startsWith(tempRoot)).toBe(true);
    expect(capturedOutputPath?.startsWith(tempRoot)).toBe(true);
  });
});
