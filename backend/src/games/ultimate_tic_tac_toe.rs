/* backend/src/games/ultimate_tic_tac_toe.rs */
use crate::game_trait::{self, Game};
use crate::protocol::ServerMessage;
use serde::Serialize;

const LINES: [[usize; 3]; 8] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6]             // diagonals
];

#[derive(Debug, Clone, Serialize)]
pub struct UltimateTicTacToeGame {
    pub boards: Vec<Vec<Option<u8>>>,    // 9 boards, each containing 9 cells (None, Some(0), Some(1))
    pub main_board: Vec<Option<u8>>,     // 9 cells (None, Some(0)=P1 won, Some(1)=P2 won, Some(2)=Draw)
    pub active_board: Option<usize>,     // Some(0..9) = forced board, None = free move
    pub current_player: u8,
    pub winner: Option<u8>,
    pub game_over: bool,
    pub last_event: Option<String>,
}

impl UltimateTicTacToeGame {
    pub fn new() -> Self {
        UltimateTicTacToeGame {
            boards: vec![vec![None; 9]; 9],
            main_board: vec![None; 9],
            active_board: None,
            current_player: 0,
            winner: None,
            game_over: false,
            last_event: Some("Ultimate Tic-Tac-Toe started! Player 1 can play anywhere.".to_string()),
        }
    }

    fn check_line(grid: &[Option<u8>], p: u8) -> bool {
        for line in &LINES {
            if grid[line[0]] == Some(p) && grid[line[1]] == Some(p) && grid[line[2]] == Some(p) {
                return true;
            }
        }
        false
    }

    pub fn place_token(&mut self, player: u8, board_idx: usize, cell_idx: usize) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if board_idx >= 9 || cell_idx >= 9 {
            return Err("Index out of bounds".into());
        }

        // Validate active board constraint
        if let Some(forced_idx) = self.active_board {
            if board_idx != forced_idx {
                return Err(format!("Must play in forced board {}", forced_idx + 1));
            }
        }

        // Validate board status
        if self.main_board[board_idx].is_some() {
            return Err("This mini-board is already completed".into());
        }

        // Validate cell status
        if self.boards[board_idx][cell_idx].is_some() {
            return Err("Cell is already occupied".into());
        }

        // Place token
        self.boards[board_idx][cell_idx] = Some(player);

        // Check if player won this mini-board
        if Self::check_line(&self.boards[board_idx], player) {
            self.main_board[board_idx] = Some(player);
            // Check global win
            if Self::check_line(&self.main_board, player) {
                self.game_over = true;
                self.winner = Some(player);
                self.last_event = Some(format!("Game Over! Player {} won the game!", player + 1));
                return Ok(());
            }
        } else if self.boards[board_idx].iter().all(|c| c.is_some()) {
            // Mini-board is full and no winner -> Draw
            self.main_board[board_idx] = Some(2);
        }

        // Check global draw
        if self.main_board.iter().all(|mb| mb.is_some()) {
            self.game_over = true;
            self.winner = None;
            self.last_event = Some("Game Over! The board is full. It's a draw!".to_string());
            return Ok(());
        }

        // Determine next active board
        let next_board = cell_idx;
        let board_already_won = self.main_board[next_board].is_some();
        let board_is_full = self.boards[next_board].iter().all(|c| c.is_some());

        if board_already_won || board_is_full {
            self.active_board = None; // Free move
            self.last_event = Some(format!(
                "Player {} placed in board {}, cell {}. Next board is claimed or full. Player {} has a FREE MOVE!",
                player + 1, board_idx + 1, cell_idx + 1, (1 - player) + 1
            ));
        } else {
            self.active_board = Some(next_board);
            self.last_event = Some(format!(
                "Player {} placed in board {}, cell {}. Player {} must play in board {}.",
                player + 1, board_idx + 1, cell_idx + 1, (1 - player) + 1, next_board + 1
            ));
        }

