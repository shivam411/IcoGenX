use axum::extract::ws::{Message, WebSocket};
use futures::stream::SplitSink;
use futures::SinkExt;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::games::{
    code_guess::CodeGuessGame,
    higher_lower::HigherLowerGame,
    memory_flip::MemoryFlipGame,
    shut_the_box::ShutTheBoxGame,
    stop_clock::StopClockGame,
    tic_tac_toe::TicTacToeGame,
};
use crate::protocol::{ClientMessage, GameAction, ServerMessage};

/// The type of game being played
#[derive(Debug, Clone)]
pub enum GameInstance {
    TicTacToe(TicTacToeGame),
    ShutTheBox(ShutTheBoxGame),
    CodeGuess(CodeGuessGame),
    MemoryFlip(MemoryFlipGame),
    HigherLower(HigherLowerGame),
    StopClock(StopClockGame),
}

/// A game room with two players
#[derive(Debug, Clone)]
pub struct Room {
    pub code: String,
    pub game_type: String,
    pub players: Vec<String>,   // player IDs
    pub game: Option<GameInstance>,
    pub started: bool,
}

type Sender = SplitSink<WebSocket, Message>;

pub struct AppState {
    pub rooms: RwLock<HashMap<String, Room>>,
    pub player_rooms: RwLock<HashMap<String, String>>,        // player_id -> room_code
    pub player_numbers: RwLock<HashMap<String, u8>>,          // player_id -> 0 or 1
    pub senders: RwLock<HashMap<String, Arc<RwLock<Sender>>>>, // player_id -> ws sender
}

