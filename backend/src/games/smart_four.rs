/* backend/src/games/smart_four.rs */
use crate::game_trait::{self, Game};
use crate::protocol::ServerMessage;
use serde::Serialize;
use rand::Rng;

const DIRECTIONS: [(i32, i32, i32); 13] = [
    (0, 0, 1),   // vertical column stack
    (0, 1, 0),   // horizontal row
    (1, 0, 0),   // horizontal column
    (0, 1, 1),   // diagonal row-height
    (0, 1, -1),
    (1, 0, 1),   // diagonal col-height
    (1, 0, -1),
    (1, 1, 0),   // diagonal row-col
    (1, -1, 0),
    (1, 1, 1),   // 3D diagonal
    (1, 1, -1),
    (1, -1, 1),
    (1, -1, -1),
];

#[derive(Debug, Clone, Serialize)]
pub struct SmartFourGame {
    pub variant: String,                 // "classic", "topple"
    pub board: Vec<Vec<u8>>,             // 25 columns, each Vec<u8> holds player indices (0=P1, 1=P2)
    pub current_player: u8,
    pub scores: Vec<u32>,                // Scores for P1 and P2
    pub dice_roll: Option<u8>,           // 1..=6
    pub has_rolled: bool,
    pub torque: (f32, f32),              // Current torque (X, Y)
    pub game_over: bool,
    pub winner: Option<u8>,
    pub winning_line: Option<Vec<usize>>, // Winning coordinates flat-indexed: r*25 + c*5 + h
    pub last_event: Option<String>,
}

impl SmartFourGame {
    pub fn new() -> Self {
        Self::new_variant("classic")
    }

    pub fn new_variant(variant: &str) -> Self {
        SmartFourGame {
            variant: variant.to_string(),
            board: vec![Vec::new(); 25],
            current_player: 0,
            scores: vec![0, 0],
            dice_roll: None,
            has_rolled: false,
            torque: (0.0, 0.0),
            game_over: false,
            winner: None,
            winning_line: None,
            last_event: Some(if variant == "topple" {
                "Topple started! Player 1's turn to roll the die.".to_string()
            } else {
                "Smart Four 3D started! Player 1's turn to place.".to_string()
            }),
        }
    }

    fn get_token(&self, r: usize, c: usize, h: usize) -> Option<u8> {
        if r >= 5 || c >= 5 {
            return None;
        }
        let col_idx = r * 5 + c;
        if h < self.board[col_idx].len() {
            Some(self.board[col_idx][h])
        } else {
            None
        }
    }

    fn count_lines(&self, player: u8, length: usize) -> u32 {
        let mut count = 0;
        // Search the 5x5x5 space
        for r in 0..5 {
            for c in 0..5 {
                for h in 0..5 {
                    if self.get_token(r, c, h) != Some(player) {
                        continue;
                    }
                    for &(dr, dc, dh) in &DIRECTIONS {
                        let mut matches = true;
                        for k in 1..length {
                            let nr = r as i32 + dr * k as i32;
                            let nc = c as i32 + dc * k as i32;
                            let nh = h as i32 + dh * k as i32;
                            if nr < 0 || nr >= 5 || nc < 0 || nc >= 5 || nh < 0 || nh >= 5 {
                                matches = false;
                                break;
                            }
                            if self.get_token(nr as usize, nc as usize, nh as usize) != Some(player) {
                                matches = false;
                                break;
                            }
                        }
                        if matches {
                            count += 1;
                        }
                    }
                }
            }
        }
        count
    }

    fn check_win_for_player(&self, player: u8) -> Option<Vec<usize>> {
        for r in 0..5 {
            for c in 0..5 {
                for h in 0..5 {
                    if self.get_token(r, c, h) != Some(player) {
                        continue;
                    }
                    for &(dr, dc, dh) in &DIRECTIONS {
                        let mut line = vec![r * 25 + c * 5 + h];
                        let mut matches = true;
                        for k in 1..4 {
                            let nr = r as i32 + dr * k;
                            let nc = c as i32 + dc * k;
                            let nh = h as i32 + dh * k;
                            if nr < 0 || nr >= 5 || nc < 0 || nc >= 5 || nh < 0 || nh >= 5 {
                                matches = false;
                                break;
                            }
                            if self.get_token(nr as usize, nc as usize, nh as usize) != Some(player) {
                                matches = false;
                                break;
                            }
                            line.push(nr as usize * 25 + nc as usize * 5 + nh as usize);
                        }
                        if matches {
                            return Some(line);
                        }
                    }
                }
            }
        }
        None
    }

    fn calculate_torque(&self) -> (f32, f32) {
        let mut tx = 0.0f32;
        let mut ty = 0.0f32;
        for idx in 0..25 {
            let r = idx / 5;
            let c = idx % 5;
            let x = c as f32 - 2.0;
            let y = 2.0 - r as f32;
            
            for (h, _) in self.board[idx].iter().enumerate() {
                let weight = 1.0 + 0.5 * h as f32;
                tx += x * weight;
                ty += y * weight;
            }
        }
        (tx, ty)
    }

