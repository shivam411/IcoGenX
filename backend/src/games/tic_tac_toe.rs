use serde::Serialize;
use std::collections::VecDeque;

/// Tic-Tac-Toe game variant
#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TicTacToeVariant {
    Classic,
    Disappearing,
    Joker,
}

impl TicTacToeVariant {
    pub fn from_str(s: &str) -> Self {
        match s {
            "classic" => TicTacToeVariant::Classic,
            "disappearing" => TicTacToeVariant::Disappearing,
            "joker" => TicTacToeVariant::Joker,
            _ => TicTacToeVariant::Classic,
        }
    }
}

/// Tic-Tac-Toe with multiple variants
#[derive(Debug, Clone, Serialize)]
pub struct TicTacToeGame {
    pub board: [Option<u8>; 9],           // None, Some(0)=P1, Some(1)=P2
    pub player1_moves: VecDeque<usize>,
    pub player2_moves: VecDeque<usize>,
    pub current_player: u8,
    pub winner: Option<u8>,
    pub game_over: bool,
    pub x_player: Option<u8>,
    pub coin_tossed: bool,
    pub variant: TicTacToeVariant,
    pub joker_cell: Option<usize>,        // Only used in Joker variant
}

impl TicTacToeGame {
    pub fn new() -> Self {
        Self::new_variant("disappearing")
    }

    pub fn new_variant(variant_str: &str) -> Self {
        let variant = TicTacToeVariant::from_str(variant_str);
        let joker_cell = if variant == TicTacToeVariant::Joker {
            use rand::Rng;
            let mut rng = rand::thread_rng();
            Some(rng.gen_range(0..9))
        } else {
            None
        };

        TicTacToeGame {
            board: [None; 9],
            player1_moves: VecDeque::new(),
            player2_moves: VecDeque::new(),
            current_player: 0,
            winner: None,
            game_over: false,
            x_player: None,
            coin_tossed: false,
            variant,
            joker_cell,
        }
    }

    pub fn toss_coin(&mut self) -> Result<(), String> {
        if self.coin_tossed {
            return Err("Coin already tossed".into());
        }
        use rand::Rng;
        let mut rng = rand::thread_rng();
        let x_p = if rng.gen_bool(0.5) { 0 } else { 1 };
        self.x_player = Some(x_p);
        self.current_player = x_p;
        self.coin_tossed = true;
        Ok(())
    }

    /// Reset the board for a new round (play again), preserving variant
    pub fn reset(&mut self) {
        self.board = [None; 9];
        self.player1_moves.clear();
        self.player2_moves.clear();
        self.winner = None;
        self.game_over = false;
        self.coin_tossed = false;
        self.x_player = None;
        // Re-randomize joker cell
        if self.variant == TicTacToeVariant::Joker {
            use rand::Rng;
            let mut rng = rand::thread_rng();
            self.joker_cell = Some(rng.gen_range(0..9));
        }
    }

    /// Reset and change variant (for switching variant without losing score)
    pub fn reset_with_variant(&mut self, variant_str: &str) {
        let variant = TicTacToeVariant::from_str(variant_str);
        self.variant = variant;
        self.reset();
    }

    pub fn make_move(&mut self, player: u8, cell: usize) -> Result<(), String> {
        if !self.coin_tossed {
            return Err("Waiting for coin toss".into());
        }
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if cell >= 9 {
            return Err("Invalid cell".into());
        }
        if self.board[cell].is_some() {
            return Err("Cell occupied".into());
        }

        let moves = if player == 0 {
            &mut self.player1_moves
        } else {
            &mut self.player2_moves
        };

        // Disappearing mechanic: remove oldest if already have 3 (only for Disappearing variant)
        if self.variant == TicTacToeVariant::Disappearing && moves.len() >= 3 {
            if let Some(oldest) = moves.pop_front() {
                self.board[oldest] = None;
            }
        }

        self.board[cell] = Some(player);
        moves.push_back(cell);

        // Check win
        if self.check_win(player) {
            self.winner = Some(player);
            self.game_over = true;
        } else if self.variant == TicTacToeVariant::Classic && self.is_board_full() {
            // Draw in classic mode
            self.game_over = true;
        }

        self.current_player = 1 - self.current_player;
        Ok(())
    }

    fn is_board_full(&self) -> bool {
        self.board.iter().all(|c| c.is_some())
    }

    fn check_win(&self, player: u8) -> bool {
        const LINES: [[usize; 3]; 8] = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
            [0, 4, 8], [2, 4, 6],             // diags
        ];

        LINES.iter().any(|line| {
            line.iter().all(|&i| {
                if self.board[i] == Some(player) {
                    return true;
                }
                // Joker variant: joker cell counts for both players
                if self.variant == TicTacToeVariant::Joker {
                    if let Some(jc) = self.joker_cell {
                        if i == jc && self.board[i].is_some() {
                            return true;
                        }
                    }
                }
                false
            })
        })
    }

    /// Get the oldest move index that's about to disappear (for UI warning)
    pub fn fading_cell(&self, player: u8) -> Option<usize> {
        if self.variant != TicTacToeVariant::Disappearing {
            return None;
        }
        let moves = if player == 0 {
            &self.player1_moves
        } else {
            &self.player2_moves
        };
        if moves.len() >= 3 {
            moves.front().copied()
        } else {
            None
        }
    }

    pub fn state_json(&self) -> serde_json::Value {
        serde_json::json!({
            "board": self.board,
            "currentPlayer": self.current_player,
            "winner": self.winner,
            "gameOver": self.game_over,
            "fadingCells": [self.fading_cell(0), self.fading_cell(1)],
            "player1Moves": self.player1_moves.iter().collect::<Vec<_>>(),
            "player2Moves": self.player2_moves.iter().collect::<Vec<_>>(),
            "xPlayer": self.x_player,
            "coinTossed": self.coin_tossed,
            "variant": self.variant,
            "jokerCell": self.joker_cell,
        })
    }
}
