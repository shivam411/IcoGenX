/* backend/src/games/dice_grid.rs */
use crate::game_trait::{self, Game};
use crate::protocol::ServerMessage;
use serde::Serialize;
use rand::Rng;

#[derive(Debug, Clone, Serialize)]
pub struct DiceGridGame {
    pub board: Vec<Option<u8>>, // Some(0) = P1, Some(1) = P2, Some(2) = Obstacle, None = empty
    pub current_player: u8,
    pub last_roll: Option<(u8, u8)>,
    pub has_rolled: bool,
    pub winner: Option<u8>,
    pub winning_line: Option<Vec<usize>>,
    pub game_over: bool,
    pub last_event: Option<String>,
    pub variant: String,
}

impl DiceGridGame {
    pub fn new() -> Self {
        Self::new_variant("classic")
    }

    pub fn new_variant(variant: &str) -> Self {
        let mut board = vec![None; 36];
        let mut last_event = Some("Game started! Player 1 goes first. Roll the dice.".to_string());
        
        if variant == "obstacles" {
            use rand::seq::SliceRandom;
            let mut indices: Vec<usize> = (0..36).collect();
            let mut rng = rand::thread_rng();
            indices.shuffle(&mut rng);
            // Place 3 obstacles
            for &idx in &indices[0..3] {
                board[idx] = Some(2); // 2 represents an obstacle
            }
            last_event = Some("Game started with 3 random obstacles! Player 1 goes first. Roll the dice.".to_string());
        }

        DiceGridGame {
            board,
            current_player: 0,
            last_roll: None,
            has_rolled: false,
            winner: None,
            winning_line: None,
            game_over: false,
            last_event,
            variant: variant.to_string(),
        }
    }

    pub fn check_win(&self, player: u8) -> Option<Vec<usize>> {
        // Rows (any 4 consecutive in 6 columns)
        for r in 0..6 {
            for c in 0..3 {
                let line = vec![r * 6 + c, r * 6 + c + 1, r * 6 + c + 2, r * 6 + c + 3];
                if line.iter().all(|&idx| self.board[idx] == Some(player)) {
                    return Some(line);
                }
            }
        }
        // Columns (any 4 consecutive in 6 rows)
        for c in 0..6 {
            for r in 0..3 {
                let line = vec![r * 6 + c, (r + 1) * 6 + c, (r + 2) * 6 + c, (r + 3) * 6 + c];
                if line.iter().all(|&idx| self.board[idx] == Some(player)) {
                    return Some(line);
                }
            }
        }
        // Diagonals (down-right)
        for r in 0..3 {
            for c in 0..3 {
                let line = vec![
                    r * 6 + c,
                    (r + 1) * 6 + c + 1,
                    (r + 2) * 6 + c + 2,
                    (r + 3) * 6 + c + 3,
                ];
                if line.iter().all(|&idx| self.board[idx] == Some(player)) {
                    return Some(line);
                }
            }
        }
        // Diagonals (up-right)
        for r in 3..6 {
            for c in 0..3 {
                let line = vec![
                    r * 6 + c,
                    (r - 1) * 6 + c + 1,
                    (r - 2) * 6 + c + 2,
                    (r - 3) * 6 + c + 3,
                ];
                if line.iter().all(|&idx| self.board[idx] == Some(player)) {
                    return Some(line);
                }
            }
        }
        None
    }

    pub fn roll_dice(&mut self, player: u8) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if self.has_rolled {
            return Err("You have already rolled the dice".into());
        }

        let mut rng = rand::thread_rng();
        let d1 = rng.gen_range(1..=6);
        let d2 = rng.gen_range(1..=6);

        self.last_roll = Some((d1, d2));
        self.has_rolled = true;

        // Verify if both options are blocked
        let idx1 = ((d1 - 1) * 6 + (d2 - 1)) as usize;
        let idx2 = ((d2 - 1) * 6 + (d1 - 1)) as usize;

        if self.board[idx1].is_some() && self.board[idx2].is_some() {
            // Turn passed immediately!
            self.has_rolled = false;
            self.current_player = 1 - self.current_player;
            self.last_event = Some(format!(
                "Player {} rolled {} and {}, but both coordinate cells are blocked! Turn passes to Player {}.",
                player + 1,
                d1,
                d2,
                self.current_player + 1
            ));
        } else {
            self.last_event = Some(format!(
                "Player {} rolled {} and {}. Choose a coordinate.",
                player + 1,
                d1,
                d2
            ));
        }

