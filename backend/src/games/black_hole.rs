/* backend/src/games/black_hole.rs */
use crate::game_trait::{self, Game};
use crate::protocol::ServerMessage;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct BlackHoleGame {
    pub board: Vec<Option<(u8, u8)>>, // Some((player, value)) or None. Size = 21.
    pub current_player: u8,
    pub classic_next_val: [u8; 2],    // Next sequential token value (1..=10)
    pub chaos_hands: Vec<Vec<u8>>,    // Remaining unused token values (1..=10)
    pub black_hole_index: Option<usize>,
    pub scores: Vec<u32>,
    pub winner: Option<u8>,
    pub game_over: bool,
    pub last_event: Option<String>,
    pub variant: String,
}

impl BlackHoleGame {
    pub fn new() -> Self {
        Self::new_variant("classic")
    }

    pub fn new_variant(variant: &str) -> Self {
        BlackHoleGame {
            board: vec![None; 21],
            current_player: 0,
            classic_next_val: [1, 1],
            chaos_hands: vec![
                (1..=10).collect(),
                (1..=10).collect(),
            ],
            black_hole_index: None,
            scores: vec![0, 0],
            winner: None,
            game_over: false,
            last_event: Some("Game started! Player 1 goes first.".to_string()),
            variant: variant.to_string(),
        }
    }

    pub fn get_row_col(idx: usize) -> (usize, usize) {
        if idx == 0 { return (0, 0); }
        if idx <= 2 { return (1, idx - 1); }
        if idx <= 5 { return (2, idx - 3); }
        if idx <= 9 { return (3, idx - 6); }
        if idx <= 14 { return (4, idx - 10); }
        (5, idx - 15)
    }

    pub fn get_index(row: usize, col: usize) -> Option<usize> {
        if col > row { return None; }
        match row {
            0 => Some(0),
            1 => Some(1 + col),
            2 => Some(3 + col),
            3 => Some(6 + col),
            4 => Some(10 + col),
            5 => Some(15 + col),
            _ => None
        }
    }

    pub fn get_neighbors(idx: usize) -> Vec<usize> {
        let (r, c) = Self::get_row_col(idx);
        let mut neighbors = Vec::new();

        // Same row
        if c > 0 {
            if let Some(n) = Self::get_index(r, c - 1) { neighbors.push(n); }
        }
        if let Some(n) = Self::get_index(r, c + 1) { neighbors.push(n); }

        // Row above
        if r > 0 {
            if c > 0 {
                if let Some(n) = Self::get_index(r - 1, c - 1) { neighbors.push(n); }
            }
            if let Some(n) = Self::get_index(r - 1, c) { neighbors.push(n); }
        }

        // Row below
        if r < 5 {
            if let Some(n) = Self::get_index(r + 1, c) { neighbors.push(n); }
            if let Some(n) = Self::get_index(r + 1, c + 1) { neighbors.push(n); }
        }

        neighbors
    }

    pub fn make_move(&mut self, player: u8, cell: usize, value: u8) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if cell >= 21 {
            return Err("Cell index out of bounds".into());
        }
        if self.board[cell].is_some() {
            return Err("Cell is already occupied".into());
        }

        // Validate value based on variant
        if self.variant == "chaos" {
            let player_hand = &mut self.chaos_hands[player as usize];
            if !player_hand.contains(&value) {
                return Err(format!("Token {} is not available in hand", value));
            }
            // Remove token from hand
            player_hand.retain(|&x| x != value);
        } else {
            // Classic (sequential placement)
            let expected_val = self.classic_next_val[player as usize];
            if value != expected_val {
                return Err(format!("Classic variant requires placing token {}", expected_val));
            }
            self.classic_next_val[player as usize] += 1;
        }

        // Place token
        self.board[cell] = Some((player, value));

        // Check if board has 20 elements (meaning exactly 1 remains empty for the Black Hole)
        let placed_count = self.board.iter().filter(|c| c.is_some()).count();
        if placed_count == 20 {
            // Find the empty cell index
            let empty_idx = self.board.iter().position(|c| c.is_none()).unwrap();
            self.black_hole_index = Some(empty_idx);
            self.game_over = true;

            // Compute scores
            let neighbors = Self::get_neighbors(empty_idx);
            let mut score0 = 0;
            let mut score1 = 0;

            for &n_idx in &neighbors {
                if let Some((owner, val)) = self.board[n_idx] {
                    if owner == 0 {
                        score0 += val as u32;
                    } else if owner == 1 {
                        score1 += val as u32;
                    }
                }
            }

            self.scores = vec![score0, score1];

            // Lowest score wins
            if score0 < score1 {
                self.winner = Some(0);
                self.last_event = Some(format!(
                    "Game over! Black Hole formed at cell {}. Player 1 wins with lower score: {} to {}.",
                    empty_idx + 1, score0, score1
                ));
            } else if score1 < score0 {
                self.winner = Some(1);
                self.last_event = Some(format!(
                    "Game over! Black Hole formed at cell {}. Player 2 wins with lower score: {} to {}.",
                    empty_idx + 1, score1, score0
                ));
            } else {
                self.winner = None;
                self.last_event = Some(format!(
                    "Game over! Black Hole formed at cell {}. It's a draw! Tie score: {} to {}.",
                    empty_idx + 1, score0, score1
                ));
            }
        } else {
            self.current_player = 1 - self.current_player;
            self.last_event = Some(format!(
                "Player {} placed token {} at cell {}.",
                player + 1, value, cell + 1
            ));
        }