impl AppState {
    pub fn new() -> Self {
        AppState {
            rooms: RwLock::new(HashMap::new()),
            player_rooms: RwLock::new(HashMap::new()),
            player_numbers: RwLock::new(HashMap::new()),
            senders: RwLock::new(HashMap::new()),
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

    pub async fn remove_player(&self, player_id: &str) {
        self.senders.write().await.remove(player_id);

        let room_code = self.player_rooms.write().await.remove(player_id);
        self.player_numbers.write().await.remove(player_id);

        if let Some(code) = room_code {
            let remaining = {
                let mut rooms = self.rooms.write().await;
                if let Some(room) = rooms.get_mut(&code) {
                    room.players.retain(|p| p != player_id);
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
        ClientMessage::CreateRoom { game_type } => {
            let code = generate_room_code();
            tracing::info!("Player {} creating room {} for game {}", player_id, code, game_type);

            let room = Room {
                code: code.clone(),
                game_type: game_type.clone(),
                players: vec![player_id.to_string()],
                game: None,
                started: false,
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
                .send_to(
                    player_id,
                    &ServerMessage::RoomCreated {
                        room_code: code,
                        game_type,
                    },
                )
                .await;
        }

        ClientMessage::JoinRoom { room_code } => {
            tracing::info!("Player {} attempting to join room {}", player_id, room_code);

            // Extract room info under write lock, then release lock before sending
            let join_result = {
                let mut rooms = state.rooms.write().await;
                match rooms.get_mut(&room_code) {
                    None => {
                        tracing::warn!("Room {} not found", room_code);
                        Err("Room not found".to_string())
                    }
                    Some(room) if room.players.len() >= 2 => {
                        tracing::warn!("Room {} is full", room_code);
                        Err("Room is full".to_string())
                    }
                    Some(room) => {
                        room.players.push(player_id.to_string());
                        let player_num = (room.players.len() - 1) as u8;
                        let players = room.players.clone();
                        let game_type_str = room.game_type.clone();

                        // Start game if 2 players
                        let start_info = if room.players.len() == 2 {
                            let game = create_game(&game_type_str);
                            match game {
                                Some(g) => {
                                    let game_state = get_game_state(&g);
                                    room.game = Some(g);
                                    room.started = true;
                                    Some(game_state)
                                }
                                None => None,
                            }
                        } else {
                            None
                        };

                        Ok((player_num, players, room_code.clone(), start_info))
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
                Ok((player_num, players, code, start_info)) => {
                    // Register mappings
                    state.player_rooms.write().await
                        .insert(player_id.to_string(), code.clone());
                    state.player_numbers.write().await
                        .insert(player_id.to_string(), player_num);

                    tracing::info!("Player {} joined room {} as player {}", player_id, code, player_num);

                    // Notify all players about the join
                    let join_msg = ServerMessage::PlayerJoined {
                        player_id: player_id.to_string(),
                        player_number: player_num,
                    };
                    state.send_to_players(&players, &join_msg).await;

                    // Start game if ready
                    if let Some(game_state) = start_info {
                        tracing::info!("Game starting in room {}", code);
                        let start_msg = ServerMessage::GameStart {
                            game_state: game_state.clone(),
                        };
                        state.send_to_players(&players, &start_msg).await;
                    }
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
                            let result = process_action(game, player_num, action, &players);

                            match result {
                                Ok(msgs) => {
                                    // Also check for game over
                                    let over = check_game_over(game);
                                    let mut all_msgs = msgs;
                                    if let Some(over_msg) = over {
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
    }
}

fn create_game(game_type: &str) -> Option<GameInstance> {
    match game_type {
        "tic_tac_toe" => Some(GameInstance::TicTacToe(TicTacToeGame::new())),
        "shut_the_box" => Some(GameInstance::ShutTheBox(ShutTheBoxGame::new())),
        "code_guess" => Some(GameInstance::CodeGuess(CodeGuessGame::new())),
        "memory_flip" => Some(GameInstance::MemoryFlip(MemoryFlipGame::new())),
        "higher_lower" => Some(GameInstance::HigherLower(HigherLowerGame::new())),
        "stop_clock" => Some(GameInstance::StopClock(StopClockGame::new())),
        _ => None,
    }
}

fn get_game_state(game: &GameInstance) -> serde_json::Value {
    match game {
        GameInstance::TicTacToe(g) => g.state_json(),
        GameInstance::ShutTheBox(g) => g.state_json(),
        GameInstance::CodeGuess(g) => g.state_json(None),
        GameInstance::MemoryFlip(g) => g.state_json(),
        GameInstance::HigherLower(g) => g.state_json(),
        GameInstance::StopClock(g) => g.state_json(),
    }
}

/// Process a game action and return a list of (player_id, message) tuples.
/// This allows per-player state views (needed for CodeGuess).
fn process_action(
    game: &mut GameInstance,
    player: u8,
    action: GameAction,
    players: &[String],
) -> Result<Vec<(String, ServerMessage)>, String> {
    match (game, action) {
        (GameInstance::TicTacToe(g), GameAction::TicTacToe { cell }) => {
            g.make_move(player, cell)?;
            let state = g.state_json();
            Ok(broadcast_same(players, state))
        }

        (GameInstance::ShutTheBox(g), GameAction::ShutTheBox { combination, target }) => {
            if combination.is_empty() {
                let _roll = g.roll_dice(player)?;
            } else {
                g.apply_combination(player, &combination, &target)?;
            }
            let state = g.state_json();
            Ok(broadcast_same(players, state))
        }

        (GameInstance::CodeGuess(g), GameAction::CodeGuess { guess }) => {
            if !g.codes_set[player as usize] {
                g.set_code(player, &guess)?;
            } else {
                g.make_guess(player, &guess)?;
            }
            // Send each player their own view (hides opponent's secret code)
            let mut msgs = Vec::new();
            for (i, pid) in players.iter().enumerate() {
                let state = g.state_json(Some(i as u8));
                msgs.push((pid.clone(), ServerMessage::GameUpdate { game_state: state }));
            }
            Ok(msgs)
        }

        (GameInstance::MemoryFlip(g), GameAction::MemoryFlip { card_index }) => {
            g.flip_card(player, card_index)?;
            let state = g.state_json();
            Ok(broadcast_same(players, state))
        }

        (GameInstance::HigherLower(g), GameAction::HigherLower { guess }) => {
            g.make_guess(player, guess)?;
            let state = g.state_json();
            Ok(broadcast_same(players, state))
        }

        (GameInstance::StopClock(g), GameAction::StopClock { stopped_at_ms }) => {
            if stopped_at_ms == 0 {
                g.set_ready(player);
            } else {
                g.stop(player, stopped_at_ms)?;
            }
            let state = g.state_json();
            Ok(broadcast_same(players, state))
        }

        _ => Err("Invalid action for this game type".into()),
    }
}

/// Helper: send the same game state to all players
fn broadcast_same(players: &[String], state: serde_json::Value) -> Vec<(String, ServerMessage)> {
    players
        .iter()
        .map(|pid| {
            (
                pid.clone(),
                ServerMessage::GameUpdate {
                    game_state: state.clone(),
                },
            )
        })
        .collect()
}

fn check_game_over(game: &GameInstance) -> Option<ServerMessage> {
    let (is_over, winner) = match game {
        GameInstance::TicTacToe(g) => (g.game_over, g.winner.map(|w| format!("Player {}", w + 1))),
        GameInstance::ShutTheBox(g) => (g.game_over, g.winner.map(|w| format!("Player {}", w + 1))),
        GameInstance::CodeGuess(g) => (g.game_over, g.winner.map(|w| format!("Player {}", w + 1))),
        GameInstance::MemoryFlip(g) => (g.game_over, g.winner.map(|w| format!("Player {}", w + 1))),
        GameInstance::HigherLower(g) => (g.game_over, g.winner.map(|w| format!("Player {}", w + 1))),
        GameInstance::StopClock(g) => (g.game_over, g.winner.map(|w| format!("Player {}", w + 1))),
    };

    if is_over {
        Some(ServerMessage::GameOver {
            winner,
            reason: "Game completed".into(),
        })
    } else {
        None
    }
}
