mod audio;
mod commands;
mod db;
mod models;
mod xml_parser;

use std::sync::Mutex;

pub fn run() {
    let audio_player = Mutex::new(audio::AudioPlayer::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(audio_player)
        .invoke_handler(tauri::generate_handler![
            commands::import_library,
            commands::get_tracks,
            commands::search_tracks,
            commands::get_playlists,
            commands::get_playlist_tracks,
            commands::play_track,
            commands::pause,
            commands::resume,
            commands::stop,
            commands::seek,
            commands::get_playback_state,
            commands::play_queue_next,
            commands::get_queue,
            commands::clear_queue,
            commands::remove_from_queue,
            commands::get_recent_tracks,
            commands::get_db_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
