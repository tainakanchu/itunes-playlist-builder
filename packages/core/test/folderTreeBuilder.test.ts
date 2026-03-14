import { describe, it, expect } from "vitest";
import { buildFolderTree, countNodes } from "../src/folderTreeBuilder.js";
import type { GeneratedPlaylist } from "../src/models.js";

describe("folderTreeBuilder", () => {
  it("builds a flat structure", () => {
    const playlists: GeneratedPlaylist[] = [
      {
        name: "PlaylistA",
        path: "PlaylistA",
        fullPath: "_Gen/PlaylistA",
        trackIds: [1, 2],
        ruleKey: "PlaylistA",
      },
    ];

    const tree = buildFolderTree("_Gen", playlists);
    expect(tree.name).toBe("_Gen");
    expect(tree.children).toHaveLength(1);
    expect(tree.children[0].type).toBe("playlist");
    expect(tree.children[0].name).toBe("PlaylistA");
  });

  it("builds nested folder structure", () => {
    const playlists: GeneratedPlaylist[] = [
      {
        name: "4stars+",
        path: "Base/Favorites/4stars+",
        fullPath: "_Gen/Base/Favorites/4stars+",
        trackIds: [1, 2, 3],
        ruleKey: "Base/Favorites/4stars+",
      },
      {
        name: "All",
        path: "Genre/House/All",
        fullPath: "_Gen/Genre/House/All",
        trackIds: [1, 2],
        ruleKey: "Genre/House/All",
      },
    ];

    const tree = buildFolderTree("_Gen", playlists);
    expect(tree.children).toHaveLength(2); // Base, Genre

    const base = tree.children.find(
      (c) => c.type === "folder" && c.name === "Base"
    );
    expect(base).toBeDefined();
    expect(base!.type).toBe("folder");

    if (base!.type === "folder") {
      expect(base!.children).toHaveLength(1); // Favorites
      const favorites = base!.children[0];
      expect(favorites.type).toBe("folder");
      expect(favorites.name).toBe("Favorites");
    }
  });

  it("counts nodes correctly", () => {
    const playlists: GeneratedPlaylist[] = [
      {
        name: "4stars+",
        path: "Base/Favorites/4stars+",
        fullPath: "_Gen/Base/Favorites/4stars+",
        trackIds: [1, 2, 3],
        ruleKey: "Base/Favorites/4stars+",
      },
      {
        name: "All",
        path: "Genre/House/All",
        fullPath: "_Gen/Genre/House/All",
        trackIds: [1],
        ruleKey: "Genre/House/All",
      },
    ];

    const tree = buildFolderTree("_Gen", playlists);
    const counts = countNodes(tree);
    // Folders: Base, Favorites, Genre, House (4 non-root)
    expect(counts.folderCount).toBe(4);
    expect(counts.playlistCount).toBe(2);
  });
});
