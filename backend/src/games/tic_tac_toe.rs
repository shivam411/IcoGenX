use serde::Serialize;
use std::collections::VecDeque;

use crate::game_trait::{self, Game};
use crate::protocol::ServerMessage;

/// Tic-Tac-Toe game variant
#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TicTacToeVariant {
    Classic,
    Disappearing,
    Joker,
    Gobblet,
    Gravity,
    Bidding,
    Blind,
}

impl TicTacToeVariant {
    pub fn from_str(s: &str) -> Self {
        match s {
            "classic" => TicTacToeVariant::Classic,
            "disappearing" => TicTacToeVariant::Disappearing,
            "joker" => TicTacToeVariant::Joker,
            "gobblet" | "gobblet_gobblers" => TicTacToeVariant::Gobblet,
            "gravity" | "drop" => TicTacToeVariant::Gravity,
            "bidding" | "auction" => TicTacToeVariant::Bidding,
            "blind" | "memory" => TicTacToeVariant::Blind,
            _ => TicTacToeVariant::Classic,
        }
    }
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct GobbletPiece {
    pub player: u8,
    pub size: u8,
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
    pub winning_line: Option<[usize; 3]>,
    pub x_player: Option<u8>,
    pub coin_tossed: bool,
    pub variant: TicTacToeVariant,
    pub joker_cell: Option<usize>,        // Only used in Joker variant
    pub gobblet_stacks: Vec<Vec<GobbletPiece>>,
    pub remaining_pieces: [[u8; 3]; 2],
    pub bidding_chips: [u8; 2],
    pub pending_bids: [Option<u8>; 2],
    pub last_bids: Option<[u8; 2]>,
    pub bidding_winner: Option<u8>,
    pub bidding_phase: String,
    pub last_event: Option<String>,
}

impl TicTacToeGame {
    pub fn new() -> Self {
        Self::new_variant("disappearing")
    }

