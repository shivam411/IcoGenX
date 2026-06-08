/* backend/src/games/checkers.rs */
use crate::game_trait::{self, Game};
use crate::protocol::ServerMessage;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, Copy)]
pub struct CheckerPiece {
    pub owner: u8,
    pub is_king: bool,
    #[serde(skip_serializing)]
    pub is_vip_secret: bool,
}

#[derive(Debug, Clone)]
pub struct CheckersGame {
    pub board: Vec<Option<CheckerPiece>>, // 64 entries (8x8)
    pub current_player: u8,
    pub variant: String,
    pub game_over: bool,
    pub winner: Option<u8>,
    pub must_jump_from: Option<usize>,

    // Setup and Secret Phase state
    pub mines: [Vec<usize>; 2],
    pub vip_pieces: [Option<usize>; 2],
    pub setup_complete: [bool; 2],
    pub needs_setup: bool,

    // Portal state
    pub portals: HashMap<usize, usize>,

    // Event log
    pub last_event: Option<String>,
}

impl CheckersGame {
    pub fn new(variant: &str) -> Self {
        let mut board = vec![None; 64];

        // Standard pieces initialization on dark squares
        // Red (Player 0) starts on rows 0, 1, 2
        for r in 0..3 {
            for c in 0..8 {
                if (r + c) % 2 == 1 {
                    board[r * 8 + c] = Some(CheckerPiece {
                        owner: 0,
                        is_king: false,
                        is_vip_secret: false,
                    });
                }
            }
        }

        // Black (Player 1) starts on rows 5, 6, 7
        for r in 5..8 {
            for c in 0..8 {
                if (r + c) % 2 == 1 {
                    board[r * 8 + c] = Some(CheckerPiece {
                        owner: 1,
                        is_king: false,
                        is_vip_secret: false,
                    });
                }
            }
        }

        let needs_setup = variant == "minefield" || variant == "vip";

        // Setup portal locations near the center if variant is portal
        let mut portals = HashMap::new();
        if variant == "portal" {
            // Dark squares in rows 3 and 4 are:
            // Row 3: 25, 27, 29, 31
            // Row 4: 32, 34, 36, 38
            // Let's place Portal A (Pennies) at 25 and 38, Portal B (Dimes) at 27 and 36
            portals.insert(25, 38);
            portals.insert(38, 25);
            portals.insert(27, 36);
            portals.insert(36, 27);
        }

        CheckersGame {
            board,
            current_player: 0,
            variant: variant.to_string(),
            game_over: false,
            winner: None,
            must_jump_from: None,
            mines: [Vec::new(), Vec::new()],
            vip_pieces: [None, None],
            setup_complete: [false, false],
            needs_setup,
            portals,
            last_event: None,
        }
    }

    pub fn new_variant(variant: &str) -> Self {
        Self::new(variant)
    }

    fn is_dark(idx: usize) -> bool {
        let r = idx / 8;
        let c = idx % 8;
        (r + c) % 2 == 1
    }

    /// Check if a player has any pieces left on the board
    fn has_pieces(&self, player: u8) -> bool {
        self.board
            .iter()
            .any(|slot| slot.map_or(false, |p| p.owner == player))
    }

    /// Set secret mines or VIP pieces
    pub fn set_secrets(
        &mut self,
        player: u8,
        mines: Option<Vec<usize>>,
        vip: Option<usize>,
    ) -> Result<(), String> {
        if !self.needs_setup || self.setup_complete[player as usize] {
            return Err("Setup is already complete or not needed".to_string());
        }

        if self.variant == "minefield" {
            let m_list = mines.ok_or_else(|| "Mines list is required".to_string())?;
            if m_list.is_empty() || m_list.len() > 3 {
                return Err("Must select 1 to 3 mine locations".to_string());
            }

            for idx in &m_list {
                if !Self::is_dark(*idx) {
                    return Err("Mines must be placed on dark squares".to_string());
                }
                let row = *idx / 8;
                if player == 0 && row >= 4 {
                    return Err("Player 1 mines must be on rows 0-3".to_string());
                }
                if player == 1 && row < 4 {
                    return Err("Player 2 mines must be on rows 4-7".to_string());
                }
            }
            self.mines[player as usize] = m_list;
        } else if self.variant == "vip" {
            let vip_idx = vip.ok_or_else(|| "VIP selection is required".to_string())?;
            if !Self::is_dark(vip_idx) {
                return Err("VIP must be on a dark square".to_string());
            }

            let piece = self.board[vip_idx]
                .ok_or_else(|| "No piece at selection".to_string())?;
            if piece.owner != player {
                return Err("You must select your own piece".to_string());
            }

            let row = vip_idx / 8;
            if player == 0 && row != 0 {
                return Err("Player 1 VIP must be in the back row (row 0)".to_string());
            }
            if player == 1 && row != 7 {
                return Err("Player 2 VIP must be in the back row (row 7)".to_string());
            }

            self.vip_pieces[player as usize] = Some(vip_idx);
            if let Some(p) = self.board[vip_idx].as_mut() {
                p.is_vip_secret = true;
            }
        }

        self.setup_complete[player as usize] = true;
        if self.setup_complete[0] && self.setup_complete[1] {
            self.needs_setup = false;
        }
        Ok(())
    }

