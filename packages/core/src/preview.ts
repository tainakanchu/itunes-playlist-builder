import type { FolderNode, PlaylistNode, PreviewResult } from "./models.js";

function renderTreeLines(
  node: FolderNode | PlaylistNode,
  prefix: string,
  isLast: boolean,
  isRoot: boolean
): string[] {
  const lines: string[] = [];

  if (isRoot) {
    lines.push(node.name);
  } else {
    const connector = isLast ? "\u2514 " : "\u251C ";
    if (node.type === "playlist") {
      lines.push(`${prefix}${connector}${node.name} (${node.trackIds.length})`);
    } else {
      lines.push(`${prefix}${connector}${node.name}`);
    }
  }

  if (node.type === "folder") {
    const childPrefix = isRoot ? " " : prefix + (isLast ? "   " : "\u2502  ");
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const childIsLast = i === node.children.length - 1;
      lines.push(...renderTreeLines(child, childPrefix, childIsLast, false));
    }
  }

  return lines;
}

export function renderTree(tree: FolderNode): string {
  return renderTreeLines(tree, "", false, true).join("\n");
}

export function renderPreview(result: PreviewResult): string {
  const lines: string[] = [];

  lines.push(renderTree(result.tree));
  lines.push("");
  lines.push("Summary:");
  lines.push(`  generated playlists: ${result.playlistCount}`);
  lines.push(`  generated folders: ${result.folderCount}`);

  // Count unique referenced tracks
  const trackIdSet = new Set<number>();
  function collectTrackIds(node: FolderNode | PlaylistNode): void {
    if (node.type === "playlist") {
      for (const id of node.trackIds) {
        trackIdSet.add(id);
      }
    } else {
      for (const child of node.children) {
        collectTrackIds(child);
      }
    }
  }
  collectTrackIds(result.tree);
  lines.push(`  referenced tracks: ${trackIdSet.size}`);

  return lines.join("\n");
}

export function renderPreviewJson(result: PreviewResult): string {
  return JSON.stringify(
    {
      tree: result.tree,
      playlistCount: result.playlistCount,
      folderCount: result.folderCount,
    },
    null,
    2
  );
}
