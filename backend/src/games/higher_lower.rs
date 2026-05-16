use serde::Serialize;

/// Higher/Lower: guess a number between 1-100
#[derive(Debug, Clone, Serialize)]
pub struct HigherLowerGame {
    #[serde(skip_serializing)]
    pub target: u8,
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
        let target = (rand::random::<u8>() % 100) + 1;
        HigherLowerGame {
            target,
            guesses: Vec::new(),
            range_low: 1,
            range_high: 100,
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
        if guess < 1 || guess > 100 {
            return Err("Guess must be between 1 and 100".into());
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
            "rangeLow": self.range_low,
            "rangeHigh": self.range_high,
            "currentPlayer": self.current_player,
            "winner": self.winner,
            "gameOver": self.game_over,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::HigherLowerGame;

    fn fixed_game(target: u8) -> HigherLowerGame {
        HigherLowerGame {
            target,
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
}
