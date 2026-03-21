import { useCallback, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useStore } from "../store/useStore";
import * as api from "../invoke";
import type { Track } from "../types";

function formatTime(ms: number | null): string {
  if (!ms) return "";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function formatRating(rating: number | null): string {
  if (!rating) return "";
  const stars = Math.round(rating / 20);
  return "★".repeat(stars) + "☆".repeat(5 - stars);
}

interface TrackTableProps {
  onLoadMore: () => void;
}

export function TrackTable({ onLoadMore }: TrackTableProps) {
  const { tracks, isLoading, hasMore, playback } = useStore();
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 20,
  });

  const handleScroll = useCallback(() => {
    const el = parentRef.current;
    if (!el || isLoading || !hasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
      onLoadMore();
    }
  }, [isLoading, hasMore, onLoadMore]);

  const handleDoubleClick = useCallback(async (track: Track) => {
    if (!track.fileExists) return;
    try {
      await api.playTrack(track.trackId);
    } catch (err) {
      console.error("Failed to play:", err);
    }
  }, []);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, track: Track) => {
      e.preventDefault();
      // Simple context: queue track
      if (track.fileExists) {
        api.playQueueNext(track.trackId);
      }
    },
    [],
  );

  const items = rowVirtualizer.getVirtualItems();

  return (
    <div className="track-table-container" ref={parentRef} onScroll={handleScroll}>
      <div className="track-table-header">
        <div className="col col-name">Track</div>
        <div className="col col-artist">Artist</div>
        <div className="col col-album">Album</div>
        <div className="col col-genre">Genre</div>
        <div className="col col-rating">Rating</div>
        <div className="col col-plays">Plays</div>
        <div className="col col-time">Time</div>
        <div className="col col-bpm">BPM</div>
      </div>
      <div
        className="track-table-body"
        style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}
      >
        {items.map((virtualRow) => {
          const track = tracks[virtualRow.index];
          const isCurrent = playback.currentTrackId === track.trackId;
          return (
            <div
              key={track.id}
              className={`track-row ${isCurrent ? "playing" : ""} ${!track.fileExists ? "missing" : ""}`}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              onDoubleClick={() => handleDoubleClick(track)}
              onContextMenu={(e) => handleContextMenu(e, track)}
            >
              <div className="col col-name">
                {!track.fileExists && <span className="missing-icon" title="File not found">⚠</span>}
                {isCurrent && <span className="playing-icon">▶</span>}
                {track.name || "(unknown)"}
              </div>
              <div className="col col-artist">{track.artist || ""}</div>
              <div className="col col-album">{track.album || ""}</div>
              <div className="col col-genre">{track.genre || ""}</div>
              <div className="col col-rating">{formatRating(track.rating)}</div>
              <div className="col col-plays">{track.playCount ?? ""}</div>
              <div className="col col-time">{formatTime(track.totalTimeMs)}</div>
              <div className="col col-bpm">{track.bpm ?? ""}</div>
            </div>
          );
        })}
      </div>
      {isLoading && <div className="loading">Loading...</div>}
      {tracks.length === 0 && !isLoading && (
        <div className="empty">
          No tracks found. Import an iTunes Library XML to get started.
        </div>
      )}
    </div>
  );
}
