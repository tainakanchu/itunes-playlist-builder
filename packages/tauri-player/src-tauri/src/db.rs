use rusqlite::{params, Connection, Result};

use crate::models;

pub struct Database {
    conn: Connection,
    pub path: String,
}

impl Database {
    pub fn open(app_dir: &Path) -> Result<Self> {
        std::fs::create_dir_all(app_dir).ok();
        let db_path = app_dir.join("library.db");
        let path_str = db_path.to_string_lossy().to_string();
        let conn = Connection::open(&db_path)?;

        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;")?;

        let db = Database {
            conn,
            path: path_str,
        };
        db.create_tables()?;
        Ok(db)
    }

    fn create_tables(&self) -> Result<()> {
        self.conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS tracks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                track_id INTEGER NOT NULL,
                persistent_id TEXT,
                name TEXT,
                artist TEXT,
                album_artist TEXT,
                composer TEXT,
                album TEXT,
                genre TEXT,
                year INTEGER,
                rating INTEGER,
                play_count INTEGER DEFAULT 0,
                skip_count INTEGER DEFAULT 0,
                total_time_ms INTEGER,
                date_added TEXT,
                date_modified TEXT,
                bpm INTEGER,
                comments TEXT,
                location_raw TEXT,
                location_path TEXT,
                track_type TEXT,
                disabled INTEGER DEFAULT 0,
                compilation INTEGER DEFAULT 0,
                disc_number INTEGER,
                disc_count INTEGER,
                track_number INTEGER,
                track_count INTEGER,
                file_exists INTEGER DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS playlists (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                playlist_id INTEGER NOT NULL,
                persistent_id TEXT,
                parent_persistent_id TEXT,
                name TEXT NOT NULL,
                is_folder INTEGER DEFAULT 0,
                is_smart INTEGER DEFAULT 0,
                raw_smart_info TEXT,
                raw_smart_criteria TEXT,
                sort_order INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS playlist_tracks (
                playlist_id INTEGER NOT NULL,
                track_id INTEGER NOT NULL,
                sort_index INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS app_state (
                key TEXT PRIMARY KEY,
                value TEXT
            );

            CREATE TABLE IF NOT EXISTS recent_tracks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                track_id INTEGER NOT NULL,
                played_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE INDEX IF NOT EXISTS idx_tracks_name ON tracks(name);
            CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist);
            CREATE INDEX IF NOT EXISTS idx_tracks_album ON tracks(album);
            CREATE INDEX IF NOT EXISTS idx_tracks_genre ON tracks(genre);
            CREATE INDEX IF NOT EXISTS idx_tracks_track_id ON tracks(track_id);
            CREATE INDEX IF NOT EXISTS idx_playlist_tracks_pid ON playlist_tracks(playlist_id);
            CREATE INDEX IF NOT EXISTS idx_playlist_tracks_tid ON playlist_tracks(track_id);
            CREATE INDEX IF NOT EXISTS idx_recent_tracks_at ON recent_tracks(played_at);
        ",
        )?;
        Ok(())
    }

    pub fn begin_import(&self) -> Result<()> {
        self.conn.execute_batch(
            "
            DELETE FROM playlist_tracks;
            DELETE FROM playlists;
            DELETE FROM tracks;
            BEGIN TRANSACTION;
        ",
        )?;
        Ok(())
    }

    pub fn finish_import(&self) -> Result<()> {
        self.conn.execute_batch("COMMIT;")?;
        Ok(())
    }

