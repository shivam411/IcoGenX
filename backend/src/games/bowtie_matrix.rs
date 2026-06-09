/* backend/src/games/bowtie_matrix.rs */
use crate::game_trait::{self, Game};
use crate::protocol::ServerMessage;
use serde::Serialize;

const CONNECTIONS: &[(usize, usize)] = &[
    // Left outer/inner edges
    (0, 1), (1, 2), (3, 4), (4, 5),
    // Left lines to center
    (0, 3), (3, 6), (1, 4), (4, 6), (2, 5), (5, 6),
    // Left diagonals
    (0, 4), (2, 4), (1, 3), (1, 5),
    
    // Right outer/inner edges
    (10, 11), (11, 12), (7, 8), (8, 9),
    // Right lines to center
    (10, 7), (7, 6), (11, 8), (8, 6), (12, 9), (9, 6),
    // Right diagonals
    (10, 8), (12, 8), (11, 7), (11, 9),
];

const JUMPS: &[(usize, usize, usize)] = &[
    // Left outer edge
    (0, 1, 2), (2, 1, 0),
    // Left inner edge
    (3, 4, 5), (5, 4, 3),
    // Left rays to center
    (0, 3, 6), (6, 3, 0),
    (1, 4, 6), (6, 4, 1),
    (2, 5, 6), (6, 5, 2),

    // Right outer edge
    (10, 11, 12), (12, 11, 10),
    // Right inner edge
    (7, 8, 9), (9, 8, 7),
    // Right rays to center
    (10, 7, 6), (6, 7, 10),
    (11, 8, 6), (6, 8, 11),
    (12, 9, 6), (6, 9, 12),

    // Center crossing straight lines
    (3, 6, 9), (9, 6, 3),
    (5, 6, 7), (7, 6, 5),
    (4, 6, 8), (8, 6, 4),
];

#[derive(Debug, Clone, Serialize)]
pub struct BowtieMatrixGame {
    pub board: Vec<Option<u8>>,                    // 13 slots (None, Some(0), Some(1))
    pub current_player: u8,
    pub winner: Option<u8>,
    pub game_over: bool,
    pub moves_since_capture: u32,                  // Stalemate check: 30 moves limit
    pub last_event: Option<String>,
}

impl BowtieMatrixGame {
    pub fn new() -> Self {
        let mut board = vec![None; 13];
        // Player 1 starting slots: outer left corners (0, 1, 2) and inner left mid (4)
        board[0] = Some(0);
        board[1] = Some(0);
        board[2] = Some(0);
        board[4] = Some(0);

        // Player 2 starting slots: outer right corners (10, 11, 12) and inner right mid (8)
        board[10] = Some(1);
        board[11] = Some(1);
        board[12] = Some(1);
        board[8] = Some(1);

        BowtieMatrixGame {
            board,
            current_player: 0,
            winner: None,
            game_over: false,
            moves_since_capture: 0,
            last_event: Some("The Bowtie Matrix started! Player 1, move a piece.".to_string()),
        }
    }

    fn are_adjacent(&self, a: usize, b: usize) -> bool {
        CONNECTIONS.iter().any(|&(u, v)| (u == a && v == b) || (u == b && v == a))
    }

    fn get_jump_midpoint(&self, from: usize, to: usize) -> Option<usize> {
        JUMPS.iter()
            .find(|&&(f, m, t)| f == from && t == to)
            .map(|&(_, m, _)| m)
    }

    pub fn move_piece(&mut self, player: u8, from: usize, to: usize) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if from >= 13 || to >= 13 {
            return Err("Invalid slot index".into());
        }
        if self.board[from] != Some(player) {
            return Err("You don't own the piece at start slot".into());
        }
        if self.board[to].is_some() {
            return Err("Destination slot is occupied".into());
        }

        let is_std_move = self.are_adjacent(from, to);
        let opt_jump_mid = self.get_jump_midpoint(from, to);

        if is_std_move {
            // Standard slide move
            self.board[to] = Some(player);
            self.board[from] = None;
            self.moves_since_capture += 1;
            self.last_event = Some(format!("Player {} moved from {} to {}.", player + 1, from, to));
        } else if let Some(mid) = opt_jump_mid {
            // Jump capture move
            if self.board[mid] != Some(1 - player) {
                return Err("Can only jump over opponent pieces".into());
            }
            self.board[to] = Some(player);
            self.board[from] = None;
            self.board[mid] = None; // remove captured piece
            self.moves_since_capture = 0;
            self.last_event = Some(format!(
                "Player {} jumped over {} from {} to {}!",
                player + 1, mid, from, to
            ));
        } else {
            return Err("Invalid move path: must be adjacent or a straight jump".into());
        }

