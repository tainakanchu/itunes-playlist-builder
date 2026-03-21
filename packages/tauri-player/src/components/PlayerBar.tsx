import { useCallback } from "react";
import { useStore } from "../store/useStore";
import * as api from "../invoke";

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function PlayerBar() {
  const { playback, tracks } = useStore();

  const currentTrack = playback.currentTrackId
    ? tracks.find((t) => t.trackId === playback.currentTrackId)
    : null;

  const handlePlayPause = useCallback(async () => {
    if (playback.isPlaying) {
      await api.pause();
    } else if (playback.currentTrackId !== null) {
      await api.resume();
    }
  }, [playback.isPlaying, playback.currentTrackId]);

  const handleStop = useCallback(async () => {
    await api.stop();
  }, []);

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const pos = parseInt(e.target.value, 10);
      api.seek(pos);
    },
    [],
  );

  return (
    <div className="player-bar">
      <div className="player-controls">
        <button className="player-btn" onClick={handlePlayPause}>
          {playback.isPlaying ? "⏸" : "▶"}
        </button>
        <button className="player-btn" onClick={handleStop}>
          ⏹
        </button>
      </div>

      <div className="player-track-info">
        {currentTrack ? (
          <>
            <span className="player-track-name">
              {currentTrack.name || "(unknown)"}
            </span>
            <span className="player-track-artist">
              {currentTrack.artist || ""}
            </span>
          </>
        ) : (
          <span className="player-track-name">No track playing</span>
        )}
      </div>

      <div className="player-seek">
        <span className="player-time">{formatTime(playback.positionMs)}</span>
        <input
          type="range"
          min={0}
          max={playback.durationMs || 100}
          value={playback.positionMs}
          onChange={handleSeek}
          className="seek-slider"
        />
        <span className="player-time">{formatTime(playback.durationMs)}</span>
      </div>
    </div>
  );
}
