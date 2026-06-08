/* backend/src/games/trappex.rs */
use crate::game_trait::{self, Game};
use crate::protocol::ServerMessage;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct TrappexGame {
    pub grid_size: usize,                         // 4 (quick) or 5 (classic/obstacles)
    pub horizontal_barriers: Vec<Option<u8>>,     // size = (N+1) * N. Some(0)=P1, Some(1)=P2, Some(2)=Obstacle, None=Empty
    pub vertical_barriers: Vec<Option<u8>>,       // size = N * (N+1). Some(0)=P1, Some(1)=P2, Some(2)=Obstacle, None=Empty
    pub claimed_squares: Vec<Option<u8>>,        // size = N * N. Some(0)=P1, Some(1)=P2, Some(2)=Obstacle, None=Empty
    pub current_player: u8,
    pub winner: Option<u8>,
    pub game_over: bool,
    pub last_event: Option<String>,
    pub variant: String,
}

impl TrappexGame {
    pub fn new() -> Self {
        Self::new_variant("classic")
    }

    pub fn new_variant(variant: &str) -> Self {
        let grid_size = if variant == "quick" { 4 } else { 5 };
        let h_size = (grid_size + 1) * grid_size;
        let v_size = grid_size * (grid_size + 1);
        let s_size = grid_size * grid_size;

        let mut horizontal_barriers = vec![None; h_size];
        let mut vertical_barriers = vec![None; v_size];
        let mut claimed_squares = vec![None; s_size];
        let mut last_event = Some("Game started! Player 1 goes first.".to_string());

        if variant == "obstacles" && grid_size == 5 {
            use rand::seq::SliceRandom;
            let mut indices: Vec<usize> = (0..25).collect();
            let mut rng = rand::thread_rng();
            indices.shuffle(&mut rng);

            // Block the first 3 squares as obstacles
            for &sq_idx in &indices[0..3] {
                claimed_squares[sq_idx] = Some(2); // 2 represents obstacle
                let r = sq_idx / 5;
                let c = sq_idx % 5;

                // Mark the 4 walls as placed by obstacle (owner = 2)
                let top = r * 5 + c;
                let bottom = (r + 1) * 5 + c;
                let left = r * (5 + 1) + c;
                let right = r * (5 + 1) + (c + 1);

                horizontal_barriers[top] = Some(2);
                horizontal_barriers[bottom] = Some(2);
                vertical_barriers[left] = Some(2);
                vertical_barriers[right] = Some(2);
            }
            last_event = Some("Game started with 3 random obstacles! Player 1 goes first.".to_string());
        }

        TrappexGame {
            grid_size,
            horizontal_barriers,
            vertical_barriers,
            claimed_squares,
            current_player: 0,
            winner: None,
            game_over: false,
            last_event,
            variant: variant.to_string(),
        }
    }

    fn is_square_enclosed(&self, r: usize, c: usize) -> bool {
        let top = r * self.grid_size + c;
        let bottom = (r + 1) * self.grid_size + c;
        let left = r * (self.grid_size + 1) + c;
        let right = r * (self.grid_size + 1) + (c + 1);

        self.horizontal_barriers[top].is_some()
            && self.horizontal_barriers[bottom].is_some()
            && self.vertical_barriers[left].is_some()
            && self.vertical_barriers[right].is_some()
    }

