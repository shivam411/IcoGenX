/* backend/src/games/dot_matrix.rs */
use crate::game_trait::{self, Game};
use crate::protocol::ServerMessage;
use serde::Serialize;
use rand::Rng;

#[derive(Debug, Clone, Serialize)]
pub struct DotMatrixGame {
    pub grid_size: usize,                         // 4 representing 4x4 squares (5x5 dots)
    pub horizontal_barriers: Vec<Option<u8>>,     // size = 20
    pub vertical_barriers: Vec<Option<u8>>,       // size = 20
    pub claimed_squares: Vec<Option<u8>>,        // size = 16
    pub dice_roll: Option<u8>,
    pub has_rolled: bool,
    pub lines_placed_this_turn: u8,
    pub current_player: u8,
    pub winner: Option<u8>,
    pub game_over: bool,
    pub last_event: Option<String>,
}

impl DotMatrixGame {
    pub fn new() -> Self {
        DotMatrixGame {
            grid_size: 4,
            horizontal_barriers: vec![None; 20],
            vertical_barriers: vec![None; 20],
            claimed_squares: vec![None; 16],
            dice_roll: None,
            has_rolled: false,
            lines_placed_this_turn: 0,
            current_player: 0,
            winner: None,
            game_over: false,
            last_event: Some("The dot Matrix started! Player 1's turn to roll the die.".to_string()),
        }
    }

    fn check_newly_completed_squares(&mut self, player: u8) -> u32 {
        let mut completed = 0;
        let n = self.grid_size;
        for r in 0..n {
            for c in 0..n {
                let sq_idx = r * n + c;
                if self.claimed_squares[sq_idx].is_none() {
                    let top = r * n + c;
                    let bottom = (r + 1) * n + c;
                    let left = r * (n + 1) + c;
                    let right = r * (n + 1) + (c + 1);

                    if self.horizontal_barriers[top].is_some()
                        && self.horizontal_barriers[bottom].is_some()
                        && self.vertical_barriers[left].is_some()
                        && self.vertical_barriers[right].is_some()
                    {
                        self.claimed_squares[sq_idx] = Some(player);
                        completed += 1;
                    }
                }
            }
        }
        completed
    }

    pub fn roll_die(&mut self, player: u8) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if self.has_rolled {
            return Err("Already rolled the die".into());
        }

        let mut rng = rand::thread_rng();
        let roll = rng.gen_range(1..=6);
        self.dice_roll = Some(roll);
        self.has_rolled = true;
        self.lines_placed_this_turn = 0;
        self.last_event = Some(format!(
            "Player {} rolled a {}. Draw exactly {} lines anywhere on the board.",
            player + 1, roll, roll
        ));

        Ok(())
    }

    pub fn place_barrier(
        &mut self,
        player: u8,
        barrier_type: &str,
        index: usize,
    ) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if !self.has_rolled {
            return Err("Roll the die first".into());
        }

        let roll_limit = self.dice_roll.ok_or("No active dice roll")?;
        if self.lines_placed_this_turn >= roll_limit {
            return Err("Already placed all lines for this turn".into());
        }

        // Place line
        if barrier_type == "horizontal" {
            if index >= 20 {
                return Err("Index out of bounds".into());
            }
            if self.horizontal_barriers[index].is_some() {
                return Err("Horizontal barrier slot is occupied".into());
            }
            self.horizontal_barriers[index] = Some(player);
        } else if barrier_type == "vertical" {
            if index >= 20 {
                return Err("Index out of bounds".into());
            }
            if self.vertical_barriers[index].is_some() {
                return Err("Vertical barrier slot is occupied".into());
            }
            self.vertical_barriers[index] = Some(player);
        } else {
            return Err("Invalid barrier type".into());
        }

        // Check if any squares completed
        let newly_completed = self.check_newly_completed_squares(player);
        self.lines_placed_this_turn += 1;

        // Check if all slots are full
        let h_full = self.horizontal_barriers.iter().all(|b| b.is_some());
        let v_full = self.vertical_barriers.iter().all(|b| b.is_some());

        if h_full && v_full {
            self.game_over = true;
            let p1_score = self.claimed_squares.iter().filter(|s| **s == Some(0)).count();
            let p2_score = self.claimed_squares.iter().filter(|s| **s == Some(1)).count();
            if p1_score > p2_score {
                self.winner = Some(0);
            } else if p2_score > p1_score {
                self.winner = Some(1);
            } else {
                self.winner = None;
            }
            self.last_event = Some(format!(
                "Game Over! Final Scores - P1: {}, P2: {}. Winner: {}",
                p1_score,
                p2_score,
                self.winner.map_or("Draw".to_string(), |w| format!("Player {}", w + 1))
            ));
            return Ok(());
        }

        // End of player turn if they reached roll limit
        if self.lines_placed_this_turn == roll_limit {
            self.has_rolled = false;
            self.dice_roll = None;
            self.lines_placed_this_turn = 0;
            self.current_player = 1 - self.current_player;
            self.last_event = Some(format!(
                "Player {} placed all their lines. Completed {} squares. Player {}'s turn to roll.",
                player + 1, newly_completed, self.current_player + 1
            ));
        } else {
            self.last_event = Some(format!(
                "Player {} placed a line. Draw remaining {} lines.",
                player + 1, roll_limit - self.lines_placed_this_turn
            ));
        }

        Ok(())
    }
}