    /// Check if a diagonal step goes forward for the player
    fn is_forward(player: u8, from: usize, to: usize) -> bool {
        let from_row = from / 8;
        let to_row = to / 8;
        if player == 0 {
            to_row > from_row
        } else {
            to_row < from_row
        }
    }

    /// Compute all valid moves or jumps for the current player
    pub fn get_valid_moves(&self) -> Vec<(usize, usize, bool)> {
        let mut moves = Vec::new();
        let mut jumps = Vec::new();

        for from in 0..64 {
            if let Some(piece) = self.board[from] {
                if piece.owner != self.current_player {
                    continue;
                }
                if let Some(restrict_from) = self.must_jump_from {
                    if from != restrict_from {
                        continue;
                    }
                }

                let from_row = from / 8;
                let from_col = from % 8;

                // Directions: Up-Left, Up-Right, Down-Left, Down-Right
                let dirs = [(-1, -1), (-1, 1), (1, -1), (1, 1)];

                for (dr, dc) in dirs {
                    // Check normal move (1 step)
                    if self.must_jump_from.is_none() {
                        let to_row = from_row as isize + dr;
                        let to_col = from_col as isize + dc;
                        if to_row >= 0 && to_row < 8 && to_col >= 0 && to_col < 8 {
                            let to = (to_row * 8 + to_col) as usize;
                            if self.board[to].is_none() {
                                if piece.is_king || Self::is_forward(self.current_player, from, to) {
                                    moves.push((from, to, false));
                                }
                            }
                        }
                    }

                    // Check jump move (2 steps)
                    let mid_row = from_row as isize + dr;
                    let mid_col = from_col as isize + dc;
                    let to_row = from_row as isize + 2 * dr;
                    let to_col = from_col as isize + 2 * dc;

                    if to_row >= 0 && to_row < 8 && to_col >= 0 && to_col < 8 {
                        let mid = (mid_row * 8 + mid_col) as usize;
                        let to = (to_row * 8 + to_col) as usize;

                        if let Some(mid_piece) = self.board[mid] {
                            if mid_piece.owner != self.current_player && self.board[to].is_none() {
                                if piece.is_king || Self::is_forward(self.current_player, from, to) {
                                    jumps.push((from, to, true));
                                }
                            }
                        }
                    }
                }
            }
        }

        if !jumps.is_empty() {
            jumps
        } else {
            moves
        }
    }

