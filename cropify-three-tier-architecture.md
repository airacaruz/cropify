# Cropify Three-Tier System Architecture

## Architecture Overview
This document outlines the three-tier system architecture for the Cropify IoT-powered hydroponics management platform.

## Three-Tier Architecture Diagram

```mermaid
graph TB
    %% Presentation Tier (Tier 1)
    subgraph "PRESENTATION TIER"
        WA[Web Application<br/>React + Vite<br/>Admin Dashboard]
        MA[Mobile Application<br/>Flutter<br/>User Interface]
        LP[Landing Page<br/>React<br/>Public Website]
    end

    %% Application Tier (Tier 2)
    subgraph "APPLICATION TIER"
        subgraph "Firebase Services"
            FA[Firebase Authentication<br/>User Management]
            FC[Firebase Cloud Functions<br/>Business Logic]
            FH[Firebase Hosting<br/>Static Content]
        end
        
        subgraph "External APIs"
            YT[YouTube API<br/>Tutorial Videos]
            GD[Google Drive API<br/>APK Distribution]
            GA[Google Analytics<br/>Usage Tracking]
        end
    end

    %% Data Tier (Tier 3)
    subgraph "DATA TIER"
        subgraph "Firebase Database"
            FS[Cloud Firestore<br/>Structured Data]
            RT[Realtime Database<br/>IoT Sensor Data]
            ST[Firebase Storage<br/>Files & Media]
        end
        
        subgraph "IoT Infrastructure"
            SENSORS[IoT Sensors<br/>pH, TDS, Temperature<br/>Humidity, Water Level]
            GATEWAY[IoT Gateway<br/>Data Collection]
        end
    end

    %% User Interactions
    ADMIN[Admin Users] --> WA
    USERS[End Users] --> MA
    VISITORS[Website Visitors] --> LP

    %% Presentation to Application Tier
    WA --> FA
    WA --> FC
    MA --> FA
    MA --> FC
    LP --> FH

    %% Application Tier Connections
    FC --> FS
    FC --> RT
    FC --> ST
    FA --> FS
    FC --> YT
    FC --> GD
    FC --> GA

    %% IoT Data Flow
    SENSORS --> GATEWAY
    GATEWAY --> RT
    RT --> FC
    FC --> WA
    FC --> MA

    %% Styling
    classDef presentation fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef application fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef data fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef user fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef iot fill:#fce4ec,stroke:#880e4f,stroke-width:2px

    class WA,MA,LP presentation
    class FA,FC,FH,YT,GD,GA application
    class FS,RT,ST data
    class ADMIN,USERS,VISITORS user
    class SENSORS,GATEWAY iot
```

## Tier Breakdown

### 1. Presentation Tier (Client Layer)
- **Web Application**: React-based admin dashboard for system management
- **Mobile Application**: Flutter-based mobile app for end users
- **Landing Page**: Public website for marketing and app downloads

### 2. Application Tier (Business Logic Layer)
- **Firebase Authentication**: User authentication and authorization
- **Firebase Cloud Functions**: Server-side business logic and data processing
- **Firebase Hosting**: Static content delivery and CDN
- **External APIs**: YouTube, Google Drive, and Analytics integrations

### 3. Data Tier (Data Layer)
- **Cloud Firestore**: Structured data storage (user profiles, admin data, news, tutorials)
- **Realtime Database**: Live IoT sensor data streaming
- **Firebase Storage**: File storage for APK files, images, and media
- **IoT Infrastructure**: Physical sensors and data collection gateway

## Data Flow

1. **IoT Sensors** collect real-time data (pH, TDS, temperature, humidity)
2. **IoT Gateway** aggregates and transmits data to **Realtime Database**
3. **Cloud Functions** process sensor data and apply business logic
4. **Web/Mobile Apps** consume processed data through Firebase services
5. **Admin Dashboard** provides management interface for system monitoring
6. **Mobile App** delivers real-time insights to end users

## Security Features

- **Firebase Authentication** with 2FA support
- **Role-based access control** (admin/superadmin)
- **Secure API endpoints** with Firebase App Checkz
- **Data encryption** in transit and at rest
- **Audit logging** for all admin actions

## Scalability Features

- **Serverless architecture** with Firebase Cloud Functions
- **Real-time data synchronization** across all clients
- **CDN distribution** for global content delivery
- **Automatic scaling** based on demand
- **Modular component design** for easy maintenance

