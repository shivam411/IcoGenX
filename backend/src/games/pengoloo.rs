/* backend/src/games/pengoloo.rs */
use crate::game_trait::{self, Game};
use crate::protocol::ServerMessage;
use serde::Serialize;
use rand::seq::SliceRandom;
use rand::Rng;

const COLORS: &[&str] = &["red", "yellow", "blue", "green", "orange", "purple"];

#[derive(Debug, Clone, Serialize)]
pub struct PengolooGame {
    pub penguin_eggs: Vec<String>,                 // 12 items, hidden egg colors
    pub penguin_claimed: Vec<Option<u8>>,          // None or Some(player_idx)
    pub dice_rolled: Vec<String>,                  // 2 colors rolled
    pub has_rolled: bool,
    pub revealed: Vec<usize>,                      // List of currently lifted penguin indices (0..11, max 2)
    pub scores: Vec<u32>,                          // Number of penguins collected (0..=6)
    pub current_player: u8,
    pub winner: Option<u8>,
    pub game_over: bool,
    pub last_event: Option<String>,
}

impl PengolooGame {
    pub fn new() -> Self {
        let mut rng = rand::thread_rng();

        // Generate 2 of each of the 6 colors
        let mut eggs = Vec::new();
        for &color in COLORS {
            eggs.push(color.to_string());
            eggs.push(color.to_string());
        }
        eggs.shuffle(&mut rng);

        PengolooGame {
            penguin_eggs: eggs,
            penguin_claimed: vec![None; 12],
            dice_rolled: vec!["red".to_string(), "red".to_string()], // placeholders
            has_rolled: false,
            revealed: Vec::new(),
            scores: vec![0, 0],
            current_player: 0,
            winner: None,
            game_over: false,
            last_event: Some("Pengoloo started! Player 1, roll the dice.".to_string()),
        }
    }

    pub fn roll_dice(&mut self, player: u8) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if self.has_rolled {
            return Err("Already rolled this turn".into());
        }

        let mut rng = rand::thread_rng();
        let d1 = COLORS.choose(&mut rng).unwrap().to_string();
        let d2 = COLORS.choose(&mut rng).unwrap().to_string();

        self.dice_rolled = vec![d1, d2];
        self.has_rolled = true;
        self.revealed.clear();

        self.last_event = Some(format!(
            "Player {} rolled {} and {}. Lift two penguins to search for matching eggs.",
            player + 1, self.dice_rolled[0], self.dice_rolled[1]
        ));

        Ok(())
    }

    pub fn lift_penguin(&mut self, player: u8, idx: usize) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if !self.has_rolled {
            return Err("Roll the dice first".into());
        }
        if idx >= 12 {
            return Err("Index out of bounds".into());
        }
        if self.penguin_claimed[idx].is_some() {
            return Err("Penguin is already claimed".into());
        }
        if self.revealed.contains(&idx) {
            return Err("Penguin is already lifted".into());
        }
        if self.revealed.len() >= 2 {
            return Err("Already lifted two penguins".into());
        }

        self.revealed.push(idx);

        if self.revealed.len() == 2 {
            let idx1 = self.revealed[0];
            let idx2 = self.revealed[1];
            let c1 = &self.penguin_eggs[idx1];
            let c2 = &self.penguin_eggs[idx2];

            let r1 = &self.dice_rolled[0];
            let r2 = &self.dice_rolled[1];

            // Evaluate matches
            let mut matched_c1 = false;
            let mut matched_c2 = false;
            let mut rolled_used = vec![false, false];

            // Match first penguin
            if c1 == r1 {
                matched_c1 = true;
                rolled_used[0] = true;
            } else if c1 == r2 {
                matched_c1 = true;
                rolled_used[1] = true;
            }

            // Match second penguin
            if c2 == r1 && !rolled_used[0] {
                matched_c2 = true;
                rolled_used[0] = true;
            } else if c2 == r2 && !rolled_used[1] {
                matched_c2 = true;
                rolled_used[1] = true;
            }

            let mut claim_count = 0;
            if matched_c1 {
                self.penguin_claimed[idx1] = Some(player);
                self.scores[player as usize] += 1;
                claim_count += 1;
            }
            if matched_c2 {
                self.penguin_claimed[idx2] = Some(player);
                self.scores[player as usize] += 1;
                claim_count += 1;
            }

            // Check game over
            let all_claimed = self.penguin_claimed.iter().all(|c| c.is_some());
            let my_score = self.scores[player as usize];

            if my_score >= 6 || all_claimed {
                self.game_over = true;
                if self.scores[0] > self.scores[1] {
                    self.winner = Some(0);
                } else if self.scores[1] > self.scores[0] {
                    self.winner = Some(1);
                } else {
                    self.winner = None;
                }
                self.last_event = Some(format!(
                    "Game Over! Final scores - P1: {}, P2: {}. Winner: {}",
                    self.scores[0], self.scores[1],
                    self.winner.map_or("Draw".to_string(), |w| format!("Player {}", w + 1))
                ));
                return Ok(());
            }

            // Turn swapping and rolls reset
            if claim_count > 0 {
                // Keep turn: player stays the same but must roll again
                self.has_rolled = false;
                self.last_event = Some(format!(
                    "Player {} matched and claimed {} penguin(s)! Egg colors: {} under {}, {} under {}. Player {} keeps their turn.",
                    player + 1, claim_count, c1, idx1 + 1, c2, idx2 + 1, player + 1
                ));
            } else {
                // Pass turn
                let next_player = 1 - player;
                self.current_player = next_player;
                self.has_rolled = false;
                self.last_event = Some(format!(
                    "No match. Egg colors: {} under {}, {} under {}. Player {}'s turn.",
                    c1, idx1 + 1, c2, idx2 + 1, next_player + 1
                ));
            }
        } else {
            // First penguin lifted
            self.last_event = Some(format!(
                "Player {} lifted penguin {} revealing egg color '{}'. Lift a second penguin.",
                player + 1, idx + 1, self.penguin_eggs[idx]
            ));
        }

        Ok(())
    }
}

