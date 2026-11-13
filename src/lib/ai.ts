import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import * as z from 'zod';
import { dataUrlParts } from './images';
import { CATEGORIES, SEASONS, type ChatMsg, type Feedback, type Item, type StyleProfile, type Suggestion, type WearLog } from './types';

export const MODELS = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 — best taste (default)' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 — faster, about half the cost' },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5 — fastest and cheapest' },
];

let client: Anthropic | null = null;
let clientKey = '';

function getClient(apiKey: string): Anthropic {
  if (!client || clientKey !== apiKey) {
    // The key stays on this device and is sent only to Anthropic.
    client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 2 });
    clientKey = apiKey;
  }
  return client;
}

export function friendlyError(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return 'Your Claude API key was not accepted. Check it in Me → Settings.';
  if (e instanceof Anthropic.PermissionDeniedError) return 'This API key cannot use that model. Pick another model in Settings.';
  if (e instanceof Anthropic.RateLimitError) return 'Too many requests, or your API credit ran out. Check billing in the Claude Console and try again.';
  if (e instanceof Anthropic.APIConnectionError) return 'No connection. Check your internet and try again.';
  if (e instanceof Anthropic.BadRequestError) return 'The request was rejected: ' + e.message;
  if (e instanceof Anthropic.APIError) return `Claude had a problem (${e.status ?? '?'}). Try again in a moment.`;
  if (e instanceof Error) return e.message;
  return 'Something went wrong.';
}

export interface AiCtx {
  apiKey: string;
  model: string;
}

type Effort = 'low' | 'medium' | 'high';

async function ask<T extends z.ZodType>(
  ctx: AiCtx,
  system: string,
  messages: Anthropic.Beta.BetaMessageParam[],
  schema: T,
  effort: Effort = 'medium',
  maxTokens = 16000,
): Promise<z.infer<T>> {
  if (!ctx.apiKey) throw new Error('Add your Claude API key in Me → Settings to use the AI stylist.');
  // Opus and Sonnet can hand a declined request to another model server-side; Haiku has no fallback.
  const fallback = ctx.model.startsWith('claude-haiku') ? {} : { betas: ['server-side-fallback-2026-07-01' as const], fallbacks: 'default' as const };
  const res = await getClient(ctx.apiKey).beta.messages.parse({
    model: ctx.model,
    max_tokens: maxTokens,
    system,
    messages,
    output_config: { effort, format: betaZodOutputFormat(schema) },
    ...fallback,
  });
  if (res.stop_reason === 'refusal') throw new Error('Claude declined that one. Try a different photo or wording.');
  if (res.stop_reason === 'max_tokens') throw new Error('The answer was cut off. Please try again.');
  if (!res.parsed_output) throw new Error('Could not read the stylist’s answer. Please try again.');
  return res.parsed_output as z.infer<T>;
}

function imageBlock(dataUrl: string): Anthropic.Beta.BetaImageBlockParam {
  const { mediaType, data } = dataUrlParts(dataUrl);
  return { type: 'image', source: { type: 'base64', media_type: mediaType, data } };
}

// ---------- Context the stylist reads ----------

export function profileBrief(p: StyleProfile): string {
  const lines = [
    p.name && `Name: ${p.name}`,
    `Wardrobe: ${p.wardrobe}`,
    p.styles.length && `Style they like: ${p.styles.join(', ')}`,
    p.colorsLove && `Colours they love: ${p.colorsLove}`,
    p.colorsAvoid && `Colours to avoid: ${p.colorsAvoid}`,
    p.fitNotes && `Fit and body notes: ${p.fitNotes}`,
    p.lifestyle && `Lifestyle: ${p.lifestyle}`,
  ].filter(Boolean);
  return lines.join('\n');
}

export function closetCatalogue(items: Item[], wears: WearLog[]): string {
  const stats = wearStats(wears);
  return items
    .filter((i) => i.status === 'owned')
    .map((i) => {
      const s = stats[i.id];
      const bits = [
        i.id,
        i.name,
        `${i.category}${i.subcategory ? '/' + i.subcategory : ''}`,
        i.colors.join('+') || 'colour unknown',
        i.pattern && i.pattern !== 'solid' ? i.pattern : '',
        i.material,
        `formality ${i.formality}/5`,
        i.styleTags.join(', '),
        s ? `worn ${s.count}x, last ${s.last}` : 'never worn',
        i.favorite ? 'FAVOURITE' : '',
        i.inLaundry ? 'IN LAUNDRY (unavailable)' : '',
      ].filter(Boolean);
      return '- ' + bits.join(' | ');
    })
    .join('\n');
}

