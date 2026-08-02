/* backend/src/games/in_a_nutshell.rs */
use crate::game_trait::{self, Game};
use crate::protocol::ServerMessage;
use serde::{Deserialize, Serialize};
use rand::seq::SliceRandom;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NutshellCard {
    pub category: String,
    pub clues: Vec<String>,
    pub answer: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct InANutshellGame {
    pub scores: Vec<u32>,                         // Cumulative scores [P1, P2]
    pub deck: Vec<NutshellCard>,                  // Remaining cards
    pub current_card: Option<NutshellCard>,       // Active trivia card
    pub revealed_tabs: Vec<bool>,                 // Revealed state of clues
    pub locked_out: Vec<bool>,                    // Whether each player is locked out of guessing the current card
    pub current_player: u8,
    pub winner: Option<u8>,
    pub game_over: bool,
    pub last_event: Option<String>,
}

impl InANutshellGame {
    pub fn new() -> Self {
        let mut cards = vec![
            NutshellCard {
                category: "Brands & Slogans".to_string(),
                clues: vec!["COMPANY".into(), "SLOGAN".into(), "THINK".into(), "DIFFERENT".into()],
                answer: "Apple".to_string(),
            },
            NutshellCard {
                category: "Geography".to_string(),
                clues: vec!["GIANT".into(), "CLOCK".into(), "TOWER".into(), "LONDON".into(), "ENGLAND".into()],
                answer: "Big Ben".to_string(),
            },
            NutshellCard {
                category: "Movies & Books".to_string(),
                clues: vec!["BOY".into(), "WIZARD".into(), "SCAR".into(), "HOGWARTS".into(), "MAGIC".into()],
                answer: "Harry Potter".to_string(),
            },
            NutshellCard {
                category: "General Knowledge".to_string(),
                clues: vec!["FIRST".into(), "MAN".into(), "ON".into(), "THE".into(), "MOON".into()],
                answer: "Neil Armstrong".to_string(),
            },
            NutshellCard {
                category: "Tech & Internet".to_string(),
                clues: vec!["POPULAR".into(), "VIDEO".into(), "SHARING".into(), "WEBSITE".into(), "ALPHABET".into()],
                answer: "YouTube".to_string(),
            },
            NutshellCard {
                category: "Food & Drink".to_string(),
                clues: vec!["CARBONATED".into(), "COLORED".into(), "SOFT".into(), "DRINK".into(), "ATLANTA".into()],
                answer: "Coca-Cola".to_string(),
            },
            NutshellCard {
                category: "History".to_string(),
                clues: vec!["ANCIENT".into(), "EGYPTIAN".into(), "TOMBS".into(), "GIZA".into(), "TRIANGLES".into()],
                answer: "Pyramids".to_string(),
            },
            NutshellCard {
                category: "Literature".to_string(),
                clues: vec!["PLAYWRIGHT".into(), "STRATFORD".into(), "ROMEO".into(), "AND".into(), "JULIET".into()],
                answer: "Shakespeare".to_string(),
            },
            NutshellCard {
                category: "Animals".to_string(),
                clues: vec!["LARGEST".into(), "LAND".into(), "MAMMAL".into(), "TRUNK".into(), "TUSKS".into()],
                answer: "Elephant".to_string(),
            },
            NutshellCard {
                category: "Pop Culture".to_string(),
                clues: vec!["KING".into(), "OF".into(), "POP".into(), "THRILLER".into(), "MOONWALK".into()],
                answer: "Michael Jackson".to_string(),
            },
        ];

        // Shuffle deck
        let mut rng = rand::thread_rng();
        cards.shuffle(&mut rng);

        let mut game = InANutshellGame {
            scores: vec![0, 0],
            deck: cards,
            current_card: None,
            revealed_tabs: vec![],
            locked_out: vec![false, false],
            current_player: 0,
            winner: None,
            game_over: false,
            last_event: None,
        };

        game.draw_next_card();
        game.last_event = Some("In a Nutshell started! Player 1, pull a tab or submit a guess.".to_string());
        game
    }

    pub fn draw_next_card(&mut self) {
        if self.deck.is_empty() {
            self.game_over = true;
            self.declare_winner_by_score();
            return;
        }

        let card = self.deck.pop().unwrap();
        self.revealed_tabs = vec![false; card.clues.len()];
        self.locked_out = vec![false, false];
        self.current_card = Some(card);
    }

    fn declare_winner_by_score(&mut self) {
        self.game_over = true;
        if self.scores[0] > self.scores[1] {
            self.winner = Some(0);
            self.last_event = Some(format!("Deck empty! Player 1 wins with {} points!", self.scores[0]));
        } else if self.scores[1] > self.scores[0] {
            self.winner = Some(1);
            self.last_event = Some(format!("Deck empty! Player 2 wins with {} points!", self.scores[1]));
        } else {
            self.winner = None;
            self.last_event = Some(format!("Deck empty! It's a draw at {} points!", self.scores[0]));
        }
    }

    fn clean_string(&self, s: &str) -> String {
        s.chars()
            .filter(|c| c.is_alphanumeric())
            .collect::<String>()
            .to_lowercase()
    }

    pub fn pull_tab(&mut self, player: u8, tab_idx: usize) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        let card = self.current_card.as_ref().ok_or("No active card")?;
        if tab_idx >= card.clues.len() {
            return Err("Invalid tab index".into());
        }
        if self.revealed_tabs[tab_idx] {
            return Err("Tab already revealed".into());
        }

        self.revealed_tabs[tab_idx] = true;
        
        let revealed_word = &card.clues[tab_idx];
        self.last_event = Some(format!(
            "Player {} pulled Tab {}, revealing: '{}'.",
            player + 1, tab_idx + 1, revealed_word
        ));

        // Swap turns
        self.current_player = 1 - player;
        Ok(())
    }

    pub fn submit_guess(&mut self, player: u8, guess: String) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if self.locked_out[player as usize] {
            return Err("You are locked out of guessing for this card".into());
        }

        let card = self.current_card.clone().ok_or("No active card")?;
        let clean_guess = self.clean_string(&guess);
        let clean_answer = self.clean_string(&card.answer);

        if clean_guess == clean_answer {
            // Correct answer! Calculate score
            let revealed_count = self.revealed_tabs.iter().filter(|&&r| r).count();
            let pts = match revealed_count {
                0..=2 => 5,
                3..=4 => 3,
                _ => 1,
            };

            let p_idx = player as usize;
            self.scores[p_idx] += pts;

            self.last_event = Some(format!(
                "Player {} guessed '{}' CORRECTLY! (+{} points).",
                player + 1, card.answer, pts
            ));

            // Check if player reached target win score of 15 points
            if self.scores[p_idx] >= 15 {
                self.game_over = true;
                self.winner = Some(player);
                self.last_event = Some(format!(
                    "Player {} reached {} points and wins the match!",
                    player + 1, self.scores[p_idx]
                ));
            } else {
                // Draw next card
                self.draw_next_card();
            }
        } else {
            // Incorrect guess! Lock player out for this card
            let p_idx = player as usize;
            self.locked_out[p_idx] = true;

            self.last_event = Some(format!(
                "Player {} guessed '{}' INCORRECTLY! (Locked out of guesses for this card).",
                player + 1, guess
            ));

            // Check if both players are now locked out
            if self.locked_out.iter().all(|&l| l) {
                self.last_event = Some(format!(
                    "Both players locked out! The answer was '{}'. Drawing next card.",
                    card.answer
                ));
                self.draw_next_card();
            } else {
                // Pass turn
                self.current_player = 1 - player;
            }
        }

        Ok(())
    }

    pub fn pass_turn(&mut self, player: u8) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }

        self.last_event = Some(format!("Player {} passed their turn.", player + 1));
        self.current_player = 1 - player;
        Ok(())
    }
}

