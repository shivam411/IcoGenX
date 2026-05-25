use axum::extract::ws::{Message, WebSocket};
use futures::stream::SplitSink;
use futures::SinkExt;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::sync::RwLock;

use crate::game_registry::GameRegistry;
use crate::game_trait::Game;
use crate::protocol::{ClientMessage, ServerMessage};
use crate::social_token::{verify_identity_token, verify_invite_grant};

/// A game room with two players
pub struct Room {
    pub code: String,
    pub game_type: String,
    pub variant: Option<String>,
    pub match_format: String,
    pub players: Vec<String>,   // player IDs
    pub game: Option<Box<dyn Game>>,
    pub started: bool,
    pub scores: Vec<u32>,
    pub play_again_votes: Vec<bool>,
}

impl std::fmt::Debug for Room {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Room")
            .field("code", &self.code)
            .field("game_type", &self.game_type)
            .field("variant", &self.variant)
            .field("match_format", &self.match_format)
            .field("players", &self.players)
            .field("started", &self.started)
            .field("scores", &self.scores)
            .field("play_again_votes", &self.play_again_votes)
            .field("game", &self.game.as_ref().map(|g| g.game_type()))
            .finish()
    }
}

type Sender = SplitSink<WebSocket, Message>;

#[derive(Debug, Clone)]
pub struct GameInviteRecord {
    pub invite_id: String,
    pub from_user_id: String,
    pub to_user_id: String,
    pub room_code: String,
    pub game_type: String,
    pub variant: Option<String>,
    pub expires_at_ms: u64,
}

pub struct AppState {
    pub rooms: RwLock<HashMap<String, Room>>,
    pub player_rooms: RwLock<HashMap<String, String>>,        // player_id -> room_code
    pub player_numbers: RwLock<HashMap<String, u8>>,          // player_id -> 0..N-1
    pub player_names: RwLock<HashMap<String, String>>,          // player_id -> name
    pub senders: RwLock<HashMap<String, Arc<RwLock<Sender>>>>, // player_id -> ws sender
    pub registry: GameRegistry,
    // Friends & Presence:
    pub user_connections: RwLock<HashMap<String, Vec<String>>>, // user_id -> Vec<player_id> (sockets)
    pub presence_subscriptions: RwLock<HashMap<String, std::collections::HashSet<String>>>, // user_id -> Set<friend_user_id>
    pub player_users: RwLock<HashMap<String, String>>, // player_id -> user_id
    pub user_names: RwLock<HashMap<String, String>>, // user_id -> display name
    pub active_invites: RwLock<HashMap<String, GameInviteRecord>>, // invite_id -> record
    pub presence_disconnect_versions: RwLock<HashMap<String, u64>>, // user_id -> debounce version
}

impl AppState {
    pub fn new() -> Self {
        AppState {
            rooms: RwLock::new(HashMap::new()),
            player_rooms: RwLock::new(HashMap::new()),
            player_numbers: RwLock::new(HashMap::new()),
            player_names: RwLock::new(HashMap::new()),
            senders: RwLock::new(HashMap::new()),
            registry: GameRegistry::new(),
            user_connections: RwLock::new(HashMap::new()),
            presence_subscriptions: RwLock::new(HashMap::new()),
            player_users: RwLock::new(HashMap::new()),
            user_names: RwLock::new(HashMap::new()),
            active_invites: RwLock::new(HashMap::new()),
            presence_disconnect_versions: RwLock::new(HashMap::new()),
        }
    }

    pub async fn add_sender(&self, player_id: &str, sender: Sender) {
        self.senders
            .write()
            .await
            .insert(player_id.to_string(), Arc::new(RwLock::new(sender)));
    }

    pub async fn send_to(&self, player_id: &str, msg: &ServerMessage) {
        let senders = self.senders.read().await;
        if let Some(sender) = senders.get(player_id) {
            let json = serde_json::to_string(msg).unwrap();
            let mut s = sender.write().await;
            let _ = s.send(Message::Text(json.into())).await;
        }
    }

    pub async fn send_to_players(&self, player_ids: &[String], msg: &ServerMessage) {
        for pid in player_ids {
            self.send_to(pid, msg).await;
        }
    }

    pub async fn broadcast_presence_for_user(&self, user_id: &str, online: bool, current_room: Option<String>) {
        let mut subscribers = Vec::new();
        {
            let subscriptions = self.presence_subscriptions.read().await;
            for (sub_uid, friends) in subscriptions.iter() {
                if friends.contains(user_id) {
                    subscribers.push(sub_uid.clone());
                }
            }
        }

        let mut subscriber_pids = Vec::new();
        {
            let conns = self.user_connections.read().await;
            for sub_uid in subscribers {
                if let Some(pids) = conns.get(&sub_uid) {
                    subscriber_pids.extend(pids.clone());
                }
            }
        }

        let msg = ServerMessage::PresenceUpdate {
            user_id: user_id.to_string(),
            online,
            current_room,
        };
        self.send_to_players(&subscriber_pids, &msg).await;
    }

    pub async fn broadcast_current_presence_for_player(&self, player_id: &str) {
        let user_id = self.player_users.read().await.get(player_id).cloned();
        if let Some(user_id) = user_id {
            let current_room = self.player_rooms.read().await.get(player_id).cloned();
            self.broadcast_presence_for_user(&user_id, true, current_room).await;
        }
    }

    async fn schedule_offline_presence(self: &Arc<Self>, user_id: String) {
        let version = {
            let mut versions = self.presence_disconnect_versions.write().await;
            let entry = versions.entry(user_id.clone()).or_insert(0);
            *entry += 1;
            *entry
        };
        let state = Arc::clone(self);
        tokio::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_secs(5)).await;

