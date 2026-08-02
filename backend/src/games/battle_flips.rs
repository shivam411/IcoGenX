/* backend/src/games/battle_flips.rs */
use crate::game_trait::{self, Game};
use crate::protocol::ServerMessage;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct BattleFlipsGame {
    pub secret_words: Vec<String>,                 // Secret words for [P1, P2]
    pub revealed_letters: Vec<Vec<bool>>,          // Reveal map per character slot
    pub guessed_letters: Vec<char>,                // Track all guessed letters so far
    pub current_player: u8,
    pub setup_phase: bool,                         // Starts true, becomes false when both set
    pub winner: Option<u8>,
    pub game_over: bool,
    pub last_event: Option<String>,
}

impl BattleFlipsGame {
    pub fn new() -> Self {
        BattleFlipsGame {
            secret_words: vec!["".to_string(), "".to_string()],
            revealed_letters: vec![Vec::new(), Vec::new()],
            guessed_letters: Vec::new(),
            current_player: 0,
            setup_phase: true,
            winner: None,
            game_over: false,
            last_event: Some("Battle Flips started! Set your secret words.".to_string()),
        }
    }

    pub fn set_secret_word(&mut self, player: u8, word: String) -> Result<(), String> {
        if !self.setup_phase {
            return Err("Setup phase is already complete".into());
        }

        let p_idx = player as usize;
        let cleaned: String = word
            .trim()
            .to_ascii_uppercase()
            .chars()
            .filter(|c| c.is_ascii_alphabetic())
            .collect();

        if cleaned.len() < 3 || cleaned.len() > 10 {
            return Err("Secret word must be between 3 and 10 letters".into());
        }

        self.secret_words[p_idx] = cleaned.clone();
        self.revealed_letters[p_idx] = vec![false; cleaned.len()];

        let other_set = !self.secret_words[1 - p_idx].is_empty();
        if other_set {
            self.setup_phase = false;
            self.current_player = 0; // P1 starts guessing
            self.last_event = Some("Both players set their secret words! Player 1, guess a letter.".into());
        } else {
            self.last_event = Some(format!("Player {} set their secret word! Waiting for opponent.", player + 1));
        }

        Ok(())
    }

    pub fn guess_letter(&mut self, player: u8, letter: char) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if self.setup_phase {
            return Err("Set secret words first".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }

        let upper_letter = letter.to_ascii_uppercase();
        if !upper_letter.is_ascii_alphabetic() {
            return Err("Must guess an alphabetic letter".into());
        }

        if self.guessed_letters.contains(&upper_letter) {
            return Err(format!("Letter '{}' has already been guessed", upper_letter));
        }

        self.guessed_letters.push(upper_letter);

        let p_idx = player as usize;
        let opp_idx = 1 - p_idx;

        // Double-reveal logic:
        // 1. Reveal in opponent's word
        let mut in_opp = false;
        let opp_word = &self.secret_words[opp_idx];
        for (i, c) in opp_word.chars().enumerate() {
            if c == upper_letter {
                self.revealed_letters[opp_idx][i] = true;
                in_opp = true;
            }
        }

        // 2. Reveal in self word (penalty/danger reveal)
        let mut in_self = false;
        let self_word = &self.secret_words[p_idx];
        for (i, c) in self_word.chars().enumerate() {
            if c == upper_letter {
                self.revealed_letters[p_idx][i] = true;
                in_self = true;
            }
        }

        // Check if opponent's word is fully revealed
        let opp_all_revealed = self.revealed_letters[opp_idx].iter().all(|&r| r);
        if opp_all_revealed {
            self.game_over = true;
            self.winner = Some(player);
            self.last_event = Some(format!(
                "Player {} guessed '{}', fully revealing the opponent's word '{}'! Player {} wins!",
                player + 1, upper_letter, opp_word, player + 1
            ));
            return Ok(());
        }

        // Check if player's OWN word is also fully revealed as a side-effect (opponent wins!)
        let self_all_revealed = self.revealed_letters[p_idx].iter().all(|&r| r);
        if self_all_revealed {
            self.game_over = true;
            self.winner = Some(1 - player);
            self.last_event = Some(format!(
                "Player {} guessed '{}', but fully revealed their own word '{}'! Player {} wins!",
                player + 1, upper_letter, self_word, (1 - player) + 1
            ));
            return Ok(());
        }

        if in_opp {
            // Player keeps turn (Bonus turn)
            self.last_event = Some(format!(
                "Player {} guessed '{}' (Hit! Keep Turn).{}",
                player + 1,
                upper_letter,
                if in_self { " Revealed in your own word too!" } else { "" }
            ));
        } else {
            // Swap turn
            self.current_player = 1 - player;
            self.last_event = Some(format!(
                "Player {} guessed '{}' (Miss).{} Player {}'s turn.",
                player + 1,
                upper_letter,
                if in_self { " Revealed in your own word!" } else { "" },
                self.current_player + 1
            ));
        }

        Ok(())
    }

