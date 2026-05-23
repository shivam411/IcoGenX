use rand::seq::SliceRandom;
use serde::Serialize;

use crate::game_trait::{self, Game};
use crate::protocol::ServerMessage;

const RANKS: [&str; 13] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUITS: [&str; 4] = ["S", "H", "D", "C"];

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct Card {
    pub id: String,
    pub rank: String,
    pub suit: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct LastPlay {
    pub player: u8,
    #[serde(rename = "claimedRank")]
    pub claimed_rank: String,
    pub cards: Vec<Card>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ChallengeResult {
    pub challenger: u8,
    #[serde(rename = "challengedPlayer")]
    pub challenged_player: u8,
    #[serde(rename = "wasBluff")]
    pub was_bluff: bool,
    pub collector: u8,
    pub revealed: Vec<Card>,
}

#[derive(Debug, Clone, Serialize)]
pub struct BluffCardGame {
    pub player1_hand: Vec<Card>,
    pub player2_hand: Vec<Card>,
    pub pile: Vec<Card>,
    pub current_player: u8,
    pub current_rank_idx: usize,
    pub last_play: Option<LastPlay>,
    pub last_challenge: Option<ChallengeResult>,
    pub winner: Option<u8>,
    pub game_over: bool,
}

impl BluffCardGame {
    pub fn new() -> Self {
        let mut deck = build_deck();
        deck.shuffle(&mut rand::thread_rng());

        let mut player1_hand = Vec::with_capacity(26);
        let mut player2_hand = Vec::with_capacity(26);

        for (idx, card) in deck.into_iter().enumerate() {
            if idx % 2 == 0 {
                player1_hand.push(card);
            } else {
                player2_hand.push(card);
            }
        }

        sort_hand(&mut player1_hand);
        sort_hand(&mut player2_hand);

        Self {
            player1_hand,
            player2_hand,
            pile: Vec::new(),
            current_player: 0,
            current_rank_idx: 0,
            last_play: None,
            last_challenge: None,
            winner: None,
            game_over: false,
        }
    }

    pub fn play_cards(&mut self, player: u8, card_indices: &[usize]) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if card_indices.is_empty() || card_indices.len() > 4 {
            return Err("Play 1 to 4 cards".into());
        }

        let mut sorted_indices = card_indices.to_vec();
        sorted_indices.sort_unstable();
        sorted_indices.dedup();
        if sorted_indices.len() != card_indices.len() {
            return Err("Card selections must be unique".into());
        }

        let claimed_rank = RANKS[self.current_rank_idx].to_string();
        let played_cards = {
            let hand = self.hand_mut(player);
            if sorted_indices.iter().any(|&idx| idx >= hand.len()) {
                return Err("Selected card is no longer in your hand".into());
            }

            let mut cards = Vec::with_capacity(sorted_indices.len());
            for &idx in sorted_indices.iter().rev() {
                cards.push(hand.remove(idx));
            }
            cards.reverse();
            cards
        };

        self.pile.extend(played_cards.clone());
        self.last_play = Some(LastPlay {
            player,
            claimed_rank,
            cards: played_cards,
        });
        self.last_challenge = None;

        if self.hand(player).is_empty() {
            self.winner = Some(player);
            self.game_over = true;
            return Ok(());
        }

        self.current_rank_idx = (self.current_rank_idx + 1) % RANKS.len();
        self.current_player = 1 - player;
        Ok(())
    }

    pub fn challenge(&mut self, player: u8) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }

        let last_play = self
            .last_play
            .clone()
            .ok_or_else(|| "There is no play to challenge".to_string())?;
        if last_play.player == player {
            return Err("You cannot challenge your own play".into());
        }

        let was_bluff = last_play
            .cards
            .iter()
            .any(|card| card.rank != last_play.claimed_rank);
        let collector = if was_bluff { last_play.player } else { player };
        let collected_cards: Vec<Card> = self.pile.drain(..).collect();

        {
            let hand = self.hand_mut(collector);
            hand.extend(collected_cards);
            sort_hand(hand);
        }

        self.last_challenge = Some(ChallengeResult {
            challenger: player,
            challenged_player: last_play.player,
            was_bluff,
            collector,
            revealed: last_play.cards,
        });
        self.last_play = None;
        self.current_player = collector;
        Ok(())
    }

    pub fn state_json(&self, player: Option<u8>) -> serde_json::Value {
        let player = if player == Some(1) { 1 } else { 0 };
        let hand = self.hand(player);
        let opponent_count = self.hand(1 - player).len();

        serde_json::json!({
            "hand": hand,
            "handCount": hand.len(),
            "opponentCardCount": opponent_count,
            "playerCardCounts": [self.player1_hand.len(), self.player2_hand.len()],
            "currentPlayer": self.current_player,
            "currentRank": RANKS[self.current_rank_idx],
            "pileCount": self.pile.len(),
            "lastPlay": self.last_play.as_ref().map(|play| serde_json::json!({
                "player": play.player,
                "claimedRank": play.claimed_rank,
                "count": play.cards.len(),
            })),
            "lastChallenge": self.last_challenge.as_ref(),
            "winner": self.winner,
            "gameOver": self.game_over,
        })
    }

    fn hand(&self, player: u8) -> &Vec<Card> {
        if player == 0 {
            &self.player1_hand
        } else {
            &self.player2_hand
        }
    }

    fn hand_mut(&mut self, player: u8) -> &mut Vec<Card> {
        if player == 0 {
            &mut self.player1_hand
        } else {
            &mut self.player2_hand
        }
    }
}