    pub fn roll_die(&mut self, player: u8) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if self.variant != "topple" {
            return Err("Dice rolling is only for Topple".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if self.has_rolled {
            return Err("You have already rolled the die".into());
        }

        let mut rng = rand::thread_rng();
        let roll = rng.gen_range(1..=6);
        self.dice_roll = Some(roll);
        self.has_rolled = true;
        self.last_event = Some(format!(
            "Player {} rolled a {}. Place a token on Ring {}.",
            player + 1, roll, if roll == 6 { "Wild (Any)".to_string() } else { roll.to_string() }
        ));

        Ok(())
    }

    pub fn place_token(&mut self, player: u8, cell: usize) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if cell >= 25 {
            return Err("Cell index out of bounds".into());
        }
        if self.board[cell].len() >= 5 {
            return Err("Column is full (max height 5)".into());
        }

        if self.variant == "topple" {
            if !self.has_rolled {
                return Err("Roll the die first".into());
            }
            let roll = self.dice_roll.ok_or("No active roll")?;
            if roll < 6 {
                // Verify Manhattan distance
                let r = cell / 5;
                let c = cell % 5;
                let d = (r as i32 - 2).abs() + (c as i32 - 2).abs();
                let ring = d + 1;
                if ring != roll as i32 {
                    return Err(format!(
                        "Invalid placement. Rolled a {}, but cell is on Ring {}.",
                        roll, ring
                    ));
                }
            }

            // Record old score state
            let old_3 = self.count_lines(player, 3);
            let old_4 = self.count_lines(player, 4);

            // Place token
            self.board[cell].push(player);

            // Compute scores
            let r = cell / 5;
            let c = cell % 5;
            let d = (r as i32 - 2).abs() + (c as i32 - 2).abs();
            let base_pts = (d + 1) as u32;

            let new_3 = self.count_lines(player, 3);
            let new_4 = self.count_lines(player, 4);

            let bonus_3 = if new_3 > old_3 { (new_3 - old_3) * 3 } else { 0 };
            let bonus_4 = if new_4 > old_4 { (new_4 - old_4) * 5 } else { 0 };

            self.scores[player as usize] += base_pts + bonus_3 + bonus_4;

            // Recalculate torque and verify topple
            let (tx, ty) = self.calculate_torque();
            self.torque = (tx, ty);
            let tilt = (tx * tx + ty * ty).sqrt();

            if tilt > 11.5 {
                // Topples!
                self.game_over = true;
                let opponent = 1 - player;
                self.winner = Some(opponent);
                self.last_event = Some(format!(
                    "CRASH! Player {} placed a piece on cell {}, causing the board to tilt too far (Tilt: {:.2}). Player {} wins!",
                    player + 1, cell + 1, tilt, opponent + 1
                ));
            } else {
                self.has_rolled = false;
                self.dice_roll = None;
                self.current_player = 1 - self.current_player;
                self.last_event = Some(format!(
                    "Player {} placed on cell {} (Ring {}). Tilt: {:.2}. Player {}'s turn to roll.",
                    player + 1, cell + 1, d + 1, tilt, self.current_player + 1
                ));
            }
        } else {
            // Classic 3D Connect Four
            self.board[cell].push(player);

            if let Some(line) = self.check_win_for_player(player) {
                self.game_over = true;
                self.winner = Some(player);
                self.winning_line = Some(line);
                self.last_event = Some(format!(
                    "Connect Four! Player {} connected 4 in a line and won the game!",
                    player + 1
                ));
            } else if self.board.iter().all(|col| col.len() >= 5) {
                self.game_over = true;
                self.winner = None;
                self.last_event = Some("The board is full. It's a draw!".to_string());
            } else {
                self.current_player = 1 - self.current_player;
                self.last_event = Some(format!(
                    "Player {} placed a token. Player {}'s turn.",
                    player + 1, self.current_player + 1
                ));
            }
        }

        Ok(())
    }
}

impl Game for SmartFourGame {
    fn process_action(
        &mut self,
        player: u8,
        action: serde_json::Value,
        players: &[String],
    ) -> Result<Vec<(String, ServerMessage)>, String> {
        match action.get("action").and_then(|v| v.as_str()) {
            Some("SmartFourRoll") => {
                self.roll_die(player)?;
            }
            Some("SmartFourPlace") => {
                let cell = action
                    .get("cell")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'cell'".to_string())? as usize;
                self.place_token(player, cell)?;
            }
            _ => return Err("Unknown action for Smart Four".into()),
        }

        Ok(game_trait::broadcast_same(players, serde_json::to_value(self).unwrap()))
    }

    fn check_game_over(&self) -> Option<ServerMessage> {
        if self.game_over {
            Some(ServerMessage::GameOver {
                winner: self.winner.map(|w| format!("Player {}", w + 1)),
                reason: if self.variant == "topple" {
                    if self.winner.is_some() {
                        "Opponent toppled the balancing board!".to_string()
                    } else {
                        "Draw score on full board!".to_string()
                    }
                } else {
                    if self.winner.is_some() {
                        "Four connected in a straight line in 3D space!".to_string()
                    } else {
                        "The board is full!".to_string()
                    }
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
        *self = SmartFourGame::new_variant(&self.variant);
    }

    fn game_type(&self) -> &str {
        "smart_four"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initial_state() {
        let game = SmartFourGame::new();
        assert_eq!(game.variant, "classic");
        assert_eq!(game.current_player, 0);
        assert!(!game.game_over);
    }

    #[test]
    fn test_vertical_win() {
        let mut game = SmartFourGame::new();
        // Place 4 pieces on cell 0
        game.place_token(0, 0).unwrap(); // P1 height 0
        game.current_player = 0;
        game.place_token(0, 0).unwrap(); // P1 height 1
        game.current_player = 0;
        game.place_token(0, 0).unwrap(); // P1 height 2
        game.current_player = 0;
        game.place_token(0, 0).unwrap(); // P1 height 3

        assert!(game.game_over);
        assert_eq!(game.winner, Some(0));
    }

    #[test]
    fn test_topple_torque() {
        let mut game = SmartFourGame::new_variant("topple");
        game.dice_roll = Some(5); // Ring 5 (Corners: distance 4)
        game.has_rolled = true;

        // Place on cell 0 (corner, distance 4)
        game.place_token(0, 0).unwrap();
        assert!(!game.game_over);
        assert_eq!(game.torque, (-2.0, 2.0));
    }
}