    pub fn guess_word(&mut self, player: u8, word: String) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if self.setup_phase {
            return Err("Set secret words first".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }

        let upper_word = word.trim().to_ascii_uppercase();
        let opp_idx = (1 - player) as usize;
        let target_word = &self.secret_words[opp_idx];

        if upper_word == *target_word {
            // Correct guess!
            self.game_over = true;
            self.winner = Some(player);
            self.last_event = Some(format!(
                "Player {} guessed the full word '{}' correctly! Player {} wins!",
                player + 1, target_word, player + 1
            ));
        } else {
            // Incorrect guess, pass turn
            self.current_player = 1 - player;
            self.last_event = Some(format!(
                "Player {} guessed '{}' (Incorrect). Player {}'s turn.",
                player + 1, upper_word, self.current_player + 1
            ));
        }

        Ok(())
    }
}

impl Game for BattleFlipsGame {
    fn process_action(
        &mut self,
        player: u8,
        action: serde_json::Value,
        players: &[String],
    ) -> Result<Vec<(String, ServerMessage)>, String> {
        match action.get("action").and_then(|v| v.as_str()) {
            Some("SetSecretWord") => {
                let word = action
                    .get("word")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| "Missing 'word'".to_string())?
                    .to_string();
                self.set_secret_word(player, word)?;
            }
            Some("GuessLetter") => {
                let letter_str = action
                    .get("letter")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| "Missing 'letter'".to_string())?;
                let letter = letter_str.chars().next().ok_or("Letter empty")?;
                self.guess_letter(player, letter)?;
            }
            Some("GuessWord") => {
                let word = action
                    .get("word")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| "Missing 'word'".to_string())?
                    .to_string();
                self.guess_word(player, word)?;
            }
            _ => return Err("Unknown action for Battle Flips".into()),
        }

        Ok(game_trait::broadcast_same(players, serde_json::to_value(self).unwrap()))
    }

    fn check_game_over(&self) -> Option<ServerMessage> {
        if self.game_over {
            Some(ServerMessage::GameOver {
                winner: self.winner.map(|w| format!("Player {}", w + 1)),
                reason: format!(
                    "Word solved! Winner: {}",
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
            let opp_idx = 1 - p_idx as usize;
            if let serde_json::Value::Object(ref mut map) = val {
                map.insert("localPlayerIdx".to_string(), serde_json::json!(p_idx));

                // Mask opponent secret word details
                if let Some(serde_json::Value::Array(ref mut words)) = map.get_mut("secret_words") {
                    if self.setup_phase {
                        // Hide both during setup
                        words[0] = serde_json::json!("");
                        words[1] = serde_json::json!("");
                    } else if words.len() > opp_idx {
                        // Hide opponent word letters that are not yet revealed
                        let opp_word = &self.secret_words[opp_idx];
                        let mut masked = String::new();
                        for (i, c) in opp_word.chars().enumerate() {
                            if self.revealed_letters[opp_idx][i] {
                                masked.push(c);
                            } else {
                                masked.push('?');
                            }
                        }
                        words[opp_idx] = serde_json::json!(masked);
                    }
                }
            }
        }
        val
    }

    fn reset(&mut self) {
        *self = BattleFlipsGame::new();
    }

    fn game_type(&self) -> &str {
        "battle_flips"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initial_state() {
        let game = BattleFlipsGame::new();
        assert!(game.setup_phase);
        assert!(!game.game_over);
    }

    #[test]
    fn test_setup_and_guessing() {
        let mut game = BattleFlipsGame::new();
        game.set_secret_word(0, "APPLE".into()).unwrap();
        assert!(game.setup_phase);
        game.set_secret_word(1, "BANANA".into()).unwrap();
        assert!(!game.setup_phase);

        // P1 guesses 'A' (which is in BANANA and in APPLE)
        game.guess_letter(0, 'A').unwrap();
        // BANANA matches 'A' -> index 1, 3, 5 revealed
        assert!(game.revealed_letters[1][1]); // A
        assert!(game.revealed_letters[1][3]); // A
        assert!(game.revealed_letters[1][5]); // A
        // APPLE also matches 'A' -> index 0 revealed (double reveal!)
        assert!(game.revealed_letters[0][0]); // A

        // Since 'A' was in opponent's word, P1 keeps turn
        assert_eq!(game.current_player, 0);

        // P1 guesses 'Z' (miss)
        game.guess_letter(0, 'Z').unwrap();
        assert_eq!(game.current_player, 1);
    }

    #[test]
    fn test_word_guess_win() {
        let mut game = BattleFlipsGame::new();
        game.set_secret_word(0, "CAT".into()).unwrap();
        game.set_secret_word(1, "DOG".into()).unwrap();

        game.guess_word(0, "DOG".into()).unwrap();
        assert!(game.game_over);
        assert_eq!(game.winner, Some(0));
    }
}
