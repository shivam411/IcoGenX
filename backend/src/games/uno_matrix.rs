/* backend/src/games/uno_matrix.rs */
use crate::game_trait::{self, Game};
use crate::protocol::ServerMessage;
use serde::{Deserialize, Serialize};
use rand::seq::SliceRandom;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct UnoCard {
    pub color: String, // "red", "yellow", "green", "blue", "wild"
    pub kind: String,  // "0".."9", "skip", "reverse", "draw2", "wild", "wild4"
}

#[derive(Debug, Clone, Serialize)]
pub struct UnoMatrixGame {
    pub grid_cards: Vec<Vec<UnoCard>>,             // 2 players, each has 16 cards (4x4)
    pub placed_cards: Vec<Vec<Option<UnoCard>>>,   // 2 players, 16 slots, holds card placed on top of flipped slot
    pub revealed: Vec<Vec<bool>>,                  // 2 players, 16 slots, tracks completed spots
    pub draw_piles: Vec<Vec<UnoCard>>,             // 2 players, card draw piles
    pub last_drawn: Option<UnoCard>,
    pub current_player: u8,
    pub scores: Vec<u32>,                          // score is count of completed spots (0..=16)
    pub winner: Option<u8>,
    pub game_over: bool,
    pub last_event: Option<String>,
}

impl UnoMatrixGame {
    pub fn new() -> Self {
        let mut deck = generate_uno_deck();
        let mut rng = rand::thread_rng();
        deck.shuffle(&mut rng);

        // Grid cards: 16 cards per player
        let p1_grid: Vec<UnoCard> = deck.drain(0..16).collect();
        let p2_grid: Vec<UnoCard> = deck.drain(0..16).collect();

        // Remaining deck split into personal draw piles
        // deck has 108 - 32 = 76 cards, so 38 cards per player
        let p1_pile: Vec<UnoCard> = deck.drain(0..38).collect();
        let p2_pile: Vec<UnoCard> = deck;

        UnoMatrixGame {
            grid_cards: vec![p1_grid, p2_grid],
            placed_cards: vec![vec![None; 16], vec![None; 16]],
            revealed: vec![vec![false; 16], vec![false; 16]],
            draw_piles: vec![p1_pile, p2_pile],
            last_drawn: None,
            current_player: 0,
            scores: vec![0, 0],
            winner: None,
            game_over: false,
            last_event: Some("UNO Matrix Race started! Player 1's turn to draw a card.".to_string()),
        }
    }

    pub fn draw_card(&mut self, player: u8) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }

        let pile = &mut self.draw_piles[player as usize];
        if pile.is_empty() {
            return Err("Your draw pile is empty".into());
        }

        let drawn = pile.remove(0);
        self.last_drawn = Some(drawn.clone());

        // Parse coordinate matching: Green, Blue, Yellow, Red
        let color_idx = match drawn.color.as_str() {
            "green" => Some(0),
            "blue" => Some(1),
            "yellow" => Some(2),
            "red" => Some(3),
            _ => None,
        };

        let num_val = drawn.kind.parse::<usize>().ok();
        let mut progress_made = false;
        let mut coord_str = String::new();

        if let (Some(r), Some(num)) = (color_idx, num_val) {
            if num >= 1 && num <= 4 {
                let c = num - 1;
                let idx = r * 4 + c;
                coord_str = format!("{}{}", match r {
                    0 => "G",
                    1 => "B",
                    2 => "Y",
                    _ => "R",
                }, num);

                if !self.revealed[player as usize][idx] {
                    self.revealed[player as usize][idx] = true;
                    self.placed_cards[player as usize][idx] = Some(drawn.clone());
                    self.scores[player as usize] += 1;
                    progress_made = true;
                }
            }
        }

        // Check victory
        if self.scores[player as usize] == 16 {
            self.game_over = true;
            self.winner = Some(player);
            self.last_event = Some(format!(
                "Player {} drew a {} {} and COMPLETED their entire matrix! Player {} wins!",
                player + 1, drawn.color, drawn.kind, player + 1
            ));
            return Ok(());
        }

        // Check if both piles are empty
        let p1_empty = self.draw_piles[0].is_empty();
        let p2_empty = self.draw_piles[1].is_empty();
        if p1_empty && p2_empty {
            self.game_over = true;
            let p1_score = self.scores[0];
            let p2_score = self.scores[1];
            if p1_score > p2_score {
                self.winner = Some(0);
            } else if p2_score > p1_score {
                self.winner = Some(1);
            } else {
                self.winner = None;
            }
            self.last_event = Some(format!(
                "Draw piles exhausted! Final scores - P1: {}, P2: {}. Winner: {}",
                p1_score, p2_score,
                self.winner.map_or("Draw".to_string(), |w| format!("Player {}", w + 1))
            ));
            return Ok(());
        }

        // Swap turn
        let next_player = 1 - self.current_player;
        if progress_made {
            self.last_event = Some(format!(
                "Player {} drew a {} {} and flipped coordinate {}! Player {}'s turn.",
                player + 1, drawn.color, drawn.kind, coord_str, next_player + 1
            ));
        } else {
            self.last_event = Some(format!(
                "Player {} drew a {} {}. Duplicate or invalid draw. Player {}'s turn.",
                player + 1, drawn.color, drawn.kind, next_player + 1
            ));
        }

        self.current_player = next_player;
        Ok(())
    }
}