    /// Execute a checkers move
    pub fn make_move(&mut self, player: u8, from: usize, to: usize) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".to_string());
        }
        if self.needs_setup {
            return Err("Wait for setup phase to complete".to_string());
        }
        if player != self.current_player {
            return Err("Not your turn".to_string());
        }

        let valid_moves = self.get_valid_moves();
        let matched_move = valid_moves
            .iter()
            .find(|(f, t, _)| *f == from && *t == to)
            .ok_or_else(|| "Invalid move".to_string())?;

        let is_jump = matched_move.2;
        let mut piece = self.board[from].ok_or_else(|| "No piece to move".to_string())?;

        self.board[from] = None;
        self.board[to] = Some(piece);
        self.last_event = None;

        let mut turn_ended = !is_jump;
        let mut force_jump_landing = to;

        if is_jump {
            let mid = (from + to) / 2;
            if let Some(captured) = self.board[mid] {
                if self.variant == "zombie" {
                    // Zombie mode: Convert piece to our side and place it back as normal pawn
                    self.board[mid] = Some(CheckerPiece {
                        owner: self.current_player,
                        is_king: false,
                        is_vip_secret: false,
                    });
                } else {
                    // Regular capture: remove piece and check VIP
                    self.board[mid] = None;
                    if self.variant == "vip" && captured.is_vip_secret {
                        self.winner = Some(self.current_player);
                        self.game_over = true;
                        self.last_event = Some("VIP Captured!".to_string());
                        return Ok(());
                    }
                }
            }
        }

        // Handle promotions
        let to_row = to / 8;
        if (self.current_player == 0 && to_row == 7) || (self.current_player == 1 && to_row == 0) {
            if !piece.is_king {
                piece.is_king = true;
                self.board[to] = Some(piece);
            }
        }

        // Portals logic
        if self.variant == "portal" && self.portals.contains_key(&to) {
            let twin = self.portals[&to];
            let telefragged = self.board[twin];
            
            // Move piece to the twin portal
            self.board[twin] = self.board[to];
            self.board[to] = None;

            if let Some(target) = telefragged {
                if target.is_vip_secret {
                    self.winner = Some(self.current_player);
                    self.game_over = true;
                }
            }

            self.last_event = Some("Portal Teleport!".to_string());
            // Teleportation ends the turn immediately (no chain jumps)
            turn_ended = true;
        }

        // Minefield logic
        if self.variant == "minefield" {
            let opp = 1 - self.current_player;
            let current_landing = if self.variant == "portal" && self.portals.contains_key(&to) {
                self.portals[&to]
            } else {
                to
            };

            if self.mines[opp as usize].contains(&current_landing) {
                // Trigger explosion!
                self.last_event = Some("Boom! Mine Detonated!".to_string());
                
                // Remove mine
                self.mines[opp as usize].retain(|idx| *idx != current_landing);

                // Remove trigger piece
                let blown_piece = self.board[current_landing];
                self.board[current_landing] = None;
                if let Some(p) = blown_piece {
                    if p.is_vip_secret {
                        self.winner = Some(opp);
                        self.game_over = true;
                        return Ok(());
                    }
                }

                // Remove diagonal neighbors in 1-square radius
                let r = current_landing / 8;
                let c = current_landing % 8;

                let neighbors = [
                    (-1, -1), (-1, 1), (1, -1), (1, 1)
                ];

                for (dr, dc) in neighbors {
                    let nr = r as isize + dr;
                    let nc = c as isize + dc;
                    if nr >= 0 && nr < 8 && nc >= 0 && nc < 8 {
                        let target_idx = (nr * 8 + nc) as usize;
                        if let Some(p) = self.board[target_idx] {
                            self.board[target_idx] = None;
                            if p.is_vip_secret {
                                // If any VIP gets blown up, its owner loses.
                                // If player's own VIP blows up, they lose. If both blow up, opponent gets it.
                                self.winner = Some(1 - p.owner);
                                self.game_over = true;
                            }
                        }
                    }
                }

                if self.game_over {
                    return Ok(());
                }

                // Explosion destroys the active piece, turn must end
                turn_ended = true;
            }
        }

        // If turn isn't ended, check if there are further jumps from the new location
        if !turn_ended {
            self.must_jump_from = Some(force_jump_landing);
            let next_valid = self.get_valid_moves();
            
            // Only keep player turn if next moves are JUMPS starting from the landing tile
            let has_more_jumps = next_valid.iter().any(|(f, _, is_j)| *f == force_jump_landing && *is_j);
            if has_more_jumps {
                // Do not switch current player
                return Ok(());
            }
        }

        // End turn and switch player
        self.current_player = 1 - self.current_player;
        self.must_jump_from = None;

        // Check if next player is trapped (no pieces or no legal moves)
        let opponent = self.current_player;
        let has_opponent_pieces = self.has_pieces(opponent);
        let opponent_valid_moves = self.get_valid_moves();

        if !has_opponent_pieces || opponent_valid_moves.is_empty() {
            self.game_over = true;
            if self.variant == "anti" {
                // Giveaway Checkers: Player who CANNOT move wins
                self.winner = Some(opponent);
            } else {
                // Classic/Normal Checkers: Player who CANNOT move loses
                self.winner = Some(1 - opponent);
            }
        }

        // Also check if current player has no pieces left (e.g. they blew up all their pieces)
        let active_has_pieces = self.has_pieces(self.current_player);
        if !active_has_pieces {
            self.game_over = true;
            if self.variant == "anti" {
                self.winner = Some(self.current_player);
            } else {
                self.winner = Some(1 - self.current_player);
            }
        }

        Ok(())
    }

    pub fn state_json(&self, for_player: Option<u8>) -> serde_json::Value {
        // Map board pieces, hiding the VIP details of the opponent
        let board_mapped: Vec<serde_json::Value> = self
            .board
            .iter()
            .map(|slot| {
                if let Some(piece) = slot {
                    let is_vip_visible = for_player.map_or(false, |p| p == piece.owner) && piece.is_vip_secret;
                    serde_json::json!({
                        "owner": piece.owner,
                        "isKing": piece.is_king,
                        "isVip": is_vip_visible,
                    })
                } else {
                    serde_json::Value::Null
                }
            })
            .collect();

        // Render portals as map of string keys
        let mut portals_json = serde_json::Map::new();
        for (k, v) in &self.portals {
            portals_json.insert(k.to_string(), serde_json::json!(v));
        }

        let my_mines = for_player
            .map(|p| self.mines[p as usize].clone())
            .unwrap_or_default();

        serde_json::json!({
            "board": board_mapped,
            "currentPlayer": self.current_player,
            "variant": self.variant,
            "gameOver": self.game_over,
            "winner": self.winner,
            "mustJumpFrom": self.must_jump_from,
            "needsSetup": self.needs_setup,
            "mySetupComplete": for_player.map(|p| self.setup_complete[p as usize]).unwrap_or(false),
            "myMines": my_mines,
            "portals": portals_json,
            "lastEvent": self.last_event,
        })
    }
}

