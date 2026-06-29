import { useEffect, useRef } from "react";
import { sankey, sankeyLinkHorizontal } from "d3-sankey";
import { select } from "d3";
import { palette } from "../lib/colors";
import { buildSankeyData } from "../lib/interview";
import type { MemoryNode } from "../types";

type SankeyDiagramProps = {
  nodes: MemoryNode[];
};

type LayoutNode = {
  id: string;
  name: string;
  status: MemoryNode["status"];
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
};

type LayoutLink = {
  source: LayoutNode;
  target: LayoutNode;
  value: number;
  width?: number;
  y0?: number;
  y1?: number;
};

function statusColor(status: MemoryNode["status"]) {
  if (status === "answered") {
    return palette.dustyBlue;
  }
  if (status === "processing") {
    return palette.paleBlue;
  }
  return palette.sand;
}

export function SankeyDiagram({ nodes }: SankeyDiagramProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) {
      return;
    }

    const width = 640;
    const height = Math.max(220, nodes.length * 36);
    const { nodes: graphNodes, links } = buildSankeyData(nodes);

    const layoutNodes: LayoutNode[] = [
      { id: "__start__", name: "Start", status: "answered" },
      ...graphNodes.map((node) => ({ ...node }))
    ];

    const layoutLinks: Array<{ source: number; target: number; value: number }> = [
      ...links,
      ...graphNodes
        .map((node, index) => {
          const parentExists = links.some((link) => link.target === index);
          if (parentExists) {
            return null;
          }
          return { source: 0, target: index + 1, value: 1 };
        })
        .filter((link): link is { source: number; target: number; value: number } => link !== null)
    ].map((link) => ({
      source: link.source,
      target: link.target,
      value: link.value
    }));

    const sankeyLayout = sankey<LayoutNode, LayoutLink>()
      .nodeWidth(14)
      .nodePadding(12)
      .extent([
        [12, 12],
        [width - 12, height - 12]
      ]);

    const graph = sankeyLayout({
      nodes: layoutNodes.map((node) => ({ ...node })),
      links: layoutLinks as unknown as LayoutLink[]
    });

    const svg = select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    svg
      .append("g")
      .attr("fill", "none")
      .attr("stroke-opacity", 0.35)
      .selectAll("path")
      .data(graph.links)
      .join("path")
      .attr("d", sankeyLinkHorizontal())
      .attr("stroke", palette.dustyBlue)
      .attr("stroke-width", (link) => Math.max(1, link.width ?? 1));

    svg
      .append("g")
      .selectAll("rect")
      .data(graph.nodes)
      .join("rect")
      .attr("x", (node) => node.x0 ?? 0)
      .attr("y", (node) => node.y0 ?? 0)
      .attr("height", (node) => Math.max(1, (node.y1 ?? 0) - (node.y0 ?? 0)))
      .attr("width", (node) => (node.x1 ?? 0) - (node.x0 ?? 0))
      .attr("fill", (node) => statusColor(node.status))
      .attr("rx", 3);

    svg
      .append("g")
      .selectAll("text")
      .data(graph.nodes.filter((node) => node.id !== "__start__"))
      .join("text")
      .attr("x", (node) => (node.x1 ?? 0) + 6)
      .attr("y", (node) => ((node.y0 ?? 0) + (node.y1 ?? 0)) / 2)
      .attr("dy", "0.35em")
      .attr("font-size", 12)
      .attr("fill", "#5a6570")
      .text((node) => node.name);
  }, [nodes]);

  if (nodes.length === 0) {
    return null;
  }

  return (
    <div className="form-card p-4">
      <h2 className="mb-3 text-base font-normal text-ink">Question progression</h2>
      <p className="mb-4 text-sm text-ink-muted">
        Each branch shows how OpenAI guided follow-up questions from earlier answers.
      </p>
      <svg ref={svgRef} className="h-auto w-full" role="img" aria-label="Question tree Sankey diagram" />
    </div>
  );
}
