use serde::{Deserialize, Serialize};
use std::collections::HashSet;

use crate::game_trait::{self, Game};
use crate::protocol::ServerMessage;

const COLS: usize = 7;
const ROWS: usize = 6;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum DropFourVariant {
    Classic,
    WreckingBall,
    Popout,
    GravityFlip,
    BattleshipDrop,
    HeavyToken,
}

impl DropFourVariant {
    fn from_str(value: &str) -> Self {
        match value {
            "wrecking-ball" => Self::WreckingBall,
            "popout" => Self::Popout,
            "gravity-flip" => Self::GravityFlip,
            "battleship-drop" => Self::BattleshipDrop,
            "heavy-token" => Self::HeavyToken,
            _ => Self::Classic,
        }
    }

    fn as_str(&self) -> &'static str {
        match self {
            Self::Classic => "classic",
            Self::WreckingBall => "wrecking-ball",
            Self::Popout => "popout",
            Self::GravityFlip => "gravity-flip",
            Self::BattleshipDrop => "battleship-drop",
            Self::HeavyToken => "heavy-token",
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum DropFourPieceKind {
    Normal,
    WreckingBall,
    Heavy,
}

impl DropFourPieceKind {
    fn from_str(value: &str) -> Self {
        match value {
            "wrecking-ball" => Self::WreckingBall,
            "heavy" => Self::Heavy,
            _ => Self::Normal,
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub struct DropFourPiece {
    pub owner: u8,
    pub kind: DropFourPieceKind,
}

#[derive(Debug, Clone, Serialize)]
pub struct DropFourGame {
    pub board: Vec<Option<DropFourPiece>>,
    pub current_player: u8,
    pub variant: DropFourVariant,
    pub game_over: bool,
    pub winner: Option<u8>,
    pub winning_line: Option<Vec<usize>>,
    pub wrecking_ball_available: [bool; 2],
    pub heavy_available: [bool; 2],
    pub flip_available: [bool; 2],
    pub flipped: bool,
    pub last_event: Option<String>,
}

impl DropFourGame {
    pub fn new() -> Self {
        Self::new_variant("classic")
    }

    pub fn new_variant(variant: &str) -> Self {
        Self {
            board: vec![None; COLS * ROWS],
            current_player: 0,
            variant: DropFourVariant::from_str(variant),
            game_over: false,
            winner: None,
            winning_line: None,
            wrecking_ball_available: [true, true],
            heavy_available: [true, true],
            flip_available: [true, true],
            flipped: false,
            last_event: None,
        }
    }

    fn idx(row: usize, col: usize) -> usize {
        row * COLS + col
    }
    fn row(index: usize) -> usize {
        index / COLS
    }
    fn col(index: usize) -> usize {
        index % COLS
    }
    fn valid_column(column: usize) -> bool {
        column < COLS
    }
    fn gravity_rows(&self) -> Vec<usize> {
        if self.flipped {
            (0..ROWS).collect()
        } else {
            (0..ROWS).rev().collect()
        }
    }

    fn landing_row(&self, column: usize) -> Option<usize> {
        self.gravity_rows()
            .into_iter()
            .find(|row| self.board[Self::idx(*row, column)].is_none())
    }

    fn compact_column(&mut self, column: usize) {
        let rows = self.gravity_rows();
        let mut pieces: Vec<DropFourPiece> = rows
            .iter()
            .filter_map(|row| self.board[Self::idx(*row, column)].take())
            .collect();
        for row in &rows {
            self.board[Self::idx(*row, column)] = None;
        }
        for (row, piece) in rows.into_iter().zip(pieces.drain(..)) {
            self.board[Self::idx(row, column)] = Some(piece);
        }
    }

    fn compact_columns<I: IntoIterator<Item = usize>>(&mut self, columns: I) {
        let mut seen = HashSet::new();
        for column in columns {
            if Self::valid_column(column) && seen.insert(column) {
                self.compact_column(column);
            }
        }
    }

    fn next_player(&mut self) {
        self.current_player = 1 - self.current_player;
    }

    fn check_win_for(&self, player: u8) -> Option<Vec<usize>> {
        let directions: [(i8, i8); 4] = [(0, 1), (1, 0), (1, 1), (1, -1)];
        for row in 0..ROWS {
            for col in 0..COLS {
                let start = Self::idx(row, col);
                if self.board[start].map(|piece| piece.owner) != Some(player) {
                    continue;
                }
                for (dr, dc) in directions {
                    let mut line = vec![start];
                    for step in 1..4 {
                        let next_row = row as i8 + dr * step;
                        let next_col = col as i8 + dc * step;
                        if !(0..ROWS as i8).contains(&next_row)
                            || !(0..COLS as i8).contains(&next_col)
                        {
                            break;
                        }
                        let next = Self::idx(next_row as usize, next_col as usize);
                        if self.board[next].map(|piece| piece.owner) == Some(player) {
                            line.push(next);
                        } else {
                            break;
                        }
                    }
                    if line.len() == 4 {
                        return Some(line);
                    }
                }
            }
        }
        None
    }

    fn update_game_over(&mut self, active_player: u8) {
        if let Some(line) = self.check_win_for(active_player) {
            self.game_over = true;
            self.winner = Some(active_player);
            self.winning_line = Some(line);
            return;
        }
        let opponent = 1 - active_player;
        if let Some(line) = self.check_win_for(opponent) {
            self.game_over = true;
            self.winner = Some(opponent);
            self.winning_line = Some(line);
            return;
        }
        if self.board.iter().all(Option::is_some) {
            self.game_over = true;
            self.winner = None;
            self.winning_line = None;
        }
    }

    fn neighboring_indices(row: usize, col: usize) -> Vec<usize> {
        let mut cells = Vec::new();
        for dr in -1..=1 {
            for dc in -1..=1 {
                let next_row = row as i8 + dr;
                let next_col = col as i8 + dc;
                if (0..ROWS as i8).contains(&next_row) && (0..COLS as i8).contains(&next_col) {
                    cells.push(Self::idx(next_row as usize, next_col as usize));
                }
            }
        }
        cells
    }

    fn drop_piece(
        &mut self,
        player: u8,
        column: usize,
        kind: DropFourPieceKind,
    ) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if !Self::valid_column(column) {
            return Err("Invalid column".into());
        }
        let row = self
            .landing_row(column)
            .ok_or_else(|| "Column is full".to_string())?;
        let active_kind = match (self.variant, kind) {
            (DropFourVariant::WreckingBall, DropFourPieceKind::WreckingBall) => {
                DropFourPieceKind::WreckingBall
            }
            (DropFourVariant::HeavyToken, DropFourPieceKind::Heavy) => DropFourPieceKind::Heavy,
            (_, DropFourPieceKind::Normal) => DropFourPieceKind::Normal,
            _ => return Err("This piece is not available in this variant".into()),
        };

        match active_kind {
            DropFourPieceKind::WreckingBall => {
                if !self.wrecking_ball_available[player as usize] {
                    return Err("Wrecking Ball already used".into());
                }
                self.wrecking_ball_available[player as usize] = false;
            }
            DropFourPieceKind::Heavy => {
                if !self.heavy_available[player as usize] {
                    return Err("Heavy token already used".into());
                }
                self.heavy_available[player as usize] = false;
            }
            DropFourPieceKind::Normal => {}
        }

        let landing = Self::idx(row, column);
        self.board[landing] = Some(DropFourPiece {
            owner: player,
            kind: active_kind,
        });
        self.last_event = None;

        match active_kind {
            DropFourPieceKind::WreckingBall => {
                let blast_cells = Self::neighboring_indices(row, column);
                let affected_cols: Vec<usize> =
                    blast_cells.iter().map(|idx| Self::col(*idx)).collect();
                for cell in blast_cells {
                    self.board[cell] = None;
                }
                self.compact_columns(affected_cols);
                self.last_event = Some("Wrecking Ball detonated.".into());
            }
            DropFourPieceKind::Heavy => {
                let crushed_row = if self.flipped {
                    row.checked_sub(1)
                } else if row + 1 < ROWS {
                    Some(row + 1)
                } else {
                    None
                };
                if let Some(crushed_row) = crushed_row {
                    let crushed_idx = Self::idx(crushed_row, column);
                    if let Some(crushed) = self.board[crushed_idx] {
                        if crushed.kind != DropFourPieceKind::Heavy {
                            self.board[landing] = None;
                            self.board[crushed_idx] = Some(DropFourPiece {
                                owner: player,
                                kind: DropFourPieceKind::Heavy,
                            });
                            self.compact_column(column);
                            self.last_event = Some("Heavy token crushed one piece.".into());
                        }
                    }
                }
            }
            DropFourPieceKind::Normal => {}
        }

        self.update_game_over(player);
        if !self.game_over {
            self.next_player();
        }
        Ok(())
    }

    fn popout(&mut self, player: u8, column: usize) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if self.variant != DropFourVariant::Popout {
            return Err("PopOut is not available in this variant".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if !Self::valid_column(column) {
            return Err("Invalid column".into());
        }
        let row = if self.flipped { 0 } else { ROWS - 1 };
        let bottom = Self::idx(row, column);
        if self.board[bottom].map(|piece| piece.owner) != Some(player) {
            return Err("Bottom token must be yours".into());
        }
        self.board[bottom] = None;
        self.compact_column(column);
        self.last_event = Some("PopOut removed a bottom token.".into());
        self.update_game_over(player);
        if !self.game_over {
            self.next_player();
        }
        Ok(())
    }

    fn flip(&mut self, player: u8) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if self.variant != DropFourVariant::GravityFlip {
            return Err("Gravity Flip is not available in this variant".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if !self.flip_available[player as usize] {
            return Err("Flip already used".into());
        }
        self.flip_available[player as usize] = false;
        let mut next = vec![None; COLS * ROWS];
        for row in 0..ROWS {
            for col in 0..COLS {
                next[Self::idx(ROWS - 1 - row, col)] = self.board[Self::idx(row, col)];
            }
        }
        self.board = next;
        self.flipped = !self.flipped;
        self.compact_columns(0..COLS);
        self.last_event = Some("Gravity flipped.".into());
        self.update_game_over(player);
        if !self.game_over {
            self.next_player();
        }
        Ok(())
    }

    pub fn state_json(&self, _for_player: Option<u8>) -> serde_json::Value {
        let hidden = self.variant == DropFourVariant::BattleshipDrop && !self.game_over;
        let board: Vec<_> = self
            .board
            .iter()
            .enumerate()
            .map(|(idx, piece)| {
                if hidden && Self::row(idx) >= 3 {
                    serde_json::json!({ "hidden": true })
                } else {
                    piece
                        .map(|p| {
                            serde_json::json!({
                                "owner": p.owner,
                                "kind": p.kind,
                            })
                        })
                        .unwrap_or(serde_json::Value::Null)
                }
            })
            .collect();

        serde_json::json!({
            "board": board,
            "currentPlayer": self.current_player,
            "variant": self.variant.as_str(),
            "gameOver": self.game_over,
            "winner": self.winner,
            "winningLine": self.winning_line,
            "wreckingBallAvailable": self.wrecking_ball_available,
            "heavyAvailable": self.heavy_available,
            "flipAvailable": self.flip_available,
            "flipped": self.flipped,
            "lastEvent": self.last_event,
            "cols": COLS,
            "rows": ROWS,
        })
    }
}

impl Game for DropFourGame {
    fn process_action(
        &mut self,
        player: u8,
        action: serde_json::Value,
        players: &[String],
    ) -> Result<Vec<(String, ServerMessage)>, String> {
        match action.get("game").and_then(|value| value.as_str()) {
            Some("DropFourMove") => {
                let column = action
                    .get("column")
                    .and_then(|value| value.as_u64())
                    .ok_or_else(|| "Missing column".to_string())?
                    as usize;
                let kind = action
                    .get("piece")
                    .and_then(|value| value.as_str())
                    .map(DropFourPieceKind::from_str)
                    .unwrap_or(DropFourPieceKind::Normal);
                self.drop_piece(player, column, kind)?;
            }
            Some("DropFourPopOut") => {
                let column = action
                    .get("column")
                    .and_then(|value| value.as_u64())
                    .ok_or_else(|| "Missing column".to_string())?
                    as usize;
                self.popout(player, column)?;
            }
            Some("DropFourFlip") => self.flip(player)?,
            _ => return Err("Unknown drop four action".into()),
        }
        Ok(game_trait::broadcast_per_player(players, |p| {
            self.state_json(Some(p))
        }))
    }

    fn check_game_over(&self) -> Option<ServerMessage> {
        if self.game_over {
            Some(ServerMessage::GameOver {
                winner: self.winner.map(|winner| format!("Player {}", winner + 1)),
                reason: if self.winner.is_some() {
                    "Drop Four line completed".into()
                } else {
                    "Board filled".into()
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
        *self = Self::new_variant(self.variant.as_str());
    }

    fn game_type(&self) -> &str {
        "drop_four"
    }
}

#[cfg(test)]
mod tests {
    use super::{DropFourGame, DropFourPiece, DropFourPieceKind};

    #[test]
    fn classic_detects_vertical_win() {
        let mut game = DropFourGame::new_variant("classic");
        game.drop_piece(0, 0, DropFourPieceKind::Normal).unwrap();
        game.drop_piece(1, 1, DropFourPieceKind::Normal).unwrap();
        game.drop_piece(0, 0, DropFourPieceKind::Normal).unwrap();
        game.drop_piece(1, 1, DropFourPieceKind::Normal).unwrap();
        game.drop_piece(0, 0, DropFourPieceKind::Normal).unwrap();
        game.drop_piece(1, 1, DropFourPieceKind::Normal).unwrap();
        game.drop_piece(0, 0, DropFourPieceKind::Normal).unwrap();

        assert!(game.game_over);
        assert_eq!(game.winner, Some(0));
    }

    #[test]
    fn wrecking_ball_explodes_adjacent_tokens() {
        let mut game = DropFourGame::new_variant("wrecking-ball");
        game.board[DropFourGame::idx(5, 2)] = Some(DropFourPiece {
            owner: 1,
            kind: DropFourPieceKind::Normal,
        });
        game.board[DropFourGame::idx(5, 3)] = Some(DropFourPiece {
            owner: 1,
            kind: DropFourPieceKind::Normal,
        });

        game.drop_piece(0, 3, DropFourPieceKind::WreckingBall)
            .unwrap();

        assert!(game.board[DropFourGame::idx(5, 2)].is_none());
        assert!(game.board[DropFourGame::idx(5, 3)].is_none());
        assert!(!game.wrecking_ball_available[0]);
    }

    #[test]
    fn popout_requires_owned_bottom_token() {
        let mut game = DropFourGame::new_variant("popout");
        game.board[DropFourGame::idx(5, 0)] = Some(DropFourPiece {
            owner: 1,
            kind: DropFourPieceKind::Normal,
        });

        let err = game.popout(0, 0).unwrap_err();

        assert_eq!(err, "Bottom token must be yours");
    }

    #[test]
    fn gravity_flip_can_only_be_used_once() {
        let mut game = DropFourGame::new_variant("gravity-flip");

        game.flip(0).unwrap();
        game.current_player = 0;
        let err = game.flip(0).unwrap_err();

        assert_eq!(err, "Flip already used");
    }

    #[test]
    fn battleship_masks_lower_half() {
        let mut game = DropFourGame::new_variant("battleship-drop");
        game.board[DropFourGame::idx(5, 0)] = Some(DropFourPiece {
            owner: 0,
            kind: DropFourPieceKind::Normal,
        });
        let state = game.state_json(Some(0));

        assert_eq!(state["board"][DropFourGame::idx(5, 0)]["hidden"], true);
    }

    #[test]
    fn heavy_token_crushes_one_non_heavy_piece() {
        let mut game = DropFourGame::new_variant("heavy-token");
        game.board[DropFourGame::idx(5, 0)] = Some(DropFourPiece {
            owner: 1,
            kind: DropFourPieceKind::Normal,
        });

        game.drop_piece(0, 0, DropFourPieceKind::Heavy).unwrap();

        assert_eq!(game.board[DropFourGame::idx(5, 0)].unwrap().owner, 0);
        assert_eq!(
            game.board[DropFourGame::idx(5, 0)].unwrap().kind,
            DropFourPieceKind::Heavy
        );
    }
}
