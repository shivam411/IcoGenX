use serde::Serialize;


/// Stop Clock: stop at exactly 20 seconds
#[derive(Debug, Clone, Serialize)]
pub struct StopClockGame {
    #[serde(skip_serializing)]
    pub start_time: Option<u64>, // timestamp ms from client
    pub player1_time: Option<f64>,  // stopped time in seconds
    pub player2_time: Option<f64>,
    pub winner: Option<u8>,
    pub game_over: bool,
    pub both_ready: bool,
    pub player_ready: [bool; 2],
}

impl StopClockGame {
    pub fn new() -> Self {
        StopClockGame {
            start_time: None,
            player1_time: None,
            player2_time: None,
            winner: None,
            game_over: false,
            both_ready: false,
            player_ready: [false, false],
        }
    }

    pub fn set_ready(&mut self, player: u8) {
        self.player_ready[player as usize] = true;
        if self.player_ready[0] && self.player_ready[1] {
            self.both_ready = true;
        }
    }

    /// Record a player's stop time (in milliseconds from when they started)
    pub fn stop(&mut self, player: u8, stopped_at_ms: u64) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }

        let seconds = stopped_at_ms as f64 / 1000.0;

        if player == 0 {
            if self.player1_time.is_some() {
                return Err("Already stopped".into());
            }
            self.player1_time = Some(seconds);
        } else {
            if self.player2_time.is_some() {
                return Err("Already stopped".into());
            }
            self.player2_time = Some(seconds);
        }

        // Check if both players have stopped
        if let (Some(t1), Some(t2)) = (self.player1_time, self.player2_time) {
            let diff1 = (t1 - 20.0).abs();
            let diff2 = (t2 - 20.0).abs();

            if diff1 < diff2 {
                self.winner = Some(0);
            } else if diff2 < diff1 {
                self.winner = Some(1);
            }
            // If equal, no winner (draw)

            self.game_over = true;
        }

        Ok(())
    }

    pub fn state_json(&self) -> serde_json::Value {
        serde_json::json!({
            "player1Time": self.player1_time,
            "player2Time": self.player2_time,
            "winner": self.winner,
            "gameOver": self.game_over,
            "bothReady": self.both_ready,
            "playerReady": self.player_ready,
        })
    }
}
