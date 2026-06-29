export const palette = {
  edge: "#3182bd",
  body: "#6baed6",
  pending: "#c6dbef",
  processing: "#6baed6",
  ink: "#1a365d",
  inkMuted: "#486581"
} as const;

export const branchColors = ["#3f6f9c", "#4f8c6a", "#c08a2e", "#bb6240", "#8e5670"] as const;

export function branchColor(sequenceOrder: number) {
  return branchColors[(sequenceOrder - 1) % branchColors.length];
}
