import type { Track, Playlist, PlaybackState } from "./types";

const genres = ["City Pop", "J-Pop", "Funk", "Soul", "Jazz", "Electronic", "House", "Disco", "R&B", "Rock"];
const artists = [
  "竹内まりや", "山下達郎", "大貫妙子", "角松敏生", "杏里",
  "松原みき", "中原めいこ", "吉田美奈子", "佐藤博", "細野晴臣",
  "Daft Punk", "Jamiroquai", "Marvin Gaye", "Stevie Wonder", "Earth, Wind & Fire",
  "Tatsuro Yamashita", "Toshiki Kadomatsu", "Anri", "Miki Matsubara", "Taeko Onuki",
];
const albums = [
  "Variety", "FOR YOU", "MIGNONNE", "AFTER 5 CLASH", "Timely!!",
  "Pocket Park", "mint", "FLAPPER", "Awakening", "Hosono House",
  "Discovery", "Travelling Without Moving", "What's Going On", "Songs in the Key of Life", "That's the Way of the World",
  "RIDE ON TIME", "SEA BREEZE", "Heaven Beach", "Stay With Me", "Sunshower",
];
const trackNames = [
  "Plastic Love", "Ride on Time", "4:00 A.M.", "Summer Connection", "Last Summer Whisper",
  "真夜中のドア〜Stay With Me", "Fantasy", "Telephone Number", "君は天然色", "September",
  "Get Lucky", "Virtual Insanity", "What's Going On", "Superstition", "Boogie Wonderland",
  "Sparkle", "I Love You So", "Cat's Eye", "Dress Down", "夢の続き",
  "Bay City", "Magic Ways", "Midnight Pretenders", "Let's Groove", "Sweetest Music",
  "Morning Glory", "Windy Summer", "Fly-Day Chinatown", "Remember Summer Days", "Music Book",
  "Night Tempo Remix", "Pacific Breeze", "Dancer", "Downtown Boy", "Loveland, Island",
  "Hot Summer Nights", "Misty Mauve", "告白", "Bomber", "夏のクラクション",
  "Silent Screamer", "Paper Doll", "Mermaid Princess", "So Nice", "Rainy Walk",
  "Sunset Glow", "Midnight Express", "Tokyo Nights", "Neon City", "Golden Hour",
];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(yearStart: number, yearEnd: number): string {
  const year = randomInt(yearStart, yearEnd);
  const month = randomInt(1, 12);
  const day = randomInt(1, 28);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function generateMockTracks(count: number): Track[] {
  const tracks: Track[] = [];
  for (let i = 0; i < count; i++) {
    const artist = artists[i % artists.length];
    const album = albums[i % albums.length];
    const name = trackNames[i % trackNames.length];
    tracks.push({
      id: i + 1,
      trackId: i + 1,
      persistentId: null,
      name: i < trackNames.length ? name : `${name} (${Math.floor(i / trackNames.length) + 1})`,
      artist,
      albumArtist: artist,
      composer: null,
      album,
      genre: genres[i % genres.length],
      year: randomInt(1975, 2024),
      rating: [0, 0, 20, 40, 60, 80, 100][randomInt(0, 6)],
      playCount: randomInt(0, 500),
      skipCount: randomInt(0, 20),
      totalTimeMs: randomInt(180000, 420000),
      dateAdded: randomDate(2015, 2024),
      dateModified: null,
      bpm: randomInt(90, 140),
      comments: null,
      locationRaw: null,
      locationPath: `/Music/${artist}/${album}/${name}.mp3`,
      trackType: "File",
      disabled: false,
      compilation: false,
      discNumber: 1,
      discCount: 1,
      trackNumber: (i % 12) + 1,
      trackCount: 12,
      fileExists: Math.random() > 0.05,
    });
  }
  return tracks;
}

export function generateMockPlaylists(): Playlist[] {
  return [
    { id: 1, playlistId: 1, persistentId: "A001", parentPersistentId: null, name: "City Pop Essentials", isFolder: false, isSmart: false, trackCount: 42 },
    { id: 2, playlistId: 2, persistentId: "A002", parentPersistentId: null, name: "DJ Sets", isFolder: true, isSmart: false, trackCount: 0 },
    { id: 3, playlistId: 3, persistentId: "A003", parentPersistentId: "A002", name: "Weekend Warm-up", isFolder: false, isSmart: false, trackCount: 28 },
    { id: 4, playlistId: 4, persistentId: "A004", parentPersistentId: "A002", name: "Late Night Groove", isFolder: false, isSmart: false, trackCount: 35 },
    { id: 5, playlistId: 5, persistentId: "A005", parentPersistentId: "A002", name: "Peak Time", isFolder: false, isSmart: false, trackCount: 19 },
    { id: 6, playlistId: 6, persistentId: "A006", parentPersistentId: null, name: "80s Japanese Funk", isFolder: false, isSmart: false, trackCount: 56 },
    { id: 7, playlistId: 7, persistentId: "A007", parentPersistentId: null, name: "Chill & Drive", isFolder: false, isSmart: false, trackCount: 31 },
    { id: 8, playlistId: 8, persistentId: "A008", parentPersistentId: null, name: "Favorites", isFolder: true, isSmart: false, trackCount: 0 },
    { id: 9, playlistId: 9, persistentId: "A009", parentPersistentId: "A008", name: "All Time Best", isFolder: false, isSmart: false, trackCount: 67 },
    { id: 10, playlistId: 10, persistentId: "A010", parentPersistentId: "A008", name: "Recent Finds", isFolder: false, isSmart: true, trackCount: 15 },
    { id: 11, playlistId: 11, persistentId: "A011", parentPersistentId: null, name: "BPM 120-130", isFolder: false, isSmart: true, trackCount: 44 },
    { id: 12, playlistId: 12, persistentId: "A012", parentPersistentId: null, name: "Summer Vibes 2024", isFolder: false, isSmart: false, trackCount: 22 },
  ];
}

export const mockPlaybackState: PlaybackState = {
  isPlaying: true,
  currentTrackId: 1,
  positionMs: 97000,
  durationMs: 289000,
};
