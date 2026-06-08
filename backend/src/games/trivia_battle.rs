use serde::Serialize;
use std::collections::HashMap;
use crate::game_trait::{self, Game};
use crate::protocol::ServerMessage;

#[derive(Debug, Clone, Serialize)]
pub struct TriviaQuestion {
    pub category: String,
    pub question: String,
    pub choices: Vec<String>,
    #[serde(skip_serializing)]
    pub correct_idx: usize,
}

#[derive(Debug, Clone)]
pub struct TriviaBattleGame {
    pub questions: Vec<TriviaQuestion>,
    pub current_round: usize,
    pub player_answers: HashMap<usize, usize>, // player_index -> choice_index
    pub answer_times: HashMap<usize, u64>,     // player_index -> time_elapsed_ms
    pub scores: Vec<u32>,                      // cumulative scores per player
    pub game_over: bool,
    pub round_completed: bool,                 // true when all players have submitted answers
}

impl TriviaBattleGame {
    pub fn new() -> Self {
        let questions = vec![
            TriviaQuestion {
                category: "Science".to_string(),
                question: "What is the approximate speed of light?".to_string(),
                choices: vec![
                    "150,000 km/s".to_string(),
                    "299,792 km/s".to_string(),
                    "450,000 km/s".to_string(),
                    "580,200 km/s".to_string(),
                ],
                correct_idx: 1,
            },
            TriviaQuestion {
                category: "History".to_string(),
                question: "In which year did the Titanic sink?".to_string(),
                choices: vec![
                    "1905".to_string(),
                    "1912".to_string(),
                    "1921".to_string(),
                    "1933".to_string(),
                ],
                correct_idx: 1,
            },
            TriviaQuestion {
                category: "Geography".to_string(),
                question: "What is the capital of Australia?".to_string(),
                choices: vec![
                    "Sydney".to_string(),
                    "Melbourne".to_string(),
                    "Canberra".to_string(),
                    "Brisbane".to_string(),
                ],
                correct_idx: 2,
            },
            TriviaQuestion {
                category: "Pop Culture".to_string(),
                question: "Which movie won the first Academy Award for Best Picture?".to_string(),
                choices: vec![
                    "Wings (1927)".to_string(),
                    "Metropolis (1927)".to_string(),
                    "The Jazz Singer (1927)".to_string(),
                    "Sunrise (1927)".to_string(),
                ],
                correct_idx: 0,
            },
            TriviaQuestion {
                category: "Science".to_string(),
                question: "Which gas makes up the majority of Earth's atmosphere?".to_string(),
                choices: vec![
                    "Oxygen".to_string(),
                    "Carbon Dioxide".to_string(),
                    "Nitrogen".to_string(),
                    "Argon".to_string(),
                ],
                correct_idx: 2,
            },
            TriviaQuestion {
                category: "Geography".to_string(),
                question: "Which is the smallest ocean in the world?".to_string(),
                choices: vec![
                    "Indian Ocean".to_string(),
                    "Pacific Ocean".to_string(),
                    "Arctic Ocean".to_string(),
                    "Southern Ocean".to_string(),
                ],
                correct_idx: 2,
            },
            TriviaQuestion {
                category: "History".to_string(),
                question: "Who was the first Emperor of Rome?".to_string(),
                choices: vec![
                    "Julius Caesar".to_string(),
                    "Augustus".to_string(),
                    "Nero".to_string(),
                    "Caligula".to_string(),
                ],
                correct_idx: 1,
            },
            TriviaQuestion {
                category: "Pop Culture".to_string(),
                question: "What is the name of the fictional continent in Game of Thrones?".to_string(),
                choices: vec![
                    "Essos".to_string(),
                    "Westeros".to_string(),
                    "Tamriel".to_string(),
                    "Middle-earth".to_string(),
                ],
                correct_idx: 1,
            },
            TriviaQuestion {
                category: "Science".to_string(),
                question: "How many planets in our solar system have rings?".to_string(),
                choices: vec![
                    "One (Saturn)".to_string(),
                    "Two".to_string(),
                    "Four".to_string(),
                    "Eight".to_string(),
                ],
                correct_idx: 2, // Saturn, Jupiter, Uranus, Neptune
            },
            TriviaQuestion {
                category: "History".to_string(),
                question: "Which empire was ruled by Suleiman the Magnificent?".to_string(),
                choices: vec![
                    "Byzantine Empire".to_string(),
                    "Ottoman Empire".to_string(),
                    "Roman Empire".to_string(),
                    "Persian Empire".to_string(),
                ],
                correct_idx: 1,
            },
            TriviaQuestion {
                category: "Geography".to_string(),
                question: "Which river flows through the Grand Canyon?".to_string(),
                choices: vec![
                    "Mississippi River".to_string(),
                    "Colorado River".to_string(),
                    "Columbia River".to_string(),
                    "Yukon River".to_string(),
                ],
                correct_idx: 1,
            },
            TriviaQuestion {
                category: "Pop Culture".to_string(),
                question: "Who is the lead singer of the rock band Queen?".to_string(),
                choices: vec![
                    "David Bowie".to_string(),
                    "Freddie Mercury".to_string(),
                    "Mick Jagger".to_string(),
                    "Robert Plant".to_string(),
                ],
                correct_idx: 1,
            },
            TriviaQuestion {
                category: "Science".to_string(),
                question: "What is the hardest natural substance on Earth?".to_string(),
                choices: vec![
                    "Gold".to_string(),
                    "Iron".to_string(),
                    "Diamond".to_string(),
                    "Quartz".to_string(),
                ],
                correct_idx: 2,
            },
            TriviaQuestion {
                category: "Geography".to_string(),
                question: "Which country has the most natural lakes?".to_string(),
                choices: vec![
                    "Canada".to_string(),
                    "United States".to_string(),
                    "Russia".to_string(),
                    "Brazil".to_string(),
                ],
                correct_idx: 0,
            },
            TriviaQuestion {
                category: "History".to_string(),
                question: "Who was the primary author of the Declaration of Independence?".to_string(),
                choices: vec![
                    "Benjamin Franklin".to_string(),
                    "George Washington".to_string(),
                    "Thomas Jefferson".to_string(),
                    "John Adams".to_string(),
                ],
                correct_idx: 2,
            },
            TriviaQuestion {
                category: "Pop Culture".to_string(),
                question: "What was the first feature-length animated movie released by Disney?".to_string(),
                choices: vec![
                    "Pinocchio".to_string(),
                    "Fantasia".to_string(),
                    "Snow White and the Seven Dwarfs".to_string(),
                    "Dumbo".to_string(),
                ],
                correct_idx: 2,
            },
            TriviaQuestion {
                category: "Science".to_string(),
                question: "What is the chemical symbol for Gold?".to_string(),
                choices: vec![
                    "Gd".to_string(),
                    "Go".to_string(),
                    "Au".to_string(),
                    "Ag".to_string(),
                ],
                correct_idx: 2,
            },
            TriviaQuestion {
                category: "Geography".to_string(),
                question: "Mount Kilimanjaro is located in which country?".to_string(),
                choices: vec![
                    "Kenya".to_string(),
                    "Tanzania".to_string(),
                    "Uganda".to_string(),
                    "Ethiopia".to_string(),
                ],
                correct_idx: 1,
            },
            TriviaQuestion {
                category: "History".to_string(),
                question: "Who was the first female Prime Minister of the United Kingdom?".to_string(),
                choices: vec![
                    "Theresa May".to_string(),
                    "Margaret Thatcher".to_string(),
                    "Angela Merkel".to_string(),
                    "Indira Gandhi".to_string(),
                ],
                correct_idx: 1,
            },
            TriviaQuestion {
                category: "Pop Culture".to_string(),
                question: "Which artist released the album 'Thriller' in 1982?".to_string(),
                choices: vec![
                    "Prince".to_string(),
                    "Madonna".to_string(),
                    "Michael Jackson".to_string(),
                    "David Bowie".to_string(),
                ],
                correct_idx: 2,
            },
            TriviaQuestion {
                category: "Science".to_string(),
                question: "How many bones are in an adult human body?".to_string(),
                choices: vec![
                    "106".to_string(),
                    "206".to_string(),
                    "306".to_string(),
                    "406".to_string(),
                ],
                correct_idx: 1,
            },
            TriviaQuestion {
                category: "Geography".to_string(),
                question: "Which desert is the largest hot desert in the world?".to_string(),
                choices: vec![
                    "Gobi Desert".to_string(),
                    "Kalahari Desert".to_string(),
                    "Sahara Desert".to_string(),
                    "Arabian Desert".to_string(),
                ],
                correct_idx: 2,
            },
            TriviaQuestion {
                category: "History".to_string(),
                question: "Who was the ancient Egyptian queen who aligned with Julius Caesar?".to_string(),
                choices: vec![
                    "Nefertiti".to_string(),
                    "Cleopatra".to_string(),
                    "Hatshepsut".to_string(),
                    "Sobekneferu".to_string(),
                ],
                correct_idx: 1,
            },
            TriviaQuestion {
                category: "Pop Culture".to_string(),
                question: "Which video game franchise is the best-selling of all time?".to_string(),
                choices: vec![
                    "Tetris".to_string(),
                    "Minecraft".to_string(),
                    "Grand Theft Auto".to_string(),
                    "Super Mario".to_string(),
                ],
                correct_idx: 1,
            },
            TriviaQuestion {
                category: "Science".to_string(),
                question: "What is the study of mushrooms called?".to_string(),
                choices: vec![
                    "Mycology".to_string(),
                    "Phycology".to_string(),
                    "Bryology".to_string(),
                    "Entomology".to_string(),
                ],
                correct_idx: 0,
            },
        ];

        TriviaBattleGame {
            questions,
            current_round: 0,
            player_answers: HashMap::new(),
            answer_times: HashMap::new(),
            scores: vec![0; 4],
            game_over: false,
            round_completed: false,
        }
    }

