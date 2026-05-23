use serde::Serialize;
use crate::game_trait::{self, Game};
use crate::protocol::ServerMessage;

/// 4-Digit Code Guesser (Mastermind)
#[derive(Debug, Clone, Serialize)]
pub struct CodeGuessGame {
    #[serde(skip_serializing)]
    pub player1_code: [u8; 4], // Hidden
    #[serde(skip_serializing)]
    pub player2_code: [u8; 4], // Hidden
    pub player1_guesses: Vec<GuessResult>,
    pub player2_guesses: Vec<GuessResult>,
    pub codes_set: [bool; 2], // Track if each player has set their code
    pub current_player: u8,
    pub winner: Option<u8>,
    pub game_over: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct GuessResult {
    pub guess: String,
    pub correct_position: u8,   // Right digit, right place (bulls)
    pub correct_digit: u8,      // Right digit, wrong place (cows)
}

impl CodeGuessGame {
    pub fn new() -> Self {
        CodeGuessGame {
            player1_code: [0; 4],
            player2_code: [0; 4],
            player1_guesses: Vec::new(),
            player2_guesses: Vec::new(),
            codes_set: [false, false],
            current_player: 0,
            winner: None,
            game_over: false,
        }
    }

    /// Set the secret code for a player
    pub fn set_code(&mut self, player: u8, code: &str) -> Result<(), String> {
        if code.len() != 4 {
            return Err("Code must be 4 digits".into());
        }
        let digits: Result<Vec<u8>, _> = code.chars().map(|c| {
            c.to_digit(10).map(|d| d as u8).ok_or("Invalid digit")
        }).collect();
        let digits = digits.map_err(|e| e.to_string())?;

        let code_arr: [u8; 4] = [digits[0], digits[1], digits[2], digits[3]];

        if player == 0 {
            self.player1_code = code_arr;
            self.codes_set[0] = true;
        } else {
            self.player2_code = code_arr;
            self.codes_set[1] = true;
        }
        Ok(())
    }

    pub fn both_codes_set(&self) -> bool {
        self.codes_set[0] && self.codes_set[1]
    }

    /// Make a guess against the opponent's code
    pub fn make_guess(&mut self, player: u8, guess: &str) -> Result<GuessResult, String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if !self.both_codes_set() {
            return Err("Both players must set their code first".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if guess.len() != 4 {
            return Err("Guess must be 4 digits".into());
        }

        let guess_digits: Result<Vec<u8>, _> = guess.chars().map(|c| {
            c.to_digit(10).map(|d| d as u8).ok_or("Invalid digit")
        }).collect();
        let guess_digits = guess_digits.map_err(|e| e.to_string())?;

        let target = if player == 0 {
            &self.player2_code
        } else {
            &self.player1_code
        };

        let mut correct_position = 0u8;
        let mut correct_digit = 0u8;
        let mut target_used = [false; 4];
        let mut guess_used = [false; 4];

        // First pass: exact matches
        for i in 0..4 {
            if guess_digits[i] == target[i] {
                correct_position += 1;
                target_used[i] = true;
                guess_used[i] = true;
            }
        }

        // Second pass: right digit, wrong place
        for i in 0..4 {
            if guess_used[i] {
                continue;
            }
            for j in 0..4 {
                if target_used[j] {
                    continue;
                }
                if guess_digits[i] == target[j] {
                    correct_digit += 1;
                    target_used[j] = true;
                    break;
                }
            }
        }

        let result = GuessResult {
            guess: guess.to_string(),
            correct_position,
            correct_digit,
        };

        if player == 0 {
            self.player1_guesses.push(result.clone());
        } else {
            self.player2_guesses.push(result.clone());
        }

        // Check win
        if correct_position == 4 {
            self.winner = Some(player);
            self.game_over = true;
        }

        self.current_player = 1 - self.current_player;
        Ok(result)
    }

    pub fn state_json(&self, for_player: Option<u8>) -> serde_json::Value {
        serde_json::json!({
            "player1Guesses": self.player1_guesses,
            "player2Guesses": self.player2_guesses,
            "codesSet": self.codes_set,
            "currentPlayer": self.current_player,
            "winner": self.winner,
            "gameOver": self.game_over,
            "myCodeSet": for_player.map(|p| self.codes_set[p as usize]),
        })
    }
}

impl Game for CodeGuessGame {
    fn process_action(
        &mut self,
        player: u8,
        action: serde_json::Value,
        players: &[String],
    ) -> Result<Vec<(String, ServerMessage)>, String> {
        let guess = action
            .get("guess")
            .and_then(|v| v.as_str())
            .ok_or_else(|| "Missing 'guess' field".to_string())?;

        if !self.codes_set[player as usize] {
            self.set_code(player, guess)?;
        } else {
            self.make_guess(player, guess)?;
        }

        let msgs = game_trait::broadcast_per_player(players, |p| self.state_json(Some(p)));
        Ok(msgs)
    }

    fn check_game_over(&self) -> Option<ServerMessage> {
        if self.game_over {
            Some(ServerMessage::GameOver {
                winner: self.winner.map(|w| format!("Player {}", w + 1)),
                reason: "Code cracked!".to_string(),
            })
        } else {
            None
        }
    }

    fn state_for_player(&self, player: Option<u8>) -> serde_json::Value {
        self.state_json(player)
    }

    fn reset(&mut self) {
        *self = CodeGuessGame::new();
    }

    fn game_type(&self) -> &str {
        "code_guess"
    }
}

#[cfg(test)]
mod tests {
    use super::CodeGuessGame;

    #[test]
    fn repeated_digits_are_scored_without_double_counting() {
        let mut game = CodeGuessGame::new();
        game.set_code(0, "9876").unwrap();
        game.set_code(1, "1122").unwrap();

        let result = game.make_guess(0, "2211").unwrap();

        assert_eq!(result.correct_position, 0);
        assert_eq!(result.correct_digit, 4);
        assert_eq!(game.player1_guesses.len(), 1);
        assert_eq!(game.current_player, 1);
    }

    #[test]
    fn exact_match_marks_game_as_won() {
        let mut game = CodeGuessGame::new();
        game.set_code(0, "9876").unwrap();
        game.set_code(1, "1234").unwrap();

        let result = game.make_guess(0, "1234").unwrap();

        assert_eq!(result.correct_position, 4);
        assert_eq!(result.correct_digit, 0);
        assert!(game.game_over);
        assert_eq!(game.winner, Some(0));
    }

    #[test]
    fn guess_is_rejected_until_both_codes_are_set() {
        let mut game = CodeGuessGame::new();
        game.set_code(0, "1234").unwrap();

        let error = game.make_guess(0, "5678").unwrap_err();

        assert_eq!(error, "Both players must set their code first");
    }
}
