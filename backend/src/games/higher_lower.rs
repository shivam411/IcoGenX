use crate::game_trait::{self, Game};
use crate::protocol::ServerMessage;
use serde::Serialize;

/// Higher/Lower: each player locks a hidden number, then guesses the opponent's number.
#[derive(Debug, Clone, Serialize)]
pub struct HigherLowerGame {
    #[serde(skip_serializing)]
    pub targets: [u8; 2],
    pub secrets_set: [bool; 2],
    pub variant: String,
    pub max_number: u8,
    pub guesses: Vec<GuessEntry>,
    pub range_low: [u8; 2],
    pub range_high: [u8; 2],
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

        HigherLowerGame {
            targets: [0, 0],
            secrets_set: [false, false],
            variant: variant.to_string(),
            max_number,
            guesses: Vec::new(),
            range_low: [1, 1],
            range_high: [max_number, max_number],
            current_player: 0,
            winner: None,
            game_over: false,
        }
    }

    pub fn set_secret(&mut self, player: u8, secret: u8) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if self.secrets_set[player as usize] {
            return Err("Secret number already locked".into());
        }
        if secret < 1 || secret > self.max_number {
            return Err(format!("Secret must be between 1 and {}", self.max_number));
        }

        self.targets[player as usize] = secret;
        self.secrets_set[player as usize] = true;
        Ok(())
    }

    pub fn both_secrets_set(&self) -> bool {
        self.secrets_set[0] && self.secrets_set[1]
    }

    pub fn make_guess(&mut self, player: u8, guess: u8) -> Result<String, String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if !self.both_secrets_set() {
            return Err("Both players must lock their secret number first".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if guess < 1 || guess > self.max_number {
            return Err(format!("Guess must be between 1 and {}", self.max_number));
        }
        let player_idx = player as usize;
        if guess < self.range_low[player_idx] || guess > self.range_high[player_idx] {
            return Err(format!(
                "Guess must be between {} and {}",
                self.range_low[player_idx], self.range_high[player_idx]
            ));
        }

        let opponent_idx = (1 - player) as usize;
        let target = self.targets[opponent_idx];

        let hint = if guess == target {
            "correct".to_string()
        } else if guess < target {
            self.range_low[player_idx] = guess + 1;
            "higher".to_string()
        } else {
            self.range_high[player_idx] = guess - 1;
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

    pub fn state_json(&self, for_player: Option<u8>) -> serde_json::Value {
        let player_idx = for_player.map(|p| p as usize).filter(|p| *p < 2);
        let range_low = player_idx.map(|p| self.range_low[p]).unwrap_or(1);
        let range_high = player_idx
            .map(|p| self.range_high[p])
            .unwrap_or(self.max_number);
        let my_secret_set = player_idx.map(|p| self.secrets_set[p]);

        serde_json::json!({
            "guesses": self.guesses,
            "variant": self.variant,
            "maxNumber": self.max_number,
            "rangeLow": range_low,
            "rangeHigh": range_high,
            "secretsSet": self.secrets_set,
            "bothSecretsSet": self.both_secrets_set(),
            "mySecretSet": my_secret_set,
            "currentPlayer": self.current_player,
            "winner": self.winner,
            "gameOver": self.game_over,
        })
    }
}

impl Game for HigherLowerGame {
    fn process_action(
        &mut self,
        player: u8,
        action: serde_json::Value,
        players: &[String],
    ) -> Result<Vec<(String, ServerMessage)>, String> {
        if let Some(secret) = action.get("secret").and_then(|v| v.as_u64()) {
            if secret > u8::MAX as u64 {
                return Err(format!("Secret must be between 1 and {}", self.max_number));
            }
            self.set_secret(player, secret as u8)?;
            return Ok(game_trait::broadcast_per_player(players, |p| {
                self.state_json(Some(p))
            }));
        }

        let guess = action
            .get("guess")
            .and_then(|v| v.as_u64())
            .ok_or_else(|| "Missing or invalid 'guess' field".to_string())?;

        if guess > u8::MAX as u64 {
            return Err(format!("Guess must be between 1 and {}", self.max_number));
        }

        self.make_guess(player, guess as u8)?;

        Ok(game_trait::broadcast_per_player(players, |p| {
            self.state_json(Some(p))
        }))
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

    fn state_for_player(&self, player: Option<u8>) -> serde_json::Value {
        self.state_json(player)
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

    fn fixed_game(player_zero_secret: u8, player_one_secret: u8) -> HigherLowerGame {
        let mut game = HigherLowerGame::new_variant("classic");
        game.set_secret(0, player_zero_secret).unwrap();
        game.set_secret(1, player_one_secret).unwrap();
        game
    }

    #[test]
    fn lower_guess_raises_lower_bound_and_switches_turn() {
        let mut game = fixed_game(12, 73);

        let hint = game.make_guess(0, 40).unwrap();

        assert_eq!(hint, "higher");
        assert_eq!(game.range_low[0], 41);
        assert_eq!(game.range_high[0], 100);
        assert_eq!(game.current_player, 1);
        assert_eq!(game.guesses.len(), 1);
    }

    #[test]
    fn out_of_range_guess_is_rejected() {
        let mut game = fixed_game(12, 73);
        game.range_low[0] = 50;
        game.range_high[0] = 80;

        let error = game.make_guess(0, 49).unwrap_err();

        assert_eq!(error, "Guess must be between 50 and 80");
        assert!(game.guesses.is_empty());
    }

    #[test]
    fn exact_guess_marks_winner_and_ends_game() {
        let mut game = fixed_game(12, 73);

        let hint = game.make_guess(0, 73).unwrap();

        assert_eq!(hint, "correct");
        assert!(game.game_over);
        assert_eq!(game.winner, Some(0));
    }

    #[test]
    fn guess_is_rejected_until_both_secrets_are_set() {
        let mut game = HigherLowerGame::new_variant("classic");
        game.set_secret(0, 12).unwrap();

        let error = game.make_guess(0, 50).unwrap_err();

        assert_eq!(error, "Both players must lock their secret number first");
    }

    #[test]
    fn player_ranges_are_tracked_independently() {
        let mut game = fixed_game(20, 80);

        game.make_guess(0, 50).unwrap();
        game.make_guess(1, 60).unwrap();

        assert_eq!(game.range_low[0], 51);
        assert_eq!(game.range_high[0], 100);
        assert_eq!(game.range_low[1], 1);
        assert_eq!(game.range_high[1], 59);
    }

    #[test]
    fn expert_variant_uses_larger_range() {
        let game = HigherLowerGame::new_variant("expert");

        assert_eq!(game.variant, "expert");
        assert_eq!(game.max_number, 200);
        assert_eq!(game.range_high, [200, 200]);
        assert_eq!(game.secrets_set, [false, false]);
    }

    #[test]
    fn variant_range_limits_secrets_and_guesses() {
        let mut game = HigherLowerGame::new_variant("sprint");

        let secret_error = game.set_secret(0, 51).unwrap_err();
        assert_eq!(secret_error, "Secret must be between 1 and 50");

        game.set_secret(0, 25).unwrap();
        game.set_secret(1, 30).unwrap();

        let error = game.make_guess(0, 51).unwrap_err();

        assert_eq!(error, "Guess must be between 1 and 50");
        assert!(game.guesses.is_empty());
    }

    #[test]
    fn code_breaker_number_variant_uses_classic_range() {
        let game = HigherLowerGame::new_variant("code_breaker_number");

        assert_eq!(game.variant, "code_breaker_number");
        assert_eq!(game.max_number, 100);
        assert_eq!(game.range_low, [1, 1]);
        assert_eq!(game.range_high, [100, 100]);
    }

    #[test]
    fn state_for_player_hides_secrets_and_shows_that_players_range() {
        let mut game = fixed_game(20, 80);
        game.make_guess(0, 50).unwrap();

        let p0 = game.state_json(Some(0));
        let p1 = game.state_json(Some(1));

        assert_eq!(p0["rangeLow"], 51);
        assert_eq!(p0["rangeHigh"], 100);
        assert_eq!(p1["rangeLow"], 1);
        assert_eq!(p1["rangeHigh"], 100);
        assert!(p0.get("targets").is_none());
        assert_eq!(p0["mySecretSet"], true);
    }
}