            if state.user_connections.read().await.contains_key(&user_id) {
                return;
            }
            {
                let mut versions = state.presence_disconnect_versions.write().await;
                if versions.get(&user_id).copied() != Some(version) {
                    return;
                }
                versions.remove(&user_id);
            }
            state.presence_subscriptions.write().await.remove(&user_id);
            state.broadcast_presence_for_user(&user_id, false, None).await;
        });
    }

    async fn send_invite_notice_to_user(&self, user_id: &str, msg: &ServerMessage) {
        let pids = self.user_connections.read().await.get(user_id).cloned();
        if let Some(pids) = pids {
            self.send_to_players(&pids, msg).await;
        }
    }

    async fn notify_invite_expired(&self, invite: &GameInviteRecord) {
        let msg = ServerMessage::GameInviteExpired {
            invite_id: invite.invite_id.clone(),
        };
        self.send_invite_notice_to_user(&invite.from_user_id, &msg).await;
        self.send_invite_notice_to_user(&invite.to_user_id, &msg).await;
    }

    async fn notify_invite_accepted(&self, invite: &GameInviteRecord) {
        let from_name = self
            .user_names
            .read()
            .await
            .get(&invite.to_user_id)
            .cloned()
            .unwrap_or_else(|| "Friend".into());
        self
            .send_invite_notice_to_user(
                &invite.from_user_id,
                &ServerMessage::GameInviteAccepted {
                    invite_id: invite.invite_id.clone(),
                    from_name,
                },
            )
            .await;
    }

    async fn expire_invite_if_due(self: &Arc<Self>, invite_id: &str) -> bool {
        let expired = {
            let mut invites = self.active_invites.write().await;
            if invites
                .get(invite_id)
                .map(|invite| invite.expires_at_ms <= now_ms())
                .unwrap_or(false)
            {
                invites.remove(invite_id)
            } else {
                None
            }
        };

        if let Some(invite) = expired {
            self.notify_invite_expired(&invite).await;
            true
        } else {
            false
        }
    }

    async fn schedule_invite_expiry(self: &Arc<Self>, invite_id: String, expires_at_ms: u64) {
        let delay_ms = expires_at_ms.saturating_sub(now_ms());
        let state = Arc::clone(self);
        tokio::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_millis(delay_ms)).await;
            state.expire_invite_if_due(&invite_id).await;
        });
    }

    async fn accept_invite_for_join(&self, player_id: &str, room_code: &str) -> Option<GameInviteRecord> {
        let to_user_id = self.player_users.read().await.get(player_id).cloned()?;
        let invite = {
            let mut invites = self.active_invites.write().await;
            let invite_id = invites
                .iter()
                .find(|(_, invite)| invite.to_user_id == to_user_id && invite.room_code == room_code)
                .map(|(id, _)| id.clone());
            invite_id.and_then(|id| invites.remove(&id))
        }?;

        if invite.expires_at_ms <= now_ms() {
            self.notify_invite_expired(&invite).await;
            return None;
        }

        self.notify_invite_accepted(&invite).await;
        Some(invite)
    }

    pub async fn remove_player(self: &Arc<Self>, player_id: &str) {
        self.senders.write().await.remove(player_id);

        // Friends & Presence Cleanup
        let presence_cleanup = {
            let mut player_users = self.player_users.write().await;
            if let Some(user_id) = player_users.remove(player_id) {
                let mut user_connections = self.user_connections.write().await;
                if let Some(conns) = user_connections.get_mut(&user_id) {
                    conns.retain(|id| id != player_id);
                    if conns.is_empty() {
                        user_connections.remove(&user_id);
                        Some((user_id, true))
                    } else {
                        Some((user_id, false))
                    }
                } else {
                    None
                }
            } else {
                None
            }
        };

        let room_code = self.player_rooms.write().await.remove(player_id);
        self.player_numbers.write().await.remove(player_id);
        self.player_names.write().await.remove(player_id);

        if let Some(code) = room_code {
            let remaining = {
                let mut rooms = self.rooms.write().await;
                if let Some(room) = rooms.get_mut(&code) {
                    room.players.retain(|p| p != player_id);
                    if !room.started {
                        let mut player_numbers = self.player_numbers.write().await;
                        for (idx, pid) in room.players.iter().enumerate() {
                            player_numbers.insert(pid.clone(), idx as u8);
                        }
                    }
                    let remaining = room.players.clone();
                    // Clean up empty rooms
                    if remaining.is_empty() {
                        rooms.remove(&code);
                    }
                    remaining
                } else {
                    vec![]
                }
            };
            // Send disconnect outside lock scope
            for pid in remaining {
                self.send_to(&pid, &ServerMessage::OpponentDisconnected).await;
            }
        }

        if let Some((user_id, is_last_connection)) = presence_cleanup {
            if is_last_connection {
                self.schedule_offline_presence(user_id).await;
            } else {
                let current_room = {
                    let conns = self.user_connections.read().await;
                    let player_rooms = self.player_rooms.read().await;
                    conns
                        .get(&user_id)
                        .and_then(|pids| pids.first())
                        .and_then(|pid| player_rooms.get(pid).cloned())
                };
                self.broadcast_presence_for_user(&user_id, true, current_room).await;
            }
        }
    }
}

const DEFAULT_MATCH_FORMAT: &str = "single";
const INVITE_TTL_MS: u64 = 2 * 60 * 1000;

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or(0)
}

fn normalize_match_format(format: &str) -> Option<&'static str> {
    match format {
        "single" => Some("single"),
        "series_5" => Some("series_5"),
        _ => None,
    }
}

fn generate_room_code() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let code: String = (0..6)
        .map(|_| {
            let idx = rng.gen_range(0..36);
            if idx < 10 {
                (b'0' + idx) as char
            } else {
                (b'A' + idx - 10) as char
            }
        })
        .collect();
    code
}