    pub fn new_variant(variant_str: &str) -> Self {
        let variant = TicTacToeVariant::from_str(variant_str);
        let skips_coin_toss = variant == TicTacToeVariant::Bidding;
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
            winning_line: None,
            x_player: if skips_coin_toss { Some(0) } else { None },
            coin_tossed: skips_coin_toss,
            variant,
            joker_cell,
            gobblet_stacks: vec![Vec::new(); 9],
            remaining_pieces: [[2, 2, 2], [2, 2, 2]],
            bidding_chips: [100, 100],
            pending_bids: [None, None],
            last_bids: None,
            bidding_winner: None,
            bidding_phase: "bidding".into(),
            last_event: None,
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
        self.winning_line = None;
        self.coin_tossed = self.variant == TicTacToeVariant::Bidding;
        self.x_player = if self.variant == TicTacToeVariant::Bidding { Some(0) } else { None };
        self.gobblet_stacks = vec![Vec::new(); 9];
        self.remaining_pieces = [[2, 2, 2], [2, 2, 2]];
        self.bidding_chips = [100, 100];
        self.pending_bids = [None, None];
        self.last_bids = None;
        self.bidding_winner = None;
        self.bidding_phase = "bidding".into();
        self.last_event = None;
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

        match self.variant {
            TicTacToeVariant::Gravity => return self.make_gravity_move(player, cell),
            TicTacToeVariant::Blind => return self.make_blind_move(player, cell),
            TicTacToeVariant::Bidding => return self.place_bidding_mark(player, cell),
            TicTacToeVariant::Gobblet => return Err("Choose a small, medium, or large piece first".into()),
            _ => {}
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

        // Disappearing mechanic: remove oldest if already have 4 (only for Disappearing variant)
        if self.variant == TicTacToeVariant::Disappearing && moves.len() >= 4 {
            if let Some(oldest) = moves.pop_front() {
                self.board[oldest] = None;
            }
        }

        self.board[cell] = Some(player);
        moves.push_back(cell);

        self.finish_mark(player, self.variant != TicTacToeVariant::Disappearing);
        Ok(())
    }

    pub fn make_gobblet_move(&mut self, player: u8, from: Option<usize>, to: usize, size: u8) -> Result<(), String> {
        if self.variant != TicTacToeVariant::Gobblet {
            return Err("Gobblet move is only valid in Gobblet mode".into());
        }
        if !self.coin_tossed {
            return Err("Waiting for coin toss".into());
        }
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if !(1..=3).contains(&size) {
            return Err("Piece size must be small, medium, or large".into());
        }
        if to >= 9 {
            return Err("Invalid cell".into());
        }
        if let Some(top) = self.gobblet_stacks[to].last() {
            if top.size >= size {
                return Err("You can only cover a smaller piece".into());
            }
        }

        let piece = if let Some(from_idx) = from {
            if from_idx >= 9 {
                return Err("Invalid source cell".into());
            }
            if from_idx == to {
                return Err("Choose a different destination".into());
            }
            match self.gobblet_stacks[from_idx].last() {
                Some(top) if top.player == player && top.size == size => {}
                Some(top) if top.player == player => return Err("Selected piece size does not match the top piece".into()),
                Some(_) => return Err("You can only move your own top piece".into()),
                None => return Err("No piece to move from that cell".into()),
            }
            self.gobblet_stacks[from_idx].pop().unwrap()
        } else {
            let size_index = (size - 1) as usize;
            let player_index = player as usize;
            if self.remaining_pieces[player_index][size_index] == 0 {
                return Err("No pieces of that size left".into());
            }
            self.remaining_pieces[player_index][size_index] -= 1;
            GobbletPiece { player, size }
        };

        self.gobblet_stacks[to].push(piece);
        self.sync_gobblet_board();
        self.finish_mark(player, false);
        Ok(())
    }

    pub fn submit_bid(&mut self, player: u8, bid: u8) -> Result<(), String> {
        if self.variant != TicTacToeVariant::Bidding {
            return Err("Bids are only valid in Bidding mode".into());
        }
        if self.game_over {
            return Err("Game is over".into());
        }
        if self.bidding_phase != "bidding" {
            return Err("Wait for the current bidder to place their mark".into());
        }
        let player_index = player as usize;
        if bid > self.bidding_chips[player_index] {
            return Err("You cannot bid more chips than you have".into());
        }
        if self.pending_bids[player_index].is_some() {
            return Err("You already bid this round".into());
        }

        self.pending_bids[player_index] = Some(bid);
        self.last_event = Some(format!("Player {} locked a bid", player + 1));

        if let (Some(p1_bid), Some(p2_bid)) = (self.pending_bids[0], self.pending_bids[1]) {
            self.bidding_chips[0] -= p1_bid;
            self.bidding_chips[1] -= p2_bid;
            self.pending_bids = [None, None];
            self.last_bids = Some([p1_bid, p2_bid]);

            if p1_bid == p2_bid {
                self.bidding_winner = None;
                self.bidding_phase = "bidding".into();
                self.last_event = Some(format!("Both players bid {}. Tie round, no mark placed.", p1_bid));
            } else {
                let winner = if p1_bid > p2_bid { 0 } else { 1 };
                self.bidding_winner = Some(winner);
                self.current_player = winner;
                self.bidding_phase = "placing".into();
                self.last_event = Some(format!("Player {} won the auction and places next.", winner + 1));
            }
        }

        Ok(())
    }

    fn make_gravity_move(&mut self, player: u8, column: usize) -> Result<(), String> {
        if column >= 3 {
            return Err("Choose a column from 1 to 3".into());
        }
        let target = (0..3)
            .rev()
            .map(|row| row * 3 + column)
            .find(|&idx| self.board[idx].is_none())
            .ok_or_else(|| "Column is full".to_string())?;

        self.board[target] = Some(player);
        self.last_event = Some(format!("Player {} dropped into column {}", player + 1, column + 1));
        self.finish_mark(player, true);
        Ok(())
    }

    fn make_blind_move(&mut self, player: u8, cell: usize) -> Result<(), String> {
        if cell >= 9 {
            return Err("Invalid cell".into());
        }
        if self.board[cell].is_some() {
            self.last_event = Some(format!("Square {} was already taken. Player {} loses the turn.", cell + 1, player + 1));
            self.current_player = 1 - self.current_player;
            return Ok(());
        }

        self.board[cell] = Some(player);
        self.last_event = Some(format!("Player {} called square {}", player + 1, cell + 1));
        self.finish_mark(player, true);
        Ok(())
    }

    fn place_bidding_mark(&mut self, player: u8, cell: usize) -> Result<(), String> {
        if self.bidding_phase != "placing" || self.bidding_winner != Some(player) {
            return Err("Win the auction before placing a mark".into());
        }
        if cell >= 9 {
            return Err("Invalid cell".into());
        }
        if self.board[cell].is_some() {
            return Err("Cell occupied".into());
        }

        self.board[cell] = Some(player);
        self.last_event = Some(format!("Player {} placed after winning the auction", player + 1));
        self.finish_mark(player, true);
        if !self.game_over {
            self.bidding_phase = "bidding".into();
            self.bidding_winner = None;
        }
        Ok(())
    }

    fn finish_mark(&mut self, player: u8, allow_draw: bool) {
        if let Some((winner, line)) = self.resolve_winner(player) {
            self.winner = Some(winner);
            self.winning_line = Some(line);
            self.game_over = true;
        } else if allow_draw && self.is_board_full() {
            self.game_over = true;
            self.winning_line = None;
        }

        if !self.game_over && self.variant != TicTacToeVariant::Bidding {
            self.current_player = 1 - self.current_player;
        }
    }

    fn sync_gobblet_board(&mut self) {
        for idx in 0..9 {
            self.board[idx] = self.gobblet_stacks[idx].last().map(|piece| piece.player);
        }
    }

    fn is_board_full(&self) -> bool {
        self.board.iter().all(|c| c.is_some())
    }

    fn cell_claims_player(&self, player: u8, idx: usize) -> bool {
        if self.board[idx] == Some(player) {
            return true;
        }

        if self.variant == TicTacToeVariant::Joker && self.joker_cell == Some(idx) {
            return true;
        }

        false
    }

    fn winning_line_for_player(&self, player: u8) -> Option<[usize; 3]> {
        const LINES: [[usize; 3]; 8] = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
            [0, 4, 8], [2, 4, 6],             // diags
        ];

        LINES
            .iter()
            .copied()
            .find(|line| line.iter().all(|&idx| self.cell_claims_player(player, idx)))
    }