export function wearStats(wears: WearLog[]): Record<string, { count: number; last: string }> {
  const out: Record<string, { count: number; last: string }> = {};
  for (const w of wears) {
    for (const id of w.itemIds) {
      const s = (out[id] ??= { count: 0, last: '' });
      s.count++;
      if (w.date > s.last) s.last = w.date;
    }
  }
  return out;
}

function feedbackBrief(feedback: Feedback[], items: Item[]): string {
  const name = (id: string) => items.find((i) => i.id === id)?.name ?? '?';
  const recent = feedback.slice(-20);
  if (!recent.length) return 'No feedback yet.';
  return recent.map((f) => `${f.liked ? 'LIKED' : 'DISLIKED'}: ${f.itemIds.map(name).join(' + ')}`).join('\n');
}

const STYLIST = `You are Drape, a warm, decisive personal stylist who dresses this person from their own closet.
Rules:
- Only use clothing from the closet catalogue, referring to items by their exact id. Never invent ids.
- A complete outfit covers the body: a dress or one-piece, or a top plus a bottom; plus shoes. Add outerwear when it is cool, windy or wet, and a bag or accessory when it lifts the look.
- Never pick items marked IN LAUNDRY.
- Dress for the occasion. Match formality across pieces unless the contrast is deliberate.
- Weather and season are not factors: every piece is available every day. Never rule out jackets, coats, knits, long sleeves or trousers because of heat or season, and use layering freely.
- Respect their style profile and taste feedback. Prefer pieces they have not worn recently, and bring out neglected pieces when they fit.
- Be specific and confident, like a friend with great taste. Plain language, no markdown, no emoji.`;

// ---------- Tagging a new piece ----------

const TagSchema = z.object({
  name: z.string().describe('Short natural name, e.g. "Cream cable-knit jumper"'),
  category: z.enum(CATEGORIES),
  subcategory: z.string().describe('e.g. t-shirt, jeans, sneakers, blazer'),
  colors: z.array(z.string()).describe('Main colours, most dominant first, plain names'),
  pattern: z.string().describe('solid, striped, floral, plaid, graphic, etc.'),
  material: z.string().describe('Best guess, e.g. cotton, denim, wool, leather'),
  seasons: z.array(z.enum(SEASONS)),
  formality: z.number().int().describe('1 very casual, 2 casual, 3 smart casual, 4 business/dressy, 5 formal'),
  style_tags: z.array(z.string()).describe('2-4 style words, e.g. minimalist, streetwear, preppy, boho'),
  brand: z.string().describe('Brand if a label or logo is clearly visible, else empty'),
  is_clothing: z.boolean(),
});
export type TagResult = z.infer<typeof TagSchema>;

export async function tagItem(ctx: AiCtx, photo: string): Promise<TagResult> {
  return ask(
    ctx,
    'You catalogue clothing for a digital closet app. Describe the single main garment, shoe or accessory in the photo. If several pieces are visible, describe the most prominent one. If there is no clothing, set is_clothing to false.',
    [{ role: 'user', content: [imageBlock(photo), { type: 'text', text: 'Tag this piece.' }] }],
    TagSchema,
    'low',
    2000,
  );
}

// ---------- Outfit suggestions ----------

const OutfitSchema = z.object({
  outfits: z.array(
    z.object({
      title: z.string().describe('Short, fun name for the look'),
      item_ids: z.array(z.string()),
      why: z.string().describe('One or two sentences on why it works today'),
      styling_tip: z.string().describe('One concrete tip: tuck, roll, layer, accessorise'),
    }),
  ),
  missing: z.string().describe('If the closet lacks something needed (e.g. no shoes logged), say so briefly, else empty'),
});

export interface OutfitRequest {
  items: Item[];
  wears: WearLog[];
  feedback: Feedback[];
  profile: StyleProfile;
  occasion: string;
  date: string;
  extra?: string;
  anchorId?: string;
  avoid?: string[][];
  count?: number;
}

