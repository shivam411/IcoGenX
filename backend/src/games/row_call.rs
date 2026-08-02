/* backend/src/games/row_call.rs */
use crate::game_trait::{self, Game};
use crate::protocol::ServerMessage;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct RowCallGame {
    pub board: [Option<u8>; 16],
    pub current_player: u8,
    pub called_type: Option<String>, // "row" or "col"
    pub called_index: Option<u8>,    // 0..3
    pub winner: Option<u8>,
    pub winning_line: Option<Vec<usize>>,
    pub game_over: bool,
    pub last_event: Option<String>,
}

impl RowCallGame {
    pub fn new() -> Self {
        RowCallGame {
            board: [None; 16],
            current_player: 0,
            called_type: None,
            called_index: None,
            winner: None,
            winning_line: None,
            game_over: false,
            last_event: Some("Game started! Player 1 goes first.".to_string()),
        }
    }

    pub fn make_move(
        &mut self,
        player: u8,
        cell: usize,
        call_type: &str,
        call_index: u8,
    ) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if cell >= 16 {
            return Err("Cell index out of bounds".into());
        }
        if self.board[cell].is_some() {
            return Err("Cell is already occupied".into());
        }

        // Validate constraint from previous turn's call
        if let (Some(ref c_type), Some(c_idx)) = (&self.called_type, self.called_index) {
            if c_type == "row" {
                let cell_row = (cell / 4) as u8;
                if cell_row != c_idx {
                    return Err(format!("Must play in Row {}", c_idx + 1));
                }
            } else if c_type == "col" {
                let cell_col = (cell % 4) as u8;
                if cell_col != c_idx {
                    let col_letter = match c_idx {
                        0 => 'A',
                        1 => 'B',
                        2 => 'C',
                        3 => 'D',
                        _ => '?',
                    };
                    return Err(format!("Must play in Column {}", col_letter));
                }
            }
        }

        // Place the token temporarily for validation
        self.board[cell] = Some(player);

        // Validate next call type/index
        if call_type != "row" && call_type != "col" {
            self.board[cell] = None;
            return Err("callType must be 'row' or 'col'".into());
        }
        if call_index > 3 {
            self.board[cell] = None;
            return Err("callIndex must be between 0 and 3".into());
        }

        // Check if the called row/col is completely full
        let is_full = if call_type == "row" {
            (0..4).all(|col| self.board[(call_index as usize) * 4 + col].is_some())
        } else {
            (0..4).all(|row| self.board[row * 4 + (call_index as usize)].is_some())
        };

        if is_full {
            self.board[cell] = None;
            let col_name = if call_type == "col" {
                match call_index {
                    0 => "A".to_string(),
                    1 => "B".to_string(),
                    2 => "C".to_string(),
                    3 => "D".to_string(),
                    _ => "?".to_string(),
                }
            } else {
                (call_index + 1).to_string()
            };
            return Err(format!(
                "Cannot call {} {} because it is completely full",
                if call_type == "row" { "Row" } else { "Column" },
                col_name
            ));
        }

        // Check win condition
        let winning_lines: [[usize; 4]; 10] = [
            // Rows
            [0, 1, 2, 3],
            [4, 5, 6, 7],
            [8, 9, 10, 11],
            [12, 13, 14, 15],
            // Cols
            [0, 4, 8, 12],
            [1, 5, 9, 13],
            [2, 6, 10, 14],
            [3, 7, 11, 15],
            // Diagonals
            [0, 5, 10, 15],
            [3, 6, 9, 12],
        ];

        let mut has_won = false;
        for line in winning_lines {
            if line.iter().all(|&idx| self.board[idx] == Some(player)) {
                self.winner = Some(player);
                self.winning_line = Some(line.to_vec());
                self.game_over = true;
                has_won = true;
                break;
            }
        }

        if !has_won {
            // Check draw condition
            if self.board.iter().all(|c| c.is_some()) {
                self.game_over = true;
                self.winner = None;
            }
        }

        if self.game_over {
            self.called_type = None;
            self.called_index = None;
            self.last_event = Some(if self.winner.is_some() {
                format!("Player {} connected 4 and won!", player + 1)
            } else {
                "The board is full. It's a draw!".to_string()
            });
        } else {
            // Set constraint for next move
            self.called_type = Some(call_type.to_string());
            self.called_index = Some(call_index);
            self.current_player = 1 - self.current_player;

            let col_name = if call_type == "col" {
                match call_index {
                    0 => "A".to_string(),
                    1 => "B".to_string(),
                    2 => "C".to_string(),
                    3 => "D".to_string(),
                    _ => "?".to_string(),
                }
            } else {
                (call_index + 1).to_string()
            };
            self.last_event = Some(format!(
                "Player {} placed and called {} {}",
                player + 1,
                if call_type == "row" { "Row" } else { "Column" },
                col_name
            ));
        }

