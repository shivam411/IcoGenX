/* backend/src/games/knarr_placement.rs */
use crate::game_trait::{self, Game};
use crate::protocol::ServerMessage;
use serde::Serialize;
use rand::Rng;

#[derive(Debug, Clone, Serialize)]
pub struct KnarrPlacementGame {
    pub grids: Vec<Vec<Vec<u8>>>,                  // 2 players, 3 columns each, up to 3 dice per column
    pub current_roll: Option<u8>,
    pub has_rolled: bool,
    pub scores: Vec<u32>,                          // total score per player
    pub col_scores: Vec<Vec<u32>>,                  // scores per column (2 players, 3 columns)
    pub current_player: u8,
    pub winner: Option<u8>,
    pub game_over: bool,
    pub last_event: Option<String>,
}

impl KnarrPlacementGame {
    pub fn new() -> Self {
        KnarrPlacementGame {
            grids: vec![
                vec![Vec::new(), Vec::new(), Vec::new()],
                vec![Vec::new(), Vec::new(), Vec::new()],
            ],
            current_roll: None,
            has_rolled: false,
            scores: vec![0, 0],
            col_scores: vec![vec![0, 0, 0], vec![0, 0, 0]],
            current_player: 0,
            winner: None,
            game_over: false,
            last_event: Some("Knarr-Style Dice Placement started! Player 1's turn to roll.".to_string()),
        }
    }

    pub fn roll_die(&mut self, player: u8) -> Result<(), String> {
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
        let roll = rng.gen_range(1..=6);
        self.current_roll = Some(roll);
        self.has_rolled = true;
        self.last_event = Some(format!(
            "Player {} rolled a {}. Select a column (1-3) to place it.",
            player + 1, roll
        ));

        Ok(())
    }

    pub fn place_die(&mut self, player: u8, col: usize) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if !self.has_rolled {
            return Err("Roll the die first".into());
        }
        if col >= 3 {
            return Err("Column index out of bounds".into());
        }
        if self.grids[player as usize][col].len() >= 3 {
            return Err("Column is full".into());
        }

        let roll = self.current_roll.ok_or("No active roll")?;

        // 1. Place the die
        self.grids[player as usize][col].push(roll);

        // 2. Knockout opponent's identical dice in same column
        let opponent = 1 - player;
        let opp_col = &mut self.grids[opponent as usize][col];
        let prev_len = opp_col.len();
        opp_col.retain(|&x| x != roll);
        let knocked_out_count = prev_len - opp_col.len();

        // 3. Recalculate scores for both players
        self.recalculate_scores();

        // 4. Check game over: if either player filled all 9 spaces
        let p_full = self.grids[player as usize].iter().map(|c| c.len()).sum::<usize>() == 9;
        let o_full = self.grids[opponent as usize].iter().map(|c| c.len()).sum::<usize>() == 9;

        if p_full || o_full {
            self.game_over = true;
            if self.scores[0] > self.scores[1] {
                self.winner = Some(0);
            } else if self.scores[1] > self.scores[0] {
                self.winner = Some(1);
            } else {
                self.winner = None;
            }
            self.last_event = Some(format!(
                "Game Over! Board filled. Final Scores - P1: {}, P2: {}. Winner: {}",
                self.scores[0],
                self.scores[1],
                self.winner.map_or("Draw".to_string(), |w| format!("Player {}", w + 1))
            ));
            return Ok(());
        }

        // 5. Update events and swap turn
        let next_player = 1 - self.current_player;
        let knockout_desc = if knocked_out_count > 0 {
            format!(
                " (knocked out {} of Player {}'s {}s!)",
                knocked_out_count, opponent + 1, roll
            )
        } else {
            "".to_string()
        };

        self.last_event = Some(format!(
            "Player {} placed {} in column {}{}. Player {}'s turn to roll.",
            player + 1, roll, col + 1, knockout_desc, next_player + 1
        ));

        self.current_roll = None;
        self.has_rolled = false;
        self.current_player = next_player;

        Ok(())
    }

    fn recalculate_scores(&mut self) {
        for p in 0..2 {
            for c in 0..3 {
                let score = calculate_col_score(&self.grids[p][c]);
                self.col_scores[p][c] = score;
            }
            self.scores[p] = self.col_scores[p].iter().sum();
        }
    }
}

fn calculate_col_score(col: &[u8]) -> u32 {
    let mut score = 0;
    let mut counts = [0u32; 7];
    for &val in col {
        if val >= 1 && val <= 6 {
            counts[val as usize] += 1;
        }
    }
    for (val, &count) in counts.iter().enumerate().skip(1) {
        if count > 0 {
            score += (val as u32) * count * count;
        }
    }
    score
}

impl Game for KnarrPlacementGame {
    fn process_action(
        &mut self,
        player: u8,
        action: serde_json::Value,
        players: &[String],
    ) -> Result<Vec<(String, ServerMessage)>, String> {
        match action.get("action").and_then(|v| v.as_str()) {
            Some("RollDie") => {
                self.roll_die(player)?;
            }
            Some("PlaceDie") => {
                let col = action
                    .get("col")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'col'".to_string())? as usize;
                self.place_die(player, col)?;
            }
            _ => return Err("Unknown action for Knarr Placement".into()),
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
        *self = KnarrPlacementGame::new();
    }

    fn game_type(&self) -> &str {
        "knarr_placement"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initial_state() {
        let game = KnarrPlacementGame::new();
        assert_eq!(game.grids[0][0].len(), 0);
        assert_eq!(game.scores, vec![0, 0]);
        assert_eq!(game.current_player, 0);
        assert!(!game.game_over);
    }

    #[test]
    fn test_place_and_knockout() {
        let mut game = KnarrPlacementGame::new();
        
        // Opponent P2 has 5 in column 0
        game.grids[1][0].push(5);
        game.recalculate_scores();
        assert_eq!(game.scores[1], 5);

        // P1 rolls 5 and places in column 0
        game.current_roll = Some(5);
        game.has_rolled = true;
        game.place_die(0, 0).unwrap();

        // P2's 5 should be knocked out
        assert_eq!(game.grids[1][0].len(), 0);
        assert_eq!(game.scores[1], 0);

        // P1's grid has 5, P1's score is 5
        assert_eq!(game.grids[0][0], vec![5]);
        assert_eq!(game.scores[0], 5);
    }

    #[test]
    fn test_scoring_multiplier() {
        // [5, 5, 5] -> score should be 5 * 3 * 3 = 45
        assert_eq!(calculate_col_score(&[5, 5, 5]), 45);
        // [4, 4, 1] -> score should be 4 * 2 * 2 + 1 * 1 * 1 = 17
        assert_eq!(calculate_col_score(&[4, 4, 1]), 17);
    }

    #[test]
    fn test_game_over_filled_grid() {
        let mut game = KnarrPlacementGame::new();
        
        // Fill P1 grid with 8 dice
        for col in 0..2 {
            game.grids[0][col] = vec![1, 2, 3];
        }
        game.grids[0][2] = vec![4, 5];

        game.recalculate_scores();
        
        // Place the 9th die
        game.current_roll = Some(6);
        game.has_rolled = true;
        game.place_die(0, 2).unwrap();

        assert!(game.game_over);
        assert!(game.winner.is_some());
    }
}