export async function suggestOutfits(ctx: AiCtx, r: OutfitRequest): Promise<{ outfits: Suggestion[]; missing: string }> {
  const recent = r.wears
    .filter((w) => w.date < r.date)
    .slice(-7)
    .map((w) => `${w.date}: ${w.itemIds.join(', ')}`)
    .join('\n');
  const anchor = r.anchorId ? `\nEvery outfit must include item ${r.anchorId}.` : '';
  const avoid = r.avoid?.length ? `\nDo not repeat these combinations: ${r.avoid.map((a) => a.join('+')).join('; ')}` : '';
  const content = `Date: ${r.date}
Occasion: ${r.occasion}
${r.extra ? `Extra request: ${r.extra}\n` : ''}
Style profile:
${profileBrief(r.profile)}

Taste feedback:
${feedbackBrief(r.feedback, r.items)}

Recently worn:
${recent || 'nothing logged'}

Closet:
${closetCatalogue(r.items, r.wears)}

Suggest ${r.count ?? 3} different complete outfits, best first.${anchor}${avoid}`;
  const out = await ask(ctx, STYLIST, [{ role: 'user', content }], OutfitSchema, 'medium');
  const valid = new Set(r.items.filter((i) => i.status === 'owned').map((i) => i.id));
  return {
    outfits: out.outfits
      .map((o) => ({ title: o.title, itemIds: o.item_ids.filter((id) => valid.has(id)), why: o.why, tip: o.styling_tip }))
      .filter((o) => o.itemIds.length > 0),
    missing: out.missing,
  };
}

// ---------- Week planner ----------

const WeekSchema = z.object({
  days: z.array(z.object({ date: z.string(), title: z.string(), item_ids: z.array(z.string()), note: z.string() })),
});

export async function planWeek(
  ctx: AiCtx,
  r: Omit<OutfitRequest, 'occasion' | 'date'> & { days: { date: string; occasion: string }[] },
) {
  const content = `Plan one outfit per day. Avoid repeating the same main pieces on back-to-back days, but re-wearing jeans or shoes across the week is fine.

Days:
${r.days.map((d) => `${d.date} — ${d.occasion}`).join('\n')}

Style profile:
${profileBrief(r.profile)}

Taste feedback:
${feedbackBrief(r.feedback, r.items)}

Closet:
${closetCatalogue(r.items, r.wears)}`;
  const out = await ask(ctx, STYLIST, [{ role: 'user', content }], WeekSchema, 'medium');
  const valid = new Set(r.items.map((i) => i.id));
  return out.days.map((d) => ({ ...d, item_ids: d.item_ids.filter((id) => valid.has(id)) }));
}

// ---------- Stylist chat ----------

const ChatSchema = z.object({
  reply: z.string().describe('Your answer, conversational, a few short paragraphs at most'),
  item_ids: z.array(z.string()).describe('Closet items you mention individually, to show as pictures'),
  outfits: z.array(z.object({ title: z.string(), item_ids: z.array(z.string()) })).describe('Complete outfits you propose, if any'),
});

export async function chat(ctx: AiCtx, history: ChatMsg[], items: Item[], wears: WearLog[], profile: StyleProfile) {
  const system = `${STYLIST}

You are chatting with them about style. You can propose outfits from their closet, explain what goes with what, give shopping advice for gaps, help them pack, or talk about trends. When you propose an outfit, put it in outfits. When you mention individual pieces, list their ids in item_ids.


Style profile:
${profileBrief(profile)}

Closet:
${closetCatalogue(items, wears) || '(empty so far)'}`;
  const msgs: Anthropic.Beta.BetaMessageParam[] = history.slice(-20).map((m) => {
    if (m.role === 'user' && m.image) return { role: 'user', content: [imageBlock(m.image), { type: 'text', text: m.text || 'What do you think?' }] };
    return { role: m.role, content: m.text || '…' };
  });
  const out = await ask(ctx, system, msgs, ChatSchema, 'medium');
  const valid = new Set(items.map((i) => i.id));
  return {
    reply: out.reply,
    itemIds: out.item_ids.filter((id) => valid.has(id)),
    outfits: out.outfits.map((o) => ({ title: o.title, itemIds: o.item_ids.filter((id) => valid.has(id)) })).filter((o) => o.itemIds.length),
  };
}

// ---------- Glow Up: rate and improve an outfit photo ----------

const GlowSchema = z.object({
  score: z.number().int().describe('Overall 1-10, honest but kind'),
  verdict: z.string().describe('One-sentence first impression'),
  working: z.array(z.string()).describe('What already works'),
  improve: z.array(z.string()).describe('Specific, doable improvements'),
  swaps: z.array(z.object({ item_id: z.string(), why: z.string() })).describe('Pieces from their closet that would level it up'),
  finishing_touches: z.array(z.string()).describe('Small final touches: tuck, cuff, jewellery, bag'),
});
export type GlowResult = z.infer<typeof GlowSchema>;

export async function glowUp(ctx: AiCtx, photo: string, occasion: string, items: Item[], wears: WearLog[], profile: StyleProfile) {
  const content = `Occasion: ${occasion || 'not specified'}

Style profile:
${profileBrief(profile)}

Their closet (for swaps):
${closetCatalogue(items, wears) || '(empty)'}

Rate this outfit and show how to make it better. Focus on the clothes and styling, never on the person's body.`;
  const out = await ask(ctx, STYLIST, [{ role: 'user', content: [imageBlock(photo), { type: 'text', text: content }] }], GlowSchema, 'medium');
  const valid = new Set(items.map((i) => i.id));
  return { ...out, swaps: out.swaps.filter((s) => valid.has(s.item_id)) };
}