impl Game for CheckersGame {
    fn process_action(
        &mut self,
        player: u8,
        action: serde_json::Value,
        players: &[String],
    ) -> Result<Vec<(String, ServerMessage)>, String> {
        let game_action = action
            .get("game")
            .and_then(|v| v.as_str())
            .ok_or_else(|| "Missing 'game' action field".to_string())?;

        if game_action == "CheckersSecret" {
            let mines = action.get("mines").and_then(|v| {
                v.as_array().map(|arr| {
                    arr.iter()
                        .filter_map(|val| val.as_u64().map(|n| n as usize))
                        .collect::<Vec<usize>>()
                })
            });
            let vip = action.get("vip").and_then(|v| v.as_u64().map(|n| n as usize));
            self.set_secrets(player, mines, vip)?;
        } else if game_action == "CheckersMove" {
            let from = action
                .get("from")
                .and_then(|v| v.as_u64())
                .ok_or_else(|| "Missing 'from' field".to_string())? as usize;
            let to = action
                .get("to")
                .and_then(|v| v.as_u64())
                .ok_or_else(|| "Missing 'to' field".to_string())? as usize;

            self.make_move(player, from, to)?;
        } else {
            return Err("Unknown action".to_string());
        }

        let msgs = game_trait::broadcast_per_player(players, |p| self.state_json(Some(p)));
        Ok(msgs)
    }

    fn check_game_over(&self) -> Option<ServerMessage> {
        if self.game_over {
            Some(ServerMessage::GameOver {
                winner: self.winner.map(|w| format!("Player {}", w + 1)),
                reason: if self.variant == "anti" {
                    "All pieces lost or trapped!".to_string()
                } else if self.variant == "vip" {
                    "VIP captured!".to_string()
                } else {
                    "All opponent pieces captured or trapped!".to_string()
                },
            })
        } else {
            None
        }
    }

    fn state_for_player(&self, player: Option<u8>) -> serde_json::Value {
        self.state_json(player)
    }

    fn reset(&mut self) {
        *self = CheckersGame::new(&self.variant);
    }

    fn game_type(&self) -> &str {
        "checkers"
    }
}

#[cfg(test)]
mod tests {
    use super::CheckersGame;

    #[test]
    fn test_initial_setup() {
        let game = CheckersGame::new("classic");
        assert_eq!(game.current_player, 0);
        assert!(!game.game_over);
        // P0 (red) has 12 pieces initially
        let p0_pieces = game.board.iter().filter(|slot| slot.map_or(false, |p| p.owner == 0)).count();
        assert_eq!(p0_pieces, 12);
    }