    pub fn state_json(&self, player: Option<u8>) -> serde_json::Value {
        let question = self.questions.get(self.current_round);

        // Build a masked answers structure
        let mut answers_masked = serde_json::Map::new();
        for i in 0..4 {
            if self.round_completed {
                // Once round is completed, reveal all choices and correct index
                if let Some(ans) = self.player_answers.get(&i) {
                    answers_masked.insert(i.to_string(), serde_json::json!(ans));
                } else {
                    answers_masked.insert(i.to_string(), serde_json::json!(null));
                }
            } else {
                // If not completed, players can only see whether others have answered or not
                let has_answered = self.player_answers.contains_key(&i);
                answers_masked.insert(i.to_string(), serde_json::json!({
                    "answered": has_answered,
                    // Reveal own choice immediately in frontend so it looks locked-in
                    "choice": if player == Some(i as u8) { self.player_answers.get(&i) } else { None }
                }));
            }
        }

        serde_json::json!({
            "currentRound": self.current_round,
            "totalRounds": 10,
            "category": question.map(|q| q.category.as_str()).unwrap_or(""),
            "question": question.map(|q| q.question.as_str()).unwrap_or(""),
            "choices": question.map(|q| q.choices.clone()).unwrap_or_default(),
            "correctIdx": if self.round_completed { question.map(|q| q.correct_idx) } else { None },
            "answers": answers_masked,
            "scores": self.scores,
            "gameOver": self.game_over,
            "roundCompleted": self.round_completed,
        })
    }
}

