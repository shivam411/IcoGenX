/* backend/src/games/giiker_bolt.rs */
use crate::game_trait::{self, Game};
use crate::protocol::ServerMessage;
use serde::Serialize;
use rand::Rng;

#[derive(Debug, Clone, Serialize)]
pub struct GiikerBoltGame {
    pub sequence: Vec<usize>,        // Flashing sequence indices (0..8)
    pub input_index: usize,          // Steps verified in current player's input
    pub mode: String,                // "display" or "input"
    pub round: u32,                  // Round number / sequence length
    pub current_player: u8,
    pub winner: Option<u8>,
    pub game_over: bool,
    pub last_event: Option<String>,
}

impl GiikerBoltGame {
    pub fn new() -> Self {
        let mut rng = rand::thread_rng();
        // Start with a sequence of length 3
        let sequence = vec![
            rng.gen_range(0..9),
            rng.gen_range(0..9),
            rng.gen_range(0..9),
        ];

        GiikerBoltGame {
            sequence,
            input_index: 0,
            mode: "display".to_string(),
            round: 3,
            current_player: 0,
            winner: None,
            game_over: false,
            last_event: Some("Giiker Bolt memory mode started! Player 1, watch the sequence closely.".to_string()),
        }
    }

    pub fn handle_input_move(&mut self, player: u8, cell: usize) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if self.mode != "input" {
            return Err("Sequence is still flashing".into());
        }
        if cell >= 9 {
            return Err("Cell out of bounds".into());
        }

        // Verify correct cell in sequence
        if cell == self.sequence[self.input_index] {
            if self.input_index == self.sequence.len() - 1 {
                // Completed the full sequence!
                self.current_player = 1 - self.current_player;
                let mut rng = rand::thread_rng();
                self.sequence.push(rng.gen_range(0..9));
                self.round += 1;
                self.mode = "display".to_string();
                self.input_index = 0;
                self.last_event = Some(format!(
                    "Success! Player {} completed sequence. Round {}. Player {}'s turn to watch and repeat.",
                    player + 1, self.round, self.current_player + 1
                ));
            } else {
                self.input_index += 1;
            }
        } else {
            // Mistake! Loss
            self.game_over = true;
            let opponent = 1 - player;
            self.winner = Some(opponent);
            self.last_event = Some(format!(
                "Oh darn! Player {} pressed the wrong square in the sequence. Player {} wins!",
                player + 1, opponent + 1
            ));
        }

        Ok(())
    }

    pub fn finish_sequence_display(&mut self, player: u8) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if self.mode != "display" {
            return Err("Not in display mode".into());
        }

        self.mode = "input".to_string();
        self.input_index = 0;
        self.last_event = Some(format!(
            "Sequence finished! Player {}'s turn to tap the sequence.",
            player + 1
        ));

        Ok(())
    }
}

impl Game for GiikerBoltGame {
    fn process_action(
        &mut self,
        player: u8,
        action: serde_json::Value,
        players: &[String],
    ) -> Result<Vec<(String, ServerMessage)>, String> {
        match action.get("action").and_then(|v| v.as_str()) {
            Some("InputMove") => {
                let cell = action
                    .get("cell")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'cell'".to_string())? as usize;
                self.handle_input_move(player, cell)?;
            }
            Some("SequenceFinished") => {
                self.finish_sequence_display(player)?;
            }
            _ => return Err("Unknown action for Giiker Bolt".into()),
        }

        Ok(game_trait::broadcast_same(players, serde_json::to_value(self).unwrap()))
    }

    fn check_game_over(&self) -> Option<ServerMessage> {
        if self.game_over {
            Some(ServerMessage::GameOver {
                winner: self.winner.map(|w| format!("Player {}", w + 1)),
                reason: "Sequence memory recall mismatch!".to_string(),
            })
        } else {
            None
        }
    }

    fn state_for_player(&self, _player: Option<u8>) -> serde_json::Value {
        let mut val = serde_json::to_value(self).unwrap();
        if let serde_json::Value::Object(ref mut map) = val {
            map.insert("currentPlayer".to_string(), serde_json::json!(self.current_player));
        }
        val
    }

    fn reset(&mut self) {
        *self = GiikerBoltGame::new();
    }

    fn game_type(&self) -> &str {
        "giiker_bolt"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initial_state() {
        let game = GiikerBoltGame::new();
        assert_eq!(game.sequence.len(), 3);
        assert_eq!(game.mode, "display");
        assert_eq!(game.round, 3);
        assert_eq!(game.current_player, 0);
        assert!(!game.game_over);
    }

    #[test]
    fn test_sequence_display_to_input() {
        let mut game = GiikerBoltGame::new();
        game.finish_sequence_display(0).unwrap();
        assert_eq!(game.mode, "input");
        assert_eq!(game.input_index, 0);
    }

    #[test]
    fn test_correct_inputs() {
        let mut game = GiikerBoltGame::new();
        // Hardcode a sequence for testing
        game.sequence = vec![1, 4, 7];
        game.finish_sequence_display(0).unwrap();

        // Player 1 inputs 1
        game.handle_input_move(0, 1).unwrap();
        assert_eq!(game.input_index, 1);
        assert!(!game.game_over);

        // Player 1 inputs 4
        game.handle_input_move(0, 4).unwrap();
        assert_eq!(game.input_index, 2);
        assert!(!game.game_over);

        // Player 1 inputs 7 - completes sequence
        game.handle_input_move(0, 7).unwrap();
        
        // Check game updated to next round
        assert_eq!(game.sequence.len(), 4);
        assert_eq!(game.round, 4);
        assert_eq!(game.current_player, 1);
        assert_eq!(game.mode, "display");
        assert_eq!(game.input_index, 0);
    }

    #[test]
    fn test_mismatch_loss() {
        let mut game = GiikerBoltGame::new();
        game.sequence = vec![1, 4, 7];
        game.finish_sequence_display(0).unwrap();

        // Player 1 inputs wrong cell
        game.handle_input_move(0, 2).unwrap();
        assert!(game.game_over);
        assert_eq!(game.winner, Some(1)); // Opponent wins
    }
}
