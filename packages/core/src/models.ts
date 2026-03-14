// Shared types for iTunes Playlist Builder

export type Track = {
  trackId: number;
  persistentId?: string;
  name?: string;
  artist?: string;
  albumArtist?: string;
  composer?: string;
  album?: string;
  genre?: string;
  bpm?: number;
  rating?: number;
  playCount?: number;
  skipCount?: number;
  year?: number;
  trackNumber?: number;
  discNumber?: number;
  dateAdded?: Date;
  dateModified?: Date;
  location?: string;
  comments?: string;
  grouping?: string;
  compilation?: boolean;
  podcast?: boolean;
  disabled?: boolean;
  kind?: string;
};

export type Playlist = {
  playlistId: number;
  persistentId?: string;
  name: string;
  fullPath: string;
  parentPersistentId?: string;
  parentId?: number;
  isFolder: boolean;
  isGenerated: boolean;
  source: "existing" | "generated";
  trackIds: number[];
};

export type GeneratedPlaylist = {
  playlistId?: number;
  name: string;
  path: string;
  fullPath: string;
  parentPath?: string;
  trackIds: number[];
  sort?: SortRule[];
  ruleKey: string;
};

export type SortRule = {
  field: SupportedField;
  order: "asc" | "desc";
};

export type FolderNode = {
  type: "folder";
  name: string;
  fullPath: string;
  parentPath?: string;
  children: Array<FolderNode | PlaylistNode>;
};

export type PlaylistNode = {
  type: "playlist";
  name: string;
  fullPath: string;
  parentPath?: string;
  trackIds: number[];
};

export const SUPPORTED_FIELDS = [
  "trackId",
  "name",
  "artist",
  "albumArtist",
  "composer",
  "album",
  "genre",
  "bpm",
  "rating",
  "playCount",
  "skipCount",
  "year",
  "trackNumber",
  "discNumber",
  "dateAdded",
  "dateModified",
  "location",
  "comments",
  "grouping",
  "compilation",
  "podcast",
  "disabled",
  "kind",
] as const;

export type SupportedField = (typeof SUPPORTED_FIELDS)[number];

export type BuildOptions = {
  removeExistingNamespace: boolean;
  failOnMissingPlaylist: boolean;
  dedupeTrackIds: boolean;
  caseSensitiveContains: boolean;
};

export const DEFAULT_BUILD_OPTIONS: BuildOptions = {
  removeExistingNamespace: true,
  failOnMissingPlaylist: true,
  dedupeTrackIds: true,
  caseSensitiveContains: false,
};

export type BuildParams = {
  inputXmlPath: string;
  rulesPath: string;
  outputXmlPath: string;
};

export type BuildResult = {
  generatedPlaylistCount: number;
  generatedFolderCount: number;
  outputXmlPath: string;
};

export type PreviewResult = {
  tree: FolderNode;
  playlistCount: number;
  folderCount: number;
};

export type Library = {
  tracks: Map<number, Track>;
  playlists: Playlist[];
  rawPlist: Record<string, unknown>;
};