impl Game for TriviaBattleGame {
    fn process_action(
        &mut self,
        player: u8,
        action: serde_json::Value,
        players: &[String],
    ) -> Result<Vec<(String, ServerMessage)>, String> {
        let action_type = action
            .get("action")
            .and_then(|v| v.as_str())
            .ok_or_else(|| "Missing action type".to_string())?;

        match action_type {
            "submit_answer" => {
                if self.round_completed || self.game_over {
                    return Err("Round is already completed or game is over".into());
                }

                let choice = action
                    .get("choice")
                    .and_then(|v| v.as_u64())
                    .map(|v| v as usize)
                    .ok_or_else(|| "Missing choice".to_string())?;

                let time_ms = action
                    .get("time_ms")
                    .and_then(|v| v.as_u64())
                    .unwrap_or(15000);

                let p_idx = player as usize;
                if self.player_answers.contains_key(&p_idx) {
                    return Err("Already answered this round".into());
                }

                self.player_answers.insert(p_idx, choice);
                self.answer_times.insert(p_idx, time_ms);

                // If all connected players have answered, complete the round and score
                if self.player_answers.len() == players.len() {
                    self.round_completed = true;

                    // Compute scores for the round
                    if let Some(question) = self.questions.get(self.current_round) {
                        for (&p, &ans) in &self.player_answers {
                            if ans == question.correct_idx {
                                let reaction_time = self.answer_times.get(&p).copied().unwrap_or(15000);
                                // Score decay from 1000 to 200 based on reaction time (limit to 15s)
                                let decay = (reaction_time / 15) as u32;
                                let points = 1000_u32.saturating_sub(decay).max(200);
                                if p < self.scores.len() {
                                    self.scores[p] += points;
                                }
                            }
                        }
                    }

                    // Check if that was the 10th round (index 9) to trigger game over
                    if self.current_round >= 9 {
                        self.game_over = true;
                    }
                }
            }
            "next_round" => {
                if !self.round_completed {
                    return Err("Cannot advance until round is completed".into());
                }
                if self.game_over {
                    return Err("Game is already over".into());
                }

                self.current_round += 1;
                self.player_answers.clear();
                self.answer_times.clear();
                self.round_completed = false;
            }
            _ => return Err(format!("Unknown action: {}", action_type)),
        }

        // Broadcast matching states for each player (since they see their own pending answers)
        Ok(game_trait::broadcast_per_player(players, |pid| self.state_json(Some(pid))))
    }

