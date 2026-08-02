/* backend/src/games/dr_eureka.rs */
use crate::game_trait::{self, Game};
use crate::protocol::ServerMessage;
use serde::Serialize;
use rand::seq::SliceRandom;

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct Ball {
    pub id: u8,
    pub color: String,             // "red", "green", "purple"
    pub text_color: Option<String>,// "red", "green", "purple"
    pub text_word: Option<String>, // "red", "green", "purple"
    pub number_val: Option<u8>,    // 1..=6 for sequential
}

#[derive(Debug, Clone, Serialize)]
pub struct DrEurekaGame {
    pub variant: String,           // "classic", "stroop", "sequential"
    pub player_tubes: Vec<Vec<Ball>>, // 6 tubes total: [0, 1, 2] for P1, [3, 4, 5] for P2
    pub target_tubes: Vec<Vec<String>>, // Goal arrangement of colors
    pub stroop_match_type: Option<String>, // Some("color"), Some("text_color"), Some("text_word")
    pub target_sequence: Vec<u8>,  // target sequence for sequential (e.g. [1..=6] shuffled)
    pub scores: Vec<u32>,          // P1 and P2 scores
    pub round_winner: Option<u8>,  // Some(0) = P1, Some(1) = P2
    pub game_over: bool,
    pub winner: Option<u8>,
    pub current_player: u8,
    pub last_event: Option<String>,
}

fn create_standard_balls(player_offset: u8) -> (Vec<Ball>, Vec<Ball>, Vec<Ball>) {
    let mut rng = rand::thread_rng();
    let colors = vec!["red", "green", "purple"];
    
    let mut make_ball = |id: u8, color: &str| {
        let text_color = colors.choose(&mut rng).unwrap().to_string();
        let text_word = colors.choose(&mut rng).unwrap().to_string();
        Ball {
            id,
            color: color.to_string(),
            text_color: Some(text_color),
            text_word: Some(text_word),
            number_val: None,
        }
    };

    let t0 = vec![make_ball(player_offset + 0, "red"), make_ball(player_offset + 1, "red")];
    let t1 = vec![make_ball(player_offset + 2, "green"), make_ball(player_offset + 3, "green")];
    let t2 = vec![make_ball(player_offset + 4, "purple"), make_ball(player_offset + 5, "purple")];
    
    (t0, t1, t2)
}

fn generate_target_tubes() -> Vec<Vec<String>> {
    let mut rng = rand::thread_rng();
    let mut pool = vec![
        "red".to_string(),
        "red".to_string(),
        "green".to_string(),
        "green".to_string(),
        "purple".to_string(),
        "purple".to_string(),
    ];
    pool.shuffle(&mut rng);

    let mut tubes = vec![Vec::new(), Vec::new(), Vec::new()];
    for color in pool {
        let mut available_tubes: Vec<usize> = (0..3).filter(|&i| tubes[i].len() < 4).collect();
        available_tubes.shuffle(&mut rng);
        if let Some(&tube_idx) = available_tubes.first() {
            tubes[tube_idx].push(color);
        }
    }
    tubes
}

fn create_sequential_balls(player_offset: u8) -> (Vec<Ball>, Vec<Ball>, Vec<Ball>) {
    let mut rng = rand::thread_rng();
    let mut numbers: Vec<u8> = (1..=6).collect();
    numbers.shuffle(&mut rng);

    let mut t = vec![Vec::new(), Vec::new(), Vec::new()];
    for &num in &numbers {
        let mut available_tubes: Vec<usize> = (0..3).filter(|&i| t[i].len() < 4).collect();
        available_tubes.shuffle(&mut rng);
        if let Some(&tube_idx) = available_tubes.first() {
            t[tube_idx].push(Ball {
                id: player_offset + num,
                color: num.to_string(),
                text_color: None,
                text_word: None,
                number_val: Some(num),
            });
        }
    }
    (t[0].clone(), t[1].clone(), t[2].clone())
}