    fn resolve_winner(&self, last_player: u8) -> Option<(u8, [usize; 3])> {
        self.winning_line_for_player(last_player)
            .map(|line| (last_player, line))
            .or_else(|| {
                let other_player = 1 - last_player;
                self.winning_line_for_player(other_player)
                    .map(|line| (other_player, line))
            })
    }

    fn check_win(&self, player: u8) -> bool {
        self.winning_line_for_player(player).is_some()
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
        if moves.len() >= 4 {
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
            "winningLine": self.winning_line,
            "fadingCells": [self.fading_cell(0), self.fading_cell(1)],
            "player1Moves": self.player1_moves.iter().collect::<Vec<_>>(),
            "player2Moves": self.player2_moves.iter().collect::<Vec<_>>(),
            "xPlayer": self.x_player,
            "coinTossed": self.coin_tossed,
            "variant": self.variant,
            "jokerCell": self.joker_cell,
            "gobbletStacks": self.gobblet_stacks,
            "remainingPieces": self.remaining_pieces,
            "biddingChips": self.bidding_chips,
            "pendingBids": self.pending_bids.map(|bid| bid.is_some()),
            "lastBids": self.last_bids,
            "biddingWinner": self.bidding_winner,
            "biddingPhase": self.bidding_phase,
            "lastEvent": self.last_event,
        })
    }
}