pub async fn handle_message(state: &Arc<AppState>, player_id: &str, msg: ClientMessage) {
    match msg {
        ClientMessage::CreateRoom { game_type, variant, player_name, match_format } => {
            let code = generate_room_code();
            tracing::info!("Player {} ({}) creating room {} for game {} (variant: {:?})", player_id, player_name, code, game_type, variant);

            let format_val = match match_format.as_deref() {
                Some(format) => match normalize_match_format(format) {
                    Some(valid) => valid.to_string(),
                    None => {
                        state
                            .send_to(
                                player_id,
                                &ServerMessage::Error {
                                    message: "Invalid match format".into(),
                                },
                            )
                            .await;
                        return;
                    }
                },
                None => DEFAULT_MATCH_FORMAT.to_string(),
            };
            let player_count = state.registry.create(&game_type, variant.as_deref())
                .map(|g| g.player_count())
                .unwrap_or(2);

            let room = Room {
                code: code.clone(),
                game_type: game_type.clone(),
                variant: variant.clone(),
                match_format: format_val.clone(),
                players: vec![player_id.to_string()],
                game: None,
                started: false,
                scores: vec![0; player_count as usize],
                play_again_votes: vec![false; player_count as usize],
            };

            state.rooms.write().await.insert(code.clone(), room);
            state
                .player_rooms
                .write()
                .await
                .insert(player_id.to_string(), code.clone());
            state
                .player_numbers
                .write()
                .await
                .insert(player_id.to_string(), 0);
            state
                .player_names
                .write()
                .await
                .insert(player_id.to_string(), player_name.clone());

            state
                .send_to(
                    player_id,
                    &ServerMessage::RoomCreated {
                        room_code: code,
                        game_type,
                        variant,
                        match_format: format_val,
                        player_count,
                    },
                )
                .await;
            state.broadcast_current_presence_for_player(player_id).await;
        }

        ClientMessage::JoinRoom { room_code, player_name } => {
            tracing::info!("Player {} ({}) attempting to join room {}", player_id, player_name, room_code);

            // Extract room info under write lock, then release lock before sending
            let join_result = {
                let mut rooms = state.rooms.write().await;
                match rooms.get_mut(&room_code) {
                    None => {
                        tracing::warn!("Room {} not found", room_code);
                        Err("Room not found".to_string())
                    }
                    Some(room) if room.players.len() >= room.scores.len() => {
                        tracing::warn!("Room {} is full", room_code);
                        Err("Room is full".to_string())
                    }
                    Some(room) => {
                        let is_rejoining_started_game = room.started && room.game.is_some() && room.players.len() < room.scores.len();

                        let player_num = if is_rejoining_started_game {
                            let player_numbers = state.player_numbers.read().await;
                            let occupied: std::collections::HashSet<u8> = room.players
                                .iter()
                                .filter_map(|pid| player_numbers.get(pid).copied())
                                .collect();
                            let expected = room.scores.len() as u8;
                            let free_num = (0..expected).find(|n| !occupied.contains(n)).unwrap_or(0);
                            
                            let mut players_with_nums: Vec<(String, u8)> = room.players
                                .iter()
                                .map(|pid| (pid.clone(), player_numbers.get(pid).copied().unwrap_or(0)))
                                .collect();
                            players_with_nums.push((player_id.to_string(), free_num));
                            players_with_nums.sort_by_key(|&(_, num)| num);
                            room.players = players_with_nums.into_iter().map(|(pid, _)| pid).collect();
                            
                            free_num
                        } else {
                            room.players.push(player_id.to_string());
                            (room.players.len() - 1) as u8
                        };

                        let players = room.players.clone();
                        let game_type_str = room.game_type.clone();
                        let variant_str = room.variant.clone();
                        let match_format_str = room.match_format.clone();
                        let scores = room.scores.clone();

                        let mut pnames_vec = vec![String::new(); players.len()];
                        {
                            let pnames = state.player_names.read().await;
                            for (idx, pid) in players.iter().enumerate() {
                                if pid == player_id {
                                    pnames_vec[idx] = player_name.clone();
                                } else {
                                    pnames_vec[idx] = pnames.get(pid).cloned().unwrap_or_else(|| "Unknown".to_string());
                                }
                            }
                        }

                        let start_messages = if is_rejoining_started_game {
                            room.game
                                .as_ref()
                                .map(|game| build_game_start_messages(game.as_ref(), &players, &pnames_vec, scores.clone(), &game_type_str, &variant_str, &match_format_str))
                                .unwrap_or_default()
                        } else if room.players.len() == room.scores.len() {
                            let game = state.registry.create(&game_type_str, variant_str.as_deref());
                            match game {
                                Some(g) => {
                                    room.game = Some(g);
                                    room.started = true;
                                    room.game
                                        .as_ref()
                                        .map(|game| build_game_start_messages(game.as_ref(), &players, &pnames_vec, scores.clone(), &game_type_str, &variant_str, &match_format_str))
                                        .unwrap_or_default()
                                }
                                None => Vec::new(),
                            }
                        } else {
                            Vec::new()
                        };

                        if is_rejoining_started_game {
                            tracing::info!("Player {} ({}) rejoined running room {} as player {}", player_id, player_name, room_code, player_num);
                        }

                        Ok((player_num, players, room_code.clone(), start_messages, game_type_str, variant_str, match_format_str, scores))
                    }
                }
            };
            // Lock released

            match join_result {
                Err(msg) => {
                    state
                        .send_to(player_id, &ServerMessage::Error { message: msg })
                        .await;
                }
                Ok((player_num, players, code, start_messages, game_type_str, variant_str, match_format_str, scores)) => {
                    // Register mappings
                    state.player_rooms.write().await
                        .insert(player_id.to_string(), code.clone());
                    state.player_numbers.write().await
                        .insert(player_id.to_string(), player_num);
                    state.player_names.write().await
                        .insert(player_id.to_string(), player_name.clone());

                    tracing::info!("Player {} ({}) joined room {} as player {}", player_id, player_name, code, player_num);

                    // Send existing players' info to the new joiner
                    {
                        let pnames = state.player_names.read().await;
                        let pnums = state.player_numbers.read().await;
                        for existing_pid in &players {
                            if existing_pid != player_id {
                                if let (Some(name), Some(num)) = (pnames.get(existing_pid), pnums.get(existing_pid)) {
                                    let existing_msg = ServerMessage::PlayerJoined {
                                        player_id: existing_pid.to_string(),
                                        player_number: *num,
                                        player_name: name.clone(),
                                        game_type: game_type_str.clone(),
                                        variant: variant_str.clone(),
                                        match_format: match_format_str.clone(),
                                        player_count: scores.len() as u8,
                                    };
                                    state.send_to(player_id, &existing_msg).await;
                                }
                            }
                        }
                    }

                    // Notify all players about the new joiner
                    let join_msg = ServerMessage::PlayerJoined {
                        player_id: player_id.to_string(),
                        player_number: player_num,
                        player_name: player_name.clone(),
                        game_type: game_type_str.clone(),
                        variant: variant_str.clone(),
                        match_format: match_format_str,
                        player_count: scores.len() as u8,
                    };
                    state.send_to_players(&players, &join_msg).await;

                    // Start game if ready
                    if !start_messages.is_empty() {
                        tracing::info!("Game starting in room {}", code);
                        for (pid, msg) in &start_messages {
                            state.send_to(pid, msg).await;
                        }
                    }
                    state.accept_invite_for_join(player_id, &code).await;
                    state.broadcast_current_presence_for_player(player_id).await;
                }
            }
        }

        ClientMessage::GameAction { action } => {
            let room_code = {
                let pr = state.player_rooms.read().await;
                pr.get(player_id).cloned()
            };

            let player_num = {
                let pn = state.player_numbers.read().await;
                pn.get(player_id).copied().unwrap_or(0)
            };

            if let Some(code) = room_code {
                // Process action under lock, collect messages to send
                let messages_to_send = {
                    let mut rooms = state.rooms.write().await;
                    if let Some(room) = rooms.get_mut(&code) {
                        if let Some(ref mut game) = room.game {
                            let players = room.players.clone();
                            let result = game.process_action(player_num, action, &players);

                            match result {
                                Ok(msgs) => {
                                    // Also check for game over
                                    let over = game.check_game_over();
                                    let mut all_msgs = msgs;
                                    if let Some(mut over_msg) = over {
                                        // Update scores if there's a winner
                                        if let ServerMessage::GameOver { winner: Some(ref winner_str), .. } = over_msg {
                                            if winner_str.starts_with("Player ") {
                                                if let Ok(num) = winner_str["Player ".len()..].parse::<usize>() {
                                                    if num > 0 && num <= room.scores.len() {
                                                        room.scores[num - 1] += 1;
                                                    }
                                                }
                                            }
                                        }
                                        
                                        // Handle match format custom overrides
                                        if room.match_format == "series_5" {
                                            if let ServerMessage::GameOver { ref mut reason, .. } = over_msg {
                                                if room.scores.iter().any(|&s| s >= 3) {
                                                    *reason = "SeriesCompleted".to_string();
                                                } else {
                                                    *reason = "MatchCompleted".to_string();
                                                }
                                            }
                                        }
                                        
                                        for pid in &players {
                                            all_msgs.push((pid.clone(), over_msg.clone()));
                                        }
                                    }
                                    all_msgs
                                }
                                Err(err) => {
                                    vec![(player_id.to_string(), ServerMessage::Error { message: err })]
                                }
                            }
                        } else {
                            vec![(player_id.to_string(), ServerMessage::Error {
                                message: "Game not started yet".into()
                            })]
                        }
                    } else {
                        vec![(player_id.to_string(), ServerMessage::Error {
                            message: "Room not found".into()
                        })]
                    }
                };
                // Lock released — now send all messages
                for (pid, msg) in &messages_to_send {
                    state.send_to(pid, msg).await;
                }
            } else {
                state
                    .send_to(player_id, &ServerMessage::Error {
                        message: "You are not in a room".into()
                    })
                    .await;
            }
        }
        ClientMessage::LeaveRoom => {
            tracing::info!("Player {} explicitly leaving room", player_id);
            state.remove_player(player_id).await;
        }
        ClientMessage::SendEmoji { emoji } => {
            let room_code = {
                let pr = state.player_rooms.read().await;
                pr.get(player_id).cloned()
            };
            if let Some(code) = room_code {
                let mut players_to_notify = vec![];
                {
                    let rooms = state.rooms.read().await;
                    if let Some(room) = rooms.get(&code) {
                        players_to_notify = room.players.clone();
                    }
                }
                let msg = ServerMessage::EmojiSent {
                    player_id: player_id.to_string(),
                    emoji,
                };
                state.send_to_players(&players_to_notify, &msg).await;
            }
        }
        ClientMessage::RequestPlayAgain => {
            let room_code = {
                let pr = state.player_rooms.read().await;
                pr.get(player_id).cloned()
            };

            let player_num = {
                let pn = state.player_numbers.read().await;
                pn.get(player_id).copied().unwrap_or(0)
            };

            if let Some(code) = room_code {
                let messages_to_send = {
                    let mut rooms = state.rooms.write().await;
                    if let Some(room) = rooms.get_mut(&code) {
                        room.play_again_votes[player_num as usize] = true;
                        
                        if room.play_again_votes.iter().all(|&v| v) {
                            // All voted yes, restart game
                            for vote in room.play_again_votes.iter_mut() {
                                *vote = false;
                            }
                            if let Some(ref mut game) = room.game {
                                if room.match_format == "series_5" && room.scores.iter().any(|&s| s >= 3) {
                                    for score in room.scores.iter_mut() {
                                        *score = 0;
                                    }
                                }
                                let last_winner = game.last_winner();
                                game.reset_with_winner(last_winner);
                                let state_json = game.state_for_player(None);
                                let scores = room.scores.clone();
                                
                                let msg = ServerMessage::PlayAgainAccepted {
                                    game_state: state_json,
                                    scores,
                                };
                                
                                room.players.iter()
                                    .map(|pid| (pid.clone(), msg.clone()))
                                    .collect::<Vec<_>>()
                            } else {
                                vec![]
                            }
                        } else {
                            // Just notify others
                            let msg = ServerMessage::PlayAgainRequested { by_player: player_num };
                            room.players.iter()
                                .map(|pid| (pid.clone(), msg.clone()))
                                .collect::<Vec<_>>()
                        }
                    } else {
                        vec![]
                    }
                };
                
                for (pid, msg) in &messages_to_send {
                    state.send_to(pid, msg).await;
                }
            }
        }
        ClientMessage::SwitchVariant { variant } => {
            let room_code = {
                let pr = state.player_rooms.read().await;
                pr.get(player_id).cloned()
            };

            let player_num = {
                let pn = state.player_numbers.read().await;
                pn.get(player_id).copied().unwrap_or(0)
            };

            if player_num != 0 {
                state
                    .send_to(
                        player_id,
                        &ServerMessage::Error {
                            message: "Only the room creator can change variants".into(),
                        },
                    )
                    .await;
                return;
            }

            if let Some(code) = room_code {
                let messages_to_send = {
                    let mut rooms = state.rooms.write().await;
                    if let Some(room) = rooms.get_mut(&code) {
                        room.variant = Some(variant.clone());
                        for vote in room.play_again_votes.iter_mut() {
                            *vote = false;
                        }

                        if room.players.len() == room.scores.len() {
                            match state.registry.create(&room.game_type, room.variant.as_deref()) {
                                Some(game) => {
                                    let scores = room.scores.clone();
                                    room.game = Some(game);
                                    room.started = true;

                                    let mut pnames_vec = vec![String::new(); room.players.len()];
                                    {
                                        let pnames = state.player_names.read().await;
                                        for (idx, pid) in room.players.iter().enumerate() {
                                            pnames_vec[idx] = pnames.get(pid).cloned().unwrap_or_else(|| "Unknown".to_string());
                                        }
                                    }

                                    room.game
                                        .as_ref()
                                        .map(|game| build_game_start_messages(game.as_ref(), &room.players, &pnames_vec, scores, &room.game_type, &room.variant, &room.match_format))
                                        .unwrap_or_default()
                                }
                                None => vec![(
                                    player_id.to_string(),
                                    ServerMessage::Error {
                                        message: "Unable to switch to that variant".into(),
                                    },
                                )],
                            }
                        } else {
                            room.game = None;
                            room.started = false;

                            vec![(
                                player_id.to_string(),
                                ServerMessage::RoomCreated {
                                    room_code: code.clone(),
                                    game_type: room.game_type.clone(),
                                    variant: room.variant.clone(),
                                    match_format: room.match_format.clone(),
                                    player_count: room.scores.len() as u8,
                                },
                            )]
                        }
                    } else {
                        vec![(
                            player_id.to_string(),
                            ServerMessage::Error {
                                message: "Room not found".into(),
                            },
                        )]
                    }
                };

                for (pid, msg) in &messages_to_send {
                    state.send_to(pid, msg).await;
                }
            } else {
                state
                    .send_to(
                        player_id,
                        &ServerMessage::Error {
                            message: "You are not in a room".into(),
                        },
                    )
                    .await;
            }
        }
        ClientMessage::SetMatchFormat { format } => {
            let normalized_format = match normalize_match_format(&format) {
                Some(valid) => valid.to_string(),
                None => {
                    state
                        .send_to(
                            player_id,
                            &ServerMessage::Error {
                                message: "Invalid match format".into(),
                            },
                        )
                        .await;
                    return;
                }
            };
            let room_code = {
                let pr = state.player_rooms.read().await;
                pr.get(player_id).cloned()
            };

            let player_num = {
                let pn = state.player_numbers.read().await;
                pn.get(player_id).copied().unwrap_or(0)
            };

            if player_num != 0 {
                state
                    .send_to(
                        player_id,
                        &ServerMessage::Error {
                            message: "Only the room creator can change the match format".into(),
                        },
                    )
                    .await;
                return;
            }

            if let Some(code) = room_code {
                let messages_to_send = {
                    let mut rooms = state.rooms.write().await;
                    if let Some(room) = rooms.get_mut(&code) {
                        room.match_format = normalized_format.clone();
                        let msg = ServerMessage::MatchFormatChanged { format: normalized_format.clone() };
                        room.players.iter()
                            .map(|pid| (pid.clone(), msg.clone()))
                            .collect::<Vec<_>>()
                    } else {
                        vec![(
                            player_id.to_string(),
                            ServerMessage::Error {
                                message: "Room not found".into(),
                            },
                        )]
                    }
                };

                for (pid, msg) in &messages_to_send {
                    state.send_to(pid, msg).await;
                }
            } else {
                state
                    .send_to(
                        player_id,
                        &ServerMessage::Error {
                            message: "You are not in a room".into(),
                        },
                    )
                    .await;
            }
        }
        ClientMessage::Identify { token } => {
            let claims = match verify_identity_token(&token) {
                Ok(claims) => claims,
                Err(message) => {
                    state
                        .send_to(player_id, &ServerMessage::Error { message })
                        .await;
                    return;
                }
            };
            let user_id = claims.sub;
            let user_name = claims.name;

            state.player_users.write().await.insert(player_id.to_string(), user_id.clone());
            state.user_names.write().await.insert(user_id.clone(), user_name.clone());
            state.presence_disconnect_versions.write().await.remove(&user_id);
            state
                .player_names
                .write()
                .await
                .entry(player_id.to_string())
                .or_insert(user_name);
            
            // Scope the write lock so it's dropped before we re-read user_connections below
            {
                let mut conns = state.user_connections.write().await;
                let vec = conns.entry(user_id.clone()).or_insert_with(Vec::new);
                if !vec.contains(&player_id.to_string()) {
                    vec.push(player_id.to_string());
                }
            }

            let current_room = state.player_rooms.read().await.get(player_id).cloned();

            let mut subscribers = Vec::new();
            {
                let subscriptions = state.presence_subscriptions.read().await;
                for (sub_uid, friends) in subscriptions.iter() {
                    if friends.contains(&user_id) {
                        subscribers.push(sub_uid.clone());
                    }
                }
            }

            let mut subscriber_pids = Vec::new();
            {
                let conns_read = state.user_connections.read().await;
                for sub_uid in subscribers {
                    if let Some(pids) = conns_read.get(&sub_uid) {
                        subscriber_pids.extend(pids.clone());
                    }
                }
            }

            let msg = ServerMessage::PresenceUpdate {
                user_id: user_id.clone(),
                online: true,
                current_room,
            };
            state.send_to_players(&subscriber_pids, &msg).await;
        }
        ClientMessage::SubscribePresence { friend_ids } => {
            let user_id = {
                let player_users = state.player_users.read().await;
                player_users.get(player_id).cloned()
            };

            if let Some(uid) = user_id {
                {
                    let mut subscriptions = state.presence_subscriptions.write().await;
                    let entry = subscriptions.entry(uid.clone()).or_insert_with(std::collections::HashSet::new);
                    for fid in &friend_ids {
                        entry.insert(fid.clone());
                    }
                }

                let conns = state.user_connections.read().await;
                let player_rooms = state.player_rooms.read().await;

                for fid in friend_ids {
                    let online = conns.contains_key(&fid);
                    let current_room = if online {
                        conns.get(&fid)
                            .and_then(|pids| pids.first())
                            .and_then(|pid| player_rooms.get(pid).cloned())
                    } else {
                        None
                    };

                    state.send_to(
                        player_id,
                        &ServerMessage::PresenceUpdate {
                            user_id: fid,
                            online,
                            current_room,
                        },
                    )
                    .await;
                }
            }
        }
        ClientMessage::SendGameInvite { to_user_id, game_type, variant, grant } => {
            let from_user_id = match state.player_users.read().await.get(player_id).cloned() {
                Some(user_id) => user_id,
                None => {
                    state
                        .send_to(
                            player_id,
                            &ServerMessage::GameInviteFailed {
                                message: "Identify before sending invites".into(),
                            },
                        )
                        .await;
                    return;
                }
            };

            let grant_claims = match verify_invite_grant(&grant) {
                Ok(claims) => claims,
                Err(message) => {
                    state
                        .send_to(player_id, &ServerMessage::GameInviteFailed { message })
                        .await;
                    return;
                }
            };

            if grant_claims.from_user_id != from_user_id
                || grant_claims.to_user_id != to_user_id
                || grant_claims.game_type != game_type
                || grant_claims.variant != variant
            {
                state
                    .send_to(
                        player_id,
                        &ServerMessage::GameInviteFailed {
                            message: "Invite grant mismatch".into(),
                        },
                    )
                    .await;
                return;
            }

            let target_pids = {
                let conns = state.user_connections.read().await;
                conns.get(&to_user_id).cloned()
            };
            let Some(target_pids) = target_pids else {
                state
                    .send_to(
                        player_id,
                        &ServerMessage::GameInviteFailed {
                            message: "Friend is offline".into(),
                        },
                    )
                    .await;
                return;
            };

            let player_count = match state.registry.create(&game_type, variant.as_deref()) {
                Some(game) => game.player_count(),
                None => {
                    state
                        .send_to(
                            player_id,
                            &ServerMessage::GameInviteFailed {
                                message: "Unknown game type".into(),
                            },
                        )
                        .await;
                    return;
                }
            };

            let player_display_name = state.player_names.read().await.get(player_id).cloned();
            let from_name = state
                .user_names
                .read()
                .await
                .get(&from_user_id)
                .cloned()
                .or(player_display_name)
                .unwrap_or_else(|| "Friend".into());

            let room_code = {
                let pr = state.player_rooms.read().await;
                pr.get(player_id).cloned()
            };

            let final_room_code = match room_code {
                Some(code) => code,
                None => {
                    let code = generate_room_code();

                    let room = Room {
                        code: code.clone(),
                        game_type: game_type.clone(),
                        variant: variant.clone(),
                        match_format: "single".to_string(),
                        players: vec![player_id.to_string()],
                        game: None,
                        started: false,
                        scores: vec![0; player_count as usize],
                        play_again_votes: vec![false; player_count as usize],
                    };

                    state.rooms.write().await.insert(code.clone(), room);
                    state.player_rooms.write().await.insert(player_id.to_string(), code.clone());
                    state.player_numbers.write().await.insert(player_id.to_string(), 0);
                    
                    state.send_to(
                        player_id,
                        &ServerMessage::RoomCreated {
                            room_code: code.clone(),
                            game_type: game_type.clone(),
                            variant: variant.clone(),
                            match_format: "single".to_string(),
                            player_count,
                        },
                    )
                    .await;

                    code
                }
            };

            let invite_id = {
                use rand::Rng;
                let mut rng = rand::thread_rng();
                let val: u64 = rng.gen();
                format!("{:x}", val)
            };

            let expires_at_ms = now_ms() + INVITE_TTL_MS;
            state.active_invites.write().await.insert(
                invite_id.clone(),
                GameInviteRecord {
                    invite_id: invite_id.clone(),
                    from_user_id: from_user_id.clone(),
                    to_user_id: to_user_id.clone(),
                    room_code: final_room_code.clone(),
                    game_type: game_type.clone(),
                    variant: variant.clone(),
                    expires_at_ms,
                },
            );
            state.schedule_invite_expiry(invite_id.clone(), expires_at_ms).await;
            
            let invite_msg = ServerMessage::GameInviteReceived {
                invite_id: invite_id.clone(),
                from_user_id,
                from_name,
                game_type,
                variant,
                room_code: final_room_code,
            };

            state.send_to_players(&target_pids, &invite_msg).await;
            if let ServerMessage::GameInviteReceived { room_code, .. } = &invite_msg {
                state
                    .send_to(
                        player_id,
                        &ServerMessage::GameInviteSent {
                            invite_id,
                            room_code: room_code.clone(),
                        },
                    )
                    .await;
            }
        }
        ClientMessage::DeclineGameInvite { invite_id } => {
            let to_user_id = match state.player_users.read().await.get(player_id).cloned() {
                Some(user_id) => user_id,
                None => {
                    state
                        .send_to(
                            player_id,
                            &ServerMessage::Error {
                                message: "Identify before declining invites".into(),
                            },
                        )
                        .await;
                    return;
                }
            };

            let invite = {
                let mut invites = state.active_invites.write().await;
                invites.remove(&invite_id)
            };
            let Some(invite) = invite else {
                state
                    .send_to(
                        player_id,
                        &ServerMessage::Error {
                            message: "Invite not found".into(),
                        },
                    )
                    .await;
                return;
            };

            if invite.to_user_id != to_user_id || invite.expires_at_ms < now_ms() {
                state
                    .send_to(
                        player_id,
                        &ServerMessage::Error {
                            message: "Invite expired".into(),
                        },
                    )
                    .await;
                return;
            }

            let player_display_name = state.player_names.read().await.get(player_id).cloned();
            let from_name = state
                .user_names
                .read()
                .await
                .get(&to_user_id)
                .cloned()
                .or(player_display_name)
                .unwrap_or_else(|| "Friend".into());

            let decl_msg = ServerMessage::GameInviteDeclined {
                invite_id,
                from_name,
            };

            let inviter_pids = {
                let conns = state.user_connections.read().await;
                conns.get(&invite.from_user_id).cloned()
            };

            if let Some(pids) = inviter_pids {
                state.send_to_players(&pids, &decl_msg).await;
            }
        }
    }
}