fn generate_target_sequence() -> Vec<u8> {
    let mut rng = rand::thread_rng();
    let mut seq: Vec<u8> = (1..=6).collect();
    seq.shuffle(&mut rng);
    seq
}

impl DrEurekaGame {
    pub fn new() -> Self {
        Self::new_variant("classic")
    }

    pub fn new_variant(variant: &str) -> Self {
        let mut player_tubes = vec![Vec::new(); 6];
        
        let target_sequence = if variant == "sequential" {
            generate_target_sequence()
        } else {
            Vec::new()
        };

        let target_tubes = if variant == "sequential" {
            Vec::new()
        } else {
            generate_target_tubes()
        };

        if variant == "sequential" {
            let (p1_t0, p1_t1, p1_t2) = create_sequential_balls(0);
            let (p2_t0, p2_t1, p2_t2) = create_sequential_balls(10);
            player_tubes[0] = p1_t0;
            player_tubes[1] = p1_t1;
            player_tubes[2] = p1_t2;
            player_tubes[3] = p2_t0;
            player_tubes[4] = p2_t1;
            player_tubes[5] = p2_t2;
        } else {
            let (p1_t0, p1_t1, p1_t2) = create_standard_balls(0);
            let (p2_t0, p2_t1, p2_t2) = create_standard_balls(10);
            player_tubes[0] = p1_t0;
            player_tubes[1] = p1_t1;
            player_tubes[2] = p1_t2;
            player_tubes[3] = p2_t0;
            player_tubes[4] = p2_t1;
            player_tubes[5] = p2_t2;
        }

        let stroop_match_types = ["color", "text_color", "text_word"];
        let mut rng = rand::thread_rng();
        let stroop_match_type = if variant == "stroop" {
            Some(stroop_match_types.choose(&mut rng).unwrap().to_string())
        } else {
            None
        };

        DrEurekaGame {
            variant: variant.to_string(),
            player_tubes,
            target_tubes,
            stroop_match_type,
            target_sequence,
            scores: vec![0, 0],
            round_winner: None,
            game_over: false,
            winner: None,
            current_player: 0,
            last_event: Some("Formula race started! Be the first to solve the layout.".to_string()),
        }
    }

    fn check_match_for_player(&self, player: u8) -> bool {
        let offset = (player as usize) * 3;
        let p_tubes = &self.player_tubes[offset..offset + 3];

        if self.variant == "sequential" {
            for tube in p_tubes {
                if tube.len() == self.target_sequence.len() {
                    let matches = tube.iter().enumerate().all(|(i, ball)| {
                        ball.number_val == Some(self.target_sequence[i])
                    });
                    if matches {
                        return true;
                    }
                }
            }
            return false;
        }

        let permutations = [
            [0, 1, 2],
            [0, 2, 1],
            [1, 0, 2],
            [1, 2, 0],
            [2, 0, 1],
            [2, 1, 0],
        ];

        for perm in &permutations {
            let mut all_match = true;
            for i in 0..3 {
                let p_tube = &p_tubes[i];
                let t_tube = &self.target_tubes[perm[i]];

                if p_tube.len() != t_tube.len() {
                    all_match = false;
                    break;
                }

                for j in 0..p_tube.len() {
                    let p_ball = &p_tube[j];
                    let t_color = &t_tube[j];

                    let matches = match self.variant.as_str() {
                        "stroop" => {
                            let match_type = self.stroop_match_type.as_deref().unwrap_or("color");
                            match match_type {
                                "text_color" => p_ball.text_color.as_deref() == Some(t_color),
                                "text_word" => p_ball.text_word.as_deref() == Some(t_color),
                                _ => p_ball.color == *t_color,
                            }
                        }
                        _ => p_ball.color == *t_color,
                    };

                    if !matches {
                        all_match = false;
                        break;
                    }
                }

                if !all_match {
                    break;
                }
            }

            if all_match {
                return true;
            }
        }

        false
    }

