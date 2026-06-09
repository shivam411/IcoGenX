/* backend/src/games/qomet.rs */
use crate::game_trait::{self, Game};
use crate::protocol::ServerMessage;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct QometGame {
    pub board: Vec<Option<u8>>,                  // length 16 representing 4x4 grid (None = empty, Some(p) = player p)
    pub reserve_pieces: Vec<u8>,                 // pieces remaining to place for [P1, P2]
    pub current_player: u8,
    pub winner: Option<u8>,
    pub game_over: bool,
    pub last_event: Option<String>,
}

impl QometGame {
    pub fn new() -> Self {
        QometGame {
            board: vec![None; 16],
            reserve_pieces: vec![6, 6],          // 6 pieces each in reserve
            current_player: 0,
            winner: None,
            game_over: false,
            last_event: Some("Qomet started! Player 1, place your first piece.".to_string()),
        }
    }

    pub fn place_piece(&mut self, player: u8, cell_idx: usize) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if cell_idx >= 16 {
            return Err("Invalid cell index".into());
        }
        if self.board[cell_idx].is_some() {
            return Err("Cell is already occupied".into());
        }
        let p_idx = player as usize;
        if self.reserve_pieces[p_idx] == 0 {
            return Err("No pieces left in reserve. You must move an existing piece.".into());
        }

        // Place piece
        self.board[cell_idx] = Some(player);
        self.reserve_pieces[p_idx] -= 1;

        let x = cell_idx % 4;
        let y = cell_idx / 4;
        self.last_event = Some(format!(
            "Player {} placed a piece at ({}, {}). (Reserve left: {})",
            player + 1, x, y, self.reserve_pieces[p_idx]
        ));

        self.post_move_check(player);
        Ok(())
    }

    pub fn move_piece(&mut self, player: u8, from_idx: usize, to_idx: usize) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if from_idx >= 16 || to_idx >= 16 {
            return Err("Invalid cell index".into());
        }
        if self.board[from_idx] != Some(player) {
            return Err("You don't own the piece at the source cell".into());
        }
        if self.board[to_idx].is_some() {
            return Err("Destination cell is already occupied".into());
        }
        if from_idx == to_idx {
            return Err("Source and destination cells must be different".into());
        }

        // Relocate piece
        self.board[from_idx] = None;
        self.board[to_idx] = Some(player);

        let fx = from_idx % 4;
        let fy = from_idx / 4;
        let tx = to_idx % 4;
        let ty = to_idx / 4;
        self.last_event = Some(format!(
            "Player {} moved their piece from ({}, {}) to ({}, {}).",
            player + 1, fx, fy, tx, ty
        ));

        self.post_move_check(player);
        Ok(())
    }

    fn post_move_check(&mut self, player: u8) {
        // Collect coordinates of all pieces belonging to player
        let occupied: Vec<(i32, i32)> = self.board
            .iter()
            .enumerate()
            .filter(|(_, &cell)| cell == Some(player))
            .map(|(idx, _)| ((idx % 4) as i32, (idx / 4) as i32))
            .collect();

        // Check if any subset of 4 forms a perfect square
        let mut won = false;
        let n = occupied.len();
        if n >= 4 {
            for i in 0..n {
                for j in i+1..n {
                    for k in j+1..n {
                        for l in k+1..n {
                            if is_square(occupied[i], occupied[j], occupied[k], occupied[l]) {
                                won = true;
                                break;
                            }
                        }
                        if won { break; }
                    }
                    if won { break; }
                }
                if won { break; }
            }
        }

        if won {
            self.game_over = true;
            self.winner = Some(player);
            self.last_event = Some(format!(
                "Player {} formed a perfect square! Player {} wins!",
                player + 1, player + 1
            ));
        } else {
            // Swap turns
            self.current_player = 1 - player;
        }
    }
}

// Coordinate distance-based square verification helper
fn is_square(p1: (i32, i32), p2: (i32, i32), p3: (i32, i32), p4: (i32, i32)) -> bool {
    let dist_sq = |a: (i32, i32), b: (i32, i32)| -> i32 {
        (a.0 - b.0).pow(2) + (a.1 - b.1).pow(2)
    };
    let mut d = vec![
        dist_sq(p1, p2), dist_sq(p1, p3), dist_sq(p1, p4),
        dist_sq(p2, p3), dist_sq(p2, p4),
        dist_sq(p3, p4)
    ];
    d.sort();
    
    // A square has 4 equal shorter sides and 2 equal longer diagonals.
    // Length must be > 0 (points must be distinct).
    // Diagonal length is exactly double the side length squared (d_diag^2 = 2 * d_side^2).
    d[0] > 0 && d[0] == d[1] && d[1] == d[2] && d[2] == d[3] &&
    d[4] == d[5] && d[4] == 2 * d[0]
}