    fn check_game_over(&self) -> Option<ServerMessage> {
        if !self.game_over {
            return None;
        }

        // Find the index of the player with the highest score
        let mut max_score = 0;
        let mut winning_p = None;
        let mut is_draw = false;

        for (idx, &score) in self.scores.iter().enumerate() {
            if score > max_score {
                max_score = score;
                winning_p = Some(idx);
                is_draw = false;
            } else if score == max_score && score > 0 {
                is_draw = true;
            }
        }

        let winner = if is_draw {
            None
        } else {
            winning_p.map(|w| format!("Player {}", w + 1))
        };

        Some(ServerMessage::GameOver {
            winner,
            reason: "Game completed".into(),
        })
    }

    fn state_for_player(&self, player: Option<u8>) -> serde_json::Value {
        self.state_json(player)
    }

    fn reset(&mut self) {
        let questions = self.questions.clone();
        *self = TriviaBattleGame::new();
        self.questions = questions; // Preserve question list
    }

    fn game_type(&self) -> &str {
        "trivia_battle"
    }

    fn player_count(&self) -> u8 {
        4
    }
}

#[cfg(test)]
mod tests {
    use super::TriviaBattleGame;
    use crate::game_trait::Game;

    #[test]
    fn test_trivia_battle_instantiation() {
        let game = TriviaBattleGame::new();
        assert_eq!(game.current_round, 0);
        assert_eq!(game.player_count(), 4);
        assert!(!game.game_over);
    }

    #[test]
    fn test_trivia_battle_scoring_and_advancing() {
        let mut game = TriviaBattleGame::new();
        let players = vec![
            "p1".to_string(),
            "p2".to_string(),
            "p3".to_string(),
            "p4".to_string(),
        ];

        // Round 0 correct answer is index 1 ("299,792 km/s")
        // Player 0 answers correct at 3000ms
        let action0 = serde_json::json!({
            "action": "submit_answer",
            "choice": 1,
            "time_ms": 3000
        });
        let res = game.process_action(0, action0, &players).unwrap();
        assert_eq!(res.len(), 4); // broadcasts state for each player

        // Player 1 answers incorrect at 2000ms
        let action1 = serde_json::json!({
            "action": "submit_answer",
            "choice": 0,
            "time_ms": 2000
        });
        game.process_action(1, action1, &players).unwrap();

        // Player 2 answers correct at 12000ms
        let action2 = serde_json::json!({
            "action": "submit_answer",
            "choice": 1,
            "time_ms": 12000
        });
        game.process_action(2, action2, &players).unwrap();

        // Player 3 answers correct at 15000ms
        let action3 = serde_json::json!({
            "action": "submit_answer",
            "choice": 1,
            "time_ms": 15000
        });
        game.process_action(3, action3, &players).unwrap();

        // Round should be completed now
        assert!(game.round_completed);

        // Verify scores
        // P0 score: 1000 - 3000/15 = 800
        assert_eq!(game.scores[0], 800);
        // P1 score: 0
        assert_eq!(game.scores[1], 0);
        // P2 score: 1000 - 12000/15 = 200
        assert_eq!(game.scores[2], 200);
        // P3 score: 1000 - 15000/15 = 0 points? Wait, minimum score is 200!
        assert_eq!(game.scores[3], 200);

        // Advance to next round
        let next_action = serde_json::json!({
            "action": "next_round"
        });
        game.process_action(0, next_action, &players).unwrap();

        assert_eq!(game.current_round, 1);
        assert!(!game.round_completed);
        assert!(game.player_answers.is_empty());
    }
}
