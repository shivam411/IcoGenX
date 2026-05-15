mod games;
mod lobby;
mod protocol;

use axum::{
    Router,
    extract::{State, WebSocketUpgrade, ws::{Message, WebSocket}},
    response::IntoResponse,
    routing::get,
};
use futures::{SinkExt, StreamExt};
use lobby::AppState;
use protocol::{ClientMessage, ServerMessage};
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use tracing_subscriber;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let state = Arc::new(AppState::new());

    let app = Router::new()
        .route("/ws", get(ws_handler))
        .route("/health", get(|| async { "OK" }))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let addr = std::net::SocketAddr::from(([0, 0, 0, 0, 0, 0, 0, 0], 6100));
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    println!("🎮 Game server running on http://localhost:6100");
    axum::serve(listener, app).await.unwrap();
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    println!("[WS] Connection request received");
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: Arc<AppState>) {
    let (mut sender, mut receiver) = socket.split();
    let player_id = uuid::Uuid::new_v4().to_string();

    // Send the player their ID
    let welcome = ServerMessage::Welcome {
        player_id: player_id.clone(),
    };
    let _ = sender
        .send(Message::Text(serde_json::to_string(&welcome).unwrap().into()))
        .await;

    // Register sender for broadcasting
    state.add_sender(&player_id, sender).await;

    while let Some(Ok(msg)) = receiver.next().await {
        match msg {
            Message::Text(text) => {
                if let Ok(client_msg) = serde_json::from_str::<ClientMessage>(&text) {
                    lobby::handle_message(&state, &player_id, client_msg).await;
                }
            }
            Message::Close(_) => break,
            _ => {}
        }
    }

    // Cleanup on disconnect
    state.remove_player(&player_id).await;
}