impl Game for BluffCardGame {
    fn process_action(
        &mut self,
        player: u8,
        action: serde_json::Value,
        players: &[String],
    ) -> Result<Vec<(String, ServerMessage)>, String> {
        let action_str = action["action"]
            .as_str()
            .ok_or_else(|| "Missing 'action' field".to_string())?;

        match action_str {
            "play" => {
                let card_indices: Vec<usize> = action["card_indices"]
                    .as_array()
                    .ok_or_else(|| "Missing 'card_indices' field".to_string())?
                    .iter()
                    .map(|v| v.as_u64().unwrap_or(0) as usize)
                    .collect();
                self.play_cards(player, &card_indices)?;
            }
            "challenge" => {
                self.challenge(player)?;
            }
            other => return Err(format!("Unknown action: {}", other)),
        }

        let msgs = game_trait::broadcast_per_player(players, |p| self.state_json(Some(p)));
        Ok(msgs)
    }

    fn check_game_over(&self) -> Option<ServerMessage> {
        if self.game_over {
            let reason = match self.winner {
                Some(w) => format!("Player {} wins!", w + 1),
                None => "Game over!".to_string(),
            };
            let winner = self.winner.map(|w| format!("Player {}", w + 1));
            Some(ServerMessage::GameOver { winner, reason })
        } else {
            None
        }
    }

    fn state_for_player(&self, player: Option<u8>) -> serde_json::Value {
        self.state_json(player)
    }

    fn reset(&mut self) {
        *self = BluffCardGame::new();
    }

    fn game_type(&self) -> &str {
        "bluff_card"
    }
}

fn build_deck() -> Vec<Card> {
    let mut deck = Vec::with_capacity(52);
    for rank in RANKS {
        for suit in SUITS {
            deck.push(Card {
                id: format!("{}{}", rank, suit),
                rank: rank.to_string(),
                suit: suit.to_string(),
            });
        }
    }
    deck
}

fn sort_hand(hand: &mut [Card]) {
    hand.sort_by_key(|card| {
        let rank_idx = RANKS.iter().position(|rank| *rank == card.rank).unwrap_or(usize::MAX);
        let suit_idx = SUITS.iter().position(|suit| *suit == card.suit).unwrap_or(usize::MAX);
        (rank_idx, suit_idx)
    });
}

#[cfg(test)]
mod tests {
    use super::{BluffCardGame, Card};

    fn card(rank: &str, suit: &str) -> Card {
        Card {
            id: format!("{}{}", rank, suit),
            rank: rank.to_string(),
            suit: suit.to_string(),
        }
    }

    fn test_game() -> BluffCardGame {
        BluffCardGame {
            player1_hand: vec![card("A", "S"), card("5", "H")],
            player2_hand: vec![card("2", "S"), card("A", "H")],
            pile: Vec::new(),
            current_player: 0,
            current_rank_idx: 0,
            last_play: None,
            last_challenge: None,
            winner: None,
            game_over: false,
        }
    }

    #[test]
    fn new_game_deals_even_hands() {
        let game = BluffCardGame::new();

        assert_eq!(game.player1_hand.len(), 26);
        assert_eq!(game.player2_hand.len(), 26);
        assert_eq!(game.pile.len(), 0);
    }

    #[test]
    fn playing_cards_adds_face_down_pile_and_advances_rank() {
        let mut game = test_game();

        game.play_cards(0, &[1]).unwrap();

        assert_eq!(game.player1_hand, vec![card("A", "S")]);
        assert_eq!(game.pile, vec![card("5", "H")]);
        assert_eq!(game.current_player, 1);
        assert_eq!(game.current_rank_idx, 1);
        assert_eq!(game.last_play.as_ref().unwrap().claimed_rank, "A");
    }

    #[test]
    fn challenge_sends_bluff_pile_to_previous_player() {
        let mut game = test_game();

        game.play_cards(0, &[1]).unwrap();
        game.challenge(1).unwrap();

        assert_eq!(game.player1_hand.len(), 2);
        assert_eq!(game.player2_hand.len(), 2);
        assert_eq!(game.pile.len(), 0);
        assert_eq!(game.current_player, 0);
        assert!(game.last_challenge.as_ref().unwrap().was_bluff);
    }

    #[test]
    fn failed_challenge_sends_pile_to_challenger() {
        let mut game = test_game();

        game.play_cards(0, &[0]).unwrap();
        game.challenge(1).unwrap();

        assert_eq!(game.player1_hand.len(), 1);
        assert_eq!(game.player2_hand.len(), 3);
        assert_eq!(game.current_player, 1);
        assert!(!game.last_challenge.as_ref().unwrap().was_bluff);
    }

    #[test]
    fn state_only_exposes_requesting_players_hand() {
        let game = test_game();

        let p1_state = game.state_json(Some(0));
        let p2_state = game.state_json(Some(1));

        assert_eq!(p1_state["hand"][0]["id"], "AS");
        assert_eq!(p2_state["hand"][0]["id"], "2S");
        assert_eq!(p1_state["opponentCardCount"], 2);
    }
}