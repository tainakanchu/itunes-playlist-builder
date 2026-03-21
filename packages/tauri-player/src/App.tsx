import { useEffect, useCallback, useRef } from "react";
import { Sidebar } from "./components/Sidebar";
import { SearchBar } from "./components/SearchBar";
import { TrackTable } from "./components/TrackTable";
import { PlayerBar } from "./components/PlayerBar";
import { useStore } from "./store/useStore";
import * as api from "./invoke";
import {
  generateMockTracks,
  generateMockPlaylists,
  mockPlaybackState,
} from "./mockData";

// Detect if running inside Tauri
const isTauri = "__TAURI_INTERNALS__" in window;

export default function App() {
  const {
    viewMode,
    selectedPlaylistId,
    searchQuery,
    setTracks,
    appendTracks,
    setPlaylists,
    setIsLoading,
    setHasMore,
    setPlayback,
    tracks,
    playback,
  } = useStore();

  const PAGE_SIZE = 200;
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const allMockTracks = useRef(generateMockTracks(200));

  const loadTracks = useCallback(
    async (reset = true) => {
      setIsLoading(true);
      try {
        if (!isTauri) {
          // Mock mode
          let filtered = allMockTracks.current;
          if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(
              (t) =>
                t.name?.toLowerCase().includes(q) ||
                t.artist?.toLowerCase().includes(q) ||
                t.album?.toLowerCase().includes(q) ||
                t.genre?.toLowerCase().includes(q),
            );
          }
          setTracks(filtered);
          setHasMore(false);
          setIsLoading(false);
          return;
        }

        const offset = reset ? 0 : tracks.length;
        let result;

        if (viewMode === "recent") {
          result = await api.getRecentTracks(100);
          setTracks(result);
          setHasMore(false);
        } else if (searchQuery) {
          result = await api.searchTracks(searchQuery, PAGE_SIZE, offset);
          if (reset) setTracks(result);
          else appendTracks(result);
          setHasMore(result.length === PAGE_SIZE);
        } else if (viewMode === "playlist" && selectedPlaylistId !== null) {
          result = await api.getPlaylistTracks(
            selectedPlaylistId,
            PAGE_SIZE,
            offset,
          );
          if (reset) setTracks(result);
          else appendTracks(result);
          setHasMore(result.length === PAGE_SIZE);
        } else {
          result = await api.getTracks(PAGE_SIZE, offset);
          if (reset) setTracks(result);
          else appendTracks(result);
          setHasMore(result.length === PAGE_SIZE);
        }
      } catch (err) {
        console.error("Failed to load tracks:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [viewMode, selectedPlaylistId, searchQuery, tracks.length],
  );

  // Load tracks on view/filter change
  useEffect(() => {
    loadTracks(true);
  }, [viewMode, selectedPlaylistId, searchQuery]);

  // Load playlists on mount
  useEffect(() => {
    if (!isTauri) {
      setPlaylists(generateMockPlaylists());
      setPlayback(mockPlaybackState);
      return;
    }
    api.getPlaylists().then(setPlaylists).catch(console.error);
  }, []);

  // Poll playback state (Tauri only)
  useEffect(() => {
    if (!isTauri) return;

    pollRef.current = setInterval(async () => {
      try {
        const state = await api.getPlaybackState();
        setPlayback(state);
      } catch {
        // ignore polling errors
      }
    }, 250);

    return () => clearInterval(pollRef.current);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      if (e.key === "/" && !isInput) {
        e.preventDefault();
        document.getElementById("search-input")?.focus();
      }
      if (e.key === "Escape" && isInput) {
        (target as HTMLInputElement).blur();
      }
      if (e.key === " " && !isInput) {
        e.preventDefault();
        if (isTauri) {
          if (playback.isPlaying) {
            api.pause();
          } else if (playback.currentTrackId !== null) {
            api.resume();
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [playback.isPlaying, playback.currentTrackId]);

  const handleLoadMore = useCallback(() => {
    loadTracks(false);
  }, [loadTracks]);

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <SearchBar />
        <TrackTable onLoadMore={handleLoadMore} />
      </div>
      <PlayerBar />
    </div>
  );
}