impl Game for PengolooGame {
    fn process_action(
        &mut self,
        player: u8,
        action: serde_json::Value,
        players: &[String],
    ) -> Result<Vec<(String, ServerMessage)>, String> {
        match action.get("action").and_then(|v| v.as_str()) {
            Some("RollDice") => {
                self.roll_dice(player)?;
            }
            Some("LiftPenguin") => {
                let idx = action
                    .get("index")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'index'".to_string())? as usize;

                self.lift_penguin(player, idx)?;
            }
            _ => return Err("Unknown action for Pengoloo".into()),
        }

        Ok(game_trait::broadcast_same(players, serde_json::to_value(self).unwrap()))
    }

    fn check_game_over(&self) -> Option<ServerMessage> {
        if self.game_over {
            Some(ServerMessage::GameOver {
                winner: self.winner.map(|w| format!("Player {}", w + 1)),
                reason: format!(
                    "Iceberg board filled! Winner: {}",
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
            // Mask egg colors for penguins that are not claimed AND not currently revealed
            if let Some(serde_json::Value::Array(ref mut eggs)) = map.get_mut("penguin_eggs") {
                for (idx, egg) in eggs.iter_mut().enumerate() {
                    let is_revealed = self.revealed.contains(&idx);
                    let is_claimed = self.penguin_claimed[idx].is_some();
                    if !is_revealed && !is_claimed {
                        *egg = serde_json::json!("hidden");
                    }
                }
            }
        }
        val
    }

    fn reset(&mut self) {
        *self = PengolooGame::new();
    }

    fn game_type(&self) -> &str {
        "pengoloo"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initial_state() {
        let game = PengolooGame::new();
        assert_eq!(game.penguin_eggs.len(), 12);
        assert_eq!(game.penguin_claimed.len(), 12);
        assert_eq!(game.scores, vec![0, 0]);
        assert!(!game.has_rolled);
        assert!(!game.game_over);
    }

    #[test]
    fn test_rolling_and_lifting() {
        let mut game = PengolooGame::new();
        game.roll_dice(0).unwrap();
        assert!(game.has_rolled);
        assert_eq!(game.dice_rolled.len(), 2);

        // Lift penguin 1
        game.lift_penguin(0, 0).unwrap();
        assert_eq!(game.revealed.len(), 1);
        assert_eq!(game.revealed[0], 0);

        // Lift penguin 2
        game.lift_penguin(0, 1).unwrap();
        // Since we evaluated, turn either passed or stayed, and has_rolled reset to false
        assert!(!game.has_rolled);
        assert_eq!(game.revealed.len(), 2);
    }
}
