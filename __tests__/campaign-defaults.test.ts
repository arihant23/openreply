import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { campaignDefaultsSchema, EMPTY_CAMPAIGN_DEFAULTS } from "../lib/campaigns/defaults";

const { db, getContext } = vi.hoisted(() => ({
  db: { instagramAccount: { findFirst: vi.fn(), updateMany: vi.fn() } },
  getContext: vi.fn(),
}));
vi.mock("@/lib/db/client", () => ({ prisma: db }));
vi.mock("@/lib/workspace-access", () => ({
  getCurrentWorkspaceContext: getContext,
  canManageWorkspace: (role: string) => role === "OWNER" || role === "ADMIN",
}));
import { GET, PUT } from "../app/api/automations/defaults/route";

function request(defaults: unknown = EMPTY_CAMPAIGN_DEFAULTS) {
  return new NextRequest("https://example.com/api/automations/defaults", {
    method: "PUT", body: JSON.stringify({ instagramAccountId: "account-1", defaults }),
    headers: { "Content-Type": "application/json" },
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  getContext.mockResolvedValue({ workspaceId: "workspace-1", role: "OWNER" });
  db.instagramAccount.findFirst.mockResolvedValue({ campaignDefaults: EMPTY_CAMPAIGN_DEFAULTS });
  db.instagramAccount.updateMany.mockResolvedValue({ count: 1 });
});

describe("campaign defaults", () => {
  it("keeps reusable follow and reply settings without post, destination or live status", () => {
    const parsed = campaignDefaultsSchema.parse({ ...EMPTY_CAMPAIGN_DEFAULTS,
      requireFollow: true, publicReplyMessages: ["Sent!", "Check your DMs"],
      postId: "old-post", trackedDestinationUrl: "https://example.com/old", isActive: true,
    });
    expect(parsed.requireFollow).toBe(true);
    expect(parsed.publicReplyMessages).toHaveLength(2);
    expect(parsed).not.toHaveProperty("postId");
    expect(parsed).not.toHaveProperty("trackedDestinationUrl");
    expect(parsed).not.toHaveProperty("isActive");
  });
  it("requires authentication before reading or writing", async () => {
    getContext.mockResolvedValue(null);
    expect((await GET(new NextRequest("https://example.com/api/automations/defaults?instagramAccountId=account-1"))).status).toBe(401);
    expect((await PUT(request())).status).toBe(401);
    expect(db.instagramAccount.findFirst).not.toHaveBeenCalled();
    expect(db.instagramAccount.updateMany).not.toHaveBeenCalled();
  });
  it("does not let a workspace member change shared defaults", async () => {
    getContext.mockResolvedValue({ workspaceId: "workspace-1", role: "MEMBER" });
    expect((await PUT(request())).status).toBe(403);
    expect(db.instagramAccount.updateMany).not.toHaveBeenCalled();
  });
  it("scopes both reads and writes to the current workspace", async () => {
    await GET(new NextRequest("https://example.com/api/automations/defaults?instagramAccountId=account-1"));
    await PUT(request());
    const where = { id: "account-1", workspaceId: "workspace-1" };
    expect(db.instagramAccount.findFirst).toHaveBeenCalledWith({ where, select: { campaignDefaults: true } });
    expect(db.instagramAccount.updateMany).toHaveBeenCalledWith({ where, data: { campaignDefaults: EMPTY_CAMPAIGN_DEFAULTS } });
  });
  it("returns not found when a foreign or deleted account cannot be updated", async () => {
    db.instagramAccount.updateMany.mockResolvedValue({ count: 0 });
    expect((await PUT(request())).status).toBe(404);
  });
  it("rejects invalid settings without persisting them", async () => {
    expect((await PUT(request({ ...EMPTY_CAMPAIGN_DEFAULTS, followPromptButtonLabel: "x".repeat(21) }))).status).toBe(400);
    expect(db.instagramAccount.updateMany).not.toHaveBeenCalled();
  });
  it("returns null for accounts without saved defaults", async () => {
    db.instagramAccount.findFirst.mockResolvedValue({ campaignDefaults: null });
    const response = await GET(new NextRequest("https://example.com/api/automations/defaults?instagramAccountId=account-1"));
    expect(await response.json()).toEqual({ success: true, data: null });
  });
});
