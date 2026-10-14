import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { campaignDefaultsSchema } from "@/lib/campaigns/defaults";
import { canManageWorkspace, getCurrentWorkspaceContext } from "@/lib/workspace-access";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const context = await getCurrentWorkspaceContext();
  if (!context) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const id = request.nextUrl.searchParams.get("instagramAccountId");
  if (!id) {
    return NextResponse.json({ success: false, error: "Choose an Instagram account" }, { status: 400 });
  }
  const account = await prisma.instagramAccount.findFirst({
    where: { id, workspaceId: context.workspaceId },
    select: { campaignDefaults: true },
  });
  if (!account) {
    return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });
  }
  const parsed = campaignDefaultsSchema.safeParse(account.campaignDefaults);
  return NextResponse.json({ success: true, data: parsed.success ? parsed.data : null });
}

const saveSchema = z.object({
  instagramAccountId: z.string().min(1),
  defaults: campaignDefaultsSchema,
});

export async function PUT(request: NextRequest) {
  const context = await getCurrentWorkspaceContext();
  if (!context) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageWorkspace(context.role)) {
    return NextResponse.json({ success: false, error: "Only owners and admins can save campaign defaults" }, { status: 403 });
  }
  const parsed = saveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Check the message lengths, button labels and keywords before saving defaults.", details: parsed.error.flatten() }, { status: 400 });
  }
  const result = await prisma.instagramAccount.updateMany({
    where: { id: parsed.data.instagramAccountId, workspaceId: context.workspaceId },
    data: { campaignDefaults: parsed.data.defaults },
  });
  if (!result.count) {
    return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