    pub fn make_move(&mut self, player: u8, from_tube: usize, to_tube: usize) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if self.round_winner.is_some() {
            return Ok(());
        }
        if player > 1 {
            return Err("Invalid player index".into());
        }
        if from_tube >= 3 || to_tube >= 3 {
            return Err("Tube index out of bounds".into());
        }
        if from_tube == to_tube {
            return Err("Cannot transfer to the same tube".into());
        }

        let offset = (player as usize) * 3;
        let from_idx = offset + from_tube;
        let to_idx = offset + to_tube;

        if self.player_tubes[from_idx].is_empty() {
            return Err("Source tube is empty".into());
        }
        if self.player_tubes[to_idx].len() >= 4 {
            return Err("Destination tube is full".into());
        }

        let ball = self.player_tubes[from_idx].pop().unwrap();
        self.player_tubes[to_idx].push(ball);

        self.last_event = Some(format!(
            "Player {} poured a ball from tube {} to tube {}.",
            player + 1, from_tube + 1, to_tube + 1
        ));

        if self.check_match_for_player(player) {
            self.round_winner = Some(player);
            self.scores[player as usize] += 1;
            
            if self.scores[player as usize] >= 5 {
                self.game_over = true;
                self.winner = Some(player);
                self.last_event = Some(format!(
                    "Player {} completed 5 cards and won the match!",
                    player + 1
                ));
            } else {
                self.last_event = Some(format!(
                    "Player {} solved the formula first and won this round!",
                    player + 1
                ));
            }
        }

        Ok(())
    }
}

impl Game for DrEurekaGame {
    fn process_action(
        &mut self,
        player: u8,
        action: serde_json::Value,
        players: &[String],
    ) -> Result<Vec<(String, ServerMessage)>, String> {
        match action.get("action").and_then(|v| v.as_str()) {
            Some("EurekaTransfer") => {
                let from_tube = action
                    .get("from_tube")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'from_tube'".to_string())? as usize;
                let to_tube = action
                    .get("to_tube")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'to_tube'".to_string())? as usize;

                self.make_move(player, from_tube, to_tube)?;
            }
            Some("EurekaNextRound") => {
                if self.round_winner.is_none() {
                    return Err("Round is not over yet".into());
                }
                self.round_winner = None;
                self.last_event = Some("New challenge card revealed! Pour!".to_string());
                
                if self.variant == "sequential" {
                    self.target_sequence = generate_target_sequence();
                    let (p1_t0, p1_t1, p1_t2) = create_sequential_balls(0);
                    let (p2_t0, p2_t1, p2_t2) = create_sequential_balls(10);
                    self.player_tubes[0] = p1_t0;
                    self.player_tubes[1] = p1_t1;
                    self.player_tubes[2] = p1_t2;
                    self.player_tubes[3] = p2_t0;
                    self.player_tubes[4] = p2_t1;
                    self.player_tubes[5] = p2_t2;
                } else {
                    self.target_tubes = generate_target_tubes();
                    let (p1_t0, p1_t1, p1_t2) = create_standard_balls(0);
                    let (p2_t0, p2_t1, p2_t2) = create_standard_balls(10);
                    self.player_tubes[0] = p1_t0;
                    self.player_tubes[1] = p1_t1;
                    self.player_tubes[2] = p1_t2;
                    self.player_tubes[3] = p2_t0;
                    self.player_tubes[4] = p2_t1;
                    self.player_tubes[5] = p2_t2;

                    let stroop_match_types = ["color", "text_color", "text_word"];
                    let mut rng = rand::thread_rng();
                    if self.variant == "stroop" {
                        self.stroop_match_type = Some(stroop_match_types.choose(&mut rng).unwrap().to_string());
                    }
                }
            }
            _ => return Err("Unknown action for Dr. Eureka".into()),
        }

        // Broadcast current state to all players
        Ok(game_trait::broadcast_per_player(players, |p| {
            self.state_for_player(Some(p))
        }))
    }