impl Game for DotMatrixGame {
    fn process_action(
        &mut self,
        player: u8,
        action: serde_json::Value,
        players: &[String],
    ) -> Result<Vec<(String, ServerMessage)>, String> {
        match action.get("action").and_then(|v| v.as_str()) {
            Some("RollDie") => {
                self.roll_die(player)?;
            }
            Some("PlaceBarrier") => {
                let barrier_type = action
                    .get("barrier_type")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| "Missing 'barrier_type'".to_string())?;
                let index = action
                    .get("index")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'index'".to_string())? as usize;

                self.place_barrier(player, barrier_type, index)?;
            }
            _ => return Err("Unknown action for Dot Matrix".into()),
        }

        Ok(game_trait::broadcast_same(players, serde_json::to_value(self).unwrap()))
    }

    fn check_game_over(&self) -> Option<ServerMessage> {
        if self.game_over {
            let p1_score = self.claimed_squares.iter().filter(|s| **s == Some(0)).count();
            let p2_score = self.claimed_squares.iter().filter(|s| **s == Some(1)).count();
            Some(ServerMessage::GameOver {
                winner: self.winner.map(|w| format!("Player {}", w + 1)),
                reason: format!(
                    "All grid barrier slots filled! Final scores - Player 1: {} squares, Player 2: {} squares",
                    p1_score, p2_score
                ),
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
        *self = DotMatrixGame::new();
    }

    fn game_type(&self) -> &str {
        "dot_matrix"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initial_state() {
        let game = DotMatrixGame::new();
        assert_eq!(game.grid_size, 4);
        assert!(!game.has_rolled);
        assert!(!game.game_over);
    }

    #[test]
    fn test_dice_rolling() {
        let mut game = DotMatrixGame::new();
        game.roll_die(0).unwrap();
        assert!(game.has_rolled);
        assert!(game.dice_roll.is_some());
    }

    #[test]
    fn test_multi_placements_turn_end() {
        let mut game = DotMatrixGame::new();
        game.roll_die(0).unwrap();
        
        // Overwrite dice roll for deterministic test
        game.dice_roll = Some(2);

        // Place 1st barrier
        game.place_barrier(0, "horizontal", 0).unwrap();
        assert_eq!(game.current_player, 0); // still P1's turn
        assert_eq!(game.lines_placed_this_turn, 1);

        // Place 2nd barrier - should end turn
        game.place_barrier(0, "vertical", 0).unwrap();
        assert_eq!(game.current_player, 1); // swapped to P2
        assert!(!game.has_rolled);
        assert_eq!(game.lines_placed_this_turn, 0);
    }

    #[test]
    fn test_box_completion_scoring() {
        let mut game = DotMatrixGame::new();
        
        // Place 3 walls of square at (0,0)
        game.horizontal_barriers[0] = Some(1); // top
        game.horizontal_barriers[4] = Some(1); // bottom
        game.vertical_barriers[0] = Some(1);   // left
        
        // P1 rolls 1 and places remaining right wall
        game.roll_die(0).unwrap();
        game.dice_roll = Some(1);
        game.place_barrier(0, "vertical", 1).unwrap(); // right wall at (0, 0 + 1)

        assert_eq!(game.claimed_squares[0], Some(0)); // claimed by P1
    }
}