impl Game for QometGame {
    fn process_action(
        &mut self,
        player: u8,
        action: serde_json::Value,
        players: &[String],
    ) -> Result<Vec<(String, ServerMessage)>, String> {
        match action.get("action").and_then(|v| v.as_str()) {
            Some("PlacePiece") => {
                let cell_idx = action
                    .get("cell_idx")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'cell_idx'".to_string())? as usize;
                self.place_piece(player, cell_idx)?;
            }
            Some("MovePiece") => {
                let from_idx = action
                    .get("from_idx")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'from_idx'".to_string())? as usize;
                let to_idx = action
                    .get("to_idx")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'to_idx'".to_string())? as usize;
                self.move_piece(player, from_idx, to_idx)?;
            }
            _ => return Err("Unknown action for Qomet".into()),
        }

        Ok(game_trait::broadcast_same(players, serde_json::to_value(self).unwrap()))
    }

    fn check_game_over(&self) -> Option<ServerMessage> {
        if self.game_over {
            Some(ServerMessage::GameOver {
                winner: self.winner.map(|w| format!("Player {}", w + 1)),
                reason: format!(
                    "Square formed! Winner: {}",
                    self.winner.map_or("Draw".to_string(), |w| format!("Player {}", w + 1))
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
            if let Some(p_idx) = _player {
                map.insert("localPlayerIdx".to_string(), serde_json::json!(p_idx));
            }
        }
        val
    }

    fn reset(&mut self) {
        *self = QometGame::new();
    }

    fn game_type(&self) -> &str {
        "qomet"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initial_state() {
        let game = QometGame::new();
        assert_eq!(game.board.len(), 16);
        assert!(game.board.iter().all(|c| c.is_none()));
        assert_eq!(game.reserve_pieces, vec![6, 6]);
        assert_eq!(game.current_player, 0);
        assert!(!game.game_over);
    }

    #[test]
    fn test_placement_and_moves() {
        let mut game = QometGame::new();
        
        // P1 places at 0
        game.place_piece(0, 0).unwrap();
        assert_eq!(game.board[0], Some(0));
        assert_eq!(game.reserve_pieces[0], 5);
        assert_eq!(game.current_player, 1);

        // P2 places at 5
        game.place_piece(1, 5).unwrap();
        assert_eq!(game.board[5], Some(1));
        assert_eq!(game.current_player, 0);

        // P1 moves 0 to 1
        game.move_piece(0, 0, 1).unwrap();
        assert_eq!(game.board[0], None);
        assert_eq!(game.board[1], Some(0));
        assert_eq!(game.current_player, 1);
    }

    #[test]
    fn test_win_axis_aligned_square() {
        let mut game = QometGame::new();
        // Set P1 pieces forming a 2x2 square: (0,0)->0, (1,0)->1, (0,1)->4, (1,1)->5
        // Player 1 will place the final piece at 5
        game.place_piece(0, 0).unwrap(); // P1 at 0 -> current becomes P2
        game.place_piece(1, 10).unwrap(); // P2 at 10 -> P1
        game.place_piece(0, 1).unwrap(); // P1 at 1 -> P2
        game.place_piece(1, 11).unwrap(); // P2 at 11 -> P1
        game.place_piece(0, 4).unwrap(); // P1 at 4 -> P2
        game.place_piece(1, 12).unwrap(); // P2 at 12 -> P1
        game.place_piece(0, 5).unwrap(); // P1 at 5 -> P1 wins!
        
        assert!(game.game_over);
        assert_eq!(game.winner, Some(0));
    }

    #[test]
    fn test_win_tilted_square() {
        let mut game = QometGame::new();
        // Tilted square: (0, 1) -> index 4, (1, 0) -> index 1, (2, 1) -> index 5 (wait, (2,1) is x=2 y=1 -> index 6), (1, 2) -> x=1 y=2 -> index 9
        // Check square: p1=(0,1)->4, p2=(1,0)->1, p3=(2,1)->6, p4=(1,2)->9
        // Let's test if is_square detects it:
        assert!(is_square((0,1), (1,0), (2,1), (1,2)));

        game.place_piece(0, 4).unwrap(); // P1
        game.place_piece(1, 15).unwrap(); // P2
        game.place_piece(0, 1).unwrap(); // P1
        game.place_piece(1, 14).unwrap(); // P2
        game.place_piece(0, 6).unwrap(); // P1
        game.place_piece(1, 13).unwrap(); // P2
        game.place_piece(0, 9).unwrap(); // P1 forms tilted square!

        assert!(game.game_over);
        assert_eq!(game.winner, Some(0));
    }
}
