mod game_trait;
mod game_registry;
mod games;
mod lobby;
mod protocol;

use axum::{
    Router,
    extract::{State, WebSocketUpgrade, ws::{Message, WebSocket}},
    http::Method,
    response::IntoResponse,
    routing::get,
};
use futures::{SinkExt, StreamExt};
use lobby::AppState;
use protocol::{ClientMessage, ServerMessage};
use std::sync::Arc;
use tower_http::cors::{AllowOrigin, Any, CorsLayer};
use tracing_subscriber;

fn is_allowed_origin(origin: &str) -> bool {
    let normalized = origin.trim().to_ascii_lowercase();
    let Some(without_scheme) = normalized
        .strip_prefix("https://")
        .or_else(|| normalized.strip_prefix("http://"))
    else {
        return false;
    };

    let host = without_scheme.split('/').next().unwrap_or(without_scheme);
    let host_without_port = host.split(':').next().unwrap_or(host);

    matches!(host_without_port, "localhost" | "127.0.0.1" | "0.0.0.0")
        || host_without_port == "icogenx.com"
        || host_without_port == "www.icogenx.com"
        || host_without_port.ends_with(".icogenx.com")
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let state = Arc::new(AppState::new());
    let cors = CorsLayer::new()
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(Any)
        .allow_origin(AllowOrigin::predicate(|origin, _request| {
            origin.to_str().map(is_allowed_origin).unwrap_or(false)
        }));

    let app = Router::new()
        .route("/ws", get(ws_handler))
        .route("/health", get(|| async { "OK" }))
        .layer(cors)
        .with_state(state);

    let port = std::env::var("PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(6100);
    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], port));
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    println!("🎮 Game server running on http://0.0.0.0:{}", port);
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
