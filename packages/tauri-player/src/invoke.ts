import { invoke } from "@tauri-apps/api/core";
import type {
  Track,
  Playlist,
  PlaybackState,
  QueueItem,
  ImportResult,
} from "./types";

export async function importLibrary(xmlPath: string): Promise<ImportResult> {
  return invoke("import_library", { xmlPath });
}

export async function getTracks(
  limit?: number,
  offset?: number,
): Promise<Track[]> {
  return invoke("get_tracks", { limit, offset });
}

export async function searchTracks(
  query: string,
  limit?: number,
  offset?: number,
): Promise<Track[]> {
  return invoke("search_tracks", { query, limit, offset });
}

export async function getPlaylists(): Promise<Playlist[]> {
  return invoke("get_playlists");
}

export async function getPlaylistTracks(
  playlistId: number,
  limit?: number,
  offset?: number,
): Promise<Track[]> {
  return invoke("get_playlist_tracks", { playlistId, limit, offset });
}

export async function playTrack(trackId: number): Promise<void> {
  return invoke("play_track", { trackId });
}

export async function pause(): Promise<void> {
  return invoke("pause");
}

export async function resume(): Promise<void> {
  return invoke("resume");
}

export async function stop(): Promise<void> {
  return invoke("stop");
}

export async function seek(positionMs: number): Promise<void> {
  return invoke("seek", { positionMs });
}

export async function getPlaybackState(): Promise<PlaybackState> {
  return invoke("get_playback_state");
}

export async function playQueueNext(trackId: number): Promise<void> {
  return invoke("play_queue_next", { trackId });
}

export async function getQueue(): Promise<QueueItem[]> {
  return invoke("get_queue");
}

export async function clearQueue(): Promise<void> {
  return invoke("clear_queue");
}

export async function removeFromQueue(index: number): Promise<boolean> {
  return invoke("remove_from_queue", { index });
}

export async function getRecentTracks(limit?: number): Promise<Track[]> {
  return invoke("get_recent_tracks", { limit });
}
