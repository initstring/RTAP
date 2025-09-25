'use client';

import JSZip from 'jszip';
import { type RouterOutputs } from '@/trpc/react';
import { OutcomeType } from '@prisma/client';
import {
  summarizeTechniqueOutcomeMetrics,
  calculateAverageResponseMilliseconds,
  type ResponseTimingType,
} from '@/lib/outcomeMetrics';
import { captureElementToPng } from './exportImage';

// Operation type from tRPC outputs
export type Operation = RouterOutputs['operations']['getById'];

function getAverageResponseTime(operation: Operation, type: ResponseTimingType) {
  const averageMs = calculateAverageResponseMilliseconds(operation.techniques ?? [], type);
  return averageMs == null ? null : formatDuration(averageMs);
}

function formatDuration(ms: number) {
  const totalSeconds = Math.round(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(' ');
}

function techniqueToMarkdown(tech: Operation["techniques"][0]) {
  const detection = tech.outcomes.find(o => o.type === "DETECTION");
  const prevention = tech.outcomes.find(o => o.type === "PREVENTION");
  const attribution = tech.outcomes.find(o => o.type === "ATTRIBUTION");

  const lines = [
    `### ${tech.mitreTechnique?.name ?? "Custom Technique"} (${tech.mitreSubTechnique?.id ?? tech.mitreTechnique?.id ?? "CUSTOM"})`,
    tech.mitreTechnique?.tactic?.name ? `- Tactic: ${tech.mitreTechnique.tactic.name}` : undefined,
    tech.description ? `- Description: ${tech.description}` : undefined,
    tech.tools.length ? `- Tools: ${tech.tools.map(t => t.name).join(", ")}` : undefined,
    tech.startTime ? `- Execution Start: ${new Date(tech.startTime).toLocaleString()}` : undefined,
    tech.endTime ? `- Execution End: ${new Date(tech.endTime).toLocaleString()}` : undefined,
    `- Detection: ${detection?.status ?? "N/A"}`,
    detection?.tools.length ? `  - Tool: ${detection.tools.map(t => t.name).join(", ")}` : undefined,
    detection?.detectionTime ? `  - Time: ${new Date(detection.detectionTime).toLocaleString()}` : undefined,
    detection?.detectionTime && tech.startTime ? `  - Time to Detect: ${formatDuration(new Date(detection.detectionTime).getTime() - new Date(tech.startTime).getTime())}` : undefined,
    `- Prevention: ${prevention?.status ?? "N/A"}`,
    prevention?.tools.length ? `  - Tool: ${prevention.tools.map(t => t.name).join(", ")}` : undefined,
    prevention?.detectionTime ? `  - Time: ${new Date(prevention.detectionTime).toLocaleString()}` : undefined,
    prevention?.detectionTime && tech.startTime ? `  - Time to Prevent: ${formatDuration(new Date(prevention.detectionTime).getTime() - new Date(tech.startTime).getTime())}` : undefined,
    `- Attribution: ${attribution?.status ?? "N/A"}`,
    attribution?.tools.length ? `  - Tool: ${attribution.tools.map(t => t.name).join(", ")}` : undefined,
    attribution?.detectionTime ? `  - Time: ${new Date(attribution.detectionTime).toLocaleString()}` : undefined,
    attribution?.detectionTime && tech.startTime ? `  - Time to Attribute: ${formatDuration(new Date(attribution.detectionTime).getTime() - new Date(tech.startTime).getTime())}` : undefined,
  ].filter(Boolean);

  return lines.join("\n");
}

function buildMarkdown(operation: Operation) {
  const outcomeMetrics = summarizeTechniqueOutcomeMetrics(operation.techniques ?? []);
  const detectionStats = outcomeMetrics[OutcomeType.DETECTION];
  const preventionStats = outcomeMetrics[OutcomeType.PREVENTION];
  const attributionStats = outcomeMetrics[OutcomeType.ATTRIBUTION];
  const avgDetect = getAverageResponseTime(operation, OutcomeType.DETECTION);
  const avgAttrib = getAverageResponseTime(operation, OutcomeType.ATTRIBUTION);

  const totalTechniques = operation.techniques.length;
  const start = operation.startDate ? new Date(operation.startDate).toLocaleDateString() : undefined;
  const end = operation.endDate ? new Date(operation.endDate).toLocaleDateString() : undefined;

  const intro = [
    `# Operation Report: ${operation.name}`,
    "",
    `This operation was conducted${start ? ` starting on ${start}` : ""}${end ? ` and ending on ${end}` : ""}.`,
    `A total of ${totalTechniques} techniques were executed. Detection success was ${detectionStats.successRate}%, prevention success was ${preventionStats.successRate}% and attribution success was ${attributionStats.successRate}%.`,
    avgDetect ? `Average time to detect was ${avgDetect}.` : undefined,
    avgAttrib ? `Average time to attribute was ${avgAttrib}.` : undefined,
    "",
    "## Operation Overview",
    "![Operation Overview](overview.png)",
    `- Threat Actor: ${operation.threatActor?.name ?? "N/A"}`,
    `- Targets: ${operation.targets.map(target => target.isCrownJewel ? `${target.name} (CJ)` : target.name).join(', ') || "N/A"}`,
    `- Detection Success Rate: ${detectionStats.successRate}% (${detectionStats.successes}/${detectionStats.attempts})`,
    `- Prevention Success Rate: ${preventionStats.successRate}% (${preventionStats.successes}/${preventionStats.attempts})`,
    `- Attribution Success Rate: ${attributionStats.successRate}% (${attributionStats.successes}/${attributionStats.attempts})`,
    `- Avg Time to Detect: ${avgDetect ?? "N/A"}`,
    `- Avg Time to Attribute: ${avgAttrib ?? "N/A"}`,
    "",
    "## Attack Flow",
    "![Attack Flow](attack-flow.png)",
    "",
    "## Attack Timeline",
    "![Attack Timeline](attack-timeline.png)",
    "",
    "## Attack Matrix",
    "![Attack Matrix](attack-matrix.png)",
    "",
    "## Techniques",
  ].filter(Boolean);

  const techniques = operation.techniques.map(techniqueToMarkdown);
  return [...intro, ...techniques].join("\n");
}

export async function exportOperationReport({
  operation,
  overviewElement,
  attackFlowElement,
  matrixElement,
  timelineElement,
}: {
  operation: Operation;
  overviewElement: HTMLElement | null;
  attackFlowElement: HTMLElement | null;
  matrixElement: HTMLElement | null;
  timelineElement: HTMLElement | null;
}) {
  if (!attackFlowElement || !matrixElement || !overviewElement || !timelineElement) return;

  const [overviewPng, flowPng, matrixPng, timelinePng] = await Promise.all([
    captureElementToPng(overviewElement),
    captureElementToPng(attackFlowElement),
    captureElementToPng(matrixElement),
    captureElementToPng(timelineElement),
  ]);

  const markdown = buildMarkdown(operation);

  const zip = new JSZip();
  zip.file('report.md', markdown);
  const overviewData = overviewPng.split(',')[1] ?? '';
  const flowData = flowPng.split(',')[1] ?? '';
  const matrixData = matrixPng.split(',')[1] ?? '';
  const timelineData = timelinePng.split(',')[1] ?? '';
  zip.file('overview.png', overviewData, { base64: true });
  zip.file('attack-flow.png', flowData, { base64: true });
  zip.file('attack-matrix.png', matrixData, { base64: true });
  zip.file('attack-timeline.png', timelineData, { base64: true });

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `operation-${operation.id}-report.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
