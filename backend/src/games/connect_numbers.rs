/* backend/src/games/connect_numbers.rs */
use crate::game_trait::{self, Game};
use crate::protocol::ServerMessage;
use serde::Serialize;
use rand::Rng;

#[derive(Debug, Clone, Serialize)]
pub struct ConnectNumbersGame {
    pub connections: Vec<Vec<bool>>,              // 2 players, each has 6 numbers (1..6)
    pub scores: Vec<u32>,                          // count of connections (0..=6)
    pub last_roll: Option<u8>,
    pub current_player: u8,
    pub winner: Option<u8>,
    pub game_over: bool,
    pub last_event: Option<String>,
}

impl ConnectNumbersGame {
    pub fn new() -> Self {
        ConnectNumbersGame {
            connections: vec![vec![false; 6], vec![false; 6]],
            scores: vec![0, 0],
            last_roll: None,
            current_player: 0,
            winner: None,
            game_over: false,
            last_event: Some("Connect Your Numbers started! Player 1, roll the die.".to_string()),
        }
    }

    pub fn roll_die(&mut self, player: u8) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }

        let mut rng = rand::thread_rng();
        let roll = rng.gen_range(1..=6);
        self.last_roll = Some(roll);

        let idx = (roll - 1) as usize;
        let mut connected_new = false;

        if !self.connections[player as usize][idx] {
            self.connections[player as usize][idx] = true;
            self.scores[player as usize] += 1;
            connected_new = true;
        }

        // Check victory
        if self.scores[player as usize] == 6 {
            self.game_over = true;
            self.winner = Some(player);
            self.last_event = Some(format!(
                "Player {} rolled a {} and connected all numbers to the central prize! Player {} wins!",
                player + 1, roll, player + 1
            ));
            return Ok(());
        }

        // Swap turn
        let next_player = 1 - self.current_player;
        if connected_new {
            self.last_event = Some(format!(
                "Player {} rolled a {} and connected it! Player {}'s turn.",
                player + 1, roll, next_player + 1
            ));
        } else {
            self.last_event = Some(format!(
                "Player {} rolled a {}. Already connected. Player {}'s turn.",
                player + 1, roll, next_player + 1
            ));
        }

        self.current_player = next_player;
        Ok(())
    }
}

impl Game for ConnectNumbersGame {
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
            _ => return Err("Unknown action for Connect Numbers".into()),
        }

        Ok(game_trait::broadcast_same(players, serde_json::to_value(self).unwrap()))
    }

    fn check_game_over(&self) -> Option<ServerMessage> {
        if self.game_over {
            Some(ServerMessage::GameOver {
                winner: self.winner.map(|w| format!("Player {}", w + 1)),
                reason: format!(
                    "All numbers connected! Winner: {}",
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
        }
        val
    }

    fn reset(&mut self) {
        *self = ConnectNumbersGame::new();
    }

    fn game_type(&self) -> &str {
        "connect_numbers"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initial_state() {
        let game = ConnectNumbersGame::new();
        assert_eq!(game.connections[0], vec![false; 6]);
        assert_eq!(game.connections[1], vec![false; 6]);
        assert_eq!(game.scores, vec![0, 0]);
        assert!(!game.game_over);
    }

    #[test]
    fn test_connections_and_turns() {
        let mut game = ConnectNumbersGame::new();
        // Roll is randomized, so let's call roll_die and check side effects
        game.roll_die(0).unwrap();
        assert!(game.last_roll.is_some());
        let roll = game.last_roll.unwrap();
        assert!(game.connections[0][(roll - 1) as usize]);
        assert_eq!(game.scores[0], 1);
        assert_eq!(game.current_player, 1);
    }

    #[test]
    fn test_winning_state() {
        let mut game = ConnectNumbersGame::new();
        for i in 0..5 {
            game.connections[0][i] = true;
        }
        game.scores[0] = 5;

        // Force roll deterministic outcome by editing connections, we want roll to connect the last index
        // Let's call roll_die until we get a 6 to be sure we connect index 5
        let mut loops = 0;
        while game.scores[0] < 6 && loops < 100 {
            game.current_player = 0;
            let _ = game.roll_die(0);
            loops += 1;
        }

        assert!(game.game_over);
        assert_eq!(game.winner, Some(0));
    }
}
