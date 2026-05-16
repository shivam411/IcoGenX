use serde::{Deserialize, Serialize};

/// Messages from the client to the server
#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
pub enum ClientMessage {
    CreateRoom { game_type: String, variant: Option<String>, player_name: String },
    JoinRoom { room_code: String, player_name: String },
    GameAction { action: GameAction },
    RequestPlayAgain,
}


/// Game-specific actions
#[derive(Debug, Deserialize)]
#[serde(tag = "game")]
pub enum GameAction {
    TicTacToe { cell: usize },
    TicTacToeTossCoin,
    ShutTheBox { combination: Vec<u8>, target: String },
    CodeGuess { guess: String },
    MemoryFlip { card_index: usize },
    HigherLower { guess: u8 },
    StopClock { stopped_at_ms: u64 },
}

/// Messages from the server to the client
#[derive(Debug, Serialize, Clone)]
#[serde(tag = "type")]
pub enum ServerMessage {
    Welcome { player_id: String },
    RoomCreated { room_code: String, game_type: String, variant: Option<String> },
    PlayerJoined { player_id: String, player_number: u8, player_name: String, game_type: String, variant: Option<String> },

    GameStart { game_state: serde_json::Value, scores: [u32; 2], game_type: String, variant: Option<String> },
    GameUpdate { game_state: serde_json::Value },
    GameOver { winner: Option<String>, reason: String },
    Error { message: String },
    OpponentDisconnected,
    YourTurn { message: String },
    
    // Play again flow
    PlayAgainRequested { by_player: u8 },
    PlayAgainAccepted { game_state: serde_json::Value, scores: [u32; 2] },
}
