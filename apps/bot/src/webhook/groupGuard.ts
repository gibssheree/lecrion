// apps/bot/src/webhook/groupGuard.ts

export interface GroupConfig {
  groupReplyOnlyWhenTagged: boolean;
  groupAllowPrefixCommand: boolean;
  groupAllowReplyFollowUp: boolean;
  groupCommandPrefix: string;
  groupTagAliases: string[];
  groupTagKeywords: string[];
}

export function extractDigits(value: string): string {
  return String(value ?? "").replace(/\D/g, "");
}

function extractMentionsFromPayload(
  body: Record<string, any>,
  userMessage: string,
): Set<string> {
  const raw: string[] = [];
  ["mentions", "mention", "mentioned", "tags", "tag"].forEach((f) => {
    const v = body[f];
    if (!v) return;
    if (Array.isArray(v)) raw.push(...v);
    else raw.push(v);
  });
  const mentionRe = /@([0-9]{6,20})/g;
  let m: RegExpExecArray | null;
  while ((m = mentionRe.exec(String(userMessage ?? ""))) !== null)
    raw.push(m[1]);
  return new Set(
    raw
      .flatMap((item) => String(item).split(/[,\s]+/g))
      .map(extractDigits)
      .filter(Boolean),
  );
}

function isReplyFollowUpToBot(
  body: Record<string, any>,
  userMessage: string,
  cfg: GroupConfig,
): boolean {
  if (!body.isgroup || !cfg.groupAllowReplyFollowUp) return false;
  const botNumber = extractDigits(body.device ?? "");
  const aliasSet = new Set(
    [botNumber, ...cfg.groupTagAliases].map(extractDigits).filter(Boolean),
  );
  const keywordSet = new Set(
    cfg.groupTagKeywords.map((k) => k.toLowerCase().trim()).filter(Boolean),
  );

  const refFields = [
    "reply",
    "reply_to",
    "replyTo",
    "reply_message",
    "replyMessage",
    "quoted",
    "quoted_message",
    "quotedMessage",
    "quoted_text",
    "quotedText",
    "quoted_from",
    "quotedFrom",
    "quoted_sender",
    "quotedSender",
    "context",
    "metadata",
  ];
  const chunks: string[] = [];
  refFields.forEach((f) => {
    const v = body[f];
    if (v == null) return;
    chunks.push(typeof v === "string" ? v : JSON.stringify(v));
  });
  const joined = chunks.join(" ").toLowerCase();
  const refDigits = new Set(
    joined
      .split(/[^0-9]+/g)
      .map((i) => i.trim())
      .filter((i) => i.length >= 6),
  );

  for (const alias of aliasSet) {
    if (refDigits.has(alias) || joined.includes(alias)) return true;
  }
  for (const kw of keywordSet) {
    if (joined.includes(kw)) return true;
  }

  const explicitReply = [
    body.isreply,
    body.is_reply,
    body.hasQuotedMsg,
    body.has_quoted_msg,
  ].some((f) => f === true || String(f).toLowerCase() === "true");
  return (
    explicitReply &&
    (chunks.length > 0 || String(userMessage ?? "").trim().length > 0)
  );
}

export function isPrefixTriggeredGroupMessage(
  isGroup: boolean,
  userMessage: string,
  cfg: GroupConfig,
): boolean {
  if (!isGroup || !cfg.groupAllowPrefixCommand) return false;
  return String(userMessage ?? "")
    .trim()
    .startsWith(cfg.groupCommandPrefix);
}

export function shouldProcessGroupMessage(
  body: Record<string, any>,
  userMessage: string,
  cfg: GroupConfig,
): boolean {
  if (!body.isgroup) return true;
  if (!cfg.groupReplyOnlyWhenTagged) return true;
  if (
    cfg.groupAllowPrefixCommand &&
    String(userMessage ?? "")
      .trim()
      .startsWith(cfg.groupCommandPrefix)
  )
    return true;
  if (isReplyFollowUpToBot(body, userMessage, cfg)) return true;

  const botNumber = extractDigits(body.device ?? "");
  const mentions = extractMentionsFromPayload(body, userMessage);
  const lowered = String(userMessage ?? "").toLowerCase();
  const aliasSet = new Set(
    [botNumber, ...cfg.groupTagAliases].map(extractDigits).filter(Boolean),
  );
  if (!aliasSet.size) return false;

  for (const alias of aliasSet) {
    if (mentions.has(alias)) return true;
  }
  for (const kw of cfg.groupTagKeywords.map((k) => k.toLowerCase().trim())) {
    if (lowered.includes(`@${kw}`) || lowered.includes(kw)) return true;
  }
  return false;
}

export function getUserWaIdentity(body: Record<string, any>): string {
  const raw = body.isgroup
    ? (body.member ?? body.memberlid ?? "")
    : (body.sender ?? "");
  return extractDigits(String(raw));
}
