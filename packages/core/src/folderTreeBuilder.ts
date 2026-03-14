import type { FolderNode, PlaylistNode, GeneratedPlaylist } from "./models.js";

export function buildFolderTree(
  namespace: string,
  playlists: GeneratedPlaylist[]
): FolderNode {
  const root: FolderNode = {
    type: "folder",
    name: namespace,
    fullPath: namespace,
    children: [],
  };

  // Map of full folder path -> FolderNode
  const folderMap = new Map<string, FolderNode>();
  folderMap.set(namespace, root);

  function ensureFolder(fullPath: string): FolderNode {
    const existing = folderMap.get(fullPath);
    if (existing) return existing;

    const parts = fullPath.split("/");
    const name = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join("/");

    const parent = ensureFolder(parentPath);

    const folder: FolderNode = {
      type: "folder",
      name,
      fullPath,
      parentPath,
      children: [],
    };

    folderMap.set(fullPath, folder);
    parent.children.push(folder);

    return folder;
  }

  for (const pl of playlists) {
    const playlistFullPath = `${namespace}/${pl.path}`;
    const parts = playlistFullPath.split("/");
    const playlistName = parts[parts.length - 1];
    const parentFullPath = parts.slice(0, -1).join("/");

    const parentFolder = ensureFolder(parentFullPath);

    const node: PlaylistNode = {
      type: "playlist",
      name: playlistName,
      fullPath: playlistFullPath,
      parentPath: parentFullPath,
      trackIds: pl.trackIds,
    };

    parentFolder.children.push(node);
  }

  return root;
}

export function countNodes(node: FolderNode): {
  folderCount: number;
  playlistCount: number;
} {
  let folderCount = 0;
  let playlistCount = 0;

  function walk(n: FolderNode | PlaylistNode): void {
    if (n.type === "folder") {
      folderCount++;
      for (const child of n.children) {
        walk(child);
      }
    } else {
      playlistCount++;
    }
  }

  walk(node);
  // Don't count root namespace folder
  return { folderCount: folderCount - 1, playlistCount };
}
