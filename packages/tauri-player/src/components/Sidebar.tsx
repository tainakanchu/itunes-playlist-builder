import { useCallback, useState } from "react";
import { useStore } from "../store/useStore";
import * as api from "../invoke";
import type { Playlist } from "../types";
import { open } from "@tauri-apps/plugin-dialog";

export function Sidebar() {
  const {
    viewMode,
    playlists,
    selectedPlaylistId,
    setViewMode,
    setSelectedPlaylistId,
    setPlaylists,
    setSearchQuery,
  } = useStore();
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState("");

  const handleImport = useCallback(async () => {
    const path = await open({
      filters: [{ name: "iTunes Library XML", extensions: ["xml"] }],
    });
    if (!path) return;

    setImporting(true);
    setImportStatus("Importing...");
    try {
      const result = await api.importLibrary(path);
      setImportStatus(
        `${result.trackCount} tracks, ${result.playlistCount} playlists` +
          (result.missingFiles > 0
            ? ` (${result.missingFiles} missing files)`
            : ""),
      );
      // Reload playlists
      const pls = await api.getPlaylists();
      setPlaylists(pls);
      setViewMode("library");
      setSearchQuery("");
    } catch (err) {
      setImportStatus(`Error: ${err}`);
    } finally {
      setImporting(false);
    }
  }, []);

  const handleLibraryClick = useCallback(() => {
    setViewMode("library");
    setSelectedPlaylistId(null);
    setSearchQuery("");
  }, []);

  const handleRecentClick = useCallback(() => {
    setViewMode("recent");
    setSelectedPlaylistId(null);
    setSearchQuery("");
  }, []);

  const handlePlaylistClick = useCallback((pl: Playlist) => {
    if (pl.isFolder) return;
    setViewMode("playlist");
    setSelectedPlaylistId(pl.playlistId);
    setSearchQuery("");
  }, []);

  // Build tree from flat list
  const rootPlaylists = playlists.filter((p) => !p.parentPersistentId);
  const childrenOf = (parentId: string | null) =>
    playlists.filter((p) => p.parentPersistentId === parentId);

  const renderPlaylist = (pl: Playlist, depth: number): React.ReactNode => {
    const children = childrenOf(pl.persistentId);
    const isActive =
      viewMode === "playlist" && selectedPlaylistId === pl.playlistId;

    return (
      <div key={pl.id}>
        <div
          className={`sidebar-item ${isActive ? "active" : ""} ${pl.isFolder ? "folder" : ""}`}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          onClick={() => handlePlaylistClick(pl)}
        >
          <span className="sidebar-icon">{pl.isFolder ? "📁" : "🎵"}</span>
          <span className="sidebar-label">{pl.name}</span>
          {!pl.isFolder && (
            <span className="sidebar-count">{pl.trackCount}</span>
          )}
        </div>
        {children.map((c) => renderPlaylist(c, depth + 1))}
      </div>
    );
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <button
          className="import-btn"
          onClick={handleImport}
          disabled={importing}
        >
          {importing ? "Importing..." : "Import Library XML"}
        </button>
        {importStatus && <div className="import-status">{importStatus}</div>}
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">Library</div>
        <div
          className={`sidebar-item ${viewMode === "library" ? "active" : ""}`}
          onClick={handleLibraryClick}
        >
          <span className="sidebar-icon">🎶</span>
          <span className="sidebar-label">All Tracks</span>
        </div>
        <div
          className={`sidebar-item ${viewMode === "recent" ? "active" : ""}`}
          onClick={handleRecentClick}
        >
          <span className="sidebar-icon">🕐</span>
          <span className="sidebar-label">Recently Played</span>
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">Playlists</div>
        <div className="sidebar-playlists">
          {rootPlaylists.map((pl) => renderPlaylist(pl, 0))}
        </div>
      </div>
    </div>
  );
}
