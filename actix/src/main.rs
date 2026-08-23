use actix_web::{App, HttpResponse, HttpServer, Responder, get, post, web};
use chrono::{DateTime, NaiveDateTime, Utc};
use dotenvy::dotenv;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::postgres::PgPoolOptions;
use sqlx::{FromRow, Row};
use std::env;

fn get_database_url() -> String {
    let host = env::var("DB_HOST").unwrap_or_else(|_| "localhost".to_string());
    let database = env::var("DB_DATABASE").expect("DB_DATABASE must be set");
    let user = env::var("DB_USER").expect("DB_USER must be set");
    let password = env::var("DB_PASSWORD").unwrap_or_default(); // Handles empty password
    let port = env::var("DB_PORT").unwrap_or_else(|_| "5432".to_string());
    if password.is_empty() {
        format!("postgres://{}@{}:{}/{}", user, host, port, database)
    } else {
        format!(
            "postgres://{}:{}@{}:{}/{}",
            user, password, host, port, database
        )
    }
}

struct AppState {
    pool_data: actix_web::web::Data<sqlx::PgPool>,
}

#[derive(Serialize, FromRow)]
struct LocationGroup {
    id: i64,
    name: String,
    description: Option<String>,
    created_at: DateTime<Utc>,
}

#[get("/groups")]
async fn groups(data: web::Data<AppState>) -> impl Responder {
    let query = r#"
        SELECT
            id,
            name,
            description,
            created_at
        FROM location_groups"#;
    let rows: Vec<LocationGroup> = match sqlx::query_as::<_, LocationGroup>(query)
        .fetch_all(data.pool_data.get_ref())
        .await
    {
        Ok(rows) => rows,
        Err(e) => return HttpResponse::InternalServerError().body(e.to_string()),
    };
    let results: Vec<serde_json::Value> = rows
        .into_iter()
        .map(|loc| serde_json::to_value(loc).unwrap())
        .collect();
    HttpResponse::Ok().json(results)
}

#[derive(Deserialize)]
struct CreateGroupRequest {
    name: String,
    description: Option<String>,
}

#[post("/groups")]
async fn create_group(
    body: web::Json<CreateGroupRequest>,
    data: web::Data<AppState>,
) -> impl Responder {
    let insert_query = r#"
        INSERT INTO location_groups(name, description)
        VALUES ($1, $2)
        RETURNING id"#;
    let group_id: i64 = match sqlx::query(insert_query)
        .bind(&body.name)
        .bind(&body.description)
        .fetch_one(data.pool_data.get_ref())
        .await
    {
        Ok(row) => row.get("id"),
        Err(e) => return HttpResponse::InternalServerError().body(e.to_string()),
    };
    let update_query = r#"
        UPDATE user_locations
        set group_id = $1
        WHERE group_id is null"#;
    if let Err(e) = sqlx::query(update_query)
        .bind(&group_id)
        .execute(data.pool_data.get_ref())
        .await
    {
        return HttpResponse::InternalServerError().body(e.to_string());
    };
    HttpResponse::Created().json(group_id)
}

#[derive(Deserialize)]
pub struct GroupQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Serialize, FromRow)]
struct UserLocation {
    longitude: Option<f64>,
    latitude: Option<f64>,
    speed: Decimal,
    accuracy: Decimal,
    battery: Decimal,
    device_id: String,
    created_at: NaiveDateTime,
}

#[get("/groups/{group_id}/points")]
async fn get_group_points(
    group_id: Option<web::Path<i32>>,
    query: web::Query<GroupQuery>,
    data: web::Data<AppState>,
) -> impl Responder {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(10);
    let offset = (page - 1) * limit;
    let mut group_id: Option<i32> = group_id.map(|p| p.into_inner());
    if group_id == Some(0) {
        group_id = None;
    }
    let query = r#"
        SELECT
            ST_X(geom::geometry) as longitude,
            ST_Y(geom::geometry) as latitude,
            speed,
            accuracy,
            battery,
            device_id,
            created_at
        FROM user_locations
        WHERE group_id IS NOT DISTINCT FROM $1
        ORDER BY created_at desc
        LIMIT $2 OFFSET $3"#;
    let rows: Vec<UserLocation> = match sqlx::query_as::<_, UserLocation>(query)
        .bind(group_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(data.pool_data.get_ref())
        .await
    {
        Ok(rows) => rows,
        Err(e) => return HttpResponse::InternalServerError().body(e.to_string()),
    };
    let results: Vec<serde_json::Value> = rows
        .into_iter()
        .map(|loc| serde_json::to_value(loc).unwrap())
        .collect();
    HttpResponse::Ok().json(results)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    match dotenv() {
        Ok(path) => println!("Successfully loaded .env file from: {:?}", path),
        Err(e) => eprintln!("Failed to load .env file: {}", e),
    }
    let database_url = get_database_url();
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to connect to Postgres");
    println!("Successfully connected to PostgreSQL!");
    let pool_data = web::Data::new(pool);
    let app_state = web::Data::new(AppState {
        pool_data: pool_data.clone()
    });

    println!("Server running on http://127.0.0.1:8080");
    HttpServer::new(move || {
        App::new()
            .app_data(app_state.clone()) // Share state across threads
            .service(groups)
            .service(create_group)
            .service(get_group_points)
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
