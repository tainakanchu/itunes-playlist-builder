use std::sync::Mutex;

use tauri::{AppHandle, Manager};

use crate::audio::AudioPlayer;
use crate::db::Database;
use crate::models::{ImportResult, PlaybackState, QueueItem, Track};
use crate::xml_parser;

fn get_db(app: &AppHandle) -> Result<Database, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    Database::open(&app_dir).map_err(|e| format!("Failed to open database: {}", e))
}

#[tauri::command]
pub fn import_library(app: AppHandle, xml_path: String) -> Result<ImportResult, String> {
    let db = get_db(&app)?;
    let (track_count, playlist_count, missing_files) =
        xml_parser::import_library(&xml_path, &db)?;

    db.set_state("last_xml_path", &xml_path)
        .map_err(|e| e.to_string())?;

    Ok(ImportResult {
        track_count,
        playlist_count,
        missing_files,
    })
}

#[tauri::command]
pub fn get_tracks(
    app: AppHandle,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<Track>, String> {
    let db = get_db(&app)?;
    db.get_tracks(limit.unwrap_or(200), offset.unwrap_or(0))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn search_tracks(
    app: AppHandle,
    query: String,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<Track>, String> {
    let db = get_db(&app)?;
    db.search_tracks(&query, limit.unwrap_or(200), offset.unwrap_or(0))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_playlists(app: AppHandle) -> Result<Vec<crate::models::Playlist>, String> {
    let db = get_db(&app)?;
    db.get_playlists().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_playlist_tracks(
    app: AppHandle,
    playlist_id: i64,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<Track>, String> {
    let db = get_db(&app)?;
    db.get_playlist_tracks(playlist_id, limit.unwrap_or(200), offset.unwrap_or(0))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn play_track(
    app: AppHandle,
    track_id: i64,
    player: tauri::State<'_, Mutex<AudioPlayer>>,
) -> Result<(), String> {
    let db = get_db(&app)?;
    let track = db
        .get_track_by_track_id(track_id)
        .map_err(|e| e.to_string())?
        .ok_or("Track not found")?;

    let path = track.location_path.as_deref().unwrap_or("");
    if path.is_empty() {
        return Err("No file path for this track".to_string());
    }

    let duration = track.total_time_ms.unwrap_or(0) as u64;
    player
        .lock()
        .map_err(|e| e.to_string())?
        .play(path, track_id, duration)?;

    db.add_recent_track(track_id).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn pause(player: tauri::State<'_, Mutex<AudioPlayer>>) -> Result<(), String> {
    player.lock().map_err(|e| e.to_string())?.pause();
    Ok(())
}

#[tauri::command]
pub fn resume(player: tauri::State<'_, Mutex<AudioPlayer>>) -> Result<(), String> {
    player.lock().map_err(|e| e.to_string())?.resume();
    Ok(())
}

#[tauri::command]
pub fn stop(player: tauri::State<'_, Mutex<AudioPlayer>>) -> Result<(), String> {
    player.lock().map_err(|e| e.to_string())?.stop();
    Ok(())
}

#[tauri::command]
pub fn seek(
    player: tauri::State<'_, Mutex<AudioPlayer>>,
    position_ms: u64,
) -> Result<(), String> {
    player.lock().map_err(|e| e.to_string())?.seek(position_ms);
    Ok(())
}

#[tauri::command]
pub fn get_playback_state(
    player: tauri::State<'_, Mutex<AudioPlayer>>,
) -> Result<PlaybackState, String> {
    Ok(player.lock().map_err(|e| e.to_string())?.get_state())
}

#[tauri::command]
pub fn play_queue_next(
    player: tauri::State<'_, Mutex<AudioPlayer>>,
    track_id: i64,
) -> Result<(), String> {
    player
        .lock()
        .map_err(|e| e.to_string())?
        .queue_next(track_id);
    Ok(())
}

#[tauri::command]
pub fn get_queue(
    app: AppHandle,
    player: tauri::State<'_, Mutex<AudioPlayer>>,
) -> Result<Vec<QueueItem>, String> {
    let db = get_db(&app)?;
    let queue_ids = player.lock().map_err(|e| e.to_string())?.get_queue().to_vec();
    let mut items = Vec::new();

    for (idx, tid) in queue_ids.iter().enumerate() {
        if let Some(track) = db
            .get_track_by_track_id(*tid)
            .map_err(|e| e.to_string())?
        {
            items.push(QueueItem {
                index: idx,
                track,
            });
        }
    }

    Ok(items)
}

#[tauri::command]
pub fn clear_queue(player: tauri::State<'_, Mutex<AudioPlayer>>) -> Result<(), String> {
    player.lock().map_err(|e| e.to_string())?.clear_queue();
    Ok(())
}

#[tauri::command]
pub fn remove_from_queue(
    player: tauri::State<'_, Mutex<AudioPlayer>>,
    index: usize,
) -> Result<bool, String> {
    Ok(player
        .lock()
        .map_err(|e| e.to_string())?
        .remove_from_queue(index))
}

#[tauri::command]
pub fn get_recent_tracks(app: AppHandle, limit: Option<i64>) -> Result<Vec<Track>, String> {
    let db = get_db(&app)?;
    db.get_recent_tracks(limit.unwrap_or(50))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_db_path(app: AppHandle) -> Result<String, String> {
    let db = get_db(&app)?;
    Ok(db.path.clone())
}
