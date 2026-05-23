use serde::Serialize;
use crate::game_trait::Game;
use crate::protocol::ServerMessage;

/// Higher/Lower: guess a hidden number inside the variant range.
#[derive(Debug, Clone, Serialize)]
pub struct HigherLowerGame {
    #[serde(skip_serializing)]
    pub target: u8,
    pub variant: String,
    pub max_number: u8,
    pub guesses: Vec<GuessEntry>,
    pub range_low: u8,
    pub range_high: u8,
    pub current_player: u8,
    pub winner: Option<u8>,
    pub game_over: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct GuessEntry {
    pub player: u8,
    pub guess: u8,
    pub hint: String, // "higher", "lower", "correct"
}

impl HigherLowerGame {
    pub fn new() -> Self {
        Self::new_variant("classic")
    }

    pub fn new_variant(variant: &str) -> Self {
        let (variant, max_number) = match variant {
            "sprint" => ("sprint", 50),
            "expert" => ("expert", 200),
            "code_breaker_number" => ("code_breaker_number", 100),
            _ => ("classic", 100),
        };

        let target = (rand::random::<u8>() % max_number) + 1;
        HigherLowerGame {
            target,
            variant: variant.to_string(),
            max_number,
            guesses: Vec::new(),
            range_low: 1,
            range_high: max_number,
            current_player: 0,
            winner: None,
            game_over: false,
        }
    }

    pub fn make_guess(&mut self, player: u8, guess: u8) -> Result<String, String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if guess < 1 || guess > self.max_number {
            return Err(format!("Guess must be between 1 and {}", self.max_number));
        }
        if guess < self.range_low || guess > self.range_high {
            return Err(format!("Guess must be between {} and {}", self.range_low, self.range_high));
        }

        let hint = if guess == self.target {
            "correct".to_string()
        } else if guess < self.target {
            self.range_low = guess + 1;
            "higher".to_string()
        } else {
            self.range_high = guess - 1;
            "lower".to_string()
        };

        self.guesses.push(GuessEntry {
            player,
            guess,
            hint: hint.clone(),
        });

        if hint == "correct" {
            self.winner = Some(player);
            self.game_over = true;
        }

        self.current_player = 1 - self.current_player;
        Ok(hint)
    }

    pub fn state_json(&self) -> serde_json::Value {
        serde_json::json!({
            "guesses": self.guesses,
            "variant": self.variant,
            "maxNumber": self.max_number,
            "rangeLow": self.range_low,
            "rangeHigh": self.range_high,
            "currentPlayer": self.current_player,
            "winner": self.winner,
            "gameOver": self.game_over,
        })
    }
}

fn broadcast_same(players: &[String], state: serde_json::Value) -> Vec<(String, ServerMessage)> {
    players
        .iter()
        .map(|pid| {
            (
                pid.clone(),
                ServerMessage::GameUpdate {
                    game_state: state.clone(),
                },
            )
        })
        .collect()
}

impl Game for HigherLowerGame {
    fn process_action(
        &mut self,
        player: u8,
        action: serde_json::Value,
        players: &[String],
    ) -> Result<Vec<(String, ServerMessage)>, String> {
        let guess = action
            .get("guess")
            .and_then(|v| v.as_u64())
            .ok_or_else(|| "Missing or invalid 'guess' field".to_string())? as u8;

        self.make_guess(player, guess)?;

        Ok(broadcast_same(players, self.state_json()))
    }

    fn check_game_over(&self) -> Option<ServerMessage> {
        if self.game_over {
            Some(ServerMessage::GameOver {
                winner: self.winner.map(|w| format!("Player {}", w + 1)),
                reason: "Number guessed correctly!".to_string(),
            })
        } else {
            None
        }
    }

    fn state_for_player(&self, _player: Option<u8>) -> serde_json::Value {
        self.state_json()
    }

    fn reset(&mut self) {
        *self = HigherLowerGame::new_variant(&self.variant);
    }

    fn game_type(&self) -> &str {
        "higher_lower"
    }
}

#[cfg(test)]
mod tests {
    use super::HigherLowerGame;

    fn fixed_game(target: u8) -> HigherLowerGame {
        HigherLowerGame {
            target,
            variant: "classic".into(),
            max_number: 100,
            guesses: Vec::new(),
            range_low: 1,
            range_high: 100,
            current_player: 0,
            winner: None,
            game_over: false,
        }
    }

    #[test]
    fn lower_guess_raises_lower_bound_and_switches_turn() {
        let mut game = fixed_game(73);

        let hint = game.make_guess(0, 40).unwrap();

        assert_eq!(hint, "higher");
        assert_eq!(game.range_low, 41);
        assert_eq!(game.range_high, 100);
        assert_eq!(game.current_player, 1);
        assert_eq!(game.guesses.len(), 1);
    }

    #[test]
    fn out_of_range_guess_is_rejected() {
        let mut game = fixed_game(73);
        game.range_low = 50;
        game.range_high = 80;

        let error = game.make_guess(0, 49).unwrap_err();

        assert_eq!(error, "Guess must be between 50 and 80");
        assert!(game.guesses.is_empty());
    }

    #[test]
    fn exact_guess_marks_winner_and_ends_game() {
        let mut game = fixed_game(73);

        let hint = game.make_guess(0, 73).unwrap();

        assert_eq!(hint, "correct");
        assert!(game.game_over);
        assert_eq!(game.winner, Some(0));
    }

    #[test]
    fn expert_variant_uses_larger_range() {
        let game = HigherLowerGame::new_variant("expert");

        assert_eq!(game.variant, "expert");
        assert_eq!(game.max_number, 200);
        assert_eq!(game.range_high, 200);
        assert!((1..=200).contains(&game.target));
    }

    #[test]
    fn variant_range_limits_guesses() {
        let mut game = HigherLowerGame::new_variant("sprint");

        let error = game.make_guess(0, 51).unwrap_err();

        assert_eq!(error, "Guess must be between 1 and 50");
        assert!(game.guesses.is_empty());
    }

    #[test]
    fn code_breaker_number_variant_uses_classic_range() {
        let game = HigherLowerGame::new_variant("code_breaker_number");

        assert_eq!(game.variant, "code_breaker_number");
        assert_eq!(game.max_number, 100);
        assert_eq!(game.range_low, 1);
        assert_eq!(game.range_high, 100);
    }
}