fn build_game_start_messages(
    game: &dyn Game,
    players: &[String],
    player_names: &[String],
    scores: Vec<u32>,
    game_type: &str,
    variant: &Option<String>,
    match_format: &str,
) -> Vec<(String, ServerMessage)> {
    let players_info: Vec<crate::protocol::PlayerInfo> = players
        .iter()
        .enumerate()
        .map(|(idx, pid)| crate::protocol::PlayerInfo {
            player_id: pid.clone(),
            player_number: idx as u8,
            player_name: player_names.get(idx).cloned().unwrap_or_else(|| "Unknown".to_string()),
        })
        .collect();

    players
        .iter()
        .enumerate()
        .map(|(idx, pid)| {
            (
                pid.clone(),
                ServerMessage::GameStart {
                    game_state: game.state_for_player(Some(idx as u8)),
                    scores: scores.clone(),
                    game_type: game_type.to_string(),
                    variant: variant.clone(),
                    match_format: match_format.to_string(),
                    players: players_info.clone(),
                },
            )
        })
        .collect()
}
#[cfg(test)]
mod tests {
    use super::{handle_message, now_ms, AppState, GameInviteRecord, Room};
    use crate::game_registry::GameRegistry;
    use crate::game_trait::Game;
    use crate::games::{
        shut_the_box::ShutTheBoxGame,
        tic_tac_toe::TicTacToeGame,
        higher_lower::HigherLowerGame,
    };
    use crate::protocol::{ClientMessage, ServerMessage};
    use jsonwebtoken::{encode, EncodingKey, Header};
    use serde::Serialize;
    use std::sync::Arc;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn players() -> Vec<String> {
        vec!["p1".to_string(), "p2".to_string()]
    }

