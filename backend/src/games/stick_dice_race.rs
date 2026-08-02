/* backend/src/games/stick_dice_race.rs */
use crate::game_trait::{self, Game};
use crate::protocol::ServerMessage;
use serde::Serialize;
use rand::Rng;

#[derive(Debug, Clone, Serialize)]
pub struct Figure {
    pub id: usize,
    pub max_points: u8,
    pub current_points: u8,
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct StickDiceRaceGame {
    pub player_figures: Vec<Vec<Figure>>,          // Figures per player [P1, P2]
    pub rolled_value: Option<u8>,
    pub points_remaining: u8,
    pub has_rolled: bool,
    pub current_player: u8,
    pub winner: Option<u8>,
    pub game_over: bool,
    pub last_event: Option<String>,
}

impl StickDiceRaceGame {
    pub fn new() -> Self {
        // Define identical stick figure positions and health points
        let make_figures = || vec![
            Figure { id: 0, max_points: 5, current_points: 5, x: 100.0, y: 80.0 },   // Big Boss
            Figure { id: 1, max_points: 3, current_points: 3, x: 60.0, y: 190.0 },   // Med Left
            Figure { id: 2, max_points: 3, current_points: 3, x: 140.0, y: 190.0 },  // Med Right
            Figure { id: 3, max_points: 1, current_points: 1, x: 30.0, y: 300.0 },   // Small 1
            Figure { id: 4, max_points: 1, current_points: 1, x: 70.0, y: 300.0 },   // Small 2
            Figure { id: 5, max_points: 1, current_points: 1, x: 130.0, y: 300.0 },  // Small 3
            Figure { id: 6, max_points: 1, current_points: 1, x: 170.0, y: 300.0 },  // Small 4
        ];

        StickDiceRaceGame {
            player_figures: vec![make_figures(), make_figures()],
            rolled_value: None,
            points_remaining: 0,
            has_rolled: false,
            current_player: 0,
            winner: None,
            game_over: false,
            last_event: Some("Stick Figure Dice Race started! Player 1, roll the die.".to_string()),
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
        let val = rng.gen_range(1..=6);

        self.rolled_value = Some(val);
        self.points_remaining = val;
        self.has_rolled = true;
        self.last_event = Some(format!(
            "Player {} rolled a {}! Allocate {} points to your figures.",
            player + 1, val, val
        ));

        Ok(())
    }

    pub fn allocate_points(&mut self, player: u8, figure_id: usize, points: u8) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if !self.has_rolled {
            return Err("Roll the die first".into());
        }
        if figure_id >= 7 {
            return Err("Invalid figure ID".into());
        }

        let p_idx = player as usize;
        let figure = &mut self.player_figures[p_idx][figure_id];

        if figure.current_points == 0 {
            return Err("Figure is already crossed out".into());
        }
        if points == 0 {
            return Err("Cannot allocate 0 points".into());
        }
        if points > self.points_remaining {
            return Err("Not enough rolled points remaining".into());
        }
        if points > figure.current_points {
            return Err("Allocation exceeds figure's current health".into());
        }

        // Subtract health & remaining points
        figure.current_points -= points;
        self.points_remaining -= points;

        self.last_event = Some(format!(
            "Player {} allocated {} point(s) to Figure {}. (Remaining roll points: {})",
            player + 1, points, figure_id + 1, self.points_remaining
        ));

        // Check if player won (all figures at 0 points)
        let won = self.player_figures[p_idx].iter().all(|f| f.current_points == 0);
        if won {
            self.game_over = true;
            self.winner = Some(player);
            self.last_event = Some(format!(
                "Player {} eliminated all their stick figures! Player {} wins!",
                player + 1, player + 1
            ));
            return Ok(());
        }

        // If player has run out of points, end turn automatically
        if self.points_remaining == 0 {
            self.end_turn(player)?;
        }

        Ok(())
    }

    pub fn end_turn(&mut self, player: u8) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if !self.has_rolled {
            return Err("Cannot end turn before rolling".into());
        }

        let next_player = 1 - player;
        self.current_player = next_player;
        self.has_rolled = false;
        self.points_remaining = 0;
        self.rolled_value = None;
        self.last_event = Some(format!(
            "Turn passed to Player {}. Roll the die!",
            self.current_player + 1
        ));

        Ok(())
    }
}

impl Game for StickDiceRaceGame {
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
            Some("AllocatePoints") => {
                let fig_id = action
                    .get("figure_id")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'figure_id'".to_string())? as usize;
                let pts = action
                    .get("points")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'points'".to_string())? as u8;

                self.allocate_points(player, fig_id, pts)?;
            }
            Some("EndTurn") => {
                self.end_turn(player)?;
            }
            _ => return Err("Unknown action for Stick Figure Dice Race".into()),
        }

        Ok(game_trait::broadcast_same(players, serde_json::to_value(self).unwrap()))
    }

    fn check_game_over(&self) -> Option<ServerMessage> {
        if self.game_over {
            Some(ServerMessage::GameOver {
                winner: self.winner.map(|w| format!("Player {}", w + 1)),
                reason: format!(
                    "All figures crossed out! Winner: {}",
                    self.winner.map_or("Draw".to_string(), |w| format!("Player {}", w + 1))
                ),
            })
        } else {
            None
        }
    }

    fn state_for_player(&self, _player: Option<u8>) -> serde_json::Value {
        let mut val = serde_json::to_value(self).unwrap();
        if let Some(p_idx) = _player {
            if let serde_json::Value::Object(ref mut map) = val {
                map.insert("localPlayerIdx".to_string(), serde_json::json!(p_idx));
            }
        }
        val
    }

    fn reset(&mut self) {
        *self = StickDiceRaceGame::new();
    }

    fn game_type(&self) -> &str {
        "stick_dice_race"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initial_state() {
        let game = StickDiceRaceGame::new();
        assert_eq!(game.player_figures[0].len(), 7);
        assert_eq!(game.player_figures[1].len(), 7);
        assert_eq!(game.player_figures[0][0].current_points, 5); // Big Boss
        assert_eq!(game.current_player, 0);
        assert!(!game.has_rolled);
        assert!(!game.game_over);
    }

    #[test]
    fn test_allocate_and_turn_passing() {
        let mut game = StickDiceRaceGame::new();
        game.roll_dice(0).unwrap();
        assert!(game.has_rolled);
        let roll = game.points_remaining;

        // Allocate 1 point to Figure 3 (Small Guy, has 1 health)
        let _ = game.allocate_points(0, 3, 1);
        assert_eq!(game.player_figures[0][3].current_points, 0); // crossed out
        assert_eq!(game.points_remaining, roll - 1);

        // End turn manually if not already ended automatically
        if game.current_player == 0 {
            game.end_turn(0).unwrap();
        }
        assert_eq!(game.current_player, 1);
        assert!(!game.has_rolled);
    }

    #[test]
    fn test_win_condition() {
        let mut game = StickDiceRaceGame::new();
        // Clear all except figure 3 (which has 1 point)
        for i in 0..7 {
            if i != 3 {
                game.player_figures[0][i].current_points = 0;
            }
        }
        game.roll_dice(0).unwrap();
        // Allocate 1 to figure 3
        game.allocate_points(0, 3, 1).unwrap();
        assert!(game.game_over);
        assert_eq!(game.winner, Some(0));
    }
}