        // Swap turn
        self.current_player = 1 - self.current_player;
        Ok(())
    }
}

impl Game for UltimateTicTacToeGame {
    fn process_action(
        &mut self,
        player: u8,
        action: serde_json::Value,
        players: &[String],
    ) -> Result<Vec<(String, ServerMessage)>, String> {
        match action.get("action").and_then(|v| v.as_str()) {
            Some("Place") => {
                let board_idx = action
                    .get("board_idx")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'board_idx'".to_string())? as usize;
                let cell_idx = action
                    .get("cell_idx")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'cell_idx'".to_string())? as usize;
                
                self.place_token(player, board_idx, cell_idx)?;
            }
            _ => return Err("Unknown action for Ultimate Tic-Tac-Toe".into()),
        }

        Ok(game_trait::broadcast_same(players, serde_json::to_value(self).unwrap()))
    }

    fn check_game_over(&self) -> Option<ServerMessage> {
        if self.game_over {
            Some(ServerMessage::GameOver {
                winner: self.winner.map(|w| format!("Player {}", w + 1)),
                reason: if self.winner.is_some() {
                    "Aligned three mini-board claims in a row!".to_string()
                } else {
                    "All mini-boards are full!".to_string()
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
        *self = UltimateTicTacToeGame::new();
    }

    fn game_type(&self) -> &str {
        "ultimate_tic_tac_toe"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initial_state() {
        let game = UltimateTicTacToeGame::new();
        assert_eq!(game.current_player, 0);
        assert_eq!(game.active_board, None);
        assert!(!game.game_over);
    }

    #[test]
    fn test_forced_moves() {
        let mut game = UltimateTicTacToeGame::new();
        // Player 1 plays on Board 0, Cell 4
        game.place_token(0, 0, 4).unwrap();
        assert_eq!(game.active_board, Some(4));
        assert_eq!(game.current_player, 1);

        // Player 2 must play on Board 4. Try to play on Board 0 instead - should error
        assert!(game.place_token(1, 0, 0).is_err());

        // Player 2 plays on Board 4, Cell 8
        game.place_token(1, 4, 8).unwrap();
        assert_eq!(game.active_board, Some(8));
    }

    #[test]
    fn test_mini_board_win() {
        let mut game = UltimateTicTacToeGame::new();
        // Claim Board 0 for P1
        game.place_token(0, 0, 0).unwrap(); // forces P2 to Board 0. P2 must play there
        game.place_token(1, 0, 1).unwrap(); // forces P1 to Board 1
        game.place_token(0, 1, 0).unwrap(); // forces P2 to Board 0
        game.place_token(1, 0, 2).unwrap(); // forces P1 to Board 2
        game.place_token(0, 2, 0).unwrap(); // forces P2 to Board 0
        game.place_token(1, 0, 4).unwrap(); // forces P1 to Board 4
        
        // P1 plays Board 0, Cell 0 (already played), Cell 1 (played), Cell 2 (played), wait, let's claim manually or play validly
        // Let's just claim Board 0 cells: (0,0), (0,3), (0,6) are P1.
        let mut game = UltimateTicTacToeGame::new();
        game.boards[0][0] = Some(0);
        game.boards[0][3] = Some(0);
        game.boards[0][6] = Some(0);
        // Place token triggers mini-board check
        game.place_token(0, 0, 1).unwrap();
        assert_eq!(game.main_board[0], Some(0));
    }

    #[test]
    fn test_global_win() {
        let mut game = UltimateTicTacToeGame::new();
        // Simulate P1 winning Board 0, 1, 2
        game.main_board[0] = Some(0);
        game.main_board[1] = Some(0);
        
        // Win Board 2
        game.boards[2][0] = Some(0);
        game.boards[2][3] = Some(0);
        game.boards[2][6] = Some(0);
        game.place_token(0, 2, 1).unwrap();

        assert!(game.game_over);
        assert_eq!(game.winner, Some(0));
    }
}