impl Game for TicTacToeGame {
    fn process_action(
        &mut self,
        player: u8,
        action: serde_json::Value,
        players: &[String],
    ) -> Result<Vec<(String, ServerMessage)>, String> {
        let game_tag = action.get("game").and_then(|v| v.as_str()).unwrap_or("");

        match game_tag {
            "TicTacToe" => {
                let cell = action.get("cell")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'cell' field".to_string())? as usize;
                self.make_move(player, cell)?;
            }
            "TicTacToeGobble" => {
                let from = action.get("from")
                    .and_then(|v| if v.is_null() { None } else { v.as_u64().map(|n| n as usize) });
                let to = action.get("to")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'to' field".to_string())? as usize;
                let size = action.get("size")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'size' field".to_string())? as u8;
                self.make_gobblet_move(player, from, to, size)?;
            }
            "TicTacToeBid" => {
                let bid = action.get("bid")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'bid' field".to_string())? as u8;
                self.submit_bid(player, bid)?;
            }
            "TicTacToeTossCoin" => {
                if player != 0 {
                    return Err("Only player 1 can toss the coin".into());
                }
                self.toss_coin()?;
            }
            _ => return Err(format!("Unknown TicTacToe action: {}", game_tag)),
        }

        let state = self.state_json();
        Ok(game_trait::broadcast_same(players, state))
    }

    fn check_game_over(&self) -> Option<ServerMessage> {
        if !self.game_over {
            return None;
        }
        let winner = self.winner.map(|w| format!("Player {}", w + 1));
        Some(ServerMessage::GameOver {
            winner,
            reason: "Game completed".into(),
        })
    }

    fn state_for_player(&self, _player: Option<u8>) -> serde_json::Value {
        self.state_json()
    }

    fn reset(&mut self) {
        self.reset();
    }

    fn game_type(&self) -> &str {
        "tic_tac_toe"
    }
}

#[cfg(test)]
mod tests {
    use super::{TicTacToeGame, TicTacToeVariant};

    fn ready_game(variant: &str) -> TicTacToeGame {
        let mut game = TicTacToeGame::new_variant(variant);
        game.coin_tossed = true;
        game.x_player = Some(0);
        game.current_player = 0;
        game
    }

    #[test]
    fn disappearing_variant_flags_oldest_mark_after_fourth_move() {
        let mut game = ready_game("disappearing");

        game.make_move(0, 0).unwrap();
        game.make_move(1, 1).unwrap();
        game.make_move(0, 2).unwrap();
        game.make_move(1, 3).unwrap();
        game.make_move(0, 4).unwrap();
        game.make_move(1, 5).unwrap();
        game.make_move(0, 6).unwrap();

        assert_eq!(game.variant, TicTacToeVariant::Disappearing);
        assert_eq!(game.player1_moves.iter().copied().collect::<Vec<_>>(), vec![0, 2, 4, 6]);
        assert_eq!(game.board[0], Some(0));
        assert_eq!(game.fading_cell(0), Some(0));
    }

    #[test]
    fn disappearing_variant_removes_oldest_mark_on_fifth_move() {
        let mut game = ready_game("disappearing");

        game.make_move(0, 0).unwrap();
        game.make_move(1, 1).unwrap();
        game.make_move(0, 2).unwrap();
        game.make_move(1, 3).unwrap();
        game.make_move(0, 5).unwrap();
        game.make_move(1, 4).unwrap();
        game.make_move(0, 7).unwrap();
        game.make_move(1, 6).unwrap();
        game.make_move(0, 8).unwrap();

        assert_eq!(game.board[0], None);
        assert_eq!(game.board[8], Some(0));
        assert_eq!(game.player1_moves.iter().copied().collect::<Vec<_>>(), vec![2, 5, 7, 8]);
        assert_eq!(game.fading_cell(0), Some(2));
    }