        Ok(())
    }
}

impl Game for BlackHoleGame {
    fn process_action(
        &mut self,
        player: u8,
        action: serde_json::Value,
        players: &[String],
    ) -> Result<Vec<(String, ServerMessage)>, String> {
        match action.get("action").and_then(|v| v.as_str()) {
            Some("BlackHolePlace") => {
                let cell = action
                    .get("cell")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'cell'".to_string())? as usize;
                let value = action
                    .get("value")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'value'".to_string())? as u8;

                self.make_move(player, cell, value)?;
            }
            _ => return Err("Unknown action for Black Hole".into()),
        }

        Ok(game_trait::broadcast_same(players, serde_json::to_value(self).unwrap()))
    }

    fn check_game_over(&self) -> Option<ServerMessage> {
        if self.game_over {
            Some(ServerMessage::GameOver {
                winner: self.winner.map(|w| format!("Player {}", w + 1)),
                reason: if self.winner.is_some() {
                    "Lowest adjacent sum to the Black Hole!".to_string()
                } else {
                    "Draw by equal adjacent sums!".to_string()
                },
            })
        } else {
            None
        }
    }

    fn state_for_player(&self, _player: Option<u8>) -> serde_json::Value {
        serde_json::to_value(self).unwrap()
    }

    fn reset(&mut self) {
        *self = BlackHoleGame::new_variant(&self.variant);
    }

    fn game_type(&self) -> &str {
        "black_hole"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initial_state() {
        let game = BlackHoleGame::new();
        assert_eq!(game.current_player, 0);
        assert!(!game.game_over);
        assert_eq!(game.board.len(), 21);
        assert_eq!(game.variant, "classic");
    }

    #[test]
    fn test_pyramid_adjacency() {
        // Center: cell 4 (Row 2, Col 1)
        let neighbors = BlackHoleGame::get_neighbors(4);
        assert_eq!(neighbors.len(), 6);
        assert!(neighbors.contains(&3)); // Row 2, Col 0
        assert!(neighbors.contains(&5)); // Row 2, Col 2
        assert!(neighbors.contains(&1)); // Row 1, Col 0
        assert!(neighbors.contains(&2)); // Row 1, Col 1
        assert!(neighbors.contains(&7)); // Row 3, Col 1
        assert!(neighbors.contains(&8)); // Row 3, Col 2

        // Top: cell 0
        let top_neighbors = BlackHoleGame::get_neighbors(0);
        assert_eq!(top_neighbors.len(), 2);
        assert!(top_neighbors.contains(&1));
        assert!(top_neighbors.contains(&2));
    }

    #[test]
    fn test_classic_moves_in_sequence() {
        let mut game = BlackHoleGame::new();
        // Play out of sequence should fail
        assert!(game.make_move(0, 0, 2).is_err());
        // Play in sequence
        assert!(game.make_move(0, 0, 1).is_ok());
        assert_eq!(game.board[0], Some((0, 1)));
        assert_eq!(game.current_player, 1);
    }

    #[test]
    fn test_chaos_moves_free_value() {
        let mut game = BlackHoleGame::new_variant("chaos");
        // Can place token 10 on first turn
        assert!(game.make_move(0, 0, 10).is_ok());
        // Hand should have 10 removed
        assert!(!game.chaos_hands[0].contains(&10));
        assert_eq!(game.board[0], Some((0, 10)));
    }

    #[test]
    fn test_game_over_and_scoring() {
        let mut game = BlackHoleGame::new();
        // Fill cells 0..20 except cell 4
        // P1 places 1..10 in order, P2 places 1..10 in order
        // Let's place them manually to keep it fast
        let mut cells: Vec<usize> = (0..21).collect();
        cells.remove(4); // Cell 4 is empty, it will be the Black Hole

        for i in 0..10 {
            // Player 0 plays odd turns
            let cell = cells[i * 2];
            game.board[cell] = Some((0, (i + 1) as u8));
            // Player 1 plays even turns
            let cell = cells[i * 2 + 1];
            game.board[cell] = Some((1, (i + 1) as u8));
        }

        // We need 20 elements placed, let's trigger the game over by making the last move
        // Reset turn index to player 1 if needed
        game.current_player = 1;
        game.classic_next_val = [11, 10]; // player 1 (which is index 0) next is 11, player 2 (index 1) next is 10
        // Wait, cell 20 is index 20, let's make it the last move for Player 2 (index 1) placing token 10 at cell 20
        game.board[20] = None;
        assert!(game.make_move(1, 20, 10).is_ok());

        assert!(game.game_over);
        assert_eq!(game.black_hole_index, Some(4));
        // Neighbors of cell 4: 1, 2, 3, 5, 7, 8
        // P1's sum: values in neighbors owned by 0
        // P2's sum: values in neighbors owned by 1
        assert!(game.scores[0] > 0 || game.scores[1] > 0);
    }
}
