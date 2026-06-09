/* backend/src/games/hand_hunt.rs */
use crate::game_trait::{self, Game};
use crate::protocol::ServerMessage;
use serde::Serialize;
use rand::seq::SliceRandom;
use rand::Rng;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize)]
pub struct HandHuntGame {
    pub numbers: Vec<u8>,                          // Numbers 1..=36 scattered
    pub coords: Vec<(f64, f64)>,                   // Pre-calculated X,Y positions (0..400)
    pub current_target: Option<u8>,
    pub grids: Vec<Vec<bool>>,                     // 2 players, tracks which numbers they found
    pub scores: Vec<u32>,                          // Number of items found
    pub winner: Option<u8>,
    pub game_over: bool,
    pub last_event: Option<String>,
    #[serde(skip)]
    pub cooldowns: Vec<u64>,                       // Cooldown timestamps (millis)
}

impl HandHuntGame {
    pub fn new() -> Self {
        let mut rng = rand::thread_rng();

        // 1. Generate 36 numbers
        let mut numbers: Vec<u8> = (1..=36).collect();
        numbers.shuffle(&mut rng);

        // 2. Generate concentric non-overlapping positions
        // Center is (200, 200). Radii: 35, 75, 115
        let mut coords = Vec::new();
        
        // Inner circle: 6 dots
        for i in 0..6 {
            let angle = (i as f64) * (2.0 * std::f64::consts::PI / 6.0);
            let x = 200.0 + 35.0 * angle.cos();
            let y = 200.0 + 35.0 * angle.sin();
            coords.push((x, y));
        }

        // Middle circle: 12 dots
        for i in 0..12 {
            let angle = (i as f64) * (2.0 * std::f64::consts::PI / 12.0) + 0.3; // offset to break symmetry
            let x = 200.0 + 75.0 * angle.cos();
            let y = 200.0 + 75.0 * angle.sin();
            coords.push((x, y));
        }

        // Outer circle: 18 dots
        for i in 0..18 {
            let angle = (i as f64) * (2.0 * std::f64::consts::PI / 18.0) - 0.2;
            let x = 200.0 + 115.0 * angle.cos();
            let y = 200.0 + 115.0 * angle.sin();
            coords.push((x, y));
        }

        // Apply slight jitter to coords to make them look hand-drawn and scattered
        for coord in &mut coords {
            coord.0 += rng.gen_range(-6.0..=6.0);
            coord.1 += rng.gen_range(-6.0..=6.0);
        }

        // Grid positions map to numbers, shuffle coords so numbers scatter randomly
        coords.shuffle(&mut rng);

        let target = *numbers.choose(&mut rng).unwrap();

        HandHuntGame {
            numbers,
            coords,
            current_target: Some(target),
            grids: vec![vec![false; 36], vec![false; 36]],
            scores: vec![0, 0],
            winner: None,
            game_over: false,
            last_event: Some(format!("Hand Hunt started! Find target number: {}.", target)),
            cooldowns: vec![0, 0],
        }
    }

    pub fn claim_number(&mut self, player: u8, num: u8) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }

        let current_time = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        let p_idx = player as usize;
        if current_time < self.cooldowns[p_idx] {
            return Err("You are in penalty lockout".into());
        }

        let target = self.current_target.ok_or("No target number")?;

        if num == target {
            // Correct spot!
            self.grids[p_idx][(num - 1) as usize] = true;
            self.scores[p_idx] += 1;

            // Check victory: first to cross out 18 spots wins (50% of grids)
            if self.scores[p_idx] == 18 {
                self.game_over = true;
                self.winner = Some(player);
                self.last_event = Some(format!(
                    "Player {} clicked {} and completed 18 grid connections! Player {} wins!",
                    player + 1, num, player + 1
                ));
                return Ok(());
            }

            // Pick next target from numbers not yet found by the active player
            let mut remaining = Vec::new();
            for n in 1..=36 {
                if !self.grids[p_idx][(n - 1) as usize] {
                    remaining.push(n);
                }
            }

            let mut rng = rand::thread_rng();
            if let Some(&next_target) = remaining.choose(&mut rng) {
                self.current_target = Some(next_target);
                self.last_event = Some(format!(
                    "Player {} found {}! Next target is: {}.",
                    player + 1, num, next_target
                ));
            }
        } else {
            // Wrong click penalty: 1.5 second lockout
            self.cooldowns[p_idx] = current_time + 1500;
            self.last_event = Some(format!(
                "Player {} misclicked! 1.5s penalty lockout.",
                player + 1
            ));
        }

        Ok(())
    }
}

impl Game for HandHuntGame {
    fn process_action(
        &mut self,
        player: u8,
        action: serde_json::Value,
        players: &[String],
    ) -> Result<Vec<(String, ServerMessage)>, String> {
        match action.get("action").and_then(|v| v.as_str()) {
            Some("ClaimNumber") => {
                let num = action
                    .get("number")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'number'".to_string())? as u8;

                self.claim_number(player, num)?;
            }
            _ => return Err("Unknown action for Hand Hunt".into()),
        }

        Ok(game_trait::broadcast_same(players, serde_json::to_value(self).unwrap()))
    }

    fn check_game_over(&self) -> Option<ServerMessage> {
        if self.game_over {
            Some(ServerMessage::GameOver {
                winner: self.winner.map(|w| format!("Player {}", w + 1)),
                reason: format!(
                    "18 numbers found! Winner: {}",
                    self.winner.map_or("Draw".to_string(), |w| format!("Player {}", w + 1))
                ),
            })
        } else {
            None
        }
    }

    fn state_for_player(&self, _player: Option<u8>) -> serde_json::Value {
        let mut val = serde_json::to_value(self).unwrap();
        // Since play is simultaneous and grids/scores are visible, we expose all state to both players
        if let Some(p_idx) = _player {
            if let serde_json::Value::Object(ref mut map) = val {
                map.insert("localPlayerIdx".to_string(), serde_json::json!(p_idx));
            }
        }
        val
    }

    fn reset(&mut self) {
        *self = HandHuntGame::new();
    }

    fn game_type(&self) -> &str {
        "hand_hunt"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initial_state() {
        let game = HandHuntGame::new();
        assert_eq!(game.numbers.len(), 36);
        assert_eq!(game.coords.len(), 36);
        assert!(game.current_target.is_some());
        assert_eq!(game.scores, vec![0, 0]);
    }

    #[test]
    fn test_claim_valid_and_penalty() {
        let mut game = HandHuntGame::new();
        let target = game.current_target.unwrap();

        // Misclick wrong number (say target + 1, modulo 36)
        let wrong_num = if target == 36 { 1 } else { target + 1 };
        game.claim_number(0, wrong_num).unwrap();
        assert!(!game.grids[0][(wrong_num - 1) as usize]); // not claimed
        assert!(game.cooldowns[0] > 0); // penalty locked

        // Wait or bypass cooldown for test, then click correct
        game.cooldowns[0] = 0;
        game.claim_number(0, target).unwrap();
        assert!(game.grids[0][(target - 1) as usize]); // claimed
        assert_eq!(game.scores[0], 1);
        assert_ne!(game.current_target.unwrap(), target); // target changed
    }
}
