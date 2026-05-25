use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::game_trait::{self, Game};
use crate::protocol::ServerMessage;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum CheckersVariant {
    Classic,
    Anti,
    Zombie,
    Minefield,
    Vip,
    Portal,
}

impl CheckersVariant {
    fn from_str(value: &str) -> Self {
        match value {
            "anti" => Self::Anti,
            "zombie" => Self::Zombie,
            "minefield" => Self::Minefield,
            "vip" => Self::Vip,
            "portal" => Self::Portal,
            _ => Self::Classic,
        }
    }

    fn as_str(&self) -> &'static str {
        match self {
            Self::Classic => "classic",
            Self::Anti => "anti",
            Self::Zombie => "zombie",
            Self::Minefield => "minefield",
            Self::Vip => "vip",
            Self::Portal => "portal",
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub struct CheckerPiece {
    pub owner: u8,
    pub is_king: bool,
    pub is_vip: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct MoveInfo {
    from: usize,
    to: usize,
    captured: Option<usize>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CheckersGame {
    pub board: Vec<Option<CheckerPiece>>,
    pub current_player: u8,
    pub variant: CheckersVariant,
    pub game_over: bool,
    pub winner: Option<u8>,
    pub must_jump_from: Option<usize>,
    pub mines: [Vec<usize>; 2],
    pub vip_pieces: [Option<usize>; 2],
    pub portals: HashMap<usize, usize>,
    pub setup_complete: [bool; 2],
    pub last_event: Option<String>,
}

impl CheckersGame {
    pub fn new() -> Self {
        Self::new_variant("classic")
    }

    pub fn new_variant(variant: &str) -> Self {
        let variant = CheckersVariant::from_str(variant);
        let mut board = vec![None; 64];
        for row in 0..3 {
            for col in 0..8 {
                if Self::is_dark(row, col) {
                    board[Self::idx(row, col)] = Some(CheckerPiece {
                        owner: 1,
                        is_king: false,
                        is_vip: false,
                    });
                }
            }
        }
        for row in 5..8 {
            for col in 0..8 {
                if Self::is_dark(row, col) {
                    board[Self::idx(row, col)] = Some(CheckerPiece {
                        owner: 0,
                        is_king: false,
                        is_vip: false,
                    });
                }
            }
        }

        let mut portals = HashMap::new();
        if variant == CheckersVariant::Portal {
            portals.insert(Self::idx(3, 0), Self::idx(4, 7));
            portals.insert(Self::idx(4, 7), Self::idx(3, 0));
            portals.insert(Self::idx(3, 6), Self::idx(4, 1));
            portals.insert(Self::idx(4, 1), Self::idx(3, 6));
        }

        let setup_done = !matches!(variant, CheckersVariant::Minefield | CheckersVariant::Vip);

        Self {
            board,
            current_player: 0,
            variant,
            game_over: false,
            winner: None,
            must_jump_from: None,
            mines: [Vec::new(), Vec::new()],
            vip_pieces: [None, None],
            portals,
            setup_complete: [setup_done, setup_done],
            last_event: None,
        }
    }

    fn idx(row: usize, col: usize) -> usize {
        row * 8 + col
    }
    fn row(index: usize) -> usize {
        index / 8
    }
    fn col(index: usize) -> usize {
        index % 8
    }
    fn is_dark(row: usize, col: usize) -> bool {
        (row + col) % 2 == 1
    }
    fn valid_index(index: usize) -> bool {
        index < 64 && Self::is_dark(Self::row(index), Self::col(index))
    }
    fn setup_ready(&self) -> bool {
        self.setup_complete[0] && self.setup_complete[1]
    }

    fn dirs(piece: CheckerPiece) -> Vec<(i8, i8)> {
        let mut dirs = Vec::new();
        if piece.is_king || piece.owner == 0 {
            dirs.push((-1, -1));
            dirs.push((-1, 1));
        }
        if piece.is_king || piece.owner == 1 {
            dirs.push((1, -1));
            dirs.push((1, 1));
        }
        dirs
    }

    fn offset(index: usize, dr: i8, dc: i8) -> Option<usize> {
        let row = Self::row(index) as i8 + dr;
        let col = Self::col(index) as i8 + dc;
        if !(0..8).contains(&row) || !(0..8).contains(&col) {
            return None;
        }
        Some(Self::idx(row as usize, col as usize))
    }

    fn captures_from(&self, from: usize) -> Vec<MoveInfo> {
        let Some(piece) = self.board.get(from).copied().flatten() else {
            return Vec::new();
        };
        Self::dirs(piece)
            .into_iter()
            .filter_map(|(dr, dc)| {
                let mid = Self::offset(from, dr, dc)?;
                let to = Self::offset(from, dr * 2, dc * 2)?;
                let jumped = self.board[mid]?;
                if jumped.owner == piece.owner || self.board[to].is_some() || !Self::valid_index(to)
                {
                    return None;
                }
                Some(MoveInfo {
                    from,
                    to,
                    captured: Some(mid),
                })
            })
            .collect()
    }

    fn legal_moves_from(&self, from: usize) -> Vec<MoveInfo> {
        let Some(piece) = self.board.get(from).copied().flatten() else {
            return Vec::new();
        };
        if piece.owner != self.current_player {
            return Vec::new();
        }
        let captures = self.captures_from(from);
        if !captures.is_empty() {
            return captures;
        }
        Self::dirs(piece)
            .into_iter()
            .filter_map(|(dr, dc)| {
                let to = Self::offset(from, dr, dc)?;
                if Self::valid_index(to) && self.board[to].is_none() {
                    Some(MoveInfo {
                        from,
                        to,
                        captured: None,
                    })
                } else {
                    None
                }
            })
            .collect()
    }

    fn player_has_capture(&self, player: u8) -> bool {
        self.board.iter().enumerate().any(|(idx, piece)| {
            piece
                .map(|p| p.owner == player && !self.captures_from(idx).is_empty())
                .unwrap_or(false)
        })
    }

    fn player_has_move(&self, player: u8) -> bool {
        self.board.iter().enumerate().any(|(idx, piece)| {
            piece
                .map(|p| {
                    p.owner == player && !self.legal_moves_for_player_from(player, idx).is_empty()
                })
                .unwrap_or(false)
        })
    }

    fn legal_moves_for_player_from(&self, player: u8, from: usize) -> Vec<MoveInfo> {
        let Some(piece) = self.board.get(from).copied().flatten() else {
            return Vec::new();
        };
        if piece.owner != player {
            return Vec::new();
        }
        let mut clone = self.clone();
        clone.current_player = player;
        clone.legal_moves_from(from)
    }

    fn piece_count(&self, player: u8) -> usize {
        self.board
            .iter()
            .filter(|piece| piece.map(|p| p.owner == player).unwrap_or(false))
            .count()
    }

    fn promote_if_needed(&mut self, index: usize) {
        if let Some(mut piece) = self.board[index] {
            if (piece.owner == 0 && Self::row(index) == 0)
                || (piece.owner == 1 && Self::row(index) == 7)
            {
                piece.is_king = true;
                self.board[index] = Some(piece);
            }
        }
    }

    fn explosion_cells(index: usize) -> Vec<usize> {
        let mut cells = vec![index];
        for dr in -1..=1 {
            for dc in -1..=1 {
                if dr == 0 && dc == 0 {
                    continue;
                }
                if let Some(next) = Self::offset(index, dr, dc) {
                    cells.push(next);
                }
            }
        }
        cells
    }

    fn apply_mine_if_needed(&mut self, landing: usize, player: u8) -> bool {
        if self.variant != CheckersVariant::Minefield {
            return false;
        }
        let opponent = 1 - player;
        if !self.mines[opponent as usize].contains(&landing) {
            return false;
        }
        self.mines[opponent as usize].retain(|mine| *mine != landing);
        for cell in Self::explosion_cells(landing) {
            self.board[cell] = None;
        }
        self.last_event = Some("Boom! A mine exploded.".into());
        true
    }

    fn apply_portal_if_needed(&mut self, landing: usize) -> usize {
        if self.variant != CheckersVariant::Portal {
            return landing;
        }
        let Some(&destination) = self.portals.get(&landing) else {
            return landing;
        };
        if let Some(piece) = self.board[landing] {
            self.board[landing] = None;
            self.board[destination] = Some(piece);
            self.last_event = Some("Portal jump!".into());
            destination
        } else {
            landing
        }
    }

    fn update_game_over(&mut self) {
        for player in 0..=1 {
            let no_pieces = self.piece_count(player) == 0;
            let no_moves = !no_pieces && !self.player_has_move(player);
            if no_pieces || no_moves {
                self.game_over = true;
                self.winner = Some(if self.variant == CheckersVariant::Anti {
                    player
                } else {
                    1 - player
                });
                return;
            }
        }
    }

    fn set_secret(
        &mut self,
        player: u8,
        mines: Vec<usize>,
        vip: Option<usize>,
    ) -> Result<(), String> {
        if !matches!(
            self.variant,
            CheckersVariant::Minefield | CheckersVariant::Vip
        ) {
            return Err("This variant has no setup phase".into());
        }
        if self.setup_complete[player as usize] {
            return Err("Setup already complete".into());
        }
        if self.variant == CheckersVariant::Minefield {
            if mines.len() > 3 {
                return Err("Choose up to 3 mines".into());
            }
            if mines.iter().any(|idx| !Self::valid_index(*idx)) {
                return Err("Mines must be on dark squares".into());
            }
            self.mines[player as usize] = mines;
        }
        if self.variant == CheckersVariant::Vip {
            let vip = vip.ok_or_else(|| "Choose a VIP piece".to_string())?;
            let Some(mut piece) = self.board.get(vip).copied().flatten() else {
                return Err("VIP must be one of your pieces".into());
            };
            if piece.owner != player {
                return Err("VIP must be one of your pieces".into());
            }
            piece.is_vip = true;
            self.board[vip] = Some(piece);
            self.vip_pieces[player as usize] = Some(vip);
        }
        self.setup_complete[player as usize] = true;
        Ok(())
    }

    fn move_piece(&mut self, player: u8, from: usize, to: usize) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if !self.setup_ready() {
            return Err("Both players must finish setup first".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if !Self::valid_index(from) || !Self::valid_index(to) {
            return Err("Move must use dark board squares".into());
        }
        if self.must_jump_from.is_some() && self.must_jump_from != Some(from) {
            return Err("You must continue the jump combo".into());
        }
        let legal = self.legal_moves_from(from);
        let capture_required = self.player_has_capture(player);
        let selected = legal.iter().find(|mv| mv.to == to).copied();
        let Some(selected) = selected else {
            if capture_required {
                return Err("A capture is required".into());
            }
            return Err("Illegal move".into());
        };
        if selected.captured.is_none() && capture_required {
            return Err("A capture is required".into());
        }

        let mut piece = self.board[from]
            .take()
            .ok_or_else(|| "No piece at source".to_string())?;
        if let Some(captured_idx) = selected.captured {
            if let Some(captured) = self.board[captured_idx] {
                if self.variant == CheckersVariant::Vip && captured.is_vip {
                    self.game_over = true;
                    self.winner = Some(player);
                    self.last_event = Some("VIP captured!".into());
                }
                if self.variant == CheckersVariant::Zombie {
                    self.board[captured_idx] = Some(CheckerPiece {
                        owner: player,
                        ..captured
                    });
                    self.last_event = Some("Infection!".into());
                } else {
                    self.board[captured_idx] = None;
                }
            }
        }

        self.board[to] = Some(piece);
        self.promote_if_needed(to);
        piece = self.board[to].unwrap();

        let mine_exploded = self.apply_mine_if_needed(to, player);
        let landing = if mine_exploded {
            to
        } else {
            self.apply_portal_if_needed(to)
        };
        if !mine_exploded {
            self.promote_if_needed(landing);
            if let Some(updated) = self.board[landing] {
                piece = updated;
            }
        }

        if self.game_over {
            return Ok(());
        }

        let can_continue = selected.captured.is_some()
            && !mine_exploded
            && self.variant != CheckersVariant::Portal
            && self
                .board
                .get(landing)
                .copied()
                .flatten()
                .map(|p| p.owner == player)
                .unwrap_or(false)
            && !self.captures_from(landing).is_empty();

        if can_continue {
            self.must_jump_from = Some(landing);
        } else {
            self.must_jump_from = None;
            self.current_player = 1 - self.current_player;
        }

        let _ = piece;
        self.update_game_over();
        Ok(())
    }

    pub fn state_json(&self, for_player: Option<u8>) -> serde_json::Value {
        let player = for_player.unwrap_or(0);
        let board: Vec<_> = self
            .board
            .iter()
            .map(|piece| {
                piece.map(|p| {
                    serde_json::json!({
                        "owner": p.owner,
                        "isKing": p.is_king,
                        "isVip": p.is_vip && (self.game_over || p.owner == player),
                    })
                })
            })
            .collect();

        serde_json::json!({
            "board": board,
            "currentPlayer": self.current_player,
            "variant": self.variant.as_str(),
            "gameOver": self.game_over,
            "winner": self.winner,
            "mustJumpFrom": self.must_jump_from,
            "setupComplete": self.setup_complete,
            "mySetupComplete": self.setup_complete[player as usize],
            "needsSetup": !self.setup_ready(),
            "myMines": if self.variant == CheckersVariant::Minefield { self.mines[player as usize].clone() } else { Vec::new() },
            "myVip": self.vip_pieces[player as usize],
            "portals": self.portals,
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
        match action.get("game").and_then(|value| value.as_str()) {
            Some("CheckersSecret") => {
                let mines = action
                    .get("mines")
                    .and_then(|value| value.as_array())
                    .map(|items| {
                        items
                            .iter()
                            .filter_map(|item| item.as_u64().map(|n| n as usize))
                            .collect()
                    })
                    .unwrap_or_else(Vec::new);
                let vip = action
                    .get("vip")
                    .and_then(|value| value.as_u64())
                    .map(|n| n as usize);
                self.set_secret(player, mines, vip)?;
            }
            Some("CheckersMove") => {
                let from = action
                    .get("from")
                    .and_then(|value| value.as_u64())
                    .ok_or_else(|| "Missing from square".to_string())?
                    as usize;
                let to = action
                    .get("to")
                    .and_then(|value| value.as_u64())
                    .ok_or_else(|| "Missing to square".to_string())?
                    as usize;
                self.move_piece(player, from, to)?;
            }
            _ => return Err("Unknown checkers action".into()),
        }
        Ok(game_trait::broadcast_per_player(players, |p| {
            self.state_json(Some(p))
        }))
    }

    fn check_game_over(&self) -> Option<ServerMessage> {
        if self.game_over {
            Some(ServerMessage::GameOver {
                winner: self.winner.map(|winner| format!("Player {}", winner + 1)),
                reason: "Checkers completed".into(),
            })
        } else {
            None
        }
    }

    fn state_for_player(&self, player: Option<u8>) -> serde_json::Value {
        self.state_json(player)
    }

    fn reset(&mut self) {
        *self = Self::new_variant(self.variant.as_str());
    }

    fn game_type(&self) -> &str {
        "checkers"
    }
}

#[cfg(test)]
mod tests {
    use super::CheckersGame;

    #[test]
    fn classic_move_advances_piece() {
        let mut game = CheckersGame::new_variant("classic");
        game.move_piece(0, 40, 33).unwrap();

        assert!(game.board[40].is_none());
        assert_eq!(game.board[33].unwrap().owner, 0);
        assert_eq!(game.current_player, 1);
    }

    #[test]
    fn forced_capture_is_required() {
        let mut game = CheckersGame::new_variant("classic");
        game.board = vec![None; 64];
        game.board[42] = Some(super::CheckerPiece {
            owner: 0,
            is_king: false,
            is_vip: false,
        });
        game.board[33] = Some(super::CheckerPiece {
            owner: 1,
            is_king: false,
            is_vip: false,
        });

        let error = game.move_piece(0, 42, 35).unwrap_err();

        assert_eq!(error, "A capture is required");
    }

    #[test]
    fn zombie_capture_converts_piece() {
        let mut game = CheckersGame::new_variant("zombie");
        game.board = vec![None; 64];
        game.board[42] = Some(super::CheckerPiece {
            owner: 0,
            is_king: false,
            is_vip: false,
        });
        game.board[33] = Some(super::CheckerPiece {
            owner: 1,
            is_king: false,
            is_vip: false,
        });

        game.move_piece(0, 42, 24).unwrap();

        assert_eq!(game.board[33].unwrap().owner, 0);
    }

    #[test]
    fn minefield_explosion_removes_landing_area() {
        let mut game = CheckersGame::new_variant("minefield");
        game.setup_complete = [true, true];
        game.mines[1] = vec![24];
        game.board = vec![None; 64];
        game.board[33] = Some(super::CheckerPiece {
            owner: 0,
            is_king: false,
            is_vip: false,
        });

        game.move_piece(0, 33, 24).unwrap();

        assert!(game.board[24].is_none());
        assert_eq!(game.last_event.as_deref(), Some("Boom! A mine exploded."));
    }

    #[test]
    fn vip_capture_ends_game() {
        let mut game = CheckersGame::new_variant("vip");
        game.setup_complete = [true, true];
        game.board = vec![None; 64];
        game.board[42] = Some(super::CheckerPiece {
            owner: 0,
            is_king: false,
            is_vip: false,
        });
        game.board[33] = Some(super::CheckerPiece {
            owner: 1,
            is_king: false,
            is_vip: true,
        });

        game.move_piece(0, 42, 24).unwrap();

        assert!(game.game_over);
        assert_eq!(game.winner, Some(0));
    }
}