    #[test]
    fn joker_cell_counts_for_both_players_once_claimed() {
        let mut game = ready_game("joker");
        game.joker_cell = Some(4);

        game.make_move(0, 4).unwrap();
        game.make_move(1, 0).unwrap();
        game.make_move(0, 1).unwrap();
        game.make_move(1, 8).unwrap();

        assert!(game.game_over);
        assert_eq!(game.winner, Some(1));
    }

    #[test]
    fn joker_line_ends_before_anyone_claims_the_joker_cell() {
        let mut game = ready_game("joker");
        game.joker_cell = Some(4);

        game.make_move(0, 0).unwrap();
        game.make_move(1, 1).unwrap();
        game.make_move(0, 8).unwrap();

        assert!(game.game_over);
        assert_eq!(game.winner, Some(0));
        assert_eq!(game.winning_line, Some([0, 4, 8]));
        assert_eq!(game.make_move(1, 4), Err("Game is over".into()));
    }

    #[test]
    fn empty_joker_cell_can_complete_a_winning_line() {
        let mut game = ready_game("joker");
        game.joker_cell = Some(8);

        game.make_move(0, 2).unwrap();
        game.make_move(1, 6).unwrap();
        game.make_move(0, 5).unwrap();

        assert!(game.game_over);
        assert_eq!(game.winner, Some(0));
        assert_eq!(game.winning_line, Some([2, 5, 8]));
    }

    #[test]
    fn gravity_variant_drops_marks_to_lowest_open_cell() {
        let mut game = ready_game("gravity");

        game.make_move(0, 0).unwrap();
        game.make_move(1, 0).unwrap();
        game.make_move(0, 0).unwrap();

        assert_eq!(game.board[6], Some(0));
        assert_eq!(game.board[3], Some(1));
        assert_eq!(game.board[0], Some(0));
    }

    #[test]
    fn blind_variant_occupied_square_costs_a_turn() {
        let mut game = ready_game("blind");

        game.make_move(0, 0).unwrap();
        game.make_move(1, 0).unwrap();

        assert_eq!(game.board[0], Some(0));
        assert_eq!(game.current_player, 0);
        assert!(game.last_event.as_ref().unwrap().contains("already taken"));
    }

    #[test]
    fn gobblet_variant_covers_and_reveals_smaller_pieces() {
        let mut game = ready_game("gobblet");

        game.make_gobblet_move(0, None, 0, 1).unwrap();
        game.make_gobblet_move(1, None, 0, 2).unwrap();
        game.make_gobblet_move(0, None, 1, 1).unwrap();
        game.make_gobblet_move(1, Some(0), 2, 2).unwrap();

        assert_eq!(game.board[0], Some(0));
        assert_eq!(game.board[2], Some(1));
        assert_eq!(game.gobblet_stacks[0].len(), 1);
        assert_eq!(game.gobblet_stacks[2].last().unwrap().size, 2);
    }

    #[test]
    fn bidding_variant_high_bidder_places_after_both_bids() {
        let mut game = TicTacToeGame::new_variant("bidding");

        game.submit_bid(0, 10).unwrap();
        assert_eq!(game.pending_bids, [Some(10), None]);

        game.submit_bid(1, 20).unwrap();
        assert_eq!(game.pending_bids, [None, None]);
        assert_eq!(game.bidding_winner, Some(1));
        assert_eq!(game.bidding_phase, "placing");
        assert_eq!(game.bidding_chips, [90, 80]);

        game.make_move(1, 4).unwrap();
        assert_eq!(game.board[4], Some(1));
        assert_eq!(game.bidding_phase, "bidding");
        assert_eq!(game.bidding_winner, None);
    }
}