        Ok(())
    }

    pub fn place_token(&mut self, player: u8, cell: usize) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if !self.has_rolled {
            return Err("You must roll the dice first".into());
        }
        if cell >= 36 {
            return Err("Cell index out of bounds".into());
        }
        if self.board[cell].is_some() {
            return Err("Cell is already occupied".into());
        }

        let (d1, d2) = self.last_roll.ok_or_else(|| "No active dice roll found".to_string())?;
        let idx1 = ((d1 - 1) * 6 + (d2 - 1)) as usize;
        let idx2 = ((d2 - 1) * 6 + (d1 - 1)) as usize;

        if cell != idx1 && cell != idx2 {
            return Err(format!(
                "Invalid cell. Must place at ({}, {}) or ({}, {})",
                d1, d2, d2, d1
            ));
        }

        // Place token
        self.board[cell] = Some(player);

        // Check win
        if let Some(line) = self.check_win(player) {
            self.winner = Some(player);
            self.winning_line = Some(line);
            self.game_over = true;
            self.last_event = Some(format!("Player {} connected 4 and won!", player + 1));
        } else if self.board.iter().all(|c| c.is_some()) {
            self.game_over = true;
            self.winner = None;
            self.last_event = Some("The board is full. It's a draw!".to_string());
        } else {
            // Switch player
            self.current_player = 1 - self.current_player;
            self.has_rolled = false;
            self.last_event = Some(format!(
                "Player {} placed. Player {}'s turn to roll.",
                player + 1,
                self.current_player + 1
            ));
        }

        Ok(())
    }
}

impl Game for DiceGridGame {
    fn process_action(
        &mut self,
        player: u8,
        action: serde_json::Value,
        players: &[String],
    ) -> Result<Vec<(String, ServerMessage)>, String> {
        match action.get("action").and_then(|v| v.as_str()) {
            Some("DiceGridRoll") => {
                self.roll_dice(player)?;
            }
            Some("DiceGridPlace") => {
                let cell = action
                    .get("cell")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'cell'".to_string())? as usize;
                self.place_token(player, cell)?;
            }
            _ => return Err("Unknown action for Dice Grid".into()),
        }

        Ok(game_trait::broadcast_same(players, serde_json::to_value(self).unwrap()))
    }

    fn check_game_over(&self) -> Option<ServerMessage> {
        if self.game_over {
            Some(ServerMessage::GameOver {
                winner: self.winner.map(|w| format!("Player {}", w + 1)),
                reason: if self.winner.is_some() {
                    "Four connected in a straight line!".to_string()
                } else {
                    "The board is full!".to_string()
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
        *self = DiceGridGame::new_variant(&self.variant);
    }

    fn game_type(&self) -> &str {
        "dice_grid"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initial_state() {
        let game = DiceGridGame::new();
        assert_eq!(game.current_player, 0);
        assert!(!game.has_rolled);
        assert!(game.last_roll.is_none());
        assert!(!game.game_over);
        assert_eq!(game.variant, "classic");
    }

    #[test]
    fn test_obstacles_setup() {
        let game = DiceGridGame::new_variant("obstacles");
        let obstacles_count = game.board.iter().filter(|&&c| c == Some(2)).count();
        assert_eq!(obstacles_count, 3);
        assert_eq!(game.variant, "obstacles");
    }

    #[test]
    fn test_win_checking() {
        let mut game = DiceGridGame::new();
        // Row win
        game.board[0] = Some(0);
        game.board[1] = Some(0);
        game.board[2] = Some(0);
        game.board[3] = Some(0);
        assert!(game.check_win(0).is_some());
        assert_eq!(game.check_win(0).unwrap(), vec![0, 1, 2, 3]);

        // Column win
        let mut game2 = DiceGridGame::new();
        game2.board[0] = Some(1);
        game2.board[6] = Some(1);
        game2.board[12] = Some(1);
        game2.board[18] = Some(1);
        assert!(game2.check_win(1).is_some());
        assert_eq!(game2.check_win(1).unwrap(), vec![0, 6, 12, 18]);

        // Diagonal down-right
        let mut game3 = DiceGridGame::new();
        game3.board[7] = Some(0);
        game3.board[14] = Some(0);
        game3.board[21] = Some(0);
        game3.board[28] = Some(0);
        assert!(game3.check_win(0).is_some());
        assert_eq!(game3.check_win(0).unwrap(), vec![7, 14, 21, 28]);

        // Diagonal up-right
        let mut game4 = DiceGridGame::new();
        game4.board[18] = Some(1);
        game4.board[13] = Some(1);
        game4.board[8] = Some(1);
        game4.board[3] = Some(1);
        assert!(game4.check_win(1).is_some());
        assert_eq!(game4.check_win(1).unwrap(), vec![18, 13, 8, 3]);
    }
}
