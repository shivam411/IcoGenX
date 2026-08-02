/* backend/src/games/line_crosser.rs */
use crate::game_trait::{self, Game};
use crate::protocol::ServerMessage;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct LineCrosserGame {
    pub dots_used: Vec<bool>,                    // size = 16, tracks if boundary dot is consumed
    pub lines: Vec<(usize, usize, u8)>,          // List of placed lines: (dot_a, dot_b, owner_player)
    pub scores: Vec<u32>,                        // Scores for P1 and P2
    pub current_player: u8,
    pub winner: Option<u8>,
    pub game_over: bool,
    pub last_event: Option<String>,
}

impl LineCrosserGame {
    pub fn new() -> Self {
        LineCrosserGame {
            dots_used: vec![false; 16],
            lines: Vec::new(),
            scores: vec![0, 0],
            current_player: 0,
            winner: None,
            game_over: false,
            last_event: Some("Line Crosser started! Player 1, connect two boundary dots.".to_string()),
        }
    }

    fn chords_intersect(a: usize, b: usize, c: usize, d: usize) -> bool {
        let (f_a, f_b) = if a < b { (a, b) } else { (b, a) };
        let (s_a, s_b) = if c < d { (c, d) } else { (d, c) };

        (f_a < s_a && s_a < f_b && f_b < s_b) || (s_a < f_a && f_a < s_b && s_b < f_b)
    }

    pub fn draw_line(&mut self, player: u8, a: usize, b: usize) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if a >= 16 || b >= 16 {
            return Err("Index out of bounds".into());
        }
        if a == b {
            return Err("Cannot connect a dot to itself".into());
        }
        if self.dots_used[a] || self.dots_used[b] {
            return Err("One or both dots are already used".into());
        }

        // Calculate crossing scores
        let mut turn_points = 0;
        let mut crossed_own = 0;
        let mut crossed_opp = 0;

        for &(c, d, owner) in &self.lines {
            if Self::chords_intersect(a, b, c, d) {
                if owner == player {
                    turn_points += 2;
                    crossed_own += 1;
                } else {
                    turn_points += 1;
                    crossed_opp += 1;
                }
            }
        }

        // Apply line and consume dots
        self.lines.push((a, b, player));
        self.dots_used[a] = true;
        self.dots_used[b] = true;
        self.scores[player as usize] += turn_points;

        // Check if game over (<= 1 unused dots remain)
        let unused_count = self.dots_used.iter().filter(|used| !**used).count();
        if unused_count <= 1 {
            self.game_over = true;
            if self.scores[0] > self.scores[1] {
                self.winner = Some(0);
            } else if self.scores[1] > self.scores[0] {
                self.winner = Some(1);
            } else {
                self.winner = None; // Draw
            }
            self.last_event = Some(format!(
                "Game Over! Final Scores - P1: {}, P2: {}. Winner: {}",
                self.scores[0],
                self.scores[1],
                self.winner.map_or("Draw".to_string(), |w| format!("Player {}", w + 1))
            ));
            return Ok(());
        }

        // Swap turns
        self.current_player = 1 - self.current_player;
        self.last_event = Some(format!(
            "Player {} connected dots {} and {}, crossing {} own and {} opponent lines (+{} pts). Player {}'s turn.",
            player + 1, a + 1, b + 1, crossed_own, crossed_opp, turn_points, self.current_player + 1
        ));

        Ok(())
    }
}

impl Game for LineCrosserGame {
    fn process_action(
        &mut self,
        player: u8,
        action: serde_json::Value,
        players: &[String],
    ) -> Result<Vec<(String, ServerMessage)>, String> {
        match action.get("action").and_then(|v| v.as_str()) {
            Some("DrawLine") => {
                let a = action
                    .get("a")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'a'".to_string())? as usize;
                let b = action
                    .get("b")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'b'".to_string())? as usize;

                self.draw_line(player, a, b)?;
            }
            _ => return Err("Unknown action for Line Crosser".into()),
        }

        Ok(game_trait::broadcast_same(players, serde_json::to_value(self).unwrap()))
    }

    fn check_game_over(&self) -> Option<ServerMessage> {
        if self.game_over {
            Some(ServerMessage::GameOver {
                winner: self.winner.map(|w| format!("Player {}", w + 1)),
                reason: format!(
                    "All perimeter dots connected! Final scores - Player 1: {} points, Player 2: {} points",
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
        *self = LineCrosserGame::new();
    }

    fn game_type(&self) -> &str {
        "line_crosser"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initial_state() {
        let game = LineCrosserGame::new();
        assert_eq!(game.dots_used.len(), 16);
        assert_eq!(game.lines.len(), 0);
        assert!(!game.game_over);
    }

    #[test]
    fn test_chord_intersection_math() {
        // Intersecting chords {0, 2} and {1, 3}
        assert!(LineCrosserGame::chords_intersect(0, 2, 1, 3));
        assert!(LineCrosserGame::chords_intersect(1, 3, 0, 2));

        // Non-intersecting parallel chords {0, 1} and {2, 3}
        assert!(!LineCrosserGame::chords_intersect(0, 1, 2, 3));

        // Non-intersecting nested chords {0, 3} and {1, 2}
        assert!(!LineCrosserGame::chords_intersect(0, 3, 1, 2));
    }

    #[test]
    fn test_draw_line_and_crossing_scores() {
        let mut game = LineCrosserGame::new();
        
        // P1 plays {0, 8}
        game.draw_line(0, 0, 8).unwrap();
        assert!(game.dots_used[0]);
        assert!(game.dots_used[8]);
        assert_eq!(game.scores[0], 0); // No lines to cross yet

        // P2 plays {4, 12} which crosses {0, 8}
        // Should score 1 pt for crossing opponent P1's line
        game.draw_line(1, 4, 12).unwrap();
        assert_eq!(game.scores[1], 1);
    }
}
