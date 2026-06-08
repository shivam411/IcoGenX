use serde::Serialize;
use rand::seq::SliceRandom;
use crate::game_trait::Game;
use crate::protocol::ServerMessage;

/// Sequence Memory Flip: flip cards 1-9 in order
#[derive(Debug, Clone, Serialize)]
pub struct MemoryFlipGame {
    /// The actual card values at each position (shuffled)
    pub card_values: Vec<u8>,
    /// Which cards are currently face up
    pub revealed: Vec<bool>,
    /// Next expected number in sequence
    pub next_expected: u8,
    /// How far each player has gotten (for scoring)
    pub player1_progress: u8,
    pub player2_progress: u8,
    pub current_player: u8,
    pub winner: Option<u8>,
    pub game_over: bool,
    /// Last flipped card (for animation purposes)
    pub last_flip: Option<usize>,
    pub last_flip_correct: Option<bool>,
}

impl MemoryFlipGame {
    pub fn new() -> Self {
        let mut cards: Vec<u8> = (1..=9).collect();
        let mut rng = rand::thread_rng();
        cards.shuffle(&mut rng);

        MemoryFlipGame {
            card_values: cards,
            revealed: vec![false; 9],
            next_expected: 1,
            player1_progress: 0,
            player2_progress: 0,
            current_player: 0,
            winner: None,
            game_over: false,
            last_flip: None,
            last_flip_correct: None,
        }
    }

    pub fn flip_card(&mut self, player: u8, card_index: usize) -> Result<bool, String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if card_index >= 9 {
            return Err("Invalid card index".into());
        }
        if self.revealed[card_index] {
            return Err("Card already revealed".into());
        }

        let card_value = self.card_values[card_index];
        self.last_flip = Some(card_index);

        if card_value == self.next_expected {
            // Correct! Keep face up
            self.revealed[card_index] = true;
            self.next_expected += 1;
            self.last_flip_correct = Some(true);

            // Update progress
            if player == 0 {
                self.player1_progress = self.player1_progress.max(self.next_expected - 1);
            } else {
                self.player2_progress = self.player2_progress.max(self.next_expected - 1);
            }

            // Check win: all 9 revealed
            if self.next_expected > 9 {
                self.winner = Some(player);
                self.game_over = true;
            }

            Ok(true)
        } else {
            // Wrong! Unflip all and pass turn
            self.last_flip_correct = Some(false);

            // Reset: unflip all cards
            for i in 0..9 {
                self.revealed[i] = false;
            }
            self.next_expected = 1;

            // Switch player
            self.current_player = 1 - self.current_player;

            Ok(false)
        }
    }

    pub fn state_json(&self) -> serde_json::Value {
        // Only show values of face-up cards
        let visible_values: Vec<Option<u8>> = self.card_values.iter().enumerate().map(|(i, &v)| {
            if self.revealed[i] { Some(v) } else { None }
        }).collect();

        serde_json::json!({
            "visibleValues": visible_values,
            "revealed": self.revealed,
            "nextExpected": self.next_expected,
            "player1Progress": self.player1_progress,
            "player2Progress": self.player2_progress,
            "currentPlayer": self.current_player,
            "winner": self.winner,
            "gameOver": self.game_over,
            "lastFlip": self.last_flip,
            "lastFlipCorrect": self.last_flip_correct,
        })
    }

    /// Full state for replay/spectating after game over
    pub fn full_state_json(&self) -> serde_json::Value {
        serde_json::json!({
            "cardValues": self.card_values,
            "revealed": self.revealed,
            "nextExpected": self.next_expected,
            "currentPlayer": self.current_player,
            "winner": self.winner,
            "gameOver": self.game_over,
        })
    }
}

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

impl Game for MemoryFlipGame {
    fn process_action(
        &mut self,
        player: u8,
        action: serde_json::Value,
        players: &[String],
    ) -> Result<Vec<(String, ServerMessage)>, String> {
        let card_index = action
            .get("card_index")
            .and_then(|v| v.as_u64())
            .ok_or_else(|| "Missing or invalid card_index".to_string())?
            as usize;

        self.flip_card(player, card_index)?;

        Ok(broadcast_same(players, self.state_json()))
    }

    fn check_game_over(&self) -> Option<ServerMessage> {
        if self.game_over {
            Some(ServerMessage::GameOver {
                winner: self.winner.map(|w| format!("Player {}", w + 1)),
                reason: "All cards revealed in order!".to_string(),
            })
        } else {
            None
        }
    }

    fn state_for_player(&self, _player: Option<u8>) -> serde_json::Value {
        self.state_json()
    }

    fn reset(&mut self) {
        *self = MemoryFlipGame::new();
    }

    fn game_type(&self) -> &str {
        "memory_flip"
    }
}

#[cfg(test)]
mod tests {
    use super::MemoryFlipGame;

    fn ordered_game() -> MemoryFlipGame {
        MemoryFlipGame {
            card_values: (1..=9).collect(),
            revealed: vec![false; 9],
            next_expected: 1,
            player1_progress: 0,
            player2_progress: 0,
            current_player: 0,
            winner: None,
            game_over: false,
            last_flip: None,
            last_flip_correct: None,
        }
    }

    #[test]
    fn correct_flip_reveals_card_and_updates_progress() {
        let mut game = ordered_game();

        let result = game.flip_card(0, 0).unwrap();

        assert!(result);
        assert!(game.revealed[0]);
        assert_eq!(game.next_expected, 2);
        assert_eq!(game.player1_progress, 1);
        assert_eq!(game.last_flip, Some(0));
        assert_eq!(game.last_flip_correct, Some(true));
    }

    #[test]
    fn wrong_flip_resets_board_and_passes_turn() {
        let mut game = ordered_game();
        game.revealed[0] = true;
        game.next_expected = 2;

        let result = game.flip_card(0, 4).unwrap();

        assert!(!result);
        assert_eq!(game.revealed, vec![false; 9]);
        assert_eq!(game.next_expected, 1);
        assert_eq!(game.current_player, 1);
        assert_eq!(game.last_flip_correct, Some(false));
    }

    #[test]
    fn revealing_all_cards_wins_the_game() {
        let mut game = ordered_game();

        for card_index in 0..9 {
            assert!(game.flip_card(0, card_index).unwrap());
        }

        assert!(game.game_over);
        assert_eq!(game.winner, Some(0));
        assert_eq!(game.player1_progress, 9);
    }

    #[test]
    fn state_json_hides_unrevealed_values_but_full_state_does_not() {
        let mut game = ordered_game();
        game.revealed[0] = true;
        game.revealed[3] = true;

        let public_state = game.state_json();
        let full_state = game.full_state_json();

        assert_eq!(public_state["visibleValues"][0], 1);
        assert!(public_state["visibleValues"][1].is_null());
        assert_eq!(full_state["cardValues"][0], 1);
        assert_eq!(full_state["cardValues"][8], 9);
    }
}