// ---------- Outfit Finder: recreate a look from a photo ----------

const FinderSchema = z.object({
  summary: z.string().describe('The look in one sentence: vibe and key pieces'),
  pieces: z.array(
    z.object({
      description: z.string().describe('e.g. "Oversized camel wool coat"'),
      category: z.enum(CATEGORIES),
      closet_matches: z.array(z.string()).describe('Ids of their pieces that could stand in, best first; empty if none'),
      search_query: z.string().describe('A good shopping search query to find this piece'),
    }),
  ),
  how_to_recreate: z.string().describe('How to get this look with what they own, and what to buy first if anything'),
});
export type FinderResult = z.infer<typeof FinderSchema>;

export async function outfitFinder(ctx: AiCtx, photo: string, items: Item[], wears: WearLog[], profile: StyleProfile) {
  const content = `Identify each clothing piece in this inspiration photo, match it to pieces in their closet, and give a shopping search for each.

Style profile:
${profileBrief(profile)}

Their closet:
${closetCatalogue(items, wears) || '(empty)'}`;
  const out = await ask(ctx, STYLIST, [{ role: 'user', content: [imageBlock(photo), { type: 'text', text: content }] }], FinderSchema, 'medium');
  const valid = new Set(items.map((i) => i.id));
  return { ...out, pieces: out.pieces.map((p) => ({ ...p, closet_matches: p.closet_matches.filter((id) => valid.has(id)) })) };
}

// ---------- Packing ----------

const PackSchema = z.object({
  item_ids: z.array(z.string()).describe('Every closet piece to pack'),
  outfits: z.array(z.object({ day: z.string(), title: z.string(), item_ids: z.array(z.string()) })),
  extras: z.array(z.string()).describe('Things to pack that are not in the closet: toiletries, chargers, documents, etc.'),
  tips: z.string(),
});
export type PackResult = z.infer<typeof PackSchema>;

export async function packTrip(ctx: AiCtx, trip: string, weather: string, items: Item[], wears: WearLog[], profile: StyleProfile) {
  const content = `Trip: ${trip}
Weather at the destination: ${weather || 'unknown, plan for typical weather there'}

For packing only, do dress for the destination's weather.
Pack a capsule: the fewest pieces that mix into an outfit for every day and plan. List the outfits day by day.

Style profile:
${profileBrief(profile)}

Closet:
${closetCatalogue(items, wears)}`;
  const out = await ask(ctx, STYLIST, [{ role: 'user', content }], PackSchema, 'medium');
  const valid = new Set(items.map((i) => i.id));
  return {
    ...out,
    item_ids: out.item_ids.filter((id) => valid.has(id)),
    outfits: out.outfits.map((o) => ({ ...o, item_ids: o.item_ids.filter((id) => valid.has(id)) })),
  };
}

// ---------- Closet audit ----------

const AuditSchema = z.object({
  overview: z.string().describe('Two or three sentences on the closet: its style, strengths and balance'),
  gaps: z.array(z.object({ piece: z.string(), why: z.string(), search_query: z.string() })).describe('Up to 5 versatile pieces that would unlock the most new outfits'),
  declutter: z.array(z.object({ item_id: z.string(), why: z.string() })).describe('Pieces worth donating or selling, if any'),
  underused: z.array(z.object({ item_id: z.string(), idea: z.string() })).describe('Neglected pieces and a way to wear each'),
});
export type AuditResult = z.infer<typeof AuditSchema>;

export async function auditCloset(ctx: AiCtx, items: Item[], wears: WearLog[], profile: StyleProfile) {
  const content = `Audit this closet.

Style profile:
${profileBrief(profile)}

Closet:
${closetCatalogue(items, wears)}`;
  const out = await ask(ctx, STYLIST, [{ role: 'user', content }], AuditSchema, 'medium');
  const valid = new Set(items.map((i) => i.id));
  return {
    ...out,
    declutter: out.declutter.filter((d) => valid.has(d.item_id)),
    underused: out.underused.filter((d) => valid.has(d.item_id)),
  };
}

export async function testKey(ctx: AiCtx): Promise<void> {
  await getClient(ctx.apiKey).messages.create({
    model: ctx.model,
    max_tokens: 16,
    output_config: { effort: 'low' },
    messages: [{ role: 'user', content: 'Say "ready".' }],
  });
}
