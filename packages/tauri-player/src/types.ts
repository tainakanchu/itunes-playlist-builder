export interface Track {
  id: number;
  trackId: number;
  persistentId: string | null;
  name: string | null;
  artist: string | null;
  albumArtist: string | null;
  composer: string | null;
  album: string | null;
  genre: string | null;
  year: number | null;
  rating: number | null;
  playCount: number | null;
  skipCount: number | null;
  totalTimeMs: number | null;
  dateAdded: string | null;
  dateModified: string | null;
  bpm: number | null;
  comments: string | null;
  locationRaw: string | null;
  locationPath: string | null;
  trackType: string | null;
  disabled: boolean;
  compilation: boolean;
  discNumber: number | null;
  discCount: number | null;
  trackNumber: number | null;
  trackCount: number | null;
  fileExists: boolean;
}

export interface Playlist {
  id: number;
  playlistId: number;
  persistentId: string | null;
  parentPersistentId: string | null;
  name: string;
  isFolder: boolean;
  isSmart: boolean;
  trackCount: number;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTrackId: number | null;
  positionMs: number;
  durationMs: number;
}

export interface QueueItem {
  index: number;
  track: Track;
}

export interface ImportResult {
  trackCount: number;
  playlistCount: number;
  missingFiles: number;
}

export type ViewMode = "library" | "playlist" | "recent";