fn generate_uno_deck() -> Vec<UnoCard> {
    let mut deck = Vec::new();
    let colors = vec!["red", "yellow", "green", "blue"];

    for color in &colors {
        // One "0"
        deck.push(UnoCard {
            color: color.to_string(),
            kind: "0".to_string(),
        });
        // Two of each "1".."9", "skip", "reverse", "draw2"
        for num in 1..=9 {
            for _ in 0..2 {
                deck.push(UnoCard {
                    color: color.to_string(),
                    kind: num.to_string(),
                });
            }
        }
        for kind in &["skip", "reverse", "draw2"] {
            for _ in 0..2 {
                deck.push(UnoCard {
                    color: color.to_string(),
                    kind: kind.to_string(),
                });
            }
        }
    }

    // Wild cards (4 wild, 4 wild4)
    for _ in 0..4 {
        deck.push(UnoCard {
            color: "wild".to_string(),
            kind: "wild".to_string(),
        });
        deck.push(UnoCard {
            color: "wild".to_string(),
            kind: "wild4".to_string(),
        });
    }

    deck
}

impl Game for UnoMatrixGame {
    fn process_action(
        &mut self,
        player: u8,
        action: serde_json::Value,
        players: &[String],
    ) -> Result<Vec<(String, ServerMessage)>, String> {
        match action.get("action").and_then(|v| v.as_str()) {
            Some("DrawCard") => {
                self.draw_card(player)?;
            }
            _ => return Err("Unknown action for UNO Matrix".into()),
        }

        Ok(game_trait::broadcast_same(players, serde_json::to_value(self).unwrap()))
    }

    fn check_game_over(&self) -> Option<ServerMessage> {
        if self.game_over {
            Some(ServerMessage::GameOver {
                winner: self.winner.map(|w| format!("Player {}", w + 1)),
                reason: format!(
                    "Grid completed or draw piles empty! Final scores - Player 1: {} spots, Player 2: {} spots",
                    self.scores[0], self.scores[1]
                ),
            })
        } else {
            None
        }
    }

    fn state_for_player(&self, player: Option<u8>) -> serde_json::Value {
        let mut val = serde_json::to_value(self).unwrap();
        // Hide opponent's grid cards and draw pile counts to prevent cheating in real play,
        // but keep it playable. We can keep it simple or implement view filtering.
        // Let's hide opponent grid cards.
        if let Some(p_idx) = player {
            let opp_idx = 1 - p_idx as usize;
            if let serde_json::Value::Object(ref mut map) = val {
                map.insert("currentPlayer".to_string(), serde_json::json!(self.current_player));
                // Mask opponent's face-down grid cards by replacing them with empty cards
                if let Some(serde_json::Value::Array(ref mut grids)) = map.get_mut("grid_cards") {
                    if grids.len() > opp_idx {
                        let opp_grid = &mut grids[opp_idx];
                        if let serde_json::Value::Array(ref mut cards) = opp_grid {
                            for (c_idx, card) in cards.iter_mut().enumerate() {
                                // Only hide if not yet revealed!
                                if !self.revealed[opp_idx][c_idx] {
                                    *card = serde_json::json!({
                                        "color": "hidden",
                                        "kind": "hidden"
                                    });
                                }
                            }
                        }
                    }
                }
                // Mask draw pile exact order (just show count)
                if let Some(serde_json::Value::Array(ref mut piles)) = map.get_mut("draw_piles") {
                    for pile in piles.iter_mut() {
                        if let serde_json::Value::Array(ref arr) = pile {
                            *pile = serde_json::json!({
                                "count": arr.len()
                            });
                        }
                    }
                }
            }
        }
        val
    }

    fn reset(&mut self) {
        *self = UnoMatrixGame::new();
    }

    fn game_type(&self) -> &str {
        "uno_matrix"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initial_state() {
        let game = UnoMatrixGame::new();
        assert_eq!(game.grid_cards[0].len(), 16);
        assert_eq!(game.grid_cards[1].len(), 16);
        assert_eq!(game.draw_piles[0].len(), 38);
        assert_eq!(game.draw_piles[1].len(), 38);
        assert_eq!(game.current_player, 0);
        assert!(!game.game_over);
    }

    #[test]
    fn test_coordinate_matching_and_redundancy() {
        let mut game = UnoMatrixGame::new();
        // Setup deterministic pile for test
        game.draw_piles[0] = vec![
            UnoCard { color: "green".to_string(), kind: "3".to_string() }, // G3 -> row 0 col 2 (idx 2)
            UnoCard { color: "green".to_string(), kind: "3".to_string() }, // duplicate
            UnoCard { color: "wild".to_string(), kind: "wild".to_string() }, // invalid color
        ];

        // 1st draw (P1)
        game.draw_card(0).unwrap();
        assert!(game.revealed[0][2]);
        assert_eq!(game.scores[0], 1);
        assert_eq!(game.current_player, 1);

        // 2nd draw (P2) - P2 draws normally from their pile, let's swap back to P1
        game.current_player = 0;
        
        // 2nd draw (P1) - duplicate G3
        game.draw_card(0).unwrap();
        assert_eq!(game.scores[0], 1); // no score increase
        assert_eq!(game.current_player, 1);

        game.current_player = 0;

        // 3rd draw (P1) - invalid wild card
        game.draw_card(0).unwrap();
        assert_eq!(game.scores[0], 1); // no change
    }

    #[test]
    fn test_win_condition() {
        let mut game = UnoMatrixGame::new();
        // Pretend P1 has 15 completed
        for i in 0..15 {
            game.revealed[0][i] = true;
        }
        game.scores[0] = 15;
        // Set next draw to complete the last coordinate
        game.draw_piles[0] = vec![
            UnoCard { color: "red".to_string(), kind: "4".to_string() } // R4 -> idx 15
        ];

        game.draw_card(0).unwrap();
        assert!(game.game_over);
        assert_eq!(game.winner, Some(0));
    }
}