    #[derive(Serialize)]
    struct IdentityTestClaims<'a> {
        kind: &'a str,
        sub: &'a str,
        name: &'a str,
        image: Option<&'a str>,
        exp: usize,
    }

    #[derive(Serialize)]
    struct InviteGrantTestClaims<'a> {
        kind: &'a str,
        from_user_id: &'a str,
        to_user_id: &'a str,
        game_type: &'a str,
        variant: Option<&'a str>,
        exp: usize,
    }

    fn test_exp() -> usize {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as usize
            + 60
    }

    fn identity_token(user_id: &str, name: &str) -> String {
        encode(
            &Header::default(),
            &IdentityTestClaims {
                kind: "identity",
                sub: user_id,
                name,
                image: None,
                exp: test_exp(),
            },
            &EncodingKey::from_secret(b"online-multi-games-dev-social-secret"),
        )
        .unwrap()
    }

    fn invite_grant(from_user_id: &str, to_user_id: &str, game_type: &str, variant: Option<&str>) -> String {
        encode(
            &Header::default(),
            &InviteGrantTestClaims {
                kind: "invite",
                from_user_id,
                to_user_id,
                game_type,
                variant,
                exp: test_exp(),
            },
            &EncodingKey::from_secret(b"online-multi-games-dev-social-secret"),
        )
        .unwrap()
    }

    #[test]
    fn create_game_builds_requested_variant() {
        let registry = GameRegistry::new();
        let game = registry.create("tic_tac_toe", Some("joker")).unwrap();
        let state = game.state_for_player(None);
        assert_eq!(state["variant"], "joker");
        assert!(registry.create("unknown", None).is_none());
    }

    #[test]
    fn reset_game_skips_toss_for_previous_tic_tac_toe_winner() {
        let mut inner = TicTacToeGame::new_variant("classic");
        inner.winner = Some(1);
        inner.game_over = true;
        inner.board[0] = Some(1);

        let mut game: Box<dyn Game> = Box::new(inner);
        game.reset_with_winner(Some(1));

        let state = game.state_for_player(None);
        assert_eq!(state["xPlayer"], 1);
        assert_eq!(state["currentPlayer"], 1);
        assert_eq!(state["coinTossed"], true);
        assert!(state["board"].as_array().unwrap().iter().all(|cell| cell.is_null()));
    }

    #[test]
    fn process_action_code_guess_sends_individualized_views() {
        let registry = GameRegistry::new();
        let mut game = registry.create("code_guess", None).unwrap();
        let messages = game.process_action(
            0,
            serde_json::json!({
                "game": "CodeGuess",
                "guess": "1234"
            }),
            &players(),
        )
        .unwrap();

        assert_eq!(messages.len(), 2);

        let first = &messages[0];
        let second = &messages[1];

        match (&first.1, &second.1) {
            (ServerMessage::GameUpdate { game_state: first_state }, ServerMessage::GameUpdate { game_state: second_state }) => {
                assert_eq!(first_state["myCodeSet"], true);
                assert_eq!(second_state["myCodeSet"], false);
            }
            _ => panic!("expected game updates"),
        }
    }

    #[test]
    fn process_action_stop_clock_ready_broadcasts_same_state() {
        let registry = GameRegistry::new();
        let mut game = registry.create("stop_clock", None).unwrap();
        let messages = game.process_action(
            0,
            serde_json::json!({
                "game": "StopClock",
                "stopped_at_ms": 0
            }),
            &players(),
        )
        .unwrap();

        assert_eq!(messages.len(), 2);
        match &messages[0].1 {
            ServerMessage::GameUpdate { game_state } => {
                assert_eq!(game_state["playerReady"][0], true);
                assert_eq!(game_state["bothReady"], false);
            }
            _ => panic!("expected broadcast update"),
        }
    }

    #[test]
    fn process_action_shut_the_box_player_two_pushes_back_matching_opponent_card() {
        let inner = ShutTheBoxGame {
            player1_cards: [false, false, false, true, false, false],
            player2_cards: [false, false, false, false, false, false],
            current_player: 1,
            last_roll: Some(4),
            needs_roll: false,
            winner: None,
            game_over: false,
        };
        let mut game: Box<dyn Game> = Box::new(inner);

        let messages = game.process_action(
            1,
            serde_json::json!({
                "game": "ShutTheBox",
                "combination": vec![4],
                "target": "self"
            }),
            &players(),
        )
        .unwrap();

        assert_eq!(messages.len(), 2);

        match &messages[0].1 {
            ServerMessage::GameUpdate { game_state } => {
                assert_eq!(game_state["player1Cards"][3], false);
                assert_eq!(game_state["player2Cards"][3], true);
                assert_eq!(game_state["currentPlayer"], 0);
                assert_eq!(game_state["needsRoll"], true);
            }
            _ => panic!("expected broadcast update"),
        }
    }

    #[test]
    fn process_action_shut_the_box_pass_target_ends_turn_after_roll() {
        let inner = ShutTheBoxGame {
            player1_cards: [false, true, false, false, false, false],
            player2_cards: [false, false, false, false, false, false],
            current_player: 0,
            last_roll: Some(2),
            needs_roll: false,
            winner: None,
            game_over: false,
        };
        let mut game: Box<dyn Game> = Box::new(inner);

        let messages = game.process_action(
            0,
            serde_json::json!({
                "game": "ShutTheBox",
                "combination": Vec::<u8>::new(),
                "target": "pass"
            }),
            &players(),
        )
        .unwrap();

        assert_eq!(messages.len(), 2);

        match &messages[0].1 {
            ServerMessage::GameUpdate { game_state } => {
                assert_eq!(game_state["currentPlayer"], 1);
                assert_eq!(game_state["needsRoll"], true);
                assert_eq!(game_state["lastRoll"], serde_json::Value::Null);
            }
            _ => panic!("expected broadcast update"),
        }
    }

    #[test]
    fn broadcast_same_duplicates_state_for_each_player() {
        let state = serde_json::json!({ "value": 7 });
        let messages = crate::game_trait::broadcast_same(&players(), state.clone());

        assert_eq!(messages.len(), 2);
        for (player_id, message) in messages {
            assert!(player_id == "p1" || player_id == "p2");
            match message {
                ServerMessage::GameUpdate { game_state } => assert_eq!(game_state, state),
                _ => panic!("expected game update"),
            }
        }
    }

    #[test]
    fn check_game_over_formats_winner_name() {
        let mut inner = HigherLowerGame::new_variant("classic");
        inner.winner = Some(1);
        inner.game_over = true;
        let game: Box<dyn Game> = Box::new(inner);

        let message = game.check_game_over().unwrap();

        match message {
            ServerMessage::GameOver { winner, reason } => {
                assert_eq!(winner, Some("Player 2".into()));
                assert_eq!(reason, "Number guessed correctly!");
            }
            _ => panic!("expected game over message"),
        }
    }

    #[tokio::test]
    async fn join_room_reconnects_player_one_without_resetting_game() {
        let state = Arc::new(AppState::new());
        let mut game = TicTacToeGame::new_variant("classic");
        game.coin_tossed = true;
        game.x_player = Some(0);
        game.current_player = 1;
        game.board[0] = Some(0);

        state.rooms.write().await.insert(
            "ROOM42".into(),
            Room {
                code: "ROOM42".into(),
                game_type: "tic_tac_toe".into(),
                variant: Some("classic".into()),
                match_format: "single".into(),
                players: vec!["p1".into()],
                game: Some(Box::new(game)),
                started: true,
                scores: vec![2, 1],
                play_again_votes: vec![false, false],
            },
        );
        state.player_rooms.write().await.insert("p1".into(), "ROOM42".into());
        state.player_numbers.write().await.insert("p1".into(), 0);
        state.player_names.write().await.insert("p1".into(), "Alex".into());

        handle_message(
            &state,
            "p2",
            ClientMessage::JoinRoom {
                room_code: "ROOM42".into(),
                player_name: "Blair".into(),
            },
        )
        .await;

        assert_eq!(state.player_numbers.read().await.get("p2").copied(), Some(1));

        let rooms = state.rooms.read().await;
        let room = rooms.get("ROOM42").unwrap();
        assert_eq!(room.players, vec!["p1".to_string(), "p2".to_string()]);
        assert_eq!(room.scores, vec![2, 1]);

        let state_val = room.game.as_ref().unwrap().state_for_player(None);
        assert_eq!(state_val["board"][0], 0);
        assert_eq!(state_val["currentPlayer"], 1);
        assert_eq!(state_val["coinTossed"], true);
    }

    #[tokio::test]
    async fn join_room_reconnects_creator_to_player_zero_seat() {
        let state = Arc::new(AppState::new());
        let mut game = TicTacToeGame::new_variant("disappearing");
        game.coin_tossed = true;
        game.x_player = Some(1);
        game.current_player = 0;
        game.board[4] = Some(1);

        state.rooms.write().await.insert(
            "ROOM42".into(),
            Room {
                code: "ROOM42".into(),
                game_type: "tic_tac_toe".into(),
                variant: Some("disappearing".into()),
                match_format: "single".into(),
                players: vec!["p2".into()],
                game: Some(Box::new(game)),
                started: true,
                scores: vec![0, 3],
                play_again_votes: vec![false, false],
            },
        );
        state.player_rooms.write().await.insert("p2".into(), "ROOM42".into());
        state.player_numbers.write().await.insert("p2".into(), 1);
        state.player_names.write().await.insert("p2".into(), "Blair".into());

        handle_message(
            &state,
            "p1-return",
            ClientMessage::JoinRoom {
                room_code: "ROOM42".into(),
                player_name: "Alex".into(),
            },
        )
        .await;

        assert_eq!(state.player_numbers.read().await.get("p1-return").copied(), Some(0));

        let rooms = state.rooms.read().await;
        let room = rooms.get("ROOM42").unwrap();
        assert_eq!(room.players, vec!["p1-return".to_string(), "p2".to_string()]);
        assert_eq!(room.scores, vec![0, 3]);

        let state_val = room.game.as_ref().unwrap().state_for_player(None);
        assert_eq!(state_val["board"][4], 1);
        assert_eq!(state_val["currentPlayer"], 0);
        assert_eq!(state_val["coinTossed"], true);
    }

    #[tokio::test]
    async fn switch_variant_updates_waiting_room_without_leaving_it() {
        let state = Arc::new(AppState::new());

        state.rooms.write().await.insert(
            "ROOM42".into(),
            Room {
                code: "ROOM42".into(),
                game_type: "tic_tac_toe".into(),
                variant: Some("classic".into()),
                match_format: "single".into(),
                players: vec!["p1".into()],
                game: None,
                started: false,
                scores: vec![3, 1],
                play_again_votes: vec![false, false],
            },
        );
        state.player_rooms.write().await.insert("p1".into(), "ROOM42".into());
        state.player_numbers.write().await.insert("p1".into(), 0);

        handle_message(
            &state,
            "p1",
            ClientMessage::SwitchVariant {
                variant: "joker".into(),
            },
        )
        .await;

        let rooms = state.rooms.read().await;
        let room = rooms.get("ROOM42").unwrap();
        assert_eq!(room.variant.as_deref(), Some("joker"));
        assert!(!room.started);
        assert!(room.game.is_none());
        assert_eq!(room.scores, vec![3, 1]);
    }

    #[tokio::test]
    async fn switch_variant_recreates_running_game_for_same_players() {
        let state = Arc::new(AppState::new());
        let game = state.registry.create("tic_tac_toe", Some("classic"));

        state.rooms.write().await.insert(
            "ROOM42".into(),
            Room {
                code: "ROOM42".into(),
                game_type: "tic_tac_toe".into(),
                variant: Some("classic".into()),
                match_format: "single".into(),
                players: vec!["p1".into(), "p2".into()],
                game,
                started: true,
                scores: vec![4, 2],
                play_again_votes: vec![true, true],
            },
        );
        state.player_rooms.write().await.insert("p1".into(), "ROOM42".into());
        state.player_rooms.write().await.insert("p2".into(), "ROOM42".into());
        state.player_numbers.write().await.insert("p1".into(), 0);
        state.player_numbers.write().await.insert("p2".into(), 1);

        handle_message(
            &state,
            "p1",
            ClientMessage::SwitchVariant {
                variant: "gravity".into(),
            },
        )
        .await;

        let rooms = state.rooms.read().await;
        let room = rooms.get("ROOM42").unwrap();
        assert_eq!(room.variant.as_deref(), Some("gravity"));
        assert!(room.started);
        assert_eq!(room.play_again_votes, vec![false, false]);
        assert_eq!(room.scores, vec![4, 2]);

        let state_val = room.game.as_ref().unwrap().state_for_player(None);
        assert_eq!(state_val["variant"], "gravity");
    }

    #[tokio::test]
    async fn only_creator_can_switch_room_variant() {
        let state = Arc::new(AppState::new());
        let game = state.registry.create("tic_tac_toe", Some("classic"));

        state.rooms.write().await.insert(
            "ROOM42".into(),
            Room {
                code: "ROOM42".into(),
                game_type: "tic_tac_toe".into(),
                variant: Some("classic".into()),
                match_format: "single".into(),
                players: vec!["p1".into(), "p2".into()],
                game,
                started: true,
                scores: vec![1, 0],
                play_again_votes: vec![false, false],
            },
        );
        state.player_rooms.write().await.insert("p1".into(), "ROOM42".into());
        state.player_rooms.write().await.insert("p2".into(), "ROOM42".into());
        state.player_numbers.write().await.insert("p1".into(), 0);
        state.player_numbers.write().await.insert("p2".into(), 1);

        handle_message(
            &state,
            "p2",
            ClientMessage::SwitchVariant {
                variant: "joker".into(),
            },
        )
        .await;

        let rooms = state.rooms.read().await;
        let room = rooms.get("ROOM42").unwrap();
        assert_eq!(room.variant.as_deref(), Some("classic"));
        let state_val = room.game.as_ref().unwrap().state_for_player(None);
        assert_eq!(state_val["variant"], "classic");
    }

    #[tokio::test]
    async fn best_of_five_series_game_over_and_play_again() {
        let state = Arc::new(AppState::new());
        let game = state.registry.create("tic_tac_toe", Some("classic"));

        state.rooms.write().await.insert(
            "ROOM42".into(),
            Room {
                code: "ROOM42".into(),
                game_type: "tic_tac_toe".into(),
                variant: Some("classic".into()),
                match_format: "series_5".into(),
                players: vec!["p1".into(), "p2".into()],
                game,
                started: true,
                scores: vec![2, 0],
                play_again_votes: vec![false, false],
            },
        );
        state.player_rooms.write().await.insert("p1".into(), "ROOM42".into());
        state.player_rooms.write().await.insert("p2".into(), "ROOM42".into());
        state.player_numbers.write().await.insert("p1".into(), 0);
        state.player_numbers.write().await.insert("p2".into(), 1);

        // Check that starting a new match when score is 2-0 doesn't reset scores
        handle_message(&state, "p1", ClientMessage::RequestPlayAgain).await;
        handle_message(&state, "p2", ClientMessage::RequestPlayAgain).await;

        let rooms = state.rooms.read().await;
        let room = rooms.get("ROOM42").unwrap();
        assert_eq!(room.scores, vec![2, 0]); // scores should be preserved

        // Now let's set score to 3-0 (p1 wins)
        drop(rooms);
        {
            let mut rooms = state.rooms.write().await;
            let room = rooms.get_mut("ROOM42").unwrap();
            room.scores = vec![3, 0];
        }

        // Request play again at 3-0 should reset scores to 0-0
        handle_message(&state, "p1", ClientMessage::RequestPlayAgain).await;
        handle_message(&state, "p2", ClientMessage::RequestPlayAgain).await;

        let rooms = state.rooms.read().await;
        let room = rooms.get("ROOM42").unwrap();
        assert_eq!(room.scores, vec![0, 0]); // scores reset to 0-0
    }

    #[tokio::test]
    async fn create_room_rejects_invalid_match_format() {
        let state = Arc::new(AppState::new());

        handle_message(
            &state,
            "p1",
            ClientMessage::CreateRoom {
                game_type: "tic_tac_toe".into(),
                variant: Some("classic".into()),
                player_name: "Player 1".into(),
                match_format: Some("best_of_7".into()),
            },
        )
        .await;

        assert!(state.rooms.read().await.is_empty());
        assert!(state.player_rooms.read().await.is_empty());
        assert!(state.player_numbers.read().await.is_empty());
        assert!(state.player_names.read().await.is_empty());
    }

    #[tokio::test]
    async fn set_match_format_rejects_invalid_values() {
        let state = Arc::new(AppState::new());
        let game = state.registry.create("tic_tac_toe", Some("classic"));

        state.rooms.write().await.insert(
            "ROOM42".into(),
            Room {
                code: "ROOM42".into(),
                game_type: "tic_tac_toe".into(),
                variant: Some("classic".into()),
                match_format: "single".into(),
                players: vec!["p1".into(), "p2".into()],
                game,
                started: true,
                scores: vec![0, 0],
                play_again_votes: vec![false, false],
            },
        );
        state.player_rooms.write().await.insert("p1".into(), "ROOM42".into());
        state.player_numbers.write().await.insert("p1".into(), 0);

        handle_message(
            &state,
            "p1",
            ClientMessage::SetMatchFormat {
                format: "best_of_7".into(),
            },
        )
        .await;

        let rooms = state.rooms.read().await;
        let room = rooms.get("ROOM42").unwrap();
        assert_eq!(room.match_format, "single");
    }

    #[tokio::test]
    async fn test_social_identify_and_presence_flow() {
        let state = Arc::new(AppState::new());

        handle_message(
            &state,
            "conn1",
            ClientMessage::Identify {
                token: identity_token("user_a", "Alex"),
            },
        )
        .await;

        assert_eq!(state.player_users.read().await.get("conn1").unwrap(), "user_a");
        assert_eq!(state.user_connections.read().await.get("user_a").unwrap()[0], "conn1");

        handle_message(
            &state,
            "conn2",
            ClientMessage::Identify {
                token: identity_token("user_b", "Blair"),
            },
        )
        .await;

        handle_message(
            &state,
            "conn1",
            ClientMessage::SubscribePresence {
                friend_ids: vec!["user_b".into()],
            },
        )
        .await;

        assert!(state.presence_subscriptions.read().await.get("user_a").unwrap().contains("user_b"));
    }

    #[tokio::test]
    async fn test_social_game_invite_flow() {
        let state = Arc::new(AppState::new());

        // Identify user_a
        handle_message(
            &state,
            "conn1",
            ClientMessage::Identify {
                token: identity_token("user_a", "Alex"),
            },
        )
        .await;

        handle_message(
            &state,
            "conn2",
            ClientMessage::Identify {
                token: identity_token("user_b", "Blair"),
            },
        )
        .await;

        // Send game invite for tic_tac_toe to user_b
        handle_message(
            &state,
            "conn1",
            ClientMessage::SendGameInvite {
                to_user_id: "user_b".into(),
                game_type: "tic_tac_toe".into(),
                variant: Some("blind".into()),
                grant: invite_grant("user_a", "user_b", "tic_tac_toe", Some("blind")),
            },
        )
        .await;

        // Assert that a room has been created for the host
        let room_code = state.player_rooms.read().await.get("conn1").cloned().unwrap();
        let rooms = state.rooms.read().await;
        let room = rooms.get(&room_code).unwrap();
        assert_eq!(room.game_type, "tic_tac_toe");
        assert_eq!(room.variant, Some("blind".into()));
        assert_eq!(room.players[0], "conn1");
        assert_eq!(state.active_invites.read().await.len(), 1);
    }

    #[tokio::test]
    async fn invite_expiry_removes_due_record() {
        let state = Arc::new(AppState::new());
        state.active_invites.write().await.insert(
            "invite_1".into(),
            GameInviteRecord {
                invite_id: "invite_1".into(),
                from_user_id: "user_a".into(),
                to_user_id: "user_b".into(),
                room_code: "ROOM42".into(),
                game_type: "tic_tac_toe".into(),
                variant: None,
                expires_at_ms: now_ms() - 1,
            },
        );

        assert!(state.expire_invite_if_due("invite_1").await);
        assert!(state.active_invites.read().await.is_empty());
    }

    #[tokio::test]
    async fn joining_invited_room_accepts_and_removes_invite_record() {
        let state = Arc::new(AppState::new());
        state
            .player_users
            .write()
            .await
            .insert("conn2".into(), "user_b".into());
        state
            .user_names
            .write()
            .await
            .insert("user_b".into(), "Blair".into());
        state.active_invites.write().await.insert(
            "invite_1".into(),
            GameInviteRecord {
                invite_id: "invite_1".into(),
                from_user_id: "user_a".into(),
                to_user_id: "user_b".into(),
                room_code: "ROOM42".into(),
                game_type: "tic_tac_toe".into(),
                variant: Some("classic".into()),
                expires_at_ms: now_ms() + 60_000,
            },
        );

        let accepted = state.accept_invite_for_join("conn2", "ROOM42").await;

        assert!(accepted.is_some());
        assert!(state.active_invites.read().await.is_empty());
    }
}