impl Game for InANutshellGame {
    fn process_action(
        &mut self,
        player: u8,
        action: serde_json::Value,
        players: &[String],
    ) -> Result<Vec<(String, ServerMessage)>, String> {
        match action.get("action").and_then(|v| v.as_str()) {
            Some("PullTab") => {
                let tab_idx = action
                    .get("tab_idx")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'tab_idx'".to_string())? as usize;
                self.pull_tab(player, tab_idx)?;
            }
            Some("SubmitGuess") => {
                let guess = action
                    .get("guess")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| "Missing 'guess'".to_string())?
                    .to_string();
                self.submit_guess(player, guess)?;
            }
            Some("PassTurn") => {
                self.pass_turn(player)?;
            }
            _ => return Err("Unknown action for In a Nutshell".into()),
        }

        Ok(game_trait::broadcast_same(players, serde_json::to_value(self).unwrap()))
    }

    fn check_game_over(&self) -> Option<ServerMessage> {
        if self.game_over {
            Some(ServerMessage::GameOver {
                winner: self.winner.map(|w| format!("Player {}", w + 1)),
                reason: format!(
                    "Trivia race complete! Winner: {}",
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
            if let Some(p_idx) = _player {
                map.insert("localPlayerIdx".to_string(), serde_json::json!(p_idx));
                
                // Keep the clues but mask the actual answer to prevent client-side inspection!
                if let Some(refmut_card) = map.get_mut("current_card") {
                    if let serde_json::Value::Object(ref mut card_map) = refmut_card {
                        card_map.insert("answer".to_string(), serde_json::json!("???"));
                    }
                }
            }
        }
        val
    }

    fn reset(&mut self) {
        *self = InANutshellGame::new();
    }

    fn game_type(&self) -> &str {
        "in_a_nutshell"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initial_state() {
        let game = InANutshellGame::new();
        assert_eq!(game.scores, vec![0, 0]);
        assert_eq!(game.current_player, 0);
        assert!(!game.game_over);
        assert!(game.current_card.is_some());
    }

    #[test]
    fn test_pull_tab_and_turn_passing() {
        let mut game = InANutshellGame::new();
        let card_len = game.revealed_tabs.len();
        
        // Player 0 pulls tab 0
        game.pull_tab(0, 0).unwrap();
        assert!(game.revealed_tabs[0]);
        assert_eq!(game.current_player, 1); // Turn passed to Player 1
    }

    #[test]
    fn test_guess_and_scoring() {
        let mut game = InANutshellGame::new();
        // Override active card to ensure deterministic result
        let test_card = NutshellCard {
            category: "Test Category".to_string(),
            clues: vec!["CLUE1".into(), "CLUE2".into(), "CLUE3".into()],
            answer: "Target Answer".to_string(),
        };
        game.current_card = Some(test_card);
        game.revealed_tabs = vec![false; 3];

        // Guess incorrectly
        game.submit_guess(0, "wrong answer".to_string()).unwrap();
        assert!(game.locked_out[0]);
        assert_eq!(game.current_player, 1); // Pass turn to P2

        // Guess correctly with P2. Revealed tabs is 0. Points awarded should be 5.
        game.submit_guess(1, "target answer".to_string()).unwrap();
        assert_eq!(game.scores[1], 5);
    }
}
