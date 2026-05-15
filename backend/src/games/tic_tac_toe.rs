use serde::Serialize;
use std::collections::VecDeque;

/// Disappearing Tic-Tac-Toe: max 3 marks per player, oldest disappears
#[derive(Debug, Clone, Serialize)]
pub struct TicTacToeGame {
    pub board: [Option<u8>; 9],           // None, Some(0)=P1, Some(1)=P2
    pub player1_moves: VecDeque<usize>,    // Track move order for disappearing
    pub player2_moves: VecDeque<usize>,
    pub current_player: u8,                // 0 or 1
    pub winner: Option<u8>,
    pub game_over: bool,
    pub x_player: Option<u8>,              // assigned after toss
    pub coin_tossed: bool,
}

impl TicTacToeGame {
    pub fn new() -> Self {
        TicTacToeGame {
            board: [None; 9],
            player1_moves: VecDeque::new(),
            player2_moves: VecDeque::new(),
            current_player: 0, // Doesn't matter until toss
            winner: None,
            game_over: false,
            x_player: None,
            coin_tossed: false,
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

        // Disappearing mechanic: remove oldest if already have 3
        if moves.len() >= 3 {
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
        }

        self.current_player = 1 - self.current_player;
        Ok(())
    }

    fn check_win(&self, player: u8) -> bool {
        const LINES: [[usize; 3]; 8] = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
            [0, 4, 8], [2, 4, 6],             // diags
        ];
        LINES.iter().any(|line| {
            line.iter().all(|&i| self.board[i] == Some(player))
        })
    }

    /// Get the oldest move index that's about to disappear (for UI warning)
    pub fn fading_cell(&self, player: u8) -> Option<usize> {
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
        })
    }
}
