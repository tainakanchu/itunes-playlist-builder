use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Track {
    pub id: i64,
    pub track_id: i64,
    pub persistent_id: Option<String>,
    pub name: Option<String>,
    pub artist: Option<String>,
    pub album_artist: Option<String>,
    pub composer: Option<String>,
    pub album: Option<String>,
    pub genre: Option<String>,
    pub year: Option<i64>,
    pub rating: Option<i64>,
    pub play_count: Option<i64>,
    pub skip_count: Option<i64>,
    pub total_time_ms: Option<i64>,
    pub date_added: Option<String>,
    pub date_modified: Option<String>,
    pub bpm: Option<i64>,
    pub comments: Option<String>,
    pub location_raw: Option<String>,
    pub location_path: Option<String>,
    pub track_type: Option<String>,
    pub disabled: bool,
    pub compilation: bool,
    pub disc_number: Option<i64>,
    pub disc_count: Option<i64>,
    pub track_number: Option<i64>,
    pub track_count: Option<i64>,
    pub file_exists: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Playlist {
    pub id: i64,
    pub playlist_id: i64,
    pub persistent_id: Option<String>,
    pub parent_persistent_id: Option<String>,
    pub name: String,
    pub is_folder: bool,
    pub is_smart: bool,
    pub track_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaybackState {
    pub is_playing: bool,
    pub current_track_id: Option<i64>,
    pub position_ms: u64,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueueItem {
    pub index: usize,
    pub track: Track,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
    pub track_count: usize,
    pub playlist_count: usize,
    pub missing_files: usize,
}