    #[test]
    fn test_mandatory_jumps() {
        let mut game = CheckersGame::new("classic");
        // Clear board and place custom pieces
        game.board = vec![None; 64];
        // P0 piece
        game.board[18] = Some(super::CheckerPiece { owner: 0, is_king: false, is_vip_secret: false });
        // P1 piece in path
        game.board[27] = Some(super::CheckerPiece { owner: 1, is_king: false, is_vip_secret: false });

        let moves = game.get_valid_moves();
        // Since there is a jump (18 -> 27 -> 36), normal moves are disallowed.
        assert_eq!(moves.len(), 1);
        assert_eq!(moves[0], (18, 36, true));
    }

    #[test]
    fn test_anti_checkers_win() {
        // Giveaway Checkers: player who has no pieces wins
        let mut game = CheckersGame::new("anti");
        game.board = vec![None; 64];
        game.board[1] = Some(super::CheckerPiece { owner: 0, is_king: false, is_vip_secret: false });
        game.current_player = 0;
        // Make P0 move to index 10
        let res = game.make_move(0, 1, 10);
        assert!(res.is_ok());
        // Since P1 has 0 pieces, the game ends on P0's move (as P1 has no moves and no pieces)
        // In anti, P1 (who has 0 pieces) wins!
        assert!(game.game_over);
        assert_eq!(game.winner, Some(1));
    }

    #[test]
    fn test_zombie_checkers() {
        let mut game = CheckersGame::new("zombie");
        game.board = vec![None; 64];
        game.board[18] = Some(super::CheckerPiece { owner: 0, is_king: false, is_vip_secret: false });
        game.board[27] = Some(super::CheckerPiece { owner: 1, is_king: false, is_vip_secret: false });

        game.make_move(0, 18, 36).unwrap();
        // Index 27 is zombie converted to owner 0
        assert!(game.board[27].is_some());
        assert_eq!(game.board[27].unwrap().owner, 0);
    }

    #[test]
    fn test_minefield_checkers() {
        let mut game = CheckersGame::new("minefield");
        game.board = vec![None; 64];
        // Place P0's piece at 33 (row 4, col 1)
        game.board[33] = Some(super::CheckerPiece { owner: 0, is_king: false, is_vip_secret: false });
        // Place P1's mine at index 42 (row 5, col 2)
        game.mines[1] = vec![42];
        game.setup_complete = [true, true];
        game.needs_setup = false;
        game.current_player = 0;

        // Place a piece at diagonal neighbor 49 (row 6, col 1) to see if it gets blown up
        game.board[49] = Some(super::CheckerPiece { owner: 1, is_king: false, is_vip_secret: false });

        game.make_move(0, 33, 42).unwrap();
        // Index 42 should be empty (exploded)
        assert!(game.board[42].is_none());
        // Diagonal neighbor 49 should be empty (exploded)
        assert!(game.board[49].is_none());
    }

    #[test]
    fn test_vip_checkers() {
        let mut game = CheckersGame::new("vip");
        game.board = vec![None; 64];
        game.board[18] = Some(super::CheckerPiece { owner: 0, is_king: false, is_vip_secret: true });
        game.board[27] = Some(super::CheckerPiece { owner: 1, is_king: false, is_vip_secret: false });
        game.setup_complete = [true, true];
        game.needs_setup = false;

        game.current_player = 1;
        game.make_move(1, 27, 9).unwrap(); // Capture P0's VIP at 18
        assert!(game.game_over);
        assert_eq!(game.winner, Some(1));
    }

    #[test]
    fn test_portal_checkers() {
        let mut game = CheckersGame::new("portal");
        game.board = vec![None; 64];
        game.board[18] = Some(super::CheckerPiece { owner: 0, is_king: false, is_vip_secret: false });
        // Portal A at 25 and 38
        game.portals.insert(25, 38);
        game.portals.insert(38, 25);

        // Move piece from 18 to portal 25
        game.make_move(0, 18, 25).unwrap();
        // Portal 25 should be empty
        assert!(game.board[25].is_none());
        // Twin portal 38 should contain the piece
        assert!(game.board[38].is_some());
        assert_eq!(game.board[38].unwrap().owner, 0);
    }
}
