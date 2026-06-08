use serde::{Deserialize, Serialize};

/// Messages from the client to the server
#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
pub enum ClientMessage {
    CreateRoom {
        game_type: String,
        variant: Option<String>,
        player_name: String,
        match_format: Option<String>,
    },
    JoinRoom {
        room_code: String,
        player_name: String,
    },
    LeaveRoom,
    GameAction {
        action: serde_json::Value,
    },
    SendEmoji {
        emoji: String,
    },
    RequestPlayAgain,
    SwitchVariant {
        variant: String,
    },
    SetMatchFormat {
        format: String,
    },
    Identify {
        token: String,
    },
    SubscribePresence {
        friend_ids: Vec<String>,
    },
    SendGameInvite {
        to_user_id: String,
        game_type: String,
        variant: Option<String>,
        grant: String,
    },
    DeclineGameInvite {
        invite_id: String,
    },
    SwapPlayer {
        active_player_number: u8,
        spectator_player_id: String,
    },
}

#[derive(Debug, Serialize, Clone)]
pub struct PlayerInfo {
    pub player_id: String,
    pub player_number: u8,
    pub player_name: String,
}

/// Messages from the server to the client
#[derive(Debug, Serialize, Clone)]
#[serde(tag = "type")]
pub enum ServerMessage {
    Welcome {
        player_id: String,
    },
    RoomCreated {
        room_code: String,
        game_type: String,
        variant: Option<String>,
        match_format: String,
        player_count: u8,
    },
    PlayerJoined {
        player_id: String,
        player_number: u8,
        player_name: String,
        game_type: String,
        variant: Option<String>,
        match_format: String,
        player_count: u8,
    },

    GameStart {
        game_state: serde_json::Value,
        scores: Vec<u32>,
        game_type: String,
        variant: Option<String>,
        match_format: String,
        players: Vec<PlayerInfo>,
    },
    GameUpdate {
        game_state: serde_json::Value,
    },
    EmojiSent {
        player_id: String,
        emoji: String,
    },
    GameOver {
        winner: Option<String>,
        reason: String,
    },
    Error {
        message: String,
    },
    OpponentDisconnected,
    YourTurn {
        message: String,
    },
    MatchFormatChanged {
        format: String,
    },
    RoomOccupants {
        players: Vec<PlayerInfo>,
        spectators: Vec<PlayerInfo>,
    },

    // Play again flow
    PlayAgainRequested {
        by_player: u8,
    },
    PlayAgainAccepted {
        game_state: serde_json::Value,
        scores: Vec<u32>,
    },

    // Friends & Presence
    PresenceUpdate {
        user_id: String,
        online: bool,
        current_room: Option<String>,
    },
    GameInviteSent {
        invite_id: String,
        room_code: String,
    },
    GameInviteFailed {
        message: String,
    },
    GameInviteReceived {
        invite_id: String,
        from_user_id: String,
        from_name: String,
        game_type: String,
        variant: Option<String>,
        room_code: String,
    },
    GameInviteDeclined {
        invite_id: String,
        from_name: String,
    },
    GameInviteAccepted {
        invite_id: String,
        from_name: String,
    },
    GameInviteExpired {
        invite_id: String,
    },
}

#[cfg(test)]
mod tests {
    use super::{ClientMessage, ServerMessage};

    #[test]
    fn client_message_deserializes_send_emoji() {
        let message: ClientMessage =
            serde_json::from_str(r#"{"type":"SendEmoji","emoji":"🎉"}"#).unwrap();

        match message {
            ClientMessage::SendEmoji { emoji } => assert_eq!(emoji, "🎉"),
            _ => panic!("expected send emoji message"),
        }
    }

    #[test]
    fn client_message_deserializes_switch_variant() {
        let message: ClientMessage =
            serde_json::from_str(r#"{"type":"SwitchVariant","variant":"joker"}"#).unwrap();

        match message {
            ClientMessage::SwitchVariant { variant } => assert_eq!(variant, "joker"),
            _ => panic!("expected switch variant message"),
        }
    }

    #[test]
    fn client_message_deserializes_generic_game_action() {
        let message: ClientMessage = serde_json::from_str(
            r#"{"type":"GameAction","action":{"game":"BluffCard","action":"play","card_indices":[0,2]}}"#,
        )
        .unwrap();

        match message {
            ClientMessage::GameAction { action } => {
                assert_eq!(action["game"], "BluffCard");
                assert_eq!(action["action"], "play");
                assert_eq!(action["card_indices"][0], 0);
                assert_eq!(action["card_indices"][1], 2);
            }
            _ => panic!("expected game action"),
        }
    }

    #[test]
    fn server_message_serializes_game_over_tagged_enum() {
        let payload = serde_json::to_value(ServerMessage::GameOver {
            winner: Some("Player 1".into()),
            reason: "Game completed".into(),
        })
        .unwrap();

        assert_eq!(payload["type"], "GameOver");
        assert_eq!(payload["winner"], "Player 1");
        assert_eq!(payload["reason"], "Game completed");
    }
}
