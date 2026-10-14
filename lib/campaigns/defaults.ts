import { z } from "zod";

// Only reusable settings: no post, campaign identity, destination URL or active status.
export const campaignDefaultsSchema = z.object({
  matchMode: z.enum(["specific", "any"]),
  keywords: z.array(z.string().trim().min(1).max(50)).max(10),
  dmTriggerEnabled: z.boolean(),
  publicReplyEnabled: z.boolean(),
  publicReplyMessages: z.array(z.string().max(1000)).max(10),
  openingDmEnabled: z.boolean(),
  openingDmMessage: z.string().max(1000),
  openingDmButtonLabel: z.string().max(64),
  dmMessage: z.string().max(1000),
  linkOpen: z.boolean(),
  linkButtonLabel: z.string().max(20),
  secondLinkOpen: z.boolean(),
  secondaryButtonLabel: z.string().max(20),
  requireFollow: z.boolean(),
  followPromptMessage: z.string().max(1000),
  followPromptButtonLabel: z.string().max(20),
  followUpEnabled: z.boolean(),
  followUpMessage: z.string().max(1000),
  followUpDelayMinutes: z.number().int().min(0).max(1440),
});

export type CampaignDefaults = z.infer<typeof campaignDefaultsSchema>;
export const EMPTY_CAMPAIGN_DEFAULTS: CampaignDefaults = {
  matchMode: "specific", keywords: [], dmTriggerEnabled: false,
  publicReplyEnabled: false, publicReplyMessages: [""],
  openingDmEnabled: false, openingDmMessage: "", openingDmButtonLabel: "",
  dmMessage: "", linkOpen: false, linkButtonLabel: "Open link",
  secondLinkOpen: false, secondaryButtonLabel: "Open link",
  requireFollow: false, followPromptMessage: "", followPromptButtonLabel: "i'm following",
  followUpEnabled: false, followUpMessage: "", followUpDelayMinutes: 0,
};