    pub fn make_move(&mut self, player: u8, barrier_type: &str, index: usize) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }

        let mut completed_squares = Vec::new();

        if barrier_type == "H" {
            let h_size = (self.grid_size + 1) * self.grid_size;
            if index >= h_size {
                return Err("Horizontal index out of bounds".into());
            }
            if self.horizontal_barriers[index].is_some() {
                return Err("Barrier is already placed".into());
            }
            self.horizontal_barriers[index] = Some(player);

            // Find adjacent squares
            let row = index / self.grid_size;
            let col = index % self.grid_size;

            // Square above H(row, col) is S(row-1, col)
            if row > 0 {
                let sq_row = row - 1;
                let sq_idx = sq_row * self.grid_size + col;
                if self.claimed_squares[sq_idx].is_none() && self.is_square_enclosed(sq_row, col) {
                    completed_squares.push(sq_idx);
                }
            }
            // Square below H(row, col) is S(row, col)
            if row < self.grid_size {
                let sq_idx = row * self.grid_size + col;
                if self.claimed_squares[sq_idx].is_none() && self.is_square_enclosed(row, col) {
                    completed_squares.push(sq_idx);
                }
            }
        } else if barrier_type == "V" {
            let v_size = self.grid_size * (self.grid_size + 1);
            if index >= v_size {
                return Err("Vertical index out of bounds".into());
            }
            if self.vertical_barriers[index].is_some() {
                return Err("Barrier is already placed".into());
            }
            self.vertical_barriers[index] = Some(player);

            // Find adjacent squares
            let row = index / (self.grid_size + 1);
            let col = index % (self.grid_size + 1);

            // Square to the left of V(row, col) is S(row, col-1)
            if col > 0 {
                let sq_col = col - 1;
                let sq_idx = row * self.grid_size + sq_col;
                if self.claimed_squares[sq_idx].is_none() && self.is_square_enclosed(row, sq_col) {
                    completed_squares.push(sq_idx);
                }
            }
            // Square to the right of V(row, col) is S(row, col)
            if col < self.grid_size {
                let sq_idx = row * self.grid_size + col;
                if self.claimed_squares[sq_idx].is_none() && self.is_square_enclosed(row, col) {
                    completed_squares.push(sq_idx);
                }
            }
        } else {
            return Err("Invalid barrier_type. Must be 'H' or 'V'".into());
        }

        let completed_any = !completed_squares.is_empty();
        for &sq_idx in &completed_squares {
            self.claimed_squares[sq_idx] = Some(player);
        }

        // Check if all slots are full
        let all_h = self.horizontal_barriers.iter().all(|b| b.is_some());
        let all_v = self.vertical_barriers.iter().all(|b| b.is_some());
        let all_squares_claimed = self.claimed_squares.iter().all(|c| c.is_some());

        if all_h && all_v || all_squares_claimed {
            self.game_over = true;
            // Count scores
            let score0 = self.claimed_squares.iter().filter(|&&c| c == Some(0)).count();
            let score1 = self.claimed_squares.iter().filter(|&&c| c == Some(1)).count();

            if score0 > score1 {
                self.winner = Some(0);
                self.last_event = Some(format!("Game over! Player 1 won with {} to {} claimed squares.", score0, score1));
            } else if score1 > score0 {
                self.winner = Some(1);
                self.last_event = Some(format!("Game over! Player 2 won with {} to {} claimed squares.", score1, score0));
            } else {
                self.winner = None;
                self.last_event = Some(format!("Game over! It's a draw with {} to {} claimed squares.", score0, score1));
            }
        } else {
            if completed_any {
                self.last_event = Some(format!(
                    "Player {} completed {} square(s) and gets a bonus turn!",
                    player + 1, completed_squares.len()
                ));
            } else {
                self.current_player = 1 - self.current_player;
                self.last_event = Some(format!(
                    "Player {} placed a barrier. Player {}'s turn.",
                    player + 1, self.current_player + 1
                ));
            }
        }

        Ok(())
    }
}

impl Game for TrappexGame {
    fn process_action(
        &mut self,
        player: u8,
        action: serde_json::Value,
        players: &[String],
    ) -> Result<Vec<(String, ServerMessage)>, String> {
        match action.get("action").and_then(|v| v.as_str()) {
            Some("TrappexPlace") => {
                let barrier_type = action
                    .get("barrier_type")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| "Missing 'barrier_type'".to_string())?;
                let index = action
                    .get("index")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'index'".to_string())? as usize;

                self.make_move(player, barrier_type, index)?;
            }
            _ => return Err("Unknown action for Trappex".into()),
        }

        Ok(game_trait::broadcast_same(players, serde_json::to_value(self).unwrap()))
    }

    fn check_game_over(&self) -> Option<ServerMessage> {
        if self.game_over {
            Some(ServerMessage::GameOver {
                winner: self.winner.map(|w| format!("Player {}", w + 1)),
                reason: if self.winner.is_some() {
                    "Enclosed more squares than the opponent!".to_string()
                } else {
                    "Equal amount of claimed squares!".to_string()
                },
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
        *self = TrappexGame::new_variant(&self.variant);
    }

    fn game_type(&self) -> &str {
        "trappex"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initial_state() {
        let game = TrappexGame::new();
        assert_eq!(game.grid_size, 5);
        assert_eq!(game.current_player, 0);
        assert!(!game.game_over);
        assert_eq!(game.variant, "classic");
    }

    #[test]
    fn test_quick_play_initial_state() {
        let game = TrappexGame::new_variant("quick");
        assert_eq!(game.grid_size, 4);
    }

    #[test]
    fn test_obstacles_pre_claimed() {
        let game = TrappexGame::new_variant("obstacles");
        let obstacles_count = game.claimed_squares.iter().filter(|&&c| c == Some(2)).count();
        assert_eq!(obstacles_count, 3);
    }

    #[test]
    fn test_place_horizontal_barrier() {
        let mut game = TrappexGame::new();
        assert!(game.make_move(0, "H", 0).is_ok());
        assert!(game.horizontal_barriers[0].is_some());
        assert_eq!(game.current_player, 1);
    }

    #[test]
    fn test_complete_square_grants_bonus_turn() {
        let mut game = TrappexGame::new();
        
        // Form 3 walls of square S(0, 0)
        // Top: H(0, 0) -> index 0
        // Left: V(0, 0) -> index 0
        // Right: V(0, 1) -> index 1
        game.horizontal_barriers[0] = Some(0);
        game.vertical_barriers[0] = Some(1);
        game.vertical_barriers[1] = Some(0);

        // Bottom: H(1, 0) -> index 5
        assert_eq!(game.current_player, 0);
        // Player 0 places the 4th wall
        assert!(game.make_move(0, "H", 5).is_ok());

        // Square should be claimed by player 0
        assert_eq!(game.claimed_squares[0], Some(0));
        // Player 0 should retain turn (bonus turn)
        assert_eq!(game.current_player, 0);
    }
}