        Ok(())
    }
}

impl Game for RowCallGame {
    fn process_action(
        &mut self,
        player: u8,
        action: serde_json::Value,
        players: &[String],
    ) -> Result<Vec<(String, ServerMessage)>, String> {
        match action.get("game").and_then(|v| v.as_str()) {
            Some("RowCallMove") => {
                let cell = action
                    .get("cell")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'cell'".to_string())? as usize;
                let call_type = action
                    .get("callType")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| "Missing 'callType'".to_string())?
                    .to_string();
                let call_index = action
                    .get("callIndex")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'callIndex'".to_string())? as u8;

                self.make_move(player, cell, &call_type, call_index)?;
            }
            _ => return Err("Unknown action type for RowCall".into()),
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
        *self = RowCallGame::new();
    }

    fn game_type(&self) -> &str {
        "row_call"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initial_state() {
        let game = RowCallGame::new();
        assert_eq!(game.current_player, 0);
        assert!(game.called_type.is_none());
        assert!(game.called_index.is_none());
        assert!(!game.game_over);
    }

    #[test]
    fn test_valid_first_move() {
        let mut game = RowCallGame::new();
        // Player 0 plays on cell 5, calls row 1 (0-indexed, which is Row 2)
        let res = game.make_move(0, 5, "row", 1);
        assert!(res.is_ok());
        assert_eq!(game.board[5], Some(0));
        assert_eq!(game.current_player, 1);
        assert_eq!(game.called_type, Some("row".to_string()));
        assert_eq!(game.called_index, Some(1));
    }

    #[test]
    fn test_move_validation_respects_call() {
        let mut game = RowCallGame::new();
        // Player 0 plays on cell 0, calls Column B (index 1)
        game.make_move(0, 0, "col", 1).unwrap();

        // Player 1 tries to play on cell 8 (Row 3, Col A), which violates Column B constraint
        let res_fail = game.make_move(1, 8, "row", 2);
        assert!(res_fail.is_err());
        assert_eq!(res_fail.unwrap_err(), "Must play in Column B");

        // Player 1 plays on cell 5 (Row 2, Col B), which is valid
        let res_ok = game.make_move(1, 5, "row", 2);
        assert!(res_ok.is_ok());
    }

    #[test]
    fn test_cannot_call_full_row() {
        let mut game = RowCallGame::new();
        // Fill row 0 (cells 0, 1, 2) except cell 3
        game.board[0] = Some(0);
        game.board[1] = Some(1);
        game.board[2] = Some(0);

        // Player 0 plays on cell 3 (completing Row 0), and tries to call Row 0
        let res = game.make_move(0, 3, "row", 0);
        assert!(res.is_err());
        assert!(res.unwrap_err().contains("Cannot call Row 1 because it is completely full"));
    }

    #[test]
    fn test_horizontal_win() {
        let mut game = RowCallGame::new();
        // Player 0 places 3 tokens in row 0
        game.board[0] = Some(0);
        game.board[1] = Some(0);
        game.board[2] = Some(0);

        // Player 0's turn to place on cell 3 and win
        let res = game.make_move(0, 3, "row", 1);
        assert!(res.is_ok());
        assert!(game.game_over);
        assert_eq!(game.winner, Some(0));
        assert_eq!(game.winning_line, Some(vec![0, 1, 2, 3]));
    }

    #[test]
    fn test_vertical_win() {
        let mut game = RowCallGame::new();
        // Player 1 places 3 tokens in col A (0, 4, 8)
        game.board[0] = Some(1);
        game.board[4] = Some(1);
        game.board[8] = Some(1);
        game.current_player = 1;

        // Player 1 places on cell 12 to win
        let res = game.make_move(1, 12, "row", 1);
        assert!(res.is_ok());
        assert!(game.game_over);
        assert_eq!(game.winner, Some(1));
        assert_eq!(game.winning_line, Some(vec![0, 4, 8, 12]));
    }

    #[test]
    fn test_diagonal_win() {
        let mut game = RowCallGame::new();
        // Player 0 places on main diagonal (0, 5, 10)
        game.board[0] = Some(0);
        game.board[5] = Some(0);
        game.board[10] = Some(0);

        let res = game.make_move(0, 15, "col", 1);
        assert!(res.is_ok());
        assert!(game.game_over);
        assert_eq!(game.winner, Some(0));
        assert_eq!(game.winning_line, Some(vec![0, 5, 10, 15]));
    }
}
