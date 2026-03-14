import plist from "plist";
import { writeFileSync } from "node:fs";
import type { FolderNode, PlaylistNode, GeneratedPlaylist } from "./models.js";
import { XmlWriteError } from "./errors.js";

type PlistPlaylistEntry = {
  "Playlist ID": number;
  "Playlist Persistent ID": string;
  "Parent Persistent ID"?: string;
  "All Items": boolean;
  Folder?: boolean;
  Name: string;
  "Playlist Items"?: Array<{ "Track ID": number }>;
};

function generatePersistentId(): string {
  const chars = "0123456789ABCDEF";
  let result = "";
  for (let i = 0; i < 16; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function findMaxPlaylistId(playlists: Array<Record<string, unknown>>): number {
  let max = 0;
  for (const pl of playlists) {
    const id = pl["Playlist ID"] as number;
    if (id > max) max = id;
  }
  return max;
}

export function mergeGeneratedPlaylists(
  rawPlist: Record<string, unknown>,
  namespace: string,
  tree: FolderNode,
  generatedPlaylists: GeneratedPlaylist[],
  removeExisting: boolean,
): Record<string, unknown> {
  const result = { ...rawPlist };
  let playlists = [...(result["Playlists"] as Array<Record<string, unknown>>)];

  // Remove existing namespace subtree if configured
  if (removeExisting) {
    playlists = removeNamespaceSubtree(playlists, namespace);
  }

  let nextId = findMaxPlaylistId(playlists) + 1;
  const persistentIdMap = new Map<string, string>();

  // Assign IDs and persistent IDs
  const entries: PlistPlaylistEntry[] = [];

  function walkTree(node: FolderNode | PlaylistNode, parentPersistentId?: string): void {
    const playlistId = nextId++;
    const persistentId = generatePersistentId();
    persistentIdMap.set(node.fullPath, persistentId);

    if (node.type === "folder") {
      const entry: PlistPlaylistEntry = {
        "Playlist ID": playlistId,
        "Playlist Persistent ID": persistentId,
        "All Items": true,
        Folder: true,
        Name: node.name,
      };

      if (parentPersistentId) {
        entry["Parent Persistent ID"] = parentPersistentId;
      }

      entries.push(entry);

      for (const child of node.children) {
        walkTree(child, persistentId);
      }
    } else {
      const entry: PlistPlaylistEntry = {
        "Playlist ID": playlistId,
        "Playlist Persistent ID": persistentId,
        "All Items": true,
        Name: node.name,
        "Playlist Items": node.trackIds.map((id) => ({ "Track ID": id })),
      };

      if (parentPersistentId) {
        entry["Parent Persistent ID"] = parentPersistentId;
      }

      entries.push(entry);
    }
  }

  walkTree(tree);

  playlists.push(...(entries as unknown as Array<Record<string, unknown>>));
  result["Playlists"] = playlists;

  return result;
}

function removeNamespaceSubtree(
  playlists: Array<Record<string, unknown>>,
  namespace: string,
): Array<Record<string, unknown>> {
  // Find the namespace root folder
  const namespaceFolderIndex = playlists.findIndex(
    (pl) => pl["Name"] === namespace && pl["Folder"] === true && !pl["Parent Persistent ID"],
  );

  if (namespaceFolderIndex === -1) return playlists;

  const namespaceFolder = playlists[namespaceFolderIndex];
  const namespacePersistentId = namespaceFolder["Playlist Persistent ID"] as string;

  // Collect all persistent IDs in the subtree
  const subtreeIds = new Set<string>([namespacePersistentId]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const pl of playlists) {
      const parentId = pl["Parent Persistent ID"] as string | undefined;
      const plId = pl["Playlist Persistent ID"] as string;
      if (parentId && subtreeIds.has(parentId) && !subtreeIds.has(plId)) {
        subtreeIds.add(plId);
        changed = true;
      }
    }
  }

  return playlists.filter((pl) => !subtreeIds.has(pl["Playlist Persistent ID"] as string));
}

export function buildPlistXml(plistObj: Record<string, unknown>): string {
  try {
    return plist.build(plistObj as plist.PlistValue);
  } catch (e) {
    throw new XmlWriteError(
      `Failed to build plist XML: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

export function writePlistFile(filePath: string, plistObj: Record<string, unknown>): void {
  const xml = buildPlistXml(plistObj);
  try {
    writeFileSync(filePath, xml, "utf-8");
  } catch (e) {
    throw new XmlWriteError(
      `Failed to write file "${filePath}": ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}
