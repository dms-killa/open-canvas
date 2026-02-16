import type { GraphContext } from "./graphrag-types.js";

/**
 * Format a GraphContext into prompt-friendly XML-tagged sections.
 * Returns empty string if context is null or empty.
 */
export function formatGraphContextForPrompt(
  ctx: GraphContext | null
): string {
  if (!ctx) return "";

  const sections: string[] = [];

  if (ctx.styleRules.length > 0) {
    sections.push("<graph-style-rules>");
    for (const rule of ctx.styleRules) {
      const parts = [`- [${rule.scope}] ${rule.rule}`];
      if (rule.confidence != null) {
        parts.push(`(confidence: ${rule.confidence})`);
      }
      if (rule.contradicts && rule.contradicts.length > 0) {
        parts.push(`(contradicts ${rule.contradicts.length} other rule(s))`);
      }
      sections.push(parts.join(" "));
    }
    sections.push("</graph-style-rules>");
  }

  if (ctx.entities.length > 0) {
    sections.push("<graph-entities>");
    for (const entity of ctx.entities) {
      const name =
        (entity.properties.name as string) || entity.id;
      sections.push(`- ${entity.label}: ${name}`);
    }
    sections.push("</graph-entities>");
  }

  if (ctx.relations.length > 0) {
    sections.push("<graph-relations>");
    for (const rel of ctx.relations) {
      sections.push(`- (${rel.source})-[:${rel.type}]->(${rel.target})`);
    }
    sections.push("</graph-relations>");
  }

  return sections.join("\n");
}
