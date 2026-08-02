/* backend/src/games/sos_dot.rs */
use crate::game_trait::{self, Game};
use crate::protocol::ServerMessage;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct SosDotGame {
    pub board: Vec<Option<char>>,                // 36 cells (6x6 grid) holding Some('S'), Some('O') or None
    pub scores: Vec<u32>,                        // Scores for P1 and P2
    pub completed_lines: Vec<Vec<usize>>,        // List of sorted 3-index vectors representing completed SOS sequences
    pub current_player: u8,
    pub winner: Option<u8>,
    pub game_over: bool,
    pub last_event: Option<String>,
}

impl SosDotGame {
    pub fn new() -> Self {
        SosDotGame {
            board: vec![None; 36],
            scores: vec![0, 0],
            completed_lines: Vec::new(),
            current_player: 0,
            winner: None,
            game_over: false,
            last_event: Some("SOS Dot Game started! Player 1's turn to place a letter.".to_string()),
        }
    }

    fn check_new_sos(&mut self, cell: usize, letter: char) -> u32 {
        let r = (cell / 6) as i32;
        let c = (cell % 6) as i32;
        let mut new_lines = Vec::new();

        let dirs = [
            (-1, -1), (-1, 0), (-1, 1),
            (0, -1),           (0, 1),
            (1, -1),  (1, 0),  (1, 1)
        ];

        if letter == 'S' {
            for &(dr, dc) in &dirs {
                let r1 = r + dr;
                let c1 = c + dc;
                let r2 = r + 2 * dr;
                let c2 = c + 2 * dc;

                if r1 >= 0 && r1 < 6 && c1 >= 0 && c1 < 6 && r2 >= 0 && r2 < 6 && c2 >= 0 && c2 < 6 {
                    let idx1 = (r1 * 6 + c1) as usize;
                    let idx2 = (r2 * 6 + c2) as usize;
                    if self.board[idx1] == Some('O') && self.board[idx2] == Some('S') {
                        let mut line = vec![cell, idx1, idx2];
                        line.sort();
                        if !self.completed_lines.contains(&line) {
                            new_lines.push(line);
                        }
                    }
                }
            }
        } else if letter == 'O' {
            for &(dr, dc) in &dirs {
                let r_prev = r - dr;
                let c_prev = c - dc;
                let r_next = r + dr;
                let c_next = c + dc;

                if r_prev >= 0 && r_prev < 6 && c_prev >= 0 && c_prev < 6
                    && r_next >= 0 && r_next < 6 && c_next >= 0 && c_next < 6
                {
                    let idx_prev = (r_prev * 6 + c_prev) as usize;
                    let idx_next = (r_next * 6 + c_next) as usize;
                    if self.board[idx_prev] == Some('S') && self.board[idx_next] == Some('S') {
                        let mut line = vec![idx_prev, cell, idx_next];
                        line.sort();
                        if !self.completed_lines.contains(&line) {
                            new_lines.push(line);
                        }
                    }
                }
            }
        }

        let score_gained = new_lines.len() as u32;
        for line in new_lines {
            self.completed_lines.push(line);
        }
        score_gained
    }

    pub fn place_letter(&mut self, player: u8, cell: usize, letter: char) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if cell >= 36 {
            return Err("Cell index out of bounds".into());
        }
        if self.board[cell].is_some() {
            return Err("Cell is already occupied".into());
        }
        if letter != 'S' && letter != 'O' {
            return Err("Invalid letter. Must be 'S' or 'O'.".into());
        }

        // Place letter
        self.board[cell] = Some(letter);

        // Check for SOS
        let points = self.check_new_sos(cell, letter);
        self.scores[player as usize] += points;

        // Check if board is full
        let board_full = self.board.iter().all(|c| c.is_some());

        if board_full {
            self.game_over = true;
            if self.scores[0] > self.scores[1] {
                self.winner = Some(0);
            } else if self.scores[1] > self.scores[0] {
                self.winner = Some(1);
            } else {
                self.winner = None;
            }
            self.last_event = Some(format!(
                "Game Over! Final Scores - P1: {}, P2: {}. Winner: {}",
                self.scores[0],
                self.scores[1],
                self.winner.map_or("Draw".to_string(), |w| format!("Player {}", w + 1))
            ));
            return Ok(());
        }

        if points > 0 {
            // Bonus turn! Player stays the same
            self.last_event = Some(format!(
                "SOS! Player {} placed '{}' on cell {} scoring {} points and earning a BONUS TURN!",
                player + 1, letter, cell + 1, points
            ));
        } else {
            // Swap turn
            self.current_player = 1 - self.current_player;
            self.last_event = Some(format!(
                "Player {} placed '{}' on cell {}. Player {}'s turn.",
                player + 1, letter, cell + 1, self.current_player + 1
            ));
        }

        Ok(())
    }
}

impl Game for SosDotGame {
    fn process_action(
        &mut self,
        player: u8,
        action: serde_json::Value,
        players: &[String],
    ) -> Result<Vec<(String, ServerMessage)>, String> {
        match action.get("action").and_then(|v| v.as_str()) {
            Some("PlaceLetter") => {
                let cell = action
                    .get("cell")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'cell'".to_string())? as usize;
                let letter_str = action
                    .get("letter")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| "Missing 'letter'".to_string())?;
                let letter = letter_str.chars().next().ok_or("Letter empty")?;

                self.place_letter(player, cell, letter)?;
            }
            _ => return Err("Unknown action for SOS Dot Game".into()),
        }

        Ok(game_trait::broadcast_same(players, serde_json::to_value(self).unwrap()))
    }

    fn check_game_over(&self) -> Option<ServerMessage> {
        if self.game_over {
            Some(ServerMessage::GameOver {
                winner: self.winner.map(|w| format!("Player {}", w + 1)),
                reason: format!(
                    "Grid fully filled! Final scores - Player 1: {} points, Player 2: {} points",
                    self.scores[0], self.scores[1]
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
        *self = SosDotGame::new();
    }

    fn game_type(&self) -> &str {
        "sos_dot"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initial_state() {
        let game = SosDotGame::new();
        assert_eq!(game.board.len(), 36);
        assert_eq!(game.scores, vec![0, 0]);
        assert_eq!(game.current_player, 0);
        assert!(!game.game_over);
    }

    #[test]
    fn test_letter_placements() {
        let mut game = SosDotGame::new();
        game.place_letter(0, 0, 'S').unwrap();
        assert_eq!(game.board[0], Some('S'));
        assert_eq!(game.current_player, 1);
    }

    #[test]
    fn test_sos_sequence_scoring_and_bonus() {
        let mut game = SosDotGame::new();
        
        // Prepare "S" and "O"
        game.board[0] = Some('S');
        game.board[1] = Some('O');
        
        // P1 plays remaining "S" at index 2
        game.place_letter(0, 2, 'S').unwrap();
        
        assert_eq!(game.scores[0], 1);
        assert_eq!(game.completed_lines.len(), 1);
        assert_eq!(game.completed_lines[0], vec![0, 1, 2]);
        assert_eq!(game.current_player, 0); // Earned bonus turn! Keeps turn
    }
}
