use serde::Serialize;

/// Shut the Box / Tug-of-War Dice Game
#[derive(Debug, Clone, Serialize)]
pub struct ShutTheBoxGame {
    /// Each player has 6 cards (1-6). State: "behind", "middle", "open" isn't needed —
    /// we track position as: 0 = closed (behind), 1 = open (middle)
    pub player1_cards: [bool; 6], // true = open
    pub player2_cards: [bool; 6],
    pub current_player: u8,
    pub last_roll: Option<u8>,
    pub needs_roll: bool,
    pub winner: Option<u8>,
    pub game_over: bool,
}

impl ShutTheBoxGame {
    pub fn new() -> Self {
        ShutTheBoxGame {
            player1_cards: [false; 6],
            player2_cards: [false; 6],
            current_player: 0,
            last_roll: None,
            needs_roll: true,
            winner: None,
            game_over: false,
        }
    }

    pub fn roll_dice(&mut self, player: u8) -> Result<u8, String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if !self.needs_roll {
            return Err("You already rolled".into());
        }

        let roll = (rand::random::<u8>() % 6) + 1;
        self.last_roll = Some(roll);
        self.needs_roll = false;
        Ok(roll)
    }

    /// Apply a combination of cards to advance your own track.
    /// Matching opponent cards are pushed back automatically.
    /// `combination` is a list of card values (1-6) that sum to the dice roll.
    pub fn apply_combination(
        &mut self,
        player: u8,
        combination: &[u8],
        _target: &str,
    ) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if self.needs_roll {
            return Err("Roll the dice first".into());
        }

        let roll = self.last_roll.ok_or("No roll recorded")?;

        // Validate combination sums to roll
        let sum: u8 = combination.iter().sum();
        if sum != roll {
            return Err(format!("Combination sums to {}, but roll was {}", sum, roll));
        }

        // Validate all values are 1-6
        if combination.iter().any(|&v| v < 1 || v > 6) {
            return Err("Card values must be 1-6".into());
        }

        // Check for duplicate values in combination
        let mut seen = [false; 6];
        for &v in combination {
            let idx = (v - 1) as usize;
            if seen[idx] {
                return Err(format!("Duplicate card value: {}", v));
            }
            seen[idx] = true;
        }

        // Open own cards, then pull back any matching opponent cards automatically.
        let (cards, opponent_cards) = if player == 0 {
            (&mut self.player1_cards, &mut self.player2_cards)
        } else {
            (&mut self.player2_cards, &mut self.player1_cards)
        };
        for &v in combination {
            let idx = (v - 1) as usize;
            if cards[idx] {
                return Err(format!("Card {} is already open", v));
            }
            cards[idx] = true;
            if opponent_cards[idx] {
                opponent_cards[idx] = false;
            }
        }
        self.resolve_matching_cards_for(player);

        // Check win: all 6 cards open
        if self.player1_cards.iter().all(|&c| c) {
            self.winner = Some(0);
            self.game_over = true;
        } else if self.player2_cards.iter().all(|&c| c) {
            self.winner = Some(1);
            self.game_over = true;
        }

        // Next turn
        self.current_player = 1 - self.current_player;
        self.needs_roll = true;
        self.last_roll = None;
        Ok(())
    }

    fn resolve_matching_cards_for(&mut self, player: u8) {
        for idx in 0..6 {
            match player {
                0 if self.player1_cards[idx] => self.player2_cards[idx] = false,
                1 if self.player2_cards[idx] => self.player1_cards[idx] = false,
                _ => {}
            }
        }
    }

    /// Pass turn (if player can't or doesn't want to use the roll)
    pub fn pass_turn(&mut self, player: u8) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if self.needs_roll {
            return Err("Roll the dice first".into());
        }
        self.current_player = 1 - self.current_player;
        self.needs_roll = true;
        self.last_roll = None;
        Ok(())
    }

    pub fn state_json(&self) -> serde_json::Value {
        serde_json::json!({
            "player1Cards": self.player1_cards,
            "player2Cards": self.player2_cards,
            "currentPlayer": self.current_player,
            "lastRoll": self.last_roll,
            "needsRoll": self.needs_roll,
            "winner": self.winner,
            "gameOver": self.game_over,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::ShutTheBoxGame;

    fn rolled_game(roll: u8) -> ShutTheBoxGame {
        ShutTheBoxGame {
            player1_cards: [false; 6],
            player2_cards: [false; 6],
            current_player: 0,
            last_roll: Some(roll),
            needs_roll: false,
            winner: None,
            game_over: false,
        }
    }

    #[test]
    fn applying_self_combination_opens_cards_and_ends_turn() {
        let mut game = rolled_game(3);

        game.apply_combination(0, &[1, 2], "self").unwrap();

        assert_eq!(game.player1_cards, [true, true, false, false, false, false]);
        assert_eq!(game.current_player, 1);
        assert!(game.needs_roll);
        assert_eq!(game.last_roll, None);
    }

    #[test]
    fn matching_open_opponent_cards_are_pushed_back_automatically() {
        let mut game = rolled_game(3);
        game.player2_cards = [true, true, false, false, false, false];

        game.apply_combination(0, &[1, 2], "self").unwrap();

        assert_eq!(game.player1_cards, [true, true, false, false, false, false]);
        assert_eq!(game.player2_cards, [false, false, false, false, false, false]);
    }

    #[test]
    fn opening_own_card_pushes_opponents_matching_card_back() {
        let mut game = rolled_game(4);
        game.player2_cards = [false, false, false, true, false, false];

        game.apply_combination(0, &[4], "self").unwrap();

        assert_eq!(game.player1_cards, [false, false, false, true, false, false]);
        assert_eq!(game.player2_cards, [false, false, false, false, false, false]);
    }

    #[test]
    fn player_two_opening_card_pushes_player_one_matching_card_back() {
        let mut game = ShutTheBoxGame {
            player1_cards: [false, false, true, false, false, false],
            player2_cards: [false, false, false, false, false, false],
            current_player: 1,
            last_roll: Some(3),
            needs_roll: false,
            winner: None,
            game_over: false,
        };

        game.apply_combination(1, &[3], "self").unwrap();

        assert_eq!(game.player1_cards, [false, false, false, false, false, false]);
        assert_eq!(game.player2_cards, [false, false, true, false, false, false]);
    }

    #[test]
    fn applied_move_repairs_duplicate_cards_in_favor_of_latest_player() {
        let mut game = ShutTheBoxGame {
            player1_cards: [true, true, true, false, false, false],
            player2_cards: [false, false, true, false, false, false],
            current_player: 1,
            last_roll: Some(4),
            needs_roll: false,
            winner: None,
            game_over: false,
        };

        game.apply_combination(1, &[4], "self").unwrap();

        assert_eq!(game.player1_cards, [true, true, false, false, false, false]);
        assert_eq!(game.player2_cards, [false, false, true, true, false, false]);
    }

    #[test]
    fn duplicate_combination_values_are_rejected() {
        let mut game = rolled_game(2);

        let error = game.apply_combination(0, &[1, 1], "self").unwrap_err();

        assert_eq!(error, "Duplicate card value: 1");
    }

    #[test]
    fn opening_all_cards_marks_winner() {
        let mut game = rolled_game(6);
        game.player1_cards = [true, true, true, true, true, false];

        game.apply_combination(0, &[6], "self").unwrap();

        assert!(game.game_over);
        assert_eq!(game.winner, Some(0));
    }

    #[test]
    fn passing_turn_resets_roll_state() {
        let mut game = rolled_game(4);

        game.pass_turn(0).unwrap();

        assert_eq!(game.current_player, 1);
        assert!(game.needs_roll);
        assert_eq!(game.last_roll, None);
    }

    #[test]
    fn passing_turn_before_rolling_is_rejected() {
        let mut game = ShutTheBoxGame::new();

        let error = game.pass_turn(0).unwrap_err();

        assert_eq!(error, "Roll the dice first");
    }
}