    pub fn insert_track(
        &self,
        raw: &crate::xml_parser::RawTrack,
        location_path: &str,
        file_exists: bool,
    ) -> Result<()> {
        self.conn.execute(
            "INSERT INTO tracks (track_id, persistent_id, name, artist, album_artist, composer,
             album, genre, year, rating, play_count, skip_count, total_time_ms,
             date_added, date_modified, bpm, comments, location_raw, location_path,
             track_type, disabled, compilation, disc_number, disc_count,
             track_number, track_count, file_exists)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22,?23,?24,?25,?26,?27)",
            params![
                raw.get_int("Track ID").unwrap_or(0),
                raw.get_str("Persistent ID"),
                raw.get_str("Name"),
                raw.get_str("Artist"),
                raw.get_str("Album Artist"),
                raw.get_str("Composer"),
                raw.get_str("Album"),
                raw.get_str("Genre"),
                raw.get_int("Year"),
                raw.get_int("Rating"),
                raw.get_int("Play Count").unwrap_or(0),
                raw.get_int("Skip Count").unwrap_or(0),
                raw.get_int("Total Time"),
                raw.get_date("Date Added"),
                raw.get_date("Date Modified"),
                raw.get_int("BPM"),
                raw.get_str("Comments"),
                raw.get_str("Location"),
                location_path,
                raw.get_str("Track Type"),
                raw.get_bool("Disabled") as i32,
                raw.get_bool("Compilation") as i32,
                raw.get_int("Disc Number"),
                raw.get_int("Disc Count"),
                raw.get_int("Track Number"),
                raw.get_int("Track Count"),
                file_exists as i32,
            ],
        )?;
        Ok(())
    }

    pub fn insert_playlist(&self, raw: &crate::xml_parser::RawPlaylist, sort_order: i64) -> Result<()> {
        let playlist_id = raw.get_int("Playlist ID").unwrap_or(0);
        let is_smart = raw.get_str("Smart Info").is_some() || raw.get_str("Smart Criteria").is_some();

        // Skip master/distinguished playlists
        let distinguished = raw.get_int("Distinguished Kind");
        let master = raw.get_bool("Master");
        if master || distinguished.is_some() {
            return Ok(());
        }

        self.conn.execute(
            "INSERT INTO playlists (playlist_id, persistent_id, parent_persistent_id, name, is_folder, is_smart, sort_order)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                playlist_id,
                raw.get_str("Playlist Persistent ID"),
                raw.get_str("Parent Persistent ID"),
                raw.get_str("Name").unwrap_or("Untitled"),
                raw.get_bool("Folder") as i32,
                is_smart as i32,
                sort_order,
            ],
        )?;

        for (idx, track_id) in raw.track_ids.iter().enumerate() {
            self.conn.execute(
                "INSERT INTO playlist_tracks (playlist_id, track_id, sort_index) VALUES (?1, ?2, ?3)",
                params![playlist_id, track_id, idx as i64],
            )?;
        }

        Ok(())
    }

    pub fn get_tracks(&self, limit: i64, offset: i64) -> Result<Vec<models::Track>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, track_id, persistent_id, name, artist, album_artist, composer,
                    album, genre, year, rating, play_count, skip_count, total_time_ms,
                    date_added, date_modified, bpm, comments, location_raw, location_path,
                    track_type, disabled, compilation, disc_number, disc_count,
                    track_number, track_count, file_exists
             FROM tracks ORDER BY name COLLATE NOCASE ASC LIMIT ?1 OFFSET ?2",
        )?;

        let rows = stmt.query_map(params![limit, offset], |row| Self::row_to_track(row))?;
        rows.collect()
    }

    pub fn search_tracks(&self, query: &str, limit: i64, offset: i64) -> Result<Vec<models::Track>> {
        let pattern = format!("%{}%", query);
        let mut stmt = self.conn.prepare(
            "SELECT id, track_id, persistent_id, name, artist, album_artist, composer,
                    album, genre, year, rating, play_count, skip_count, total_time_ms,
                    date_added, date_modified, bpm, comments, location_raw, location_path,
                    track_type, disabled, compilation, disc_number, disc_count,
                    track_number, track_count, file_exists
             FROM tracks
             WHERE name LIKE ?1 OR artist LIKE ?1 OR album LIKE ?1
                   OR album_artist LIKE ?1 OR genre LIKE ?1 OR comments LIKE ?1
             ORDER BY name COLLATE NOCASE ASC LIMIT ?2 OFFSET ?3",
        )?;

        let rows = stmt.query_map(params![pattern, limit, offset], |row| Self::row_to_track(row))?;
        rows.collect()
    }

    pub fn get_track_by_track_id(&self, track_id: i64) -> Result<Option<models::Track>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, track_id, persistent_id, name, artist, album_artist, composer,
                    album, genre, year, rating, play_count, skip_count, total_time_ms,
                    date_added, date_modified, bpm, comments, location_raw, location_path,
                    track_type, disabled, compilation, disc_number, disc_count,
                    track_number, track_count, file_exists
             FROM tracks WHERE track_id = ?1",
        )?;

        let mut rows = stmt.query_map(params![track_id], |row| Self::row_to_track(row))?;
        match rows.next() {
            Some(row) => Ok(Some(row?)),
            None => Ok(None),
        }
    }

    pub fn get_playlists(&self) -> Result<Vec<models::Playlist>> {
        let mut stmt = self.conn.prepare(
            "SELECT p.id, p.playlist_id, p.persistent_id, p.parent_persistent_id,
                    p.name, p.is_folder, p.is_smart,
                    (SELECT COUNT(*) FROM playlist_tracks pt WHERE pt.playlist_id = p.playlist_id) as track_count
             FROM playlists p ORDER BY p.sort_order",
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(models::Playlist {
                id: row.get(0)?,
                playlist_id: row.get(1)?,
                persistent_id: row.get(2)?,
                parent_persistent_id: row.get(3)?,
                name: row.get(4)?,
                is_folder: row.get::<_, i32>(5)? != 0,
                is_smart: row.get::<_, i32>(6)? != 0,
                track_count: row.get(7)?,
            })
        })?;

        rows.collect()
    }

    pub fn get_playlist_tracks(&self, playlist_id: i64, limit: i64, offset: i64) -> Result<Vec<models::Track>> {
        let mut stmt = self.conn.prepare(
            "SELECT t.id, t.track_id, t.persistent_id, t.name, t.artist, t.album_artist, t.composer,
                    t.album, t.genre, t.year, t.rating, t.play_count, t.skip_count, t.total_time_ms,
                    t.date_added, t.date_modified, t.bpm, t.comments, t.location_raw, t.location_path,
                    t.track_type, t.disabled, t.compilation, t.disc_number, t.disc_count,
                    t.track_number, t.track_count, t.file_exists
             FROM tracks t
             INNER JOIN playlist_tracks pt ON t.track_id = pt.track_id
             WHERE pt.playlist_id = ?1
             ORDER BY pt.sort_index ASC
             LIMIT ?2 OFFSET ?3",
        )?;

        let rows = stmt.query_map(params![playlist_id, limit, offset], |row| Self::row_to_track(row))?;
        rows.collect()
    }

    pub fn add_recent_track(&self, track_id: i64) -> Result<()> {
        self.conn.execute(
            "INSERT INTO recent_tracks (track_id) VALUES (?1)",
            params![track_id],
        )?;
        // Keep only last 100
        self.conn.execute(
            "DELETE FROM recent_tracks WHERE id NOT IN (SELECT id FROM recent_tracks ORDER BY played_at DESC LIMIT 100)",
            [],
        )?;
        Ok(())
    }

    pub fn get_recent_tracks(&self, limit: i64) -> Result<Vec<models::Track>> {
        let mut stmt = self.conn.prepare(
            "SELECT t.id, t.track_id, t.persistent_id, t.name, t.artist, t.album_artist, t.composer,
                    t.album, t.genre, t.year, t.rating, t.play_count, t.skip_count, t.total_time_ms,
                    t.date_added, t.date_modified, t.bpm, t.comments, t.location_raw, t.location_path,
                    t.track_type, t.disabled, t.compilation, t.disc_number, t.disc_count,
                    t.track_number, t.track_count, t.file_exists
             FROM tracks t
             INNER JOIN recent_tracks rt ON t.track_id = rt.track_id
             ORDER BY rt.played_at DESC
             LIMIT ?1",
        )?;

        let rows = stmt.query_map(params![limit], |row| Self::row_to_track(row))?;
        rows.collect()
    }

    pub fn set_state(&self, key: &str, value: &str) -> Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO app_state (key, value) VALUES (?1, ?2)",
            params![key, value],
        )?;
        Ok(())
    }

    pub fn get_state(&self, key: &str) -> Result<Option<String>> {
        let mut stmt = self
            .conn
            .prepare("SELECT value FROM app_state WHERE key = ?1")?;
        let mut rows = stmt.query_map(params![key], |row| row.get(0))?;
        match rows.next() {
            Some(row) => Ok(Some(row?)),
            None => Ok(None),
        }
    }

    fn row_to_track(row: &rusqlite::Row) -> rusqlite::Result<models::Track> {
        Ok(models::Track {
            id: row.get(0)?,
            track_id: row.get(1)?,
            persistent_id: row.get(2)?,
            name: row.get(3)?,
            artist: row.get(4)?,
            album_artist: row.get(5)?,
            composer: row.get(6)?,
            album: row.get(7)?,
            genre: row.get(8)?,
            year: row.get(9)?,
            rating: row.get(10)?,
            play_count: row.get(11)?,
            skip_count: row.get(12)?,
            total_time_ms: row.get(13)?,
            date_added: row.get(14)?,
            date_modified: row.get(15)?,
            bpm: row.get(16)?,
            comments: row.get(17)?,
            location_raw: row.get(18)?,
            location_path: row.get(19)?,
            track_type: row.get(20)?,
            disabled: row.get::<_, i32>(21)? != 0,
            compilation: row.get::<_, i32>(22)? != 0,
            disc_number: row.get(23)?,
            disc_count: row.get(24)?,
            track_number: row.get(25)?,
            track_count: row.get(26)?,
            file_exists: row.get::<_, i32>(27)? != 0,
        })
    }
}

use std::path::Path;