    fn check_game_over(&self) -> Option<ServerMessage> {
        if self.game_over {
            Some(ServerMessage::GameOver {
                winner: self.winner.map(|w| format!("Player {}", w + 1)),
                reason: "Solved 5 formulas first!".to_string(),
            })
        } else {
            None
        }
    }

    fn state_for_player(&self, player: Option<u8>) -> serde_json::Value {
        let mut val = serde_json::to_value(self).unwrap();
        if let serde_json::Value::Object(ref mut map) = val {
            let active_player = player.unwrap_or(0);
            map.insert("currentPlayer".to_string(), serde_json::json!(active_player));
        }
        val
    }

    fn reset(&mut self) {
        *self = DrEurekaGame::new_variant(&self.variant);
    }

    fn game_type(&self) -> &str {
        "dr_eureka"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initial_state() {
        let game = DrEurekaGame::new();
        assert_eq!(game.variant, "classic");
        assert_eq!(game.scores, vec![0, 0]);
        assert_eq!(game.player_tubes.len(), 6);
        assert!(!game.game_over);
    }

    #[test]
    fn test_valid_move() {
        let mut game = DrEurekaGame::new();
        // Start: T0 has 2 balls, T1 has 2, T2 has 2.
        assert_eq!(game.player_tubes[0].len(), 2);
        assert_eq!(game.player_tubes[1].len(), 2);

        // Move a ball from P1 T0 (idx 0) to P1 T1 (idx 1)
        assert!(game.make_move(0, 0, 1).is_ok());
        assert_eq!(game.player_tubes[0].len(), 1);
        assert_eq!(game.player_tubes[1].len(), 3);
    }

    #[test]
    fn test_invalid_moves() {
        let mut game = DrEurekaGame::new();
        // Move to same tube is rejected
        assert!(game.make_move(0, 0, 0).is_err());
        
        // Pours on empty source rejected
        game.player_tubes[0].clear();
        assert!(game.make_move(0, 0, 1).is_err());
        
        // Pours on full dest rejected
        game.player_tubes[1] = vec![
            Ball { id: 1, color: "red".into(), text_color: None, text_word: None, number_val: None },
            Ball { id: 2, color: "red".into(), text_color: None, text_word: None, number_val: None },
            Ball { id: 3, color: "red".into(), text_color: None, text_word: None, number_val: None },
            Ball { id: 4, color: "red".into(), text_color: None, text_word: None, number_val: None },
        ];
        // Now Tube 1 is full (len 4). Let's try to add one from Tube 2 (which has 2)
        assert!(game.make_move(0, 2, 1).is_err());
    }

    #[test]
    fn test_matching_algorithms() {
        let mut game = DrEurekaGame::new();
        
        // Set goal target card
        game.target_tubes = vec![
            vec!["red".to_string(), "red".to_string()],
            vec!["green".to_string(), "green".to_string()],
            vec!["purple".to_string(), "purple".to_string()],
        ];

        // Reset player tubes to match goal colors exactly
        game.player_tubes[0] = vec![
            Ball { id: 1, color: "red".into(), text_color: None, text_word: None, number_val: None },
            Ball { id: 2, color: "red".into(), text_color: None, text_word: None, number_val: None },
        ];
        game.player_tubes[1] = vec![
            Ball { id: 3, color: "green".into(), text_color: None, text_word: None, number_val: None },
            Ball { id: 4, color: "green".into(), text_color: None, text_word: None, number_val: None },
        ];
        game.player_tubes[2] = vec![
            Ball { id: 5, color: "purple".into(), text_color: None, text_word: None, number_val: None },
            Ball { id: 6, color: "purple".into(), text_color: None, text_word: None, number_val: None },
        ];

        // Should match perfectly
        assert!(game.check_match_for_player(0));
    }
}