        // Check piece counts
        let p1_count = self.board.iter().filter(|&&cell| cell == Some(0)).count();
        let p2_count = self.board.iter().filter(|&&cell| cell == Some(1)).count();

        if p1_count == 0 {
            self.game_over = true;
            self.winner = Some(1);
            self.last_event = Some("Player 2 captured all pieces! Player 2 wins!".into());
            return Ok(());
        } else if p2_count == 0 {
            self.game_over = true;
            self.winner = Some(0);
            self.last_event = Some("Player 1 captured all pieces! Player 1 wins!".into());
            return Ok(());
        }

        // Check stalemate move limit
        if self.moves_since_capture >= 30 {
            self.game_over = true;
            self.winner = None;
            self.last_event = Some("30 moves without capture. Draw by stalemate!".into());
            return Ok(());
        }

        // Swap turns
        let next_player = 1 - player;
        
        // Scan if next player has any legal moves
        if !self.has_legal_moves(next_player) {
            self.game_over = true;
            self.winner = Some(player); // Player who just moved wins because opponent is blocked
            self.last_event = Some(format!(
                "Player {} is blocked and has no legal moves! Player {} wins!",
                next_player + 1, player + 1
            ));
            return Ok(());
        }

        self.current_player = next_player;
        Ok(())
    }

    fn has_legal_moves(&self, player: u8) -> bool {
        let opp = 1 - player;
        for i in 0..13 {
            if self.board[i] == Some(player) {
                // Check adjacent nodes
                for j in 0..13 {
                    if self.board[j].is_none() && self.are_adjacent(i, j) {
                        return true;
                    }
                }
                // Check jumps
                for &(f, m, t) in JUMPS {
                    if f == i && self.board[t].is_none() && self.board[m] == Some(opp) {
                        return true;
                    }
                }
            }
        }
        false
    }
}

impl Game for BowtieMatrixGame {
    fn process_action(
        &mut self,
        player: u8,
        action: serde_json::Value,
        players: &[String],
    ) -> Result<Vec<(String, ServerMessage)>, String> {
        match action.get("action").and_then(|v| v.as_str()) {
            Some("MovePiece") => {
                let from = action
                    .get("from")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'from'".to_string())? as usize;
                let to = action
                    .get("to")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'to'".to_string())? as usize;

                self.move_piece(player, from, to)?;
            }
            _ => return Err("Unknown action for The Bowtie Matrix".into()),
        }

        Ok(game_trait::broadcast_same(players, serde_json::to_value(self).unwrap()))
    }

    fn check_game_over(&self) -> Option<ServerMessage> {
        if self.game_over {
            Some(ServerMessage::GameOver {
                winner: self.winner.map(|w| format!("Player {}", w + 1)),
                reason: format!(
                    "Elimination completed! Winner: {}",
                    self.winner.map_or("Draw".to_string(), |w| format!("Player {}", w + 1))
                ),
            })
        } else {
            None
        }
    }

    fn state_for_player(&self, _player: Option<u8>) -> serde_json::Value {
        let mut val = serde_json::to_value(self).unwrap();
        if let Some(p_idx) = _player {
            if let serde_json::Value::Object(ref mut map) = val {
                map.insert("localPlayerIdx".to_string(), serde_json::json!(p_idx));
            }
        }
        val
    }

    fn reset(&mut self) {
        *self = BowtieMatrixGame::new();
    }

    fn game_type(&self) -> &str {
        "bowtie_matrix"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initial_state() {
        let game = BowtieMatrixGame::new();
        assert_eq!(game.board.len(), 13);
        assert_eq!(game.board[0], Some(0)); // P1
        assert_eq!(game.board[10], Some(1)); // P2
        assert_eq!(game.board[6], None); // center empty
        assert_eq!(game.current_player, 0);
        assert!(!game.game_over);
    }

    #[test]
    fn test_adjacent_move() {
        let mut game = BowtieMatrixGame::new();
        // Move P1 piece from 4 to 3 (empty adjacent)
        game.move_piece(0, 4, 3).unwrap();
        assert_eq!(game.board[4], None);
        assert_eq!(game.board[3], Some(0));
        assert_eq!(game.current_player, 1);
    }

    #[test]
    fn test_jump_capture() {
        let mut game = BowtieMatrixGame::new();
        // Setup a jump condition:
        // P1 has piece at 4.
        // Let's place opponent piece at 6, and empty 8.
        game.board[6] = Some(1); // place P2 at center
        game.board[8] = None;    // clear P2 at 8
        
        // P1 jumps from 4 over 6 to 8
        game.move_piece(0, 4, 8).unwrap();
        assert_eq!(game.board[4], None);
        assert_eq!(game.board[6], None); // captured
        assert_eq!(game.board[8], Some(0));
    }
}
