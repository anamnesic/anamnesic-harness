import { describe, expect, it } from "vitest";
import { resolveIrcInboundTarget } from "./monitor.js";

describe("irc monitor inbound target", () => {
  it("keeps channel target for group messages", () => {
    expect(
      resolveIrcInboundTarget({
        target: "#kairos",
        senderNick: "alice",
      }),
    ).toEqual({
      isGroup: true,
      target: "#kairos",
      rawTarget: "#kairos",
    });
  });

  it("maps DM target to sender nick and preserves raw target", () => {
    expect(
      resolveIrcInboundTarget({
        target: "kairos-bot",
        senderNick: "alice",
      }),
    ).toEqual({
      isGroup: false,
      target: "alice",
      rawTarget: "kairos-bot",
    });
  });

  it("falls back to raw target when sender nick is empty", () => {
    expect(
      resolveIrcInboundTarget({
        target: "kairos-bot",
        senderNick: " ",
      }),
    ).toEqual({
      isGroup: false,
      target: "kairos-bot",
      rawTarget: "kairos-bot",
    });
  });
});
